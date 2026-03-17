import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuditLoggerService {
  private readonly logger = new Logger(AuditLoggerService.name);

  constructor(private readonly db: DatabaseService) {}

  async registerLoginAttempt(
    usuarioIntentado: string,
    idCuentaPortal: number | null | undefined,
    ip: string | null | undefined,
    userAgent: string | null | undefined,
    exitoso: boolean,
    motivo: string | null | undefined,
  ): Promise<void> {
    try {
      const request = this.db.Pool.request();
      request.input('UsuarioIntentado', usuarioIntentado);
      request.input('IdCuentaPortal', idCuentaPortal);
      request.input('Ip', ip);
      request.input('UserAgent', userAgent?.slice(0, 512));
      request.input('Exitoso', exitoso);
      request.input('Motivo', motivo);
      await request.execute('dbo.spSeg_IntentoLogin_Registrar');
    } catch (err) {
      this.logger.warn(`Audit login attempt failed: ${err}`);
    }
  }

  async countRecentFailedLogins(usuarioIntentado: string, minutosVentana: number): Promise<number> {
    try {
      const request = this.db.Pool.request();
      request.input('UsuarioIntentado', usuarioIntentado);
      request.input('MinutosVentana', minutosVentana);
      const result = await request.execute('dbo.spSeg_IntentoLogin_ContarVentana');
      return result.recordset?.[0]?.TotalIntentos ?? 0;
    } catch {
      return 0;
    }
  }

  async isAccountLocked(idCuentaPortal: number): Promise<boolean> {
    try {
      const request = this.db.Pool.request();
      request.input('IdCuentaPortal', idCuentaPortal);
      const result = await request.execute('dbo.spSeg_BloqueoCuenta_Validar');
      return (result.recordset?.length ?? 0) > 0;
    } catch {
      return false;
    }
  }

  async activateAccountLock(
    idCuentaPortal: number,
    motivo: string,
    minutosBloqueo: number,
  ): Promise<void> {
    try {
      const fechaFin = new Date(Date.now() + minutosBloqueo * 60 * 1000);
      const request = this.db.Pool.request();
      request.input('IdCuentaPortal', idCuentaPortal);
      request.input('Motivo', motivo);
      request.input('FechaFin', fechaFin);
      request.input('IdCuentaPortalOrigen', null);
      await request.execute('dbo.spSeg_BloqueoCuenta_Activar');
    } catch (err) {
      this.logger.warn(`Activate account lock failed: ${err}`);
    }
  }

  async registerSecurityEvent(params: {
    idCuentaPortal?: number | null;
    idSesionPortal?: number | null;
    tipoEvento: string;
    severidad: string;
    modulo?: string | null;
    recurso?: string | null;
    detalle?: string | null;
    ip?: string | null;
    userAgent?: string | null;
    correlationId?: string | null;
  }): Promise<void> {
    try {
      const request = this.db.Pool.request();
      request.input('IdCuentaPortal', params.idCuentaPortal ?? null);
      request.input('IdSesionPortal', params.idSesionPortal ?? null);
      request.input('TipoEvento', params.tipoEvento);
      request.input('Severidad', params.severidad);
      request.input('Modulo', params.modulo ?? null);
      request.input('Recurso', params.recurso ?? null);
      request.input('Detalle', params.detalle ?? null);
      request.input('Ip', params.ip ?? null);
      request.input('UserAgent', params.userAgent?.slice(0, 512) ?? null);
      request.input('CorrelationId', params.correlationId ?? null);
      await request.execute('dbo.spSeg_EventoSeguridad_Registrar');
    } catch (err) {
      this.logger.warn(`Register security event failed: ${err}`);
    }
  }
}
