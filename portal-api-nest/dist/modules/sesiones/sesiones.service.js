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
var SesionesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SesionesService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../shared/database/database.service");
let SesionesService = SesionesService_1 = class SesionesService {
    db;
    logger = new common_1.Logger(SesionesService_1.name);
    constructor(db) {
        this.db = db;
    }
    async crearConSidHash(idCuentaPortal, sidHash) {
        try {
            const fechaExpiracion = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            const request = this.db.Pool.request();
            request.input('IdCuentaPortal', idCuentaPortal);
            request.input('SidHash', sidHash);
            request.input('JtiAccessActual', null);
            request.input('JtiRefreshActual', null);
            request.input('IpCreacion', null);
            request.input('UserAgent', 'portal-api-nest');
            request.input('FechaExpiracion', fechaExpiracion);
            const result = await request.execute('dbo.spSeg_Sesion_Crear');
            const idSesionPortal = result.recordset?.[0]?.IdSesionPortal;
            if (!idSesionPortal || idSesionPortal <= 0)
                return null;
            return {
                idSesionPortal,
                idCuentaPortal,
                estadoSesion: 'ACTIVA',
            };
        }
        catch (err) {
            this.logger.error(`crearConSidHash failed: ${err}`);
            return null;
        }
    }
    async resolverPorSidHash(sidHash) {
        try {
            const request = this.db.Pool.request();
            request.input('SidHash', sidHash);
            const result = await request.execute('dbo.spSeg_Sesion_ValidarPorSidHash');
            const row = result.recordset?.[0];
            if (!row)
                return null;
            return {
                autenticado: !!row.IdSesionPortal,
                idCuentaPortal: row.IdCuentaPortal ?? null,
                idSesionPortal: row.IdSesionPortal ?? null,
            };
        }
        catch (err) {
            this.logger.error(`resolverPorSidHash failed: ${err}`);
            return null;
        }
    }
    async rotarSidHash(idSesionPortal, sidHashActual, nuevoSidHash) {
        try {
            const request = this.db.Pool.request();
            request.input('IdSesionPortal', idSesionPortal);
            request.input('SidHashActual', sidHashActual);
            request.input('NuevoSidHash', nuevoSidHash);
            const result = await request.execute('dbo.spSeg_Sesion_RotarSidHash');
            return (result.recordset?.[0]?.RegistrosAfectados ?? 0) > 0;
        }
        catch {
            return false;
        }
    }
    async revocarPorId(idSesionPortal) {
        try {
            const request = this.db.Pool.request();
            request.input('IdSesionPortal', idSesionPortal);
            request.input('MotivoRevocacion', 'logout');
            await request.execute('dbo.spSeg_Sesion_Revocar');
            return { idSesionPortal, idCuentaPortal: 0, estadoSesion: 'REVOCADA' };
        }
        catch {
            return null;
        }
    }
    async actualizarActividad(idSesionPortal) {
        try {
            const request = this.db.Pool.request();
            request.input('IdSesionPortal', idSesionPortal);
            await request.execute('dbo.spSeg_Sesion_ActualizarActividad');
            return true;
        }
        catch {
            return false;
        }
    }
    async crearCsrfToken(idSesionPortal, tokenHash) {
        try {
            const fechaExpiracion = new Date(Date.now() + 2 * 60 * 60 * 1000);
            const request = this.db.Pool.request();
            request.input('IdSesionPortal', idSesionPortal);
            request.input('TokenHash', tokenHash);
            request.input('FechaExpiracion', fechaExpiracion);
            await request.execute('dbo.spSeg_Csrf_Crear');
            return true;
        }
        catch {
            return false;
        }
    }
    async validarCsrfToken(idSesionPortal, tokenHash) {
        try {
            const request = this.db.Pool.request();
            request.input('IdSesionPortal', idSesionPortal);
            request.input('TokenHash', tokenHash);
            const result = await request.execute('dbo.spSeg_Csrf_Validar');
            return result.recordset?.[0]?.EsValido === true;
        }
        catch {
            return false;
        }
    }
    async revocarCsrfPorSesion(idSesionPortal) {
        try {
            const request = this.db.Pool.request();
            request.input('IdSesionPortal', idSesionPortal);
            await request.execute('dbo.spSeg_Csrf_RevocarPorSesion');
            return true;
        }
        catch {
            return false;
        }
    }
};
exports.SesionesService = SesionesService;
exports.SesionesService = SesionesService = SesionesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], SesionesService);
