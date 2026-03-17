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
var SessionGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionGuard = void 0;
const common_1 = require("@nestjs/common");
const cookies_service_1 = require("../security/cookies.service");
const session_token_service_1 = require("../security/session-token.service");
const sesiones_service_1 = require("../../modules/sesiones/sesiones.service");
let SessionGuard = SessionGuard_1 = class SessionGuard {
    cookies;
    tokenService;
    sesionesService;
    logger = new common_1.Logger(SessionGuard_1.name);
    constructor(cookies, tokenService, sesionesService) {
        this.cookies = cookies;
        this.tokenService = tokenService;
        this.sesionesService = sesionesService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const sid = this.cookies.readCookie(request, this.cookies.accessCookiePolicy().name);
        if (!sid) {
            throw new common_1.UnauthorizedException('Sesion no encontrada');
        }
        const sidHash = this.tokenService.hashToken(sid);
        const estado = await this.sesionesService.resolverPorSidHash(sidHash);
        if (!estado || !estado.autenticado || !estado.idCuentaPortal || !estado.idSesionPortal) {
            throw new common_1.UnauthorizedException('Sesion invalida o expirada');
        }
        request.sessionUser = {
            idSesionPortal: estado.idSesionPortal,
            idCuentaPortal: estado.idCuentaPortal,
        };
        this.sesionesService.actualizarActividad(estado.idSesionPortal).catch(() => { });
        return true;
    }
};
exports.SessionGuard = SessionGuard;
exports.SessionGuard = SessionGuard = SessionGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cookies_service_1.CookiesService,
        session_token_service_1.SessionTokenService,
        sesiones_service_1.SesionesService])
], SessionGuard);
