/**
 * Tool 2.3: Lead Scoring & CRM Assistant Router
 *
 * API endpoints for lead scoring, activity tracking, and nurture sequences
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import * as leadScoringService from './lead-scoring.service';
import {
  hasClientAccess,
  getAccessibleClientIds,
  getClientIdFromLeadScoringConfig,
  getClientIdFromScoredLead,
  getClientIdFromNurtureSequence,
} from '../../auth/client-auth.helper';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const leadScoringConfigSchema = z.object({
  scoringWeights: z
    .object({
      demographic: z.record(z.string(), z.number()).optional(),
      behavioral: z.record(z.string(), z.number()).optional(),
      engagement: z.record(z.string(), z.number()).optional(),
    })
    .optional(),
  hotThreshold: z.number().int().min(0).max(100).optional(),
  warmThreshold: z.number().int().min(0).max(100).optional(),
  coldThreshold: z.number().int().min(0).max(100).optional(),
  trackEmailOpens: z.boolean().optional(),
  trackEmailClicks: z.boolean().optional(),
  trackWebsiteVisits: z.boolean().optional(),
  trackFormSubmissions: z.boolean().optional(),
  crmType: z.string().optional(),
  crmCredentials: z.record(z.string(), z.unknown()).optional(),
  crmSyncEnabled: z.boolean().optional(),
  emailProvider: z.string().optional(),
  emailCredentials: z.record(z.string(), z.unknown()).optional(),
});

const leadSchema = z.object({
  email: z.string().email(),
  name: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  title: z.string().max(200).optional(),
  tags: z.array(z.string()).optional(),
  segments: z.array(z.string()).optional(),
  crmLeadId: z.string().optional(),
  pipelineStage: z.string().optional(),
  pipelineValue: z.number().optional(),
});

const activitySchema = z.object({
  leadId: z.number().int().optional(),
  email: z.string().email().optional(),
  activityType: z.string().min(1),
  activityData: z.record(z.string(), z.unknown()).optional(),
  source: z.string().optional(),
  medium: z.string().optional(),
  campaign: z.string().optional(),
});

const nurtureSequenceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  triggerConditions: z
    .object({
      scoreLevel: z.enum(['HOT', 'WARM', 'COLD', 'DEAD']).optional(),
      tags: z.array(z.string()).optional(),
      segments: z.array(z.string()).optional(),
    })
    .optional(),
  steps: z.array(
    z.object({
      stepId: z.string(),
      type: z.enum([
        'EMAIL',
        'SMS',
        'WAIT',
        'CONDITION',
        'TASK',
        'NOTIFICATION',
      ]),
      config: z.record(z.string(), z.unknown()).optional(),
      delayDays: z.number().int().min(0).optional(),
      delayHours: z.number().int().min(0).max(23).optional(),
    }),
  ),
  allowReEnrollment: z.boolean().optional(),
  reEnrollmentDays: z.number().int().min(1).optional(),
  exitOnConversion: z.boolean().optional(),
  exitOnReply: z.boolean().optional(),
});

// ============================================================================
// CONFIG ROUTES
// ============================================================================

/**
 * GET /api/lead-scoring/configs
 * List all lead scoring configurations (filtered by user access)
 */
router.get(
  '/lead-scoring/configs',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const clientId = req.query.clientId
      ? Number(req.query.clientId)
      : undefined;
    if (req.query.clientId && Number.isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client ID' });
      return;
    }

    // If specific clientId requested, verify access
    if (clientId) {
      const canAccess = await hasClientAccess(req.userId, clientId);
      if (!canAccess) {
        res
          .status(403)
          .json({ error: 'Forbidden: You do not have access to this client' });
        return;
      }
      const configs = await leadScoringService.listLeadScoringConfigs({
        clientId,
      });
      res.json({ configs });
      return;
    }

    // No specific clientId - filter by accessible clients
    const accessibleClientIds = await getAccessibleClientIds(req.userId);

    // If null, user is admin and can see all
    if (accessibleClientIds === null) {
      const configs = await leadScoringService.listLeadScoringConfigs({});
      res.json({ configs });
      return;
    }

    // Filter to only accessible clients
    const configs = await leadScoringService.listLeadScoringConfigs({
      clientIds: accessibleClientIds,
    });
    res.json({ configs });
  },
);

/**
 * GET /api/clients/:clientId/lead-scoring
 * Get lead scoring configuration for a client
 */
router.get(
  '/clients/:clientId/lead-scoring',
  requireAuth,
  async (req: AuthenticatedRequest<{ clientId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const clientId = Number(req.params.clientId);
    if (Number.isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client ID' });
      return;
    }

    // Authorization check
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const config = await leadScoringService.getLeadScoringConfig(clientId);
    res.json({ config });
  },
);

/**
 * POST /api/clients/:clientId/lead-scoring
 * Create lead scoring configuration for a client
 */
router.post(
  '/clients/:clientId/lead-scoring',
  requireAuth,
  async (req: AuthenticatedRequest<{ clientId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const clientId = Number(req.params.clientId);
    if (Number.isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client ID' });
      return;
    }

    // Authorization check
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const parsed = leadScoringConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const config = await leadScoringService.createLeadScoringConfig(
        clientId,
        {
          ...parsed.data,
          scoringWeights: parsed.data.scoringWeights as Prisma.InputJsonValue,
          crmCredentials: parsed.data.crmCredentials as Prisma.InputJsonValue,
          emailCredentials: parsed.data
            .emailCredentials as Prisma.InputJsonValue,
        },
      );
      res.status(201).json({ config });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        res
          .status(409)
          .json({ error: 'Config already exists for this client' });
        return;
      }
      throw error;
    }
  },
);

/**
 * PATCH /api/clients/:clientId/lead-scoring
 * Update lead scoring configuration
 */
router.patch(
  '/clients/:clientId/lead-scoring',
  requireAuth,
  async (req: AuthenticatedRequest<{ clientId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const clientId = Number(req.params.clientId);
    if (Number.isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client ID' });
      return;
    }

    // Authorization check
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const parsed = leadScoringConfigSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const config = await leadScoringService.updateLeadScoringConfig(clientId, {
      ...parsed.data,
      scoringWeights: parsed.data.scoringWeights as Prisma.InputJsonValue,
      crmCredentials: parsed.data.crmCredentials as Prisma.InputJsonValue,
      emailCredentials: parsed.data.emailCredentials as Prisma.InputJsonValue,
    });
    res.json({ config });
  },
);

// ============================================================================
// LEAD ROUTES
// ============================================================================

/**
 * POST /api/lead-scoring/:configId/leads
 * Create a new lead
 */
router.post(
  '/lead-scoring/:configId/leads',
  requireAuth,
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    // Authorization check via config
    const clientId = await getClientIdFromLeadScoringConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const parsed = leadSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const lead = await leadScoringService.createLead(configId, parsed.data);
      res.status(201).json({ lead });
    } catch (error) {
      if ((error as Error).message === 'Config not found') {
        res.status(404).json({ error: 'Config not found' });
        return;
      }
      if ((error as { code?: string }).code === 'P2002') {
        res.status(409).json({ error: 'Lead with this email already exists' });
        return;
      }
      throw error;
    }
  },
);

/**
 * GET /api/lead-scoring/:configId/leads
 * List leads
 */
router.get(
  '/lead-scoring/:configId/leads',
  requireAuth,
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    // Authorization check via config
    const clientId = await getClientIdFromLeadScoringConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const scoreLevel = req.query.scoreLevel as string | undefined;
    const minScore = req.query.minScore
      ? Number(req.query.minScore)
      : undefined;
    const maxScore = req.query.maxScore
      ? Number(req.query.maxScore)
      : undefined;
    const tags = req.query.tags
      ? (req.query.tags as string).split(',')
      : undefined;
    const segments = req.query.segments
      ? (req.query.segments as string).split(',')
      : undefined;
    const pipelineStage = req.query.pipelineStage as string | undefined;
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const sortBy =
      (req.query.sortBy as 'score' | 'lastEngagement' | 'created') || 'score';
    const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

    const leads = await leadScoringService.getLeads(configId, {
      scoreLevel: scoreLevel as 'HOT' | 'WARM' | 'COLD' | 'DEAD' | undefined,
      minScore,
      maxScore,
      tags,
      segments,
      pipelineStage,
      limit,
      offset,
      sortBy,
      sortOrder,
    });

    res.json({ leads });
  },
);

/**
 * GET /api/lead-scoring/leads/:id
 * Get a specific lead
 */
router.get(
  '/lead-scoring/leads/:id',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid lead ID' });
      return;
    }

    // Authorization check via lead
    const clientId = await getClientIdFromScoredLead(id);
    if (!clientId) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const lead = await leadScoringService.getLead(id);
    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    res.json({ lead });
  },
);

/**
 * PATCH /api/lead-scoring/leads/:id
 * Update a lead
 */
router.patch(
  '/lead-scoring/leads/:id',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid lead ID' });
      return;
    }

    // Authorization check via lead
    const clientId = await getClientIdFromScoredLead(id);
    if (!clientId) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const parsed = leadSchema
      .partial()
      .extend({
        assignedTo: z.number().int().optional(),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const lead = await leadScoringService.updateLead(id, parsed.data);
    res.json({ lead });
  },
);

/**
 * DELETE /api/lead-scoring/leads/:id
 * Delete a lead (soft delete)
 */
router.delete(
  '/lead-scoring/leads/:id',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid lead ID' });
      return;
    }

    // Authorization check via lead
    const clientId = await getClientIdFromScoredLead(id);
    if (!clientId) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    await leadScoringService.deleteLead(id);
    res.status(204).send();
  },
);

/**
 * POST /api/lead-scoring/leads/:id/rescore
 * Trigger rescore for a lead
 */
router.post(
  '/lead-scoring/leads/:id/rescore',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid lead ID' });
      return;
    }

    // Authorization check via lead
    const clientId = await getClientIdFromScoredLead(id);
    if (!clientId) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    try {
      const result = await leadScoringService.rescoreLead(id);
      res.json({ result });
    } catch (error) {
      if ((error as Error).message === 'Lead not found') {
        res.status(404).json({ error: 'Lead not found' });
        return;
      }
      throw error;
    }
  },
);

/**
 * POST /api/lead-scoring/leads/:id/predict
 * Get conversion prediction for a lead
 */
router.post(
  '/lead-scoring/leads/:id/predict',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid lead ID' });
      return;
    }

    // Authorization check via lead
    const clientId = await getClientIdFromScoredLead(id);
    if (!clientId) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    try {
      const prediction = await leadScoringService.predictConversion(id);
      res.json({ prediction });
    } catch (error) {
      if ((error as Error).message === 'Lead not found') {
        res.status(404).json({ error: 'Lead not found' });
        return;
      }
      throw error;
    }
  },
);

// ============================================================================
// ACTIVITY ROUTES
// ============================================================================

/**
 * POST /api/lead-scoring/:configId/activities
 * Track an activity
 * Note: Requires authentication to prevent unauthorized access to client data.
 * For external tracking (e.g., tracking pixels), implement a separate public
 * endpoint with API key validation or signed tokens.
 */
router.post(
  '/lead-scoring/:configId/activities',
  requireAuth,
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    // Authorization check via config
    const clientId = await getClientIdFromLeadScoringConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const parsed = activitySchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    // If email is provided but not leadId, try to find the lead
    let leadId = parsed.data.leadId;
    if (!leadId && parsed.data.email) {
      const lead = await leadScoringService.getLeadByEmail(
        configId,
        parsed.data.email,
      );
      leadId = lead?.id;
    }

    try {
      const result = await leadScoringService.trackActivity(configId, {
        ...parsed.data,
        leadId,
        activityData: parsed.data.activityData as Prisma.InputJsonValue,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
      res.status(201).json(result);
    } catch (error) {
      if ((error as Error).message === 'Config not found') {
        res.status(404).json({ error: 'Config not found' });
        return;
      }
      throw error;
    }
  },
);

/**
 * GET /api/lead-scoring/:configId/activities
 * List activities
 */
router.get(
  '/lead-scoring/:configId/activities',
  requireAuth,
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    // Authorization check via config
    const clientId = await getClientIdFromLeadScoringConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const leadId = req.query.leadId ? Number(req.query.leadId) : undefined;
    const activityType = req.query.type as string | undefined;
    const startDate = req.query.start
      ? new Date(req.query.start as string)
      : undefined;
    const endDate = req.query.end
      ? new Date(req.query.end as string)
      : undefined;
    const limit = Number(req.query.limit) || 100;
    const offset = Number(req.query.offset) || 0;

    const activities = await leadScoringService.getActivities(configId, {
      leadId,
      activityType,
      startDate,
      endDate,
      limit,
      offset,
    });

    res.json({ activities });
  },
);

// ============================================================================
// NURTURE SEQUENCE ROUTES
// ============================================================================

/**
 * POST /api/lead-scoring/:configId/sequences
 * Create a nurture sequence
 */
router.post(
  '/lead-scoring/:configId/sequences',
  requireAuth,
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    // Authorization check via config
    const clientId = await getClientIdFromLeadScoringConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const parsed = nurtureSequenceSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const sequence = await leadScoringService.createNurtureSequence(configId, {
      ...parsed.data,
      triggerConditions: parsed.data.triggerConditions as Prisma.InputJsonValue,
      steps: parsed.data.steps as Prisma.InputJsonValue,
    });
    res.status(201).json({ sequence });
  },
);

/**
 * GET /api/lead-scoring/:configId/sequences
 * List nurture sequences
 */
router.get(
  '/lead-scoring/:configId/sequences',
  requireAuth,
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    // Authorization check via config
    const clientId = await getClientIdFromLeadScoringConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const isActive =
      req.query.active === 'true'
        ? true
        : req.query.active === 'false'
          ? false
          : undefined;

    const sequences = await leadScoringService.getNurtureSequences(configId, {
      isActive,
    });
    res.json({ sequences });
  },
);

/**
 * GET /api/lead-scoring/sequences/:id
 * Get a specific sequence
 */
router.get(
  '/lead-scoring/sequences/:id',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid sequence ID' });
      return;
    }

    // Authorization check via sequence
    const clientId = await getClientIdFromNurtureSequence(id);
    if (!clientId) {
      res.status(404).json({ error: 'Sequence not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const sequence = await leadScoringService.getNurtureSequence(id);
    if (!sequence) {
      res.status(404).json({ error: 'Sequence not found' });
      return;
    }

    res.json({ sequence });
  },
);

/**
 * PATCH /api/lead-scoring/sequences/:id
 * Update a sequence
 */
router.patch(
  '/lead-scoring/sequences/:id',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid sequence ID' });
      return;
    }

    // Authorization check via sequence
    const clientId = await getClientIdFromNurtureSequence(id);
    if (!clientId) {
      res.status(404).json({ error: 'Sequence not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const parsed = nurtureSequenceSchema
      .partial()
      .extend({
        isActive: z.boolean().optional(),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const sequence = await leadScoringService.updateNurtureSequence(id, {
      ...parsed.data,
      triggerConditions: parsed.data.triggerConditions as Prisma.InputJsonValue,
      steps: parsed.data.steps as Prisma.InputJsonValue,
    });
    res.json({ sequence });
  },
);

/**
 * DELETE /api/lead-scoring/sequences/:id
 * Delete a sequence
 */
router.delete(
  '/lead-scoring/sequences/:id',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid sequence ID' });
      return;
    }

    // Authorization check via sequence
    const clientId = await getClientIdFromNurtureSequence(id);
    if (!clientId) {
      res.status(404).json({ error: 'Sequence not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    await leadScoringService.deleteNurtureSequence(id);
    res.status(204).send();
  },
);

/**
 * POST /api/lead-scoring/sequences/:id/enroll/:leadId
 * Enroll a lead in a sequence
 */
router.post(
  '/lead-scoring/sequences/:id/enroll/:leadId',
  requireAuth,
  async (
    req: AuthenticatedRequest<{ id: string; leadId: string }>,
    res: Response,
  ) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const sequenceId = Number(req.params.id);
    const leadId = Number(req.params.leadId);

    if (Number.isNaN(sequenceId) || Number.isNaN(leadId)) {
      res.status(400).json({ error: 'Invalid sequence or lead ID' });
      return;
    }

    // Authorization check via sequence
    const clientId = await getClientIdFromNurtureSequence(sequenceId);
    if (!clientId) {
      res.status(404).json({ error: 'Sequence not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    try {
      const result = await leadScoringService.enrollLeadInSequence(
        sequenceId,
        leadId,
      );
      res.status(201).json(result);
    } catch (error) {
      if ((error as Error).message === 'Sequence not found') {
        res.status(404).json({ error: 'Sequence not found' });
        return;
      }
      if ((error as Error).message.includes('already enrolled')) {
        res.status(409).json({ error: (error as Error).message });
        return;
      }
      throw error;
    }
  },
);

/**
 * POST /api/lead-scoring/sequences/:id/unenroll/:leadId
 * Unenroll a lead from a sequence
 */
router.post(
  '/lead-scoring/sequences/:id/unenroll/:leadId',
  requireAuth,
  async (
    req: AuthenticatedRequest<{ id: string; leadId: string }>,
    res: Response,
  ) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const sequenceId = Number(req.params.id);
    const leadId = Number(req.params.leadId);

    if (Number.isNaN(sequenceId) || Number.isNaN(leadId)) {
      res.status(400).json({ error: 'Invalid sequence or lead ID' });
      return;
    }

    // Authorization check via sequence
    const clientId = await getClientIdFromNurtureSequence(sequenceId);
    if (!clientId) {
      res.status(404).json({ error: 'Sequence not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const { reason } = req.body as { reason?: string };

    const enrollment = await leadScoringService.unenrollLeadFromSequence(
      sequenceId,
      leadId,
      reason || 'Manually unenrolled',
    );
    res.json({ enrollment });
  },
);

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

/**
 * GET /api/lead-scoring/:configId/analytics
 * Get lead scoring analytics
 */
router.get(
  '/lead-scoring/:configId/analytics',
  requireAuth,
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    // Authorization check via config
    const clientId = await getClientIdFromLeadScoringConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const startDate = req.query.start
      ? new Date(req.query.start as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end
      ? new Date(req.query.end as string)
      : new Date();

    const analytics = await leadScoringService.getLeadAnalytics(configId, {
      start: startDate,
      end: endDate,
    });

    res.json(analytics);
  },
);

/**
 * GET /api/lead-scoring/:configId/pipeline
 * Get pipeline analytics
 */
router.get(
  '/lead-scoring/:configId/pipeline',
  requireAuth,
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    // Authorization check via config
    const clientId = await getClientIdFromLeadScoringConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const pipeline = await leadScoringService.getPipelineAnalytics(configId);
    res.json({ pipeline });
  },
);

export default router;
