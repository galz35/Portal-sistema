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
exports.ObservabilidadController = void 0;
const common_1 = require("@nestjs/common");
const session_guard_1 = require("../../shared/guards/session.guard");
const auth_service_1 = require("../auth/auth.service");
let ObservabilidadController = class ObservabilidadController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    async snapshot() {
        return this.authService.getObservabilitySnapshot();
    }
};
exports.ObservabilidadController = ObservabilidadController;
__decorate([
    (0, common_1.Get)('snapshot'),
    (0, common_1.UseGuards)(session_guard_1.SessionGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ObservabilidadController.prototype, "snapshot", null);
exports.ObservabilidadController = ObservabilidadController = __decorate([
    (0, common_1.Controller)('api/observabilidad'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], ObservabilidadController);
