/**
 * Cost Estimate Hooks
 *
 * React Query hooks for managing opportunity cost estimates.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { http } from '../../../api/http';
import type {
  CostEstimate,
  EstimateLineItem,
  CreateEstimateInput,
  UpdateEstimateInput,
  CreateLineItemInput,
  UpdateLineItemInput,
  AIEstimateGenerationInput,
  AIGeneratedEstimate,
} from '../types';

// ============================================================================
// Query Keys
// ============================================================================

export const estimateQueryKeys = {
  all: ['cost-estimates'] as const,
  opportunity: (opportunityId: number) =>
    [...estimateQueryKeys.all, 'opportunity', opportunityId] as const,
  detail: (opportunityId: number, estimateId: number) =>
    [...estimateQueryKeys.opportunity(opportunityId), estimateId] as const,
  lineItems: (opportunityId: number, estimateId: number) =>
    [...estimateQueryKeys.detail(opportunityId, estimateId), 'items'] as const,
};

// ============================================================================
// Response Types
// ============================================================================

interface EstimatesResponse {
  data: CostEstimate[];
}

interface EstimateResponse {
  data: CostEstimate;
}

interface LineItemsResponse {
  data: EstimateLineItem[];
}

interface LineItemResponse {
  data: EstimateLineItem;
}

// Extended timeout for AI operations (60 seconds)
const AI_TIMEOUT = 60000;

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch all cost estimates for an opportunity
 */
export function useCostEstimates(
  opportunityId: number,
): UseQueryResult<CostEstimate[], Error> {
  return useQuery({
    queryKey: estimateQueryKeys.opportunity(opportunityId),
    queryFn: async () => {
      const response = await http.get<EstimatesResponse>(
        `/api/crm/opportunities/${opportunityId}/estimates`,
      );
      return response.data ?? [];
    },
    enabled: Boolean(opportunityId),
  });
}

/**
 * Fetch a single cost estimate with line items
 */
export function useCostEstimate(
  opportunityId: number,
  estimateId: number,
): UseQueryResult<CostEstimate, Error> {
  return useQuery({
    queryKey: estimateQueryKeys.detail(opportunityId, estimateId),
    queryFn: async () => {
      const response = await http.get<EstimateResponse>(
        `/api/crm/opportunities/${opportunityId}/estimates/${estimateId}`,
      );
      return response.data;
    },
    enabled: Boolean(opportunityId) && Boolean(estimateId),
  });
}

/**
 * Fetch line items for an estimate
 */
export function useEstimateLineItems(
  opportunityId: number,
  estimateId: number,
): UseQueryResult<EstimateLineItem[], Error> {
  return useQuery({
    queryKey: estimateQueryKeys.lineItems(opportunityId, estimateId),
    queryFn: async () => {
      const response = await http.get<LineItemsResponse>(
        `/api/crm/opportunities/${opportunityId}/estimates/${estimateId}/items`,
      );
      return response.data ?? [];
    },
    enabled: Boolean(opportunityId) && Boolean(estimateId),
  });
}

// ============================================================================
// Mutations - Estimates
// ============================================================================

interface CreateEstimatePayload {
  opportunityId: number;
  input: CreateEstimateInput;
}

/**
 * Create a new cost estimate
 */
export function useCreateEstimate(): UseMutationResult<
  CostEstimate,
  Error,
  CreateEstimatePayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, input }) => {
      const response = await http.post<EstimateResponse>(
        `/api/crm/opportunities/${opportunityId}/estimates`,
        input,
      );
      return response.data;
    },
    onSuccess: (_, { opportunityId }) => {
      queryClient.invalidateQueries({
        queryKey: estimateQueryKeys.opportunity(opportunityId),
      });
    },
  });
}

interface UpdateEstimatePayload {
  opportunityId: number;
  estimateId: number;
  input: UpdateEstimateInput;
}

/**
 * Update an existing cost estimate
 */
export function useUpdateEstimate(): UseMutationResult<
  CostEstimate,
  Error,
  UpdateEstimatePayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, estimateId, input }) => {
      const response = await http.patch<EstimateResponse>(
        `/api/crm/opportunities/${opportunityId}/estimates/${estimateId}`,
        input,
      );
      return response.data;
    },
    onSuccess: (data, { opportunityId, estimateId }) => {
      queryClient.setQueryData(
        estimateQueryKeys.detail(opportunityId, estimateId),
        data,
      );
      queryClient.invalidateQueries({
        queryKey: estimateQueryKeys.opportunity(opportunityId),
      });
    },
  });
}

interface DeleteEstimatePayload {
  opportunityId: number;
  estimateId: number;
}

/**
 * Delete a cost estimate
 */
export function useDeleteEstimate(): UseMutationResult<
  void,
  Error,
  DeleteEstimatePayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, estimateId }) => {
      await http.delete<void>(
        `/api/crm/opportunities/${opportunityId}/estimates/${estimateId}`,
      );
    },
    onSuccess: (_, { opportunityId }) => {
      queryClient.invalidateQueries({
        queryKey: estimateQueryKeys.opportunity(opportunityId),
      });
    },
  });
}

interface GenerateEstimatePayload {
  opportunityId: number;
  input?: AIEstimateGenerationInput;
}

/**
 * Generate an AI-powered cost estimate
 */
export function useGenerateEstimate(): UseMutationResult<
  AIGeneratedEstimate,
  Error,
  GenerateEstimatePayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, input }) => {
      const response = await http.post<{ data: AIGeneratedEstimate }>(
        `/api/crm/opportunities/${opportunityId}/estimates/generate`,
        input ?? {},
        { timeout: AI_TIMEOUT },
      );
      return response.data;
    },
    onSuccess: (_, { opportunityId }) => {
      queryClient.invalidateQueries({
        queryKey: estimateQueryKeys.opportunity(opportunityId),
      });
    },
  });
}

interface ApproveEstimatePayload {
  opportunityId: number;
  estimateId: number;
}

/**
 * Approve a cost estimate
 */
export function useApproveEstimate(): UseMutationResult<
  CostEstimate,
  Error,
  ApproveEstimatePayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, estimateId }) => {
      const response = await http.post<EstimateResponse>(
        `/api/crm/opportunities/${opportunityId}/estimates/${estimateId}/approve`,
      );
      return response.data;
    },
    onSuccess: (data, { opportunityId, estimateId }) => {
      queryClient.setQueryData(
        estimateQueryKeys.detail(opportunityId, estimateId),
        data,
      );
      queryClient.invalidateQueries({
        queryKey: estimateQueryKeys.opportunity(opportunityId),
      });
    },
  });
}

interface RejectEstimatePayload {
  opportunityId: number;
  estimateId: number;
  reason?: string;
}

/**
 * Reject a cost estimate
 */
export function useRejectEstimate(): UseMutationResult<
  CostEstimate,
  Error,
  RejectEstimatePayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, estimateId, reason }) => {
      const response = await http.post<EstimateResponse>(
        `/api/crm/opportunities/${opportunityId}/estimates/${estimateId}/reject`,
        { reason },
      );
      return response.data;
    },
    onSuccess: (data, { opportunityId, estimateId }) => {
      queryClient.setQueryData(
        estimateQueryKeys.detail(opportunityId, estimateId),
        data,
      );
      queryClient.invalidateQueries({
        queryKey: estimateQueryKeys.opportunity(opportunityId),
      });
    },
  });
}

interface CloneEstimatePayload {
  opportunityId: number;
  estimateId: number;
}

/**
 * Clone a cost estimate to create a new version
 */
export function useCloneEstimate(): UseMutationResult<
  CostEstimate,
  Error,
  CloneEstimatePayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, estimateId }) => {
      const response = await http.post<EstimateResponse>(
        `/api/crm/opportunities/${opportunityId}/estimates/${estimateId}/clone`,
      );
      return response.data;
    },
    onSuccess: (_, { opportunityId }) => {
      queryClient.invalidateQueries({
        queryKey: estimateQueryKeys.opportunity(opportunityId),
      });
    },
  });
}

// ============================================================================
// Mutations - Line Items
// ============================================================================

interface CreateLineItemPayload {
  opportunityId: number;
  estimateId: number;
  input: CreateLineItemInput;
}

/**
 * Add a line item to an estimate
 */
export function useCreateLineItem(): UseMutationResult<
  EstimateLineItem,
  Error,
  CreateLineItemPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, estimateId, input }) => {
      const response = await http.post<LineItemResponse>(
        `/api/crm/opportunities/${opportunityId}/estimates/${estimateId}/items`,
        input,
      );
      return response.data;
    },
    onSuccess: (_, { opportunityId, estimateId }) => {
      queryClient.invalidateQueries({
        queryKey: estimateQueryKeys.detail(opportunityId, estimateId),
      });
      queryClient.invalidateQueries({
        queryKey: estimateQueryKeys.lineItems(opportunityId, estimateId),
      });
    },
  });
}

interface UpdateLineItemPayload {
  opportunityId: number;
  estimateId: number;
  itemId: number;
  input: UpdateLineItemInput;
}

/**
 * Update a line item
 */
export function useUpdateLineItem(): UseMutationResult<
  EstimateLineItem,
  Error,
  UpdateLineItemPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, estimateId, itemId, input }) => {
      const response = await http.patch<LineItemResponse>(
        `/api/crm/opportunities/${opportunityId}/estimates/${estimateId}/items/${itemId}`,
        input,
      );
      return response.data;
    },
    onSuccess: (_, { opportunityId, estimateId }) => {
      queryClient.invalidateQueries({
        queryKey: estimateQueryKeys.detail(opportunityId, estimateId),
      });
      queryClient.invalidateQueries({
        queryKey: estimateQueryKeys.lineItems(opportunityId, estimateId),
      });
    },
  });
}

interface DeleteLineItemPayload {
  opportunityId: number;
  estimateId: number;
  itemId: number;
}

/**
 * Delete a line item
 */
export function useDeleteLineItem(): UseMutationResult<
  void,
  Error,
  DeleteLineItemPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, estimateId, itemId }) => {
      await http.delete<void>(
        `/api/crm/opportunities/${opportunityId}/estimates/${estimateId}/items/${itemId}`,
      );
    },
    onSuccess: (_, { opportunityId, estimateId }) => {
      queryClient.invalidateQueries({
        queryKey: estimateQueryKeys.detail(opportunityId, estimateId),
      });
      queryClient.invalidateQueries({
        queryKey: estimateQueryKeys.lineItems(opportunityId, estimateId),
      });
    },
  });
}

interface BulkCreateLineItemsPayload {
  opportunityId: number;
  estimateId: number;
  items: CreateLineItemInput[];
}

/**
 * Add multiple line items at once
 */
export function useBulkCreateLineItems(): UseMutationResult<
  EstimateLineItem[],
  Error,
  BulkCreateLineItemsPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, estimateId, items }) => {
      const response = await http.post<{ data: EstimateLineItem[] }>(
        `/api/crm/opportunities/${opportunityId}/estimates/${estimateId}/items/bulk`,
        { items },
      );
      return response.data;
    },
    onSuccess: (_, { opportunityId, estimateId }) => {
      queryClient.invalidateQueries({
        queryKey: estimateQueryKeys.detail(opportunityId, estimateId),
      });
      queryClient.invalidateQueries({
        queryKey: estimateQueryKeys.lineItems(opportunityId, estimateId),
      });
    },
  });
}

interface ReorderLineItemsPayload {
  opportunityId: number;
  estimateId: number;
  itemIds: number[];
}

/**
 * Reorder line items
 */
export function useReorderLineItems(): UseMutationResult<
  void,
  Error,
  ReorderLineItemsPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, estimateId, itemIds }) => {
      await http.post<void>(
        `/api/crm/opportunities/${opportunityId}/estimates/${estimateId}/items/reorder`,
        { itemIds },
      );
    },
    onSuccess: (_, { opportunityId, estimateId }) => {
      queryClient.invalidateQueries({
        queryKey: estimateQueryKeys.lineItems(opportunityId, estimateId),
      });
    },
  });
}
