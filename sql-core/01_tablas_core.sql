CREATE TABLE dbo.Persona (
    IdPersona                INT IDENTITY(1,1) PRIMARY KEY,
    TipoDocumento            NVARCHAR(30) NULL,
    NumeroDocumento          NVARCHAR(50) NULL,
    Nombres                  NVARCHAR(120) NOT NULL,
    PrimerApellido           NVARCHAR(80) NOT NULL,
    SegundoApellido          NVARCHAR(80) NULL,
    FechaNacimiento          DATE NULL,
    Sexo                     NVARCHAR(20) NULL,
    Nacionalidad             NVARCHAR(50) NULL,
    TelefonoPrincipal        NVARCHAR(30) NULL,
    CorreoPersonal           NVARCHAR(150) NULL,
    Direccion                NVARCHAR(300) NULL,
    Activo                   BIT NOT NULL DEFAULT 1,
    FechaCreacion            DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    FechaModificacion        DATETIME2 NULL
);
GO

CREATE TABLE dbo.CuentaPortal (
    IdCuentaPortal           INT IDENTITY(1,1) PRIMARY KEY,
    IdPersona                INT NULL,
    Usuario                  NVARCHAR(80) NOT NULL,
    CorreoLogin              NVARCHAR(150) NOT NULL,
    ClaveHash                NVARCHAR(300) NOT NULL,
    EsInterno                BIT NOT NULL DEFAULT 0,
    EsExterno                BIT NOT NULL DEFAULT 1,
    Carnet                   NVARCHAR(30) NULL,
    Idhcm                    NVARCHAR(50) NULL,
    Activo                   BIT NOT NULL DEFAULT 1,
    Bloqueado                BIT NOT NULL DEFAULT 0,
    IntentosFallidos         INT NOT NULL DEFAULT 0,
    FechaUltimoLogin         DATETIME2 NULL,
    FechaCreacion            DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    FechaModificacion        DATETIME2 NULL,
    CONSTRAINT FK_CuentaPortal_Persona
        FOREIGN KEY (IdPersona) REFERENCES dbo.Persona(IdPersona)
);
GO

CREATE TABLE dbo.AplicacionSistema (
    IdAplicacion             INT IDENTITY(1,1) PRIMARY KEY,
    Codigo                   NVARCHAR(50) NOT NULL,
    Nombre                   NVARCHAR(120) NOT NULL,
    Ruta                     NVARCHAR(200) NOT NULL,
    Icono                    NVARCHAR(80) NULL,
    OrdenVisual              INT NOT NULL DEFAULT 0,
    Activo                   BIT NOT NULL DEFAULT 1,
    FechaCreacion            DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE TABLE dbo.RolSistema (
    IdRol                    INT IDENTITY(1,1) PRIMARY KEY,
    Codigo                   NVARCHAR(50) NOT NULL,
    Nombre                   NVARCHAR(120) NOT NULL,
    Descripcion              NVARCHAR(300) NULL,
    Activo                   BIT NOT NULL DEFAULT 1,
    FechaCreacion            DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE TABLE dbo.PermisoSistema (
    IdPermiso                INT IDENTITY(1,1) PRIMARY KEY,
    Codigo                   NVARCHAR(100) NOT NULL,
    Nombre                   NVARCHAR(150) NOT NULL,
    Modulo                   NVARCHAR(80) NOT NULL,
    Descripcion              NVARCHAR(300) NULL,
    Activo                   BIT NOT NULL DEFAULT 1,
    FechaCreacion            DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
GO

CREATE TABLE dbo.RolPermiso (
    IdRolPermiso             INT IDENTITY(1,1) PRIMARY KEY,
    IdRol                    INT NOT NULL,
    IdPermiso                INT NOT NULL,
    Activo                   BIT NOT NULL DEFAULT 1,
    FechaCreacion            DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_RolPermiso_Rol
        FOREIGN KEY (IdRol) REFERENCES dbo.RolSistema(IdRol),
    CONSTRAINT FK_RolPermiso_Permiso
        FOREIGN KEY (IdPermiso) REFERENCES dbo.PermisoSistema(IdPermiso)
);
GO

CREATE TABLE dbo.UsuarioAplicacion (
    IdUsuarioAplicacion      INT IDENTITY(1,1) PRIMARY KEY,
    IdCuentaPortal           INT NOT NULL,
    IdAplicacion             INT NOT NULL,
    Activo                   BIT NOT NULL DEFAULT 1,
    FechaCreacion            DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_UsuarioAplicacion_Cuenta
        FOREIGN KEY (IdCuentaPortal) REFERENCES dbo.CuentaPortal(IdCuentaPortal),
    CONSTRAINT FK_UsuarioAplicacion_Aplicacion
        FOREIGN KEY (IdAplicacion) REFERENCES dbo.AplicacionSistema(IdAplicacion)
);
GO

CREATE TABLE dbo.UsuarioRolAplicacion (
    IdUsuarioRolAplicacion   INT IDENTITY(1,1) PRIMARY KEY,
    IdCuentaPortal           INT NOT NULL,
    IdAplicacion             INT NOT NULL,
    IdRol                    INT NOT NULL,
    Activo                   BIT NOT NULL DEFAULT 1,
    FechaCreacion            DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_UsuarioRolAplicacion_Cuenta
        FOREIGN KEY (IdCuentaPortal) REFERENCES dbo.CuentaPortal(IdCuentaPortal),
    CONSTRAINT FK_UsuarioRolAplicacion_Aplicacion
        FOREIGN KEY (IdAplicacion) REFERENCES dbo.AplicacionSistema(IdAplicacion),
    CONSTRAINT FK_UsuarioRolAplicacion_Rol
        FOREIGN KEY (IdRol) REFERENCES dbo.RolSistema(IdRol)
);
GO

CREATE TABLE dbo.RefreshToken (
    IdRefreshToken           BIGINT IDENTITY(1,1) PRIMARY KEY,
    IdCuentaPortal           INT NOT NULL,
    TokenHash                NVARCHAR(300) NOT NULL,
    Jti                      UNIQUEIDENTIFIER NOT NULL,
    FechaExpiracion          DATETIME2 NOT NULL,
    Revocado                 BIT NOT NULL DEFAULT 0,
    FechaRevocacion          DATETIME2 NULL,
    IpCreacion               NVARCHAR(60) NULL,
    UserAgent                NVARCHAR(300) NULL,
    FechaCreacion            DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_RefreshToken_Cuenta
        FOREIGN KEY (IdCuentaPortal) REFERENCES dbo.CuentaPortal(IdCuentaPortal)
);
GO

CREATE TABLE dbo.AuditoriaAcceso (
    IdAuditoriaAcceso        BIGINT IDENTITY(1,1) PRIMARY KEY,
    IdCuentaPortal           INT NULL,
    Usuario                  NVARCHAR(100) NULL,
    Evento                   NVARCHAR(50) NOT NULL,
    Modulo                   NVARCHAR(80) NULL,
    Exitoso                  BIT NOT NULL,
    Detalle                  NVARCHAR(500) NULL,
    Ip                       NVARCHAR(60) NULL,
    UserAgent                NVARCHAR(300) NULL,
    FechaEvento              DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_AuditoriaAcceso_Cuenta
        FOREIGN KEY (IdCuentaPortal) REFERENCES dbo.CuentaPortal(IdCuentaPortal)
);
GO

CREATE TABLE dbo.Pais (
    CodigoPais               NVARCHAR(5) PRIMARY KEY,
    NombrePais               NVARCHAR(80) NOT NULL,
    Activo                   BIT NOT NULL DEFAULT 1
);
GO
