/**
 * Tool 1.4: Client Intake Automator Router
 *
 * API endpoints for intake forms, submissions, and workflows
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import {
  hasClientAccess,
  getAccessibleClientIds,
  getClientIdFromIntakeConfig,
  getClientIdFromIntakeForm,
} from '../../auth/client-auth.helper';
import * as intakeService from './intake.service';
import * as conversationService from './conversation';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const configSchema = z.object({
  portalName: z.string().max(200).optional(),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().max(20).optional(),
  customDomain: z.string().max(200).optional(),
  requireIdentityVerification: z.boolean().optional(),
  requireDocumentVerification: z.boolean().optional(),
  retentionDays: z.number().int().min(30).max(3650).optional(),
  notifyOnSubmission: z.boolean().optional(),
  notifyOnCompletion: z.boolean().optional(),
  notificationEmails: z.array(z.string().email()).optional(),
  storageProvider: z.string().max(50).optional(),
});

const formSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  slug: z.string().max(100).optional(),
  isMultiPage: z.boolean().optional(),
  allowSaveProgress: z.boolean().optional(),
  requireSignature: z.boolean().optional(),
  expiresAfterDays: z.number().int().min(1).max(365).optional(),
});

const fieldSchema = z.object({
  name: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  type: z.enum([
    'TEXT',
    'TEXTAREA',
    'EMAIL',
    'PHONE',
    'NUMBER',
    'DATE',
    'TIME',
    'DATETIME',
    'SELECT',
    'MULTISELECT',
    'CHECKBOX',
    'RADIO',
    'FILE_UPLOAD',
    'SIGNATURE',
    'ADDRESS',
    'SSN_LAST4',
    'INSURANCE_INFO',
  ]),
  placeholder: z.string().max(200).optional(),
  helpText: z.string().max(500).optional(),
  isRequired: z.boolean().optional(),
  validationRules: z.record(z.string(), z.unknown()).optional(),
  options: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
      }),
    )
    .optional(),
  conditionalLogic: z.record(z.string(), z.unknown()).optional(),
  pageNumber: z.number().int().min(1).optional(),
  sortOrder: z.number().int().min(0).optional(),
  width: z.enum(['full', 'half', 'third']).optional(),
  prefillSource: z.string().max(100).optional(),
});

const submissionSchema = z.object({
  formId: z.number().int(),
  submitterEmail: z.string().email(),
  submitterName: z.string().max(200).optional(),
  submitterPhone: z.string().max(20).optional(),
  expiresAt: z.string().datetime().optional(),
});

const documentSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.number().int().min(1),
  storageUrl: z.string().url(),
  documentType: z.string().min(1).max(50),
});

const reviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'NEEDS_RESUBMISSION']),
  reviewNotes: z.string().max(2000).optional(),
  rejectionReason: z.string().max(500).optional(),
});

const complianceTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  industry: z.string().max(100).optional(),
  useCase: z.string().max(100).optional(),
  requirements: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      isRequired: z.boolean(),
      documentTypes: z.array(z.string()).optional(),
    }),
  ),
});

const workflowSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  steps: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      config: z.record(z.string(), z.unknown()).optional(),
      order: z.number().int(),
    }),
  ),
  triggerFormIds: z.array(z.number().int()).optional(),
  autoStart: z.boolean().optional(),
});

// ============================================================================
// CONFIG ROUTES
// ============================================================================

router.use(requireAuth);

/**
 * GET /api/intake/configs
 * List all intake configurations (with optional filtering)
 */
router.get(
  '/intake/configs',
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

    // Authorization: If filtering by clientId, check access to that client
    if (clientId) {
      const canAccess = await hasClientAccess(req.userId, clientId);
      if (!canAccess) {
        res
          .status(403)
          .json({ error: 'Forbidden: Access denied to this client' });
        return;
      }
      const configs = await intakeService.listIntakeConfigs({ clientId });
      res.json({ configs });
    } else {
      // No clientId filter - only show configs for clients the user can access
      const accessibleClientIds = await getAccessibleClientIds(req.userId);
      if (accessibleClientIds === null) {
        // Admin - show all
        const configs = await intakeService.listIntakeConfigs({});
        res.json({ configs });
      } else if (accessibleClientIds.length === 0) {
        // No access to any clients
        res.json({ configs: [] });
      } else {
        // Filter to accessible clients
        const configs = await intakeService.listIntakeConfigs({
          clientIds: accessibleClientIds,
        });
        res.json({ configs });
      }
    }
  },
);

/**
 * GET /api/clients/:clientId/intake
 * Get intake config for a client
 */
router.get(
  '/clients/:clientId/intake',
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

    // Authorization: Check user has access to this client
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: Access denied to this client' });
      return;
    }

    const config = await intakeService.getIntakeConfig(clientId);
    res.json({ config });
  },
);

/**
 * POST /api/clients/:clientId/intake
 * Create intake config
 */
router.post(
  '/clients/:clientId/intake',
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

    // Authorization: Check user has access to this client
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: Access denied to this client' });
      return;
    }

    const parsed = configSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const config = await intakeService.createIntakeConfig(
        clientId,
        parsed.data,
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
 * PATCH /api/clients/:clientId/intake
 * Update intake config
 */
router.patch(
  '/clients/:clientId/intake',
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

    // Authorization: Check user has access to this client
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: Access denied to this client' });
      return;
    }

    const parsed = configSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const config = await intakeService.updateIntakeConfig(
      clientId,
      parsed.data,
    );
    res.json({ config });
  },
);

// ============================================================================
// FORM ROUTES
// ============================================================================

/**
 * GET /api/intake/:configId/forms
 * List forms
 */
router.get(
  '/intake/:configId/forms',
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

    // Authorization: Check user has access to the client owning this config
    const clientId = await getClientIdFromIntakeConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: Access denied to this client' });
      return;
    }

    const status = req.query.status as
      | 'DRAFT'
      | 'PUBLISHED'
      | 'ARCHIVED'
      | undefined;

    const forms = await intakeService.getForms(configId, { status });
    res.json({ forms });
  },
);

/**
 * POST /api/intake/:configId/forms
 * Create a form
 */
router.post(
  '/intake/:configId/forms',
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

    // Authorization: Check user has access to the client owning this config
    const clientId = await getClientIdFromIntakeConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: Access denied to this client' });
      return;
    }

    const parsed = formSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const form = await intakeService.createForm(configId, parsed.data);
    res.status(201).json({ form });
  },
);

/**
 * GET /api/intake/forms/:id
 * Get a form
 */
router.get(
  '/intake/forms/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid form ID' });
      return;
    }

    // Authorization: Check user has access to the client owning this form
    const clientId = await getClientIdFromIntakeForm(id);
    if (!clientId) {
      res.status(404).json({ error: 'Form not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: Access denied to this client' });
      return;
    }

    const form = await intakeService.getForm(id);
    if (!form) {
      res.status(404).json({ error: 'Form not found' });
      return;
    }

    res.json({ form });
  },
);

/**
 * PATCH /api/intake/forms/:id
 * Update a form
 */
router.patch(
  '/intake/forms/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid form ID' });
      return;
    }

    // Authorization: Check user has access to the client owning this form
    const clientId = await getClientIdFromIntakeForm(id);
    if (!clientId) {
      res.status(404).json({ error: 'Form not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: Access denied to this client' });
      return;
    }

    const parsed = formSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const form = await intakeService.updateForm(id, parsed.data);
    res.json({ form });
  },
);

/**
 * POST /api/intake/forms/:id/publish
 * Publish a form
 */
router.post(
  '/intake/forms/:id/publish',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid form ID' });
      return;
    }

    // Authorization: Check user has access to the client owning this form
    const clientId = await getClientIdFromIntakeForm(id);
    if (!clientId) {
      res.status(404).json({ error: 'Form not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: Access denied to this client' });
      return;
    }

    const form = await intakeService.publishForm(id);
    res.json({ form });
  },
);

/**
 * DELETE /api/intake/forms/:id
 * Archive a form
 */
router.delete(
  '/intake/forms/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid form ID' });
      return;
    }

    // Authorization: Check user has access to the client owning this form
    const clientId = await getClientIdFromIntakeForm(id);
    if (!clientId) {
      res.status(404).json({ error: 'Form not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res
        .status(403)
        .json({ error: 'Forbidden: Access denied to this client' });
      return;
    }

    await intakeService.archiveForm(id);
    res.status(204).send();
  },
);

// ============================================================================
// FORM FIELD ROUTES
// ============================================================================

/**
 * POST /api/intake/forms/:formId/fields
 * Add a field to a form
 */
router.post(
  '/intake/forms/:formId/fields',
  async (req: AuthenticatedRequest<{ formId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const formId = Number(req.params.formId);
    if (Number.isNaN(formId)) {
      res.status(400).json({ error: 'Invalid form ID' });
      return;
    }

    const parsed = fieldSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const field = await intakeService.addFormField(formId, {
      ...parsed.data,
      validationRules: parsed.data.validationRules as Prisma.InputJsonValue,
      conditionalLogic: parsed.data.conditionalLogic as Prisma.InputJsonValue,
    });
    res.status(201).json({ field });
  },
);

/**
 * PATCH /api/intake/fields/:id
 * Update a field
 */
router.patch(
  '/intake/fields/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid field ID' });
      return;
    }

    const parsed = fieldSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const field = await intakeService.updateFormField(id, {
      ...parsed.data,
      validationRules: parsed.data.validationRules as Prisma.InputJsonValue,
      conditionalLogic: parsed.data.conditionalLogic as Prisma.InputJsonValue,
    });
    res.json({ field });
  },
);

/**
 * DELETE /api/intake/fields/:id
 * Delete a field
 */
router.delete(
  '/intake/fields/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid field ID' });
      return;
    }

    await intakeService.deleteFormField(id);
    res.status(204).send();
  },
);

/**
 * POST /api/intake/forms/:formId/fields/reorder
 * Reorder fields
 */
router.post(
  '/intake/forms/:formId/fields/reorder',
  async (req: AuthenticatedRequest<{ formId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const formId = Number(req.params.formId);
    if (Number.isNaN(formId)) {
      res.status(400).json({ error: 'Invalid form ID' });
      return;
    }

    const schema = z.array(
      z.object({
        id: z.number().int(),
        pageNumber: z.number().int().min(1),
        sortOrder: z.number().int().min(0),
      }),
    );

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    await intakeService.reorderFormFields(formId, parsed.data);
    res.json({ success: true });
  },
);

// ============================================================================
// SUBMISSION ROUTES
// ============================================================================

/**
 * GET /api/intake/:configId/submissions
 * List submissions
 */
router.get(
  '/intake/:configId/submissions',
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

    const formId = req.query.formId ? Number(req.query.formId) : undefined;
    const status = req.query.status as
      | 'IN_PROGRESS'
      | 'SUBMITTED'
      | 'APPROVED'
      | undefined;
    const search = req.query.search as string | undefined;
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const submissions = await intakeService.getSubmissions(configId, {
      formId,
      status,
      search,
      limit,
      offset,
    });

    res.json({ submissions });
  },
);

/**
 * POST /api/intake/:configId/submissions
 * Create a submission
 */
router.post(
  '/intake/:configId/submissions',
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

    const parsed = submissionSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const submission = await intakeService.createSubmission(configId, {
        ...parsed.data,
        expiresAt: parsed.data.expiresAt
          ? new Date(parsed.data.expiresAt)
          : undefined,
      });
      res.status(201).json({ submission });
    } catch (error) {
      if ((error as Error).message === 'Form not found') {
        res.status(404).json({ error: 'Form not found' });
        return;
      }
      throw error;
    }
  },
);

/**
 * GET /api/intake/submissions/:id
 * Get a submission (admin view)
 */
router.get(
  '/intake/submissions/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid submission ID' });
      return;
    }

    const submission = await intakeService.getSubmission(id);
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    res.json({ submission });
  },
);

/**
 * POST /api/intake/submissions/:id/review
 * Review a submission
 */
router.post(
  '/intake/submissions/:id/review',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid submission ID' });
      return;
    }

    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const submission = await intakeService.reviewSubmission(id, {
      ...parsed.data,
      reviewedBy: req.userId,
    });
    res.json({ submission });
  },
);

// ============================================================================
// PUBLIC PORTAL ROUTES (no auth required for client access)
// ============================================================================

/**
 * GET /api/public/intake/form/:configId/:slug
 * Get form by slug for public portal
 */
router.get(
  '/public/intake/form/:configId/:slug',
  async (
    req: AuthenticatedRequest<{ configId: string; slug: string }>,
    res: Response,
  ) => {
    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const form = await intakeService.getFormBySlug(configId, req.params.slug);
    if (!form || form.status !== 'PUBLISHED') {
      res.status(404).json({ error: 'Form not found' });
      return;
    }

    res.json({ form });
  },
);

/**
 * GET /api/public/intake/submission/:token
 * Get submission by access token
 */
router.get(
  '/public/intake/submission/:token',
  async (req: AuthenticatedRequest<{ token: string }>, res: Response) => {
    const submission = await intakeService.getSubmissionByToken(
      req.params.token,
    );
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    // Check if expired
    if (submission.expiresAt && submission.expiresAt < new Date()) {
      res.status(410).json({ error: 'Submission has expired' });
      return;
    }

    res.json({ submission });
  },
);

/**
 * PATCH /api/public/intake/submission/:token
 * Save submission data
 */
router.patch(
  '/public/intake/submission/:token',
  async (req: AuthenticatedRequest<{ token: string }>, res: Response) => {
    const submission = await intakeService.getSubmissionByToken(
      req.params.token,
    );
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    const { formData, submit } = req.body as {
      formData?: Record<string, unknown>;
      submit?: boolean;
    };

    if (formData) {
      await intakeService.updateSubmissionData(
        submission.id,
        formData,
        !submit,
      );
    }

    if (submit) {
      try {
        const updated = await intakeService.submitSubmission(submission.id);
        res.json({ submission: updated });
        return;
      } catch (error) {
        res.status(400).json({ error: (error as Error).message });
        return;
      }
    }

    const updated = await intakeService.getSubmissionByToken(req.params.token);
    res.json({ submission: updated });
  },
);

/**
 * POST /api/public/intake/submission/:token/documents
 * Upload document
 */
router.post(
  '/public/intake/submission/:token/documents',
  async (req: AuthenticatedRequest<{ token: string }>, res: Response) => {
    const submission = await intakeService.getSubmissionByToken(
      req.params.token,
    );
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    const parsed = documentSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const document = await intakeService.uploadDocument(
      submission.id,
      parsed.data,
    );
    res.status(201).json({ document });
  },
);

// ============================================================================
// DOCUMENT ROUTES
// ============================================================================

/**
 * GET /api/intake/submissions/:submissionId/documents
 * Get documents for a submission
 */
router.get(
  '/intake/submissions/:submissionId/documents',
  async (
    req: AuthenticatedRequest<{ submissionId: string }>,
    res: Response,
  ) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const submissionId = Number(req.params.submissionId);
    if (Number.isNaN(submissionId)) {
      res.status(400).json({ error: 'Invalid submission ID' });
      return;
    }

    const documents = await intakeService.getDocuments(submissionId);
    res.json({ documents });
  },
);

/**
 * POST /api/intake/documents/:id/verify
 * Verify a document
 */
router.post(
  '/intake/documents/:id/verify',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid document ID' });
      return;
    }

    const schema = z.object({
      status: z.enum(['VERIFIED', 'REJECTED', 'NEEDS_REVIEW']),
      verificationNotes: z.string().max(1000).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const document = await intakeService.verifyDocument(id, {
      ...parsed.data,
      verifiedBy: req.userId,
    });
    res.json({ document });
  },
);

/**
 * POST /api/intake/documents/:id/extract
 * Extract data from a document
 */
router.post(
  '/intake/documents/:id/extract',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid document ID' });
      return;
    }

    try {
      const extractedData = await intakeService.extractDocumentData(id);
      res.json({ extractedData });
    } catch (error) {
      if ((error as Error).message === 'Document not found') {
        res.status(404).json({ error: 'Document not found' });
        return;
      }
      throw error;
    }
  },
);

// ============================================================================
// COMPLIANCE ROUTES
// ============================================================================

/**
 * GET /api/intake/:configId/compliance-templates
 * List compliance templates
 */
router.get(
  '/intake/:configId/compliance-templates',
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

    const templates = await intakeService.getComplianceTemplates(configId);
    res.json({ templates });
  },
);

/**
 * POST /api/intake/:configId/compliance-templates
 * Create a compliance template
 */
router.post(
  '/intake/:configId/compliance-templates',
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

    const parsed = complianceTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const template = await intakeService.createComplianceTemplate(
      configId,
      parsed.data,
    );
    res.status(201).json({ template });
  },
);

/**
 * POST /api/intake/submissions/:submissionId/compliance/:templateId/check
 * Check compliance for a submission
 */
router.post(
  '/intake/submissions/:submissionId/compliance/:templateId/check',
  async (
    req: AuthenticatedRequest<{ submissionId: string; templateId: string }>,
    res: Response,
  ) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const submissionId = Number(req.params.submissionId);
    const templateId = Number(req.params.templateId);

    if (Number.isNaN(submissionId) || Number.isNaN(templateId)) {
      res.status(400).json({ error: 'Invalid ID' });
      return;
    }

    try {
      const check = await intakeService.checkCompliance(
        submissionId,
        templateId,
      );
      res.json({ complianceCheck: check });
    } catch (error) {
      if ((error as Error).message === 'Submission or template not found') {
        res.status(404).json({ error: 'Submission or template not found' });
        return;
      }
      throw error;
    }
  },
);

// ============================================================================
// WORKFLOW ROUTES
// ============================================================================

/**
 * GET /api/intake/:configId/workflows
 * List workflows
 */
router.get(
  '/intake/:configId/workflows',
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

    const workflows = await intakeService.getWorkflows(configId);
    res.json({ workflows });
  },
);

/**
 * POST /api/intake/:configId/workflows
 * Create a workflow
 */
router.post(
  '/intake/:configId/workflows',
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

    const parsed = workflowSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const workflow = await intakeService.createWorkflow(configId, parsed.data);
    res.status(201).json({ workflow });
  },
);

/**
 * GET /api/intake/submissions/:submissionId/workflow-progress
 * Get workflow progress for a submission
 */
router.get(
  '/intake/submissions/:submissionId/workflow-progress',
  async (
    req: AuthenticatedRequest<{ submissionId: string }>,
    res: Response,
  ) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const submissionId = Number(req.params.submissionId);
    if (Number.isNaN(submissionId)) {
      res.status(400).json({ error: 'Invalid submission ID' });
      return;
    }

    const progress = await intakeService.getWorkflowProgress(submissionId);
    res.json({ progress });
  },
);

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

/**
 * GET /api/intake/:configId/analytics
 * Get intake analytics
 */
router.get(
  '/intake/:configId/analytics',
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

    const startDate = req.query.start
      ? new Date(req.query.start as string)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.end
      ? new Date(req.query.end as string)
      : new Date();

    const analytics = await intakeService.getIntakeAnalytics(configId, {
      start: startDate,
      end: endDate,
    });

    res.json(analytics);
  },
);

// ============================================================================
// AI FORM GENERATION ROUTES
// ============================================================================

import * as aiService from './ai';

const aiGenerateFormSchema = z.object({
  description: z.string().min(10).max(2000),
  industry: z.enum([
    'legal', 'healthcare', 'financial', 'consulting', 'real_estate',
    'insurance', 'education', 'technology', 'retail', 'manufacturing',
    'hospitality', 'nonprofit', 'general'
  ]).optional(),
  formName: z.string().max(200).optional(),
  includeCompliance: z.boolean().optional(),
  maxFields: z.number().int().min(1).max(50).optional(),
});

const aiSuggestFieldsSchema = z.object({
  existingFields: z.array(z.string()),
  formName: z.string().min(1).max(200),
  industry: z.enum([
    'legal', 'healthcare', 'financial', 'consulting', 'real_estate',
    'insurance', 'education', 'technology', 'retail', 'manufacturing',
    'hospitality', 'nonprofit', 'general'
  ]).optional(),
  description: z.string().max(1000).optional(),
});

/**
 * POST /api/intake/ai/generate-form
 * Generate an intake form from natural language description
 */
router.post(
  '/intake/ai/generate-form',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = aiGenerateFormSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten() });
      return;
    }

    try {
      const generatedForm = await aiService.generateForm(parsed.data);
      res.json({ data: generatedForm });
    } catch (error) {
      console.error('Error generating form:', error);
      res.status(500).json({ error: 'Failed to generate form' });
    }
  },
);

/**
 * POST /api/intake/ai/suggest-fields
 * Suggest additional fields for an existing form
 */
router.post(
  '/intake/ai/suggest-fields',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = aiSuggestFieldsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten() });
      return;
    }

    try {
      const suggestions = await aiService.suggestFields(parsed.data);
      res.json({ data: suggestions });
    } catch (error) {
      console.error('Error suggesting fields:', error);
      res.status(500).json({ error: 'Failed to suggest fields' });
    }
  },
);

/**
 * POST /api/intake/ai/detect-industry
 * Detect industry from description text
 */
router.post(
  '/intake/ai/detect-industry',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const body = req.body as { description?: string };
    const { description } = body;
    if (!description || typeof description !== 'string') {
      res.status(400).json({ error: 'Description is required' });
      return;
    }

    try {
      const result = await aiService.detectIndustryWithDetails(description);
      res.json({ data: result });
    } catch (error) {
      console.error('Error detecting industry:', error);
      res.status(500).json({ error: 'Failed to detect industry' });
    }
  },
);

/**
 * GET /api/intake/ai/industries
 * Get list of available industries
 */
router.get(
  '/intake/ai/industries',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const industries = aiService.getAvailableIndustries().map(industry => ({
      value: industry,
      label: aiService.getIndustryDisplayName(industry),
    }));

    res.json({ data: industries });
  },
);

/**
 * POST /api/intake/:configId/forms/generate
 * Generate and save a new form from AI description
 */
router.post(
  '/intake/:configId/forms/generate',
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

    // Check client access
    const clientId = await getClientIdFromIntakeConfig(configId);
    if (!clientId || !(await hasClientAccess(req.userId, clientId))) {
      res.status(403).json({ error: 'Access denied to this intake configuration' });
      return;
    }

    const parsed = aiGenerateFormSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten() });
      return;
    }

    try {
      // Generate the form using AI
      const generatedForm = await aiService.generateForm(parsed.data);

      // Create the form in the database
      const form = await intakeService.createForm(configId, {
        name: generatedForm.name,
        description: generatedForm.description,
        slug: generatedForm.slug,
        isMultiPage: generatedForm.isMultiPage,
      });

      // Add all the generated fields
      for (const field of generatedForm.fields) {
        await intakeService.addFormField(form.id, {
          name: field.name,
          label: field.label,
          type: field.type,
          placeholder: field.placeholder,
          helpText: field.helpText,
          isRequired: field.isRequired,
          validationRules: field.validationRules as Prisma.InputJsonValue,
          options: field.options,
          conditionalLogic: field.conditionalLogic as Prisma.InputJsonValue,
          pageNumber: field.pageNumber,
          sortOrder: field.sortOrder,
          width: field.width,
        });
      }

      // Fetch the complete form with fields
      const completeForm = await intakeService.getForm(form.id);

      res.status(201).json({
        data: completeForm,
        meta: {
          generatedFieldCount: generatedForm.fields.length,
          detectedIndustry: generatedForm.detectedIndustry,
          confidence: generatedForm.confidence,
          suggestedCompliance: generatedForm.suggestedCompliance,
        },
      });
    } catch (error) {
      console.error('Error generating and saving form:', error);
      res.status(500).json({ error: 'Failed to generate and save form' });
    }
  },
);

// ============================================================================
// CONVERSATIONAL INTAKE ENDPOINTS (PUBLIC)
// ============================================================================

// Validation schemas for conversation endpoints
const startConversationSchema = z.object({
  formSlug: z.string().min(1),
  configId: z.number().int().positive(),
  submitterEmail: z.string().email().optional(),
  submitterName: z.string().max(200).optional(),
});

const sendMessageSchema = z.object({
  message: z.string().min(1).max(5000),
});

/**
 * POST /api/public/intake/conversation/start
 * Start a new conversational intake session
 */
router.post(
  '/public/intake/conversation/start',
  async (req: Request, res: Response) => {
    const parsed = startConversationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten() });
      return;
    }

    try {
      const result = await conversationService.startConversation(parsed.data);
      res.status(201).json({ data: result });
    } catch (error) {
      console.error('Error starting conversation:', error);
      const message = error instanceof Error ? error.message : 'Failed to start conversation';
      res.status(500).json({ error: message });
    }
  },
);

/**
 * POST /api/public/intake/conversation/:token/message
 * Send a message in a conversation
 */
router.post(
  '/public/intake/conversation/:token/message',
  async (req: Request, res: Response) => {
    const { token } = req.params;
    const parsed = sendMessageSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten() });
      return;
    }

    try {
      const result = await conversationService.processMessage(token, parsed.data.message);
      res.json({ data: result });
    } catch (error) {
      console.error('Error processing message:', error);
      const message = error instanceof Error ? error.message : 'Failed to process message';
      if (message.includes('not found')) {
        res.status(404).json({ error: message });
      } else if (message.includes('not active')) {
        res.status(400).json({ error: message });
      } else {
        res.status(500).json({ error: message });
      }
    }
  },
);

/**
 * GET /api/public/intake/conversation/:token/summary
 * Get conversation summary and collected data
 */
router.get(
  '/public/intake/conversation/:token/summary',
  async (req: Request, res: Response) => {
    const { token } = req.params;

    try {
      const summary = await conversationService.getConversationSummary(token);
      res.json({ data: summary });
    } catch (error) {
      console.error('Error getting conversation summary:', error);
      const message = error instanceof Error ? error.message : 'Failed to get summary';
      if (message.includes('not found')) {
        res.status(404).json({ error: message });
      } else {
        res.status(500).json({ error: message });
      }
    }
  },
);

/**
 * GET /api/public/intake/conversation/:token/history
 * Get full conversation history
 */
router.get(
  '/public/intake/conversation/:token/history',
  async (req: Request, res: Response) => {
    const { token } = req.params;

    try {
      const history = await conversationService.getConversationHistory(token);
      res.json({ data: history });
    } catch (error) {
      console.error('Error getting conversation history:', error);
      const message = error instanceof Error ? error.message : 'Failed to get history';
      if (message.includes('not found')) {
        res.status(404).json({ error: message });
      } else {
        res.status(500).json({ error: message });
      }
    }
  },
);

/**
 * POST /api/public/intake/conversation/:token/pause
 * Pause an active conversation
 */
router.post(
  '/public/intake/conversation/:token/pause',
  async (req: Request, res: Response) => {
    const { token } = req.params;

    try {
      await conversationService.pauseConversation(token);
      res.json({ data: { success: true, message: 'Conversation paused' } });
    } catch (error) {
      console.error('Error pausing conversation:', error);
      const message = error instanceof Error ? error.message : 'Failed to pause conversation';
      if (message.includes('not found')) {
        res.status(404).json({ error: message });
      } else {
        res.status(500).json({ error: message });
      }
    }
  },
);

/**
 * POST /api/public/intake/conversation/:token/resume
 * Resume a paused conversation
 */
router.post(
  '/public/intake/conversation/:token/resume',
  async (req: Request, res: Response) => {
    const { token } = req.params;

    try {
      const result = await conversationService.resumeConversation(token);
      res.json({ data: result });
    } catch (error) {
      console.error('Error resuming conversation:', error);
      const message = error instanceof Error ? error.message : 'Failed to resume conversation';
      if (message.includes('not found')) {
        res.status(404).json({ error: message });
      } else if (message.includes('not paused')) {
        res.status(400).json({ error: message });
      } else {
        res.status(500).json({ error: message });
      }
    }
  },
);

/**
 * POST /api/public/intake/conversation/:token/abandon
 * Abandon a conversation
 */
router.post(
  '/public/intake/conversation/:token/abandon',
  async (req: Request, res: Response) => {
    const { token } = req.params;

    try {
      await conversationService.abandonConversation(token);
      res.json({ data: { success: true, message: 'Conversation abandoned' } });
    } catch (error) {
      console.error('Error abandoning conversation:', error);
      const message = error instanceof Error ? error.message : 'Failed to abandon conversation';
      if (message.includes('not found')) {
        res.status(404).json({ error: message });
      } else {
        res.status(500).json({ error: message });
      }
    }
  },
);

export default router;
