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
        return this.authService.toggleAppMapping(body.idCuentaPortal, body.idAplicacion, body.activo);
    }
    async resetPassword(req, body) {
        await this.checkAdmin(req);
        return this.authService.setPassword(body.idCuentaPortal, body.nuevaClave);
    }
    async toggleUser(req, body) {
        await this.checkAdmin(req);
        await this.db.Pool.request()
            .input('id', body.idCuentaPortal)
            .input('activo', body.activo ? 1 : 0)
            .query('UPDATE CuentaPortal SET Activo = @activo, FechaModificacion = GETDATE() WHERE IdCuentaPortal = @id');
        return { ok: true };
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
};
exports.AdminController = AdminController;
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
exports.AdminController = AdminController = AdminController_1 = __decorate([
    (0, common_1.Controller)('api/admin'),
    (0, common_1.UseGuards)(session_guard_1.SessionGuard),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        database_service_1.DatabaseService])
], AdminController);
