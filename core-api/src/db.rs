use crate::config::AppConfig;

#[derive(Clone, Debug)]
pub struct SqlServerSettings {
    pub host: String,
    pub port: u16,
    pub database: String,
    pub user: String,
    pub password: String,
    pub trust_server_certificate: bool,
}

impl SqlServerSettings {
    pub fn from_config(config: &AppConfig) -> Self {
        Self {
            host: config.database_host.clone(),
            port: config.database_port,
            database: config.database_name.clone(),
            user: config.database_user.clone(),
            password: config.database_password.clone(),
            trust_server_certificate: config.trust_server_certificate,
        }
    }

    pub fn should_trust_certificate(&self) -> bool {
        self.trust_server_certificate || matches!(self.host.as_str(), "127.0.0.1" | "localhost")
    }
}

#[derive(Clone, Debug)]
pub struct PortalCoreProcedures;

impl PortalCoreProcedures {
    pub const LOGIN: &'static str = "spSeg_Login";
    pub const USER_APPS: &'static str = "spSeg_UsuarioApps";
    pub const ME: &'static str = "spSeg_Me";
}
