/**
 * React Query Hooks for System Admin Tenant Management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import * as tenantAdminApi from '../tenant-admin';
import type {
  ListTenantsQuery,
  CreateTenantInput,
  UpdateTenantInput,
  AddTenantUserInput,
  ConfigureModuleInput,
  TenantRole,
} from '../tenant-admin';

// ============================================================================
// QUERY HOOKS
// ============================================================================

/**
 * Hook to fetch list of all tenants
 */
export function useTenants(query: ListTenantsQuery = {}) {
  return useQuery({
    queryKey: queryKeys.tenantAdmin.list(query),
    queryFn: () => tenantAdminApi.listTenants(query),
  });
}

/**
 * Hook to fetch tenant statistics
 */
export function useTenantStats() {
  return useQuery({
    queryKey: queryKeys.tenantAdmin.stats(),
    queryFn: () => tenantAdminApi.getTenantStats(),
  });
}

/**
 * Hook to fetch a single tenant by ID
 */
export function useTenant(tenantId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tenantAdmin.detail(tenantId!),
    queryFn: () => tenantAdminApi.getTenantById(tenantId!),
    enabled: !!tenantId,
  });
}

/**
 * Hook to fetch users of a tenant
 */
export function useTenantUsers(tenantId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tenantAdmin.users(tenantId!),
    queryFn: () => tenantAdminApi.getTenantUsers(tenantId!),
    enabled: !!tenantId,
  });
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

/**
 * Hook to create a new tenant
 */
export function useCreateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTenantInput) =>
      tenantAdminApi.createTenant(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenantAdmin.all });
    },
  });
}

/**
 * Hook to update a tenant
 */
export function useUpdateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      input,
    }: {
      tenantId: string;
      input: UpdateTenantInput;
    }) => tenantAdminApi.updateTenant(tenantId, input),
    onSuccess: (_data, { tenantId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tenantAdmin.detail(tenantId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tenantAdmin.lists(),
      });
    },
  });
}

/**
 * Hook to suspend a tenant
 */
export function useSuspendTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tenantId: string) => tenantAdminApi.suspendTenant(tenantId),
    onSuccess: (_data, tenantId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tenantAdmin.detail(tenantId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tenantAdmin.lists(),
      });
    },
  });
}

/**
 * Hook to activate a tenant
 */
export function useActivateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tenantId: string) => tenantAdminApi.activateTenant(tenantId),
    onSuccess: (_data, tenantId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tenantAdmin.detail(tenantId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tenantAdmin.lists(),
      });
    },
  });
}

/**
 * Hook to cancel a tenant
 */
export function useCancelTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tenantId: string) => tenantAdminApi.cancelTenant(tenantId),
    onSuccess: (_data, tenantId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tenantAdmin.detail(tenantId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tenantAdmin.lists(),
      });
    },
  });
}

/**
 * Hook to add a user to a tenant
 */
export function useAddTenantUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      input,
    }: {
      tenantId: string;
      input: AddTenantUserInput;
    }) => tenantAdminApi.addTenantUser(tenantId, input),
    onSuccess: (_data, { tenantId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tenantAdmin.users(tenantId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tenantAdmin.detail(tenantId),
      });
    },
  });
}

/**
 * Hook to update a user's role in a tenant
 */
export function useUpdateTenantUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      userId,
      role,
    }: {
      tenantId: string;
      userId: number;
      role: TenantRole;
    }) => tenantAdminApi.updateTenantUserRole(tenantId, userId, role),
    onSuccess: (_data, { tenantId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tenantAdmin.users(tenantId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tenantAdmin.detail(tenantId),
      });
    },
  });
}

/**
 * Hook to remove a user from a tenant
 */
export function useRemoveTenantUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ tenantId, userId }: { tenantId: string; userId: number }) =>
      tenantAdminApi.removeTenantUser(tenantId, userId),
    onSuccess: (_data, { tenantId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tenantAdmin.users(tenantId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.tenantAdmin.detail(tenantId),
      });
    },
  });
}

/**
 * Hook to configure a module for a tenant
 */
export function useConfigureTenantModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tenantId,
      input,
    }: {
      tenantId: string;
      input: ConfigureModuleInput;
    }) => tenantAdminApi.configureTenantModule(tenantId, input),
    onSuccess: (_data, { tenantId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.tenantAdmin.detail(tenantId),
      });
    },
  });
}
