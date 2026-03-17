CREATE TABLE dbo.MetricaNegocioDiaria (
    IdMetricaNegocioDiaria   BIGINT IDENTITY(1,1) PRIMARY KEY,
    FechaMetrica             DATE NOT NULL,
    Sistema                  NVARCHAR(50) NOT NULL,
    CodigoMetrica            NVARCHAR(100) NOT NULL,
    ValorNumerico            DECIMAL(18,2) NOT NULL,
    Dimension1               NVARCHAR(100) NULL,
    Dimension2               NVARCHAR(100) NULL,
    FechaCreacion            DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE TABLE dbo.IncidenteAplicacion (
    IdIncidenteAplicacion    BIGINT IDENTITY(1,1) PRIMARY KEY,
    Sistema                  NVARCHAR(50) NOT NULL,
    Severidad                NVARCHAR(20) NOT NULL,
    TipoIncidente            NVARCHAR(100) NOT NULL,
    CorrelationId            NVARCHAR(80) NULL,
    Endpoint                 NVARCHAR(200) NULL,
    Mensaje                  NVARCHAR(1000) NOT NULL,
    StackTraceResumido       NVARCHAR(MAX) NULL,
    Resuelto                 BIT NOT NULL DEFAULT 0,
    FechaCreacion            DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    FechaResolucion          DATETIME2 NULL
);
GO

CREATE TABLE dbo.DisponibilidadServicioDiaria (
    IdDisponibilidadServicio BIGINT IDENTITY(1,1) PRIMARY KEY,
    FechaMetrica             DATE NOT NULL,
    Sistema                  NVARCHAR(50) NOT NULL,
    NombreServicio           NVARCHAR(100) NOT NULL,
    UptimePorcentaje         DECIMAL(5,2) NOT NULL,
    TiempoCaidoSegundos      BIGINT NOT NULL DEFAULT 0,
    FechaCreacion            DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE TABLE dbo.IntegracionExternaMetrica (
    IdIntegracionExternaMetrica BIGINT IDENTITY(1,1) PRIMARY KEY,
    Sistema                  NVARCHAR(50) NOT NULL,
    Integracion              NVARCHAR(100) NOT NULL,
    FechaMetrica             DATETIME2 NOT NULL,
    Exitoso                  BIT NOT NULL,
    TiempoMs                 INT NOT NULL,
    CodigoResultado          NVARCHAR(50) NULL,
    Detalle                  NVARCHAR(500) NULL
);
GO
