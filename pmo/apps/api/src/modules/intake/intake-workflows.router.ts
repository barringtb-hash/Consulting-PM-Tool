/**
 * Intake Workflows Router
 *
 * Handles workflow management endpoints
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../../auth/auth.middleware';
import * as intakeService from './intake.service';
import { workflowSchema } from './intake-schemas';

const router = Router();

/**
 * GET /api/intake/:configId/workflows
 * List workflows
 */
router.get(
  '/:configId/workflows',
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
  '/:configId/workflows',
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
  '/submissions/:submissionId/workflow-progress',
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

export default router;
