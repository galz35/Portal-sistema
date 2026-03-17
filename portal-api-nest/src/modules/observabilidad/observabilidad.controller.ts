import { Controller, Get, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../../shared/guards/session.guard';
import { AuthService } from '../auth/auth.service';

@Controller('api/observabilidad')
export class ObservabilidadController {
  constructor(private readonly authService: AuthService) {}

  @Get('snapshot')
  @UseGuards(SessionGuard)
  async snapshot() {
    return this.authService.getObservabilitySnapshot();
  }
}
