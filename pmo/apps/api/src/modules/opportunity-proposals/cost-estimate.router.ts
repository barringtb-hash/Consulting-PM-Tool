/**
 * Cost Estimate Routes
 *
 * REST API endpoints for opportunity cost estimate management.
 * Includes CRUD operations, line items, and AI generation.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { costEstimateService } from './services/cost-estimate.service';
import { aiEstimateGeneratorService } from './services/ai-estimate-generator.service';
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

const estimateTypeEnum = z.enum([
  'FIXED_PRICE',
  'TIME_AND_MATERIALS',
  'RETAINER',
  'HYBRID',
]);

const estimateStatusEnum = z.enum([
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
]);

const lineItemCategoryEnum = z.enum([
  'LABOR',
  'DELIVERABLE',
  'EXPENSE',
  'THIRD_PARTY',
  'CONTINGENCY',
  'DISCOUNT',
]);

const createEstimateSchema = z.object({
  name: z.string().min(1).max(200),
  estimateType: estimateTypeEnum.optional(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  notes: z.string().max(5000).optional(),
  internalNotes: z.string().max(5000).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  currency: z.string().length(3).optional(),
});

const updateEstimateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  estimateType: estimateTypeEnum.optional(),
  status: estimateStatusEnum.optional(),
  validFrom: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  notes: z.string().max(5000).optional(),
  internalNotes: z.string().max(5000).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  assumptions: z.array(z.record(z.string(), z.unknown())).optional(),
});

const createLineItemSchema = z.object({
  category: lineItemCategoryEnum,
  phase: z.string().max(100).optional(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  unitType: z.string().max(50).optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  role: z.string().max(100).optional(),
  hourlyRate: z.number().positive().optional(),
  estimatedHours: z.number().positive().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const updateLineItemSchema = z.object({
  category: lineItemCategoryEnum.optional(),
  phase: z.string().max(100).optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  unitType: z.string().max(50).optional(),
  quantity: z.number().positive().optional(),
  unitPrice: z.number().positive().optional(),
  role: z.string().max(100).optional(),
  hourlyRate: z.number().positive().optional(),
  estimatedHours: z.number().positive().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const generateEstimateSchema = z.object({
  estimateType: estimateTypeEnum.optional(),
  customInstructions: z.string().max(2000).optional(),
  includeContingency: z.boolean().optional(),
});

const rejectEstimateSchema = z.object({
  reason: z.string().max(1000).optional(),
});

const bulkAddLineItemsSchema = z.object({
  items: z.array(createLineItemSchema),
});

const reorderLineItemsSchema = z.object({
  itemIds: z.array(z.number().int().positive()),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/crm/opportunities/:opportunityId/estimates
 * List all estimates for an opportunity
 */
router.get(
  '/opportunities/:opportunityId/estimates',
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const opportunityId = parseInt(String(req.params.opportunityId), 10);
    if (isNaN(opportunityId)) {
      return res.status(400).json({ error: 'Invalid opportunity ID' });
    }

    const estimates = await costEstimateService.getEstimatesByOpportunity(
      opportunityId,
      req.tenantContext!.tenantId,
    );

    res.json({ data: estimates });
  },
);

/**
 * POST /api/crm/opportunities/:opportunityId/estimates
 * Create a new estimate manually
 */
router.post(
  '/opportunities/:opportunityId/estimates',
  requireTenant,
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    const opportunityId = parseInt(String(req.params.opportunityId), 10);
    if (isNaN(opportunityId)) {
      return res.status(400).json({ error: 'Invalid opportunity ID' });
    }

    const parsed = createEstimateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const estimate = await costEstimateService.createEstimate({
      opportunityId,
      tenantId: req.tenantContext!.tenantId,
      createdById: req.userId!,
      ...parsed.data,
    });

    res.status(201).json({ data: estimate });
  },
);

/**
 * POST /api/crm/opportunities/:opportunityId/estimates/generate
 * Generate an AI-powered estimate
 */
router.post(
  '/opportunities/:opportunityId/estimates/generate',
  requireTenant,
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    const opportunityId = parseInt(String(req.params.opportunityId), 10);
    if (isNaN(opportunityId)) {
      return res.status(400).json({ error: 'Invalid opportunity ID' });
    }

    const parsed = generateEstimateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    try {
      const estimate = await aiEstimateGeneratorService.generateEstimate({
        opportunityId,
        tenantId: req.tenantContext!.tenantId,
        createdById: req.userId!,
        estimateType: parsed.data.estimateType || 'FIXED_PRICE',
        includeContingency: parsed.data.includeContingency,
        customInstructions: parsed.data.customInstructions,
      });

      res.status(201).json({ data: estimate });
    } catch (error) {
      console.error('Estimate generation failed:', error);
      res.status(500).json({
        error: 'Failed to generate estimate',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

/**
 * GET /api/crm/opportunities/:opportunityId/estimates/:estimateId
 * Get a single estimate
 */
router.get(
  '/opportunities/:opportunityId/estimates/:estimateId',
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const estimateId = parseInt(String(req.params.estimateId), 10);
    if (isNaN(estimateId)) {
      return res.status(400).json({ error: 'Invalid estimate ID' });
    }

    const estimate = await costEstimateService.getEstimateById(
      estimateId,
      req.tenantContext!.tenantId,
    );

    if (!estimate) {
      return res.status(404).json({ error: 'Estimate not found' });
    }

    res.json({ data: estimate });
  },
);

/**
 * PATCH /api/crm/opportunities/:opportunityId/estimates/:estimateId
 * Update an estimate
 */
router.patch(
  '/opportunities/:opportunityId/estimates/:estimateId',
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const estimateId = parseInt(String(req.params.estimateId), 10);
    if (isNaN(estimateId)) {
      return res.status(400).json({ error: 'Invalid estimate ID' });
    }

    const parsed = updateEstimateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const estimate = await costEstimateService.updateEstimate(
      estimateId,
      req.tenantContext!.tenantId,
      parsed.data,
    );

    res.json({ data: estimate });
  },
);

/**
 * DELETE /api/crm/opportunities/:opportunityId/estimates/:estimateId
 * Delete an estimate
 */
router.delete(
  '/opportunities/:opportunityId/estimates/:estimateId',
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const estimateId = parseInt(String(req.params.estimateId), 10);
    if (isNaN(estimateId)) {
      return res.status(400).json({ error: 'Invalid estimate ID' });
    }

    await costEstimateService.deleteEstimate(
      estimateId,
      req.tenantContext!.tenantId,
    );
    res.status(204).send();
  },
);

/**
 * POST /api/crm/opportunities/:opportunityId/estimates/:estimateId/approve
 * Approve an estimate
 */
router.post(
  '/opportunities/:opportunityId/estimates/:estimateId/approve',
  requireTenant,
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    const estimateId = parseInt(String(req.params.estimateId), 10);
    if (isNaN(estimateId)) {
      return res.status(400).json({ error: 'Invalid estimate ID' });
    }

    const estimate = await costEstimateService.approveEstimate(
      estimateId,
      req.tenantContext!.tenantId,
      req.userId!,
    );

    res.json({ data: estimate });
  },
);

/**
 * POST /api/crm/opportunities/:opportunityId/estimates/:estimateId/reject
 * Reject an estimate
 */
router.post(
  '/opportunities/:opportunityId/estimates/:estimateId/reject',
  requireTenant,
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    const estimateId = parseInt(String(req.params.estimateId), 10);
    if (isNaN(estimateId)) {
      return res.status(400).json({ error: 'Invalid estimate ID' });
    }

    const parsed = rejectEstimateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const estimate = await costEstimateService.rejectEstimate(
      estimateId,
      req.tenantContext!.tenantId,
      req.userId!,
      parsed.data.reason,
    );

    res.json({ data: estimate });
  },
);

/**
 * POST /api/crm/opportunities/:opportunityId/estimates/:estimateId/clone
 * Clone an estimate (create new version)
 */
router.post(
  '/opportunities/:opportunityId/estimates/:estimateId/clone',
  requireTenant,
  async (req: AuthenticatedRequest & TenantRequest, res: Response) => {
    const estimateId = parseInt(String(req.params.estimateId), 10);
    if (isNaN(estimateId)) {
      return res.status(400).json({ error: 'Invalid estimate ID' });
    }

    try {
      const estimate = await costEstimateService.cloneEstimate(
        estimateId,
        req.tenantContext!.tenantId,
        req.userId!,
      );

      res.status(201).json({ data: estimate });
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Clone failed',
      });
    }
  },
);

/**
 * GET /api/crm/opportunities/:opportunityId/estimates/:estimateId/summary
 * Get estimate summary by category
 */
router.get(
  '/opportunities/:opportunityId/estimates/:estimateId/summary',
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const estimateId = parseInt(String(req.params.estimateId), 10);
    if (isNaN(estimateId)) {
      return res.status(400).json({ error: 'Invalid estimate ID' });
    }

    const summary = await costEstimateService.getEstimateSummary(estimateId);
    res.json({ data: summary });
  },
);

// ============================================================================
// LINE ITEM ROUTES
// ============================================================================

/**
 * POST /api/crm/opportunities/:opportunityId/estimates/:estimateId/items
 * Add a line item to an estimate
 */
router.post(
  '/opportunities/:opportunityId/estimates/:estimateId/items',
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const estimateId = parseInt(String(req.params.estimateId), 10);
    if (isNaN(estimateId)) {
      return res.status(400).json({ error: 'Invalid estimate ID' });
    }

    const parsed = createLineItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const lineItem = await costEstimateService.addLineItem({
      estimateId,
      ...parsed.data,
    });

    res.status(201).json({ data: lineItem });
  },
);

/**
 * PATCH /api/crm/opportunities/:opportunityId/estimates/:estimateId/items/:itemId
 * Update a line item
 */
router.patch(
  '/opportunities/:opportunityId/estimates/:estimateId/items/:itemId',
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const itemId = parseInt(String(req.params.itemId), 10);
    if (isNaN(itemId)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const parsed = updateLineItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const lineItem = await costEstimateService.updateLineItem(
      itemId,
      parsed.data,
    );

    res.json({ data: lineItem });
  },
);

/**
 * DELETE /api/crm/opportunities/:opportunityId/estimates/:estimateId/items/:itemId
 * Delete a line item
 */
router.delete(
  '/opportunities/:opportunityId/estimates/:estimateId/items/:itemId',
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const itemId = parseInt(String(req.params.itemId), 10);
    if (isNaN(itemId)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    await costEstimateService.deleteLineItem(itemId);
    res.status(204).send();
  },
);

/**
 * POST /api/crm/opportunities/:opportunityId/estimates/:estimateId/items/bulk
 * Bulk add line items
 */
router.post(
  '/opportunities/:opportunityId/estimates/:estimateId/items/bulk',
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const estimateId = parseInt(String(req.params.estimateId), 10);
    if (isNaN(estimateId)) {
      return res.status(400).json({ error: 'Invalid estimate ID' });
    }

    const parsed = bulkAddLineItemsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const lineItems = await costEstimateService.bulkAddLineItems(
      estimateId,
      parsed.data.items,
    );

    res.status(201).json({ data: lineItems });
  },
);

/**
 * POST /api/crm/opportunities/:opportunityId/estimates/:estimateId/items/reorder
 * Reorder line items
 */
router.post(
  '/opportunities/:opportunityId/estimates/:estimateId/items/reorder',
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const estimateId = parseInt(String(req.params.estimateId), 10);
    if (isNaN(estimateId)) {
      return res.status(400).json({ error: 'Invalid estimate ID' });
    }

    const parsed = reorderLineItemsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    await costEstimateService.reorderLineItems(estimateId, parsed.data.itemIds);
    res.json({ success: true });
  },
);

export default router;
