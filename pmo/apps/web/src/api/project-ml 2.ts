/**
 * Project ML API Client
 *
 * API functions for Project ML predictions.
 */

import { http } from './http';

// ============================================================================
// Types
// ============================================================================

export type ProjectMLPredictionType =
  | 'SUCCESS_PREDICTION'
  | 'RISK_FORECAST'
  | 'TIMELINE_PREDICTION'
  | 'RESOURCE_OPTIMIZATION';

export type RiskImpact = 'critical' | 'high' | 'medium' | 'low';
export type RiskTrend = 'improving' | 'stable' | 'worsening';
export type RecommendationPriority = 'urgent' | 'high' | 'medium' | 'low';
export type RecommendationEffort = 'low' | 'medium' | 'high';

export interface RiskFactor {
  factor: string;
  impact: RiskImpact;
  currentValue: string | number;
  threshold?: string | number;
  trend: RiskTrend;
  description: string;
}

export interface Recommendation {
  priority: RecommendationPriority;
  action: string;
  rationale: string;
  expectedImpact: string;
  effort: RecommendationEffort;
  timeframe: string;
}

export interface LLMMetadata {
  model: string;
  tokensUsed: number;
  latencyMs: number;
  estimatedCost: number;
}

export interface SuccessFactor {
  factor: string;
  weight: number;
  description: string;
}

export interface PredictedRisk {
  category: string;
  title: string;
  description: string;
  probability: number;
  impact: RiskImpact;
  mitigationSuggestion: string;
  triggerIndicators: string[];
}

export interface EarlyWarningIndicator {
  indicator: string;
  status: 'normal' | 'warning' | 'critical';
  description: string;
  threshold: string;
}

export interface DelayFactor {
  factor: string;
  delayDays: number;
  confidence: number;
  description: string;
}

export interface AccelerationOpportunity {
  opportunity: string;
  potentialDaysSaved: number;
  effort: RecommendationEffort;
  prerequisites: string[];
}

export interface TaskReassignment {
  taskId: number;
  taskTitle: string;
  currentAssignee: { userId: number; name: string } | null;
  suggestedAssignee: { userId: number; name: string };
  reason: string;
  expectedImpact: string;
  confidence: number;
}

export interface ResourceBottleneck {
  type: string;
  description: string;
  severity: RiskImpact;
  affectedItems: string[];
  resolution: string;
}

export interface CapacityForecast {
  weekNumber: number;
  weekStart: string;
  availableHours: number;
  requiredHours: number;
  status: 'under_capacity' | 'balanced' | 'over_capacity';
}

export interface WorkloadBalanceScore {
  score: number;
  interpretation: 'excellent' | 'good' | 'fair' | 'poor';
  mostOverloaded: { userId: number; name: string; taskCount: number } | null;
  mostUnderloaded: { userId: number; name: string; taskCount: number } | null;
}

// Base prediction result
export interface BasePredictionResult {
  predictionType: ProjectMLPredictionType;
  probability: number;
  confidence: number;
  predictionWindowDays: number;
  riskFactors: RiskFactor[];
  explanation: string;
  recommendations: Recommendation[];
  llmMetadata: LLMMetadata;
}

// Success Prediction
export interface SuccessPredictionResult extends BasePredictionResult {
  predictionType: 'SUCCESS_PREDICTION';
  onTimeProbability: number;
  onBudgetProbability: number;
  overallSuccessProbability: number;
  successFactors: SuccessFactor[];
}

// Risk Forecast
export interface RiskForecastResult extends BasePredictionResult {
  predictionType: 'RISK_FORECAST';
  overallRiskLevel: 'critical' | 'high' | 'medium' | 'low';
  identifiedRisks: PredictedRisk[];
  delayProbability: number;
  estimatedDelayDays: number;
  earlyWarningIndicators: EarlyWarningIndicator[];
}

// Timeline Prediction
export interface TimelinePredictionResult extends BasePredictionResult {
  predictionType: 'TIMELINE_PREDICTION';
  currentEndDate: string | null;
  predictedEndDate: string;
  confidenceInterval: {
    optimistic: string;
    pessimistic: string;
  };
  daysVariance: number;
  delayFactors: DelayFactor[];
  accelerationOpportunities: AccelerationOpportunity[];
}

// Resource Optimization
export interface ResourceOptimizationResult extends BasePredictionResult {
  predictionType: 'RESOURCE_OPTIMIZATION';
  workloadBalance: WorkloadBalanceScore;
  reassignmentSuggestions: TaskReassignment[];
  bottlenecks: ResourceBottleneck[];
  capacityForecast: CapacityForecast[];
}

export type PredictionResult =
  | SuccessPredictionResult
  | RiskForecastResult
  | TimelinePredictionResult
  | ResourceOptimizationResult;

export interface StoredPrediction {
  id: number;
  predictionType: ProjectMLPredictionType;
  probability: number;
  confidence: number;
  explanation: string | null;
  predictedAt: string;
  validUntil: string;
  status: string;
  wasAccurate: boolean | null;
}

export interface HighRiskProject {
  project: {
    id: number;
    name: string;
    status: string;
    healthStatus: string;
  };
  prediction: {
    id: number;
    predictionType: ProjectMLPredictionType;
    probability: number;
    confidence: number;
    explanation: string | null;
    predictedAt: string;
  };
}

export interface PredictionAccuracy {
  totalPredictions: number;
  validatedCount: number;
  accurateCount: number;
  accuracy: number;
  byType: Record<string, { total: number; accurate: number }>;
}

export interface MLStatus {
  available: boolean;
  features: string[];
  config: {
    defaultPredictionWindowDays: number;
    predictionValidityDays: number;
  };
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Build query string from params
 */
function buildQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

/**
 * Generate a prediction for a project
 */
export async function generatePrediction(
  projectId: number,
  predictionType: ProjectMLPredictionType,
  options?: { forceRefresh?: boolean; predictionWindowDays?: number },
): Promise<PredictionResult> {
  const result = await http.post<{ data: PredictionResult }>(
    `/api/projects/${projectId}/ml/predict`,
    { predictionType, options },
  );
  return result.data;
}

/**
 * Get success prediction for a project
 */
export async function getSuccessPrediction(
  projectId: number,
  refresh?: boolean,
): Promise<SuccessPredictionResult> {
  const query = buildQuery({ refresh });
  const result = await http.get<{ data: SuccessPredictionResult }>(
    `/api/projects/${projectId}/ml/success-prediction${query}`,
  );
  return result.data;
}

/**
 * Get risk forecast for a project
 */
export async function getRiskForecast(
  projectId: number,
  refresh?: boolean,
): Promise<RiskForecastResult> {
  const query = buildQuery({ refresh });
  const result = await http.get<{ data: RiskForecastResult }>(
    `/api/projects/${projectId}/ml/risk-forecast${query}`,
  );
  return result.data;
}

/**
 * Get timeline prediction for a project
 */
export async function getTimelinePrediction(
  projectId: number,
  refresh?: boolean,
): Promise<TimelinePredictionResult> {
  const query = buildQuery({ refresh });
  const result = await http.get<{ data: TimelinePredictionResult }>(
    `/api/projects/${projectId}/ml/timeline-prediction${query}`,
  );
  return result.data;
}

/**
 * Get resource optimization for a project
 */
export async function getResourceOptimization(
  projectId: number,
  refresh?: boolean,
): Promise<ResourceOptimizationResult> {
  const query = buildQuery({ refresh });
  const result = await http.get<{ data: ResourceOptimizationResult }>(
    `/api/projects/${projectId}/ml/resource-optimization${query}`,
  );
  return result.data;
}

/**
 * List all predictions for a project
 */
export async function listProjectPredictions(
  projectId: number,
  options?: { type?: ProjectMLPredictionType; includeExpired?: boolean },
): Promise<StoredPrediction[]> {
  const query = buildQuery(options as Record<string, unknown>);
  const result = await http.get<{ data: StoredPrediction[] }>(
    `/api/projects/${projectId}/ml/predictions${query}`,
  );
  return result.data;
}

/**
 * Get high-risk projects
 */
export async function getHighRiskProjects(
  minRisk?: number,
  limit?: number,
): Promise<HighRiskProject[]> {
  const query = buildQuery({ minRisk, limit });
  const result = await http.get<{ data: HighRiskProject[] }>(
    `/api/projects/portfolio/ml/at-risk${query}`,
  );
  return result.data;
}

/**
 * Get prediction accuracy metrics
 */
export async function getPredictionAccuracy(
  predictionType?: ProjectMLPredictionType,
): Promise<PredictionAccuracy> {
  const query = buildQuery({ predictionType });
  const result = await http.get<{ data: PredictionAccuracy }>(
    `/api/projects/portfolio/ml/accuracy${query}`,
  );
  return result.data;
}

/**
 * Validate expired predictions
 */
export async function validatePredictions(): Promise<{ validated: number }> {
  const result = await http.post<{ data: { validated: number } }>(
    '/api/projects/portfolio/ml/validate-predictions',
  );
  return result.data;
}

/**
 * Get ML service status
 */
export async function getMLStatus(): Promise<MLStatus> {
  const result = await http.get<{ data: MLStatus }>(
    '/api/projects/portfolio/ml/status',
  );
  return result.data;
}
