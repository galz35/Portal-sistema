import { Injectable } from '@nestjs/common';

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

@Injectable()
export class RateLimitService {
  private readonly state = new Map<string, number[]>();

  checkSlidingWindow(key: string, maxAttempts: number, windowSeconds: number): RateLimitDecision {
    if (maxAttempts === 0 || windowSeconds === 0) {
      return { allowed: true, retryAfterSeconds: 0 };
    }

    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    let timestamps = this.state.get(key) ?? [];

    // Purgar entradas fuera de la ventana
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
}
