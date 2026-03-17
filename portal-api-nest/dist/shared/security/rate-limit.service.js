"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitService = void 0;
const common_1 = require("@nestjs/common");
let RateLimitService = class RateLimitService {
    state = new Map();
    checkSlidingWindow(key, maxAttempts, windowSeconds) {
        if (maxAttempts === 0 || windowSeconds === 0) {
            return { allowed: true, retryAfterSeconds: 0 };
        }
        const now = Date.now();
        const windowMs = windowSeconds * 1000;
        let timestamps = this.state.get(key) ?? [];
        timestamps = timestamps.filter((ts) => now - ts < windowMs);
        if (timestamps.length >= maxAttempts) {
            const oldest = timestamps[0];
            const retryAfterMs = windowMs - (now - oldest);
            const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
            this.state.set(key, timestamps);
            return { allowed: false, retryAfterSeconds };
        }
        timestamps.push(now);
        this.state.set(key, timestamps);
        return { allowed: true, retryAfterSeconds: 0 };
    }
};
exports.RateLimitService = RateLimitService;
exports.RateLimitService = RateLimitService = __decorate([
    (0, common_1.Injectable)()
], RateLimitService);
