use axum::{
    extract::Request,
    http::{HeaderName, HeaderValue},
    middleware::Next,
    response::Response,
};
use uuid::Uuid;

pub async fn correlation_id_middleware(mut req: Request, next: Next) -> Response {
    let request_id = req
        .headers()
        .get("x-request-id")
        .and_then(|value| value.to_str().ok())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
        .or_else(|| {
            req.headers()
                .get("x-correlation-id")
                .and_then(|value| value.to_str().ok())
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(ToString::to_string)
        })
        .unwrap_or_else(|| Uuid::new_v4().to_string());

    if let Ok(header_value) = HeaderValue::from_str(&request_id) {
        req.headers_mut().insert(
            HeaderName::from_static("x-request-id"),
            header_value.clone(),
        );
        req.headers_mut()
            .insert(HeaderName::from_static("x-correlation-id"), header_value);
    }

    let mut response = next.run(req).await;
    if let Ok(header_value) = HeaderValue::from_str(&request_id) {
        response.headers_mut().insert(
            HeaderName::from_static("x-request-id"),
            header_value.clone(),
        );
        response
            .headers_mut()
            .insert(HeaderName::from_static("x-correlation-id"), header_value);
    }
    response
}
