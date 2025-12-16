import { ProjectStatus } from '@prisma/client';
import { Router, Response } from 'express';
import { ParsedQs } from 'qs';

import { requireAuth } from '../auth/auth.middleware';
import {
  tenantMiddleware,
  type TenantRequest,
} from '../tenant/tenant.middleware';
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
import { createChildLogger } from '../utils/logger';
import { env } from '../config/env';

const log = createChildLogger({ module: 'projects' });
const router = Router();

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

type ProjectListRequest = TenantRequest & {
  query: ParsedQs;
};

router.get('/', async (req: ProjectListRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { clientId, accountId, status, page, limit } = req.query;
    // Support both clientId (deprecated) and accountId
    const parsedAccountId =
      typeof accountId === 'string' && accountId.length > 0
        ? Number(accountId)
        : typeof clientId === 'string' && clientId.length > 0
          ? Number(clientId)
          : undefined;

    if (parsedAccountId !== undefined && Number.isNaN(parsedAccountId)) {
      res.status(400).json({ error: 'Invalid account id' });
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
      accountId: parsedAccountId,
      status: parsedStatus,
      page: parsedPage,
      limit: parsedLimit,
    });

    res.json({
      projects: result.data,
      meta: result.meta,
    });
  } catch (error) {
    const errorInfo = {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
      // Include stack and Prisma details for server-side logging only
      stack: error instanceof Error ? error.stack : undefined,
      code: (error as { code?: string }).code,
      meta: (error as { meta?: unknown }).meta,
    };
    log.error('List projects error', error, errorInfo);

    // In development, include only non-sensitive error details for debugging
    const isDev = env.nodeEnv === 'development';
    res.status(500).json({
      error: 'Failed to list projects',
      ...(isDev && {
        details: { message: errorInfo.message, name: errorInfo.name },
      }),
    });
  }
});

type ProjectParams = { id: string };

type ProjectRequest = TenantRequest & {
  params: ProjectParams;
};

router.get('/:id', async (req: ProjectRequest, res: Response) => {
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
    log.error('Get project error', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

router.post('/', async (req: TenantRequest, res: Response) => {
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

    // Verify account exists (support both clientId and accountId)
    const accountId = parsed.data.accountId || parsed.data.clientId;
    if (accountId) {
      const account = await prisma.account.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }
    }

    const project = await createProject(req.userId, {
      ...parsed.data,
      accountId: accountId,
    });

    res.status(201).json({ project });
  } catch (error) {
    log.error('Create project error', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

router.put('/:id', async (req: ProjectRequest, res: Response) => {
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

    // Verify account exists if changing (support both clientId and accountId)
    const newAccountId = parsed.data.accountId || parsed.data.clientId;
    if (newAccountId && newAccountId !== project.accountId) {
      const account = await prisma.account.findUnique({
        where: { id: newAccountId },
      });

      if (!account) {
        res.status(404).json({ error: 'Account not found' });
        return;
      }
    }

    const updated = await updateProject(projectId, {
      ...parsed.data,
      accountId: newAccountId || parsed.data.accountId,
    });

    res.json({ project: updated });
  } catch (error) {
    log.error('Update project error', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

router.delete('/:id', async (req: ProjectRequest, res: Response) => {
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
    log.error('Delete project error', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// M7 - Status & Reporting Routes

/**
 * GET /projects/:id/status
 * Get project status snapshot with metrics and aggregated data
 */
router.get('/:id/status', async (req: ProjectRequest, res: Response) => {
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
    log.error('Get project status error', error);
    res.status(500).json({ error: 'Failed to get project status' });
  }
});

/**
 * PATCH /projects/:id/status
 * Update project health status and summary
 */
router.patch('/:id/status', async (req: ProjectRequest, res: Response) => {
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
    log.error('Update project status error', error);
    res.status(500).json({ error: 'Failed to update project status' });
  }
});

/**
 * POST /projects/:id/status-summary
 * Generate a time-boxed status summary for reporting
 */
router.post(
  '/:id/status-summary',
  async (req: ProjectRequest, res: Response) => {
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
      log.error('Generate status summary error', error);
      res.status(500).json({ error: 'Failed to generate status summary' });
    }
  },
);

export default router;
