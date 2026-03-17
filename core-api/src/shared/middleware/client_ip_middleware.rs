use axum::{
    extract::{ConnectInfo, Request, State},
    http::{HeaderName, HeaderValue},
    middleware::Next,
    response::Response,
};
use std::net::SocketAddr;

use crate::{app_state::AppState, shared::seguridad::request_metadata::resolve_client_ip};

pub async fn client_ip_middleware(
    State(state): State<AppState>,
    mut req: Request,
    next: Next,
) -> Response {
    let remote_addr = req
        .extensions()
        .get::<ConnectInfo<SocketAddr>>()
        .map(|item| item.0);
    if let Some(client_ip) =
        resolve_client_ip(req.headers(), remote_addr, state.config.trust_proxy_headers)
    {
        if let Ok(header_value) = HeaderValue::from_str(&client_ip) {
            req.headers_mut()
                .insert(HeaderName::from_static("x-client-ip"), header_value);
        }
    }

    next.run(req).await
}
