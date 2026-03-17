use axum::{routing::get, Router};

use crate::app_state::AppState;

use super::handlers::{health, health_live, health_ready, metrics, resumen};

pub fn observabilidad_routes() -> Router<AppState> {
    Router::new()
        .route("/health", get(health))
        .route("/health/live", get(health_live))
        .route("/health/ready", get(health_ready))
        .route("/metrics", get(metrics))
        .route("/observabilidad/resumen", get(resumen))
}
