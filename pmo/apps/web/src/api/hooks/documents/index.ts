/**
 * Documents Module - React Query Hooks
 *
 * This module provides all React Query hooks for document management.
 * Includes AI-powered document generation.
 *
 * @module documents
 * @see moduleRegistry for module dependencies and invalidation rules
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
import { moduleRegistry } from '../moduleRegistry';
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
 *
 * This query is module-aware and will not execute if the documents module is disabled.
 */
export function useDocuments(
  filters?: DocumentFilters,
): UseQueryResult<Document[], Error> {
  const isModuleEnabled = moduleRegistry.isModuleEnabled('documents');
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
    enabled: Boolean(queryFilters) && isModuleEnabled,
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
