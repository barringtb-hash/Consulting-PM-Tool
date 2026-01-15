/**
 * Risks Router
 *
 * REST API endpoints for managing Project Risks within the RAID module.
 * Wraps the existing ProjectRisk Prisma model.
 *
 * Routes:
 * - GET    /projects/:projectId/risks   - List risks by project
 * - POST   /projects/:projectId/risks   - Create risk
 * - GET    /:id                         - Get risk by ID
 * - PUT    /:id                         - Update risk
 * - DELETE /:id                         - Delete risk
 *
 * @module modules/raid
 */

import { Router, Response } from 'express';
import { z } from 'zod';

import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import { tenantMiddleware } from '../../tenant/tenant.middleware';
import { getTenantId, hasTenantContext } from '../../tenant/tenant.context';
import { prisma } from '../../prisma/client';
import { hasProjectAccess } from '../../utils/project-access';
import type { RiskStatus, RiskSeverity, RiskLikelihood } from '@prisma/client';

const router = Router();

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

// =============================================================================
// Schemas
// =============================================================================

const createRiskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  // Map to Prisma schema fields: severity (not impact), likelihood (not probability)
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  likelihood: z
    .enum(['RARE', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'ALMOST_CERTAIN'])
    .default('POSSIBLE'),
  status: z
    .enum([
      'IDENTIFIED',
      'ANALYZING',
      'MITIGATING',
      'MONITORING',
      'RESOLVED',
      'ACCEPTED',
    ])
    .default('IDENTIFIED'),
  category: z
    .enum([
      'TIMELINE',
      'BUDGET',
      'SCOPE',
      'RESOURCE',
      'TECHNICAL',
      'EXTERNAL',
      'QUALITY',
    ])
    .default('TECHNICAL'),
  suggestedMitigation: z.string().max(2000).optional(),
  sourceType: z
    .enum(['MANUAL', 'MEETING', 'TASK', 'MILESTONE', 'AI_DETECTED'])
    .default('MANUAL'),
  sourceId: z.number().optional(),
  relatedQuote: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

const updateRiskSchema = createRiskSchema.partial();

const riskFiltersSchema = z.object({
  status: z.array(z.string()).optional(),
  severity: z.array(z.string()).optional(),
  likelihood: z.array(z.string()).optional(),
  limit: z.number().positive().default(50),
  offset: z.number().nonnegative().default(0),
});

// =============================================================================
// Helpers
// =============================================================================

const validateProjectAccess = async (projectId: number, userId: number) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId },
    select: {
      id: true,
      ownerId: true,
      isSharedWithTenant: true,
      visibility: true,
    },
  });

  if (!project) {
    return 'not_found' as const;
  }

  if (!hasProjectAccess(project, userId)) {
    return 'forbidden' as const;
  }

  return project;
};

// =============================================================================
// Routes
// =============================================================================

/**
 * List risks for a project
 */
router.get(
  '/projects/:projectId/risks',
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

    const projectAccess = await validateProjectAccess(projectId, req.userId);
    if (projectAccess === 'not_found') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    if (projectAccess === 'forbidden') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const tenantId = hasTenantContext() ? getTenantId() : undefined;

    try {
      const filtersParsed = riskFiltersSchema.safeParse({
        status: req.query.status
          ? (req.query.status as string).split(',')
          : undefined,
        severity: req.query.severity
          ? (req.query.severity as string).split(',')
          : undefined,
        likelihood: req.query.likelihood
          ? (req.query.likelihood as string).split(',')
          : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      });

      const filters = filtersParsed.success
        ? filtersParsed.data
        : {
            status: undefined as string[] | undefined,
            severity: undefined as string[] | undefined,
            likelihood: undefined as string[] | undefined,
            limit: 50,
            offset: 0,
          };

      const risks = await prisma.projectRisk.findMany({
        where: {
          projectId,
          tenantId,
          ...(filters.status?.length && {
            status: { in: filters.status as RiskStatus[] },
          }),
          ...(filters.severity?.length && {
            severity: { in: filters.severity as RiskSeverity[] },
          }),
          ...(filters.likelihood?.length && {
            likelihood: { in: filters.likelihood as RiskLikelihood[] },
          }),
        },
        orderBy: [
          {
            severity: 'desc',
          },
          {
            likelihood: 'desc',
          },
          { createdAt: 'desc' },
        ],
        take: filters.limit ?? 50,
        skip: filters.offset ?? 0,
      });

      const total = await prisma.projectRisk.count({
        where: { projectId, tenantId },
      });

      res.json({ risks, total });
    } catch (error) {
      console.error('Error listing risks:', error);
      res.json({ risks: [], total: 0 });
    }
  },
);

/**
 * Create a new risk
 */
router.post(
  '/projects/:projectId/risks',
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

    const projectAccess = await validateProjectAccess(projectId, req.userId);
    if (projectAccess === 'not_found') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    if (projectAccess === 'forbidden') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const parsed = createRiskSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid risk data',
        details: parsed.error.format(),
      });
      return;
    }

    const tenantId = hasTenantContext() ? getTenantId() : undefined;

    try {
      const risk = await prisma.projectRisk.create({
        data: {
          projectId,
          tenantId: tenantId ?? '',
          title: parsed.data.title,
          description: parsed.data.description ?? '',
          severity: parsed.data.severity,
          likelihood: parsed.data.likelihood,
          status: parsed.data.status,
          category: parsed.data.category,
          suggestedMitigation: parsed.data.suggestedMitigation,
          sourceType: parsed.data.sourceType,
          sourceId: parsed.data.sourceId,
          relatedQuote: parsed.data.relatedQuote,
          confidence: parsed.data.confidence,
        },
      });

      res.status(201).json({ risk });
    } catch (error) {
      console.error('Error creating risk:', error);
      res.status(500).json({ error: 'Failed to create risk' });
    }
  },
);

/**
 * Get risk by ID
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
      res.status(400).json({ error: 'Invalid risk id' });
      return;
    }

    const tenantId = hasTenantContext() ? getTenantId() : undefined;

    try {
      const risk = await prisma.projectRisk.findFirst({
        where: { id, tenantId },
        include: { project: true },
      });

      if (!risk) {
        res.status(404).json({ error: 'Risk not found' });
        return;
      }

      if (!hasProjectAccess(risk.project, req.userId)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      res.json({ risk });
    } catch (error) {
      console.error('Error getting risk:', error);
      res.status(500).json({ error: 'Failed to get risk' });
    }
  },
);

/**
 * Update risk
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
      res.status(400).json({ error: 'Invalid risk id' });
      return;
    }

    const parsed = updateRiskSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid risk data',
        details: parsed.error.format(),
      });
      return;
    }

    const tenantId = hasTenantContext() ? getTenantId() : undefined;

    try {
      const existing = await prisma.projectRisk.findFirst({
        where: { id, tenantId },
        include: { project: true },
      });

      if (!existing) {
        res.status(404).json({ error: 'Risk not found' });
        return;
      }

      if (!hasProjectAccess(existing.project, req.userId)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      const risk = await prisma.projectRisk.update({
        where: { id },
        data: parsed.data,
      });

      res.json({ risk });
    } catch (error) {
      console.error('Error updating risk:', error);
      res.status(500).json({ error: 'Failed to update risk' });
    }
  },
);

/**
 * Delete risk
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
      res.status(400).json({ error: 'Invalid risk id' });
      return;
    }

    const tenantId = hasTenantContext() ? getTenantId() : undefined;

    try {
      const existing = await prisma.projectRisk.findFirst({
        where: { id, tenantId },
        include: { project: true },
      });

      if (!existing) {
        res.status(404).json({ error: 'Risk not found' });
        return;
      }

      if (!hasProjectAccess(existing.project, req.userId)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      await prisma.projectRisk.delete({ where: { id } });

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting risk:', error);
      res.status(500).json({ error: 'Failed to delete risk' });
    }
  },
);

export default router;
