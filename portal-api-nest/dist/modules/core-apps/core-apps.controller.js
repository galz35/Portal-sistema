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
exports.CoreAppsController = void 0;
const common_1 = require("@nestjs/common");
const core_apps_service_1 = require("./core-apps.service");
const session_guard_1 = require("../../shared/guards/session.guard");
let CoreAppsController = class CoreAppsController {
    service;
    constructor(service) {
        this.service = service;
    }
    async getApps(request) {
        const session = request.sessionUser;
        const apps = await this.service.listApps(session.idCuentaPortal);
        return { items: apps };
    }
};
exports.CoreAppsController = CoreAppsController;
__decorate([
    (0, common_1.Get)('apps'),
    (0, common_1.UseGuards)(session_guard_1.SessionGuard),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CoreAppsController.prototype, "getApps", null);
exports.CoreAppsController = CoreAppsController = __decorate([
    (0, common_1.Controller)('api/core'),
    __metadata("design:paramtypes", [core_apps_service_1.CoreAppsService])
], CoreAppsController);
