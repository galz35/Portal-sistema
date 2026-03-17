import { Controller, Post, UseGuards, Res, HttpStatus } from '@nestjs/common';
import { SessionGuard, SessionUser } from '../../shared/guards/session.guard';
import { FastifyReply, FastifyRequest } from 'fastify';
import { sign } from 'jsonwebtoken';
import { AuthService } from './auth.service';
import { Req } from '@nestjs/common';

@Controller('api/sso')
export class SsoController {
  // Secreto compartido para firma de tickets SSO entre sistemas
  private readonly SSO_SECRET = 'ClaroSSO_Shared_Secret_2026_!#';

  constructor(private readonly authService: AuthService) {}

  @Post('ticket')
  @UseGuards(SessionGuard)
  async getSsoTicket(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    const session = (req as any).sessionUser as SessionUser;
    
    const user = await this.authService.getUser(session.idCuentaPortal);
    if (!user) {
      return reply.status(HttpStatus.UNAUTHORIZED).send({ ok: false, message: 'Sesión no válida' });
    }

    const payload = {
      sub: user.idCuentaPortal,
      username: user.usuario,
      carnet: user.carnet,
      name: user.nombre,
      correo: user.correo,
      apps: user.apps,
      permisos: user.permisos,
      type: 'SSO_PORTAL',
      ip: req.ip,
      ua: req.headers['user-agent'],
      iat: Math.floor(Date.now() / 1000),
    };

    const ticket = sign(payload, this.SSO_SECRET, { expiresIn: '5m' });
    console.log(`🎫 SSO Ticket for ${user.usuario}. IP Bind: ${req.ip} | UA: ${req.headers['user-agent']?.slice(0, 30)}...`);

    return reply.status(HttpStatus.OK).send({
      ok: true,
      ticket,
    });
  }
}
