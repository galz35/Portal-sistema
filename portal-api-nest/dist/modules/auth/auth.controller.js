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
var AuthController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const sesiones_service_1 = require("../sesiones/sesiones.service");
const cookies_service_1 = require("../../shared/security/cookies.service");
const session_token_service_1 = require("../../shared/security/session-token.service");
const csrf_service_1 = require("../../shared/security/csrf.service");
const rate_limit_service_1 = require("../../shared/security/rate-limit.service");
const audit_logger_service_1 = require("../../shared/security/audit-logger.service");
const session_guard_1 = require("../../shared/guards/session.guard");
const auth_dto_1 = require("./dto/auth.dto");
const request_metadata_1 = require("../../shared/security/request-metadata");
const jsonwebtoken_1 = require("jsonwebtoken");
const SSO_SECRET = 'ClaroSSO_Shared_Secret_2026_!#';
let AuthController = AuthController_1 = class AuthController {
    authService;
    sesionesService;
    cookies;
    tokenService;
    csrfService;
    rateLimitService;
    auditLogger;
    logger = new common_1.Logger(AuthController_1.name);
    constructor(authService, sesionesService, cookies, tokenService, csrfService, rateLimitService, auditLogger) {
        this.authService = authService;
        this.sesionesService = sesionesService;
        this.cookies = cookies;
        this.tokenService = tokenService;
        this.csrfService = csrfService;
        this.rateLimitService = rateLimitService;
        this.auditLogger = auditLogger;
    }
    async health() {
        return {
            status: 'OK',
            version: '1.0.8-sync-network',
            timestamp: new Date().toISOString(),
            service: 'Portal CORE API'
        };
    }
    async loginEmpleado(body, req, reply) {
        try {
            const usuario = body.usuario.trim();
            const clave = body.clave;
            const ip = (0, request_metadata_1.extractClientIp)(req) || '0.0.0.0';
            const ua = (0, request_metadata_1.extractUserAgent)(req) || 'Unknown';
            const ipLimit = this.rateLimitService.checkSlidingWindow(`login-ip:${ip}`, 10, 300);
            if (!ipLimit.allowed) {
                await this.auditLogger.registerLoginAttempt(usuario, null, ip, ua, false, 'RATE_LIMIT_IP');
                return reply.status(common_1.HttpStatus.TOO_MANY_REQUESTS).send({ ok: false, message: 'Demasiados intentos' });
            }
            const user = await this.authService.findLoginUser(usuario);
            if (!user) {
                await this.auditLogger.registerLoginAttempt(usuario, null, ip, ua, false, 'USER_NOT_FOUND');
                return reply.status(common_1.HttpStatus.UNAUTHORIZED).send({ ok: false, message: 'Credenciales invalidas' });
            }
            const locked = await this.auditLogger.isAccountLocked(user.idCuentaPortal);
            if (user.bloqueado || locked) {
                return reply.status(common_1.HttpStatus.FORBIDDEN).send({ ok: false, message: 'Cuenta bloqueada temporalmente' });
            }
            const passwordOk = await this.authService.validarClavePortal(user.claveHash, clave);
            if (!passwordOk) {
                const sqlFailedCount = await this.auditLogger.countRecentFailedLogins(usuario, 5);
                if (sqlFailedCount >= 9)
                    await this.auditLogger.activateAccountLock(user.idCuentaPortal, 'Intentos fallidos', 15);
                await this.auditLogger.registerLoginAttempt(usuario, user.idCuentaPortal, ip, ua, false, 'INVALID_PASSWORD');
                return reply.status(common_1.HttpStatus.UNAUTHORIZED).send({ ok: false, message: 'Credenciales invalidas' });
            }
            const sid = this.tokenService.generarSid();
            const sidHash = this.tokenService.hashToken(sid);
            const sesion = await this.sesionesService.crearConSidHash(user.idCuentaPortal, sidHash);
            if (!sesion) {
                return reply.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).send({ ok: false, message: 'Error creando sesion' });
            }
            const csrfToken = this.csrfService.generarCsrfToken();
            const csrfHash = this.csrfService.hashCsrfToken(csrfToken);
            await this.sesionesService.crearCsrfToken(sesion.idSesionPortal, csrfHash);
            this.cookies.appendSessionCookies(reply, sid, csrfToken);
            await this.auditLogger.registerLoginAttempt(usuario, user.idCuentaPortal, ip, ua, true, null);
            let ticket;
            if (body.returnUrl && !user.mustChangePassword) {
                const fullUser = await this.authService.getUser(user.idCuentaPortal);
                if (fullUser) {
                    const payload = {
                        sub: fullUser.idCuentaPortal,
                        username: fullUser.usuario,
                        carnet: fullUser.carnet,
                        name: fullUser.nombre,
                        correo: fullUser.correo,
                        apps: fullUser.apps,
                        permisos: fullUser.permisos,
                        type: 'SSO_PORTAL',
                        iat: Math.floor(Date.now() / 1000),
                    };
                    ticket = (0, jsonwebtoken_1.sign)(payload, SSO_SECRET, { expiresIn: '10m' });
                    this.logger.log(`🎫 SSO Auto-Ticket generado para redirect a: ${body.returnUrl}`);
                }
            }
            return reply.status(common_1.HttpStatus.OK).send({
                ok: true,
                usuario: user.usuario,
                nombre: user.nombre,
                mustChangePassword: user.mustChangePassword,
                ticket,
            });
        }
        catch (err) {
            this.logger.error(`CRITICAL LOGIN ERROR: ${err.message}`, err.stack);
            return reply.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).send({
                ok: false,
                message: 'Fallo interno en el proceso de autenticación',
                detail: err.message
            });
        }
    }
    async sessionState(request, reply) {
        const sid = this.cookies.readCookie(request, this.cookies.accessCookiePolicy().name);
        if (!sid)
            return reply.status(common_1.HttpStatus.OK).send({ authenticated: false });
        const sidHash = this.tokenService.hashToken(sid);
        const estado = await this.sesionesService.resolverPorSidHash(sidHash);
        if (!estado?.autenticado || !estado.idCuentaPortal) {
            return reply.status(common_1.HttpStatus.OK).send({ authenticated: false });
        }
        const mustChangePassword = await this.authService.getMustChangePassword(estado.idCuentaPortal);
        return reply.status(common_1.HttpStatus.OK).send({
            authenticated: true,
            idSesionPortal: estado.idSesionPortal,
            idCuentaPortal: estado.idCuentaPortal,
            mustChangePassword,
        });
    }
    async changePassword(req, body) {
        const session = req.sessionUser;
        if (!body.nuevaClave || body.nuevaClave.length < 6) {
            throw new common_1.UnauthorizedException('La contraseña debe tener al menos 6 caracteres.');
        }
        await this.authService.setPassword(session.idCuentaPortal, body.nuevaClave, false);
        const ip = (0, request_metadata_1.extractClientIp)(req) || '0.0.0.0';
        await this.auditLogger.registerLoginAttempt('SYSTEM', session.idCuentaPortal, ip, 'SYSTEM', true, 'PASSWORD_CHANGED_BY_USER');
        return { ok: true, message: 'Contraseña actualizada con éxito' };
    }
    async me(request) {
        const session = request.sessionUser;
        const user = await this.authService.getUser(session.idCuentaPortal);
        if (!user)
            throw new common_1.UnauthorizedException();
        return { ok: true, ...user };
    }
    async logout(request, reply) {
        const session = request.sessionUser;
        await this.sesionesService.revocarPorId(session.idSesionPortal);
        this.cookies.clearSessionCookies(reply);
        return reply.status(common_1.HttpStatus.OK).send({ ok: true });
    }
    async introspect(body, request, reply) {
        const sid = this.cookies.readCookie(request, this.cookies.accessCookiePolicy().name);
        if (!sid)
            return reply.status(common_1.HttpStatus.UNAUTHORIZED).send({ authenticated: false });
        const sidHash = this.tokenService.hashToken(sid);
        const estado = await this.sesionesService.resolverPorSidHash(sidHash);
        if (!estado?.autenticado || !estado.idCuentaPortal) {
            return reply.status(common_1.HttpStatus.UNAUTHORIZED).send({ authenticated: false });
        }
        const user = await this.authService.getUser(estado.idCuentaPortal);
        return reply.status(common_1.HttpStatus.OK).send({ authenticated: !!user, identity: user });
    }
    async employeeNames(body) {
        const items = await this.authService.listEmployeeNames(body.idsPersona ?? []);
        return { items };
    }
    async employeeProfile(id) {
        return this.authService.getEmployeeProfile(id);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "health", null);
__decorate([
    (0, common_1.Post)('login-empleado'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.LoginEmpleadoDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "loginEmpleado", null);
__decorate([
    (0, common_1.Get)('session-state'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sessionState", null);
__decorate([
    (0, common_1.Post)('change-password'),
    (0, common_1.UseGuards)(session_guard_1.SessionGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changePassword", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(session_guard_1.SessionGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "me", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.UseGuards)(session_guard_1.SessionGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('introspect'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.IntrospectDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "introspect", null);
__decorate([
    (0, common_1.Post)('employees/names'),
    (0, common_1.UseGuards)(session_guard_1.SessionGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [auth_dto_1.EmployeeNamesDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "employeeNames", null);
__decorate([
    (0, common_1.Get)('employees/:id/profile'),
    (0, common_1.UseGuards)(session_guard_1.SessionGuard),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "employeeProfile", null);
exports.AuthController = AuthController = AuthController_1 = __decorate([
    (0, common_1.Controller)('api/auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        sesiones_service_1.SesionesService,
        cookies_service_1.CookiesService,
        session_token_service_1.SessionTokenService,
        csrf_service_1.CsrfService,
        rate_limit_service_1.RateLimitService,
        audit_logger_service_1.AuditLoggerService])
], AuthController);
