export interface RateLimitDecision {
    allowed: boolean;
    retryAfterSeconds: number;
}
export declare class RateLimitService {
    private readonly state;
    checkSlidingWindow(key: string, maxAttempts: number, windowSeconds: number): RateLimitDecision;
}
