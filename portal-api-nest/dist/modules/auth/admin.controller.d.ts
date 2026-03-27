import { AuthService } from '../auth/auth.service';
import { FastifyRequest } from 'fastify';
import { DatabaseService } from '../../shared/database/database.service';
import * as mssql from 'mssql';
export declare class AdminController {
    private readonly authService;
    private readonly db;
    private readonly ADMIN_CARNET;
    private readonly logger;
    constructor(authService: AuthService, db: DatabaseService);
    private checkAdmin;
    syncUsersBulk(body: {
        usuarios: any[];
    }): Promise<{
        processed: number;
    }>;
    syncNetwork(data: {
        userIds: number[];
        appIds: number[];
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    getUsers(req: FastifyRequest): Promise<{
        items: any[];
    }>;
    getApps(req: FastifyRequest): Promise<{
        items: mssql.IRecordSet<any>;
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
        message: string;
    } | {
        ok: boolean;
        message?: undefined;
    }>;
    updateMetadata(req: FastifyRequest, body: any): Promise<{
        ok: boolean;
        message: string;
    }>;
    createFullUser(req: FastifyRequest, body: any): Promise<any>;
    listDelegations(req: FastifyRequest): Promise<mssql.IRecordSet<any>>;
    createDelegation(req: FastifyRequest, body: any): Promise<{
        ok: boolean;
        id: any;
    }>;
    toggleDelegation(req: FastifyRequest, body: {
        id: number;
        active: boolean;
    }): Promise<{
        ok: boolean;
        message: string;
    } | {
        ok: boolean;
        message?: undefined;
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
}
