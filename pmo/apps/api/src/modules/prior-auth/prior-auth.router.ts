/**
 * Tool 2.4: Prior Authorization Bot Router
 *
 * API endpoints for prior authorization management, appeals, and analytics
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import { tenantMiddleware } from '../../tenant/tenant.middleware';
import * as priorAuthService from './prior-auth.service';
import {
  hasClientAccess,
  getAccessibleClientIds,
  getClientIdFromPriorAuthConfig,
  getClientIdFromPARequest,
  getClientIdFromPAAppeal,
  getClientIdFromPayerRule,
  getClientIdFromPATemplate,
} from '../../auth/client-auth.helper';

const router = Router();

// Apply tenant middleware to all routes
router.use(requireAuth, tenantMiddleware);

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const priorAuthConfigSchema = z.object({
  practiceName: z.string().max(200).optional(),
  practiceNPI: z.string().max(20).optional(),
  practiceAddress: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
    })
    .optional(),
  payerConfigurations: z.record(z.string(), z.unknown()).optional(),
  ehrSystem: z.string().optional(),
  ehrCredentials: z.record(z.string(), z.unknown()).optional(),
  ehrSyncEnabled: z.boolean().optional(),
  availityCredentials: z.record(z.string(), z.unknown()).optional(),
  changeHealthCredentials: z.record(z.string(), z.unknown()).optional(),
  faxProvider: z.string().optional(),
  faxCredentials: z.record(z.string(), z.unknown()).optional(),
  notifyOnSubmission: z.boolean().optional(),
  notifyOnStatusChange: z.boolean().optional(),
  notificationEmails: z.array(z.string().email()).optional(),
  isHipaaEnabled: z.boolean().optional(),
});

const paRequestSchema = z.object({
  patientName: z.string().min(1).max(200),
  patientDob: z.string().transform((s) => new Date(s)),
  patientMemberId: z.string().min(1).max(50),
  requestingProvider: z.string().min(1).max(200),
  requestingProviderNPI: z.string().max(20).optional(),
  renderingProvider: z.string().max(200).optional(),
  renderingProviderNPI: z.string().max(20).optional(),
  facilityName: z.string().max(200).optional(),
  facilityNPI: z.string().max(20).optional(),
  payerId: z.string().min(1).max(50),
  payerName: z.string().min(1).max(200),
  planName: z.string().max(200).optional(),
  planType: z.string().max(50).optional(),
  serviceType: z.string().min(1).max(100),
  procedureCodes: z.array(z.string()).optional(),
  diagnosisCodes: z.array(z.string()).optional(),
  description: z.string().max(5000).optional(),
  clinicalNotes: z.string().max(10000).optional(),
  serviceStartDate: z
    .string()
    .transform((s) => new Date(s))
    .optional(),
  serviceEndDate: z
    .string()
    .transform((s) => new Date(s))
    .optional(),
  urgency: z.enum(['ROUTINE', 'URGENT', 'EMERGENT']).optional(),
  supportingDocuments: z
    .array(
      z.object({
        type: z.string(),
        url: z.string(),
        uploadedAt: z.string().optional(),
      }),
    )
    .optional(),
});

const appealSchema = z.object({
  appealLevel: z.number().int().min(1).max(5).optional(),
  appealType: z.string().optional(),
  appealRationale: z.string().min(1).max(10000),
  supportingEvidence: z
    .array(
      z.object({
        type: z.string(),
        description: z.string(),
        url: z.string().optional(),
      }),
    )
    .optional(),
  peerToPeerNotes: z.string().max(5000).optional(),
});

const payerRuleSchema = z.object({
  payerId: z.string().min(1),
  payerName: z.string().min(1),
  serviceType: z.string().optional(),
  procedureCode: z.string().optional(),
  ruleName: z.string().min(1).max(200),
  ruleDescription: z.string().max(1000).optional(),
  requirements: z.object({
    clinicalCriteria: z.array(z.string()).optional(),
    documentation: z.array(z.string()).optional(),
    timeframes: z.record(z.string(), z.number()).optional(),
  }),
  preferredMethod: z.enum(['portal', 'fax', 'edi']).optional(),
  portalUrl: z.string().url().optional(),
  faxNumber: z.string().optional(),
  standardTurnaround: z.number().int().optional(),
  urgentTurnaround: z.number().int().optional(),
  successTips: z
    .array(
      z.object({
        tip: z.string(),
        importance: z.enum(['high', 'medium', 'low']).optional(),
      }),
    )
    .optional(),
});

const paTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  serviceType: z.string().min(1),
  procedureCodes: z.array(z.string()).optional(),
  clinicalTemplate: z.string().max(10000).optional(),
  rationaleTemplate: z.string().max(5000).optional(),
  requiredDocs: z
    .array(
      z.object({
        docType: z.string(),
        description: z.string(),
        required: z.boolean().optional(),
      }),
    )
    .optional(),
  commonDiagnoses: z
    .array(
      z.object({
        code: z.string(),
        description: z.string(),
      }),
    )
    .optional(),
});

// ============================================================================
// CONFIG ROUTES
// ============================================================================

/**
 * GET /api/prior-auth/configs
 * List all prior auth configurations (filtered by user access)
 */
router.get(
  '/prior-auth/configs',
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
      const configs = await priorAuthService.listPriorAuthConfigs({ clientId });
      res.json({ configs });
      return;
    }

    // No specific clientId - filter by accessible clients
    const accessibleClientIds = await getAccessibleClientIds(req.userId);

    // If null, user is admin and can see all
    if (accessibleClientIds === null) {
      const configs = await priorAuthService.listPriorAuthConfigs({});
      res.json({ configs });
      return;
    }

    // Filter to only accessible clients
    const configs = await priorAuthService.listPriorAuthConfigs({
      clientIds: accessibleClientIds,
    });
    res.json({ configs });
  },
);

/**
 * GET /api/clients/:clientId/prior-auth
 * Get prior auth configuration for a client
 */
router.get(
  '/clients/:clientId/prior-auth',
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

    const config = await priorAuthService.getPriorAuthConfig(clientId);
    res.json({ config });
  },
);

/**
 * POST /api/clients/:clientId/prior-auth
 * Create prior auth configuration for a client
 */
router.post(
  '/clients/:clientId/prior-auth',
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

    const parsed = priorAuthConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const config = await priorAuthService.createPriorAuthConfig(clientId, {
        ...parsed.data,
        practiceAddress: parsed.data.practiceAddress as Prisma.InputJsonValue,
        payerConfigurations: parsed.data
          .payerConfigurations as Prisma.InputJsonValue,
        ehrCredentials: parsed.data.ehrCredentials as Prisma.InputJsonValue,
        availityCredentials: parsed.data
          .availityCredentials as Prisma.InputJsonValue,
        changeHealthCredentials: parsed.data
          .changeHealthCredentials as Prisma.InputJsonValue,
        faxCredentials: parsed.data.faxCredentials as Prisma.InputJsonValue,
      });
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
 * PATCH /api/clients/:clientId/prior-auth
 * Update prior auth configuration
 */
router.patch(
  '/clients/:clientId/prior-auth',
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

    const parsed = priorAuthConfigSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const config = await priorAuthService.updatePriorAuthConfig(clientId, {
      ...parsed.data,
      practiceAddress: parsed.data.practiceAddress as Prisma.InputJsonValue,
      payerConfigurations: parsed.data
        .payerConfigurations as Prisma.InputJsonValue,
      ehrCredentials: parsed.data.ehrCredentials as Prisma.InputJsonValue,
      availityCredentials: parsed.data
        .availityCredentials as Prisma.InputJsonValue,
      changeHealthCredentials: parsed.data
        .changeHealthCredentials as Prisma.InputJsonValue,
      faxCredentials: parsed.data.faxCredentials as Prisma.InputJsonValue,
    });
    res.json({ config });
  },
);

// ============================================================================
// PA REQUEST ROUTES
// ============================================================================

/**
 * POST /api/prior-auth/:configId/requests
 * Create a new PA request
 */
router.post(
  '/prior-auth/:configId/requests',
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
    const clientId = await getClientIdFromPriorAuthConfig(configId);
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

    const parsed = paRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const request = await priorAuthService.createPARequest(
        configId,
        {
          ...parsed.data,
          supportingDocuments: parsed.data
            .supportingDocuments as Prisma.InputJsonValue,
        },
        req.userId,
      );
      res.status(201).json({ request });
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
 * GET /api/prior-auth/:configId/requests
 * List PA requests
 */
router.get(
  '/prior-auth/:configId/requests',
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
    const clientId = await getClientIdFromPriorAuthConfig(configId);
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

    const status = req.query.status as string | undefined;
    const payerId = req.query.payerId as string | undefined;
    const urgency = req.query.urgency as string | undefined;
    const assignedTo = req.query.assignedTo
      ? Number(req.query.assignedTo)
      : undefined;
    const startDate = req.query.start
      ? new Date(req.query.start as string)
      : undefined;
    const endDate = req.query.end
      ? new Date(req.query.end as string)
      : undefined;
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const requests = await priorAuthService.getPARequests(configId, {
      status: status as
        | 'DRAFT'
        | 'SUBMITTED'
        | 'PENDING'
        | 'APPROVED'
        | 'DENIED'
        | 'PARTIAL_APPROVAL'
        | 'WITHDRAWN'
        | 'EXPIRED'
        | undefined,
      payerId,
      urgency: urgency as 'ROUTINE' | 'URGENT' | 'EMERGENT' | undefined,
      assignedTo,
      startDate,
      endDate,
      limit,
      offset,
    });

    res.json({ requests });
  },
);

/**
 * GET /api/prior-auth/requests/:id
 * Get a specific PA request
 */
router.get(
  '/prior-auth/requests/:id',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid request ID' });
      return;
    }

    // Authorization check via request
    const clientId = await getClientIdFromPARequest(id);
    if (!clientId) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const request = await priorAuthService.getPARequest(id);
    if (!request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    res.json({ request });
  },
);

/**
 * PATCH /api/prior-auth/requests/:id
 * Update a PA request
 */
router.patch(
  '/prior-auth/requests/:id',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid request ID' });
      return;
    }

    // Authorization check via request
    const clientId = await getClientIdFromPARequest(id);
    if (!clientId) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const parsed = paRequestSchema
      .partial()
      .extend({
        status: z.enum(['DRAFT', 'WITHDRAWN']).optional(),
        assignedTo: z.number().int().optional(),
      })
      .safeParse(req.body);

    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const request = await priorAuthService.updatePARequest(
        id,
        {
          ...parsed.data,
          supportingDocuments: parsed.data
            .supportingDocuments as Prisma.InputJsonValue,
        },
        req.userId,
      );
      res.json({ request });
    } catch (error) {
      if ((error as Error).message === 'Request not found') {
        res.status(404).json({ error: 'Request not found' });
        return;
      }
      throw error;
    }
  },
);

/**
 * DELETE /api/prior-auth/requests/:id
 * Delete a PA request (draft only)
 */
router.delete(
  '/prior-auth/requests/:id',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid request ID' });
      return;
    }

    // Authorization check via request
    const clientId = await getClientIdFromPARequest(id);
    if (!clientId) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    await priorAuthService.deletePARequest(id);
    res.status(204).send();
  },
);

/**
 * POST /api/prior-auth/requests/:id/submit
 * Submit a PA request
 */
router.post(
  '/prior-auth/requests/:id/submit',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid request ID' });
      return;
    }

    // Authorization check via request
    const clientId = await getClientIdFromPARequest(id);
    if (!clientId) {
      res.status(404).json({ error: 'Request not found' });
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
      const result = await priorAuthService.submitPARequest(id, req.userId);
      res.json(result);
    } catch (error) {
      if ((error as Error).message === 'Request not found') {
        res.status(404).json({ error: 'Request not found' });
        return;
      }
      if ((error as Error).message.includes('Can only submit')) {
        res.status(400).json({ error: (error as Error).message });
        return;
      }
      throw error;
    }
  },
);

/**
 * POST /api/prior-auth/requests/:id/check-status
 * Check status of a submitted PA request
 */
router.post(
  '/prior-auth/requests/:id/check-status',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid request ID' });
      return;
    }

    // Authorization check via request
    const clientId = await getClientIdFromPARequest(id);
    if (!clientId) {
      res.status(404).json({ error: 'Request not found' });
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
      const result = await priorAuthService.checkPAStatus(id, req.userId);
      res.json(result);
    } catch (error) {
      if ((error as Error).message === 'Request not found') {
        res.status(404).json({ error: 'Request not found' });
        return;
      }
      throw error;
    }
  },
);

// ============================================================================
// APPEAL ROUTES
// ============================================================================

/**
 * POST /api/prior-auth/requests/:id/appeals
 * Create an appeal for a denied request
 */
router.post(
  '/prior-auth/requests/:id/appeals',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const requestId = Number(req.params.id);
    if (Number.isNaN(requestId)) {
      res.status(400).json({ error: 'Invalid request ID' });
      return;
    }

    // Authorization check via request
    const clientId = await getClientIdFromPARequest(requestId);
    if (!clientId) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const parsed = appealSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const appeal = await priorAuthService.createAppeal(
        requestId,
        {
          ...parsed.data,
          supportingEvidence: parsed.data
            .supportingEvidence as Prisma.InputJsonValue,
        },
        req.userId,
      );
      res.status(201).json({ appeal });
    } catch (error) {
      if ((error as Error).message === 'Request not found') {
        res.status(404).json({ error: 'Request not found' });
        return;
      }
      if ((error as Error).message.includes('Can only appeal')) {
        res.status(400).json({ error: (error as Error).message });
        return;
      }
      throw error;
    }
  },
);

/**
 * POST /api/prior-auth/appeals/:id/submit
 * Submit an appeal
 */
router.post(
  '/prior-auth/appeals/:id/submit',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const appealId = Number(req.params.id);
    if (Number.isNaN(appealId)) {
      res.status(400).json({ error: 'Invalid appeal ID' });
      return;
    }

    // Authorization check via appeal
    const clientId = await getClientIdFromPAAppeal(appealId);
    if (!clientId) {
      res.status(404).json({ error: 'Appeal not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const { submissionMethod } = req.body as { submissionMethod: string };
    if (!submissionMethod) {
      res.status(400).json({ error: 'submissionMethod is required' });
      return;
    }

    try {
      const appeal = await priorAuthService.submitAppeal(
        appealId,
        submissionMethod,
        req.userId,
      );
      res.json({ appeal });
    } catch (error) {
      if ((error as Error).message === 'Appeal not found') {
        res.status(404).json({ error: 'Appeal not found' });
        return;
      }
      throw error;
    }
  },
);

/**
 * PATCH /api/prior-auth/appeals/:id/status
 * Update appeal status
 */
router.patch(
  '/prior-auth/appeals/:id/status',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const appealId = Number(req.params.id);
    if (Number.isNaN(appealId)) {
      res.status(400).json({ error: 'Invalid appeal ID' });
      return;
    }

    // Authorization check via appeal
    const clientId = await getClientIdFromPAAppeal(appealId);
    if (!clientId) {
      res.status(404).json({ error: 'Appeal not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const { status, decisionNotes } = req.body as {
      status: 'APPEAL_APPROVED' | 'APPEAL_DENIED' | 'EXTERNAL_REVIEW';
      decisionNotes?: string;
    };

    const appeal = await priorAuthService.updateAppealStatus(
      appealId,
      status,
      decisionNotes,
      req.userId,
    );
    res.json({ appeal });
  },
);

/**
 * GET /api/prior-auth/requests/:id/generate-appeal
 * Generate appeal letter using AI
 */
router.get(
  '/prior-auth/requests/:id/generate-appeal',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const requestId = Number(req.params.id);
    if (Number.isNaN(requestId)) {
      res.status(400).json({ error: 'Invalid request ID' });
      return;
    }

    // Authorization check via request
    const clientId = await getClientIdFromPARequest(requestId);
    if (!clientId) {
      res.status(404).json({ error: 'Request not found' });
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
      const result = await priorAuthService.generateAppealLetter(requestId);
      res.json(result);
    } catch (error) {
      if ((error as Error).message === 'Request not found') {
        res.status(404).json({ error: 'Request not found' });
        return;
      }
      throw error;
    }
  },
);

// ============================================================================
// PAYER RULE ROUTES
// ============================================================================

/**
 * GET /api/prior-auth/:configId/payer-rules
 * List payer rules
 */
router.get(
  '/prior-auth/:configId/payer-rules',
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
    const clientId = await getClientIdFromPriorAuthConfig(configId);
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

    const payerId = req.query.payerId as string | undefined;
    const serviceType = req.query.serviceType as string | undefined;

    if (payerId) {
      const rule = await priorAuthService.getPayerRules(
        configId,
        payerId,
        serviceType,
      );
      res.json({ rules: rule ? [rule] : [] });
    } else {
      const rules = await priorAuthService.getAllPayerRules(configId);
      res.json({ rules });
    }
  },
);

/**
 * POST /api/prior-auth/:configId/payer-rules
 * Create a payer rule
 */
router.post(
  '/prior-auth/:configId/payer-rules',
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
    const clientId = await getClientIdFromPriorAuthConfig(configId);
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

    const parsed = payerRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const rule = await priorAuthService.createPayerRule(configId, {
      ...parsed.data,
      requirements: parsed.data.requirements as Prisma.InputJsonValue,
      successTips: parsed.data.successTips as Prisma.InputJsonValue,
    });
    res.status(201).json({ rule });
  },
);

/**
 * PATCH /api/prior-auth/payer-rules/:id
 * Update a payer rule
 */
router.patch(
  '/prior-auth/payer-rules/:id',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid rule ID' });
      return;
    }

    // Authorization check via payer rule
    const clientId = await getClientIdFromPayerRule(id);
    if (!clientId) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const parsed = payerRuleSchema
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

    const rule = await priorAuthService.updatePayerRule(id, {
      ...parsed.data,
      requirements: parsed.data.requirements as Prisma.InputJsonValue,
      successTips: parsed.data.successTips as Prisma.InputJsonValue,
    });
    res.json({ rule });
  },
);

// ============================================================================
// TEMPLATE ROUTES
// ============================================================================

/**
 * GET /api/prior-auth/:configId/templates
 * List PA templates
 */
router.get(
  '/prior-auth/:configId/templates',
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
    const clientId = await getClientIdFromPriorAuthConfig(configId);
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

    const serviceType = req.query.serviceType as string | undefined;

    const templates = await priorAuthService.getPATemplates(
      configId,
      serviceType,
    );
    res.json({ templates });
  },
);

/**
 * POST /api/prior-auth/:configId/templates
 * Create a PA template
 */
router.post(
  '/prior-auth/:configId/templates',
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
    const clientId = await getClientIdFromPriorAuthConfig(configId);
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

    const parsed = paTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const template = await priorAuthService.createPATemplate(configId, {
      ...parsed.data,
      requiredDocs: parsed.data.requiredDocs as Prisma.InputJsonValue,
      commonDiagnoses: parsed.data.commonDiagnoses as Prisma.InputJsonValue,
    });
    res.status(201).json({ template });
  },
);

/**
 * PATCH /api/prior-auth/templates/:id
 * Update a PA template
 */
router.patch(
  '/prior-auth/templates/:id',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid template ID' });
      return;
    }

    // Authorization check via template
    const clientId = await getClientIdFromPATemplate(id);
    if (!clientId) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this client' });
      return;
    }

    const parsed = paTemplateSchema
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

    const template = await priorAuthService.updatePATemplate(id, {
      ...parsed.data,
      requiredDocs: parsed.data.requiredDocs as Prisma.InputJsonValue,
      commonDiagnoses: parsed.data.commonDiagnoses as Prisma.InputJsonValue,
    });
    res.json({ template });
  },
);

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

/**
 * GET /api/prior-auth/:configId/analytics
 * Get PA analytics
 */
router.get(
  '/prior-auth/:configId/analytics',
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
    const clientId = await getClientIdFromPriorAuthConfig(configId);
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

    const analytics = await priorAuthService.getPAAnalytics(configId, {
      start: startDate,
      end: endDate,
    });

    res.json(analytics);
  },
);

export default router;
