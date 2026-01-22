/**
 * SOW (Statement of Work) Routes
 *
 * REST API endpoints for opportunity SOW management.
 * Includes CRUD operations and AI generation.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { sowGeneratorService } from './services/sow-generator.service';
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

const sowStatusEnum = z.enum([
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'SENT',
  'ACCEPTED',
  'REJECTED',
]);

const createSOWSchema = z.object({
  name: z.string().min(1).max(200),
  estimateId: z.number().int().positive().optional(),
});

const updateSOWSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  status: sowStatusEnum.optional(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
});

const updateSectionSchema = z.object({
  content: z.string().max(50000),
});

const generateSOWSchema = z.object({
  estimateId: z.number().int().positive().optional(),
  customInstructions: z.string().max(2000).optional(),
  companyName: z.string().max(200).optional(),
  consultantTitle: z.string().max(200).optional(),
});

const exportSOWSchema = z.object({
  format: z.enum(['markdown', 'html', 'text']).default('markdown'),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/crm/opportunities/:opportunityId/sows
 * List all SOWs for an opportunity
 */
router.get(
  '/opportunities/:opportunityId/sows',
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const opportunityId = parseInt(String(req.params.opportunityId), 10);
    if (isNaN(opportunityId)) {
      return res.status(400).json({ error: 'Invalid opportunity ID' });
    }

    const sows = await sowGeneratorService.getSOWsByOpportunity(
      opportunityId,
      req.tenantContext!.tenantId,
    );

    res.json({ data: sows });
  },
);

/**
 * POST /api/crm/opportunities/:opportunityId/sows
 * Create a new SOW manually
 */
router.post(
  '/opportunities/:opportunityId/sows',
  requireTenant,
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    const opportunityId = parseInt(String(req.params.opportunityId), 10);
    if (isNaN(opportunityId)) {
      return res.status(400).json({ error: 'Invalid opportunity ID' });
    }

    const parsed = createSOWSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const sow = await sowGeneratorService.createSOW({
      opportunityId,
      tenantId: req.tenantContext!.tenantId,
      createdById: req.userId!,
      ...parsed.data,
    });

    res.status(201).json({ data: sow });
  },
);

/**
 * POST /api/crm/opportunities/:opportunityId/sows/generate
 * Generate an AI-powered SOW
 */
router.post(
  '/opportunities/:opportunityId/sows/generate',
  requireTenant,
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    const opportunityId = parseInt(String(req.params.opportunityId), 10);
    if (isNaN(opportunityId)) {
      return res.status(400).json({ error: 'Invalid opportunity ID' });
    }

    const parsed = generateSOWSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    try {
      const sow = await sowGeneratorService.generateSOW({
        opportunityId,
        tenantId: req.tenantContext!.tenantId,
        createdById: req.userId!,
        ...parsed.data,
      });

      res.status(201).json({ data: sow });
    } catch (error) {
      console.error('SOW generation failed:', error);
      res.status(500).json({
        error: 'Failed to generate SOW',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

/**
 * GET /api/crm/opportunities/:opportunityId/sows/:sowId
 * Get a single SOW
 */
router.get(
  '/opportunities/:opportunityId/sows/:sowId',
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const sowId = parseInt(String(req.params.sowId), 10);
    if (isNaN(sowId)) {
      return res.status(400).json({ error: 'Invalid SOW ID' });
    }

    const sow = await sowGeneratorService.getSOWById(
      sowId,
      req.tenantContext!.tenantId,
    );

    if (!sow) {
      return res.status(404).json({ error: 'SOW not found' });
    }

    res.json({ data: sow });
  },
);

/**
 * PATCH /api/crm/opportunities/:opportunityId/sows/:sowId
 * Update a SOW
 */
router.patch(
  '/opportunities/:opportunityId/sows/:sowId',
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const sowId = parseInt(String(req.params.sowId), 10);
    if (isNaN(sowId)) {
      return res.status(400).json({ error: 'Invalid SOW ID' });
    }

    const parsed = updateSOWSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const sow = await sowGeneratorService.updateSOW(
      sowId,
      req.tenantContext!.tenantId,
      parsed.data,
    );

    res.json({ data: sow });
  },
);

/**
 * PATCH /api/crm/opportunities/:opportunityId/sows/:sowId/sections/:sectionId
 * Update a specific section of the SOW
 */
router.patch(
  '/opportunities/:opportunityId/sows/:sowId/sections/:sectionId',
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const sowId = parseInt(String(req.params.sowId), 10);
    if (isNaN(sowId)) {
      return res.status(400).json({ error: 'Invalid SOW ID' });
    }

    const parsed = updateSectionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    try {
      const sow = await sowGeneratorService.updateSOWSection(
        sowId,
        req.tenantContext!.tenantId,
        String(req.params.sectionId),
        parsed.data.content,
      );

      res.json({ data: sow });
    } catch (error) {
      console.error('Section update failed:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Update failed',
      });
    }
  },
);

/**
 * DELETE /api/crm/opportunities/:opportunityId/sows/:sowId
 * Delete a SOW
 */
router.delete(
  '/opportunities/:opportunityId/sows/:sowId',
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const sowId = parseInt(String(req.params.sowId), 10);
    if (isNaN(sowId)) {
      return res.status(400).json({ error: 'Invalid SOW ID' });
    }

    await sowGeneratorService.deleteSOW(sowId, req.tenantContext!.tenantId);
    res.status(204).send();
  },
);

/**
 * POST /api/crm/opportunities/:opportunityId/sows/:sowId/approve
 * Approve a SOW
 */
router.post(
  '/opportunities/:opportunityId/sows/:sowId/approve',
  requireTenant,
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    const sowId = parseInt(String(req.params.sowId), 10);
    if (isNaN(sowId)) {
      return res.status(400).json({ error: 'Invalid SOW ID' });
    }

    const sow = await sowGeneratorService.approveSOW(
      sowId,
      req.tenantContext!.tenantId,
      req.userId!,
    );

    res.json({ data: sow });
  },
);

/**
 * GET /api/crm/opportunities/:opportunityId/sows/:sowId/export
 * Export SOW in different formats
 */
router.get(
  '/opportunities/:opportunityId/sows/:sowId/export',
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const sowId = parseInt(String(req.params.sowId), 10);
    if (isNaN(sowId)) {
      return res.status(400).json({ error: 'Invalid SOW ID' });
    }

    const parsed = exportSOWSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    try {
      const content = await sowGeneratorService.exportSOW(
        sowId,
        req.tenantContext!.tenantId,
        parsed.data.format,
      );

      const contentType =
        parsed.data.format === 'html'
          ? 'text/html'
          : parsed.data.format === 'markdown'
            ? 'text/markdown'
            : 'text/plain';

      res.setHeader('Content-Type', contentType);
      res.send(content);
    } catch (error) {
      console.error('Export failed:', error);
      res.status(500).json({
        error: 'Failed to export SOW',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

export default router;
