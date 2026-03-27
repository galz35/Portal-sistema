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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SsoController = void 0;
const common_1 = require("@nestjs/common");
const session_guard_1 = require("../../shared/guards/session.guard");
const jsonwebtoken_1 = require("jsonwebtoken");
const auth_service_1 = require("./auth.service");
const common_2 = require("@nestjs/common");
let SsoController = class SsoController {
    authService;
    SSO_SECRET = 'ClaroSSO_Shared_Secret_2026_!#';
    constructor(authService) {
        this.authService = authService;
    }
    async getSsoTicket(req, reply) {
        const session = req.sessionUser;
        const user = await this.authService.getUser(session.idCuentaPortal);
        if (!user) {
            return reply.status(common_1.HttpStatus.UNAUTHORIZED).send({ ok: false, message: 'Sesión no válida' });
        }
        if (user.mustChangePassword) {
            return reply.status(common_1.HttpStatus.FORBIDDEN).send({
                ok: false,
                message: 'Debes cambiar tu contraseña temporal antes de ingresar a otras aplicaciones.',
            });
        }
        const payload = {
            sub: user.idCuentaPortal,
            username: user.usuario,
            carnet: user.carnet,
            name: user.nombre,
            correo: user.correo,
            apps: user.apps,
            permisos: user.permisos,
            type: 'SSO_PORTAL',
            ip: req.ip,
            ua: req.headers['user-agent'],
            iat: Math.floor(Date.now() / 1000),
        };
        const ticket = (0, jsonwebtoken_1.sign)(payload, this.SSO_SECRET, { expiresIn: '5m' });
        console.log(`🎫 SSO Ticket for ${user.usuario}. IP Bind: ${req.ip} | UA: ${req.headers['user-agent']?.slice(0, 30)}...`);
        return reply.status(common_1.HttpStatus.OK).send({
            ok: true,
            ticket,
        });
    }
};
exports.SsoController = SsoController;
__decorate([
    (0, common_1.Post)('ticket'),
    (0, common_1.UseGuards)(session_guard_1.SessionGuard),
    __param(0, (0, common_2.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SsoController.prototype, "getSsoTicket", null);
exports.SsoController = SsoController = __decorate([
    (0, common_1.Controller)('api/sso'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], SsoController);
