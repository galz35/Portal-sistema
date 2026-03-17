"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractClientIp = extractClientIp;
exports.extractUserAgent = extractUserAgent;
exports.extractCorrelationId = extractCorrelationId;
function extractClientIp(request) {
    const headers = request.headers;
    const clientIp = extractSingleIp(headers['x-client-ip']);
    if (clientIp)
        return clientIp;
    const xff = headers['x-forwarded-for'];
    if (xff) {
        const first = xff.split(',')[0]?.trim();
        if (first)
            return normalizeIp(first);
    }
    const realIp = extractSingleIp(headers['x-real-ip']);
    if (realIp)
        return realIp;
    return request.ip;
}
function extractUserAgent(request) {
    const ua = request.headers['user-agent'];
    if (!ua)
        return undefined;
    return ua.slice(0, 512).trim() || undefined;
}
function extractCorrelationId(request) {
    const raw = request.headers['x-correlation-id'] ??
        request.headers['x-request-id'];
    if (!raw)
        return undefined;
    const sanitized = raw
        .slice(0, 128)
        .replace(/[^a-zA-Z0-9._:\-]/g, '')
        .trim();
    return sanitized || undefined;
}
function extractSingleIp(value) {
    if (!value)
        return undefined;
    return normalizeIp(value.trim());
}
function normalizeIp(value) {
    const trimmed = value.trim().replace(/"/g, '');
    if (!trimmed || trimmed === '_' || trimmed.toLowerCase() === 'unknown')
        return undefined;
    if (trimmed.startsWith('[')) {
        const inner = trimmed.slice(1).split(']')[0];
        return inner || undefined;
    }
    const colonCount = (trimmed.match(/:/g) || []).length;
    if (colonCount === 1) {
        return trimmed.split(':')[0] || undefined;
    }
    return trimmed || undefined;
}
