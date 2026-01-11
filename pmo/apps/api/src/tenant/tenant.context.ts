/**
 * Tenant Context using AsyncLocalStorage
 *
 * This module provides tenant context propagation throughout the request lifecycle.
 * It uses Node.js AsyncLocalStorage to maintain tenant context across async operations
 * without explicit parameter passing.
 */

import { AsyncLocalStorage } from 'async_hooks';
import type { TenantContext, TenantPlan } from './tenant.types';

// AsyncLocalStorage instance for tenant context
export const tenantStorage = new AsyncLocalStorage<TenantContext>();

/**
 * Get the current tenant context.
 * @throws Error if called outside of a tenant context
 */
export function getTenantContext(): TenantContext {
  const context = tenantStorage.getStore();
  if (!context) {
    throw new Error(
      'Tenant context not initialized. Ensure this code runs within a tenant-scoped request.',
    );
  }
  return context;
}

/**
 * Get the current tenant ID.
 * @throws Error if called outside of a tenant context
 */
export function getTenantId(): string {
  return getTenantContext().tenantId;
}

/**
 * Get the current tenant slug.
 * @throws Error if called outside of a tenant context
 */
export function getTenantSlug(): string {
  return getTenantContext().tenantSlug;
}

/**
 * Get the current tenant plan.
 * @throws Error if called outside of a tenant context
 */
export function getTenantPlan(): TenantPlan {
  return getTenantContext().tenantPlan;
}

/**
 * Check if code is running within a tenant context.
 */
export function hasTenantContext(): boolean {
  return tenantStorage.getStore() !== undefined;
}

/**
 * Run a function within a specific tenant context.
 * Useful for background jobs, scheduled tasks, or system operations
 * that need to operate on behalf of a specific tenant.
 */
export function runWithTenantContext<T>(
  context: TenantContext,
  fn: () => T,
): T {
  return tenantStorage.run(context, fn);
}

/**
 * Run an async function within a specific tenant context.
 */
export async function runWithTenantContextAsync<T>(
  context: TenantContext,
  fn: () => Promise<T>,
): Promise<T> {
  return tenantStorage.run(context, fn);
}
