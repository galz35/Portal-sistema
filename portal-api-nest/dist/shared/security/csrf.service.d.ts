import { SessionTokenService } from './session-token.service';
import { CookiesService } from './cookies.service';
import { FastifyRequest } from 'fastify';
export declare class CsrfService {
    private readonly tokenService;
    private readonly cookiesService;
    constructor(tokenService: SessionTokenService, cookiesService: CookiesService);
    generarCsrfToken(): string;
    hashCsrfToken(token: string): string;
    validarCsrfRequest(request: FastifyRequest): string | null;
}
