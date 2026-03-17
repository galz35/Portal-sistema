import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CookiesService } from './cookies.service';
import { SessionTokenService } from './session-token.service';
import { CsrfService } from './csrf.service';
import { RateLimitService } from './rate-limit.service';
import { AuditLoggerService } from './audit-logger.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    CookiesService,
    SessionTokenService,
    CsrfService,
    RateLimitService,
    AuditLoggerService,
  ],
  exports: [
    CookiesService,
    SessionTokenService,
    CsrfService,
    RateLimitService,
    AuditLoggerService,
  ],
})
export class SecurityModule {}
