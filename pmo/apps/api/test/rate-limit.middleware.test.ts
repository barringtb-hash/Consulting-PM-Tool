/// <reference types="vitest" />
import request from 'supertest';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import express from 'express';

import {
  createRateLimiter,
  RateLimiter,
} from '../src/middleware/rate-limit.middleware';

describe('rate-limit middleware', () => {
  describe('createRateLimiter', () => {
    let app: express.Express;

    beforeEach(() => {
      app = express();
      app.set('trust proxy', 1);
    });

    it('allows requests within limit', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 3,
      });

      app.get('/test', rateLimiter, (_req, res) => {
        res.json({ success: true });
      });

      // First 3 requests should succeed
      for (let i = 0; i < 3; i++) {
        const response = await request(app).get('/test');
        expect(response.status).toBe(200);
      }
    });

    it('blocks requests exceeding limit', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 2,
      });

      app.get('/test', rateLimiter, (_req, res) => {
        res.json({ success: true });
      });

      // First 2 requests should succeed
      await request(app).get('/test');
      await request(app).get('/test');

      // Third request should be blocked
      const response = await request(app).get('/test');
      expect(response.status).toBe(429);
      expect(response.body.error).toContain('Too many requests');
    });

    it('returns custom message when rate limited', async () => {
      const customMessage = 'Custom rate limit message';
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 1,
        message: customMessage,
      });

      app.get('/test', rateLimiter, (_req, res) => {
        res.json({ success: true });
      });

      await request(app).get('/test');
      const response = await request(app).get('/test');

      expect(response.status).toBe(429);
      expect(response.body.error).toBe(customMessage);
    });

    it('sets rate limit headers', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 5,
      });

      app.get('/test', rateLimiter, (_req, res) => {
        res.json({ success: true });
      });

      const response = await request(app).get('/test');

      expect(response.headers['x-ratelimit-limit']).toBe('5');
      expect(response.headers['x-ratelimit-remaining']).toBe('4');
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('includes Retry-After header when rate limited', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 1,
      });

      app.get('/test', rateLimiter, (_req, res) => {
        res.json({ success: true });
      });

      await request(app).get('/test');
      const response = await request(app).get('/test');

      expect(response.status).toBe(429);
      expect(response.headers['retry-after']).toBeDefined();
      expect(parseInt(response.headers['retry-after'])).toBeGreaterThan(0);
    });

    it('tracks different IPs separately', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 1,
      });

      app.get('/test', rateLimiter, (_req, res) => {
        res.json({ success: true });
      });

      // Request from IP 1
      const response1 = await request(app)
        .get('/test')
        .set('X-Forwarded-For', '1.1.1.1');
      expect(response1.status).toBe(200);

      // Request from IP 2 (should succeed - separate limit)
      const response2 = await request(app)
        .get('/test')
        .set('X-Forwarded-For', '2.2.2.2');
      expect(response2.status).toBe(200);

      // Second request from IP 1 (should be blocked)
      const response3 = await request(app)
        .get('/test')
        .set('X-Forwarded-For', '1.1.1.1');
      expect(response3.status).toBe(429);
    });
  });

  describe('RateLimiter class', () => {
    it('can be destroyed to clean up interval', () => {
      const limiter = new RateLimiter({
        windowMs: 60000,
        maxRequests: 5,
      });

      // Should not throw
      expect(() => limiter.destroy()).not.toThrow();
    });
  });
});
