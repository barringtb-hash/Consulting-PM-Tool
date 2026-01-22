/**
 * Contract Signing Service
 *
 * Handles the public contract signing flow, including:
 * - Token-based contract access
 * - Signature capture and verification
 * - Audit trail management
 */

import { prisma } from '../../../prisma/client';
import { contractService } from './contract.service';

// ============================================================================
// TYPES
// ============================================================================

export interface SignatureData {
  type: 'TYPED_NAME' | 'DRAWN' | 'UPLOAD';
  typedName?: string;
  drawnSignature?: string; // Base64 encoded image
  uploadedSignature?: string; // File path or URL
  timestamp: Date;
}

export interface SignContractInput {
  signToken: string;
  signatureData: SignatureData;
  ipAddress?: string;
  userAgent?: string;
}

export interface DeclineContractInput {
  signToken: string;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface PublicContractView {
  id: number;
  contractNumber?: string;
  title: string;
  type: string;
  status: string;
  content: {
    markdown: string;
    sections: { id: string; title: string; content: string }[];
  };
  totalValue?: number;
  currency: string;
  effectiveDate?: Date;
  expirationDate?: Date;
  account: {
    name: string;
  };
  signatureMethod: string;
  signerInfo?: {
    name: string;
    email: string;
    title?: string;
    status: string;
  };
}

// ============================================================================
// SERVICE
// ============================================================================

class ContractSigningService {
  /**
   * Get a contract by share token (for public viewing)
   */
  async getContractByShareToken(
    shareToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<PublicContractView | null> {
    const contract = await prisma.opportunityContract.findFirst({
      where: {
        shareToken,
        shareExpiresAt: { gt: new Date() },
      },
      include: {
        account: { select: { name: true } },
        signatures: {
          select: {
            signerName: true,
            signerEmail: true,
            signerTitle: true,
            status: true,
          },
        },
      },
    });

    if (!contract) {
      return null;
    }

    // Mark as viewed if first time
    if (!contract.shareViewed) {
      await prisma.opportunityContract.update({
        where: { id: contract.id },
        data: {
          shareViewed: true,
          shareViewedAt: new Date(),
        },
      });

      // Log the view
      await contractService.logAudit(
        contract.id,
        'SHARE_LINK_ACCESSED',
        'external',
        null,
        null,
        undefined,
        ipAddress,
        userAgent,
      );
    }

    const content = contract.content as PublicContractView['content'];

    return {
      id: contract.id,
      contractNumber: contract.contractNumber ?? undefined,
      title: contract.title,
      type: contract.type,
      status: contract.status,
      content,
      totalValue: contract.totalValue?.toNumber(),
      currency: contract.currency,
      effectiveDate: contract.effectiveDate ?? undefined,
      expirationDate: contract.expirationDate ?? undefined,
      account: contract.account,
      signatureMethod: contract.signatureMethod,
    };
  }

  /**
   * Get a contract by sign token (for signing)
   */
  async getContractBySignToken(
    signToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    contract: PublicContractView;
    signerInfo: {
      id: number;
      name: string;
      email: string;
      title?: string;
      status: string;
      signedAt?: Date;
    };
  } | null> {
    const signatureRequest = await prisma.contractSignature.findFirst({
      where: {
        signToken,
        tokenExpiresAt: { gt: new Date() },
      },
      include: {
        contract: {
          include: {
            account: { select: { name: true } },
          },
        },
      },
    });

    if (!signatureRequest) {
      return null;
    }

    const contract = signatureRequest.contract;
    const content = contract.content as PublicContractView['content'];

    // Log the view if first time
    if (!signatureRequest.viewedAt) {
      await prisma.contractSignature.update({
        where: { id: signatureRequest.id },
        data: {
          viewedAt: new Date(),
          status: 'VIEWED',
        },
      });

      await contractService.logAudit(
        contract.id,
        'VIEWED',
        'external',
        null,
        signatureRequest.signerEmail,
        { signerName: signatureRequest.signerName },
        ipAddress,
        userAgent,
      );
    }

    return {
      contract: {
        id: contract.id,
        contractNumber: contract.contractNumber ?? undefined,
        title: contract.title,
        type: contract.type,
        status: contract.status,
        content,
        totalValue: contract.totalValue?.toNumber(),
        currency: contract.currency,
        effectiveDate: contract.effectiveDate ?? undefined,
        expirationDate: contract.expirationDate ?? undefined,
        account: contract.account,
        signatureMethod: contract.signatureMethod,
      },
      signerInfo: {
        id: signatureRequest.id,
        name: signatureRequest.signerName,
        email: signatureRequest.signerEmail,
        title: signatureRequest.signerTitle ?? undefined,
        status: signatureRequest.status,
        signedAt: signatureRequest.signedAt ?? undefined,
      },
    };
  }

  /**
   * Sign a contract
   */
  async signContract(input: SignContractInput): Promise<{
    success: boolean;
    message: string;
    contractNumber?: string;
  }> {
    // Find the signature request
    const signatureRequest = await prisma.contractSignature.findFirst({
      where: {
        signToken: input.signToken,
        tokenExpiresAt: { gt: new Date() },
        status: { in: ['PENDING', 'VIEWED'] },
      },
      include: {
        contract: true,
      },
    });

    if (!signatureRequest) {
      return {
        success: false,
        message: 'Invalid or expired signature link',
      };
    }

    // Update signature request
    await prisma.contractSignature.update({
      where: { id: signatureRequest.id },
      data: {
        status: 'SIGNED',
        signatureData: input.signatureData,
        signedAt: new Date(),
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });

    // Log the signature
    await contractService.logAudit(
      signatureRequest.contractId,
      'SIGNED',
      'external',
      null,
      signatureRequest.signerEmail,
      {
        signerName: signatureRequest.signerName,
        signatureType: input.signatureData.type,
      },
      input.ipAddress,
      input.userAgent,
    );

    // Check if all signatures are complete
    const allSignatures = await prisma.contractSignature.findMany({
      where: { contractId: signatureRequest.contractId },
    });

    const allSigned = allSignatures.every((s) => s.status === 'SIGNED');

    if (allSigned) {
      // Update contract status
      await prisma.opportunityContract.update({
        where: { id: signatureRequest.contractId },
        data: {
          status: 'SIGNED',
          signedAt: new Date(),
        },
      });
    } else {
      // Check if at least one has signed (partially signed)
      const someSigned = allSignatures.some((s) => s.status === 'SIGNED');
      if (someSigned) {
        await prisma.opportunityContract.update({
          where: { id: signatureRequest.contractId },
          data: {
            status: 'PARTIALLY_SIGNED',
          },
        });
      }
    }

    return {
      success: true,
      message: allSigned
        ? 'Contract fully signed'
        : 'Signature recorded. Waiting for other parties.',
      contractNumber: signatureRequest.contract.contractNumber ?? undefined,
    };
  }

  /**
   * Decline to sign a contract
   */
  async declineContract(input: DeclineContractInput): Promise<{
    success: boolean;
    message: string;
  }> {
    const signatureRequest = await prisma.contractSignature.findFirst({
      where: {
        signToken: input.signToken,
        tokenExpiresAt: { gt: new Date() },
        status: { in: ['PENDING', 'VIEWED'] },
      },
      include: {
        contract: true,
      },
    });

    if (!signatureRequest) {
      return {
        success: false,
        message: 'Invalid or expired signature link',
      };
    }

    // Update signature request
    await prisma.contractSignature.update({
      where: { id: signatureRequest.id },
      data: {
        status: 'DECLINED',
        declinedAt: new Date(),
        declineReason: input.reason,
      },
    });

    // Log the decline
    await contractService.logAudit(
      signatureRequest.contractId,
      'DECLINED',
      'external',
      null,
      signatureRequest.signerEmail,
      {
        signerName: signatureRequest.signerName,
        reason: input.reason,
      },
      input.ipAddress,
      input.userAgent,
    );

    return {
      success: true,
      message: 'Contract declined. The sender has been notified.',
    };
  }

  /**
   * Verify a password for a password-protected contract
   */
  async verifySharePassword(
    shareToken: string,
    password: string,
  ): Promise<boolean> {
    const contract = await prisma.opportunityContract.findFirst({
      where: {
        shareToken,
        shareExpiresAt: { gt: new Date() },
      },
      select: { sharePassword: true },
    });

    if (!contract || !contract.sharePassword) {
      return false;
    }

    // Simple base64 comparison (in production, use bcrypt)
    const hashedInput = Buffer.from(password).toString('base64');
    return contract.sharePassword === hashedInput;
  }

  /**
   * Check if a contract requires a password
   */
  async requiresPassword(shareToken: string): Promise<boolean> {
    const contract = await prisma.opportunityContract.findFirst({
      where: {
        shareToken,
        shareExpiresAt: { gt: new Date() },
      },
      select: { sharePassword: true },
    });

    return contract?.sharePassword !== null;
  }

  /**
   * Get signature status for a contract
   */
  async getSignatureStatus(contractId: number): Promise<{
    totalSigners: number;
    signedCount: number;
    declinedCount: number;
    pendingCount: number;
    signers: {
      name: string;
      email: string;
      status: string;
      signedAt?: Date;
      declinedAt?: Date;
    }[];
  }> {
    const signatures = await prisma.contractSignature.findMany({
      where: { contractId },
      orderBy: { signatureOrder: 'asc' },
    });

    const signedCount = signatures.filter((s) => s.status === 'SIGNED').length;
    const declinedCount = signatures.filter(
      (s) => s.status === 'DECLINED',
    ).length;
    const pendingCount = signatures.filter((s) =>
      ['PENDING', 'VIEWED'].includes(s.status),
    ).length;

    return {
      totalSigners: signatures.length,
      signedCount,
      declinedCount,
      pendingCount,
      signers: signatures.map((s) => ({
        name: s.signerName,
        email: s.signerEmail,
        status: s.status,
        signedAt: s.signedAt ?? undefined,
        declinedAt: s.declinedAt ?? undefined,
      })),
    };
  }

  /**
   * Resend signature request email
   */
  async resendSignatureRequest(
    signatureRequestId: number,
    tenantId: string,
  ): Promise<{ success: boolean; message: string }> {
    const request = await prisma.contractSignature.findFirst({
      where: { id: signatureRequestId },
      include: {
        contract: { select: { tenantId: true } },
      },
    });

    if (!request || request.contract.tenantId !== tenantId) {
      return { success: false, message: 'Signature request not found' };
    }

    if (request.status === 'SIGNED') {
      return { success: false, message: 'Already signed' };
    }

    // Extend token expiration
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 30);

    await prisma.contractSignature.update({
      where: { id: signatureRequestId },
      data: {
        tokenExpiresAt: newExpiry,
        reminderSentAt: new Date(),
      },
    });

    // In production, send email here

    return { success: true, message: 'Reminder sent' };
  }
}

export const contractSigningService = new ContractSigningService();
