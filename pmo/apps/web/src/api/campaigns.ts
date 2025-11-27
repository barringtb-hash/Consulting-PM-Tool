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
  type Campaign,
  type CreateCampaignInput,
  type UpdateCampaignInput,
} from '../../../../packages/types/marketing';

interface CampaignResponse
  extends Omit<Campaign, 'createdAt' | 'updatedAt' | 'startDate' | 'endDate'> {
  createdAt: string;
  updatedAt: string;
  startDate?: string | null;
  endDate?: string | null;
}

const mapCampaign = (payload: CampaignResponse): Campaign => ({
  ...payload,
  createdAt: new Date(payload.createdAt),
  updatedAt: new Date(payload.updatedAt),
  startDate: payload.startDate ? new Date(payload.startDate) : undefined,
  endDate: payload.endDate ? new Date(payload.endDate) : undefined,
});

/**
 * Fetch all campaigns
 */
export async function fetchCampaigns(query: {
  clientId?: number;
  projectId?: number;
  status?: string;
  archived?: boolean;
}): Promise<Campaign[]> {
  const params = new URLSearchParams();
  if (query.clientId) params.append('clientId', query.clientId.toString());
  if (query.projectId) params.append('projectId', query.projectId.toString());
  if (query.status) params.append('status', query.status);
  if (query.archived !== undefined)
    params.append('archived', query.archived.toString());

  const url = buildApiUrl(`/campaigns?${params.toString()}`);
  const response = await fetch(url, buildOptions('GET'));
  const data = await handleResponse<{ campaigns: CampaignResponse[] }>(
    response,
  );
  return data.campaigns.map(mapCampaign);
}

/**
 * Fetch a single campaign by ID
 */
export async function fetchCampaign(id: number): Promise<Campaign> {
  const url = buildApiUrl(`/campaigns/${id}`);
  const response = await fetch(url, buildOptions('GET'));
  const data = await handleResponse<{ campaign: CampaignResponse }>(response);
  return mapCampaign(data.campaign);
}

/**
 * Create a new campaign
 */
export async function createCampaign(
  payload: CreateCampaignInput,
): Promise<Campaign> {
  const url = buildApiUrl('/campaigns');
  const response = await fetch(url, buildOptions('POST', payload));
  const data = await handleResponse<{ campaign: CampaignResponse }>(response);
  return mapCampaign(data.campaign);
}

/**
 * Update a campaign
 */
export async function updateCampaign(
  id: number,
  payload: UpdateCampaignInput,
): Promise<Campaign> {
  const url = buildApiUrl(`/campaigns/${id}`);
  const response = await fetch(url, buildOptions('PATCH', payload));
  const data = await handleResponse<{ campaign: CampaignResponse }>(response);
  return mapCampaign(data.campaign);
}

/**
 * Archive a campaign
 */
export async function archiveCampaign(id: number): Promise<void> {
  const url = buildApiUrl(`/campaigns/${id}`);
  const response = await fetch(url, buildOptions('DELETE'));
  await handleResponse(response);
}

/**
 * Hook to fetch campaigns
 */
export function useCampaigns(query: {
  clientId?: number;
  projectId?: number;
  status?: string;
  archived?: boolean;
}): UseQueryResult<Campaign[], Error> {
  return useQuery({
    queryKey: ['campaigns', query],
    queryFn: () => fetchCampaigns(query),
  });
}

/**
 * Hook to fetch a single campaign
 */
export function useCampaign(id: number): UseQueryResult<Campaign, Error> {
  return useQuery({
    queryKey: ['campaigns', id],
    queryFn: () => fetchCampaign(id),
    enabled: !!id,
  });
}

/**
 * Hook to create a campaign
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
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}

/**
 * Hook to update a campaign
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
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns', variables.id] });
    },
  });
}

/**
 * Hook to archive a campaign
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
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });
}
