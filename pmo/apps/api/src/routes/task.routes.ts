import { Router, Response } from 'express';

import { AuthenticatedRequest, requireAuth } from '../auth/auth.middleware';
import { tenantMiddleware } from '../tenant/tenant.middleware';
import {
  createTask,
  deleteTask,
  getTaskForOwner,
  listTasksForProject,
  moveTask,
  updateTask,
} from '../services/task.service';
import {
  taskCreateSchema,
  taskMoveSchema,
  taskUpdateSchema,
} from '../validation/task.schema';

const router = Router();

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

router.get(
  '/projects/:projectId/tasks',
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

    const result = await listTasksForProject(projectId, req.userId);

    if (result.error === 'not_found') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (result.error === 'forbidden') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json({ tasks: result.tasks });
  },
);

router.get(
  '/tasks/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const taskId = Number(req.params.id);

    if (Number.isNaN(taskId)) {
      res.status(400).json({ error: 'Invalid task id' });
      return;
    }

    const result = await getTaskForOwner(taskId, req.userId);

    if (result.error === 'not_found') {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (result.error === 'forbidden') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json({ task: result.task });
  },
);

// Alias for /tasks/:id - some frontend calls use /details suffix
router.get(
  '/tasks/:id/details',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const taskId = Number(req.params.id);

    if (Number.isNaN(taskId)) {
      res.status(400).json({ error: 'Invalid task id' });
      return;
    }

    const result = await getTaskForOwner(taskId, req.userId);

    if (result.error === 'not_found') {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (result.error === 'forbidden') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json({ task: result.task });
  },
);

router.post('/tasks', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parsed = taskCreateSchema.safeParse(req.body);

  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'Invalid task data', details: parsed.error.format() });
    return;
  }

  const result = await createTask(req.userId, parsed.data);

  if (result.error === 'not_found') {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (result.error === 'forbidden') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  if (result.error === 'invalid_milestone') {
    res.status(400).json({ error: 'Milestone does not belong to the project' });
    return;
  }

  res.status(201).json({ task: result.task });
});

router.patch(
  '/tasks/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const taskId = Number(req.params.id);

    if (Number.isNaN(taskId)) {
      res.status(400).json({ error: 'Invalid task id' });
      return;
    }

    const parsed = taskUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid task data', details: parsed.error.format() });
      return;
    }

    const result = await updateTask(taskId, req.userId, parsed.data);

    if (result.error === 'not_found') {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (result.error === 'forbidden') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (result.error === 'invalid_milestone') {
      res
        .status(400)
        .json({ error: 'Milestone does not belong to the project' });
      return;
    }

    res.json({ task: result.task });
  },
);

router.patch(
  '/tasks/:id/move',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const taskId = Number(req.params.id);

    if (Number.isNaN(taskId)) {
      res.status(400).json({ error: 'Invalid task id' });
      return;
    }

    const parsed = taskMoveSchema.safeParse(req.body);

    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid task data', details: parsed.error.format() });
      return;
    }

    const result = await moveTask(taskId, req.userId, parsed.data);

    if (result.error === 'not_found') {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (result.error === 'forbidden') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (result.error === 'invalid_milestone') {
      res
        .status(400)
        .json({ error: 'Milestone does not belong to the project' });
      return;
    }

    res.json({ task: result.task });
  },
);

router.delete(
  '/tasks/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const taskId = Number(req.params.id);

    if (Number.isNaN(taskId)) {
      res.status(400).json({ error: 'Invalid task id' });
      return;
    }

    const result = await deleteTask(taskId, req.userId);

    if (result.error === 'not_found') {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (result.error === 'forbidden') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.status(204).send();
  },
);

export default router;
