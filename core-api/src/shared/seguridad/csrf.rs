use axum::http::HeaderMap;
use uuid::Uuid;

use crate::shared::seguridad::{cookies::csrf_cookie_policy, session_token::hash_token};

pub fn generar_csrf_token() -> String {
    format!("csrf_{}", Uuid::new_v4())
}

pub fn hash_csrf_token(token: &str) -> String {
    hash_token(token)
}

pub fn extraer_csrf_header(headers: &HeaderMap) -> Option<String> {
    headers
        .get("x-csrf-token")
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

pub fn extraer_csrf_cookie(headers: &HeaderMap) -> Option<String> {
    crate::shared::seguridad::cookies::read_cookie(headers, csrf_cookie_policy().name)
}

pub fn validar_csrf_request(headers: &HeaderMap) -> Option<String> {
    let header_token = extraer_csrf_header(headers)?;
    let cookie_token = extraer_csrf_cookie(headers)?;

    if header_token == cookie_token {
        Some(header_token)
    } else {
        None
    }
}
