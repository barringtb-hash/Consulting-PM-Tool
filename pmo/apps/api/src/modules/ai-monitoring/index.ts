/**
 * AI Monitoring Module
 *
 * Comprehensive tracking and monitoring for AI tool usage.
 *
 * Features:
 * - Automatic usage tracking with token counts and costs
 * - Aggregated summaries by period (hourly, daily, monthly)
 * - Cost breakdown by tenant and tool
 * - Usage trend analysis
 * - Cost threshold alerts
 */

// Configuration
export {
  AI_MODEL_PRICING,
  AI_COST_THRESHOLDS,
  calculateAICost,
  getModelPricing,
  getKnownModels,
} from './ai-pricing.config';

// Types
export * from './ai-monitoring.types';

// AI Client (use these for tracked AI calls)
export {
  trackedChatCompletion,
  trackedChatCompletionSimple,
  simplePrompt,
  jsonPrompt,
  trackedOpenAIFetch,
  estimateTokens,
  estimateCost,
  isAIAvailable,
} from './ai-client';

// Usage Service
export {
  trackAIUsage,
  trackAIUsageBatch,
  getAIUsageSummary,
  getRealtimeUsageStats,
  getAICostBreakdown,
  getGlobalCostBreakdown,
  getAIUsageTrends,
  aggregateHourlyUsage,
  aggregateDailyUsage,
  checkCostThresholds,
  getMonthlySystemCost,
} from './ai-usage.service';

// Migration Helper (for gradually instrumenting existing code)
export {
  wrapWithTracking,
  manualTrack,
  preflightCostEstimate,
  MODULES_TO_INSTRUMENT,
} from './migration-helper';

// Aggregation Scheduler
export {
  startAggregationScheduler,
  stopAggregationScheduler,
  manualAggregation,
} from './aggregation-scheduler';

// Predictive Analytics
export {
  getCostForecast,
  getUsageForecast,
  getToolPredictions,
  getSeasonalPatterns,
  getBudgetRecommendations,
} from './predictive.service';
