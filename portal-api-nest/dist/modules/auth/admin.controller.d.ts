import { AuthService } from '../auth/auth.service';
import { FastifyRequest } from 'fastify';
import { DatabaseService } from '../../shared/database/database.service';
export declare class AdminController {
    private readonly authService;
    private readonly db;
    private readonly ADMIN_CARNET;
    private readonly logger;
    constructor(authService: AuthService, db: DatabaseService);
    private checkAdmin;
    getUsers(req: FastifyRequest): Promise<{
        items: any[];
    }>;
    getApps(req: FastifyRequest): Promise<{
        items: import("mssql").IRecordSet<any>;
    }>;
    createApp(req: FastifyRequest, body: any): Promise<{
        ok: boolean;
    }>;
    updateApp(req: FastifyRequest, id: number, body: any): Promise<{
        ok: boolean;
    }>;
    deleteApp(req: FastifyRequest, id: number): Promise<{
        ok: boolean;
    }>;
    setPermissions(req: FastifyRequest, body: any): Promise<{
        ok: boolean;
    }>;
    resetPassword(req: FastifyRequest, body: any): Promise<{
        ok: boolean;
    }>;
    toggleUser(req: FastifyRequest, body: {
        idCuentaPortal: number;
        activo: boolean;
    }): Promise<{
        ok: boolean;
    }>;
    createUser(req: FastifyRequest, body: {
        nombres: string;
        primerApellido: string;
        segundoApellido?: string;
        correo: string;
        carnet: string;
        usuario?: string;
        clave?: string;
    }): Promise<{
        ok: boolean;
        message: string;
        idCuentaPortal?: undefined;
    } | {
        ok: boolean;
        idCuentaPortal: any;
        message: string;
    }>;
    importUsers(req: FastifyRequest, body: {
        usuarios: Array<{
            nombres: string;
            primerApellido: string;
            segundoApellido?: string;
            correo: string;
            carnet: string;
        }>;
        claveDefecto?: string;
    }): Promise<{
        ok: boolean;
        creados: number;
        omitidos: number;
        detalle: {
            correo: string;
            ok: boolean;
            message: string;
        }[];
    }>;
    syncUsersBulk(req: FastifyRequest, body: {
        usuarios: Array<{
            carnet: string;
            nombre: string;
            correo: string;
            es_interno: string;
            activo: string | number | boolean;
            cargo?: string;
            departamento?: string;
            gerencia?: string;
            subgerencia?: string;
            area?: string;
            jefeCarnet?: string;
            jefeNombre?: string;
            jefeCorreo?: string;
            telefono?: string;
            genero?: string;
            fechaIngreso?: string;
            idOrg?: string;
            orgDepartamento?: string;
            orgGerencia?: string;
        }>;
        claveDefecto?: string;
    }): Promise<{
        ok: boolean;
        procesados: number;
        detalle: {
            carnet: string;
            action: string;
            syncDetails: any;
            error?: string;
        }[];
    }>;
}
