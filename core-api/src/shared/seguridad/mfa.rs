pub fn requiere_mfa(rol: &str) -> bool {
    matches!(rol, "ADMIN_GLOBAL" | "RH_VACANTES")
}

pub fn generar_desafio_mfa() -> &'static str {
    "generar_desafio_mfa"
}
