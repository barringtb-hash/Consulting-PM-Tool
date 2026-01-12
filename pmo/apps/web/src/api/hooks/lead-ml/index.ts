/**
 * Lead ML React Query Hooks
 *
 * Provides React Query hooks for Lead ML predictions and analytics.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import * as leadMLApi from '../../lead-ml';
import type {
  LeadPredictionType,
  ConversionPrediction,
  TimeToClosePrediction,
  ScorePrediction,
  LeadFeatures,
  RankedLead,
  PriorityRankingResult,
  PredictionAccuracy,
  FeatureImportance,
  BulkPredictionResult,
} from '../../lead-ml';

// =============================================================================
// PREDICTION HOOKS
// =============================================================================

/**
 * Generate conversion prediction for a lead
 */
export function usePredictLeadConversion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      options,
    }: {
      leadId: number;
      options?: { forceRefresh?: boolean; ruleBasedOnly?: boolean };
    }) => leadMLApi.predictLeadConversion(leadId, options),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.leadML.predictions.lead(variables.leadId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.leadML.rankings.all(),
      });
    },
  });
}

/**
 * Get latest prediction for a lead
 */
export function useLeadPrediction(
  leadId: number,
  type: LeadPredictionType = 'CONVERSION',
) {
  return useQuery({
    queryKey: queryKeys.leadML.predictions.lead(leadId, type),
    queryFn: () => leadMLApi.getLeadPrediction(leadId, type),
    enabled: !!leadId,
  });
}

/**
 * Generate time-to-close prediction
 */
export function usePredictTimeToClose() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      options,
    }: {
      leadId: number;
      options?: { forceRefresh?: boolean };
    }) => leadMLApi.predictTimeToClose(leadId, options),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.leadML.predictions.lead(
          variables.leadId,
          'TIME_TO_CLOSE',
        ),
      });
    },
  });
}

/**
 * Generate score prediction with explanation
 */
export function usePredictLeadScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      leadId,
      options,
    }: {
      leadId: number;
      options?: { forceRefresh?: boolean };
    }) => leadMLApi.predictLeadScore(leadId, options),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.leadML.predictions.lead(variables.leadId, 'SCORE'),
      });
    },
  });
}

// =============================================================================
// FEATURE HOOKS
// =============================================================================

/**
 * Get extracted features for a lead
 */
export function useLeadFeatures(leadId: number) {
  return useQuery({
    queryKey: queryKeys.leadML.features.lead(leadId),
    queryFn: () => leadMLApi.getLeadFeatures(leadId),
    enabled: !!leadId,
  });
}

/**
 * Get feature importance for a config
 */
export function useFeatureImportance(configId: number) {
  return useQuery({
    queryKey: queryKeys.leadML.features.importance(configId),
    queryFn: () => leadMLApi.getFeatureImportance(configId),
    enabled: !!configId,
  });
}

// =============================================================================
// BULK PREDICTION HOOKS
// =============================================================================

/**
 * Bulk predict conversions for leads in a config
 */
export function useBulkPredictConversions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      configId,
      options,
    }: {
      configId: number;
      options?: {
        limit?: number;
        minScore?: number;
        forceRefresh?: boolean;
      };
    }) => leadMLApi.bulkPredictConversions(configId, options),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.leadML.predictions.bulk(variables.configId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.leadML.rankings.all(),
      });
    },
  });
}

// =============================================================================
// RANKING HOOKS
// =============================================================================

/**
 * Get priority-ranked leads
 */
export function useRankedLeads(
  configId: number,
  options?: {
    limit?: number;
    minScore?: number;
    minProbability?: number;
    useLLM?: boolean;
  },
) {
  return useQuery({
    queryKey: queryKeys.leadML.rankings.ranked(configId, options),
    queryFn: () => leadMLApi.getRankedLeads(configId, options),
    enabled: !!configId,
  });
}

/**
 * Get top priority leads
 */
export function useTopPriorityLeads(configId: number, n: number = 10) {
  return useQuery({
    queryKey: queryKeys.leadML.rankings.top(configId, n),
    queryFn: () => leadMLApi.getTopPriorityLeads(configId, n),
    enabled: !!configId,
  });
}

/**
 * Get leads by priority tier
 */
export function useLeadsByTier(
  configId: number,
  tier: 'top' | 'high' | 'medium' | 'low',
) {
  return useQuery({
    queryKey: queryKeys.leadML.rankings.byTier(configId, tier),
    queryFn: () => leadMLApi.getLeadsByTier(configId, tier),
    enabled: !!configId,
  });
}

// =============================================================================
// VALIDATION & ACCURACY HOOKS
// =============================================================================

/**
 * Validate a prediction
 */
export function useValidatePrediction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      predictionId,
      wasAccurate,
    }: {
      predictionId: number;
      wasAccurate: boolean;
    }) => leadMLApi.validatePrediction(predictionId, wasAccurate),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.leadML.accuracy.all(),
      });
    },
  });
}

/**
 * Get prediction accuracy metrics
 */
export function usePredictionAccuracy(
  configId: number,
  options?: { startDate?: string; endDate?: string },
) {
  return useQuery({
    queryKey: queryKeys.leadML.accuracy.config(configId, options),
    queryFn: () => leadMLApi.getPredictionAccuracy(configId, options),
    enabled: !!configId,
  });
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  LeadPredictionType,
  ConversionPrediction,
  TimeToClosePrediction,
  ScorePrediction,
  LeadFeatures,
  RankedLead,
  PriorityRankingResult,
  PredictionAccuracy,
  FeatureImportance,
  BulkPredictionResult,
};
