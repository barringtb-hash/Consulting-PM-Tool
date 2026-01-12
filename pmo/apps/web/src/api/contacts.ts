/**
 * CRM Contacts API Client
 *
 * CRUD operations for CRMContact entities.
 * Contacts represent individual people associated with Accounts.
 */

import { buildApiUrl } from './config';
import { buildOptions, handleResponse } from './http';

// ============================================================================
// Types
// ============================================================================

export type ContactLifecycle =
  | 'LEAD'
  | 'MQL'
  | 'SQL'
  | 'OPPORTUNITY'
  | 'CUSTOMER'
  | 'EVANGELIST'
  | 'CHURNED';

export type CRMLeadSource =
  | 'WEBSITE'
  | 'REFERRAL'
  | 'LINKEDIN'
  | 'COLD_CALL'
  | 'COLD_EMAIL'
  | 'EVENT'
  | 'PARTNER'
  | 'INBOUND'
  | 'OUTBOUND'
  | 'OTHER';

export interface ContactAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface Contact {
  id: number;
  tenantId: string;
  accountId?: number | null;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  lifecycle: ContactLifecycle;
  leadSource?: CRMLeadSource | null;
  leadScore?: number | null;
  isPrimary: boolean;
  doNotContact: boolean;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  address?: ContactAddress | null;
  ownerId?: number | null;
  tags: string[];
  customFields?: Record<string, unknown> | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  account?: {
    id: number;
    name: string;
    type?: string;
  } | null;
  owner?: {
    id: number;
    name: string;
    email?: string;
  } | null;
  _count?: {
    opportunityContacts: number;
    activities: number;
  };
}

export interface ContactFilters {
  accountId?: number;
  lifecycle?: ContactLifecycle;
  leadSource?: CRMLeadSource;
  ownerId?: number;
  archived?: boolean;
  search?: string;
  tags?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ContactPayload {
  accountId?: number;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  lifecycle?: ContactLifecycle;
  leadSource?: CRMLeadSource | null;
  isPrimary?: boolean;
  doNotContact?: boolean;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  address?: ContactAddress | null;
  ownerId?: number;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export interface ContactUpdatePayload extends Partial<ContactPayload> {
  leadScore?: number;
  archived?: boolean;
}

export interface PaginatedContacts {
  contacts: Contact[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ContactStats {
  total: number;
  recentContacts: number;
  byLifecycle: Array<{ lifecycle: ContactLifecycle; count: number }>;
  bySource: Array<{ source: CRMLeadSource | null; count: number }>;
}

// ============================================================================
// API Functions
// ============================================================================

const CONTACTS_BASE_PATH = buildApiUrl('/crm/contacts');

/**
 * List contacts with optional filters and pagination.
 */
export async function fetchContacts(
  filters?: ContactFilters,
): Promise<PaginatedContacts> {
  const params = new URLSearchParams();

  if (filters?.accountId) params.append('accountId', String(filters.accountId));
  if (filters?.lifecycle) params.append('lifecycle', filters.lifecycle);
  if (filters?.leadSource) params.append('leadSource', filters.leadSource);
  if (filters?.ownerId) params.append('ownerId', String(filters.ownerId));
  if (filters?.archived !== undefined)
    params.append('archived', String(filters.archived));
  if (filters?.search) params.append('search', filters.search);
  if (filters?.tags) params.append('tags', filters.tags);
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));
  if (filters?.sortBy) params.append('sortBy', filters.sortBy);
  if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

  const query = params.toString();
  const url = query ? `${CONTACTS_BASE_PATH}?${query}` : CONTACTS_BASE_PATH;

  const response = await fetch(url, buildOptions({ method: 'GET' }));
  const result = await handleResponse<{ data: PaginatedContacts }>(response);
  return result.data;
}

/**
 * List contacts for a specific account.
 */
export async function fetchContactsByAccount(
  accountId: number,
): Promise<Contact[]> {
  const response = await fetch(
    `${CONTACTS_BASE_PATH}/by-account/${accountId}`,
    buildOptions({ method: 'GET' }),
  );
  const result = await handleResponse<{ data: Contact[] }>(response);
  return result.data;
}

/**
 * Get contact by ID.
 */
export async function fetchContactById(id: number): Promise<Contact> {
  const response = await fetch(
    `${CONTACTS_BASE_PATH}/${id}`,
    buildOptions({ method: 'GET' }),
  );
  const result = await handleResponse<{ data: Contact }>(response);
  return result.data;
}

/**
 * Create a new contact.
 */
export async function createContact(payload: ContactPayload): Promise<Contact> {
  const response = await fetch(
    CONTACTS_BASE_PATH,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  );
  const result = await handleResponse<{ data: Contact }>(response);
  return result.data;
}

/**
 * Update a contact.
 */
export async function updateContact(
  id: number,
  payload: ContactUpdatePayload,
): Promise<Contact> {
  const response = await fetch(
    `${CONTACTS_BASE_PATH}/${id}`,
    buildOptions({
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  );
  const result = await handleResponse<{ data: Contact }>(response);
  return result.data;
}

/**
 * Delete (archive) a contact.
 */
export async function deleteContact(id: number): Promise<void> {
  const response = await fetch(
    `${CONTACTS_BASE_PATH}/${id}`,
    buildOptions({ method: 'DELETE' }),
  );
  if (!response.ok) {
    throw new Error('Failed to delete contact');
  }
}

/**
 * Restore an archived contact.
 */
export async function restoreContact(id: number): Promise<Contact> {
  const response = await fetch(
    `${CONTACTS_BASE_PATH}/${id}/restore`,
    buildOptions({ method: 'POST' }),
  );
  const result = await handleResponse<{ data: Contact }>(response);
  return result.data;
}

/**
 * Get contact statistics.
 */
export async function fetchContactStats(): Promise<ContactStats> {
  const response = await fetch(
    `${CONTACTS_BASE_PATH}/stats`,
    buildOptions({ method: 'GET' }),
  );
  const result = await handleResponse<{ data: ContactStats }>(response);
  return result.data;
}
