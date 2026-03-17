import { Module } from '@nestjs/common';
import { ObservabilidadController } from './observabilidad.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ObservabilidadController],
})
export class ObservabilidadModule {}
