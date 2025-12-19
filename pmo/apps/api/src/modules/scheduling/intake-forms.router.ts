/**
 * Scheduling Intake Forms Router
 *
 * API endpoints for managing intake forms on booking pages
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../../auth/auth.middleware';
import * as intakeFormsService from './intake-forms.service';
import { z } from 'zod';

interface TemplateBody {
  templateId?: string;
  bookingPageId?: string;
  name?: string;
}

interface DuplicateBody {
  name?: string;
}

interface ResponseBody {
  appointmentId?: string;
  responses?: Record<string, unknown>;
}

interface VisibilityBody {
  responses?: Record<string, unknown>;
}

interface ValidateBody {
  responses?: Record<string, unknown>;
}

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const conditionalRuleSchema = z.object({
  fieldId: z.string(),
  operator: z.enum([
    'equals',
    'not_equals',
    'contains',
    'not_contains',
    'greater_than',
    'less_than',
    'is_empty',
    'is_not_empty',
  ]),
  value: z.union([z.string(), z.number(), z.boolean()]).optional(),
});

const conditionalLogicSchema = z.object({
  action: z.enum(['show', 'hide', 'require']),
  rules: z.array(conditionalRuleSchema),
  logicType: z.enum(['all', 'any']),
});

const validationRulesSchema = z.object({
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(),
  patternMessage: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  fileTypes: z.array(z.string()).optional(),
  maxFileSize: z.number().optional(),
});

const fieldOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  isDefault: z.boolean().optional(),
});

const fieldSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum([
    'text',
    'email',
    'phone',
    'number',
    'date',
    'datetime',
    'time',
    'textarea',
    'select',
    'multiselect',
    'radio',
    'checkbox',
    'file',
    'signature',
    'address',
    'heading',
    'paragraph',
    'divider',
  ]),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  required: z.boolean().optional(),
  validationRules: validationRulesSchema.optional(),
  options: z.array(fieldOptionSchema).optional(),
  conditionalLogic: conditionalLogicSchema.optional(),
  pageNumber: z.number().optional(),
  sortOrder: z.number().optional(),
  width: z.enum(['full', 'half', 'third']).optional(),
  prefillSource: z.string().optional(),
});

const createFormSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  fields: z.array(fieldSchema).min(1),
  isRequired: z.boolean().optional(),
  isMultiPage: z.boolean().optional(),
  allowSaveProgress: z.boolean().optional(),
  displayOrder: z.number().optional(),
});

const updateFormSchema = createFormSchema.partial();

const responseSchema = z.record(z.string(), z.unknown());

// ============================================================================
// FORM MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /api/scheduling/:configId/intake-forms/templates
 * Get available form templates
 */
router.get(
  '/:configId/intake-forms/templates',
  requireAuth,
  async (req, res) => {
    try {
      const templates = intakeFormsService.getFormTemplates();
      return res.json({ data: templates });
    } catch (error) {
      console.error('Failed to get templates:', error);
      return res.status(500).json({ error: 'Failed to get form templates' });
    }
  },
);

/**
 * POST /api/scheduling/:configId/intake-forms/from-template
 * Create a form from a template
 */
router.post(
  '/:configId/intake-forms/from-template',
  requireAuth,
  async (req: Request<unknown, unknown, TemplateBody>, res: Response) => {
    try {
      const { templateId, bookingPageId, name } = req.body;

      if (!templateId || !bookingPageId) {
        return res
          .status(400)
          .json({ error: 'templateId and bookingPageId required' });
      }

      const form = await intakeFormsService.createFormFromTemplate(
        parseInt(bookingPageId),
        templateId,
        name,
      );

      return res.status(201).json({ data: form });
    } catch (error) {
      console.error('Failed to create form from template:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to create form',
      });
    }
  },
);

/**
 * GET /api/scheduling/:configId/booking-pages/:bookingPageId/intake-forms
 * Get intake forms for a booking page
 */
router.get(
  '/:configId/booking-pages/:bookingPageId/intake-forms',
  requireAuth,
  async (req, res) => {
    try {
      const bookingPageId = parseInt(req.params.bookingPageId);
      const forms = await intakeFormsService.getIntakeForms(bookingPageId);

      return res.json({ data: forms });
    } catch (error) {
      console.error('Failed to get intake forms:', error);
      return res.status(500).json({ error: 'Failed to get intake forms' });
    }
  },
);

/**
 * POST /api/scheduling/:configId/booking-pages/:bookingPageId/intake-forms
 * Create an intake form for a booking page
 */
router.post(
  '/:configId/booking-pages/:bookingPageId/intake-forms',
  requireAuth,
  async (req, res) => {
    try {
      const bookingPageId = parseInt(req.params.bookingPageId);

      const parsed = createFormSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const form = await intakeFormsService.createIntakeForm(
        bookingPageId,
        parsed.data,
      );

      return res.status(201).json({ data: form });
    } catch (error) {
      console.error('Failed to create intake form:', error);
      return res.status(500).json({ error: 'Failed to create intake form' });
    }
  },
);

/**
 * GET /api/scheduling/:configId/intake-forms/:id
 * Get an intake form by ID
 */
router.get('/:configId/intake-forms/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const form = await intakeFormsService.getIntakeForm(id);

    if (!form) {
      return res.status(404).json({ error: 'Intake form not found' });
    }

    return res.json({ data: form });
  } catch (error) {
    console.error('Failed to get intake form:', error);
    return res.status(500).json({ error: 'Failed to get intake form' });
  }
});

/**
 * PATCH /api/scheduling/:configId/intake-forms/:id
 * Update an intake form
 */
router.patch('/:configId/intake-forms/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const parsed = updateFormSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const form = await intakeFormsService.updateIntakeForm(id, parsed.data);

    return res.json({ data: form });
  } catch (error) {
    console.error('Failed to update intake form:', error);
    return res.status(500).json({ error: 'Failed to update intake form' });
  }
});

/**
 * DELETE /api/scheduling/:configId/intake-forms/:id
 * Delete an intake form
 */
router.delete('/:configId/intake-forms/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await intakeFormsService.deleteIntakeForm(id);

    return res.json({ data: { success: true } });
  } catch (error) {
    console.error('Failed to delete intake form:', error);
    return res.status(500).json({ error: 'Failed to delete intake form' });
  }
});

/**
 * POST /api/scheduling/:configId/intake-forms/:id/duplicate
 * Duplicate an intake form
 */
router.post(
  '/:configId/intake-forms/:id/duplicate',
  requireAuth,
  async (
    req: Request<{ configId: string; id: string }, unknown, DuplicateBody>,
    res: Response,
  ) => {
    try {
      const id = parseInt(req.params.id);
      const { name } = req.body;

      const form = await intakeFormsService.duplicateIntakeForm(id, name);

      return res.status(201).json({ data: form });
    } catch (error) {
      console.error('Failed to duplicate intake form:', error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to duplicate form',
      });
    }
  },
);

// ============================================================================
// VALIDATION ROUTES
// ============================================================================

/**
 * POST /api/scheduling/:configId/intake-forms/:id/validate
 * Validate form responses without saving
 */
router.post(
  '/:configId/intake-forms/:id/validate',
  requireAuth,
  async (
    req: Request<{ configId: string; id: string }, unknown, ValidateBody>,
    res: Response,
  ) => {
    try {
      const id = parseInt(req.params.id);

      const parsed = responseSchema.safeParse(req.body.responses);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid response format' });
      }

      const validation = await intakeFormsService.validateFormResponses(
        id,
        parsed.data,
      );

      return res.json({ data: validation });
    } catch (error) {
      console.error('Failed to validate responses:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Validation failed',
      });
    }
  },
);

/**
 * POST /api/scheduling/:configId/intake-forms/:id/visibility
 * Get field visibility state based on responses
 */
router.post(
  '/:configId/intake-forms/:id/visibility',
  requireAuth,
  async (
    req: Request<{ configId: string; id: string }, unknown, VisibilityBody>,
    res: Response,
  ) => {
    try {
      const id = parseInt(req.params.id);

      const form = await intakeFormsService.getIntakeForm(id);
      if (!form) {
        return res.status(404).json({ error: 'Intake form not found' });
      }

      const responses = req.body.responses || {};
      const fields =
        form.fields as unknown as intakeFormsService.IntakeFormField[];

      const visibility = intakeFormsService.getFieldsVisibility(
        fields,
        responses,
      );
      const requiredFields = intakeFormsService.getRequiredFields(
        fields,
        responses,
      );

      return res.json({
        data: {
          visibility,
          requiredFields,
        },
      });
    } catch (error) {
      console.error('Failed to get visibility:', error);
      return res
        .status(500)
        .json({ error: 'Failed to calculate field visibility' });
    }
  },
);

// ============================================================================
// RESPONSE ROUTES
// ============================================================================

/**
 * POST /api/scheduling/:configId/intake-forms/:id/responses
 * Save form responses for an appointment
 */
router.post(
  '/:configId/intake-forms/:id/responses',
  requireAuth,
  async (
    req: Request<{ configId: string; id: string }, unknown, ResponseBody>,
    res: Response,
  ) => {
    try {
      const id = parseInt(req.params.id);
      const { appointmentId, responses } = req.body;

      if (!appointmentId) {
        return res.status(400).json({ error: 'appointmentId is required' });
      }

      const response = await intakeFormsService.saveFormResponse(
        id,
        parseInt(appointmentId),
        responses || {},
      );

      return res.status(201).json({ data: response });
    } catch (error) {
      console.error('Failed to save response:', error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to save response',
      });
    }
  },
);

/**
 * GET /api/scheduling/:configId/intake-forms/:id/responses
 * Get all responses for a form
 */
router.get(
  '/:configId/intake-forms/:id/responses',
  requireAuth,
  async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const responses = await intakeFormsService.getFormResponses(id, {
        limit,
        offset,
      });

      return res.json({ data: responses });
    } catch (error) {
      console.error('Failed to get responses:', error);
      return res.status(500).json({ error: 'Failed to get responses' });
    }
  },
);

/**
 * GET /api/scheduling/:configId/appointments/:appointmentId/intake-responses
 * Get all intake form responses for an appointment
 */
router.get(
  '/:configId/appointments/:appointmentId/intake-responses',
  requireAuth,
  async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.appointmentId);
      const responses =
        await intakeFormsService.getAppointmentResponses(appointmentId);

      return res.json({ data: responses });
    } catch (error) {
      console.error('Failed to get appointment responses:', error);
      return res
        .status(500)
        .json({ error: 'Failed to get appointment responses' });
    }
  },
);

export { router as intakeFormsRouter };
