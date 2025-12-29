/**
 * Bug Tracking API Client
 *
 * Provides functions for interacting with the bug tracking API endpoints.
 */

import { http } from './http';

// ============================================================================
// TYPES
// ============================================================================

export type IssueType =
  | 'BUG'
  | 'ISSUE'
  | 'FEATURE_REQUEST'
  | 'IMPROVEMENT'
  | 'TASK';
export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IssueStatus =
  | 'OPEN'
  | 'TRIAGING'
  | 'IN_PROGRESS'
  | 'IN_REVIEW'
  | 'RESOLVED'
  | 'CLOSED'
  | 'WONT_FIX';
export type IssueSource =
  | 'MANUAL'
  | 'AI_ASSISTANT'
  | 'BROWSER_ERROR'
  | 'API_ERROR'
  | 'VERCEL_LOG'
  | 'RENDER_LOG'
  | 'ANOMALY';

export interface Issue {
  id: number;
  tenantId: string | null;
  title: string;
  description: string | null;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  source: IssueSource;
  reportedById: number | null;
  assignedToId: number | null;
  projectId: number | null;
  accountId: number | null;
  errorHash: string | null;
  errorCount: number;
  stackTrace: string | null;
  browserInfo: Record<string, unknown> | null;
  requestInfo: Record<string, unknown> | null;
  environment: string | null;
  appVersion: string | null;
  url: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  reportedBy: { id: number; name: string; email: string } | null;
  assignedTo: { id: number; name: string; email: string } | null;
  labels: IssueLabel[];
  project: { id: number; name: string } | null;
  account: { id: number; name: string } | null;
  _count: {
    comments: number;
    attachments: number;
    errorLogs: number;
  };
}

export interface IssueLabel {
  id: number;
  name: string;
  color: string;
  description: string | null;
  _count?: { issues: number };
}

export interface IssueComment {
  id: number;
  issueId: number;
  userId: number | null;
  content: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  user: { id: number; name: string; email: string } | null;
}

export interface ErrorLog {
  id: number;
  issueId: number | null;
  tenantId: string | null;
  message: string;
  stackTrace: string | null;
  source: IssueSource;
  level: string;
  userId: number | null;
  sessionId: string | null;
  requestId: string | null;
  url: string | null;
  method: string | null;
  statusCode: number | null;
  environment: string | null;
  appVersion: string | null;
  browserInfo: Record<string, unknown> | null;
  serverInfo: Record<string, unknown> | null;
  createdAt: string;
  issue?: { id: number; title: string; status: IssueStatus } | null;
}

export interface IssueStats {
  total: number;
  byStatus: Record<IssueStatus, number>;
  byPriority: Record<IssuePriority, number>;
  byType: Record<IssueType, number>;
  bySource: Record<IssueSource, number>;
  openCount: number;
  resolvedToday: number;
  createdToday: number;
  avgResolutionTimeHours: number | null;
}

export interface ErrorStats {
  total: number;
  bySource: Record<string, number>;
  byLevel: Record<string, number>;
  hourlyTrend: Array<{ hour: string; count: number }>;
}

export interface ApiKey {
  id: number;
  name: string;
  keyPrefix: string;
  permissions: string[];
  lastUsedAt: string | null;
  usageCount: number;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyResult extends ApiKey {
  key: string; // Only returned on creation
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// ISSUE API
// ============================================================================

export interface ListIssuesParams {
  page?: number;
  limit?: number;
  status?: IssueStatus | IssueStatus[];
  priority?: IssuePriority | IssuePriority[];
  type?: IssueType | IssueType[];
  source?: IssueSource | IssueSource[];
  assignedToId?: number | 'null';
  reportedById?: number;
  projectId?: number;
  accountId?: number;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export async function listIssues(
  params: ListIssuesParams = {},
): Promise<PaginatedResponse<Issue>> {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach((v) => searchParams.append(key, String(v)));
      } else {
        searchParams.set(key, String(value));
      }
    }
  });

  return http.get(`/bug-tracking/issues?${searchParams.toString()}`);
}

export interface CreateIssueInput {
  title: string;
  description?: string;
  type?: IssueType;
  priority?: IssuePriority;
  assignedToId?: number;
  projectId?: number;
  accountId?: number;
  labelIds?: number[];
}

export async function createIssue(input: CreateIssueInput): Promise<Issue> {
  return http.post('/bug-tracking/issues', input);
}

export async function getIssue(id: number): Promise<Issue> {
  return http.get(`/bug-tracking/issues/${id}`);
}

export interface UpdateIssueInput {
  title?: string;
  description?: string;
  type?: IssueType;
  priority?: IssuePriority;
  status?: IssueStatus;
  assignedToId?: number | null;
  projectId?: number | null;
  accountId?: number | null;
  labelIds?: number[];
}

export async function updateIssue(
  id: number,
  input: UpdateIssueInput,
): Promise<Issue> {
  return http.put(`/bug-tracking/issues/${id}`, input);
}

export async function deleteIssue(id: number): Promise<void> {
  return http.delete(`/bug-tracking/issues/${id}`);
}

export async function assignIssue(
  id: number,
  assignedToId: number | null,
): Promise<Issue> {
  return http.post(`/bug-tracking/issues/${id}/assign`, { assignedToId });
}

export async function changeIssueStatus(
  id: number,
  status: IssueStatus,
): Promise<Issue> {
  return http.post(`/bug-tracking/issues/${id}/status`, { status });
}

export async function getIssueStats(): Promise<IssueStats> {
  return http.get('/bug-tracking/issues/stats');
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export async function bulkUpdateStatus(
  issueIds: number[],
  status: IssueStatus,
): Promise<{ updated: number }> {
  return http.post('/bug-tracking/issues/bulk/status', { issueIds, status });
}

export async function bulkAssign(
  issueIds: number[],
  assignedToId: number | null,
): Promise<{ updated: number }> {
  return http.post('/bug-tracking/issues/bulk/assign', { issueIds, assignedToId });
}

export async function bulkAddLabels(
  issueIds: number[],
  labelIds: number[],
): Promise<{ updated: number }> {
  return http.post('/bug-tracking/issues/bulk/labels', { issueIds, labelIds });
}

// ============================================================================
// LABEL API
// ============================================================================

export async function listLabels(): Promise<IssueLabel[]> {
  return http.get('/bug-tracking/labels');
}

export interface CreateLabelInput {
  name: string;
  color: string;
  description?: string;
}

export async function createLabel(
  input: CreateLabelInput,
): Promise<IssueLabel> {
  return http.post('/bug-tracking/labels', input);
}

export async function updateLabel(
  id: number,
  input: Partial<CreateLabelInput>,
): Promise<IssueLabel> {
  return http.put(`/bug-tracking/labels/${id}`, input);
}

export async function deleteLabel(id: number): Promise<void> {
  return http.delete(`/bug-tracking/labels/${id}`);
}

// ============================================================================
// COMMENT API
// ============================================================================

export async function listComments(issueId: number): Promise<IssueComment[]> {
  return http.get(`/bug-tracking/issues/${issueId}/comments`);
}

export async function addComment(
  issueId: number,
  content: string,
): Promise<IssueComment> {
  return http.post(`/bug-tracking/issues/${issueId}/comments`, { content });
}

export async function deleteComment(commentId: number): Promise<void> {
  return http.delete(`/bug-tracking/comments/${commentId}`);
}

// ============================================================================
// ERROR LOG API
// ============================================================================

export interface ListErrorsParams {
  source?: IssueSource;
  level?: string;
  limit?: number;
  since?: string;
}

export async function listErrors(
  params: ListErrorsParams = {},
): Promise<ErrorLog[]> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  });
  return http.get(`/bug-tracking/errors?${searchParams.toString()}`);
}

export async function getErrorStats(since?: string): Promise<ErrorStats> {
  const params = since ? `?since=${since}` : '';
  return http.get(`/bug-tracking/errors/stats${params}`);
}

export async function getIssueErrors(
  issueId: number,
  limit?: number,
): Promise<ErrorLog[]> {
  const params = limit ? `?limit=${limit}` : '';
  return http.get(`/bug-tracking/issues/${issueId}/errors${params}`);
}

// ============================================================================
// API KEY API
// ============================================================================

export async function listApiKeys(): Promise<ApiKey[]> {
  return http.get('/bug-tracking/api-keys');
}

export interface CreateApiKeyInput {
  name: string;
  permissions: string[];
  expiresAt?: string;
}

export async function createApiKey(
  input: CreateApiKeyInput,
): Promise<CreateApiKeyResult> {
  return http.post('/bug-tracking/api-keys', input);
}

export async function revokeApiKey(id: number): Promise<ApiKey> {
  return http.post(`/bug-tracking/api-keys/${id}/revoke`, {});
}

export async function deleteApiKey(id: number): Promise<void> {
  return http.delete(`/bug-tracking/api-keys/${id}`);
}

// ============================================================================
// AI PROMPT API
// ============================================================================

export interface AIPromptOptions {
  format?: 'markdown' | 'plain' | 'json';
  includeComments?: boolean;
  includeErrorLogs?: boolean;
  includeRelatedIssues?: boolean;
  maxErrorLogs?: number;
  customInstructions?: string;
}

export interface AIPromptResponse {
  prompt: string;
  issue: {
    id: number;
    title: string;
    type: IssueType;
    priority: IssuePriority;
    status: IssueStatus;
  };
  context: {
    suggestedFiles?: string[];
    stackTrace?: string;
    environment?: string;
    errorCount?: number;
    relatedIssues?: Array<{ id: number; title: string; status: IssueStatus }>;
  };
  metadata: {
    generatedAt: string;
    format: string;
    includesComments: boolean;
    includesErrorLogs: boolean;
  };
}

export async function getIssueAIPrompt(
  issueId: number,
  options: AIPromptOptions = {},
): Promise<AIPromptResponse> {
  const params = new URLSearchParams();
  if (options.format) params.set('format', options.format);
  if (options.includeComments !== undefined)
    params.set('includeComments', String(options.includeComments));
  if (options.includeErrorLogs !== undefined)
    params.set('includeErrorLogs', String(options.includeErrorLogs));
  if (options.includeRelatedIssues !== undefined)
    params.set('includeRelatedIssues', String(options.includeRelatedIssues));
  if (options.maxErrorLogs !== undefined)
    params.set('maxErrorLogs', String(options.maxErrorLogs));
  if (options.customInstructions)
    params.set('customInstructions', options.customInstructions);

  const queryString = params.toString();
  return http.get(
    `/bug-tracking/issues/${issueId}/ai-prompt${queryString ? `?${queryString}` : ''}`,
  );
}

export interface BatchPromptOptions {
  issueIds: number[];
  format?: 'markdown' | 'plain' | 'json';
  includeComments?: boolean;
  includeErrorLogs?: boolean;
  combined?: boolean;
}

export async function getBatchAIPrompts(
  options: BatchPromptOptions,
): Promise<{ prompts: AIPromptResponse[] } | AIPromptResponse> {
  return http.post('/bug-tracking/ai-prompts/batch', options);
}

export interface AIPromptFormats {
  formats: string[];
  options: Record<
    string,
    { description: string; default?: unknown; max?: number; maxLength?: number }
  >;
  slashCommand: { command: string; description: string; usage: string };
}

export async function getAIPromptFormats(): Promise<AIPromptFormats> {
  return http.get('/bug-tracking/ai-prompt/formats');
}
