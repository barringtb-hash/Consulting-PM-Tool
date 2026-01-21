/**
 * Intake Documents Router
 *
 * Handles document management endpoints for submissions
 */

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../../auth/auth.middleware';
import * as intakeService from './intake.service';
import { documentVerifySchema } from './intake-schemas';

const router = Router();

/**
 * GET /api/intake/submissions/:submissionId/documents
 * Get documents for a submission
 */
router.get(
  '/submissions/:submissionId/documents',
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
  '/documents/:id/verify',
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

    const parsed = documentVerifySchema.safeParse(req.body);
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
  '/documents/:id/extract',
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

export default router;
