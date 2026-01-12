/**
 * Timeline Prediction Service
 *
 * Predicts realistic project completion dates using LLM analysis with rule-based fallback.
 *
 * @module project-ml/services/timeline-prediction
 */

import { jsonPrompt, isAIAvailable } from '../../ai-monitoring/ai-client';
import {
  gatherProjectContext,
  formatContextForLLM,
} from './project-ml-context.service';
import {
  storePrediction,
  getLatestPrediction,
  hasRecentPrediction,
  ML_CONFIG,
} from './project-ml-prediction.service';
import {
  PROJECT_ML_SYSTEM_PROMPT,
  TIMELINE_PREDICTION_PROMPT,
  fillTemplate,
} from '../prompts/project-ml-prompts';
import type {
  TimelinePredictionResult,
  PredictionOptions,
  RiskFactor,
  Recommendation,
  DelayFactor,
  AccelerationOpportunity,
  LLMMetadata,
  ProjectMLContext,
} from '../types';

// ============================================================================
// Main Prediction Function
// ============================================================================

/**
 * Predict project timeline.
 *
 * @param projectId - Project to analyze
 * @param tenantId - Tenant context
 * @param options - Prediction options
 * @returns Timeline prediction result
 */
export async function predictProjectTimeline(
  projectId: number,
  tenantId: string,
  options: PredictionOptions = {},
): Promise<TimelinePredictionResult> {
  const predictionWindowDays =
    options.predictionWindowDays || ML_CONFIG.defaultPredictionWindowDays;

  // Check for recent prediction unless forced
  if (!options.forceRefresh) {
    const hasRecent = await hasRecentPrediction(
      projectId,
      'TIMELINE_PREDICTION',
      1,
    );
    if (hasRecent) {
      const existing = await getLatestPrediction(
        projectId,
        'TIMELINE_PREDICTION',
      );
      if (existing) {
        return formatStoredAsResult(existing, predictionWindowDays);
      }
    }
  }

  // Gather project context
  const context = await gatherProjectContext(projectId, tenantId);

  // Try LLM prediction, fallback to rule-based
  let result: TimelinePredictionResult;

  if (isAIAvailable()) {
    try {
      result = await llmPrediction(context, predictionWindowDays, tenantId);
    } catch (error) {
      console.error(
        'LLM timeline prediction failed, using rule-based fallback:',
        error,
      );
      result = predictProjectTimelineRuleBased(context, predictionWindowDays);
    }
  } else {
    result = predictProjectTimelineRuleBased(context, predictionWindowDays);
  }

  // Store prediction with timeline-specific data
  await storePrediction(projectId, tenantId, result, {
    predictedEndDate: result.predictedEndDate,
    originalEndDate: result.currentEndDate || undefined,
    daysVariance: result.daysVariance,
  });

  return result;
}

// ============================================================================
// LLM Prediction
// ============================================================================

async function llmPrediction(
  context: ProjectMLContext,
  predictionWindowDays: number,
  tenantId: string,
): Promise<TimelinePredictionResult> {
  const contextString = formatContextForLLM(context);

  const prompt = fillTemplate(TIMELINE_PREDICTION_PROMPT, {
    projectContext: contextString,
    predictionWindow: predictionWindowDays,
  });

  const startTime = Date.now();

  const { data, usage } = await jsonPrompt<{
    predictedEndDate: string;
    daysVariance: number;
    confidence: number;
    confidenceInterval: { optimistic: string; pessimistic: string };
    delayFactors: DelayFactor[];
    accelerationOpportunities: AccelerationOpportunity[];
    riskFactors: RiskFactor[];
    explanation: string;
    recommendations: Recommendation[];
  }>(prompt, {
    tenantId,
    toolId: 'project-ml',
    operation: 'timeline-prediction',
    systemPrompt: PROJECT_ML_SYSTEM_PROMPT,
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 2000,
  });

  const llmMetadata: LLMMetadata = {
    model: usage.model,
    tokensUsed: usage.totalTokens,
    latencyMs: Date.now() - startTime,
    estimatedCost: usage.estimatedCost,
  };

  // Calculate probability based on variance
  const probability = Math.max(0, 1 - Math.abs(data.daysVariance) / 30);

  return {
    predictionType: 'TIMELINE_PREDICTION',
    probability,
    confidence: data.confidence,
    predictionWindowDays,
    riskFactors: data.riskFactors,
    explanation: data.explanation,
    recommendations: data.recommendations,
    llmMetadata,
    currentEndDate: context.project.endDate,
    predictedEndDate: new Date(data.predictedEndDate),
    confidenceInterval: {
      optimistic: new Date(data.confidenceInterval.optimistic),
      pessimistic: new Date(data.confidenceInterval.pessimistic),
    },
    daysVariance: data.daysVariance,
    delayFactors: data.delayFactors,
    accelerationOpportunities: data.accelerationOpportunities,
  };
}

// ============================================================================
// Rule-Based Fallback
// ============================================================================

export function predictProjectTimelineRuleBased(
  context: ProjectMLContext,
  predictionWindowDays: number,
): TimelinePredictionResult {
  const { project, taskMetrics, milestoneMetrics, historicalPerformance } =
    context;

  const now = new Date();
  const currentEndDate = project.endDate;

  // Calculate expected completion based on velocity
  let predictedEndDate: Date;
  let daysVariance: number;

  if (currentEndDate) {
    // Base prediction on current end date with adjustments
    const remainingTasks = taskMetrics.total - taskMetrics.completed;
    const velocity = historicalPerformance.avgVelocity || 1;
    const weeksNeeded = remainingTasks / velocity;
    const daysNeeded = Math.ceil(weeksNeeded * 7);

    // Calculate predicted end based on current progress
    const daysFromNow = historicalPerformance.daysRemaining || 30;
    const delayDays = Math.max(0, daysNeeded - daysFromNow);

    // Adjust for risk factors
    let additionalDelay = 0;
    if (taskMetrics.blocked > 0) {
      additionalDelay += taskMetrics.blocked * 2;
    }
    if (milestoneMetrics.overdue > 0) {
      additionalDelay += milestoneMetrics.overdue * 3;
    }
    if (historicalPerformance.velocityTrend === 'declining') {
      additionalDelay += 5;
    }

    daysVariance = delayDays + additionalDelay;
    predictedEndDate = new Date(currentEndDate);
    predictedEndDate.setDate(predictedEndDate.getDate() + daysVariance);
  } else {
    // No end date set - estimate based on remaining work
    const remainingTasks = taskMetrics.total - taskMetrics.completed;
    const velocity = historicalPerformance.avgVelocity || 2;
    const weeksNeeded = remainingTasks / velocity;
    const daysNeeded = Math.ceil(weeksNeeded * 7);

    predictedEndDate = new Date(now);
    predictedEndDate.setDate(predictedEndDate.getDate() + daysNeeded + 14); // Add buffer
    daysVariance = 0; // No baseline to compare
  }

  // Calculate confidence interval
  const varianceBuffer = Math.max(7, Math.abs(daysVariance) / 2);
  const optimistic = new Date(predictedEndDate);
  optimistic.setDate(optimistic.getDate() - varianceBuffer);
  const pessimistic = new Date(predictedEndDate);
  pessimistic.setDate(pessimistic.getDate() + varianceBuffer);

  // Identify delay factors
  const delayFactors: DelayFactor[] = [];

  if (taskMetrics.blocked > 0) {
    delayFactors.push({
      factor: 'Blocked Tasks',
      delayDays: taskMetrics.blocked * 2,
      confidence: 0.7,
      description: `${taskMetrics.blocked} blocked tasks preventing progress`,
    });
  }

  if (taskMetrics.overdue > 0) {
    delayFactors.push({
      factor: 'Overdue Tasks',
      delayDays: Math.ceil(taskMetrics.overdue * 1.5),
      confidence: 0.6,
      description: `${taskMetrics.overdue} tasks need to be caught up`,
    });
  }

  if (milestoneMetrics.overdue > 0) {
    delayFactors.push({
      factor: 'Milestone Delays',
      delayDays: milestoneMetrics.overdue * 3,
      confidence: 0.75,
      description: `${milestoneMetrics.overdue} milestones are behind schedule`,
    });
  }

  if (historicalPerformance.velocityTrend === 'declining') {
    delayFactors.push({
      factor: 'Declining Velocity',
      delayDays: 5,
      confidence: 0.5,
      description: 'Team productivity is trending downward',
    });
  }

  // Acceleration opportunities
  const accelerationOpportunities: AccelerationOpportunity[] = [];

  if (taskMetrics.blocked > 0) {
    accelerationOpportunities.push({
      opportunity: 'Resolve blockers',
      potentialDaysSaved: taskMetrics.blocked * 2,
      effort: 'medium',
      prerequisites: ['Identify blocker owners', 'Escalate if needed'],
    });
  }

  if (context.teamMetrics.workloadImbalance > 0.4) {
    accelerationOpportunities.push({
      opportunity: 'Balance team workload',
      potentialDaysSaved: 3,
      effort: 'low',
      prerequisites: ['Review task assignments', 'Identify capacity'],
    });
  }

  // Risk factors
  const riskFactors: RiskFactor[] = [];

  if (daysVariance > 7) {
    riskFactors.push({
      factor: 'Schedule Slippage',
      impact: daysVariance > 14 ? 'high' : 'medium',
      currentValue: `${daysVariance} days late`,
      threshold: '0 days',
      trend: 'worsening',
      description: 'Project is behind schedule',
    });
  }

  // Recommendations
  const recommendations: Recommendation[] = [];

  if (daysVariance > 7) {
    recommendations.push({
      priority: 'high',
      action: 'Review and adjust project timeline',
      rationale: 'Current end date appears unrealistic',
      expectedImpact: 'Set achievable expectations',
      effort: 'low',
      timeframe: 'This week',
    });
  }

  if (taskMetrics.blocked > 0) {
    recommendations.push({
      priority: 'urgent',
      action: 'Clear blocked tasks',
      rationale: 'Blockers are the primary source of delay',
      expectedImpact: `Save up to ${taskMetrics.blocked * 2} days`,
      effort: 'medium',
      timeframe: 'Within 48 hours',
    });
  }

  // Calculate probability based on variance
  const probability = Math.max(0.1, 1 - Math.abs(daysVariance) / 30);

  const explanation =
    daysVariance > 0
      ? `Project is predicted to be ${daysVariance} days late. ${delayFactors.length} factors contributing to delay.`
      : daysVariance < 0
        ? `Project may finish ${Math.abs(daysVariance)} days early based on current velocity.`
        : 'Project is on track to meet the planned end date.';

  return {
    predictionType: 'TIMELINE_PREDICTION',
    probability,
    confidence: 0.6,
    predictionWindowDays,
    riskFactors,
    explanation,
    recommendations,
    llmMetadata: {
      model: 'rule-based',
      tokensUsed: 0,
      latencyMs: 0,
      estimatedCost: 0,
    },
    currentEndDate,
    predictedEndDate,
    confidenceInterval: { optimistic, pessimistic },
    daysVariance,
    delayFactors,
    accelerationOpportunities,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatStoredAsResult(
  stored: NonNullable<Awaited<ReturnType<typeof getLatestPrediction>>>,
  predictionWindowDays: number,
): TimelinePredictionResult {
  const now = new Date();
  const predictedEnd = stored.predictedEndDate || now;
  const variance = stored.daysVariance || 0;

  return {
    predictionType: 'TIMELINE_PREDICTION',
    probability: stored.probability,
    confidence: stored.confidence,
    predictionWindowDays,
    riskFactors: stored.riskFactors as RiskFactor[],
    explanation: stored.explanation || '',
    recommendations: (stored.recommendations || []) as Recommendation[],
    llmMetadata: {
      model: 'cached',
      tokensUsed: 0,
      latencyMs: 0,
      estimatedCost: 0,
    },
    currentEndDate: null,
    predictedEndDate: new Date(predictedEnd),
    confidenceInterval: {
      optimistic: new Date(predictedEnd),
      pessimistic: new Date(predictedEnd),
    },
    daysVariance: variance,
    delayFactors: [],
    accelerationOpportunities: [],
  };
}
