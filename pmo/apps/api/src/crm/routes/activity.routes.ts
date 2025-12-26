/**
 * Activity Routes
 *
 * REST API endpoints for Activity management.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import * as activityService from '../services/activity.service';
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

// All routes require tenant context for isolation
router.use(tenantMiddleware);

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const activityTypeEnum = z.enum([
  'CALL',
  'EMAIL',
  'MEETING',
  'TASK',
  'NOTE',
  'SMS',
  'LINKEDIN_MESSAGE',
  'CHAT',
  'DEMO',
  'PROPOSAL',
  'CONTRACT',
  'OTHER',
]);

const activityStatusEnum = z.enum([
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]);

const activityPriorityEnum = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']);

const createActivitySchema = z.object({
  type: activityTypeEnum,
  accountId: z.number().int().positive().optional(),
  contactId: z.number().int().positive().optional(),
  opportunityId: z.number().int().positive().optional(),
  subject: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  outcome: z.string().max(2000).optional(),
  scheduledAt: z.coerce.date().optional(),
  dueAt: z.coerce.date().optional(),
  duration: z.number().int().positive().max(1440).optional(), // Max 24 hours
  status: activityStatusEnum.optional(),
  priority: activityPriorityEnum.optional(),
  externalId: z.string().max(200).optional(),
  externalSource: z.string().max(100).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const updateActivitySchema = createActivitySchema.partial().extend({
  completedAt: z.coerce.date().optional().nullable(),
  ownerId: z.number().int().positive().optional(),
});

const listActivitiesSchema = z.object({
  type: z.string().optional(), // Comma-separated types
  status: z.string().optional(), // Comma-separated statuses
  priority: activityPriorityEnum.optional(),
  accountId: z.coerce.number().int().positive().optional(),
  contactId: z.coerce.number().int().positive().optional(),
  opportunityId: z.coerce.number().int().positive().optional(),
  ownerId: z.coerce.number().int().positive().optional(),
  scheduledFrom: z.coerce.date().optional(),
  scheduledTo: z.coerce.date().optional(),
  dueFrom: z.coerce.date().optional(),
  dueTo: z.coerce.date().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const completeActivitySchema = z.object({
  outcome: z.string().max(2000).optional(),
});

const logCallSchema = z.object({
  accountId: z.number().int().positive(),
  contactId: z.number().int().positive().optional(),
  opportunityId: z.number().int().positive().optional(),
  subject: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  outcome: z.string().max(2000).optional(),
  duration: z.number().int().positive().max(1440).optional(),
});

const logNoteSchema = z.object({
  accountId: z.number().int().positive(),
  contactId: z.number().int().positive().optional(),
  opportunityId: z.number().int().positive().optional(),
  subject: z.string().max(200).optional(),
  description: z.string().min(1).max(5000),
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/crm/activities
 * List activities with filtering and pagination
 */
router.get(
  '/',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const parsed = listActivitiesSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const { page, limit, sortBy, sortOrder, type, status, ...filters } =
      parsed.data;

    const result = await activityService.listActivities(
      {
        ...filters,
        type: type
          ? (type.split(',') as activityService.ActivityType[])
          : undefined,
        status: status
          ? (status.split(',') as activityService.ActivityStatus[])
          : undefined,
      },
      { page, limit, sortBy, sortOrder },
    );

    res.json(result);
  },
);

/**
 * POST /api/crm/activities
 * Create a new activity
 */
router.post(
  '/',
  requireAuth,
  requireTenant,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = createActivitySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const activity = await activityService.createActivity({
      ...parsed.data,
      ownerId: req.userId!,
      createdById: req.userId!,
    });

    res.status(201).json({ data: activity });
  },
);

/**
 * GET /api/crm/activities/my/upcoming
 * Get my upcoming activities
 */
router.get(
  '/my/upcoming',
  requireAuth,
  requireTenant,
  async (req: AuthenticatedRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const days = parseInt(req.query.days as string, 10) || 7;

    const activities = await activityService.getMyUpcomingActivities(
      req.userId!,
      { limit, days },
    );
    res.json({ data: activities });
  },
);

/**
 * GET /api/crm/activities/my/overdue
 * Get my overdue activities
 */
router.get(
  '/my/overdue',
  requireAuth,
  requireTenant,
  async (req: AuthenticatedRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string, 10) || 10;

    const activities = await activityService.getMyOverdueActivities(
      req.userId!,
      { limit },
    );
    res.json({ data: activities });
  },
);

/**
 * GET /api/crm/activities/stats
 * Get activity statistics
 */
router.get(
  '/stats',
  requireAuth,
  requireTenant,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.query.userId
      ? parseInt(req.query.userId as string, 10)
      : req.userId;
    const dateFrom = req.query.dateFrom
      ? new Date(req.query.dateFrom as string)
      : undefined;
    const dateTo = req.query.dateTo
      ? new Date(req.query.dateTo as string)
      : undefined;

    const stats = await activityService.getActivityStats({
      userId,
      dateFrom,
      dateTo,
    });
    res.json({ data: stats });
  },
);

/**
 * GET /api/crm/activities/:id
 * Get activity by ID
 */
router.get(
  '/:id',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid activity ID' });
    }

    const activity = await activityService.getActivityById(id);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json({ data: activity });
  },
);

/**
 * PUT /api/crm/activities/:id
 * Update activity
 */
router.put(
  '/:id',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid activity ID' });
    }

    const parsed = updateActivitySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const activity = await activityService.updateActivity(id, parsed.data);
    res.json({ data: activity });
  },
);

/**
 * DELETE /api/crm/activities/:id
 * Delete activity
 */
router.delete(
  '/:id',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid activity ID' });
    }

    await activityService.deleteActivity(id);
    res.status(204).send();
  },
);

/**
 * POST /api/crm/activities/:id/complete
 * Complete activity
 */
router.post(
  '/:id/complete',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid activity ID' });
    }

    const parsed = completeActivitySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const activity = await activityService.completeActivity(
      id,
      parsed.data.outcome,
    );
    res.json({ data: activity });
  },
);

/**
 * POST /api/crm/activities/:id/cancel
 * Cancel activity
 */
router.post(
  '/:id/cancel',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid activity ID' });
    }

    const activity = await activityService.cancelActivity(id);
    res.json({ data: activity });
  },
);

// ============================================================================
// QUICK LOG SHORTCUTS
// ============================================================================

/**
 * POST /api/crm/activities/log/call
 * Quick log a call
 */
router.post(
  '/log/call',
  requireAuth,
  requireTenant,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = logCallSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const activity = await activityService.logCall(
      parsed.data.accountId,
      req.userId!,
      parsed.data,
    );
    res.status(201).json({ data: activity });
  },
);

/**
 * POST /api/crm/activities/log/note
 * Quick log a note
 */
router.post(
  '/log/note',
  requireAuth,
  requireTenant,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = logNoteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const activity = await activityService.logNote(
      parsed.data.accountId,
      req.userId!,
      parsed.data.description,
      {
        contactId: parsed.data.contactId,
        opportunityId: parsed.data.opportunityId,
        subject: parsed.data.subject,
      },
    );
    res.status(201).json({ data: activity });
  },
);

/**
 * GET /api/crm/activities/timeline/:entityType/:entityId
 * Get timeline for an entity
 */
router.get(
  '/timeline/:entityType/:entityId',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const entityType = req.params.entityType as
      | 'account'
      | 'contact'
      | 'opportunity';
    const entityId = parseInt(req.params.entityId, 10);

    if (!['account', 'contact', 'opportunity'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    if (isNaN(entityId)) {
      return res.status(400).json({ error: 'Invalid entity ID' });
    }

    const limit = parseInt(req.query.limit as string, 10) || 20;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const timeline = await activityService.getEntityTimeline(
      entityType,
      entityId,
      {
        limit,
        offset,
      },
    );
    res.json({ data: timeline });
  },
);

export default router;
