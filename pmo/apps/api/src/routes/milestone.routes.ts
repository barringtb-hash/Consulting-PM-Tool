import { Router } from 'express';

import { AuthenticatedRequest, requireAuth } from '../auth/auth.middleware';
import {
  createMilestone,
  deleteMilestone,
  getMilestoneForOwner,
  listMilestonesForProject,
  updateMilestone,
} from '../services/milestone.service';
import {
  milestoneCreateSchema,
  milestoneUpdateSchema,
} from '../validation/milestone.schema';

const router = Router();

router.use(requireAuth);

router.get(
  '/projects/:projectId/milestones',
  async (req: AuthenticatedRequest, res) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const projectId = Number(req.params.projectId);

    if (Number.isNaN(projectId)) {
      res.status(400).json({ error: 'Invalid project id' });
      return;
    }

    const result = await listMilestonesForProject(projectId, req.userId);

    if (result.error === 'not_found') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (result.error === 'forbidden') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json({ milestones: result.milestones });
  },
);

router.get('/milestones/:id', async (req: AuthenticatedRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const milestoneId = Number(req.params.id);

  if (Number.isNaN(milestoneId)) {
    res.status(400).json({ error: 'Invalid milestone id' });
    return;
  }

  const result = await getMilestoneForOwner(milestoneId, req.userId);

  if (result.error === 'not_found') {
    res.status(404).json({ error: 'Milestone not found' });
    return;
  }

  if (result.error === 'forbidden') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  res.json({ milestone: result.milestone });
});

router.post('/milestones', async (req: AuthenticatedRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parsed = milestoneCreateSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid milestone data',
      details: parsed.error.format(),
    });
    return;
  }

  const result = await createMilestone(req.userId, parsed.data);

  if (result.error === 'not_found') {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (result.error === 'forbidden') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  res.status(201).json({ milestone: result.milestone });
});

router.patch('/milestones/:id', async (req: AuthenticatedRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const milestoneId = Number(req.params.id);

  if (Number.isNaN(milestoneId)) {
    res.status(400).json({ error: 'Invalid milestone id' });
    return;
  }

  const parsed = milestoneUpdateSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid milestone data',
      details: parsed.error.format(),
    });
    return;
  }

  const result = await updateMilestone(milestoneId, req.userId, parsed.data);

  if (result.error === 'not_found') {
    res.status(404).json({ error: 'Milestone not found' });
    return;
  }

  if (result.error === 'forbidden') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  res.json({ milestone: result.milestone });
});

router.delete('/milestones/:id', async (req: AuthenticatedRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const milestoneId = Number(req.params.id);

  if (Number.isNaN(milestoneId)) {
    res.status(400).json({ error: 'Invalid milestone id' });
    return;
  }

  const result = await deleteMilestone(milestoneId, req.userId);

  if (result.error === 'not_found') {
    res.status(404).json({ error: 'Milestone not found' });
    return;
  }

  if (result.error === 'forbidden') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  res.status(204).send();
});

export default router;
