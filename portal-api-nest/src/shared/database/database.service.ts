import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mssql from 'mssql';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: mssql.ConnectionPool | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.close();
  }

  private async connect() {
    try {
      const config: mssql.config = {
        server: this.configService.get<string>('MSSQL_HOST', 'localhost'),
        user: this.configService.get<string>('MSSQL_USER', 'sa'),
        password: this.configService.get<string>('MSSQL_PASSWORD', ''),
        database: this.configService.get<string>('MSSQL_DATABASE', ''),
        port: (() => {
          const rawPort = this.configService.get('MSSQL_PORT');
          this.logger.log(`Raw MSSQL_PORT from config: [${rawPort}] (Type: ${typeof rawPort})`);
          const port = Number(rawPort ?? 1433);
          this.logger.log(`Parsed MSSQL_PORT: [${port}]`);
          return port;
        })(),
        options: {
          encrypt: this.configService.get<string>('MSSQL_ENCRYPT', 'true') === 'true',
          trustServerCertificate:
            this.configService.get<string>('MSSQL_TRUST_CERT', 'true') === 'true',
          enableArithAbort: true,
        },
        pool: {
          max: 10,
          min: 0,
          idleTimeoutMillis: 30000,
        },
      };

      this.logger.log(`Connecting to SQL Server at ${config.server}:${config.port}...`);
      this.pool = await new mssql.ConnectionPool(config).connect();
      this.logger.log('SQL Server connected successfully.');
    } catch (error) {
      this.logger.error('SQL Server connection failed:', error);
      throw error;
    }
  }

  private async close() {
    if (this.pool) {
      await this.pool.close();
      this.logger.log('SQL Server connection closed.');
    }
  }

  get Pool(): mssql.ConnectionPool {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call connect() first.');
    }
    return this.pool;
  }

  /**
   * Execute a raw query
   */
  async query<T = any>(sql: string, params: Record<string, any> = {}): Promise<T[]> {
    const request = this.Pool.request();
    
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }

    const result = await request.query(sql);
    return result.recordset;
  }

  /**
   * Execute a stored procedure
   */
  async execute<T = any>(
    procedureName: string,
    params: Record<string, any> = {},
  ): Promise<{ recordset: T[]; output: Record<string, any>; returnValue: any }> {
    const request = this.Pool.request();

    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }

    const result = await request.execute(procedureName);
    return {
      recordset: result.recordset,
      output: result.output,
      returnValue: result.returnValue,
    };
  }
}
