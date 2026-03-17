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
export declare class SesionesService {
    private readonly db;
    private readonly logger;
    constructor(db: DatabaseService);
    crearConSidHash(idCuentaPortal: number, sidHash: string): Promise<SesionPortal | null>;
    resolverPorSidHash(sidHash: string): Promise<EstadoSesion | null>;
    rotarSidHash(idSesionPortal: number, sidHashActual: string, nuevoSidHash: string): Promise<boolean>;
    revocarPorId(idSesionPortal: number): Promise<SesionPortal | null>;
    actualizarActividad(idSesionPortal: number): Promise<boolean>;
    crearCsrfToken(idSesionPortal: number, tokenHash: string): Promise<boolean>;
    validarCsrfToken(idSesionPortal: number, tokenHash: string): Promise<boolean>;
    revocarCsrfPorSesion(idSesionPortal: number): Promise<boolean>;
}
