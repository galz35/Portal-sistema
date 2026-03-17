use axum::{
    routing::{get, post},
    Router,
};

use crate::app_state::AppState;

use super::handlers::{
    employee_names, employee_profile, introspect, login, login_empleado, logout, me, refresh,
    session_state,
};

pub fn auth_routes() -> Router<AppState> {
    Router::new()
        .route("/login", post(login))
        .route("/login-empleado", post(login_empleado))
        .route("/employees/names", post(employee_names))
        .route("/employees/{id_persona}/profile", get(employee_profile))
        .route("/introspect", post(introspect))
        .route("/refresh", post(refresh))
        .route("/logout", post(logout))
        .route("/me", get(me))
        .route("/session-state", get(session_state))
}
