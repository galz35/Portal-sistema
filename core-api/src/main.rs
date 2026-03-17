mod app_state;
mod config;
mod db;
mod db_pool;
mod sql_read_repository;
mod modules {
    pub mod auth {
        pub mod application;
        pub mod domain;
        pub mod http {
            pub mod handlers;
            pub mod routes;
        }
        pub mod infra;
    }
    pub mod observabilidad {
        pub mod http {
            pub mod handlers;
            pub mod routes;
        }
    }
    pub mod sesiones {
        pub mod application;
        pub mod domain;
        pub mod http {
            pub mod handlers;
            pub mod routes;
        }
        pub mod infra;
    }
}
mod shared {
    pub mod middleware {
        pub mod client_ip_middleware;
        pub mod correlation_id_middleware;
        pub mod security_headers_middleware;
    }
    pub mod seguridad {
        pub mod cookies;
        pub mod csrf;
        pub mod rate_limit;
        pub mod request_metadata;
        pub mod security_headers;
        pub mod session_token;
    }
}

use axum::{
    extract::{DefaultBodyLimit, State},
    http::HeaderMap,
    middleware::{from_fn, from_fn_with_state},
    routing::get,
    Json, Router,
};
use serde_json::{json, Value};
use std::net::SocketAddr;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::app_state::AppState;
use crate::config::AppConfig;
use crate::modules::auth::http::routes::auth_routes;
use crate::modules::auth::{
    application::use_cases::obtener_apps_visibles, infra::sql_repository::AuthSqlRepository,
};
use crate::modules::observabilidad::http::routes::observabilidad_routes;
use crate::modules::sesiones::http::routes::sesiones_routes;
use crate::modules::sesiones::infra::sql_repository::SesionesSqlRepository;
use crate::shared::seguridad::{
    cookies::{access_cookie_policy, read_cookie},
    session_token::hash_token,
};

#[tokio::main]
async fn main() {
    let _ = dotenvy::dotenv();
    let config = AppConfig::from_env();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new("info"))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let state = match AppState::new(config.clone()).await {
        Ok(state) => state,
        Err(err) => {
            tracing::error!("core-api no pudo inicializar el pool SQL: {err}");
            return;
        }
    };

    tracing::info!("core-api config loaded: {}", config.connection_summary());
    tracing::info!("core-api sql settings prepared");
    for warning in config.security_warnings() {
        tracing::warn!("core-api security warning: {warning}");
    }

    let app = Router::<AppState>::new()
        .nest("/api/auth", auth_routes())
        .route("/api/core/apps", get(apps))
        .merge(observabilidad_routes())
        .nest("/api/auth", sesiones_routes())
        .with_state(state.clone())
        .layer(DefaultBodyLimit::max(64 * 1024))
        .layer(from_fn_with_state(
            state.clone(),
            crate::shared::middleware::client_ip_middleware::client_ip_middleware,
        ))
        .layer(from_fn(
            crate::shared::middleware::correlation_id_middleware::correlation_id_middleware,
        ))
        .layer(from_fn(
            crate::shared::middleware::security_headers_middleware::security_headers_middleware,
        ))
        .layer(TraceLayer::new_for_http());

    let addr: SocketAddr = config.server_addr().parse().unwrap_or_else(|_| {
        tracing::error!("Direccion invalida: {}", config.server_addr());
        SocketAddr::from(([127, 0, 0, 1], 8082))
    });
    println!("Servidor corriendo en {}", addr);

    let listener = match tokio::net::TcpListener::bind(addr).await {
        Ok(listener) => listener,
        Err(err) => {
            tracing::error!("core-api no pudo abrir {}: {}", addr, err);
            return;
        }
    };

    let shutdown_signal = async {
        if tokio::signal::ctrl_c().await.is_ok() {
            tracing::info!("core-api recibio senal de apagado");
        }
    };

    if let Err(err) = axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .with_graceful_shutdown(shutdown_signal)
    .await
    {
        tracing::error!("core-api termino con error: {}", err);
    }
}

async fn apps(State(state): State<AppState>, headers: HeaderMap) -> Json<Value> {
    let Some(raw_sid) = read_cookie(&headers, access_cookie_policy().name) else {
        return Json(json!({
            "ok": false,
            "message": "Sesion no encontrada",
            "items": []
        }));
    };
    let sid_hash = hash_token(&raw_sid);
    let Some(estado) = SesionesSqlRepository::resolver_por_sid_hash(&state.pool, &sid_hash).await
    else {
        return Json(json!({
            "ok": false,
            "message": "Sesion no valida",
            "items": []
        }));
    };
    let Some(id_cuenta_portal) = estado.id_cuenta_portal else {
        return Json(json!({
            "ok": false,
            "message": "Cuenta no resuelta",
            "items": []
        }));
    };

    let repository = AuthSqlRepository::new(state.pool.clone());
    let apps = match obtener_apps_visibles(&state, &repository, id_cuenta_portal).await {
        Ok(items) => items,
        Err(message) => {
            return Json(json!({
                "ok": false,
                "message": message,
                "items": []
            }))
        }
    };

    Json(json!({
        "ok": true,
        "items": apps
    }))
}
