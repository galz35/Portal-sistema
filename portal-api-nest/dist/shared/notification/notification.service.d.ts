import { MailerService } from '@nestjs-modules/mailer';
import { DatabaseService } from '../database/database.service';
export declare class NotificationService {
    private readonly mailerService;
    private readonly db;
    private readonly logger;
    constructor(mailerService: MailerService, db: DatabaseService);
    sendEmail(to: string, subject: string, template: string, context: Record<string, any>, meta?: {
        idUsuario?: number;
        carnet?: string;
        idEntidad?: string;
    }): Promise<void>;
    private registrarNotificacion;
}
