/**
 * Audit Routes
 *
 * API endpoints for retrieving audit logs.
 */

import { Router, Response } from 'express';
import { requireAuth } from '../auth/auth.middleware';
import { requireTenant, TenantRequest } from '../tenant/tenant.middleware';
import {
  getTenantAuditLogs,
  getEntityAuditLogs,
  getAuditStats,
} from '../services/audit.service';
import { z } from 'zod';
import { AuditAction } from '@prisma/client';

const router = Router();

// All audit routes require authentication and tenant context
router.use(requireAuth);
router.use(requireTenant);

const querySchema = z.object({
  action: z.nativeEnum(AuditAction).optional(),
  entityType: z.string().optional(),
  userId: z.coerce.number().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(500).default(100),
  offset: z.coerce.number().min(0).default(0),
});

/**
 * GET /api/audit
 * Get audit logs for current tenant
 */
router.get('/', async (req: TenantRequest, res: Response) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten() });
  }

  const result = await getTenantAuditLogs({
    ...parsed.data,
    startDate: parsed.data.startDate
      ? new Date(parsed.data.startDate)
      : undefined,
    endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
  });

  res.json({
    data: result.logs,
    pagination: {
      total: result.total,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    },
  });
});

/**
 * GET /api/audit/entity/:entityType/:entityId
 * Get audit logs for a specific entity
 */
router.get(
  '/entity/:entityType/:entityId',
  async (req: TenantRequest, res: Response) => {
    const entityType = String(req.params.entityType);
    const entityId = String(req.params.entityId);
    const limit = parseInt(req.query.limit as string) || 50;

    const logs = await getEntityAuditLogs(entityType, entityId, limit);
    res.json({ data: logs });
  },
);

/**
 * GET /api/audit/stats
 * Get audit statistics for a time period
 */
router.get('/stats', async (req: TenantRequest, res: Response) => {
  const startDateParam = req.query.startDate as string;
  const endDateParam = req.query.endDate as string;

  // Default to last 30 days
  const endDate = endDateParam ? new Date(endDateParam) : new Date();
  const startDate = startDateParam
    ? new Date(startDateParam)
    : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  const stats = await getAuditStats(startDate, endDate);
  res.json({
    data: stats,
    period: { startDate, endDate },
  });
});

/**
 * GET /api/audit/actions
 * Get available audit actions for filtering
 */
router.get('/actions', (_req: TenantRequest, res: Response) => {
  res.json({
    data: Object.values(AuditAction),
  });
});

export default router;
