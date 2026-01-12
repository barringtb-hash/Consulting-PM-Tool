/**
 * Customer Success ML Services - Module Exports
 *
 * Re-exports all service functions for the Customer Success ML module.
 *
 * @module customer-success-ml/services
 */

// Core ML prediction service
export {
  gatherAccountContext,
  storePrediction,
  getLatestPrediction,
  listAccountPredictions,
  validateExpiredPredictions,
  getPredictionAccuracy,
  hasRecentPrediction,
  isMLAvailable,
  getMLConfig,
  linkCTAToPrediction,
  getHighRiskAccounts,
  expireOldPredictions,
} from './cs-ml-prediction.service';

// Churn prediction service
export {
  predictChurn,
  predictChurnRuleBased,
  getExistingChurnPrediction,
  needsChurnPredictionRefresh,
} from './churn-prediction.service';

// Health insights service
export {
  analyzeAccountHealth,
  type HealthAnalysisOutput,
  type HealthAnalysisInput,
  type HealthInsight,
  type HealthAnomaly,
} from './ml-health-insights.service';

// Intelligent CTA service
export {
  generateCTAFromPrediction,
  generateBatchCTAs,
  generateChurnCTA,
  getMLCTAStats,
} from './intelligent-cta.service';
