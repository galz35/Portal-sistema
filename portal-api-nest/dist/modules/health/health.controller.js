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
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../../shared/database/database.service");
let HealthController = class HealthController {
    db;
    constructor(db) {
        this.db = db;
    }
    async status() {
        let dbStatus = 'disconnected';
        try {
            if (this.db.Pool.connected) {
                await this.db.Pool.request().query('SELECT 1');
                dbStatus = 'connected';
            }
        }
        catch {
            dbStatus = 'error';
        }
        return {
            status: 'ok',
            service: 'portal-api-nest',
            database: dbStatus,
            timestamp: new Date().toISOString(),
        };
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "status", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)('api/health'),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], HealthController);
