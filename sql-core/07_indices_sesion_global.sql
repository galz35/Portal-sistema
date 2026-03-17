CREATE INDEX IX_SesionPortal_CuentaEstado
ON dbo.SesionPortal (IdCuentaPortal, EstadoSesion, FechaCreacion DESC);
GO

CREATE UNIQUE INDEX IX_AccessTokenRevocado_Jti
ON dbo.AccessTokenRevocado (Jti);
GO
