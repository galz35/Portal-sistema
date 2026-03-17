use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct AuthenticatedUser {
    pub id_cuenta_portal: i32,
    pub id_persona: i32,
    pub usuario: String,
    pub nombre: String,
    pub correo: String,
    pub carnet: String,
    pub es_interno: bool,
    pub apps: Vec<String>,
    pub permisos: Vec<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EmployeePortalProfile {
    pub id_persona: i32,
    pub nombre: String,
    pub correo: Option<String>,
    pub cargo: Option<String>,
    pub empresa: Option<String>,
    pub departamento: Option<String>,
    pub pais: Option<String>,
    pub jefe: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EmployeeNameRecord {
    pub id_persona: i32,
    pub nombre: String,
}

#[derive(Debug, Clone)]
pub struct LoginEmpleadoCommand {
    pub usuario: String,
    pub clave: String,
    pub return_url: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct LoginEmpleadoResult {
    pub ok: bool,
    pub redirect: String,
    pub requires_mfa: bool,
    pub usuario: String,
    pub id_cuenta_portal: Option<i32>,
    pub nombre: Option<String>,
    pub correo: Option<String>,
    pub failure_reason: Option<String>,
}
