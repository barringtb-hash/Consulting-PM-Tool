/**
 * Lead ML Services Unit Tests
 *
 * Tests for ML-powered lead scoring, conversion prediction, and priority ranking.
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
    scoredLead: {
      findUnique: vi.fn(),
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
      updateMany: vi.fn(),
    },
    leadMLModel: {
      findFirst: vi.fn(),
    },
    leadTrainingData: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
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
import * as aiClient from '../src/modules/ai-monitoring/ai-client';
import {
  extractDemographicFeatures,
  extractBehavioralFeatures,
  extractTemporalFeatures,
  extractEngagementFeatures,
  extractLeadFeatures,
} from '../src/modules/lead-ml/services/lead-feature-extraction.service';
import {
  calculateConversionProbability,
  predictConversionRuleBased,
  predictTimeToCloseRuleBased,
  predictScoreRuleBased,
  getRiskCategory,
} from '../src/modules/lead-ml/services/lead-rule-based-prediction.service';
import type { LeadMLContext, LeadFeatures } from '../src/modules/lead-ml/types';

describe('Lead ML Services', () => {
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
  // Feature Extraction Tests
  // ==========================================================================

  describe('extractDemographicFeatures', () => {
    it('should extract features from lead with full profile', () => {
      const lead = {
        email: 'john@acmecorp.com',
        name: 'John Smith',
        company: 'ACME Corp',
        title: 'VP of Engineering',
        phone: '555-1234',
      };

      const features = extractDemographicFeatures(lead);

      expect(features.hasCompany).toBe(true);
      expect(features.hasTitle).toBe(true);
      expect(features.hasPhone).toBe(true);
      expect(features.emailDomainType).toBe('corporate');
      expect(features.titleSeniority).toBe('vp');
      expect(features.emailDomain).toBe('acmecorp.com');
    });

    it('should identify free email domains', () => {
      const lead = {
        email: 'john@gmail.com',
        name: null,
        company: null,
        title: null,
        phone: null,
      };

      const features = extractDemographicFeatures(lead);

      expect(features.emailDomainType).toBe('free');
      expect(features.hasCompany).toBe(false);
      expect(features.hasTitle).toBe(false);
    });

    it('should identify title seniority levels', () => {
      const testCases = [
        { title: 'CEO', expected: 'c_level' },
        { title: 'Chief Technology Officer', expected: 'c_level' },
        { title: 'VP Sales', expected: 'vp' },
        { title: 'Director of Marketing', expected: 'director' },
        { title: 'Engineering Manager', expected: 'manager' },
        { title: 'Senior Developer', expected: 'individual' },
        { title: null, expected: 'unknown' },
      ];

      for (const { title, expected } of testCases) {
        const lead = {
          email: 'test@corp.com',
          name: 'Test',
          company: 'Test Co',
          title,
          phone: null,
        };
        const features = extractDemographicFeatures(lead);
        expect(features.titleSeniority).toBe(expected);
      }
    });
  });

  describe('extractBehavioralFeatures', () => {
    it('should calculate behavioral features from activities', () => {
      const activities = [
        { activityType: 'EMAIL_OPEN', createdAt: new Date() },
        { activityType: 'EMAIL_OPEN', createdAt: new Date() },
        { activityType: 'EMAIL_CLICK', createdAt: new Date() },
        { activityType: 'PAGE_VIEW', createdAt: new Date() },
        { activityType: 'FORM_SUBMIT', createdAt: new Date() },
        { activityType: 'MEETING', createdAt: new Date() },
        { activityType: 'CALL', createdAt: new Date() },
      ];

      const features = extractBehavioralFeatures(activities, 30);

      expect(features.emailOpenCount).toBe(2);
      expect(features.emailClickCount).toBe(1);
      expect(features.pageViewCount).toBe(1);
      expect(features.formSubmitCount).toBe(1);
      expect(features.meetingCount).toBe(1);
      expect(features.callCount).toBe(1);
      expect(features.totalActivities).toBe(7);
      expect(features.channelDiversity).toBeGreaterThan(0);
      expect(features.highValueActionCount).toBe(3); // form_submit + email_click + meeting
    });

    it('should calculate activity velocity', () => {
      const now = new Date();
      const activities = Array(10)
        .fill(null)
        .map((_, i) => ({
          activityType: 'EMAIL_OPEN',
          createdAt: new Date(now.getTime() - i * 86400000), // 1 day apart
        }));

      const features = extractBehavioralFeatures(activities, 10);

      expect(features.activityVelocity).toBeGreaterThan(0);
      expect(features.totalActivities).toBe(10);
    });

    it('should handle empty activities', () => {
      const features = extractBehavioralFeatures([], 1);

      expect(features.emailOpenCount).toBe(0);
      expect(features.totalActivities).toBe(0);
      expect(features.activityVelocity).toBe(0);
      expect(features.channelDiversity).toBe(0);
    });
  });

  describe('extractTemporalFeatures', () => {
    it('should calculate temporal features', () => {
      const lead = {
        createdAt: new Date(Date.now() - 30 * 86400000), // 30 days ago
      };
      const lastEngagementAt = new Date(Date.now() - 2 * 86400000); // 2 days ago
      const activities = [
        { createdAt: new Date() },
        { createdAt: new Date() },
        { createdAt: new Date() },
      ];

      const features = extractTemporalFeatures(
        lead,
        activities,
        lastEngagementAt,
      );

      expect(features.daysSinceCreated).toBeCloseTo(30, 0);
      expect(features.daysSinceLastActivity).toBeCloseTo(2, 0);
      expect(features.recencyScore).toBeGreaterThan(0);
      expect(features.leadAgeWeeks).toBeCloseTo(4, 0);
    });

    it('should detect activity burst', () => {
      const now = new Date();
      const lead = {
        createdAt: new Date(now.getTime() - 7 * 86400000),
      };
      // 4 activities in last 24 hours = burst
      const activities = Array(4)
        .fill(null)
        .map((_, i) => ({
          createdAt: new Date(now.getTime() - i * 3600000), // 1 hour apart
        }));

      const features = extractTemporalFeatures(lead, activities, now);

      expect(features.activityBurst).toBe(true);
    });
  });

  describe('extractEngagementFeatures', () => {
    it('should calculate engagement features', () => {
      const lead = {
        totalEmailsSent: 2,
        totalEmailsOpened: 1,
        totalEmailsClicked: 1,
        totalWebsiteVisits: 5,
        currentSequenceId: 1,
        sequenceStepIndex: 1, // 0-indexed, step 2
      };
      const enrollment = {
        isEnrolled: true,
        totalSteps: 3,
      };

      const features = extractEngagementFeatures(lead, enrollment);

      expect(features.emailOpenRate).toBe(0.5); // 1 open / 2 sends
      expect(features.emailClickRate).toBe(1); // 1 click / 1 open
      expect(features.isInActiveSequence).toBe(true);
      expect(features.currentSequenceStep).toBe(1);
      expect(features.sequenceEngagement).toBeGreaterThan(0);
    });

    it('should handle no enrollment', () => {
      const lead = {
        totalEmailsSent: 0,
        totalEmailsOpened: 0,
        totalEmailsClicked: 0,
        totalWebsiteVisits: 0,
        currentSequenceId: null,
        sequenceStepIndex: null,
      };

      const features = extractEngagementFeatures(lead, null);

      expect(features.isInActiveSequence).toBe(false);
      expect(features.currentSequenceStep).toBeNull();
      expect(features.sequenceEngagement).toBe(0);
    });
  });

  describe('extractLeadFeatures', () => {
    it('should extract all features for a lead', async () => {
      const mockLead = {
        id: 1,
        email: 'john@acmecorp.com',
        name: 'John Smith',
        company: 'ACME Corp',
        title: 'VP Engineering',
        phone: '555-1234',
        createdAt: new Date(Date.now() - 14 * 86400000),
        lastEngagementAt: new Date(Date.now() - 86400000),
      };

      const mockActivities = [
        { type: 'EMAIL_OPEN', createdAt: new Date() },
        { type: 'EMAIL_CLICK', createdAt: new Date() },
        { type: 'MEETING', createdAt: new Date() },
      ];

      (
        prisma.scoredLead.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockLead);
      (
        prisma.leadActivity.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockActivities);
      (
        prisma.nurtureSequenceEnrollment.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);

      const features = await extractLeadFeatures(1);

      expect(features.demographic).toBeDefined();
      expect(features.behavioral).toBeDefined();
      expect(features.temporal).toBeDefined();
      expect(features.engagement).toBeDefined();
      expect(features.demographic.hasCompany).toBe(true);
      expect(features.demographic.titleSeniority).toBe('vp');
    });

    it('should throw error when lead not found', async () => {
      (
        prisma.scoredLead.findUnique as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);

      await expect(extractLeadFeatures(999)).rejects.toThrow(
        'Lead not found: 999',
      );
    });
  });

  // ==========================================================================
  // Rule-Based Prediction Tests
  // ==========================================================================

  describe('calculateConversionProbability', () => {
    it('should calculate high probability for hot leads', () => {
      const features: LeadFeatures = {
        demographic: {
          hasCompany: true,
          hasTitle: true,
          hasPhone: true,
          emailDomainType: 'corporate',
          titleSeniority: 'c_level',
          companySizeEstimate: 'medium',
          emailDomain: 'acme.com',
        },
        behavioral: {
          emailOpenCount: 10,
          emailClickCount: 5,
          pageViewCount: 20,
          formSubmitCount: 3,
          meetingCount: 2,
          callCount: 1,
          activityVelocity: 2.5,
          channelDiversity: 5,
          highValueActionCount: 6,
          totalActivities: 40,
        },
        temporal: {
          daysSinceCreated: 14,
          daysSinceLastActivity: 1,
          recencyScore: 0.95,
          activityBurst: true,
          dayPattern: 'weekday',
          timePattern: 'business_hours',
          leadAgeWeeks: 2,
        },
        engagement: {
          totalEngagementScore: 85,
          emailOpenRate: 0.8,
          emailClickRate: 0.4,
          sequenceEngagement: 0.7,
          avgResponseTime: 3600,
          isInActiveSequence: true,
          currentSequenceStep: 3,
        },
      };

      const probability = calculateConversionProbability(features);

      expect(probability).toBeGreaterThan(0.6);
      expect(probability).toBeLessThanOrEqual(1.0);
    });

    it('should calculate low probability for cold leads', () => {
      const features: LeadFeatures = {
        demographic: {
          hasCompany: false,
          hasTitle: false,
          hasPhone: false,
          emailDomainType: 'free',
          titleSeniority: 'unknown',
          companySizeEstimate: 'unknown',
          emailDomain: 'gmail.com',
        },
        behavioral: {
          emailOpenCount: 1,
          emailClickCount: 0,
          pageViewCount: 0,
          formSubmitCount: 0,
          meetingCount: 0,
          callCount: 0,
          activityVelocity: 0.1,
          channelDiversity: 1,
          highValueActionCount: 0,
          totalActivities: 1,
        },
        temporal: {
          daysSinceCreated: 90,
          daysSinceLastActivity: 60,
          recencyScore: 0.1,
          activityBurst: false,
          dayPattern: 'weekend',
          timePattern: 'off_hours',
          leadAgeWeeks: 13,
        },
        engagement: {
          totalEngagementScore: 5,
          emailOpenRate: 0.1,
          emailClickRate: 0.0,
          sequenceEngagement: 0.0,
          avgResponseTime: null,
          isInActiveSequence: false,
          currentSequenceStep: null,
        },
      };

      const probability = calculateConversionProbability(features);

      expect(probability).toBeLessThan(0.3);
      expect(probability).toBeGreaterThanOrEqual(0.0);
    });
  });

  describe('predictConversionRuleBased', () => {
    it('should return conversion prediction with risk factors', () => {
      const context: LeadMLContext = {
        lead: {
          id: 1,
          email: 'john@acme.com',
          name: 'John',
          company: 'ACME',
          title: 'VP',
          score: 75,
          scoreLevel: 'HOT',
          pipelineStage: 'MQL',
          conversionProbability: null,
          createdAt: new Date(Date.now() - 14 * 86400000),
          lastEngagementAt: new Date(Date.now() - 86400000),
        },
        config: {
          id: 1,
          hotThreshold: 80,
          warmThreshold: 50,
          coldThreshold: 20,
        },
        features: {
          demographic: {
            hasCompany: true,
            hasTitle: true,
            hasPhone: true,
            emailDomainType: 'corporate',
            titleSeniority: 'vp',
            companySizeEstimate: 'medium',
            emailDomain: 'acme.com',
          },
          behavioral: {
            emailOpenCount: 8,
            emailClickCount: 4,
            pageViewCount: 15,
            formSubmitCount: 2,
            meetingCount: 1,
            callCount: 1,
            activityVelocity: 2.0,
            channelDiversity: 4,
            highValueActionCount: 4,
            totalActivities: 30,
          },
          temporal: {
            daysSinceCreated: 14,
            daysSinceLastActivity: 1,
            recencyScore: 0.9,
            activityBurst: false,
            dayPattern: 'weekday',
            timePattern: 'business_hours',
            leadAgeWeeks: 2,
          },
          engagement: {
            totalEngagementScore: 75,
            emailOpenRate: 0.7,
            emailClickRate: 0.35,
            sequenceEngagement: 0.6,
            avgResponseTime: 7200,
            isInActiveSequence: true,
            currentSequenceStep: 2,
          },
        },
        recentActivities: [],
        sequenceEnrollment: null,
      };

      const result = predictConversionRuleBased(context.features);

      expect(result.predictionType).toBe('CONVERSION');
      expect(result.probability).toBeGreaterThan(0);
      expect(result.probability).toBeLessThanOrEqual(1);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.riskFactors).toBeDefined();
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.llmMetadata.model).toBe('rule-based-fallback');
    });
  });

  describe('predictTimeToCloseRuleBased', () => {
    it('should estimate time to close based on features', () => {
      const context: LeadMLContext = {
        lead: {
          id: 1,
          email: 'test@corp.com',
          name: 'Test',
          company: 'Corp',
          title: 'Manager',
          score: 65,
          scoreLevel: 'WARM',
          pipelineStage: 'MQL',
          conversionProbability: 0.5,
          createdAt: new Date(Date.now() - 21 * 86400000),
          lastEngagementAt: new Date(Date.now() - 2 * 86400000),
        },
        config: {
          id: 1,
          hotThreshold: 80,
          warmThreshold: 50,
          coldThreshold: 20,
        },
        features: {
          demographic: {
            hasCompany: true,
            hasTitle: true,
            hasPhone: false,
            emailDomainType: 'corporate',
            titleSeniority: 'manager',
            companySizeEstimate: 'small',
            emailDomain: 'corp.com',
          },
          behavioral: {
            emailOpenCount: 5,
            emailClickCount: 2,
            pageViewCount: 8,
            formSubmitCount: 1,
            meetingCount: 0,
            callCount: 0,
            activityVelocity: 1.0,
            channelDiversity: 3,
            highValueActionCount: 1,
            totalActivities: 15,
          },
          temporal: {
            daysSinceCreated: 21,
            daysSinceLastActivity: 2,
            recencyScore: 0.7,
            activityBurst: false,
            dayPattern: 'weekday',
            timePattern: 'business_hours',
            leadAgeWeeks: 3,
          },
          engagement: {
            totalEngagementScore: 55,
            emailOpenRate: 0.5,
            emailClickRate: 0.2,
            sequenceEngagement: 0.4,
            avgResponseTime: 14400,
            isInActiveSequence: true,
            currentSequenceStep: 2,
          },
        },
        recentActivities: [],
        sequenceEnrollment: null,
      };

      const result = predictTimeToCloseRuleBased(context.features);

      expect(result.predictionType).toBe('TIME_TO_CLOSE');
      expect(result.predictedDays).toBeGreaterThan(0);
      expect(result.confidenceInterval).toBeDefined();
      expect(result.confidenceInterval.low).toBeLessThan(
        result.confidenceInterval.high,
      );
    });
  });

  describe('predictScoreRuleBased', () => {
    it('should predict score with breakdown', () => {
      const context: LeadMLContext = {
        lead: {
          id: 1,
          email: 'test@corp.com',
          name: 'Test User',
          company: 'Test Corp',
          title: 'Director',
          score: 70,
          scoreLevel: 'WARM',
          pipelineStage: 'MQL',
          conversionProbability: null,
          createdAt: new Date(Date.now() - 10 * 86400000),
          lastEngagementAt: new Date(),
        },
        config: {
          id: 1,
          hotThreshold: 80,
          warmThreshold: 50,
          coldThreshold: 20,
        },
        features: {
          demographic: {
            hasCompany: true,
            hasTitle: true,
            hasPhone: true,
            emailDomainType: 'corporate',
            titleSeniority: 'director',
            companySizeEstimate: 'medium',
            emailDomain: 'corp.com',
          },
          behavioral: {
            emailOpenCount: 6,
            emailClickCount: 3,
            pageViewCount: 10,
            formSubmitCount: 1,
            meetingCount: 1,
            callCount: 0,
            activityVelocity: 1.5,
            channelDiversity: 4,
            highValueActionCount: 2,
            totalActivities: 20,
          },
          temporal: {
            daysSinceCreated: 10,
            daysSinceLastActivity: 0,
            recencyScore: 1.0,
            activityBurst: false,
            dayPattern: 'weekday',
            timePattern: 'business_hours',
            leadAgeWeeks: 1,
          },
          engagement: {
            totalEngagementScore: 70,
            emailOpenRate: 0.6,
            emailClickRate: 0.3,
            sequenceEngagement: 0.5,
            avgResponseTime: 10800,
            isInActiveSequence: true,
            currentSequenceStep: 2,
          },
        },
        recentActivities: [],
        sequenceEnrollment: null,
      };

      const result = predictScoreRuleBased(context.features);

      expect(result.predictionType).toBe('SCORE');
      expect(result.predictedScore).toBeGreaterThan(0);
      expect(result.predictedScore).toBeLessThanOrEqual(100);
      expect(result.scoreBreakdown).toBeDefined();
      expect(result.scoreBreakdown.demographic).toBeGreaterThanOrEqual(0);
      expect(result.scoreBreakdown.behavioral).toBeGreaterThanOrEqual(0);
      expect(result.scoreBreakdown.temporal).toBeGreaterThanOrEqual(0);
      expect(result.scoreBreakdown.engagement).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getRiskCategory', () => {
    it('should categorize risk levels correctly', () => {
      expect(getRiskCategory(0.85)).toBe('critical');
      expect(getRiskCategory(0.7)).toBe('high');
      expect(getRiskCategory(0.5)).toBe('medium');
      expect(getRiskCategory(0.3)).toBe('low');
    });
  });

  // ==========================================================================
  // Utility Function Tests
  // ==========================================================================

  describe('AI availability', () => {
    it('should check AI availability', () => {
      (aiClient.isAIAvailable as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );
      expect(aiClient.isAIAvailable()).toBe(true);

      (aiClient.isAIAvailable as ReturnType<typeof vi.fn>).mockReturnValue(
        false,
      );
      expect(aiClient.isAIAvailable()).toBe(false);
    });
  });
});
