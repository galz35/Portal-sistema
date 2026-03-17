import { DatabaseService } from '../database/database.service';
export declare class AuditLoggerService {
    private readonly db;
    private readonly logger;
    constructor(db: DatabaseService);
    registerLoginAttempt(usuarioIntentado: string, idCuentaPortal: number | null | undefined, ip: string | null | undefined, userAgent: string | null | undefined, exitoso: boolean, motivo: string | null | undefined): Promise<void>;
    countRecentFailedLogins(usuarioIntentado: string, minutosVentana: number): Promise<number>;
    isAccountLocked(idCuentaPortal: number): Promise<boolean>;
    activateAccountLock(idCuentaPortal: number, motivo: string, minutosBloqueo: number): Promise<void>;
    registerSecurityEvent(params: {
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
    }): Promise<void>;
}
