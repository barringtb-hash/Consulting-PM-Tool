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
  // Account Health
  fetchAccountHealthScore,
  calculateAccountHealthScore,
  autoCalculateAccountHealthScore,
  fetchAccountHealthHistory,
  fetchPortfolioHealthSummary,
  fetchAccountsByHealth,
  // Account CTAs
  createAccountCTA,
  fetchAccountCTA,
  updateAccountCTA,
  deleteAccountCTA,
  closeAccountCTA,
  snoozeAccountCTA,
  fetchAccountCTAs,
  fetchAccountCTASummary,
  fetchPortfolioCTAs,
  fetchCTACockpit,
  fetchPortfolioCTASummary,
  // Account Success Plans
  createAccountSuccessPlan,
  fetchAccountSuccessPlan,
  updateAccountSuccessPlan,
  deleteAccountSuccessPlan,
  fetchAccountSuccessPlans,
  activateAccountSuccessPlan,
  holdAccountSuccessPlan,
  completeAccountSuccessPlan,
  addSuccessPlanObjective,
  updateSuccessPlanObjective,
  deleteSuccessPlanObjective,
  addObjectiveTask,
  updateObjectiveTaskStatus,
  fetchPortfolioSuccessPlans,
  // Playbooks
  fetchPlaybooks,
  fetchPlaybookById,
  createPlaybook,
  updatePlaybook,
  deletePlaybook,
  clonePlaybook,
  fetchPlaybookCategories,
  fetchPopularPlaybooks,
  addPlaybookTask,
  updatePlaybookTask,
  deletePlaybookTask,
  reorderPlaybookTasks,
  // Types (only import types used in this file)
  type Account,
  type AccountFilters,
  type AccountPayload,
  type AccountStats,
  type AccountUpdatePayload,
  type PaginatedAccounts,
  type AccountHealthScore,
  type HealthScoreHistory,
  type PortfolioHealthSummary,
  type CalculateHealthScorePayload,
  type ListAccountsByHealthParams,
  type AccountCTA,
  type CreateCTAPayload,
  type UpdateCTAPayload,
  type ListCTAsParams,
  type CTASummary,
  type CTACockpit,
  type CTAOutcome,
  type AccountSuccessPlan,
  type CreateSuccessPlanPayload,
  type UpdateSuccessPlanPayload,
  type ListSuccessPlansParams,
  type CreateObjectivePayload,
  type UpdateObjectivePayload,
  type CreateTaskPayload,
  type TaskStatus,
  type Playbook,
  type CreatePlaybookPayload,
  type UpdatePlaybookPayload,
  type ListPlaybooksParams,
  type CreatePlaybookTaskPayload,
  type UpdatePlaybookTaskPayload,
  type PlaybookCategory,
} from '../../accounts';
import {
  createOpportunity,
  deleteOpportunity,
  fetchClosingSoon,
  fetchOpportunities,
  fetchOpportunityById,
  fetchPipelineStages,
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
  type PipelineStagesResponse,
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
 * Fetch all pipeline stages for dropdown population
 */
export function usePipelineStages(
  pipelineId?: number,
): UseQueryResult<PipelineStagesResponse, Error> {
  return useQuery({
    queryKey: queryKeys.opportunities.pipelineStages(pipelineId),
    queryFn: () => fetchPipelineStages(pipelineId),
    ...CRM_CACHE_CONFIG,
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
// Account Health Score Queries
// ============================================================================

/**
 * Fetch account health score
 */
export function useAccountHealthScore(
  accountId?: number,
): UseQueryResult<AccountHealthScore | null, Error> {
  return useQuery({
    queryKey: accountId
      ? queryKeys.accounts.health(accountId)
      : queryKeys.accounts.all,
    enabled: Boolean(accountId),
    queryFn: () => fetchAccountHealthScore(accountId as number),
    ...CRM_CACHE_CONFIG,
  });
}

/**
 * Fetch account health score history
 */
export function useAccountHealthHistory(
  accountId?: number,
  days?: number,
): UseQueryResult<HealthScoreHistory[], Error> {
  return useQuery({
    queryKey: accountId
      ? queryKeys.accounts.healthHistory(accountId, days)
      : queryKeys.accounts.all,
    enabled: Boolean(accountId),
    queryFn: () => fetchAccountHealthHistory(accountId as number, days),
    ...CRM_CACHE_CONFIG,
  });
}

/**
 * Fetch portfolio health summary
 */
export function usePortfolioHealthSummary(): UseQueryResult<
  PortfolioHealthSummary,
  Error
> {
  return useQuery({
    queryKey: queryKeys.accounts.portfolioHealth(),
    queryFn: fetchPortfolioHealthSummary,
    ...STATS_CACHE_CONFIG,
  });
}

/**
 * Fetch accounts by health category
 */
export function useAccountsByHealth(
  params?: ListAccountsByHealthParams,
): UseQueryResult<Account[], Error> {
  return useQuery({
    queryKey: queryKeys.accounts.accountsByHealth(params),
    queryFn: () => fetchAccountsByHealth(params),
    ...CRM_CACHE_CONFIG,
  });
}

// ============================================================================
// Account Health Score Mutations
// ============================================================================

/**
 * Calculate/recalculate account health score
 */
export function useCalculateAccountHealthScore(
  accountId: number,
): UseMutationResult<
  AccountHealthScore,
  Error,
  CalculateHealthScorePayload | undefined
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload?: CalculateHealthScorePayload) =>
      calculateAccountHealthScore(accountId, payload),
    onSuccess: (healthScore) => {
      queryClient.setQueryData(
        queryKeys.accounts.health(accountId),
        healthScore,
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.healthHistory(accountId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.portfolioHealth(),
      });
    },
  });
}

/**
 * Auto-calculate account health score from CRM data
 * This is the recommended method for recalculating health scores
 */
export function useAutoCalculateAccountHealthScore(
  accountId: number,
): UseMutationResult<AccountHealthScore, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => autoCalculateAccountHealthScore(accountId),
    onSuccess: (healthScore) => {
      queryClient.setQueryData(
        queryKeys.accounts.health(accountId),
        healthScore,
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.detail(accountId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.healthHistory(accountId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.portfolioHealth(),
      });
    },
  });
}

// ============================================================================
// Account CTA Queries
// ============================================================================

/**
 * Fetch CTAs for an account
 */
export function useAccountCTAs(
  accountId?: number,
  params?: Omit<ListCTAsParams, 'accountId'>,
): UseQueryResult<AccountCTA[], Error> {
  return useQuery({
    queryKey: accountId
      ? queryKeys.accounts.ctaList(accountId, params)
      : queryKeys.accounts.all,
    enabled: Boolean(accountId),
    queryFn: () => fetchAccountCTAs(accountId as number, params),
    ...CRM_CACHE_CONFIG,
  });
}

/**
 * Fetch a single CTA
 */
export function useAccountCTA(
  accountId?: number,
  ctaId?: number,
): UseQueryResult<AccountCTA, Error> {
  return useQuery({
    queryKey:
      accountId && ctaId
        ? queryKeys.accounts.ctaDetail(accountId, ctaId)
        : queryKeys.accounts.all,
    enabled: Boolean(accountId && ctaId),
    queryFn: () => fetchAccountCTA(accountId as number, ctaId as number),
    ...CRM_CACHE_CONFIG,
  });
}

/**
 * Fetch CTA summary for an account
 */
export function useAccountCTASummary(
  accountId?: number,
): UseQueryResult<CTASummary, Error> {
  return useQuery({
    queryKey: accountId
      ? queryKeys.accounts.ctaSummary(accountId)
      : queryKeys.accounts.all,
    enabled: Boolean(accountId),
    queryFn: () => fetchAccountCTASummary(accountId as number),
    ...STATS_CACHE_CONFIG,
  });
}

/**
 * Fetch portfolio CTAs (all accounts)
 */
export function usePortfolioCTAs(
  params?: ListCTAsParams,
): UseQueryResult<AccountCTA[], Error> {
  return useQuery({
    queryKey: queryKeys.accounts.portfolioCTAs(params),
    queryFn: () => fetchPortfolioCTAs(params),
    ...CRM_CACHE_CONFIG,
  });
}

/**
 * Fetch CTA cockpit
 */
export function useCTACockpit(): UseQueryResult<CTACockpit, Error> {
  return useQuery({
    queryKey: queryKeys.accounts.ctaCockpit(),
    queryFn: fetchCTACockpit,
    ...STATS_CACHE_CONFIG,
  });
}

/**
 * Fetch portfolio CTA summary
 */
export function usePortfolioCTASummary(
  all?: boolean,
): UseQueryResult<CTASummary, Error> {
  return useQuery({
    queryKey: queryKeys.accounts.portfolioCTASummary(all),
    queryFn: () => fetchPortfolioCTASummary(all),
    ...STATS_CACHE_CONFIG,
  });
}

// ============================================================================
// Account CTA Mutations
// ============================================================================

/**
 * Create a CTA for an account
 */
export function useCreateAccountCTA(
  accountId: number,
): UseMutationResult<AccountCTA, Error, CreateCTAPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCTAPayload) =>
      createAccountCTA(accountId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.ctas(accountId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.portfolioCTAs(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.ctaCockpit(),
      });
    },
  });
}

/**
 * Update a CTA
 */
export function useUpdateAccountCTA(
  accountId: number,
  ctaId: number,
): UseMutationResult<AccountCTA, Error, UpdateCTAPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateCTAPayload) =>
      updateAccountCTA(accountId, ctaId, payload),
    onSuccess: (cta) => {
      queryClient.setQueryData(
        queryKeys.accounts.ctaDetail(accountId, ctaId),
        cta,
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.ctas(accountId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.portfolioCTAs(),
      });
    },
  });
}

/**
 * Delete a CTA
 */
export function useDeleteAccountCTA(
  accountId: number,
): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ctaId: number) => deleteAccountCTA(accountId, ctaId),
    onSuccess: (_, ctaId) => {
      queryClient.removeQueries({
        queryKey: queryKeys.accounts.ctaDetail(accountId, ctaId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.ctas(accountId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.portfolioCTAs(),
      });
    },
  });
}

/**
 * Close a CTA
 */
export function useCloseAccountCTA(
  accountId: number,
  ctaId: number,
): UseMutationResult<
  AccountCTA,
  Error,
  { outcome: CTAOutcome; resolutionNotes?: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ outcome, resolutionNotes }) =>
      closeAccountCTA(accountId, ctaId, outcome, resolutionNotes),
    onSuccess: (cta) => {
      queryClient.setQueryData(
        queryKeys.accounts.ctaDetail(accountId, ctaId),
        cta,
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.ctas(accountId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.portfolioCTAs(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.ctaCockpit(),
      });
    },
  });
}

/**
 * Snooze a CTA
 */
export function useSnoozeAccountCTA(
  accountId: number,
  ctaId: number,
): UseMutationResult<AccountCTA, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (snoozeUntil: string) =>
      snoozeAccountCTA(accountId, ctaId, snoozeUntil),
    onSuccess: (cta) => {
      queryClient.setQueryData(
        queryKeys.accounts.ctaDetail(accountId, ctaId),
        cta,
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.ctas(accountId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.portfolioCTAs(),
      });
    },
  });
}

// ============================================================================
// Account Success Plan Queries
// ============================================================================

/**
 * Fetch success plans for an account
 */
export function useAccountSuccessPlans(
  accountId?: number,
  params?: Omit<ListSuccessPlansParams, 'accountId'>,
): UseQueryResult<AccountSuccessPlan[], Error> {
  return useQuery({
    queryKey: accountId
      ? queryKeys.accounts.successPlanList(accountId, params)
      : queryKeys.accounts.all,
    enabled: Boolean(accountId),
    queryFn: () => fetchAccountSuccessPlans(accountId as number, params),
    ...CRM_CACHE_CONFIG,
  });
}

/**
 * Fetch a single success plan
 */
export function useAccountSuccessPlan(
  accountId?: number,
  planId?: number,
): UseQueryResult<AccountSuccessPlan, Error> {
  return useQuery({
    queryKey:
      accountId && planId
        ? queryKeys.accounts.successPlanDetail(accountId, planId)
        : queryKeys.accounts.all,
    enabled: Boolean(accountId && planId),
    queryFn: () =>
      fetchAccountSuccessPlan(accountId as number, planId as number),
    ...CRM_CACHE_CONFIG,
  });
}

/**
 * Fetch portfolio success plans
 */
export function usePortfolioSuccessPlans(
  params?: ListSuccessPlansParams,
): UseQueryResult<AccountSuccessPlan[], Error> {
  return useQuery({
    queryKey: queryKeys.accounts.portfolioSuccessPlans(params),
    queryFn: () => fetchPortfolioSuccessPlans(params),
    ...CRM_CACHE_CONFIG,
  });
}

// ============================================================================
// Account Success Plan Mutations
// ============================================================================

/**
 * Create a success plan for an account
 */
export function useCreateAccountSuccessPlan(
  accountId: number,
): UseMutationResult<AccountSuccessPlan, Error, CreateSuccessPlanPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSuccessPlanPayload) =>
      createAccountSuccessPlan(accountId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.successPlans(accountId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.portfolioSuccessPlans(),
      });
    },
  });
}

/**
 * Update a success plan
 */
export function useUpdateAccountSuccessPlan(
  accountId: number,
  planId: number,
): UseMutationResult<AccountSuccessPlan, Error, UpdateSuccessPlanPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateSuccessPlanPayload) =>
      updateAccountSuccessPlan(accountId, planId, payload),
    onSuccess: (plan) => {
      queryClient.setQueryData(
        queryKeys.accounts.successPlanDetail(accountId, planId),
        plan,
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.successPlans(accountId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.portfolioSuccessPlans(),
      });
    },
  });
}

/**
 * Delete a success plan
 */
export function useDeleteAccountSuccessPlan(
  accountId: number,
): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (planId: number) => deleteAccountSuccessPlan(accountId, planId),
    onSuccess: (_, planId) => {
      queryClient.removeQueries({
        queryKey: queryKeys.accounts.successPlanDetail(accountId, planId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.successPlans(accountId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.portfolioSuccessPlans(),
      });
    },
  });
}

/**
 * Activate a success plan
 */
export function useActivateAccountSuccessPlan(
  accountId: number,
  planId: number,
): UseMutationResult<AccountSuccessPlan, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => activateAccountSuccessPlan(accountId, planId),
    onSuccess: (plan) => {
      queryClient.setQueryData(
        queryKeys.accounts.successPlanDetail(accountId, planId),
        plan,
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.successPlans(accountId),
      });
    },
  });
}

/**
 * Put a success plan on hold
 */
export function useHoldAccountSuccessPlan(
  accountId: number,
  planId: number,
): UseMutationResult<AccountSuccessPlan, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => holdAccountSuccessPlan(accountId, planId),
    onSuccess: (plan) => {
      queryClient.setQueryData(
        queryKeys.accounts.successPlanDetail(accountId, planId),
        plan,
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.successPlans(accountId),
      });
    },
  });
}

/**
 * Complete a success plan
 */
export function useCompleteAccountSuccessPlan(
  accountId: number,
  planId: number,
): UseMutationResult<AccountSuccessPlan, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => completeAccountSuccessPlan(accountId, planId),
    onSuccess: (plan) => {
      queryClient.setQueryData(
        queryKeys.accounts.successPlanDetail(accountId, planId),
        plan,
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.successPlans(accountId),
      });
    },
  });
}

/**
 * Add an objective to a success plan
 */
export function useAddSuccessPlanObjective(
  accountId: number,
  planId: number,
): UseMutationResult<AccountSuccessPlan, Error, CreateObjectivePayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateObjectivePayload) =>
      addSuccessPlanObjective(accountId, planId, payload),
    onSuccess: (plan) => {
      queryClient.setQueryData(
        queryKeys.accounts.successPlanDetail(accountId, planId),
        plan,
      );
    },
  });
}

/**
 * Update an objective
 */
export function useUpdateSuccessPlanObjective(
  accountId: number,
  planId: number,
  objectiveId: number,
): UseMutationResult<AccountSuccessPlan, Error, UpdateObjectivePayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateObjectivePayload) =>
      updateSuccessPlanObjective(accountId, planId, objectiveId, payload),
    onSuccess: (plan) => {
      queryClient.setQueryData(
        queryKeys.accounts.successPlanDetail(accountId, planId),
        plan,
      );
    },
  });
}

/**
 * Delete an objective
 */
export function useDeleteSuccessPlanObjective(
  accountId: number,
  planId: number,
): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (objectiveId: number) =>
      deleteSuccessPlanObjective(accountId, planId, objectiveId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.accounts.successPlanDetail(accountId, planId),
      });
    },
  });
}

/**
 * Add a task to an objective
 */
export function useAddObjectiveTask(
  accountId: number,
  planId: number,
  objectiveId: number,
): UseMutationResult<AccountSuccessPlan, Error, CreateTaskPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTaskPayload) =>
      addObjectiveTask(accountId, planId, objectiveId, payload),
    onSuccess: (plan) => {
      queryClient.setQueryData(
        queryKeys.accounts.successPlanDetail(accountId, planId),
        plan,
      );
    },
  });
}

/**
 * Update task status
 */
export function useUpdateObjectiveTaskStatus(
  accountId: number,
  planId: number,
  objectiveId: number,
  taskId: number,
): UseMutationResult<AccountSuccessPlan, Error, TaskStatus> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: TaskStatus) =>
      updateObjectiveTaskStatus(accountId, planId, objectiveId, taskId, status),
    onSuccess: (plan) => {
      queryClient.setQueryData(
        queryKeys.accounts.successPlanDetail(accountId, planId),
        plan,
      );
    },
  });
}

// ============================================================================
// Playbook Queries
// ============================================================================

/**
 * Fetch playbooks
 */
export function usePlaybooks(
  params?: ListPlaybooksParams,
): UseQueryResult<Playbook[], Error> {
  return useQuery({
    queryKey: queryKeys.playbooks.list(params),
    queryFn: () => fetchPlaybooks(params),
    ...CRM_CACHE_CONFIG,
  });
}

/**
 * Fetch a single playbook
 */
export function usePlaybook(id?: number): UseQueryResult<Playbook, Error> {
  return useQuery({
    queryKey: id ? queryKeys.playbooks.detail(id) : queryKeys.playbooks.all,
    enabled: Boolean(id),
    queryFn: () => fetchPlaybookById(id as number),
    ...CRM_CACHE_CONFIG,
  });
}

/**
 * Fetch playbook categories
 */
export function usePlaybookCategories(): UseQueryResult<
  PlaybookCategory[],
  Error
> {
  return useQuery({
    queryKey: queryKeys.playbooks.categories(),
    queryFn: fetchPlaybookCategories,
    staleTime: 60_000, // Categories change rarely
  });
}

/**
 * Fetch popular playbooks
 */
export function usePopularPlaybooks(
  limit?: number,
): UseQueryResult<Playbook[], Error> {
  return useQuery({
    queryKey: queryKeys.playbooks.popular(limit),
    queryFn: () => fetchPopularPlaybooks(limit),
    ...STATS_CACHE_CONFIG,
  });
}

// ============================================================================
// Playbook Mutations
// ============================================================================

/**
 * Create a playbook
 */
export function useCreatePlaybook(): UseMutationResult<
  Playbook,
  Error,
  CreatePlaybookPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePlaybookPayload) => createPlaybook(payload),
    onSuccess: (playbook) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.all });
      queryClient.setQueryData(
        queryKeys.playbooks.detail(playbook.id),
        playbook,
      );
    },
  });
}

/**
 * Update a playbook
 */
export function useUpdatePlaybook(
  id: number,
): UseMutationResult<Playbook, Error, UpdatePlaybookPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdatePlaybookPayload) => updatePlaybook(id, payload),
    onSuccess: (playbook) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.all });
      queryClient.setQueryData(queryKeys.playbooks.detail(id), playbook);
    },
  });
}

/**
 * Delete a playbook
 */
export function useDeletePlaybook(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deletePlaybook(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.all });
      queryClient.removeQueries({ queryKey: queryKeys.playbooks.detail(id) });
    },
  });
}

/**
 * Clone a playbook
 */
export function useClonePlaybook(
  id: number,
): UseMutationResult<Playbook, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newName: string) => clonePlaybook(id, newName),
    onSuccess: (playbook) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playbooks.all });
      queryClient.setQueryData(
        queryKeys.playbooks.detail(playbook.id),
        playbook,
      );
    },
  });
}

/**
 * Add a task to a playbook
 */
export function useAddPlaybookTask(
  playbookId: number,
): UseMutationResult<Playbook, Error, CreatePlaybookTaskPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePlaybookTaskPayload) =>
      addPlaybookTask(playbookId, payload),
    onSuccess: (playbook) => {
      queryClient.setQueryData(
        queryKeys.playbooks.detail(playbookId),
        playbook,
      );
    },
  });
}

/**
 * Update a playbook task
 */
export function useUpdatePlaybookTask(
  playbookId: number,
  taskId: number,
): UseMutationResult<Playbook, Error, UpdatePlaybookTaskPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdatePlaybookTaskPayload) =>
      updatePlaybookTask(playbookId, taskId, payload),
    onSuccess: (playbook) => {
      queryClient.setQueryData(
        queryKeys.playbooks.detail(playbookId),
        playbook,
      );
    },
  });
}

/**
 * Delete a playbook task
 */
export function useDeletePlaybookTask(
  playbookId: number,
): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: number) => deletePlaybookTask(playbookId, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.playbooks.detail(playbookId),
      });
    },
  });
}

/**
 * Reorder playbook tasks
 */
export function useReorderPlaybookTasks(
  playbookId: number,
): UseMutationResult<Playbook, Error, number[]> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskIds: number[]) =>
      reorderPlaybookTasks(playbookId, taskIds),
    onSuccess: (playbook) => {
      queryClient.setQueryData(
        queryKeys.playbooks.detail(playbookId),
        playbook,
      );
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
  // Account Health Score types
  AccountHealthScore,
  HealthScoreHistory,
  PortfolioHealthSummary,
  CalculateHealthScorePayload,
  ListAccountsByHealthParams,
  HealthCategory,
  // Account CTA types
  AccountCTA,
  CreateCTAPayload,
  UpdateCTAPayload,
  ListCTAsParams,
  CTASummary,
  CTACockpit,
  CTAType,
  CTAPriority,
  CTAStatus,
  CTAOutcome,
  // Account Success Plan types
  AccountSuccessPlan,
  CreateSuccessPlanPayload,
  UpdateSuccessPlanPayload,
  ListSuccessPlansParams,
  CreateObjectivePayload,
  UpdateObjectivePayload,
  CreateTaskPayload,
  SuccessPlanStatus,
  ObjectiveStatus,
  TaskStatus,
  TaskPriority,
  // Playbook types
  Playbook,
  CreatePlaybookPayload,
  UpdatePlaybookPayload,
  ListPlaybooksParams,
  CreatePlaybookTaskPayload,
  UpdatePlaybookTaskPayload,
  PlaybookCategory,
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
