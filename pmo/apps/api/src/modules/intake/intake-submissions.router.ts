/**
 * Intake Submissions Router
 *
 * Handles submission management endpoints (authenticated)
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../../auth/auth.middleware';
import * as intakeService from './intake.service';
import { submissionSchema, reviewSchema } from './intake-schemas';

const router = Router();

/**
 * GET /api/intake/:configId/submissions
 * List submissions
 */
router.get(
  '/:configId/submissions',
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
  '/:configId/submissions',
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
  '/submissions/:id',
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
  '/submissions/:id/review',
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

export default router;
