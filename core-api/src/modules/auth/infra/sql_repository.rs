use chrono::{Duration, Utc};
use tiberius::Row;

use crate::db::PortalCoreProcedures;
use crate::db_pool::SqlPool;

#[derive(Debug, Clone)]
pub struct AuthSqlRepository {
    pool: SqlPool,
}

impl AuthSqlRepository {
    pub fn new(pool: SqlPool) -> Self {
        Self { pool }
    }

    pub fn procedure_login_name(&self) -> &'static str {
        PortalCoreProcedures::LOGIN
    }

    pub fn procedure_user_apps_name(&self) -> &'static str {
        PortalCoreProcedures::USER_APPS
    }

    pub fn procedure_me_name(&self) -> &'static str {
        PortalCoreProcedures::ME
    }

    pub async fn register_login_attempt(
        &self,
        usuario_intentado: &str,
        id_cuenta_portal: Option<i32>,
        ip: Option<&str>,
        user_agent: Option<&str>,
        exitoso: bool,
        motivo: Option<&str>,
    ) -> Result<(), String> {
        let mut client = self.pool.get().await.map_err(|err| err.to_string())?;
        client
            .execute(
                "EXEC dbo.spSeg_IntentoLogin_Registrar
                    @UsuarioIntentado = @P1,
                    @IdCuentaPortal = @P2,
                    @Ip = @P3,
                    @UserAgent = @P4,
                    @Exitoso = @P5,
                    @Motivo = @P6",
                &[
                    &usuario_intentado,
                    &id_cuenta_portal,
                    &ip,
                    &user_agent,
                    &exitoso,
                    &motivo,
                ],
            )
            .await
            .map_err(|err| err.to_string())?;
        Ok(())
    }

    pub async fn count_recent_failed_logins(
        &self,
        usuario_intentado: &str,
        minutos_ventana: i32,
    ) -> Result<i64, String> {
        let mut client = self.pool.get().await.map_err(|err| err.to_string())?;
        let rows = client
            .query(
                "EXEC dbo.spSeg_IntentoLogin_ContarVentana
                    @UsuarioIntentado = @P1,
                    @MinutosVentana = @P2",
                &[&usuario_intentado, &minutos_ventana],
            )
            .await
            .map_err(|err| err.to_string())?
            .into_first_result()
            .await
            .map_err(|err| err.to_string())?;

        Ok(rows
            .first()
            .and_then(|row| read_i64(row, "TotalIntentos"))
            .unwrap_or_default())
    }

    pub async fn is_account_locked(
        &self,
        id_cuenta_portal: i32,
    ) -> Result<bool, String> {
        let mut client = self.pool.get().await.map_err(|err| err.to_string())?;
        let rows = client
            .query(
                "EXEC dbo.spSeg_BloqueoCuenta_Validar @IdCuentaPortal = @P1",
                &[&id_cuenta_portal],
            )
            .await
            .map_err(|err| err.to_string())?
            .into_first_result()
            .await
            .map_err(|err| err.to_string())?;

        Ok(rows.first().is_some())
    }

    pub async fn activate_account_lock(
        &self,
        id_cuenta_portal: i32,
        motivo: &str,
        minutos_bloqueo: i32,
    ) -> Result<(), String> {
        let mut client = self.pool.get().await.map_err(|err| err.to_string())?;
        let fecha_fin = Utc::now().naive_utc() + Duration::minutes(i64::from(minutos_bloqueo));
        client
            .execute(
                "EXEC dbo.spSeg_BloqueoCuenta_Activar
                    @IdCuentaPortal = @P1,
                    @Motivo = @P2,
                    @FechaFin = @P3,
                    @IdCuentaPortalOrigen = NULL",
                &[&id_cuenta_portal, &motivo, &fecha_fin],
            )
            .await
            .map_err(|err| err.to_string())?;
        Ok(())
    }

    pub async fn register_security_event(
        &self,
        id_cuenta_portal: Option<i32>,
        id_sesion_portal: Option<i64>,
        tipo_evento: &str,
        severidad: &str,
        modulo: Option<&str>,
        recurso: Option<&str>,
        detalle: Option<&str>,
        ip: Option<&str>,
        user_agent: Option<&str>,
        correlation_id: Option<&str>,
    ) -> Result<(), String> {
        let mut client = self.pool.get().await.map_err(|err| err.to_string())?;
        client
            .execute(
                "EXEC dbo.spSeg_EventoSeguridad_Registrar
                    @IdCuentaPortal = @P1,
                    @IdSesionPortal = @P2,
                    @TipoEvento = @P3,
                    @Severidad = @P4,
                    @Modulo = @P5,
                    @Recurso = @P6,
                    @Detalle = @P7,
                    @Ip = @P8,
                    @UserAgent = @P9,
                    @CorrelationId = @P10",
                &[
                    &id_cuenta_portal,
                    &id_sesion_portal,
                    &tipo_evento,
                    &severidad,
                    &modulo,
                    &recurso,
                    &detalle,
                    &ip,
                    &user_agent,
                    &correlation_id,
                ],
            )
            .await
            .map_err(|err| err.to_string())?;
        Ok(())
    }
}

fn read_i64(row: &Row, column: &str) -> Option<i64> {
    if let Ok(Some(v)) = row.try_get::<i32, _>(column) {
        return Some(v as i64);
    }

    if let Ok(Some(v)) = row.try_get::<i64, _>(column) {
        return Some(v);
    }

    row.try_get::<tiberius::numeric::Numeric, _>(column)
        .ok()
        .flatten()
        .map(|value| {
            let s = value.to_string();
            s.parse::<i64>()
                .or_else(|_| s.parse::<f64>().map(|f| f as i64))
                .unwrap_or_default()
        })
}
