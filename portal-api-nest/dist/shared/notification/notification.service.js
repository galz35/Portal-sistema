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
var NotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const mailer_1 = require("@nestjs-modules/mailer");
const database_service_1 = require("../database/database.service");
let NotificationService = NotificationService_1 = class NotificationService {
    mailerService;
    db;
    logger = new common_1.Logger(NotificationService_1.name);
    constructor(mailerService, db) {
        this.mailerService = mailerService;
        this.db = db;
    }
    async sendEmail(to, subject, template, context, meta) {
        if (!this.mailerService) {
            this.logger.warn(`MailerService no configurado, omitiendo correo a ${to}`);
            return;
        }
        try {
            await this.mailerService.sendMail({
                to,
                subject,
                template: `./${template}`,
                context,
            });
            this.logger.log(`Email enviado a ${to}: ${subject}`);
            await this.registrarNotificacion({
                correo: to,
                asunto: subject,
                tipo: template.toUpperCase(),
                estado: 'ENVIADO',
                ...meta,
            });
        }
        catch (error) {
            this.logger.error(`Error enviando email a ${to}`, error);
            await this.registrarNotificacion({
                correo: to,
                asunto: subject,
                tipo: template.toUpperCase(),
                estado: 'FALLIDO',
                error: error.message || String(error),
                ...meta,
            });
        }
    }
    async registrarNotificacion(datos) {
        try {
            await this.db.query(`
        IF EXISTS (SELECT * FROM sys.tables WHERE name = 'p_Notificaciones_Enviadas')
        BEGIN
          INSERT INTO p_Notificaciones_Enviadas (idUsuario, carnet, correo, tipo, asunto, idEntidad, estado, error, fechaEnvio)
          VALUES (@idUsuario, @carnet, @correo, @tipo, @asunto, @idEntidad, @estado, @error, GETDATE())
        END
      `, {
                idUsuario: datos.idUsuario || null,
                carnet: datos.carnet || null,
                correo: datos.correo,
                tipo: datos.tipo,
                asunto: datos.asunto,
                idEntidad: String(datos.idEntidad || ''),
                estado: datos.estado,
                error: datos.error || null,
            });
        }
        catch (err) {
            this.logger.warn('No se pudo liquidar el log de notificación (posiblemente la tabla no existe)');
        }
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = NotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [mailer_1.MailerService,
        database_service_1.DatabaseService])
], NotificationService);
