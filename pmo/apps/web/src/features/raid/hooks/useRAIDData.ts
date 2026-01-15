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

interface ExtractedRiskFromAPI {
  title: string;
  description?: string;
  impact?: string;
  likelihood?: string;
  sourceText?: string;
  confidence?: number;
}

interface ExtractedActionItemFromAPI {
  title: string;
  description?: string;
  assigneeName?: string;
  priority?: string;
  dueDate?: string;
  sourceText?: string;
  confidence?: number;
}

interface ExtractedIssueFromAPI {
  title: string;
  description?: string;
  severity?: string;
  sourceText?: string;
  confidence?: number;
}

interface ExtractedDecisionFromAPI {
  title: string;
  description?: string;
  rationale?: string;
  sourceText?: string;
  confidence?: number;
}

interface ExtractRAIDAPIResponse {
  meetingId?: number;
  projectId: number;
  risks: ExtractedRiskFromAPI[];
  actionItems: ExtractedActionItemFromAPI[];
  issues: ExtractedIssueFromAPI[];
  decisions: ExtractedDecisionFromAPI[];
  summary?: string;
  extractedAt: string;
  llmUsed: boolean;
}

/**
 * Extended response type with combined extractedItems array
 */
interface ExtractRAIDResponse extends ExtractRAIDAPIResponse {
  extractedItems: ExtractedRAIDItem[];
}

/**
 * Normalize confidence value to 0-1 range
 * Handles cases where LLM returns percentage (0-100) instead of decimal (0-1)
 */
function normalizeConfidence(value?: number): number {
  if (value === undefined || value === null) return 0.7;
  // If value is greater than 1, assume it's a percentage
  if (value > 1) return Math.min(value / 100, 1);
  // Clamp to valid range
  return Math.max(0, Math.min(value, 1));
}

/**
 * Transform API response to include combined extractedItems array
 */
function transformExtractResponse(
  response: ExtractRAIDAPIResponse,
): ExtractRAIDResponse {
  const extractedItems: ExtractedRAIDItem[] = [];

  // Transform risks
  for (const risk of response.risks) {
    extractedItems.push({
      type: 'risk',
      title: risk.title,
      description: risk.description,
      confidence: normalizeConfidence(risk.confidence),
      sourceText: risk.sourceText,
      suggestedSeverity: mapSeverity(risk.impact),
    });
  }

  // Transform action items
  for (const item of response.actionItems) {
    extractedItems.push({
      type: 'action-item',
      title: item.title,
      description: item.description,
      confidence: normalizeConfidence(item.confidence),
      sourceText: item.sourceText,
      suggestedOwner: item.assigneeName,
      suggestedPriority: mapPriority(item.priority),
      suggestedDueDate: item.dueDate,
    });
  }

  // Transform issues
  for (const issue of response.issues) {
    extractedItems.push({
      type: 'issue',
      title: issue.title,
      description: issue.description,
      confidence: normalizeConfidence(issue.confidence),
      sourceText: issue.sourceText,
      suggestedSeverity: mapSeverity(issue.severity),
    });
  }

  // Transform decisions
  for (const decision of response.decisions) {
    extractedItems.push({
      type: 'decision',
      title: decision.title,
      description: decision.description
        ? `${decision.description}${decision.rationale ? `\n\nRationale: ${decision.rationale}` : ''}`
        : decision.rationale,
      confidence: normalizeConfidence(decision.confidence),
      sourceText: decision.sourceText,
    });
  }

  return {
    ...response,
    extractedItems,
  };
}

/**
 * Map API severity/impact string to typed Severity
 */
function mapSeverity(
  value?: string,
): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  if (
    upper === 'CRITICAL' ||
    upper === 'HIGH' ||
    upper === 'MEDIUM' ||
    upper === 'LOW'
  ) {
    return upper as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }
  return 'MEDIUM';
}

/**
 * Map API priority string to typed Priority
 */
function mapPriority(
  value?: string,
): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  // Handle P1, P2, P3, P4 format
  if (upper === 'P1' || upper === 'CRITICAL') return 'CRITICAL';
  if (upper === 'P2' || upper === 'HIGH') return 'HIGH';
  if (upper === 'P3' || upper === 'MEDIUM') return 'MEDIUM';
  if (upper === 'P4' || upper === 'LOW') return 'LOW';
  return 'MEDIUM';
}

// Extended timeout for LLM operations (60 seconds)
const LLM_TIMEOUT = 60000;

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
      // Use extended timeout for LLM extraction operations
      const response = await http.post<ExtractRAIDAPIResponse>(
        `/api/raid/extract/meetings/${meetingId}`,
        undefined,
        { timeout: LLM_TIMEOUT },
      );
      // Transform to include combined extractedItems array
      return transformExtractResponse(response);
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
// Convert to Task Mutation
// ============================================================================

interface ConvertToTaskPayload {
  actionItemId: number;
  projectId: number;
  options?: {
    title?: string;
    description?: string;
    milestoneId?: number;
    status?: string;
    priority?: string;
    dueDate?: string;
    assigneeIds?: number[];
  };
}

interface ConvertToTaskResponse {
  task: {
    id: number;
    title: string;
    status: string;
    priority: string;
    projectId: number;
    [key: string]: unknown;
  };
  actionItem: {
    id: number;
    status: string;
    linkedTaskId: number;
    [key: string]: unknown;
  };
}

/**
 * Convert an action item to a formal project task.
 * The action item's status will be changed to CONVERTED_TO_TASK.
 */
export function useConvertActionItemToTask(): UseMutationResult<
  ConvertToTaskResponse,
  Error,
  ConvertToTaskPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ actionItemId, options }) => {
      return http.post<ConvertToTaskResponse>(
        `/api/raid/action-items/${actionItemId}/convert-to-task`,
        options ?? {},
      );
    },
    onSuccess: (_, { projectId }) => {
      // Invalidate action items query to refresh the list
      queryClient.invalidateQueries({
        queryKey: raidQueryKeys.actionItems(projectId),
      });
      // Invalidate summary to update counts
      queryClient.invalidateQueries({
        queryKey: raidQueryKeys.summary(projectId),
      });
      // Invalidate tasks queries since a new task was created
      // Using the common tasks query key pattern
      queryClient.invalidateQueries({
        queryKey: ['tasks', 'project', projectId],
      });
      queryClient.invalidateQueries({
        queryKey: ['tasks', 'my-tasks'],
      });
    },
  });
}

// ============================================================================
// SUPERSEDE DECISION MUTATION
// ============================================================================

interface SupersedeDecisionPayload {
  decisionId: number;
  projectId: number;
  newDecisionId: number;
  reason?: string;
}

interface SupersedeDecisionResponse {
  decision: {
    id: number;
    status: string;
    supersededById: number;
    [key: string]: unknown;
  };
  newDecision: {
    id: number;
    [key: string]: unknown;
  };
}

/**
 * Supersede a decision with a new decision.
 * The original decision's status will be changed to SUPERSEDED.
 */
export function useSupersedeDecision(): UseMutationResult<
  SupersedeDecisionResponse,
  Error,
  SupersedeDecisionPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ decisionId, newDecisionId, reason }) => {
      return http.post<SupersedeDecisionResponse>(
        `/api/raid/decisions/${decisionId}/supersede`,
        { newDecisionId, reason },
      );
    },
    onSuccess: (_, { projectId }) => {
      // Invalidate decisions query to refresh the list
      queryClient.invalidateQueries({
        queryKey: raidQueryKeys.decisions(projectId),
      });
      // Invalidate summary to update counts
      queryClient.invalidateQueries({
        queryKey: raidQueryKeys.summary(projectId),
      });
    },
  });
}

// ============================================================================
// ESCALATE ISSUE MUTATION
// ============================================================================

interface EscalateIssuePayload {
  issueId: number;
  projectId: number;
  reason?: string;
  escalateTo?: string;
}

interface EscalateIssueResponse {
  issue: {
    id: number;
    status: string;
    escalationLevel: number;
    [key: string]: unknown;
  };
}

/**
 * Escalate an issue to a higher level.
 * The issue's escalation level will be incremented.
 */
export function useEscalateIssue(): UseMutationResult<
  EscalateIssueResponse,
  Error,
  EscalateIssuePayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ issueId, reason, escalateTo }) => {
      return http.post<EscalateIssueResponse>(
        `/api/raid/issues/${issueId}/escalate`,
        { reason, escalateTo },
      );
    },
    onSuccess: (_, { projectId }) => {
      // Invalidate issues query to refresh the list
      queryClient.invalidateQueries({
        queryKey: raidQueryKeys.issues(projectId),
      });
      // Invalidate summary to update counts
      queryClient.invalidateQueries({
        queryKey: raidQueryKeys.summary(projectId),
      });
    },
  });
}

// ============================================================================
// RAID TRENDS QUERY
// ============================================================================

interface RAIDTrendPoint {
  date: string;
  risks: number;
  actionItems: number;
  issues: number;
  decisions: number;
}

interface RAIDTrendsResponse {
  trends: RAIDTrendPoint[];
}

/**
 * Fetch RAID trends data for a project over time.
 */
export function useRAIDTrends(
  projectId: number | null,
  days: number = 30,
): UseQueryResult<RAIDTrendsResponse, Error> {
  return useQuery({
    queryKey: [...raidQueryKeys.summary(projectId ?? 0), 'trends', days],
    queryFn: async () => {
      if (!projectId) throw new Error('Project ID required');
      return http.get<RAIDTrendsResponse>(
        `/api/raid/extract/projects/${projectId}/trends`,
        { days },
      );
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutes
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
