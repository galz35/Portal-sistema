use axum::{
    extract::Request,
    http::{header, HeaderName, HeaderValue},
    middleware::Next,
    response::Response,
};

use crate::shared::seguridad::request_metadata::request_uses_https;
use crate::shared::seguridad::security_headers::{
    content_security_policy, strict_transport_security,
};

pub async fn security_headers_middleware(req: Request, next: Next) -> Response {
    let path = req.uri().path().to_string();
    let https_request = request_uses_https(req.headers());
    let mut response = next.run(req).await;
    let has_set_cookie = response.headers().contains_key(header::SET_COOKIE);
    let sensitive_path = is_sensitive_api_path(&path);
    let headers = response.headers_mut();

    headers.insert(
        HeaderName::from_static("x-content-type-options"),
        HeaderValue::from_static("nosniff"),
    );
    headers.insert(
        HeaderName::from_static("x-frame-options"),
        HeaderValue::from_static("DENY"),
    );
    headers.insert(
        HeaderName::from_static("referrer-policy"),
        HeaderValue::from_static("same-origin"),
    );
    headers.insert(
        HeaderName::from_static("permissions-policy"),
        HeaderValue::from_static(
            "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()",
        ),
    );
    headers.insert(
        HeaderName::from_static("cross-origin-opener-policy"),
        HeaderValue::from_static("same-origin"),
    );
    headers.insert(
        HeaderName::from_static("cross-origin-resource-policy"),
        HeaderValue::from_static("same-site"),
    );
    headers.insert(
        HeaderName::from_static("content-security-policy"),
        HeaderValue::from_static(content_security_policy()),
    );

    if https_request {
        headers.insert(
            HeaderName::from_static("strict-transport-security"),
            HeaderValue::from_static(strict_transport_security()),
        );
    }

    if sensitive_path || has_set_cookie {
        headers.insert(
            header::CACHE_CONTROL,
            HeaderValue::from_static("no-store, no-cache, must-revalidate, private, max-age=0"),
        );
        headers.insert(header::PRAGMA, HeaderValue::from_static("no-cache"));
        headers.insert(header::EXPIRES, HeaderValue::from_static("0"));
        headers.insert(
            header::VARY,
            HeaderValue::from_static("Cookie, X-CSRF-Token"),
        );
    }

    response
}

fn is_sensitive_api_path(path: &str) -> bool {
    path.starts_with("/api/")
}
