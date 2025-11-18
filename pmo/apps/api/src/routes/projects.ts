import { ProjectStatus } from '@prisma/client';
import { Router } from 'express';

import { AuthenticatedRequest, requireAuth } from '../auth/auth.middleware';
import prisma from '../prisma/client';
import {
  createProject,
  getProjectById,
  listProjects,
  updateProject,
} from '../services/project.service';
import {
  projectCreateSchema,
  projectUpdateSchema,
} from '../validation/project.schema';

const router = Router();

router.use(requireAuth);

router.get('/', async (req: AuthenticatedRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { clientId, status } = req.query;
  const parsedClientId =
    typeof clientId === 'string' && clientId.length > 0
      ? Number(clientId)
      : undefined;

  if (parsedClientId !== undefined && Number.isNaN(parsedClientId)) {
    res.status(400).json({ error: 'Invalid client id' });
    return;
  }

  const parsedStatus =
    typeof status === 'string' &&
    Object.values(ProjectStatus).includes(status as ProjectStatus)
      ? (status as ProjectStatus)
      : undefined;

  if (status && !parsedStatus) {
    res.status(400).json({ error: 'Invalid project status' });
    return;
  }

  const projects = await listProjects({
    ownerId: req.userId,
    clientId: parsedClientId,
    status: parsedStatus,
  });

  res.json({ projects });
});

router.get('/:id', async (req: AuthenticatedRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const projectId = Number(req.params.id);

  if (Number.isNaN(projectId)) {
    res.status(400).json({ error: 'Invalid project id' });
    return;
  }

  const project = await getProjectById(projectId);

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (project.ownerId !== req.userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  res.json({ project });
});

router.post('/', async (req: AuthenticatedRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parsed = projectCreateSchema.safeParse(req.body);

  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'Invalid project data', details: parsed.error.format() });
    return;
  }

  const client = await prisma.client.findUnique({
    where: { id: parsed.data.clientId },
  });

  if (!client) {
    res.status(404).json({ error: 'Client not found' });
    return;
  }

  const project = await createProject(req.userId, parsed.data);

  res.status(201).json({ project });
});

router.put('/:id', async (req: AuthenticatedRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const projectId = Number(req.params.id);

  if (Number.isNaN(projectId)) {
    res.status(400).json({ error: 'Invalid project id' });
    return;
  }

  const parsed = projectUpdateSchema.safeParse(req.body);

  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'Invalid project data', details: parsed.error.format() });
    return;
  }

  const project = await getProjectById(projectId);

  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  if (project.ownerId !== req.userId) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  if (parsed.data.clientId && parsed.data.clientId !== project.clientId) {
    const client = await prisma.client.findUnique({
      where: { id: parsed.data.clientId },
    });

    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
  }

  const updated = await updateProject(projectId, parsed.data);

  res.json({ project: updated });
});

export default router;
