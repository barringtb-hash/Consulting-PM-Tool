import { ProjectStatus } from '@prisma/client';
import { Router, Response } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

import { AuthenticatedRequest, requireAuth } from '../auth/auth.middleware';
import prisma from '../prisma/client';
import {
  createProject,
  getProjectById,
  listProjects,
  updateProject,
  deleteProject,
} from '../services/project.service';
import {
  projectCreateSchema,
  projectUpdateSchema,
} from '../validation/project.schema';
import {
  getProjectStatus,
  buildStatusSummary,
} from '../services/projectStatus.service';
import {
  projectStatusQuerySchema,
  updateProjectHealthStatusSchema,
  statusSummaryRequestSchema,
} from '../validation/projectStatus.schema';

const router = Router();

router.use(requireAuth);

type ProjectListRequest = AuthenticatedRequest<
  ParamsDictionary,
  unknown,
  unknown,
  ParsedQs
>;

router.get('/', async (req: ProjectListRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { clientId, status, page, limit } = req.query;
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

    // Parse pagination parameters
    const parsedPage =
      typeof page === 'string' ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const parsedLimit =
      typeof limit === 'string' ? parseInt(limit, 10) || 50 : 50;

    const result = await listProjects({
      ownerId: req.userId,
      clientId: parsedClientId,
      status: parsedStatus,
      page: parsedPage,
      limit: parsedLimit,
    });

    res.json({
      projects: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('List projects error:', error);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

type ProjectParams = { id: string };

router.get(
  '/:id',
  async (req: AuthenticatedRequest<ProjectParams>, res: Response) => {
    try {
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
    } catch (error) {
      console.error('Get project error:', error);
      res.status(500).json({ error: 'Failed to get project' });
    }
  },
);

router.post('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = projectCreateSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid project data',
        details: parsed.error.format(),
      });
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
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

router.put(
  '/:id',
  async (req: AuthenticatedRequest<ProjectParams>, res: Response) => {
    try {
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
        res.status(400).json({
          error: 'Invalid project data',
          details: parsed.error.format(),
        });
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
    } catch (error) {
      console.error('Update project error:', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  },
);

router.delete(
  '/:id',
  async (req: AuthenticatedRequest<ProjectParams>, res: Response) => {
    try {
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

      await deleteProject(projectId);

      res.status(204).send();
    } catch (error) {
      console.error('Delete project error:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  },
);

// M7 - Status & Reporting Routes

/**
 * GET /projects/:id/status
 * Get project status snapshot with metrics and aggregated data
 */
router.get(
  '/:id/status',
  async (req: AuthenticatedRequest<ProjectParams>, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const projectId = Number(req.params.id);

      if (Number.isNaN(projectId)) {
        res.status(400).json({ error: 'Invalid project id' });
        return;
      }

      // Validate query params
      const queryParsed = projectStatusQuerySchema.safeParse(req.query);

      if (!queryParsed.success) {
        res.status(400).json({
          error: 'Invalid query parameters',
          details: queryParsed.error.format(),
        });
        return;
      }

      // Check project exists and user has access
      const project = await getProjectById(projectId);

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (project.ownerId !== req.userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      // Get status snapshot
      const snapshot = await getProjectStatus(
        projectId,
        queryParsed.data.rangeDays,
      );

      res.json(snapshot);
    } catch (error) {
      console.error('Get project status error:', error);
      res.status(500).json({ error: 'Failed to get project status' });
    }
  },
);

/**
 * PATCH /projects/:id/status
 * Update project health status and summary
 */
router.patch(
  '/:id/status',
  async (req: AuthenticatedRequest<ProjectParams>, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const projectId = Number(req.params.id);

      if (Number.isNaN(projectId)) {
        res.status(400).json({ error: 'Invalid project id' });
        return;
      }

      // Validate body
      const bodyParsed = updateProjectHealthStatusSchema.safeParse(req.body);

      if (!bodyParsed.success) {
        res.status(400).json({
          error: 'Invalid status data',
          details: bodyParsed.error.format(),
        });
        return;
      }

      // Check project exists and user has access
      const project = await getProjectById(projectId);

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (project.ownerId !== req.userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      // Update project status
      const updated = await prisma.project.update({
        where: { id: projectId },
        data: {
          healthStatus: bodyParsed.data.healthStatus,
          statusSummary: bodyParsed.data.statusSummary,
          statusUpdatedAt: new Date(),
        },
      });

      res.json({
        healthStatus: updated.healthStatus,
        statusSummary: updated.statusSummary,
        statusUpdatedAt: updated.statusUpdatedAt,
      });
    } catch (error) {
      console.error('Update project status error:', error);
      res.status(500).json({ error: 'Failed to update project status' });
    }
  },
);

/**
 * POST /projects/:id/status-summary
 * Generate a time-boxed status summary for reporting
 */
router.post(
  '/:id/status-summary',
  async (req: AuthenticatedRequest<ProjectParams>, res: Response) => {
    try {
      if (!req.userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const projectId = Number(req.params.id);

      if (Number.isNaN(projectId)) {
        res.status(400).json({ error: 'Invalid project id' });
        return;
      }

      // Validate body
      const bodyParsed = statusSummaryRequestSchema.safeParse(req.body);

      if (!bodyParsed.success) {
        res.status(400).json({
          error: 'Invalid summary request',
          details: bodyParsed.error.format(),
        });
        return;
      }

      // Check project exists and user has access
      const project = await getProjectById(projectId);

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (project.ownerId !== req.userId) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      // Build status summary
      const summary = await buildStatusSummary({
        projectId,
        from: bodyParsed.data.from,
        to: bodyParsed.data.to,
        rangeDays: bodyParsed.data.rangeDays,
      });

      res.json(summary);
    } catch (error) {
      console.error('Generate status summary error:', error);
      res.status(500).json({ error: 'Failed to generate status summary' });
    }
  },
);

export default router;
