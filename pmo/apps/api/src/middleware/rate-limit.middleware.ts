/**
 * Rate Limiting Middleware
 *
 * Provides request rate limiting to prevent abuse and ensure fair usage.
 *
 * Features:
 * - Configurable time windows and request limits
 * - In-memory storage (suitable for single-instance deployments)
 * - Standard rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
 * - Automatic cleanup of expired entries
 * - IP-based client identification
 *
 * Response Headers:
 * - X-RateLimit-Limit: Maximum requests allowed in window
 * - X-RateLimit-Remaining: Requests remaining in current window
 * - X-RateLimit-Reset: ISO timestamp when the window resets
 * - Retry-After: Seconds until rate limit resets (only on 429 responses)
 *
 * Production Considerations:
 * - For multi-instance deployments, use Redis-backed rate limiting
 * - See tenant-rate-limit.middleware.ts for tenant-aware rate limiting
 * - Consider using a CDN or API gateway for edge rate limiting
 *
 * @module middleware/rate-limit
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Format retry duration in human-readable format.
 * @param seconds - Number of seconds until rate limit resets
 * @returns Human-readable duration string
 */
export function formatRetryDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours !== 1 ? 's' : ''}`;
}

/**
 * Generate a clear, user-friendly rate limit error message.
 * @param retryAfterSeconds - Number of seconds until rate limit resets
 * @param customMessage - Optional custom message prefix
 * @returns Formatted error message with retry information
 */
export function formatRateLimitMessage(
  retryAfterSeconds: number,
  customMessage?: string,
): string {
  const duration = formatRetryDuration(retryAfterSeconds);
  const resetTime = new Date(Date.now() + retryAfterSeconds * 1000);
  // Use 24-hour format for international clarity, with server time note
  const timeString = resetTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  if (customMessage) {
    return `${customMessage} You can retry in ${duration} (at ${timeString} server time).`;
  }
  return `Rate limit exceeded. Please wait ${duration} before retrying (resets at ${timeString} server time).`;
}

/** Internal tracking entry for a single client's request count */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Configuration options for rate limiting.
 */
interface RateLimitOptions {
  /** Time window in milliseconds (e.g., 60000 for 1 minute) */
  windowMs: number;
  /** Maximum requests allowed per window */
  maxRequests: number;
  /** Custom error message for rate limit exceeded */
  message?: string;
}

/**
 * In-memory rate limiter class.
 *
 * Creates a sliding window rate limiter that tracks request counts per client IP.
 * Suitable for single-instance deployments; for clustered environments, use
 * Redis-backed rate limiting instead.
 *
 * @example
 * const limiter = new RateLimiter({
 *   windowMs: 60000,    // 1 minute window
 *   maxRequests: 100,   // 100 requests per window
 *   message: 'Too many requests from this IP'
 * });
 * app.use('/api', limiter.middleware);
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

      const message = formatRateLimitMessage(retryAfter, this.options.message);

      res.status(429).json({
        // Keep 'error' as human-readable message for backward compatibility
        error: message,
        // Machine-readable error code for programmatic handling
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
        retryAfterFormatted: formatRetryDuration(retryAfter),
        resetAt: new Date(entry.resetAt).toISOString(),
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
