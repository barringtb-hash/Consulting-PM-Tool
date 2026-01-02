/**
 * Project Documents Module - React Query Hooks
 *
 * This module provides React Query hooks for project document template management.
 * Documents are structured templates that can be created for each project.
 *
 * @module projectDocuments
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import { isProjectDeleting } from '../deletionTracker';
import {
  // Template functions
  fetchTemplates,
  fetchTemplateByType,
  // Document functions
  fetchProjectDocuments,
  fetchProjectDocumentStats,
  createProjectDocument,
  fetchProjectDocumentById,
  updateProjectDocument,
  updateProjectDocumentStatus,
  cloneProjectDocument,
  deleteProjectDocument,
  // Version functions
  fetchDocumentVersions,
  fetchDocumentVersion,
  restoreDocumentVersion,
  // Types
  type TemplateInfo,
  type ProjectDocument,
  type ProjectDocumentStats,
  type ProjectDocumentVersion,
  type ProjectDocumentType,
  type ProjectDocumentStatus,
  type ListProjectDocumentsParams,
  type CreateProjectDocumentPayload,
  type UpdateProjectDocumentPayload,
} from '../../projectDocuments';

// ============================================================================
// Template Queries
// ============================================================================

/**
 * Fetch all available document templates
 */
export function useDocumentTemplates(): UseQueryResult<TemplateInfo[], Error> {
  return useQuery({
    queryKey: queryKeys.projectDocuments.templates(),
    queryFn: () => fetchTemplates(),
    staleTime: 1000 * 60 * 60, // Templates don't change often, cache for 1 hour
  });
}

/**
 * Fetch a specific template by type
 */
export function useDocumentTemplate(
  type?: ProjectDocumentType,
): UseQueryResult<TemplateInfo, Error> {
  return useQuery({
    queryKey: queryKeys.projectDocuments.template(type ?? ''),
    queryFn: () => fetchTemplateByType(type!),
    enabled: Boolean(type),
    staleTime: 1000 * 60 * 60,
  });
}

// ============================================================================
// Project Document Queries
// ============================================================================

/**
 * Fetch all documents for a project
 */
export function useProjectDocuments(
  projectId?: number,
  params?: ListProjectDocumentsParams,
): UseQueryResult<ProjectDocument[], Error> {
  return useQuery({
    queryKey: queryKeys.projectDocuments.list(projectId ?? 0, params),
    queryFn: () => fetchProjectDocuments(projectId!, params),
    enabled: Boolean(projectId) && !isProjectDeleting(projectId),
  });
}

/**
 * Fetch document statistics for a project
 */
export function useProjectDocumentStats(
  projectId?: number,
): UseQueryResult<ProjectDocumentStats, Error> {
  return useQuery({
    queryKey: queryKeys.projectDocuments.stats(projectId ?? 0),
    queryFn: () => fetchProjectDocumentStats(projectId!),
    enabled: Boolean(projectId) && !isProjectDeleting(projectId),
  });
}

/**
 * Fetch a single document by ID
 */
export function useProjectDocument(
  id?: number,
): UseQueryResult<ProjectDocument, Error> {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.projectDocuments.detail(id ?? 0),
    queryFn: () => fetchProjectDocumentById(id!),
    enabled: Boolean(id),
    initialData: () => {
      if (!id) return undefined;

      // Try to find document in cached list queries
      const cachedQueries = queryClient.getQueriesData<ProjectDocument[]>({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === queryKeys.projectDocuments.all[0] &&
          query.queryKey[1] === 'project',
        type: 'active',
      });

      for (const [, documents] of cachedQueries) {
        const match = documents?.find((doc) => doc.id === id);
        if (match) {
          return match;
        }
      }

      return undefined;
    },
  });
}

// ============================================================================
// Document Mutations
// ============================================================================

/**
 * Create a new document from a template
 */
export function useCreateProjectDocument(
  projectId: number,
): UseMutationResult<ProjectDocument, Error, CreateProjectDocumentPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateProjectDocumentPayload) =>
      createProjectDocument(projectId, payload),
    onSuccess: (document) => {
      // Invalidate project documents list
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectDocuments.byProject(projectId),
      });
      // Set the new document in cache
      queryClient.setQueryData(
        queryKeys.projectDocuments.detail(document.id),
        document,
      );
    },
  });
}

/**
 * Update a document
 */
export function useUpdateProjectDocument(
  id: number,
): UseMutationResult<ProjectDocument, Error, UpdateProjectDocumentPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProjectDocumentPayload) =>
      updateProjectDocument(id, payload),
    onSuccess: (document) => {
      // Invalidate project documents list
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectDocuments.byProject(document.projectId),
      });
      // Update the document in cache
      queryClient.setQueryData(queryKeys.projectDocuments.detail(id), document);
      // Invalidate versions if content was updated
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectDocuments.versions(id),
      });
    },
  });
}

/**
 * Update document status only
 */
export function useUpdateProjectDocumentStatus(
  id: number,
): UseMutationResult<ProjectDocument, Error, ProjectDocumentStatus> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: ProjectDocumentStatus) =>
      updateProjectDocumentStatus(id, status),
    onSuccess: (document) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectDocuments.byProject(document.projectId),
      });
      queryClient.setQueryData(queryKeys.projectDocuments.detail(id), document);
    },
  });
}

/**
 * Clone a document
 */
export function useCloneProjectDocument(): UseMutationResult<
  ProjectDocument,
  Error,
  { id: number; newName: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, newName }: { id: number; newName: string }) =>
      cloneProjectDocument(id, newName),
    onSuccess: (document) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectDocuments.byProject(document.projectId),
      });
      queryClient.setQueryData(
        queryKeys.projectDocuments.detail(document.id),
        document,
      );
    },
  });
}

/**
 * Delete a document
 */
export function useDeleteProjectDocument(): UseMutationResult<
  void,
  Error,
  { id: number; projectId: number }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: number; projectId: number }) =>
      deleteProjectDocument(id),
    onSuccess: (_, { id, projectId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectDocuments.byProject(projectId),
      });
      queryClient.removeQueries({
        queryKey: queryKeys.projectDocuments.detail(id),
      });
    },
  });
}

// ============================================================================
// Version Queries & Mutations
// ============================================================================

/**
 * Fetch version history for a document
 */
export function useDocumentVersions(
  documentId?: number,
): UseQueryResult<ProjectDocumentVersion[], Error> {
  return useQuery({
    queryKey: queryKeys.projectDocuments.versions(documentId ?? 0),
    queryFn: () => fetchDocumentVersions(documentId!),
    enabled: Boolean(documentId),
  });
}

/**
 * Fetch a specific version of a document
 */
export function useDocumentVersion(
  documentId?: number,
  version?: number,
): UseQueryResult<ProjectDocumentVersion, Error> {
  return useQuery({
    queryKey: queryKeys.projectDocuments.version(documentId ?? 0, version ?? 0),
    queryFn: () => fetchDocumentVersion(documentId!, version!),
    enabled: Boolean(documentId) && Boolean(version),
  });
}

/**
 * Restore a document to a previous version
 */
export function useRestoreDocumentVersion(
  documentId: number,
): UseMutationResult<ProjectDocument, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (version: number) =>
      restoreDocumentVersion(documentId, version),
    onSuccess: (document) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectDocuments.byProject(document.projectId),
      });
      queryClient.setQueryData(
        queryKeys.projectDocuments.detail(documentId),
        document,
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.projectDocuments.versions(documentId),
      });
    },
  });
}

// ============================================================================
// Re-exports
// ============================================================================

export type {
  TemplateInfo,
  ProjectDocument,
  ProjectDocumentStats,
  ProjectDocumentVersion,
  ProjectDocumentType,
  ProjectDocumentStatus,
  ProjectDocumentCategory,
  ListProjectDocumentsParams,
  CreateProjectDocumentPayload,
  UpdateProjectDocumentPayload,
} from '../../projectDocuments';
