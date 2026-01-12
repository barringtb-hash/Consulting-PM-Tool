/**
 * Lead ML API Client
 *
 * API client for Lead ML predictions and analytics.
 */

import { http } from './http';

// ============================================================================
// Types
// ============================================================================

export type LeadPredictionType =
  | 'CONVERSION'
  | 'TIME_TO_CLOSE'
  | 'SCORE'
  | 'PRIORITY';
export type LeadPredictionStatus =
  | 'ACTIVE'
  | 'EXPIRED'
  | 'VALIDATED'
  | 'INVALIDATED';
export type LeadScoreLevel = 'HOT' | 'WARM' | 'COLD' | 'DEAD';

export interface LeadRiskFactor {
  factor: string;
  impact: 'high' | 'medium' | 'low';
  currentValue: string | number;
  trend: 'improving' | 'stable' | 'declining';
  description: string;
}

export interface LeadRecommendation {
  priority: 'urgent' | 'high' | 'medium' | 'low';
  action: string;
  rationale: string;
  expectedImpact: string;
  timeframe: string;
}

export interface LLMMetadata {
  model: string;
  tokensUsed: number;
  latencyMs: number;
  estimatedCost: number;
}

export interface LeadPrediction {
  predictionType: LeadPredictionType;
  probability: number;
  confidence: number;
  predictedValue: number | null;
  predictedDays: number | null;
  riskFactors: LeadRiskFactor[];
  explanation: string;
  recommendations: LeadRecommendation[];
  llmMetadata: LLMMetadata;
}

export interface ConversionPrediction extends LeadPrediction {
  predictionType: 'CONVERSION';
  predictedScoreLevel: LeadScoreLevel;
  predictionId: number;
}

export interface TimeToClosePrediction extends LeadPrediction {
  predictionType: 'TIME_TO_CLOSE';
  confidenceInterval: {
    low: number;
    high: number;
  };
  predictionId: number;
}

export interface ScorePrediction extends LeadPrediction {
  predictionType: 'SCORE';
  predictedScore: number;
  scoreBreakdown: {
    demographic: number;
    behavioral: number;
    temporal: number;
    engagement: number;
  };
  predictionId: number;
}

export interface RankedLead {
  leadId: number;
  email: string;
  name: string | null;
  company: string | null;
  title: string | null;
  score: number;
  scoreLevel: string;
  priorityRank: number;
  priorityTier: 'top' | 'high' | 'medium' | 'low';
  priorityScore: number;
  conversionProbability: number;
  reasoning: string;
}

export interface PriorityRankingResult {
  rankings: RankedLead[];
  insights: {
    topLeadCount: number;
    avgConversionProbability: number;
    commonPatterns: string[];
  };
  llmMetadata: LLMMetadata;
}

export interface FeatureImportance {
  name: string;
  importance: number;
  category: 'demographic' | 'behavioral' | 'temporal' | 'engagement' | 'text';
}

export interface PredictionAccuracy {
  totalPredictions: number;
  validatedCount: number;
  accurateCount: number;
  accuracy: number;
  byType: Record<string, { total: number; accurate: number; accuracy: number }>;
}

export interface LeadFeatures {
  demographic: {
    hasCompany: boolean;
    hasTitle: boolean;
    hasPhone: boolean;
    emailDomainType: string;
    titleSeniority: string;
    companySizeEstimate: string;
    emailDomain: string | null;
  };
  behavioral: {
    emailOpenCount: number;
    emailClickCount: number;
    pageViewCount: number;
    formSubmitCount: number;
    meetingCount: number;
    callCount: number;
    activityVelocity: number;
    channelDiversity: number;
    highValueActionCount: number;
    totalActivities: number;
  };
  temporal: {
    daysSinceCreated: number;
    daysSinceLastActivity: number;
    recencyScore: number;
    activityBurst: boolean;
    dayPattern: string;
    timePattern: string;
    leadAgeWeeks: number;
  };
  engagement: {
    totalEngagementScore: number;
    emailOpenRate: number;
    emailClickRate: number;
    sequenceEngagement: number;
    avgResponseTime: number | null;
    isInActiveSequence: boolean;
    currentSequenceStep: number | null;
  };
}

export interface BulkPredictionResult {
  processed: number;
  successful: number;
  failed: number;
  predictions: Array<{
    leadId: number;
    result: LeadPrediction | null;
    error: string | null;
  }>;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Generate conversion prediction for a lead
 */
export async function predictLeadConversion(
  leadId: number,
  options?: { forceRefresh?: boolean; ruleBasedOnly?: boolean },
): Promise<{ prediction: ConversionPrediction }> {
  return http.post(`/api/lead-scoring/leads/${leadId}/ml/predict`, options);
}

/**
 * Get latest prediction for a lead
 */
export async function getLeadPrediction(
  leadId: number,
  type: LeadPredictionType = 'CONVERSION',
): Promise<{ id: number; isExpired: boolean; prediction: LeadPrediction }> {
  return http.get(
    `/api/lead-scoring/leads/${leadId}/ml/prediction?type=${type}`,
  );
}

/**
 * Generate time-to-close prediction
 */
export async function predictTimeToClose(
  leadId: number,
  options?: { forceRefresh?: boolean },
): Promise<{ prediction: TimeToClosePrediction }> {
  return http.post(
    `/api/lead-scoring/leads/${leadId}/ml/predict-time`,
    options,
  );
}

/**
 * Generate score prediction with explanation
 */
export async function predictLeadScore(
  leadId: number,
  options?: { forceRefresh?: boolean },
): Promise<{ prediction: ScorePrediction }> {
  return http.post(
    `/api/lead-scoring/leads/${leadId}/ml/predict-score`,
    options,
  );
}

/**
 * Get extracted features for a lead
 */
export async function getLeadFeatures(
  leadId: number,
): Promise<{ features: LeadFeatures }> {
  return http.get(`/api/lead-scoring/leads/${leadId}/ml/features`);
}

/**
 * Bulk predict conversions for leads in a config
 */
export async function bulkPredictConversions(
  configId: number,
  options?: { limit?: number; minScore?: number; forceRefresh?: boolean },
): Promise<BulkPredictionResult> {
  return http.post(`/api/lead-scoring/${configId}/ml/bulk-predict`, options);
}

/**
 * Get priority-ranked leads
 */
export async function getRankedLeads(
  configId: number,
  options?: {
    limit?: number;
    minScore?: number;
    minProbability?: number;
    useLLM?: boolean;
  },
): Promise<PriorityRankingResult> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.minScore) params.set('minScore', String(options.minScore));
  if (options?.minProbability)
    params.set('minProbability', String(options.minProbability));
  if (options?.useLLM !== undefined)
    params.set('useLLM', String(options.useLLM));

  const query = params.toString();
  return http.get(
    `/api/lead-scoring/${configId}/ml/ranked-leads${query ? `?${query}` : ''}`,
  );
}

/**
 * Get top priority leads
 */
export async function getTopPriorityLeads(
  configId: number,
  n: number = 10,
): Promise<{ leads: RankedLead[] }> {
  return http.get(`/api/lead-scoring/${configId}/ml/top-leads?n=${n}`);
}

/**
 * Get leads by priority tier
 */
export async function getLeadsByTier(
  configId: number,
  tier: 'top' | 'high' | 'medium' | 'low',
): Promise<{ leads: RankedLead[] }> {
  return http.get(
    `/api/lead-scoring/${configId}/ml/leads-by-tier?tier=${tier}`,
  );
}

/**
 * Validate a prediction
 */
export async function validatePrediction(
  predictionId: number,
  wasAccurate: boolean,
): Promise<{ success: boolean }> {
  return http.post(`/api/lead-scoring/predictions/${predictionId}/validate`, {
    wasAccurate,
  });
}

/**
 * Get prediction accuracy metrics
 */
export async function getPredictionAccuracy(
  configId: number,
  options?: { startDate?: string; endDate?: string },
): Promise<PredictionAccuracy> {
  const params = new URLSearchParams();
  if (options?.startDate) params.set('startDate', options.startDate);
  if (options?.endDate) params.set('endDate', options.endDate);

  const query = params.toString();
  return http.get(
    `/api/lead-scoring/${configId}/ml/accuracy${query ? `?${query}` : ''}`,
  );
}

/**
 * Get feature importance
 */
export async function getFeatureImportance(
  configId: number,
): Promise<{ importance: FeatureImportance[] }> {
  return http.get(`/api/lead-scoring/${configId}/ml/feature-importance`);
}
