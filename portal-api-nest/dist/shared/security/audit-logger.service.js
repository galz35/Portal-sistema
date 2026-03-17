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
var AuditLoggerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLoggerService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let AuditLoggerService = AuditLoggerService_1 = class AuditLoggerService {
    db;
    logger = new common_1.Logger(AuditLoggerService_1.name);
    constructor(db) {
        this.db = db;
    }
    async registerLoginAttempt(usuarioIntentado, idCuentaPortal, ip, userAgent, exitoso, motivo) {
        try {
            const request = this.db.Pool.request();
            request.input('UsuarioIntentado', usuarioIntentado);
            request.input('IdCuentaPortal', idCuentaPortal);
            request.input('Ip', ip);
            request.input('UserAgent', userAgent?.slice(0, 512));
            request.input('Exitoso', exitoso);
            request.input('Motivo', motivo);
            await request.execute('dbo.spSeg_IntentoLogin_Registrar');
        }
        catch (err) {
            this.logger.warn(`Audit login attempt failed: ${err}`);
        }
    }
    async countRecentFailedLogins(usuarioIntentado, minutosVentana) {
        try {
            const request = this.db.Pool.request();
            request.input('UsuarioIntentado', usuarioIntentado);
            request.input('MinutosVentana', minutosVentana);
            const result = await request.execute('dbo.spSeg_IntentoLogin_ContarVentana');
            return result.recordset?.[0]?.TotalIntentos ?? 0;
        }
        catch {
            return 0;
        }
    }
    async isAccountLocked(idCuentaPortal) {
        try {
            const request = this.db.Pool.request();
            request.input('IdCuentaPortal', idCuentaPortal);
            const result = await request.execute('dbo.spSeg_BloqueoCuenta_Validar');
            return (result.recordset?.length ?? 0) > 0;
        }
        catch {
            return false;
        }
    }
    async activateAccountLock(idCuentaPortal, motivo, minutosBloqueo) {
        try {
            const fechaFin = new Date(Date.now() + minutosBloqueo * 60 * 1000);
            const request = this.db.Pool.request();
            request.input('IdCuentaPortal', idCuentaPortal);
            request.input('Motivo', motivo);
            request.input('FechaFin', fechaFin);
            request.input('IdCuentaPortalOrigen', null);
            await request.execute('dbo.spSeg_BloqueoCuenta_Activar');
        }
        catch (err) {
            this.logger.warn(`Activate account lock failed: ${err}`);
        }
    }
    async registerSecurityEvent(params) {
        try {
            const request = this.db.Pool.request();
            request.input('IdCuentaPortal', params.idCuentaPortal ?? null);
            request.input('IdSesionPortal', params.idSesionPortal ?? null);
            request.input('TipoEvento', params.tipoEvento);
            request.input('Severidad', params.severidad);
            request.input('Modulo', params.modulo ?? null);
            request.input('Recurso', params.recurso ?? null);
            request.input('Detalle', params.detalle ?? null);
            request.input('Ip', params.ip ?? null);
            request.input('UserAgent', params.userAgent?.slice(0, 512) ?? null);
            request.input('CorrelationId', params.correlationId ?? null);
            await request.execute('dbo.spSeg_EventoSeguridad_Registrar');
        }
        catch (err) {
            this.logger.warn(`Register security event failed: ${err}`);
        }
    }
};
exports.AuditLoggerService = AuditLoggerService;
exports.AuditLoggerService = AuditLoggerService = AuditLoggerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], AuditLoggerService);
