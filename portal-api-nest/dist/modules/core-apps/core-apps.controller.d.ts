import { FastifyRequest } from 'fastify';
import { CoreAppsService } from './core-apps.service';
export declare class CoreAppsController {
    private readonly service;
    constructor(service: CoreAppsService);
    getApps(request: FastifyRequest): Promise<{
        items: any[];
    }>;
}
