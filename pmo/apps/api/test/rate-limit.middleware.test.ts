/// <reference types="vitest" />
import request from 'supertest';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import express from 'express';

import {
  createRateLimiter,
  RateLimiter,
  formatRetryDuration,
  formatRateLimitMessage,
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
      expect(response.body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.body.error).toContain('Rate limit exceeded');
      expect(response.body.error).toContain('before retrying');
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
      expect(response.body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.body.error).toContain(customMessage);
      expect(response.body.error).toContain('You can retry in');
    });

    it('includes detailed retry information in response', async () => {
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
      expect(response.body).toHaveProperty('code', 'RATE_LIMIT_EXCEEDED');
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('retryAfter');
      expect(response.body).toHaveProperty('retryAfterFormatted');
      expect(response.body).toHaveProperty('resetAt');

      // Verify error message contains retry information
      expect(response.body.error).toMatch(
        /Please wait \d+ (second|minute|hour)/,
      );
      expect(response.body.error).toMatch(/resets at \d{2}:\d{2}/);
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

  describe('formatRetryDuration', () => {
    it('formats seconds correctly', () => {
      expect(formatRetryDuration(1)).toBe('1 second');
      expect(formatRetryDuration(30)).toBe('30 seconds');
      expect(formatRetryDuration(59)).toBe('59 seconds');
    });

    it('formats minutes correctly', () => {
      expect(formatRetryDuration(60)).toBe('1 minute');
      expect(formatRetryDuration(90)).toBe('2 minutes');
      expect(formatRetryDuration(120)).toBe('2 minutes');
      expect(formatRetryDuration(1800)).toBe('30 minutes'); // 30 min
      expect(formatRetryDuration(3540)).toBe('59 minutes'); // 59 min
    });

    it('formats hours correctly', () => {
      expect(formatRetryDuration(3600)).toBe('1 hour');
      expect(formatRetryDuration(7200)).toBe('2 hours');
      expect(formatRetryDuration(86400)).toBe('24 hours');
    });
  });

  describe('formatRateLimitMessage', () => {
    it('formats default message with retry duration', () => {
      const message = formatRateLimitMessage(30);
      expect(message).toContain('Rate limit exceeded');
      expect(message).toContain('Please wait 30 seconds');
      expect(message).toContain('before retrying');
      expect(message).toMatch(/resets at \d{2}:\d{2}/);
    });

    it('includes custom message prefix', () => {
      const customMessage = 'API quota reached.';
      const message = formatRateLimitMessage(120, customMessage);
      expect(message).toContain(customMessage);
      expect(message).toContain('You can retry in 2 minutes');
      expect(message).toMatch(/at \d{2}:\d{2}/);
    });

    it('formats message for minutes duration', () => {
      const message = formatRateLimitMessage(300);
      expect(message).toContain('5 minutes');
    });

    it('formats message for hours duration', () => {
      const message = formatRateLimitMessage(7200);
      expect(message).toContain('2 hours');
    });
  });
});
