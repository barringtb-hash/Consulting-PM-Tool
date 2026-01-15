/**
 * Decisions Router
 *
 * REST API endpoints for managing Decisions.
 *
 * Routes:
 * - GET    /projects/:projectId/decisions   - List decisions by project
 * - POST   /projects/:projectId/decisions   - Create decision
 * - GET    /:id                             - Get decision by ID
 * - PUT    /:id                             - Update decision
 * - DELETE /:id                             - Delete decision
 * - POST   /:id/supersede                   - Mark as superseded
 *
 * @module modules/raid
 */

import { Router, Response } from 'express';

import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import { tenantMiddleware } from '../../tenant/tenant.middleware';
import {
  createDecisionSchema,
  updateDecisionSchema,
  decisionFiltersSchema,
  supersedeDecisionSchema,
} from './validation/raid.schema';
import * as decisionService from './services/decision.service';

const router = Router();

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

/**
 * List decisions for a project
 */
router.get(
  '/projects/:projectId/decisions',
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
    const filtersParsed = decisionFiltersSchema.safeParse({
      status: req.query.status
        ? (req.query.status as string).split(',')
        : undefined,
      impact: req.query.impact
        ? (req.query.impact as string).split(',')
        : undefined,
      decisionMakerId: req.query.decisionMakerId
        ? Number(req.query.decisionMakerId)
        : undefined,
      fromDate: req.query.fromDate
        ? new Date(req.query.fromDate as string)
        : undefined,
      toDate: req.query.toDate
        ? new Date(req.query.toDate as string)
        : undefined,
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

    const result = await decisionService.listByProject(
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
 * Create a new decision
 */
router.post(
  '/projects/:projectId/decisions',
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

    const parsed = createDecisionSchema.safeParse({
      ...(req.body as Record<string, unknown>),
      projectId,
    });

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid decision data',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await decisionService.create(parsed.data, req.userId);

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
        res.status(500).json({ error: 'Failed to create decision' });
        return;
      }
    }

    res.status(201).json(result);
  },
);

/**
 * Get decision by ID
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
      res.status(400).json({ error: 'Invalid decision id' });
      return;
    }

    const result = await decisionService.getById(id, req.userId);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Decision not found' });
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
 * Update decision
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
      res.status(400).json({ error: 'Invalid decision id' });
      return;
    }

    const parsed = updateDecisionSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid decision data',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await decisionService.update(id, parsed.data, req.userId);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Decision not found' });
        return;
      }
      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      if (result.error === 'database_error') {
        res.status(500).json({ error: 'Failed to update decision' });
        return;
      }
    }

    res.json(result);
  },
);

/**
 * Delete decision
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
      res.status(400).json({ error: 'Invalid decision id' });
      return;
    }

    const result = await decisionService.deleteDecision(id, req.userId);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Decision not found' });
        return;
      }
      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      if (result.error === 'database_error') {
        res.status(500).json({ error: 'Failed to delete decision' });
        return;
      }
    }

    res.status(204).send();
  },
);

/**
 * Mark decision as superseded by another decision
 */
router.post(
  '/:id/supersede',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid decision id' });
      return;
    }

    const parsed = supersedeDecisionSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid supersede data',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await decisionService.supersede(id, parsed.data, req.userId);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Decision not found' });
        return;
      }
      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      if (result.error === 'invalid_decision') {
        res.status(400).json({
          error: 'Invalid new decision - must exist and be in same project',
        });
        return;
      }
      if (result.error === 'database_error') {
        res.status(500).json({ error: 'Failed to supersede decision' });
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
  '/projects/:projectId/decisions/counts',
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

    const result = await decisionService.getStatusCounts(projectId, req.userId);

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
 * Get decisions pending review
 */
router.get(
  '/projects/:projectId/decisions/pending-reviews',
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

    const result = await decisionService.getPendingReviews(
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
