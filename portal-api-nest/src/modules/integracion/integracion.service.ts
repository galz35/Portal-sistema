import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';

import { DatabaseService } from '../../shared/database/database.service';

type HeadersLike = Record<string, string | string[] | undefined>;

@Injectable()
export class IntegracionService {
  constructor(private readonly db: DatabaseService) {}

  private getSingleHeader(headers: HeadersLike, name: string): string {
    const value = headers[name.toLowerCase()] ?? headers[name];
    if (Array.isArray(value)) return (value[0] ?? '').toString();
    return (value ?? '').toString();
  }

  private parseBasicAuth(authHeader: string): { user: string; pass: string } | null {
    if (!authHeader?.startsWith('Basic ')) return null;
    try {
      const decoded = Buffer.from(authHeader.slice(6).trim(), 'base64').toString('utf8');
      const sep = decoded.indexOf(':');
      if (sep < 0) return null;
      return {
        user: decoded.slice(0, sep).trim(),
        pass: decoded.slice(sep + 1).trim(),
      };
    } catch {
      return null;
    }
  }

  validateIntegrationAuth(headers: HeadersLike): void {
    const expectedToken = (process.env.INTEGRATION_API_TOKEN ?? '').trim();
    const expectedUser = (process.env.INTEGRATION_API_USER ?? '').trim();
    const expectedPass = (process.env.INTEGRATION_API_PASS ?? '').trim();

    const authHeader = this.getSingleHeader(headers, 'authorization');
    const xApiToken = this.getSingleHeader(headers, 'x-api-token').trim();
    const xApiUser = this.getSingleHeader(headers, 'x-api-user').trim();
    const xApiPass = this.getSingleHeader(headers, 'x-api-pass').trim();

    let ok = false;

    if (expectedToken) {
      const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
      if (bearer && bearer === expectedToken) ok = true;
      if (xApiToken && xApiToken === expectedToken) ok = true;
    }

    if (!ok && expectedUser && expectedPass) {
      const basic = this.parseBasicAuth(authHeader);
      if (basic && basic.user === expectedUser && basic.pass === expectedPass) ok = true;
      if (xApiUser === expectedUser && xApiPass === expectedPass) ok = true;
    }

    if (!ok) {
      throw new UnauthorizedException(
        'No autorizado. Use Authorization: Bearer <token> o Basic <usuario:clave>.',
      );
    }
  }

  async listarEmpleados(query: { carnet?: string; correo?: string; limit?: number }) {
    const carnet = (query.carnet ?? '').trim();
    const correo = (query.correo ?? '').trim();
    const limit = Math.max(1, Math.min(2000, Number(query.limit ?? 100)));

    return this.db.query(
      `SELECT TOP (@limit)
          idUsuario,
          carnet,
          nombre,
          correo,
          cargo,
          departamento,
          gerencia,
          subgerencia,
          area,
          idRol,
          pais,
          jefeCarnet,
          rolGlobal,
          activo,
          fechaCreacion,
          fechaActualizacion
       FROM dbo.p_Usuarios
       WHERE (@carnet = '' OR carnet = @carnet)
         AND (@correo = '' OR correo = @correo)
       ORDER BY idUsuario DESC`,
      { limit, carnet, correo },
    );
  }

  async upsertEmpleado(body: Record<string, any>) {
    const carnet = String(body.carnet ?? '').trim();
    const nombre = String(body.nombre ?? '').trim();
    if (!carnet || !nombre) {
      throw new BadRequestException('carnet y nombre son obligatorios.');
    }

    const params = {
      carnet,
      correo: String(body.correo ?? '').trim(),
      nombre,
      cargo: String(body.cargo ?? '').trim(),
      departamento: String(body.departamento ?? '').trim(),
      gerencia: String(body.gerencia ?? '').trim(),
      subgerencia: String(body.subgerencia ?? '').trim(),
      area: String(body.area ?? '').trim(),
      rolGlobal: String(body.rolGlobal ?? '').trim(),
      activo: body.activo === undefined ? true : Boolean(body.activo),
      jefeCarnet: String(body.jefeCarnet ?? '').trim(),
      idRol: body.idRol === undefined || body.idRol === null ? null : Number(body.idRol),
      pais: String(body.pais ?? '').trim(),
    };

    const idRows = await this.db.query<{ idUsuario: number }>(
      `DECLARE @idUsuario INT;

       SELECT TOP 1 @idUsuario = idUsuario
       FROM dbo.p_Usuarios
       WHERE carnet = @carnet OR (@correo <> '' AND correo = @correo)
       ORDER BY CASE WHEN carnet = @carnet THEN 0 ELSE 1 END, idUsuario DESC;

       IF @idUsuario IS NOT NULL
       BEGIN
         UPDATE dbo.p_Usuarios
         SET nombre = @nombre,
             correo = COALESCE(NULLIF(@correo, ''), correo),
             cargo = COALESCE(NULLIF(@cargo, ''), cargo),
             departamento = COALESCE(NULLIF(@departamento, ''), departamento),
             gerencia = COALESCE(NULLIF(@gerencia, ''), gerencia),
             subgerencia = COALESCE(NULLIF(@subgerencia, ''), subgerencia),
             area = COALESCE(NULLIF(@area, ''), area),
             rolGlobal = COALESCE(NULLIF(@rolGlobal, ''), rolGlobal),
             activo = @activo,
             jefeCarnet = COALESCE(NULLIF(@jefeCarnet, ''), jefeCarnet),
             idRol = COALESCE(@idRol, idRol),
             pais = COALESCE(NULLIF(@pais, ''), pais),
             eliminado = 0,
             fechaActualizacion = GETDATE()
         WHERE idUsuario = @idUsuario;
       END
       ELSE
       BEGIN
         DECLARE @nuevo TABLE (idUsuario INT);
         INSERT INTO dbo.p_Usuarios (
           nombre, correo, carnet, idRol, activo, pais, fechaCreacion, eliminado,
           cargo, departamento, gerencia, subgerencia, area, rolGlobal, jefeCarnet
         )
         OUTPUT INSERTED.idUsuario INTO @nuevo(idUsuario)
         VALUES (
           @nombre, NULLIF(@correo, ''), @carnet, COALESCE(@idRol, 3), @activo, COALESCE(NULLIF(@pais, ''), 'NI'), GETDATE(), 0,
           NULLIF(@cargo, ''), NULLIF(@departamento, ''), NULLIF(@gerencia, ''), NULLIF(@subgerencia, ''), NULLIF(@area, ''), NULLIF(@rolGlobal, ''), NULLIF(@jefeCarnet, '')
         );
         SELECT @idUsuario = idUsuario FROM @nuevo;
       END

       IF @idUsuario IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM dbo.p_UsuariosCredenciales WHERE idUsuario = @idUsuario)
       BEGIN
         INSERT INTO dbo.p_UsuariosCredenciales (idUsuario, passwordHash)
         VALUES (@idUsuario, '');
       END

       SELECT @idUsuario AS idUsuario;`,
      params,
    );

    const idUsuario = Number(idRows?.[0]?.idUsuario ?? 0);
    const empleado = await this.db.query(
      `SELECT TOP 1
          idUsuario,
          carnet,
          nombre,
          correo,
          cargo,
          departamento,
          gerencia,
          subgerencia,
          area,
          idRol,
          pais,
          jefeCarnet,
          rolGlobal,
          activo,
          fechaCreacion,
          fechaActualizacion
       FROM dbo.p_Usuarios
       WHERE idUsuario = @idUsuario`,
      { idUsuario },
    );

    return { idUsuario, empleado: empleado[0] ?? null };
  }
}

