import { Router } from 'express';

import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import {
  CreateMeetingSchema,
  CreateTaskFromSelectionSchema,
  UpdateMeetingSchema,
} from '../../../../../packages/types/meeting';
import {
  createMeeting,
  createTaskFromSelection,
  deleteMeeting,
  getMeetingById,
  listMeetingsByProject,
  updateMeeting,
} from './meeting.service';

const router = Router();

router.use(requireAuth);

router.get(
  '/projects/:projectId/meetings',
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

    const result = await listMeetingsByProject(projectId, req.userId);

    if (result.error === 'not_found') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (result.error === 'forbidden') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json({ meetings: result.meetings });
  },
);

router.post(
  '/projects/:projectId/meetings',
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

    const parsed = CreateMeetingSchema.safeParse({ ...req.body, projectId });

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid meeting data',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await createMeeting(req.userId, parsed.data);

    if (result.error === 'not_found') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (result.error === 'forbidden') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.status(201).json({ meeting: result.meeting });
  },
);

router.get('/meetings/:id', async (req: AuthenticatedRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const meetingId = Number(req.params.id);

  if (Number.isNaN(meetingId)) {
    res.status(400).json({ error: 'Invalid meeting id' });
    return;
  }

  const result = await getMeetingById(meetingId, req.userId);

  if (result.error === 'not_found') {
    res.status(404).json({ error: 'Meeting not found' });
    return;
  }

  if (result.error === 'forbidden') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  res.json({ meeting: result.meeting });
});

router.put('/meetings/:id', async (req: AuthenticatedRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const meetingId = Number(req.params.id);

  if (Number.isNaN(meetingId)) {
    res.status(400).json({ error: 'Invalid meeting id' });
    return;
  }

  const parsed = UpdateMeetingSchema.safeParse(req.body);

  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'Invalid meeting data', details: parsed.error.format() });
    return;
  }

  const result = await updateMeeting(meetingId, req.userId, parsed.data);

  if (result.error === 'not_found') {
    res.status(404).json({ error: 'Meeting not found' });
    return;
  }

  if (result.error === 'forbidden') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  res.json({ meeting: result.meeting });
});

router.delete('/meetings/:id', async (req: AuthenticatedRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const meetingId = Number(req.params.id);

  if (Number.isNaN(meetingId)) {
    res.status(400).json({ error: 'Invalid meeting id' });
    return;
  }

  const result = await deleteMeeting(meetingId, req.userId);

  if (result.error === 'not_found') {
    res.status(404).json({ error: 'Meeting not found' });
    return;
  }

  if (result.error === 'forbidden') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  res.status(204).send();
});

router.post(
  '/meetings/:id/tasks/from-selection',
  async (req: AuthenticatedRequest, res) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const meetingId = Number(req.params.id);

    if (Number.isNaN(meetingId)) {
      res.status(400).json({ error: 'Invalid meeting id' });
      return;
    }

    const parsed = CreateTaskFromSelectionSchema.safeParse({
      ...req.body,
      meetingId,
    });

    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid task data', details: parsed.error.format() });
      return;
    }

    const result = await createTaskFromSelection(req.userId, parsed.data);

    if (result.error === 'not_found') {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }

    if (result.error === 'forbidden') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (result.error === 'project_mismatch') {
      res.status(400).json({
        error: 'Meeting does not belong to the provided project',
      });
      return;
    }

    if (result.error === 'invalid_milestone') {
      res.status(400).json({
        error: 'Milestone does not belong to the project',
      });
      return;
    }

    res.status(201).json({ task: result.task });
  },
);

export default router;
