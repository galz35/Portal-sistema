INSERT INTO dbo.AplicacionSistema (Codigo, Nombre, Ruta, Icono, OrdenVisual)
VALUES
('portal', 'Portal', '/portal', 'LayoutDashboard', 1),
('vacantes', 'Vacantes', '/app/vacantes', 'BriefcaseBusiness', 2),
('planer', 'Planer', '/app/planer', 'CalendarRange', 3),
('clima', 'Clima', 'http://localhost:5177', 'SunMedium', 4);
GO

INSERT INTO dbo.Pais (CodigoPais, NombrePais)
VALUES
('NI', 'Nicaragua'),
('HN', 'Honduras'),
('SV', 'El Salvador'),
('GT', 'Guatemala'),
('CR', 'Costa Rica');
GO

INSERT INTO dbo.RolSistema (Codigo, Nombre, Descripcion)
VALUES
('ADMIN_GLOBAL', 'Administrador Global', 'Administra toda la plataforma'),
('EMPLEADO', 'Empleado', 'Usuario interno estandar'),
('CANDIDATO', 'Candidato', 'Usuario externo que aplica a vacantes'),
('RH_VACANTES', 'RH Vacantes', 'Gestiona reclutamiento');
GO

INSERT INTO dbo.PermisoSistema (Codigo, Nombre, Modulo, Descripcion)
VALUES
('app.portal', 'Acceso Portal', 'core', 'Acceso al portal interno'),
('app.vacantes', 'Acceso Vacantes', 'vacantes', 'Acceso al sistema de vacantes'),
('app.planer', 'Acceso Planer', 'planer', 'Acceso al sistema planer'),
('core.perfil.ver', 'Ver perfil base', 'core', 'Consulta perfil base'),
('vacantes.publico.ver', 'Ver vacantes publicas', 'vacantes', 'Consulta vacantes publicas'),
('vacantes.candidato.postular', 'Postular a vacante', 'vacantes', 'Permite aplicar a vacantes'),
('vacantes.rh.ver', 'Ver RH Vacantes', 'vacantes', 'Permite entrar a panel RH'),
('vacantes.rh.crear', 'Crear vacantes', 'vacantes', 'Permite crear vacantes'),
('vacantes.rh.estado', 'Cambiar estado vacante/postulacion', 'vacantes', 'Permite cambiar estados'),
('planer.ver', 'Ver Planer', 'planer', 'Permite entrar a planer'),
('app.clima', 'Acceso Clima', 'clima', 'Acceso al modulo clima');
GO

INSERT INTO dbo.RolPermiso (IdRol, IdPermiso)
SELECT r.IdRol, p.IdPermiso
FROM dbo.RolSistema r
INNER JOIN dbo.PermisoSistema p
    ON (r.Codigo = 'ADMIN_GLOBAL')
    OR (r.Codigo = 'EMPLEADO' AND p.Codigo IN ('app.portal', 'core.perfil.ver'))
    OR (r.Codigo = 'CANDIDATO' AND p.Codigo IN ('app.vacantes', 'vacantes.publico.ver', 'vacantes.candidato.postular'))
    OR (r.Codigo = 'RH_VACANTES' AND p.Codigo IN ('app.vacantes', 'vacantes.rh.ver', 'vacantes.rh.crear', 'vacantes.rh.estado'));
GO
