/**
 * Risk Forecast Service
 *
 * Predicts potential risks and delays using LLM analysis with rule-based fallback.
 *
 * @module project-ml/services/risk-forecast
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
  RISK_FORECAST_PROMPT,
  fillTemplate,
} from '../prompts/project-ml-prompts';
import type {
  RiskForecastResult,
  PredictionOptions,
  RiskFactor,
  Recommendation,
  PredictedRisk,
  EarlyWarningIndicator,
  LLMMetadata,
  ProjectMLContext,
} from '../types';

// ============================================================================
// Main Prediction Function
// ============================================================================

/**
 * Forecast project risks.
 *
 * @param projectId - Project to analyze
 * @param tenantId - Tenant context
 * @param options - Prediction options
 * @returns Risk forecast result
 */
export async function forecastProjectRisks(
  projectId: number,
  tenantId: string,
  options: PredictionOptions = {},
): Promise<RiskForecastResult> {
  const predictionWindowDays =
    options.predictionWindowDays || ML_CONFIG.defaultPredictionWindowDays;

  // Check for recent prediction unless forced
  if (!options.forceRefresh) {
    const hasRecent = await hasRecentPrediction(projectId, 'RISK_FORECAST', 1);
    if (hasRecent) {
      const existing = await getLatestPrediction(projectId, 'RISK_FORECAST');
      if (existing) {
        return formatStoredAsResult(existing, predictionWindowDays);
      }
    }
  }

  // Gather project context
  const context = await gatherProjectContext(projectId, tenantId);

  // Try LLM prediction, fallback to rule-based
  let result: RiskForecastResult;

  if (isAIAvailable()) {
    try {
      result = await llmPrediction(context, predictionWindowDays, tenantId);
    } catch (error) {
      console.error(
        'LLM risk forecast failed, using rule-based fallback:',
        error,
      );
      result = forecastProjectRisksRuleBased(context, predictionWindowDays);
    }
  } else {
    result = forecastProjectRisksRuleBased(context, predictionWindowDays);
  }

  // Store prediction
  await storePrediction(projectId, tenantId, result);

  return result;
}

// ============================================================================
// LLM Prediction
// ============================================================================

async function llmPrediction(
  context: ProjectMLContext,
  predictionWindowDays: number,
  tenantId: string,
): Promise<RiskForecastResult> {
  const contextString = formatContextForLLM(context);

  const prompt = fillTemplate(RISK_FORECAST_PROMPT, {
    projectContext: contextString,
    predictionWindow: predictionWindowDays,
  });

  const startTime = Date.now();

  const { data, usage } = await jsonPrompt<{
    overallRiskLevel: string;
    delayProbability: number;
    estimatedDelayDays: number;
    confidence: number;
    identifiedRisks: PredictedRisk[];
    earlyWarningIndicators: EarlyWarningIndicator[];
    riskFactors: RiskFactor[];
    explanation: string;
    recommendations: Recommendation[];
  }>(prompt, {
    tenantId,
    toolId: 'project-ml',
    operation: 'risk-forecast',
    systemPrompt: PROJECT_ML_SYSTEM_PROMPT,
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 2500,
  });

  const llmMetadata: LLMMetadata = {
    model: usage.model,
    tokensUsed: usage.totalTokens,
    latencyMs: Date.now() - startTime,
    estimatedCost: usage.estimatedCost,
  };

  return {
    predictionType: 'RISK_FORECAST',
    probability: data.delayProbability,
    confidence: data.confidence,
    predictionWindowDays,
    riskFactors: data.riskFactors,
    explanation: data.explanation,
    recommendations: data.recommendations,
    llmMetadata,
    overallRiskLevel:
      data.overallRiskLevel as RiskForecastResult['overallRiskLevel'],
    identifiedRisks: data.identifiedRisks,
    delayProbability: data.delayProbability,
    estimatedDelayDays: data.estimatedDelayDays,
    earlyWarningIndicators: data.earlyWarningIndicators,
  };
}

// ============================================================================
// Rule-Based Fallback
// ============================================================================

export function forecastProjectRisksRuleBased(
  context: ProjectMLContext,
  predictionWindowDays: number,
): RiskForecastResult {
  const { taskMetrics, milestoneMetrics, teamMetrics, historicalPerformance } =
    context;

  // Calculate risk score
  let riskScore = 0.2; // Base risk

  // Task-based risks
  if (taskMetrics.overdue > 0) {
    riskScore += Math.min(0.3, taskMetrics.overdue * 0.05);
  }
  if (taskMetrics.blocked > 0) {
    riskScore += Math.min(0.25, taskMetrics.blocked * 0.08);
  }
  if (taskMetrics.completionRate < 0.3) {
    riskScore += 0.15;
  }

  // Milestone-based risks
  if (milestoneMetrics.overdue > 0) {
    riskScore += Math.min(0.25, milestoneMetrics.overdue * 0.1);
  }

  // Team-based risks
  if (teamMetrics.workloadImbalance > 0.6) {
    riskScore += 0.1;
  }

  // Velocity-based risks
  if (historicalPerformance.velocityTrend === 'declining') {
    riskScore += 0.15;
  }

  riskScore = Math.min(1, riskScore);

  // Determine risk level
  let overallRiskLevel: RiskForecastResult['overallRiskLevel'];
  if (riskScore >= 0.8) {
    overallRiskLevel = 'critical';
  } else if (riskScore >= 0.6) {
    overallRiskLevel = 'high';
  } else if (riskScore >= 0.3) {
    overallRiskLevel = 'medium';
  } else {
    overallRiskLevel = 'low';
  }

  // Estimate delay
  const estimatedDelayDays = Math.round(
    riskScore * 14 + taskMetrics.overdue * 2 + milestoneMetrics.overdue * 5,
  );

  // Identify specific risks
  const identifiedRisks: PredictedRisk[] = [];

  if (taskMetrics.overdue > 0) {
    identifiedRisks.push({
      category: 'schedule',
      title: 'Task Backlog Accumulation',
      description: `${taskMetrics.overdue} tasks are overdue, creating schedule pressure`,
      probability: Math.min(0.9, 0.5 + taskMetrics.overdue * 0.1),
      impact: taskMetrics.overdue > 5 ? 'high' : 'medium',
      mitigationSuggestion: 'Review and reprioritize overdue tasks',
      triggerIndicators: [
        'Increasing overdue count',
        'Team velocity declining',
      ],
    });
  }

  if (taskMetrics.blocked > 0) {
    identifiedRisks.push({
      category: 'technical',
      title: 'Blocked Work Items',
      description: `${taskMetrics.blocked} tasks are blocked and preventing progress`,
      probability: 0.8,
      impact: taskMetrics.blocked > 3 ? 'high' : 'medium',
      mitigationSuggestion: 'Escalate blockers and find workarounds',
      triggerIndicators: [
        'Blocked tasks not being resolved',
        'Same blockers recurring',
      ],
    });
  }

  if (teamMetrics.workloadImbalance > 0.5) {
    identifiedRisks.push({
      category: 'resource',
      title: 'Uneven Workload Distribution',
      description: 'Work is concentrated on few team members',
      probability: 0.6,
      impact: 'medium',
      mitigationSuggestion: 'Redistribute tasks to balance workload',
      triggerIndicators: [
        'Single points of failure',
        'Team member burnout signs',
      ],
    });
  }

  if (milestoneMetrics.overdue > 0) {
    identifiedRisks.push({
      category: 'schedule',
      title: 'Milestone Delays',
      description: `${milestoneMetrics.overdue} milestones are past their due dates`,
      probability: 0.85,
      impact: 'high',
      mitigationSuggestion: 'Review milestone scope and timeline',
      triggerIndicators: ['Cascading task delays', 'Scope creep'],
    });
  }

  // Early warning indicators
  const earlyWarningIndicators: EarlyWarningIndicator[] = [
    {
      indicator: 'Task Completion Rate',
      status:
        taskMetrics.completionRate > 0.5
          ? 'normal'
          : taskMetrics.completionRate > 0.3
            ? 'warning'
            : 'critical',
      description: `${(taskMetrics.completionRate * 100).toFixed(0)}% of tasks completed`,
      threshold: '50% minimum expected',
    },
    {
      indicator: 'Blocked Tasks',
      status:
        taskMetrics.blocked === 0
          ? 'normal'
          : taskMetrics.blocked <= 2
            ? 'warning'
            : 'critical',
      description: `${taskMetrics.blocked} tasks currently blocked`,
      threshold: '0 is ideal, > 2 is concerning',
    },
    {
      indicator: 'Velocity Trend',
      status:
        historicalPerformance.velocityTrend === 'improving'
          ? 'normal'
          : historicalPerformance.velocityTrend === 'stable'
            ? 'normal'
            : 'warning',
      description: `Velocity is ${historicalPerformance.velocityTrend}`,
      threshold: 'Should be stable or improving',
    },
  ];

  // Risk factors
  const riskFactors: RiskFactor[] = [];

  if (taskMetrics.overdue > 0) {
    riskFactors.push({
      factor: 'Overdue Tasks',
      impact: taskMetrics.overdue > 5 ? 'high' : 'medium',
      currentValue: taskMetrics.overdue,
      threshold: 0,
      trend: 'worsening',
      description: 'Tasks past their due dates',
    });
  }

  if (taskMetrics.blocked > 0) {
    riskFactors.push({
      factor: 'Blocked Tasks',
      impact: taskMetrics.blocked > 3 ? 'high' : 'medium',
      currentValue: taskMetrics.blocked,
      threshold: 0,
      trend: 'stable',
      description: 'Tasks that cannot progress',
    });
  }

  // Recommendations
  const recommendations: Recommendation[] = [];

  if (taskMetrics.blocked > 0) {
    recommendations.push({
      priority: 'urgent',
      action: 'Resolve blocked tasks immediately',
      rationale: 'Blockers cascade and multiply delays',
      expectedImpact: 'Unblock progress and reduce risk',
      effort: 'medium',
      timeframe: 'Within 24 hours',
    });
  }

  if (taskMetrics.overdue > 3) {
    recommendations.push({
      priority: 'high',
      action: 'Conduct deadline review session',
      rationale: 'Multiple overdue tasks indicate planning issues',
      expectedImpact: 'Realistic timelines and reduced pressure',
      effort: 'low',
      timeframe: 'This week',
    });
  }

  const explanation = `Risk level is ${overallRiskLevel} with ${identifiedRisks.length} identified risks. ${
    estimatedDelayDays > 0
      ? `Estimated ${estimatedDelayDays} days of potential delay if risks materialize.`
      : 'No significant delays expected.'
  }`;

  return {
    predictionType: 'RISK_FORECAST',
    probability: riskScore,
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
    overallRiskLevel,
    identifiedRisks,
    delayProbability: riskScore,
    estimatedDelayDays,
    earlyWarningIndicators,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatStoredAsResult(
  stored: NonNullable<Awaited<ReturnType<typeof getLatestPrediction>>>,
  predictionWindowDays: number,
): RiskForecastResult {
  return {
    predictionType: 'RISK_FORECAST',
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
    overallRiskLevel:
      stored.probability >= 0.8
        ? 'critical'
        : stored.probability >= 0.6
          ? 'high'
          : stored.probability >= 0.3
            ? 'medium'
            : 'low',
    identifiedRisks: [],
    delayProbability: stored.probability,
    estimatedDelayDays: Math.round(stored.probability * 14),
    earlyWarningIndicators: [],
  };
}
