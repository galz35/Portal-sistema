import { Controller, Get, Post, Put, Delete, Body, UseGuards, UnauthorizedException, Param, ParseIntPipe, Logger } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { SessionGuard, SessionUser } from '../../shared/guards/session.guard';
import { Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { DatabaseService } from '../../shared/database/database.service';
import * as argon2 from 'argon2';
import * as mssql from 'mssql';

@Controller('api/admin')
@UseGuards(SessionGuard)
export class AdminController {
  private readonly ADMIN_CARNETS = ['500708', '772'];
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly db: DatabaseService,
  ) {}

  private async checkAdmin(req: FastifyRequest) {
    const session = (req as any).sessionUser as SessionUser;
    const user = await this.authService.getUser(session.idCuentaPortal);
    if (!user || !this.ADMIN_CARNETS.includes(user.carnet)) {
      throw new UnauthorizedException('No tienes permisos de administrador.');
    }
  }

  @Post('sync-users-bulk')
  async syncUsersBulk(@Body() body: { usuarios: any[] }) {
    this.logger.log(`📥 RECIBO MASIVO: ${body.usuarios?.length || 0} registros.`);
    return await this.authService.syncUsersBulk(body.usuarios || []);
  }

  @Post('sync-network')
  async syncNetwork(@Body() data: { userIds: number[], appIds: number[] }) {
      this.logger.log(`🌐 SINCRONIZACIÓN DE RED: Procesando ${data.userIds.length} usuarios para ${data.appIds.length} apps.`);
      
      this.authService.massiveNetworkSync(data.userIds, data.appIds).catch(err => {
          this.logger.error(`❌ Error en sincronización masiva de red: ${err.message}`);
      });

      return { success: true, message: 'La sincronización de red ha iniciado en segundo plano.' };
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
    const result = await this.authService.toggleAppMapping(body.idCuentaPortal, body.idAplicacion, body.activo);
    
    const user = await this.db.Pool.request()
      .input('id', body.idCuentaPortal)
      .query(`
        SELECT cp.Carnet, cp.CorreoLogin, (p.Nombres + ' ' + p.PrimerApellido) as NombreCompleto, cp.Activo, cp.EsInterno 
        FROM CuentaPortal cp 
        JOIN Persona p ON cp.IdPersona = p.IdPersona 
        WHERE cp.IdCuentaPortal = @id
      `);

    if (user.recordset.length > 0) {
      const { Carnet, CorreoLogin, NombreCompleto, Activo, EsInterno } = user.recordset[0];
      await this.authService.syncToSubmodules({
        carnet: Carnet,
        nombre: NombreCompleto,
        correo: CorreoLogin,
        activo: Activo === 1 || Activo === true,
        esInterno: EsInterno === 1 || EsInterno === true
      });
    }

    return result;
  }

  @Post('reset-password')
  async resetPassword(@Req() req: FastifyRequest, @Body() body: any) {
    await this.checkAdmin(req);
    return this.authService.setPassword(body.idCuentaPortal, body.nuevaClave, true);
  }

  @Post('toggle-user')
  async toggleUser(@Req() req: FastifyRequest, @Body() body: { idCuentaPortal: number; activo: boolean }) {
    await this.checkAdmin(req);
    
    const user = await this.db.Pool.request()
      .input('id', body.idCuentaPortal)
      .query(`
        SELECT cp.Carnet, cp.CorreoLogin, (p.Nombres + ' ' + p.PrimerApellido) as NombreCompleto 
        FROM CuentaPortal cp 
        JOIN Persona p ON cp.IdPersona = p.IdPersona 
        WHERE cp.IdCuentaPortal = @id
      `);

    if (user.recordset.length === 0) return { ok: false, message: 'Usuario no encontrado' };
    const { Carnet, CorreoLogin, NombreCompleto } = user.recordset[0];

    await this.db.Pool.request()
      .input('id', body.idCuentaPortal)
      .input('activo', body.activo ? 1 : 0)
      .query('UPDATE CuentaPortal SET Activo = @activo, FechaModificacion = GETDATE() WHERE IdCuentaPortal = @id');

    await this.authService.syncToSubmodules({
      carnet: Carnet,
      nombre: NombreCompleto,
      correo: CorreoLogin,
      activo: body.activo
    });

    return { ok: true };
  }

  @Post('update-metadata')
  async updateMetadata(@Req() req: FastifyRequest, @Body() body: any) {
    await this.checkAdmin(req);
    return this.authService.updateUserMetadata(body);
  }

  @Post('create-full-user')
  async createFullUser(@Req() req: FastifyRequest, @Body() body: any) {
    await this.checkAdmin(req);
    return this.authService.createFullUser(body);
  }

  @Get('list-delegations')
  async listDelegations(@Req() req: FastifyRequest) {
    await this.checkAdmin(req);
    return this.authService.listDelegations();
  }

  @Post('create-delegation')
  async createDelegation(@Req() req: FastifyRequest, @Body() body: any) {
    await this.checkAdmin(req);
    return this.authService.createDelegation(body);
  }

  @Post('toggle-delegation')
  async toggleDelegation(@Req() req: FastifyRequest, @Body() body: { id: number; active: boolean }) {
    await this.checkAdmin(req);
    return this.authService.toggleDelegation(body.id, body.active);
  }

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
    const mustChangePassword = !body.clave || clave === '123456';
    const hash = await argon2.hash(clave);

    const dup = await pool.request().input('c', correo)
      .query('SELECT 1 FROM CuentaPortal WHERE CorreoLogin = @c');
    if (dup.recordset.length > 0) {
      return { ok: false, message: 'El correo ya existe en el sistema.' };
    }

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

    const rCuenta = await pool.request()
      .input('idPersona', idPersona)
      .input('usuario', usuario)
      .input('correo', correo)
      .input('carnet', body.carnet.trim())
      .input('hash', hash)
      .input('mustChangePassword', mustChangePassword ? 1 : 0)
      .query(`
        INSERT INTO CuentaPortal (IdPersona, Usuario, CorreoLogin, Carnet, ClaveHash, Activo, Bloqueado, EsInterno, DebeCambiarClave, FechaCreacion)
        OUTPUT INSERTED.IdCuentaPortal
        VALUES (@idPersona, @usuario, @correo, @carnet, @hash, 1, 0, 1, @mustChangePassword, GETDATE())
      `);
    const idCuenta = rCuenta.recordset[0].IdCuentaPortal;

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
          .input('mustChangePassword', 1)
          .query(`
            INSERT INTO CuentaPortal (IdPersona, Usuario, CorreoLogin, Carnet, ClaveHash, Activo, Bloqueado, EsInterno, DebeCambiarClave, FechaCreacion)
            OUTPUT INSERTED.IdCuentaPortal VALUES (@idPersona, @usuario, @correo, @carnet, @hash, 1, 0, 1, @mustChangePassword, GETDATE())
          `);
        const idCuenta = rCuenta.recordset[0].IdCuentaPortal;

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
