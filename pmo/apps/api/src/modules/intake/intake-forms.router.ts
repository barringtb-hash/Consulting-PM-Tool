/**
 * Intake Forms Router
 *
 * Handles form and field management endpoints
 */

import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AuthenticatedRequest } from '../../auth/auth.middleware';
import {
  hasClientAccess,
  getClientIdFromIntakeConfig,
  getClientIdFromIntakeForm,
} from '../../auth/client-auth.helper';
import * as intakeService from './intake.service';
import { formSchema, fieldSchema, fieldReorderSchema } from './intake-schemas';

const router = Router();

// ============================================================================
// FORM ROUTES
// ============================================================================

/**
 * GET /api/intake/:configId/forms
 * List forms
 */
router.get(
  '/:configId/forms',
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
  '/:configId/forms',
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
  '/forms/:id',
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
  '/forms/:id',
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
  '/forms/:id/publish',
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
  '/forms/:id',
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
  '/forms/:formId/fields',
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
  '/fields/:id',
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
  '/fields/:id',
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
  '/forms/:formId/fields/reorder',
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

    const parsed = fieldReorderSchema.safeParse(req.body);
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

export default router;
