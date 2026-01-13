/**
 * Assets Module - React Query Hooks
 *
 * This module provides all React Query hooks for AI asset management.
 * Assets can be linked to projects for reuse.
 *
 * @module assets
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
import { moduleRegistry } from '../moduleRegistry';
import { isProjectDeleting } from '../deletionTracker';
import {
  archiveAsset,
  createAsset,
  fetchAssetById,
  fetchAssets,
  fetchProjectAssets,
  linkAssetToProject,
  unlinkAssetFromProject,
  updateAsset,
  type Asset,
  type AssetFilters,
  type AssetPayload,
  type ProjectAssetLink,
} from '../../assets';

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch all assets with optional filters
 *
 * This query is module-aware and will not execute if the assets module is disabled.
 */
export function useAssets(
  filters?: AssetFilters,
): UseQueryResult<Asset[], Error> {
  const isModuleEnabled = moduleRegistry.isModuleEnabled('assets');

  return useQuery({
    queryKey: queryKeys.assets.list(filters),
    queryFn: () => fetchAssets(filters),
    enabled: isModuleEnabled,
  });
}

/**
 * Fetch a single asset by ID
 *
 * This query is module-aware and will not execute if the assets module is disabled.
 */
export function useAsset(assetId?: number): UseQueryResult<Asset, Error> {
  const queryClient = useQueryClient();
  const isModuleEnabled = moduleRegistry.isModuleEnabled('assets');

  return useQuery({
    queryKey: assetId
      ? queryKeys.assets.detail(assetId)
      : ['assets', 'detail', null],
    enabled: Boolean(assetId) && isModuleEnabled,
    queryFn: () => fetchAssetById(assetId as number),
    initialData: () => {
      if (!assetId) {
        return undefined;
      }

      const cachedLists = queryClient.getQueriesData<Asset[]>({
        queryKey: queryKeys.assets.lists(),
        type: 'active',
      });

      for (const [, assets] of cachedLists) {
        const match = assets?.find((entry) => entry.id === assetId);
        if (match) {
          return match;
        }
      }

      const projectAssets = queryClient.getQueriesData<ProjectAssetLink[]>({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'assets' &&
          query.queryKey[1] === 'project',
        type: 'active',
      });

      for (const [, links] of projectAssets) {
        const match = links?.find((link) => link.asset.id === assetId);
        if (match) {
          return match.asset;
        }
      }

      return undefined;
    },
  });
}

/**
 * Fetch assets linked to a project
 *
 * This query is module-aware and will not execute if the assets module is disabled.
 */
export function useProjectAssets(
  projectId?: number,
  includeArchived?: boolean,
): UseQueryResult<ProjectAssetLink[], Error> {
  const isModuleEnabled = moduleRegistry.isModuleEnabled('assets');

  return useQuery({
    queryKey: queryKeys.assets.byProject(projectId ?? 0, includeArchived),
    // Disable query if project is being deleted to prevent 404 refetch race conditions
    enabled:
      Boolean(projectId) && isModuleEnabled && !isProjectDeleting(projectId),
    queryFn: () => fetchProjectAssets(projectId as number, includeArchived),
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new asset
 */
export function useCreateAsset(): UseMutationResult<
  Asset,
  Error,
  AssetPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AssetPayload) => createAsset(payload),
    onSuccess: (asset) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });
      queryClient.setQueryData(queryKeys.assets.detail(asset.id), asset);
    },
  });
}

/**
 * Update an existing asset
 *
 * Note: assetId is passed as part of the mutation variables to avoid stale closure issues
 * when the hook is instantiated before the asset ID is known.
 */
export function useUpdateAsset(): UseMutationResult<
  Asset,
  Error,
  { assetId: number; data: Partial<AssetPayload> }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      assetId,
      data,
    }: {
      assetId: number;
      data: Partial<AssetPayload>;
    }) => updateAsset(assetId, data),
    onSuccess: (asset, { assetId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });
      queryClient.setQueryData(queryKeys.assets.detail(assetId), asset);
    },
  });
}

/**
 * Archive an asset (soft delete)
 */
export function useArchiveAsset(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assetId: number) => archiveAsset(assetId),
    onSuccess: (_, assetId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });
      queryClient.removeQueries({ queryKey: queryKeys.assets.detail(assetId) });
    },
  });
}

/**
 * Link an asset to a project
 */
export function useLinkAssetToProject(
  projectId: number,
): UseMutationResult<
  ProjectAssetLink,
  Error,
  { assetId: number; notes?: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assetId, notes }: { assetId: number; notes?: string }) =>
      linkAssetToProject(projectId, assetId, { notes }),
    onSuccess: (link) => {
      const projectAssetQueries = queryClient.getQueriesData<
        ProjectAssetLink[]
      >({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'assets' &&
          query.queryKey[1] === 'project' &&
          query.queryKey[2] === projectId,
        type: 'active',
      });

      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'assets' &&
          query.queryKey[1] === 'project' &&
          query.queryKey[2] === projectId,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all });

      for (const [queryKey, current] of projectAssetQueries) {
        queryClient.setQueryData<ProjectAssetLink[] | undefined>(
          queryKey,
          () => {
            if (!current) {
              return [link];
            }

            const filtered = current.filter(
              (existing) => existing.assetId !== link.assetId,
            );
            return [link, ...filtered];
          },
        );
      }
    },
  });
}

/**
 * Unlink an asset from a project
 */
export function useUnlinkAssetFromProject(
  projectId: number,
): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assetId: number) => unlinkAssetFromProject(projectId, assetId),
    onSuccess: (_, assetId) => {
      const projectAssetQueries = queryClient.getQueriesData<
        ProjectAssetLink[]
      >({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'assets' &&
          query.queryKey[1] === 'project' &&
          query.queryKey[2] === projectId,
        type: 'active',
      });

      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'assets' &&
          query.queryKey[1] === 'project' &&
          query.queryKey[2] === projectId,
      });

      for (const [queryKey, current] of projectAssetQueries) {
        queryClient.setQueryData<ProjectAssetLink[] | undefined>(
          queryKey,
          (currentLinks) =>
            (currentLinks ?? current)?.filter(
              (link) => link.assetId !== assetId,
            ) ??
            currentLinks ??
            current,
        );
      }
    },
  });
}

// ============================================================================
// Re-exports
// ============================================================================

export type {
  Asset,
  AssetFilters,
  AssetPayload,
  ProjectAssetLink,
} from '../../assets';
