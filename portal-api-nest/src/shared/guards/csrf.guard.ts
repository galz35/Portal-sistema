import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { CsrfService } from '../security/csrf.service';
import { SessionTokenService } from '../security/session-token.service';
import { SesionesService } from '../../modules/sesiones/sesiones.service';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly csrfService: CsrfService,
    private readonly tokenService: SessionTokenService,
    private readonly sesionesService: SesionesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    const csrfToken = this.csrfService.validarCsrfRequest(request);
    if (!csrfToken) {
      throw new ForbiddenException('CSRF token invalido');
    }

    const sessionUser = (request as any).sessionUser;
    if (sessionUser?.idSesionPortal) {
      const tokenHash = this.tokenService.hashToken(csrfToken);
      const valid = await this.sesionesService.validarCsrfToken(
        sessionUser.idSesionPortal,
        tokenHash,
      );
      if (!valid) {
        throw new ForbiddenException('CSRF token no reconocido');
      }
    }

    return true;
  }
}
