import { Module } from '@nestjs/common';
import { CoreAppsController } from './core-apps.controller';
import { CoreAppsService } from './core-apps.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [CoreAppsController],
  providers: [CoreAppsService],
})
export class CoreAppsModule {}
