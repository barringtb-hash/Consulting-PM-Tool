/// <reference types="vitest" />
import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll, beforeEach } from 'vitest';

import { createApp } from '../src/app';
import { getRawPrisma } from './utils/test-fixtures';

const app = createApp();
const rawPrisma = getRawPrisma();

describe('public leads routes', () => {
  const testEmail = `public-lead-test-${Date.now()}@example.com`;
  const createdLeadIds: number[] = [];

  // Clean up any leads created during tests
  afterAll(async () => {
    if (createdLeadIds.length > 0) {
      await rawPrisma.inboundLead.deleteMany({
        where: { id: { in: createdLeadIds } },
      });
    }
    // Also clean up by test email pattern
    await rawPrisma.inboundLead.deleteMany({
      where: { email: { contains: 'public-lead-test-' } },
    });
  });

  describe('POST /api/public/inbound-leads', () => {
    it('creates a lead with valid data and returns correct response format', async () => {
      const response = await request(app)
        .post('/api/public/inbound-leads')
        .send({
          name: 'John Doe',
          email: testEmail,
          company: 'Acme Corp',
          message: 'Interested in your AI services',
          source: 'WEBSITE_CONTACT',
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        leadId: expect.any(String),
      });

      // Track for cleanup
      createdLeadIds.push(parseInt(response.body.leadId));

      // Verify the lead was actually created in the database
      const lead = await rawPrisma.inboundLead.findUnique({
        where: { id: parseInt(response.body.leadId) },
      });
      expect(lead).not.toBeNull();
      expect(lead?.name).toBe('John Doe');
      expect(lead?.email).toBe(testEmail);
      expect(lead?.company).toBe('Acme Corp');
      expect(lead?.status).toBe('NEW');
    });

    it('accepts UTM tracking fields', async () => {
      const email = `public-lead-test-utm-${Date.now()}@example.com`;
      const response = await request(app)
        .post('/api/public/inbound-leads')
        .send({
          name: 'Jane Smith',
          email,
          company: 'Tech Co',
          source: 'WEBSITE_CONTACT',
          page: 'https://example.com/contact',
          utmSource: 'google',
          utmMedium: 'cpc',
          utmCampaign: 'spring-promo',
          utmContent: 'banner-ad',
          utmTerm: 'ai consulting',
        });

      expect(response.status).toBe(201);
      createdLeadIds.push(parseInt(response.body.leadId));

      // Verify UTM fields were stored
      const lead = await rawPrisma.inboundLead.findUnique({
        where: { id: parseInt(response.body.leadId) },
      });
      expect(lead?.page).toBe('https://example.com/contact');
      expect(lead?.utmSource).toBe('google');
      expect(lead?.utmMedium).toBe('cpc');
      expect(lead?.utmCampaign).toBe('spring-promo');
      expect(lead?.utmContent).toBe('banner-ad');
      expect(lead?.utmTerm).toBe('ai consulting');
    });

    it('accepts all valid source values', async () => {
      const sources = [
        'WEBSITE_CONTACT',
        'REFERRAL',
        'LINKEDIN',
        'EVENT',
        'OTHER',
      ];

      for (const source of sources) {
        const email = `public-lead-test-source-${source}-${Date.now()}@example.com`;
        const response = await request(app)
          .post('/api/public/inbound-leads')
          .send({
            name: 'Test User',
            email,
            source,
          });

        expect(response.status).toBe(201);
        createdLeadIds.push(parseInt(response.body.leadId));
      }
    });

    it('returns 400 when name is missing', async () => {
      const response = await request(app)
        .post('/api/public/inbound-leads')
        .send({
          email: 'missing-name@example.com',
          company: 'Some Company',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid lead data');
      expect(response.body.details).toBeDefined();
    });

    it('returns 400 when email is missing', async () => {
      const response = await request(app)
        .post('/api/public/inbound-leads')
        .send({
          name: 'No Email User',
          company: 'Some Company',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid lead data');
      expect(response.body.details).toBeDefined();
    });

    it('returns 400 for invalid email format', async () => {
      const response = await request(app)
        .post('/api/public/inbound-leads')
        .send({
          name: 'Invalid Email User',
          email: 'not-an-email',
          company: 'Some Company',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid lead data');
    });

    it('returns 400 for empty name', async () => {
      const response = await request(app)
        .post('/api/public/inbound-leads')
        .send({
          name: '',
          email: 'empty-name@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid lead data');
    });

    it('returns 400 for invalid source enum value', async () => {
      const response = await request(app)
        .post('/api/public/inbound-leads')
        .send({
          name: 'Test User',
          email: 'invalid-source@example.com',
          source: 'INVALID_SOURCE',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid lead data');
    });

    it('accepts request without optional fields', async () => {
      const email = `public-lead-test-minimal-${Date.now()}@example.com`;
      const response = await request(app)
        .post('/api/public/inbound-leads')
        .send({
          name: 'Minimal User',
          email,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.leadId).toBeDefined();
      createdLeadIds.push(parseInt(response.body.leadId));

      // Verify defaults
      const lead = await rawPrisma.inboundLead.findUnique({
        where: { id: parseInt(response.body.leadId) },
      });
      expect(lead?.source).toBe('WEBSITE_CONTACT'); // Default source
      expect(lead?.serviceInterest).toBe('NOT_SURE'); // Default service interest
    });

    it('includes rate limit headers in response', async () => {
      const email = `public-lead-test-headers-${Date.now()}@example.com`;
      const response = await request(app)
        .post('/api/public/inbound-leads')
        .send({
          name: 'Header Test User',
          email,
        });

      expect(response.status).toBe(201);
      createdLeadIds.push(parseInt(response.body.leadId));

      // Check rate limit headers are present
      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
      expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });
  });

  describe('rate limiting', () => {
    it('blocks requests after exceeding rate limit', async () => {
      // Create a unique IP for this test to avoid interference
      const testIp = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;

      // Make 5 requests (the limit)
      for (let i = 0; i < 5; i++) {
        const email = `rate-limit-test-${i}-${Date.now()}@example.com`;
        const response = await request(app)
          .post('/api/public/inbound-leads')
          .set('X-Forwarded-For', testIp)
          .send({
            name: `Rate Limit Test ${i}`,
            email,
          });

        if (response.status === 201) {
          createdLeadIds.push(parseInt(response.body.leadId));
        }
      }

      // 6th request should be rate limited
      const response = await request(app)
        .post('/api/public/inbound-leads')
        .set('X-Forwarded-For', testIp)
        .send({
          name: 'Over Limit User',
          email: `rate-limit-over-${Date.now()}@example.com`,
        });

      expect(response.status).toBe(429);
      expect(response.body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.body.error).toContain('Too many lead submissions');
      expect(response.headers['retry-after']).toBeDefined();
    });
  });
});
