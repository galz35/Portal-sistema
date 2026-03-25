import { DatabaseService } from '../../shared/database/database.service';
export interface LoginLookup {
    idCuentaPortal: number;
    usuario: string;
    nombre: string;
    correo: string;
    activo: boolean;
    bloqueado: boolean;
    claveHash: string;
}
export interface AuthenticatedUser {
    idCuentaPortal: number;
    idPersona: number;
    usuario: string;
    nombre: string;
    correo: string;
    carnet: string;
    esInterno: boolean;
    apps: string[];
    permisos: string[];
}
export interface EmployeePortalProfile {
    idPersona: number;
    nombre: string;
    correo: string | null;
    cargo: string | null;
    empresa: string | null;
    departamento: string | null;
    pais: string | null;
    jefe: string | null;
}
export interface EmployeeNameRecord {
    idPersona: number;
    nombre: string;
}
export declare class AuthService {
    private readonly db;
    private readonly logger;
    private readonly appRouteOverrides;
    private readonly submoduleSyncTargets;
    constructor(db: DatabaseService);
    private normalizeAppRoute;
    findLoginUser(usuario: string): Promise<LoginLookup | null>;
    validarClavePortal(claveHash: string, clavePlana: string): Promise<boolean>;
    getUser(idCuentaPortal: number): Promise<AuthenticatedUser | null>;
    listUserApps(idCuentaPortal: number): Promise<string[]>;
    listUserAppsVerbose(idCuentaPortal: number): Promise<any[]>;
    listUserPermissions(idCuentaPortal: number): Promise<string[]>;
    getEmployeeProfile(idPersona: number): Promise<EmployeePortalProfile | null>;
    listEmployeeNames(idsPersona: number[]): Promise<EmployeeNameRecord[]>;
    getObservabilitySnapshot(): Promise<any>;
    listAllApps(): Promise<import("mssql").IRecordSet<any>>;
    createApplication(data: {
        codigo: string;
        nombre: string;
        ruta: string;
        icono: string;
        descripcion?: string;
    }): Promise<{
        ok: boolean;
    }>;
    updateApplication(id: number, data: {
        codigo: string;
        nombre: string;
        ruta: string;
        icono: string;
        descripcion?: string;
    }): Promise<{
        ok: boolean;
    }>;
    deleteApplication(id: number): Promise<{
        ok: boolean;
    }>;
    toggleAppMapping(idCuentaPortal: number, idAplicacion: number, activo: boolean): Promise<{
        ok: boolean;
    }>;
    setPassword(idCuentaPortal: number, nuevaClave: string): Promise<{
        ok: boolean;
    }>;
    listAllUsers(): Promise<any[]>;
    syncToSubmodules(userPayload: any): Promise<any[]>;
}
