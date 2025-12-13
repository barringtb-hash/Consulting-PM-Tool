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
