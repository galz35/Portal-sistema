pub fn validar_password_admin(password: &str) -> bool {
    password.len() >= 12
}

pub fn validar_password_candidato(password: &str) -> bool {
    password.len() >= 10
}
