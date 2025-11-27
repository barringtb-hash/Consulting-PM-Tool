/**
 * Leads Module - React Query Hooks
 *
 * This module provides all React Query hooks for lead management.
 * Includes lead CRUD operations and conversion to clients/projects.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { queryKeys } from '../queryKeys';
import {
  convertLead,
  createLead,
  deleteLead,
  fetchLeadById,
  fetchLeads,
  updateLead,
  type Lead,
  type LeadConversionPayload,
  type LeadConversionResult,
  type LeadFilters,
  type LeadPayload,
  type LeadUpdatePayload,
} from '../../leads';

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch all leads with optional filters
 */
export function useLeads(filters?: LeadFilters): UseQueryResult<Lead[], Error> {
  return useQuery({
    queryKey: queryKeys.leads.list(filters),
    queryFn: () => fetchLeads(filters),
  });
}

/**
 * Fetch a single lead by ID
 */
export function useLead(leadId?: number): UseQueryResult<Lead, Error> {
  return useQuery({
    queryKey: leadId ? queryKeys.leads.detail(leadId) : queryKeys.leads.all,
    enabled: Boolean(leadId),
    queryFn: () => fetchLeadById(leadId as number),
  });
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new lead
 */
export function useCreateLead(): UseMutationResult<Lead, Error, LeadPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LeadPayload) => createLead(payload),
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.setQueryData(queryKeys.leads.detail(lead.id), lead);
    },
  });
}

/**
 * Update an existing lead
 */
export function useUpdateLead(
  leadId: number,
): UseMutationResult<Lead, Error, LeadUpdatePayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LeadUpdatePayload) => updateLead(leadId, payload),
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.setQueryData(queryKeys.leads.detail(leadId), lead);
    },
  });
}

/**
 * Convert a lead to a client and optionally a project
 */
export function useConvertLead(
  leadId: number,
): UseMutationResult<LeadConversionResult, Error, LeadConversionPayload> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LeadConversionPayload) =>
      convertLead(leadId, payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      if (result.clientId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.clients.detail(result.clientId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.contacts.byClient(result.clientId),
        });
      }
      queryClient.setQueryData(queryKeys.leads.detail(leadId), result.lead);
    },
  });
}

/**
 * Delete a lead
 */
export function useDeleteLead(): UseMutationResult<void, Error, number> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (leadId: number) => deleteLead(leadId),
    onSuccess: (_, leadId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.leads.all });
      queryClient.removeQueries({ queryKey: queryKeys.leads.detail(leadId) });
    },
  });
}

// ============================================================================
// Re-exports
// ============================================================================

export type {
  Lead,
  LeadConversionPayload,
  LeadConversionResult,
  LeadFilters,
  LeadPayload,
  LeadUpdatePayload,
} from '../../leads';
