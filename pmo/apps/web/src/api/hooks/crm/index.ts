/**
 * CRM Module - React Query Hooks
 *
 * This module provides all React Query hooks for CRM entities:
 * - Accounts (companies/organizations)
 * - Opportunities (deals/potential revenue)
 *
 * @module crm
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';

// ============================================================================
// Cache Configuration
// ============================================================================

/**
 * Default cache times for CRM entities.
 * - staleTime: How long data is considered fresh (won't refetch)
 * - gcTime: How long to keep data in cache after it becomes inactive
 */
const CRM_CACHE_CONFIG = {
  /** Data considered fresh for 30 seconds */
  staleTime: 30_000,
  /** Keep in cache for 5 minutes after becoming inactive */
  gcTime: 300_000,
} as const;

/** Shorter cache for frequently changing data like stats */
const STATS_CACHE_CONFIG = {
  staleTime: 15_000,
  gcTime: 120_000,
} as const;
import {
  archiveAccount,
  createAccount,
  deleteAccount,
  fetchAccountById,
  fetchAccounts,
  fetchAccountStats,
  restoreAccount,
  updateAccount,
  type Account,
  type AccountFilters,
  type AccountPayload,
  type AccountStats,
  type AccountUpdatePayload,
  type PaginatedAccounts,
} from '../../accounts';
import {
  createOpportunity,
  deleteOpportunity,
  fetchClosingSoon,
  fetchOpportunities,
  fetchOpportunityById,
  fetchPipelineStats,
  markOpportunityLost,
  markOpportunityWon,
  moveOpportunityToStage,
  updateOpportunity,
  type Opportunity,
  type OpportunityClosingSoon,
  type OpportunityFilters,
  type OpportunityPayload,
  type OpportunityUpdatePayload,
  type PaginatedOpportunities,
  type PipelineStats,
} from '../../opportunities';

// ============================================================================
// Account Queries
// ============================================================================

/**
 * Fetch all accounts with optional filters
 */
export function useAccounts(
  filters?: AccountFilters,
): UseQueryResult<PaginatedAccounts, Error> {
  return useQuery({
    queryKey: queryKeys.accounts.list(filters),
    queryFn: () => fetchAccounts(filters),
    ...CRM_CACHE_CONFIG,
  });
}

/**
 * Fetch a single account by ID
 */
export function useAccount(id?: number): UseQueryResult<Account, Error> {
  return useQuery({
    queryKey: id ? queryKeys.accounts.detail(id) : queryKeys.accounts.all,
    enabled: Boolean(id),
    queryFn: () => fetchAccountById(id as number),
    ...CRM_CACHE_CONFIG,
  });
}

/**
 * Fetch account statistics
 */
export function useAccountStats(): UseQueryResult<AccountStats, Error> {
  return useQuery({
    queryKey: queryKeys.accounts.stats(),
    queryFn: fetchAccountStats,
    ...STATS_CACHE_CONFIG,
  });
}

// ============================================================================
// Account Mutations
// ============================================================================

/**
 * Create a new account
 */
export function useCreateAccount(): UseMutationResult<
  Account,
  Error,
  AccountPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AccountPayload) => createAccount(payload),
    onSuccess: (account) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.setQueryData(queryKeys.accounts.detail(account.id), account);
    },
  });
}

/**
 * Update an existing account
 */
export function useUpdateAccount(
  id: number,
): UseMutationResult<Account, Error, AccountUpdatePayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AccountUpdatePayload) => updateAccount(id, payload),
    onSuccess: (account) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.setQueryData(queryKeys.accounts.detail(id), account);
    },
  });
}

/**
 * Archive an account (soft delete)
 */
export function useArchiveAccount(): UseMutationResult<Account, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => archiveAccount(id),
    onSuccess: (account, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.setQueryData(queryKeys.accounts.detail(id), account);
    },
  });
}

/**
 * Restore an archived account
 */
export function useRestoreAccount(): UseMutationResult<Account, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => restoreAccount(id),
    onSuccess: (account, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.setQueryData(queryKeys.accounts.detail(id), account);
    },
  });
}

/**
 * Delete an account permanently
 */
export function useDeleteAccount(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteAccount(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.removeQueries({ queryKey: queryKeys.accounts.detail(id) });
      // Also invalidate related opportunities
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all });
    },
  });
}

// ============================================================================
// Opportunity Queries
// ============================================================================

/**
 * Fetch all opportunities with optional filters
 */
export function useOpportunities(
  filters?: OpportunityFilters,
): UseQueryResult<PaginatedOpportunities, Error> {
  return useQuery({
    queryKey: queryKeys.opportunities.list(filters),
    queryFn: () => fetchOpportunities(filters),
    ...CRM_CACHE_CONFIG,
  });
}

/**
 * Fetch a single opportunity by ID
 */
export function useOpportunity(
  id?: number,
): UseQueryResult<Opportunity, Error> {
  return useQuery({
    queryKey: id
      ? queryKeys.opportunities.detail(id)
      : queryKeys.opportunities.all,
    enabled: Boolean(id),
    queryFn: () => fetchOpportunityById(id as number),
    ...CRM_CACHE_CONFIG,
  });
}

/**
 * Fetch pipeline statistics
 */
export function usePipelineStats(
  pipelineId?: number,
): UseQueryResult<PipelineStats, Error> {
  return useQuery({
    queryKey: queryKeys.opportunities.pipelineStats(pipelineId),
    queryFn: () => fetchPipelineStats(pipelineId),
    ...STATS_CACHE_CONFIG,
  });
}

/**
 * Fetch opportunities closing soon
 */
export function useClosingSoon(
  days?: number,
): UseQueryResult<OpportunityClosingSoon[], Error> {
  return useQuery({
    queryKey: queryKeys.opportunities.closingSoon(days),
    queryFn: () => fetchClosingSoon(days),
    ...STATS_CACHE_CONFIG,
  });
}

// ============================================================================
// Opportunity Mutations
// ============================================================================

/**
 * Create a new opportunity
 */
export function useCreateOpportunity(): UseMutationResult<
  Opportunity,
  Error,
  OpportunityPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: OpportunityPayload) => createOpportunity(payload),
    onSuccess: (opportunity) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all });
      queryClient.setQueryData(
        queryKeys.opportunities.detail(opportunity.id),
        opportunity,
      );
      // Also invalidate account stats since opportunity count changed
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.stats() });
    },
  });
}

/**
 * Update an existing opportunity
 */
export function useUpdateOpportunity(
  id: number,
): UseMutationResult<Opportunity, Error, OpportunityUpdatePayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: OpportunityUpdatePayload) =>
      updateOpportunity(id, payload),
    onSuccess: (opportunity) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all });
      queryClient.setQueryData(queryKeys.opportunities.detail(id), opportunity);
    },
  });
}

/**
 * Move opportunity to a different stage
 */
export function useMoveOpportunityToStage(
  id: number,
): UseMutationResult<Opportunity, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stageId: number) => moveOpportunityToStage(id, stageId),
    onSuccess: (opportunity) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all });
      queryClient.setQueryData(queryKeys.opportunities.detail(id), opportunity);
    },
  });
}

/**
 * Mark opportunity as won
 */
export function useMarkOpportunityWon(
  id: number,
): UseMutationResult<Opportunity, Error, string | undefined> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (actualCloseDate?: string) =>
      markOpportunityWon(id, actualCloseDate),
    onSuccess: (opportunity) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all });
      queryClient.setQueryData(queryKeys.opportunities.detail(id), opportunity);
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.stats() });
    },
  });
}

/**
 * Mark opportunity as lost
 */
export function useMarkOpportunityLost(
  id: number,
): UseMutationResult<Opportunity, Error, string | undefined> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (lostReason?: string) => markOpportunityLost(id, lostReason),
    onSuccess: (opportunity) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all });
      queryClient.setQueryData(queryKeys.opportunities.detail(id), opportunity);
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.stats() });
    },
  });
}

/**
 * Delete an opportunity permanently
 */
export function useDeleteOpportunity(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteOpportunity(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunities.all });
      queryClient.removeQueries({
        queryKey: queryKeys.opportunities.detail(id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.stats() });
    },
  });
}

// ============================================================================
// Re-exports
// ============================================================================

export type {
  Account,
  AccountFilters,
  AccountPayload,
  AccountStats,
  AccountType,
  AccountUpdatePayload,
  PaginatedAccounts,
} from '../../accounts';

export type {
  Opportunity,
  OpportunityClosingSoon,
  OpportunityFilters,
  OpportunityPayload,
  OpportunityUpdatePayload,
  PaginatedOpportunities,
  PipelineStats,
} from '../../opportunities';
