/**
 * Opportunity Proposals Hooks
 *
 * Barrel exports for all proposal-related React Query hooks.
 */

// Cost Estimate hooks
export {
  estimateQueryKeys,
  useCostEstimates,
  useCostEstimate,
  useEstimateLineItems,
  useCreateEstimate,
  useUpdateEstimate,
  useDeleteEstimate,
  useGenerateEstimate,
  useApproveEstimate,
  useRejectEstimate,
  useCloneEstimate,
  useCreateLineItem,
  useUpdateLineItem,
  useDeleteLineItem,
  useBulkCreateLineItems,
  useReorderLineItems,
} from './useCostEstimates';

// SOW hooks
export {
  sowQueryKeys,
  useSOWs,
  useSOW,
  useGenerateSOW,
  useUpdateSOW,
  useUpdateSOWSection,
  useDeleteSOW,
  useExportSOW,
  useApproveSOW,
  useSendSOW,
  useRegenerateSOWSection,
} from './useSOWs';

// Contract hooks
export {
  contractQueryKeys,
  useContracts,
  useContract,
  useContractSignatures,
  useContractAuditLog,
  usePublicContract,
  useContractForSigning,
  useCreateContract,
  useUpdateContract,
  useDeleteContract,
  useGenerateContract,
  useCreateShareLink,
  useSendForSignatures,
  useVoidContract,
  useResendSignatureRequest,
  useVerifySharePassword,
  useSignContract,
  useDeclineContract,
} from './useContracts';
