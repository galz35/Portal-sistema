CREATE UNIQUE INDEX IX_CuentaPortal_Usuario
ON dbo.CuentaPortal (Usuario);
GO

CREATE UNIQUE INDEX IX_CuentaPortal_CorreoLogin
ON dbo.CuentaPortal (CorreoLogin);
GO

CREATE INDEX IX_CuentaPortal_Carnet
ON dbo.CuentaPortal (Carnet);
GO

CREATE INDEX IX_CuentaPortal_Idhcm
ON dbo.CuentaPortal (Idhcm);
GO

CREATE UNIQUE INDEX IX_AplicacionSistema_Codigo
ON dbo.AplicacionSistema (Codigo);
GO

CREATE UNIQUE INDEX IX_RolSistema_Codigo
ON dbo.RolSistema (Codigo);
GO

CREATE UNIQUE INDEX IX_PermisoSistema_Codigo
ON dbo.PermisoSistema (Codigo);
GO

CREATE UNIQUE INDEX IX_UsuarioAplicacion_UQ
ON dbo.UsuarioAplicacion (IdCuentaPortal, IdAplicacion);
GO

CREATE UNIQUE INDEX IX_UsuarioRolAplicacion_UQ
ON dbo.UsuarioRolAplicacion (IdCuentaPortal, IdAplicacion, IdRol);
GO

CREATE UNIQUE INDEX IX_RolPermiso_UQ
ON dbo.RolPermiso (IdRol, IdPermiso);
GO

CREATE INDEX IX_RefreshToken_Cuenta
ON dbo.RefreshToken (IdCuentaPortal, Revocado, FechaExpiracion);
GO

CREATE INDEX IX_AuditoriaAcceso_Fecha
ON dbo.AuditoriaAcceso (FechaEvento DESC);
GO
