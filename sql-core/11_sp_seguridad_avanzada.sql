CREATE OR ALTER PROCEDURE dbo.spSeg_IntentoLogin_Registrar
    @UsuarioIntentado NVARCHAR(150),
    @IdCuentaPortal INT = NULL,
    @Ip NVARCHAR(60) = NULL,
    @UserAgent NVARCHAR(300) = NULL,
    @Exitoso BIT,
    @Motivo NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.IntentoLogin (
        UsuarioIntentado, IdCuentaPortal, Ip, UserAgent, Exitoso, Motivo
    )
    VALUES (
        @UsuarioIntentado, @IdCuentaPortal, @Ip, @UserAgent, @Exitoso, @Motivo
    );
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_IntentoLogin_ContarVentana
    @UsuarioIntentado NVARCHAR(150),
    @MinutosVentana INT = 15
AS
BEGIN
    SET NOCOUNT ON;

    SELECT COUNT(*) AS TotalIntentos
    FROM dbo.IntentoLogin
    WHERE UsuarioIntentado = @UsuarioIntentado
      AND FechaIntento >= DATEADD(MINUTE, -@MinutosVentana, SYSDATETIME())
      AND Exitoso = 0;
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_BloqueoCuenta_Activar
    @IdCuentaPortal INT,
    @Motivo NVARCHAR(100),
    @FechaFin DATETIME2 = NULL,
    @IdCuentaPortalOrigen INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.BloqueoCuenta (
        IdCuentaPortal, Motivo, FechaFin, IdCuentaPortalOrigen
    )
    VALUES (
        @IdCuentaPortal, @Motivo, @FechaFin, @IdCuentaPortalOrigen
    );
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_BloqueoCuenta_Validar
    @IdCuentaPortal INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (1)
        *
    FROM dbo.BloqueoCuenta
    WHERE IdCuentaPortal = @IdCuentaPortal
      AND Activo = 1
      AND (FechaFin IS NULL OR FechaFin > SYSDATETIME())
    ORDER BY FechaInicio DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_Csrf_Crear
    @IdSesionPortal BIGINT,
    @TokenHash NVARCHAR(300),
    @FechaExpiracion DATETIME2
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.TokenCsrf (
        IdSesionPortal, TokenHash, FechaExpiracion
    )
    VALUES (
        @IdSesionPortal, @TokenHash, @FechaExpiracion
    );

    SELECT SCOPE_IDENTITY() AS IdTokenCsrf;
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_Csrf_Validar
    @IdSesionPortal BIGINT,
    @TokenHash NVARCHAR(300)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        CASE WHEN EXISTS (
            SELECT 1
            FROM dbo.TokenCsrf
            WHERE IdSesionPortal = @IdSesionPortal
              AND TokenHash = @TokenHash
              AND Activo = 1
              AND FechaExpiracion > SYSDATETIME()
        ) THEN 1 ELSE 0 END AS EsValido;
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_EventoSeguridad_Registrar
    @IdCuentaPortal INT = NULL,
    @IdSesionPortal BIGINT = NULL,
    @TipoEvento NVARCHAR(80),
    @Severidad NVARCHAR(20),
    @Modulo NVARCHAR(80) = NULL,
    @Recurso NVARCHAR(120) = NULL,
    @Detalle NVARCHAR(1000) = NULL,
    @Ip NVARCHAR(60) = NULL,
    @UserAgent NVARCHAR(300) = NULL,
    @CorrelationId NVARCHAR(80) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.EventoSeguridad (
        IdCuentaPortal, IdSesionPortal, TipoEvento, Severidad, Modulo, Recurso, Detalle,
        Ip, UserAgent, CorrelationId
    )
    VALUES (
        @IdCuentaPortal, @IdSesionPortal, @TipoEvento, @Severidad, @Modulo, @Recurso, @Detalle,
        @Ip, @UserAgent, @CorrelationId
    );
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_Mfa_ObtenerEstado
    @IdCuentaPortal INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (1)
        *
    FROM dbo.MfaCuenta
    WHERE IdCuentaPortal = @IdCuentaPortal
    ORDER BY FechaCreacion DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_Mfa_Desafio_Crear
    @IdCuentaPortal INT,
    @CodigoHash NVARCHAR(300),
    @FechaExpiracion DATETIME2
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.MfaDesafio (
        IdCuentaPortal, CodigoHash, FechaExpiracion
    )
    VALUES (
        @IdCuentaPortal, @CodigoHash, @FechaExpiracion
    );

    SELECT SCOPE_IDENTITY() AS IdMfaDesafio;
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_Mfa_Desafio_Consumir
    @IdCuentaPortal INT,
    @CodigoHash NVARCHAR(300)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.MfaDesafio
    SET Estado = 'CONSUMIDO',
        FechaConsumo = SYSDATETIME()
    WHERE IdCuentaPortal = @IdCuentaPortal
      AND CodigoHash = @CodigoHash
      AND Estado = 'PENDIENTE'
      AND FechaExpiracion > SYSDATETIME();

    SELECT @@ROWCOUNT AS RegistrosAfectados;
END;
GO
