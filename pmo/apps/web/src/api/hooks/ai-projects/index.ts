/**
 * AI Projects Module - React Query Hooks
 *
 * Provides hooks for the AI-powered project management features:
 * - Project Assistant (chat interactions)
 * - AI Status Summaries
 * - Health Predictions
 * - Smart Reminders
 * - Auto-Scheduling
 * - Portfolio Dashboard
 * - Document Generation
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { buildApiUrl } from '../../config';
import { buildOptions, ApiError } from '../../http';

// ============================================================================
// Types
// ============================================================================

export interface ProjectContext {
  tenantId: string;
  userId: number;
  projectId?: number;
  projectName?: string;
}

export interface SuggestedAction {
  label: string;
  action: string;
  payload?: Record<string, unknown>;
}

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestedActions?: SuggestedAction[];
  metadata?: Record<string, unknown>;
}

export interface AssistantResponse {
  content: string;
  suggestedActions?: SuggestedAction[];
  expectingInput?: string;
  metadata?: Record<string, unknown>;
}

export interface AIStatusSummary {
  projectId: number;
  projectName: string;
  generatedAt: string;
  healthScore: number;
  healthStatus: 'healthy' | 'at-risk' | 'critical';
  executiveSummary: string;
  highlights: string[];
  concerns: Array<{
    area: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  recommendations: Array<{
    priority: number;
    action: string;
    expectedImpact: string;
  }>;
  metrics: {
    taskCompletion: { completed: number; total: number; percentage: number };
    milestoneProgress: { completed: number; total: number; percentage: number };
    overdueItems: { tasks: number; milestones: number };
    velocity: { current: number; trend: string };
  };
}

export interface HealthPrediction {
  projectId: number;
  predictedHealthScore: number;
  confidenceLevel: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: Array<{
    name: string;
    impact: number;
    direction: 'positive' | 'negative';
    description: string;
  }>;
  recommendations: string[];
  predictedAt: string;
}

export interface SmartReminder {
  id: number;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  triggerTime: string;
  context: Record<string, unknown>;
  dismissed: boolean;
  actionTaken: boolean;
}

export interface ScheduleResult {
  projectId: number;
  scheduledTasks: Array<{
    taskId: number;
    taskTitle: string;
    scheduledStart: string;
    scheduledEnd: string;
    assigneeId?: number;
    dependencies: number[];
    isCriticalPath: boolean;
  }>;
  criticalPath: number[];
  totalDuration: number;
  conflicts: Array<{
    taskId: number;
    reason: string;
    suggestion: string;
  }>;
}

export interface PortfolioSummary {
  totalProjects: number;
  averageHealth: number;
  projectsByStatus: Record<string, number>;
  projectsByHealth: { healthy: number; atRisk: number; critical: number };
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  upcomingMilestones: number;
  topRisks: Array<{
    projectId: number;
    projectName: string;
    risk: string;
    severity: string;
  }>;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  type: string;
  description: string;
}

export interface GeneratedDocument {
  id: number;
  title: string;
  type: string;
  content: string;
  format: string;
  generatedAt: string;
}

// ============================================================================
// Query Keys
// ============================================================================

export const aiProjectsKeys = {
  all: ['ai-projects'] as const,
  status: (projectId: number) =>
    [...aiProjectsKeys.all, 'status', projectId] as const,
  healthPrediction: (projectId: number) =>
    [...aiProjectsKeys.all, 'health-prediction', projectId] as const,
  reminders: (projectId?: number) =>
    [...aiProjectsKeys.all, 'reminders', projectId] as const,
  schedule: (projectId: number) =>
    [...aiProjectsKeys.all, 'schedule', projectId] as const,
  portfolio: () => [...aiProjectsKeys.all, 'portfolio'] as const,
  portfolioProjects: () => [...aiProjectsKeys.portfolio(), 'projects'] as const,
  documents: (projectId: number) =>
    [...aiProjectsKeys.all, 'documents', projectId] as const,
  templates: () => [...aiProjectsKeys.all, 'templates'] as const,
};

// ============================================================================
// API Functions
// ============================================================================

async function sendAssistantMessage(
  projectId: number | undefined,
  message: string,
): Promise<AssistantResponse> {
  const res = await fetch(
    buildApiUrl('/ai-projects/assistant/message'),
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ projectId, message }),
    }),
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(
      data.message || data.error || 'Failed to send message',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  const json = await res.json();
  return json.data || json;
}

async function fetchAIStatus(projectId: number): Promise<AIStatusSummary> {
  const res = await fetch(
    buildApiUrl(`/ai-projects/status/${projectId}`),
    buildOptions(),
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(
      data.message || data.error || 'Failed to fetch AI status',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  const json = await res.json();
  return json.data || json;
}

async function generateQuickStatus(
  projectId: number,
): Promise<{ status: string; metrics: Record<string, unknown> }> {
  const res = await fetch(
    buildApiUrl(`/ai-projects/status/${projectId}/quick`),
    buildOptions(),
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(
      data.message || data.error || 'Failed to generate quick status',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  return res.json();
}

async function fetchHealthPrediction(
  projectId: number,
): Promise<HealthPrediction> {
  const res = await fetch(
    buildApiUrl(`/ai-projects/health/${projectId}/predict`),
    buildOptions(),
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(
      data.message || data.error || 'Failed to fetch health prediction',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  const json = await res.json();
  return json.data || json;
}

async function fetchSmartReminders(
  projectId?: number,
): Promise<SmartReminder[]> {
  const url = projectId
    ? `/ai-projects/reminders?projectId=${projectId}`
    : '/ai-projects/reminders';
  const res = await fetch(buildApiUrl(url), buildOptions());
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(
      data.message || data.error || 'Failed to fetch reminders',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.reminders || [];
}

async function dismissReminder(reminderId: number): Promise<void> {
  const res = await fetch(
    buildApiUrl(`/ai-projects/reminders/${reminderId}/dismiss`),
    buildOptions({ method: 'POST' }),
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(
      data.message || data.error || 'Failed to dismiss reminder',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
}

async function generateSchedule(projectId: number): Promise<ScheduleResult> {
  const res = await fetch(
    buildApiUrl(`/ai-projects/schedule/${projectId}/generate`),
    buildOptions({ method: 'POST' }),
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(
      data.message || data.error || 'Failed to generate schedule',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  return res.json();
}

async function applySchedule(
  projectId: number,
  schedule: ScheduleResult,
): Promise<void> {
  const res = await fetch(
    buildApiUrl(`/ai-projects/schedule/${projectId}/apply`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ schedule }),
    }),
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(
      data.message || data.error || 'Failed to apply schedule',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
}

async function fetchPortfolioSummary(): Promise<PortfolioSummary> {
  const res = await fetch(
    buildApiUrl('/ai-projects/portfolio/summary'),
    buildOptions(),
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(
      data.message || data.error || 'Failed to fetch portfolio summary',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  return res.json();
}

async function fetchDocumentTemplates(): Promise<DocumentTemplate[]> {
  const res = await fetch(
    buildApiUrl('/ai-projects/documents/templates'),
    buildOptions(),
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(
      data.message || data.error || 'Failed to fetch templates',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.templates || [];
}

async function generateDocument(
  projectId: number,
  templateId: string,
  options?: Record<string, unknown>,
): Promise<GeneratedDocument> {
  const res = await fetch(
    buildApiUrl(`/ai-projects/documents/${projectId}/generate`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ templateId, options }),
    }),
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(
      data.message || data.error || 'Failed to generate document',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  return res.json();
}

async function fetchProjectDocuments(
  projectId: number,
): Promise<GeneratedDocument[]> {
  const res = await fetch(
    buildApiUrl(`/ai-projects/documents/${projectId}`),
    buildOptions(),
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(
      data.message || data.error || 'Failed to fetch documents',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.documents || [];
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Send a message to the Project Assistant
 */
export function useSendAssistantMessage(): UseMutationResult<
  AssistantResponse,
  Error,
  { projectId?: number; message: string }
> {
  return useMutation({
    mutationFn: ({ projectId, message }) =>
      sendAssistantMessage(projectId, message),
  });
}

/**
 * Fetch AI-generated status summary for a project
 */
export function useAIStatus(
  projectId?: number,
): UseQueryResult<AIStatusSummary, Error> {
  return useQuery({
    queryKey: projectId ? aiProjectsKeys.status(projectId) : aiProjectsKeys.all,
    queryFn: () => fetchAIStatus(projectId!),
    enabled: Boolean(projectId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Generate quick status for a project
 */
export function useGenerateQuickStatus(): UseMutationResult<
  { status: string; metrics: Record<string, unknown> },
  Error,
  number
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId: number) => generateQuickStatus(projectId),
    onSuccess: (_, projectId) => {
      queryClient.invalidateQueries({
        queryKey: aiProjectsKeys.status(projectId),
      });
    },
  });
}

/**
 * Fetch health prediction for a project
 */
export function useHealthPrediction(
  projectId?: number,
): UseQueryResult<HealthPrediction, Error> {
  return useQuery({
    queryKey: projectId
      ? aiProjectsKeys.healthPrediction(projectId)
      : aiProjectsKeys.all,
    queryFn: () => fetchHealthPrediction(projectId!),
    enabled: Boolean(projectId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch smart reminders
 */
export function useSmartReminders(
  projectId?: number,
): UseQueryResult<SmartReminder[], Error> {
  return useQuery({
    queryKey: aiProjectsKeys.reminders(projectId),
    queryFn: () => fetchSmartReminders(projectId),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Dismiss a reminder
 */
export function useDismissReminder(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reminderId: number) => dismissReminder(reminderId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aiProjectsKeys.reminders(),
      });
    },
  });
}

/**
 * Generate auto-schedule for a project
 */
export function useGenerateSchedule(): UseMutationResult<
  ScheduleResult,
  Error,
  number
> {
  return useMutation({
    mutationFn: (projectId: number) => generateSchedule(projectId),
  });
}

/**
 * Apply generated schedule to project tasks
 */
export function useApplySchedule(): UseMutationResult<
  void,
  Error,
  { projectId: number; schedule: ScheduleResult }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, schedule }) => applySchedule(projectId, schedule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

/**
 * Fetch portfolio summary
 */
export function usePortfolioSummary(): UseQueryResult<PortfolioSummary, Error> {
  return useQuery({
    queryKey: aiProjectsKeys.portfolio(),
    queryFn: fetchPortfolioSummary,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch document templates
 */
export function useAIDocumentTemplates(): UseQueryResult<
  DocumentTemplate[],
  Error
> {
  return useQuery({
    queryKey: aiProjectsKeys.templates(),
    queryFn: fetchDocumentTemplates,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Generate a document from template
 */
export function useGenerateAIDocument(): UseMutationResult<
  GeneratedDocument,
  Error,
  { projectId: number; templateId: string; options?: Record<string, unknown> }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, templateId, options }) =>
      generateDocument(projectId, templateId, options),
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({
        queryKey: aiProjectsKeys.documents(projectId),
      });
    },
  });
}

/**
 * Fetch generated documents for a project
 */
export function useAIGeneratedDocuments(
  projectId?: number,
): UseQueryResult<GeneratedDocument[], Error> {
  return useQuery({
    queryKey: projectId
      ? aiProjectsKeys.documents(projectId)
      : aiProjectsKeys.all,
    queryFn: () => fetchProjectDocuments(projectId!),
    enabled: Boolean(projectId),
  });
}
