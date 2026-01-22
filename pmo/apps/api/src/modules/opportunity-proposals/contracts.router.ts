/**
 * Contracts Routes
 *
 * REST API endpoints for contract management.
 * Includes CRUD, AI generation, sharing, and signature management.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { contractService } from './services/contract.service';
import { contractSigningService } from './services/contract-signing.service';
import {
  requireAuth,
  type AuthenticatedRequest,
} from '../../auth/auth.middleware';
import {
  tenantMiddleware,
  requireTenant,
  type TenantRequest,
} from '../../tenant/tenant.middleware';

const router = Router();

// All routes require authentication and tenant context
router.use(requireAuth, tenantMiddleware);

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const contractTypeEnum = z.enum([
  'MSA',
  'SOW',
  'MSA_WITH_SOW',
  'NDA',
  'CONSULTING_AGREEMENT',
  'RETAINER_AGREEMENT',
  'AMENDMENT',
  'OTHER',
]);

const contractStatusEnum = z.enum([
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'SENT',
  'PENDING_SIGNATURE',
  'PARTIALLY_SIGNED',
  'SIGNED',
  'FULLY_SIGNED',
  'VOIDED',
  'EXPIRED',
  'TERMINATED',
]);

const signatureMethodEnum = z.enum([
  'ELECTRONIC',
  'DIGITAL',
  'WET_INK',
  'CLICK_WRAP',
  'TYPED_NAME',
  'DRAWN',
]);

const createContractSchema = z.object({
  type: contractTypeEnum,
  title: z.string().min(1).max(200),
  sowId: z.number().int().positive().optional(),
  totalValue: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  paymentTerms: z.string().max(500).optional(),
  effectiveDate: z.coerce.date().optional(),
  expirationDate: z.coerce.date().optional(),
  signatureMethod: signatureMethodEnum.optional(),
});

const updateContractSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  status: contractStatusEnum.optional(),
  totalValue: z.number().positive().optional(),
  paymentTerms: z.string().max(500).optional(),
  effectiveDate: z.coerce.date().optional(),
  expirationDate: z.coerce.date().optional(),
  autoRenewal: z.boolean().optional(),
  renewalTerms: z.string().max(1000).optional(),
});

const generateContractSchema = z.object({
  type: contractTypeEnum,
  sowId: z.number().int().positive().optional(),
  customInstructions: z.string().max(2000).optional(),
  companyName: z.string().max(200).optional(),
  companyAddress: z.string().max(500).optional(),
});

const createShareLinkSchema = z.object({
  expiresInDays: z.number().int().positive().max(365).optional(),
  password: z.string().min(6).max(100).optional(),
});

const sendForSignaturesSchema = z.object({
  signers: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        email: z.string().email(),
        title: z.string().max(100).optional(),
        company: z.string().max(200).optional(),
        signerType: z.enum([
          'CONSULTANT',
          'CLIENT_PRIMARY',
          'CLIENT_SECONDARY',
          'WITNESS',
        ]),
      }),
    )
    .min(1)
    .max(10),
});

const voidContractSchema = z.object({
  reason: z.string().max(1000).optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/crm/opportunities/:opportunityId/contracts
 * List all contracts for an opportunity
 */
router.get(
  '/opportunities/:opportunityId/contracts',
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const opportunityId = parseInt(String(req.params.opportunityId), 10);
    if (isNaN(opportunityId)) {
      return res.status(400).json({ error: 'Invalid opportunity ID' });
    }

    const contracts = await contractService.getContractsByOpportunity(
      opportunityId,
      req.tenantContext!.tenantId,
    );

    res.json({ data: contracts });
  },
);

/**
 * POST /api/crm/opportunities/:opportunityId/contracts
 * Create a new contract manually
 */
router.post(
  '/opportunities/:opportunityId/contracts',
  requireTenant,
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    const opportunityId = parseInt(String(req.params.opportunityId), 10);
    if (isNaN(opportunityId)) {
      return res.status(400).json({ error: 'Invalid opportunity ID' });
    }

    const parsed = createContractSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    // Get the opportunity to get the accountId
    const opportunity = await prisma.opportunity.findFirst({
      where: { id: opportunityId, tenantId: req.tenantContext!.tenantId },
      select: { accountId: true },
    });

    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    const contract = await contractService.createContract({
      opportunityId,
      accountId: opportunity.accountId,
      tenantId: req.tenantContext!.tenantId,
      createdById: req.userId!,
      ...parsed.data,
    });

    res.status(201).json({ data: contract });
  },
);

/**
 * POST /api/crm/opportunities/:opportunityId/contracts/generate
 * Generate an AI-powered contract
 */
router.post(
  '/opportunities/:opportunityId/contracts/generate',
  requireTenant,
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    const opportunityId = parseInt(String(req.params.opportunityId), 10);
    if (isNaN(opportunityId)) {
      return res.status(400).json({ error: 'Invalid opportunity ID' });
    }

    const parsed = generateContractSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    // Get the opportunity to get the accountId
    const opportunity = await prisma.opportunity.findFirst({
      where: { id: opportunityId, tenantId: req.tenantContext!.tenantId },
      select: { accountId: true },
    });

    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    try {
      const contract = await contractService.generateContract({
        opportunityId,
        accountId: opportunity.accountId,
        tenantId: req.tenantContext!.tenantId,
        createdById: req.userId!,
        ...parsed.data,
      });

      res.status(201).json({ data: contract });
    } catch (error) {
      console.error('Contract generation failed:', error);
      res.status(500).json({
        error: 'Failed to generate contract',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

/**
 * GET /api/crm/opportunities/:opportunityId/contracts/:contractId
 * Get a single contract
 */
router.get(
  '/opportunities/:opportunityId/contracts/:contractId',
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const contractId = parseInt(String(req.params.contractId), 10);
    if (isNaN(contractId)) {
      return res.status(400).json({ error: 'Invalid contract ID' });
    }

    const contract = await contractService.getContractById(
      contractId,
      req.tenantContext!.tenantId,
    );

    if (!contract) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    res.json({ data: contract });
  },
);

/**
 * PATCH /api/crm/opportunities/:opportunityId/contracts/:contractId
 * Update a contract
 */
router.patch(
  '/opportunities/:opportunityId/contracts/:contractId',
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const contractId = parseInt(String(req.params.contractId), 10);
    if (isNaN(contractId)) {
      return res.status(400).json({ error: 'Invalid contract ID' });
    }

    const parsed = updateContractSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const contract = await contractService.updateContract(
      contractId,
      req.tenantContext!.tenantId,
      parsed.data,
    );

    res.json({ data: contract });
  },
);

/**
 * DELETE /api/crm/opportunities/:opportunityId/contracts/:contractId
 * Delete a contract
 */
router.delete(
  '/opportunities/:opportunityId/contracts/:contractId',
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const contractId = parseInt(String(req.params.contractId), 10);
    if (isNaN(contractId)) {
      return res.status(400).json({ error: 'Invalid contract ID' });
    }

    try {
      await contractService.deleteContract(
        contractId,
        req.tenantContext!.tenantId,
      );
      res.status(204).send();
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Delete failed',
      });
    }
  },
);

/**
 * POST /api/crm/opportunities/:opportunityId/contracts/:contractId/share
 * Create a share link for a contract
 */
router.post(
  '/opportunities/:opportunityId/contracts/:contractId/share',
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const contractId = parseInt(String(req.params.contractId), 10);
    if (isNaN(contractId)) {
      return res.status(400).json({ error: 'Invalid contract ID' });
    }

    const parsed = createShareLinkSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    try {
      const shareLink = await contractService.createShareLink(
        contractId,
        req.tenantContext!.tenantId,
        { contractId, ...parsed.data },
      );

      res.json({ data: shareLink });
    } catch (error) {
      res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to create share link',
      });
    }
  },
);

/**
 * POST /api/crm/opportunities/:opportunityId/contracts/:contractId/send
 * Send contract for signatures
 */
router.post(
  '/opportunities/:opportunityId/contracts/:contractId/send',
  requireTenant,
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    const contractId = parseInt(String(req.params.contractId), 10);
    if (isNaN(contractId)) {
      return res.status(400).json({ error: 'Invalid contract ID' });
    }

    const parsed = sendForSignaturesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    try {
      const result = await contractService.sendForSignatures(
        contractId,
        req.tenantContext!.tenantId,
        req.userId!,
        parsed.data.signers,
      );

      res.json({ data: result });
    } catch (error) {
      res.status(400).json({
        error:
          error instanceof Error ? error.message : 'Failed to send contract',
      });
    }
  },
);

/**
 * POST /api/crm/opportunities/:opportunityId/contracts/:contractId/void
 * Void a contract
 */
router.post(
  '/opportunities/:opportunityId/contracts/:contractId/void',
  requireTenant,
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    const contractId = parseInt(String(req.params.contractId), 10);
    if (isNaN(contractId)) {
      return res.status(400).json({ error: 'Invalid contract ID' });
    }

    const parsed = voidContractSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    try {
      const contract = await contractService.voidContract(
        contractId,
        req.tenantContext!.tenantId,
        req.userId!,
        parsed.data.reason,
      );

      res.json({ data: contract });
    } catch (error) {
      res.status(400).json({
        error:
          error instanceof Error ? error.message : 'Failed to void contract',
      });
    }
  },
);

/**
 * GET /api/crm/opportunities/:opportunityId/contracts/:contractId/audit
 * Get contract audit log
 */
router.get(
  '/opportunities/:opportunityId/contracts/:contractId/audit',
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const contractId = parseInt(String(req.params.contractId), 10);
    if (isNaN(contractId)) {
      return res.status(400).json({ error: 'Invalid contract ID' });
    }

    try {
      const auditLog = await contractService.getAuditLog(
        contractId,
        req.tenantContext!.tenantId,
      );

      res.json({ data: auditLog });
    } catch (error) {
      res.status(400).json({
        error:
          error instanceof Error ? error.message : 'Failed to get audit log',
      });
    }
  },
);

/**
 * GET /api/crm/opportunities/:opportunityId/contracts/:contractId/signatures
 * Get signature status for a contract
 */
router.get(
  '/opportunities/:opportunityId/contracts/:contractId/signatures',
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const contractId = parseInt(String(req.params.contractId), 10);
    if (isNaN(contractId)) {
      return res.status(400).json({ error: 'Invalid contract ID' });
    }

    try {
      const status =
        await contractSigningService.getSignatureStatus(contractId);
      res.json({ data: status });
    } catch (error) {
      res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get signature status',
      });
    }
  },
);

/**
 * POST /api/crm/opportunities/:opportunityId/contracts/:contractId/signatures/:signatureId/resend
 * Resend signature request
 */
router.post(
  '/opportunities/:opportunityId/contracts/:contractId/signatures/:signatureId/resend',
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const signatureId = parseInt(String(req.params.signatureId), 10);
    if (isNaN(signatureId)) {
      return res.status(400).json({ error: 'Invalid signature ID' });
    }

    const result = await contractSigningService.resendSignatureRequest(
      signatureId,
      req.tenantContext!.tenantId,
    );

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({ data: result });
  },
);

// Need to import prisma for the opportunity lookup
import { prisma } from '../../prisma/client';

export default router;
