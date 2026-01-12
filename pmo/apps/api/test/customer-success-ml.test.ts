/**
 * Customer Success ML Services Unit Tests
 *
 * Tests for ML-powered churn prediction, health insights, and CTA generation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as tenantContext from '../src/tenant/tenant.context';

// Mock the tenant context
vi.mock('../src/tenant/tenant.context', () => ({
  getTenantId: vi.fn(() => 'test-tenant-ml'),
  hasTenantContext: vi.fn(() => true),
}));

// Mock the AI client to avoid actual LLM calls
vi.mock('../src/modules/ai-monitoring/ai-client', () => ({
  isAIAvailable: vi.fn(() => true),
  jsonPrompt: vi.fn(),
  trackAIUsage: vi.fn(),
}));

// Mock the Prisma client
vi.mock('../src/prisma/client', () => {
  const mockPrisma = {
    account: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    accountHealthScoreHistory: {
      findMany: vi.fn(),
    },
    cRMActivity: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    cTA: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      create: vi.fn(),
    },
    opportunity: {
      findMany: vi.fn(),
    },
    accountMLPrediction: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    playbook: {
      findFirst: vi.fn(),
    },
    $disconnect: vi.fn().mockResolvedValue(undefined),
  };
  return {
    prisma: mockPrisma,
    default: mockPrisma,
  };
});

// Mock account-cta service
vi.mock('../src/crm/services/account-cta.service', () => ({
  createAccountCTA: vi.fn(),
}));

// Import after mocks
import { prisma } from '../src/prisma/client';
import * as aiClient from '../src/modules/ai-monitoring/ai-client';
import {
  gatherAccountContext,
  storePrediction,
  getLatestPrediction,
  validateExpiredPredictions,
  getPredictionAccuracy,
  isMLAvailable,
  getMLConfig,
  linkCTAToPrediction,
  getHighRiskAccounts,
} from '../src/modules/customer-success-ml/services/cs-ml-prediction.service';
import {
  predictChurnRuleBased,
  getExistingChurnPrediction,
} from '../src/modules/customer-success-ml/services/churn-prediction.service';
import { analyzeAccountHealth } from '../src/modules/customer-success-ml/services/ml-health-insights.service';
import {
  generateCTAFromPrediction,
  generateChurnCTA,
  getMLCTAStats,
} from '../src/modules/customer-success-ml/services/intelligent-cta.service';
import { createAccountCTA } from '../src/crm/services/account-cta.service';
import type {
  AccountMLContext,
  RiskFactor,
} from '../src/modules/customer-success-ml/types';

describe('Customer Success ML Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (tenantContext.getTenantId as ReturnType<typeof vi.fn>).mockReturnValue(
      'test-tenant-ml',
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ==========================================================================
  // Context Gathering Tests
  // ==========================================================================

  describe('gatherAccountContext', () => {
    it('should gather complete account context', async () => {
      const mockAccount = {
        id: 1,
        name: 'Test Account',
        type: 'CUSTOMER',
        healthScore: 75,
        engagementScore: 80,
        churnRisk: 0.2,
        createdAt: new Date('2023-01-01'),
      };

      const mockHealthHistory = [
        {
          overallScore: 75,
          calculatedAt: new Date(),
          usageScore: 70,
          supportScore: 80,
          engagementScore: 75,
          sentimentScore: 72,
          scoreTrend: 'STABLE',
          churnRisk: 0.2,
        },
      ];

      const mockActivities = [
        { type: 'EMAIL', createdAt: new Date() },
        { type: 'MEETING', createdAt: new Date() },
      ];

      const mockCTAs = [
        {
          type: 'ONBOARDING',
          priority: 'HIGH',
          status: 'OPEN',
          dueDate: new Date(),
        },
      ];

      const mockOpportunities = [
        {
          stage: { name: 'Negotiation' },
          amount: { toNumber: () => 50000 },
          probability: 60,
        },
      ];

      (prisma.account.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockAccount,
      );
      (
        prisma.accountHealthScoreHistory.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockHealthHistory);
      (
        prisma.cRMActivity.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockActivities);
      (
        prisma.cRMActivity.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue({ createdAt: new Date() });
      (prisma.cTA.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockCTAs,
      );
      (
        prisma.opportunity.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockOpportunities);

      const context = await gatherAccountContext(1, 'test-tenant-ml');

      expect(context.account.id).toBe(1);
      expect(context.account.name).toBe('Test Account');
      expect(context.healthHistory).toHaveLength(1);
      expect(context.recentActivities).toHaveLength(2);
      expect(context.openCTAs).toHaveLength(1);
      expect(context.opportunities).toHaveLength(1);
      expect(context.crmMetrics).toBeDefined();
    });

    it('should throw error when account not found', async () => {
      (prisma.account.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      (
        prisma.accountHealthScoreHistory.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);
      (
        prisma.cRMActivity.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);
      (prisma.cTA.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (
        prisma.opportunity.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);

      await expect(gatherAccountContext(999, 'test-tenant-ml')).rejects.toThrow(
        'Account 999 not found',
      );
    });
  });

  // ==========================================================================
  // Prediction Storage Tests
  // ==========================================================================

  describe('storePrediction', () => {
    it('should store a prediction and return its ID', async () => {
      const riskFactors: RiskFactor[] = [
        {
          factor: 'Health Decline',
          impact: 'high',
          currentValue: 45,
          trend: 'worsening',
          description: 'Test',
        },
      ];

      const mockPrediction = {
        predictionType: 'CHURN' as const,
        probability: 0.72,
        confidence: 0.85,
        predictionWindowDays: 90,
        riskFactors,
        explanation: 'Test explanation',
        recommendations: [
          {
            action: 'Test action',
            priority: 'high' as const,
            timeframe: '1 week',
            expectedImpact: 'Reduce churn',
            rationale: 'Test rationale',
            effort: 'medium' as const,
          },
        ],
        llmMetadata: {
          model: 'gpt-4',
          tokensUsed: 1000,
          latencyMs: 2000,
          estimatedCost: 0.02,
        },
      };

      (
        prisma.accountMLPrediction.create as ReturnType<typeof vi.fn>
      ).mockResolvedValue({ id: 42 });

      const result = await storePrediction(1, 'test-tenant-ml', mockPrediction);

      expect(result.id).toBe(42);
      expect(prisma.accountMLPrediction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'test-tenant-ml',
            accountId: 1,
            predictionType: 'CHURN',
            probability: 0.72,
            confidence: 0.85,
          }),
        }),
      );
    });
  });

  describe('getLatestPrediction', () => {
    it('should return the most recent valid prediction', async () => {
      const mockPrediction = {
        id: 42,
        probability: 0.72,
        confidence: 0.85,
        riskFactors: {},
        explanation: 'Test',
        recommendations: null,
        predictedAt: new Date(),
        validUntil: new Date(Date.now() + 86400000),
        status: 'ACTIVE',
      };

      (
        prisma.accountMLPrediction.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockPrediction);

      const result = await getLatestPrediction(1, 'CHURN');

      expect(result?.id).toBe(42);
      expect(result?.probability).toBe(0.72);
    });

    it('should return null when no prediction exists', async () => {
      (
        prisma.accountMLPrediction.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);

      const result = await getLatestPrediction(1, 'CHURN');

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // Churn Prediction Tests
  // ==========================================================================

  describe('predictChurnRuleBased', () => {
    it('should calculate churn risk based on health score', () => {
      const context: AccountMLContext = {
        account: {
          id: 1,
          name: 'Test',
          type: 'CUSTOMER',
          healthScore: 40,
          engagementScore: 50,
          churnRisk: 0.3,
          createdAt: new Date(),
        },
        healthHistory: [
          {
            overallScore: 40,
            calculatedAt: new Date(),
            usageScore: 35,
            supportScore: 45,
            engagementScore: 50,
            sentimentScore: 40,
            scoreTrend: 'DECLINING',
            churnRisk: 0.3,
          },
        ],
        recentActivities: [],
        openCTAs: [
          {
            type: 'RISK',
            priority: 'HIGH',
            status: 'OPEN',
            dueDate: new Date(),
          },
        ],
        opportunities: [],
        crmMetrics: {
          daysSinceLastActivity: 45,
          activitiesLast30Days: 2,
          meetingsLast30Days: 0,
          emailsLast30Days: 2,
        },
      };

      const result = predictChurnRuleBased(context, 90);

      expect(result.predictionType).toBe('CHURN');
      expect(result.churnProbability).toBeGreaterThan(0.5);
      expect(result.riskFactors.length).toBeGreaterThan(0);
      expect(result.llmMetadata.model).toBe('rule-based-fallback');
    });

    it('should return low churn risk for healthy accounts', () => {
      const context: AccountMLContext = {
        account: {
          id: 1,
          name: 'Test',
          type: 'CUSTOMER',
          healthScore: 85,
          engagementScore: 90,
          churnRisk: 0.1,
          createdAt: new Date(),
        },
        healthHistory: [
          {
            overallScore: 85,
            calculatedAt: new Date(),
            usageScore: 88,
            supportScore: 82,
            engagementScore: 90,
            sentimentScore: 85,
            scoreTrend: 'IMPROVING',
            churnRisk: 0.1,
          },
        ],
        recentActivities: [
          { type: 'MEETING', createdAt: new Date(), sentiment: null },
          { type: 'EMAIL', createdAt: new Date(), sentiment: null },
        ],
        openCTAs: [],
        opportunities: [{ stage: 'Proposal', value: 30000, probability: 70 }],
        crmMetrics: {
          daysSinceLastActivity: 3,
          activitiesLast30Days: 15,
          meetingsLast30Days: 4,
          emailsLast30Days: 11,
        },
      };

      const result = predictChurnRuleBased(context, 90);

      expect(result.churnProbability).toBeLessThan(0.4);
      expect(result.riskCategory).toBe('low');
    });
  });

  describe('getExistingChurnPrediction', () => {
    it('should return existing prediction when valid', async () => {
      const mockPrediction = {
        id: 42,
        predictionType: 'CHURN',
        probability: 0.65,
        confidence: 0.82,
        predictionWindow: 90,
        riskFactors: [
          {
            factor: 'Test',
            impact: 'high',
            currentValue: 30,
            trend: 'worsening',
            description: 'Test',
          },
        ],
        explanation: 'Test explanation',
        recommendations: [],
        predictedAt: new Date(),
        validUntil: new Date(Date.now() + 86400000),
        status: 'ACTIVE',
        llmModel: 'gpt-4',
        llmTokensUsed: 1000,
        llmCost: 0.02,
      };

      (
        prisma.accountMLPrediction.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockPrediction);

      const result = await getExistingChurnPrediction(1);

      expect(result).not.toBeNull();
      expect(result?.probability).toBe(0.65);
    });

    it('should return null when no valid prediction exists', async () => {
      (
        prisma.accountMLPrediction.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);

      const result = await getExistingChurnPrediction(1);

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // Health Insights Tests
  // ==========================================================================

  describe('analyzeAccountHealth', () => {
    it('should analyze account health and return insights', async () => {
      const mockAccount = {
        id: 1,
        name: 'Test Account',
        type: 'CUSTOMER',
        healthScore: 65,
        engagementScore: 70,
        churnRisk: 0.3,
        createdAt: new Date('2023-01-01'),
      };

      const mockHealthHistory = [
        {
          overallScore: 65,
          calculatedAt: new Date(),
          usageScore: 60,
          supportScore: 70,
          engagementScore: 70,
          sentimentScore: 65,
          scoreTrend: 'DECLINING',
          churnRisk: 0.3,
        },
        {
          overallScore: 70,
          calculatedAt: new Date(Date.now() - 86400000 * 7),
          usageScore: 65,
          supportScore: 75,
          engagementScore: 75,
          sentimentScore: 70,
          scoreTrend: 'STABLE',
          churnRisk: 0.25,
        },
        {
          overallScore: 75,
          calculatedAt: new Date(Date.now() - 86400000 * 14),
          usageScore: 70,
          supportScore: 80,
          engagementScore: 80,
          sentimentScore: 75,
          scoreTrend: 'STABLE',
          churnRisk: 0.2,
        },
      ];

      (prisma.account.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockAccount,
      );
      (
        prisma.accountHealthScoreHistory.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockHealthHistory);
      (
        prisma.cRMActivity.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);
      (
        prisma.cRMActivity.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);
      (prisma.cTA.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (
        prisma.opportunity.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);

      const result = await analyzeAccountHealth({
        accountId: 1,
        tenantId: 'test-tenant-ml',
      });

      expect(result.currentScore).toBe(65);
      expect(result.scoreTrajectory).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(Array.isArray(result.insights)).toBe(true);
    });
  });

  // ==========================================================================
  // Intelligent CTA Tests
  // ==========================================================================

  describe('generateCTAFromPrediction', () => {
    it('should skip CTA when confidence is below threshold', async () => {
      const riskFactors: RiskFactor[] = [];
      const prediction = {
        predictionType: 'CHURN' as const,
        probability: 0.72,
        confidence: 0.3, // Below threshold
        predictionWindowDays: 90,
        riskFactors,
        explanation: 'Test',
        recommendations: [],
        suggestedCTA: {
          type: 'RISK' as const,
          priority: 'HIGH' as const,
          title: 'Test CTA',
          reason: 'Test reason',
          dueDays: 7,
        },
        llmMetadata: {
          model: 'gpt-4',
          tokensUsed: 1000,
          latencyMs: 2000,
          estimatedCost: 0.02,
        },
      };

      const result = await generateCTAFromPrediction(
        1,
        'test-tenant-ml',
        prediction,
        1,
      );

      expect(result.wasCreated).toBe(false);
      expect(result.skippedReason).toContain('below threshold');
    });

    it('should skip CTA when no suggestion provided', async () => {
      const riskFactors: RiskFactor[] = [];
      const prediction = {
        predictionType: 'CHURN' as const,
        probability: 0.72,
        confidence: 0.85,
        predictionWindowDays: 90,
        riskFactors,
        explanation: 'Test',
        recommendations: [],
        // No suggestedCTA
        llmMetadata: {
          model: 'gpt-4',
          tokensUsed: 1000,
          latencyMs: 2000,
          estimatedCost: 0.02,
        },
      };

      const result = await generateCTAFromPrediction(
        1,
        'test-tenant-ml',
        prediction,
        1,
      );

      expect(result.wasCreated).toBe(false);
      expect(result.skippedReason).toContain(
        'did not include a CTA suggestion',
      );
    });

    it('should skip CTA when cooldown is active', async () => {
      const riskFactors: RiskFactor[] = [];
      const prediction = {
        predictionType: 'CHURN' as const,
        probability: 0.72,
        confidence: 0.85,
        predictionWindowDays: 90,
        riskFactors,
        explanation: 'Test',
        recommendations: [],
        suggestedCTA: {
          type: 'RISK' as const,
          priority: 'HIGH' as const,
          title: 'Test CTA',
          reason: 'Test reason',
          dueDays: 7,
        },
        llmMetadata: {
          model: 'gpt-4',
          tokensUsed: 1000,
          latencyMs: 2000,
          estimatedCost: 0.02,
        },
      };

      // Mock existing recent CTA (cooldown active)
      (prisma.cTA.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 100,
        type: 'RISK',
        createdAt: new Date(),
      });

      const result = await generateCTAFromPrediction(
        1,
        'test-tenant-ml',
        prediction,
        1,
      );

      expect(result.wasCreated).toBe(false);
      expect(result.skippedReason).toContain('cooldown');
    });

    it('should create CTA when all conditions are met', async () => {
      const riskFactors: RiskFactor[] = [
        {
          factor: 'Health Decline',
          impact: 'high' as const,
          currentValue: 45,
          trend: 'worsening' as const,
          description: 'Test',
        },
      ];
      const prediction = {
        predictionType: 'CHURN' as const,
        probability: 0.72,
        confidence: 0.85,
        predictionWindowDays: 90,
        riskFactors,
        explanation: 'Test explanation',
        recommendations: [
          {
            action: 'Test action',
            priority: 'high' as const,
            timeframe: '1 week',
            expectedImpact: 'Reduce churn',
            rationale: 'Test',
            effort: 'medium' as const,
          },
        ],
        suggestedCTA: {
          type: 'RISK' as const,
          priority: 'HIGH' as const,
          title: 'Address churn risk',
          reason: 'High churn probability detected',
          dueDays: 5,
        },
        llmMetadata: {
          model: 'gpt-4',
          tokensUsed: 1000,
          latencyMs: 2000,
          estimatedCost: 0.02,
        },
      };

      // Mock no cooldown (no recent CTA)
      (prisma.cTA.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(null) // cooldown check
        .mockResolvedValueOnce(null); // similar CTA check

      // Mock playbook search
      (prisma.playbook.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );

      // Mock CTA creation
      const mockCTA = {
        id: 200,
        type: 'RISK',
        priority: 'HIGH',
        title: 'Address churn risk',
      };
      (createAccountCTA as ReturnType<typeof vi.fn>).mockResolvedValue(mockCTA);

      const result = await generateCTAFromPrediction(
        1,
        'test-tenant-ml',
        prediction,
        1,
        42,
      );

      expect(result.wasCreated).toBe(true);
      expect(createAccountCTA).toHaveBeenCalled();
    });
  });

  describe('generateChurnCTA', () => {
    it('should skip CTA for low-risk accounts', async () => {
      const riskFactors: RiskFactor[] = [];
      const churnPrediction = {
        predictionType: 'CHURN' as const,
        probability: 0.25,
        confidence: 0.8,
        predictionWindowDays: 90,
        churnProbability: 0.25,
        retentionProbability: 0.75,
        riskCategory: 'low' as const,
        primaryChurnDrivers: [],
        interventionUrgency: 'monitor' as const,
        riskFactors,
        explanation: 'Low risk',
        recommendations: [],
        llmMetadata: {
          model: 'gpt-4',
          tokensUsed: 1000,
          latencyMs: 2000,
          estimatedCost: 0.02,
        },
      };

      const result = await generateChurnCTA(
        1,
        'test-tenant-ml',
        churnPrediction,
        1,
      );

      expect(result.wasCreated).toBe(false);
      expect(result.skippedReason).toContain('does not warrant CTA');
    });

    it('should generate CTA for high-risk accounts', async () => {
      const riskFactors: RiskFactor[] = [
        {
          factor: 'Health',
          impact: 'high' as const,
          currentValue: 35,
          trend: 'worsening' as const,
          description: 'Declining',
        },
      ];
      const churnPrediction = {
        predictionType: 'CHURN' as const,
        probability: 0.75,
        confidence: 0.85,
        predictionWindowDays: 90,
        churnProbability: 0.75,
        retentionProbability: 0.25,
        riskCategory: 'high' as const,
        primaryChurnDrivers: ['Health decline', 'Low engagement'],
        interventionUrgency: 'this_week' as const,
        riskFactors,
        explanation: 'High risk detected',
        recommendations: [],
        llmMetadata: {
          model: 'gpt-4',
          tokensUsed: 1000,
          latencyMs: 2000,
          estimatedCost: 0.02,
        },
      };

      // Mock no cooldown
      (prisma.cTA.findFirst as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      (prisma.playbook.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );

      const mockCTA = { id: 201, type: 'RISK', priority: 'HIGH' };
      (createAccountCTA as ReturnType<typeof vi.fn>).mockResolvedValue(mockCTA);

      const result = await generateChurnCTA(
        1,
        'test-tenant-ml',
        churnPrediction,
        1,
      );

      expect(result.wasCreated).toBe(true);
    });
  });

  describe('getMLCTAStats', () => {
    it('should return CTA statistics', async () => {
      (prisma.cTA.count as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(20) // open
        .mockResolvedValueOnce(25); // completed

      (prisma.cTA.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
        { type: 'RISK', _count: 30 },
        { type: 'RENEWAL', _count: 15 },
        { type: 'ONBOARDING', _count: 5 },
      ]);

      (prisma.cTA.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          createdAt: new Date(Date.now() - 86400000 * 5),
          completedAt: new Date(),
        },
        {
          createdAt: new Date(Date.now() - 86400000 * 10),
          completedAt: new Date(),
        },
      ]);

      const stats = await getMLCTAStats('test-tenant-ml');

      expect(stats.totalGenerated).toBe(50);
      expect(stats.openCount).toBe(20);
      expect(stats.completedCount).toBe(25);
      expect(stats.completionRate).toBe(0.5);
      expect(stats.byType['RISK']).toBe(30);
    });
  });

  // ==========================================================================
  // Validation and Accuracy Tests
  // ==========================================================================

  describe('validateExpiredPredictions', () => {
    it('should validate expired predictions', async () => {
      const mockExpiredPredictions = [
        {
          id: 1,
          predictionType: 'CHURN',
          probability: 0.75,
          account: { archived: true, healthScore: 40, churnRisk: 0.8 },
        },
        {
          id: 2,
          predictionType: 'CHURN',
          probability: 0.3,
          account: { archived: false, healthScore: 80, churnRisk: 0.1 },
        },
      ];

      (
        prisma.accountMLPrediction.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockExpiredPredictions);
      (
        prisma.accountMLPrediction.update as ReturnType<typeof vi.fn>
      ).mockResolvedValue({});

      const result = await validateExpiredPredictions('test-tenant-ml');

      expect(result.validated).toBe(2);
      expect(prisma.accountMLPrediction.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('getPredictionAccuracy', () => {
    it('should calculate prediction accuracy metrics', async () => {
      (
        prisma.accountMLPrediction.count as ReturnType<typeof vi.fn>
      ).mockResolvedValue(100);
      (
        prisma.accountMLPrediction.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([
        { predictionType: 'CHURN', wasAccurate: true },
        { predictionType: 'CHURN', wasAccurate: true },
        { predictionType: 'CHURN', wasAccurate: false },
        { predictionType: 'HEALTH_TREND', wasAccurate: true },
      ]);

      const accuracy = await getPredictionAccuracy('test-tenant-ml');

      expect(accuracy.totalPredictions).toBe(100);
      expect(accuracy.validatedCount).toBe(4);
      expect(accuracy.accurateCount).toBe(3);
      expect(accuracy.accuracy).toBe(0.75);
      expect(accuracy.byType['CHURN'].accurate).toBe(2);
    });
  });

  // ==========================================================================
  // Utility Function Tests
  // ==========================================================================

  describe('isMLAvailable', () => {
    it('should return AI availability status', () => {
      (aiClient.isAIAvailable as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );
      expect(isMLAvailable()).toBe(true);

      (aiClient.isAIAvailable as ReturnType<typeof vi.fn>).mockReturnValue(
        false,
      );
      expect(isMLAvailable()).toBe(false);
    });
  });

  describe('getMLConfig', () => {
    it('should return ML configuration', () => {
      const config = getMLConfig();

      expect(config.defaultPredictionWindowDays).toBe(90);
      expect(config.predictionValidityDays).toBe(30);
      expect(config.churnRiskThresholds).toBeDefined();
      expect(config.churnRiskThresholds.critical).toBe(0.8);
    });
  });

  describe('linkCTAToPrediction', () => {
    it('should link CTA to prediction', async () => {
      (
        prisma.accountMLPrediction.update as ReturnType<typeof vi.fn>
      ).mockResolvedValue({});

      await linkCTAToPrediction(42, 200);

      expect(prisma.accountMLPrediction.update).toHaveBeenCalledWith({
        where: { id: 42 },
        data: { generatedCtaId: 200 },
      });
    });
  });

  describe('getHighRiskAccounts', () => {
    it('should return high-risk accounts', async () => {
      const mockPredictions = [
        {
          id: 1,
          probability: 0.85,
          confidence: 0.9,
          explanation: 'Critical risk',
          predictedAt: new Date(),
          account: {
            id: 100,
            name: 'High Risk Co',
            type: 'CUSTOMER',
            healthScore: 35,
            archived: false,
          },
        },
        {
          id: 2,
          probability: 0.72,
          confidence: 0.82,
          explanation: 'High risk',
          predictedAt: new Date(),
          account: {
            id: 101,
            name: 'At Risk Inc',
            type: 'CUSTOMER',
            healthScore: 45,
            archived: false,
          },
        },
      ];

      (
        prisma.accountMLPrediction.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockPredictions);

      const accounts = await getHighRiskAccounts('test-tenant-ml', 0.6, 10);

      expect(accounts).toHaveLength(2);
      expect(accounts[0].account.name).toBe('High Risk Co');
      expect(accounts[0].prediction.probability).toBe(0.85);
    });

    it('should filter out archived accounts', async () => {
      const mockPredictions = [
        {
          id: 1,
          probability: 0.85,
          confidence: 0.9,
          explanation: 'Critical risk',
          predictedAt: new Date(),
          account: {
            id: 100,
            name: 'Archived Co',
            type: 'CUSTOMER',
            healthScore: 35,
            archived: true,
          },
        },
        {
          id: 2,
          probability: 0.72,
          confidence: 0.82,
          explanation: 'High risk',
          predictedAt: new Date(),
          account: {
            id: 101,
            name: 'Active Co',
            type: 'CUSTOMER',
            healthScore: 45,
            archived: false,
          },
        },
      ];

      (
        prisma.accountMLPrediction.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockPredictions);

      const accounts = await getHighRiskAccounts('test-tenant-ml', 0.6, 10);

      expect(accounts).toHaveLength(1);
      expect(accounts[0].account.name).toBe('Active Co');
    });
  });
});
