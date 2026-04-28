import { Body, Controller, Get, Headers, Post, Query } from '@nestjs/common';

import { IntegracionService } from './integracion.service';

@Controller('api/integracion')
export class IntegracionController {
  constructor(private readonly integracionService: IntegracionService) {}

  @Get('emp2024/empleados')
  async empleadosGet(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query('carnet') carnet?: string,
    @Query('correo') correo?: string,
    @Query('limit') limit?: string,
  ) {
    this.integracionService.validateIntegrationAuth(headers);
    const data = await this.integracionService.listarEmpleados({
      carnet,
      correo,
      limit: limit ? Number(limit) : undefined,
    });
    return {
      success: true,
      data,
      statusCode: 200,
      timestamp: new Date().toISOString(),
      path: '',
    };
  }

  @Post('emp2024/empleados')
  async empleadosPost(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: Record<string, any>,
  ) {
    this.integracionService.validateIntegrationAuth(headers);
    const data = await this.integracionService.upsertEmpleado(body);
    return {
      success: true,
      data,
      statusCode: 200,
      timestamp: new Date().toISOString(),
      path: '',
    };
  }
}

