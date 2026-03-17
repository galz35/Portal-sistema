IF NOT EXISTS (
    SELECT 1
    FROM dbo.Persona
    WHERE CorreoPersonal = 'empleado.portal@empresa.local'
)
BEGIN
    INSERT INTO dbo.Persona (
        Nombres,
        PrimerApellido,
        SegundoApellido,
        CorreoPersonal,
        Activo
    )
    VALUES (
        'Empleado',
        'Portal',
        'Base',
        'empleado.portal@empresa.local',
        1
    );
END;
GO

DECLARE @IdPersonaBase INT;
SELECT TOP (1) @IdPersonaBase = IdPersona
FROM dbo.Persona
WHERE CorreoPersonal = 'empleado.portal@empresa.local';

IF NOT EXISTS (
    SELECT 1
    FROM dbo.CuentaPortal
    WHERE Usuario = 'empleado.portal'
)
BEGIN
    INSERT INTO dbo.CuentaPortal (
        IdPersona,
        Usuario,
        CorreoLogin,
        ClaveHash,
        EsInterno,
        EsExterno,
        Carnet,
        Activo,
        Bloqueado
    )
    VALUES (
        @IdPersonaBase,
        'empleado.portal',
        'empleado.portal@empresa.local',
        '$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHQ$HWkR9Cz0HK3vQHomgoFSPMaPFuvj5Q1q32TjoXLJQY0',
        1,
        0,
        '000001',
        1,
        0
    );
END;
GO

DECLARE @IdCuentaPortalBase INT;
SELECT TOP (1) @IdCuentaPortalBase = IdCuentaPortal
FROM dbo.CuentaPortal
WHERE Usuario = 'empleado.portal';

INSERT INTO dbo.UsuarioAplicacion (IdCuentaPortal, IdAplicacion, Activo)
SELECT @IdCuentaPortalBase, a.IdAplicacion, 1
FROM dbo.AplicacionSistema a
WHERE a.Activo = 1
  AND NOT EXISTS (
        SELECT 1
        FROM dbo.UsuarioAplicacion ua
        WHERE ua.IdCuentaPortal = @IdCuentaPortalBase
          AND ua.IdAplicacion = a.IdAplicacion
  );
GO

DECLARE @IdCuentaPortalBase INT;
SELECT TOP (1) @IdCuentaPortalBase = IdCuentaPortal
FROM dbo.CuentaPortal
WHERE Usuario = 'empleado.portal';

INSERT INTO dbo.UsuarioRolAplicacion (IdCuentaPortal, IdAplicacion, IdRol, Activo)
SELECT
    @IdCuentaPortalBase,
    a.IdAplicacion,
    r.IdRol,
    1
FROM dbo.AplicacionSistema a
INNER JOIN dbo.RolSistema r
    ON r.Codigo = CASE
        WHEN a.Codigo = 'portal' THEN 'EMPLEADO'
        WHEN a.Codigo = 'vacantes' THEN 'RH_VACANTES'
        WHEN a.Codigo = 'planer' THEN 'ADMIN_GLOBAL'
        ELSE 'EMPLEADO'
    END
WHERE a.Activo = 1
  AND NOT EXISTS (
        SELECT 1
        FROM dbo.UsuarioRolAplicacion ura
        WHERE ura.IdCuentaPortal = @IdCuentaPortalBase
          AND ura.IdAplicacion = a.IdAplicacion
          AND ura.IdRol = r.IdRol
  );
GO
