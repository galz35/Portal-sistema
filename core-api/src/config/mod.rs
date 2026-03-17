use std::{collections::HashMap, env, fs, path::PathBuf};

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub host: String,
    pub port: u16,
    pub trust_proxy_headers: bool,
    pub database_host: String,
    pub database_port: u16,
    pub database_name: String,
    pub database_user: String,
    pub database_password: String,
    pub trust_server_certificate: bool,
    pub jwt_secret: String,
    pub login_rate_limit_max_attempts: u32,
    pub login_rate_limit_window_minutes: u64,
    pub login_lock_minutes: u64,
}

impl AppConfig {
    pub fn from_env() -> Self {
        let file_values =
            load_key_values_from_connection_file(env_flag("ALLOW_CONNECTION_FILE", false));

        Self {
            host: env::var("CORE_API_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
            port: env::var("CORE_API_PORT")
                .ok()
                .and_then(|value| value.parse::<u16>().ok())
                .unwrap_or(8082),
            trust_proxy_headers: env_flag("TRUST_PROXY_HEADERS", false),
            database_host: env::var("MSSQL_HOST")
                .ok()
                .or_else(|| file_values.get("MSSQL_HOST").cloned())
                .unwrap_or_else(|| "127.0.0.1".to_string()),
            database_port: env::var("MSSQL_PORT")
                .ok()
                .or_else(|| file_values.get("MSSQL_PORT").cloned())
                .and_then(|value| value.parse::<u16>().ok())
                .unwrap_or(1433),
            database_name: env::var("MSSQL_DATABASE")
                .ok()
                .or_else(|| file_values.get("MSSQL_DATABASE").cloned())
                .unwrap_or_else(|| "PortalCore".to_string()),
            database_user: env::var("MSSQL_USER")
                .ok()
                .or_else(|| file_values.get("MSSQL_USER").cloned())
                .unwrap_or_else(|| "sa".to_string()),
            database_password: env::var("MSSQL_PASSWORD")
                .ok()
                .or_else(|| file_values.get("MSSQL_PASSWORD").cloned())
                .unwrap_or_default(),
            trust_server_certificate: env::var("MSSQL_TRUST_CERT")
                .ok()
                .or_else(|| file_values.get("MSSQL_TRUST_CERT").cloned())
                .map(|value| {
                    matches!(
                        value.trim().to_ascii_lowercase().as_str(),
                        "1" | "true" | "yes" | "on"
                    )
                })
                .unwrap_or(false),
            jwt_secret: env::var("JWT_SECRET").unwrap_or_else(|_| "portal-dev-secret".to_string()),
            login_rate_limit_max_attempts: env::var("PORTAL_LOGIN_RATE_LIMIT_MAX_ATTEMPTS")
                .ok()
                .and_then(|value| value.parse::<u32>().ok())
                .unwrap_or(8),
            login_rate_limit_window_minutes: env::var("PORTAL_LOGIN_RATE_LIMIT_WINDOW_MINUTES")
                .ok()
                .and_then(|value| value.parse::<u64>().ok())
                .unwrap_or(15),
            login_lock_minutes: env::var("PORTAL_LOGIN_LOCK_MINUTES")
                .ok()
                .and_then(|value| value.parse::<u64>().ok())
                .unwrap_or(30),
        }
    }

    pub fn server_addr(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }

    pub fn connection_summary(&self) -> String {
        format!(
            "sqlserver://{}:***@{}:{}/{}",
            self.database_user, self.database_host, self.database_port, self.database_name
        )
    }

    pub fn security_warnings(&self) -> Vec<String> {
        let mut warnings = Vec::new();

        if self.database_password.trim().is_empty() {
            warnings.push("MSSQL_PASSWORD esta vacio".to_string());
        }
        if self.database_user.eq_ignore_ascii_case("sa") {
            warnings.push("MSSQL_USER sigue usando sa".to_string());
        }
        if self.trust_server_certificate && !is_local_host(&self.database_host) {
            warnings.push("MSSQL_TRUST_CERT=true en un host no local".to_string());
        }
        if env_flag("ALLOW_CONNECTION_FILE", false) {
            warnings.push(
                "ALLOW_CONNECTION_FILE=true mantiene lectura de secretos desde conexion.txt"
                    .to_string(),
            );
        }
        if self.jwt_secret == "portal-dev-secret" {
            warnings.push("JWT_SECRET sigue en valor por defecto".to_string());
        }
        if !cookie_secure_enabled() && !is_local_host(&self.host) {
            warnings.push("COOKIE_SECURE=false en un host no local".to_string());
        }
        if self.trust_proxy_headers && !is_loopback_bind_host(&self.host) {
            warnings.push("TRUST_PROXY_HEADERS=true con backend expuesto fuera de loopback; restringe red o cambia CORE_API_HOST".to_string());
        }

        warnings
    }
}

fn load_key_values_from_connection_file(allow_connection_file: bool) -> HashMap<String, String> {
    if !allow_connection_file {
        return HashMap::new();
    }

    let path = find_connection_file();

    let Some(path) = path else {
        return HashMap::new();
    };

    let Ok(contents) = fs::read_to_string(path) else {
        return HashMap::new();
    };

    contents
        .lines()
        .filter_map(|line| {
            let trimmed = line.trim();
            if trimmed.is_empty() || trimmed.starts_with('#') {
                return None;
            }

            let (key, value) = trimmed.split_once('=')?;
            Some((key.trim().to_string(), value.trim().to_string()))
        })
        .collect()
}

fn find_connection_file() -> Option<PathBuf> {
    let cwd = env::current_dir().ok()?;
    let direct = cwd.join("conexion.txt");
    if direct.exists() {
        return Some(direct);
    }

    let parent = cwd.parent()?.parent()?.join("conexion.txt");
    if parent.exists() {
        return Some(parent);
    }

    None
}

fn env_flag(name: &str, default: bool) -> bool {
    env::var(name)
        .ok()
        .map(|value| {
            matches!(
                value.trim().to_ascii_lowercase().as_str(),
                "1" | "true" | "yes" | "on"
            )
        })
        .unwrap_or(default)
}

fn cookie_secure_enabled() -> bool {
    env::var("COOKIE_SECURE")
        .ok()
        .map(|value| {
            matches!(
                value.trim().to_ascii_lowercase().as_str(),
                "1" | "true" | "yes" | "on"
            )
        })
        .unwrap_or(false)
}

fn is_local_host(host: &str) -> bool {
    matches!(
        host.trim().to_ascii_lowercase().as_str(),
        "127.0.0.1" | "localhost" | "::1"
    )
}

fn is_loopback_bind_host(host: &str) -> bool {
    matches!(
        host.trim().to_ascii_lowercase().as_str(),
        "127.0.0.1" | "localhost" | "::1"
    )
}
