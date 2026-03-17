IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = 'portal_nest')
BEGIN
  EXEC('CREATE SCHEMA portal_nest');
END;
GO

CREATE TABLE portal_nest.cuenta_portal (
  id_cuenta_portal BIGINT IDENTITY(1001, 1) PRIMARY KEY,
  id_persona BIGINT NOT NULL,
  usuario NVARCHAR(120) NOT NULL UNIQUE,
  hash_clave NVARCHAR(255) NOT NULL,
  nombre NVARCHAR(180) NOT NULL,
  correo NVARCHAR(180) NOT NULL,
  carnet NVARCHAR(50) NULL,
  es_interno BIT NOT NULL CONSTRAINT DF_cuenta_portal_es_interno DEFAULT (1),
  activo BIT NOT NULL CONSTRAINT DF_cuenta_portal_activo DEFAULT (1),
  fecha_creacion DATETIME2 NOT NULL CONSTRAINT DF_cuenta_portal_fecha_creacion DEFAULT SYSUTCDATETIME()
);
GO

CREATE TABLE portal_nest.app_catalogo (
  codigo NVARCHAR(50) NOT NULL PRIMARY KEY,
  nombre NVARCHAR(120) NOT NULL,
  ruta NVARCHAR(200) NOT NULL,
  icono NVARCHAR(20) NULL,
  descripcion NVARCHAR(255) NULL,
  activa BIT NOT NULL CONSTRAINT DF_app_catalogo_activa DEFAULT (1)
);
GO

CREATE TABLE portal_nest.cuenta_app (
  id_cuenta_portal BIGINT NOT NULL,
  codigo_app NVARCHAR(50) NOT NULL,
  PRIMARY KEY (id_cuenta_portal, codigo_app),
  CONSTRAINT FK_cuenta_app_cuenta FOREIGN KEY (id_cuenta_portal) REFERENCES portal_nest.cuenta_portal(id_cuenta_portal),
  CONSTRAINT FK_cuenta_app_app FOREIGN KEY (codigo_app) REFERENCES portal_nest.app_catalogo(codigo)
);
GO

CREATE TABLE portal_nest.cuenta_permiso (
  id_cuenta_portal BIGINT NOT NULL,
  permiso NVARCHAR(120) NOT NULL,
  PRIMARY KEY (id_cuenta_portal, permiso),
  CONSTRAINT FK_cuenta_permiso_cuenta FOREIGN KEY (id_cuenta_portal) REFERENCES portal_nest.cuenta_portal(id_cuenta_portal)
);
GO

CREATE TABLE portal_nest.sesion_portal (
  id_sesion_portal BIGINT IDENTITY(9000, 1) PRIMARY KEY,
  id_cuenta_portal BIGINT NOT NULL,
  token_sesion UNIQUEIDENTIFIER NOT NULL UNIQUE,
  fecha_inicio DATETIME2 NOT NULL CONSTRAINT DF_sesion_portal_fecha_inicio DEFAULT SYSUTCDATETIME(),
  fecha_cierre DATETIME2 NULL,
  activa BIT NOT NULL CONSTRAINT DF_sesion_portal_activa DEFAULT (1),
  ip_origen NVARCHAR(64) NULL,
  user_agent NVARCHAR(255) NULL,
  CONSTRAINT FK_sesion_portal_cuenta FOREIGN KEY (id_cuenta_portal) REFERENCES portal_nest.cuenta_portal(id_cuenta_portal)
);
GO

CREATE INDEX IX_sesion_portal_token_activa ON portal_nest.sesion_portal (token_sesion, activa);
GO
