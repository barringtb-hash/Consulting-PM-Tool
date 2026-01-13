/**
 * Lead ML API Routes Integration Tests
 *
 * Tests for Lead ML API endpoints.
 */

import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import * as tenantContext from '../src/tenant/tenant.context';

// Mock tenant context
vi.mock('../src/tenant/tenant.context', () => ({
  getTenantId: vi.fn(() => 'test-tenant-routes'),
  hasTenantContext: vi.fn(() => true),
  withTenantContext: vi.fn((tenantId, fn) => fn()),
  runWithTenantId: vi.fn((tenantId, fn) => fn()),
}));

// Mock AI client
vi.mock('../src/modules/ai-monitoring/ai-client', () => ({
  isAIAvailable: vi.fn(() => true),
  jsonPrompt: vi.fn(),
  trackAIUsage: vi.fn(),
}));

// Mock Prisma
vi.mock('../src/prisma/client', () => {
  const mockPrisma = {
    scoredLead: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    leadScoringConfig: {
      findUnique: vi.fn(),
    },
    leadActivity: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    nurtureSequenceEnrollment: {
      findFirst: vi.fn(),
    },
    leadMLPrediction: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    leadMLModel: {
      findFirst: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    client: {
      findUnique: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
    },
    $disconnect: vi.fn().mockResolvedValue(undefined),
  };
  return {
    prisma: mockPrisma,
    default: mockPrisma,
  };
});

// Import after mocks
import { prisma } from '../src/prisma/client';
import leadMLRouter from '../src/modules/lead-ml/lead-ml.router';

// Test setup
const JWT_SECRET =
  process.env.JWT_SECRET || 'test-secret-key-for-jwt-testing-32chars';

const app = express();
app.use(express.json());
app.use(cookieParser());

// Mock auth middleware
app.use((req, res, next) => {
  const token =
    req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      (req as express.Request & { user?: { userId: number } }).user = decoded;
    } catch {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  next();
});

// Mount router
app.use('/api/lead-scoring', leadMLRouter);

// Helper to create auth token
function createAuthToken(userId: number = 1): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

describe('Lead ML API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (tenantContext.getTenantId as ReturnType<typeof vi.fn>).mockReturnValue(
      'test-tenant-routes',
    );

    // Set up default authorization mocks
    // Mock user for hasClientAccess
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      role: 'ADMIN',
    });
    // Mock client for hasClientAccess
    (prisma.client.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
    });
    // Mock scored lead for getClientIdFromScoredLead (authorization check)
    (
      prisma.scoredLead.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      config: { clientId: 1 },
    });
    // Mock lead scoring config for getClientIdFromLeadScoringConfig
    (
      prisma.leadScoringConfig.findUnique as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: 1,
      clientId: 1,
      hotThreshold: 80,
      warmThreshold: 50,
      coldThreshold: 20,
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // ==========================================================================
  // Prediction Endpoints
  // ==========================================================================

  describe('POST /api/lead-scoring/leads/:id/ml/predict', () => {
    it('should return 401 without auth', async () => {
      const response = await request(app)
        .post('/api/lead-scoring/leads/1/ml/predict')
        .send({});

      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid lead ID', async () => {
      const token = createAuthToken();

      const response = await request(app)
        .post('/api/lead-scoring/leads/invalid/ml/predict')
        .set('Cookie', `token=${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid lead ID');
    });

    it('should generate prediction for valid lead', async () => {
      const token = createAuthToken();

      // Mock lead with all required fields including relations
      const mockLead = {
        id: 1,
        email: 'test@example.com',
        name: 'Test Lead',
        company: 'Test Corp',
        title: 'Manager',
        phone: '555-1234',
        score: 65,
        scoreLevel: 'WARM',
        configId: 1,
        pipelineStage: 'MQL',
        conversionProbability: 0.5,
        totalEmailsSent: 5,
        totalEmailsOpened: 3,
        totalEmailsClicked: 1,
        totalWebsiteVisits: 10,
        currentSequenceId: null,
        sequenceStepIndex: null,
        createdAt: new Date(Date.now() - 14 * 86400000),
        lastEngagementAt: new Date(Date.now() - 86400000),
        // Include relations that the query expects
        activities: [],
        sequenceEnrollments: [],
      };

      const mockConfig = {
        id: 1,
        hotThreshold: 80,
        warmThreshold: 50,
        coldThreshold: 20,
      };

      // Mock findFirst for tenant-isolated lead lookup
      (
        prisma.scoredLead.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockLead);
      (prisma.scoredLead.update as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockLead,
      );
      (
        prisma.leadScoringConfig.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockConfig);
      (
        prisma.leadActivity.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);
      (
        prisma.nurtureSequenceEnrollment.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);
      (
        prisma.leadMLPrediction.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);
      (
        prisma.leadMLPrediction.create as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: 1,
        predictionType: 'CONVERSION',
        probability: 0.55,
        confidence: 0.7,
      });

      const response = await request(app)
        .post('/api/lead-scoring/leads/1/ml/predict')
        .set('Cookie', `token=${token}`)
        .send({ forceRefresh: false, ruleBasedOnly: true });

      expect(response.status).toBe(200);
      expect(response.body.prediction).toBeDefined();
      expect(response.body.prediction.predictionType).toBe('CONVERSION');
    });
  });

  describe('GET /api/lead-scoring/leads/:id/ml/prediction', () => {
    it('should return 404 when no prediction exists', async () => {
      const token = createAuthToken();

      (
        prisma.leadMLPrediction.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/lead-scoring/leads/1/ml/prediction')
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No prediction found');
    });

    it('should return existing prediction', async () => {
      const token = createAuthToken();

      const mockPrediction = {
        id: 1,
        predictionType: 'CONVERSION',
        probability: 0.65,
        confidence: 0.8,
        riskFactors: [],
        explanation: 'Test explanation',
        recommendations: [],
        validUntil: new Date(Date.now() + 86400000),
        predictedAt: new Date(),
        status: 'ACTIVE',
      };

      (
        prisma.leadMLPrediction.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockPrediction);

      const response = await request(app)
        .get('/api/lead-scoring/leads/1/ml/prediction?type=CONVERSION')
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(1);
      expect(response.body.prediction.probability).toBe(0.65);
    });
  });

  describe('GET /api/lead-scoring/leads/:id/ml/features', () => {
    it('should return lead features', async () => {
      const token = createAuthToken();

      const mockLead = {
        id: 1,
        email: 'test@corp.com',
        name: 'Test',
        company: 'Corp',
        title: 'Director',
        phone: '555-1234',
        createdAt: new Date(Date.now() - 7 * 86400000),
        lastEngagementAt: new Date(),
        config: { clientId: 1 }, // Required for authorization check
      };

      (
        prisma.scoredLead.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockLead);
      (
        prisma.leadActivity.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([
        { type: 'EMAIL_OPEN', createdAt: new Date() },
        { type: 'EMAIL_CLICK', createdAt: new Date() },
      ]);
      (
        prisma.nurtureSequenceEnrollment.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/lead-scoring/leads/1/ml/features')
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.features).toBeDefined();
      expect(response.body.features.demographic).toBeDefined();
      expect(response.body.features.behavioral).toBeDefined();
      expect(response.body.features.temporal).toBeDefined();
      expect(response.body.features.engagement).toBeDefined();
    });
  });

  // ==========================================================================
  // Priority Ranking Endpoints
  // ==========================================================================

  describe('GET /api/lead-scoring/:configId/ml/ranked-leads', () => {
    it('should return ranked leads', async () => {
      const token = createAuthToken();

      const mockLeads = [
        {
          id: 1,
          email: 'hot@corp.com',
          name: 'Hot Lead',
          company: 'Hot Corp',
          title: 'CEO',
          score: 90,
          scoreLevel: 'HOT',
          totalEmailsSent: 10,
          totalEmailsOpened: 8,
          totalWebsiteVisits: 15,
          lastEngagementAt: new Date(),
          _count: { activities: 20 },
        },
        {
          id: 2,
          email: 'warm@corp.com',
          name: 'Warm Lead',
          company: 'Warm Corp',
          title: 'Manager',
          score: 60,
          scoreLevel: 'WARM',
          totalEmailsSent: 5,
          totalEmailsOpened: 2,
          totalWebsiteVisits: 5,
          lastEngagementAt: new Date(),
          _count: { activities: 8 },
        },
      ];

      (
        prisma.scoredLead.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockLeads);

      const response = await request(app)
        .get('/api/lead-scoring/1/ml/ranked-leads?limit=10&minScore=0')
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.rankings).toBeDefined();
      expect(Array.isArray(response.body.rankings)).toBe(true);
    });
  });

  describe('GET /api/lead-scoring/:configId/ml/top-leads', () => {
    it('should return top priority leads', async () => {
      const token = createAuthToken();

      const mockLeads = [
        {
          id: 1,
          email: 'top@corp.com',
          name: 'Top Lead',
          company: 'Top Corp',
          title: 'VP',
          score: 85,
          scoreLevel: 'HOT',
          totalEmailsSent: 8,
          totalEmailsOpened: 6,
          totalWebsiteVisits: 12,
          lastEngagementAt: new Date(),
          _count: { activities: 15 },
        },
      ];

      (
        prisma.scoredLead.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockLeads);

      const response = await request(app)
        .get('/api/lead-scoring/1/ml/top-leads?n=5')
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.leads).toBeDefined();
      expect(Array.isArray(response.body.leads)).toBe(true);
    });
  });

  describe('GET /api/lead-scoring/:configId/ml/leads-by-tier', () => {
    it('should return 400 for invalid tier', async () => {
      const token = createAuthToken();

      const response = await request(app)
        .get('/api/lead-scoring/1/ml/leads-by-tier?tier=invalid')
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid tier');
    });

    it('should return leads by tier', async () => {
      const token = createAuthToken();

      const mockLeads = [
        {
          id: 1,
          email: 'hot@corp.com',
          name: 'Hot Lead',
          company: 'Hot Corp',
          title: 'CEO',
          score: 92,
          scoreLevel: 'HOT',
          totalEmailsSent: 12,
          totalEmailsOpened: 10,
          totalWebsiteVisits: 20,
          lastEngagementAt: new Date(),
          _count: { activities: 25 },
        },
      ];

      (
        prisma.scoredLead.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockLeads);

      const response = await request(app)
        .get('/api/lead-scoring/1/ml/leads-by-tier?tier=top')
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.leads).toBeDefined();
    });
  });

  // ==========================================================================
  // Validation & Accuracy Endpoints
  // ==========================================================================

  describe('POST /api/lead-scoring/predictions/:id/validate', () => {
    it('should validate a prediction', async () => {
      const token = createAuthToken();

      (
        prisma.leadMLPrediction.update as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: 1,
        wasAccurate: true,
        status: 'VALIDATED',
      });

      const response = await request(app)
        .post('/api/lead-scoring/predictions/1/validate')
        .set('Cookie', `token=${token}`)
        .send({ wasAccurate: true });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 400 for invalid prediction ID', async () => {
      const token = createAuthToken();

      const response = await request(app)
        .post('/api/lead-scoring/predictions/invalid/validate')
        .set('Cookie', `token=${token}`)
        .send({ wasAccurate: true });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid prediction ID');
    });
  });

  describe('GET /api/lead-scoring/:configId/ml/accuracy', () => {
    it('should return accuracy metrics', async () => {
      const token = createAuthToken();

      (
        prisma.leadMLPrediction.count as ReturnType<typeof vi.fn>
      ).mockResolvedValue(100);
      (
        prisma.leadMLPrediction.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([
        { predictionType: 'CONVERSION', wasAccurate: true },
        { predictionType: 'CONVERSION', wasAccurate: true },
        { predictionType: 'CONVERSION', wasAccurate: false },
      ]);

      const response = await request(app)
        .get('/api/lead-scoring/1/ml/accuracy')
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.totalPredictions).toBeDefined();
      expect(response.body.accuracy).toBeDefined();
    });
  });

  // ==========================================================================
  // Feature Importance Endpoint
  // ==========================================================================

  describe('GET /api/lead-scoring/:configId/ml/feature-importance', () => {
    it('should return feature importance', async () => {
      const token = createAuthToken();

      const response = await request(app)
        .get('/api/lead-scoring/1/ml/feature-importance')
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body.importance).toBeDefined();
      expect(Array.isArray(response.body.importance)).toBe(true);
      expect(response.body.importance.length).toBeGreaterThan(0);
    });
  });
});
