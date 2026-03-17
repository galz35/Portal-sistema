use axum::{
    extract::State,
    http::{header, HeaderMap},
    response::IntoResponse,
    Json,
};
use serde_json::{json, Value};

use crate::app_state::AppState;
use crate::sql_read_repository;

pub async fn health(State(state): State<AppState>) -> Json<Value> {
    Json(json!({
        "status": "ok",
        "service": "core-api",
        "database": state.config.database_name,
        "checks": {
            "live": true,
            "ready": true
        }
    }))
}

pub async fn health_live() -> Json<Value> {
    Json(json!({ "status": "live", "service": "core-api" }))
}

pub async fn health_ready(State(state): State<AppState>) -> Json<Value> {
    Json(json!({
        "status": "ready",
        "service": "core-api",
        "sql": state.config.connection_summary(),
        "config": "loaded"
    }))
}

pub async fn metrics(State(state): State<AppState>) -> impl IntoResponse {
    let body =
        if let Ok(snapshot) = sql_read_repository::get_observability_snapshot(&state.pool).await {
            format!(
            "# HELP core_observability_sql_up Whether the SQL observability snapshot is available\n\
# TYPE core_observability_sql_up gauge\n\
core_observability_sql_up 1\n\
# HELP core_portal_active_sessions Current active portal sessions\n\
# TYPE core_portal_active_sessions gauge\n\
core_portal_active_sessions {}\n\
# HELP core_login_attempts_24h Login attempts observed in the last 24 hours\n\
# TYPE core_login_attempts_24h gauge\n\
core_login_attempts_24h{{result=\"success\"}} {}\n\
core_login_attempts_24h{{result=\"failure\"}} {}\n\
# HELP core_refresh_failures_24h Refresh failures observed in the last 24 hours\n\
# TYPE core_refresh_failures_24h gauge\n\
core_refresh_failures_24h {}\n\
# HELP core_security_events_24h Security events observed in the last 24 hours\n\
# TYPE core_security_events_24h gauge\n\
core_security_events_24h{{severity=\"high\"}} {}\n\
core_security_events_24h{{severity=\"warn\"}} {}\n",
            snapshot["activeSessions"].as_i64().unwrap_or_default(),
            snapshot["loginSuccess24h"].as_i64().unwrap_or_default(),
            snapshot["loginFailure24h"].as_i64().unwrap_or_default(),
            snapshot["refreshFailure24h"].as_i64().unwrap_or_default(),
            snapshot["securityHigh24h"].as_i64().unwrap_or_default(),
            snapshot["securityWarn24h"].as_i64().unwrap_or_default(),
        )
        } else {
            "# HELP core_observability_sql_up Whether the SQL observability snapshot is available\n\
# TYPE core_observability_sql_up gauge\n\
core_observability_sql_up 0\n\
# observability snapshot unavailable: SQL query failed\n"
                .to_string()
        };

    let mut headers = HeaderMap::new();
    headers.insert(
        header::CONTENT_TYPE,
        header::HeaderValue::from_static("text/plain; version=0.0.4; charset=utf-8"),
    );
    (headers, body)
}

pub async fn resumen(State(state): State<AppState>) -> Json<Value> {
    let snapshot = sql_read_repository::get_observability_snapshot(&state.pool)
        .await
        .ok();
    Json(json!({
        "service": "core-api",
        "auth": {
            "login_success_24h": snapshot.as_ref().and_then(|item| item["loginSuccess24h"].as_i64()),
            "login_failure_24h": snapshot.as_ref().and_then(|item| item["loginFailure24h"].as_i64()),
            "refresh_failure_24h": snapshot.as_ref().and_then(|item| item["refreshFailure24h"].as_i64())
        },
        "session": {
            "active_sessions": snapshot.as_ref().and_then(|item| item["activeSessions"].as_i64()),
            "estado_actual": if snapshot.is_some() { "SQL" } else { "UNAVAILABLE" }
        },
        "security": {
            "cookie_secure": std::env::var("COOKIE_SECURE").unwrap_or_else(|_| "false".to_string()),
            "trust_server_certificate": state.config.trust_server_certificate,
            "security_high_24h": snapshot.as_ref().and_then(|item| item["securityHigh24h"].as_i64()),
            "security_warn_24h": snapshot.as_ref().and_then(|item| item["securityWarn24h"].as_i64())
        }
    }))
}
