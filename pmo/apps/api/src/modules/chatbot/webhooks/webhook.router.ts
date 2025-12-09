/**
 * Webhook Router
 *
 * API endpoints for managing chatbot webhooks.
 * All endpoints require authentication.
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth } from '../../../auth/auth.middleware';
import * as webhookService from './webhook.service';
import { WEBHOOK_EVENTS } from './webhook.service';

const router = Router();

// Validation schemas
const createWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  maxRetries: z.number().int().min(0).max(10).optional(),
  retryDelayMs: z.number().int().min(100).max(60000).optional(),
  timeoutMs: z.number().int().min(1000).max(60000).optional(),
});

const updateWebhookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  events: z.array(z.string()).min(1).optional(),
  isActive: z.boolean().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
  retryDelayMs: z.number().int().min(100).max(60000).optional(),
  timeoutMs: z.number().int().min(1000).max(60000).optional(),
});

/**
 * GET /api/chatbot/:configId/webhooks
 * List all webhooks for a chatbot configuration
 */
router.get(
  '/chatbot/:configId/webhooks',
  requireAuth,
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

    const webhooks = await webhookService.getWebhooks(configId);

    // Mask secrets in response
    const maskedWebhooks = webhooks.map((w) => ({
      ...w,
      secret: w.secret.slice(0, 8) + '...',
    }));

    res.json({ webhooks: maskedWebhooks });
  },
);

/**
 * GET /api/chatbot/webhooks/events
 * Get list of available webhook events
 */
router.get(
  '/chatbot/webhooks/events',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    res.json({
      events: Object.entries(WEBHOOK_EVENTS).map(([key, value]) => ({
        id: value,
        name: key
          .split('_')
          .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
          .join(' '),
        description: getEventDescription(value),
      })),
    });
  },
);

/**
 * POST /api/chatbot/:configId/webhooks
 * Create a new webhook
 */
router.post(
  '/chatbot/:configId/webhooks',
  requireAuth,
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

    const parsed = createWebhookSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const webhook = await webhookService.createWebhook(configId, parsed.data);

    res.status(201).json({
      webhook: {
        ...webhook,
        // Return the full secret only on creation
        secretFull: webhook.secret,
        secret: webhook.secret.slice(0, 8) + '...',
      },
    });
  },
);

/**
 * PATCH /api/chatbot/webhooks/:id
 * Update a webhook
 */
router.patch(
  '/chatbot/webhooks/:id',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const webhookId = Number(req.params.id);
    if (Number.isNaN(webhookId)) {
      res.status(400).json({ error: 'Invalid webhook ID' });
      return;
    }

    const parsed = updateWebhookSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const webhook = await webhookService.updateWebhook(webhookId, parsed.data);

    res.json({
      webhook: {
        ...webhook,
        secret: webhook.secret.slice(0, 8) + '...',
      },
    });
  },
);

/**
 * DELETE /api/chatbot/webhooks/:id
 * Delete a webhook
 */
router.delete(
  '/chatbot/webhooks/:id',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const webhookId = Number(req.params.id);
    if (Number.isNaN(webhookId)) {
      res.status(400).json({ error: 'Invalid webhook ID' });
      return;
    }

    await webhookService.deleteWebhook(webhookId);
    res.status(204).send();
  },
);

/**
 * POST /api/chatbot/webhooks/:id/regenerate-secret
 * Regenerate the secret for a webhook
 */
router.post(
  '/chatbot/webhooks/:id/regenerate-secret',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const webhookId = Number(req.params.id);
    if (Number.isNaN(webhookId)) {
      res.status(400).json({ error: 'Invalid webhook ID' });
      return;
    }

    const webhook = await webhookService.regenerateWebhookSecret(webhookId);

    res.json({
      webhook: {
        ...webhook,
        secretFull: webhook.secret,
        secret: webhook.secret.slice(0, 8) + '...',
      },
    });
  },
);

/**
 * POST /api/chatbot/webhooks/:id/test
 * Send a test event to a webhook
 */
router.post(
  '/chatbot/webhooks/:id/test',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const webhookId = Number(req.params.id);
    if (Number.isNaN(webhookId)) {
      res.status(400).json({ error: 'Invalid webhook ID' });
      return;
    }

    const result = await webhookService.testWebhook(webhookId);
    res.json(result);
  },
);

/**
 * GET /api/chatbot/webhooks/:id/logs
 * Get delivery logs for a webhook
 */
router.get(
  '/chatbot/webhooks/:id/logs',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const webhookId = Number(req.params.id);
    if (Number.isNaN(webhookId)) {
      res.status(400).json({ error: 'Invalid webhook ID' });
      return;
    }

    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const logs = await webhookService.getWebhookLogs(webhookId, {
      limit,
      offset,
    });

    res.json({ logs });
  },
);

/**
 * Get human-readable description for webhook events
 */
function getEventDescription(event: string): string {
  const descriptions: Record<string, string> = {
    'conversation.started': 'Triggered when a new conversation begins',
    'conversation.ended': 'Triggered when a conversation is closed',
    'conversation.escalated': 'Triggered when a conversation is escalated to a human agent',
    'message.received': 'Triggered when a customer sends a message',
    'message.sent': 'Triggered when the bot sends a response',
    'customer.rating': 'Triggered when a customer submits a satisfaction rating',
  };
  return descriptions[event] || 'No description available';
}

export default router;
