/**
 * Customer Success ML Module
 *
 * ML-powered predictions and insights for Customer Success.
 * Provides churn prediction, health analysis, and intelligent CTA generation.
 *
 * @module customer-success-ml
 */

// Router
export { default as customerSuccessMLRouter } from './customer-success-ml.router';

// Services
export * from './services';

// Types
export * from './types';

// Prompts (for testing/customization)
export {
  CS_ML_SYSTEM_PROMPT,
  CHURN_PREDICTION_PROMPT,
  HEALTH_ANALYSIS_PROMPT,
  CTA_GENERATION_PROMPT,
  EXPANSION_PREDICTION_PROMPT,
  ENGAGEMENT_DECLINE_PROMPT,
  buildChurnPredictionPrompt,
  formatAccountContext,
  formatHealthHistory,
  formatActivities,
  formatOpenCTAs,
  formatEngagementMetrics,
} from './prompts/cs-ml-prompts';
