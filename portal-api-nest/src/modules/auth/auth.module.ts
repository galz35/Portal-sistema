import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { SsoController } from './sso.controller';
import { AdminController } from './admin.controller';
import { AuthService } from './auth.service';
import { SesionesModule } from '../sesiones/sesiones.module';

@Module({
  imports: [SesionesModule],
  controllers: [AuthController, SsoController, AdminController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
