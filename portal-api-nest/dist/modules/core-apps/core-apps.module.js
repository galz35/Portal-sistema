"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoreAppsModule = void 0;
const common_1 = require("@nestjs/common");
const core_apps_controller_1 = require("./core-apps.controller");
const core_apps_service_1 = require("./core-apps.service");
const auth_module_1 = require("../auth/auth.module");
let CoreAppsModule = class CoreAppsModule {
};
exports.CoreAppsModule = CoreAppsModule;
exports.CoreAppsModule = CoreAppsModule = __decorate([
    (0, common_1.Module)({
        imports: [auth_module_1.AuthModule],
        controllers: [core_apps_controller_1.CoreAppsController],
        providers: [core_apps_service_1.CoreAppsService],
    })
], CoreAppsModule);
