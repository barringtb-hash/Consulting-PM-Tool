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
  type CreateMarketingContentInput,
  type UpdateMarketingContentInput,
  type MarketingContent,
  type GenerateContentInput,
  type GeneratedContent,
  type MarketingContentListQuery,
  type RepurposeContentInput,
} from '../../../../packages/types/marketing';

interface MarketingContentResponse
  extends Omit<
    MarketingContent,
    'createdAt' | 'updatedAt' | 'publishedAt' | 'scheduledFor' | 'sourceMeeting'
  > {
  createdAt: string;
  updatedAt: string;
  publishedAt?: string | null;
  scheduledFor?: string | null;
  sourceMeeting?: {
    id: number;
    title: string;
    date: string;
  } | null;
}

const mapMarketingContent = (
  payload: MarketingContentResponse,
): MarketingContent => ({
  ...payload,
  publishedAt: payload.publishedAt ? new Date(payload.publishedAt) : undefined,
  scheduledFor: payload.scheduledFor
    ? new Date(payload.scheduledFor)
    : undefined,
  sourceMeeting: payload.sourceMeeting
    ? {
        ...payload.sourceMeeting,
        date: new Date(payload.sourceMeeting.date),
      }
    : undefined,
  createdAt: new Date(payload.createdAt),
  updatedAt: new Date(payload.updatedAt),
});

const normalizeDateInput = (value?: string | Date): Date | undefined => {
  if (!value) {
    return undefined;
  }

  return value instanceof Date ? value : new Date(value);
};

export const marketingQueryKeys = {
  all: ['marketing-contents'] as const,
  lists: () => [...marketingQueryKeys.all, 'list'] as const,
  list: (filters: MarketingContentListQuery) =>
    [...marketingQueryKeys.lists(), filters] as const,
  details: () => [...marketingQueryKeys.all, 'detail'] as const,
  detail: (id?: number) => [...marketingQueryKeys.details(), id] as const,
  projectContents: (projectId?: number) =>
    ['projects', projectId, 'marketing-contents'] as const,
};

/**
 * Fetch all marketing contents with optional filters
 */
export async function fetchMarketingContents(
  query?: MarketingContentListQuery,
): Promise<MarketingContent[]> {
  const params = new URLSearchParams();

  if (query?.clientId) params.append('clientId', query.clientId.toString());
  if (query?.projectId) params.append('projectId', query.projectId.toString());
  if (query?.type) params.append('type', query.type);
  if (query?.status) params.append('status', query.status);
  if (query?.search) params.append('search', query.search);
  if (query?.archived !== undefined)
    params.append('archived', query.archived.toString());

  const response = await fetch(
    buildApiUrl(`/marketing-contents?${params.toString()}`),
    buildOptions({ method: 'GET' }),
  );

  const data = await handleResponse<{ contents: MarketingContentResponse[] }>(
    response,
  );
  return data.contents.map(mapMarketingContent);
}

/**
 * Fetch a single marketing content by ID
 */
export async function fetchMarketingContent(
  contentId: number,
): Promise<MarketingContent> {
  const response = await fetch(
    buildApiUrl(`/marketing-contents/${contentId}`),
    buildOptions({ method: 'GET' }),
  );

  const data = await handleResponse<{ content: MarketingContentResponse }>(
    response,
  );
  return mapMarketingContent(data.content);
}

/**
 * Fetch marketing contents for a specific project
 */
export async function fetchProjectMarketingContents(
  projectId: number,
): Promise<MarketingContent[]> {
  const response = await fetch(
    buildApiUrl(`/projects/${projectId}/marketing-contents`),
    buildOptions({ method: 'GET' }),
  );

  const data = await handleResponse<{ contents: MarketingContentResponse[] }>(
    response,
  );
  return data.contents.map(mapMarketingContent);
}

/**
 * Create a new marketing content
 */
export async function createMarketingContent(
  payload: CreateMarketingContentInput,
): Promise<MarketingContent> {
  const response = await fetch(
    buildApiUrl('/marketing-contents'),
    buildOptions({
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        publishedAt: payload.publishedAt
          ? normalizeDateInput(payload.publishedAt)
          : undefined,
        scheduledFor: payload.scheduledFor
          ? normalizeDateInput(payload.scheduledFor)
          : undefined,
      }),
    }),
  );

  const data = await handleResponse<{ content: MarketingContentResponse }>(
    response,
  );
  return mapMarketingContent(data.content);
}

/**
 * Update an existing marketing content
 */
export async function updateMarketingContent(
  contentId: number,
  payload: UpdateMarketingContentInput,
): Promise<MarketingContent> {
  const response = await fetch(
    buildApiUrl(`/marketing-contents/${contentId}`),
    buildOptions({
      method: 'PATCH',
      body: JSON.stringify({
        ...payload,
        publishedAt:
          payload.publishedAt !== undefined
            ? normalizeDateInput(payload.publishedAt)
            : undefined,
        scheduledFor:
          payload.scheduledFor !== undefined
            ? normalizeDateInput(payload.scheduledFor)
            : undefined,
      }),
    }),
  );

  const data = await handleResponse<{ content: MarketingContentResponse }>(
    response,
  );
  return mapMarketingContent(data.content);
}

/**
 * Archive (soft delete) a marketing content
 */
export async function archiveMarketingContent(
  contentId: number,
): Promise<void> {
  const response = await fetch(
    buildApiUrl(`/marketing-contents/${contentId}`),
    buildOptions({ method: 'DELETE' }),
  );

  await handleResponse(response);
}

/**
 * Generate marketing content from project or meeting data
 */
export async function generateMarketingContent(
  payload: GenerateContentInput,
): Promise<GeneratedContent> {
  const response = await fetch(
    buildApiUrl('/marketing-contents/generate'),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );

  const data = await handleResponse<{ generated: GeneratedContent }>(response);
  return data.generated;
}

/**
 * Generate marketing content from a specific project
 */
export async function generateMarketingContentFromProject(
  projectId: number,
  payload: Omit<GenerateContentInput, 'sourceType' | 'sourceId'>,
): Promise<GeneratedContent> {
  const response = await fetch(
    buildApiUrl(`/projects/${projectId}/marketing-contents/generate`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );

  const data = await handleResponse<{ generated: GeneratedContent }>(response);
  return data.generated;
}

/**
 * Generate marketing content from a specific meeting
 */
export async function generateMarketingContentFromMeeting(
  meetingId: number,
  payload: Omit<GenerateContentInput, 'sourceType' | 'sourceId'>,
): Promise<GeneratedContent> {
  const response = await fetch(
    buildApiUrl(`/meetings/${meetingId}/marketing-contents/generate`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );

  const data = await handleResponse<{ generated: GeneratedContent }>(response);
  return data.generated;
}

/**
 * Repurpose existing marketing content to a different type/channel
 */
export async function repurposeMarketingContent(
  contentId: number,
  payload: RepurposeContentInput,
): Promise<GeneratedContent> {
  const response = await fetch(
    buildApiUrl(`/marketing-contents/${contentId}/repurpose`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );

  const data = await handleResponse<{ generated: GeneratedContent }>(response);
  return data.generated;
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Hook to fetch all marketing contents
 */
export function useMarketingContents(
  query?: MarketingContentListQuery,
): UseQueryResult<MarketingContent[], Error> {
  return useQuery({
    queryKey: marketingQueryKeys.list(query || {}),
    queryFn: () => fetchMarketingContents(query),
  });
}

/**
 * Hook to fetch a single marketing content
 */
export function useMarketingContent(
  contentId?: number,
): UseQueryResult<MarketingContent, Error> {
  return useQuery({
    queryKey: marketingQueryKeys.detail(contentId),
    queryFn: () => fetchMarketingContent(contentId!),
    enabled: !!contentId,
  });
}

/**
 * Hook to fetch marketing contents for a project
 */
export function useProjectMarketingContents(
  projectId?: number,
): UseQueryResult<MarketingContent[], Error> {
  return useQuery({
    queryKey: marketingQueryKeys.projectContents(projectId),
    queryFn: () => fetchProjectMarketingContents(projectId!),
    enabled: !!projectId,
  });
}

/**
 * Hook to create a marketing content
 */
export function useCreateMarketingContent(): UseMutationResult<
  MarketingContent,
  Error,
  CreateMarketingContentInput,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createMarketingContent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingQueryKeys.lists() });
    },
  });
}

/**
 * Hook to update a marketing content
 */
export function useUpdateMarketingContent(): UseMutationResult<
  MarketingContent,
  Error,
  { contentId: number; payload: UpdateMarketingContentInput },
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contentId, payload }) =>
      updateMarketingContent(contentId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: marketingQueryKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: marketingQueryKeys.detail(variables.contentId),
      });
    },
  });
}

/**
 * Hook to archive a marketing content
 */
export function useArchiveMarketingContent(): UseMutationResult<
  void,
  Error,
  number,
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveMarketingContent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketingQueryKeys.lists() });
    },
  });
}

/**
 * Hook to generate marketing content
 */
export function useGenerateMarketingContent(): UseMutationResult<
  GeneratedContent,
  Error,
  GenerateContentInput,
  unknown
> {
  return useMutation({
    mutationFn: generateMarketingContent,
  });
}

/**
 * Hook to generate marketing content from a project
 */
export function useGenerateMarketingContentFromProject(): UseMutationResult<
  GeneratedContent,
  Error,
  {
    projectId: number;
    payload: Omit<GenerateContentInput, 'sourceType' | 'sourceId'>;
  },
  unknown
> {
  return useMutation({
    mutationFn: ({ projectId, payload }) =>
      generateMarketingContentFromProject(projectId, payload),
  });
}

/**
 * Hook to generate marketing content from a meeting
 */
export function useGenerateMarketingContentFromMeeting(): UseMutationResult<
  GeneratedContent,
  Error,
  {
    meetingId: number;
    payload: Omit<GenerateContentInput, 'sourceType' | 'sourceId'>;
  },
  unknown
> {
  return useMutation({
    mutationFn: ({ meetingId, payload }) =>
      generateMarketingContentFromMeeting(meetingId, payload),
  });
}

/**
 * Hook to repurpose marketing content
 */
export function useRepurposeMarketingContent(): UseMutationResult<
  GeneratedContent,
  Error,
  { contentId: number; payload: RepurposeContentInput },
  unknown
> {
  return useMutation({
    mutationFn: ({ contentId, payload }) =>
      repurposeMarketingContent(contentId, payload),
  });
}
