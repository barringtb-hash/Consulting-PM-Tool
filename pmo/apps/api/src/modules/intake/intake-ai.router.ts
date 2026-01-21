/**
 * Intake AI Router
 *
 * Handles AI-powered form generation and field suggestion endpoints
 */

import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AuthenticatedRequest } from '../../auth/auth.middleware';
import {
  hasClientAccess,
  getClientIdFromIntakeConfig,
} from '../../auth/client-auth.helper';
import * as intakeService from './intake.service';
import * as aiService from './ai';
import { aiGenerateFormSchema, aiSuggestFieldsSchema } from './intake-schemas';

const router = Router();

/**
 * POST /api/intake/ai/generate-form
 * Generate an intake form from natural language description
 */
router.post(
  '/ai/generate-form',
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
  '/ai/suggest-fields',
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
  '/ai/detect-industry',
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
  '/ai/industries',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const industries = aiService.getAvailableIndustries().map((industry) => ({
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
  '/:configId/forms/generate',
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
      res
        .status(403)
        .json({ error: 'Access denied to this intake configuration' });
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

export default router;
