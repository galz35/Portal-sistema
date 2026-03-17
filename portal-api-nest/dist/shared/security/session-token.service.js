"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionTokenService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const crypto_2 = require("crypto");
let SessionTokenService = class SessionTokenService {
    generarSid() {
        return `sid_${(0, crypto_1.randomUUID)()}_${(0, crypto_1.randomUUID)()}`;
    }
    hashToken(value) {
        return (0, crypto_2.createHash)('sha256').update(value).digest('hex');
    }
};
exports.SessionTokenService = SessionTokenService;
exports.SessionTokenService = SessionTokenService = __decorate([
    (0, common_1.Injectable)()
], SessionTokenService);
