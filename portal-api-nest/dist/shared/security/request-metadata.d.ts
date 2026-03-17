import { FastifyRequest } from 'fastify';
export declare function extractClientIp(request: FastifyRequest): string | undefined;
export declare function extractUserAgent(request: FastifyRequest): string | undefined;
export declare function extractCorrelationId(request: FastifyRequest): string | undefined;
