use axum::{
    extract::{Path, State},
    http::{HeaderMap, HeaderValue, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::app_state::AppState;
use crate::modules::auth::{
    application::use_cases::{ejecutar_login_empleado, obtener_usuario_actual},
    domain::LoginEmpleadoCommand,
    infra::sql_repository::AuthSqlRepository,
};
use crate::modules::sesiones::{
    application::use_cases::{describir_cookies_sesion, revocar_sesion_actual},
    infra::sql_repository::SesionesSqlRepository,
};
use crate::shared::seguridad::cookies::{
    access_cookie_policy, build_clear_cookie, build_set_cookie, csrf_cookie_policy, read_cookie,
    refresh_cookie_policy,
};
use crate::shared::seguridad::{
    csrf::{generar_csrf_token, hash_csrf_token, validar_csrf_request},
    rate_limit::check_sliding_window,
    request_metadata::{extract_client_ip, extract_correlation_id, extract_user_agent},
    session_token::{generar_sid, hash_token},
};

#[derive(Deserialize)]
pub struct LoginEmpleadoRequest {
    pub usuario: String,
    pub clave: String,
    pub tipo_login: Option<String>,
    #[serde(rename = "returnUrl")]
    pub return_url: Option<String>,
}

#[derive(Deserialize, Default)]
pub struct IntrospectRequest {
    #[serde(default, rename = "requireCsrf")]
    pub require_csrf: bool,
}

#[derive(Deserialize, Default)]
pub struct EmployeeNamesRequest {
    #[serde(default, rename = "idsPersona")]
    pub ids_persona: Vec<i32>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct IntrospectResponse {
    authenticated: bool,
    csrf_valid: Option<bool>,
    session: IntrospectSession,
    identity: IntrospectIdentity,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct IntrospectSession {
    id_sesion_portal: i64,
    id_cuenta_portal: i32,
    estado_sesion: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct IntrospectIdentity {
    id_sesion_portal: i64,
    id_cuenta_portal: i32,
    id_persona: i32,
    usuario: String,
    nombre: String,
    correo: String,
    carnet: String,
    es_interno: bool,
    apps: Vec<String>,
    permisos: Vec<String>,
}

pub async fn login(State(_state): State<AppState>) -> impl IntoResponse {
    (
        StatusCode::BAD_REQUEST,
        Json(json!({
            "ok": false,
            "flujo": "login_general",
            "message": "Use /api/auth/login/empleado para autenticacion de empleados",
            "portal": "core-api",
            "hint": "El endpoint base ya no autentica solicitudes directamente"
        })),
    )
}

pub async fn login_empleado(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<LoginEmpleadoRequest>,
) -> impl IntoResponse {
    let auth_repository = AuthSqlRepository::new(state.pool.clone());
    let cookies = describir_cookies_sesion();
    let usuario_normalizado = body.usuario.trim().to_ascii_lowercase();
    let ip_origen = extract_client_ip(&headers);
    let user_agent = extract_user_agent(&headers);
    let correlation_id = extract_correlation_id(&headers);
    let mut response_headers = HeaderMap::new();

    let return_url = sanitize_return_url(body.return_url.as_deref());
    if let Err(reason) = validate_portal_login_payload(body.usuario.trim(), body.clave.trim()) {
        let _ = auth_repository
            .register_login_attempt(
                &usuario_normalizado,
                None,
                ip_origen.as_deref(),
                user_agent.as_deref(),
                false,
                Some(reason),
            )
            .await;
        record_security_event_best_effort(
            &auth_repository,
            &state,
            None,
            None,
            "LOGIN_VALIDATION_FAILED",
            "WARN",
            Some("auth"),
            Some("login-empleado"),
            Some(reason),
            ip_origen.as_deref(),
            user_agent.as_deref(),
            correlation_id.as_deref(),
        )
        .await;
        append_clear_session_cookies(&mut response_headers);
        return (
            StatusCode::BAD_REQUEST,
            response_headers,
            Json(json!({
                "ok": false,
                "flujo": "login_empleado",
                "message": "Credenciales invalidas"
            })),
        );
    }

    let local_limit = check_sliding_window(
        &format!(
            "portal-login:{}:{}",
            ip_origen.as_deref().unwrap_or("desconocido"),
            usuario_normalizado
        ),
        state.config.login_rate_limit_max_attempts,
        state.config.login_rate_limit_window_minutes * 60,
    );
    if !local_limit.allowed {
        let _ = auth_repository
            .register_login_attempt(
                &usuario_normalizado,
                None,
                ip_origen.as_deref(),
                user_agent.as_deref(),
                false,
                Some("RATE_LIMIT_LOCAL"),
            )
            .await;
        record_security_event_best_effort(
            &auth_repository,
            &state,
            None,
            None,
            "LOGIN_RATE_LIMIT_LOCAL",
            "WARN",
            Some("auth"),
            Some("login-empleado"),
            Some("Limite local por usuario e IP excedido"),
            ip_origen.as_deref(),
            user_agent.as_deref(),
            correlation_id.as_deref(),
        )
        .await;
        append_clear_session_cookies(&mut response_headers);
        return (
            StatusCode::TOO_MANY_REQUESTS,
            response_headers,
            Json(json!({
                "ok": false,
                "flujo": "login_empleado",
                "message": "Demasiados intentos de inicio de sesion",
                "retryAfterSeconds": local_limit.retry_after_seconds
            })),
        );
    }

    let failed_attempts_before = auth_repository
        .count_recent_failed_logins(
            &usuario_normalizado,
            i32::try_from(state.config.login_rate_limit_window_minutes).unwrap_or(i32::MAX),
        )
        .await
        .unwrap_or_default();
    if failed_attempts_before >= i64::from(state.config.login_rate_limit_max_attempts) {
        let _ = auth_repository
            .register_login_attempt(
                &usuario_normalizado,
                None,
                ip_origen.as_deref(),
                user_agent.as_deref(),
                false,
                Some("RATE_LIMIT_SQL"),
            )
            .await;
        record_security_event_best_effort(
            &auth_repository,
            &state,
            None,
            None,
            "LOGIN_RATE_LIMIT_SQL",
            "WARN",
            Some("auth"),
            Some("login-empleado"),
            Some("Ventana SQL de intentos fallidos excedida"),
            ip_origen.as_deref(),
            user_agent.as_deref(),
            correlation_id.as_deref(),
        )
        .await;
        append_clear_session_cookies(&mut response_headers);
        return (
            StatusCode::TOO_MANY_REQUESTS,
            response_headers,
            Json(json!({
                "ok": false,
                "flujo": "login_empleado",
                "message": "Acceso temporalmente restringido por seguridad"
            })),
        );
    }

    let command = LoginEmpleadoCommand {
        usuario: body.usuario.trim().to_string(),
        clave: body.clave.clone(),
        return_url,
    };
    let bootstrap_repository = SesionesSqlRepository::new(state.pool.clone(), 0);
    let result =
        ejecutar_login_empleado(&state, &auth_repository, &bootstrap_repository, command).await;
    let session = if let Some(id_cuenta_portal) = login_account_id(&result) {
        let sid = generar_sid();
        let repository = SesionesSqlRepository::new(state.pool.clone(), id_cuenta_portal);
        repository
            .crear_con_sid_hash(&hash_token(&sid))
            .await
            .map(|session| (sid, session))
    } else {
        None
    };
    let login_ok = result.ok && session.is_some();
    let failed_attempts_after = if login_ok || result.ok {
        0
    } else {
        auth_repository
            .register_login_attempt(
                &usuario_normalizado,
                result.id_cuenta_portal,
                ip_origen.as_deref(),
                user_agent.as_deref(),
                false,
                result.failure_reason.as_deref(),
            )
            .await
            .ok();
        auth_repository
            .count_recent_failed_logins(
                &usuario_normalizado,
                i32::try_from(state.config.login_rate_limit_window_minutes).unwrap_or(i32::MAX),
            )
            .await
            .unwrap_or_default()
    };
    if !login_ok
        && failed_attempts_after >= i64::from(state.config.login_rate_limit_max_attempts)
        && matches!(result.id_cuenta_portal, Some(_))
        && result.failure_reason.as_deref() != Some("CUENTA_BLOQUEADA")
    {
        let _ = auth_repository
            .activate_account_lock(
                result.id_cuenta_portal.unwrap_or_default(),
                "LOGIN_BRUTE_FORCE",
                i32::try_from(state.config.login_lock_minutes).unwrap_or(i32::MAX),
            )
            .await;
        record_security_event_best_effort(
            &auth_repository,
            &state,
            result.id_cuenta_portal,
            None,
            "LOGIN_LOCK_ACTIVATED",
            "HIGH",
            Some("auth"),
            Some("login-empleado"),
            Some("Bloqueo temporal de cuenta por intentos fallidos"),
            ip_origen.as_deref(),
            user_agent.as_deref(),
            correlation_id.as_deref(),
        )
        .await;
    }
    if login_ok {
        let _ = auth_repository
            .register_login_attempt(
                &usuario_normalizado,
                result.id_cuenta_portal,
                ip_origen.as_deref(),
                user_agent.as_deref(),
                true,
                Some("LOGIN_OK"),
            )
            .await;
        record_security_event_best_effort(
            &auth_repository,
            &state,
            result.id_cuenta_portal,
            session.as_ref().map(|(_, value)| value.id_sesion_portal),
            "LOGIN_SUCCESS",
            "INFO",
            Some("auth"),
            Some("login-empleado"),
            Some("Inicio de sesion completado"),
            ip_origen.as_deref(),
            user_agent.as_deref(),
            correlation_id.as_deref(),
        )
        .await;
    } else if result.ok {
        record_security_event_best_effort(
            &auth_repository,
            &state,
            result.id_cuenta_portal,
            None,
            "LOGIN_SESSION_ERROR",
            "ERROR",
            Some("auth"),
            Some("login-empleado"),
            Some("Credenciales validas pero no fue posible emitir sesion"),
            ip_origen.as_deref(),
            user_agent.as_deref(),
            correlation_id.as_deref(),
        )
        .await;
    } else {
        let event_name = if result.failure_reason.as_deref() == Some("CUENTA_BLOQUEADA") {
            "LOGIN_BLOCKED"
        } else {
            "LOGIN_FAILED"
        };
        let severity = if result.failure_reason.as_deref() == Some("CUENTA_BLOQUEADA") {
            "WARN"
        } else {
            "INFO"
        };
        record_security_event_best_effort(
            &auth_repository,
            &state,
            result.id_cuenta_portal,
            None,
            event_name,
            severity,
            Some("auth"),
            Some("login-empleado"),
            result.failure_reason.as_deref(),
            ip_origen.as_deref(),
            user_agent.as_deref(),
            correlation_id.as_deref(),
        )
        .await;
    }
    let status = if login_ok {
        StatusCode::OK
    } else if result.ok {
        StatusCode::INTERNAL_SERVER_ERROR
    } else if result.failure_reason.as_deref() == Some("CUENTA_BLOQUEADA")
        || failed_attempts_after >= i64::from(state.config.login_rate_limit_max_attempts)
    {
        StatusCode::TOO_MANY_REQUESTS
    } else {
        StatusCode::UNAUTHORIZED
    };
    if let Some((sid, session)) = session.as_ref() {
        let csrf_token = generar_csrf_token();
        let repository = SesionesSqlRepository::new(state.pool.clone(), session.id_cuenta_portal);
        let csrf_ok = repository
            .crear_csrf_token(session.id_sesion_portal, &hash_csrf_token(&csrf_token))
            .await;
        if csrf_ok {
            append_session_cookies(&mut response_headers, sid, &csrf_token);
        } else {
            append_clear_session_cookies(&mut response_headers);
        }
    } else {
        append_clear_session_cookies(&mut response_headers);
    }

    (
        status,
        response_headers,
        Json(json!({
            "ok": login_ok,
            "flujo": "login_empleado",
            "usuario": body.usuario,
            "tipo_login": body.tipo_login.unwrap_or_else(|| "empleado".to_string()),
            "redirect": result.redirect,
            "requiresMfa": result.requires_mfa,
            "cookies": [cookies.access_cookie, cookies.refresh_cookie, cookies.csrf_cookie],
            "session": {
                "idSesionPortal": session.as_ref().map(|(_, value)| value.id_sesion_portal),
                "estadoSesion": session.as_ref().map(|(_, value)| value.estado_sesion.clone()).unwrap_or_else(|| "SIN_SESION".to_string())
            },
            "perfil": {
                "idCuentaPortal": result.id_cuenta_portal,
                "usuario": result.usuario,
                "nombre": result.nombre,
                "correo": result.correo
            },
            "message": if login_ok {
                "Sesion iniciada"
            } else if status == StatusCode::TOO_MANY_REQUESTS {
                "Acceso temporalmente restringido por seguridad"
            } else {
                "Credenciales invalidas"
            },
            "validacion_minima": {
                "usuario_valido": validate_portal_username(body.usuario.trim()).is_ok(),
                "clave_valida": validate_portal_password(body.clave.trim()).is_ok()
            }
        })),
    )
}

pub async fn introspect(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Option<Json<IntrospectRequest>>,
) -> impl IntoResponse {
    let require_csrf = body.map(|Json(body)| body.require_csrf).unwrap_or(false);

    match build_introspection_response(&state, &headers, require_csrf).await {
        Ok(payload) => (StatusCode::OK, Json(payload)).into_response(),
        Err((status, message)) => (
            status,
            Json(json!({
                "authenticated": false,
                "message": message
            })),
        )
            .into_response(),
    }
}

pub async fn employee_profile(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(id_persona): Path<i32>,
) -> impl IntoResponse {
    if let Err((status, message)) = ensure_vacantes_rh_access(&state, &headers).await {
        return (status, Json(json!({ "ok": false, "message": message }))).into_response();
    }
    if id_persona <= 0 {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "ok": false,
                "message": "IdPersona invalido"
            })),
        )
            .into_response();
    }

    match crate::sql_read_repository::get_employee_profile(&state.pool, id_persona).await {
        Ok(Some(profile)) => (StatusCode::OK, Json(json!(profile))).into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(json!({
                "ok": false,
                "message": "Empleado no encontrado"
            })),
        )
            .into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "ok": false,
                "message": "No fue posible resolver el perfil del empleado"
            })),
        )
            .into_response(),
    }
}

pub async fn employee_names(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(body): Json<EmployeeNamesRequest>,
) -> impl IntoResponse {
    if let Err((status, message)) = ensure_vacantes_rh_access(&state, &headers).await {
        return (status, Json(json!({ "ok": false, "message": message }))).into_response();
    }

    let mut ids_persona = body
        .ids_persona
        .into_iter()
        .filter(|value| *value > 0)
        .collect::<Vec<i32>>();
    ids_persona.sort_unstable();
    ids_persona.dedup();

    if ids_persona.len() > 200 {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "ok": false,
                "message": "IdsPersona excede el maximo permitido"
            })),
        )
            .into_response();
    }

    match crate::sql_read_repository::list_employee_names(&state.pool, &ids_persona).await {
        Ok(items) => (StatusCode::OK, Json(json!({ "items": items }))).into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "ok": false,
                "message": "No fue posible resolver los nombres de empleados"
            })),
        )
            .into_response(),
    }
}

pub async fn refresh(State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    let presented_sid = read_cookie(&headers, refresh_cookie_policy().name)
        .or_else(|| read_cookie(&headers, access_cookie_policy().name));
    let Some(presented_sid) = presented_sid else {
        let auth_repository = AuthSqlRepository::new(state.pool.clone());
        record_security_event_best_effort(
            &auth_repository,
            &state,
            None,
            None,
            "REFRESH_SESSION_MISSING",
            "WARN",
            Some("auth"),
            Some("refresh"),
            Some("Intento de refresh sin sesion valida"),
            extract_client_ip(&headers).as_deref(),
            extract_user_agent(&headers).as_deref(),
            extract_correlation_id(&headers).as_deref(),
        )
        .await;
        let mut response_headers = HeaderMap::new();
        append_clear_session_cookies(&mut response_headers);
        return (
            StatusCode::UNAUTHORIZED,
            response_headers,
            Json(json!({
                "ok": false,
                "message": "Sesion no encontrada",
                "token_rotativo": false
            })),
        );
    };
    let presented_sid_hash = hash_token(&presented_sid);
    let Some(estado) =
        SesionesSqlRepository::resolver_por_sid_hash(&state.pool, &presented_sid_hash).await
    else {
        let auth_repository = AuthSqlRepository::new(state.pool.clone());
        record_security_event_best_effort(
            &auth_repository,
            &state,
            None,
            None,
            "REFRESH_SESSION_MISSING",
            "WARN",
            Some("auth"),
            Some("refresh"),
            Some("Intento de refresh con token no reconocido"),
            extract_client_ip(&headers).as_deref(),
            extract_user_agent(&headers).as_deref(),
            extract_correlation_id(&headers).as_deref(),
        )
        .await;
        let mut response_headers = HeaderMap::new();
        append_clear_session_cookies(&mut response_headers);
        return (
            StatusCode::UNAUTHORIZED,
            response_headers,
            Json(json!({
                "ok": false,
                "message": "Sesion no encontrada",
                "token_rotativo": false
            })),
        );
    };
    let Some(id_cuenta_portal) = estado.id_cuenta_portal else {
        let mut response_headers = HeaderMap::new();
        append_clear_session_cookies(&mut response_headers);
        return (
            StatusCode::UNAUTHORIZED,
            response_headers,
            Json(json!({
                "ok": false,
                "message": "Cuenta no resuelta",
                "token_rotativo": false
            })),
        );
    };
    let Some(id_sesion_portal) = estado.id_sesion_portal else {
        let mut response_headers = HeaderMap::new();
        append_clear_session_cookies(&mut response_headers);
        return (
            StatusCode::UNAUTHORIZED,
            response_headers,
            Json(json!({
                "ok": false,
                "message": "Sesion no encontrada",
                "token_rotativo": false
            })),
        );
    };

    let repository = SesionesSqlRepository::new(state.pool.clone(), id_cuenta_portal);
    let sid = generar_sid();
    let sid_hash = hash_token(&sid);
    if !repository
        .rotar_sid_hash(id_sesion_portal, &presented_sid_hash, &sid_hash)
        .await
    {
        let auth_repository = AuthSqlRepository::new(state.pool.clone());
        record_security_event_best_effort(
            &auth_repository,
            &state,
            Some(id_cuenta_portal),
            Some(id_sesion_portal),
            "REFRESH_ROTATION_FAILED",
            "WARN",
            Some("auth"),
            Some("refresh"),
            Some("No fue posible rotar el token de sesion"),
            extract_client_ip(&headers).as_deref(),
            extract_user_agent(&headers).as_deref(),
            extract_correlation_id(&headers).as_deref(),
        )
        .await;
        let mut response_headers = HeaderMap::new();
        append_clear_session_cookies(&mut response_headers);
        return (
            StatusCode::UNAUTHORIZED,
            response_headers,
            Json(json!({
                "ok": false,
                "message": "Sesion no encontrada",
                "token_rotativo": false
            })),
        );
    }

    let mut response_headers = HeaderMap::new();
    let csrf_token = generar_csrf_token();
    let _ = repository.revocar_csrf_por_sesion(id_sesion_portal).await;
    let _ = repository.actualizar_actividad_por_id(id_sesion_portal).await;
    if repository
        .crear_csrf_token(id_sesion_portal, &hash_csrf_token(&csrf_token))
        .await
    {
        append_session_cookies(&mut response_headers, &sid, &csrf_token);
    } else {
        append_clear_session_cookies(&mut response_headers);
    }

    (
        StatusCode::OK,
        response_headers,
        Json(json!({
            "ok": true,
            "message": "Refresh central disponible",
            "token_rotativo": true,
            "idSesionPortal": id_sesion_portal,
            "idCuentaPortal": id_cuenta_portal
        })),
    )
}

pub async fn logout(State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    let auth_repository = AuthSqlRepository::new(state.pool.clone());
    let csrf_valid = if let Some(token) = validar_csrf_request(&headers) {
        async_std_compat_validate_csrf(&state, &headers, &token)
            .await
            .is_some()
    } else {
        false
    };
    if !csrf_valid {
        record_security_event_best_effort(
            &auth_repository,
            &state,
            None,
            None,
            "LOGOUT_CSRF_INVALID",
            "WARN",
            Some("auth"),
            Some("logout"),
            Some("Intento de logout con CSRF invalido"),
            extract_client_ip(&headers).as_deref(),
            extract_user_agent(&headers).as_deref(),
            extract_correlation_id(&headers).as_deref(),
        )
        .await;
        let mut response_headers = HeaderMap::new();
        append_clear_session_cookies(&mut response_headers);
        append_clear_site_data(&mut response_headers);
        return (
            StatusCode::FORBIDDEN,
            response_headers,
            Json(json!({
                "ok": false,
                "message": "CSRF invalido",
                "cookies_limpiadas": true
            })),
        );
    }

    let resolved_session = resolve_session_from_headers(&state, &headers).await;
    if resolved_session.is_none() {
        record_security_event_best_effort(
            &auth_repository,
            &state,
            None,
            None,
            "LOGOUT_SESSION_MISSING",
            "WARN",
            Some("auth"),
            Some("logout"),
            Some("Intento de logout sin sesion valida"),
            extract_client_ip(&headers).as_deref(),
            extract_user_agent(&headers).as_deref(),
            extract_correlation_id(&headers).as_deref(),
        )
        .await;
        let mut response_headers = HeaderMap::new();
        append_clear_session_cookies(&mut response_headers);
        append_clear_site_data(&mut response_headers);
        return (
            StatusCode::UNAUTHORIZED,
            response_headers,
            Json(json!({
                "ok": false,
                "message": "Sesion no encontrada",
                "cookies_limpiadas": true
            })),
        );
    }
    let id_cuenta_portal = resolved_session
        .as_ref()
        .map(|(id_cuenta_portal, _)| *id_cuenta_portal)
        .unwrap_or_default();
    let session = if let Some((_, id_sesion_portal)) = resolved_session {
        let repository = SesionesSqlRepository::new(state.pool.clone(), id_cuenta_portal);
        let _ = repository.revocar_csrf_por_sesion(id_sesion_portal).await;
        if let Some(session) = repository.revocar_por_id(id_sesion_portal).await {
            session
        } else {
            revocar_sesion_actual(&repository).await
        }
    } else {
        unreachable!("resolved_session fue validada antes de revocar")
    };
    let cookies = describir_cookies_sesion();
    let mut response_headers = HeaderMap::new();
    append_clear_session_cookies(&mut response_headers);
    append_clear_site_data(&mut response_headers);
    record_security_event_best_effort(
        &auth_repository,
        &state,
        Some(id_cuenta_portal),
        Some(session.id_sesion_portal),
        "LOGOUT_SUCCESS",
        "INFO",
        Some("auth"),
        Some("logout"),
        Some("Logout completado y sesion revocada"),
        extract_client_ip(&headers).as_deref(),
        extract_user_agent(&headers).as_deref(),
        extract_correlation_id(&headers).as_deref(),
    )
    .await;

    (
        StatusCode::OK,
        response_headers,
        Json(json!({
            "ok": true,
            "message": "Logout global solicitado",
            "cookies_limpiadas": true,
            "cookies": [cookies.access_cookie, cookies.refresh_cookie, cookies.csrf_cookie],
            "idSesionPortal": session.id_sesion_portal,
            "estadoSesion": session.estado_sesion,
            "idCuentaPortal": id_cuenta_portal
        })),
    )
}

pub async fn me(State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    let Some((id_cuenta_portal, _)) = resolve_session_from_headers(&state, &headers).await else {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({
                "ok": false,
                "message": "Sesion no encontrada"
            })),
        );
    };

    let auth_repository = AuthSqlRepository::new(state.pool.clone());
    let user = match obtener_usuario_actual(&state, &auth_repository, id_cuenta_portal).await {
        Ok(user) => user,
        Err(message) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "ok": false,
                    "message": message
                })),
            )
        }
    };

    (
        StatusCode::OK,
        Json(json!({
            "idCuentaPortal": user.id_cuenta_portal,
            "idPersona": user.id_persona,
            "usuario": user.usuario,
            "nombre": user.nombre,
            "correo": user.correo,
            "carnet": user.carnet,
            "esInterno": user.es_interno,
            "apps": user.apps,
            "permisos": user.permisos
        })),
    )
}

pub async fn session_state(State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    let Some((id_cuenta_portal, id_sesion_portal)) =
        resolve_session_from_headers(&state, &headers).await
    else {
        return (
            StatusCode::OK,
            Json(json!({
                "authenticated": false,
                "idSesionPortal": None::<i64>,
                "idCuentaPortal": None::<i32>,
                "estadoSesion": "SIN_SESION"
            })),
        );
    };

    (
        StatusCode::OK,
        Json(json!({
            "authenticated": true,
            "idSesionPortal": Some(id_sesion_portal),
            "idCuentaPortal": Some(id_cuenta_portal),
            "estadoSesion": "ACTIVA"
        })),
    )
}

fn append_session_cookies(headers: &mut HeaderMap, sid: &str, csrf_token: &str) {
    append_set_cookie(headers, &build_set_cookie(&access_cookie_policy(), sid));
    append_set_cookie(headers, &build_set_cookie(&refresh_cookie_policy(), sid));
    append_set_cookie(
        headers,
        &build_set_cookie(&csrf_cookie_policy(), csrf_token),
    );
}

fn append_clear_session_cookies(headers: &mut HeaderMap) {
    append_set_cookie(headers, &build_clear_cookie(&access_cookie_policy()));
    append_set_cookie(headers, &build_clear_cookie(&refresh_cookie_policy()));
    append_set_cookie(headers, &build_clear_cookie(&csrf_cookie_policy()));
}

fn append_clear_site_data(headers: &mut HeaderMap) {
    headers.insert(
        "clear-site-data",
        HeaderValue::from_static("\"cache\", \"cookies\", \"storage\""),
    );
}

fn validate_portal_login_payload(usuario: &str, clave: &str) -> Result<(), &'static str> {
    validate_portal_username(usuario)?;
    validate_portal_password(clave)?;
    Ok(())
}

fn validate_portal_username(usuario: &str) -> Result<(), &'static str> {
    if usuario.len() < 3
        || usuario.len() > 120
        || usuario
            .chars()
            .any(|ch| ch.is_control() || ch.is_whitespace())
    {
        return Err("USUARIO_INVALIDO");
    }
    Ok(())
}

fn validate_portal_password(clave: &str) -> Result<(), &'static str> {
    if clave.len() < 6 || clave.len() > 128 || clave.chars().any(|ch| ch.is_control()) {
        return Err("CLAVE_INVALIDA");
    }
    Ok(())
}

fn sanitize_return_url(return_url: Option<&str>) -> String {
    let value = return_url
        .map(str::trim)
        .filter(|value| {
            !value.is_empty()
                && value.starts_with('/')
                && !value.starts_with("//")
                && !value.contains("://")
                && value.len() <= 300
        })
        .unwrap_or("/portal");
    value.to_string()
}

fn append_set_cookie(headers: &mut HeaderMap, value: &str) {
    if let Ok(header_value) = HeaderValue::from_str(value) {
        headers.append("set-cookie", header_value);
    }
}

async fn resolve_session_from_headers(state: &AppState, headers: &HeaderMap) -> Option<(i32, i64)> {
    resolve_session_from_cookie_candidates(state, headers, &[access_cookie_policy().name]).await
}

async fn resolve_session_from_cookie_candidates(
    state: &AppState,
    headers: &HeaderMap,
    cookie_names: &[&str],
) -> Option<(i32, i64)> {
    for cookie_name in cookie_names {
        let Some(raw) = read_cookie(headers, cookie_name) else {
            continue;
        };
        let sid_hash = hash_token(&raw);
        let Some(estado) =
            SesionesSqlRepository::resolver_por_sid_hash(&state.pool, &sid_hash).await
        else {
            continue;
        };
        let Some(id_sesion_portal) = estado.id_sesion_portal else {
            continue;
        };
        let Some(id_cuenta_portal) = estado.id_cuenta_portal else {
            continue;
        };

        if estado.autenticado {
            return Some((id_cuenta_portal, id_sesion_portal));
        }
    }

    None
}

async fn async_std_compat_validate_csrf(
    state: &AppState,
    headers: &HeaderMap,
    token: &str,
) -> Option<()> {
    let (_, id_sesion_portal) = resolve_session_from_headers(state, headers).await?;
    if validate_csrf_for_session(state, id_sesion_portal, token).await {
        Some(())
    } else {
        None
    }
}

async fn build_introspection_response(
    state: &AppState,
    headers: &HeaderMap,
    require_csrf: bool,
) -> Result<IntrospectResponse, (StatusCode, &'static str)> {
    let Some((id_cuenta_portal, id_sesion_portal)) = resolve_session_from_headers(state, headers).await
    else {
        return Err((StatusCode::UNAUTHORIZED, "Sesion no encontrada"));
    };

    let csrf_valid = if require_csrf {
        let Some(token) = validar_csrf_request(headers) else {
            return Err((StatusCode::FORBIDDEN, "CSRF invalido"));
        };
        if !validate_csrf_for_session(state, id_sesion_portal, &token).await {
            return Err((StatusCode::FORBIDDEN, "CSRF invalido"));
        }
        Some(true)
    } else if let Some(token) = validar_csrf_request(headers) {
        Some(validate_csrf_for_session(state, id_sesion_portal, &token).await)
    } else {
        None
    };

    let auth_repository = AuthSqlRepository::new(state.pool.clone());
    let user = obtener_usuario_actual(state, &auth_repository, id_cuenta_portal)
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "No fue posible resolver el usuario actual",
            )
        })?;

    Ok(IntrospectResponse {
        authenticated: true,
        csrf_valid,
        session: IntrospectSession {
            id_sesion_portal,
            id_cuenta_portal,
            estado_sesion: "ACTIVA",
        },
        identity: IntrospectIdentity {
            id_sesion_portal,
            id_cuenta_portal: user.id_cuenta_portal,
            id_persona: user.id_persona,
            usuario: user.usuario,
            nombre: user.nombre,
            correo: user.correo,
            carnet: user.carnet,
            es_interno: user.es_interno,
            apps: user.apps,
            permisos: user.permisos,
        },
    })
}

async fn ensure_vacantes_rh_access(
    state: &AppState,
    headers: &HeaderMap,
) -> Result<(), (StatusCode, &'static str)> {
    let payload = build_introspection_response(state, headers, false).await?;
    if identity_has_vacantes_rh_access(&payload.identity) {
        Ok(())
    } else {
        Err((StatusCode::FORBIDDEN, "Sin acceso"))
    }
}

fn identity_has_vacantes_rh_access(identity: &IntrospectIdentity) -> bool {
    let has_app = identity.apps.iter().any(|current| current == "vacantes")
        || identity
            .permisos
            .iter()
            .any(|current| current == "app.vacantes");
    let has_rh_permission = identity.permisos.iter().any(|current| {
        matches!(
            current.as_str(),
            "vacantes.rh.ver" | "vacantes.rh.crear" | "vacantes.rh.estado"
        )
    });

    has_app && has_rh_permission
}

async fn validate_csrf_for_session(
    state: &AppState,
    id_sesion_portal: i64,
    token: &str,
) -> bool {
    let token_hash = hash_csrf_token(token);
    let repository = SesionesSqlRepository::new(state.pool.clone(), 0);
    repository
        .validar_csrf_token(id_sesion_portal, &token_hash)
        .await
}

fn login_account_id(result: &crate::modules::auth::domain::LoginEmpleadoResult) -> Option<i32> {
    if result.ok {
        result.id_cuenta_portal
    } else {
        None
    }
}

async fn record_security_event_best_effort(
    repository: &AuthSqlRepository,
    _state: &AppState,
    id_cuenta_portal: Option<i32>,
    id_sesion_portal: Option<i64>,
    tipo_evento: &str,
    severidad: &str,
    modulo: Option<&str>,
    recurso: Option<&str>,
    detalle: Option<&str>,
    ip: Option<&str>,
    user_agent: Option<&str>,
    correlation_id: Option<&str>,
) {
    let _ = repository
        .register_security_event(
            id_cuenta_portal,
            id_sesion_portal,
            tipo_evento,
            severidad,
            modulo,
            recurso,
            detalle,
            ip,
            user_agent,
            correlation_id,
        )
        .await;
}
