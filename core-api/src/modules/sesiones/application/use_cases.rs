use crate::{
    modules::sesiones::{
        domain::{EstadoSesion, SesionCookies, SesionPortal},
        infra::sql_repository::SesionesSqlRepository,
    },
    shared::seguridad::cookies::{access_cookie_policy, csrf_cookie_policy, refresh_cookie_policy},
};

pub async fn revocar_sesion_actual(repository: &SesionesSqlRepository) -> SesionPortal {
    repository.revocar().await.unwrap_or(SesionPortal {
        id_sesion_portal: 0,
        id_cuenta_portal: 0,
        sid: String::new(),
        estado_sesion: "SIN_SESION".to_string(),
    })
}

pub async fn revocar_todas_las_sesiones(repository: &SesionesSqlRepository) -> bool {
    repository.revocar_todas().await
}

pub async fn obtener_estado_sesion(
    repository: &SesionesSqlRepository,
) -> crate::modules::sesiones::domain::EstadoSesion {
    repository.obtener_activa().await.unwrap_or(EstadoSesion {
        autenticado: false,
        id_cuenta_portal: None,
        id_sesion_portal: None,
    })
}

pub fn describir_cookies_sesion() -> SesionCookies {
    let access = access_cookie_policy();
    let refresh = refresh_cookie_policy();
    let csrf = csrf_cookie_policy();

    SesionCookies {
        access_cookie: access.name,
        refresh_cookie: refresh.name,
        csrf_cookie: csrf.name,
    }
}
