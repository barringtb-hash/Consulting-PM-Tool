/**
 * Campaigns Module - React Query Hooks
 *
 * This module provides all React Query hooks for campaign management.
 * Campaigns organize marketing content around specific initiatives.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import {
  archiveCampaign,
  createCampaign,
  fetchCampaign,
  fetchCampaigns,
  updateCampaign,
} from '../../campaigns';
import type {
  Campaign,
  CreateCampaignInput,
  UpdateCampaignInput,
} from '../../../../../packages/types/marketing';

// ============================================================================
// Types
// ============================================================================

export interface CampaignFilters {
  clientId?: number;
  projectId?: number;
  status?: string;
  archived?: boolean;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch all campaigns with optional filters
 */
export function useCampaigns(
  query: CampaignFilters = {},
): UseQueryResult<Campaign[], Error> {
  return useQuery({
    queryKey: queryKeys.campaigns.list(query),
    queryFn: () => fetchCampaigns(query),
  });
}

/**
 * Fetch a single campaign by ID
 */
export function useCampaign(id: number): UseQueryResult<Campaign, Error> {
  return useQuery({
    queryKey: queryKeys.campaigns.detail(id),
    queryFn: () => fetchCampaign(id),
    enabled: !!id,
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new campaign
 */
export function useCreateCampaign(): UseMutationResult<
  Campaign,
  Error,
  CreateCampaignInput,
  unknown
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all });
    },
  });
}

/**
 * Update an existing campaign
 */
export function useUpdateCampaign(): UseMutationResult<
  Campaign,
  Error,
  { id: number; payload: UpdateCampaignInput },
  unknown
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateCampaign(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.campaigns.detail(variables.id),
      });
    },
  });
}

/**
 * Archive a campaign (soft delete)
 */
export function useArchiveCampaign(): UseMutationResult<
  void,
  Error,
  number,
  unknown
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: archiveCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all });
    },
  });
}

// ============================================================================
// Re-exports
// ============================================================================

export type {
  Campaign,
  CreateCampaignInput,
  UpdateCampaignInput,
} from '../../../../../packages/types/marketing';
