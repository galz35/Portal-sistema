import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './modules/auth/auth.module';
import { CoreAppsModule } from './modules/core-apps/core-apps.module';
import { HealthModule } from './modules/health/health.module';
import { DatabaseModule } from './shared/database/database.module';
import { SecurityModule } from './shared/security/security.module';
import { SesionesModule } from './modules/sesiones/sesiones.module';
import { ObservabilidadModule } from './modules/observabilidad/observabilidad.module';
import { NotificationModule } from './shared/notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    HealthModule,
    SecurityModule,
    SesionesModule,
    AuthModule,
    CoreAppsModule,
    ObservabilidadModule,
    NotificationModule,
  ],
})
export class AppModule {}
