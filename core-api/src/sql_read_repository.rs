use serde_json::{json, Value};
use tiberius::Row;
use crate::{
    db_pool::SqlPool,
    modules::auth::domain::{AuthenticatedUser, EmployeeNameRecord, EmployeePortalProfile},
};

pub async fn find_login_user(
    pool: &SqlPool,
    usuario: &str,
) -> Result<Option<LoginLookup>, String> {
    let mut client = pool.get().await.map_err(|err| err.to_string())?;
    let rows = client
        .query(
            "EXEC dbo.spSeg_Login @Usuario = @P1, @TipoLogin = @P2",
            &[&usuario, &"empleado"],
        )
        .await
        .map_err(|err| err.to_string())?
        .into_first_result()
        .await
        .map_err(|err| err.to_string())?;

    Ok(rows.into_iter().next().map(|row| LoginLookup {
        id_cuenta_portal: row.get::<i32, _>("IdCuentaPortal").unwrap_or_default(),
        usuario: text(&row, "Usuario"),
        nombre: if !text(&row, "NombreEmpleado").is_empty() {
            text(&row, "NombreEmpleado")
        } else {
            join_name_parts(&row)
        },
        correo: if !text(&row, "CorreoEmpleado").is_empty() {
            text(&row, "CorreoEmpleado")
        } else {
            text(&row, "CorreoLogin")
        },
        activo: row.get::<bool, _>("Activo").unwrap_or(false),
        bloqueado: row.get::<bool, _>("Bloqueado").unwrap_or(false),
        clave_hash: text(&row, "ClaveHash"),
    }))
}

pub async fn get_user(
    pool: &SqlPool,
    id_cuenta_portal: i32,
) -> Result<Option<AuthenticatedUser>, String> {
    let mut client = pool.get().await.map_err(|err| err.to_string())?;
    let rows = client
        .query(
            "EXEC dbo.spSeg_Me @IdCuentaPortal = @P1",
            &[&id_cuenta_portal],
        )
        .await
        .map_err(|err| err.to_string())?
        .into_first_result()
        .await
        .map_err(|err| err.to_string())?;

    let Some(row) = rows.into_iter().next() else {
        return Ok(None);
    };

    let apps = list_user_apps(pool, id_cuenta_portal).await?;
    let permisos = list_user_permissions(pool, id_cuenta_portal).await?;

    Ok(Some(AuthenticatedUser {
        id_cuenta_portal: row.get::<i32, _>("IdCuentaPortal").unwrap_or_default(),
        id_persona: row.get::<i32, _>("IdPersona").unwrap_or_default(),
        usuario: text(&row, "Usuario"),
        nombre: if !text(&row, "nombre_completo").is_empty() {
            text(&row, "nombre_completo")
        } else {
            join_name_parts(&row)
        },
        correo: if !text(&row, "correo").is_empty() {
            text(&row, "correo")
        } else {
            text(&row, "CorreoLogin")
        },
        carnet: text(&row, "Carnet"),
        es_interno: row.get::<bool, _>("EsInterno").unwrap_or(false),
        apps,
        permisos,
    }))
}

pub async fn list_user_apps(
    pool: &SqlPool,
    id_cuenta_portal: i32,
) -> Result<Vec<String>, String> {
    let mut client = pool.get().await.map_err(|err| err.to_string())?;
    let rows = client
        .query(
            "EXEC dbo.spSeg_UsuarioApps @IdCuentaPortal = @P1",
            &[&id_cuenta_portal],
        )
        .await
        .map_err(|err| err.to_string())?
        .into_first_result()
        .await
        .map_err(|err| err.to_string())?;

    Ok(rows.into_iter().map(|row| text(&row, "Codigo")).collect())
}

pub async fn list_user_apps_verbose(
    pool: &SqlPool,
    id_cuenta_portal: i32,
) -> Result<Vec<Value>, String> {
    let mut client = pool.get().await.map_err(|err| err.to_string())?;
    let rows = client
        .query(
            "EXEC dbo.spSeg_UsuarioApps @IdCuentaPortal = @P1",
            &[&id_cuenta_portal],
        )
        .await
        .map_err(|err| err.to_string())?
        .into_first_result()
        .await
        .map_err(|err| err.to_string())?;

    Ok(rows
        .into_iter()
        .map(|row| {
            json!({
                "codigo": text(&row, "Codigo"),
                "nombre": text(&row, "Nombre"),
                "ruta": text(&row, "Ruta"),
                "icono": text(&row, "Icono"),
                "descripcion": ""
            })
        })
        .collect())
}

pub async fn list_user_permissions(
    pool: &SqlPool,
    id_cuenta_portal: i32,
) -> Result<Vec<String>, String> {
    let mut client = pool.get().await.map_err(|err| err.to_string())?;
    let rows = client
        .query(
            "EXEC dbo.spSeg_UsuarioPermisos @IdCuentaPortal = @P1",
            &[&id_cuenta_portal],
        )
        .await
        .map_err(|err| err.to_string())?
        .into_first_result()
        .await
        .map_err(|err| err.to_string())?;

    Ok(rows.into_iter().map(|row| text(&row, "Codigo")).collect())
}

pub async fn get_observability_snapshot(pool: &SqlPool) -> Result<Value, String> {
    let mut client = pool.get().await.map_err(|err| err.to_string())?;

    let rows = client
        .query("EXEC dbo.spSeg_Dashboard_Observabilidad", &[])
        .await
        .map_err(|err| err.to_string())?
        .into_first_result()
        .await
        .map_err(|err| err.to_string())?;
    let data = rows.first();

    Ok(json!({
        "activeSessions": data.and_then(|row| read_i64(row, "ActiveSessions")).unwrap_or_default(),
        "loginSuccess24h": data.and_then(|row| read_i64(row, "LoginSuccess24h")).unwrap_or_default(),
        "loginFailure24h": data.and_then(|row| read_i64(row, "LoginFailure24h")).unwrap_or_default(),
        "refreshFailure24h": data.and_then(|row| read_i64(row, "RefreshFailure24h")).unwrap_or_default(),
        "securityHigh24h": data.and_then(|row| read_i64(row, "SecurityHigh24h")).unwrap_or_default(),
        "securityWarn24h": data.and_then(|row| read_i64(row, "SecurityWarn24h")).unwrap_or_default()
    }))
}

pub async fn get_employee_profile(
    pool: &SqlPool,
    id_persona: i32,
) -> Result<Option<EmployeePortalProfile>, String> {
    let mut client = pool.get().await.map_err(|err| err.to_string())?;
    let rows = client
        .query(
            "EXEC dbo.spSeg_Usuario_ObtenerDetallePerfil @IdPersona = @P1",
            &[&id_persona],
        )
        .await
        .map_err(|err| err.to_string())?
        .into_first_result()
        .await
        .map_err(|err| err.to_string())?;

    let Some(row) = rows.into_iter().next() else {
        return Ok(None);
    };

    Ok(Some(EmployeePortalProfile {
        id_persona,
        nombre: text(&row, "NombreEmpleado"),
        correo: nullable_text(&row, "CorreoEmpleado"),
        cargo: nullable_text(&row, "Cargo"),
        empresa: nullable_text(&row, "Empresa"),
        departamento: nullable_text(&row, "Departamento"),
        pais: nullable_text(&row, "Pais"),
        jefe: nullable_text(&row, "Jefe"),
    }))
}

pub async fn list_employee_names(
    pool: &SqlPool,
    ids_persona: &[i32],
) -> Result<Vec<EmployeeNameRecord>, String> {
    if ids_persona.is_empty() {
        return Ok(Vec::new());
    }

    let ids_persona_json = serde_json::to_string(ids_persona).map_err(|err| err.to_string())?;
    let mut client = pool.get().await.map_err(|err| err.to_string())?;
    let rows = client
        .query(
            "EXEC dbo.spSeg_Usuario_ListarNombresPerfil @IdsPersonaJson = @P1",
            &[&ids_persona_json],
        )
        .await
        .map_err(|err| err.to_string())?
        .into_first_result()
        .await
        .map_err(|err| err.to_string())?;

    Ok(rows
        .into_iter()
        .filter_map(|row| {
            let id_persona = row.get::<i32, _>("IdPersona")?;
            let nombre = text(&row, "NombreEmpleado");
            if nombre.is_empty() {
                return None;
            }

            Some(EmployeeNameRecord { id_persona, nombre })
        })
        .collect())
}

#[derive(Debug, Clone)]
pub struct LoginLookup {
    pub id_cuenta_portal: i32,
    pub usuario: String,
    pub nombre: String,
    pub correo: String,
    pub activo: bool,
    pub bloqueado: bool,
    pub clave_hash: String,
}

fn text(row: &Row, column: &str) -> String {
    row.get::<&str, _>(column).unwrap_or_default().to_string()
}

fn nullable_text(row: &Row, column: &str) -> Option<String> {
    row.get::<&str, _>(column)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToString::to_string)
}

fn join_name_parts(row: &Row) -> String {
    [
        text(row, "Nombres"),
        text(row, "PrimerApellido"),
        text(row, "SegundoApellido"),
    ]
    .into_iter()
    .filter(|value| !value.is_empty())
    .collect::<Vec<String>>()
    .join(" ")
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
            // Soporta "1" y "1.0"
            s.parse::<i64>()
                .or_else(|_| s.parse::<f64>().map(|f| f as i64))
                .unwrap_or_default()
        })
}
