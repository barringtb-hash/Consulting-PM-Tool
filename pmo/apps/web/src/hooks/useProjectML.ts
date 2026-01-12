/**
 * Project ML React Query Hooks
 *
 * Custom hooks for fetching and managing Project ML predictions.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSuccessPrediction,
  getRiskForecast,
  getTimelinePrediction,
  getResourceOptimization,
  listProjectPredictions,
  generatePrediction,
  getHighRiskProjects,
  getPredictionAccuracy,
  validatePredictions,
  getMLStatus,
  type ProjectMLPredictionType,
  type SuccessPredictionResult,
  type RiskForecastResult,
  type TimelinePredictionResult,
  type ResourceOptimizationResult,
  type StoredPrediction,
  type HighRiskProject,
  type PredictionAccuracy,
  type MLStatus,
  type PredictionResult,
} from '../api/project-ml';

// Query keys
export const projectMLKeys = {
  all: ['project-ml'] as const,
  project: (id: number) => [...projectMLKeys.all, 'project', id] as const,
  successPrediction: (id: number) =>
    [...projectMLKeys.project(id), 'success'] as const,
  riskForecast: (id: number) => [...projectMLKeys.project(id), 'risk'] as const,
  timelinePrediction: (id: number) =>
    [...projectMLKeys.project(id), 'timeline'] as const,
  resourceOptimization: (id: number) =>
    [...projectMLKeys.project(id), 'resource'] as const,
  predictions: (id: number) =>
    [...projectMLKeys.project(id), 'predictions'] as const,
  portfolio: ['project-ml', 'portfolio'] as const,
  highRisk: () => [...projectMLKeys.portfolio, 'high-risk'] as const,
  accuracy: () => [...projectMLKeys.portfolio, 'accuracy'] as const,
  status: () => [...projectMLKeys.portfolio, 'status'] as const,
};

// ============================================================================
// Project-Level Hooks
// ============================================================================

/**
 * Hook to fetch success prediction for a project
 */
export function useSuccessPrediction(projectId: number, enabled = true) {
  return useQuery<SuccessPredictionResult>({
    queryKey: projectMLKeys.successPrediction(projectId),
    queryFn: () => getSuccessPrediction(projectId),
    enabled: enabled && !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch risk forecast for a project
 */
export function useRiskForecast(projectId: number, enabled = true) {
  return useQuery<RiskForecastResult>({
    queryKey: projectMLKeys.riskForecast(projectId),
    queryFn: () => getRiskForecast(projectId),
    enabled: enabled && !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch timeline prediction for a project
 */
export function useTimelinePrediction(projectId: number, enabled = true) {
  return useQuery<TimelinePredictionResult>({
    queryKey: projectMLKeys.timelinePrediction(projectId),
    queryFn: () => getTimelinePrediction(projectId),
    enabled: enabled && !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch resource optimization for a project
 */
export function useResourceOptimization(projectId: number, enabled = true) {
  return useQuery<ResourceOptimizationResult>({
    queryKey: projectMLKeys.resourceOptimization(projectId),
    queryFn: () => getResourceOptimization(projectId),
    enabled: enabled && !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to list all predictions for a project
 */
export function useProjectPredictions(
  projectId: number,
  options?: { type?: ProjectMLPredictionType; includeExpired?: boolean },
  enabled = true,
) {
  return useQuery<StoredPrediction[]>({
    queryKey: [...projectMLKeys.predictions(projectId), options],
    queryFn: () => listProjectPredictions(projectId, options),
    enabled: enabled && !!projectId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to generate a new prediction
 */
export function useGeneratePrediction() {
  const queryClient = useQueryClient();

  return useMutation<
    PredictionResult,
    Error,
    {
      projectId: number;
      predictionType: ProjectMLPredictionType;
      options?: { forceRefresh?: boolean; predictionWindowDays?: number };
    }
  >({
    mutationFn: ({ projectId, predictionType, options }) =>
      generatePrediction(projectId, predictionType, options),
    onSuccess: (data, variables) => {
      // Invalidate relevant queries based on prediction type
      const { projectId, predictionType } = variables;

      switch (predictionType) {
        case 'SUCCESS_PREDICTION':
          queryClient.setQueryData(
            projectMLKeys.successPrediction(projectId),
            data,
          );
          break;
        case 'RISK_FORECAST':
          queryClient.setQueryData(projectMLKeys.riskForecast(projectId), data);
          break;
        case 'TIMELINE_PREDICTION':
          queryClient.setQueryData(
            projectMLKeys.timelinePrediction(projectId),
            data,
          );
          break;
        case 'RESOURCE_OPTIMIZATION':
          queryClient.setQueryData(
            projectMLKeys.resourceOptimization(projectId),
            data,
          );
          break;
      }

      // Invalidate predictions list
      queryClient.invalidateQueries({
        queryKey: projectMLKeys.predictions(projectId),
      });
    },
  });
}

// ============================================================================
// Portfolio-Level Hooks
// ============================================================================

/**
 * Hook to fetch high-risk projects
 */
export function useHighRiskProjects(minRisk?: number, limit?: number) {
  return useQuery<HighRiskProject[]>({
    queryKey: [...projectMLKeys.highRisk(), { minRisk, limit }],
    queryFn: () => getHighRiskProjects(minRisk, limit),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch prediction accuracy metrics
 */
export function usePredictionAccuracy(
  predictionType?: ProjectMLPredictionType,
) {
  return useQuery<PredictionAccuracy>({
    queryKey: [...projectMLKeys.accuracy(), { predictionType }],
    queryFn: () => getPredictionAccuracy(predictionType),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to validate expired predictions
 */
export function useValidatePredictions() {
  const queryClient = useQueryClient();

  return useMutation<{ validated: number }>({
    mutationFn: validatePredictions,
    onSuccess: () => {
      // Invalidate accuracy metrics
      queryClient.invalidateQueries({
        queryKey: projectMLKeys.accuracy(),
      });
    },
  });
}

/**
 * Hook to fetch ML service status
 */
export function useMLStatus() {
  return useQuery<MLStatus>({
    queryKey: projectMLKeys.status(),
    queryFn: getMLStatus,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: false,
  });
}

// ============================================================================
// Combined Hooks
// ============================================================================

/**
 * Hook to fetch all ML predictions for a project at once
 */
export function useAllProjectMLPredictions(projectId: number, enabled = true) {
  const successPrediction = useSuccessPrediction(projectId, enabled);
  const riskForecast = useRiskForecast(projectId, enabled);
  const timelinePrediction = useTimelinePrediction(projectId, enabled);
  const resourceOptimization = useResourceOptimization(projectId, enabled);

  const isLoading =
    successPrediction.isLoading ||
    riskForecast.isLoading ||
    timelinePrediction.isLoading ||
    resourceOptimization.isLoading;

  const isError =
    successPrediction.isError ||
    riskForecast.isError ||
    timelinePrediction.isError ||
    resourceOptimization.isError;

  return {
    successPrediction,
    riskForecast,
    timelinePrediction,
    resourceOptimization,
    isLoading,
    isError,
  };
}
