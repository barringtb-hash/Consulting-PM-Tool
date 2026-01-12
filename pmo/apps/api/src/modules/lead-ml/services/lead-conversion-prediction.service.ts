/**
 * Lead Conversion Prediction Service
 *
 * Provides ML-powered lead conversion predictions using a hybrid approach:
 * - Primary: LLM-based predictions (OpenAI GPT-4o-mini)
 * - Fallback: Rule-based predictions when LLM is unavailable
 *
 * @module lead-ml/services
 */

import { prisma } from '../../../prisma/client';
import { jsonPrompt, isAIAvailable } from '../../ai-monitoring/ai-client';
import { logger } from '../../../utils/logger';
import type {
  LeadPredictionType,
  Prisma,
  NurtureSequence,
} from '@prisma/client';

import { extractFeaturesFromContext } from './lead-feature-extraction.service';
import {
  predictConversionRuleBased,
  predictTimeToCloseRuleBased,
  predictScoreRuleBased,
} from './lead-rule-based-prediction.service';
import {
  LEAD_ML_SYSTEM_PROMPT,
  buildConversionPredictionPrompt,
} from '../prompts/lead-ml-prompts';
import type {
  LeadMLContext,
  LeadPredictionResult,
  ConversionPrediction,
  TimeToClosePrediction,
  ScorePrediction,
  GenerateLeadPredictionInput,
  BulkLeadPredictionInput,
  BulkLeadPredictionResult,
  ActivitySummary,
  LLMMetadata,
  LeadRiskFactor,
  LeadRecommendation,
} from '../types';

// ============================================================================
// Constants
// ============================================================================

const PREDICTION_VALIDITY_DAYS = 7;
const DEFAULT_MODEL = 'gpt-4o-mini';
const DEFAULT_TEMPERATURE = 0.3;
const MAX_TOKENS = 2000;

// ============================================================================
// Context Gathering
// ============================================================================

/**
 * Gather complete context for a lead with tenant isolation
 */
async function gatherLeadContext(
  leadId: number,
  tenantId: string,
): Promise<LeadMLContext> {
  const lead = await prisma.scoredLead.findFirst({
    where: {
      id: leadId,
      config: { tenantId },
    },
    include: {
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 100,
      },
      sequenceEnrollments: {
        where: { status: 'ACTIVE' },
        include: {
          sequence: {
            select: { id: true, name: true, steps: true },
          },
        },
        take: 1,
      },
    },
  });

  if (!lead) {
    throw new Error(`Lead not found or access denied: ${leadId}`);
  }

  // Extract features
  const enrollment = lead.sequenceEnrollments?.[0];
  const features = extractFeaturesFromContext(
    lead,
    lead.activities,
    enrollment
      ? { ...enrollment, sequence: enrollment.sequence as NurtureSequence }
      : null,
  );

  // Build activity summary
  const activitySummary: ActivitySummary[] = [];
  const activityCounts = new Map<
    string,
    { count: number; lastOccurred: Date | null }
  >();

  for (const activity of lead.activities) {
    const type = activity.activityType;
    const existing = activityCounts.get(type);
    if (existing) {
      existing.count++;
      if (activity.createdAt > (existing.lastOccurred || new Date(0))) {
        existing.lastOccurred = activity.createdAt;
      }
    } else {
      activityCounts.set(type, { count: 1, lastOccurred: activity.createdAt });
    }
  }

  activityCounts.forEach((data, type) => {
    activitySummary.push({
      type,
      count: data.count,
      lastOccurred: data.lastOccurred,
    });
  });

  // Parse score history
  const scoreHistory: LeadMLContext['scoreHistory'] = [];
  if (lead.scoreHistory && Array.isArray(lead.scoreHistory)) {
    for (const entry of lead.scoreHistory as Array<{
      score: number;
      level: string;
      scoredAt: string;
      reason?: string;
    }>) {
      scoreHistory.push({
        score: entry.score,
        level: entry.level,
        scoredAt: new Date(entry.scoredAt),
        reason: entry.reason || null,
      });
    }
  }

  // Get sequence info
  const activeEnrollment = lead.sequenceEnrollments?.[0];
  const sequenceInfo = activeEnrollment
    ? {
        isEnrolled: true,
        sequenceName: activeEnrollment.sequence.name,
        currentStep: lead.sequenceStepIndex,
        totalSteps: Array.isArray(activeEnrollment.sequence.steps)
          ? (activeEnrollment.sequence.steps as unknown[]).length
          : null,
      }
    : null;

  return {
    lead: {
      id: lead.id,
      email: lead.email,
      name: lead.name,
      company: lead.company,
      phone: lead.phone,
      title: lead.title,
      score: lead.score,
      scoreLevel: lead.scoreLevel,
      pipelineStage: lead.pipelineStage,
      pipelineValue: lead.pipelineValue ? Number(lead.pipelineValue) : null,
      createdAt: lead.createdAt,
    },
    engagement: {
      totalEmailsSent: lead.totalEmailsSent,
      totalEmailsOpened: lead.totalEmailsOpened,
      totalEmailsClicked: lead.totalEmailsClicked,
      totalWebsiteVisits: lead.totalWebsiteVisits,
      lastEngagementAt: lead.lastEngagementAt,
    },
    activitySummary,
    recentActivities: lead.activities.slice(0, 30).map((a) => ({
      type: a.activityType,
      createdAt: a.createdAt,
      data: a.activityData as Record<string, unknown> | null,
    })),
    features,
    scoreHistory,
    sequenceInfo,
  };
}

// ============================================================================
// LLM Prediction
// ============================================================================

/**
 * LLM response schema for conversion prediction
 */
interface LLMConversionResponse {
  conversionProbability: number;
  confidence: number;
  predictedScoreLevel: 'HOT' | 'WARM' | 'COLD' | 'DEAD';
  predictedDaysToClose: number | null;
  predictedValue: number | null;
  riskFactors: Array<{
    factor: string;
    impact: 'high' | 'medium' | 'low';
    currentValue: string | number;
    trend: 'improving' | 'stable' | 'declining';
    description: string;
  }>;
  explanation: string;
  recommendations: Array<{
    priority: 'urgent' | 'high' | 'medium' | 'low';
    action: string;
    rationale: string;
    expectedImpact: string;
    timeframe: string;
  }>;
}

/**
 * Generate conversion prediction using LLM
 */
async function predictConversionWithLLM(
  context: LeadMLContext,
  tenantId: string,
): Promise<{ prediction: ConversionPrediction; llmMetadata: LLMMetadata }> {
  const prompt = buildConversionPredictionPrompt(context);

  const startTime = Date.now();
  const result = await jsonPrompt<LLMConversionResponse>(prompt, {
    tenantId,
    toolId: 'lead-ml',
    operation: 'conversion-prediction',
    model: DEFAULT_MODEL,
    systemPrompt: LEAD_ML_SYSTEM_PROMPT,
    temperature: DEFAULT_TEMPERATURE,
    maxTokens: MAX_TOKENS,
    entityType: 'lead',
    entityId: String(context.lead.id),
  });

  const latencyMs = Date.now() - startTime;
  const data = result.data;

  return {
    prediction: {
      predictionType: 'CONVERSION',
      probability: Math.max(0, Math.min(1, data.conversionProbability)),
      confidence: Math.max(0, Math.min(1, data.confidence)),
      predictedValue: data.predictedValue,
      predictedDays: data.predictedDaysToClose,
      predictedScoreLevel: data.predictedScoreLevel,
      riskFactors: data.riskFactors as LeadRiskFactor[],
      explanation: data.explanation,
      recommendations: data.recommendations as LeadRecommendation[],
      llmMetadata: {
        model: result.usage.model,
        tokensUsed: result.usage.totalTokens,
        latencyMs,
        estimatedCost: result.usage.estimatedCost,
      },
    },
    llmMetadata: {
      model: result.usage.model,
      tokensUsed: result.usage.totalTokens,
      latencyMs,
      estimatedCost: result.usage.estimatedCost,
    },
  };
}

// ============================================================================
// Prediction Storage
// ============================================================================

/**
 * Store prediction in database
 */
async function storePrediction(
  leadId: number,
  tenantId: string | null,
  prediction: LeadPredictionResult,
  predictionType: LeadPredictionType,
): Promise<{ id: number }> {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + PREDICTION_VALIDITY_DAYS);

  const created = await prisma.leadMLPrediction.create({
    data: {
      tenantId,
      leadId,
      predictionType,
      probability: prediction.probability,
      confidence: prediction.confidence,
      predictedValue: prediction.predictedValue,
      predictedDays: prediction.predictedDays,
      riskFactors: prediction.riskFactors as unknown as Prisma.InputJsonValue,
      explanation: prediction.explanation,
      recommendations:
        prediction.recommendations as unknown as Prisma.InputJsonValue,
      llmModel: prediction.llmMetadata.model,
      llmTokensUsed: prediction.llmMetadata.tokensUsed,
      llmLatencyMs: prediction.llmMetadata.latencyMs,
      llmCost: prediction.llmMetadata.estimatedCost,
      validUntil,
    },
  });

  return { id: created.id };
}

/**
 * Get latest active prediction for a lead with tenant isolation
 */
async function getLatestPrediction(
  leadId: number,
  tenantId: string,
  predictionType: LeadPredictionType,
): Promise<{
  id: number;
  prediction: LeadPredictionResult;
  isExpired: boolean;
} | null> {
  const prediction = await prisma.leadMLPrediction.findFirst({
    where: {
      leadId,
      tenantId,
      predictionType,
      status: 'ACTIVE',
    },
    orderBy: { predictedAt: 'desc' },
  });

  if (!prediction) return null;

  const isExpired = prediction.validUntil < new Date();

  return {
    id: prediction.id,
    isExpired,
    prediction: {
      predictionType: prediction.predictionType,
      probability: prediction.probability,
      confidence: prediction.confidence,
      predictedValue: prediction.predictedValue
        ? Number(prediction.predictedValue)
        : null,
      predictedDays: prediction.predictedDays,
      riskFactors:
        (prediction.riskFactors as unknown as LeadRiskFactor[]) || [],
      explanation: prediction.explanation || '',
      recommendations:
        (prediction.recommendations as unknown as LeadRecommendation[]) || [],
      llmMetadata: {
        model: prediction.llmModel || 'unknown',
        tokensUsed: prediction.llmTokensUsed || 0,
        latencyMs: prediction.llmLatencyMs || 0,
        estimatedCost: prediction.llmCost ? Number(prediction.llmCost) : 0,
      },
    },
  };
}

// ============================================================================
// Main Prediction Functions
// ============================================================================

/**
 * Generate a conversion prediction for a lead
 */
export async function predictLeadConversion(
  input: GenerateLeadPredictionInput,
): Promise<ConversionPrediction & { predictionId: number }> {
  const { leadId, tenantId, options } = input;

  // Check for recent prediction unless force refresh
  if (!options?.forceRefresh) {
    const existing = await getLatestPrediction(leadId, tenantId, 'CONVERSION');
    if (existing && !existing.isExpired) {
      return {
        ...(existing.prediction as ConversionPrediction),
        predictionId: existing.id,
      };
    }
  }

  // Gather context with tenant isolation
  const context = await gatherLeadContext(leadId, tenantId);

  let prediction: ConversionPrediction;

  // Try LLM prediction first
  if (isAIAvailable() && !options?.ruleBasedOnly) {
    try {
      const llmResult = await predictConversionWithLLM(context, tenantId);
      prediction = llmResult.prediction;
    } catch (error) {
      logger.warn('LLM prediction failed, falling back to rule-based', {
        error,
        leadId,
      });
      prediction = predictConversionRuleBased(context.features);
    }
  } else {
    prediction = predictConversionRuleBased(context.features);
  }

  // Store prediction
  const stored = await storePrediction(
    leadId,
    tenantId,
    prediction,
    'CONVERSION',
  );

  // Update lead with prediction
  await prisma.scoredLead.update({
    where: { id: leadId },
    data: {
      conversionProbability: prediction.probability,
      predictedCloseDate: prediction.predictedDays
        ? new Date(Date.now() + prediction.predictedDays * 24 * 60 * 60 * 1000)
        : null,
    },
  });

  return { ...prediction, predictionId: stored.id };
}

/**
 * Generate time-to-close prediction for a lead
 */
export async function predictTimeToClose(
  input: GenerateLeadPredictionInput,
): Promise<TimeToClosePrediction & { predictionId: number }> {
  const { leadId, tenantId, options } = input;

  // Check for recent prediction
  if (!options?.forceRefresh) {
    const existing = await getLatestPrediction(
      leadId,
      tenantId,
      'TIME_TO_CLOSE',
    );
    if (existing && !existing.isExpired) {
      return {
        ...(existing.prediction as TimeToClosePrediction),
        predictionId: existing.id,
      };
    }
  }

  // Gather context with tenant isolation
  const context = await gatherLeadContext(leadId, tenantId);

  // Use rule-based for now (LLM prompt similar pattern)
  const prediction = predictTimeToCloseRuleBased(context.features);

  // Store prediction
  const stored = await storePrediction(
    leadId,
    tenantId,
    prediction,
    'TIME_TO_CLOSE',
  );

  return { ...prediction, predictionId: stored.id };
}

/**
 * Generate score prediction with explanation
 */
export async function predictLeadScore(
  input: GenerateLeadPredictionInput,
): Promise<ScorePrediction & { predictionId: number }> {
  const { leadId, tenantId, options } = input;

  // Check for recent prediction
  if (!options?.forceRefresh) {
    const existing = await getLatestPrediction(leadId, tenantId, 'SCORE');
    if (existing && !existing.isExpired) {
      return {
        ...(existing.prediction as ScorePrediction),
        predictionId: existing.id,
      };
    }
  }

  // Gather context with tenant isolation
  const context = await gatherLeadContext(leadId, tenantId);
  const prediction = predictScoreRuleBased(context.features);

  // Store prediction
  const stored = await storePrediction(leadId, tenantId, prediction, 'SCORE');

  return { ...prediction, predictionId: stored.id };
}

/**
 * Bulk predict conversions for multiple leads
 */
export async function bulkPredictConversions(
  input: BulkLeadPredictionInput,
): Promise<BulkLeadPredictionResult> {
  const { configId, tenantId, limit = 50, minScore = 0, options } = input;

  // Get leads to process with tenant isolation
  const leads = await prisma.scoredLead.findMany({
    where: {
      configId,
      config: { tenantId },
      score: { gte: minScore },
      isActive: true,
    },
    select: { id: true },
    take: limit,
    orderBy: { score: 'desc' },
  });

  const results: BulkLeadPredictionResult['predictions'] = [];
  let successful = 0;
  let failed = 0;

  for (const lead of leads) {
    try {
      const result = await predictLeadConversion({
        leadId: lead.id,
        tenantId,
        configId,
        predictionType: 'CONVERSION',
        options,
      });
      results.push({
        leadId: lead.id,
        result,
        error: null,
      });
      successful++;
    } catch (error) {
      results.push({
        leadId: lead.id,
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      failed++;
    }
  }

  return {
    processed: leads.length,
    successful,
    failed,
    predictions: results,
  };
}

/**
 * Get prediction for a lead (retrieve existing or generate new)
 */
export async function getLeadPrediction(
  leadId: number,
  tenantId: string,
  predictionType: LeadPredictionType,
): Promise<{
  id: number;
  prediction: LeadPredictionResult;
  isExpired: boolean;
} | null> {
  return getLatestPrediction(leadId, tenantId, predictionType);
}

/**
 * Validate a prediction against actual outcome
 */
export async function validatePrediction(
  predictionId: number,
  wasAccurate: boolean,
): Promise<void> {
  await prisma.leadMLPrediction.update({
    where: { id: predictionId },
    data: {
      status: wasAccurate ? 'VALIDATED' : 'INVALIDATED',
      wasAccurate,
      validatedAt: new Date(),
    },
  });
}

/**
 * Get prediction accuracy metrics with tenant isolation
 */
export async function getPredictionAccuracy(
  configId: number,
  tenantId: string,
  options?: { startDate?: Date; endDate?: Date },
): Promise<{
  totalPredictions: number;
  validatedCount: number;
  accurateCount: number;
  accuracy: number;
  byType: Record<string, { total: number; accurate: number; accuracy: number }>;
}> {
  const whereClause: Prisma.LeadMLPredictionWhereInput = {
    lead: { configId, config: { tenantId } },
  };

  if (options?.startDate || options?.endDate) {
    whereClause.predictedAt = {};
    if (options.startDate) whereClause.predictedAt.gte = options.startDate;
    if (options.endDate) whereClause.predictedAt.lte = options.endDate;
  }

  const predictions = await prisma.leadMLPrediction.findMany({
    where: whereClause,
    select: {
      predictionType: true,
      wasAccurate: true,
      status: true,
    },
  });

  const total = predictions.length;
  const validated = predictions.filter(
    (p) => p.status === 'VALIDATED' || p.status === 'INVALIDATED',
  );
  const accurate = validated.filter((p) => p.wasAccurate === true);

  // Group by type
  const byType: Record<
    string,
    { total: number; accurate: number; accuracy: number }
  > = {};
  for (const prediction of predictions) {
    const type = prediction.predictionType;
    if (!byType[type]) {
      byType[type] = { total: 0, accurate: 0, accuracy: 0 };
    }
    byType[type].total++;
    if (prediction.wasAccurate === true) {
      byType[type].accurate++;
    }
  }

  for (const type of Object.keys(byType)) {
    byType[type].accuracy =
      byType[type].total > 0 ? byType[type].accurate / byType[type].total : 0;
  }

  return {
    totalPredictions: total,
    validatedCount: validated.length,
    accurateCount: accurate.length,
    accuracy: validated.length > 0 ? accurate.length / validated.length : 0,
    byType,
  };
}
