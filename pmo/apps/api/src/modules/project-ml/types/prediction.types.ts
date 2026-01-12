/**
 * Project ML Prediction Types
 *
 * Core type definitions for ML-powered predictions in Project Management.
 * These types are used across all prediction services (success, risk, timeline, resource).
 *
 * @module project-ml/types
 */

import type {
  Project,
  Task,
  Milestone,
  MLPredictionStatus,
  ProjectMLPredictionType,
  ProjectStatus,
  ProjectHealthStatus,
  TaskStatus,
  Priority,
} from '@prisma/client';

// ============================================================================
// Project Context Types
// ============================================================================

/**
 * Task metrics for ML analysis
 */
export interface TaskMetrics {
  /** Total tasks in project */
  total: number;
  /** Tasks not yet started */
  notStarted: number;
  /** Tasks in backlog */
  backlog: number;
  /** Tasks currently in progress */
  inProgress: number;
  /** Blocked tasks */
  blocked: number;
  /** Completed tasks */
  completed: number;
  /** Tasks past due date */
  overdue: number;
  /** Completion rate (0-1) */
  completionRate: number;
  /** Average days to complete a task */
  avgCompletionDays: number;
  /** Tasks completed in last 7 days */
  completedLast7Days: number;
  /** Tasks completed in last 30 days */
  completedLast30Days: number;
  /** Distribution by priority */
  byPriority: {
    P0: number;
    P1: number;
    P2: number;
  };
}

/**
 * Milestone metrics for ML analysis
 */
export interface MilestoneMetrics {
  /** Total milestones */
  total: number;
  /** Completed milestones */
  completed: number;
  /** In progress milestones */
  inProgress: number;
  /** Not started milestones */
  notStarted: number;
  /** Milestones past due */
  overdue: number;
  /** Milestones due in next 14 days */
  upcoming: number;
  /** On-time completion rate (0-1) */
  onTimeRate: number;
}

/**
 * Team member workload info
 */
export interface TeamMemberWorkload {
  /** User ID */
  userId: number;
  /** User name */
  name: string;
  /** Total tasks assigned */
  taskCount: number;
  /** In-progress tasks */
  inProgressCount: number;
  /** Total estimated hours */
  estimatedHours: number;
  /** Overdue tasks */
  overdueCount: number;
}

/**
 * Team metrics for ML analysis
 */
export interface TeamMetrics {
  /** Total team members */
  totalMembers: number;
  /** Members with tasks assigned */
  activeMembers: number;
  /** Workload distribution */
  workloadDistribution: TeamMemberWorkload[];
  /** Gini coefficient for workload (0 = perfectly even, 1 = all tasks on one person) */
  workloadImbalance: number;
}

/**
 * Recent activity metrics
 */
export interface ActivityMetrics {
  /** Tasks completed in last 7 days */
  tasksCompletedLast7Days: number;
  /** Tasks completed in last 30 days */
  tasksCompletedLast30Days: number;
  /** Tasks created in last 7 days */
  tasksCreatedLast7Days: number;
  /** Meetings held in last 30 days */
  meetingsLast30Days: number;
  /** Risks identified from meetings */
  risksIdentified: number;
  /** Decisions recorded */
  decisionsRecorded: number;
}

/**
 * Historical performance metrics
 */
export interface HistoricalPerformance {
  /** Velocity trend (tasks completed per week) */
  velocityTrend: 'improving' | 'stable' | 'declining';
  /** Average velocity (tasks per week) */
  avgVelocity: number;
  /** Average days tasks are delayed */
  avgTaskDelay: number;
  /** Budget utilization percentage (if available) */
  budgetUtilization: number | null;
  /** Days since project started */
  daysSinceStart: number;
  /** Days remaining until planned end */
  daysRemaining: number | null;
}

/**
 * Complete project context for ML analysis
 */
export interface ProjectMLContext {
  /** Project basic information */
  project: {
    id: number;
    name: string;
    status: ProjectStatus;
    healthStatus: ProjectHealthStatus;
    startDate: Date | null;
    endDate: Date | null;
    createdAt: Date;
    visibility: string;
  };
  /** Task metrics */
  taskMetrics: TaskMetrics;
  /** Milestone metrics */
  milestoneMetrics: MilestoneMetrics;
  /** Team metrics */
  teamMetrics: TeamMetrics;
  /** Recent activity */
  activityMetrics: ActivityMetrics;
  /** Historical performance */
  historicalPerformance: HistoricalPerformance;
}

// ============================================================================
// Risk Factor Types
// ============================================================================

/**
 * Impact level of a risk factor
 */
export type RiskImpact = 'critical' | 'high' | 'medium' | 'low';

/**
 * Trend direction for a factor
 */
export type RiskTrend = 'improving' | 'stable' | 'worsening';

/**
 * Risk category for project risks
 */
export type RiskCategory =
  | 'scope'
  | 'schedule'
  | 'resource'
  | 'technical'
  | 'budget'
  | 'external';

/**
 * A contributing factor to the prediction
 */
export interface RiskFactor {
  /** Name of the risk factor */
  factor: string;
  /** How much this factor impacts the prediction */
  impact: RiskImpact;
  /** Current value or state */
  currentValue: string | number;
  /** Threshold that defines concern */
  threshold?: string | number;
  /** Whether this factor is improving or worsening */
  trend: RiskTrend;
  /** Human-readable explanation */
  description: string;
}

// ============================================================================
// Recommendation Types
// ============================================================================

/**
 * Priority level for recommendations
 */
export type RecommendationPriority = 'urgent' | 'high' | 'medium' | 'low';

/**
 * Effort required to implement recommendation
 */
export type RecommendationEffort = 'low' | 'medium' | 'high';

/**
 * An actionable recommendation from ML analysis
 */
export interface Recommendation {
  /** Priority level */
  priority: RecommendationPriority;
  /** What action to take */
  action: string;
  /** Why this action helps */
  rationale: string;
  /** Expected outcome */
  expectedImpact: string;
  /** Estimated effort */
  effort: RecommendationEffort;
  /** When to do this */
  timeframe: string;
}

// ============================================================================
// LLM Metadata Types
// ============================================================================

/**
 * Metadata about the LLM call for tracking
 */
export interface LLMMetadata {
  /** Model used */
  model: string;
  /** Total tokens used */
  tokensUsed: number;
  /** Latency in milliseconds */
  latencyMs: number;
  /** Estimated cost in USD */
  estimatedCost: number;
}

// ============================================================================
// Base Prediction Result
// ============================================================================

/**
 * Base ML prediction result
 */
export interface ProjectMLPredictionResult {
  /** Type of prediction */
  predictionType: ProjectMLPredictionType;
  /** Primary probability score (0-1) */
  probability: number;
  /** Confidence in this prediction (0-1) */
  confidence: number;
  /** Days in the prediction window */
  predictionWindowDays: number;
  /** Factors contributing to this prediction */
  riskFactors: RiskFactor[];
  /** Human-readable explanation */
  explanation: string;
  /** Recommended actions */
  recommendations: Recommendation[];
  /** LLM call metadata */
  llmMetadata: LLMMetadata;
}

// ============================================================================
// Success Prediction Types
// ============================================================================

/**
 * Success factor contributing to project success
 */
export interface SuccessFactor {
  /** Factor name */
  factor: string;
  /** Contribution weight (0-1) */
  weight: number;
  /** Description of why this matters */
  description: string;
}

/**
 * Success prediction result
 */
export interface SuccessPredictionResult extends ProjectMLPredictionResult {
  predictionType: 'SUCCESS_PREDICTION';
  /** Probability of on-time completion */
  onTimeProbability: number;
  /** Probability of staying on budget */
  onBudgetProbability: number;
  /** Overall success probability (combined) */
  overallSuccessProbability: number;
  /** Factors contributing to success */
  successFactors: SuccessFactor[];
}

// ============================================================================
// Risk Forecast Types
// ============================================================================

/**
 * Predicted risk item
 */
export interface PredictedRisk {
  /** Risk category */
  category: RiskCategory;
  /** Risk title */
  title: string;
  /** Detailed description */
  description: string;
  /** Probability of occurrence (0-1) */
  probability: number;
  /** Impact if it occurs */
  impact: RiskImpact;
  /** Suggested mitigation */
  mitigationSuggestion: string;
  /** Indicators that would trigger this risk */
  triggerIndicators: string[];
}

/**
 * Early warning indicator
 */
export interface EarlyWarningIndicator {
  /** Indicator name */
  indicator: string;
  /** Current status */
  status: 'normal' | 'warning' | 'critical';
  /** What to watch for */
  description: string;
  /** Threshold for concern */
  threshold: string;
}

/**
 * Risk forecast result
 */
export interface RiskForecastResult extends ProjectMLPredictionResult {
  predictionType: 'RISK_FORECAST';
  /** Overall risk level */
  overallRiskLevel: 'critical' | 'high' | 'medium' | 'low';
  /** Identified potential risks */
  identifiedRisks: PredictedRisk[];
  /** Probability of any significant delay */
  delayProbability: number;
  /** Estimated delay in days if risks materialize */
  estimatedDelayDays: number;
  /** Early warning indicators to watch */
  earlyWarningIndicators: EarlyWarningIndicator[];
}

// ============================================================================
// Timeline Prediction Types
// ============================================================================

/**
 * Delay factor affecting timeline
 */
export interface DelayFactor {
  /** Factor name */
  factor: string;
  /** Days this factor contributes to delay */
  delayDays: number;
  /** Confidence in this estimate */
  confidence: number;
  /** Description */
  description: string;
}

/**
 * Opportunity to accelerate timeline
 */
export interface AccelerationOpportunity {
  /** Opportunity description */
  opportunity: string;
  /** Potential days saved */
  potentialDaysSaved: number;
  /** Effort required */
  effort: RecommendationEffort;
  /** Prerequisites */
  prerequisites: string[];
}

/**
 * Timeline prediction result
 */
export interface TimelinePredictionResult extends ProjectMLPredictionResult {
  predictionType: 'TIMELINE_PREDICTION';
  /** Current planned end date */
  currentEndDate: Date | null;
  /** Predicted actual end date */
  predictedEndDate: Date;
  /** Confidence interval */
  confidenceInterval: {
    /** Best case */
    optimistic: Date;
    /** Worst case */
    pessimistic: Date;
  };
  /** Days variance (negative = early, positive = late) */
  daysVariance: number;
  /** Factors contributing to delay */
  delayFactors: DelayFactor[];
  /** Opportunities to speed up */
  accelerationOpportunities: AccelerationOpportunity[];
}

// ============================================================================
// Resource Optimization Types
// ============================================================================

/**
 * Task reassignment suggestion
 */
export interface TaskReassignment {
  /** Task ID */
  taskId: number;
  /** Task title */
  taskTitle: string;
  /** Current assignee */
  currentAssignee: { userId: number; name: string } | null;
  /** Suggested new assignee */
  suggestedAssignee: { userId: number; name: string };
  /** Reason for suggestion */
  reason: string;
  /** Expected impact */
  expectedImpact: string;
  /** Confidence in suggestion (0-1) */
  confidence: number;
}

/**
 * Resource bottleneck identification
 */
export interface ResourceBottleneck {
  /** Type of bottleneck */
  type:
    | 'overloaded_member'
    | 'skill_gap'
    | 'dependency_chain'
    | 'unassigned_tasks';
  /** Description */
  description: string;
  /** Severity */
  severity: RiskImpact;
  /** Affected tasks/members */
  affectedItems: string[];
  /** Suggested resolution */
  resolution: string;
}

/**
 * Capacity forecast for team
 */
export interface CapacityForecast {
  /** Week number (from now) */
  weekNumber: number;
  /** Start date of week */
  weekStart: Date;
  /** Total available capacity (hours) */
  availableHours: number;
  /** Estimated required hours */
  requiredHours: number;
  /** Capacity status */
  status: 'under_capacity' | 'balanced' | 'over_capacity';
}

/**
 * Workload balance score
 */
export interface WorkloadBalanceScore {
  /** Overall balance score (0-1, 1 = perfectly balanced) */
  score: number;
  /** Interpretation */
  interpretation: 'excellent' | 'good' | 'fair' | 'poor';
  /** Most overloaded member */
  mostOverloaded: { userId: number; name: string; taskCount: number } | null;
  /** Most underloaded member */
  mostUnderloaded: { userId: number; name: string; taskCount: number } | null;
}

/**
 * Resource optimization result
 */
export interface ResourceOptimizationResult extends ProjectMLPredictionResult {
  predictionType: 'RESOURCE_OPTIMIZATION';
  /** Workload balance assessment */
  workloadBalance: WorkloadBalanceScore;
  /** Task reassignment suggestions */
  reassignmentSuggestions: TaskReassignment[];
  /** Identified bottlenecks */
  bottlenecks: ResourceBottleneck[];
  /** Capacity forecast for next 4 weeks */
  capacityForecast: CapacityForecast[];
}

// ============================================================================
// Prediction Options Types
// ============================================================================

/**
 * Options for generating predictions
 */
export interface PredictionOptions {
  /** Force refresh even if recent prediction exists */
  forceRefresh?: boolean;
  /** Custom prediction window in days */
  predictionWindowDays?: number;
}

/**
 * Options for batch prediction
 */
export interface BatchPredictionOptions {
  /** Maximum projects to process */
  maxProjects?: number;
  /** Filter by project status */
  statusFilter?: ProjectStatus[];
  /** Filter by health status */
  healthFilter?: ProjectHealthStatus[];
}

/**
 * Options for listing predictions
 */
export interface ListPredictionsOptions {
  /** Filter by prediction type */
  type?: ProjectMLPredictionType;
  /** Include expired predictions */
  includeExpired?: boolean;
}

// ============================================================================
// Prediction Accuracy Types
// ============================================================================

/**
 * Accuracy metrics by type
 */
export interface PredictionTypeAccuracy {
  /** Total predictions of this type */
  total: number;
  /** Number that were accurate */
  accurate: number;
}

/**
 * Overall prediction accuracy metrics
 */
export interface PredictionAccuracyMetrics {
  /** Total predictions made */
  totalPredictions: number;
  /** Number validated against outcomes */
  validatedCount: number;
  /** Number that were accurate */
  accurateCount: number;
  /** Overall accuracy (0-1) */
  accuracy: number;
  /** Breakdown by prediction type */
  byType: Record<string, PredictionTypeAccuracy>;
}

// ============================================================================
// Stored Prediction Types (from database)
// ============================================================================

/**
 * Stored prediction from database
 */
export interface StoredPrediction {
  id: number;
  predictionType: ProjectMLPredictionType;
  probability: number;
  confidence: number;
  riskFactors: RiskFactor[];
  explanation: string | null;
  recommendations: Recommendation[] | null;
  predictedAt: Date;
  validUntil: Date;
  status: MLPredictionStatus;
  wasAccurate: boolean | null;
  // Timeline-specific
  predictedEndDate?: Date | null;
  daysVariance?: number | null;
  // Resource-specific
  resourceRecommendations?: TaskReassignment[] | null;
  workloadAnalysis?: WorkloadBalanceScore | null;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Project ML configuration
 */
export interface ProjectMLConfig {
  /** Default prediction window in days */
  defaultPredictionWindowDays: number;
  /** How long predictions stay valid (days) */
  predictionValidityDays: number;
  /** Minimum confidence threshold */
  minConfidenceThreshold: number;
  /** Maximum predictions per day per tenant */
  maxPredictionsPerDay: number;
  /** Success probability thresholds */
  successThresholds: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  /** Risk level thresholds */
  riskThresholds: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

/**
 * Default configuration values
 */
export const DEFAULT_PROJECT_ML_CONFIG: ProjectMLConfig = {
  defaultPredictionWindowDays: 30,
  predictionValidityDays: 7,
  minConfidenceThreshold: 0.5,
  maxPredictionsPerDay: 100,
  successThresholds: {
    excellent: 0.8,
    good: 0.6,
    fair: 0.4,
    poor: 0,
  },
  riskThresholds: {
    critical: 0.8,
    high: 0.6,
    medium: 0.3,
    low: 0,
  },
};

// ============================================================================
// Re-exports from Prisma
// ============================================================================

export {
  MLPredictionStatus,
  ProjectMLPredictionType,
  ProjectStatus,
  ProjectHealthStatus,
  TaskStatus,
  Priority,
};
export type { Project, Task, Milestone };
