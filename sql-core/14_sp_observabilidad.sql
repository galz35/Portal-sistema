CREATE OR ALTER PROCEDURE dbo.spObs_RegistrarMetricaNegocio
    @FechaMetrica DATE,
    @Sistema NVARCHAR(50),
    @CodigoMetrica NVARCHAR(100),
    @ValorNumerico DECIMAL(18,2),
    @Dimension1 NVARCHAR(100) = NULL,
    @Dimension2 NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.MetricaNegocioDiaria (
        FechaMetrica, Sistema, CodigoMetrica, ValorNumerico, Dimension1, Dimension2
    )
    VALUES (
        @FechaMetrica, @Sistema, @CodigoMetrica, @ValorNumerico, @Dimension1, @Dimension2
    );
END;
GO

CREATE OR ALTER PROCEDURE dbo.spObs_RegistrarIncidenteAplicacion
    @Sistema NVARCHAR(50),
    @Severidad NVARCHAR(20),
    @TipoIncidente NVARCHAR(100),
    @CorrelationId NVARCHAR(80) = NULL,
    @Endpoint NVARCHAR(200) = NULL,
    @Mensaje NVARCHAR(1000),
    @StackTraceResumido NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.IncidenteAplicacion (
        Sistema, Severidad, TipoIncidente, CorrelationId, Endpoint, Mensaje, StackTraceResumido
    )
    VALUES (
        @Sistema, @Severidad, @TipoIncidente, @CorrelationId, @Endpoint, @Mensaje, @StackTraceResumido
    );
END;
GO

CREATE OR ALTER PROCEDURE dbo.spObs_RegistrarDisponibilidadServicio
    @FechaMetrica DATE,
    @Sistema NVARCHAR(50),
    @NombreServicio NVARCHAR(100),
    @UptimePorcentaje DECIMAL(5,2),
    @TiempoCaidoSegundos BIGINT = 0
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.DisponibilidadServicioDiaria (
        FechaMetrica, Sistema, NombreServicio, UptimePorcentaje, TiempoCaidoSegundos
    )
    VALUES (
        @FechaMetrica, @Sistema, @NombreServicio, @UptimePorcentaje, @TiempoCaidoSegundos
    );
END;
GO

CREATE OR ALTER PROCEDURE dbo.spObs_RegistrarIntegracionExterna
    @Sistema NVARCHAR(50),
    @Integracion NVARCHAR(100),
    @FechaMetrica DATETIME2,
    @Exitoso BIT,
    @TiempoMs INT,
    @CodigoResultado NVARCHAR(50) = NULL,
    @Detalle NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.IntegracionExternaMetrica (
        Sistema, Integracion, FechaMetrica, Exitoso, TiempoMs, CodigoResultado, Detalle
    )
    VALUES (
        @Sistema, @Integracion, @FechaMetrica, @Exitoso, @TiempoMs, @CodigoResultado, @Detalle
    );
END;
GO

CREATE OR ALTER PROCEDURE dbo.spObs_ObtenerMetricasDashboard
    @Sistema NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        FechaMetrica,
        CodigoMetrica,
        ValorNumerico,
        Dimension1,
        Dimension2
    FROM dbo.MetricaNegocioDiaria
    WHERE Sistema = @Sistema
    ORDER BY FechaMetrica DESC, CodigoMetrica;
END;
GO

CREATE OR ALTER PROCEDURE dbo.spObs_ObtenerIncidentesAbiertos
    @Sistema NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        *
    FROM dbo.IncidenteAplicacion
    WHERE Resuelto = 0
      AND (@Sistema IS NULL OR Sistema = @Sistema)
    ORDER BY FechaCreacion DESC;
END;
GO
