import { CanActivate, ExecutionContext } from '@nestjs/common';
import { CsrfService } from '../security/csrf.service';
import { SessionTokenService } from '../security/session-token.service';
import { SesionesService } from '../../modules/sesiones/sesiones.service';
export declare class CsrfGuard implements CanActivate {
    private readonly csrfService;
    private readonly tokenService;
    private readonly sesionesService;
    constructor(csrfService: CsrfService, tokenService: SessionTokenService, sesionesService: SesionesService);
    canActivate(context: ExecutionContext): Promise<boolean>;
}
