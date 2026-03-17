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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CsrfGuard = void 0;
const common_1 = require("@nestjs/common");
const csrf_service_1 = require("../security/csrf.service");
const session_token_service_1 = require("../security/session-token.service");
const sesiones_service_1 = require("../../modules/sesiones/sesiones.service");
let CsrfGuard = class CsrfGuard {
    csrfService;
    tokenService;
    sesionesService;
    constructor(csrfService, tokenService, sesionesService) {
        this.csrfService = csrfService;
        this.tokenService = tokenService;
        this.sesionesService = sesionesService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const csrfToken = this.csrfService.validarCsrfRequest(request);
        if (!csrfToken) {
            throw new common_1.ForbiddenException('CSRF token invalido');
        }
        const sessionUser = request.sessionUser;
        if (sessionUser?.idSesionPortal) {
            const tokenHash = this.tokenService.hashToken(csrfToken);
            const valid = await this.sesionesService.validarCsrfToken(sessionUser.idSesionPortal, tokenHash);
            if (!valid) {
                throw new common_1.ForbiddenException('CSRF token no reconocido');
            }
        }
        return true;
    }
};
exports.CsrfGuard = CsrfGuard;
exports.CsrfGuard = CsrfGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [csrf_service_1.CsrfService,
        session_token_service_1.SessionTokenService,
        sesiones_service_1.SesionesService])
], CsrfGuard);
