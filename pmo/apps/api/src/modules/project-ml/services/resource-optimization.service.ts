/**
 * Resource Optimization Service
 *
 * Analyzes team workload and suggests task reassignments using LLM with rule-based fallback.
 *
 * @module project-ml/services/resource-optimization
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
  RESOURCE_OPTIMIZATION_PROMPT,
  fillTemplate,
  formatWorkloadDetails,
} from '../prompts/project-ml-prompts';
import type {
  ResourceOptimizationResult,
  PredictionOptions,
  RiskFactor,
  Recommendation,
  TaskReassignment,
  ResourceBottleneck,
  CapacityForecast,
  WorkloadBalanceScore,
  LLMMetadata,
  ProjectMLContext,
} from '../types';

// ============================================================================
// Main Optimization Function
// ============================================================================

/**
 * Optimize project resources.
 *
 * @param projectId - Project to analyze
 * @param tenantId - Tenant context
 * @param options - Prediction options
 * @returns Resource optimization result
 */
export async function optimizeProjectResources(
  projectId: number,
  tenantId: string,
  options: PredictionOptions = {},
): Promise<ResourceOptimizationResult> {
  const predictionWindowDays =
    options.predictionWindowDays || ML_CONFIG.defaultPredictionWindowDays;

  // Check for recent prediction unless forced
  if (!options.forceRefresh) {
    const hasRecent = await hasRecentPrediction(
      projectId,
      'RESOURCE_OPTIMIZATION',
      1,
    );
    if (hasRecent) {
      const existing = await getLatestPrediction(
        projectId,
        'RESOURCE_OPTIMIZATION',
      );
      if (existing) {
        return formatStoredAsResult(existing, predictionWindowDays);
      }
    }
  }

  // Gather project context
  const context = await gatherProjectContext(projectId, tenantId);

  // Try LLM prediction, fallback to rule-based
  let result: ResourceOptimizationResult;

  if (isAIAvailable()) {
    try {
      result = await llmPrediction(context, predictionWindowDays, tenantId);
    } catch (error) {
      console.error(
        'LLM resource optimization failed, using rule-based fallback:',
        error,
      );
      result = optimizeProjectResourcesRuleBased(context, predictionWindowDays);
    }
  } else {
    result = optimizeProjectResourcesRuleBased(context, predictionWindowDays);
  }

  // Store prediction with resource-specific data
  await storePrediction(projectId, tenantId, result, {
    resourceRecommendations: result.reassignmentSuggestions,
    workloadAnalysis: result.workloadBalance,
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
): Promise<ResourceOptimizationResult> {
  const contextString = formatContextForLLM(context);
  const workloadDetails = formatWorkloadDetails(
    context.teamMetrics.workloadDistribution,
  );

  const prompt = fillTemplate(RESOURCE_OPTIMIZATION_PROMPT, {
    projectContext: contextString,
    workloadDetails: workloadDetails,
    predictionWindow: predictionWindowDays,
  });

  const startTime = Date.now();

  const { data, usage } = await jsonPrompt<{
    workloadBalance: WorkloadBalanceScore;
    confidence: number;
    reassignmentSuggestions: TaskReassignment[];
    bottlenecks: ResourceBottleneck[];
    capacityForecast: Array<{
      weekNumber: number;
      weekStart: string;
      availableHours: number;
      requiredHours: number;
      status: string;
    }>;
    riskFactors: RiskFactor[];
    explanation: string;
    recommendations: Recommendation[];
  }>(prompt, {
    tenantId,
    toolId: 'project-ml',
    operation: 'resource-optimization',
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
    predictionType: 'RESOURCE_OPTIMIZATION',
    probability: data.workloadBalance.score,
    confidence: data.confidence,
    predictionWindowDays,
    riskFactors: data.riskFactors,
    explanation: data.explanation,
    recommendations: data.recommendations,
    llmMetadata,
    workloadBalance: data.workloadBalance,
    reassignmentSuggestions: data.reassignmentSuggestions,
    bottlenecks: data.bottlenecks,
    capacityForecast: data.capacityForecast.map((cf) => ({
      ...cf,
      weekStart: new Date(cf.weekStart),
      status: cf.status as CapacityForecast['status'],
    })),
  };
}

// ============================================================================
// Rule-Based Fallback
// ============================================================================

export function optimizeProjectResourcesRuleBased(
  context: ProjectMLContext,
  predictionWindowDays: number,
): ResourceOptimizationResult {
  const { teamMetrics, taskMetrics } = context;

  // Calculate workload balance
  const workloadBalance = calculateWorkloadBalance(teamMetrics);

  // Identify bottlenecks
  const bottlenecks = identifyBottlenecks(teamMetrics, taskMetrics);

  // Generate reassignment suggestions
  const reassignmentSuggestions = generateReassignmentSuggestions(teamMetrics);

  // Generate capacity forecast
  const capacityForecast = generateCapacityForecast(teamMetrics, taskMetrics);

  // Risk factors
  const riskFactors: RiskFactor[] = [];

  if (teamMetrics.workloadImbalance > 0.5) {
    riskFactors.push({
      factor: 'Workload Imbalance',
      impact: teamMetrics.workloadImbalance > 0.7 ? 'high' : 'medium',
      currentValue: `${(teamMetrics.workloadImbalance * 100).toFixed(0)}%`,
      threshold: '50%',
      trend: 'stable',
      description: 'Work is unevenly distributed across team',
    });
  }

  const overloadedMembers = teamMetrics.workloadDistribution.filter(
    (w) => w.taskCount > 10 || w.overdueCount > 2,
  );
  if (overloadedMembers.length > 0) {
    riskFactors.push({
      factor: 'Overloaded Team Members',
      impact: 'high',
      currentValue: overloadedMembers.length,
      threshold: 0,
      trend: 'worsening',
      description: `${overloadedMembers.length} team members have excessive workload`,
    });
  }

  // Recommendations
  const recommendations: Recommendation[] = [];

  if (teamMetrics.workloadImbalance > 0.5) {
    recommendations.push({
      priority: 'high',
      action: 'Redistribute tasks to balance workload',
      rationale: 'Uneven workload leads to bottlenecks and burnout',
      expectedImpact: 'Improved team efficiency and morale',
      effort: 'medium',
      timeframe: 'This sprint',
    });
  }

  if (bottlenecks.length > 0) {
    recommendations.push({
      priority: 'urgent',
      action: 'Address identified bottlenecks',
      rationale: 'Bottlenecks are blocking overall progress',
      expectedImpact: 'Unblocked workflows',
      effort: 'medium',
      timeframe: 'Within 48 hours',
    });
  }

  const explanation = `Workload balance is ${workloadBalance.interpretation}. ${bottlenecks.length} bottleneck${bottlenecks.length !== 1 ? 's' : ''} identified. ${reassignmentSuggestions.length} task reassignment${reassignmentSuggestions.length !== 1 ? 's' : ''} suggested.`;

  return {
    predictionType: 'RESOURCE_OPTIMIZATION',
    probability: workloadBalance.score,
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
    workloadBalance,
    reassignmentSuggestions,
    bottlenecks,
    capacityForecast,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

function calculateWorkloadBalance(
  teamMetrics: ProjectMLContext['teamMetrics'],
): WorkloadBalanceScore {
  const { workloadDistribution, workloadImbalance } = teamMetrics;

  // Score is inverse of imbalance (0 imbalance = 1.0 score)
  const score = Math.max(0, 1 - workloadImbalance);

  let interpretation: WorkloadBalanceScore['interpretation'];
  if (score >= 0.8) {
    interpretation = 'excellent';
  } else if (score >= 0.6) {
    interpretation = 'good';
  } else if (score >= 0.4) {
    interpretation = 'fair';
  } else {
    interpretation = 'poor';
  }

  // Find most overloaded and underloaded
  const sorted = [...workloadDistribution].sort(
    (a, b) => b.taskCount - a.taskCount,
  );

  const mostOverloaded =
    sorted.length > 0 && sorted[0].taskCount > 0
      ? {
          userId: sorted[0].userId,
          name: sorted[0].name,
          taskCount: sorted[0].taskCount,
        }
      : null;

  const withTasks = sorted.filter((w) => w.taskCount > 0);
  const mostUnderloaded =
    withTasks.length > 1
      ? {
          userId: withTasks[withTasks.length - 1].userId,
          name: withTasks[withTasks.length - 1].name,
          taskCount: withTasks[withTasks.length - 1].taskCount,
        }
      : null;

  return {
    score,
    interpretation,
    mostOverloaded,
    mostUnderloaded,
  };
}

function identifyBottlenecks(
  teamMetrics: ProjectMLContext['teamMetrics'],
  taskMetrics: ProjectMLContext['taskMetrics'],
): ResourceBottleneck[] {
  const bottlenecks: ResourceBottleneck[] = [];

  // Check for overloaded members
  const overloaded = teamMetrics.workloadDistribution.filter(
    (w) => w.taskCount > 10 || w.overdueCount > 2,
  );
  for (const member of overloaded) {
    bottlenecks.push({
      type: 'overloaded_member',
      description: `${member.name} has ${member.taskCount} tasks assigned with ${member.overdueCount} overdue`,
      severity: member.overdueCount > 3 ? 'high' : 'medium',
      affectedItems: [member.name],
      resolution: 'Redistribute tasks to other team members',
    });
  }

  // Check for unassigned tasks (simplified - would need task data)
  if (taskMetrics.inProgress > teamMetrics.activeMembers * 5) {
    bottlenecks.push({
      type: 'dependency_chain',
      description: 'Too many tasks in progress relative to team size',
      severity: 'medium',
      affectedItems: ['Work in progress'],
      resolution: 'Focus on completing current tasks before starting new ones',
    });
  }

  return bottlenecks;
}

function generateReassignmentSuggestions(
  teamMetrics: ProjectMLContext['teamMetrics'],
): TaskReassignment[] {
  const suggestions: TaskReassignment[] = [];

  const sorted = [...teamMetrics.workloadDistribution].sort(
    (a, b) => b.taskCount - a.taskCount,
  );

  if (sorted.length < 2) return suggestions;

  const overloaded = sorted.filter((w) => w.taskCount > 8);
  const underloaded = sorted.filter((w) => w.taskCount < 3);

  // Suggest moving tasks from overloaded to underloaded
  for (const from of overloaded) {
    for (const to of underloaded) {
      if (from.taskCount - to.taskCount > 3) {
        suggestions.push({
          taskId: 0, // Would need actual task data
          taskTitle: 'Task from overloaded queue',
          currentAssignee: { userId: from.userId, name: from.name },
          suggestedAssignee: { userId: to.userId, name: to.name },
          reason: `${from.name} has ${from.taskCount} tasks, ${to.name} only has ${to.taskCount}`,
          expectedImpact: 'Balance workload and reduce bottleneck',
          confidence: 0.7,
        });
        break;
      }
    }
  }

  return suggestions.slice(0, 5); // Limit suggestions
}

function generateCapacityForecast(
  teamMetrics: ProjectMLContext['teamMetrics'],
  taskMetrics: ProjectMLContext['taskMetrics'],
): CapacityForecast[] {
  const forecast: CapacityForecast[] = [];
  const now = new Date();

  // Estimate hours per week
  const hoursPerMemberPerWeek = 40;
  const totalCapacity = teamMetrics.activeMembers * hoursPerMemberPerWeek;

  // Estimate required hours based on remaining tasks
  const remainingTasks = taskMetrics.total - taskMetrics.completed;
  const avgHoursPerTask = 4;
  const totalRequiredHours = remainingTasks * avgHoursPerTask;
  const weeksNeeded = Math.ceil(totalRequiredHours / totalCapacity) || 1;
  const weeklyRequired = totalRequiredHours / weeksNeeded;

  for (let week = 1; week <= 4; week++) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() + (week - 1) * 7);

    // Assume steady workload distribution
    const requiredHours = weeklyRequired;
    const availableHours = totalCapacity;

    let status: CapacityForecast['status'];
    if (requiredHours > availableHours * 1.2) {
      status = 'over_capacity';
    } else if (requiredHours < availableHours * 0.7) {
      status = 'under_capacity';
    } else {
      status = 'balanced';
    }

    forecast.push({
      weekNumber: week,
      weekStart,
      availableHours,
      requiredHours,
      status,
    });
  }

  return forecast;
}

function formatStoredAsResult(
  stored: NonNullable<Awaited<ReturnType<typeof getLatestPrediction>>>,
  predictionWindowDays: number,
): ResourceOptimizationResult {
  return {
    predictionType: 'RESOURCE_OPTIMIZATION',
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
    workloadBalance: (stored.workloadAnalysis as WorkloadBalanceScore) || {
      score: stored.probability,
      interpretation: 'fair',
      mostOverloaded: null,
      mostUnderloaded: null,
    },
    reassignmentSuggestions: (stored.resourceRecommendations ||
      []) as TaskReassignment[],
    bottlenecks: [],
    capacityForecast: [],
  };
}
