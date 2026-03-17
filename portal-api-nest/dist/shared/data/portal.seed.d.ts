export type PortalUser = {
    idCuentaPortal: number;
    idPersona: number;
    usuario: string;
    clave: string;
    nombre: string;
    correo: string;
    carnet: string;
    esInterno: boolean;
    apps: string[];
    permisos: string[];
};
export type PortalAppRecord = {
    codigo: string;
    nombre: string;
    ruta: string;
    icono: string;
    descripcion: string;
};
export declare const PORTAL_APPS: PortalAppRecord[];
export declare const PORTAL_USERS: PortalUser[];
