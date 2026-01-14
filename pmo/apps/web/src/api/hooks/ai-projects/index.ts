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
  const apiData = json.data || json;

  // Normalize API response to match expected interface
  return {
    projectId,
    projectName: apiData.projectName || '',
    generatedAt: apiData.generatedAt,
    healthScore: apiData.healthAnalysis?.healthScore ?? 0,
    healthStatus: mapHealthStatus(apiData.healthAnalysis?.overallHealth),
    executiveSummary: apiData.executiveSummary,
    highlights: apiData.keyHighlights || [],
    // Map concerns: title → area, normalize severity
    concerns: Array.isArray(apiData.concerns)
      ? apiData.concerns.map(
          (concern: {
            title?: string;
            description?: string;
            severity?: string;
          }) => ({
            area: concern.title || '',
            description: concern.description || '',
            severity: normalizeSeverity(concern.severity),
          }),
        )
      : [],
    // Map recommendations: title → action, priority string → number
    recommendations: Array.isArray(apiData.recommendations)
      ? apiData.recommendations.map(
          (rec: {
            priority?: string;
            title?: string;
            description?: string;
            expectedImpact?: string;
          }) => ({
            priority: mapPriorityToNumber(rec.priority),
            action: rec.title || rec.description || '',
            expectedImpact: rec.expectedImpact || '',
          }),
        )
      : [],
    metrics: apiData.metrics
      ? {
          taskCompletion: apiData.metrics.taskCompletion || {
            completed: 0,
            total: 0,
            percentage: 0,
          },
          milestoneProgress: apiData.metrics.milestoneProgress || {
            completed: 0,
            total: 0,
            percentage: 0,
          },
          overdueItems: apiData.metrics.overdueItems || {
            tasks: 0,
            milestones: 0,
          },
          velocity: {
            current: apiData.metrics.velocity?.tasksCompletedThisWeek ?? 0,
            trend: apiData.metrics.velocity?.trend || 'stable',
          },
        }
      : {
          taskCompletion: { completed: 0, total: 0, percentage: 0 },
          milestoneProgress: { completed: 0, total: 0, percentage: 0 },
          overdueItems: { tasks: 0, milestones: 0 },
          velocity: { current: 0, trend: 'stable' },
        },
  };
}

function mapHealthStatus(status?: string): 'healthy' | 'at-risk' | 'critical' {
  switch (status) {
    case 'ON_TRACK':
      return 'healthy';
    case 'AT_RISK':
      return 'at-risk';
    case 'OFF_TRACK':
      return 'critical';
    default:
      return 'at-risk';
  }
}

function normalizeSeverity(severity?: string): 'high' | 'medium' | 'low' {
  if (severity === 'critical' || severity === 'high') return 'high';
  if (severity === 'medium') return 'medium';
  return 'low';
}

function mapPriorityToNumber(priority?: string): number {
  switch (priority) {
    case 'urgent':
      return 1;
    case 'high':
      return 2;
    case 'medium':
      return 3;
    case 'low':
      return 4;
    default:
      return 3;
  }
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
  const apiData = json.data || json;

  // Normalize API response to match expected interface
  return {
    projectId,
    predictedHealthScore: mapHealthToScore(apiData.predictedHealth),
    confidenceLevel: Math.round((apiData.confidence ?? 0) * 100),
    riskLevel: mapHealthToRiskLevel(apiData.predictedHealth),
    factors: Array.isArray(apiData.riskFactors)
      ? apiData.riskFactors.map(
          (rf: {
            factor?: string;
            weight?: number;
            currentValue?: number;
            threshold?: number;
            description?: string;
          }) => ({
            name: rf.factor || '',
            impact: Math.round((rf.weight ?? 0) * 100),
            direction:
              (rf.currentValue ?? 0) >= (rf.threshold ?? 0)
                ? ('positive' as const)
                : ('negative' as const),
            description: rf.description || '',
          }),
        )
      : [],
    recommendations: Array.isArray(apiData.recommendations)
      ? apiData.recommendations.map(
          (rec: { action?: string }) => rec.action || '',
        )
      : [],
    predictedAt: apiData.predictedAt || new Date().toISOString(),
  };
}

function mapHealthToScore(health?: string): number {
  switch (health) {
    case 'ON_TRACK':
      return 85;
    case 'AT_RISK':
      return 50;
    case 'OFF_TRACK':
      return 25;
    default:
      return 50;
  }
}

function mapHealthToRiskLevel(
  health?: string,
): 'low' | 'medium' | 'high' | 'critical' {
  switch (health) {
    case 'ON_TRACK':
      return 'low';
    case 'AT_RISK':
      return 'medium';
    case 'OFF_TRACK':
      return 'high';
    default:
      return 'medium';
  }
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
    buildApiUrl(`/ai-projects/scheduling/${projectId}/generate`),
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
  const json = await res.json();
  const apiData = json.data || json;

  // Calculate total duration in days from scheduled tasks
  const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

  // Derive start date from earliest scheduledStart among tasks
  let startDate: Date | undefined;
  if (
    Array.isArray(apiData.scheduledTasks) &&
    apiData.scheduledTasks.length > 0
  ) {
    const startDates = apiData.scheduledTasks
      .map((task: { scheduledStart?: string }) =>
        task?.scheduledStart ? new Date(task.scheduledStart) : null,
      )
      .filter((d: Date | null): d is Date => d !== null)
      .sort((a: Date, b: Date) => a.getTime() - b.getTime());

    if (startDates.length > 0) {
      startDate = startDates[0];
    }
  }

  const endDate = apiData.estimatedEndDate
    ? new Date(apiData.estimatedEndDate)
    : (startDate ?? new Date());
  startDate = startDate ?? endDate;

  const totalDuration = Math.max(
    0,
    Math.ceil((endDate.getTime() - startDate.getTime()) / MILLISECONDS_PER_DAY),
  );

  // Normalize API response to match expected interface
  return {
    projectId,
    scheduledTasks: Array.isArray(apiData.scheduledTasks)
      ? apiData.scheduledTasks.map(
          (task: {
            taskId?: number;
            title?: string;
            scheduledStart?: string;
            scheduledEnd?: string;
            assigneeId?: number;
            dependsOn?: number[];
          }) => ({
            taskId: task.taskId ?? 0,
            taskTitle: task.title || '',
            scheduledStart: task.scheduledStart || '',
            scheduledEnd: task.scheduledEnd || '',
            assigneeId: task.assigneeId,
            dependencies: task.dependsOn || [],
            isCriticalPath:
              apiData.criticalPath?.includes(task.taskId) ?? false,
          }),
        )
      : [],
    criticalPath: apiData.criticalPath || [],
    totalDuration,
    conflicts: apiData.warnings
      ? apiData.warnings.map((w: string) => ({
          taskId: -1, // Warnings are not associated with specific tasks
          reason: w,
          suggestion: '',
        }))
      : [],
  };
}

async function applySchedule(
  projectId: number,
  schedule: ScheduleResult,
): Promise<void> {
  const res = await fetch(
    buildApiUrl(`/ai-projects/scheduling/${projectId}/apply`),
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
  const json = await res.json();
  const apiData = json.data || json;
  const templates = apiData.templates || [];

  // Normalize API response: map 'type' to 'id' since API returns type as identifier
  return templates.map(
    (t: { type?: string; name?: string; description?: string }) => ({
      id: t.type || '',
      type: t.type || '',
      name: t.name || '',
      description: t.description || '',
    }),
  );
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
      body: JSON.stringify({ type: templateId, input: options }),
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
  const json = await res.json();
  return json.data || json;
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
  const json = await res.json();
  const apiData = json.data || json;
  return apiData.documents || [];
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
