/**
 * Redis Client Configuration
 *
 * Provides Redis connection for:
 * - Caching
 * - Rate limiting
 * - Session storage
 * - Pub/Sub for real-time updates
 * - Job queue backing store
 */

import Redis from 'ioredis';
import { env } from '../config/env';

// Connection state tracking
let isConnected = false;
let _connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;

/**
 * Create Redis client with automatic reconnection.
 */
function createRedisClient(): Redis {
  const client = new Redis(env.redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      _connectionAttempts = times;
      if (times > MAX_RECONNECT_ATTEMPTS) {
        console.error('Redis: Max reconnection attempts reached, giving up');
        return null; // Stop retrying
      }
      const delay = Math.min(times * 100, 3000);
      console.log(
        `Redis: Reconnection attempt ${times}, retrying in ${delay}ms`,
      );
      return delay;
    },
    lazyConnect: true,
    enableReadyCheck: true,
    connectTimeout: 10000,
  });

  client.on('connect', () => {
    console.log('Redis: Connecting...');
  });

  client.on('ready', () => {
    isConnected = true;
    _connectionAttempts = 0;
    console.log('Redis: Connected and ready');
  });

  client.on('error', (err) => {
    console.error('Redis: Connection error:', err.message);
  });

  client.on('close', () => {
    isConnected = false;
    console.log('Redis: Connection closed');
  });

  client.on('reconnecting', () => {
    console.log('Redis: Reconnecting...');
  });

  client.on('end', () => {
    isConnected = false;
    console.log('Redis: Connection ended');
  });

  return client;
}

// Primary Redis client instance
export const redis: Redis = createRedisClient();

// Subscriber client for pub/sub (requires separate connection)
export const redisSubscriber: Redis = createRedisClient();

/**
 * Create Redis client for BullMQ blocking operations.
 * BullMQ QueueEvents requires maxRetriesPerRequest: null for blocking commands.
 */
function createBullMQRedisClient(): Redis {
  const client = new Redis(env.redisUrl, {
    maxRetriesPerRequest: null, // Required for BullMQ blocking operations
    retryStrategy: (times) => {
      if (times > MAX_RECONNECT_ATTEMPTS) {
        console.error('Redis (BullMQ): Max reconnection attempts reached');
        return null;
      }
      return Math.min(times * 100, 3000);
    },
    lazyConnect: true,
    enableReadyCheck: true,
    connectTimeout: 10000,
  });

  client.on('error', (err) => {
    console.error('Redis (BullMQ): Connection error:', err.message);
  });

  return client;
}

// BullMQ client for queue event listeners (requires maxRetriesPerRequest: null)
export const redisBullMQ: Redis = createBullMQRedisClient();

/**
 * Check if Redis is connected and ready.
 */
export function isRedisConnected(): boolean {
  return isConnected && redis.status === 'ready';
}

/**
 * Connect to Redis if not already connected.
 */
export async function connectRedis(): Promise<void> {
  if (!env.redisUrl) {
    console.log('Redis: No REDIS_URL configured, skipping connection');
    return;
  }

  if (redis.status === 'ready') {
    return;
  }

  try {
    await redis.connect();
  } catch (error) {
    console.error('Redis: Failed to connect:', error);
    // Don't throw - Redis is optional, app should work without it
  }
}

/**
 * Disconnect from Redis gracefully.
 */
export async function disconnectRedis(): Promise<void> {
  if (redis.status !== 'end') {
    await redis.quit();
  }
  if (redisSubscriber.status !== 'end') {
    await redisSubscriber.quit();
  }
}

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  console.log('Redis: Shutting down...');
  await disconnectRedis();
});

process.on('SIGINT', async () => {
  console.log('Redis: Shutting down...');
  await disconnectRedis();
});

// ============================================================================
// CACHE UTILITIES
// ============================================================================

const DEFAULT_TTL = 300; // 5 minutes

/**
 * Get a cached value.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isRedisConnected()) return null;

  try {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Redis: Cache get error:', error);
    return null;
  }
}

/**
 * Set a cached value with optional TTL.
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number = DEFAULT_TTL,
): Promise<void> {
  if (!isRedisConnected()) return;

  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (error) {
    console.error('Redis: Cache set error:', error);
  }
}

/**
 * Delete a cached value.
 */
export async function cacheDelete(key: string): Promise<void> {
  if (!isRedisConnected()) return;

  try {
    await redis.del(key);
  } catch (error) {
    console.error('Redis: Cache delete error:', error);
  }
}

/**
 * Delete all keys matching a pattern (use with caution).
 */
export async function cacheDeletePattern(pattern: string): Promise<void> {
  if (!isRedisConnected()) return;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error('Redis: Cache delete pattern error:', error);
  }
}

/**
 * Get or set cache with a factory function.
 */
export async function cacheGetOrSet<T>(
  key: string,
  factory: () => Promise<T>,
  ttlSeconds: number = DEFAULT_TTL,
): Promise<T> {
  // Try cache first
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Generate fresh value
  const value = await factory();

  // Cache it
  await cacheSet(key, value, ttlSeconds);

  return value;
}

/**
 * Build a tenant-scoped cache key.
 */
export function tenantCacheKey(tenantId: string, ...parts: string[]): string {
  return `tenant:${tenantId}:${parts.join(':')}`;
}

export default redis;
