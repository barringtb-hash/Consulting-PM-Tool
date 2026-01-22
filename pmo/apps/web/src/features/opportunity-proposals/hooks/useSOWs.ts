/**
 * SOW (Statement of Work) Hooks
 *
 * React Query hooks for managing opportunity SOWs.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query';
import { http } from '../../../api/http';
import type {
  OpportunitySOW,
  GenerateSOWInput,
  UpdateSOWInput,
  UpdateSOWSectionInput,
} from '../types';

// ============================================================================
// Query Keys
// ============================================================================

export const sowQueryKeys = {
  all: ['sows'] as const,
  opportunity: (opportunityId: number) =>
    [...sowQueryKeys.all, 'opportunity', opportunityId] as const,
  detail: (opportunityId: number, sowId: number) =>
    [...sowQueryKeys.opportunity(opportunityId), sowId] as const,
};

// ============================================================================
// Response Types
// ============================================================================

interface SOWsResponse {
  data: OpportunitySOW[];
}

interface SOWResponse {
  data: OpportunitySOW;
}

interface ExportResponse {
  data: {
    content: string;
    format: string;
    filename: string;
  };
}

// Extended timeout for AI operations (90 seconds for SOW generation)
const AI_TIMEOUT = 90000;

// ============================================================================
// Queries
// ============================================================================

/**
 * Fetch all SOWs for an opportunity
 */
export function useSOWs(
  opportunityId: number,
): UseQueryResult<OpportunitySOW[], Error> {
  return useQuery({
    queryKey: sowQueryKeys.opportunity(opportunityId),
    queryFn: async () => {
      const response = await http.get<SOWsResponse>(
        `/api/crm/opportunities/${opportunityId}/sows`,
      );
      return response.data ?? [];
    },
    enabled: Boolean(opportunityId),
  });
}

/**
 * Fetch a single SOW
 */
export function useSOW(
  opportunityId: number,
  sowId: number,
): UseQueryResult<OpportunitySOW, Error> {
  return useQuery({
    queryKey: sowQueryKeys.detail(opportunityId, sowId),
    queryFn: async () => {
      const response = await http.get<SOWResponse>(
        `/api/crm/opportunities/${opportunityId}/sows/${sowId}`,
      );
      return response.data;
    },
    enabled: Boolean(opportunityId) && Boolean(sowId),
  });
}

// ============================================================================
// Mutations
// ============================================================================

interface GenerateSOWPayload {
  opportunityId: number;
  input?: GenerateSOWInput;
}

/**
 * Generate an AI-powered SOW
 */
export function useGenerateSOW(): UseMutationResult<
  OpportunitySOW,
  Error,
  GenerateSOWPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, input }) => {
      const response = await http.post<SOWResponse>(
        `/api/crm/opportunities/${opportunityId}/sows/generate`,
        input ?? {},
        { timeout: AI_TIMEOUT },
      );
      return response.data;
    },
    onSuccess: (_, { opportunityId }) => {
      queryClient.invalidateQueries({
        queryKey: sowQueryKeys.opportunity(opportunityId),
      });
    },
  });
}

interface UpdateSOWPayload {
  opportunityId: number;
  sowId: number;
  input: UpdateSOWInput;
}

/**
 * Update a SOW
 */
export function useUpdateSOW(): UseMutationResult<
  OpportunitySOW,
  Error,
  UpdateSOWPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, sowId, input }) => {
      const response = await http.patch<SOWResponse>(
        `/api/crm/opportunities/${opportunityId}/sows/${sowId}`,
        input,
      );
      return response.data;
    },
    onSuccess: (data, { opportunityId, sowId }) => {
      queryClient.setQueryData(sowQueryKeys.detail(opportunityId, sowId), data);
      queryClient.invalidateQueries({
        queryKey: sowQueryKeys.opportunity(opportunityId),
      });
    },
  });
}

interface UpdateSOWSectionPayload {
  opportunityId: number;
  sowId: number;
  sectionId: string;
  input: UpdateSOWSectionInput;
}

/**
 * Update a specific section of a SOW
 */
export function useUpdateSOWSection(): UseMutationResult<
  OpportunitySOW,
  Error,
  UpdateSOWSectionPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, sowId, sectionId, input }) => {
      const response = await http.patch<SOWResponse>(
        `/api/crm/opportunities/${opportunityId}/sows/${sowId}/sections/${sectionId}`,
        input,
      );
      return response.data;
    },
    onSuccess: (data, { opportunityId, sowId }) => {
      queryClient.setQueryData(sowQueryKeys.detail(opportunityId, sowId), data);
      queryClient.invalidateQueries({
        queryKey: sowQueryKeys.opportunity(opportunityId),
      });
    },
  });
}

interface DeleteSOWPayload {
  opportunityId: number;
  sowId: number;
}

/**
 * Delete a SOW
 */
export function useDeleteSOW(): UseMutationResult<
  void,
  Error,
  DeleteSOWPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, sowId }) => {
      await http.delete<void>(
        `/api/crm/opportunities/${opportunityId}/sows/${sowId}`,
      );
    },
    onSuccess: (_, { opportunityId }) => {
      queryClient.invalidateQueries({
        queryKey: sowQueryKeys.opportunity(opportunityId),
      });
    },
  });
}

interface ExportSOWPayload {
  opportunityId: number;
  sowId: number;
  format: 'markdown' | 'html' | 'text';
}

/**
 * Export a SOW in different formats
 */
export function useExportSOW(): UseMutationResult<
  { content: string; format: string; filename: string },
  Error,
  ExportSOWPayload
> {
  return useMutation({
    mutationFn: async ({ opportunityId, sowId, format }) => {
      const response = await http.get<ExportResponse>(
        `/api/crm/opportunities/${opportunityId}/sows/${sowId}/export?format=${format}`,
      );
      return response.data;
    },
  });
}

interface ApproveSOWPayload {
  opportunityId: number;
  sowId: number;
}

/**
 * Approve a SOW
 */
export function useApproveSOW(): UseMutationResult<
  OpportunitySOW,
  Error,
  ApproveSOWPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, sowId }) => {
      const response = await http.post<SOWResponse>(
        `/api/crm/opportunities/${opportunityId}/sows/${sowId}/approve`,
      );
      return response.data;
    },
    onSuccess: (data, { opportunityId, sowId }) => {
      queryClient.setQueryData(sowQueryKeys.detail(opportunityId, sowId), data);
      queryClient.invalidateQueries({
        queryKey: sowQueryKeys.opportunity(opportunityId),
      });
    },
  });
}

interface SendSOWPayload {
  opportunityId: number;
  sowId: number;
  email: string;
  message?: string;
}

/**
 * Send a SOW to a client
 */
export function useSendSOW(): UseMutationResult<
  { success: boolean; message: string },
  Error,
  SendSOWPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, sowId, email, message }) => {
      const response = await http.post<{
        data: { success: boolean; message: string };
      }>(`/api/crm/opportunities/${opportunityId}/sows/${sowId}/send`, {
        email,
        message,
      });
      return response.data;
    },
    onSuccess: (_, { opportunityId, sowId }) => {
      queryClient.invalidateQueries({
        queryKey: sowQueryKeys.detail(opportunityId, sowId),
      });
      queryClient.invalidateQueries({
        queryKey: sowQueryKeys.opportunity(opportunityId),
      });
    },
  });
}

interface RegenerateSOWSectionPayload {
  opportunityId: number;
  sowId: number;
  sectionId: string;
  instructions?: string;
}

/**
 * Regenerate a specific section of a SOW using AI
 */
export function useRegenerateSOWSection(): UseMutationResult<
  OpportunitySOW,
  Error,
  RegenerateSOWSectionPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, sowId, sectionId, instructions }) => {
      const response = await http.post<SOWResponse>(
        `/api/crm/opportunities/${opportunityId}/sows/${sowId}/sections/${sectionId}/regenerate`,
        { instructions },
        { timeout: AI_TIMEOUT },
      );
      return response.data;
    },
    onSuccess: (data, { opportunityId, sowId }) => {
      queryClient.setQueryData(sowQueryKeys.detail(opportunityId, sowId), data);
      queryClient.invalidateQueries({
        queryKey: sowQueryKeys.opportunity(opportunityId),
      });
    },
  });
}
