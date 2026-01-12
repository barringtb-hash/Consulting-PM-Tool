/**
 * Churn Prediction Service
 *
 * ML-powered churn risk prediction for Customer Success accounts.
 * Uses LLM analysis with a rule-based fallback for reliability.
 *
 * @module customer-success-ml/services/churn-prediction
 */

import { jsonPrompt, isAIAvailable } from '../../ai-monitoring/ai-client';
import {
  gatherAccountContext,
  storePrediction,
  getLatestPrediction,
  hasRecentPrediction,
  getMLConfig,
} from './cs-ml-prediction.service';
import {
  CS_ML_SYSTEM_PROMPT,
  buildChurnPredictionPrompt,
} from '../prompts/cs-ml-prompts';
import type {
  ChurnPredictionInput,
  ChurnPredictionOutput,
  ChurnPredictionLLMResponse,
  ChurnRiskCategory,
  InterventionUrgency,
  RuleBasedChurnFactors,
  DEFAULT_CHURN_THRESHOLDS as _DEFAULT_CHURN_THRESHOLDS,
  RiskFactor,
  Recommendation,
  LLMMetadata,
  AccountMLContext,
} from '../types';
import { logger } from '../../../utils/logger';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PREDICTION_WINDOW = 90;

const CHURN_THRESHOLDS = {
  criticalHealthScore: 30,
  warningHealthScore: 50,
  inactivityDays: 30,
  supportTicketThreshold: 3,
  negativeSentimentThreshold: 0.3,
};

// ============================================================================
// Main Prediction Function
// ============================================================================

/**
 * Generate a churn risk prediction for an account.
 *
 * This is the main entry point for churn prediction. It:
 * 1. Gathers account context (health, activities, CTAs)
 * 2. Calls LLM for intelligent analysis
 * 3. Falls back to rule-based calculation if LLM unavailable
 * 4. Stores the prediction for tracking and validation
 *
 * @param input - Prediction input parameters
 * @returns Churn prediction with probability, risk factors, and recommendations
 *
 * @example
 * ```typescript
 * const prediction = await predictChurn({
 *   accountId: 123,
 *   tenantId: 'tenant-abc',
 *   predictionWindowDays: 90
 * });
 *
 * if (prediction.churnProbability > 0.7) {
 *   console.log('High churn risk detected!');
 *   console.log('Primary drivers:', prediction.primaryChurnDrivers);
 *   console.log('Recommended actions:', prediction.recommendations);
 * }
 * ```
 */
export async function predictChurn(
  input: ChurnPredictionInput,
): Promise<ChurnPredictionOutput> {
  const { accountId, tenantId } = input;
  const predictionWindowDays =
    input.predictionWindowDays ?? DEFAULT_PREDICTION_WINDOW;

  // Gather complete account context
  const context = await gatherAccountContext(accountId, tenantId);

  let prediction: ChurnPredictionOutput;
  let llmMetadata: LLMMetadata;

  // Try LLM-based prediction first
  if (isAIAvailable()) {
    try {
      const llmResult = await predictChurnWithLLM(
        context,
        predictionWindowDays,
      );
      prediction = llmResult.prediction;
      llmMetadata = llmResult.llmMetadata;
    } catch (error) {
      logger.warn('LLM churn prediction failed, using fallback', {
        accountId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Fall back to rule-based
      prediction = predictChurnRuleBased(context, predictionWindowDays);
      llmMetadata = {
        model: 'rule-based-fallback',
        tokensUsed: 0,
        latencyMs: 0,
        estimatedCost: 0,
      };
    }
  } else {
    // Use rule-based when AI not available
    prediction = predictChurnRuleBased(context, predictionWindowDays);
    llmMetadata = {
      model: 'rule-based-fallback',
      tokensUsed: 0,
      latencyMs: 0,
      estimatedCost: 0,
    };
  }

  // Add LLM metadata
  prediction.llmMetadata = llmMetadata;

  // Store the prediction
  const stored = await storePrediction(accountId, tenantId, prediction);

  return {
    ...prediction,
    predictionId: stored.id,
  } as ChurnPredictionOutput & { predictionId: number };
}

// ============================================================================
// LLM-Based Prediction
// ============================================================================

/**
 * Generate churn prediction using LLM analysis.
 *
 * Builds a detailed prompt with account context and parses
 * the structured JSON response from the LLM.
 *
 * @internal
 */
async function predictChurnWithLLM(
  context: AccountMLContext,
  predictionWindowDays: number,
): Promise<{
  prediction: ChurnPredictionOutput;
  llmMetadata: LLMMetadata;
}> {
  const prompt = buildChurnPredictionPrompt(
    {
      account: context.account,
      healthHistory: context.healthHistory,
      recentActivities: context.recentActivities,
      openCTAs: context.openCTAs,
      crmMetrics: context.crmMetrics,
    },
    predictionWindowDays,
  );

  const startTime = Date.now();

  const result = await jsonPrompt<ChurnPredictionLLMResponse>(prompt, {
    tenantId: context.account.id.toString(),
    toolId: 'customer-success-ml',
    operation: 'churn-prediction',
    systemPrompt: CS_ML_SYSTEM_PROMPT,
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 2000,
  });

  const latencyMs = Date.now() - startTime;

  // Transform LLM response to ChurnPredictionOutput
  const prediction: ChurnPredictionOutput = {
    predictionType: 'CHURN',
    probability: result.data.churnProbability,
    confidence: result.data.confidence,
    predictionWindowDays,
    churnProbability: result.data.churnProbability,
    retentionProbability: 1 - result.data.churnProbability,
    riskCategory: result.data.riskCategory,
    primaryChurnDrivers: result.data.primaryChurnDrivers,
    riskFactors: result.data.riskFactors,
    explanation: result.data.explanation,
    recommendations: result.data.recommendations,
    interventionUrgency: result.data.interventionUrgency,
    suggestedCTA: result.data.suggestedCTA
      ? {
          type: result.data.suggestedCTA.type,
          priority: result.data.suggestedCTA.priority,
          title: result.data.suggestedCTA.title,
          reason: result.data.suggestedCTA.reason,
          dueDays: getUrgencyDueDays(result.data.interventionUrgency),
        }
      : undefined,
    llmMetadata: {
      model: result.usage.model,
      tokensUsed: result.usage.totalTokens,
      latencyMs,
      estimatedCost: result.usage.estimatedCost,
    },
  };

  return {
    prediction,
    llmMetadata: prediction.llmMetadata,
  };
}

// ============================================================================
// Rule-Based Fallback
// ============================================================================

/**
 * Calculate churn risk using rule-based approach.
 *
 * Used when LLM is unavailable. Analyzes:
 * - Health score and trend
 * - Engagement metrics
 * - Support activity
 * - Sentiment indicators
 * - Activity recency
 *
 * @param context - Account context data
 * @param predictionWindowDays - Prediction window in days
 * @returns Churn prediction based on rules
 */
export function predictChurnRuleBased(
  context: AccountMLContext,
  predictionWindowDays: number,
): ChurnPredictionOutput {
  const factors = calculateChurnFactors(context);
  const churnProbability = calculateChurnProbability(factors);
  const riskCategory = getRiskCategory(churnProbability);
  const interventionUrgency = getInterventionUrgency(riskCategory);

  // Generate risk factors
  const riskFactors = generateRuleBasedRiskFactors(context, factors);

  // Generate recommendations
  const recommendations = generateRuleBasedRecommendations(
    context,
    riskCategory,
  );

  // Extract primary drivers
  const primaryChurnDrivers = riskFactors
    .filter((f) => f.impact === 'high')
    .slice(0, 3)
    .map((f) => f.factor);

  // Generate explanation
  const explanation = generateRuleBasedExplanation(
    context,
    churnProbability,
    riskCategory,
  );

  return {
    predictionType: 'CHURN',
    probability: churnProbability,
    confidence: 0.6, // Lower confidence for rule-based
    predictionWindowDays,
    churnProbability,
    retentionProbability: 1 - churnProbability,
    riskCategory,
    primaryChurnDrivers,
    riskFactors,
    explanation,
    recommendations,
    interventionUrgency,
    suggestedCTA:
      riskCategory === 'critical' || riskCategory === 'high'
        ? {
            type: 'RISK',
            priority: riskCategory === 'critical' ? 'CRITICAL' : 'HIGH',
            title: `Review churn risk for ${context.account.name}`,
            reason: explanation,
            dueDays: getUrgencyDueDays(interventionUrgency),
          }
        : undefined,
    llmMetadata: {
      model: 'rule-based-fallback',
      tokensUsed: 0,
      latencyMs: 0,
      estimatedCost: 0,
    },
  };
}

/**
 * Calculate individual churn factors from account context
 */
function calculateChurnFactors(
  context: AccountMLContext,
): RuleBasedChurnFactors {
  const { account, healthHistory, recentActivities, crmMetrics } = context;

  // Health score factor (0-0.4)
  let healthScoreFactor = 0;
  const currentHealthScore = account.healthScore ?? 50;
  if (currentHealthScore < CHURN_THRESHOLDS.criticalHealthScore) {
    healthScoreFactor = 0.4;
  } else if (currentHealthScore < CHURN_THRESHOLDS.warningHealthScore) {
    healthScoreFactor = 0.25;
  } else if (currentHealthScore < 70) {
    healthScoreFactor = 0.1;
  }

  // Check for declining trend
  if (healthHistory.length >= 2) {
    const oldest = healthHistory[healthHistory.length - 1];
    const newest = healthHistory[0];
    if (newest.overallScore < oldest.overallScore - 10) {
      healthScoreFactor = Math.min(0.4, healthScoreFactor + 0.1);
    }
  }

  // Engagement factor (0-0.2)
  let engagementFactor = 0;
  if (crmMetrics.activitiesLast30Days === 0) {
    engagementFactor = 0.2;
  } else if (crmMetrics.activitiesLast30Days < 3) {
    engagementFactor = 0.1;
  }
  if (crmMetrics.meetingsLast30Days === 0) {
    engagementFactor = Math.min(0.2, engagementFactor + 0.05);
  }

  // Support factor (0-0.2)
  let supportFactor = 0;
  const noteActivities = recentActivities.filter(
    (a) => a.type === 'NOTE',
  ).length;
  if (noteActivities > CHURN_THRESHOLDS.supportTicketThreshold) {
    supportFactor = 0.2;
  } else if (noteActivities > 0) {
    supportFactor = 0.1;
  }

  // Sentiment factor (0-0.15)
  let sentimentFactor = 0;
  const sentimentActivities = recentActivities.filter((a) => a.sentiment);
  if (sentimentActivities.length > 0) {
    const negativeCount = sentimentActivities.filter(
      (a) => a.sentiment === 'NEGATIVE',
    ).length;
    const negativeRatio = negativeCount / sentimentActivities.length;
    if (negativeRatio > CHURN_THRESHOLDS.negativeSentimentThreshold) {
      sentimentFactor = 0.15;
    } else if (negativeRatio > 0.1) {
      sentimentFactor = 0.08;
    }
  }

  // Recency factor (0-0.15)
  let recencyFactor = 0;
  if (crmMetrics.daysSinceLastActivity > CHURN_THRESHOLDS.inactivityDays) {
    recencyFactor = 0.15;
  } else if (crmMetrics.daysSinceLastActivity > 14) {
    recencyFactor = 0.08;
  }

  return {
    healthScoreFactor,
    engagementFactor,
    supportFactor,
    sentimentFactor,
    recencyFactor,
  };
}

/**
 * Calculate final churn probability from factors
 */
function calculateChurnProbability(factors: RuleBasedChurnFactors): number {
  const total =
    factors.healthScoreFactor +
    factors.engagementFactor +
    factors.supportFactor +
    factors.sentimentFactor +
    factors.recencyFactor;

  // Normalize to 0-1 range with some non-linearity
  // Low factors should result in low probability
  return Math.min(1, Math.max(0, total * 1.1));
}

/**
 * Get risk category from probability
 */
function getRiskCategory(probability: number): ChurnRiskCategory {
  const config = getMLConfig();
  if (probability >= config.churnRiskThresholds.critical) return 'critical';
  if (probability >= config.churnRiskThresholds.high) return 'high';
  if (probability >= config.churnRiskThresholds.medium) return 'medium';
  return 'low';
}

/**
 * Get intervention urgency from risk category
 */
function getInterventionUrgency(
  riskCategory: ChurnRiskCategory,
): InterventionUrgency {
  switch (riskCategory) {
    case 'critical':
      return 'immediate';
    case 'high':
      return 'this_week';
    case 'medium':
      return 'this_month';
    default:
      return 'monitor';
  }
}

/**
 * Get due days from urgency
 */
function getUrgencyDueDays(urgency: InterventionUrgency): number {
  switch (urgency) {
    case 'immediate':
      return 1;
    case 'this_week':
      return 5;
    case 'this_month':
      return 14;
    default:
      return 30;
  }
}

/**
 * Generate risk factors from rule-based analysis
 */
function generateRuleBasedRiskFactors(
  context: AccountMLContext,
  factors: RuleBasedChurnFactors,
): RiskFactor[] {
  const riskFactors: RiskFactor[] = [];

  // Health score factor
  if (factors.healthScoreFactor > 0) {
    const trend =
      context.healthHistory.length >= 2
        ? context.healthHistory[0].overallScore <
          context.healthHistory[context.healthHistory.length - 1].overallScore
          ? 'worsening'
          : 'stable'
        : 'stable';

    riskFactors.push({
      factor: 'Health Score',
      impact: factors.healthScoreFactor >= 0.25 ? 'high' : 'medium',
      currentValue: context.account.healthScore ?? 50,
      threshold: CHURN_THRESHOLDS.warningHealthScore,
      trend: trend as 'improving' | 'stable' | 'worsening',
      description: `Health score is ${context.account.healthScore ?? 50}, below the warning threshold of ${CHURN_THRESHOLDS.warningHealthScore}`,
    });
  }

  // Engagement factor
  if (factors.engagementFactor > 0) {
    riskFactors.push({
      factor: 'Low Engagement',
      impact: factors.engagementFactor >= 0.15 ? 'high' : 'medium',
      currentValue: context.crmMetrics.activitiesLast30Days,
      threshold: 3,
      trend: 'worsening',
      description: `Only ${context.crmMetrics.activitiesLast30Days} activities in the last 30 days`,
    });
  }

  // Recency factor
  if (factors.recencyFactor > 0) {
    riskFactors.push({
      factor: 'Inactivity',
      impact: factors.recencyFactor >= 0.1 ? 'high' : 'medium',
      currentValue: `${context.crmMetrics.daysSinceLastActivity} days`,
      threshold: `${CHURN_THRESHOLDS.inactivityDays} days`,
      trend: 'worsening',
      description: `No activity for ${context.crmMetrics.daysSinceLastActivity} days`,
    });
  }

  // Support factor
  if (factors.supportFactor > 0) {
    riskFactors.push({
      factor: 'Support Issues',
      impact: factors.supportFactor >= 0.15 ? 'high' : 'medium',
      currentValue: 'Elevated',
      trend: 'worsening',
      description:
        'Increased support interactions may indicate dissatisfaction',
    });
  }

  // Sentiment factor
  if (factors.sentimentFactor > 0) {
    riskFactors.push({
      factor: 'Negative Sentiment',
      impact: factors.sentimentFactor >= 0.1 ? 'high' : 'medium',
      currentValue: 'Negative',
      trend: 'worsening',
      description: 'Recent interactions have shown negative sentiment',
    });
  }

  return riskFactors;
}

/**
 * Generate recommendations based on risk category
 */
function generateRuleBasedRecommendations(
  context: AccountMLContext,
  riskCategory: ChurnRiskCategory,
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  if (riskCategory === 'critical' || riskCategory === 'high') {
    recommendations.push({
      priority: 'urgent',
      action: `Schedule executive outreach call with ${context.account.name}`,
      rationale:
        'Direct engagement needed to understand concerns and reinforce value',
      expectedImpact: 'Identify blockers and rebuild relationship',
      effort: 'medium',
      timeframe:
        riskCategory === 'critical' ? 'Within 24 hours' : 'Within 5 days',
    });
  }

  if (context.crmMetrics.meetingsLast30Days === 0) {
    recommendations.push({
      priority: riskCategory === 'critical' ? 'urgent' : 'high',
      action: 'Schedule a business review meeting',
      rationale: 'No recent meetings indicate relationship gap',
      expectedImpact: 'Re-establish regular communication cadence',
      effort: 'low',
      timeframe: 'Within 7 days',
    });
  }

  if ((context.account.healthScore ?? 50) < 50) {
    recommendations.push({
      priority: 'high',
      action: 'Conduct product usage analysis',
      rationale: 'Low health score may indicate adoption issues',
      expectedImpact: 'Identify features not being utilized',
      effort: 'medium',
      timeframe: 'Within 2 weeks',
    });
  }

  if (context.openCTAs.filter((c) => c.type === 'RISK').length === 0) {
    recommendations.push({
      priority: 'medium',
      action: 'Create risk CTA for systematic follow-up',
      rationale: 'Ensure this account is tracked in daily workflow',
      expectedImpact: 'Consistent attention and follow-through',
      effort: 'low',
      timeframe: 'Immediately',
    });
  }

  return recommendations;
}

/**
 * Generate human-readable explanation
 */
function generateRuleBasedExplanation(
  context: AccountMLContext,
  probability: number,
  riskCategory: ChurnRiskCategory,
): string {
  const pct = Math.round(probability * 100);
  const accountName = context.account.name;

  if (riskCategory === 'critical') {
    return `${accountName} has a ${pct}% churn probability and requires immediate attention. The combination of low health score, declining engagement, and lack of recent interaction signals significant risk.`;
  } else if (riskCategory === 'high') {
    return `${accountName} shows elevated churn risk at ${pct}%. Health metrics and engagement patterns indicate this account needs proactive outreach this week.`;
  } else if (riskCategory === 'medium') {
    return `${accountName} has moderate churn risk (${pct}%). While not urgent, monitoring and preventive engagement are recommended.`;
  } else {
    return `${accountName} appears healthy with low churn risk (${pct}%). Continue regular engagement cadence.`;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get existing churn prediction if available and not expired
 */
export async function getExistingChurnPrediction(
  accountId: number,
  forceRefresh: boolean = false,
): Promise<ChurnPredictionOutput | null> {
  if (forceRefresh) {
    return null;
  }

  const prediction = await getLatestPrediction(accountId, 'CHURN', false);
  if (!prediction) {
    return null;
  }

  // Transform database record to ChurnPredictionOutput
  return {
    predictionType: 'CHURN',
    probability: prediction.probability,
    confidence: prediction.confidence,
    predictionWindowDays: 90,
    churnProbability: prediction.probability,
    retentionProbability: 1 - prediction.probability,
    riskCategory: getRiskCategory(prediction.probability),
    primaryChurnDrivers: [], // Would need to extract from riskFactors
    riskFactors: prediction.riskFactors as RiskFactor[],
    explanation: prediction.explanation ?? '',
    recommendations: (prediction.recommendations as Recommendation[]) ?? [],
    interventionUrgency: getInterventionUrgency(
      getRiskCategory(prediction.probability),
    ),
    llmMetadata: {
      model: 'cached',
      tokensUsed: 0,
      latencyMs: 0,
      estimatedCost: 0,
    },
  };
}

/**
 * Check if account needs churn prediction refresh
 */
export async function needsChurnPredictionRefresh(
  accountId: number,
  maxAgeDays: number = 7,
): Promise<boolean> {
  const hasRecent = await hasRecentPrediction(accountId, 'CHURN', maxAgeDays);
  return !hasRecent;
}
