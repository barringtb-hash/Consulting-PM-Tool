import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import {
  getPublishingConnections,
  createPublishingConnection,
  updatePublishingConnection,
  deletePublishingConnection,
  publishContent,
} from './publishing.service';
import { PublishingPlatform } from '../../types/marketing';

const router = Router();

router.use(requireAuth);

const publishingConnectionCreateSchema = z.object({
  clientId: z.number(),
  platform: z.nativeEnum(PublishingPlatform),
  accountName: z.string().min(1),
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

const publishingConnectionUpdateSchema = z.object({
  accountName: z.string().min(1).optional(),
  accessToken: z.string().min(1).optional(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

const publishContentSchema = z.object({
  contentId: z.number(),
  publishingConnectionId: z.number().optional(),
  scheduledFor: z.string().datetime().optional(),
});

/**
 * GET /api/clients/:clientId/publishing-connections
 * Get all publishing connections for a client
 */
router.get(
  '/clients/:clientId/publishing-connections',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const clientId = parseInt(req.params.clientId, 10);
    if (isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client ID' });
      return;
    }

    const result = await getPublishingConnections(clientId, req.userId);

    if ('error' in result) {
      if (result.error === 'client_not_found') {
        res.status(404).json({ error: 'Client not found' });
        return;
      }
    }

    res.json({ connections: result.connections });
  },
);

/**
 * POST /api/clients/:clientId/publishing-connections
 * Create a publishing connection
 */
router.post(
  '/clients/:clientId/publishing-connections',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const clientId = parseInt(req.params.clientId, 10);
    if (isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client ID' });
      return;
    }

    const parsed = publishingConnectionCreateSchema.safeParse({
      ...req.body,
      clientId,
    });
    if (!parsed.success) {
      res
        .status(400)
        .json({
          error: 'Invalid publishing connection data',
          details: parsed.error.format(),
        });
      return;
    }

    const result = await createPublishingConnection(req.userId, parsed.data);

    if ('error' in result) {
      if (result.error === 'client_not_found') {
        res.status(404).json({ error: 'Client not found' });
        return;
      }
      if (result.error === 'already_exists') {
        res
          .status(409)
          .json({ error: 'Publishing connection already exists for this platform' });
        return;
      }
    }

    res.status(201).json({ connection: result.connection });
  },
);

/**
 * PATCH /api/publishing-connections/:id
 * Update a publishing connection
 */
router.patch(
  '/publishing-connections/:id',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid publishing connection ID' });
      return;
    }

    const parsed = publishingConnectionUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({
          error: 'Invalid publishing connection data',
          details: parsed.error.format(),
        });
      return;
    }

    const result = await updatePublishingConnection(id, req.userId, parsed.data);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Publishing connection not found' });
        return;
      }
    }

    res.json({ connection: result.connection });
  },
);

/**
 * DELETE /api/publishing-connections/:id
 * Delete a publishing connection
 */
router.delete(
  '/publishing-connections/:id',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid publishing connection ID' });
      return;
    }

    const result = await deletePublishingConnection(id, req.userId);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Publishing connection not found' });
        return;
      }
    }

    res.json({ success: true });
  },
);

/**
 * POST /api/marketing-contents/:id/publish
 * Publish or schedule a marketing content
 */
router.post(
  '/marketing-contents/:id/publish',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const contentId = parseInt(req.params.id, 10);
    if (isNaN(contentId)) {
      res.status(400).json({ error: 'Invalid content ID' });
      return;
    }

    const parsed = publishContentSchema.safeParse({
      ...req.body,
      contentId,
    });
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid publish data', details: parsed.error.format() });
      return;
    }

    const result = await publishContent(contentId, req.userId, {
      publishingConnectionId: parsed.data.publishingConnectionId,
      scheduledFor: parsed.data.scheduledFor
        ? new Date(parsed.data.scheduledFor)
        : undefined,
    });

    if ('error' in result) {
      if (result.error === 'content_not_found') {
        res.status(404).json({ error: 'Content not found' });
        return;
      }
      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'You do not have access to this content' });
        return;
      }
      if (result.error === 'connection_not_found') {
        res.status(404).json({ error: 'Publishing connection not found' });
        return;
      }
      if (result.error === 'connection_mismatch') {
        res
          .status(400)
          .json({
            error: 'Publishing connection does not belong to the content client',
          });
        return;
      }
      if (result.error === 'connection_inactive') {
        res.status(400).json({ error: 'Publishing connection is inactive' });
        return;
      }
    }

    res.json({ content: result.content });
  },
);

export default router;
