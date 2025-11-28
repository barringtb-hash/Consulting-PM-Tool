/**
 * Brand Profiles Module - React Query Hooks
 *
 * This module provides all React Query hooks for brand profile management.
 * Brand profiles store client brand guidelines and assets.
 *
 * @module brandProfiles
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
import { invalidateRelatedModules } from '../moduleRegistry';
import {
  archiveBrandAsset,
  createBrandAsset,
  createBrandProfile,
  fetchBrandAssets,
  fetchBrandProfile,
  updateBrandAsset,
  updateBrandProfile,
} from '../../brand-profiles';
import type {
  BrandAsset,
  BrandProfile,
  CreateBrandAssetInput,
  CreateBrandProfileInput,
  UpdateBrandAssetInput,
  UpdateBrandProfileInput,
} from '../../../../../packages/types/marketing';

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch brand profile for a client
 */
export function useBrandProfile(
  clientId: number,
): UseQueryResult<BrandProfile | null, Error> {
  return useQuery({
    queryKey: queryKeys.brandProfiles.byClient(clientId),
    queryFn: () => fetchBrandProfile(clientId),
    enabled: !!clientId,
  });
}

/**
 * Fetch brand assets for a brand profile
 */
export function useBrandAssets(
  brandProfileId: number,
): UseQueryResult<BrandAsset[], Error> {
  return useQuery({
    queryKey: queryKeys.brandProfiles.assets(brandProfileId),
    queryFn: () => fetchBrandAssets(brandProfileId),
    enabled: !!brandProfileId,
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new brand profile
 */
export function useCreateBrandProfile(): UseMutationResult<
  BrandProfile,
  Error,
  CreateBrandProfileInput,
  unknown
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBrandProfile,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.brandProfiles.byClient(data.clientId),
      });
    },
  });
}

/**
 * Update an existing brand profile
 *
 * This mutation uses module-aware invalidation to update marketing content caches
 * since brand profile changes may affect content generation.
 */
export function useUpdateBrandProfile(): UseMutationResult<
  BrandProfile,
  Error,
  { id: number; payload: UpdateBrandProfileInput },
  unknown
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateBrandProfile(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.brandProfiles.byClient(data.clientId),
      });

      // Cross-module invalidation: brand profile changes may affect marketing content
      invalidateRelatedModules(queryClient, {
        sourceModule: 'brandProfiles',
        trigger: 'update',
      });
    },
  });
}

/**
 * Create a new brand asset
 */
export function useCreateBrandAsset(): UseMutationResult<
  BrandAsset,
  Error,
  CreateBrandAssetInput,
  unknown
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBrandAsset,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.brandProfiles.assets(variables.brandProfileId),
      });
    },
  });
}

/**
 * Update an existing brand asset
 */
export function useUpdateBrandAsset(): UseMutationResult<
  BrandAsset,
  Error,
  { id: number; payload: UpdateBrandAssetInput },
  unknown
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateBrandAsset(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.brandProfiles.assets(data.brandProfileId),
      });
    },
  });
}

/**
 * Archive a brand asset (soft delete)
 */
export function useArchiveBrandAsset(): UseMutationResult<
  void,
  Error,
  { id: number; brandProfileId: number },
  unknown
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => archiveBrandAsset(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.brandProfiles.assets(variables.brandProfileId),
      });
    },
  });
}

// ============================================================================
// Re-exports
// ============================================================================

export type {
  BrandAsset,
  BrandProfile,
  CreateBrandAssetInput,
  CreateBrandProfileInput,
  UpdateBrandAssetInput,
  UpdateBrandProfileInput,
} from '../../../../../packages/types/marketing';
