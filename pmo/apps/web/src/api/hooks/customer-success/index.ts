/**
 * Customer Success React Query Hooks
 *
 * Provides React Query hooks for the Customer Success Platform.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import * as customerSuccessApi from '../../customer-success';
import type {
  HealthScoreListFilters,
  CTAListFilters,
  PlaybookListFilters,
  SuccessPlanListFilters,
  CreateCTAInput,
  UpdateCTAInput,
  CreatePlaybookInput,
} from '../../customer-success';

// =============================================================================
// HEALTH SCORE HOOKS
// =============================================================================

export function useHealthScores(filters?: HealthScoreListFilters) {
  return useQuery({
    queryKey: queryKeys.customerSuccess.healthScores.list(filters),
    queryFn: () => customerSuccessApi.listHealthScores(filters),
  });
}

export function usePortfolioHealthSummary() {
  return useQuery({
    queryKey: queryKeys.customerSuccess.healthScores.summary(),
    queryFn: () => customerSuccessApi.getPortfolioHealthSummary(),
  });
}

export function useClientHealthScore(clientId: number, projectId?: number) {
  return useQuery({
    queryKey: queryKeys.customerSuccess.healthScores.client(
      clientId,
      projectId,
    ),
    queryFn: () => customerSuccessApi.getClientHealthScore(clientId, projectId),
    enabled: !!clientId,
  });
}

export function useHealthScoreHistory(
  clientId: number,
  projectId?: number,
  days?: number,
) {
  return useQuery({
    queryKey: queryKeys.customerSuccess.healthScores.history(
      clientId,
      projectId,
      days,
    ),
    queryFn: () =>
      customerSuccessApi.getHealthScoreHistory(clientId, projectId, days),
    enabled: !!clientId,
  });
}

export function useCalculateHealthScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      clientId,
      input,
    }: {
      clientId: number;
      input: {
        projectId?: number;
        auto?: boolean;
        usageScore?: number;
        supportScore?: number;
        engagementScore?: number;
        sentimentScore?: number;
        financialScore?: number;
      };
    }) => customerSuccessApi.calculateHealthScore(clientId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customerSuccess.healthScores.all(),
      });
    },
  });
}

// =============================================================================
// CTA HOOKS
// =============================================================================

export function useCTAs(filters?: CTAListFilters) {
  return useQuery({
    queryKey: queryKeys.customerSuccess.ctas.list(filters),
    queryFn: () => customerSuccessApi.listCTAs(filters),
  });
}

export function useCockpit() {
  return useQuery({
    queryKey: queryKeys.customerSuccess.ctas.cockpit(),
    queryFn: () => customerSuccessApi.getCockpit(),
  });
}

export function useCTASummary(all?: boolean) {
  return useQuery({
    queryKey: queryKeys.customerSuccess.ctas.summary(all),
    queryFn: () => customerSuccessApi.getCTASummary(all),
  });
}

export function useCTA(id: number) {
  return useQuery({
    queryKey: queryKeys.customerSuccess.ctas.detail(id),
    queryFn: () => customerSuccessApi.getCTA(id),
    enabled: !!id,
  });
}

export function useCreateCTA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCTAInput) => customerSuccessApi.createCTA(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customerSuccess.ctas.all(),
      });
    },
  });
}

export function useUpdateCTA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateCTAInput }) =>
      customerSuccessApi.updateCTA(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customerSuccess.ctas.all(),
      });
    },
  });
}

export function useDeleteCTA() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => customerSuccessApi.deleteCTA(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customerSuccess.ctas.all(),
      });
    },
  });
}

// =============================================================================
// PLAYBOOK HOOKS
// =============================================================================

export function usePlaybooks(filters?: PlaybookListFilters) {
  return useQuery({
    queryKey: queryKeys.customerSuccess.playbooks.list(filters),
    queryFn: () => customerSuccessApi.listPlaybooks(filters),
  });
}

export function usePlaybook(id: number) {
  return useQuery({
    queryKey: queryKeys.customerSuccess.playbooks.detail(id),
    queryFn: () => customerSuccessApi.getPlaybook(id),
    enabled: !!id,
  });
}

export function usePlaybookCategories() {
  return useQuery({
    queryKey: queryKeys.customerSuccess.playbooks.categories(),
    queryFn: () => customerSuccessApi.getPlaybookCategories(),
  });
}

export function usePopularPlaybooks(limit?: number) {
  return useQuery({
    queryKey: queryKeys.customerSuccess.playbooks.popular(limit),
    queryFn: () => customerSuccessApi.getPopularPlaybooks(limit),
  });
}

export function useCreatePlaybook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePlaybookInput) =>
      customerSuccessApi.createPlaybook(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customerSuccess.playbooks.all(),
      });
    },
  });
}

export function useSeedDefaultPlaybooks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => customerSuccessApi.seedDefaultPlaybooks(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customerSuccess.playbooks.all(),
      });
    },
  });
}

// =============================================================================
// SUCCESS PLAN HOOKS
// =============================================================================

export function useSuccessPlans(filters?: SuccessPlanListFilters) {
  return useQuery({
    queryKey: queryKeys.customerSuccess.successPlans.list(filters),
    queryFn: () => customerSuccessApi.listSuccessPlans(filters),
  });
}

export function useSuccessPlan(id: number) {
  return useQuery({
    queryKey: queryKeys.customerSuccess.successPlans.detail(id),
    queryFn: () => customerSuccessApi.getSuccessPlan(id),
    enabled: !!id,
  });
}

export function useCreateSuccessPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      input: Parameters<typeof customerSuccessApi.createSuccessPlan>[0],
    ) => customerSuccessApi.createSuccessPlan(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customerSuccess.successPlans.all(),
      });
    },
  });
}

export function useUpdateSuccessPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number;
      input: Parameters<typeof customerSuccessApi.updateSuccessPlan>[1];
    }) => customerSuccessApi.updateSuccessPlan(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customerSuccess.successPlans.all(),
      });
    },
  });
}

export function useDeleteSuccessPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => customerSuccessApi.deleteSuccessPlan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customerSuccess.successPlans.all(),
      });
    },
  });
}
