use axum::{
    routing::{get, post},
    Router,
};

use crate::app_state::AppState;

use super::handlers::{logout_all, session_me};

pub fn sesiones_routes() -> Router<AppState> {
    Router::new()
        .route("/logout-all", post(logout_all))
        .route("/session/me", get(session_me))
}
