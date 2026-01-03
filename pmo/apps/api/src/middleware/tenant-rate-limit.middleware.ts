/**
 * Tenant-Aware Rate Limiting Middleware
 *
 * Implements rate limiting that:
 * 1. Limits by tenant (shared across all tenant users)
 * 2. Adjusts limits based on tenant plan
 * 3. Uses Redis for distributed rate limiting
 * 4. Falls back to in-memory when Redis unavailable
 */

import { Request, Response, NextFunction } from 'express';
import { redis, isRedisConnected } from '../cache/redis.client';
import { RATE_LIMITS, type TenantPlan } from '../tenant/tenant.types';
import type { TenantRequest } from '../tenant/tenant.middleware';
import {
  formatRetryDuration,
  formatRateLimitMessage,
} from './rate-limit.middleware';

// In-memory fallback store
const inMemoryStore = new Map<string, { count: number; resetTime: number }>();

// Clean up in-memory store periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of inMemoryStore.entries()) {
    if (value.resetTime < now) {
      inMemoryStore.delete(key);
    }
  }
}, 60000); // Every minute

interface RateLimitOptions {
  windowMs?: number; // Time window in milliseconds
  max?: number; // Max requests per window (overrides plan-based limits)
  keyGenerator?: (req: Request) => string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  message?: string;
  useRedis?: boolean;
}

const DEFAULT_WINDOW_MS = 60000; // 1 minute
const DEFAULT_MESSAGE = 'Too many requests, please try again later.';

/**
 * Generate rate limit key from request.
 */
function defaultKeyGenerator(req: TenantRequest): string {
  // Use tenant ID if available, otherwise fall back to IP
  if (req.tenantContext?.tenantId) {
    return `ratelimit:tenant:${req.tenantContext.tenantId}`;
  }
  return `ratelimit:ip:${req.ip || 'unknown'}`;
}

/**
 * Get rate limit for tenant plan.
 */
function getRateLimitForPlan(plan: TenantPlan | undefined): number {
  if (!plan) return RATE_LIMITS.STARTER;
  return RATE_LIMITS[plan] || RATE_LIMITS.STARTER;
}

/**
 * Redis-based rate limiting using sliding window.
 */
async function checkRateLimitRedis(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  if (!redis) {
    // Fallback to in-memory if Redis not available
    return checkRateLimitMemory(key, maxRequests, windowMs);
  }

  const now = Date.now();
  const windowStart = now - windowMs;

  // Use Redis sorted set for sliding window
  const multi = redis.multi();

  // Remove old entries outside the window
  multi.zremrangebyscore(key, 0, windowStart);

  // Add current request
  multi.zadd(key, now, `${now}-${Math.random()}`);

  // Count requests in window
  multi.zcard(key);

  // Set expiry on the key
  multi.pexpire(key, windowMs);

  const results = await multi.exec();
  const count = (results?.[2]?.[1] as number) || 0;

  return {
    allowed: count <= maxRequests,
    remaining: Math.max(0, maxRequests - count),
    resetTime: now + windowMs,
  };
}

/**
 * In-memory rate limiting fallback.
 */
function checkRateLimitMemory(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = inMemoryStore.get(key);

  if (!entry || entry.resetTime < now) {
    // Create new window
    inMemoryStore.set(key, { count: 1, resetTime: now + windowMs });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: now + windowMs,
    };
  }

  // Increment count
  entry.count++;

  return {
    allowed: entry.count <= maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    resetTime: entry.resetTime,
  };
}

/**
 * Create tenant-aware rate limiting middleware.
 */
export function tenantRateLimit(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs || DEFAULT_WINDOW_MS;
  const keyGenerator = options.keyGenerator || defaultKeyGenerator;
  const message = options.message || DEFAULT_MESSAGE;
  const useRedis = options.useRedis !== false;

  return async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const key = keyGenerator(req);

      // Determine max requests (custom > plan-based > default)
      const maxRequests =
        options.max ||
        getRateLimitForPlan(req.tenantContext?.tenantPlan) ||
        RATE_LIMITS.STARTER;

      let result: { allowed: boolean; remaining: number; resetTime: number };

      // Use Redis if connected, otherwise fallback to memory
      if (useRedis && isRedisConnected()) {
        result = await checkRateLimitRedis(key, maxRequests, windowMs);
      } else {
        result = checkRateLimitMemory(key, maxRequests, windowMs);
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfter);

        const formattedMessage = formatRateLimitMessage(retryAfter, message);

        return res.status(429).json({
          error: 'RATE_LIMIT_EXCEEDED',
          message: formattedMessage,
          retryAfter,
          retryAfterFormatted: formatRetryDuration(retryAfter),
          resetAt: new Date(result.resetTime).toISOString(),
        });
      }

      next();
    } catch (error) {
      // On error, allow request through (fail open)
      console.error('Rate limit error:', error);
      next();
    }
  };
}

/**
 * Create API-specific rate limiter with stricter limits.
 */
export function apiRateLimit(maxPerMinute: number = 60) {
  return tenantRateLimit({
    windowMs: 60000,
    max: maxPerMinute,
    keyGenerator: (req: TenantRequest) => {
      // Rate limit by tenant + endpoint
      const tenantId = req.tenantContext?.tenantId || 'anonymous';
      const endpoint = req.path.replace(/\/\d+/g, '/:id'); // Normalize IDs
      return `ratelimit:api:${tenantId}:${endpoint}`;
    },
  });
}

/**
 * Create auth endpoint rate limiter (stricter for security).
 */
export function authRateLimit() {
  return tenantRateLimit({
    windowMs: 900000, // 15 minutes
    max: 10, // 10 login attempts per 15 minutes
    keyGenerator: (req) => {
      // Rate limit by IP for auth endpoints
      return `ratelimit:auth:${req.ip || 'unknown'}`;
    },
    message: 'Too many login attempts. Please try again in 15 minutes.',
  });
}

/**
 * Create AI tool rate limiter (usage-based).
 */
export function aiToolRateLimit(toolName: string, defaultLimit: number = 100) {
  return tenantRateLimit({
    windowMs: 86400000, // 24 hours
    max: defaultLimit,
    keyGenerator: (req: TenantRequest) => {
      const tenantId = req.tenantContext?.tenantId || 'anonymous';
      return `ratelimit:ai:${tenantId}:${toolName}`;
    },
    message: `Daily limit reached for ${toolName}. Upgrade your plan for higher limits.`,
  });
}

export default tenantRateLimit;
