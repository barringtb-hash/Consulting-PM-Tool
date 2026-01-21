/**
 * Intake CRM Router
 *
 * Handles CRM integration endpoints for processing submissions into CRM records
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../../auth/auth.middleware';
import * as crmIntegration from './crm';
import { crmIntegrationSchema } from './intake-schemas';

const router = Router();

/**
 * POST /api/intake/submissions/:submissionId/crm
 * Process an approved submission and create CRM records
 */
router.post(
  '/submissions/:submissionId/crm',
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

    const parsed = crmIntegrationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten() });
      return;
    }

    try {
      const result = await crmIntegration.processIntakeForCRM(
        submissionId,
        parsed.data,
      );

      if (result.errors.length > 0) {
        res.status(400).json({
          data: result,
          error: result.errors[0],
        });
        return;
      }

      res.json({ data: result });
    } catch (error) {
      console.error('CRM integration error:', error);
      res.status(500).json({ error: 'Failed to process CRM integration' });
    }
  },
);

/**
 * GET /api/intake/submissions/:submissionId/crm/status
 * Get CRM integration status for a submission
 */
router.get(
  '/submissions/:submissionId/crm/status',
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

    try {
      const status = await crmIntegration.getIntegrationStatus(submissionId);
      res.json({ data: status });
    } catch (error) {
      console.error('Error getting CRM status:', error);
      res.status(500).json({ error: 'Failed to get CRM status' });
    }
  },
);

export default router;
