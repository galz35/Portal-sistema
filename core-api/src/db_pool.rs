use async_trait::async_trait;
use bb8::ManageConnection;
use tiberius::{AuthMethod, Client, Config};
use tokio::net::TcpStream;
use tokio_util::compat::{Compat, TokioAsyncWriteCompatExt};
use crate::db::SqlServerSettings;

type SqlClient = Client<Compat<TcpStream>>;

pub struct TSqlManager {
    settings: SqlServerSettings,
}

impl TSqlManager {
    pub fn new(settings: SqlServerSettings) -> Self {
        Self { settings }
    }
}

#[async_trait]
impl ManageConnection for TSqlManager {
    type Connection = SqlClient;
    type Error = tiberius::error::Error;

    async fn connect(&self) -> Result<Self::Connection, Self::Error> {
        let mut config = Config::new();
        config.host(&self.settings.host);
        config.port(self.settings.port);
        config.database(&self.settings.database);
        config.authentication(AuthMethod::sql_server(&self.settings.user, &self.settings.password));
        
        if self.settings.should_trust_certificate() {
            config.trust_cert();
        }

        let tcp = TcpStream::connect((self.settings.host.as_str(), self.settings.port)).await?;
        tcp.set_nodelay(true)?;

        Client::connect(config, tcp.compat_write()).await
    }

    async fn is_valid(&self, conn: &mut Self::Connection) -> Result<(), Self::Error> {
        conn.simple_query("SELECT 1").await?.into_first_result().await?;
        Ok(())
    }

    fn has_broken(&self, _conn: &mut Self::Connection) -> bool {
        false
    }
}

pub type SqlPool = bb8::Pool<TSqlManager>;
