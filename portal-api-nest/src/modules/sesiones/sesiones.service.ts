import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../shared/database/database.service';

export interface SesionPortal {
  idSesionPortal: number;
  idCuentaPortal: number;
  estadoSesion: string;
}

export interface EstadoSesion {
  autenticado: boolean;
  idCuentaPortal: number | null;
  idSesionPortal: number | null;
}

@Injectable()
export class SesionesService {
  private readonly logger = new Logger(SesionesService.name);

  constructor(private readonly db: DatabaseService) {}

  async crearConSidHash(idCuentaPortal: number, sidHash: string): Promise<SesionPortal | null> {
    try {
      const fechaExpiracion = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const request = this.db.Pool.request();
      request.input('IdCuentaPortal', idCuentaPortal);
      request.input('SidHash', sidHash);
      request.input('JtiAccessActual', null);
      request.input('JtiRefreshActual', null);
      request.input('IpCreacion', null);
      request.input('UserAgent', 'portal-api-nest');
      request.input('FechaExpiracion', fechaExpiracion);
      const result = await request.execute('dbo.spSeg_Sesion_Crear');

      const idSesionPortal = result.recordset?.[0]?.IdSesionPortal;
      if (!idSesionPortal || idSesionPortal <= 0) return null;

      return {
        idSesionPortal,
        idCuentaPortal,
        estadoSesion: 'ACTIVA',
      };
    } catch (err) {
      this.logger.error(`crearConSidHash failed: ${err}`);
      return null;
    }
  }

  async resolverPorSidHash(sidHash: string): Promise<EstadoSesion | null> {
    try {
      const request = this.db.Pool.request();
      request.input('SidHash', sidHash);
      const result = await request.execute('dbo.spSeg_Sesion_ValidarPorSidHash');

      const row = result.recordset?.[0];
      if (!row) return null;

      return {
        autenticado: !!row.IdSesionPortal,
        idCuentaPortal: row.IdCuentaPortal ?? null,
        idSesionPortal: row.IdSesionPortal ?? null,
      };
    } catch (err) {
      this.logger.error(`resolverPorSidHash failed: ${err}`);
      return null;
    }
  }

  async rotarSidHash(
    idSesionPortal: number,
    sidHashActual: string,
    nuevoSidHash: string,
  ): Promise<boolean> {
    try {
      const request = this.db.Pool.request();
      request.input('IdSesionPortal', idSesionPortal);
      request.input('SidHashActual', sidHashActual);
      request.input('NuevoSidHash', nuevoSidHash);
      const result = await request.execute('dbo.spSeg_Sesion_RotarSidHash');
      return (result.recordset?.[0]?.RegistrosAfectados ?? 0) > 0;
    } catch {
      return false;
    }
  }

  async revocarPorId(idSesionPortal: number): Promise<SesionPortal | null> {
    try {
      const request = this.db.Pool.request();
      request.input('IdSesionPortal', idSesionPortal);
      request.input('MotivoRevocacion', 'logout');
      await request.execute('dbo.spSeg_Sesion_Revocar');
      return { idSesionPortal, idCuentaPortal: 0, estadoSesion: 'REVOCADA' };
    } catch {
      return null;
    }
  }

  async actualizarActividad(idSesionPortal: number): Promise<boolean> {
    try {
      const request = this.db.Pool.request();
      request.input('IdSesionPortal', idSesionPortal);
      await request.execute('dbo.spSeg_Sesion_ActualizarActividad');
      return true;
    } catch {
      return false;
    }
  }

  async crearCsrfToken(idSesionPortal: number, tokenHash: string): Promise<boolean> {
    try {
      const fechaExpiracion = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const request = this.db.Pool.request();
      request.input('IdSesionPortal', idSesionPortal);
      request.input('TokenHash', tokenHash);
      request.input('FechaExpiracion', fechaExpiracion);
      await request.execute('dbo.spSeg_Csrf_Crear');
      return true;
    } catch {
      return false;
    }
  }

  async validarCsrfToken(idSesionPortal: number, tokenHash: string): Promise<boolean> {
    try {
      const request = this.db.Pool.request();
      request.input('IdSesionPortal', idSesionPortal);
      request.input('TokenHash', tokenHash);
      const result = await request.execute('dbo.spSeg_Csrf_Validar');
      return result.recordset?.[0]?.EsValido === true;
    } catch {
      return false;
    }
  }

  async revocarCsrfPorSesion(idSesionPortal: number): Promise<boolean> {
    try {
      const request = this.db.Pool.request();
      request.input('IdSesionPortal', idSesionPortal);
      await request.execute('dbo.spSeg_Csrf_RevocarPorSesion');
      return true;
    } catch {
      return false;
    }
  }
}
