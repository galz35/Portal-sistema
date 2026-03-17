CREATE INDEX IX_MetricaNegocioDiaria_FechaSistema
ON dbo.MetricaNegocioDiaria (FechaMetrica, Sistema, CodigoMetrica);
GO

CREATE INDEX IX_IncidenteAplicacion_Fecha
ON dbo.IncidenteAplicacion (FechaCreacion DESC);
GO

CREATE INDEX IX_IncidenteAplicacion_SistemaSeveridad
ON dbo.IncidenteAplicacion (Sistema, Severidad, Resuelto);
GO

CREATE INDEX IX_DisponibilidadServicioDiaria_FechaSistema
ON dbo.DisponibilidadServicioDiaria (FechaMetrica, Sistema, NombreServicio);
GO

CREATE INDEX IX_IntegracionExternaMetrica_FechaSistema
ON dbo.IntegracionExternaMetrica (FechaMetrica DESC, Sistema, Integracion);
GO
