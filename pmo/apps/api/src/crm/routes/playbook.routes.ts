/**
 * Playbook Routes
 *
 * REST API endpoints for Playbook management.
 * Playbooks are tenant-scoped templates for standardized CS responses.
 */

import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import * as playbookService from '../services/playbook.service';
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
  createPlaybookSchema,
  updatePlaybookSchema,
  listPlaybooksSchema,
  addPlaybookTaskSchema,
  updatePlaybookTaskSchema,
  reorderPlaybookTasksSchema,
  clonePlaybookSchema,
} from '../../validation/crm/playbook.schema';

// Helper to check if error is a "not found" error
function isNotFoundError(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  ) {
    return true;
  }
  if (error instanceof Error && error.message.includes('not found')) {
    return true;
  }
  return false;
}

const router = Router();

// All routes require authentication and tenant context
router.use(requireAuth, tenantMiddleware);

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/crm/playbooks
 * List playbooks with filtering
 */
router.get(
  '/',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const parsed = listPlaybooksSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const result = await playbookService.listPlaybooks(parsed.data);
    res.json(result);
  },
);

/**
 * POST /api/crm/playbooks
 * Create a new playbook
 */
router.post(
  '/',
  requireAuth,
  requireTenant,
  async (req: AuthenticatedRequest, res: Response) => {
    const parsed = createPlaybookSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const playbook = await playbookService.createPlaybook({
      ...parsed.data,
      createdById: req.userId,
    });
    res.status(201).json({ data: playbook });
  },
);

/**
 * GET /api/crm/playbooks/categories
 * Get all playbook categories
 */
router.get(
  '/categories',
  requireAuth,
  requireTenant,
  async (_req: TenantRequest, res: Response) => {
    const categories = await playbookService.getPlaybookCategories();
    res.json({ data: categories });
  },
);

/**
 * GET /api/crm/playbooks/popular
 * Get popular playbooks by usage
 */
router.get(
  '/popular',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const limit = parseInt(req.query.limit as string, 10) || 5;
    const playbooks = await playbookService.getPopularPlaybooks(limit);
    res.json({ data: playbooks });
  },
);

/**
 * POST /api/crm/playbooks/seed
 * Seed default playbooks
 */
router.post(
  '/seed',
  requireAuth,
  requireTenant,
  async (req: AuthenticatedRequest, res: Response) => {
    await playbookService.seedDefaultPlaybooks(req.userId!);
    res.json({ message: 'Default playbooks seeded successfully' });
  },
);

/**
 * GET /api/crm/playbooks/:id
 * Get playbook by ID
 */
router.get(
  '/:id',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid playbook ID' });
    }

    const playbook = await playbookService.getPlaybookById(id);
    if (!playbook) {
      return res.status(404).json({ error: 'Playbook not found' });
    }

    res.json({ data: playbook });
  },
);

/**
 * PUT /api/crm/playbooks/:id
 * Update playbook
 */
router.put(
  '/:id',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid playbook ID' });
    }

    const parsed = updatePlaybookSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    try {
      const playbook = await playbookService.updatePlaybook(id, parsed.data);
      res.json({ data: playbook });
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ error: 'Playbook not found' });
      }
      throw error;
    }
  },
);

/**
 * DELETE /api/crm/playbooks/:id
 * Delete playbook
 */
router.delete(
  '/:id',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid playbook ID' });
    }

    try {
      await playbookService.deletePlaybook(id);
      res.status(204).send();
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ error: 'Playbook not found' });
      }
      throw error;
    }
  },
);

/**
 * POST /api/crm/playbooks/:id/clone
 * Clone a playbook
 */
router.post(
  '/:id/clone',
  requireAuth,
  requireTenant,
  async (req: AuthenticatedRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid playbook ID' });
    }

    const parsed = clonePlaybookSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    try {
      const playbook = await playbookService.clonePlaybook(
        id,
        parsed.data.newName,
        req.userId,
      );
      res.status(201).json({ data: playbook });
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ error: 'Playbook not found' });
      }
      throw error;
    }
  },
);

/**
 * POST /api/crm/playbooks/:id/tasks
 * Add a task to a playbook
 */
router.post(
  '/:id/tasks',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid playbook ID' });
    }

    const parsed = addPlaybookTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    try {
      const playbook = await playbookService.addPlaybookTask(id, parsed.data);
      res.status(201).json({ data: playbook });
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ error: 'Playbook not found' });
      }
      throw error;
    }
  },
);

/**
 * PUT /api/crm/playbooks/:id/tasks/:taskId
 * Update a playbook task
 */
router.put(
  '/:id/tasks/:taskId',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const taskId = parseInt(String(req.params.taskId), 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const parsed = updatePlaybookTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    try {
      await playbookService.updatePlaybookTask(taskId, parsed.data);
      // Return updated playbook
      const playbookId = parseInt(String(req.params.id), 10);
      const playbook = await playbookService.getPlaybookById(playbookId);
      res.json({ data: playbook });
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ error: 'Task not found' });
      }
      throw error;
    }
  },
);

/**
 * DELETE /api/crm/playbooks/:id/tasks/:taskId
 * Delete a playbook task
 */
router.delete(
  '/:id/tasks/:taskId',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const taskId = parseInt(String(req.params.taskId), 10);
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    try {
      await playbookService.deletePlaybookTask(taskId);
      res.status(204).send();
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ error: 'Task not found' });
      }
      throw error;
    }
  },
);

/**
 * POST /api/crm/playbooks/:id/tasks/reorder
 * Reorder playbook tasks
 */
router.post(
  '/:id/tasks/reorder',
  requireAuth,
  requireTenant,
  async (req: TenantRequest, res: Response) => {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid playbook ID' });
    }

    const parsed = reorderPlaybookTasksSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    try {
      const playbook = await playbookService.reorderPlaybookTasks(
        id,
        parsed.data.taskIds,
      );
      res.json({ data: playbook });
    } catch (error) {
      if (isNotFoundError(error)) {
        return res.status(404).json({ error: 'Playbook not found' });
      }
      throw error;
    }
  },
);

export default router;
