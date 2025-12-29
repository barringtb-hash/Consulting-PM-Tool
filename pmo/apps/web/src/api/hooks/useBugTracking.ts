/**
 * React Query hooks for Bug Tracking
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../bug-tracking';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const bugTrackingKeys = {
  all: ['bug-tracking'] as const,
  issues: () => [...bugTrackingKeys.all, 'issues'] as const,
  issueList: (params: api.ListIssuesParams) =>
    [...bugTrackingKeys.issues(), 'list', params] as const,
  issueDetail: (id: number) =>
    [...bugTrackingKeys.issues(), 'detail', id] as const,
  issueStats: () => [...bugTrackingKeys.issues(), 'stats'] as const,
  labels: () => [...bugTrackingKeys.all, 'labels'] as const,
  comments: (issueId: number) =>
    [...bugTrackingKeys.all, 'comments', issueId] as const,
  errors: () => [...bugTrackingKeys.all, 'errors'] as const,
  errorList: (params: api.ListErrorsParams) =>
    [...bugTrackingKeys.errors(), 'list', params] as const,
  errorStats: (since?: string) =>
    [...bugTrackingKeys.errors(), 'stats', since] as const,
  issueErrors: (issueId: number) =>
    [...bugTrackingKeys.errors(), 'issue', issueId] as const,
  apiKeys: () => [...bugTrackingKeys.all, 'api-keys'] as const,
};

// ============================================================================
// ISSUE HOOKS
// ============================================================================

export function useIssues(params: api.ListIssuesParams = {}) {
  return useQuery({
    queryKey: bugTrackingKeys.issueList(params),
    queryFn: () => api.listIssues(params),
  });
}

export function useIssue(id: number) {
  return useQuery({
    queryKey: bugTrackingKeys.issueDetail(id),
    queryFn: () => api.getIssue(id),
    enabled: !!id,
  });
}

export function useIssueStats() {
  return useQuery({
    queryKey: bugTrackingKeys.issueStats(),
    queryFn: () => api.getIssueStats(),
  });
}

export function useCreateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: api.CreateIssueInput) => api.createIssue(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bugTrackingKeys.issues() });
    },
  });
}

export function useUpdateIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: api.UpdateIssueInput }) =>
      api.updateIssue(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bugTrackingKeys.issues() });
      queryClient.setQueryData(bugTrackingKeys.issueDetail(data.id), data);
    },
  });
}

export function useDeleteIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.deleteIssue(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bugTrackingKeys.issues() });
    },
  });
}

export function useAssignIssue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      assignedToId,
    }: {
      id: number;
      assignedToId: number | null;
    }) => api.assignIssue(id, assignedToId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bugTrackingKeys.issues() });
      queryClient.setQueryData(bugTrackingKeys.issueDetail(data.id), data);
    },
  });
}

export function useChangeIssueStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: api.IssueStatus }) =>
      api.changeIssueStatus(id, status),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: bugTrackingKeys.issues() });
      queryClient.setQueryData(bugTrackingKeys.issueDetail(data.id), data);
    },
  });
}

// ============================================================================
// BULK OPERATION HOOKS
// ============================================================================

export function useBulkUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      issueIds,
      status,
    }: {
      issueIds: number[];
      status: api.IssueStatus;
    }) => api.bulkUpdateStatus(issueIds, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bugTrackingKeys.issues() });
    },
  });
}

export function useBulkAssign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      issueIds,
      assignedToId,
    }: {
      issueIds: number[];
      assignedToId: number | null;
    }) => api.bulkAssign(issueIds, assignedToId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bugTrackingKeys.issues() });
    },
  });
}

export function useBulkAddLabels() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      issueIds,
      labelIds,
    }: {
      issueIds: number[];
      labelIds: number[];
    }) => api.bulkAddLabels(issueIds, labelIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bugTrackingKeys.issues() });
    },
  });
}

// ============================================================================
// LABEL HOOKS
// ============================================================================

export function useLabels() {
  return useQuery({
    queryKey: bugTrackingKeys.labels(),
    queryFn: () => api.listLabels(),
  });
}

export function useCreateLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: api.CreateLabelInput) => api.createLabel(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bugTrackingKeys.labels() });
    },
  });
}

export function useUpdateLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number;
      input: Partial<api.CreateLabelInput>;
    }) => api.updateLabel(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bugTrackingKeys.labels() });
    },
  });
}

export function useDeleteLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.deleteLabel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bugTrackingKeys.labels() });
    },
  });
}

// ============================================================================
// COMMENT HOOKS
// ============================================================================

export function useComments(issueId: number) {
  return useQuery({
    queryKey: bugTrackingKeys.comments(issueId),
    queryFn: () => api.listComments(issueId),
    enabled: !!issueId,
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ issueId, content }: { issueId: number; content: string }) =>
      api.addComment(issueId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: bugTrackingKeys.comments(variables.issueId),
      });
      queryClient.invalidateQueries({
        queryKey: bugTrackingKeys.issueDetail(variables.issueId),
      });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId }: { commentId: number; issueId: number }) =>
      api.deleteComment(commentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: bugTrackingKeys.comments(variables.issueId),
      });
    },
  });
}

// ============================================================================
// ERROR LOG HOOKS
// ============================================================================

export function useErrors(params: api.ListErrorsParams = {}) {
  return useQuery({
    queryKey: bugTrackingKeys.errorList(params),
    queryFn: () => api.listErrors(params),
  });
}

export function useErrorStats(since?: string) {
  return useQuery({
    queryKey: bugTrackingKeys.errorStats(since),
    queryFn: () => api.getErrorStats(since),
  });
}

export function useIssueErrors(issueId: number, limit?: number) {
  return useQuery({
    queryKey: bugTrackingKeys.issueErrors(issueId),
    queryFn: () => api.getIssueErrors(issueId, limit),
    enabled: !!issueId,
  });
}

// ============================================================================
// API KEY HOOKS
// ============================================================================

export function useApiKeys() {
  return useQuery({
    queryKey: bugTrackingKeys.apiKeys(),
    queryFn: () => api.listApiKeys(),
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: api.CreateApiKeyInput) => api.createApiKey(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bugTrackingKeys.apiKeys() });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.revokeApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bugTrackingKeys.apiKeys() });
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.deleteApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bugTrackingKeys.apiKeys() });
    },
  });
}

// ============================================================================
// AI PROMPT HOOKS
// ============================================================================

export const aiPromptKeys = {
  all: ['ai-prompt'] as const,
  issue: (issueId: number, options?: api.AIPromptOptions) =>
    [...aiPromptKeys.all, 'issue', issueId, options] as const,
  formats: () => [...aiPromptKeys.all, 'formats'] as const,
};

export function useIssueAIPrompt(
  issueId: number,
  options: api.AIPromptOptions = {},
  enabled = true,
) {
  return useQuery({
    queryKey: aiPromptKeys.issue(issueId, options),
    queryFn: () => api.getIssueAIPrompt(issueId, options),
    enabled: enabled && !!issueId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useAIPromptFormats() {
  return useQuery({
    queryKey: aiPromptKeys.formats(),
    queryFn: () => api.getAIPromptFormats(),
    staleTime: 30 * 60 * 1000, // Cache for 30 minutes
  });
}

export function useGenerateAIPrompt() {
  return useMutation({
    mutationFn: ({
      issueId,
      options,
    }: {
      issueId: number;
      options?: api.AIPromptOptions;
    }) => api.getIssueAIPrompt(issueId, options),
  });
}

export function useBatchAIPrompts() {
  return useMutation({
    mutationFn: (options: api.BatchPromptOptions) =>
      api.getBatchAIPrompts(options),
  });
}
