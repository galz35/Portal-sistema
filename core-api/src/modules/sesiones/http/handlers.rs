use axum::{
    extract::State,
    http::{HeaderMap, HeaderValue, StatusCode},
    response::IntoResponse,
    Json,
};
use serde_json::json;

use crate::app_state::AppState;
use crate::modules::auth::{
    application::use_cases::{obtener_apps_visibles, obtener_usuario_actual},
    infra::sql_repository::AuthSqlRepository,
};
use crate::modules::sesiones::{
    application::use_cases::{
        describir_cookies_sesion, obtener_estado_sesion, revocar_todas_las_sesiones,
    },
    infra::sql_repository::SesionesSqlRepository,
};
use crate::shared::seguridad::cookies::{
    access_cookie_policy, build_clear_cookie, csrf_cookie_policy, read_cookie,
    refresh_cookie_policy,
};
use crate::shared::seguridad::{
    csrf::{hash_csrf_token, validar_csrf_request},
    session_token::hash_token,
};

pub async fn logout_all(State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    let csrf_valid = if let Some(token) = validar_csrf_request(&headers) {
        if let Some((id_cuenta_portal, id_sesion_portal)) =
            resolve_session_from_headers(&state, &headers).await
        {
            let repository = SesionesSqlRepository::new(state.pool.clone(), id_cuenta_portal);
            repository
                .validar_csrf_token(id_sesion_portal, &hash_csrf_token(&token))
                .await
        } else {
            false
        }
    } else {
        false
    };
    if !csrf_valid {
        let mut response_headers = HeaderMap::new();
        append_clear_site_data(&mut response_headers);
        return (
            StatusCode::FORBIDDEN,
            response_headers,
            Json(json!({
                "ok": false,
                "message": "CSRF invalido"
            })),
        );
    }

    let Some((id_cuenta_portal, _)) = resolve_session_from_headers(&state, &headers).await else {
        let mut response_headers = HeaderMap::new();
        append_clear_site_data(&mut response_headers);
        return (
            StatusCode::UNAUTHORIZED,
            response_headers,
            Json(json!({
                "ok": false,
                "message": "Sesion no encontrada"
            })),
        );
    };
    let repository = SesionesSqlRepository::new(state.pool.clone(), id_cuenta_portal);
    let _ = revocar_todas_las_sesiones(&repository).await;
    let cookies = describir_cookies_sesion();
    let mut response_headers = HeaderMap::new();
    append_set_cookie(
        &mut response_headers,
        &build_clear_cookie(&access_cookie_policy()),
    );
    append_set_cookie(
        &mut response_headers,
        &build_clear_cookie(&refresh_cookie_policy()),
    );
    append_set_cookie(
        &mut response_headers,
        &build_clear_cookie(&csrf_cookie_policy()),
    );
    append_clear_site_data(&mut response_headers);

    (
        StatusCode::OK,
        response_headers,
        Json(json!({
            "ok": true,
            "message": "Se solicitaron revocacion de sesiones activas y limpieza de cookies",
            "idCuentaPortal": id_cuenta_portal,
            "cookies": [cookies.access_cookie, cookies.refresh_cookie, cookies.csrf_cookie]
        })),
    )
}

pub async fn session_me(State(state): State<AppState>, headers: HeaderMap) -> impl IntoResponse {
    let Some((id_cuenta_portal, id_sesion_portal)) =
        resolve_session_from_headers(&state, &headers).await
    else {
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
    let repository = SesionesSqlRepository::new(state.pool.clone(), user.id_cuenta_portal);
    let estado = obtener_estado_sesion(&repository).await;
    let apps = match obtener_apps_visibles(&state, &auth_repository, id_cuenta_portal).await {
        Ok(apps) => apps,
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
            "perfil": {
                "idCuentaPortal": user.id_cuenta_portal,
                "idPersona": user.id_persona,
                "usuario": user.usuario,
                "nombre": user.nombre,
                "correo": user.correo,
                "carnet": user.carnet
            },
            "apps": apps,
            "permisos": user.permisos,
            "sesion": {
                "idSesionPortal": estado.id_sesion_portal.unwrap_or(id_sesion_portal),
                "estadoSesion": if estado.autenticado { "ACTIVA" } else { "SIN_SESION" }
            }
        })),
    )
}

fn append_set_cookie(headers: &mut HeaderMap, value: &str) {
    if let Ok(header_value) = HeaderValue::from_str(value) {
        headers.append("set-cookie", header_value);
    }
}

fn append_clear_site_data(headers: &mut HeaderMap) {
    headers.insert(
        "clear-site-data",
        HeaderValue::from_static("\"cache\", \"cookies\", \"storage\""),
    );
}

async fn resolve_session_from_headers(state: &AppState, headers: &HeaderMap) -> Option<(i32, i64)> {
    let raw = read_cookie(headers, access_cookie_policy().name)?;
    let sid_hash = hash_token(&raw);
    let estado = SesionesSqlRepository::resolver_por_sid_hash(&state.pool, &sid_hash).await?;
    let id_sesion_portal = estado.id_sesion_portal?;
    let id_cuenta_portal = estado.id_cuenta_portal?;

    if estado.autenticado {
        Some((id_cuenta_portal, id_sesion_portal))
    } else {
        None
    }
}
