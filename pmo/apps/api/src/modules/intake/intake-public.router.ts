/**
 * Intake Public Router
 *
 * Handles public-facing portal routes (no authentication required)
 */

import { Router, Request, Response } from 'express';
import { AuthenticatedRequest } from '../../auth/auth.middleware';
import * as intakeService from './intake.service';
import * as conversationService from './conversation';
import {
  documentSchema,
  startConversationSchema,
  sendMessageSchema,
} from './intake-schemas';

const router = Router();

// ============================================================================
// PUBLIC FORM ROUTES
// ============================================================================

/**
 * GET /api/public/intake/form/:configId/:slug
 * Get form by slug for public portal
 */
router.get(
  '/form/:configId/:slug',
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

// ============================================================================
// PUBLIC SUBMISSION ROUTES
// ============================================================================

/**
 * GET /api/public/intake/submission/:token
 * Get submission by access token
 */
router.get(
  '/submission/:token',
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
  '/submission/:token',
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
  '/submission/:token/documents',
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
// PUBLIC CONVERSATIONAL INTAKE ROUTES
// ============================================================================

/**
 * POST /api/public/intake/conversation/start
 * Start a new conversational intake session
 */
router.post('/conversation/start', async (req: Request, res: Response) => {
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
    const message =
      error instanceof Error ? error.message : 'Failed to start conversation';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/public/intake/conversation/:token/message
 * Send a message in a conversation
 */
router.post(
  '/conversation/:token/message',
  async (req: Request, res: Response) => {
    const token = String(req.params.token);
    const parsed = sendMessageSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ errors: parsed.error.flatten() });
      return;
    }

    try {
      const result = await conversationService.processMessage(
        token,
        parsed.data.message,
      );
      res.json({ data: result });
    } catch (error) {
      console.error('Error processing message:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to process message';
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
  '/conversation/:token/summary',
  async (req: Request, res: Response) => {
    const token = String(req.params.token);

    try {
      const summary = await conversationService.getConversationSummary(token);
      res.json({ data: summary });
    } catch (error) {
      console.error('Error getting conversation summary:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to get summary';
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
  '/conversation/:token/history',
  async (req: Request, res: Response) => {
    const token = String(req.params.token);

    try {
      const history = await conversationService.getConversationHistory(token);
      res.json({ data: history });
    } catch (error) {
      console.error('Error getting conversation history:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to get history';
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
  '/conversation/:token/pause',
  async (req: Request, res: Response) => {
    const token = String(req.params.token);

    try {
      await conversationService.pauseConversation(token);
      res.json({ data: { success: true, message: 'Conversation paused' } });
    } catch (error) {
      console.error('Error pausing conversation:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to pause conversation';
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
  '/conversation/:token/resume',
  async (req: Request, res: Response) => {
    const token = String(req.params.token);

    try {
      const result = await conversationService.resumeConversation(token);
      res.json({ data: result });
    } catch (error) {
      console.error('Error resuming conversation:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to resume conversation';
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
  '/conversation/:token/abandon',
  async (req: Request, res: Response) => {
    const token = String(req.params.token);

    try {
      await conversationService.abandonConversation(token);
      res.json({ data: { success: true, message: 'Conversation abandoned' } });
    } catch (error) {
      console.error('Error abandoning conversation:', error);
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to abandon conversation';
      if (message.includes('not found')) {
        res.status(404).json({ error: message });
      } else {
        res.status(500).json({ error: message });
      }
    }
  },
);

export default router;
