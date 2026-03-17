CREATE TABLE dbo.SesionPortal (
    IdSesionPortal           BIGINT IDENTITY(1,1) PRIMARY KEY,
    IdCuentaPortal           INT NOT NULL,
    JtiAccessActual          UNIQUEIDENTIFIER NULL,
    JtiRefreshActual         UNIQUEIDENTIFIER NULL,
    EstadoSesion             NVARCHAR(30) NOT NULL DEFAULT 'ACTIVA',
    IpCreacion               NVARCHAR(60) NULL,
    UserAgent                NVARCHAR(300) NULL,
    FechaCreacion            DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    FechaUltimaActividad     DATETIME2 NULL,
    FechaExpiracion          DATETIME2 NOT NULL,
    FechaRevocacion          DATETIME2 NULL,
    MotivoRevocacion         NVARCHAR(200) NULL,
    CONSTRAINT FK_SesionPortal_Cuenta
        FOREIGN KEY (IdCuentaPortal) REFERENCES dbo.CuentaPortal(IdCuentaPortal)
);
GO

CREATE TABLE dbo.AccessTokenRevocado (
    IdAccessTokenRevocado    BIGINT IDENTITY(1,1) PRIMARY KEY,
    Jti                      UNIQUEIDENTIFIER NOT NULL,
    IdSesionPortal           BIGINT NULL,
    FechaExpiracion          DATETIME2 NOT NULL,
    FechaCreacion            DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO
