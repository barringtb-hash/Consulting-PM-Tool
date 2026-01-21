/**
 * Intake Screening Router
 *
 * Handles matter pre-screening endpoints
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../../auth/auth.middleware';
import * as screeningService from './screening';
import { screeningConfigSchema, quickScreenSchema } from './intake-schemas';

const router = Router();

/**
 * POST /api/intake/submissions/:submissionId/screen
 * Perform matter pre-screening for a submission
 */
router.post(
  '/submissions/:submissionId/screen',
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

    const parsed = screeningConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten() });
      return;
    }

    try {
      const result = await screeningService.screenSubmission(
        submissionId,
        parsed.data,
      );
      res.json({ data: result });
    } catch (error) {
      console.error('Screening error:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to perform screening';
      if (message.includes('not found')) {
        res.status(404).json({ error: message });
      } else {
        res.status(500).json({ error: message });
      }
    }
  },
);

/**
 * POST /api/intake/screen/quick
 * Quick screening without a submission
 */
router.post(
  '/screen/quick',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = quickScreenSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten() });
      return;
    }

    try {
      const result = await screeningService.quickScreen(
        parsed.data.formData,
        parsed.data.config,
      );
      res.json({ data: result });
    } catch (error) {
      console.error('Quick screening error:', error);
      res.status(500).json({ error: 'Failed to perform screening' });
    }
  },
);

export default router;
