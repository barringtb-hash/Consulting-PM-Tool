/**
 * RAID Data Hooks
 *
 * React Query hooks for fetching and mutating RAID log data.
 * Integrates with the RAID module API endpoints.
 *
 * @module features/raid/hooks
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { http } from '../../../api/http';
import type {
  RAIDSummary,
  RAIDItem,
  ActionItem,
  Decision,
  Issue,
  Risk,
  ExtractedRAIDItem,
  RAIDItemFormValues,
} from '../types';

// ============================================================================
// Query Keys
// ============================================================================

export const raidQueryKeys = {
  all: ['raid'] as const,
  summary: (projectId: number) =>
    [...raidQueryKeys.all, 'summary', projectId] as const,
  actionItems: (projectId: number) =>
    [...raidQueryKeys.all, 'action-items', projectId] as const,
  decisions: (projectId: number) =>
    [...raidQueryKeys.all, 'decisions', projectId] as const,
  issues: (projectId: number) =>
    [...raidQueryKeys.all, 'issues', projectId] as const,
  risks: (projectId: number) =>
    [...raidQueryKeys.all, 'risks', projectId] as const,
  extraction: (meetingId: number) =>
    [...raidQueryKeys.all, 'extraction', meetingId] as const,
};

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch RAID summary statistics for a project
 */
export function useRAIDSummary(
  projectId: number,
): UseQueryResult<RAIDSummary, Error> {
  return useQuery({
    queryKey: raidQueryKeys.summary(projectId),
    queryFn: () =>
      http.get<RAIDSummary>(`/api/raid/extract/projects/${projectId}/summary`),
    enabled: Boolean(projectId),
  });
}

// Response types from API (wrapped objects)
interface ActionItemsResponse {
  actionItems: ActionItem[];
  total: number;
}

interface DecisionsResponse {
  decisions: Decision[];
  total: number;
}

interface IssuesResponse {
  issues: Issue[];
  total: number;
}

interface RisksResponse {
  risks: Risk[];
  total: number;
}

/**
 * Fetch action items for a project
 */
export function useActionItems(
  projectId: number,
): UseQueryResult<ActionItem[], Error> {
  return useQuery({
    queryKey: raidQueryKeys.actionItems(projectId),
    queryFn: async () => {
      const response = await http.get<ActionItemsResponse>(
        `/api/raid/action-items/projects/${projectId}/action-items`,
      );
      return response.actionItems ?? [];
    },
    enabled: Boolean(projectId),
  });
}

/**
 * Fetch decisions for a project
 */
export function useDecisions(
  projectId: number,
): UseQueryResult<Decision[], Error> {
  return useQuery({
    queryKey: raidQueryKeys.decisions(projectId),
    queryFn: async () => {
      const response = await http.get<DecisionsResponse>(
        `/api/raid/decisions/projects/${projectId}/decisions`,
      );
      return response.decisions ?? [];
    },
    enabled: Boolean(projectId),
  });
}

/**
 * Fetch issues for a project
 */
export function useProjectIssues(
  projectId: number,
): UseQueryResult<Issue[], Error> {
  return useQuery({
    queryKey: raidQueryKeys.issues(projectId),
    queryFn: async () => {
      const response = await http.get<IssuesResponse>(
        `/api/raid/issues/projects/${projectId}/issues`,
      );
      return response.issues ?? [];
    },
    enabled: Boolean(projectId),
  });
}

/**
 * Fetch risks for a project
 * Uses the RAID risks endpoint
 */
export function useProjectRisks(
  projectId: number,
): UseQueryResult<Risk[], Error> {
  return useQuery({
    queryKey: raidQueryKeys.risks(projectId),
    queryFn: async () => {
      const response = await http.get<RisksResponse>(
        `/api/raid/risks/projects/${projectId}/risks`,
      );
      return response.risks ?? [];
    },
    enabled: Boolean(projectId),
  });
}

// ============================================================================
// Mutations
// ============================================================================

interface ExtractRAIDPayload {
  meetingId: number;
}

interface ExtractRAIDResponse {
  extractedItems: ExtractedRAIDItem[];
  meetingTitle?: string;
}

/**
 * Extract RAID items from a meeting
 */
export function useExtractRAID(): UseMutationResult<
  ExtractRAIDResponse,
  Error,
  ExtractRAIDPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ meetingId }) => {
      return http.post<ExtractRAIDResponse>(
        `/api/raid/extract/meetings/${meetingId}`,
      );
    },
    onSuccess: () => {
      // Invalidate all RAID queries since extraction may add new items
      queryClient.invalidateQueries({ queryKey: raidQueryKeys.all });
    },
  });
}

interface AcceptExtractedItemsPayload {
  projectId: number;
  items: ExtractedRAIDItem[];
}

interface AcceptExtractedItemsResponse {
  created: RAIDItem[];
  failed: { item: ExtractedRAIDItem; error: string }[];
}

/**
 * Accept and create RAID items from extracted items
 */
export function useAcceptExtractedItems(): UseMutationResult<
  AcceptExtractedItemsResponse,
  Error,
  AcceptExtractedItemsPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, items }) => {
      return http.post<AcceptExtractedItemsResponse>(
        `/api/raid/extract/projects/${projectId}/accept`,
        { items },
      );
    },
    onSuccess: (_, { projectId }) => {
      // Invalidate all RAID queries for this project
      queryClient.invalidateQueries({
        queryKey: raidQueryKeys.summary(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: raidQueryKeys.actionItems(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: raidQueryKeys.decisions(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: raidQueryKeys.issues(projectId),
      });
      queryClient.invalidateQueries({
        queryKey: raidQueryKeys.risks(projectId),
      });
    },
  });
}

interface CreateRAIDItemPayload {
  projectId: number;
  values: RAIDItemFormValues;
}

/**
 * Create a new RAID item
 */
export function useCreateRAIDItem(): UseMutationResult<
  RAIDItem,
  Error,
  CreateRAIDItemPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, values }) => {
      const endpoint = getEndpointForType(values.type, projectId);
      // Remove 'type' field before sending - API determines type from endpoint
      const { type, ...payload } = values;

      // Transform risk field names to match API schema
      if (type === 'risk') {
        const {
          probability,
          impact,
          mitigationPlan,
          contingencyPlan: _contingencyPlan,
          ...rest
        } = payload as Record<string, unknown>;
        const riskPayload = {
          ...rest,
          // Map frontend field names to API field names
          likelihood: probability,
          severity: impact,
          suggestedMitigation: mitigationPlan,
          // contingencyPlan is not in API schema, include in description if needed
        };
        return http.post<RAIDItem>(endpoint, riskPayload);
      }

      return http.post<RAIDItem>(endpoint, payload);
    },
    onSuccess: (_, { projectId, values }) => {
      queryClient.invalidateQueries({
        queryKey: raidQueryKeys.summary(projectId),
      });
      // Invalidate the specific type's query
      switch (values.type) {
        case 'action-item':
          queryClient.invalidateQueries({
            queryKey: raidQueryKeys.actionItems(projectId),
          });
          break;
        case 'decision':
          queryClient.invalidateQueries({
            queryKey: raidQueryKeys.decisions(projectId),
          });
          break;
        case 'issue':
          queryClient.invalidateQueries({
            queryKey: raidQueryKeys.issues(projectId),
          });
          break;
        case 'risk':
          queryClient.invalidateQueries({
            queryKey: raidQueryKeys.risks(projectId),
          });
          break;
      }
    },
  });
}

interface UpdateRAIDItemPayload {
  projectId: number;
  itemId: number;
  values: Partial<RAIDItemFormValues>;
  type: RAIDItem['type'];
}

/**
 * Update an existing RAID item
 */
export function useUpdateRAIDItem(): UseMutationResult<
  RAIDItem,
  Error,
  UpdateRAIDItemPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, values, type }) => {
      const endpoint = getItemEndpointForType(type, itemId);
      return http.patch<RAIDItem>(endpoint, values);
    },
    onSuccess: (_, { projectId, type }) => {
      queryClient.invalidateQueries({
        queryKey: raidQueryKeys.summary(projectId),
      });
      // Invalidate the specific type's query
      switch (type) {
        case 'action-item':
          queryClient.invalidateQueries({
            queryKey: raidQueryKeys.actionItems(projectId),
          });
          break;
        case 'decision':
          queryClient.invalidateQueries({
            queryKey: raidQueryKeys.decisions(projectId),
          });
          break;
        case 'issue':
          queryClient.invalidateQueries({
            queryKey: raidQueryKeys.issues(projectId),
          });
          break;
        case 'risk':
          queryClient.invalidateQueries({
            queryKey: raidQueryKeys.risks(projectId),
          });
          break;
      }
    },
  });
}

interface DeleteRAIDItemPayload {
  projectId: number;
  itemId: number;
  type: RAIDItem['type'];
}

/**
 * Delete a RAID item
 */
export function useDeleteRAIDItem(): UseMutationResult<
  void,
  Error,
  DeleteRAIDItemPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, type }) => {
      const endpoint = getItemEndpointForType(type, itemId);
      return http.delete<void>(endpoint);
    },
    onSuccess: (_, { projectId, type }) => {
      queryClient.invalidateQueries({
        queryKey: raidQueryKeys.summary(projectId),
      });
      // Invalidate the specific type's query
      switch (type) {
        case 'action-item':
          queryClient.invalidateQueries({
            queryKey: raidQueryKeys.actionItems(projectId),
          });
          break;
        case 'decision':
          queryClient.invalidateQueries({
            queryKey: raidQueryKeys.decisions(projectId),
          });
          break;
        case 'issue':
          queryClient.invalidateQueries({
            queryKey: raidQueryKeys.issues(projectId),
          });
          break;
        case 'risk':
          queryClient.invalidateQueries({
            queryKey: raidQueryKeys.risks(projectId),
          });
          break;
      }
    },
  });
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get the API endpoint for creating items of a specific type
 */
function getEndpointForType(type: RAIDItem['type'], projectId: number): string {
  switch (type) {
    case 'action-item':
      return `/api/raid/action-items/projects/${projectId}/action-items`;
    case 'decision':
      return `/api/raid/decisions/projects/${projectId}/decisions`;
    case 'issue':
      return `/api/raid/issues/projects/${projectId}/issues`;
    case 'risk':
      // Use RAID risks endpoint
      return `/api/raid/risks/projects/${projectId}/risks`;
  }
}

/**
 * Get the API endpoint for a specific item
 */
function getItemEndpointForType(
  type: RAIDItem['type'],
  itemId: number,
): string {
  switch (type) {
    case 'action-item':
      return `/api/raid/action-items/${itemId}`;
    case 'decision':
      return `/api/raid/decisions/${itemId}`;
    case 'issue':
      return `/api/raid/issues/${itemId}`;
    case 'risk':
      // Use RAID risks endpoint
      return `/api/raid/risks/${itemId}`;
  }
}
