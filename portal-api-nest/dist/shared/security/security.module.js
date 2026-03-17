"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const cookies_service_1 = require("./cookies.service");
const session_token_service_1 = require("./session-token.service");
const csrf_service_1 = require("./csrf.service");
const rate_limit_service_1 = require("./rate-limit.service");
const audit_logger_service_1 = require("./audit-logger.service");
let SecurityModule = class SecurityModule {
};
exports.SecurityModule = SecurityModule;
exports.SecurityModule = SecurityModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [config_1.ConfigModule],
        providers: [
            cookies_service_1.CookiesService,
            session_token_service_1.SessionTokenService,
            csrf_service_1.CsrfService,
            rate_limit_service_1.RateLimitService,
            audit_logger_service_1.AuditLoggerService,
        ],
        exports: [
            cookies_service_1.CookiesService,
            session_token_service_1.SessionTokenService,
            csrf_service_1.CsrfService,
            rate_limit_service_1.RateLimitService,
            audit_logger_service_1.AuditLoggerService,
        ],
    })
], SecurityModule);
