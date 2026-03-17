import { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mssql from 'mssql';
export declare class DatabaseService implements OnModuleInit, OnModuleDestroy {
    private readonly configService;
    private readonly logger;
    private pool;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private connect;
    private close;
    get Pool(): mssql.ConnectionPool;
    query<T = any>(sql: string, params?: Record<string, any>): Promise<T[]>;
    execute<T = any>(procedureName: string, params?: Record<string, any>): Promise<{
        recordset: T[];
        output: Record<string, any>;
        returnValue: any;
    }>;
}
