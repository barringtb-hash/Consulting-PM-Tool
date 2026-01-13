/**
 * Account Routes
 *
 * REST API endpoints for Account management.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import * as accountService from '../services/account.service';
import * as accountHealthService from '../services/account-health.service';
import * as accountCTAService from '../services/account-cta.service';
import * as accountSuccessPlanService from '../services/account-success-plan.service';
import {
  requireAuth,
  type AuthenticatedRequest,
} from '../../auth/auth.middleware';
import {
  tenantMiddleware,
  requireTenant,
  type TenantRequest,
} from '../../tenant/tenant.middleware';
import {
  calculateHealthScoreSchema,
  getHealthHistorySchema,
} from '../../validation/crm/account-health.schema';
import {
  createCTASchema,
  updateCTASchema,
  listCTAsSchema,
  closeCTASchema,
  snoozeCTASchema,
} from '../../validation/crm/account-cta.schema';
import {
  createSuccessPlanSchema,
  updateSuccessPlanSchema,
  listSuccessPlansSchema,
  createObjectiveSchema,
  updateObjectiveSchema,
  createTaskSchema,
  updateTaskStatusSchema,
} from '../../validation/crm/account-success-plan.schema';

// Helper to check if error is a "not found" error (Prisma or custom)
function isNotFoundError(error: unknown): boolean {
  // Check for Prisma's record not found error
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  ) {
    return true;
  }
  // Check for custom "Account not found" error from service layer
  if (error instanceof Error && error.message === 'Account not found') {
    return true;
  }
  return false;
}

const router = Router();

// All routes require authentication and tenant context for isolation
// requireAuth must come first so req.userId is available for tenant resolution
router.use(requireAuth, tenantMiddleware);

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createAccountSchema = z.object({
  name: z.string().min(1).max(200),
  website: z
    .string()
    .max(500)
    .optional()
    .transform((val) => {
      // Allow empty strings to become undefined
      if (!val || val.trim() === '') return undefined;
      // If no protocol, prepend https://
      if (!/^https?:\/\//i.test(val)) {
        return `https://${val}`;
      }
      return val;
    })
    .refine(
      (val) => {
        if (val === undefined) return true;
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: 'Invalid website URL' },
    ),
  phone: z.string().max(50).optional(),
  parentAccountId: z.number().int().positive().optional(),
  type: z
    .enum(['PROSPECT', 'CUSTOMER', 'PARTNER', 'COMPETITOR', 'CHURNED', 'OTHER'])
    .optional(),
  industry: z.string().max(100).optional(),
  employeeCount: z
    .enum(['SOLO', 'MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'])
    .optional(),
  annualRevenue: z.number().nonnegative().optional(),
  billingAddress: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  shippingAddress: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

const updateAccountSchema = createAccountSchema.partial().extend({
  ownerId: z.number().int().positive().optional(),
  healthScore: z.number().min(0).max(100).optional(),
  engagementScore: z.number().min(0).max(100).optional(),
  churnRisk: z.number().min(0).max(1).optional(),
  archived: z.boolean().optional(),
});

const listAccountsSchema = z.object({
  type: z.string().optional(),
  industry: z.string().optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  archived: z
    .string()
    .optional()
    .transform((val) => (val === undefined ? undefined : val === 'true')),
  healthScoreMin: z.coerce.number().min(0).max(100).optional(),
  healthScoreMax: z.coerce.number().min(0).max(100).optional(),
  search: z.string().optional(),
  tags: z.string().optional(), // Comma-separated
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const mergeAccountsSchema = z.object({
  sourceAccountId: z.number().int().positive(),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/crm/accounts
 * List accounts with filtering and pagination
 */
router.get(
  '/',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const parsed = listAccountsSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const { page, limit, sortBy, sortOrder, tags, ...filters } = parsed.data;

    const result = await accountService.listAccounts(
      {
        ...filters,
        tags: tags ? tags.split(',').map((t) => t.trim()) : undefined,
      },
      { page, limit, sortBy, sortOrder },
    );

    res.json(result);
  },
);

/**
 * POST /api/crm/accounts
 * Create a new account
 */
router.post(
  '/',
  requireAuth,
  requireTenant,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = createAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const account = await accountService.createAccount({
      ...parsed.data,
      ownerId: req.userId!,
    });

    res.status(201).json({ data: account });
  },
);

/**
 * GET /api/crm/accounts/stats
 * Get account statistics
 */
router.get(
  '/stats',
  requireAuth,
  requireTenant,
  async (_req: TenantRequest, res: Response) => {
    const stats = await accountService.getAccountStats();
    res.json({ data: stats });
  },
);

/**
 * GET /api/crm/accounts/:id
 * Get account by ID
 */
router.get(
  '/:id',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid account ID' });
    }

    const account = await accountService.getAccountById(id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ data: account });
  },
);

/**
 * PUT /api/crm/accounts/:id
 * Update account
 */
router.put(
  '/:id',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid account ID' });
    }

    const parsed = updateAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    try {
      const account = await accountService.updateAccount(id, parsed.data);
      res.json({ data: account });
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ error: 'Account not found' });
      }
      throw error;
    }
  },
);

/**
 * DELETE /api/crm/accounts/:id
 * Delete account permanently
 */
router.delete(
  '/:id',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid account ID' });
    }

    try {
      await accountService.deleteAccount(id);
      res.status(204).send();
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ error: 'Account not found' });
      }
      throw error;
    }
  },
);

/**
 * POST /api/crm/accounts/:id/archive
 * Archive account (soft delete)
 */
router.post(
  '/:id/archive',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid account ID' });
    }

    try {
      const account = await accountService.archiveAccount(id);
      res.json({ data: account });
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ error: 'Account not found' });
      }
      throw error;
    }
  },
);

/**
 * POST /api/crm/accounts/:id/restore
 * Restore archived account
 */
router.post(
  '/:id/restore',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid account ID' });
    }

    try {
      const account = await accountService.restoreAccount(id);
      res.json({ data: account });
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ error: 'Account not found' });
      }
      throw error;
    }
  },
);

/**
 * GET /api/crm/accounts/:id/hierarchy
 * Get account hierarchy (parent/children)
 */
router.get(
  '/:id/hierarchy',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid account ID' });
    }

    const hierarchy = await accountService.getAccountHierarchy(id);
    if (!hierarchy) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ data: hierarchy });
  },
);

/**
 * GET /api/crm/accounts/:id/timeline
 * Get account activity timeline
 */
router.get(
  '/:id/timeline',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid account ID' });
    }

    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const timeline = await accountService.getAccountTimeline(id, {
      limit,
      offset,
    });
    res.json({ data: timeline });
  },
);

/**
 * POST /api/crm/accounts/:id/merge
 * Merge another account into this one
 */
router.post(
  '/:id/merge',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const targetId = parseInt(String(req.params.id), 10);
    if (isNaN(targetId)) {
      return res.status(400).json({ error: 'Invalid target account ID' });
    }

    const parsed = mergeAccountsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    try {
      const result = await accountService.mergeAccounts(
        targetId,
        parsed.data.sourceAccountId,
      );
      res.json({ data: result });
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ error: 'Account not found' });
      }
      throw error;
    }
  },
);

// ============================================================================
// CUSTOMER SUCCESS - HEALTH SCORE ROUTES
// ============================================================================

/**
 * GET /api/crm/accounts/portfolio/health
 * Get portfolio health summary across all accounts
 */
router.get(
  '/portfolio/health',
  requireAuth,
  requireTenant,
  async (_req: TenantRequest, res: Response) => {
    const summary = await accountHealthService.getPortfolioHealthSummary();
    res.json({ data: summary });
  },
);

/**
 * GET /api/crm/accounts/:id/health
 * Get current health score for an account
 */
router.get(
  '/:id/health',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid account ID' });
    }

    const health = await accountHealthService.getAccountHealthScore(id);
    if (!health) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json({ data: health });
  },
);

/**
 * POST /api/crm/accounts/:id/health/calculate
 * Calculate and update health score for an account
 */
router.post(
  '/:id/health/calculate',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid account ID' });
    }

    const parsed = calculateHealthScoreSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    try {
      const health = await accountHealthService.calculateAccountHealthScore({
        accountId: id,
        ...parsed.data,
      });
      res.json({ data: health });
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ error: 'Account not found' });
      }
      throw error;
    }
  },
);

/**
 * POST /api/crm/accounts/:id/health/auto-calculate
 * Auto-calculate health score from CRM data
 */
router.post(
  '/:id/health/auto-calculate',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid account ID' });
    }

    try {
      const health =
        await accountHealthService.autoCalculateAccountHealthScore(id);
      res.json({ data: health });
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ error: 'Account not found' });
      }
      throw error;
    }
  },
);

/**
 * GET /api/crm/accounts/:id/health/history
 * Get health score history for trend analysis
 */
router.get(
  '/:id/health/history',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid account ID' });
    }

    const parsed = getHealthHistorySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const history = await accountHealthService.getAccountHealthScoreHistory(
      id,
      parsed.data.days,
    );
    res.json({ data: history });
  },
);

// ============================================================================
// CUSTOMER SUCCESS - CTA ROUTES
// ============================================================================

/**
 * GET /api/crm/accounts/portfolio/ctas
 * Get all CTAs across accounts (portfolio view)
 */
router.get(
  '/portfolio/ctas',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const parsed = listCTAsSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const result = await accountCTAService.listAccountCTAs(parsed.data);
    res.json(result);
  },
);

/**
 * GET /api/crm/accounts/portfolio/ctas/summary
 * Get CTA summary across portfolio
 */
router.get(
  '/portfolio/ctas/summary',
  requireAuth,
  requireTenant,
  async (_req: TenantRequest, res: Response) => {
    const summary = await accountCTAService.getAccountCTASummary();
    res.json({ data: summary });
  },
);

/**
 * GET /api/crm/accounts/portfolio/ctas/cockpit
 * Get CTA cockpit view for current user
 */
router.get(
  '/portfolio/ctas/cockpit',
  requireAuth,
  requireTenant,
  async (req: AuthenticatedRequest, res: Response) => {
    const cockpit = await accountCTAService.getAccountCTACockpit(req.userId!);
    res.json({ data: cockpit });
  },
);

/**
 * GET /api/crm/accounts/:id/ctas
 * List CTAs for an account
 */
router.get(
  '/:id/ctas',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid account ID' });
    }

    const parsed = listCTAsSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const result = await accountCTAService.listAccountCTAs({
      ...parsed.data,
      accountId: id,
    });
    res.json(result);
  },
);

/**
 * POST /api/crm/accounts/:id/ctas
 * Create a CTA for an account
 */
router.post(
  '/:id/ctas',
  requireAuth,
  requireTenant,
  async (req: AuthenticatedRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid account ID' });
    }

    const parsed = createCTASchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const cta = await accountCTAService.createAccountCTA({
      accountId: id,
      ownerId: req.userId!,
      ...parsed.data,
    });
    res.status(201).json({ data: cta });
  },
);

/**
 * GET /api/crm/accounts/:id/ctas/:ctaId
 * Get a specific CTA
 */
router.get(
  '/:id/ctas/:ctaId',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const ctaId = parseInt(String(req.params.ctaId), 10);
    if (isNaN(ctaId)) {
      return res.status(400).json({ error: 'Invalid CTA ID' });
    }

    const cta = await accountCTAService.getAccountCTAById(ctaId);
    if (!cta) {
      return res.status(404).json({ error: 'CTA not found' });
    }

    res.json({ data: cta });
  },
);

/**
 * PUT /api/crm/accounts/:id/ctas/:ctaId
 * Update a CTA
 */
router.put(
  '/:id/ctas/:ctaId',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const ctaId = parseInt(String(req.params.ctaId), 10);
    if (isNaN(ctaId)) {
      return res.status(400).json({ error: 'Invalid CTA ID' });
    }

    const parsed = updateCTASchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    try {
      const cta = await accountCTAService.updateAccountCTA(ctaId, parsed.data);
      res.json({ data: cta });
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ error: 'CTA not found' });
      }
      throw error;
    }
  },
);

/**
 * DELETE /api/crm/accounts/:id/ctas/:ctaId
 * Delete a CTA
 */
router.delete(
  '/:id/ctas/:ctaId',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const ctaId = parseInt(String(req.params.ctaId), 10);
    if (isNaN(ctaId)) {
      return res.status(400).json({ error: 'Invalid CTA ID' });
    }

    try {
      await accountCTAService.deleteAccountCTA(ctaId);
      res.status(204).send();
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ error: 'CTA not found' });
      }
      throw error;
    }
  },
);

/**
 * POST /api/crm/accounts/:id/ctas/:ctaId/close
 * Close a CTA with outcome
 */
router.post(
  '/:id/ctas/:ctaId/close',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const ctaId = parseInt(String(req.params.ctaId), 10);
    if (isNaN(ctaId)) {
      return res.status(400).json({ error: 'Invalid CTA ID' });
    }

    const parsed = closeCTASchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    try {
      const cta = await accountCTAService.closeAccountCTA(
        ctaId,
        parsed.data.outcome,
        parsed.data.resolutionNotes,
      );
      res.json({ data: cta });
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ error: 'CTA not found' });
      }
      throw error;
    }
  },
);

/**
 * POST /api/crm/accounts/:id/ctas/:ctaId/snooze
 * Snooze a CTA
 */
router.post(
  '/:id/ctas/:ctaId/snooze',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const ctaId = parseInt(String(req.params.ctaId), 10);
    if (isNaN(ctaId)) {
      return res.status(400).json({ error: 'Invalid CTA ID' });
    }

    const parsed = snoozeCTASchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    try {
      const cta = await accountCTAService.snoozeAccountCTA(
        ctaId,
        parsed.data.snoozeUntil,
      );
      res.json({ data: cta });
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ error: 'CTA not found' });
      }
      throw error;
    }
  },
);

// ============================================================================
// CUSTOMER SUCCESS - SUCCESS PLAN ROUTES
// ============================================================================

/**
 * GET /api/crm/accounts/portfolio/success-plans
 * Get all success plans across accounts
 */
router.get(
  '/portfolio/success-plans',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const parsed = listSuccessPlansSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const result = await accountSuccessPlanService.listAccountSuccessPlans(
      parsed.data,
    );
    res.json(result);
  },
);

/**
 * GET /api/crm/accounts/portfolio/success-plans/summary
 * Get success plan summary across portfolio
 */
router.get(
  '/portfolio/success-plans/summary',
  requireAuth,
  requireTenant,
  async (_req: TenantRequest, res: Response) => {
    const summary =
      await accountSuccessPlanService.getAccountSuccessPlanSummary();
    res.json({ data: summary });
  },
);

/**
 * GET /api/crm/accounts/:id/success-plans
 * List success plans for an account
 */
router.get(
  '/:id/success-plans',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid account ID' });
    }

    const parsed = listSuccessPlansSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const result = await accountSuccessPlanService.listAccountSuccessPlans({
      ...parsed.data,
      accountId: id,
    });
    res.json(result);
  },
);

/**
 * POST /api/crm/accounts/:id/success-plans
 * Create a success plan for an account
 */
router.post(
  '/:id/success-plans',
  requireAuth,
  requireTenant,
  async (req: AuthenticatedRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid account ID' });
    }

    const parsed = createSuccessPlanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const plan = await accountSuccessPlanService.createAccountSuccessPlan({
      accountId: id,
      ownerId: req.userId!,
      ...parsed.data,
    });
    res.status(201).json({ data: plan });
  },
);

/**
 * GET /api/crm/accounts/:id/success-plans/:planId
 * Get a specific success plan
 */
router.get(
  '/:id/success-plans/:planId',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const planId = parseInt(String(req.params.planId), 10);
    if (isNaN(planId)) {
      return res.status(400).json({ error: 'Invalid success plan ID' });
    }

    const plan =
      await accountSuccessPlanService.getAccountSuccessPlanById(planId);
    if (!plan) {
      return res.status(404).json({ error: 'Success plan not found' });
    }

    res.json({ data: plan });
  },
);

/**
 * PUT /api/crm/accounts/:id/success-plans/:planId
 * Update a success plan
 */
router.put(
  '/:id/success-plans/:planId',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const planId = parseInt(String(req.params.planId), 10);
    if (isNaN(planId)) {
      return res.status(400).json({ error: 'Invalid success plan ID' });
    }

    const parsed = updateSuccessPlanSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    try {
      const plan = await accountSuccessPlanService.updateAccountSuccessPlan(
        planId,
        parsed.data,
      );
      res.json({ data: plan });
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ error: 'Success plan not found' });
      }
      throw error;
    }
  },
);

/**
 * DELETE /api/crm/accounts/:id/success-plans/:planId
 * Delete a success plan
 */
router.delete(
  '/:id/success-plans/:planId',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const planId = parseInt(String(req.params.planId), 10);
    if (isNaN(planId)) {
      return res.status(400).json({ error: 'Invalid success plan ID' });
    }

    try {
      await accountSuccessPlanService.deleteAccountSuccessPlan(planId);
      res.status(204).send();
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ error: 'Success plan not found' });
      }
      throw error;
    }
  },
);

/**
 * POST /api/crm/accounts/:id/success-plans/:planId/activate
 * Activate a draft success plan
 */
router.post(
  '/:id/success-plans/:planId/activate',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const planId = parseInt(String(req.params.planId), 10);
    if (isNaN(planId)) {
      return res.status(400).json({ error: 'Invalid success plan ID' });
    }

    try {
      const plan = await accountSuccessPlanService.activateSuccessPlan(planId);
      res.json({ data: plan });
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ error: 'Success plan not found' });
      }
      throw error;
    }
  },
);

/**
 * POST /api/crm/accounts/:id/success-plans/:planId/objectives
 * Add an objective to a success plan
 */
router.post(
  '/:id/success-plans/:planId/objectives',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const planId = parseInt(String(req.params.planId), 10);
    if (isNaN(planId)) {
      return res.status(400).json({ error: 'Invalid success plan ID' });
    }

    const parsed = createObjectiveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    try {
      const plan = await accountSuccessPlanService.addObjective({
        successPlanId: planId,
        ...parsed.data,
      });
      res.status(201).json({ data: plan });
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ error: 'Success plan not found' });
      }
      throw error;
    }
  },
);

/**
 * PUT /api/crm/accounts/:id/success-plans/:planId/objectives/:objectiveId
 * Update an objective
 */
router.put(
  '/:id/success-plans/:planId/objectives/:objectiveId',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const objectiveId = parseInt(String(req.params.objectiveId), 10);
    if (isNaN(objectiveId)) {
      return res.status(400).json({ error: 'Invalid objective ID' });
    }

    const parsed = updateObjectiveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    try {
      const plan = await accountSuccessPlanService.updateObjective(
        objectiveId,
        parsed.data,
      );
      res.json({ data: plan });
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ error: 'Objective not found' });
      }
      throw error;
    }
  },
);

/**
 * DELETE /api/crm/accounts/:id/success-plans/:planId/objectives/:objectiveId
 * Delete an objective
 */
router.delete(
  '/:id/success-plans/:planId/objectives/:objectiveId',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const objectiveId = parseInt(String(req.params.objectiveId), 10);
    if (isNaN(objectiveId)) {
      return res.status(400).json({ error: 'Invalid objective ID' });
    }

    try {
      const plan = await accountSuccessPlanService.deleteObjective(objectiveId);
      res.json({ data: plan });
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ error: 'Objective not found' });
      }
      throw error;
    }
  },
);

/**
 * POST /api/crm/accounts/:id/success-plans/:planId/objectives/:objectiveId/tasks
 * Add a task to an objective
 */
router.post(
  '/:id/success-plans/:planId/objectives/:objectiveId/tasks',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const objectiveId = parseInt(String(req.params.objectiveId), 10);
    if (isNaN(objectiveId)) {
      return res.status(400).json({ error: 'Invalid objective ID' });
    }

    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    try {
      const plan = await accountSuccessPlanService.addTask({
        objectiveId,
        ...parsed.data,
      });
      res.status(201).json({ data: plan });
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ error: 'Objective not found' });
      }
      throw error;
    }
  },
);

/**
 * PATCH /api/crm/accounts/:id/success-plans/:planId/objectives/:objectiveId/tasks/:taskId/status
 * Update a task status
 */
router.patch(
  '/:id/success-plans/:planId/objectives/:objectiveId/tasks/:taskId/status',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const taskId = parseInt(String(req.params.taskId), 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const parsed = updateTaskStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    try {
      const plan = await accountSuccessPlanService.updateTaskStatus(
        taskId,
        parsed.data.status,
      );
      res.json({ data: plan });
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ error: 'Task not found' });
      }
      throw error;
    }
  },
);

export default router;
