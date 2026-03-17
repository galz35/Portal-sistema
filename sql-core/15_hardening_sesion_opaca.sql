IF COL_LENGTH('dbo.SesionPortal', 'SidHash') IS NULL
BEGIN
    ALTER TABLE dbo.SesionPortal
    ADD SidHash NVARCHAR(128) NULL;
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_SesionPortal_SidHash_Activa'
      AND object_id = OBJECT_ID('dbo.SesionPortal')
)
BEGIN
    CREATE INDEX IX_SesionPortal_SidHash_Activa
    ON dbo.SesionPortal (SidHash, EstadoSesion, FechaExpiracion DESC);
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_Sesion_Crear
    @IdCuentaPortal INT,
    @SidHash NVARCHAR(128),
    @JtiAccessActual UNIQUEIDENTIFIER = NULL,
    @JtiRefreshActual UNIQUEIDENTIFIER = NULL,
    @IpCreacion NVARCHAR(60) = NULL,
    @UserAgent NVARCHAR(300) = NULL,
    @FechaExpiracion DATETIME2
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;

        INSERT INTO dbo.SesionPortal (
            IdCuentaPortal,
            SidHash,
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
            @SidHash,
            @JtiAccessActual,
            @JtiRefreshActual,
            'ACTIVA',
            @IpCreacion,
            @UserAgent,
            SYSDATETIME(),
            @FechaExpiracion
        );

        SELECT SCOPE_IDENTITY() AS IdSesionPortal;

        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_Sesion_ObtenerActiva
    @IdCuentaPortal INT = NULL,
    @SidHash NVARCHAR(128) = NULL,
    @JtiAccessActual UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (1)
        *
    FROM dbo.SesionPortal
    WHERE EstadoSesion = 'ACTIVA'
      AND FechaExpiracion > SYSDATETIME()
      AND (@IdCuentaPortal IS NULL OR IdCuentaPortal = @IdCuentaPortal)
      AND (@SidHash IS NULL OR SidHash = @SidHash)
      AND (@JtiAccessActual IS NULL OR JtiAccessActual = @JtiAccessActual)
    ORDER BY FechaCreacion DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_Sesion_ValidarPorSidHash
    @SidHash NVARCHAR(128)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT TOP (1)
        IdSesionPortal,
        IdCuentaPortal,
        EstadoSesion,
        FechaCreacion,
        FechaUltimaActividad,
        FechaExpiracion
    FROM dbo.SesionPortal
    WHERE SidHash = @SidHash
      AND EstadoSesion = 'ACTIVA'
      AND FechaExpiracion > SYSDATETIME()
    ORDER BY FechaCreacion DESC;
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_Sesion_RotarSidHash
    @IdSesionPortal BIGINT,
    @SidHashActual NVARCHAR(128),
    @NuevoSidHash NVARCHAR(128)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.SesionPortal
    SET SidHash = @NuevoSidHash,
        FechaUltimaActividad = SYSDATETIME()
    WHERE IdSesionPortal = @IdSesionPortal
      AND SidHash = @SidHashActual
      AND EstadoSesion = 'ACTIVA'
      AND FechaExpiracion > SYSDATETIME();

    SELECT @@ROWCOUNT AS RegistrosAfectados;
END;
GO

CREATE OR ALTER PROCEDURE dbo.spSeg_Csrf_RevocarPorSesion
    @IdSesionPortal BIGINT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.TokenCsrf
    SET Activo = 0
    WHERE IdSesionPortal = @IdSesionPortal
      AND Activo = 1;

    SELECT @@ROWCOUNT AS RegistrosAfectados;
END;
GO
