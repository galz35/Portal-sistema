"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CookiesService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let CookiesService = class CookiesService {
    config;
    constructor(config) {
        this.config = config;
    }
    accessCookiePolicy() {
        return {
            name: 'portal_sid',
            secure: this.cookieSecure(),
            httpOnly: true,
            sameSite: 'Lax',
            domain: this.cookieDomain('PORTAL_COOKIE_DOMAIN'),
            path: '/',
            maxAgeSeconds: 30 * 24 * 60 * 60,
        };
    }
    refreshCookiePolicy() {
        return {
            name: 'portal_refresh',
            secure: this.cookieSecure(),
            httpOnly: true,
            sameSite: 'Lax',
            domain: this.cookieDomain('PORTAL_COOKIE_DOMAIN'),
            path: '/',
            maxAgeSeconds: 30 * 24 * 60 * 60,
        };
    }
    csrfCookiePolicy() {
        return {
            name: 'portal_csrf',
            secure: this.cookieSecure(),
            httpOnly: false,
            sameSite: 'Lax',
            domain: this.cookieDomain('PORTAL_COOKIE_DOMAIN'),
            path: '/',
            maxAgeSeconds: 24 * 60 * 60,
        };
    }
    setCookie(reply, policy, value) {
        reply.setCookie(policy.name, value, {
            path: policy.path,
            maxAge: policy.maxAgeSeconds,
            sameSite: policy.sameSite.toLowerCase(),
            httpOnly: policy.httpOnly,
            secure: policy.secure,
            domain: policy.domain,
        });
    }
    clearCookie(reply, policy) {
        reply.clearCookie(policy.name, {
            path: policy.path,
            sameSite: policy.sameSite.toLowerCase(),
            httpOnly: policy.httpOnly,
            secure: policy.secure,
            domain: policy.domain,
        });
    }
    readCookie(request, name) {
        return request.cookies?.[name];
    }
    appendSessionCookies(reply, sid, csrfToken) {
        this.setCookie(reply, this.accessCookiePolicy(), sid);
        this.setCookie(reply, this.refreshCookiePolicy(), sid);
        this.setCookie(reply, this.csrfCookiePolicy(), csrfToken);
    }
    clearSessionCookies(reply) {
        this.clearCookie(reply, this.accessCookiePolicy());
        this.clearCookie(reply, this.refreshCookiePolicy());
        this.clearCookie(reply, this.csrfCookiePolicy());
    }
    clearSiteData(reply) {
        reply.header('clear-site-data', '"cache", "cookies", "storage"');
    }
    cookieSecure() {
        const val = this.config.get('COOKIE_SECURE', 'false');
        return ['1', 'true', 'yes', 'on'].includes(val.toLowerCase());
    }
    cookieDomain(envKey) {
        const raw = this.config.get(envKey, '');
        if (!raw)
            return undefined;
        const cleaned = raw.replace(/^\./, '');
        return cleaned ? `.${cleaned}` : undefined;
    }
};
exports.CookiesService = CookiesService;
exports.CookiesService = CookiesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CookiesService);
