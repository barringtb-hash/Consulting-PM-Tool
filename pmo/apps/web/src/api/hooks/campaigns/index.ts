/**
 * Campaigns Module - React Query Hooks
 *
 * This module provides all React Query hooks for campaign management.
 * Campaigns organize marketing content around specific initiatives.
 *
 * @module campaigns
 * @see moduleRegistry for module dependencies and invalidation rules
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import { invalidateRelatedModules, moduleRegistry } from '../moduleRegistry';
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
 *
 * This query is module-aware and will not execute if the campaigns module is disabled.
 */
export function useCampaigns(
  query: CampaignFilters = {},
): UseQueryResult<Campaign[], Error> {
  const isModuleEnabled = moduleRegistry.isModuleEnabled('campaigns');

  return useQuery({
    queryKey: queryKeys.campaigns.list(query),
    queryFn: () => fetchCampaigns(query),
    enabled: isModuleEnabled,
  });
}

/**
 * Fetch a single campaign by ID
 *
 * This query is module-aware and will not execute if the campaigns module is disabled.
 */
export function useCampaign(id: number): UseQueryResult<Campaign, Error> {
  const isModuleEnabled = moduleRegistry.isModuleEnabled('campaigns');

  return useQuery({
    queryKey: queryKeys.campaigns.detail(id),
    queryFn: () => fetchCampaign(id),
    enabled: !!id && isModuleEnabled,
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new campaign
 *
 * This mutation uses module-aware invalidation to update marketing content lists
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

      // Cross-module invalidation: campaign changes may affect marketing content display
      invalidateRelatedModules(queryClient, {
        sourceModule: 'campaigns',
        trigger: 'create',
      });
    },
  });
}

/**
 * Update an existing campaign
 *
 * This mutation uses module-aware invalidation to update marketing content lists
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

      // Cross-module invalidation: campaign changes may affect marketing content display
      invalidateRelatedModules(queryClient, {
        sourceModule: 'campaigns',
        trigger: 'update',
      });
    },
  });
}

/**
 * Archive a campaign (soft delete)
 *
 * This mutation uses module-aware invalidation to update marketing content lists
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

      // Cross-module invalidation: campaign changes may affect marketing content display
      invalidateRelatedModules(queryClient, {
        sourceModule: 'campaigns',
        trigger: 'archive',
      });
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
