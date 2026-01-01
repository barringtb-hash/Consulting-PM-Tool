/**
 * CRM Accounts API Client
 *
 * CRUD operations for CRM Account entities.
 * Accounts represent companies/organizations in the sales pipeline.
 */

import { buildApiUrl } from './config';
import { buildOptions, handleResponse } from './http';

// ============================================================================
// Types
// ============================================================================

export type AccountType =
  | 'PROSPECT'
  | 'CUSTOMER'
  | 'PARTNER'
  | 'COMPETITOR'
  | 'CHURNED'
  | 'OTHER';

export type EmployeeCount =
  | 'SOLO'
  | 'MICRO'
  | 'SMALL'
  | 'MEDIUM'
  | 'LARGE'
  | 'ENTERPRISE';

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface Account {
  id: number;
  tenantId: string;
  name: string;
  website?: string | null;
  phone?: string | null;
  type: AccountType;
  industry?: string | null;
  employeeCount?: EmployeeCount | null;
  annualRevenue?: number | null;
  billingAddress?: Address | null;
  shippingAddress?: Address | null;
  tags: string[];
  customFields?: Record<string, unknown> | null;
  healthScore: number;
  engagementScore: number;
  churnRisk: number;
  lastActivityAt?: string | null;
  archived: boolean;
  ownerId?: number | null;
  parentAccountId?: number | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    contacts: number;
    opportunities: number;
    activities: number;
    childAccounts: number;
  };
}

export interface AccountFilters {
  type?: AccountType;
  industry?: string;
  ownerId?: number;
  archived?: boolean;
  healthScoreMin?: number;
  healthScoreMax?: number;
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AccountPayload {
  name: string;
  website?: string;
  phone?: string;
  parentAccountId?: number;
  type?: AccountType;
  industry?: string;
  employeeCount?: EmployeeCount;
  annualRevenue?: number;
  billingAddress?: Address;
  shippingAddress?: Address;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export interface AccountUpdatePayload extends Partial<AccountPayload> {
  healthScore?: number;
  engagementScore?: number;
  churnRisk?: number;
  archived?: boolean;
}

export interface PaginatedAccounts {
  data: Account[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AccountStats {
  total: number;
  byType: Record<AccountType, number>;
  healthDistribution: {
    healthy: number;
    atRisk: number;
    critical: number;
  };
  recentlyActive: number;
}

// ============================================================================
// API Functions
// ============================================================================

const ACCOUNTS_BASE_PATH = buildApiUrl('/crm/accounts');

/**
 * Fetch accounts with optional filtering and pagination
 */
export async function fetchAccounts(
  filters?: AccountFilters,
): Promise<PaginatedAccounts> {
  const params = new URLSearchParams();

  if (filters?.type) params.append('type', filters.type);
  if (filters?.industry) params.append('industry', filters.industry);
  if (filters?.ownerId) params.append('ownerId', String(filters.ownerId));
  if (filters?.archived !== undefined)
    params.append('archived', String(filters.archived));
  if (filters?.healthScoreMin !== undefined)
    params.append('healthScoreMin', String(filters.healthScoreMin));
  if (filters?.healthScoreMax !== undefined)
    params.append('healthScoreMax', String(filters.healthScoreMax));
  if (filters?.search) params.append('search', filters.search);
  if (filters?.tags?.length) params.append('tags', filters.tags.join(','));
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));
  if (filters?.sortBy) params.append('sortBy', filters.sortBy);
  if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

  const query = params.toString();
  const url = query ? `${ACCOUNTS_BASE_PATH}?${query}` : ACCOUNTS_BASE_PATH;
  const response = await fetch(url, buildOptions({ method: 'GET' }));
  return handleResponse<PaginatedAccounts>(response);
}

/**
 * Fetch a single account by ID
 */
export async function fetchAccountById(id: number): Promise<Account> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/${id}`,
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ data: Account }>(response);
  return data.data;
}

/**
 * Fetch account statistics
 */
export async function fetchAccountStats(): Promise<AccountStats> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/stats`,
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ data: AccountStats }>(response);
  return data.data;
}

/**
 * Create a new account
 */
export async function createAccount(payload: AccountPayload): Promise<Account> {
  const response = await fetch(
    ACCOUNTS_BASE_PATH,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );
  const data = await handleResponse<{ data: Account }>(response);
  return data.data;
}

/**
 * Update an existing account
 */
export async function updateAccount(
  id: number,
  payload: AccountUpdatePayload,
): Promise<Account> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/${id}`,
    buildOptions({
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  );
  const data = await handleResponse<{ data: Account }>(response);
  return data.data;
}

/**
 * Archive an account (soft delete)
 */
export async function archiveAccount(id: number): Promise<Account> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/${id}/archive`,
    buildOptions({ method: 'POST' }),
  );
  const data = await handleResponse<{ data: Account }>(response);
  return data.data;
}

/**
 * Restore an archived account
 */
export async function restoreAccount(id: number): Promise<Account> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/${id}/restore`,
    buildOptions({ method: 'POST' }),
  );
  const data = await handleResponse<{ data: Account }>(response);
  return data.data;
}

/**
 * Delete an account permanently
 */
export async function deleteAccount(id: number): Promise<void> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/${id}`,
    buildOptions({ method: 'DELETE' }),
  );
  await handleResponse(response);
}

// ============================================================================
// Account Health Score Types & Functions
// ============================================================================

export type HealthCategory = 'HEALTHY' | 'AT_RISK' | 'CRITICAL';

export interface AccountHealthScore {
  id: number;
  accountId: number;
  overallScore: number;
  category: HealthCategory;
  usageScore?: number | null;
  supportScore?: number | null;
  engagementScore?: number | null;
  sentimentScore?: number | null;
  financialScore?: number | null;
  churnRisk: number;
  calculatedAt: string;
  calculationNotes?: string | null;
}

export interface HealthScoreHistory {
  date: string;
  score: number;
  category: HealthCategory;
}

export interface PortfolioHealthSummary {
  totalAccounts: number;
  healthyCount: number;
  atRiskCount: number;
  criticalCount: number;
  averageScore: number;
  averageChurnRisk: number;
  byType: Record<AccountType, { count: number; avgScore: number }>;
}

export interface CalculateHealthScorePayload {
  usageScore?: number;
  supportScore?: number;
  engagementScore?: number;
  sentimentScore?: number;
  financialScore?: number;
  usageWeight?: number;
  supportWeight?: number;
  engagementWeight?: number;
  sentimentWeight?: number;
  financialWeight?: number;
  calculationNotes?: string;
}

export interface ListAccountsByHealthParams {
  category?: HealthCategory;
  minScore?: number;
  maxScore?: number;
  minChurnRisk?: number;
  sortBy?: 'healthScore' | 'churnRisk' | 'name';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Get account health score
 */
export async function fetchAccountHealthScore(
  accountId: number,
): Promise<AccountHealthScore | null> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/${accountId}/health`,
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ data: AccountHealthScore | null }>(
    response,
  );
  return data.data;
}

/**
 * Calculate account health score
 */
export async function calculateAccountHealthScore(
  accountId: number,
  payload?: CalculateHealthScorePayload,
): Promise<AccountHealthScore> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/${accountId}/health/calculate`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
  );
  const data = await handleResponse<{ data: AccountHealthScore }>(response);
  return data.data;
}

/**
 * Get account health score history
 */
export async function fetchAccountHealthHistory(
  accountId: number,
  days?: number,
): Promise<HealthScoreHistory[]> {
  const params = new URLSearchParams();
  if (days) params.append('days', String(days));
  const query = params.toString();
  const url = query
    ? `${ACCOUNTS_BASE_PATH}/${accountId}/health/history?${query}`
    : `${ACCOUNTS_BASE_PATH}/${accountId}/health/history`;
  const response = await fetch(url, buildOptions({ method: 'GET' }));
  const data = await handleResponse<{ data: HealthScoreHistory[] }>(response);
  return data.data;
}

/**
 * Get portfolio health summary
 */
export async function fetchPortfolioHealthSummary(): Promise<PortfolioHealthSummary> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/portfolio/health`,
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ data: PortfolioHealthSummary }>(response);
  return data.data;
}

/**
 * List accounts by health
 */
export async function fetchAccountsByHealth(
  params?: ListAccountsByHealthParams,
): Promise<Account[]> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.append('category', params.category);
  if (params?.minScore !== undefined)
    searchParams.append('minScore', String(params.minScore));
  if (params?.maxScore !== undefined)
    searchParams.append('maxScore', String(params.maxScore));
  if (params?.minChurnRisk !== undefined)
    searchParams.append('minChurnRisk', String(params.minChurnRisk));
  if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);
  if (params?.limit) searchParams.append('limit', String(params.limit));
  if (params?.offset) searchParams.append('offset', String(params.offset));
  const query = searchParams.toString();
  const url = query
    ? `${ACCOUNTS_BASE_PATH}/portfolio/health/accounts?${query}`
    : `${ACCOUNTS_BASE_PATH}/portfolio/health/accounts`;
  const response = await fetch(url, buildOptions({ method: 'GET' }));
  const data = await handleResponse<{ data: Account[] }>(response);
  return data.data;
}

// ============================================================================
// Account CTA Types & Functions
// ============================================================================

export type CTAType =
  | 'RISK'
  | 'OPPORTUNITY'
  | 'LIFECYCLE'
  | 'ACTIVITY'
  | 'OBJECTIVE';
export type CTAPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type CTAStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'SNOOZED'
  | 'COMPLETED'
  | 'CANCELLED';
export type CTAOutcome = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

export interface AccountCTA {
  id: number;
  tenantId: string;
  accountId: number;
  type: CTAType;
  status: CTAStatus;
  priority: CTAPriority;
  title: string;
  description?: string | null;
  reason?: string | null;
  dueDate?: string | null;
  snoozeUntil?: string | null;
  resolutionNotes?: string | null;
  outcome?: CTAOutcome | null;
  ownerId?: number | null;
  playbookId?: number | null;
  successPlanId?: number | null;
  createdAt: string;
  updatedAt: string;
  account?: Account;
  owner?: { id: number; name: string };
}

export interface CreateCTAPayload {
  type: CTAType;
  priority?: CTAPriority;
  title: string;
  description?: string;
  reason?: string;
  dueDate?: string;
  playbookId?: number;
  successPlanId?: number;
}

export interface UpdateCTAPayload {
  status?: CTAStatus;
  priority?: CTAPriority;
  title?: string;
  description?: string;
  reason?: string;
  dueDate?: string | null;
  snoozeUntil?: string;
  resolutionNotes?: string;
  outcome?: CTAOutcome;
  ownerId?: number;
  playbookId?: number | null;
}

export interface ListCTAsParams {
  accountId?: number;
  ownerId?: number;
  type?: CTAType;
  status?: CTAStatus | CTAStatus[];
  priority?: CTAPriority;
  overdue?: boolean;
  snoozed?: boolean;
  sortBy?: 'dueDate' | 'priority' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface CTASummary {
  total: number;
  byStatus: Record<CTAStatus, number>;
  byPriority: Record<CTAPriority, number>;
  byType: Record<CTAType, number>;
  overdueCount: number;
  dueSoonCount: number;
}

export interface CTACockpit {
  critical: AccountCTA[];
  overdue: AccountCTA[];
  dueSoon: AccountCTA[];
  recentlyClosed: AccountCTA[];
  summary: CTASummary;
}

/**
 * Create a CTA for an account
 */
export async function createAccountCTA(
  accountId: number,
  payload: CreateCTAPayload,
): Promise<AccountCTA> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/${accountId}/ctas`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );
  const data = await handleResponse<{ data: AccountCTA }>(response);
  return data.data;
}

/**
 * Get a CTA by ID
 */
export async function fetchAccountCTA(
  accountId: number,
  ctaId: number,
): Promise<AccountCTA> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/${accountId}/ctas/${ctaId}`,
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ data: AccountCTA }>(response);
  return data.data;
}

/**
 * Update a CTA
 */
export async function updateAccountCTA(
  accountId: number,
  ctaId: number,
  payload: UpdateCTAPayload,
): Promise<AccountCTA> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/${accountId}/ctas/${ctaId}`,
    buildOptions({
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  );
  const data = await handleResponse<{ data: AccountCTA }>(response);
  return data.data;
}

/**
 * Delete a CTA
 */
export async function deleteAccountCTA(
  accountId: number,
  ctaId: number,
): Promise<void> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/${accountId}/ctas/${ctaId}`,
    buildOptions({ method: 'DELETE' }),
  );
  await handleResponse(response);
}

/**
 * Close a CTA
 */
export async function closeAccountCTA(
  accountId: number,
  ctaId: number,
  outcome: CTAOutcome,
  resolutionNotes?: string,
): Promise<AccountCTA> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/${accountId}/ctas/${ctaId}/close`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ outcome, resolutionNotes }),
    }),
  );
  const data = await handleResponse<{ data: AccountCTA }>(response);
  return data.data;
}

/**
 * Snooze a CTA
 */
export async function snoozeAccountCTA(
  accountId: number,
  ctaId: number,
  snoozeUntil: string,
): Promise<AccountCTA> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/${accountId}/ctas/${ctaId}/snooze`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ snoozeUntil }),
    }),
  );
  const data = await handleResponse<{ data: AccountCTA }>(response);
  return data.data;
}

/**
 * List CTAs for an account
 */
export async function fetchAccountCTAs(
  accountId: number,
  params?: Omit<ListCTAsParams, 'accountId'>,
): Promise<AccountCTA[]> {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.append('type', params.type);
  if (params?.status) {
    const statuses = Array.isArray(params.status)
      ? params.status
      : [params.status];
    statuses.forEach((s) => searchParams.append('status', s));
  }
  if (params?.priority) searchParams.append('priority', params.priority);
  if (params?.overdue !== undefined)
    searchParams.append('overdue', String(params.overdue));
  if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);
  if (params?.limit) searchParams.append('limit', String(params.limit));
  if (params?.offset) searchParams.append('offset', String(params.offset));
  const query = searchParams.toString();
  const url = query
    ? `${ACCOUNTS_BASE_PATH}/${accountId}/ctas?${query}`
    : `${ACCOUNTS_BASE_PATH}/${accountId}/ctas`;
  const response = await fetch(url, buildOptions({ method: 'GET' }));
  const data = await handleResponse<{ data: AccountCTA[] }>(response);
  return data.data;
}

/**
 * Get CTA summary for an account
 */
export async function fetchAccountCTASummary(
  accountId: number,
): Promise<CTASummary> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/${accountId}/ctas/summary`,
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ data: CTASummary }>(response);
  return data.data;
}

/**
 * Get portfolio CTAs (all accounts)
 */
export async function fetchPortfolioCTAs(
  params?: ListCTAsParams,
): Promise<AccountCTA[]> {
  const searchParams = new URLSearchParams();
  if (params?.ownerId) searchParams.append('ownerId', String(params.ownerId));
  if (params?.type) searchParams.append('type', params.type);
  if (params?.status) {
    const statuses = Array.isArray(params.status)
      ? params.status
      : [params.status];
    statuses.forEach((s) => searchParams.append('status', s));
  }
  if (params?.priority) searchParams.append('priority', params.priority);
  if (params?.overdue !== undefined)
    searchParams.append('overdue', String(params.overdue));
  if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);
  if (params?.limit) searchParams.append('limit', String(params.limit));
  if (params?.offset) searchParams.append('offset', String(params.offset));
  const query = searchParams.toString();
  const url = query
    ? `${ACCOUNTS_BASE_PATH}/portfolio/ctas?${query}`
    : `${ACCOUNTS_BASE_PATH}/portfolio/ctas`;
  const response = await fetch(url, buildOptions({ method: 'GET' }));
  const data = await handleResponse<{ data: AccountCTA[] }>(response);
  return data.data;
}

/**
 * Get CTA cockpit (overview of all critical CTAs)
 */
export async function fetchCTACockpit(): Promise<CTACockpit> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/portfolio/ctas/cockpit`,
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ data: CTACockpit }>(response);
  return data.data;
}

/**
 * Get portfolio CTA summary
 */
export async function fetchPortfolioCTASummary(
  all?: boolean,
): Promise<CTASummary> {
  const params = new URLSearchParams();
  if (all) params.append('all', 'true');
  const query = params.toString();
  const url = query
    ? `${ACCOUNTS_BASE_PATH}/portfolio/ctas/summary?${query}`
    : `${ACCOUNTS_BASE_PATH}/portfolio/ctas/summary`;
  const response = await fetch(url, buildOptions({ method: 'GET' }));
  const data = await handleResponse<{ data: CTASummary }>(response);
  return data.data;
}

// ============================================================================
// Account Success Plan Types & Functions
// ============================================================================

export type SuccessPlanStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'ON_HOLD'
  | 'CANCELLED';
export type ObjectiveStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'BLOCKED';
export type TaskStatus =
  | 'NOT_STARTED'
  | 'BACKLOG'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'DONE';
export type TaskPriority = 'P0' | 'P1' | 'P2';

export interface CustomerGoal {
  goal: string;
  metric?: string;
  baseline?: number;
  target?: number;
}

export interface SuccessPlanTask {
  id: number;
  objectiveId: number;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  ownerId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SuccessPlanObjective {
  id: number;
  successPlanId: number;
  title: string;
  description?: string | null;
  status: ObjectiveStatus;
  dueDate?: string | null;
  successCriteria?: string | null;
  progressPercent: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  tasks?: SuccessPlanTask[];
}

export interface AccountSuccessPlan {
  id: number;
  tenantId: string;
  accountId: number;
  name: string;
  description?: string | null;
  status: SuccessPlanStatus;
  startDate?: string | null;
  targetDate?: string | null;
  customerGoals?: CustomerGoal[] | null;
  progressPercent: number;
  isCustomerVisible: boolean;
  customerNotes?: string | null;
  ownerId?: number | null;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  account?: Account;
  owner?: { id: number; name: string };
  objectives?: SuccessPlanObjective[];
}

export interface CreateSuccessPlanPayload {
  name: string;
  description?: string;
  startDate?: string;
  targetDate?: string;
  customerGoals?: CustomerGoal[];
  isCustomerVisible?: boolean;
}

export interface UpdateSuccessPlanPayload {
  name?: string;
  description?: string;
  status?: SuccessPlanStatus;
  startDate?: string | null;
  targetDate?: string | null;
  customerGoals?: CustomerGoal[];
  isCustomerVisible?: boolean;
  customerNotes?: string;
  ownerId?: number;
}

export interface ListSuccessPlansParams {
  accountId?: number;
  ownerId?: number;
  status?: SuccessPlanStatus | SuccessPlanStatus[];
  sortBy?: 'targetDate' | 'createdAt' | 'progressPercent';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface CreateObjectivePayload {
  title: string;
  description?: string;
  dueDate?: string;
  successCriteria?: string;
}

export interface UpdateObjectivePayload {
  title?: string;
  description?: string;
  status?: ObjectiveStatus;
  dueDate?: string | null;
  successCriteria?: string;
  progressPercent?: number;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
  ownerId?: number;
}

/**
 * Create a success plan for an account
 */
export async function createAccountSuccessPlan(
  accountId: number,
  payload: CreateSuccessPlanPayload,
): Promise<AccountSuccessPlan> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/${accountId}/success-plans`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );
  const data = await handleResponse<{ data: AccountSuccessPlan }>(response);
  return data.data;
}

/**
 * Get a success plan by ID
 */
export async function fetchAccountSuccessPlan(
  accountId: number,
  planId: number,
): Promise<AccountSuccessPlan> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/${accountId}/success-plans/${planId}`,
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ data: AccountSuccessPlan }>(response);
  return data.data;
}

/**
 * Update a success plan
 */
export async function updateAccountSuccessPlan(
  accountId: number,
  planId: number,
  payload: UpdateSuccessPlanPayload,
): Promise<AccountSuccessPlan> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/${accountId}/success-plans/${planId}`,
    buildOptions({
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  );
  const data = await handleResponse<{ data: AccountSuccessPlan }>(response);
  return data.data;
}

/**
 * Delete a success plan
 */
export async function deleteAccountSuccessPlan(
  accountId: number,
  planId: number,
): Promise<void> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/${accountId}/success-plans/${planId}`,
    buildOptions({ method: 'DELETE' }),
  );
  await handleResponse(response);
}

/**
 * List success plans for an account
 */
export async function fetchAccountSuccessPlans(
  accountId: number,
  params?: Omit<ListSuccessPlansParams, 'accountId'>,
): Promise<AccountSuccessPlan[]> {
  const searchParams = new URLSearchParams();
  if (params?.status) {
    const statuses = Array.isArray(params.status)
      ? params.status
      : [params.status];
    statuses.forEach((s) => searchParams.append('status', s));
  }
  if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);
  if (params?.limit) searchParams.append('limit', String(params.limit));
  if (params?.offset) searchParams.append('offset', String(params.offset));
  const query = searchParams.toString();
  const url = query
    ? `${ACCOUNTS_BASE_PATH}/${accountId}/success-plans?${query}`
    : `${ACCOUNTS_BASE_PATH}/${accountId}/success-plans`;
  const response = await fetch(url, buildOptions({ method: 'GET' }));
  const data = await handleResponse<{ data: AccountSuccessPlan[] }>(response);
  return data.data;
}

/**
 * Activate a success plan
 */
export async function activateAccountSuccessPlan(
  accountId: number,
  planId: number,
): Promise<AccountSuccessPlan> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/${accountId}/success-plans/${planId}/activate`,
    buildOptions({ method: 'POST' }),
  );
  const data = await handleResponse<{ data: AccountSuccessPlan }>(response);
  return data.data;
}

/**
 * Put a success plan on hold
 */
export async function holdAccountSuccessPlan(
  accountId: number,
  planId: number,
): Promise<AccountSuccessPlan> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/${accountId}/success-plans/${planId}/hold`,
    buildOptions({ method: 'POST' }),
  );
  const data = await handleResponse<{ data: AccountSuccessPlan }>(response);
  return data.data;
}

/**
 * Complete a success plan
 */
export async function completeAccountSuccessPlan(
  accountId: number,
  planId: number,
): Promise<AccountSuccessPlan> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/${accountId}/success-plans/${planId}/complete`,
    buildOptions({ method: 'POST' }),
  );
  const data = await handleResponse<{ data: AccountSuccessPlan }>(response);
  return data.data;
}

/**
 * Add an objective to a success plan
 */
export async function addSuccessPlanObjective(
  accountId: number,
  planId: number,
  payload: CreateObjectivePayload,
): Promise<AccountSuccessPlan> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/${accountId}/success-plans/${planId}/objectives`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );
  const data = await handleResponse<{ data: AccountSuccessPlan }>(response);
  return data.data;
}

/**
 * Update an objective
 */
export async function updateSuccessPlanObjective(
  accountId: number,
  planId: number,
  objectiveId: number,
  payload: UpdateObjectivePayload,
): Promise<AccountSuccessPlan> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/${accountId}/success-plans/${planId}/objectives/${objectiveId}`,
    buildOptions({
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  );
  const data = await handleResponse<{ data: AccountSuccessPlan }>(response);
  return data.data;
}

/**
 * Delete an objective
 */
export async function deleteSuccessPlanObjective(
  accountId: number,
  planId: number,
  objectiveId: number,
): Promise<void> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/${accountId}/success-plans/${planId}/objectives/${objectiveId}`,
    buildOptions({ method: 'DELETE' }),
  );
  await handleResponse(response);
}

/**
 * Add a task to an objective
 */
export async function addObjectiveTask(
  accountId: number,
  planId: number,
  objectiveId: number,
  payload: CreateTaskPayload,
): Promise<AccountSuccessPlan> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/${accountId}/success-plans/${planId}/objectives/${objectiveId}/tasks`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );
  const data = await handleResponse<{ data: AccountSuccessPlan }>(response);
  return data.data;
}

/**
 * Update task status
 */
export async function updateObjectiveTaskStatus(
  accountId: number,
  planId: number,
  objectiveId: number,
  taskId: number,
  status: TaskStatus,
): Promise<AccountSuccessPlan> {
  const response = await fetch(
    `${ACCOUNTS_BASE_PATH}/${accountId}/success-plans/${planId}/objectives/${objectiveId}/tasks/${taskId}/status`,
    buildOptions({
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),
  );
  const data = await handleResponse<{ data: AccountSuccessPlan }>(response);
  return data.data;
}

/**
 * Get portfolio success plans
 */
export async function fetchPortfolioSuccessPlans(
  params?: ListSuccessPlansParams,
): Promise<AccountSuccessPlan[]> {
  const searchParams = new URLSearchParams();
  if (params?.ownerId) searchParams.append('ownerId', String(params.ownerId));
  if (params?.status) {
    const statuses = Array.isArray(params.status)
      ? params.status
      : [params.status];
    statuses.forEach((s) => searchParams.append('status', s));
  }
  if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);
  if (params?.limit) searchParams.append('limit', String(params.limit));
  if (params?.offset) searchParams.append('offset', String(params.offset));
  const query = searchParams.toString();
  const url = query
    ? `${ACCOUNTS_BASE_PATH}/portfolio/success-plans?${query}`
    : `${ACCOUNTS_BASE_PATH}/portfolio/success-plans`;
  const response = await fetch(url, buildOptions({ method: 'GET' }));
  const data = await handleResponse<{ data: AccountSuccessPlan[] }>(response);
  return data.data;
}

// ============================================================================
// Playbook Types & Functions
// ============================================================================

export type PlaybookCategory =
  | 'ONBOARDING'
  | 'ADOPTION'
  | 'RENEWAL'
  | 'EXPANSION'
  | 'RISK_MITIGATION'
  | 'CHURN_PREVENTION'
  | 'OTHER';

export interface PlaybookTask {
  id: number;
  playbookId: number;
  title: string;
  description?: string | null;
  daysFromStart: number;
  sortOrder: number;
  isOptional: boolean;
}

export interface Playbook {
  id: number;
  tenantId: string;
  name: string;
  description?: string | null;
  category: PlaybookCategory;
  isActive: boolean;
  isDefault: boolean;
  estimatedDays: number;
  usageCount: number;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  tasks?: PlaybookTask[];
}

export interface CreatePlaybookPayload {
  name: string;
  description?: string;
  category: PlaybookCategory;
  estimatedDays?: number;
  isActive?: boolean;
}

export interface UpdatePlaybookPayload {
  name?: string;
  description?: string;
  category?: PlaybookCategory;
  estimatedDays?: number;
  isActive?: boolean;
}

export interface ListPlaybooksParams {
  category?: PlaybookCategory;
  isActive?: boolean;
  search?: string;
  sortBy?: 'name' | 'usageCount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface CreatePlaybookTaskPayload {
  title: string;
  description?: string;
  daysFromStart?: number;
  isOptional?: boolean;
}

export interface UpdatePlaybookTaskPayload {
  title?: string;
  description?: string;
  daysFromStart?: number;
  isOptional?: boolean;
}

const PLAYBOOKS_BASE_PATH = buildApiUrl('/crm/playbooks');

/**
 * List playbooks
 */
export async function fetchPlaybooks(
  params?: ListPlaybooksParams,
): Promise<Playbook[]> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.append('category', params.category);
  if (params?.isActive !== undefined)
    searchParams.append('isActive', String(params.isActive));
  if (params?.search) searchParams.append('search', params.search);
  if (params?.sortBy) searchParams.append('sortBy', params.sortBy);
  if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder);
  if (params?.limit) searchParams.append('limit', String(params.limit));
  if (params?.offset) searchParams.append('offset', String(params.offset));
  const query = searchParams.toString();
  const url = query ? `${PLAYBOOKS_BASE_PATH}?${query}` : PLAYBOOKS_BASE_PATH;
  const response = await fetch(url, buildOptions({ method: 'GET' }));
  const data = await handleResponse<{ data: Playbook[] }>(response);
  return data.data;
}

/**
 * Get a playbook by ID
 */
export async function fetchPlaybookById(id: number): Promise<Playbook> {
  const response = await fetch(
    `${PLAYBOOKS_BASE_PATH}/${id}`,
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ data: Playbook }>(response);
  return data.data;
}

/**
 * Create a playbook
 */
export async function createPlaybook(
  payload: CreatePlaybookPayload,
): Promise<Playbook> {
  const response = await fetch(
    PLAYBOOKS_BASE_PATH,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );
  const data = await handleResponse<{ data: Playbook }>(response);
  return data.data;
}

/**
 * Update a playbook
 */
export async function updatePlaybook(
  id: number,
  payload: UpdatePlaybookPayload,
): Promise<Playbook> {
  const response = await fetch(
    `${PLAYBOOKS_BASE_PATH}/${id}`,
    buildOptions({
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  );
  const data = await handleResponse<{ data: Playbook }>(response);
  return data.data;
}

/**
 * Delete a playbook
 */
export async function deletePlaybook(id: number): Promise<void> {
  const response = await fetch(
    `${PLAYBOOKS_BASE_PATH}/${id}`,
    buildOptions({ method: 'DELETE' }),
  );
  await handleResponse(response);
}

/**
 * Clone a playbook
 */
export async function clonePlaybook(
  id: number,
  newName: string,
): Promise<Playbook> {
  const response = await fetch(
    `${PLAYBOOKS_BASE_PATH}/${id}/clone`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ newName }),
    }),
  );
  const data = await handleResponse<{ data: Playbook }>(response);
  return data.data;
}

/**
 * Get playbook categories
 */
export async function fetchPlaybookCategories(): Promise<PlaybookCategory[]> {
  const response = await fetch(
    `${PLAYBOOKS_BASE_PATH}/categories`,
    buildOptions({ method: 'GET' }),
  );
  const data = await handleResponse<{ data: PlaybookCategory[] }>(response);
  return data.data;
}

/**
 * Get popular playbooks
 */
export async function fetchPopularPlaybooks(
  limit?: number,
): Promise<Playbook[]> {
  const params = new URLSearchParams();
  if (limit) params.append('limit', String(limit));
  const query = params.toString();
  const url = query
    ? `${PLAYBOOKS_BASE_PATH}/popular?${query}`
    : `${PLAYBOOKS_BASE_PATH}/popular`;
  const response = await fetch(url, buildOptions({ method: 'GET' }));
  const data = await handleResponse<{ data: Playbook[] }>(response);
  return data.data;
}

/**
 * Add a task to a playbook
 */
export async function addPlaybookTask(
  playbookId: number,
  payload: CreatePlaybookTaskPayload,
): Promise<Playbook> {
  const response = await fetch(
    `${PLAYBOOKS_BASE_PATH}/${playbookId}/tasks`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );
  const data = await handleResponse<{ data: Playbook }>(response);
  return data.data;
}

/**
 * Update a playbook task
 */
export async function updatePlaybookTask(
  playbookId: number,
  taskId: number,
  payload: UpdatePlaybookTaskPayload,
): Promise<Playbook> {
  const response = await fetch(
    `${PLAYBOOKS_BASE_PATH}/${playbookId}/tasks/${taskId}`,
    buildOptions({
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  );
  const data = await handleResponse<{ data: Playbook }>(response);
  return data.data;
}

/**
 * Delete a playbook task
 */
export async function deletePlaybookTask(
  playbookId: number,
  taskId: number,
): Promise<void> {
  const response = await fetch(
    `${PLAYBOOKS_BASE_PATH}/${playbookId}/tasks/${taskId}`,
    buildOptions({ method: 'DELETE' }),
  );
  await handleResponse(response);
}

/**
 * Reorder playbook tasks
 */
export async function reorderPlaybookTasks(
  playbookId: number,
  taskIds: number[],
): Promise<Playbook> {
  const response = await fetch(
    `${PLAYBOOKS_BASE_PATH}/${playbookId}/tasks/reorder`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ taskIds }),
    }),
  );
  const data = await handleResponse<{ data: Playbook }>(response);
  return data.data;
}
