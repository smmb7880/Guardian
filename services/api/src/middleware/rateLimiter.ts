import { AppError } from './errorHandler';

export interface RateLimitEntry {
  count: number;
  resetAt: number; // Unix timestamp ms
}

export class ApiRateLimiter {
  private static requestCounts: Map<string, RateLimitEntry> = new Map();
  private static windowMs = 60000; // 1 minute window
  private static maxRequests = 100; // 100 requests per minute limit

  /**
   * Check rate limit for a client key (e.g. IP address or userId).
   * Throws 429 TOO_MANY_REQUESTS if limit is exceeded.
   */
  public static checkRateLimit(clientKey: string): { remaining: number; resetAt: number } {
    const now = Date.now();
    let entry = this.requestCounts.get(clientKey);

    if (!entry || now > entry.resetAt) {
      entry = { count: 1, resetAt: now + this.windowMs };
      this.requestCounts.set(clientKey, entry);
      return { remaining: this.maxRequests - 1, resetAt: entry.resetAt };
    }

    entry.count++;

    if (entry.count > this.maxRequests) {
      throw new AppError(429, 'TOO_MANY_REQUESTS', 'API rate limit exceeded. Please try again later.');
    }

    return { remaining: this.maxRequests - entry.count, resetAt: entry.resetAt };
  }

  /**
   * Clear rate limit map for testing.
   */
  public static clearForTest(): void {
    this.requestCounts.clear();
  }
}
