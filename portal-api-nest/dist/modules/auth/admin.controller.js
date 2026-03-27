"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AdminController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("../auth/auth.service");
const session_guard_1 = require("../../shared/guards/session.guard");
const common_2 = require("@nestjs/common");
const database_service_1 = require("../../shared/database/database.service");
const argon2 = require("argon2");
const mssql = require("mssql");
let AdminController = AdminController_1 = class AdminController {
    authService;
    db;
    ADMIN_CARNET = '500708';
    logger = new common_1.Logger(AdminController_1.name);
    constructor(authService, db) {
        this.authService = authService;
        this.db = db;
    }
    async checkAdmin(req) {
        const session = req.sessionUser;
        const user = await this.authService.getUser(session.idCuentaPortal);
        if (!user || user.carnet !== this.ADMIN_CARNET) {
            throw new common_1.UnauthorizedException('No tienes permisos de administrador.');
        }
    }
    async syncUsersBulk(users) {
        this.logger.log(`📥 RECIBO MASIVO: ${users.length} registros.`);
        const result = await this.authService.syncUsersBulk(users);
        return result;
    }
    async syncNetwork(data) {
        this.logger.log(`🌐 SINCRONIZACIÓN DE RED: Procesando ${data.userIds.length} usuarios para ${data.appIds.length} apps.`);
        this.authService.massiveNetworkSync(data.userIds, data.appIds).catch(err => {
            this.logger.error(`❌ Error en sincronización masiva de red: ${err.message}`);
        });
        return { success: true, message: 'La sincronización de red ha iniciado en segundo plano.' };
    }
    async getUsers(req) {
        await this.checkAdmin(req);
        const users = await this.authService.listAllUsers();
        return { items: users };
    }
    async getApps(req) {
        await this.checkAdmin(req);
        const apps = await this.authService.listAllApps();
        return { items: apps };
    }
    async createApp(req, body) {
        await this.checkAdmin(req);
        return this.authService.createApplication(body);
    }
    async updateApp(req, id, body) {
        await this.checkAdmin(req);
        return this.authService.updateApplication(id, body);
    }
    async deleteApp(req, id) {
        await this.checkAdmin(req);
        return this.authService.deleteApplication(id);
    }
    async setPermissions(req, body) {
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
    async resetPassword(req, body) {
        await this.checkAdmin(req);
        return this.authService.setPassword(body.idCuentaPortal, body.nuevaClave);
    }
    async toggleUser(req, body) {
        await this.checkAdmin(req);
        const user = await this.db.Pool.request()
            .input('id', body.idCuentaPortal)
            .query(`
        SELECT cp.Carnet, cp.CorreoLogin, (p.Nombres + ' ' + p.PrimerApellido) as NombreCompleto 
        FROM CuentaPortal cp 
        JOIN Persona p ON cp.IdPersona = p.IdPersona 
        WHERE cp.IdCuentaPortal = @id
      `);
        if (user.recordset.length === 0)
            return { ok: false, message: 'Usuario no encontrado' };
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
    async updateMetadata(req, body) {
        await this.checkAdmin(req);
        return this.authService.updateUserMetadata(body);
    }
    async createFullUser(req, body) {
        await this.checkAdmin(req);
        return this.authService.createFullUser(body);
    }
    async listDelegations(req) {
        await this.checkAdmin(req);
        return this.authService.listDelegations();
    }
    async createDelegation(req, body) {
        await this.checkAdmin(req);
        return this.authService.createDelegation(body);
    }
    async toggleDelegation(req, body) {
        await this.checkAdmin(req);
        return this.authService.toggleDelegation(body.id, body.active);
    }
    async createUser(req, body) {
        await this.checkAdmin(req);
        const pool = this.db.Pool;
        const correo = body.correo.trim().toLowerCase();
        const usuario = body.usuario?.trim() || correo.split('@')[0];
        const clave = body.clave || '123456';
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
            .query(`
        INSERT INTO CuentaPortal (IdPersona, Usuario, CorreoLogin, Carnet, ClaveHash, Activo, Bloqueado, EsInterno, FechaCreacion)
        OUTPUT INSERTED.IdCuentaPortal
        VALUES (@idPersona, @usuario, @correo, @carnet, @hash, 1, 0, 1, GETDATE())
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
        await this.authService.syncToSubmodules({
            carnet: body.carnet.trim(),
            nombre: (body.nombres + ' ' + body.primerApellido).trim(),
            correo: correo,
            activo: true,
            esInterno: true
        });
        return { ok: true, idCuentaPortal: idCuenta, message: `Usuario ${correo} creado exitosamente con clave por defecto.` };
    }
    async importUsers(req, body) {
        await this.checkAdmin(req);
        const clave = body.claveDefecto || '123456';
        const hash = await argon2.hash(clave);
        const results = [];
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
                const rApp = await this.db.Pool.request().query("SELECT IdAplicacion FROM AplicacionSistema WHERE Codigo = 'portal' AND Activo = 1");
                if (rApp.recordset.length > 0) {
                    await this.db.Pool.request().input('u', idCuenta).input('a', rApp.recordset[0].IdAplicacion)
                        .query('INSERT INTO UsuarioAplicacion (IdCuentaPortal, IdAplicacion, Activo, FechaCreacion) VALUES (@u, @a, 1, GETDATE())');
                }
                results.push({ correo, ok: true, message: 'Creado' });
                await this.authService.syncToSubmodules({
                    carnet: u.carnet.trim(),
                    nombre: (u.nombres + ' ' + u.primerApellido).trim(),
                    correo: correo,
                    activo: true,
                    esInterno: true
                });
            }
            catch (err) {
                results.push({ correo: u.correo, ok: false, message: String(err) });
            }
        }
        const created = results.filter(r => r.ok).length;
        const skipped = results.filter(r => !r.ok).length;
        this.logger.log(`📦 Importación masiva: ${created} creados, ${skipped} omitidos`);
        return { ok: true, creados: created, omitidos: skipped, detalle: results };
    }
    async syncUsersBulk(req, body) {
        await this.checkAdmin(req);
        try {
            const count = body.usuarios?.length || 0;
            this.logger.log(`📥 RECIBO MASIVO: [${count}] usuarios desde el cliente.`);
            if (count === 0)
                return { ok: false, message: 'No hay usuarios para procesar.' };
            const result = await this.db.Pool.request()
                .input('JsonData', mssql.NVarChar(mssql.MAX), JSON.stringify(body.usuarios))
                .execute('dbo.spAdmin_SincronizarUsuariosBulk');
            const procesados = result.recordset?.[0]?.Procesados || 0;
            if (Array.isArray(body.usuarios)) {
                body.usuarios.forEach(u => {
                    this.authService.syncToSubmodules({
                        carnet: u.carnet,
                        nombre: u.nombre,
                        correo: u.correo,
                        activo: u.activo !== 0 && u.activo !== '0' && u.activo !== 'NO' && u.activo !== false,
                        esInterno: (u.es_interno || '').toString().toUpperCase() === 'SI'
                    });
                });
            }
            return {
                ok: true,
                procesados,
                message: `${procesados} usuarios procesados exitosamente.`
            };
        }
        catch (err) {
            this.logger.error(`❌ Error en carga masiva SQL: ${err.message}`);
            return { ok: false, message: err.message };
        }
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Post)('sync-users-bulk'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "syncUsersBulk", null);
__decorate([
    (0, common_1.Post)('sync-network'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "syncNetwork", null);
__decorate([
    (0, common_1.Get)('users'),
    __param(0, (0, common_2.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Get)('apps'),
    __param(0, (0, common_2.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getApps", null);
__decorate([
    (0, common_1.Post)('apps'),
    __param(0, (0, common_2.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createApp", null);
__decorate([
    (0, common_1.Put)('apps/:id'),
    __param(0, (0, common_2.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateApp", null);
__decorate([
    (0, common_1.Delete)('apps/:id'),
    __param(0, (0, common_2.Req)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Number]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteApp", null);
__decorate([
    (0, common_1.Post)('permissions'),
    __param(0, (0, common_2.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "setPermissions", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    __param(0, (0, common_2.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Post)('toggle-user'),
    __param(0, (0, common_2.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "toggleUser", null);
__decorate([
    (0, common_1.Post)('update-metadata'),
    __param(0, (0, common_2.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateMetadata", null);
__decorate([
    (0, common_1.Post)('create-full-user'),
    __param(0, (0, common_2.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createFullUser", null);
__decorate([
    (0, common_1.Get)('list-delegations'),
    __param(0, (0, common_2.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listDelegations", null);
__decorate([
    (0, common_1.Post)('create-delegation'),
    __param(0, (0, common_2.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createDelegation", null);
__decorate([
    (0, common_1.Post)('toggle-delegation'),
    __param(0, (0, common_2.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "toggleDelegation", null);
__decorate([
    (0, common_1.Post)('create-user'),
    __param(0, (0, common_2.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createUser", null);
__decorate([
    (0, common_1.Post)('import-users'),
    __param(0, (0, common_2.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "importUsers", null);
__decorate([
    (0, common_1.Post)('sync-users-bulk'),
    __param(0, (0, common_2.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "syncUsersBulk", null);
exports.AdminController = AdminController = AdminController_1 = __decorate([
    (0, common_1.Controller)('api/admin'),
    (0, common_1.UseGuards)(session_guard_1.SessionGuard),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        database_service_1.DatabaseService])
], AdminController);
