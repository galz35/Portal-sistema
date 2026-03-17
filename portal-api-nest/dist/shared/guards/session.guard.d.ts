import { CanActivate, ExecutionContext } from '@nestjs/common';
import { CookiesService } from '../security/cookies.service';
import { SessionTokenService } from '../security/session-token.service';
import { SesionesService } from '../../modules/sesiones/sesiones.service';
export interface SessionUser {
    idSesionPortal: number;
    idCuentaPortal: number;
}
export declare class SessionGuard implements CanActivate {
    private readonly cookies;
    private readonly tokenService;
    private readonly sesionesService;
    private readonly logger;
    constructor(cookies: CookiesService, tokenService: SessionTokenService, sesionesService: SesionesService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
