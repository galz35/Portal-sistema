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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../shared/database/database.service");
const argon2 = require("argon2");
const crypto_1 = require("crypto");
let AuthService = AuthService_1 = class AuthService {
    db;
    logger = new common_1.Logger(AuthService_1.name);
    appRouteOverrides = {
        portal: process.env.PORTAL_PUBLIC_URL?.trim() || 'https://www.rhclaroni.com/portal-test/',
        planer: process.env.PLANER_PUBLIC_URL?.trim() || 'https://www.rhclaroni.com/portal/planer/',
        clima: process.env.CLIMA_PUBLIC_URL?.trim() || 'https://www.rhclaroni.com/portal/clima/',
        clinica: process.env.CLINICA_PUBLIC_URL?.trim() || '',
        inventario: process.env.INVENTARIO_PUBLIC_URL?.trim() || '',
        vacante: process.env.VACANTE_PUBLIC_URL?.trim() || '',
    };
    submoduleSyncTargets = [
        {
            name: 'Planer',
            url: process.env.PLANER_SYNC_URL?.trim() || 'http://127.0.0.1:3021/Planer_api/auth/sso-sync-user',
        },
        {
            name: 'Clinica',
            url: process.env.CLINICA_SYNC_URL?.trim() || '',
        },
        {
            name: 'Clima',
            url: process.env.CLIMA_SYNC_URL?.trim() || '',
        },
    ];
    constructor(db) {
        this.db = db;
    }
    normalizeAppRoute(codigo, ruta) {
        const code = (codigo ?? '').trim().toLowerCase();
        const currentRoute = (ruta ?? '').trim();
        const overrideRoute = (this.appRouteOverrides[code] ?? '').trim();
        if (!overrideRoute) {
            return currentRoute;
        }
        if (!currentRoute) {
            return overrideRoute;
        }
        if (/^https?:\/\/localhost(?::\d+)?(?:\/|$)/i.test(currentRoute)) {
            return overrideRoute;
        }
        return currentRoute;
    }
    async findLoginUser(usuario) {
        try {
            const request = this.db.Pool.request();
            request.input('Usuario', usuario.trim().toLowerCase());
            request.input('TipoLogin', 'empleado');
            const result = await request.execute('dbo.spSeg_Login');
            const row = result.recordset?.[0];
            if (!row)
                return null;
            const nombre = (row.NombreEmpleado || '').trim() ||
                [row.Nombres, row.PrimerApellido, row.SegundoApellido]
                    .filter((p) => p?.trim())
                    .join(' ');
            return {
                idCuentaPortal: row.IdCuentaPortal ?? 0,
                usuario: (row.Usuario ?? '').trim(),
                nombre: nombre.trim(),
                correo: (row.CorreoEmpleado || row.CorreoLogin || '').trim(),
                activo: row.Activo ?? false,
                bloqueado: row.Bloqueado ?? false,
                claveHash: (row.ClaveHash ?? '').trim(),
            };
        }
        catch (err) {
            this.logger.error(`findLoginUser failed: ${err}`);
            return null;
        }
    }
    async validarClavePortal(claveHash, clavePlana) {
        const hash = claveHash.trim();
        if (hash.startsWith('$argon2')) {
            try {
                return await argon2.verify(hash, clavePlana);
            }
            catch (err) {
                this.logger.error(`Error Argon2: ${err}`);
                return false;
            }
        }
        if (hash.startsWith('sha256$')) {
            const expectedHash = hash.slice('sha256$'.length);
            const computed = (0, crypto_1.createHash)('sha256').update(clavePlana).digest('hex');
            return computed.toLowerCase() === expectedHash.toLowerCase();
        }
        return false;
    }
    async getUser(idCuentaPortal) {
        try {
            const request = this.db.Pool.request();
            request.input('IdCuentaPortal', idCuentaPortal);
            const result = await request.execute('dbo.spSeg_Me');
            const row = result.recordset?.[0];
            if (!row)
                return null;
            const nombre = (row.nombre_completo || '').trim() ||
                [row.Nombres, row.PrimerApellido, row.SegundoApellido]
                    .filter((p) => p?.trim())
                    .join(' ');
            const apps = await this.listUserApps(idCuentaPortal);
            const permisos = await this.listUserPermissions(idCuentaPortal);
            return {
                idCuentaPortal: row.IdCuentaPortal ?? 0,
                idPersona: row.IdPersona ?? 0,
                usuario: (row.Usuario ?? '').trim(),
                nombre: nombre.trim(),
                correo: (row.correo || row.CorreoLogin || '').trim(),
                carnet: (row.Carnet ?? '').trim(),
                esInterno: row.EsInterno ?? false,
                apps,
                permisos,
            };
        }
        catch (err) {
            this.logger.error(`getUser failed: ${err}`);
            return null;
        }
    }
    async listUserApps(idCuentaPortal) {
        try {
            const request = this.db.Pool.request();
            request.input('IdCuentaPortal', idCuentaPortal);
            const result = await request.execute('dbo.spSeg_UsuarioApps');
            return result.recordset?.map((r) => (r.Codigo ?? '').trim()) ?? [];
        }
        catch {
            return [];
        }
    }
    async listUserAppsVerbose(idCuentaPortal) {
        try {
            const request = this.db.Pool.request();
            request.input('IdCuentaPortal', idCuentaPortal);
            const result = await request.execute('dbo.spSeg_UsuarioApps');
            return (result.recordset?.map((r) => ({
                codigo: (r.Codigo ?? '').trim(),
                nombre: (r.Nombre ?? '').trim(),
                ruta: this.normalizeAppRoute((r.Codigo ?? '').trim(), (r.Ruta ?? '').trim()),
                icono: (r.Icono ?? '').trim(),
                descripcion: '',
            })) ?? []);
        }
        catch {
            return [];
        }
    }
    async listUserPermissions(idCuentaPortal) {
        try {
            const request = this.db.Pool.request();
            request.input('IdCuentaPortal', idCuentaPortal);
            const result = await request.execute('dbo.spSeg_UsuarioPermisos');
            return result.recordset?.map((r) => (r.Codigo ?? '').trim()) ?? [];
        }
        catch {
            return [];
        }
    }
    async getEmployeeProfile(idPersona) {
        try {
            const request = this.db.Pool.request();
            request.input('IdPersona', idPersona);
            const result = await request.execute('dbo.spSeg_Usuario_ObtenerDetallePerfil');
            const row = result.recordset?.[0];
            if (!row)
                return null;
            return {
                idPersona,
                nombre: (row.NombreEmpleado ?? '').trim(),
                correo: (row.CorreoEmpleado ?? '').trim() || null,
                cargo: (row.Cargo ?? '').trim() || null,
                empresa: (row.Empresa ?? '').trim() || null,
                departamento: (row.Departamento ?? '').trim() || null,
                pais: (row.Pais ?? '').trim() || null,
                jefe: (row.Jefe ?? '').trim() || null,
            };
        }
        catch {
            return null;
        }
    }
    async listEmployeeNames(idsPersona) {
        const uniqueIds = [...new Set(idsPersona.filter((id) => id > 0))];
        if (uniqueIds.length === 0)
            return [];
        try {
            const request = this.db.Pool.request();
            request.input('IdsPersonaJson', JSON.stringify(uniqueIds));
            const result = await request.execute('dbo.spSeg_Usuario_ListarNombresPerfil');
            return (result.recordset
                ?.map((r) => ({
                idPersona: r.IdPersona,
                nombre: (r.NombreEmpleado ?? '').trim(),
            }))
                .filter((r) => r.nombre) ?? []);
        }
        catch {
            return [];
        }
    }
    async getObservabilitySnapshot() {
        try {
            const request = this.db.Pool.request();
            const result = await request.execute('dbo.spSeg_Dashboard_Observabilidad');
            const row = result.recordset?.[0];
            return {
                activeSessions: row?.ActiveSessions ?? 0,
                loginSuccess24h: row?.LoginSuccess24h ?? 0,
                loginFailure24h: row?.LoginFailure24h ?? 0,
                refreshFailure24h: row?.RefreshFailure24h ?? 0,
                securityHigh24h: row?.SecurityHigh24h ?? 0,
                securityWarn24h: row?.SecurityWarn24h ?? 0,
            };
        }
        catch {
            return {};
        }
    }
    async listAllApps() {
        try {
            const result = await this.db.Pool.request().query('SELECT * FROM AplicacionSistema WHERE Activo = 1 ORDER BY OrdenVisual ASC');
            return result.recordset;
        }
        catch (err) {
            this.logger.error(`listAllApps failed: ${err}`);
            throw err;
        }
    }
    async createApplication(data) {
        try {
            await this.db.Pool.request()
                .input('codigo', data.codigo)
                .input('nombre', data.nombre)
                .input('ruta', data.ruta)
                .input('icono', data.icono)
                .query(`
          INSERT INTO AplicacionSistema (Codigo, Nombre, Ruta, Icono, Activo, OrdenVisual)
          VALUES (@codigo, @nombre, @ruta, @icono, 1, (SELECT ISNULL(MAX(OrdenVisual), 0) + 1 FROM AplicacionSistema))
        `);
            return { ok: true };
        }
        catch (err) {
            this.logger.error(`createApplication failed: ${err}`);
            throw err;
        }
    }
    async updateApplication(id, data) {
        try {
            await this.db.Pool.request()
                .input('id', id)
                .input('codigo', data.codigo)
                .input('nombre', data.nombre)
                .input('ruta', data.ruta)
                .input('icono', data.icono)
                .query(`
          UPDATE AplicacionSistema 
          SET Codigo = @codigo, Nombre = @nombre, Ruta = @ruta, Icono = @icono 
          WHERE IdAplicacion = @id
        `);
            return { ok: true };
        }
        catch (err) {
            this.logger.error(`updateApplication failed: ${err}`);
            throw err;
        }
    }
    async deleteApplication(id) {
        try {
            await this.db.Pool.request()
                .input('id', id)
                .query('UPDATE AplicacionSistema SET Activo = 0 WHERE IdAplicacion = @id');
            return { ok: true };
        }
        catch (err) {
            this.logger.error(`deleteApplication failed: ${err}`);
            throw err;
        }
    }
    async toggleAppMapping(idCuentaPortal, idAplicacion, activo) {
        if (activo) {
            await this.db.Pool.request()
                .input('u', idCuentaPortal)
                .input('a', idAplicacion)
                .query(`
          IF NOT EXISTS (SELECT 1 FROM UsuarioAplicacion WHERE IdCuentaPortal = @u AND IdAplicacion = @a)
            INSERT INTO UsuarioAplicacion (IdCuentaPortal, IdAplicacion, Activo, FechaCreacion)
            VALUES (@u, @a, 1, GETDATE())
          ELSE
            UPDATE UsuarioAplicacion SET Activo = 1 WHERE IdCuentaPortal = @u AND IdAplicacion = @a
        `);
        }
        else {
            await this.db.Pool.request()
                .input('u', idCuentaPortal)
                .input('a', idAplicacion)
                .query('UPDATE UsuarioAplicacion SET Activo = 0 WHERE IdCuentaPortal = @u AND IdAplicacion = @a');
        }
        return { ok: true };
    }
    async setPassword(idCuentaPortal, nuevaClave) {
        const hash = await argon2.hash(nuevaClave);
        await this.db.Pool.request()
            .input('id', idCuentaPortal)
            .input('hash', hash)
            .query('UPDATE CuentaPortal SET ClaveHash = @hash, FechaModificacion = GETDATE() WHERE IdCuentaPortal = @id');
        return { ok: true };
    }
    async listAllUsers() {
        try {
            const result = await this.db.Pool.request().query(`
        SELECT 
          cp.IdCuentaPortal, 
          cp.Usuario, 
          cp.CorreoLogin, 
          cp.Activo, 
          p.Nombres, 
          p.PrimerApellido, 
          p.SegundoApellido, 
          cp.Carnet,
          (
            SELECT ua.IdAplicacion 
            FROM UsuarioAplicacion ua 
            WHERE ua.IdCuentaPortal = cp.IdCuentaPortal AND ua.Activo = 1 
            FOR JSON PATH
          ) as AppsJson
        FROM CuentaPortal cp
        JOIN Persona p ON cp.IdPersona = p.IdPersona
        ORDER BY p.Nombres ASC
      `);
            return result.recordset.map(row => ({
                ...row,
                AppsIds: row.AppsJson ? JSON.parse(row.AppsJson).map((a) => a.IdAplicacion) : []
            }));
        }
        catch (err) {
            this.logger.error(`listAllUsers failed: ${err}`);
            throw err;
        }
    }
    async syncToSubmodules(userPayload) {
        const apps = this.submoduleSyncTargets;
        const results = [];
        for (const app of apps) {
            if (!app.url) {
                results.push({ app: app.name, ok: true, skipped: true });
                continue;
            }
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                await fetch(app.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userPayload),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                results.push({ app: app.name, ok: true });
            }
            catch (err) {
                this.logger.error(`[SYNC] Error sincronizando hacia ${app.name}: ${err.message}`);
                results.push({ app: app.name, ok: false, error: err.message });
            }
        }
        return results;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], AuthService);
