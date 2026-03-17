use crate::{
    app_state::AppState,
    modules::{
        auth::{
            domain::{AuthenticatedUser, LoginEmpleadoCommand, LoginEmpleadoResult},
            infra::sql_repository::AuthSqlRepository,
        },
        sesiones::infra::sql_repository::SesionesSqlRepository,
    },
    sql_read_repository,
};
use argon2::{Argon2, password_hash::PasswordHash, PasswordVerifier};
use sha2::{Digest, Sha256};

pub async fn ejecutar_login_empleado(
    state: &AppState,
    repository: &AuthSqlRepository,
    _sesiones_repository: &SesionesSqlRepository,
    command: LoginEmpleadoCommand,
) -> LoginEmpleadoResult {
    if let Ok(Some(user)) = sql_read_repository::find_login_user(&state.pool, &command.usuario).await
    {
        let sql_locked = repository
            .is_account_locked(user.id_cuenta_portal)
            .await
            .unwrap_or(false);
        let password_ok = validar_clave_portal(&user.clave_hash, &command.clave);
        let account_allowed = user.activo && !user.bloqueado && !sql_locked;
        return LoginEmpleadoResult {
            ok: account_allowed && password_ok,
            redirect: command.return_url,
            requires_mfa: false,
            usuario: user.usuario,
            id_cuenta_portal: Some(user.id_cuenta_portal),
            nombre: Some(user.nombre),
            correo: Some(user.correo),
            failure_reason: if sql_locked || user.bloqueado {
                Some("CUENTA_BLOQUEADA".to_string())
            } else if !user.activo {
                Some("CUENTA_INACTIVA".to_string())
            } else if !password_ok {
                Some("CREDENCIALES_INVALIDAS".to_string())
            } else {
                None
            },
        };
    }

    LoginEmpleadoResult {
        ok: false,
        redirect: command.return_url,
        requires_mfa: false,
        usuario: command.usuario,
        id_cuenta_portal: None,
        nombre: None,
        correo: None,
        failure_reason: Some("CREDENCIALES_INVALIDAS".to_string()),
    }
}

pub async fn obtener_usuario_actual(
    state: &AppState,
    _repository: &AuthSqlRepository,
    id_cuenta_portal: i32,
) -> Result<AuthenticatedUser, String> {
    if let Ok(Some(user)) = sql_read_repository::get_user(&state.pool, id_cuenta_portal).await {
        return Ok(user);
    }
    Err("No fue posible resolver el usuario actual desde SQL Server".to_string())
}

pub async fn obtener_apps_visibles(
    state: &AppState,
    _repository: &AuthSqlRepository,
    id_cuenta_portal: i32,
) -> Result<Vec<serde_json::Value>, String> {
    if let Ok(apps) =
        sql_read_repository::list_user_apps_verbose(&state.pool, id_cuenta_portal).await
    {
        return Ok(apps);
    }
    Err("No fue posible resolver las apps visibles desde SQL Server".to_string())
}

fn validar_clave_portal(clave_hash: &str, clave_plana: &str) -> bool {
    let clave_hash = clave_hash.trim();
    if clave_hash.starts_with("$argon2") {
        let Ok(parsed_hash) = PasswordHash::new(clave_hash) else {
            return false;
        };
        return Argon2::default()
            .verify_password(clave_plana.as_bytes(), &parsed_hash)
            .is_ok();
    }
    if let Some(expected_hash) = clave_hash.strip_prefix("sha256$") {
        let digest = Sha256::digest(clave_plana.as_bytes());
        let computed_hash = format!("{digest:x}");
        return computed_hash.eq_ignore_ascii_case(expected_hash);
    }
    false
}
