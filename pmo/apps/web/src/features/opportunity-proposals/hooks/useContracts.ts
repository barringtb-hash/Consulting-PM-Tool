/**
 * Contract Hooks
 *
 * React Query hooks for managing opportunity contracts.
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
  Contract,
  CreateContractInput,
  UpdateContractInput,
  GenerateContractInput,
  CreateShareLinkInput,
  ShareLinkResult,
  SignerInput,
  SendForSignaturesResult,
  SignatureStatusResult,
  ContractAuditLogEntry,
  PublicContractView,
  SignContractInput,
  SignContractResult,
  DeclineContractInput,
} from '../types';

// ============================================================================
// Query Keys
// ============================================================================

export const contractQueryKeys = {
  all: ['contracts'] as const,
  opportunity: (opportunityId: number) =>
    [...contractQueryKeys.all, 'opportunity', opportunityId] as const,
  detail: (opportunityId: number, contractId: number) =>
    [...contractQueryKeys.opportunity(opportunityId), contractId] as const,
  signatures: (opportunityId: number, contractId: number) =>
    [
      ...contractQueryKeys.detail(opportunityId, contractId),
      'signatures',
    ] as const,
  audit: (opportunityId: number, contractId: number) =>
    [...contractQueryKeys.detail(opportunityId, contractId), 'audit'] as const,
  public: (shareToken: string) =>
    [...contractQueryKeys.all, 'public', shareToken] as const,
  sign: (signToken: string) =>
    [...contractQueryKeys.all, 'sign', signToken] as const,
};

// ============================================================================
// Response Types
// ============================================================================

interface ContractsResponse {
  data: Contract[];
}

interface ContractResponse {
  data: Contract;
}

interface SignaturesResponse {
  data: SignatureStatusResult;
}

interface AuditResponse {
  data: ContractAuditLogEntry[];
}

interface ShareLinkResponse {
  data: ShareLinkResult;
}

interface PublicContractResponse {
  data: PublicContractView;
}

interface SigningContractResponse {
  data: {
    contract: PublicContractView;
    signerInfo: {
      id: number;
      name: string;
      email: string;
      title?: string;
      status: string;
      signedAt?: string;
    };
  };
}

// Extended timeout for AI operations (60 seconds)
const AI_TIMEOUT = 60000;

// ============================================================================
// Queries - Authenticated
// ============================================================================

/**
 * Fetch all contracts for an opportunity
 */
export function useContracts(
  opportunityId: number,
): UseQueryResult<Contract[], Error> {
  return useQuery({
    queryKey: contractQueryKeys.opportunity(opportunityId),
    queryFn: async () => {
      const response = await http.get<ContractsResponse>(
        `/api/crm/opportunities/${opportunityId}/contracts`,
      );
      return response.data ?? [];
    },
    enabled: Boolean(opportunityId),
  });
}

/**
 * Fetch a single contract
 */
export function useContract(
  opportunityId: number,
  contractId: number,
): UseQueryResult<Contract, Error> {
  return useQuery({
    queryKey: contractQueryKeys.detail(opportunityId, contractId),
    queryFn: async () => {
      const response = await http.get<ContractResponse>(
        `/api/crm/opportunities/${opportunityId}/contracts/${contractId}`,
      );
      return response.data;
    },
    enabled: Boolean(opportunityId) && Boolean(contractId),
  });
}

/**
 * Fetch signature status for a contract
 */
export function useContractSignatures(
  opportunityId: number,
  contractId: number,
): UseQueryResult<SignatureStatusResult, Error> {
  return useQuery({
    queryKey: contractQueryKeys.signatures(opportunityId, contractId),
    queryFn: async () => {
      const response = await http.get<SignaturesResponse>(
        `/api/crm/opportunities/${opportunityId}/contracts/${contractId}/signatures`,
      );
      return response.data;
    },
    enabled: Boolean(opportunityId) && Boolean(contractId),
    refetchInterval: 30000, // Poll every 30 seconds for signature updates
  });
}

/**
 * Fetch audit log for a contract
 */
export function useContractAuditLog(
  opportunityId: number,
  contractId: number,
): UseQueryResult<ContractAuditLogEntry[], Error> {
  return useQuery({
    queryKey: contractQueryKeys.audit(opportunityId, contractId),
    queryFn: async () => {
      const response = await http.get<AuditResponse>(
        `/api/crm/opportunities/${opportunityId}/contracts/${contractId}/audit`,
      );
      return response.data ?? [];
    },
    enabled: Boolean(opportunityId) && Boolean(contractId),
  });
}

// ============================================================================
// Queries - Public (No Auth)
// ============================================================================

/**
 * Fetch a public contract by share token
 */
export function usePublicContract(
  shareToken: string,
): UseQueryResult<PublicContractView, Error> {
  return useQuery({
    queryKey: contractQueryKeys.public(shareToken),
    queryFn: async () => {
      const response = await http.get<PublicContractResponse>(
        `/api/public/contracts/${shareToken}`,
      );
      return response.data;
    },
    enabled: Boolean(shareToken),
    retry: false, // Don't retry on 401 (password required) or 404
  });
}

/**
 * Fetch a contract for signing by sign token
 */
export function useContractForSigning(
  signToken: string,
): UseQueryResult<SigningContractResponse['data'], Error> {
  return useQuery({
    queryKey: contractQueryKeys.sign(signToken),
    queryFn: async () => {
      const response = await http.get<SigningContractResponse>(
        `/api/public/contracts/sign/${signToken}`,
      );
      return response.data;
    },
    enabled: Boolean(signToken),
    retry: false,
  });
}

// ============================================================================
// Mutations - Contract Management
// ============================================================================

interface CreateContractPayload {
  opportunityId: number;
  input: CreateContractInput;
}

/**
 * Create a new contract manually
 */
export function useCreateContract(): UseMutationResult<
  Contract,
  Error,
  CreateContractPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, input }) => {
      const response = await http.post<ContractResponse>(
        `/api/crm/opportunities/${opportunityId}/contracts`,
        input,
      );
      return response.data;
    },
    onSuccess: (_, { opportunityId }) => {
      queryClient.invalidateQueries({
        queryKey: contractQueryKeys.opportunity(opportunityId),
      });
    },
  });
}

interface UpdateContractPayload {
  opportunityId: number;
  contractId: number;
  input: UpdateContractInput;
}

/**
 * Update a contract
 */
export function useUpdateContract(): UseMutationResult<
  Contract,
  Error,
  UpdateContractPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, contractId, input }) => {
      const response = await http.patch<ContractResponse>(
        `/api/crm/opportunities/${opportunityId}/contracts/${contractId}`,
        input,
      );
      return response.data;
    },
    onSuccess: (data, { opportunityId, contractId }) => {
      queryClient.setQueryData(
        contractQueryKeys.detail(opportunityId, contractId),
        data,
      );
      queryClient.invalidateQueries({
        queryKey: contractQueryKeys.opportunity(opportunityId),
      });
    },
  });
}

interface DeleteContractPayload {
  opportunityId: number;
  contractId: number;
}

/**
 * Delete a contract
 */
export function useDeleteContract(): UseMutationResult<
  void,
  Error,
  DeleteContractPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, contractId }) => {
      await http.delete<void>(
        `/api/crm/opportunities/${opportunityId}/contracts/${contractId}`,
      );
    },
    onSuccess: (_, { opportunityId }) => {
      queryClient.invalidateQueries({
        queryKey: contractQueryKeys.opportunity(opportunityId),
      });
    },
  });
}

interface GenerateContractPayload {
  opportunityId: number;
  input: GenerateContractInput;
}

/**
 * Generate an AI-powered contract
 */
export function useGenerateContract(): UseMutationResult<
  Contract,
  Error,
  GenerateContractPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, input }) => {
      const response = await http.post<ContractResponse>(
        `/api/crm/opportunities/${opportunityId}/contracts/generate`,
        input,
        { timeout: AI_TIMEOUT },
      );
      return response.data;
    },
    onSuccess: (_, { opportunityId }) => {
      queryClient.invalidateQueries({
        queryKey: contractQueryKeys.opportunity(opportunityId),
      });
    },
  });
}

// ============================================================================
// Mutations - Sharing & Signing
// ============================================================================

interface CreateShareLinkPayload {
  opportunityId: number;
  contractId: number;
  input?: CreateShareLinkInput;
}

/**
 * Create a share link for a contract
 */
export function useCreateShareLink(): UseMutationResult<
  ShareLinkResult,
  Error,
  CreateShareLinkPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, contractId, input }) => {
      const response = await http.post<ShareLinkResponse>(
        `/api/crm/opportunities/${opportunityId}/contracts/${contractId}/share`,
        input ?? {},
      );
      return response.data;
    },
    onSuccess: (_, { opportunityId, contractId }) => {
      queryClient.invalidateQueries({
        queryKey: contractQueryKeys.detail(opportunityId, contractId),
      });
    },
  });
}

interface SendForSignaturesPayload {
  opportunityId: number;
  contractId: number;
  signers: SignerInput[];
}

/**
 * Send a contract for signatures
 */
export function useSendForSignatures(): UseMutationResult<
  SendForSignaturesResult,
  Error,
  SendForSignaturesPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, contractId, signers }) => {
      const response = await http.post<{ data: SendForSignaturesResult }>(
        `/api/crm/opportunities/${opportunityId}/contracts/${contractId}/send`,
        { signers },
      );
      return response.data;
    },
    onSuccess: (_, { opportunityId, contractId }) => {
      queryClient.invalidateQueries({
        queryKey: contractQueryKeys.detail(opportunityId, contractId),
      });
      queryClient.invalidateQueries({
        queryKey: contractQueryKeys.signatures(opportunityId, contractId),
      });
      queryClient.invalidateQueries({
        queryKey: contractQueryKeys.opportunity(opportunityId),
      });
    },
  });
}

interface VoidContractPayload {
  opportunityId: number;
  contractId: number;
  reason?: string;
}

/**
 * Void a contract
 */
export function useVoidContract(): UseMutationResult<
  Contract,
  Error,
  VoidContractPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, contractId, reason }) => {
      const response = await http.post<ContractResponse>(
        `/api/crm/opportunities/${opportunityId}/contracts/${contractId}/void`,
        { reason },
      );
      return response.data;
    },
    onSuccess: (data, { opportunityId, contractId }) => {
      queryClient.setQueryData(
        contractQueryKeys.detail(opportunityId, contractId),
        data,
      );
      queryClient.invalidateQueries({
        queryKey: contractQueryKeys.opportunity(opportunityId),
      });
    },
  });
}

interface ResendSignatureRequestPayload {
  opportunityId: number;
  contractId: number;
  signatureId: number;
}

/**
 * Resend a signature request email
 */
export function useResendSignatureRequest(): UseMutationResult<
  { success: boolean; message: string },
  Error,
  ResendSignatureRequestPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ opportunityId, contractId, signatureId }) => {
      const response = await http.post<{
        data: { success: boolean; message: string };
      }>(
        `/api/crm/opportunities/${opportunityId}/contracts/${contractId}/signatures/${signatureId}/resend`,
      );
      return response.data;
    },
    onSuccess: (_, { opportunityId, contractId }) => {
      queryClient.invalidateQueries({
        queryKey: contractQueryKeys.signatures(opportunityId, contractId),
      });
    },
  });
}

// ============================================================================
// Mutations - Public Signing
// ============================================================================

interface VerifySharePasswordPayload {
  shareToken: string;
  password: string;
}

/**
 * Verify password for a password-protected contract
 */
export function useVerifySharePassword(): UseMutationResult<
  PublicContractView,
  Error,
  VerifySharePasswordPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shareToken, password }) => {
      const response = await http.post<PublicContractResponse>(
        `/api/public/contracts/${shareToken}/verify`,
        { password },
      );
      return response.data;
    },
    onSuccess: (data, { shareToken }) => {
      queryClient.setQueryData(contractQueryKeys.public(shareToken), data);
    },
  });
}

interface SignContractPayload {
  signToken: string;
  input: SignContractInput;
}

/**
 * Sign a contract
 */
export function useSignContract(): UseMutationResult<
  SignContractResult,
  Error,
  SignContractPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ signToken, input }) => {
      const response = await http.post<{ data: SignContractResult }>(
        `/api/public/contracts/sign/${signToken}`,
        input,
      );
      return response.data;
    },
    onSuccess: (_, { signToken }) => {
      queryClient.invalidateQueries({
        queryKey: contractQueryKeys.sign(signToken),
      });
    },
  });
}

interface DeclineContractPayload {
  signToken: string;
  input?: DeclineContractInput;
}

/**
 * Decline to sign a contract
 */
export function useDeclineContract(): UseMutationResult<
  SignContractResult,
  Error,
  DeclineContractPayload
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ signToken, input }) => {
      const response = await http.post<{ data: SignContractResult }>(
        `/api/public/contracts/sign/${signToken}/decline`,
        input ?? {},
      );
      return response.data;
    },
    onSuccess: (_, { signToken }) => {
      queryClient.invalidateQueries({
        queryKey: contractQueryKeys.sign(signToken),
      });
    },
  });
}
