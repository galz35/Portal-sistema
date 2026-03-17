import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { CookiesService } from '../security/cookies.service';
import { SessionTokenService } from '../security/session-token.service';
import { SesionesService } from '../../modules/sesiones/sesiones.service';

export interface SessionUser {
  idSesionPortal: number;
  idCuentaPortal: number;
}

@Injectable()
export class SessionGuard implements CanActivate {
  private readonly logger = new Logger(SessionGuard.name);

  constructor(
    private readonly cookies: CookiesService,
    private readonly tokenService: SessionTokenService,
    private readonly sesionesService: SesionesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    const sid = this.cookies.readCookie(request, this.cookies.accessCookiePolicy().name);
    if (!sid) {
      throw new UnauthorizedException('Sesion no encontrada');
    }

    const sidHash = this.tokenService.hashToken(sid);
    const estado = await this.sesionesService.resolverPorSidHash(sidHash);

    if (!estado || !estado.autenticado || !estado.idCuentaPortal || !estado.idSesionPortal) {
      throw new UnauthorizedException('Sesion invalida o expirada');
    }

    // Attach session user to request
    (request as any).sessionUser = {
      idSesionPortal: estado.idSesionPortal,
      idCuentaPortal: estado.idCuentaPortal,
    } as SessionUser;

    // Update activity (best effort, don't block)
    this.sesionesService.actualizarActividad(estado.idSesionPortal).catch(() => {});

    return true;
  }
}
