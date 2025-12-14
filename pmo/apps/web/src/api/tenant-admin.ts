/**
 * System Admin Tenant Management API Client
 *
 * API functions for managing tenants as a system administrator.
 */

import { buildOptions, handleResponse } from './http';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// ============================================================================
// TYPES
// ============================================================================

export type TenantPlan = 'TRIAL' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
export type TenantStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
export type TenantRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
export type ModuleTier = 'TRIAL' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE';

export interface TenantOwner {
  id: number;
  name: string;
  email: string;
}

export interface TenantListItem {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  status: TenantStatus;
  billingEmail: string | null;
  createdAt: string;
  updatedAt: string;
  trialEndsAt: string | null;
  _count: {
    users: number;
    accounts: number;
    opportunities: number;
  };
  owner: TenantOwner | null;
}

export interface TenantListResult {
  tenants: TenantListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TenantUser {
  id: string;
  tenantId: string;
  userId: number;
  role: TenantRole;
  invitedAt: string;
  acceptedAt: string | null;
  user: {
    id: number;
    name: string;
    email: string;
    role: 'USER' | 'ADMIN';
    createdAt: string;
    timezone?: string;
  };
}

export interface TenantModule {
  id: string;
  tenantId: string;
  moduleId: string;
  enabled: boolean;
  tier: ModuleTier;
  usageLimits: Record<string, number> | null;
  settings: Record<string, unknown> | null;
  trialEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantBranding {
  id: string;
  tenantId: string;
  logoUrl: string | null;
  logoSmallUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  fontFamily: string | null;
  customCss: string | null;
  emailLogoUrl: string | null;
  emailFooterText: string | null;
}

export interface TenantDomain {
  id: string;
  tenantId: string;
  domain: string;
  isPrimary: boolean;
  verified: boolean;
  verifiedAt: string | null;
  verifyToken: string;
  sslStatus: 'PENDING' | 'PROVISIONING' | 'ACTIVE' | 'FAILED';
  createdAt: string;
}

export interface TenantDetails {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  status: TenantStatus;
  billingEmail: string | null;
  settings: Record<string, unknown> | null;
  trialEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
  branding: TenantBranding | null;
  modules: TenantModule[];
  domains: TenantDomain[];
  _count: {
    users: number;
    accounts: number;
    opportunities: number;
    crmContacts: number;
    activities: number;
    clients: number;
    projects: number;
  };
  users: TenantUser[];
}

export interface TenantStats {
  total: number;
  byPlan: Record<TenantPlan, number>;
  byStatus: Record<TenantStatus, number>;
}

export interface CreateTenantInput {
  name: string;
  slug?: string;
  plan?: TenantPlan;
  ownerEmail: string;
  ownerName?: string;
  billingEmail?: string;
  trialEndsAt?: string;
}

export interface CreateTenantResult {
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: TenantPlan;
    status: TenantStatus;
    billingEmail: string | null;
    createdAt: string;
  };
  owner: {
    id: number;
    email: string;
    name: string;
    isNewUser: boolean;
    tempPassword: string | null;
  };
}

export interface UpdateTenantInput {
  name?: string;
  plan?: TenantPlan;
  status?: TenantStatus;
  billingEmail?: string | null;
  trialEndsAt?: string | null;
  settings?: Record<string, unknown>;
}

export interface AddTenantUserInput {
  email: string;
  name?: string;
  role?: TenantRole;
}

export interface AddTenantUserResult {
  tenantUser: TenantUser;
  isNewUser: boolean;
  tempPassword: string | null;
}

export interface ConfigureModuleInput {
  moduleId: string;
  enabled: boolean;
  tier?: ModuleTier;
  trialDays?: number;
  usageLimits?: Record<string, number>;
  settings?: Record<string, unknown>;
}

export interface ListTenantsQuery {
  page?: number;
  limit?: number;
  search?: string;
  plan?: TenantPlan;
  status?: TenantStatus;
  sortBy?: 'name' | 'createdAt' | 'plan' | 'status';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * List all tenants with filtering and pagination
 */
export async function listTenants(
  query: ListTenantsQuery = {},
): Promise<TenantListResult> {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.search) params.set('search', query.search);
  if (query.plan) params.set('plan', query.plan);
  if (query.status) params.set('status', query.status);
  if (query.sortBy) params.set('sortBy', query.sortBy);
  if (query.sortOrder) params.set('sortOrder', query.sortOrder);

  const url = `${API_BASE}/admin/tenants?${params.toString()}`;
  const response = await fetch(url, buildOptions());
  return handleResponse<TenantListResult>(response);
}

/**
 * Get tenant statistics summary
 */
export async function getTenantStats(): Promise<TenantStats> {
  const response = await fetch(
    `${API_BASE}/admin/tenants/stats`,
    buildOptions(),
  );
  return handleResponse<TenantStats>(response);
}

/**
 * Get tenant details by ID
 */
export async function getTenantById(tenantId: string): Promise<TenantDetails> {
  const response = await fetch(
    `${API_BASE}/admin/tenants/${tenantId}`,
    buildOptions(),
  );
  return handleResponse<TenantDetails>(response);
}

/**
 * Create a new tenant
 */
export async function createTenant(
  input: CreateTenantInput,
): Promise<CreateTenantResult> {
  const response = await fetch(
    `${API_BASE}/admin/tenants`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
  return handleResponse<CreateTenantResult>(response);
}

/**
 * Update a tenant
 */
export async function updateTenant(
  tenantId: string,
  input: UpdateTenantInput,
): Promise<TenantDetails> {
  const response = await fetch(
    `${API_BASE}/admin/tenants/${tenantId}`,
    buildOptions({
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  );
  return handleResponse<TenantDetails>(response);
}

/**
 * Suspend a tenant
 */
export async function suspendTenant(tenantId: string): Promise<TenantDetails> {
  const response = await fetch(
    `${API_BASE}/admin/tenants/${tenantId}/suspend`,
    buildOptions({ method: 'POST' }),
  );
  return handleResponse<TenantDetails>(response);
}

/**
 * Activate a tenant
 */
export async function activateTenant(tenantId: string): Promise<TenantDetails> {
  const response = await fetch(
    `${API_BASE}/admin/tenants/${tenantId}/activate`,
    buildOptions({ method: 'POST' }),
  );
  return handleResponse<TenantDetails>(response);
}

/**
 * Cancel a tenant (soft delete)
 */
export async function cancelTenant(tenantId: string): Promise<TenantDetails> {
  const response = await fetch(
    `${API_BASE}/admin/tenants/${tenantId}/cancel`,
    buildOptions({ method: 'POST' }),
  );
  return handleResponse<TenantDetails>(response);
}

/**
 * Get users of a tenant
 */
export async function getTenantUsers(tenantId: string): Promise<TenantUser[]> {
  const response = await fetch(
    `${API_BASE}/admin/tenants/${tenantId}/users`,
    buildOptions(),
  );
  return handleResponse<TenantUser[]>(response);
}

/**
 * Add a user to a tenant
 */
export async function addTenantUser(
  tenantId: string,
  input: AddTenantUserInput,
): Promise<AddTenantUserResult> {
  const response = await fetch(
    `${API_BASE}/admin/tenants/${tenantId}/users`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(input),
    }),
  );
  return handleResponse<AddTenantUserResult>(response);
}

/**
 * Update user role in a tenant
 */
export async function updateTenantUserRole(
  tenantId: string,
  userId: number,
  role: TenantRole,
): Promise<TenantUser> {
  const response = await fetch(
    `${API_BASE}/admin/tenants/${tenantId}/users/${userId}/role`,
    buildOptions({
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),
  );
  return handleResponse<TenantUser>(response);
}

/**
 * Remove a user from a tenant
 */
export async function removeTenantUser(
  tenantId: string,
  userId: number,
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/admin/tenants/${tenantId}/users/${userId}`,
    buildOptions({ method: 'DELETE' }),
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to remove user');
  }
}

/**
 * Configure a module for a tenant
 */
export async function configureTenantModule(
  tenantId: string,
  input: ConfigureModuleInput,
): Promise<TenantModule> {
  const response = await fetch(
    `${API_BASE}/admin/tenants/${tenantId}/modules`,
    buildOptions({
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  );
  return handleResponse<TenantModule>(response);
}

/**
 * Update tenant branding input
 */
export interface UpdateTenantBrandingInput {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  logoUrl?: string | null;
  logoSmallUrl?: string | null;
  faviconUrl?: string | null;
  fontFamily?: string | null;
  customCss?: string | null;
  emailLogoUrl?: string | null;
  emailFooterText?: string | null;
}

/**
 * Update tenant branding
 */
export async function updateTenantBranding(
  tenantId: string,
  input: UpdateTenantBrandingInput,
): Promise<TenantBranding> {
  const response = await fetch(
    `${API_BASE}/admin/tenants/${tenantId}/branding`,
    buildOptions({
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  );
  return handleResponse<TenantBranding>(response);
}
