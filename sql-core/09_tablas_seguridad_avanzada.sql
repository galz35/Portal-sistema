CREATE TABLE dbo.BloqueoCuenta (
    IdBloqueoCuenta          BIGINT IDENTITY(1,1) PRIMARY KEY,
    IdCuentaPortal           INT NOT NULL,
    Motivo                   NVARCHAR(100) NOT NULL,
    FechaInicio              DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    FechaFin                 DATETIME2 NULL,
    Activo                   BIT NOT NULL DEFAULT 1,
    IdCuentaPortalOrigen     INT NULL
);
GO

CREATE TABLE dbo.IntentoLogin (
    IdIntentoLogin           BIGINT IDENTITY(1,1) PRIMARY KEY,
    UsuarioIntentado         NVARCHAR(150) NOT NULL,
    IdCuentaPortal           INT NULL,
    Ip                       NVARCHAR(60) NULL,
    UserAgent                NVARCHAR(300) NULL,
    Exitoso                  BIT NOT NULL,
    Motivo                   NVARCHAR(100) NULL,
    FechaIntento             DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE TABLE dbo.TokenCsrf (
    IdTokenCsrf              BIGINT IDENTITY(1,1) PRIMARY KEY,
    IdSesionPortal           BIGINT NOT NULL,
    TokenHash                NVARCHAR(300) NOT NULL,
    FechaExpiracion          DATETIME2 NOT NULL,
    Activo                   BIT NOT NULL DEFAULT 1,
    FechaCreacion            DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE TABLE dbo.EventoSeguridad (
    IdEventoSeguridad        BIGINT IDENTITY(1,1) PRIMARY KEY,
    IdCuentaPortal           INT NULL,
    IdSesionPortal           BIGINT NULL,
    TipoEvento               NVARCHAR(80) NOT NULL,
    Severidad                NVARCHAR(20) NOT NULL,
    Modulo                   NVARCHAR(80) NULL,
    Recurso                  NVARCHAR(120) NULL,
    Detalle                  NVARCHAR(1000) NULL,
    Ip                       NVARCHAR(60) NULL,
    UserAgent                NVARCHAR(300) NULL,
    CorrelationId            NVARCHAR(80) NULL,
    FechaEvento              DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE TABLE dbo.MfaCuenta (
    IdMfaCuenta              BIGINT IDENTITY(1,1) PRIMARY KEY,
    IdCuentaPortal           INT NOT NULL,
    TipoMfa                  NVARCHAR(30) NOT NULL,
    SecretoCifrado           NVARCHAR(500) NULL,
    Activo                   BIT NOT NULL DEFAULT 0,
    FechaHabilitacion        DATETIME2 NULL,
    FechaCreacion            DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE TABLE dbo.MfaDesafio (
    IdMfaDesafio             BIGINT IDENTITY(1,1) PRIMARY KEY,
    IdCuentaPortal           INT NOT NULL,
    CodigoHash               NVARCHAR(300) NOT NULL,
    Estado                   NVARCHAR(30) NOT NULL DEFAULT 'PENDIENTE',
    FechaExpiracion          DATETIME2 NOT NULL,
    FechaConsumo             DATETIME2 NULL,
    FechaCreacion            DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO
