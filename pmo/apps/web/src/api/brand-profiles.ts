import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { buildApiUrl } from './config';
import { buildOptions, handleResponse } from './http';
import {
  type BrandProfile,
  type BrandAsset,
  type CreateBrandProfileInput,
  type UpdateBrandProfileInput,
  type CreateBrandAssetInput,
  type UpdateBrandAssetInput,
} from '../../../../packages/types/marketing';

interface BrandProfileResponse extends Omit<BrandProfile, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
  assets?: BrandAssetResponse[];
}

interface BrandAssetResponse extends Omit<BrandAsset, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}

const mapBrandProfile = (payload: BrandProfileResponse): BrandProfile => ({
  ...payload,
  createdAt: new Date(payload.createdAt),
  updatedAt: new Date(payload.updatedAt),
  assets: payload.assets?.map(mapBrandAsset),
});

const mapBrandAsset = (payload: BrandAssetResponse): BrandAsset => ({
  ...payload,
  createdAt: new Date(payload.createdAt),
  updatedAt: new Date(payload.updatedAt),
});

/**
 * Fetch brand profile by client ID
 */
async function fetchBrandProfile(clientId: number): Promise<BrandProfile | null> {
  const url = buildApiUrl(`/clients/${clientId}/brand-profile`);
  try {
    const response = await fetch(url, buildOptions('GET'));
    const data = await handleResponse<{ brandProfile: BrandProfileResponse }>(response);
    return mapBrandProfile(data.brandProfile);
  } catch (error: any) {
    if (error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Create a brand profile
 */
async function createBrandProfile(payload: CreateBrandProfileInput): Promise<BrandProfile> {
  const url = buildApiUrl(`/clients/${payload.clientId}/brand-profile`);
  const response = await fetch(url, buildOptions('POST', payload));
  const data = await handleResponse<{ brandProfile: BrandProfileResponse }>(response);
  return mapBrandProfile(data.brandProfile);
}

/**
 * Update a brand profile
 */
async function updateBrandProfile(
  id: number,
  payload: UpdateBrandProfileInput,
): Promise<BrandProfile> {
  const url = buildApiUrl(`/brand-profiles/${id}`);
  const response = await fetch(url, buildOptions('PATCH', payload));
  const data = await handleResponse<{ brandProfile: BrandProfileResponse }>(response);
  return mapBrandProfile(data.brandProfile);
}

/**
 * Fetch brand assets
 */
async function fetchBrandAssets(brandProfileId: number): Promise<BrandAsset[]> {
  const url = buildApiUrl(`/brand-profiles/${brandProfileId}/assets`);
  const response = await fetch(url, buildOptions('GET'));
  const data = await handleResponse<{ assets: BrandAssetResponse[] }>(response);
  return data.assets.map(mapBrandAsset);
}

/**
 * Create a brand asset
 */
async function createBrandAsset(payload: CreateBrandAssetInput): Promise<BrandAsset> {
  const url = buildApiUrl(`/brand-profiles/${payload.brandProfileId}/assets`);
  const response = await fetch(url, buildOptions('POST', payload));
  const data = await handleResponse<{ asset: BrandAssetResponse }>(response);
  return mapBrandAsset(data.asset);
}

/**
 * Update a brand asset
 */
async function updateBrandAsset(
  id: number,
  payload: UpdateBrandAssetInput,
): Promise<BrandAsset> {
  const url = buildApiUrl(`/brand-assets/${id}`);
  const response = await fetch(url, buildOptions('PATCH', payload));
  const data = await handleResponse<{ asset: BrandAssetResponse }>(response);
  return mapBrandAsset(data.asset);
}

/**
 * Archive a brand asset
 */
async function archiveBrandAsset(id: number): Promise<void> {
  const url = buildApiUrl(`/brand-assets/${id}`);
  const response = await fetch(url, buildOptions('DELETE'));
  await handleResponse(response);
}

/**
 * Hook to fetch brand profile
 */
export function useBrandProfile(clientId: number): UseQueryResult<BrandProfile | null, Error> {
  return useQuery({
    queryKey: ['brandProfile', clientId],
    queryFn: () => fetchBrandProfile(clientId),
    enabled: !!clientId,
  });
}

/**
 * Hook to create a brand profile
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
      queryClient.invalidateQueries({ queryKey: ['brandProfile', data.clientId] });
    },
  });
}

/**
 * Hook to update a brand profile
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
      queryClient.invalidateQueries({ queryKey: ['brandProfile', data.clientId] });
    },
  });
}

/**
 * Hook to fetch brand assets
 */
export function useBrandAssets(brandProfileId: number): UseQueryResult<BrandAsset[], Error> {
  return useQuery({
    queryKey: ['brandAssets', brandProfileId],
    queryFn: () => fetchBrandAssets(brandProfileId),
    enabled: !!brandProfileId,
  });
}

/**
 * Hook to create a brand asset
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
      queryClient.invalidateQueries({ queryKey: ['brandAssets', variables.brandProfileId] });
    },
  });
}

/**
 * Hook to update a brand asset
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
      queryClient.invalidateQueries({ queryKey: ['brandAssets', data.brandProfileId] });
    },
  });
}

/**
 * Hook to archive a brand asset
 */
export function useArchiveBrandAsset(): UseMutationResult<void, Error, { id: number; brandProfileId: number }, unknown> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => archiveBrandAsset(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['brandAssets', variables.brandProfileId] });
    },
  });
}
