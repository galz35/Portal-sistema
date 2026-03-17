CREATE INDEX IX_IntentoLogin_Usuario_Fecha
ON dbo.IntentoLogin (UsuarioIntentado, FechaIntento DESC);
GO

CREATE INDEX IX_IntentoLogin_Ip_Fecha
ON dbo.IntentoLogin (Ip, FechaIntento DESC);
GO

CREATE INDEX IX_BloqueoCuenta_Cuenta_Activo
ON dbo.BloqueoCuenta (IdCuentaPortal, Activo);
GO

CREATE INDEX IX_TokenCsrf_Sesion_Activo
ON dbo.TokenCsrf (IdSesionPortal, Activo, FechaExpiracion);
GO

CREATE INDEX IX_EventoSeguridad_Fecha
ON dbo.EventoSeguridad (FechaEvento DESC);
GO

CREATE INDEX IX_EventoSeguridad_Tipo
ON dbo.EventoSeguridad (TipoEvento, FechaEvento DESC);
GO

CREATE INDEX IX_MfaCuenta_Cuenta
ON dbo.MfaCuenta (IdCuentaPortal, Activo);
GO

CREATE INDEX IX_MfaDesafio_Cuenta_Estado
ON dbo.MfaDesafio (IdCuentaPortal, Estado, FechaCreacion DESC);
GO
