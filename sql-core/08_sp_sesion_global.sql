CREATE OR ALTER PROCEDURE dbo.spSeg_Sesion_Crear
    @IdCuentaPortal INT,
    @JtiAccessActual UNIQUEIDENTIFIER = NULL,
    @JtiRefreshActual UNIQUEIDENTIFIER = NULL,
    @IpCreacion NVARCHAR(60) = NULL,
    @UserAgent NVARCHAR(300) = NULL,
    @FechaExpiracion DATETIME2
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.SesionPortal (
        IdCuentaPortal,
        JtiAccessActual,
        JtiRefreshActual,
        EstadoSesion,
        IpCreacion,
        UserAgent,
        FechaUltimaActividad,
        FechaExpiracion
    )
    VALUES (
        @IdCuentaPortal,
        @JtiAccessActual,
        @JtiRefreshActual,
        'ACTIVA',
        @IpCreacion,
        @UserAgent,
        SYSDATETIME(),
        @FechaExpiracion
    );

    SELECT SCOPE_IDENTITY() AS IdSesionPortal;
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_Sesion_ActualizarActividad
    @IdSesionPortal BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.SesionPortal
    SET FechaUltimaActividad = SYSDATETIME()
    WHERE IdSesionPortal = @IdSesionPortal
      AND EstadoSesion = 'ACTIVA';

    SELECT @@ROWCOUNT AS RegistrosAfectados;
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_Sesion_ObtenerActiva
    @IdCuentaPortal INT = NULL,
    @JtiAccessActual UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (1)
        *
    FROM dbo.SesionPortal
    WHERE EstadoSesion = 'ACTIVA'
      AND (@IdCuentaPortal IS NULL OR IdCuentaPortal = @IdCuentaPortal)
      AND (@JtiAccessActual IS NULL OR JtiAccessActual = @JtiAccessActual)
    ORDER BY FechaCreacion DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_Sesion_Revocar
    @IdSesionPortal BIGINT,
    @MotivoRevocacion NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.SesionPortal
    SET EstadoSesion = 'REVOCADA',
        FechaRevocacion = SYSDATETIME(),
        MotivoRevocacion = @MotivoRevocacion
    WHERE IdSesionPortal = @IdSesionPortal
      AND EstadoSesion = 'ACTIVA';

    SELECT @@ROWCOUNT AS RegistrosAfectados;
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_Sesion_RevocarTodas
    @IdCuentaPortal INT,
    @MotivoRevocacion NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.SesionPortal
    SET EstadoSesion = 'REVOCADA',
        FechaRevocacion = SYSDATETIME(),
        MotivoRevocacion = @MotivoRevocacion
    WHERE IdCuentaPortal = @IdCuentaPortal
      AND EstadoSesion = 'ACTIVA';

    SELECT @@ROWCOUNT AS RegistrosAfectados;
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_AccessToken_Revocar
    @Jti UNIQUEIDENTIFIER,
    @IdSesionPortal BIGINT = NULL,
    @FechaExpiracion DATETIME2
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.AccessTokenRevocado (
        Jti,
        IdSesionPortal,
        FechaExpiracion
    )
    VALUES (
        @Jti,
        @IdSesionPortal,
        @FechaExpiracion
    );
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_AccessToken_EstaRevocado
    @Jti UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        CASE WHEN EXISTS (
            SELECT 1
            FROM dbo.AccessTokenRevocado
            WHERE Jti = @Jti
              AND FechaExpiracion > SYSDATETIME()
        ) THEN 1 ELSE 0 END AS EstaRevocado;
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_Sesion_Me
    @IdCuentaPortal INT,
    @IdSesionPortal BIGINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    EXEC dbo.spSeg_Me @IdCuentaPortal = @IdCuentaPortal;
    EXEC dbo.spSeg_UsuarioApps @IdCuentaPortal = @IdCuentaPortal;
    EXEC dbo.spSeg_UsuarioPermisos @IdCuentaPortal = @IdCuentaPortal;

    SELECT TOP (1)
        IdSesionPortal,
        IdCuentaPortal,
        JtiAccessActual,
        JtiRefreshActual,
        EstadoSesion,
        FechaCreacion,
        FechaUltimaActividad,
        FechaExpiracion
    FROM dbo.SesionPortal
    WHERE IdCuentaPortal = @IdCuentaPortal
      AND (@IdSesionPortal IS NULL OR IdSesionPortal = @IdSesionPortal)
    ORDER BY FechaCreacion DESC;
END;
GO
