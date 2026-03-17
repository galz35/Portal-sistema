USE PortalCore;
GO

IF OBJECT_ID('dbo.spSeg_Identidad_ObtenerPorSidHash', 'P') IS NOT NULL
    DROP PROCEDURE dbo.spSeg_Identidad_ObtenerPorSidHash;
GO
CREATE PROCEDURE dbo.spSeg_Identidad_ObtenerPorSidHash
    @SidHash NVARCHAR(128)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (1)
        s.IdSesionPortal,
        s.IdCuentaPortal,
        c.IdPersona,
        c.Usuario,
        ISNULL(NULLIF(c.Usuario, ''), 'Empleado') AS Nombre
    FROM dbo.SesionPortal s
    INNER JOIN dbo.CuentaPortal c ON c.IdCuentaPortal = s.IdCuentaPortal
    WHERE s.SidHash = @SidHash
      AND s.EstadoSesion = 'ACTIVA'
      AND s.FechaExpiracion > SYSDATETIME()
    ORDER BY s.FechaCreacion DESC;
END;
GO

IF OBJECT_ID('dbo.spSeg_Usuario_ObtenerDetallePerfil', 'P') IS NOT NULL
    DROP PROCEDURE dbo.spSeg_Usuario_ObtenerDetallePerfil;
GO
CREATE PROCEDURE dbo.spSeg_Usuario_ObtenerDetallePerfil
    @IdPersona INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (1)
        cp.IdPersona,
        COALESCE(NULLIF(ep.nombre_completo, ''), NULLIF(cp.Usuario, ''), CONCAT('Empleado interno #', cp.IdPersona)) AS NombreEmpleado,
        NULLIF(COALESCE(ep.correo, cp.CorreoLogin), '') AS CorreoEmpleado,
        NULLIF(ep.cargo, '') AS Cargo,
        NULLIF(ep.empresa, '') AS Empresa,
        NULLIF(ep.Departamento, '') AS Departamento,
        NULLIF(ep.pais, '') AS Pais,
        NULLIF(COALESCE(ep.nom_jefe1, ep.jefe), '') AS Jefe
    FROM dbo.CuentaPortal cp
    LEFT JOIN dbo.Persona p ON p.IdPersona = cp.IdPersona
    LEFT JOIN dbo.vwEmpleadoPortal ep
        ON cp.EsInterno = 1
        AND (
            (cp.Carnet IS NOT NULL AND ep.carnet = cp.Carnet)
            OR (cp.Idhcm IS NOT NULL AND ep.idhcm = cp.Idhcm)
            OR ep.correo = cp.CorreoLogin
        )
    WHERE cp.IdPersona = @IdPersona;
END;
GO

IF OBJECT_ID('dbo.spSeg_Usuario_ListarNombresPerfil', 'P') IS NOT NULL
    DROP PROCEDURE dbo.spSeg_Usuario_ListarNombresPerfil;
GO
CREATE PROCEDURE dbo.spSeg_Usuario_ListarNombresPerfil
    @IdsPersonaJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    IF @IdsPersonaJson IS NULL OR LTRIM(RTRIM(@IdsPersonaJson)) = ''
    BEGIN
        SELECT
            CAST(NULL AS INT) AS IdPersona,
            CAST(NULL AS NVARCHAR(250)) AS NombreEmpleado
        WHERE 1 = 0;
        RETURN;
    END;

    WITH ids AS (
        SELECT DISTINCT
            TRY_CAST([value] AS INT) AS IdPersona
        FROM OPENJSON(@IdsPersonaJson)
    )
    SELECT
        ids.IdPersona,
        COALESCE(NULLIF(ep.nombre_completo, ''), NULLIF(cp.Usuario, ''), CONCAT('Empleado interno #', ids.IdPersona)) AS NombreEmpleado
    FROM ids
    CROSS APPLY (
        SELECT TOP (1)
            cp.*
        FROM dbo.CuentaPortal cp
        WHERE cp.IdPersona = ids.IdPersona
        ORDER BY cp.IdCuentaPortal DESC
    ) cp
    LEFT JOIN dbo.vwEmpleadoPortal ep
        ON cp.EsInterno = 1
        AND (
            (cp.Carnet IS NOT NULL AND ep.carnet = cp.Carnet)
            OR (cp.Idhcm IS NOT NULL AND ep.idhcm = cp.Idhcm)
            OR ep.correo = cp.CorreoLogin
        )
    WHERE ids.IdPersona IS NOT NULL
    ORDER BY ids.IdPersona;
END;
GO
