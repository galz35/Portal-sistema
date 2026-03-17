use chrono::{Duration, Utc};
use crate::{
    db_pool::SqlPool,
    modules::sesiones::domain::{EstadoSesion, SesionPortal},
};
use tiberius::Row;

#[derive(Clone)]
pub struct SesionesSqlRepository {
    pool: SqlPool,
    id_cuenta_portal: i32,
}

impl SesionesSqlRepository {
    pub fn new(pool: SqlPool, id_cuenta_portal: i32) -> Self {
        Self {
            pool,
            id_cuenta_portal,
        }
    }

    pub async fn crear_con_sid_hash(&self, sid_hash: &str) -> Option<SesionPortal> {
        let mut client = self.pool.get().await.ok()?;
        let fecha_expiracion = Utc::now().naive_utc() + Duration::days(7);
        let rows = client
            .query(
                "EXEC dbo.spSeg_Sesion_Crear
                    @IdCuentaPortal = @P1,
                    @SidHash = @P2,
                    @JtiAccessActual = NULL,
                    @JtiRefreshActual = NULL,
                    @IpCreacion = NULL,
                    @UserAgent = @P3,
                    @FechaExpiracion = @P4",
                &[&self.id_cuenta_portal, &sid_hash, &"core-api", &fecha_expiracion],
            )
            .await
            .ok()?
            .into_first_result()
            .await
            .ok()?;

        let id_sesion_portal = rows
            .first()
            .and_then(|row| read_i64(row, "IdSesionPortal"))
            .unwrap_or_default();

        if id_sesion_portal <= 0 {
            return None;
        }

        Some(SesionPortal {
            id_sesion_portal,
            id_cuenta_portal: self.id_cuenta_portal,
            sid: format!("portal-session-{id_sesion_portal}"),
            estado_sesion: "ACTIVA".to_string(),
        })
    }

    pub async fn actualizar_actividad_por_id(&self, id_sesion_portal: i64) -> bool {
        let mut client = match self.pool.get().await {
            Ok(client) => client,
            Err(_) => return false,
        };

        client
            .execute(
                "EXEC dbo.spSeg_Sesion_ActualizarActividad @IdSesionPortal = @P1",
                &[&id_sesion_portal],
            )
            .await
            .is_ok()
    }

    pub async fn rotar_sid_hash(
        &self,
        id_sesion_portal: i64,
        sid_hash_actual: &str,
        nuevo_sid_hash: &str,
    ) -> bool {
        let mut client = match self.pool.get().await {
            Ok(client) => client,
            Err(_) => return false,
        };

        let rows = match client
            .query(
                "EXEC dbo.spSeg_Sesion_RotarSidHash
                    @IdSesionPortal = @P1,
                    @SidHashActual = @P2,
                    @NuevoSidHash = @P3",
                &[&id_sesion_portal, &sid_hash_actual, &nuevo_sid_hash],
            )
            .await
        {
            Ok(result) => match result.into_first_result().await {
                Ok(rows) => rows,
                Err(_) => return false,
            },
            Err(_) => return false,
        };

        rows.first()
            .and_then(|row| row.get::<i32, _>("RegistrosAfectados"))
            .unwrap_or_default()
            > 0
    }

    pub async fn obtener_activa(&self) -> Option<EstadoSesion> {
        let mut client = self.pool.get().await.ok()?;
        let rows = client
            .query(
                "EXEC dbo.spSeg_Sesion_ObtenerActiva @IdCuentaPortal = @P1, @SidHash = NULL, @JtiAccessActual = NULL",
                &[&self.id_cuenta_portal],
            )
            .await
            .ok()?
            .into_first_result()
            .await
            .ok()?;
        let row = rows.first()?;
        let id_sesion_portal = read_i64(row, "IdSesionPortal");

        Some(EstadoSesion {
            autenticado: id_sesion_portal.is_some(),
            id_cuenta_portal: Some(self.id_cuenta_portal),
            id_sesion_portal,
        })
    }

    pub async fn revocar(&self) -> Option<SesionPortal> {
        let estado = self.obtener_activa().await?;
        let id_sesion_portal = estado.id_sesion_portal?;
        self.revocar_por_id(id_sesion_portal).await
    }

    pub async fn revocar_por_id(&self, id_sesion_portal: i64) -> Option<SesionPortal> {
        let mut client = self.pool.get().await.ok()?;
        client
            .execute(
                "EXEC dbo.spSeg_Sesion_Revocar @IdSesionPortal = @P1, @MotivoRevocacion = @P2",
                &[&id_sesion_portal, &"logout"],
            )
            .await
            .ok()?;

        Some(SesionPortal {
            id_sesion_portal,
            id_cuenta_portal: self.id_cuenta_portal,
            sid: format!("portal-session-{id_sesion_portal}"),
            estado_sesion: "REVOCADA".to_string(),
        })
    }

    pub async fn revocar_todas(&self) -> bool {
        let mut client = match self.pool.get().await {
            Ok(client) => client,
            Err(_) => return false,
        };

        client
            .execute(
                "EXEC dbo.spSeg_Sesion_RevocarTodas @IdCuentaPortal = @P1, @MotivoRevocacion = @P2",
                &[&self.id_cuenta_portal, &"logout_all"],
            )
            .await
            .is_ok()
    }

    pub async fn crear_csrf_token(&self, id_sesion_portal: i64, token_hash: &str) -> bool {
        let mut client = match self.pool.get().await {
            Ok(client) => client,
            Err(_) => return false,
        };
        let fecha_expiracion = Utc::now().naive_utc() + Duration::hours(2);

        client
            .execute(
                "EXEC dbo.spSeg_Csrf_Crear
                    @IdSesionPortal = @P1,
                    @TokenHash = @P2,
                    @FechaExpiracion = @P3",
                &[&id_sesion_portal, &token_hash, &fecha_expiracion],
            )
            .await
            .is_ok()
    }

    pub async fn validar_csrf_token(&self, id_sesion_portal: i64, token_hash: &str) -> bool {
        let mut client = match self.pool.get().await {
            Ok(client) => client,
            Err(_) => return false,
        };

        let rows = match client
            .query(
                "EXEC dbo.spSeg_Csrf_Validar
                    @IdSesionPortal = @P1,
                    @TokenHash = @P2",
                &[&id_sesion_portal, &token_hash],
            )
            .await
        {
            Ok(result) => match result.into_first_result().await {
                Ok(rows) => rows,
                Err(_) => return false,
            },
            Err(_) => return false,
        };

        rows.first()
            .and_then(|row| row.get::<bool, _>("EsValido"))
            .unwrap_or(false)
    }

    pub async fn revocar_csrf_por_sesion(&self, id_sesion_portal: i64) -> bool {
        let mut client = match self.pool.get().await {
            Ok(client) => client,
            Err(_) => return false,
        };

        client
            .execute(
                "EXEC dbo.spSeg_Csrf_RevocarPorSesion @IdSesionPortal = @P1",
                &[&id_sesion_portal],
            )
            .await
            .is_ok()
    }

    pub async fn obtener_por_id(&self, id_sesion_portal: i64) -> Option<EstadoSesion> {
        let mut client = self.pool.get().await.ok()?;
        let rows = client
            .query(
                "EXEC dbo.spSeg_Sesion_Me @IdCuentaPortal = @P1, @IdSesionPortal = @P2",
                &[&self.id_cuenta_portal, &id_sesion_portal],
            )
            .await
            .ok()?
            .into_results()
            .await
            .ok()?;
        let row = rows.last()?.first()?;
        let estado_sesion = row.get::<&str, _>("EstadoSesion").unwrap_or_default();
        let id_cuenta_portal = row.get::<i32, _>("IdCuentaPortal");
        let current_id = read_i64(row, "IdSesionPortal");

        Some(EstadoSesion {
            autenticado: estado_sesion == "ACTIVA" && current_id == Some(id_sesion_portal),
            id_cuenta_portal,
            id_sesion_portal: current_id,
        })
    }

    pub async fn resolver_por_sid_hash(
        pool: &SqlPool,
        sid_hash: &str,
    ) -> Option<EstadoSesion> {
        let mut client = pool.get().await.ok()?;
        let rows = client
            .query(
                "EXEC dbo.spSeg_Sesion_ValidarPorSidHash @SidHash = @P1",
                &[&sid_hash],
            )
            .await
            .ok()?
            .into_first_result()
            .await
            .ok()?;
        let row = rows.first()?;
        let id_cuenta_portal = row.get::<i32, _>("IdCuentaPortal");
        let id_sesion_portal = read_i64(row, "IdSesionPortal");

        Some(EstadoSesion {
            autenticado: id_sesion_portal.is_some(),
            id_cuenta_portal,
            id_sesion_portal,
        })
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
