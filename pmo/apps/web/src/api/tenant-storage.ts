/**
 * Tenant storage for multi-tenant API requests.
 *
 * Stores the current tenant ID and slug in localStorage so that it can be
 * included in API requests via the X-Tenant-ID header. This allows the server
 * to resolve the correct tenant context for tenant-scoped endpoints.
 *
 * Multi-tenant authentication flow:
 * 1. On login, server returns user's default tenant info
 * 2. Frontend stores tenant ID and slug in localStorage
 * 3. On subsequent requests, X-Tenant-ID header is included
 * 4. Server uses this to resolve tenant context
 */

const TENANT_ID_KEY = 'currentTenantId';
const TENANT_SLUG_KEY = 'currentTenantSlug';

export interface StoredTenant {
  id: string;
  slug: string;
}

/**
 * Store tenant info in localStorage.
 * Called after successful login or tenant switch.
 */
export function storeTenant(tenant: StoredTenant): void {
  try {
    localStorage.setItem(TENANT_ID_KEY, tenant.id);
    localStorage.setItem(TENANT_SLUG_KEY, tenant.slug);
  } catch {
    // localStorage may be unavailable in some contexts (private browsing, etc.)
    console.warn('Failed to store tenant info in localStorage');
  }
}

/**
 * Retrieve stored tenant ID.
 * Used to add X-Tenant-ID header for multi-tenant API requests.
 */
export function getStoredTenantId(): string | null {
  try {
    return localStorage.getItem(TENANT_ID_KEY);
  } catch {
    return null;
  }
}

/**
 * Retrieve stored tenant slug.
 * Used for display purposes and URL generation.
 */
export function getStoredTenantSlug(): string | null {
  try {
    return localStorage.getItem(TENANT_SLUG_KEY);
  } catch {
    return null;
  }
}

/**
 * Remove stored tenant info.
 * Called on logout to clear tenant context.
 */
export function clearStoredTenant(): void {
  try {
    localStorage.removeItem(TENANT_ID_KEY);
    localStorage.removeItem(TENANT_SLUG_KEY);
  } catch {
    // Ignore errors when clearing
  }
}
