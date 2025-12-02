import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string;
}

/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or a database-backed solution
 */
export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor(private options: RateLimitOptions) {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.resetAt < now) {
          this.store.delete(key);
        }
      }
    }, 60000);
  }

  middleware = (req: Request, res: Response, next: NextFunction): void => {
    // Use IP address as the key (in production, consider using a more sophisticated key)
    const key = this.getClientKey(req);
    const now = Date.now();

    let entry = this.store.get(key);

    // Create new entry if it doesn't exist or has expired
    if (!entry || entry.resetAt < now) {
      entry = {
        count: 0,
        resetAt: now + this.options.windowMs,
      };
      this.store.set(key, entry);
    }

    // Increment request count
    entry.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', this.options.maxRequests.toString());
    res.setHeader(
      'X-RateLimit-Remaining',
      Math.max(0, this.options.maxRequests - entry.count).toString(),
    );
    res.setHeader('X-RateLimit-Reset', new Date(entry.resetAt).toISOString());

    // Check if limit exceeded
    if (entry.count > this.options.maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      res.status(429).json({
        error:
          this.options.message || 'Too many requests, please try again later.',
        retryAfter,
      });
      return;
    }

    next();
  };

  private getClientKey(req: Request): string {
    // Use req.ip which respects Express's trust proxy setting
    // This prevents IP spoofing via X-Forwarded-For header when trust proxy is properly configured
    // If trust proxy is not set, req.ip returns the direct connection IP (safe default)
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return `rate-limit:${ip}`;
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

/**
 * Factory function to create rate limiting middleware
 */
export function createRateLimiter(options: RateLimitOptions) {
  const limiter = new RateLimiter(options);
  return limiter.middleware;
}
