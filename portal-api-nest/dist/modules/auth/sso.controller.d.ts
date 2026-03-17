import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
export declare class SsoController {
    private readonly authService;
    private readonly SSO_SECRET;
    constructor(authService: AuthService);
    getSsoTicket(req: FastifyRequest, reply: FastifyReply): Promise<never>;
}
