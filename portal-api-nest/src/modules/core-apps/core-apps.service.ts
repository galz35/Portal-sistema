import { Injectable } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class CoreAppsService {
  constructor(private readonly authService: AuthService) {}

  async listApps(idCuentaPortal: number) {
    return this.authService.listUserAppsVerbose(idCuentaPortal);
  }
}
