import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  Param,
  UseGuards,
  HttpStatus,
  Logger,
  ParseIntPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { SesionesService } from '../sesiones/sesiones.service';
import { CookiesService } from '../../shared/security/cookies.service';
import { SessionTokenService } from '../../shared/security/session-token.service';
import { CsrfService } from '../../shared/security/csrf.service';
import { RateLimitService } from '../../shared/security/rate-limit.service';
import { AuditLoggerService } from '../../shared/security/audit-logger.service';
import { SessionGuard, SessionUser } from '../../shared/guards/session.guard';
import { CsrfGuard } from '../../shared/guards/csrf.guard';
import { LoginEmpleadoDto, IntrospectDto, EmployeeNamesDto } from './dto/auth.dto';
import { extractClientIp, extractUserAgent } from '../../shared/security/request-metadata';
import { sign } from 'jsonwebtoken';

const SSO_SECRET = 'ClaroSSO_Shared_Secret_2026_!#';

@Controller('api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly sesionesService: SesionesService,
    private readonly cookies: CookiesService,
    private readonly tokenService: SessionTokenService,
    private readonly csrfService: CsrfService,
    private readonly rateLimitService: RateLimitService,
    private readonly auditLogger: AuditLoggerService,
  ) {}

  @Get('health')
  async health() {
    return {
      status: 'OK',
      version: '1.0.8-sync-network',
      timestamp: new Date().toISOString(),
      service: 'Portal CORE API'
    };
  }

  @Post('login-empleado')
  async loginEmpleado(
    @Body() body: LoginEmpleadoDto,
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    try {
      const usuario = body.usuario.trim();
      const clave = body.clave;
      const ip = extractClientIp(req) || '0.0.0.0';
      const ua = extractUserAgent(req) || 'Unknown';

      // 1. RATE LIMITING
      const ipLimit = this.rateLimitService.checkSlidingWindow(`login-ip:${ip}`, 10, 300);
      if (!ipLimit.allowed) {
        await this.auditLogger.registerLoginAttempt(usuario, null, ip, ua, false, 'RATE_LIMIT_IP');
        return reply.status(HttpStatus.TOO_MANY_REQUESTS).send({ ok: false, message: 'Demasiados intentos' });
      }

      // 2. BUSCAR USUARIO
      const user = await this.authService.findLoginUser(usuario);
      if (!user) {
        await this.auditLogger.registerLoginAttempt(usuario, null, ip, ua, false, 'USER_NOT_FOUND');
        return reply.status(HttpStatus.UNAUTHORIZED).send({ ok: false, message: 'Credenciales invalidas' });
      }

      // 3. VERIFICAR BLOQUEO
      const locked = await this.auditLogger.isAccountLocked(user.idCuentaPortal);
      if (user.bloqueado || locked) {
        return reply.status(HttpStatus.FORBIDDEN).send({ ok: false, message: 'Cuenta bloqueada temporalmente' });
      }

      // 4. VALIDAR CLAVE
      const passwordOk = await this.authService.validarClavePortal(user.claveHash, clave);
      if (!passwordOk) {
        const sqlFailedCount = await this.auditLogger.countRecentFailedLogins(usuario, 5);
        if (sqlFailedCount >= 9) await this.auditLogger.activateAccountLock(user.idCuentaPortal, 'Intentos fallidos', 15);
        await this.auditLogger.registerLoginAttempt(usuario, user.idCuentaPortal, ip, ua, false, 'INVALID_PASSWORD');
        return reply.status(HttpStatus.UNAUTHORIZED).send({ ok: false, message: 'Credenciales invalidas' });
      }

      // 5. CREAR SESIÓN Y COOKIES
      const sid = this.tokenService.generarSid();
      const sidHash = this.tokenService.hashToken(sid);
      const sesion = await this.sesionesService.crearConSidHash(user.idCuentaPortal, sidHash);
      if (!sesion) {
        return reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ ok: false, message: 'Error creando sesion' });
      }
      
      // CSRF Protection
      const csrfToken = this.csrfService.generarCsrfToken();
      const csrfHash = this.csrfService.hashCsrfToken(csrfToken);
      await this.sesionesService.crearCsrfToken(sesion.idSesionPortal, csrfHash);

      this.cookies.appendSessionCookies(reply, sid, csrfToken);
      await this.auditLogger.registerLoginAttempt(usuario, user.idCuentaPortal, ip, ua, true, null);

      // Si hay returnUrl, generamos un ticket SSO para facilitar el login directo
      let ticket: string | undefined;
      if (body.returnUrl && !user.mustChangePassword) {
        const fullUser = await this.authService.getUser(user.idCuentaPortal);
        if (fullUser) {
          const payload = {
            sub: fullUser.idCuentaPortal,
            username: fullUser.usuario,
            carnet: fullUser.carnet,
            name: fullUser.nombre,
            correo: fullUser.correo,
            apps: fullUser.apps,
            permisos: fullUser.permisos,
            type: 'SSO_PORTAL',
            iat: Math.floor(Date.now() / 1000),
          };
          ticket = sign(payload, SSO_SECRET, { expiresIn: '10m' });
          this.logger.log(`🎫 SSO Auto-Ticket generado para redirect a: ${body.returnUrl}`);
        }
      }

      return reply.status(HttpStatus.OK).send({
        ok: true,
        usuario: user.usuario,
        nombre: user.nombre,
        mustChangePassword: user.mustChangePassword,
        ticket, // Enviamos el ticket si se generó
      });
    } catch (err: any) {
      this.logger.error(`CRITICAL LOGIN ERROR: ${err.message}`, err.stack);
      return reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send({ 
        ok: false, 
        message: 'Fallo interno en el proceso de autenticación',
        detail: err.message
      });
    }
  }

  @Get('session-state')
  async sessionState(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const sid = this.cookies.readCookie(request, this.cookies.accessCookiePolicy().name);
    if (!sid) return reply.status(HttpStatus.OK).send({ authenticated: false });

    const sidHash = this.tokenService.hashToken(sid);
    const estado = await this.sesionesService.resolverPorSidHash(sidHash);

    if (!estado?.autenticado || !estado.idCuentaPortal) {
      return reply.status(HttpStatus.OK).send({ authenticated: false });
    }

    const mustChangePassword = await this.authService.getMustChangePassword(estado.idCuentaPortal);

    return reply.status(HttpStatus.OK).send({
      authenticated: true,
      idSesionPortal: estado.idSesionPortal,
      idCuentaPortal: estado.idCuentaPortal,
      mustChangePassword,
    });
  }

  @Post('change-password')
  @UseGuards(SessionGuard)
  async changePassword(@Req() req: FastifyRequest, @Body() body: any) {
    const session = (req as any).sessionUser as SessionUser;
    
    // Validamos que se envíe la nueva clave
    if (!body.nuevaClave || body.nuevaClave.length < 6) {
      throw new UnauthorizedException('La contraseña debe tener al menos 6 caracteres.');
    }

    // Ejecutamos el cambio con Hashing Argon2
    await this.authService.setPassword(session.idCuentaPortal, body.nuevaClave, false);
    
    // Registramos en auditoría el cambio de importancia alta
    const ip = extractClientIp(req) || '0.0.0.0';
    await this.auditLogger.registerLoginAttempt('SYSTEM', session.idCuentaPortal, ip, 'SYSTEM', true, 'PASSWORD_CHANGED_BY_USER');
    
    return { ok: true, message: 'Contraseña actualizada con éxito' };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  async me(@Req() request: FastifyRequest) {
    const session = (request as any).sessionUser as SessionUser;
    const user = await this.authService.getUser(session.idCuentaPortal);
    if (!user) throw new UnauthorizedException();
    return { ok: true, ...user };
  }

  @Post('logout')
  @UseGuards(SessionGuard)
  async logout(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const session = (request as any).sessionUser as SessionUser;
    await this.sesionesService.revocarPorId(session.idSesionPortal);
    this.cookies.clearSessionCookies(reply);
    return reply.status(HttpStatus.OK).send({ ok: true });
  }

  @Post('introspect')
  async introspect(@Body() body: IntrospectDto, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const sid = this.cookies.readCookie(request, this.cookies.accessCookiePolicy().name);
    if (!sid) return reply.status(HttpStatus.UNAUTHORIZED).send({ authenticated: false });

    const sidHash = this.tokenService.hashToken(sid);
    const estado = await this.sesionesService.resolverPorSidHash(sidHash);
    if (!estado?.autenticado || !estado.idCuentaPortal) {
      return reply.status(HttpStatus.UNAUTHORIZED).send({ authenticated: false });
    }

    const user = await this.authService.getUser(estado.idCuentaPortal);
    return reply.status(HttpStatus.OK).send({ authenticated: !!user, identity: user });
  }

  @Post('employees/names')
  @UseGuards(SessionGuard)
  async employeeNames(@Body() body: EmployeeNamesDto) {
    const items = await this.authService.listEmployeeNames(body.idsPersona ?? []);
    return { items };
  }

  @Get('employees/:id/profile')
  @UseGuards(SessionGuard)
  async employeeProfile(@Param('id', ParseIntPipe) id: number) {
    return this.authService.getEmployeeProfile(id);
  }
}
