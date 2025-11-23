import { Router, Response } from 'express';

import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import {
  marketingContentCreateSchema,
  marketingContentUpdateSchema,
  marketingContentListQuerySchema,
  generateContentSchema,
} from '../../validation/marketing.schema';
import {
  listMarketingContents,
  createMarketingContent,
  getMarketingContentById,
  updateMarketingContent,
  archiveMarketingContent,
  deleteMarketingContent,
  getMarketingContentsByProject,
  generateContent,
} from './marketing.service';

const router = Router();

router.use(requireAuth);

/**
 * GET /api/marketing-contents
 * List all marketing contents with optional filters
 */
router.get(
  '/marketing-contents',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = marketingContentListQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid query parameters',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await listMarketingContents(req.userId, parsed.data);

    res.json({ contents: result.contents });
  },
);

/**
 * POST /api/marketing-contents
 * Create a new marketing content item
 */
router.post(
  '/marketing-contents',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = marketingContentCreateSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid content data',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await createMarketingContent(req.userId, parsed.data);

    if ('error' in result) {
      if (result.error === 'client_not_found') {
        res.status(404).json({ error: 'Client not found' });
        return;
      }

      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    res.status(201).json({ content: result.content });
  },
);

/**
 * GET /api/marketing-contents/:id
 * Get a single marketing content by ID
 */
router.get(
  '/marketing-contents/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const contentId = Number(req.params.id);

    if (Number.isNaN(contentId)) {
      res.status(400).json({ error: 'Invalid content id' });
      return;
    }

    const result = await getMarketingContentById(contentId, req.userId);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Content not found' });
        return;
      }

      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    res.json({ content: result.content });
  },
);

/**
 * PATCH /api/marketing-contents/:id
 * Update a marketing content item
 */
router.patch(
  '/marketing-contents/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const contentId = Number(req.params.id);

    if (Number.isNaN(contentId)) {
      res.status(400).json({ error: 'Invalid content id' });
      return;
    }

    const parsed = marketingContentUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid content data',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await updateMarketingContent(contentId, req.userId, parsed.data);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Content not found' });
        return;
      }

      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    res.json({ content: result.content });
  },
);

/**
 * DELETE /api/marketing-contents/:id
 * Archive a marketing content item (soft delete)
 */
router.delete(
  '/marketing-contents/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const contentId = Number(req.params.id);

    if (Number.isNaN(contentId)) {
      res.status(400).json({ error: 'Invalid content id' });
      return;
    }

    const result = await archiveMarketingContent(contentId, req.userId);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Content not found' });
        return;
      }

      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    res.status(204).send();
  },
);

/**
 * GET /api/projects/:projectId/marketing-contents
 * Get all marketing contents for a specific project
 */
router.get(
  '/projects/:projectId/marketing-contents',
  async (req: AuthenticatedRequest<{ projectId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const projectId = Number(req.params.projectId);

    if (Number.isNaN(projectId)) {
      res.status(400).json({ error: 'Invalid project id' });
      return;
    }

    const result = await getMarketingContentsByProject(projectId, req.userId);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
    }

    res.json({ contents: result.contents });
  },
);

/**
 * POST /api/marketing-contents/generate
 * Generate marketing content from project or meeting data using AI
 */
router.post(
  '/marketing-contents/generate',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const parsed = generateContentSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid generation parameters',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await generateContent(req.userId, parsed.data);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({
          error: `${parsed.data.sourceType === 'project' ? 'Project' : 'Meeting'} not found`,
        });
        return;
      }

      if (result.error === 'forbidden') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      if (result.error === 'invalid_source_type') {
        res.status(400).json({ error: 'Invalid source type' });
        return;
      }
    }

    res.json({ generated: result.generated });
  },
);

export default router;
