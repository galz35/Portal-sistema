import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../../shared/database/database.service';

@Controller('api/health')
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async status() {
    let dbStatus = 'disconnected';
    try {
      if (this.db.Pool.connected) {
        await this.db.Pool.request().query('SELECT 1');
        dbStatus = 'connected';
      }
    } catch {
      dbStatus = 'error';
    }

    return {
      status: 'ok',
      service: 'portal-api-nest',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    };
  }
}
