/**
 * Customer Success API Client
 *
 * Provides API functions for the Customer Success Platform.
 */

import { buildApiUrl } from './config';
import { buildOptions, handleResponse } from './http';

// Base paths for Customer Success endpoints
const HEALTH_SCORES_PATH = buildApiUrl('/customer-success/health-scores');
const CTAS_PATH = buildApiUrl('/customer-success/ctas');
const PLAYBOOKS_PATH = buildApiUrl('/customer-success/playbooks');
const SUCCESS_PLANS_PATH = buildApiUrl('/customer-success/success-plans');

// =============================================================================
// TYPES
// =============================================================================

export interface HealthScoreResult {
  id: number;
  clientId: number;
  projectId: number | null;
  overallScore: number;
  category: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
  usageScore: number | null;
  supportScore: number | null;
  engagementScore: number | null;
  sentimentScore: number | null;
  financialScore: number | null;
  churnRisk: number | null;
  expansionPotential: number | null;
  scoreTrend: string | null;
  trendPercentage: number | null;
  lastCalculatedAt: string;
  client?: {
    id: number;
    name: string;
    industry: string | null;
  };
}

export interface HealthScoreListFilters {
  category?: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
  minScore?: number;
  maxScore?: number;
  minChurnRisk?: number;
  sortBy?: 'score' | 'churnRisk' | 'lastCalculated';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface PortfolioHealthSummary {
  totalClients: number;
  healthyCount: number;
  atRiskCount: number;
  criticalCount: number;
  averageScore: number;
  averageChurnRisk: number;
}

export interface HealthScoreHistory {
  date: string;
  score: number;
  category: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
}

export interface CTA {
  id: number;
  clientId: number;
  projectId: number | null;
  ownerId: number | null;
  type: 'RISK' | 'OPPORTUNITY' | 'LIFECYCLE' | 'ACTIVITY' | 'OBJECTIVE';
  status: 'OPEN' | 'IN_PROGRESS' | 'SNOOZED' | 'COMPLETED' | 'CANCELLED';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string | null;
  reason: string | null;
  dueDate: string | null;
  snoozeUntil: string | null;
  completedAt: string | null;
  resolutionNotes: string | null;
  outcome: string | null;
  createdAt: string;
  client?: { id: number; name: string };
  owner?: { id: number; name: string };
  tasks?: CTATask[];
}

export interface CTATask {
  id: number;
  title: string;
  isCompleted: boolean;
  completedAt: string | null;
}

export interface CTAListFilters {
  clientId?: number;
  projectId?: number;
  ownerId?: number;
  type?: CTA['type'];
  status?: CTA['status'];
  priority?: CTA['priority'];
  overdue?: boolean;
  sortBy?: 'dueDate' | 'priority' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface CTASummary {
  total: number;
  open: number;
  inProgress: number;
  completed: number;
  overdue: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

export interface CockpitView {
  overdueCTAs: CTA[];
  todayCTAs: CTA[];
  upcomingCTAs: CTA[];
  summary: CTASummary;
}

export interface CreateCTAInput {
  clientId: number;
  projectId?: number;
  type: CTA['type'];
  priority?: CTA['priority'];
  title: string;
  description?: string;
  reason?: string;
  dueDate?: string;
  playbookId?: number;
}

export interface UpdateCTAInput {
  status?: CTA['status'];
  priority?: CTA['priority'];
  title?: string;
  description?: string;
  reason?: string;
  dueDate?: string | null;
  snoozeUntil?: string | null;
  resolutionNotes?: string;
  outcome?: string;
  ownerId?: number;
  playbookId?: number | null;
}

export interface Playbook {
  id: number;
  name: string;
  description: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  ctaType: CTA['type'] | null;
  category: string | null;
  timesUsed: number;
  createdById: number | null;
  createdAt: string;
  tasks: PlaybookTask[];
}

export interface PlaybookTask {
  id: number;
  title: string;
  description: string | null;
  daysFromStart: number;
  assignToOwner: boolean;
  orderIndex: number;
}

export interface PlaybookListFilters {
  status?: Playbook['status'];
  ctaType?: CTA['type'];
  category?: string;
  search?: string;
  sortBy?: 'name' | 'timesUsed' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface CreatePlaybookInput {
  name: string;
  description?: string;
  ctaType?: CTA['type'];
  category?: string;
  tasks?: Array<{
    title: string;
    description?: string;
    daysFromStart?: number;
    assignToOwner?: boolean;
  }>;
}

export interface SuccessPlan {
  id: number;
  clientId: number;
  projectId: number | null;
  ownerId: number | null;
  name: string;
  description: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
  startDate: string | null;
  targetDate: string | null;
  progressPercent: number;
  customerGoals: unknown[];
  isCustomerVisible: boolean;
  createdAt: string;
  client?: { id: number; name: string };
  owner?: { id: number; name: string };
  objectives?: SuccessObjective[];
}

export interface SuccessObjective {
  id: number;
  title: string;
  description: string | null;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  dueDate: string | null;
  progressPercent: number;
  successCriteria: string | null;
  tasks?: SuccessTask[];
}

export interface SuccessTask {
  id: number;
  title: string;
  description: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  priority: 'P0' | 'P1' | 'P2';
  dueDate: string | null;
  ownerId: number | null;
  owner?: { id: number; name: string };
}

export interface SuccessPlanListFilters {
  clientId?: number;
  projectId?: number;
  ownerId?: number;
  status?: SuccessPlan['status'];
  search?: string;
  sortBy?: 'name' | 'targetDate' | 'createdAt' | 'progressPercent';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// =============================================================================
// HEALTH SCORE API
// =============================================================================

export async function listHealthScores(
  filters?: HealthScoreListFilters,
): Promise<{ data: HealthScoreResult[]; total: number }> {
  const params = new URLSearchParams();
  if (filters?.category) params.set('category', filters.category);
  if (filters?.minScore !== undefined)
    params.set('minScore', String(filters.minScore));
  if (filters?.maxScore !== undefined)
    params.set('maxScore', String(filters.maxScore));
  if (filters?.minChurnRisk !== undefined)
    params.set('minChurnRisk', String(filters.minChurnRisk));
  if (filters?.sortBy) params.set('sortBy', filters.sortBy);
  if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);
  if (filters?.limit !== undefined) params.set('limit', String(filters.limit));
  if (filters?.offset !== undefined)
    params.set('offset', String(filters.offset));

  const query = params.toString();
  const url = `${HEALTH_SCORES_PATH}${query ? `?${query}` : ''}`;
  const res = await fetch(url, buildOptions());
  return handleResponse(res);
}

export async function getPortfolioHealthSummary(): Promise<PortfolioHealthSummary> {
  const url = `${HEALTH_SCORES_PATH}/summary`;
  const res = await fetch(url, buildOptions());
  return handleResponse(res);
}

export async function getClientHealthScore(
  clientId: number,
  projectId?: number,
): Promise<HealthScoreResult> {
  const params = projectId ? `?projectId=${projectId}` : '';
  const url = `${HEALTH_SCORES_PATH}/client/${clientId}${params}`;
  const res = await fetch(url, buildOptions());
  return handleResponse(res);
}

export async function calculateHealthScore(
  clientId: number,
  input: {
    projectId?: number;
    auto?: boolean;
    usageScore?: number;
    supportScore?: number;
    engagementScore?: number;
    sentimentScore?: number;
    financialScore?: number;
  },
): Promise<HealthScoreResult> {
  const url = `${HEALTH_SCORES_PATH}/client/${clientId}/calculate`;
  const res = await fetch(
    url,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
  return handleResponse(res);
}

export async function getHealthScoreHistory(
  clientId: number,
  projectId?: number,
  days?: number,
): Promise<HealthScoreHistory[]> {
  const params = new URLSearchParams();
  if (projectId) params.set('projectId', String(projectId));
  if (days) params.set('days', String(days));
  const query = params.toString();
  const url = `${HEALTH_SCORES_PATH}/client/${clientId}/history${query ? `?${query}` : ''}`;
  const res = await fetch(url, buildOptions());
  return handleResponse(res);
}

// =============================================================================
// CTA API
// =============================================================================

export async function listCTAs(
  filters?: CTAListFilters,
): Promise<{ data: CTA[]; total: number }> {
  const params = new URLSearchParams();
  if (filters?.clientId) params.set('clientId', String(filters.clientId));
  if (filters?.projectId) params.set('projectId', String(filters.projectId));
  if (filters?.ownerId) params.set('ownerId', String(filters.ownerId));
  if (filters?.type) params.set('type', filters.type);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.priority) params.set('priority', filters.priority);
  if (filters?.overdue) params.set('overdue', 'true');
  if (filters?.sortBy) params.set('sortBy', filters.sortBy);
  if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);
  if (filters?.limit !== undefined) params.set('limit', String(filters.limit));
  if (filters?.offset !== undefined)
    params.set('offset', String(filters.offset));

  const query = params.toString();
  const url = `${CTAS_PATH}${query ? `?${query}` : ''}`;
  const res = await fetch(url, buildOptions());
  return handleResponse(res);
}

export async function getCockpit(): Promise<CockpitView> {
  const url = `${CTAS_PATH}/cockpit`;
  const res = await fetch(url, buildOptions());
  return handleResponse(res);
}

export async function getCTASummary(all?: boolean): Promise<CTASummary> {
  const url = `${CTAS_PATH}/summary${all ? '?all=true' : ''}`;
  const res = await fetch(url, buildOptions());
  return handleResponse(res);
}

export async function getCTA(id: number): Promise<CTA> {
  const url = `${CTAS_PATH}/${id}`;
  const res = await fetch(url, buildOptions());
  return handleResponse(res);
}

export async function createCTA(input: CreateCTAInput): Promise<CTA> {
  const url = CTAS_PATH;
  const res = await fetch(
    url,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
  return handleResponse(res);
}

export async function updateCTA(
  id: number,
  input: UpdateCTAInput,
): Promise<CTA> {
  const url = `${CTAS_PATH}/${id}`;
  const res = await fetch(
    url,
    buildOptions({
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  );
  return handleResponse(res);
}

export async function deleteCTA(id: number): Promise<void> {
  const url = `${CTAS_PATH}/${id}`;
  const res = await fetch(url, buildOptions({ method: 'DELETE' }));
  if (!res.ok) {
    throw new Error('Failed to delete CTA');
  }
}

// =============================================================================
// PLAYBOOK API
// =============================================================================

export async function listPlaybooks(
  filters?: PlaybookListFilters,
): Promise<{ data: Playbook[]; total: number }> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.ctaType) params.set('ctaType', filters.ctaType);
  if (filters?.category) params.set('category', filters.category);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.sortBy) params.set('sortBy', filters.sortBy);
  if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);
  if (filters?.limit !== undefined) params.set('limit', String(filters.limit));
  if (filters?.offset !== undefined)
    params.set('offset', String(filters.offset));

  const query = params.toString();
  const url = `${PLAYBOOKS_PATH}${query ? `?${query}` : ''}`;
  const res = await fetch(url, buildOptions());
  return handleResponse(res);
}

export async function getPlaybook(id: number): Promise<Playbook> {
  const url = `${PLAYBOOKS_PATH}/${id}`;
  const res = await fetch(url, buildOptions());
  return handleResponse(res);
}

export async function createPlaybook(
  input: CreatePlaybookInput,
): Promise<Playbook> {
  const url = PLAYBOOKS_PATH;
  const res = await fetch(
    url,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
  return handleResponse(res);
}

export async function seedDefaultPlaybooks(): Promise<void> {
  const url = `${PLAYBOOKS_PATH}/seed`;
  const res = await fetch(url, buildOptions({ method: 'POST' }));
  if (!res.ok) {
    throw new Error('Failed to seed playbooks');
  }
}

export async function getPlaybookCategories(): Promise<string[]> {
  const url = `${PLAYBOOKS_PATH}/categories`;
  const res = await fetch(url, buildOptions());
  return handleResponse(res);
}

export async function getPopularPlaybooks(limit?: number): Promise<
  Array<{
    id: number;
    name: string;
    category: string | null;
    timesUsed: number;
  }>
> {
  const url = `${PLAYBOOKS_PATH}/popular${limit ? `?limit=${limit}` : ''}`;
  const res = await fetch(url, buildOptions());
  return handleResponse(res);
}

// =============================================================================
// SUCCESS PLAN API
// =============================================================================

export async function listSuccessPlans(
  filters?: SuccessPlanListFilters,
): Promise<{ data: SuccessPlan[]; total: number }> {
  const params = new URLSearchParams();
  if (filters?.clientId) params.set('clientId', String(filters.clientId));
  if (filters?.projectId) params.set('projectId', String(filters.projectId));
  if (filters?.ownerId) params.set('ownerId', String(filters.ownerId));
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);
  if (filters?.sortBy) params.set('sortBy', filters.sortBy);
  if (filters?.sortOrder) params.set('sortOrder', filters.sortOrder);
  if (filters?.limit !== undefined) params.set('limit', String(filters.limit));
  if (filters?.offset !== undefined)
    params.set('offset', String(filters.offset));

  const query = params.toString();
  const url = `${SUCCESS_PLANS_PATH}${query ? `?${query}` : ''}`;
  const res = await fetch(url, buildOptions());
  return handleResponse(res);
}

export async function getSuccessPlan(id: number): Promise<SuccessPlan> {
  const url = `${SUCCESS_PLANS_PATH}/${id}`;
  const res = await fetch(url, buildOptions());
  return handleResponse(res);
}

export async function createSuccessPlan(input: {
  clientId: number;
  projectId?: number;
  name: string;
  description?: string;
  startDate?: string;
  targetDate?: string;
  customerGoals?: unknown[];
  isCustomerVisible?: boolean;
}): Promise<SuccessPlan> {
  const url = SUCCESS_PLANS_PATH;
  const res = await fetch(
    url,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
  return handleResponse(res);
}

export async function updateSuccessPlan(
  id: number,
  input: Partial<{
    name: string;
    description: string;
    status: SuccessPlan['status'];
    startDate: string | null;
    targetDate: string | null;
    customerGoals: unknown[];
    isCustomerVisible: boolean;
    ownerId: number;
  }>,
): Promise<SuccessPlan> {
  const url = `${SUCCESS_PLANS_PATH}/${id}`;
  const res = await fetch(
    url,
    buildOptions({
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  );
  return handleResponse(res);
}

export async function deleteSuccessPlan(id: number): Promise<void> {
  const url = `${SUCCESS_PLANS_PATH}/${id}`;
  const res = await fetch(url, buildOptions({ method: 'DELETE' }));
  if (!res.ok) {
    throw new Error('Failed to delete success plan');
  }
}
