/**
 * Opportunity Proposals Types
 *
 * TypeScript interfaces for Cost Estimates, SOWs, and Contracts.
 */

// ============================================================================
// ENUMS
// ============================================================================

export type EstimateType =
  | 'FIXED_PRICE'
  | 'TIME_AND_MATERIALS'
  | 'RETAINER'
  | 'HYBRID';
export type EstimateStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED';
export type LineItemCategory =
  | 'LABOR'
  | 'DELIVERABLE'
  | 'EXPENSE'
  | 'THIRD_PARTY'
  | 'CONTINGENCY'
  | 'DISCOUNT';
export type SOWStatus =
  | 'DRAFT'
  | 'IN_REVIEW'
  | 'APPROVED'
  | 'SENT'
  | 'SIGNED'
  | 'EXPIRED';
export type ContractType =
  | 'MSA'
  | 'SOW'
  | 'MSA_WITH_SOW'
  | 'NDA'
  | 'CONSULTING_AGREEMENT'
  | 'RETAINER_AGREEMENT'
  | 'AMENDMENT';
export type ContractStatus =
  | 'DRAFT'
  | 'PENDING_SIGNATURE'
  | 'PARTIALLY_SIGNED'
  | 'SIGNED'
  | 'ACTIVE'
  | 'EXPIRED'
  | 'VOIDED'
  | 'TERMINATED';
export type SignatureMethod = 'TYPED_NAME' | 'DRAWN' | 'UPLOAD' | 'EXTERNAL';
export type SignerType =
  | 'CONSULTANT'
  | 'CLIENT_PRIMARY'
  | 'CLIENT_SECONDARY'
  | 'WITNESS';
export type SignatureStatus =
  | 'PENDING'
  | 'VIEWED'
  | 'SIGNED'
  | 'DECLINED'
  | 'EXPIRED';

// ============================================================================
// COST ESTIMATE TYPES
// ============================================================================

export interface EstimateLineItem {
  id: number;
  estimateId: number;
  category: LineItemCategory;
  name: string;
  description?: string;
  unitType?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  role?: string;
  hourlyRate?: number;
  estimatedHours?: number;
  aiGenerated: boolean;
  aiConfidence?: number;
  aiRationale?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CostEstimate {
  id: number;
  tenantId: string;
  opportunityId: number;
  name: string;
  version: number;
  estimateType: EstimateType;
  status: EstimateStatus;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  currency: string;
  validFrom?: string;
  validUntil?: string;
  notes?: string;
  assumptions?: string;
  exclusions?: string;
  aiGenerated: boolean;
  aiConfidence?: number;
  aiNotes?: string;
  createdById: number;
  approvedById?: number;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  lineItems?: EstimateLineItem[];
  createdBy?: { id: number; name: string };
  approvedBy?: { id: number; name: string };
}

export interface CreateEstimateInput {
  name: string;
  estimateType: EstimateType;
  currency?: string;
  validFrom?: string;
  validUntil?: string;
  notes?: string;
  assumptions?: string;
  exclusions?: string;
  discountPercent?: number;
  taxPercent?: number;
}

export interface UpdateEstimateInput {
  name?: string;
  status?: EstimateStatus;
  discountPercent?: number;
  taxPercent?: number;
  validFrom?: string;
  validUntil?: string;
  notes?: string;
  assumptions?: string;
  exclusions?: string;
}

export interface CreateLineItemInput {
  category: LineItemCategory;
  name: string;
  description?: string;
  unitType?: string;
  quantity: number;
  unitPrice: number;
  role?: string;
  hourlyRate?: number;
  estimatedHours?: number;
  sortOrder?: number;
}

export interface UpdateLineItemInput {
  category?: LineItemCategory;
  name?: string;
  description?: string;
  unitType?: string;
  quantity?: number;
  unitPrice?: number;
  role?: string;
  hourlyRate?: number;
  estimatedHours?: number;
  sortOrder?: number;
}

export interface AIEstimateGenerationInput {
  estimateType?: EstimateType;
  projectDescription?: string;
  budget?: number;
  timeline?: string;
}

export interface AIGeneratedEstimate {
  estimate: CostEstimate;
  assumptions: string[];
  risks: string[];
  confidence: number;
}

// ============================================================================
// SOW TYPES
// ============================================================================

export interface SOWSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface SOWContent {
  markdown: string;
  sections: SOWSection[];
  metadata?: Record<string, unknown>;
}

export interface OpportunitySOW {
  id: number;
  tenantId: string;
  opportunityId: number;
  estimateId?: number;
  name: string;
  version: number;
  status: SOWStatus;
  content: SOWContent;
  generatedBy: 'AI' | 'TEMPLATE' | 'MANUAL';
  templateUsed?: string;
  clientSnapshot?: Record<string, unknown>;
  validFrom?: string;
  validUntil?: string;
  createdById: number;
  approvedById?: number;
  approvedAt?: string;
  sentAt?: string;
  signedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: number; name: string };
  approvedBy?: { id: number; name: string };
  estimate?: CostEstimate;
}

export interface GenerateSOWInput {
  estimateId?: number;
  templateId?: string;
  customInstructions?: string;
}

export interface UpdateSOWInput {
  name?: string;
  status?: SOWStatus;
  validFrom?: string;
  validUntil?: string;
}

export interface UpdateSOWSectionInput {
  title?: string;
  content: string;
}

// ============================================================================
// CONTRACT TYPES
// ============================================================================

export interface ContractSection {
  id: string;
  title: string;
  content: string;
}

export interface ContractContent {
  markdown: string;
  sections: ContractSection[];
}

export interface SignatureRequest {
  id: number;
  contractId: number;
  signerType: SignerType;
  signerName: string;
  signerEmail: string;
  signerTitle?: string;
  signerCompany?: string;
  signatureOrder: number;
  signToken: string;
  tokenExpiresAt: string;
  status: SignatureStatus;
  viewedAt?: string;
  signedAt?: string;
  declinedAt?: string;
  declineReason?: string;
  signatureData?: SignatureData;
  signedIpAddress?: string;
  signedUserAgent?: string;
  reminderSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SignatureData {
  type: 'TYPED_NAME' | 'DRAWN' | 'UPLOAD';
  typedName?: string;
  drawnSignature?: string;
  uploadedSignature?: string;
  timestamp: string;
}

export interface Contract {
  id: number;
  tenantId: string;
  opportunityId: number;
  accountId: number;
  contractNumber: string;
  type: ContractType;
  title: string;
  status: ContractStatus;
  content: ContractContent;
  totalValue?: number;
  currency: string;
  paymentTerms?: string;
  effectiveDate?: string;
  expirationDate?: string;
  autoRenewal: boolean;
  renewalTerms?: string;
  shareToken?: string;
  shareExpiresAt?: string;
  sharePassword?: string;
  shareViewed: boolean;
  shareViewedAt?: string;
  signatureMethod: SignatureMethod;
  version: number;
  parentContractId?: number;
  sowId?: number;
  estimateId?: number;
  sentAt?: string;
  viewedAt?: string;
  signedAt?: string;
  voidedAt?: string;
  voidReason?: string;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  account?: { id: number; name: string };
  createdBy?: { id: number; name: string };
  signatureRequests?: SignatureRequest[];
  sow?: OpportunitySOW;
  estimate?: CostEstimate;
}

export interface CreateContractInput {
  type: ContractType;
  title: string;
  sowId?: number;
  totalValue?: number;
  currency?: string;
  paymentTerms?: string;
  effectiveDate?: string;
  expirationDate?: string;
  signatureMethod?: SignatureMethod;
}

export interface UpdateContractInput {
  title?: string;
  status?: ContractStatus;
  totalValue?: number;
  paymentTerms?: string;
  effectiveDate?: string;
  expirationDate?: string;
  autoRenewal?: boolean;
  renewalTerms?: string;
}

export interface GenerateContractInput {
  type: ContractType;
  sowId?: number;
  customInstructions?: string;
  companyName?: string;
  companyAddress?: string;
}

export interface CreateShareLinkInput {
  expiresInDays?: number;
  password?: string;
}

export interface ShareLinkResult {
  shareToken: string;
  shareUrl: string;
  expiresAt: string;
  passwordProtected: boolean;
}

export interface SignerInput {
  name: string;
  email: string;
  title?: string;
  company?: string;
  signerType: SignerType;
}

export interface SendForSignaturesResult {
  contract: Contract;
  signers: SignatureRequest[];
  message: string;
}

export interface SignatureStatusResult {
  totalSigners: number;
  signedCount: number;
  declinedCount: number;
  pendingCount: number;
  signers: {
    name: string;
    email: string;
    status: SignatureStatus;
    signedAt?: string;
    declinedAt?: string;
  }[];
}

export interface ContractAuditLogEntry {
  id: number;
  contractId: number;
  action: string;
  actorType: string;
  actorId?: number;
  actorName?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ============================================================================
// PUBLIC CONTRACT TYPES (for signing)
// ============================================================================

export interface PublicContractView {
  id: number;
  contractNumber: string;
  title: string;
  type: ContractType;
  status: ContractStatus;
  content: ContractContent;
  totalValue?: number;
  currency: string;
  effectiveDate?: string;
  expirationDate?: string;
  account: { name: string };
  signatureMethod: SignatureMethod;
  signerInfo?: {
    id: number;
    name: string;
    email: string;
    title?: string;
    status: SignatureStatus;
    signedAt?: string;
  };
}

export interface SignContractInput {
  signatureData: {
    type: 'TYPED_NAME' | 'DRAWN' | 'UPLOAD';
    typedName?: string;
    drawnSignature?: string;
    uploadedSignature?: string;
  };
}

export interface SignContractResult {
  success: boolean;
  message: string;
  contractNumber?: string;
}

export interface DeclineContractInput {
  reason?: string;
}
