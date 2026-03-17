USE PortalCore;
GO

IF OBJECT_ID('dbo.spSeg_Dashboard_Observabilidad', 'P') IS NOT NULL
    DROP PROCEDURE dbo.spSeg_Dashboard_Observabilidad;
GO

CREATE PROCEDURE dbo.spSeg_Dashboard_Observabilidad
AS
BEGIN
    SET NOCOUNT ON;

    -- Sesiones Activas
    DECLARE @ActiveSessions BIGINT;
    SELECT @ActiveSessions = COUNT_BIG(1) 
    FROM dbo.SesionPortal 
    WHERE EstadoSesion = 'ACTIVA' AND FechaExpiracion > SYSDATETIME();

    -- Logins 24h
    DECLARE @LoginSuccess24h INT, @LoginFailure24h INT;
    SELECT 
        @LoginSuccess24h = SUM(CASE WHEN Exitoso = 1 THEN 1 ELSE 0 END),
        @LoginFailure24h = SUM(CASE WHEN Exitoso = 0 THEN 1 ELSE 0 END)
    FROM dbo.IntentoLogin
    WHERE FechaIntento >= DATEADD(HOUR, -24, SYSDATETIME());

    -- Eventos 24h
    DECLARE @RefreshFailure24h INT, @SecurityHigh24h INT, @SecurityWarn24h INT;
    SELECT 
        @RefreshFailure24h = SUM(CASE WHEN TipoEvento = 'REFRESH_SESSION_MISSING' THEN 1 ELSE 0 END),
        @SecurityHigh24h = SUM(CASE WHEN Severidad = 'HIGH' THEN 1 ELSE 0 END),
        @SecurityWarn24h = SUM(CASE WHEN Severidad = 'WARN' THEN 1 ELSE 0 END)
    FROM dbo.EventoSeguridad
    WHERE FechaEvento >= DATEADD(HOUR, -24, SYSDATETIME());

    SELECT 
        ISNULL(@ActiveSessions, 0) AS ActiveSessions,
        ISNULL(@LoginSuccess24h, 0) AS LoginSuccess24h,
        ISNULL(@LoginFailure24h, 0) AS LoginFailure24h,
        ISNULL(@RefreshFailure24h, 0) AS RefreshFailure24h,
        ISNULL(@SecurityHigh24h, 0) AS SecurityHigh24h,
        ISNULL(@SecurityWarn24h, 0) AS SecurityWarn24h;
END;
GO
