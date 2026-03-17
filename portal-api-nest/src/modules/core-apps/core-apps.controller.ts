import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { CoreAppsService } from './core-apps.service';
import { SessionGuard, SessionUser } from '../../shared/guards/session.guard';

@Controller('api/core')
export class CoreAppsController {
  constructor(private readonly service: CoreAppsService) {}

  @Get('apps')
  @UseGuards(SessionGuard)
  async getApps(@Req() request: FastifyRequest) {
    const session = (request as any).sessionUser as SessionUser;
    const apps = await this.service.listApps(session.idCuentaPortal);
    return { items: apps };
  }
}
