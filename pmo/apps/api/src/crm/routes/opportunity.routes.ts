/**
 * Opportunity Routes
 *
 * REST API endpoints for Opportunity (Deal) management.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import * as opportunityService from '../services/opportunity.service';
import { requireAuth, type AuthenticatedRequest } from '../../auth/auth.middleware';
import { requireTenant, type TenantRequest } from '../../tenant/tenant.middleware';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createOpportunitySchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  accountId: z.number().int().positive(),
  pipelineId: z.number().int().positive().optional(),
  stageId: z.number().int().positive(),
  amount: z.number().positive().optional(),
  probability: z.number().min(0).max(100).optional(),
  currency: z.string().length(3).optional(),
  expectedCloseDate: z.coerce.date().optional(),
  leadSource: z.string().optional(),
  campaignId: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.unknown()).optional(),
  contactIds: z.array(z.number().int().positive()).optional(),
});

const updateOpportunitySchema = createOpportunitySchema.partial().omit({
  accountId: true,
});

const listOpportunitiesSchema = z.object({
  status: z.enum(['OPEN', 'WON', 'LOST']).optional(),
  pipelineId: z.coerce.number().int().positive().optional(),
  stageId: z.coerce.number().int().positive().optional(),
  accountId: z.coerce.number().int().positive().optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  expectedCloseFrom: z.coerce.date().optional(),
  expectedCloseTo: z.coerce.date().optional(),
  amountMin: z.coerce.number().positive().optional(),
  amountMax: z.coerce.number().positive().optional(),
  search: z.string().optional(),
  tags: z.string().optional(), // Comma-separated
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const moveStageSchema = z.object({
  stageId: z.number().int().positive(),
});

const markLostSchema = z.object({
  lostReason: z.string().max(200).optional(),
  lostReasonDetail: z.string().max(2000).optional(),
  competitorId: z.number().int().positive().optional(),
});

const addContactSchema = z.object({
  contactId: z.number().int().positive(),
  role: z.string().max(100).optional(),
  isPrimary: z.boolean().optional(),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/crm/opportunities
 * List opportunities with filtering and pagination
 */
router.get(
  '/',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    try {
      const parsed = listOpportunitiesSchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const { page, limit, sortBy, sortOrder, tags, ...filters } = parsed.data;

      const result = await opportunityService.listOpportunities(
        {
          ...filters,
          tags: tags ? tags.split(',').map((t) => t.trim()) : undefined,
        },
        { page, limit, sortBy, sortOrder },
      );

      res.json(result);
    } catch (error) {
      throw error;
    }
  },
);

/**
 * POST /api/crm/opportunities
 * Create a new opportunity
 */
router.post(
  '/',
  requireAuth,
  requireTenant,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = createOpportunitySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const opportunity = await opportunityService.createOpportunity({
        ...parsed.data,
        ownerId: req.userId!,
      });

      res.status(201).json({ data: opportunity });
    } catch (error) {
      throw error;
    }
  },
);

/**
 * GET /api/crm/opportunities/pipeline-stats
 * Get pipeline statistics
 */
router.get(
  '/pipeline-stats',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    try {
      const pipelineId = req.query.pipelineId
        ? parseInt(req.query.pipelineId as string, 10)
        : undefined;

      const stats = await opportunityService.getPipelineStats(pipelineId);
      res.json({ data: stats });
    } catch (error) {
      throw error;
    }
  },
);

/**
 * GET /api/crm/opportunities/closing-soon
 * Get opportunities closing soon
 */
router.get(
  '/closing-soon',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    try {
      const days = parseInt(req.query.days as string, 10) || 30;
      const opportunities = await opportunityService.getOpportunitiesClosingSoon(days);
      res.json({ data: opportunities });
    } catch (error) {
      throw error;
    }
  },
);

/**
 * GET /api/crm/opportunities/:id
 * Get opportunity by ID
 */
router.get(
  '/:id',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid opportunity ID' });
      }

      const opportunity = await opportunityService.getOpportunityById(id);
      if (!opportunity) {
        return res.status(404).json({ error: 'Opportunity not found' });
      }

      res.json({ data: opportunity });
    } catch (error) {
      throw error;
    }
  },
);

/**
 * PUT /api/crm/opportunities/:id
 * Update opportunity
 */
router.put(
  '/:id',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid opportunity ID' });
      }

      const parsed = updateOpportunitySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const opportunity = await opportunityService.updateOpportunity(id, parsed.data);
      res.json({ data: opportunity });
    } catch (error) {
      throw error;
    }
  },
);

/**
 * DELETE /api/crm/opportunities/:id
 * Delete opportunity
 */
router.delete(
  '/:id',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid opportunity ID' });
      }

      await opportunityService.deleteOpportunity(id);
      res.status(204).send();
    } catch (error) {
      throw error;
    }
  },
);

/**
 * POST /api/crm/opportunities/:id/stage
 * Move opportunity to a different stage
 */
router.post(
  '/:id/stage',
  requireAuth,
  requireTenant,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid opportunity ID' });
      }

      const parsed = moveStageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const opportunity = await opportunityService.moveOpportunityStage(
        id,
        parsed.data.stageId,
        req.userId!,
      );
      res.json({ data: opportunity });
    } catch (error) {
      throw error;
    }
  },
);

/**
 * POST /api/crm/opportunities/:id/won
 * Mark opportunity as won
 */
router.post(
  '/:id/won',
  requireAuth,
  requireTenant,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid opportunity ID' });
      }

      const opportunity = await opportunityService.markOpportunityWon(id, req.userId!);
      res.json({ data: opportunity });
    } catch (error) {
      throw error;
    }
  },
);

/**
 * POST /api/crm/opportunities/:id/lost
 * Mark opportunity as lost
 */
router.post(
  '/:id/lost',
  requireAuth,
  requireTenant,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid opportunity ID' });
      }

      const parsed = markLostSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const opportunity = await opportunityService.markOpportunityLost(
        id,
        req.userId!,
        parsed.data.lostReason,
        parsed.data.lostReasonDetail,
        parsed.data.competitorId,
      );
      res.json({ data: opportunity });
    } catch (error) {
      throw error;
    }
  },
);

/**
 * POST /api/crm/opportunities/:id/contacts
 * Add contact to opportunity
 */
router.post(
  '/:id/contacts',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    try {
      const opportunityId = parseInt(req.params.id, 10);
      if (isNaN(opportunityId)) {
        return res.status(400).json({ error: 'Invalid opportunity ID' });
      }

      const parsed = addContactSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const result = await opportunityService.addContactToOpportunity(
        opportunityId,
        parsed.data.contactId,
        parsed.data.role,
        parsed.data.isPrimary,
      );
      res.status(201).json({ data: result });
    } catch (error) {
      throw error;
    }
  },
);

/**
 * DELETE /api/crm/opportunities/:id/contacts/:contactId
 * Remove contact from opportunity
 */
router.delete(
  '/:id/contacts/:contactId',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    try {
      const opportunityId = parseInt(req.params.id, 10);
      const contactId = parseInt(req.params.contactId, 10);

      if (isNaN(opportunityId) || isNaN(contactId)) {
        return res.status(400).json({ error: 'Invalid ID' });
      }

      await opportunityService.removeContactFromOpportunity(opportunityId, contactId);
      res.status(204).send();
    } catch (error) {
      throw error;
    }
  },
);

export default router;
