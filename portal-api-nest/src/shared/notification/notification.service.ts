import { Injectable, Logger, Optional } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @Optional() private readonly mailerService: MailerService,
    private readonly db: DatabaseService,
  ) {}

  async sendEmail(
    to: string,
    subject: string,
    template: string,
    context: Record<string, any>,
    meta?: { idUsuario?: number; carnet?: string; idEntidad?: string },
  ) {
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
    } catch (error: any) {
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

  private async registrarNotificacion(datos: any) {
    try {
      // Intentamos insertar en la tabla de auditoría si existe
      await this.db.query(
        `
        IF EXISTS (SELECT * FROM sys.tables WHERE name = 'p_Notificaciones_Enviadas')
        BEGIN
          INSERT INTO p_Notificaciones_Enviadas (idUsuario, carnet, correo, tipo, asunto, idEntidad, estado, error, fechaEnvio)
          VALUES (@idUsuario, @carnet, @correo, @tipo, @asunto, @idEntidad, @estado, @error, GETDATE())
        END
      `,
        {
          idUsuario: datos.idUsuario || null,
          carnet: datos.carnet || null,
          correo: datos.correo,
          tipo: datos.tipo,
          asunto: datos.asunto,
          idEntidad: String(datos.idEntidad || ''),
          estado: datos.estado,
          error: datos.error || null,
        },
      );
    } catch (err) {
      this.logger.warn('No se pudo liquidar el log de notificación (posiblemente la tabla no existe)');
    }
  }
}
