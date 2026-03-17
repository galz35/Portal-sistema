import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';

@Injectable()
export class SessionTokenService {
  generarSid(): string {
    return `sid_${randomUUID()}_${randomUUID()}`;
  }

  hashToken(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
