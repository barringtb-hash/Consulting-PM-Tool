/**
 * Modules API Client
 *
 * API functions for module discovery and management.
 */

import { API_BASE_URL } from './config';
import { buildOptions, handleResponse } from './http';

// ============================================================================
// Types
// ============================================================================

export interface ModuleInfo {
  id: string;
  label: string;
  description: string;
  navGroup: string;
  path: string;
  icon: string;
  isCore: boolean;
  enabled: boolean;
  dependencies: string[];
}

export interface ModulesResponse {
  enabledModules: string[];
  modules: ModuleInfo[];
  enabledDefinitions: Array<{
    id: string;
    label: string;
    navGroup: string;
    path: string;
    icon: string;
    isCore: boolean;
    description: string;
  }>;
  navigationItems: Array<{
    group: string;
    label: string;
    items: ModuleInfo[];
  }>;
}

export interface FeatureFlag {
  id: number;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rolloutPercentage: number;
  config: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantModuleConfig {
  id: number;
  tenantId: string;
  moduleId: string;
  enabled: boolean;
  settings: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantModuleResult {
  moduleId: string;
  enabled: boolean;
  isCore: boolean;
  settings?: Record<string, unknown>;
}

export interface TenantModuleConfigResponse {
  tenantId: string;
  modules: TenantModuleResult[];
  source: 'database' | 'environment' | 'default';
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get enabled modules for the current deployment
 */
export async function getModules(): Promise<ModulesResponse> {
  const response = await fetch(
    `${API_BASE_URL}/modules`,
    buildOptions({ method: 'GET' })
  );
  return handleResponse<ModulesResponse>(response);
}

/**
 * Check if a specific module is enabled
 */
export async function checkModuleEnabled(
  moduleId: string
): Promise<{ moduleId: string; enabled: boolean; isCore: boolean }> {
  const response = await fetch(
    `${API_BASE_URL}/modules/check/${moduleId}`,
    buildOptions({ method: 'GET' })
  );
  return handleResponse(response);
}

/**
 * Check if a feature flag is enabled for the current user
 */
export async function checkFeatureFlag(
  key: string
): Promise<{ key: string; enabled: boolean; config?: Record<string, unknown> }> {
  const response = await fetch(
    `${API_BASE_URL}/feature-flags/check/${key}`,
    buildOptions({ method: 'GET' })
  );
  return handleResponse(response);
}

// ============================================================================
// Admin API - Feature Flags
// ============================================================================

/**
 * Get all feature flags (admin only)
 */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  const response = await fetch(
    `${API_BASE_URL}/admin/feature-flags`,
    buildOptions({ method: 'GET' })
  );
  return handleResponse<FeatureFlag[]>(response);
}

/**
 * Get a specific feature flag (admin only)
 */
export async function getFeatureFlag(key: string): Promise<FeatureFlag> {
  const response = await fetch(
    `${API_BASE_URL}/admin/feature-flags/${key}`,
    buildOptions({ method: 'GET' })
  );
  return handleResponse<FeatureFlag>(response);
}

/**
 * Create a new feature flag (admin only)
 */
export async function createFeatureFlag(data: {
  key: string;
  name: string;
  description?: string;
  enabled?: boolean;
  rolloutPercentage?: number;
  config?: Record<string, unknown>;
}): Promise<FeatureFlag> {
  const response = await fetch(
    `${API_BASE_URL}/admin/feature-flags`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(data),
    })
  );
  return handleResponse<FeatureFlag>(response);
}

/**
 * Update a feature flag (admin only)
 */
export async function updateFeatureFlag(
  key: string,
  data: {
    name?: string;
    description?: string;
    enabled?: boolean;
    rolloutPercentage?: number;
    config?: Record<string, unknown>;
  }
): Promise<FeatureFlag> {
  const response = await fetch(
    `${API_BASE_URL}/admin/feature-flags/${key}`,
    buildOptions({
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  );
  return handleResponse<FeatureFlag>(response);
}

/**
 * Delete a feature flag (admin only)
 */
export async function deleteFeatureFlag(key: string): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/admin/feature-flags/${key}`,
    buildOptions({ method: 'DELETE' })
  );
  await handleResponse<void>(response);
}

// ============================================================================
// Admin API - Tenant Module Configuration
// ============================================================================

/**
 * Get all tenants with custom module configurations (admin only)
 */
export async function getAllTenants(): Promise<{ tenants: string[] }> {
  const response = await fetch(
    `${API_BASE_URL}/admin/modules/tenants`,
    buildOptions({ method: 'GET' })
  );
  return handleResponse(response);
}

/**
 * Get module configuration for a tenant (admin only)
 */
export async function getTenantModuleConfig(
  tenantId: string
): Promise<TenantModuleConfigResponse> {
  const response = await fetch(
    `${API_BASE_URL}/admin/modules/${tenantId}`,
    buildOptions({ method: 'GET' })
  );
  return handleResponse<TenantModuleConfigResponse>(response);
}

/**
 * Set module configuration for a tenant (admin only)
 */
export async function setTenantModuleConfig(data: {
  tenantId: string;
  moduleId: string;
  enabled: boolean;
  settings?: Record<string, unknown>;
}): Promise<TenantModuleConfig> {
  const response = await fetch(
    `${API_BASE_URL}/admin/modules`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(data),
    })
  );
  return handleResponse<TenantModuleConfig>(response);
}

/**
 * Bulk set enabled modules for a tenant (admin only)
 */
export async function bulkSetTenantModules(data: {
  tenantId: string;
  enabledModules: string[];
}): Promise<{
  tenantId: string;
  configs: TenantModuleConfig[];
  enabledModules: string[];
}> {
  const response = await fetch(
    `${API_BASE_URL}/admin/modules/bulk`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(data),
    })
  );
  return handleResponse(response);
}

/**
 * Update module configuration for a tenant (admin only)
 */
export async function updateTenantModuleConfig(
  tenantId: string,
  moduleId: string,
  data: {
    enabled?: boolean;
    settings?: Record<string, unknown>;
  }
): Promise<TenantModuleConfig> {
  const response = await fetch(
    `${API_BASE_URL}/admin/modules/${tenantId}/${moduleId}`,
    buildOptions({
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  );
  return handleResponse<TenantModuleConfig>(response);
}

/**
 * Delete module configuration for a tenant (admin only)
 */
export async function deleteTenantModuleConfig(
  tenantId: string,
  moduleId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/admin/modules/${tenantId}/${moduleId}`,
    buildOptions({ method: 'DELETE' })
  );
  await handleResponse<void>(response);
}
