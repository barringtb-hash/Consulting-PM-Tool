import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import {
  listCampaigns,
  createCampaign,
  getCampaignById,
  updateCampaign,
  archiveCampaign,
  getCampaignContents,
} from './campaign.service';
import { CampaignStatus } from '../../types/marketing';

const router = Router();

router.use(requireAuth);

const campaignCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  goals: z.any().optional(),
  status: z.nativeEnum(CampaignStatus).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  clientId: z.number(),
  projectId: z.number().optional(),
});

const campaignUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  goals: z.any().optional(),
  status: z.nativeEnum(CampaignStatus).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  projectId: z.number().optional(),
  archived: z.boolean().optional(),
});

const campaignListQuerySchema = z.object({
  clientId: z.coerce.number().optional(),
  projectId: z.coerce.number().optional(),
  status: z.string().optional(),
  archived: z.coerce.boolean().optional(),
});

/**
 * GET /api/campaigns
 * List all campaigns with optional filters
 */
router.get('/campaigns', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parsed = campaignListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid query parameters',
      details: parsed.error.format(),
    });
    return;
  }

  const campaigns = await listCampaigns(req.userId, parsed.data);
  res.json({ campaigns });
});

/**
 * POST /api/campaigns
 * Create a new campaign
 */
router.post('/campaigns', async (req: AuthenticatedRequest, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parsed = campaignCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'Invalid campaign data', details: parsed.error.format() });
    return;
  }

  const result = await createCampaign(req.userId, parsed.data);

  if ('error' in result) {
    if (result.error === 'client_not_found') {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    if (result.error === 'project_not_found') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    if (result.error === 'project_forbidden') {
      res.status(403).json({ error: 'You do not have access to this project' });
      return;
    }
  }

  res.status(201).json({ campaign: result.campaign });
});

/**
 * GET /api/campaigns/:id
 * Get a single campaign by ID
 */
router.get(
  '/campaigns/:id',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid campaign ID' });
      return;
    }

    const result = await getCampaignById(id, req.userId);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }
      if (result.error === 'forbidden') {
        res
          .status(403)
          .json({ error: 'You do not have access to this campaign' });
        return;
      }
    }

    res.json({ campaign: result.campaign });
  },
);

/**
 * PATCH /api/campaigns/:id
 * Update a campaign
 */
router.patch(
  '/campaigns/:id',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid campaign ID' });
      return;
    }

    const parsed = campaignUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid campaign data',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await updateCampaign(id, req.userId, parsed.data);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }
      if (result.error === 'forbidden') {
        res
          .status(403)
          .json({ error: 'You do not have access to this campaign' });
        return;
      }
      if (result.error === 'project_not_found') {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      if (result.error === 'project_forbidden') {
        res
          .status(403)
          .json({ error: 'You do not have access to this project' });
        return;
      }
    }

    res.json({ campaign: result.campaign });
  },
);

/**
 * DELETE /api/campaigns/:id
 * Archive a campaign (soft delete)
 */
router.delete(
  '/campaigns/:id',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid campaign ID' });
      return;
    }

    const result = await archiveCampaign(id, req.userId);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }
      if (result.error === 'forbidden') {
        res
          .status(403)
          .json({ error: 'You do not have access to this campaign' });
        return;
      }
    }

    res.json({ success: true, campaign: result.campaign });
  },
);

/**
 * GET /api/campaigns/:id/contents
 * Get all marketing contents for a campaign
 */
router.get(
  '/campaigns/:id/contents',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid campaign ID' });
      return;
    }

    const result = await getCampaignContents(id, req.userId);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Campaign not found' });
        return;
      }
      if (result.error === 'forbidden') {
        res
          .status(403)
          .json({ error: 'You do not have access to this campaign' });
        return;
      }
    }

    res.json({ contents: result.contents });
  },
);

export default router;
