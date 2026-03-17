import { ConfigService } from '@nestjs/config';
import { FastifyReply, FastifyRequest } from 'fastify';
export interface CookiePolicy {
    name: string;
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'Lax' | 'Strict' | 'None';
    domain?: string;
    path: string;
    maxAgeSeconds: number;
}
export declare class CookiesService {
    private readonly config;
    constructor(config: ConfigService);
    accessCookiePolicy(): CookiePolicy;
    refreshCookiePolicy(): CookiePolicy;
    csrfCookiePolicy(): CookiePolicy;
    setCookie(reply: FastifyReply, policy: CookiePolicy, value: string): void;
    clearCookie(reply: FastifyReply, policy: CookiePolicy): void;
    readCookie(request: FastifyRequest, name: string): string | undefined;
    appendSessionCookies(reply: FastifyReply, sid: string, csrfToken: string): void;
    clearSessionCookies(reply: FastifyReply): void;
    clearSiteData(reply: FastifyReply): void;
    private cookieSecure;
    private cookieDomain;
}
