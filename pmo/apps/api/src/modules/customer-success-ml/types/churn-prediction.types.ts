/**
 * Churn Prediction Types
 *
 * Specialized type definitions for churn prediction in Customer Success.
 * Extends the base ML prediction types with churn-specific fields.
 *
 * @module customer-success-ml/types/churn-prediction
 */

import type {
  MLPredictionResult,
  RiskFactor,
  Recommendation,
} from './ml-prediction.types';

// ============================================================================
// Risk Category Types
// ============================================================================

/**
 * Risk category based on churn probability.
 * Determines urgency of intervention.
 *
 * @remarks
 * Categories are assigned based on probability thresholds:
 * - critical: >= 80% churn probability
 * - high: 60-79% churn probability
 * - medium: 30-59% churn probability
 * - low: < 30% churn probability
 */
export type ChurnRiskCategory = 'critical' | 'high' | 'medium' | 'low';

/**
 * Urgency level for intervention.
 * Helps CSMs prioritize their time.
 */
export type InterventionUrgency =
  | 'immediate'
  | 'this_week'
  | 'this_month'
  | 'monitor';

// ============================================================================
// Churn Prediction Input Types
// ============================================================================

/**
 * Input parameters for churn prediction.
 */
export interface ChurnPredictionInput {
  /** Account ID to analyze */
  accountId: number;
  /** Tenant context */
  tenantId: string;
  /**
   * Number of days to predict ahead.
   * @default 90
   */
  predictionWindowDays?: number;
}

// ============================================================================
// Churn Prediction Output Types
// ============================================================================

/**
 * Output from the churn prediction service.
 * Extends the base MLPredictionResult with churn-specific fields.
 *
 * @example
 * ```typescript
 * const prediction = await churnPredictionService.predictChurn({
 *   accountId: 123,
 *   tenantId: 'tenant-abc',
 *   predictionWindowDays: 90
 * });
 *
 * console.log(`Churn probability: ${prediction.churnProbability * 100}%`);
 * console.log(`Risk category: ${prediction.riskCategory}`);
 * console.log(`Intervention urgency: ${prediction.interventionUrgency}`);
 *
 * if (prediction.churnProbability > 0.7) {
 *   // High churn risk - escalate to management
 *   await notifyCSManager(prediction);
 * }
 * ```
 */
export interface ChurnPredictionOutput extends MLPredictionResult {
  /** Prediction type - always 'CHURN' for this interface */
  predictionType: 'CHURN';

  /**
   * Probability of churn (0-1).
   * Same as `probability` field, provided for convenience.
   */
  churnProbability: number;

  /**
   * Probability of retention (1 - churnProbability).
   * Useful for optimistic reporting.
   */
  retentionProbability: number;

  /**
   * Risk category based on churn probability.
   *
   * @remarks
   * Categories are assigned as follows:
   * - **critical**: >= 80% probability - Immediate intervention required
   * - **high**: 60-79% probability - Action needed this week
   * - **medium**: 30-59% probability - Monitor closely
   * - **low**: < 30% probability - Healthy account
   */
  riskCategory: ChurnRiskCategory;

  /**
   * Top 3 factors driving churn risk.
   * Extracted from riskFactors for quick reference.
   */
  primaryChurnDrivers: string[];

  /**
   * Urgency of intervention needed.
   *
   * @remarks
   * Urgency levels:
   * - **immediate**: Contact today - critical risk
   * - **this_week**: Schedule within 5 business days - high risk
   * - **this_month**: Plan intervention within 30 days - medium risk
   * - **monitor**: Watch for changes, no immediate action - low risk
   */
  interventionUrgency: InterventionUrgency;
}

// ============================================================================
// LLM Response Types
// ============================================================================

/**
 * Raw response structure from LLM for churn prediction.
 * Used internally for parsing LLM output.
 */
export interface ChurnPredictionLLMResponse {
  churnProbability: number;
  confidence: number;
  riskCategory: ChurnRiskCategory;
  primaryChurnDrivers: string[];
  riskFactors: RiskFactor[];
  explanation: string;
  recommendations: Recommendation[];
  interventionUrgency: InterventionUrgency;
  suggestedCTA?: {
    type: 'RISK' | 'OPPORTUNITY' | 'LIFECYCLE';
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    reason: string;
  };
}

// ============================================================================
// Rule-Based Fallback Types
// ============================================================================

/**
 * Factors used in rule-based churn calculation.
 * Used when LLM is unavailable.
 */
export interface RuleBasedChurnFactors {
  /** Health score contribution (0-0.4) */
  healthScoreFactor: number;
  /** Engagement decline contribution (0-0.2) */
  engagementFactor: number;
  /** Support issues contribution (0-0.2) */
  supportFactor: number;
  /** Sentiment contribution (0-0.15) */
  sentimentFactor: number;
  /** Activity recency contribution (0-0.15) */
  recencyFactor: number;
}

/**
 * Thresholds for rule-based churn factors
 */
export interface ChurnFactorThresholds {
  /** Health score below this is critical */
  criticalHealthScore: number;
  /** Health score below this is concerning */
  warningHealthScore: number;
  /** Days without activity to trigger concern */
  inactivityDays: number;
  /** Support tickets above this is concerning */
  supportTicketThreshold: number;
  /** Negative sentiment ratio threshold */
  negativeSentimentThreshold: number;
}

/**
 * Default thresholds for rule-based calculation
 */
export const DEFAULT_CHURN_THRESHOLDS: ChurnFactorThresholds = {
  criticalHealthScore: 30,
  warningHealthScore: 50,
  inactivityDays: 30,
  supportTicketThreshold: 3,
  negativeSentimentThreshold: 0.3,
};

// ============================================================================
// High Risk Account Types
// ============================================================================

/**
 * High-risk account with prediction details
 */
export interface HighRiskAccount {
  /** Account information */
  account: {
    id: number;
    name: string;
    type: string;
    healthScore: number | null;
  };
  /** Churn prediction details */
  prediction: ChurnPredictionOutput;
}

/**
 * Options for fetching high-risk accounts
 */
export interface HighRiskAccountsOptions {
  /**
   * Minimum churn probability to include.
   * @default 0.6
   */
  minProbability?: number;
  /**
   * Maximum accounts to return.
   * @default 50
   */
  limit?: number;
}

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Input for validating a churn prediction
 */
export interface ChurnValidationInput {
  /** Prediction ID to validate */
  predictionId: number;
  /** Whether the account actually churned */
  didChurn: boolean;
}

/**
 * Result of churn prediction validation
 */
export interface ChurnValidationResult {
  /** Prediction ID that was validated */
  predictionId: number;
  /** Original predicted probability */
  predictedProbability: number;
  /** Actual outcome */
  actualOutcome: boolean;
  /** Whether prediction was accurate */
  wasAccurate: boolean;
  /** When validation occurred */
  validatedAt: Date;
}
