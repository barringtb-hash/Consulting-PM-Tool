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
  type PublishingConnection,
  type CreatePublishingConnectionInput,
  type UpdatePublishingConnectionInput,
} from '../../../../packages/types/marketing';

interface PublishingConnectionResponse extends Omit<
  PublishingConnection,
  'createdAt' | 'updatedAt' | 'expiresAt'
> {
  createdAt: string;
  updatedAt: string;
  expiresAt?: string | null;
}

const mapPublishingConnection = (
  payload: PublishingConnectionResponse,
): PublishingConnection => ({
  ...payload,
  createdAt: new Date(payload.createdAt),
  updatedAt: new Date(payload.updatedAt),
  expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : undefined,
});

/**
 * Fetch publishing connections for a client
 */
export async function fetchPublishingConnections(
  clientId: number,
): Promise<PublishingConnection[]> {
  const url = buildApiUrl(`/clients/${clientId}/publishing-connections`);
  const response = await fetch(url, buildOptions({ method: 'GET' }));
  const data = await handleResponse<{
    connections: PublishingConnectionResponse[];
  }>(response);
  return data.connections.map(mapPublishingConnection);
}

/**
 * Create a publishing connection
 */
export async function createPublishingConnection(
  payload: CreatePublishingConnectionInput,
): Promise<PublishingConnection> {
  const url = buildApiUrl(
    `/clients/${payload.clientId}/publishing-connections`,
  );
  const response = await fetch(
    url,
    buildOptions({ method: 'POST', body: JSON.stringify(payload) }),
  );
  const data = await handleResponse<{
    connection: PublishingConnectionResponse;
  }>(response);
  return mapPublishingConnection(data.connection);
}

/**
 * Update a publishing connection
 */
export async function updatePublishingConnection(
  id: number,
  payload: UpdatePublishingConnectionInput,
): Promise<PublishingConnection> {
  const url = buildApiUrl(`/publishing-connections/${id}`);
  const response = await fetch(
    url,
    buildOptions({ method: 'PATCH', body: JSON.stringify(payload) }),
  );
  const data = await handleResponse<{
    connection: PublishingConnectionResponse;
  }>(response);
  return mapPublishingConnection(data.connection);
}

/**
 * Delete a publishing connection
 */
export async function deletePublishingConnection(id: number): Promise<void> {
  const url = buildApiUrl(`/publishing-connections/${id}`);
  const response = await fetch(url, buildOptions({ method: 'DELETE' }));
  await handleResponse(response);
}

/**
 * Publish or schedule a marketing content
 */
export async function publishContent(
  contentId: number,
  payload: {
    publishingConnectionId?: number;
    scheduledFor?: Date;
  },
): Promise<{ content: unknown }> {
  const url = buildApiUrl(`/marketing-contents/${contentId}/publish`);
  const response = await fetch(
    url,
    buildOptions({ method: 'POST', body: JSON.stringify(payload) }),
  );
  return handleResponse(response);
}

/**
 * Hook to fetch publishing connections
 */
export function usePublishingConnections(
  clientId: number,
): UseQueryResult<PublishingConnection[], Error> {
  return useQuery({
    queryKey: ['publishingConnections', clientId],
    queryFn: () => fetchPublishingConnections(clientId),
    enabled: !!clientId,
  });
}

/**
 * Hook to create a publishing connection
 */
export function useCreatePublishingConnection(): UseMutationResult<
  PublishingConnection,
  Error,
  CreatePublishingConnectionInput,
  unknown
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPublishingConnection,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['publishingConnections', data.clientId],
      });
    },
  });
}

/**
 * Hook to update a publishing connection
 */
export function useUpdatePublishingConnection(): UseMutationResult<
  PublishingConnection,
  Error,
  { id: number; payload: UpdatePublishingConnectionInput },
  unknown
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updatePublishingConnection(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['publishingConnections', data.clientId],
      });
    },
  });
}

/**
 * Hook to delete a publishing connection
 */
export function useDeletePublishingConnection(): UseMutationResult<
  void,
  Error,
  { id: number; clientId: number },
  unknown
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => deletePublishingConnection(id),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['publishingConnections', variables.clientId],
      });
    },
  });
}

/**
 * Hook to publish content
 */
export function usePublishContent(): UseMutationResult<
  { content: unknown },
  Error,
  {
    contentId: number;
    publishingConnectionId?: number;
    scheduledFor?: Date;
  },
  unknown
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contentId, publishingConnectionId, scheduledFor }) =>
      publishContent(contentId, { publishingConnectionId, scheduledFor }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-contents'] });
    },
  });
}
