/**
 * Customer Success ML Prediction Service
 *
 * Core orchestration service for ML-powered predictions in Customer Success.
 * Gathers account context, calls LLM for predictions, stores results,
 * and tracks prediction accuracy.
 *
 * @module customer-success-ml/services/cs-ml-prediction
 */

import prisma from '../../../prisma/client';
// These imports are prepared for full LLM integration (currently using rule-based fallback)
import {
  getTenantId as _getTenantId,
  hasTenantContext as _hasTenantContext,
} from '../../../tenant/tenant.context';
import {
  jsonPrompt as _jsonPrompt,
  isAIAvailable,
} from '../../ai-monitoring/ai-client';
import {
  CS_ML_SYSTEM_PROMPT as _CS_ML_SYSTEM_PROMPT,
  formatAccountContext as _formatAccountContext,
  formatHealthHistory as _formatHealthHistory,
  formatActivities as _formatActivities,
  formatOpenCTAs as _formatOpenCTAs,
  formatEngagementMetrics as _formatEngagementMetrics,
} from '../prompts/cs-ml-prompts';
import type {
  AccountMLContext,
  HealthScoreSnapshot,
  ActivityRecord,
  OpenCTARecord,
  OpportunityRecord,
  CRMMetrics,
  MLPredictionResult,
  PredictionOptions as _PredictionOptions,
  ListPredictionsOptions,
  PredictionAccuracyMetrics,
  LLMMetadata as _LLMMetadata,
  DEFAULT_ML_CONFIG as _DEFAULT_ML_CONFIG,
} from '../types';
import type { MLPredictionType, MLPredictionStatus } from '@prisma/client';

// ============================================================================
// Configuration
// ============================================================================

/**
 * ML prediction configuration
 */
const ML_CONFIG = {
  defaultPredictionWindowDays: 90,
  predictionValidityDays: 30,
  maxPredictionsPerDay: 100,
  minConfidenceThreshold: 0.5,
  ctaCooldownDays: 7,
  churnRiskThresholds: {
    critical: 0.8,
    high: 0.6,
    medium: 0.3,
    low: 0,
  },
};

// ============================================================================
// Context Gathering
// ============================================================================

/**
 * Gather complete account context for ML analysis.
 *
 * Collects data from multiple sources:
 * - Account basic info and current health
 * - Health score history (last 90 days)
 * - Recent CRM activities (last 30 days)
 * - Open CTAs
 * - Active opportunities
 * - Engagement metrics
 *
 * @param accountId - Account to gather context for
 * @param tenantId - Tenant context
 * @returns Complete account context for ML analysis
 *
 * @throws Error if account not found
 */
export async function gatherAccountContext(
  accountId: number,
  _tenantId: string,
): Promise<AccountMLContext> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Fetch all data in parallel
  const [account, healthHistory, recentActivities, openCTAs, opportunities] =
    await Promise.all([
      // Account with current health
      prisma.account.findUnique({
        where: { id: accountId },
        select: {
          id: true,
          name: true,
          type: true,
          healthScore: true,
          engagementScore: true,
          churnRisk: true,
          createdAt: true,
        },
      }),

      // Health score history
      prisma.accountHealthScoreHistory.findMany({
        where: {
          accountId,
          calculatedAt: { gte: ninetyDaysAgo },
        },
        select: {
          overallScore: true,
          calculatedAt: true,
          usageScore: true,
          supportScore: true,
          engagementScore: true,
          sentimentScore: true,
          scoreTrend: true,
          churnRisk: true,
        },
        orderBy: { calculatedAt: 'desc' },
        take: 30,
      }),

      // Recent activities
      prisma.cRMActivity.findMany({
        where: {
          accountId,
          createdAt: { gte: thirtyDaysAgo },
        },
        select: {
          type: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),

      // Open CTAs
      prisma.cTA.findMany({
        where: {
          accountId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
        select: {
          type: true,
          priority: true,
          status: true,
          dueDate: true,
        },
      }),

      // Active opportunities
      prisma.opportunity.findMany({
        where: {
          accountId,
          stage: { type: { notIn: ['WON', 'LOST'] } },
        },
        select: {
          stage: { select: { name: true } },
          amount: true,
          probability: true,
        },
      }),
    ]);

  if (!account) {
    throw new Error(`Account ${accountId} not found`);
  }

  // Calculate CRM metrics
  const crmMetrics = await calculateCRMMetrics(accountId, recentActivities);

  return {
    account: {
      id: account.id,
      name: account.name,
      type: account.type,
      healthScore: account.healthScore,
      engagementScore: account.engagementScore,
      churnRisk: account.churnRisk,
      createdAt: account.createdAt,
    },
    healthHistory: healthHistory as HealthScoreSnapshot[],
    recentActivities: recentActivities as ActivityRecord[],
    openCTAs: openCTAs.map((cta) => ({
      type: cta.type,
      priority: cta.priority,
      status: cta.status,
      dueDate: cta.dueDate,
    })) as OpenCTARecord[],
    opportunities: opportunities.map((opp) => ({
      stage: opp.stage?.name ?? 'Unknown',
      value: opp.amount?.toNumber() ?? null,
      probability: opp.probability,
    })) as OpportunityRecord[],
    crmMetrics,
  };
}

/**
 * Calculate CRM engagement metrics from activities
 */
async function calculateCRMMetrics(
  accountId: number,
  recentActivities: Array<{ type: string; createdAt: Date }>,
): Promise<CRMMetrics> {
  // Get last activity date
  const lastActivity = await prisma.cRMActivity.findFirst({
    where: { accountId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });

  const daysSinceLastActivity = lastActivity
    ? Math.floor(
        (Date.now() - lastActivity.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      )
    : 999;

  // Count by type
  const meetingsLast30Days = recentActivities.filter(
    (a) => a.type === 'MEETING',
  ).length;
  const emailsLast30Days = recentActivities.filter(
    (a) => a.type === 'EMAIL',
  ).length;

  return {
    daysSinceLastActivity,
    activitiesLast30Days: recentActivities.length,
    meetingsLast30Days,
    emailsLast30Days,
  };
}

// ============================================================================
// Prediction Storage
// ============================================================================

/**
 * Store a prediction in the database.
 *
 * @param accountId - Account the prediction is for
 * @param tenantId - Tenant context
 * @param result - ML prediction result
 * @returns Created prediction record
 */
export async function storePrediction(
  accountId: number,
  tenantId: string,
  result: MLPredictionResult,
): Promise<{ id: number }> {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + ML_CONFIG.predictionValidityDays);

  const prediction = await prisma.accountMLPrediction.create({
    data: {
      tenantId,
      accountId,
      predictionType: result.predictionType,
      probability: result.probability,
      confidence: result.confidence,
      predictionWindow: result.predictionWindowDays,
      riskFactors: result.riskFactors as object,
      explanation: result.explanation,
      recommendations: result.recommendations as object,
      validUntil,
      llmModel: result.llmMetadata.model,
      llmTokensUsed: result.llmMetadata.tokensUsed,
      llmCost: result.llmMetadata.estimatedCost,
    },
    select: { id: true },
  });

  return prediction;
}

/**
 * Get the most recent prediction of a type for an account
 */
export async function getLatestPrediction(
  accountId: number,
  predictionType: MLPredictionType,
  includeExpired: boolean = false,
): Promise<{
  id: number;
  probability: number;
  confidence: number;
  riskFactors: object;
  explanation: string | null;
  recommendations: object | null;
  predictedAt: Date;
  validUntil: Date;
  status: MLPredictionStatus;
} | null> {
  const now = new Date();

  const prediction = await prisma.accountMLPrediction.findFirst({
    where: {
      accountId,
      predictionType,
      ...(!includeExpired && { validUntil: { gte: now }, status: 'ACTIVE' }),
    },
    orderBy: { predictedAt: 'desc' },
    select: {
      id: true,
      probability: true,
      confidence: true,
      riskFactors: true,
      explanation: true,
      recommendations: true,
      predictedAt: true,
      validUntil: true,
      status: true,
    },
  });

  return prediction as {
    id: number;
    probability: number;
    confidence: number;
    riskFactors: object;
    explanation: string | null;
    recommendations: object | null;
    predictedAt: Date;
    validUntil: Date;
    status: MLPredictionStatus;
  } | null;
}

/**
 * List predictions for an account
 */
export async function listAccountPredictions(
  accountId: number,
  options: ListPredictionsOptions = {},
): Promise<
  Array<{
    id: number;
    predictionType: MLPredictionType;
    probability: number;
    confidence: number;
    explanation: string | null;
    predictedAt: Date;
    validUntil: Date;
    status: MLPredictionStatus;
    wasAccurate: boolean | null;
  }>
> {
  const now = new Date();

  const predictions = await prisma.accountMLPrediction.findMany({
    where: {
      accountId,
      ...(options.type && { predictionType: options.type }),
      ...(!options.includeExpired && {
        OR: [{ validUntil: { gte: now } }, { status: 'VALIDATED' }],
      }),
    },
    select: {
      id: true,
      predictionType: true,
      probability: true,
      confidence: true,
      explanation: true,
      predictedAt: true,
      validUntil: true,
      status: true,
      wasAccurate: true,
    },
    orderBy: { predictedAt: 'desc' },
    take: 50,
  });

  return predictions;
}

// ============================================================================
// Prediction Validation
// ============================================================================

/**
 * Validate expired predictions against actual outcomes.
 *
 * This marks predictions as VALIDATED and records whether they were accurate.
 * Called periodically to track prediction accuracy over time.
 *
 * @param tenantId - Tenant context
 * @returns Number of predictions validated
 */
export async function validateExpiredPredictions(
  tenantId: string,
): Promise<{ validated: number }> {
  const now = new Date();

  // Find expired but unvalidated predictions
  const expiredPredictions = await prisma.accountMLPrediction.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      validUntil: { lt: now },
    },
    include: {
      account: {
        select: {
          archived: true,
          healthScore: true,
          churnRisk: true,
        },
      },
    },
  });

  let validated = 0;

  for (const prediction of expiredPredictions) {
    // Determine actual outcome based on prediction type
    let actualOutcome: boolean | null = null;
    let wasAccurate: boolean | null = null;

    if (prediction.predictionType === 'CHURN') {
      // Account is archived = churned
      actualOutcome = prediction.account.archived;
      // Prediction was accurate if high probability and churned, or low probability and retained
      if (actualOutcome !== null) {
        const predictedChurn = prediction.probability >= 0.5;
        wasAccurate = predictedChurn === actualOutcome;
      }
    } else if (prediction.predictionType === 'HEALTH_TREND') {
      // Compare predicted trend to actual health score change
      const currentScore = prediction.account.healthScore;
      if (currentScore !== null) {
        // Simplified: if probability was high (>0.6), we predicted decline
        const predictedDecline = prediction.probability > 0.6;
        // Check if health actually declined (using churn risk as proxy)
        const actualDecline = (prediction.account.churnRisk ?? 0) > 0.5;
        wasAccurate = predictedDecline === actualDecline;
        actualOutcome = actualDecline;
      }
    }

    // Update prediction with validation results
    await prisma.accountMLPrediction.update({
      where: { id: prediction.id },
      data: {
        status: 'VALIDATED',
        validatedAt: now,
        actualOutcome,
        wasAccurate,
      },
    });

    validated++;
  }

  return { validated };
}

/**
 * Get prediction accuracy metrics for a tenant
 */
export async function getPredictionAccuracy(
  tenantId: string,
  predictionType?: MLPredictionType,
): Promise<PredictionAccuracyMetrics> {
  const where = {
    tenantId,
    status: 'VALIDATED' as MLPredictionStatus,
    ...(predictionType && { predictionType }),
  };

  // Get aggregated counts
  const [totalPredictions, validatedPredictions] = await Promise.all([
    prisma.accountMLPrediction.count({
      where: { tenantId, ...(predictionType && { predictionType }) },
    }),
    prisma.accountMLPrediction.findMany({
      where,
      select: {
        predictionType: true,
        wasAccurate: true,
      },
    }),
  ]);

  // Calculate accuracy by type
  const byType: Record<string, { total: number; accurate: number }> = {};

  for (const pred of validatedPredictions) {
    if (!byType[pred.predictionType]) {
      byType[pred.predictionType] = { total: 0, accurate: 0 };
    }
    byType[pred.predictionType].total++;
    if (pred.wasAccurate) {
      byType[pred.predictionType].accurate++;
    }
  }

  const validatedCount = validatedPredictions.length;
  const accurateCount = validatedPredictions.filter(
    (p) => p.wasAccurate,
  ).length;
  const accuracy = validatedCount > 0 ? accurateCount / validatedCount : 0;

  return {
    totalPredictions,
    validatedCount,
    accurateCount,
    accuracy,
    byType,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a recent prediction exists and is still valid
 */
export async function hasRecentPrediction(
  accountId: number,
  predictionType: MLPredictionType,
  maxAgeDays: number = 7,
): Promise<boolean> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);

  const count = await prisma.accountMLPrediction.count({
    where: {
      accountId,
      predictionType,
      predictedAt: { gte: cutoff },
      status: 'ACTIVE',
    },
  });

  return count > 0;
}

/**
 * Check if AI/LLM is available for predictions
 */
export function isMLAvailable(): boolean {
  return isAIAvailable();
}

/**
 * Get ML configuration
 */
export function getMLConfig() {
  return { ...ML_CONFIG };
}

/**
 * Link a generated CTA to its source prediction
 */
export async function linkCTAToPrediction(
  predictionId: number,
  ctaId: number,
): Promise<void> {
  await prisma.accountMLPrediction.update({
    where: { id: predictionId },
    data: { generatedCtaId: ctaId },
  });
}

/**
 * Get high-risk accounts based on ML predictions
 */
export async function getHighRiskAccounts(
  tenantId: string,
  minProbability: number = 0.6,
  limit: number = 50,
): Promise<
  Array<{
    account: {
      id: number;
      name: string;
      type: string;
      healthScore: number | null;
    };
    prediction: {
      id: number;
      probability: number;
      confidence: number;
      explanation: string | null;
      predictedAt: Date;
    };
  }>
> {
  const now = new Date();

  const predictions = await prisma.accountMLPrediction.findMany({
    where: {
      tenantId,
      predictionType: 'CHURN',
      status: 'ACTIVE',
      validUntil: { gte: now },
      probability: { gte: minProbability },
    },
    include: {
      account: {
        select: {
          id: true,
          name: true,
          type: true,
          healthScore: true,
          archived: true,
        },
      },
    },
    orderBy: { probability: 'desc' },
    take: limit,
  });

  // Filter out archived accounts and format response
  return predictions
    .filter((p) => !p.account.archived)
    .map((p) => ({
      account: {
        id: p.account.id,
        name: p.account.name,
        type: p.account.type,
        healthScore: p.account.healthScore,
      },
      prediction: {
        id: p.id,
        probability: p.probability,
        confidence: p.confidence,
        explanation: p.explanation,
        predictedAt: p.predictedAt,
      },
    }));
}

/**
 * Expire old predictions that are past their validity period
 */
export async function expireOldPredictions(tenantId: string): Promise<number> {
  const now = new Date();

  const result = await prisma.accountMLPrediction.updateMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      validUntil: { lt: now },
    },
    data: {
      status: 'EXPIRED',
    },
  });

  return result.count;
}
