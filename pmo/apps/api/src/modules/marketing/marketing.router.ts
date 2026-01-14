import { Router, Response } from 'express';
import { z } from 'zod';

import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import {
  tenantMiddleware,
  TenantRequest,
} from '../../tenant/tenant.middleware';
import {
  marketingContentCreateSchema,
  marketingContentUpdateSchema,
  marketingContentListQuerySchema,
  generateContentSchema,
  repurposeContentSchema,
} from '../../validation/marketing.schema';
import {
  listMarketingContents,
  createMarketingContent,
  getMarketingContentById,
  updateMarketingContent,
  archiveMarketingContent,
  getMarketingContentsByProject,
  generateContent,
  repurposeContent,
} from './marketing.service';
import { lintMarketingContent } from '../../services/content-lint.service';
import {
  getCalendarData,
  scheduleContent,
  unscheduleContent,
  bulkSchedule,
} from './services/calendar.service';
import {
  getQueue,
  addToQueue,
  removeFromQueue,
  reorderQueue,
  autoScheduleQueue,
} from './services/content-queue.service';
import {
  getAllOptimalTimes,
  getOptimalTimes,
  initializeDefaultTimes,
} from './services/optimal-scheduling.service';

const router = Router();

router.use(requireAuth);
router.use(tenantMiddleware);

/**
 * GET /api/marketing-contents
 * List all marketing contents with optional filters
 */
router.get(
  '/marketing-contents',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = marketingContentListQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await listMarketingContents(req.userId, parsed.data);

    res.json({ contents: result.contents });
  },
);

/**
 * POST /api/marketing-contents
 * Create a new marketing content item
 */
router.post(
  '/marketing-contents',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = marketingContentCreateSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid content data',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await createMarketingContent(req.userId, parsed.data);

    if ('error' in result) {
      if (result.error === 'client_not_found') {
        res.status(404).json({ error: 'Client not found' });
        return;
      }

      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    res.status(201).json({ content: result.content });
  },
);

/**
 * GET /api/marketing-contents/:id
 * Get a single marketing content by ID
 */
router.get(
  '/marketing-contents/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const contentId = Number(req.params.id);

    if (Number.isNaN(contentId)) {
      res.status(400).json({ error: 'Invalid content id' });
      return;
    }

    const result = await getMarketingContentById(contentId, req.userId);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Content not found' });
        return;
      }

      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    res.json({ content: result.content });
  },
);

/**
 * PATCH /api/marketing-contents/:id
 * Update a marketing content item
 */
router.patch(
  '/marketing-contents/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const contentId = Number(req.params.id);

    if (Number.isNaN(contentId)) {
      res.status(400).json({ error: 'Invalid content id' });
      return;
    }

    const parsed = marketingContentUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid content data',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await updateMarketingContent(
      contentId,
      req.userId,
      parsed.data,
    );

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Content not found' });
        return;
      }

      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    res.json({ content: result.content });
  },
);

/**
 * DELETE /api/marketing-contents/:id
 * Archive a marketing content item (soft delete)
 */
router.delete(
  '/marketing-contents/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const contentId = Number(req.params.id);

    if (Number.isNaN(contentId)) {
      res.status(400).json({ error: 'Invalid content id' });
      return;
    }

    const result = await archiveMarketingContent(contentId, req.userId);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Content not found' });
        return;
      }

      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    res.status(204).send();
  },
);

/**
 * GET /api/projects/:projectId/marketing-contents
 * Get all marketing contents for a specific project
 */
router.get(
  '/projects/:projectId/marketing-contents',
  async (req: AuthenticatedRequest<{ projectId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const projectId = Number(req.params.projectId);

    if (Number.isNaN(projectId)) {
      res.status(400).json({ error: 'Invalid project id' });
      return;
    }

    const result = await getMarketingContentsByProject(projectId, req.userId);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    res.json({ contents: result.contents });
  },
);

/**
 * POST /api/marketing-contents/generate
 * Generate marketing content from project or meeting data using AI
 */
router.post(
  '/marketing-contents/generate',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = generateContentSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid generation parameters',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await generateContent(req.userId, parsed.data);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({
          error: `${parsed.data.sourceType === 'project' ? 'Project' : 'Meeting'} not found`,
        });
        return;
      }

      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      if (result.error === 'invalid_source_type') {
        res.status(400).json({ error: 'Invalid source type' });
        return;
      }
    }

    res.json({ generated: result.generated });
  },
);

/**
 * POST /api/projects/:projectId/marketing-contents/generate
 * Generate marketing content from a specific project
 */
router.post(
  '/projects/:projectId/marketing-contents/generate',
  async (req: AuthenticatedRequest<{ projectId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const projectId = Number(req.params.projectId);

    if (Number.isNaN(projectId)) {
      res.status(400).json({ error: 'Invalid project id' });
      return;
    }

    // Validate the rest of the request body
    const bodySchema = generateContentSchema.omit({
      sourceType: true,
      sourceId: true,
    });
    const parsed = bodySchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid generation parameters',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await generateContent(req.userId, {
      ...parsed.data,
      sourceType: 'project',
      sourceId: projectId,
    });

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    res.json({ generated: result.generated });
  },
);

/**
 * POST /api/meetings/:meetingId/marketing-contents/generate
 * Generate marketing content from a specific meeting
 */
router.post(
  '/meetings/:meetingId/marketing-contents/generate',
  async (req: AuthenticatedRequest<{ meetingId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const meetingId = Number(req.params.meetingId);

    if (Number.isNaN(meetingId)) {
      res.status(400).json({ error: 'Invalid meeting id' });
      return;
    }

    // Validate the rest of the request body
    const bodySchema = generateContentSchema.omit({
      sourceType: true,
      sourceId: true,
    });
    const parsed = bodySchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid generation parameters',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await generateContent(req.userId, {
      ...parsed.data,
      sourceType: 'meeting',
      sourceId: meetingId,
    });

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Meeting not found' });
        return;
      }

      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    res.json({ generated: result.generated });
  },
);

/**
 * POST /api/marketing-contents/:id/repurpose
 * Repurpose existing content to a different type/channel
 */
router.post(
  '/marketing-contents/:id/repurpose',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const contentId = Number(req.params.id);

    if (Number.isNaN(contentId)) {
      res.status(400).json({ error: 'Invalid content id' });
      return;
    }

    const parsed = repurposeContentSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid repurpose parameters',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await repurposeContent(contentId, req.userId, parsed.data);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Content not found' });
        return;
      }

      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    res.json(result);
  },
);

/**
 * POST /api/marketing-contents/lint
 * Lint content for quality and safety issues
 */
const lintContentSchema = z.object({
  title: z.string().optional(),
  body: z.string(),
  summary: z.string().optional(),
});

router.post(
  '/marketing-contents/lint',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = lintContentSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid content data',
        details: parsed.error.format(),
      });
      return;
    }

    const lintResult = lintMarketingContent(parsed.data);

    res.json({ lintResult });
  },
);

// ============================================================================
// Calendar Endpoints
// ============================================================================

/**
 * Zod schema for calendar query parameters.
 */
const calendarQuerySchema = z.object({
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid start date format',
  }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid end date format',
  }),
});

/**
 * Zod schema for scheduling content.
 */
const scheduleContentSchema = z.object({
  scheduledFor: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  platforms: z.array(z.string()).optional().default([]),
});

/**
 * Zod schema for bulk scheduling.
 */
const bulkScheduleSchema = z.object({
  items: z.array(
    z.object({
      contentId: z.number().int().positive(),
      scheduledFor: z.string().refine((val) => !isNaN(Date.parse(val)), {
        message: 'Invalid date format',
      }),
    }),
  ),
});

/**
 * GET /api/marketing-contents/calendar
 * Get calendar data for a date range
 */
router.get(
  '/marketing-contents/calendar',
  async (req: TenantRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = calendarQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: parsed.error.format(),
      });
      return;
    }

    const tenantId = req.tenantContext?.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant ID required' });
      return;
    }

    try {
      const calendarData = await getCalendarData(
        tenantId,
        new Date(parsed.data.startDate),
        new Date(parsed.data.endDate),
      );

      res.json({ calendar: calendarData });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve calendar data',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

/**
 * POST /api/marketing-contents/:id/schedule
 * Schedule content to a specific time
 */
router.post(
  '/marketing-contents/:id/schedule',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const contentId = Number(req.params.id);

    if (Number.isNaN(contentId)) {
      res.status(400).json({ error: 'Invalid content id' });
      return;
    }

    const parsed = scheduleContentSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid schedule data',
        details: parsed.error.format(),
      });
      return;
    }

    try {
      const result = await scheduleContent(
        contentId,
        new Date(parsed.data.scheduledFor),
        parsed.data.platforms,
      );

      res.json({ content: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('not found') || message.includes('access denied')) {
        res.status(404).json({ error: 'Content not found' });
        return;
      }

      if (message.includes('must be in the future')) {
        res.status(400).json({ error: message });
        return;
      }

      res.status(500).json({
        error: 'Failed to schedule content',
        message,
      });
    }
  },
);

/**
 * DELETE /api/marketing-contents/:id/schedule
 * Unschedule content (remove scheduled time)
 */
router.delete(
  '/marketing-contents/:id/schedule',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const contentId = Number(req.params.id);

    if (Number.isNaN(contentId)) {
      res.status(400).json({ error: 'Invalid content id' });
      return;
    }

    try {
      const result = await unscheduleContent(contentId);

      res.json({ content: result });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('not found') || message.includes('access denied')) {
        res.status(404).json({ error: 'Content not found' });
        return;
      }

      if (message.includes('Cannot unschedule published content')) {
        res.status(400).json({ error: message });
        return;
      }

      res.status(500).json({
        error: 'Failed to unschedule content',
        message,
      });
    }
  },
);

/**
 * GET /api/marketing-contents/:id/optimal-times
 * Get optimal scheduling times for a specific content item
 */
router.get(
  '/marketing-contents/:id/optimal-times',
  async (req: TenantRequest & { params: { id: string } }, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const contentId = Number(req.params.id);

    if (Number.isNaN(contentId)) {
      res.status(400).json({ error: 'Invalid content id' });
      return;
    }

    const tenantId = req.tenantContext?.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant ID required' });
      return;
    }

    try {
      // First get the content to determine its channel/platform
      const contentResult = await getMarketingContentById(
        contentId,
        req.userId,
      );

      if ('error' in contentResult) {
        if (contentResult.error === 'not_found') {
          res.status(404).json({ error: 'Content not found' });
          return;
        }
        if (contentResult.error === 'forbidden') {
          res.status(403).json({ error: 'Forbidden' });
          return;
        }
      }

      const channel = contentResult.content?.channel || 'LINKEDIN';
      const optimalTimes = await getOptimalTimes(tenantId, channel, 10);

      res.json({ optimalTimes });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve optimal times',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

/**
 * POST /api/marketing-contents/bulk-schedule
 * Bulk schedule multiple content items
 */
router.post(
  '/marketing-contents/bulk-schedule',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = bulkScheduleSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid bulk schedule data',
        details: parsed.error.format(),
      });
      return;
    }

    try {
      const items = parsed.data.items.map((item) => ({
        contentId: item.contentId,
        scheduledFor: new Date(item.scheduledFor),
      }));

      const results = await bulkSchedule(items);

      res.json({
        scheduled: results,
        count: results.length,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to bulk schedule content',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

// ============================================================================
// Queue Endpoints
// ============================================================================

/**
 * Zod schema for adding content to queue.
 */
const addToQueueSchema = z.object({
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  autoSchedule: z.boolean().optional(),
  targetDateStart: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    })
    .optional(),
  targetDateEnd: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    })
    .optional(),
  platforms: z.array(z.string()).optional(),
});

/**
 * Zod schema for reordering queue items.
 */
const reorderQueueSchema = z.object({
  items: z.array(
    z.object({
      contentId: z.number().int().positive(),
      position: z.number().int().positive(),
    }),
  ),
});

/**
 * GET /api/marketing-contents/queue
 * Get the content scheduling queue
 */
router.get(
  '/marketing-contents/queue',
  async (req: TenantRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tenantId = req.tenantContext?.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant ID required' });
      return;
    }

    try {
      const queue = await getQueue(tenantId);

      res.json({ queue });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to retrieve queue',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

/**
 * POST /api/marketing-contents/:id/queue
 * Add content to the scheduling queue
 */
router.post(
  '/marketing-contents/:id/queue',
  async (req: TenantRequest & { params: { id: string } }, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const contentId = Number(req.params.id);

    if (Number.isNaN(contentId)) {
      res.status(400).json({ error: 'Invalid content id' });
      return;
    }

    const tenantId = req.tenantContext?.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant ID required' });
      return;
    }

    const parsed = addToQueueSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid queue options',
        details: parsed.error.format(),
      });
      return;
    }

    try {
      const options = {
        ...parsed.data,
        targetDateStart: parsed.data.targetDateStart
          ? new Date(parsed.data.targetDateStart)
          : undefined,
        targetDateEnd: parsed.data.targetDateEnd
          ? new Date(parsed.data.targetDateEnd)
          : undefined,
      };

      const queueItem = await addToQueue(tenantId, contentId, options);

      res.status(201).json({ queueItem });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message.includes('not found') || message.includes('access denied')) {
        res.status(404).json({ error: 'Content not found' });
        return;
      }

      res.status(500).json({
        error: 'Failed to add to queue',
        message,
      });
    }
  },
);

/**
 * DELETE /api/marketing-contents/:id/queue
 * Remove content from the scheduling queue
 */
router.delete(
  '/marketing-contents/:id/queue',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const contentId = Number(req.params.id);

    if (Number.isNaN(contentId)) {
      res.status(400).json({ error: 'Invalid content id' });
      return;
    }

    try {
      await removeFromQueue(contentId);

      res.status(204).send();
    } catch (error) {
      res.status(500).json({
        error: 'Failed to remove from queue',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

/**
 * PATCH /api/marketing-contents/queue/reorder
 * Reorder items in the queue
 */
router.patch(
  '/marketing-contents/queue/reorder',
  async (req: TenantRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tenantId = req.tenantContext?.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant ID required' });
      return;
    }

    const parsed = reorderQueueSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid reorder data',
        details: parsed.error.format(),
      });
      return;
    }

    try {
      await reorderQueue(tenantId, parsed.data.items);

      // Return the updated queue
      const queue = await getQueue(tenantId);

      res.json({ queue });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to reorder queue',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

/**
 * POST /api/marketing-contents/queue/auto-schedule
 * Auto-schedule all queued items with autoSchedule enabled
 */
router.post(
  '/marketing-contents/queue/auto-schedule',
  async (req: TenantRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tenantId = req.tenantContext?.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant ID required' });
      return;
    }

    try {
      const scheduledItems = await autoScheduleQueue(tenantId);

      res.json({
        scheduled: scheduledItems,
        count: scheduledItems.length,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to auto-schedule queue',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

// ============================================================================
// Optimal Times Endpoints
// ============================================================================

/**
 * GET /api/optimal-times
 * Get all optimal times for the tenant
 */
router.get('/optimal-times', async (req: TenantRequest, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const tenantId = req.tenantContext?.tenantId;
  if (!tenantId) {
    res.status(400).json({ error: 'Tenant ID required' });
    return;
  }

  try {
    const optimalTimes = await getAllOptimalTimes(tenantId);

    res.json({ optimalTimes });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve optimal times',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/optimal-times/initialize
 * Initialize default optimal times for the tenant
 */
router.post(
  '/optimal-times/initialize',
  async (req: TenantRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tenantId = req.tenantContext?.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant ID required' });
      return;
    }

    try {
      await initializeDefaultTimes(tenantId);

      // Return the newly created optimal times
      const optimalTimes = await getAllOptimalTimes(tenantId);

      res.status(201).json({
        message: 'Default optimal times initialized',
        optimalTimes,
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to initialize optimal times',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

export default router;
