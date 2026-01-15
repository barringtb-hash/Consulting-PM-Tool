/**
 * Project Issues Router
 *
 * REST API endpoints for managing Project Issues.
 *
 * Routes:
 * - GET    /projects/:projectId/issues   - List issues by project
 * - POST   /projects/:projectId/issues   - Create issue
 * - GET    /:id                          - Get issue by ID
 * - PUT    /:id                          - Update issue
 * - DELETE /:id                          - Delete issue
 * - POST   /:id/escalate                 - Escalate issue
 *
 * @module modules/raid
 */

import { Router, Response } from 'express';

import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import { tenantMiddleware } from '../../tenant/tenant.middleware';
import {
  createProjectIssueSchema,
  updateProjectIssueSchema,
  projectIssueFiltersSchema,
  escalateIssueSchema,
} from './validation/raid.schema';
import * as projectIssueService from './services/project-issue.service';

const router = Router();

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

/**
 * List issues for a project
 */
router.get(
  '/projects/:projectId/issues',
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
    const filtersParsed = projectIssueFiltersSchema.safeParse({
      status: req.query.status
        ? (req.query.status as string).split(',')
        : undefined,
      severity: req.query.severity
        ? (req.query.severity as string).split(',')
        : undefined,
      category: req.query.category
        ? (req.query.category as string).split(',')
        : undefined,
      assigneeId: req.query.assigneeId
        ? Number(req.query.assigneeId)
        : undefined,
      escalated: req.query.escalated === 'true',
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

    const result = await projectIssueService.listByProject(
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
 * Create a new issue
 */
router.post(
  '/projects/:projectId/issues',
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

    const parsed = createProjectIssueSchema.safeParse({
      ...(req.body as Record<string, unknown>),
      projectId,
    });

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid issue data',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await projectIssueService.create(parsed.data, req.userId);

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
        res.status(500).json({ error: 'Failed to create issue' });
        return;
      }
    }

    res.status(201).json(result);
  },
);

/**
 * Get issue by ID
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
      res.status(400).json({ error: 'Invalid issue id' });
      return;
    }

    const result = await projectIssueService.getById(id, req.userId);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Issue not found' });
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
 * Update issue (PUT)
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
      res.status(400).json({ error: 'Invalid issue id' });
      return;
    }

    const parsed = updateProjectIssueSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid issue data',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await projectIssueService.update(
      id,
      parsed.data,
      req.userId,
    );

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Issue not found' });
        return;
      }
      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      if (result.error === 'database_error') {
        res.status(500).json({ error: 'Failed to update issue' });
        return;
      }
    }

    res.json(result);
  },
);

/**
 * Update issue (PATCH alias)
 */
router.patch(
  '/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid issue id' });
      return;
    }

    const parsed = updateProjectIssueSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid issue data',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await projectIssueService.update(
      id,
      parsed.data,
      req.userId,
    );

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Issue not found' });
        return;
      }
      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      if (result.error === 'database_error') {
        res.status(500).json({ error: 'Failed to update issue' });
        return;
      }
    }

    res.json(result);
  },
);

/**
 * Delete issue
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
      res.status(400).json({ error: 'Invalid issue id' });
      return;
    }

    const result = await projectIssueService.deleteIssue(id, req.userId);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Issue not found' });
        return;
      }
      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      if (result.error === 'database_error') {
        res.status(500).json({ error: 'Failed to delete issue' });
        return;
      }
    }

    res.status(204).send();
  },
);

/**
 * Escalate issue to next level
 */
router.post(
  '/:id/escalate',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid issue id' });
      return;
    }

    const parsed = escalateIssueSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid escalation data',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await projectIssueService.escalate(
      id,
      parsed.data,
      req.userId,
    );

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Issue not found' });
        return;
      }
      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      if (result.error === 'max_escalation') {
        res
          .status(400)
          .json({ error: 'Issue has reached maximum escalation level' });
        return;
      }
      if (result.error === 'database_error') {
        res.status(500).json({ error: 'Failed to escalate issue' });
        return;
      }
    }

    res.json(result);
  },
);

/**
 * Get status counts for a project
 */
router.get(
  '/projects/:projectId/issues/counts',
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

    const result = await projectIssueService.getStatusCounts(
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

/**
 * Get severity counts for a project
 */
router.get(
  '/projects/:projectId/issues/severity-counts',
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

    const result = await projectIssueService.getSeverityCounts(
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

/**
 * Get critical issues for a project
 */
router.get(
  '/projects/:projectId/issues/critical',
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

    const result = await projectIssueService.getCriticalIssues(
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
