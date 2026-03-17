import { DatabaseService } from '../../shared/database/database.service';
export declare class HealthController {
    private readonly db;
    constructor(db: DatabaseService);
    status(): Promise<{
        status: string;
        service: string;
        database: string;
        timestamp: string;
    }>;
}
