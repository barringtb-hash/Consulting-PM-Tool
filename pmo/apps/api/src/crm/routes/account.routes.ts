/**
 * Account Routes
 *
 * REST API endpoints for Account management.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import * as accountService from '../services/account.service';
import { requireAuth, type AuthenticatedRequest } from '../../auth/auth.middleware';
import { requireTenant, type TenantRequest } from '../../tenant/tenant.middleware';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createAccountSchema = z.object({
  name: z.string().min(1).max(200),
  website: z.string().url().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  parentAccountId: z.number().int().positive().optional().nullable(),
  type: z.enum(['PROSPECT', 'CUSTOMER', 'PARTNER', 'COMPETITOR', 'CHURNED', 'OTHER']).optional(),
  industry: z.string().max(100).optional().nullable(),
  employeeCount: z.enum(['SOLO', 'MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE']).optional(),
  annualRevenue: z.number().positive().optional().nullable(),
  billingAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional().nullable(),
  shippingAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional().nullable(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.unknown()).optional(),
});

const updateAccountSchema = createAccountSchema.partial().extend({
  healthScore: z.number().min(0).max(100).optional(),
  engagementScore: z.number().min(0).max(100).optional(),
  churnRisk: z.number().min(0).max(1).optional(),
  archived: z.boolean().optional(),
});

const listAccountsSchema = z.object({
  type: z.string().optional(),
  industry: z.string().optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  archived: z.coerce.boolean().optional(),
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
    try {
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
    } catch (error) {
      throw error;
    }
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
    try {
      const parsed = createAccountSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const account = await accountService.createAccount({
        ...parsed.data,
        ownerId: req.userId!,
      });

      res.status(201).json({ data: account });
    } catch (error) {
      throw error;
    }
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
    try {
      const stats = await accountService.getAccountStats();
      res.json({ data: stats });
    } catch (error) {
      throw error;
    }
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
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid account ID' });
      }

      const account = await accountService.getAccountById(id);
      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      res.json({ data: account });
    } catch (error) {
      throw error;
    }
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
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid account ID' });
      }

      const parsed = updateAccountSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const account = await accountService.updateAccount(id, parsed.data);
      res.json({ data: account });
    } catch (error) {
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
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid account ID' });
      }

      await accountService.deleteAccount(id);
      res.status(204).send();
    } catch (error) {
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
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid account ID' });
      }

      const account = await accountService.archiveAccount(id);
      res.json({ data: account });
    } catch (error) {
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
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid account ID' });
      }

      const account = await accountService.restoreAccount(id);
      res.json({ data: account });
    } catch (error) {
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
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid account ID' });
      }

      const hierarchy = await accountService.getAccountHierarchy(id);
      if (!hierarchy) {
        return res.status(404).json({ error: 'Account not found' });
      }

      res.json({ data: hierarchy });
    } catch (error) {
      throw error;
    }
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
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid account ID' });
      }

      const limit = parseInt(req.query.limit as string, 10) || 20;
      const offset = parseInt(req.query.offset as string, 10) || 0;

      const timeline = await accountService.getAccountTimeline(id, { limit, offset });
      res.json({ data: timeline });
    } catch (error) {
      throw error;
    }
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
    try {
      const targetId = parseInt(req.params.id, 10);
      if (isNaN(targetId)) {
        return res.status(400).json({ error: 'Invalid target account ID' });
      }

      const parsed = mergeAccountsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const result = await accountService.mergeAccounts(
        targetId,
        parsed.data.sourceAccountId,
      );
      res.json({ data: result });
    } catch (error) {
      throw error;
    }
  },
);

export default router;
