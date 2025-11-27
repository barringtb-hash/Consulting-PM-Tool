/**
 * Publishing Module - React Query Hooks
 *
 * This module provides all React Query hooks for publishing connection management.
 * Publishing connections allow content to be published to external platforms.
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
  createPublishingConnection,
  deletePublishingConnection,
  fetchPublishingConnections,
  publishContent,
  updatePublishingConnection,
} from '../../publishing';
import type {
  CreatePublishingConnectionInput,
  PublishingConnection,
  UpdatePublishingConnectionInput,
} from '../../../../../packages/types/marketing';

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch publishing connections for a client
 */
export function usePublishingConnections(
  clientId: number,
): UseQueryResult<PublishingConnection[], Error> {
  return useQuery({
    queryKey: queryKeys.publishing.connections(clientId),
    queryFn: () => fetchPublishingConnections(clientId),
    enabled: !!clientId,
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new publishing connection
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
        queryKey: queryKeys.publishing.connections(data.clientId),
      });
    },
  });
}

/**
 * Update an existing publishing connection
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
        queryKey: queryKeys.publishing.connections(data.clientId),
      });
    },
  });
}

/**
 * Delete a publishing connection
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
        queryKey: queryKeys.publishing.connections(variables.clientId),
      });
    },
  });
}

/**
 * Publish or schedule content
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
      queryClient.invalidateQueries({ queryKey: queryKeys.marketing.all });
    },
  });
}

// ============================================================================
// Re-exports
// ============================================================================

export type {
  CreatePublishingConnectionInput,
  PublishingConnection,
  UpdatePublishingConnectionInput,
} from '../../../../../packages/types/marketing';
