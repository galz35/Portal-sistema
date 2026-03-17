use crate::config::AppConfig;
use crate::db::SqlServerSettings;
use crate::db_pool::{SqlPool, TSqlManager};

#[derive(Clone)]
pub struct AppState {
    pub config: AppConfig,
    pub sql: SqlServerSettings,
    pub pool: SqlPool,
}

impl AppState {
    pub async fn new(config: AppConfig) -> Result<Self, String> {
        let sql = SqlServerSettings::from_config(&config);
        let manager = TSqlManager::new(sql.clone());
        let pool = bb8::Pool::builder()
            .max_size(10)
            .build(manager)
            .await
            .map_err(|err| err.to_string())?;
            
        Ok(Self { config, sql, pool })
    }
}
