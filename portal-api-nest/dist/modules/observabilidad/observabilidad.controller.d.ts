import { AuthService } from '../auth/auth.service';
export declare class ObservabilidadController {
    private readonly authService;
    constructor(authService: AuthService);
    snapshot(): Promise<any>;
}
