/**
 * Account Routes
 *
 * REST API endpoints for Account management.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import * as accountService from '../services/account.service';
import {
  requireAuth,
  type AuthenticatedRequest,
} from '../../auth/auth.middleware';
import {
  requireTenant,
  type TenantRequest,
} from '../../tenant/tenant.middleware';

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

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createAccountSchema = z.object({
  name: z.string().min(1).max(200),
  website: z.string().url().optional(),
  phone: z.string().max(50).optional(),
  parentAccountId: z.number().int().positive().optional(),
  type: z
    .enum(['PROSPECT', 'CUSTOMER', 'PARTNER', 'COMPETITOR', 'CHURNED', 'OTHER'])
    .optional(),
  industry: z.string().max(100).optional(),
  employeeCount: z
    .enum(['SOLO', 'MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE'])
    .optional(),
  annualRevenue: z.number().positive().optional(),
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
    const id = parseInt(req.params.id, 10);
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
    const id = parseInt(req.params.id, 10);
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
    const id = parseInt(req.params.id, 10);
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
    const id = parseInt(req.params.id, 10);
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
    const id = parseInt(req.params.id, 10);
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
    const id = parseInt(req.params.id, 10);
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
    const id = parseInt(req.params.id, 10);
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
    const targetId = parseInt(req.params.id, 10);
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

export default router;
