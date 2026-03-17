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
var DatabaseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mssql = require("mssql");
let DatabaseService = DatabaseService_1 = class DatabaseService {
    configService;
    logger = new common_1.Logger(DatabaseService_1.name);
    pool = null;
    constructor(configService) {
        this.configService = configService;
    }
    async onModuleInit() {
        await this.connect();
    }
    async onModuleDestroy() {
        await this.close();
    }
    async connect() {
        try {
            const config = {
                server: this.configService.get('MSSQL_HOST', 'localhost'),
                user: this.configService.get('MSSQL_USER', 'sa'),
                password: this.configService.get('MSSQL_PASSWORD', ''),
                database: this.configService.get('MSSQL_DATABASE', ''),
                port: (() => {
                    const rawPort = this.configService.get('MSSQL_PORT');
                    this.logger.log(`Raw MSSQL_PORT from config: [${rawPort}] (Type: ${typeof rawPort})`);
                    const port = Number(rawPort ?? 1433);
                    this.logger.log(`Parsed MSSQL_PORT: [${port}]`);
                    return port;
                })(),
                options: {
                    encrypt: this.configService.get('MSSQL_ENCRYPT', 'true') === 'true',
                    trustServerCertificate: this.configService.get('MSSQL_TRUST_CERT', 'true') === 'true',
                    enableArithAbort: true,
                },
                pool: {
                    max: 10,
                    min: 0,
                    idleTimeoutMillis: 30000,
                },
            };
            this.logger.log(`Connecting to SQL Server at ${config.server}:${config.port}...`);
            this.pool = await new mssql.ConnectionPool(config).connect();
            this.logger.log('SQL Server connected successfully.');
        }
        catch (error) {
            this.logger.error('SQL Server connection failed:', error);
            throw error;
        }
    }
    async close() {
        if (this.pool) {
            await this.pool.close();
            this.logger.log('SQL Server connection closed.');
        }
    }
    get Pool() {
        if (!this.pool) {
            throw new Error('Database pool not initialized. Call connect() first.');
        }
        return this.pool;
    }
    async query(sql, params = {}) {
        const request = this.Pool.request();
        for (const [key, value] of Object.entries(params)) {
            request.input(key, value);
        }
        const result = await request.query(sql);
        return result.recordset;
    }
    async execute(procedureName, params = {}) {
        const request = this.Pool.request();
        for (const [key, value] of Object.entries(params)) {
            request.input(key, value);
        }
        const result = await request.execute(procedureName);
        return {
            recordset: result.recordset,
            output: result.output,
            returnValue: result.returnValue,
        };
    }
};
exports.DatabaseService = DatabaseService;
exports.DatabaseService = DatabaseService = DatabaseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], DatabaseService);
