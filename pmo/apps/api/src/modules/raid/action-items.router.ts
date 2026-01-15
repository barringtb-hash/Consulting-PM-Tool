/**
 * Action Items Router
 *
 * REST API endpoints for managing Action Items.
 *
 * Routes:
 * - GET    /projects/:projectId/action-items     - List action items by project
 * - POST   /projects/:projectId/action-items     - Create action item
 * - GET    /:id                                  - Get action item by ID
 * - PUT    /:id                                  - Update action item
 * - DELETE /:id                                  - Delete action item
 * - POST   /:id/convert-to-task                  - Convert to formal task
 *
 * @module modules/raid
 */

import { Router, Response } from 'express';

import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import { tenantMiddleware } from '../../tenant/tenant.middleware';
import {
  createActionItemSchema,
  updateActionItemSchema,
  actionItemFiltersSchema,
  convertToTaskSchema,
} from './validation/raid.schema';
import * as actionItemService from './services/action-item.service';

const router = Router();

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

/**
 * List action items for a project
 */
router.get(
  '/projects/:projectId/action-items',
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

    // Parse query filters
    const filtersParsed = actionItemFiltersSchema.safeParse({
      status: req.query.status
        ? (req.query.status as string).split(',')
        : undefined,
      priority: req.query.priority
        ? (req.query.priority as string).split(',')
        : undefined,
      assigneeId: req.query.assigneeId
        ? Number(req.query.assigneeId)
        : undefined,
      overdue: req.query.overdue === 'true',
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
    });

    if (!filtersParsed.success) {
      res.status(400).json({
        error: 'Invalid filters',
        details: filtersParsed.error.format(),
      });
      return;
    }

    const result = await actionItemService.listByProject(
      projectId,
      req.userId,
      filtersParsed.data,
    );

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

    res.json(result);
  },
);

/**
 * Create a new action item
 */
router.post(
  '/projects/:projectId/action-items',
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

    const parsed = createActionItemSchema.safeParse({
      ...(req.body as Record<string, unknown>),
      projectId,
    });

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid action item data',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await actionItemService.create(parsed.data, req.userId);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      if (result.error === 'database_error') {
        res.status(500).json({ error: 'Failed to create action item' });
        return;
      }
    }

    res.status(201).json(result);
  },
);

/**
 * Get action item by ID
 */
router.get(
  '/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid action item id' });
      return;
    }

    const result = await actionItemService.getById(id, req.userId);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Action item not found' });
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
 * Update action item
 */
router.put(
  '/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid action item id' });
      return;
    }

    const parsed = updateActionItemSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid action item data',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await actionItemService.update(id, parsed.data, req.userId);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Action item not found' });
        return;
      }
      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      if (result.error === 'database_error') {
        res.status(500).json({ error: 'Failed to update action item' });
        return;
      }
    }

    res.json(result);
  },
);

/**
 * Delete action item
 */
router.delete(
  '/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid action item id' });
      return;
    }

    const result = await actionItemService.deleteActionItem(id, req.userId);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Action item not found' });
        return;
      }
      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      if (result.error === 'database_error') {
        res.status(500).json({ error: 'Failed to delete action item' });
        return;
      }
    }

    res.status(204).send();
  },
);

/**
 * Convert action item to formal task
 */
router.post(
  '/:id/convert-to-task',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid action item id' });
      return;
    }

    const parsed = convertToTaskSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid task data',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await actionItemService.convertToTask(
      id,
      req.userId,
      parsed.data,
    );

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Action item not found' });
        return;
      }
      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      if (result.error === 'invalid_milestone') {
        res.status(400).json({ error: 'Invalid milestone for this project' });
        return;
      }
      if (result.error === 'invalid_assignees') {
        res.status(400).json({ error: 'Invalid assignees for this project' });
        return;
      }
      if (result.error === 'database_error') {
        res
          .status(500)
          .json({ error: 'Failed to convert action item to task' });
        return;
      }
    }

    res.status(201).json(result);
  },
);

/**
 * Get status counts for a project
 */
router.get(
  '/projects/:projectId/action-items/counts',
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

    const result = await actionItemService.getStatusCounts(
      projectId,
      req.userId,
    );

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

    res.json(result);
  },
);

export default router;
