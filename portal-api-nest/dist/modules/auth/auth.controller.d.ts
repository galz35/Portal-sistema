import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { SesionesService } from '../sesiones/sesiones.service';
import { CookiesService } from '../../shared/security/cookies.service';
import { SessionTokenService } from '../../shared/security/session-token.service';
import { CsrfService } from '../../shared/security/csrf.service';
import { RateLimitService } from '../../shared/security/rate-limit.service';
import { AuditLoggerService } from '../../shared/security/audit-logger.service';
import { LoginEmpleadoDto, IntrospectDto, EmployeeNamesDto } from './dto/auth.dto';
export declare class AuthController {
    private readonly authService;
    private readonly sesionesService;
    private readonly cookies;
    private readonly tokenService;
    private readonly csrfService;
    private readonly rateLimitService;
    private readonly auditLogger;
    private readonly logger;
    constructor(authService: AuthService, sesionesService: SesionesService, cookies: CookiesService, tokenService: SessionTokenService, csrfService: CsrfService, rateLimitService: RateLimitService, auditLogger: AuditLoggerService);
    loginEmpleado(body: LoginEmpleadoDto, req: FastifyRequest, reply: FastifyReply): Promise<never>;
    sessionState(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    changePassword(req: FastifyRequest, body: any): Promise<{
        ok: boolean;
        message: string;
    }>;
    me(request: FastifyRequest): Promise<{
        idCuentaPortal: number;
        idPersona: number;
        usuario: string;
        nombre: string;
        correo: string;
        carnet: string;
        esInterno: boolean;
        apps: string[];
        permisos: string[];
        ok: boolean;
    }>;
    logout(request: FastifyRequest, reply: FastifyReply): Promise<never>;
    introspect(body: IntrospectDto, request: FastifyRequest, reply: FastifyReply): Promise<never>;
    employeeNames(body: EmployeeNamesDto): Promise<{
        items: import("./auth.service").EmployeeNameRecord[];
    }>;
    employeeProfile(id: number): Promise<import("./auth.service").EmployeePortalProfile | null>;
}
