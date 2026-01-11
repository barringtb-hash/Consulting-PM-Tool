/**
 * Customer Success Platform Router
 *
 * Provides API endpoints for the Customer Success Platform.
 * Modeled after Gainsight's functionality but optimized for SMB.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Priority, EngagementLevel, CSActivityType } from '@prisma/client';
import { requireAuth, AuthenticatedRequest } from '../../auth/auth.middleware';
import * as healthScoreService from './health-score.service';
import * as ctaService from './cta.service';
import * as playbookService from './playbook.service';
import * as successPlanService from './success-plan.service';
import * as engagementService from './engagement.service';
import * as analyticsService from './analytics.service';

const router = Router();

// =============================================================================
// HEALTH SCORE ENDPOINTS
// =============================================================================

/**
 * GET /api/customer-success/health-scores
 * List all client health scores with filtering
 */
router.get(
  '/health-scores',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const {
        category,
        minScore,
        maxScore,
        minChurnRisk,
        sortBy,
        sortOrder,
        limit,
        offset,
      } = req.query;

      const result = await healthScoreService.listHealthScores({
        category: category as 'HEALTHY' | 'AT_RISK' | 'CRITICAL' | undefined,
        minScore: minScore ? parseInt(minScore as string) : undefined,
        maxScore: maxScore ? parseInt(maxScore as string) : undefined,
        minChurnRisk: minChurnRisk
          ? parseFloat(minChurnRisk as string)
          : undefined,
        sortBy: sortBy as 'score' | 'churnRisk' | 'lastCalculated' | undefined,
        sortOrder: sortOrder as 'asc' | 'desc' | undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json(result);
    } catch (error) {
      console.error('Error listing health scores:', error);
      res.status(500).json({ error: 'Failed to list health scores' });
    }
  },
);

/**
 * GET /api/customer-success/health-scores/summary
 * Get portfolio health summary
 */
router.get(
  '/health-scores/summary',
  requireAuth,
  async (_req: Request, res: Response) => {
    try {
      const summary = await healthScoreService.getPortfolioHealthSummary();
      res.json(summary);
    } catch (error) {
      console.error('Error getting portfolio summary:', error);
      res.status(500).json({ error: 'Failed to get portfolio summary' });
    }
  },
);

/**
 * GET /api/customer-success/health-scores/client/:clientId
 * Get or create health score for a client
 */
router.get(
  '/health-scores/client/:clientId',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const projectId = req.query.projectId
        ? parseInt(req.query.projectId as string)
        : undefined;

      const score = await healthScoreService.getOrCreateHealthScore(
        clientId,
        projectId,
      );
      res.json(score);
    } catch (error) {
      console.error('Error getting health score:', error);
      res.status(500).json({ error: 'Failed to get health score' });
    }
  },
);

/**
 * POST /api/customer-success/health-scores/client/:clientId/calculate
 * Calculate health score for a client (auto or manual)
 */
router.post(
  '/health-scores/client/:clientId/calculate',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const {
        projectId,
        auto,
        usageScore,
        supportScore,
        engagementScore,
        sentimentScore,
        financialScore,
      } = req.body;

      let score;
      if (auto) {
        score = await healthScoreService.autoCalculateHealthScore(
          clientId,
          projectId,
        );
      } else {
        score = await healthScoreService.calculateHealthScore({
          clientId,
          projectId,
          usageScore,
          supportScore,
          engagementScore,
          sentimentScore,
          financialScore,
        });
      }

      res.json(score);
    } catch (error) {
      console.error('Error calculating health score:', error);
      res.status(500).json({ error: 'Failed to calculate health score' });
    }
  },
);

/**
 * GET /api/customer-success/health-scores/client/:clientId/history
 * Get health score history for trend analysis
 */
router.get(
  '/health-scores/client/:clientId/history',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const projectId = req.query.projectId
        ? parseInt(req.query.projectId as string)
        : undefined;
      const days = req.query.days ? parseInt(req.query.days as string) : 30;

      const history = await healthScoreService.getHealthScoreHistory(
        clientId,
        projectId,
        days,
      );
      res.json(history);
    } catch (error) {
      console.error('Error getting health score history:', error);
      res.status(500).json({ error: 'Failed to get health score history' });
    }
  },
);

// =============================================================================
// CTA ENDPOINTS
// =============================================================================

const createCTASchema = z.object({
  clientId: z.number(),
  projectId: z.number().optional(),
  type: z.enum(['RISK', 'OPPORTUNITY', 'LIFECYCLE', 'ACTIVITY', 'OBJECTIVE']),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  reason: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  playbookId: z.number().optional(),
  successPlanId: z.number().optional(),
  linkedMeetingId: z.number().optional(),
});

const updateCTASchema = z.object({
  status: z
    .enum(['OPEN', 'IN_PROGRESS', 'SNOOZED', 'COMPLETED', 'CANCELLED'])
    .optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  reason: z.string().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  snoozeUntil: z.string().datetime().nullable().optional(),
  resolutionNotes: z.string().optional(),
  outcome: z.string().optional(),
  ownerId: z.number().optional(),
  playbookId: z.number().nullable().optional(),
});

/**
 * GET /api/customer-success/ctas
 * List CTAs with filtering
 */
router.get(
  '/ctas',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        clientId,
        projectId,
        ownerId,
        type,
        status,
        priority,
        overdue,
        sortBy,
        sortOrder,
        limit,
        offset,
      } = req.query;

      const result = await ctaService.listCTAs({
        clientId: clientId ? parseInt(clientId as string) : undefined,
        projectId: projectId ? parseInt(projectId as string) : undefined,
        ownerId: ownerId ? parseInt(ownerId as string) : undefined,
        type: type as ctaService.CTAListOptions['type'],
        status: status as ctaService.CTAListOptions['status'],
        priority: priority as ctaService.CTAListOptions['priority'],
        overdue: overdue === 'true',
        sortBy: sortBy as ctaService.CTAListOptions['sortBy'],
        sortOrder: sortOrder as 'asc' | 'desc' | undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json(result);
    } catch (error) {
      console.error('Error listing CTAs:', error);
      res.status(500).json({ error: 'Failed to list CTAs' });
    }
  },
);

/**
 * GET /api/customer-success/ctas/cockpit
 * Get Cockpit view (prioritized CTAs for daily workflow)
 */
router.get(
  '/ctas/cockpit',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ownerId = req.userId!;
      const cockpit = await ctaService.getCockpit(ownerId);
      res.json(cockpit);
    } catch (error) {
      console.error('Error getting cockpit:', error);
      res.status(500).json({ error: 'Failed to get cockpit' });
    }
  },
);

/**
 * GET /api/customer-success/ctas/summary
 * Get CTA summary/statistics
 */
router.get(
  '/ctas/summary',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ownerId = req.query.all === 'true' ? undefined : req.userId!;
      const summary = await ctaService.getCTASummary(ownerId);
      res.json(summary);
    } catch (error) {
      console.error('Error getting CTA summary:', error);
      res.status(500).json({ error: 'Failed to get CTA summary' });
    }
  },
);

/**
 * GET /api/customer-success/ctas/:id
 * Get a CTA by ID
 */
router.get('/ctas/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const cta = await ctaService.getCTAById(id);

    if (!cta) {
      return res.status(404).json({ error: 'CTA not found' });
    }

    res.json(cta);
  } catch (error) {
    console.error('Error getting CTA:', error);
    res.status(500).json({ error: 'Failed to get CTA' });
  }
});

/**
 * POST /api/customer-success/ctas
 * Create a new CTA
 */
router.post(
  '/ctas',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = createCTASchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const cta = await ctaService.createCTA({
        ...parsed.data,
        ownerId: req.userId!,
        dueDate: parsed.data.dueDate
          ? new Date(parsed.data.dueDate)
          : undefined,
      });

      res.status(201).json(cta);
    } catch (error) {
      console.error('Error creating CTA:', error);
      res.status(500).json({ error: 'Failed to create CTA' });
    }
  },
);

/**
 * PATCH /api/customer-success/ctas/:id
 * Update a CTA
 */
router.patch('/ctas/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const parsed = updateCTASchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const cta = await ctaService.updateCTA(id, {
      ...parsed.data,
      dueDate:
        parsed.data.dueDate === null
          ? undefined
          : parsed.data.dueDate
            ? new Date(parsed.data.dueDate)
            : undefined,
      snoozeUntil:
        parsed.data.snoozeUntil === null
          ? undefined
          : parsed.data.snoozeUntil
            ? new Date(parsed.data.snoozeUntil)
            : undefined,
    });

    res.json(cta);
  } catch (error) {
    console.error('Error updating CTA:', error);
    res.status(500).json({ error: 'Failed to update CTA' });
  }
});

/**
 * DELETE /api/customer-success/ctas/:id
 * Delete a CTA
 */
router.delete('/ctas/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await ctaService.deleteCTA(id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting CTA:', error);
    res.status(500).json({ error: 'Failed to delete CTA' });
  }
});

// =============================================================================
// PLAYBOOK ENDPOINTS
// =============================================================================

const createPlaybookSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  ctaType: z
    .enum(['RISK', 'OPPORTUNITY', 'LIFECYCLE', 'ACTIVITY', 'OBJECTIVE'])
    .optional(),
  category: z.string().optional(),
  tasks: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().optional(),
        daysFromStart: z.number().int().min(0).optional(),
        assignToOwner: z.boolean().optional(),
      }),
    )
    .optional(),
});

const updatePlaybookSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  ctaType: z
    .enum(['RISK', 'OPPORTUNITY', 'LIFECYCLE', 'ACTIVITY', 'OBJECTIVE'])
    .nullable()
    .optional(),
  category: z.string().nullable().optional(),
});

/**
 * GET /api/customer-success/playbooks
 * List playbooks with filtering
 */
router.get('/playbooks', requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      status,
      ctaType,
      category,
      search,
      sortBy,
      sortOrder,
      limit,
      offset,
    } = req.query;

    const result = await playbookService.listPlaybooks({
      status: status as 'DRAFT' | 'ACTIVE' | 'ARCHIVED' | undefined,
      ctaType: ctaType as
        | 'RISK'
        | 'OPPORTUNITY'
        | 'LIFECYCLE'
        | 'ACTIVITY'
        | 'OBJECTIVE'
        | undefined,
      category: category as string | undefined,
      search: search as string | undefined,
      sortBy: sortBy as 'name' | 'timesUsed' | 'createdAt' | undefined,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    console.error('Error listing playbooks:', error);
    res.status(500).json({ error: 'Failed to list playbooks' });
  }
});

/**
 * GET /api/customer-success/playbooks/categories
 * Get all playbook categories
 */
router.get(
  '/playbooks/categories',
  requireAuth,
  async (_req: Request, res: Response) => {
    try {
      const categories = await playbookService.getPlaybookCategories();
      res.json(categories);
    } catch (error) {
      console.error('Error getting playbook categories:', error);
      res.status(500).json({ error: 'Failed to get playbook categories' });
    }
  },
);

/**
 * GET /api/customer-success/playbooks/popular
 * Get popular playbooks by usage
 */
router.get(
  '/playbooks/popular',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const playbooks = await playbookService.getPopularPlaybooks(limit);
      res.json(playbooks);
    } catch (error) {
      console.error('Error getting popular playbooks:', error);
      res.status(500).json({ error: 'Failed to get popular playbooks' });
    }
  },
);

/**
 * GET /api/customer-success/playbooks/:id
 * Get a playbook by ID
 */
router.get(
  '/playbooks/:id',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const playbook = await playbookService.getPlaybookById(id);

      if (!playbook) {
        return res.status(404).json({ error: 'Playbook not found' });
      }

      res.json(playbook);
    } catch (error) {
      console.error('Error getting playbook:', error);
      res.status(500).json({ error: 'Failed to get playbook' });
    }
  },
);

/**
 * POST /api/customer-success/playbooks
 * Create a new playbook
 */
router.post(
  '/playbooks',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = createPlaybookSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const playbook = await playbookService.createPlaybook({
        ...parsed.data,
        createdById: req.userId!,
      });

      res.status(201).json(playbook);
    } catch (error) {
      console.error('Error creating playbook:', error);
      res.status(500).json({ error: 'Failed to create playbook' });
    }
  },
);

/**
 * PATCH /api/customer-success/playbooks/:id
 * Update a playbook
 */
router.patch(
  '/playbooks/:id',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const parsed = updatePlaybookSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const playbook = await playbookService.updatePlaybook(id, {
        ...parsed.data,
        ctaType: parsed.data.ctaType === null ? undefined : parsed.data.ctaType,
        category:
          parsed.data.category === null ? undefined : parsed.data.category,
      });

      res.json(playbook);
    } catch (error) {
      console.error('Error updating playbook:', error);
      res.status(500).json({ error: 'Failed to update playbook' });
    }
  },
);

/**
 * DELETE /api/customer-success/playbooks/:id
 * Delete a playbook
 */
router.delete(
  '/playbooks/:id',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await playbookService.deletePlaybook(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting playbook:', error);
      res.status(500).json({ error: 'Failed to delete playbook' });
    }
  },
);

/**
 * POST /api/customer-success/playbooks/:id/clone
 * Clone a playbook
 */
router.post(
  '/playbooks/:id/clone',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { name } = req.body as { name?: string };

      if (!name) {
        return res.status(400).json({ error: 'Name is required' });
      }

      const playbook = await playbookService.clonePlaybook(
        id,
        name,
        req.userId!,
      );
      res.status(201).json(playbook);
    } catch (error) {
      console.error('Error cloning playbook:', error);
      res.status(500).json({ error: 'Failed to clone playbook' });
    }
  },
);

/**
 * POST /api/customer-success/playbooks/seed
 * Seed default playbooks
 */
router.post(
  '/playbooks/seed',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      await playbookService.seedDefaultPlaybooks(req.userId!);
      res.json({ message: 'Default playbooks seeded successfully' });
    } catch (error) {
      console.error('Error seeding playbooks:', error);
      res.status(500).json({ error: 'Failed to seed playbooks' });
    }
  },
);

// =============================================================================
// SUCCESS PLAN ENDPOINTS
// =============================================================================

const createSuccessPlanSchema = z.object({
  clientId: z.number(),
  projectId: z.number().optional(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  startDate: z.string().datetime().optional(),
  targetDate: z.string().datetime().optional(),
  customerGoals: z
    .array(
      z.object({
        goal: z.string(),
        metric: z.string().optional(),
        baseline: z.number().optional(),
        target: z.number().optional(),
      }),
    )
    .optional(),
  isCustomerVisible: z.boolean().optional(),
});

const updateSuccessPlanSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z
    .enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED'])
    .optional(),
  startDate: z.string().datetime().nullable().optional(),
  targetDate: z.string().datetime().nullable().optional(),
  customerGoals: z
    .array(
      z.object({
        goal: z.string(),
        metric: z.string().optional(),
        baseline: z.number().optional(),
        target: z.number().optional(),
      }),
    )
    .optional(),
  isCustomerVisible: z.boolean().optional(),
  customerNotes: z.string().optional(),
  ownerId: z.number().optional(),
});

/**
 * GET /api/customer-success/success-plans
 * List success plans with filtering
 */
router.get(
  '/success-plans',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const {
        clientId,
        projectId,
        ownerId,
        status,
        search,
        sortBy,
        sortOrder,
        limit,
        offset,
      } = req.query;

      const result = await successPlanService.listSuccessPlans({
        clientId: clientId ? parseInt(clientId as string) : undefined,
        projectId: projectId ? parseInt(projectId as string) : undefined,
        ownerId: ownerId ? parseInt(ownerId as string) : undefined,
        status: status as
          | 'DRAFT'
          | 'ACTIVE'
          | 'COMPLETED'
          | 'ON_HOLD'
          | 'CANCELLED'
          | undefined,
        search: search as string | undefined,
        sortBy: sortBy as
          | 'name'
          | 'targetDate'
          | 'createdAt'
          | 'progressPercent'
          | undefined,
        sortOrder: sortOrder as 'asc' | 'desc' | undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json(result);
    } catch (error) {
      console.error('Error listing success plans:', error);
      res.status(500).json({ error: 'Failed to list success plans' });
    }
  },
);

/**
 * GET /api/customer-success/success-plans/summary
 * Get success plan summary for dashboard
 */
router.get(
  '/success-plans/summary',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ownerId = req.query.all === 'true' ? undefined : req.userId!;
      const summary = await successPlanService.getSuccessPlanSummary(ownerId);
      res.json(summary);
    } catch (error) {
      console.error('Error getting success plan summary:', error);
      res.status(500).json({ error: 'Failed to get success plan summary' });
    }
  },
);

/**
 * GET /api/customer-success/success-plans/:id
 * Get a success plan by ID
 */
router.get(
  '/success-plans/:id',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const plan = await successPlanService.getSuccessPlanById(id);

      if (!plan) {
        return res.status(404).json({ error: 'Success plan not found' });
      }

      res.json(plan);
    } catch (error) {
      console.error('Error getting success plan:', error);
      res.status(500).json({ error: 'Failed to get success plan' });
    }
  },
);

/**
 * POST /api/customer-success/success-plans
 * Create a new success plan
 */
router.post(
  '/success-plans',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const parsed = createSuccessPlanSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const plan = await successPlanService.createSuccessPlan({
        ...parsed.data,
        ownerId: req.userId!,
        startDate: parsed.data.startDate
          ? new Date(parsed.data.startDate)
          : undefined,
        targetDate: parsed.data.targetDate
          ? new Date(parsed.data.targetDate)
          : undefined,
      });

      res.status(201).json(plan);
    } catch (error) {
      console.error('Error creating success plan:', error);
      res.status(500).json({ error: 'Failed to create success plan' });
    }
  },
);

/**
 * PATCH /api/customer-success/success-plans/:id
 * Update a success plan
 */
router.patch(
  '/success-plans/:id',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const parsed = updateSuccessPlanSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const plan = await successPlanService.updateSuccessPlan(id, {
        ...parsed.data,
        startDate:
          parsed.data.startDate === null
            ? undefined
            : parsed.data.startDate
              ? new Date(parsed.data.startDate)
              : undefined,
        targetDate:
          parsed.data.targetDate === null
            ? undefined
            : parsed.data.targetDate
              ? new Date(parsed.data.targetDate)
              : undefined,
      });

      res.json(plan);
    } catch (error) {
      console.error('Error updating success plan:', error);
      res.status(500).json({ error: 'Failed to update success plan' });
    }
  },
);

/**
 * DELETE /api/customer-success/success-plans/:id
 * Delete a success plan
 */
router.delete(
  '/success-plans/:id',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await successPlanService.deleteSuccessPlan(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting success plan:', error);
      res.status(500).json({ error: 'Failed to delete success plan' });
    }
  },
);

/**
 * POST /api/customer-success/success-plans/:id/objectives
 * Add an objective to a success plan
 */
router.post(
  '/success-plans/:id/objectives',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const successPlanId = parseInt(req.params.id);
      const { title, description, dueDate, successCriteria } = req.body;

      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      const plan = await successPlanService.addObjective({
        successPlanId,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        successCriteria,
      });

      res.status(201).json(plan);
    } catch (error) {
      console.error('Error adding objective:', error);
      res.status(500).json({ error: 'Failed to add objective' });
    }
  },
);

/**
 * PATCH /api/customer-success/objectives/:id
 * Update an objective
 */
router.patch(
  '/objectives/:id',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const objectiveId = parseInt(req.params.id);
      const { title, description, status, dueDate, successCriteria } = req.body;

      await successPlanService.updateObjective(objectiveId, {
        title,
        description,
        status,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        successCriteria,
      });

      res.json({ message: 'Objective updated successfully' });
    } catch (error) {
      console.error('Error updating objective:', error);
      res.status(500).json({ error: 'Failed to update objective' });
    }
  },
);

/**
 * DELETE /api/customer-success/objectives/:id
 * Delete an objective
 */
router.delete(
  '/objectives/:id',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const objectiveId = parseInt(req.params.id);
      await successPlanService.deleteObjective(objectiveId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting objective:', error);
      res.status(500).json({ error: 'Failed to delete objective' });
    }
  },
);

/**
 * POST /api/customer-success/objectives/:id/tasks
 * Add a task to an objective
 */
router.post(
  '/objectives/:id/tasks',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const objectiveId = parseInt(req.params.id);
      const { title, description, priority, dueDate } = req.body as {
        title?: string;
        description?: string;
        priority?: Priority;
        dueDate?: string;
      };

      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }

      await successPlanService.addSuccessTask({
        objectiveId,
        ownerId: req.userId!,
        title,
        description,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      });

      res.status(201).json({ message: 'Task added successfully' });
    } catch (error) {
      console.error('Error adding task:', error);
      res.status(500).json({ error: 'Failed to add task' });
    }
  },
);

/**
 * PATCH /api/customer-success/tasks/:id
 * Update a success task
 */
router.patch('/tasks/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    const { title, description, status, priority, dueDate, ownerId } = req.body;

    await successPlanService.updateSuccessTask(taskId, {
      title,
      description,
      status,
      priority,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      ownerId,
    });

    res.json({ message: 'Task updated successfully' });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

/**
 * DELETE /api/customer-success/tasks/:id
 * Delete a success task
 */
router.delete(
  '/tasks/:id',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const taskId = parseInt(req.params.id);
      await successPlanService.deleteSuccessTask(taskId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ error: 'Failed to delete task' });
    }
  },
);

// =============================================================================
// ENGAGEMENT ENDPOINTS
// =============================================================================

/**
 * GET /api/customer-success/engagement/contacts
 * List contact engagements with filtering
 */
router.get(
  '/engagement/contacts',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const {
        clientId,
        engagementLevel,
        isChampion,
        isDecisionMaker,
        limit,
        offset,
      } = req.query;

      const result = await engagementService.listContactEngagements({
        clientId: clientId ? parseInt(clientId as string) : undefined,
        engagementLevel: engagementLevel as EngagementLevel | undefined,
        isChampion:
          isChampion === 'true'
            ? true
            : isChampion === 'false'
              ? false
              : undefined,
        isDecisionMaker:
          isDecisionMaker === 'true'
            ? true
            : isDecisionMaker === 'false'
              ? false
              : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json(result);
    } catch (error) {
      console.error('Error listing contact engagements:', error);
      res.status(500).json({ error: 'Failed to list contact engagements' });
    }
  },
);

/**
 * GET /api/customer-success/engagement/client/:clientId/summary
 * Get engagement summary for a client
 */
router.get(
  '/engagement/client/:clientId/summary',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const summary =
        await engagementService.getClientEngagementSummary(clientId);
      res.json(summary);
    } catch (error) {
      console.error('Error getting engagement summary:', error);
      res.status(500).json({ error: 'Failed to get engagement summary' });
    }
  },
);

/**
 * GET /api/customer-success/engagement/contact/:contactId
 * Get engagement for a specific contact
 */
router.get(
  '/engagement/contact/:contactId',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const contactId = parseInt(req.params.contactId);
      const engagement =
        await engagementService.getOrCreateContactEngagement(contactId);
      res.json(engagement);
    } catch (error) {
      console.error('Error getting contact engagement:', error);
      res.status(500).json({ error: 'Failed to get contact engagement' });
    }
  },
);

/**
 * PATCH /api/customer-success/engagement/contact/:contactId
 * Update contact engagement
 */
router.patch(
  '/engagement/contact/:contactId',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const contactId = parseInt(req.params.contactId);
      const { isChampion, isDecisionMaker, notes } = req.body as {
        isChampion?: boolean;
        isDecisionMaker?: boolean;
        notes?: string;
      };

      const engagement = await engagementService.updateContactEngagement(
        contactId,
        {
          isChampion,
          isDecisionMaker,
          notes,
        },
      );

      res.json(engagement);
    } catch (error) {
      console.error('Error updating contact engagement:', error);
      res.status(500).json({ error: 'Failed to update contact engagement' });
    }
  },
);

/**
 * POST /api/customer-success/engagement/contact/:contactId/champion
 * Set champion status for a contact
 */
router.post(
  '/engagement/contact/:contactId/champion',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const contactId = parseInt(req.params.contactId);
      const { isChampion } = req.body as { isChampion: boolean };

      await engagementService.setChampionStatus(contactId, isChampion);
      res.json({ message: 'Champion status updated' });
    } catch (error) {
      console.error('Error setting champion status:', error);
      res.status(500).json({ error: 'Failed to set champion status' });
    }
  },
);

/**
 * POST /api/customer-success/engagement/contact/:contactId/decision-maker
 * Set decision maker status for a contact
 */
router.post(
  '/engagement/contact/:contactId/decision-maker',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const contactId = parseInt(req.params.contactId);
      const { isDecisionMaker } = req.body as { isDecisionMaker: boolean };

      await engagementService.setDecisionMakerStatus(
        contactId,
        isDecisionMaker,
      );
      res.json({ message: 'Decision maker status updated' });
    } catch (error) {
      console.error('Error setting decision maker status:', error);
      res.status(500).json({ error: 'Failed to set decision maker status' });
    }
  },
);

/**
 * POST /api/customer-success/engagement/interaction
 * Record an interaction with a contact
 */
router.post(
  '/engagement/interaction',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { contactId } = req.body as {
        contactId: number;
      };

      if (!contactId) {
        return res.status(400).json({ error: 'Contact ID is required' });
      }

      await engagementService.recordInteraction(contactId);
      res.json({ message: 'Interaction recorded' });
    } catch (error) {
      console.error('Error recording interaction:', error);
      res.status(500).json({ error: 'Failed to record interaction' });
    }
  },
);

/**
 * GET /api/customer-success/activity/client/:clientId
 * Get activity timeline for a client
 */
router.get(
  '/activity/client/:clientId',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const { projectId, contactId, limit, offset } = req.query;

      const result = await engagementService.getActivityTimeline(clientId, {
        projectId: projectId ? parseInt(projectId as string) : undefined,
        contactId: contactId ? parseInt(contactId as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json(result);
    } catch (error) {
      console.error('Error getting activity timeline:', error);
      res.status(500).json({ error: 'Failed to get activity timeline' });
    }
  },
);

/**
 * POST /api/customer-success/activity
 * Log a customer success activity
 */
router.post(
  '/activity',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        clientId,
        projectId,
        contactId,
        activityType,
        title,
        description,
        metadata,
        sentiment,
        sentimentScore,
      } = req.body as {
        clientId: number;
        projectId?: number;
        contactId?: number;
        activityType: string;
        title: string;
        description?: string;
        metadata?: Record<string, unknown>;
        sentiment?: string;
        sentimentScore?: number;
      };

      if (!clientId || !activityType || !title) {
        return res
          .status(400)
          .json({ error: 'Client ID, activity type, and title are required' });
      }

      // Validate activity type
      if (
        !Object.values(CSActivityType).includes(activityType as CSActivityType)
      ) {
        return res.status(400).json({ error: 'Invalid activity type' });
      }

      const result = await engagementService.logActivity({
        clientId,
        projectId,
        contactId,
        userId: req.userId!,
        activityType: activityType as CSActivityType,
        title,
        description,
        metadata,
        sentiment,
        sentimentScore,
      });

      res.status(201).json(result);
    } catch (error) {
      console.error('Error logging activity:', error);
      res.status(500).json({ error: 'Failed to log activity' });
    }
  },
);

// =============================================================================
// ANALYTICS ENDPOINTS
// =============================================================================

/**
 * GET /api/customer-success/analytics/dashboard
 * Get dashboard summary metrics
 */
router.get(
  '/analytics/dashboard',
  requireAuth,
  async (_req: Request, res: Response) => {
    try {
      const summary = await analyticsService.getDashboardSummary();
      res.json(summary);
    } catch (error) {
      console.error('Error getting dashboard summary:', error);
      res.status(500).json({ error: 'Failed to get dashboard summary' });
    }
  },
);

/**
 * GET /api/customer-success/analytics/portfolio
 * Get portfolio analytics
 */
router.get(
  '/analytics/portfolio',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const analytics = await analyticsService.getPortfolioAnalytics(days);
      res.json(analytics);
    } catch (error) {
      console.error('Error getting portfolio analytics:', error);
      res.status(500).json({ error: 'Failed to get portfolio analytics' });
    }
  },
);

/**
 * GET /api/customer-success/analytics/ctas
 * Get CTA analytics
 */
router.get(
  '/analytics/ctas',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const analytics = await analyticsService.getCTAAnalytics(days);
      res.json(analytics);
    } catch (error) {
      console.error('Error getting CTA analytics:', error);
      res.status(500).json({ error: 'Failed to get CTA analytics' });
    }
  },
);

/**
 * GET /api/customer-success/analytics/csm-performance
 * Get CSM performance metrics
 */
router.get(
  '/analytics/csm-performance',
  requireAuth,
  async (_req: Request, res: Response) => {
    try {
      const metrics = await analyticsService.getCSMPerformanceMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('Error getting CSM performance metrics:', error);
      res.status(500).json({ error: 'Failed to get CSM performance metrics' });
    }
  },
);

/**
 * GET /api/customer-success/analytics/time-to-value
 * Get time-to-value metrics
 */
router.get(
  '/analytics/time-to-value',
  requireAuth,
  async (_req: Request, res: Response) => {
    try {
      const metrics = await analyticsService.getTimeToValueMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('Error getting time-to-value metrics:', error);
      res.status(500).json({ error: 'Failed to get time-to-value metrics' });
    }
  },
);

export default router;
