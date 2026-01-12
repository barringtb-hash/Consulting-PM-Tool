/**
 * Lead ML Prediction Types
 *
 * Core type definitions for ML-powered lead predictions.
 * Used across all lead prediction services.
 *
 * @module lead-ml/types
 */

import type {
  LeadPredictionStatus,
  LeadPredictionType,
  LeadScoreLevel,
  ScoredLead,
} from '@prisma/client';
import type { LeadFeatures } from './lead-features.types';

// ============================================================================
// Lead Context Types
// ============================================================================

/**
 * Activity summary for a lead
 */
export interface ActivitySummary {
  /** Activity type */
  type: string;
  /** Count of this activity type */
  count: number;
  /** Most recent occurrence */
  lastOccurred: Date | null;
}

/**
 * Lead basic information
 */
export interface LeadInfo {
  id: number;
  email: string;
  name: string | null;
  company: string | null;
  phone: string | null;
  title: string | null;
  score: number;
  scoreLevel: LeadScoreLevel;
  pipelineStage: string | null;
  pipelineValue: number | null;
  createdAt: Date;
}

/**
 * Engagement metrics for lead context
 */
export interface EngagementMetrics {
  totalEmailsSent: number;
  totalEmailsOpened: number;
  totalEmailsClicked: number;
  totalWebsiteVisits: number;
  lastEngagementAt: Date | null;
}

/**
 * Complete lead context for ML analysis
 */
export interface LeadMLContext {
  /** Lead basic info */
  lead: LeadInfo;
  /** Engagement metrics */
  engagement: EngagementMetrics;
  /** Activity summary by type */
  activitySummary: ActivitySummary[];
  /** Recent activities (last 30 days) */
  recentActivities: Array<{
    type: string;
    createdAt: Date;
    data: Record<string, unknown> | null;
  }>;
  /** Extracted features */
  features: LeadFeatures;
  /** Score history */
  scoreHistory: Array<{
    score: number;
    level: string;
    scoredAt: Date;
    reason: string | null;
  }>;
  /** Nurture sequence info */
  sequenceInfo: {
    isEnrolled: boolean;
    sequenceName: string | null;
    currentStep: number | null;
    totalSteps: number | null;
  } | null;
}

// ============================================================================
// Risk Factor Types
// ============================================================================

/**
 * Impact level of a factor
 */
export type FactorImpact = 'high' | 'medium' | 'low';

/**
 * Trend direction
 */
export type FactorTrend = 'improving' | 'stable' | 'declining';

/**
 * A factor contributing to the prediction
 */
export interface LeadRiskFactor {
  /** Factor name */
  factor: string;
  /** Impact level */
  impact: FactorImpact;
  /** Current value */
  currentValue: string | number;
  /** Trend direction */
  trend: FactorTrend;
  /** Human-readable description */
  description: string;
}

// ============================================================================
// Recommendation Types
// ============================================================================

/**
 * Recommendation priority
 */
export type RecommendationPriority = 'urgent' | 'high' | 'medium' | 'low';

/**
 * Actionable recommendation
 */
export interface LeadRecommendation {
  /** Priority level */
  priority: RecommendationPriority;
  /** Action to take */
  action: string;
  /** Why this helps */
  rationale: string;
  /** Expected outcome */
  expectedImpact: string;
  /** When to do this */
  timeframe: string;
}

// ============================================================================
// LLM Metadata Types
// ============================================================================

/**
 * Metadata about the LLM call
 */
export interface LLMMetadata {
  /** Model used */
  model: string;
  /** Tokens consumed */
  tokensUsed: number;
  /** Latency in ms */
  latencyMs: number;
  /** Estimated cost in USD */
  estimatedCost: number;
}

// ============================================================================
// Prediction Result Types
// ============================================================================

/**
 * Base prediction result
 */
export interface LeadPredictionResult {
  /** Type of prediction */
  predictionType: LeadPredictionType;
  /** Probability (0-1) */
  probability: number;
  /** Confidence in prediction (0-1) */
  confidence: number;
  /** Predicted value (for deals) */
  predictedValue: number | null;
  /** Predicted days to close */
  predictedDays: number | null;
  /** Contributing factors */
  riskFactors: LeadRiskFactor[];
  /** Human-readable explanation */
  explanation: string;
  /** Recommended actions */
  recommendations: LeadRecommendation[];
  /** LLM metadata */
  llmMetadata: LLMMetadata;
}

/**
 * Conversion prediction result
 */
export interface ConversionPrediction extends LeadPredictionResult {
  predictionType: 'CONVERSION';
  /** Predicted score level if converted */
  predictedScoreLevel: LeadScoreLevel;
}

/**
 * Time-to-close prediction result
 */
export interface TimeToClosePrediction extends LeadPredictionResult {
  predictionType: 'TIME_TO_CLOSE';
  /** Predicted days to conversion */
  predictedDays: number;
  /** Confidence interval */
  confidenceInterval: {
    low: number;
    high: number;
  };
}

/**
 * Score prediction result
 */
export interface ScorePrediction extends LeadPredictionResult {
  predictionType: 'SCORE';
  /** Predicted score */
  predictedScore: number;
  /** Score breakdown */
  scoreBreakdown: {
    demographic: number;
    behavioral: number;
    temporal: number;
    engagement: number;
  };
}

/**
 * Priority ranking result
 */
export interface PriorityPrediction extends LeadPredictionResult {
  predictionType: 'PRIORITY';
  /** Priority rank (1 = highest) */
  priorityRank: number;
  /** Priority tier */
  priorityTier: 'top' | 'high' | 'medium' | 'low';
}

// ============================================================================
// Service Input Types
// ============================================================================

/**
 * Options for generating predictions
 */
export interface LeadPredictionOptions {
  /** Force refresh even if recent prediction exists */
  forceRefresh?: boolean;
  /** Include detailed explanation */
  includeExplanation?: boolean;
  /** Use rule-based only (skip LLM) */
  ruleBasedOnly?: boolean;
}

/**
 * Input for prediction generation
 */
export interface GenerateLeadPredictionInput {
  /** Lead ID */
  leadId: number;
  /** Tenant ID */
  tenantId: string;
  /** Config ID */
  configId: number;
  /** Prediction type */
  predictionType: LeadPredictionType;
  /** Options */
  options?: LeadPredictionOptions;
}

/**
 * Input for bulk prediction
 */
export interface BulkLeadPredictionInput {
  /** Config ID */
  configId: number;
  /** Tenant ID */
  tenantId: string;
  /** Prediction type */
  predictionType: LeadPredictionType;
  /** Maximum leads to process */
  limit?: number;
  /** Minimum score to include */
  minScore?: number;
  /** Options */
  options?: LeadPredictionOptions;
}

/**
 * Bulk prediction result
 */
export interface BulkLeadPredictionResult {
  /** Number processed */
  processed: number;
  /** Successful predictions */
  successful: number;
  /** Failed predictions */
  failed: number;
  /** Predictions */
  predictions: Array<{
    leadId: number;
    result: LeadPredictionResult | null;
    error: string | null;
  }>;
}

// ============================================================================
// Model Training Types
// ============================================================================

/**
 * Training data statistics
 */
export interface TrainingDataStats {
  /** Total samples */
  totalSamples: number;
  /** Positive samples (converted) */
  positiveSamples: number;
  /** Negative samples */
  negativeSamples: number;
  /** Class balance ratio */
  classBalance: number;
  /** Date range */
  dateRange: {
    start: Date;
    end: Date;
  };
}

/**
 * Model training result
 */
export interface ModelTrainingResult {
  /** Model version */
  modelVersion: string;
  /** Model type */
  modelType: string;
  /** Training duration in seconds */
  trainingDuration: number;
  /** Training data count */
  trainingDataCount: number;
  /** Performance metrics */
  metrics: {
    accuracy: number | null;
    precision: number | null;
    recall: number | null;
    f1Score: number | null;
    auc: number | null;
  };
  /** Feature weights */
  featureWeights: Record<string, number>;
  /** Hyperparameters used */
  hyperparameters: Record<string, unknown>;
}

// ============================================================================
// Analytics Types
// ============================================================================

/**
 * Prediction accuracy metrics
 */
export interface LeadPredictionAccuracy {
  /** Total predictions */
  totalPredictions: number;
  /** Validated predictions */
  validatedCount: number;
  /** Accurate predictions */
  accurateCount: number;
  /** Accuracy rate (0-1) */
  accuracy: number;
  /** By prediction type */
  byType: Record<
    string,
    {
      total: number;
      accurate: number;
      accuracy: number;
    }
  >;
}

/**
 * Feature importance entry
 */
export interface FeatureImportance {
  /** Feature name */
  name: string;
  /** Importance score (0-1) */
  importance: number;
  /** Category */
  category: 'demographic' | 'behavioral' | 'temporal' | 'engagement' | 'text';
}

/**
 * Model performance over time
 */
export interface ModelPerformanceHistory {
  /** Date */
  date: Date;
  /** Accuracy */
  accuracy: number;
  /** Predictions made */
  predictionsCount: number;
  /** Average confidence */
  avgConfidence: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Lead ML configuration
 */
export interface LeadMLConfig {
  /** Enable ML predictions */
  enableMLPredictions: boolean;
  /** Enable auto-scoring on activity */
  enableAutoScoring: boolean;
  /** Prediction validity days */
  predictionValidityDays: number;
  /** Minimum confidence to show */
  minConfidenceThreshold: number;
  /** Use LLM for predictions */
  useLLMPredictions: boolean;
  /** LLM model to use */
  llmModel: string;
  /** Temperature for LLM */
  llmTemperature: number;
}

/**
 * Default ML configuration
 */
export const DEFAULT_LEAD_ML_CONFIG: LeadMLConfig = {
  enableMLPredictions: true,
  enableAutoScoring: true,
  predictionValidityDays: 7,
  minConfidenceThreshold: 0.5,
  useLLMPredictions: true,
  llmModel: 'gpt-4o-mini',
  llmTemperature: 0.3,
};

// ============================================================================
// Re-exports
// ============================================================================

export { LeadPredictionStatus, LeadPredictionType, LeadScoreLevel };
export type { ScoredLead };
