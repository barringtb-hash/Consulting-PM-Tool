/**
 * Contract Service
 *
 * Manages contract generation, CRUD operations, and share link management.
 * Supports multiple contract types (MSA, SOW, NDA, etc.)
 */

import { prisma } from '../../../prisma/client';
import { llmService } from '../../../services/llm.service';
import { randomBytes } from 'crypto';
import type {
  ContractType,
  ContractStatus,
  SignatureMethod,
} from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface ContractSection {
  id: string;
  title: string;
  content: string;
}

export interface ContractContent {
  markdown: string;
  sections: ContractSection[];
  metadata: {
    generatedAt: Date;
    generatedBy: 'AI' | 'TEMPLATE' | 'MANUAL';
    templateUsed?: string;
  };
}

export interface CreateContractInput {
  opportunityId: number;
  accountId: number;
  tenantId: string;
  createdById: number;
  type: ContractType;
  title: string;
  sowId?: number;
  totalValue?: number;
  currency?: string;
  paymentTerms?: string;
  effectiveDate?: Date;
  expirationDate?: Date;
  signatureMethod?: SignatureMethod;
}

export interface UpdateContractInput {
  title?: string;
  status?: ContractStatus;
  content?: ContractContent;
  totalValue?: number;
  paymentTerms?: string;
  effectiveDate?: Date;
  expirationDate?: Date;
  autoRenewal?: boolean;
  renewalTerms?: string;
}

export interface GenerateContractInput {
  opportunityId: number;
  accountId: number;
  tenantId: string;
  createdById: number;
  type: ContractType;
  sowId?: number;
  customInstructions?: string;
  companyName?: string;
  companyAddress?: string;
}

export interface ShareLinkInput {
  contractId: number;
  expiresInDays?: number;
  password?: string;
}

// ============================================================================
// CONTRACT TEMPLATES
// ============================================================================

const CONTRACT_SECTIONS: Record<ContractType, { id: string; title: string }[]> =
  {
    MSA: [
      { id: 'parties', title: 'Parties and Definitions' },
      { id: 'services', title: 'Scope of Services' },
      { id: 'term', title: 'Term and Termination' },
      { id: 'payment', title: 'Payment Terms' },
      { id: 'ip', title: 'Intellectual Property' },
      { id: 'confidentiality', title: 'Confidentiality' },
      { id: 'liability', title: 'Limitation of Liability' },
      { id: 'indemnification', title: 'Indemnification' },
      { id: 'general', title: 'General Provisions' },
      { id: 'signatures', title: 'Signatures' },
    ],
    SOW: [
      { id: 'parties', title: 'Parties' },
      { id: 'background', title: 'Background' },
      { id: 'scope', title: 'Scope of Work' },
      { id: 'deliverables', title: 'Deliverables' },
      { id: 'timeline', title: 'Timeline' },
      { id: 'fees', title: 'Fees and Payment' },
      { id: 'acceptance', title: 'Acceptance Criteria' },
      { id: 'signatures', title: 'Signatures' },
    ],
    MSA_WITH_SOW: [
      { id: 'parties', title: 'Parties and Definitions' },
      { id: 'msa_terms', title: 'Master Agreement Terms' },
      { id: 'scope', title: 'Scope of Work' },
      { id: 'deliverables', title: 'Deliverables' },
      { id: 'timeline', title: 'Timeline' },
      { id: 'payment', title: 'Payment Terms' },
      { id: 'ip', title: 'Intellectual Property' },
      { id: 'confidentiality', title: 'Confidentiality' },
      { id: 'liability', title: 'Limitation of Liability' },
      { id: 'termination', title: 'Termination' },
      { id: 'general', title: 'General Provisions' },
      { id: 'signatures', title: 'Signatures' },
    ],
    NDA: [
      { id: 'parties', title: 'Parties' },
      { id: 'purpose', title: 'Purpose' },
      { id: 'definition', title: 'Definition of Confidential Information' },
      { id: 'obligations', title: 'Obligations of Receiving Party' },
      { id: 'exclusions', title: 'Exclusions' },
      { id: 'term', title: 'Term' },
      { id: 'remedies', title: 'Remedies' },
      { id: 'general', title: 'General Provisions' },
      { id: 'signatures', title: 'Signatures' },
    ],
    CONSULTING_AGREEMENT: [
      { id: 'parties', title: 'Parties' },
      { id: 'engagement', title: 'Engagement' },
      { id: 'services', title: 'Services' },
      { id: 'compensation', title: 'Compensation' },
      { id: 'expenses', title: 'Expenses' },
      { id: 'term', title: 'Term and Termination' },
      { id: 'relationship', title: 'Independent Contractor Relationship' },
      { id: 'confidentiality', title: 'Confidentiality' },
      { id: 'ip', title: 'Intellectual Property' },
      { id: 'general', title: 'General Provisions' },
      { id: 'signatures', title: 'Signatures' },
    ],
    RETAINER_AGREEMENT: [
      { id: 'parties', title: 'Parties' },
      { id: 'services', title: 'Retainer Services' },
      { id: 'scope', title: 'Scope and Hours' },
      { id: 'fees', title: 'Retainer Fees' },
      { id: 'payment', title: 'Payment Terms' },
      { id: 'rollover', title: 'Hour Rollover Policy' },
      { id: 'term', title: 'Term and Renewal' },
      { id: 'termination', title: 'Termination' },
      { id: 'general', title: 'General Provisions' },
      { id: 'signatures', title: 'Signatures' },
    ],
    AMENDMENT: [
      { id: 'parties', title: 'Parties' },
      { id: 'recitals', title: 'Recitals' },
      { id: 'amendments', title: 'Amendments' },
      { id: 'effect', title: 'Effect of Amendment' },
      { id: 'signatures', title: 'Signatures' },
    ],
    OTHER: [
      { id: 'parties', title: 'Parties' },
      { id: 'terms', title: 'Terms and Conditions' },
      { id: 'general', title: 'General Provisions' },
      { id: 'signatures', title: 'Signatures' },
    ],
  };

// ============================================================================
// SERVICE
// ============================================================================

class ContractService {
  /**
   * Generate a unique contract number
   */
  private async generateContractNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await prisma.opportunityContract.count({
      where: {
        tenantId,
        contractNumber: { startsWith: `CTR-${year}` },
      },
    });
    return `CTR-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Generate a secure share token
   */
  private generateShareToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate a signature token
   */
  private generateSignToken(): string {
    return randomBytes(24).toString('base64url');
  }

  /**
   * Create a new contract
   */
  async createContract(input: CreateContractInput) {
    const contractNumber = await this.generateContractNumber(input.tenantId);

    const contract = await prisma.opportunityContract.create({
      data: {
        opportunityId: input.opportunityId,
        accountId: input.accountId,
        tenantId: input.tenantId,
        createdById: input.createdById,
        contractNumber,
        type: input.type,
        title: input.title,
        sowId: input.sowId,
        totalValue: input.totalValue,
        currency: input.currency || 'USD',
        paymentTerms: input.paymentTerms,
        effectiveDate: input.effectiveDate,
        expirationDate: input.expirationDate,
        signatureMethod: input.signatureMethod || 'TYPED_NAME',
        content: this.getEmptyContent(input.type),
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        opportunity: { select: { id: true, name: true } },
        account: { select: { id: true, name: true } },
        sow: { select: { id: true, name: true } },
      },
    });

    return contract;
  }

  /**
   * Get all contracts for an opportunity
   */
  async getContractsByOpportunity(opportunityId: number, tenantId: string) {
    const contracts = await prisma.opportunityContract.findMany({
      where: { opportunityId, tenantId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        account: { select: { id: true, name: true } },
        signatures: {
          select: {
            id: true,
            signerName: true,
            signerEmail: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return contracts;
  }

  /**
   * Get a single contract by ID
   */
  async getContractById(id: number, tenantId: string) {
    const contract = await prisma.opportunityContract.findFirst({
      where: { id, tenantId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        sentBy: { select: { id: true, name: true, email: true } },
        opportunity: {
          select: {
            id: true,
            name: true,
            description: true,
            amount: true,
          },
        },
        account: {
          select: {
            id: true,
            name: true,
            billingAddress: true,
          },
        },
        sow: {
          select: {
            id: true,
            name: true,
            content: true,
          },
        },
        signatures: {
          orderBy: { signatureOrder: 'asc' },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    return contract;
  }

  /**
   * Update a contract
   */
  async updateContract(
    id: number,
    tenantId: string,
    input: UpdateContractInput,
  ) {
    const current = await prisma.opportunityContract.findFirst({
      where: { id, tenantId },
    });

    if (!current) {
      throw new Error('Contract not found');
    }

    const contract = await prisma.opportunityContract.update({
      where: { id },
      data: {
        title: input.title,
        status: input.status,
        content: input.content,
        totalValue: input.totalValue,
        paymentTerms: input.paymentTerms,
        effectiveDate: input.effectiveDate,
        expirationDate: input.expirationDate,
        autoRenewal: input.autoRenewal,
        renewalTerms: input.renewalTerms,
        version: input.content ? current.version + 1 : current.version,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        opportunity: { select: { id: true, name: true } },
        account: { select: { id: true, name: true } },
      },
    });

    // Log the update
    await this.logAudit(id, 'UPDATED', 'user', current.createdById, null);

    return contract;
  }

  /**
   * Delete a contract
   */
  async deleteContract(id: number, tenantId: string) {
    const contract = await prisma.opportunityContract.findFirst({
      where: { id, tenantId },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    if (contract.status === 'SIGNED') {
      throw new Error('Cannot delete a signed contract');
    }

    await prisma.opportunityContract.delete({
      where: { id },
    });

    return { success: true };
  }

  /**
   * Generate an AI-powered contract
   */
  async generateContract(input: GenerateContractInput) {
    // Fetch opportunity and account details
    const opportunity = await prisma.opportunity.findFirst({
      where: { id: input.opportunityId, tenantId: input.tenantId },
      include: {
        account: true,
      },
    });

    if (!opportunity) {
      throw new Error('Opportunity not found');
    }

    // Get SOW if provided
    let sow = null;
    if (input.sowId) {
      sow = await prisma.opportunitySOW.findFirst({
        where: { id: input.sowId, tenantId: input.tenantId },
        include: {
          estimate: {
            include: { lineItems: true },
          },
        },
      });
    }

    // Generate contract content
    const prompt = this.buildGenerationPrompt({
      type: input.type,
      opportunityName: opportunity.name,
      opportunityDescription: opportunity.description || '',
      accountName: opportunity.account.name,
      accountAddress: (opportunity.account.billingAddress as object) || {},
      companyName: input.companyName || 'Consultant',
      companyAddress: input.companyAddress || '',
      sowContent: (sow?.content as object) || null,
      estimateTotal: sow?.estimate?.total.toNumber(),
      customInstructions: input.customInstructions,
    });

    const response = await llmService.complete(prompt, {
      maxTokens: 5000,
      temperature: 0.2,
    });

    const sections = this.parseGeneratedContent(response.content, input.type);
    const markdown = this.assembleSections(sections, input.type);

    const content: ContractContent = {
      markdown,
      sections,
      metadata: {
        generatedAt: new Date(),
        generatedBy: 'AI',
      },
    };

    // Create the contract
    const contractNumber = await this.generateContractNumber(input.tenantId);

    const contract = await prisma.opportunityContract.create({
      data: {
        opportunityId: input.opportunityId,
        accountId: input.accountId,
        tenantId: input.tenantId,
        createdById: input.createdById,
        contractNumber,
        type: input.type,
        title: `${this.getContractTypeName(input.type)} - ${opportunity.name}`,
        sowId: input.sowId,
        totalValue: sow?.estimate?.total,
        currency: 'USD',
        content,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        opportunity: { select: { id: true, name: true } },
        account: { select: { id: true, name: true } },
      },
    });

    // Log the creation
    await this.logAudit(
      contract.id,
      'CREATED',
      'user',
      input.createdById,
      null,
    );

    return contract;
  }

  /**
   * Create or update a share link for a contract
   */
  async createShareLink(
    contractId: number,
    tenantId: string,
    input: ShareLinkInput,
  ) {
    const contract = await prisma.opportunityContract.findFirst({
      where: { id: contractId, tenantId },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    const shareToken = this.generateShareToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays || 30));

    // Hash password if provided (simple hash for now)
    let sharePassword = null;
    if (input.password) {
      // In production, use bcrypt
      sharePassword = Buffer.from(input.password).toString('base64');
    }

    const updated = await prisma.opportunityContract.update({
      where: { id: contractId },
      data: {
        shareToken,
        shareExpiresAt: expiresAt,
        sharePassword,
        shareViewed: false,
        shareViewedAt: null,
      },
    });

    // Log the share link creation
    await this.logAudit(
      contractId,
      'SHARE_LINK_GENERATED',
      'user',
      contract.createdById,
      null,
    );

    return {
      shareToken: updated.shareToken,
      shareUrl: `/contracts/sign/${updated.shareToken}`,
      expiresAt: updated.shareExpiresAt,
    };
  }

  /**
   * Send contract for signatures
   */
  async sendForSignatures(
    contractId: number,
    tenantId: string,
    sentById: number,
    signers: {
      name: string;
      email: string;
      title?: string;
      company?: string;
      signerType:
        | 'CONSULTANT'
        | 'CLIENT_PRIMARY'
        | 'CLIENT_SECONDARY'
        | 'WITNESS';
    }[],
  ) {
    const contract = await prisma.opportunityContract.findFirst({
      where: { id: contractId, tenantId },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    // Create share link if not exists
    if (!contract.shareToken) {
      await this.createShareLink(contractId, tenantId, { contractId });
    }

    // Create signature requests
    const signatureRequests = [];
    for (let i = 0; i < signers.length; i++) {
      const signer = signers[i];
      const signToken = this.generateSignToken();
      const tokenExpiresAt = new Date();
      tokenExpiresAt.setDate(tokenExpiresAt.getDate() + 30);

      const request = await prisma.contractSignature.create({
        data: {
          contractId,
          signerType: signer.signerType,
          signerName: signer.name,
          signerEmail: signer.email,
          signerTitle: signer.title,
          signerCompany: signer.company,
          signToken,
          tokenExpiresAt,
          signatureOrder: i,
        },
      });

      signatureRequests.push(request);
    }

    // Update contract status
    await prisma.opportunityContract.update({
      where: { id: contractId },
      data: {
        status: 'PENDING_SIGNATURE',
        sentAt: new Date(),
        sentById,
      },
    });

    // Log the send action
    await this.logAudit(contractId, 'SENT', 'user', sentById, null, {
      signerCount: signers.length,
    });

    return {
      contract: await this.getContractById(contractId, tenantId),
      signatureRequests,
    };
  }

  /**
   * Void a contract
   */
  async voidContract(
    contractId: number,
    tenantId: string,
    voidedById: number,
    reason?: string,
  ) {
    const contract = await prisma.opportunityContract.findFirst({
      where: { id: contractId, tenantId },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    const updated = await prisma.opportunityContract.update({
      where: { id: contractId },
      data: {
        status: 'VOIDED',
        voidedAt: new Date(),
        voidedById,
        voidReason: reason,
      },
    });

    // Expire all pending signature requests
    await prisma.contractSignature.updateMany({
      where: { contractId, status: 'PENDING' },
      data: { status: 'EXPIRED' },
    });

    // Log the void action
    await this.logAudit(contractId, 'VOIDED', 'user', voidedById, null, {
      reason,
    });

    return updated;
  }

  /**
   * Get audit log for a contract
   */
  async getAuditLog(contractId: number, tenantId: string) {
    // Verify contract belongs to tenant
    const contract = await prisma.opportunityContract.findFirst({
      where: { id: contractId, tenantId },
    });

    if (!contract) {
      throw new Error('Contract not found');
    }

    const logs = await prisma.contractAuditLog.findMany({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
    });

    return logs;
  }

  /**
   * Log an audit event
   */
  async logAudit(
    contractId: number,
    action: string,
    actorType: string,
    actorId: number | null,
    actorEmail: string | null,
    metadata?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Get actor name if we have an ID
    let actorName = null;
    if (actorId) {
      const user = await prisma.user.findUnique({
        where: { id: actorId },
        select: { name: true },
      });
      actorName = user?.name;
    }

    await prisma.contractAuditLog.create({
      data: {
        contractId,
        action: action as
          | 'CREATED'
          | 'UPDATED'
          | 'SENT'
          | 'VIEWED'
          | 'SIGNED'
          | 'DECLINED'
          | 'VOIDED'
          | 'EXPIRED'
          | 'DOWNLOADED'
          | 'SHARE_LINK_GENERATED'
          | 'SHARE_LINK_ACCESSED',
        actorType,
        actorId,
        actorName,
        actorEmail,
        ipAddress,
        userAgent,
        metadata,
      },
    });
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private getEmptyContent(type: ContractType): ContractContent {
    const sections = CONTRACT_SECTIONS[type] || CONTRACT_SECTIONS.MSA;
    return {
      markdown: '',
      sections: sections.map((s) => ({
        id: s.id,
        title: s.title,
        content: `[${s.title} content to be added]`,
      })),
      metadata: {
        generatedAt: new Date(),
        generatedBy: 'MANUAL',
      },
    };
  }

  private getContractTypeName(type: ContractType): string {
    const names: Record<ContractType, string> = {
      MSA: 'Master Services Agreement',
      SOW: 'Statement of Work',
      MSA_WITH_SOW: 'Master Services Agreement with SOW',
      NDA: 'Non-Disclosure Agreement',
      CONSULTING_AGREEMENT: 'Consulting Agreement',
      RETAINER_AGREEMENT: 'Retainer Agreement',
      AMENDMENT: 'Contract Amendment',
      OTHER: 'Other Contract',
    };
    return names[type] || type;
  }

  private buildGenerationPrompt(params: {
    type: ContractType;
    opportunityName: string;
    opportunityDescription: string;
    accountName: string;
    accountAddress: object;
    companyName: string;
    companyAddress: string;
    sowContent: object | null;
    estimateTotal?: number;
    customInstructions?: string;
  }): string {
    const sections = CONTRACT_SECTIONS[params.type] || CONTRACT_SECTIONS.MSA;

    return `You are a legal contract expert. Generate a professional ${this.getContractTypeName(params.type)} for:

PROJECT: ${params.opportunityName}
DESCRIPTION: ${params.opportunityDescription || 'To be detailed in scope section'}

PARTIES:
- Provider: ${params.companyName}
  Address: ${params.companyAddress || '[Provider Address]'}
- Client: ${params.accountName}
  Address: ${JSON.stringify(params.accountAddress) || '[Client Address]'}

${params.estimateTotal ? `CONTRACT VALUE: $${params.estimateTotal.toLocaleString()}` : ''}

${params.sowContent ? `SOW CONTENT (for reference):\n${JSON.stringify(params.sowContent)}` : ''}

${params.customInstructions ? `ADDITIONAL INSTRUCTIONS:\n${params.customInstructions}` : ''}

Generate professional legal content for each section:
${sections.map((s) => `- ${s.id}: ${s.title}`).join('\n')}

Return a JSON array:
[
  {
    "id": "section_id",
    "title": "Section Title",
    "content": "Professional legal content in markdown format"
  }
]

Guidelines:
- Use clear, professional legal language
- Include standard protective clauses
- Reference specific project details where appropriate
- Use [PLACEHOLDER] for information that needs to be filled in
- For signatures section, include signature blocks for both parties
- Include dates and signature lines`;
  }

  private parseGeneratedContent(
    content: string,
    type: ContractType,
  ): ContractSection[] {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON found');
    } catch (error) {
      console.error('Failed to parse contract content:', error);
      const sections = CONTRACT_SECTIONS[type] || CONTRACT_SECTIONS.MSA;
      return sections.map((s) => ({
        id: s.id,
        title: s.title,
        content: `[AI generation failed - please add ${s.title} content manually]`,
      }));
    }
  }

  private assembleSections(
    sections: ContractSection[],
    type: ContractType,
  ): string {
    const lines: string[] = [];
    const typeName = this.getContractTypeName(type);

    lines.push(`# ${typeName}`);
    lines.push('');
    lines.push(`*Document generated on ${new Date().toLocaleDateString()}*`);
    lines.push('');
    lines.push('---');
    lines.push('');

    for (const section of sections) {
      lines.push(`## ${section.title}`);
      lines.push('');
      lines.push(section.content);
      lines.push('');
    }

    return lines.join('\n');
  }
}

export const contractService = new ContractService();
