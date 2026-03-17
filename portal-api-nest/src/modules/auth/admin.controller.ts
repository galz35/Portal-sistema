import { Controller, Get, Post, Put, Delete, Body, UseGuards, UnauthorizedException, Param, ParseIntPipe, Logger } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { SessionGuard, SessionUser } from '../../shared/guards/session.guard';
import { Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { DatabaseService } from '../../shared/database/database.service';
import * as argon2 from 'argon2';

@Controller('api/admin')
@UseGuards(SessionGuard)
export class AdminController {
  private readonly ADMIN_CARNET = '500708';
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly db: DatabaseService,
  ) {}

  private async checkAdmin(req: FastifyRequest) {
    const session = (req as any).sessionUser as SessionUser;
    const user = await this.authService.getUser(session.idCuentaPortal);
    if (!user || user.carnet !== this.ADMIN_CARNET) {
      throw new UnauthorizedException('No tienes permisos de administrador.');
    }
  }

  @Get('users')
  async getUsers(@Req() req: FastifyRequest) {
    await this.checkAdmin(req);
    const users = await this.authService.listAllUsers();
    return { items: users };
  }

  @Get('apps')
  async getApps(@Req() req: FastifyRequest) {
    await this.checkAdmin(req);
    const apps = await this.authService.listAllApps();
    return { items: apps };
  }

  @Post('apps')
  async createApp(@Req() req: FastifyRequest, @Body() body: any) {
    await this.checkAdmin(req);
    return this.authService.createApplication(body);
  }

  @Put('apps/:id')
  async updateApp(@Req() req: FastifyRequest, @Param('id', ParseIntPipe) id: number, @Body() body: any) {
    await this.checkAdmin(req);
    return this.authService.updateApplication(id, body);
  }

  @Delete('apps/:id')
  async deleteApp(@Req() req: FastifyRequest, @Param('id', ParseIntPipe) id: number) {
    await this.checkAdmin(req);
    return this.authService.deleteApplication(id);
  }

  @Post('permissions')
  async setPermissions(@Req() req: FastifyRequest, @Body() body: any) {
    await this.checkAdmin(req);
    return this.authService.toggleAppMapping(body.idCuentaPortal, body.idAplicacion, body.activo);
  }

  @Post('reset-password')
  async resetPassword(@Req() req: FastifyRequest, @Body() body: any) {
    await this.checkAdmin(req);
    return this.authService.setPassword(body.idCuentaPortal, body.nuevaClave);
  }

  // ── Activar / Desactivar usuario ──
  @Post('toggle-user')
  async toggleUser(@Req() req: FastifyRequest, @Body() body: { idCuentaPortal: number; activo: boolean }) {
    await this.checkAdmin(req);
    await this.db.Pool.request()
      .input('id', body.idCuentaPortal)
      .input('activo', body.activo ? 1 : 0)
      .query('UPDATE CuentaPortal SET Activo = @activo, FechaModificacion = GETDATE() WHERE IdCuentaPortal = @id');
    return { ok: true };
  }

  // ── Crear usuario individual ──
  @Post('create-user')
  async createUser(@Req() req: FastifyRequest, @Body() body: {
    nombres: string;
    primerApellido: string;
    segundoApellido?: string;
    correo: string;
    carnet: string;
    usuario?: string;
    clave?: string;
  }) {
    await this.checkAdmin(req);
    const pool = this.db.Pool;
    const correo = body.correo.trim().toLowerCase();
    const usuario = body.usuario?.trim() || correo.split('@')[0];
    const clave = body.clave || '123456';
    const hash = await argon2.hash(clave);

    // Verificar duplicado
    const dup = await pool.request().input('c', correo)
      .query('SELECT 1 FROM CuentaPortal WHERE CorreoLogin = @c');
    if (dup.recordset.length > 0) {
      return { ok: false, message: 'El correo ya existe en el sistema.' };
    }

    // Insertar Persona
    const rPersona = await pool.request()
      .input('nombres', body.nombres.trim())
      .input('ape1', body.primerApellido.trim())
      .input('ape2', (body.segundoApellido || '').trim())
      .query(`
        INSERT INTO Persona (Nombres, PrimerApellido, SegundoApellido, FechaCreacion)
        OUTPUT INSERTED.IdPersona
        VALUES (@nombres, @ape1, @ape2, GETDATE())
      `);
    const idPersona = rPersona.recordset[0].IdPersona;

    // Insertar CuentaPortal
    const rCuenta = await pool.request()
      .input('idPersona', idPersona)
      .input('usuario', usuario)
      .input('correo', correo)
      .input('carnet', body.carnet.trim())
      .input('hash', hash)
      .query(`
        INSERT INTO CuentaPortal (IdPersona, Usuario, CorreoLogin, Carnet, ClaveHash, Activo, Bloqueado, EsInterno, FechaCreacion)
        OUTPUT INSERTED.IdCuentaPortal
        VALUES (@idPersona, @usuario, @correo, @carnet, @hash, 1, 0, 1, GETDATE())
      `);
    const idCuenta = rCuenta.recordset[0].IdCuentaPortal;

    // Asignar Portal por defecto
    const rPortalApp = await pool.request().query("SELECT IdAplicacion FROM AplicacionSistema WHERE Codigo = 'portal' AND Activo = 1");
    if (rPortalApp.recordset.length > 0) {
      await pool.request()
        .input('u', idCuenta)
        .input('a', rPortalApp.recordset[0].IdAplicacion)
        .query('INSERT INTO UsuarioAplicacion (IdCuentaPortal, IdAplicacion, Activo, FechaCreacion) VALUES (@u, @a, 1, GETDATE())');
    }

    this.logger.log(`✅ Usuario creado: ${correo} (ID: ${idCuenta})`);
    return { ok: true, idCuentaPortal: idCuenta, message: `Usuario ${correo} creado exitosamente con clave por defecto.` };
  }

  // ── Importar usuarios masivamente (JSON array) ──
  @Post('import-users')
  async importUsers(@Req() req: FastifyRequest, @Body() body: {
    usuarios: Array<{
      nombres: string;
      primerApellido: string;
      segundoApellido?: string;
      correo: string;
      carnet: string;
    }>;
    claveDefecto?: string;
  }) {
    await this.checkAdmin(req);

    const clave = body.claveDefecto || '123456';
    const hash = await argon2.hash(clave);
    const results: Array<{ correo: string; ok: boolean; message: string }> = [];

    for (const u of body.usuarios) {
      try {
        const correo = u.correo.trim().toLowerCase();
        const dup = await this.db.Pool.request().input('c', correo)
          .query('SELECT 1 FROM CuentaPortal WHERE CorreoLogin = @c');
        if (dup.recordset.length > 0) {
          results.push({ correo, ok: false, message: 'Ya existe' });
          continue;
        }

        const rPersona = await this.db.Pool.request()
          .input('nombres', u.nombres.trim())
          .input('ape1', u.primerApellido.trim())
          .input('ape2', (u.segundoApellido || '').trim())
          .query(`
            INSERT INTO Persona (Nombres, PrimerApellido, SegundoApellido, FechaCreacion)
            OUTPUT INSERTED.IdPersona VALUES (@nombres, @ape1, @ape2, GETDATE())
          `);
        const idPersona = rPersona.recordset[0].IdPersona;
        const usuario = correo.split('@')[0];

        const rCuenta = await this.db.Pool.request()
          .input('idPersona', idPersona)
          .input('usuario', usuario)
          .input('correo', correo)
          .input('carnet', u.carnet.trim())
          .input('hash', hash)
          .query(`
            INSERT INTO CuentaPortal (IdPersona, Usuario, CorreoLogin, Carnet, ClaveHash, Activo, Bloqueado, EsInterno, FechaCreacion)
            OUTPUT INSERTED.IdCuentaPortal VALUES (@idPersona, @usuario, @correo, @carnet, @hash, 1, 0, 1, GETDATE())
          `);
        const idCuenta = rCuenta.recordset[0].IdCuentaPortal;

        // Asignar Portal
        const rApp = await this.db.Pool.request().query("SELECT IdAplicacion FROM AplicacionSistema WHERE Codigo = 'portal' AND Activo = 1");
        if (rApp.recordset.length > 0) {
          await this.db.Pool.request().input('u', idCuenta).input('a', rApp.recordset[0].IdAplicacion)
            .query('INSERT INTO UsuarioAplicacion (IdCuentaPortal, IdAplicacion, Activo, FechaCreacion) VALUES (@u, @a, 1, GETDATE())');
        }

        results.push({ correo, ok: true, message: 'Creado' });
      } catch (err) {
        results.push({ correo: u.correo, ok: false, message: String(err) });
      }
    }

    const created = results.filter(r => r.ok).length;
    const skipped = results.filter(r => !r.ok).length;
    this.logger.log(`📦 Importación masiva: ${created} creados, ${skipped} omitidos`);
    return { ok: true, creados: created, omitidos: skipped, detalle: results };
  }
}
