CREATE OR ALTER PROCEDURE dbo.spSeg_Login
    @Usuario NVARCHAR(150),
    @TipoLogin NVARCHAR(30) = N'general'
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (1)
        cp.IdCuentaPortal,
        cp.IdPersona,
        cp.Usuario,
        cp.CorreoLogin,
        cp.ClaveHash,
        cp.EsInterno,
        cp.EsExterno,
        cp.Carnet,
        cp.Idhcm,
        cp.Activo,
        cp.Bloqueado,
        p.Nombres,
        p.PrimerApellido,
        p.SegundoApellido,
        ep.nombre_completo AS NombreEmpleado,
        ep.correo AS CorreoEmpleado
    FROM dbo.CuentaPortal cp
    LEFT JOIN dbo.Persona p
        ON p.IdPersona = cp.IdPersona
    LEFT JOIN dbo.vwEmpleadoPortal ep
        ON cp.EsInterno = 1
       AND (
            (cp.Carnet IS NOT NULL AND ep.carnet = cp.Carnet)
            OR (cp.Idhcm IS NOT NULL AND ep.idhcm = cp.Idhcm)
            OR ep.correo = cp.CorreoLogin
       )
    WHERE cp.Usuario = @Usuario
       OR cp.CorreoLogin = @Usuario;
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_UsuarioApps
    @IdCuentaPortal INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        a.IdAplicacion,
        a.Codigo,
        a.Nombre,
        a.Ruta,
        a.Icono,
        a.OrdenVisual
    FROM dbo.UsuarioAplicacion ua
    INNER JOIN dbo.AplicacionSistema a
        ON a.IdAplicacion = ua.IdAplicacion
    WHERE ua.IdCuentaPortal = @IdCuentaPortal
      AND ua.Activo = 1
      AND a.Activo = 1
    ORDER BY a.OrdenVisual, a.Nombre;
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_UsuarioPermisos
    @IdCuentaPortal INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT DISTINCT
        p.IdPermiso,
        p.Codigo,
        p.Nombre,
        p.Modulo,
        p.Descripcion
    FROM dbo.UsuarioRolAplicacion ura
    INNER JOIN dbo.RolPermiso rp
        ON rp.IdRol = ura.IdRol
       AND rp.Activo = 1
    INNER JOIN dbo.PermisoSistema p
        ON p.IdPermiso = rp.IdPermiso
       AND p.Activo = 1
    WHERE ura.IdCuentaPortal = @IdCuentaPortal
      AND ura.Activo = 1;
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_Me
    @IdCuentaPortal INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (1)
        cp.IdCuentaPortal,
        cp.IdPersona,
        cp.Usuario,
        cp.CorreoLogin,
        cp.EsInterno,
        cp.EsExterno,
        cp.Carnet,
        cp.Idhcm,
        p.Nombres,
        p.PrimerApellido,
        p.SegundoApellido,
        ep.nombre_completo,
        ep.correo,
        ep.cargo,
        ep.empresa,
        ep.Departamento,
        ep.Direccion,
        ep.pais
    FROM dbo.CuentaPortal cp
    LEFT JOIN dbo.Persona p
        ON p.IdPersona = cp.IdPersona
    LEFT JOIN dbo.vwEmpleadoPortal ep
        ON cp.EsInterno = 1
       AND (
            (cp.Carnet IS NOT NULL AND ep.carnet = cp.Carnet)
            OR (cp.Idhcm IS NOT NULL AND ep.idhcm = cp.Idhcm)
            OR ep.correo = cp.CorreoLogin
       )
    WHERE cp.IdCuentaPortal = @IdCuentaPortal;
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_Refresh_Insertar
    @IdCuentaPortal INT,
    @TokenHash NVARCHAR(300),
    @Jti UNIQUEIDENTIFIER,
    @FechaExpiracion DATETIME2,
    @IpCreacion NVARCHAR(60) = NULL,
    @UserAgent NVARCHAR(300) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.RefreshToken (
        IdCuentaPortal,
        TokenHash,
        Jti,
        FechaExpiracion,
        IpCreacion,
        UserAgent
    )
    VALUES (
        @IdCuentaPortal,
        @TokenHash,
        @Jti,
        @FechaExpiracion,
        @IpCreacion,
        @UserAgent
    );

    SELECT SCOPE_IDENTITY() AS IdRefreshToken;
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_Refresh_Obtener
    @TokenHash NVARCHAR(300)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (1)
        rt.IdRefreshToken,
        rt.IdCuentaPortal,
        rt.TokenHash,
        rt.Jti,
        rt.FechaExpiracion,
        rt.Revocado,
        rt.FechaRevocacion,
        rt.IpCreacion,
        rt.UserAgent,
        rt.FechaCreacion
    FROM dbo.RefreshToken rt
    WHERE rt.TokenHash = @TokenHash
      AND rt.Revocado = 0
      AND rt.FechaExpiracion > SYSDATETIME();
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_Refresh_Revocar
    @TokenHash NVARCHAR(300)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.RefreshToken
    SET Revocado = 1,
        FechaRevocacion = SYSDATETIME()
    WHERE TokenHash = @TokenHash
      AND Revocado = 0;

    SELECT @@ROWCOUNT AS RegistrosAfectados;
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_Auditoria_Insertar
    @IdCuentaPortal INT = NULL,
    @Usuario NVARCHAR(100) = NULL,
    @Evento NVARCHAR(50),
    @Modulo NVARCHAR(80) = NULL,
    @Exitoso BIT,
    @Detalle NVARCHAR(500) = NULL,
    @Ip NVARCHAR(60) = NULL,
    @UserAgent NVARCHAR(300) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.AuditoriaAcceso (
        IdCuentaPortal,
        Usuario,
        Evento,
        Modulo,
        Exitoso,
        Detalle,
        Ip,
        UserAgent
    )
    VALUES (
        @IdCuentaPortal,
        @Usuario,
        @Evento,
        @Modulo,
        @Exitoso,
        @Detalle,
        @Ip,
        @UserAgent
    );
END;
GO

CREATE OR ALTER PROCEDURE dbo.spEmp_ValidarActivo
    @Carnet NVARCHAR(30) = NULL,
    @Idhcm NVARCHAR(50) = NULL,
    @Correo NVARCHAR(150) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (1)
        ep.carnet,
        ep.idhcm,
        ep.nombre_completo,
        ep.correo,
        ep.cargo,
        ep.empresa,
        ep.fechabaja
    FROM dbo.vwEmpleadoPortal ep
    WHERE (@Carnet IS NOT NULL AND ep.carnet = @Carnet)
       OR (@Idhcm IS NOT NULL AND ep.idhcm = @Idhcm)
       OR (@Correo IS NOT NULL AND ep.correo = @Correo);
END;
GO
