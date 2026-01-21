/**
 * Intake Compliance Router
 *
 * Handles compliance templates, conflict checking, and engagement letter endpoints
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../../auth/auth.middleware';
import * as intakeService from './intake.service';
import * as complianceService from './compliance';
import {
  complianceTemplateSchema,
  conflictCheckSchema,
  quickConflictCheckSchema,
  engagementLetterSchema,
} from './intake-schemas';

const router = Router();

// ============================================================================
// COMPLIANCE TEMPLATE ROUTES
// ============================================================================

/**
 * GET /api/intake/:configId/compliance-templates
 * List compliance templates
 */
router.get(
  '/:configId/compliance-templates',
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
  '/:configId/compliance-templates',
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
  '/submissions/:submissionId/compliance/:templateId/check',
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
// LEGAL COMPLIANCE ROUTES (Phase 2)
// ============================================================================

/**
 * POST /api/intake/submissions/:submissionId/conflict-check
 * Perform conflict of interest check for a submission
 */
router.post(
  '/submissions/:submissionId/conflict-check',
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

    const parsed = conflictCheckSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten() });
      return;
    }

    try {
      const result = await complianceService.checkForConflicts(
        submissionId,
        parsed.data,
      );

      // Optionally save the result
      if (req.query.save === 'true') {
        await complianceService.saveConflictCheckResult(submissionId, result);
      }

      res.json({ data: result });
    } catch (error) {
      console.error('Conflict check error:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to perform conflict check';
      if (message.includes('not found')) {
        res.status(404).json({ error: message });
      } else {
        res.status(500).json({ error: message });
      }
    }
  },
);

/**
 * POST /api/intake/conflict-check/quick
 * Quick conflict check against names (without submission)
 */
router.post(
  '/conflict-check/quick',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = quickConflictCheckSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten() });
      return;
    }

    try {
      const result = await complianceService.quickConflictCheck(
        parsed.data.tenantId,
        parsed.data.names,
      );
      res.json({ data: result });
    } catch (error) {
      console.error('Quick conflict check error:', error);
      res.status(500).json({ error: 'Failed to perform quick conflict check' });
    }
  },
);

// ============================================================================
// ENGAGEMENT LETTER ROUTES
// ============================================================================

/**
 * POST /api/intake/submissions/:submissionId/engagement-letter
 * Generate an engagement letter for a submission
 */
router.post(
  '/submissions/:submissionId/engagement-letter',
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

    const parsed = engagementLetterSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten() });
      return;
    }

    try {
      const letter = await complianceService.generateEngagementLetter(
        submissionId,
        parsed.data,
      );
      res.json({ data: letter });
    } catch (error) {
      console.error('Engagement letter generation error:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to generate engagement letter';
      if (message.includes('not found')) {
        res.status(404).json({ error: message });
      } else {
        res.status(500).json({ error: message });
      }
    }
  },
);

/**
 * GET /api/intake/engagement-letter/templates
 * Get available engagement letter templates
 */
router.get(
  '/engagement-letter/templates',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const industry = req.query.industry as string | undefined;
    const templates = complianceService.getAvailableTemplates(industry);
    res.json({ data: templates });
  },
);

/**
 * GET /api/intake/engagement-letter/templates/:templateId
 * Get a specific engagement letter template
 */
router.get(
  '/engagement-letter/templates/:templateId',
  async (req: AuthenticatedRequest<{ templateId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const template = complianceService.getTemplate(req.params.templateId);
    if (!template) {
      res.status(404).json({ error: 'Template not found' });
      return;
    }

    res.json({ data: template });
  },
);

/**
 * POST /api/intake/engagement-letter/templates/:templateId/preview
 * Preview an engagement letter with sample data
 */
router.post(
  '/engagement-letter/templates/:templateId/preview',
  async (req: AuthenticatedRequest<{ templateId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const sampleData = req.body as Record<string, string>;

    try {
      const content = complianceService.previewTemplate(
        req.params.templateId,
        sampleData,
      );
      res.json({ data: { content } });
    } catch (error) {
      console.error('Template preview error:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to preview template';
      if (message.includes('not found')) {
        res.status(404).json({ error: message });
      } else {
        res.status(500).json({ error: message });
      }
    }
  },
);

export default router;
