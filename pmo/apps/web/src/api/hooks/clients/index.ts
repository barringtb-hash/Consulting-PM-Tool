/**
 * Clients Module - React Query Hooks
 *
 * This module provides all React Query hooks for client management.
 * Includes queries for fetching clients and mutations for CRUD operations.
 *
 * @module clients
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
import { QUERY_CONFIG } from '../queryConfig';
import { invalidateRelatedModules } from '../moduleRegistry';
import {
  archiveClient,
  createClient,
  deleteClient,
  fetchClientById,
  fetchClients,
  updateClient,
  type Client,
  type ClientFilters,
  type ClientPayload,
} from '../../clients';

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch all clients with optional filters
 */
export function useClients(
  filters?: ClientFilters,
): UseQueryResult<Client[], Error> {
  return useQuery({
    queryKey: queryKeys.clients.list(filters),
    queryFn: () => fetchClients(filters),
    ...QUERY_CONFIG,
  });
}

/**
 * Fetch a single client by ID
 */
export function useClient(clientId?: number): UseQueryResult<Client, Error> {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: clientId
      ? queryKeys.clients.detail(clientId)
      : queryKeys.clients.all,
    enabled: Boolean(clientId),
    queryFn: () => fetchClientById(clientId as number, true),
    ...QUERY_CONFIG,
    initialData: () => {
      if (!clientId) {
        return undefined;
      }

      const cachedLists = queryClient.getQueriesData<Client[]>({
        queryKey: queryKeys.clients.lists(),
        type: 'active',
      });

      for (const [, clients] of cachedLists) {
        const match = clients?.find((entry) => entry.id === clientId);
        if (match) {
          return match;
        }
      }

      return undefined;
    },
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new client
 */
export function useCreateClient(): UseMutationResult<
  Client,
  Error,
  ClientPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ClientPayload) => createClient(payload),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      queryClient.setQueryData(queryKeys.clients.detail(client.id), client);
    },
  });
}

/**
 * Update an existing client
 */
export function useUpdateClient(
  clientId: number,
): UseMutationResult<Client, Error, Partial<ClientPayload>> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Partial<ClientPayload>) =>
      updateClient(clientId, payload),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      queryClient.setQueryData(queryKeys.clients.detail(clientId), client);
    },
  });
}

/**
 * Archive a client (soft delete)
 */
export function useArchiveClient(): UseMutationResult<Client, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: number) => archiveClient(clientId),
    onSuccess: (client, clientId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      queryClient.setQueryData(queryKeys.clients.detail(clientId), client);
    },
  });
}

/**
 * Delete a client permanently
 *
 * This mutation removes all client-related queries from the cache to prevent
 * 404 errors, then invalidates list queries to refresh the UI.
 */
export function useDeleteClient(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: number) => deleteClient(clientId),
    onSuccess: (_, clientId) => {
      // Remove all queries specific to this client to prevent 404 refetch errors
      queryClient.removeQueries({
        queryKey: queryKeys.clients.detail(clientId),
      });

      // Remove client contacts queries
      queryClient.removeQueries({
        queryKey: queryKeys.contacts.byClient(clientId),
      });

      // Remove brand profile queries
      queryClient.removeQueries({
        queryKey: queryKeys.brandProfiles.byClient(clientId),
      });

      // Remove publishing connections queries
      queryClient.removeQueries({
        queryKey: queryKeys.publishing.connections(clientId),
      });

      // Cross-module removal using module registry rules
      invalidateRelatedModules(queryClient, {
        sourceModule: 'clients',
        trigger: 'delete',
        entityId: clientId,
      });

      // Invalidate client lists to refresh UI
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.lists() });
    },
  });
}

// ============================================================================
// Re-exports
// ============================================================================

export type { Client, ClientFilters, ClientPayload } from '../../clients';
