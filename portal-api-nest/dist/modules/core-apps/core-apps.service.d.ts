import { AuthService } from '../auth/auth.service';
export declare class CoreAppsService {
    private readonly authService;
    constructor(authService: AuthService);
    listApps(idCuentaPortal: number): Promise<any[]>;
}
