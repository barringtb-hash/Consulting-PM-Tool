/**
 * Natural Language Booking Router
 *
 * API endpoints for NLU-powered booking interface
 */

import { Router } from 'express';
import { requireAuth } from '../../auth/auth.middleware';
import * as nlService from './natural-language.service';
import { z } from 'zod';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const messageSchema = z.object({
  message: z.string().min(1).max(1000),
  conversationId: z.string().optional(),
});

const classifySchema = z.object({
  message: z.string().min(1).max(1000),
});

// ============================================================================
// CONVERSATION ENDPOINTS
// ============================================================================

/**
 * POST /api/scheduling/:configId/nl/message
 * Process a natural language message
 */
router.post('/:configId/nl/message', requireAuth, async (req, res) => {
  try {
    const configId = parseInt(req.params.configId);

    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const response = await nlService.processMessage(
      configId,
      parsed.data.message,
      parsed.data.conversationId,
    );

    return res.json({ data: response });
  } catch (error) {
    console.error('Failed to process message:', error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to process message',
    });
  }
});

/**
 * POST /api/scheduling/:configId/nl/classify
 * Classify intent without processing (for testing/debugging)
 */
router.post('/:configId/nl/classify', requireAuth, async (req, res) => {
  try {
    const parsed = classifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const classification = nlService.classifyIntent(parsed.data.message);

    return res.json({ data: classification });
  } catch (error) {
    console.error('Failed to classify:', error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to classify message',
    });
  }
});

/**
 * POST /api/scheduling/:configId/nl/extract
 * Extract entities from a message (for testing/debugging)
 */
router.post('/:configId/nl/extract', requireAuth, async (req, res) => {
  try {
    const parsed = classifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const entities = nlService.extractEntities(parsed.data.message);

    return res.json({ data: entities });
  } catch (error) {
    console.error('Failed to extract entities:', error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to extract entities',
    });
  }
});

/**
 * DELETE /api/scheduling/:configId/nl/conversation/:conversationId
 * Clear a conversation state
 */
router.delete(
  '/:configId/nl/conversation/:conversationId',
  requireAuth,
  async (req, res) => {
    try {
      const { conversationId } = req.params;

      nlService.clearConversation(conversationId);

      return res.json({ data: { success: true } });
    } catch (error) {
      console.error('Failed to clear conversation:', error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to clear conversation',
      });
    }
  },
);

/**
 * POST /api/scheduling/:configId/nl/cleanup
 * Cleanup old conversations (admin endpoint)
 */
router.post('/:configId/nl/cleanup', requireAuth, async (req, res) => {
  try {
    const maxAgeMinutes = parseInt(req.query.maxAgeMinutes as string) || 30;

    const cleaned = nlService.cleanupOldConversations(maxAgeMinutes);

    return res.json({
      data: {
        success: true,
        conversationsCleared: cleaned,
      },
    });
  } catch (error) {
    console.error('Failed to cleanup:', error);
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : 'Failed to cleanup conversations',
    });
  }
});

// ============================================================================
// PUBLIC ENDPOINT (for chatbot widget integration)
// ============================================================================

/**
 * POST /api/booking/:slug/nl/message
 * Public endpoint for natural language booking (no auth required)
 * This integrates with the chatbot widget for booking pages
 */
// Note: This route should be registered separately in booking.router.ts
// for public access without auth

export { router as naturalLanguageRouter };
