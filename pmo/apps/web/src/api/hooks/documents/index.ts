/**
 * Documents Module - React Query Hooks
 *
 * This module provides all React Query hooks for document management.
 * Includes AI-powered document generation.
 */

import { useMemo } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import {
  deleteDocument,
  fetchDocuments,
  generateDocument,
  type Document,
  type DocumentFilters,
  type DocumentPayload,
} from '../../documents';

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch documents with optional filters
 */
export function useDocuments(
  filters?: DocumentFilters,
): UseQueryResult<Document[], Error> {
  const queryFilters = useMemo<DocumentFilters | undefined>(() => {
    if (!filters) {
      return undefined;
    }

    return {
      clientId: filters.clientId,
      projectId: filters.projectId,
    };
  }, [filters]);

  return useQuery({
    queryKey: queryKeys.documents.list(queryFilters),
    enabled: Boolean(queryFilters),
    queryFn: () => fetchDocuments(queryFilters),
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Generate a new document using AI
 */
export function useGenerateDocument(): UseMutationResult<
  Document,
  Error,
  DocumentPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DocumentPayload) => generateDocument(payload),
    onSuccess: (document, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });

      if (variables.projectId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.projects.detail(variables.projectId),
        });
      }

      queryClient.setQueryData<Document[]>(
        queryKeys.documents.list({
          clientId: variables.clientId,
          projectId: variables.projectId,
        }),
        (current) => (current ? [document, ...current] : [document]),
      );
    },
  });
}

/**
 * Delete a document
 */
export function useDeleteDocument(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: number) => deleteDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
    },
  });
}

// ============================================================================
// Re-exports
// ============================================================================

export type {
  Document,
  DocumentFilters,
  DocumentPayload,
} from '../../documents';
