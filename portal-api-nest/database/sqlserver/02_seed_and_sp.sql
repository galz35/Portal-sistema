MERGE portal_nest.app_catalogo AS target
USING (
  SELECT 'portal' AS codigo, 'Portal Central' AS nombre, '/portal' AS ruta, 'PC' AS icono, 'Inicio corporativo con sesion centralizada.' AS descripcion
  UNION ALL
  SELECT 'vacantes', 'Vacantes 2.0', '/app/vacantes', 'RH', 'Operacion empresarial de reclutamiento.'
) AS source
ON target.codigo = source.codigo
WHEN MATCHED THEN
  UPDATE SET nombre = source.nombre, ruta = source.ruta, icono = source.icono, descripcion = source.descripcion, activa = 1
WHEN NOT MATCHED THEN
  INSERT (codigo, nombre, ruta, icono, descripcion) VALUES (source.codigo, source.nombre, source.ruta, source.icono, source.descripcion);
GO

IF NOT EXISTS (SELECT 1 FROM portal_nest.cuenta_portal WHERE usuario = 'empleado.portal')
BEGIN
  INSERT INTO portal_nest.cuenta_portal (id_persona, usuario, hash_clave, nombre, correo, carnet, es_interno)
  VALUES
    (501, 'empleado.portal', 'Portal123*', 'Ana Portal', 'ana.portal@claro.example', 'CL-1001', 1),
    (502, 'candidato.demo', 'Portal123*', 'Luis Candidato', 'luis.candidato@example.com', 'EXT-2001', 0);
END;
GO

MERGE portal_nest.cuenta_app AS target
USING (
  SELECT 1001 AS id_cuenta_portal, 'portal' AS codigo_app
  UNION ALL SELECT 1001, 'vacantes'
  UNION ALL SELECT 1002, 'vacantes'
) AS source
ON target.id_cuenta_portal = source.id_cuenta_portal AND target.codigo_app = source.codigo_app
WHEN NOT MATCHED THEN
  INSERT (id_cuenta_portal, codigo_app) VALUES (source.id_cuenta_portal, source.codigo_app);
GO

MERGE portal_nest.cuenta_permiso AS target
USING (
  SELECT 1001 AS id_cuenta_portal, 'app.portal' AS permiso
  UNION ALL SELECT 1001, 'app.vacantes'
  UNION ALL SELECT 1001, 'vacantes.rh.ver'
  UNION ALL SELECT 1002, 'app.vacantes'
) AS source
ON target.id_cuenta_portal = source.id_cuenta_portal AND target.permiso = source.permiso
WHEN NOT MATCHED THEN
  INSERT (id_cuenta_portal, permiso) VALUES (source.id_cuenta_portal, source.permiso);
GO

CREATE OR ALTER PROCEDURE portal_nest.sp_login_empleado
  @usuario NVARCHAR(120),
  @clave NVARCHAR(255),
  @ip_origen NVARCHAR(64) = NULL,
  @user_agent NVARCHAR(255) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @id_cuenta_portal BIGINT;

  SELECT @id_cuenta_portal = id_cuenta_portal
  FROM portal_nest.cuenta_portal
  WHERE usuario = @usuario
    AND hash_clave = @clave
    AND activo = 1;

  IF @id_cuenta_portal IS NULL
  BEGIN
    RAISERROR('Credenciales invalidas.', 16, 1);
    RETURN;
  END;

  DECLARE @token UNIQUEIDENTIFIER = NEWID();

  INSERT INTO portal_nest.sesion_portal (id_cuenta_portal, token_sesion, ip_origen, user_agent)
  VALUES (@id_cuenta_portal, @token, @ip_origen, @user_agent);

  SELECT TOP 1
    s.id_sesion_portal,
    c.id_cuenta_portal,
    c.id_persona,
    c.usuario,
    c.nombre,
    c.correo,
    c.carnet,
    c.es_interno,
    s.token_sesion
  FROM portal_nest.sesion_portal s
  INNER JOIN portal_nest.cuenta_portal c ON c.id_cuenta_portal = s.id_cuenta_portal
  WHERE s.token_sesion = @token;
END;
GO

CREATE OR ALTER PROCEDURE portal_nest.sp_session_state
  @token_sesion UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  SELECT TOP 1
    CAST(1 AS BIT) AS authenticated,
    s.id_sesion_portal,
    s.id_cuenta_portal
  FROM portal_nest.sesion_portal s
  WHERE s.token_sesion = @token_sesion
    AND s.activa = 1;
END;
GO

CREATE OR ALTER PROCEDURE portal_nest.sp_auth_me
  @token_sesion UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    c.id_cuenta_portal,
    c.id_persona,
    c.usuario,
    c.nombre,
    c.correo,
    c.carnet,
    c.es_interno
  FROM portal_nest.sesion_portal s
  INNER JOIN portal_nest.cuenta_portal c ON c.id_cuenta_portal = s.id_cuenta_portal
  WHERE s.token_sesion = @token_sesion
    AND s.activa = 1;

  SELECT ca.codigo_app
  FROM portal_nest.sesion_portal s
  INNER JOIN portal_nest.cuenta_app ca ON ca.id_cuenta_portal = s.id_cuenta_portal
  WHERE s.token_sesion = @token_sesion
    AND s.activa = 1;

  SELECT cp.permiso
  FROM portal_nest.sesion_portal s
  INNER JOIN portal_nest.cuenta_permiso cp ON cp.id_cuenta_portal = s.id_cuenta_portal
  WHERE s.token_sesion = @token_sesion
    AND s.activa = 1;
END;
GO

CREATE OR ALTER PROCEDURE portal_nest.sp_apps_autorizadas
  @token_sesion UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  SELECT a.codigo, a.nombre, a.ruta, a.icono, a.descripcion
  FROM portal_nest.sesion_portal s
  INNER JOIN portal_nest.cuenta_app ca ON ca.id_cuenta_portal = s.id_cuenta_portal
  INNER JOIN portal_nest.app_catalogo a ON a.codigo = ca.codigo_app
  WHERE s.token_sesion = @token_sesion
    AND s.activa = 1
    AND a.activa = 1;
END;
GO

CREATE OR ALTER PROCEDURE portal_nest.sp_logout
  @token_sesion UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  UPDATE portal_nest.sesion_portal
  SET activa = 0,
      fecha_cierre = SYSUTCDATETIME()
  WHERE token_sesion = @token_sesion
    AND activa = 1;
END;
GO
