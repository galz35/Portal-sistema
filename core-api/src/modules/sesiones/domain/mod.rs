use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct SesionPortal {
    pub id_sesion_portal: i64,
    pub id_cuenta_portal: i32,
    pub sid: String,
    pub estado_sesion: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct EstadoSesion {
    pub autenticado: bool,
    pub id_cuenta_portal: Option<i32>,
    pub id_sesion_portal: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SesionCookies {
    pub access_cookie: &'static str,
    pub refresh_cookie: &'static str,
    pub csrf_cookie: &'static str,
}
