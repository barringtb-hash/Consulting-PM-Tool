/**
 * Success Prediction Service
 *
 * Predicts the likelihood of successful project completion
 * using LLM analysis with rule-based fallback.
 *
 * @module project-ml/services/success-prediction
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
  SUCCESS_PREDICTION_PROMPT,
  fillTemplate,
} from '../prompts/project-ml-prompts';
import type {
  SuccessPredictionResult,
  PredictionOptions,
  RiskFactor,
  Recommendation,
  SuccessFactor,
  LLMMetadata,
  ProjectMLContext,
} from '../types';

// ============================================================================
// Types
// ============================================================================

interface LLMSuccessPredictionResponse {
  onTimeProbability: number;
  onBudgetProbability: number;
  overallSuccessProbability: number;
  confidence: number;
  successFactors: SuccessFactor[];
  riskFactors: Array<{
    factor: string;
    impact: string;
    currentValue: string;
    threshold?: string;
    trend: string;
    description: string;
  }>;
  explanation: string;
  recommendations: Array<{
    priority: string;
    action: string;
    rationale: string;
    expectedImpact: string;
    effort: string;
    timeframe: string;
  }>;
}

// ============================================================================
// Main Prediction Function
// ============================================================================

/**
 * Predict project success likelihood.
 *
 * Uses LLM for intelligent analysis with rule-based fallback.
 *
 * @param projectId - Project to analyze
 * @param tenantId - Tenant context
 * @param options - Prediction options
 * @returns Success prediction result
 */
export async function predictProjectSuccess(
  projectId: number,
  tenantId: string,
  options: PredictionOptions = {},
): Promise<SuccessPredictionResult> {
  const predictionWindowDays =
    options.predictionWindowDays || ML_CONFIG.defaultPredictionWindowDays;

  // Check for recent prediction unless forced
  if (!options.forceRefresh) {
    try {
      const hasRecent = await hasRecentPrediction(
        projectId,
        'SUCCESS_PREDICTION',
        1,
      );
      if (hasRecent) {
        const existing = await getLatestPrediction(
          projectId,
          'SUCCESS_PREDICTION',
        );
        if (existing) {
          // Return existing prediction formatted as result
          return formatStoredAsResult(existing, predictionWindowDays);
        }
      }
    } catch (error) {
      // Log and continue to generate new prediction
      console.error('Error checking for existing prediction:', error);
    }
  }

  // Gather project context
  const context = await gatherProjectContext(projectId, tenantId);

  // Try LLM prediction, fallback to rule-based
  let result: SuccessPredictionResult;

  if (isAIAvailable()) {
    try {
      result = await llmPrediction(context, predictionWindowDays, tenantId);
    } catch (error) {
      console.error('LLM prediction failed, using rule-based fallback:', error);
      result = predictProjectSuccessRuleBased(context, predictionWindowDays);
    }
  } else {
    result = predictProjectSuccessRuleBased(context, predictionWindowDays);
  }

  // Store prediction
  try {
    await storePrediction(projectId, tenantId, result);
  } catch (error) {
    console.error('Failed to store prediction:', error);
    // Continue to return result even if storage fails
  }

  return result;
}

// ============================================================================
// LLM Prediction
// ============================================================================

/**
 * Generate prediction using LLM
 */
async function llmPrediction(
  context: ProjectMLContext,
  predictionWindowDays: number,
  tenantId: string,
): Promise<SuccessPredictionResult> {
  const contextString = formatContextForLLM(context);

  const prompt = fillTemplate(SUCCESS_PREDICTION_PROMPT, {
    projectContext: contextString,
    predictionWindow: predictionWindowDays,
  });

  const startTime = Date.now();

  const { data, usage } = await jsonPrompt<LLMSuccessPredictionResponse>(
    prompt,
    {
      tenantId,
      toolId: 'project-ml',
      operation: 'success-prediction',
      systemPrompt: PROJECT_ML_SYSTEM_PROMPT,
      model: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 2000,
    },
  );

  const llmMetadata: LLMMetadata = {
    model: usage.model,
    tokensUsed: usage.totalTokens,
    latencyMs: Date.now() - startTime,
    estimatedCost: usage.estimatedCost,
  };

  // Safely map risk factors with null checks
  const riskFactors: RiskFactor[] = Array.isArray(data.riskFactors)
    ? data.riskFactors.map((rf) => ({
        factor: rf.factor || 'Unknown',
        impact: (rf.impact as RiskFactor['impact']) || 'medium',
        currentValue: rf.currentValue || 'N/A',
        threshold: rf.threshold,
        trend: (rf.trend as RiskFactor['trend']) || 'stable',
        description: rf.description || '',
      }))
    : [];

  // Safely map recommendations with null checks
  const recommendations: Recommendation[] = Array.isArray(data.recommendations)
    ? data.recommendations.map((r) => ({
        priority: (r.priority as Recommendation['priority']) || 'medium',
        action: r.action || '',
        rationale: r.rationale || '',
        expectedImpact: r.expectedImpact || '',
        effort: (r.effort as Recommendation['effort']) || 'medium',
        timeframe: r.timeframe || '',
      }))
    : [];

  return {
    predictionType: 'SUCCESS_PREDICTION',
    probability: data.overallSuccessProbability ?? 0.5,
    confidence: data.confidence ?? 0.5,
    predictionWindowDays,
    riskFactors,
    explanation: data.explanation || '',
    recommendations,
    llmMetadata,
    onTimeProbability: data.onTimeProbability ?? 0.5,
    onBudgetProbability: data.onBudgetProbability ?? 0.5,
    overallSuccessProbability: data.overallSuccessProbability ?? 0.5,
    successFactors: Array.isArray(data.successFactors)
      ? data.successFactors
      : [],
  };
}

// ============================================================================
// Rule-Based Fallback
// ============================================================================

/**
 * Rule-based prediction when LLM is unavailable
 * Exported for testing purposes
 */
export function predictProjectSuccessRuleBased(
  context: ProjectMLContext,
  predictionWindowDays: number,
): SuccessPredictionResult {
  const { taskMetrics, milestoneMetrics, teamMetrics, historicalPerformance } =
    context;

  // Calculate component scores
  const taskScore = calculateTaskScore(taskMetrics);
  const milestoneScore = calculateMilestoneScore(milestoneMetrics);
  const teamScore = calculateTeamScore(teamMetrics);
  const velocityScore = calculateVelocityScore(historicalPerformance);

  // Weighted average
  const weights = {
    task: 0.35,
    milestone: 0.25,
    team: 0.2,
    velocity: 0.2,
  };

  const overallProbability =
    taskScore * weights.task +
    milestoneScore * weights.milestone +
    teamScore * weights.team +
    velocityScore * weights.velocity;

  // Generate risk factors
  const riskFactors: RiskFactor[] = [];

  if (taskMetrics.overdue > 0) {
    riskFactors.push({
      factor: 'Overdue Tasks',
      impact: taskMetrics.overdue > 5 ? 'high' : 'medium',
      currentValue: taskMetrics.overdue,
      threshold: 0,
      trend: 'worsening',
      description: `${taskMetrics.overdue} tasks are past their due date`,
    });
  }

  if (taskMetrics.blocked > 0) {
    riskFactors.push({
      factor: 'Blocked Tasks',
      impact: taskMetrics.blocked > 3 ? 'high' : 'medium',
      currentValue: taskMetrics.blocked,
      threshold: 0,
      trend: 'stable',
      description: `${taskMetrics.blocked} tasks are currently blocked`,
    });
  }

  if (milestoneMetrics.overdue > 0) {
    riskFactors.push({
      factor: 'Overdue Milestones',
      impact: 'high',
      currentValue: milestoneMetrics.overdue,
      threshold: 0,
      trend: 'worsening',
      description: `${milestoneMetrics.overdue} milestones are past due`,
    });
  }

  if (teamMetrics.workloadImbalance > 0.5) {
    riskFactors.push({
      factor: 'Workload Imbalance',
      impact: 'medium',
      currentValue: `${(teamMetrics.workloadImbalance * 100).toFixed(0)}%`,
      threshold: '50%',
      trend: 'stable',
      description: 'Work is unevenly distributed across team members',
    });
  }

  if (historicalPerformance.velocityTrend === 'declining') {
    riskFactors.push({
      factor: 'Declining Velocity',
      impact: 'medium',
      currentValue: historicalPerformance.avgVelocity.toFixed(1),
      trend: 'worsening',
      description: 'Team is completing fewer tasks per week than before',
    });
  }

  // Generate success factors
  const successFactors: SuccessFactor[] = [];

  if (taskMetrics.completionRate > 0.5) {
    successFactors.push({
      factor: 'Good Completion Rate',
      weight: taskMetrics.completionRate * 0.3,
      description: `${(taskMetrics.completionRate * 100).toFixed(0)}% of tasks completed`,
    });
  }

  if (milestoneMetrics.onTimeRate > 0.7) {
    successFactors.push({
      factor: 'On-time Milestone Delivery',
      weight: milestoneMetrics.onTimeRate * 0.25,
      description: 'Milestones are being delivered on schedule',
    });
  }

  if (historicalPerformance.velocityTrend === 'improving') {
    successFactors.push({
      factor: 'Improving Velocity',
      weight: 0.2,
      description: 'Team productivity is increasing',
    });
  }

  // Generate recommendations
  const recommendations: Recommendation[] = [];

  if (taskMetrics.blocked > 0) {
    recommendations.push({
      priority: 'urgent',
      action: 'Resolve blocked tasks',
      rationale: 'Blocked tasks prevent progress and can cascade to delays',
      expectedImpact: 'Unblock work and improve velocity',
      effort: 'medium',
      timeframe: 'Within 48 hours',
    });
  }

  if (taskMetrics.overdue > 0) {
    recommendations.push({
      priority: 'high',
      action: 'Review and update overdue task deadlines',
      rationale: 'Unrealistic deadlines can demotivate the team',
      expectedImpact: 'Better planning and reduced stress',
      effort: 'low',
      timeframe: 'This week',
    });
  }

  if (teamMetrics.workloadImbalance > 0.5) {
    recommendations.push({
      priority: 'medium',
      action: 'Redistribute workload among team members',
      rationale: 'Balanced workload prevents burnout and bottlenecks',
      expectedImpact: 'Improved team efficiency',
      effort: 'medium',
      timeframe: 'This sprint',
    });
  }

  // Build explanation
  const explanation = buildExplanation(
    overallProbability,
    taskMetrics,
    riskFactors.length,
  );

  return {
    predictionType: 'SUCCESS_PREDICTION',
    probability: overallProbability,
    confidence: 0.6, // Lower confidence for rule-based
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
    onTimeProbability: Math.min(overallProbability + 0.1, 1),
    onBudgetProbability: Math.min(overallProbability + 0.05, 1),
    overallSuccessProbability: overallProbability,
    successFactors,
  };
}

// ============================================================================
// Score Calculations
// ============================================================================

function calculateTaskScore(metrics: ProjectMLContext['taskMetrics']): number {
  if (metrics.total === 0) return 0.5;

  let score = metrics.completionRate * 0.5;

  // Penalize for overdue
  const overdueRatio = metrics.overdue / metrics.total;
  score -= overdueRatio * 0.3;

  // Penalize for blocked
  const blockedRatio = metrics.blocked / metrics.total;
  score -= blockedRatio * 0.2;

  return Math.max(0, Math.min(1, score));
}

function calculateMilestoneScore(
  metrics: ProjectMLContext['milestoneMetrics'],
): number {
  if (metrics.total === 0) return 0.5;

  let score = metrics.onTimeRate * 0.6;

  // Bonus for completion progress
  const completionRatio = metrics.completed / metrics.total;
  score += completionRatio * 0.3;

  // Penalize for overdue
  const overdueRatio = metrics.overdue / metrics.total;
  score -= overdueRatio * 0.4;

  return Math.max(0, Math.min(1, score));
}

function calculateTeamScore(metrics: ProjectMLContext['teamMetrics']): number {
  if (metrics.totalMembers === 0) return 0.3;

  // Start with base score
  let score = 0.6;

  // Penalize for workload imbalance
  score -= metrics.workloadImbalance * 0.3;

  // Bonus for active team engagement
  const activeRatio = metrics.activeMembers / metrics.totalMembers;
  score += activeRatio * 0.2;

  return Math.max(0, Math.min(1, score));
}

function calculateVelocityScore(
  metrics: ProjectMLContext['historicalPerformance'],
): number {
  let score = 0.5;

  if (metrics.velocityTrend === 'improving') {
    score = 0.75;
  } else if (metrics.velocityTrend === 'declining') {
    score = 0.35;
  }

  // Penalize for average task delays
  if (metrics.avgTaskDelay > 3) {
    score -= 0.15;
  } else if (metrics.avgTaskDelay > 7) {
    score -= 0.25;
  }

  return Math.max(0, Math.min(1, score));
}

// ============================================================================
// Helper Functions
// ============================================================================

function buildExplanation(
  probability: number,
  taskMetrics: ProjectMLContext['taskMetrics'],
  riskCount: number,
): string {
  const level =
    probability >= 0.8
      ? 'excellent'
      : probability >= 0.6
        ? 'good'
        : probability >= 0.4
          ? 'moderate'
          : 'concerning';

  let explanation = `Project success likelihood is ${level} at ${(probability * 100).toFixed(0)}%. `;

  if (taskMetrics.completionRate > 0.5) {
    explanation += `Task completion is progressing well at ${(taskMetrics.completionRate * 100).toFixed(0)}%. `;
  } else {
    explanation += `Task completion rate of ${(taskMetrics.completionRate * 100).toFixed(0)}% needs improvement. `;
  }

  if (riskCount > 0) {
    explanation += `${riskCount} risk factor${riskCount > 1 ? 's' : ''} identified that should be addressed.`;
  } else {
    explanation += 'No major risk factors identified.';
  }

  return explanation;
}

function formatStoredAsResult(
  stored: NonNullable<Awaited<ReturnType<typeof getLatestPrediction>>>,
  predictionWindowDays: number,
): SuccessPredictionResult {
  // riskFactors and recommendations are already safely parsed by getLatestPrediction
  return {
    predictionType: 'SUCCESS_PREDICTION',
    probability: stored.probability,
    confidence: stored.confidence,
    predictionWindowDays,
    riskFactors: stored.riskFactors || [],
    explanation: stored.explanation || '',
    recommendations: stored.recommendations || [],
    llmMetadata: {
      model: 'cached',
      tokensUsed: 0,
      latencyMs: 0,
      estimatedCost: 0,
    },
    onTimeProbability: stored.probability,
    onBudgetProbability: stored.probability,
    overallSuccessProbability: stored.probability,
    successFactors: [],
  };
}
