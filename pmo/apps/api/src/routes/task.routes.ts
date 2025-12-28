import { Router, Response } from 'express';

import { AuthenticatedRequest, requireAuth } from '../auth/auth.middleware';
import { tenantMiddleware } from '../tenant/tenant.middleware';
import {
  createSubtask,
  createTask,
  deleteTask,
  getTaskForOwner,
  getTaskWithSubtasks,
  listSubtasks,
  listTasksForProject,
  listTasksForUser,
  moveTask,
  toggleSubtask,
  updateSubtaskStatus,
  updateTask,
} from '../services/task.service';
import {
  subtaskCreateSchema,
  subtaskUpdateStatusSchema,
  taskCreateSchema,
  taskMoveSchema,
  taskUpdateSchema,
} from '../validation/task.schema';

const router = Router();

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

// Get all tasks assigned to the current user (including subtasks)
router.get('/tasks/my', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const result = await listTasksForUser(req.userId);
  res.json({ tasks: result.tasks });
});

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

// Get basic task info (without subtasks) - for /tasks/:id only
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

  if (result.error === 'invalid_parent') {
    res.status(400).json({ error: 'Invalid parent task' });
    return;
  }

  if (result.error === 'invalid_assignees') {
    res
      .status(400)
      .json({ error: 'One or more assignees are not project members' });
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

    if (result.error === 'invalid_assignees') {
      res
        .status(400)
        .json({ error: 'One or more assignees are not project members' });
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

// ============================================================================
// Task detail with subtasks (for modal view)
// ============================================================================

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

    const result = await getTaskWithSubtasks(taskId, req.userId);

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

// ============================================================================
// Subtask routes
// ============================================================================

router.get(
  '/tasks/:id/subtasks',
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

    const result = await listSubtasks(taskId, req.userId);

    if (result.error === 'not_found') {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    if (result.error === 'forbidden') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json({ subtasks: result.subtasks });
  },
);

router.post(
  '/tasks/:id/subtasks',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parentTaskId = Number(req.params.id);

    if (Number.isNaN(parentTaskId)) {
      res.status(400).json({ error: 'Invalid task id' });
      return;
    }

    const parsed = subtaskCreateSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid subtask data',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await createSubtask(parentTaskId, req.userId, parsed.data);

    if (result.error === 'not_found') {
      res.status(404).json({ error: 'Parent task not found' });
      return;
    }

    if (result.error === 'forbidden') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (result.error === 'invalid_parent') {
      res.status(400).json({ error: 'Cannot add subtask to a subtask' });
      return;
    }

    if (result.error === 'invalid_milestone') {
      res
        .status(400)
        .json({ error: 'Milestone does not belong to the project' });
      return;
    }

    if (result.error === 'invalid_assignees') {
      res
        .status(400)
        .json({ error: 'One or more assignees are not project members' });
      return;
    }

    res.status(201).json({ subtask: result.subtask });
  },
);

router.patch(
  '/tasks/:id/subtasks/:subtaskId/toggle',
  async (
    req: AuthenticatedRequest<{ id: string; subtaskId: string }>,
    res: Response,
  ) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parentTaskId = Number(req.params.id);
    const subtaskId = Number(req.params.subtaskId);

    if (Number.isNaN(parentTaskId)) {
      res.status(400).json({ error: 'Invalid parent task id' });
      return;
    }

    if (Number.isNaN(subtaskId)) {
      res.status(400).json({ error: 'Invalid subtask id' });
      return;
    }

    const result = await toggleSubtask(subtaskId, req.userId, parentTaskId);

    if (result.error === 'not_found') {
      res.status(404).json({ error: 'Subtask not found' });
      return;
    }

    if (result.error === 'forbidden') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (result.error === 'not_subtask') {
      res.status(400).json({ error: 'Task is not a subtask' });
      return;
    }

    if (result.error === 'parent_mismatch') {
      res
        .status(400)
        .json({ error: 'Subtask does not belong to specified parent task' });
      return;
    }

    res.json({ subtask: result.subtask });
  },
);

router.patch(
  '/tasks/:id/subtasks/:subtaskId/status',
  async (
    req: AuthenticatedRequest<{ id: string; subtaskId: string }>,
    res: Response,
  ) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parentTaskId = Number(req.params.id);
    const subtaskId = Number(req.params.subtaskId);

    if (Number.isNaN(parentTaskId)) {
      res.status(400).json({ error: 'Invalid parent task id' });
      return;
    }

    if (Number.isNaN(subtaskId)) {
      res.status(400).json({ error: 'Invalid subtask id' });
      return;
    }

    const parsed = subtaskUpdateStatusSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid status data',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await updateSubtaskStatus(
      subtaskId,
      req.userId,
      parsed.data,
      parentTaskId,
    );

    if (result.error === 'not_found') {
      res.status(404).json({ error: 'Subtask not found' });
      return;
    }

    if (result.error === 'forbidden') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (result.error === 'not_subtask') {
      res.status(400).json({ error: 'Task is not a subtask' });
      return;
    }

    if (result.error === 'parent_mismatch') {
      res
        .status(400)
        .json({ error: 'Subtask does not belong to specified parent task' });
      return;
    }

    res.json({ subtask: result.subtask });
  },
);

export default router;
