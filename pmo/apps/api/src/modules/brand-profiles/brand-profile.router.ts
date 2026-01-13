import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import { tenantMiddleware } from '../../tenant/tenant.middleware';
import {
  getBrandProfileByClientId,
  createBrandProfile,
  updateBrandProfile,
  getBrandAssets,
  createBrandAsset,
  updateBrandAsset,
  archiveBrandAsset,
} from './brand-profile.service';
import { BrandAssetType } from '../../types/marketing';

const router = Router();

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

// Schema for brand fonts - flexible but typed structure
const brandFontsSchema = z
  .object({
    primary: z.string().max(100).optional(),
    secondary: z.string().max(100).optional(),
    headings: z.string().max(100).optional(),
    body: z.string().max(100).optional(),
    monospace: z.string().max(100).optional(),
  })
  .passthrough()
  .optional();

const brandProfileCreateSchema = z.object({
  clientId: z.number(),
  name: z.string().min(1),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  fonts: brandFontsSchema,
  toneVoiceGuidelines: z.string().optional(),
  valueProposition: z.string().optional(),
  targetAudience: z.string().optional(),
  keyMessages: z.array(z.string()).optional(),
});

const brandProfileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  fonts: brandFontsSchema,
  toneVoiceGuidelines: z.string().optional(),
  valueProposition: z.string().optional(),
  targetAudience: z.string().optional(),
  keyMessages: z.array(z.string()).optional(),
  archived: z.boolean().optional(),
});

const brandAssetCreateSchema = z.object({
  brandProfileId: z.number(),
  name: z.string().min(1),
  type: z.nativeEnum(BrandAssetType),
  url: z.string().min(1),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const brandAssetUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.nativeEnum(BrandAssetType).optional(),
  url: z.string().min(1).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  archived: z.boolean().optional(),
});

/**
 * GET /api/clients/:clientId/brand-profile
 * Get brand profile for a client
 */
router.get(
  '/clients/:clientId/brand-profile',
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

    const result = await getBrandProfileByClientId(clientId, req.userId);

    if ('error' in result) {
      if (result.error === 'client_not_found') {
        res.status(404).json({ error: 'Client not found' });
        return;
      }
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Brand profile not found' });
        return;
      }
    }

    res.json({ brandProfile: result.brandProfile });
  },
);

/**
 * POST /api/clients/:clientId/brand-profile
 * Create a brand profile for a client
 */
router.post(
  '/clients/:clientId/brand-profile',
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

    const parsed = brandProfileCreateSchema.safeParse({
      ...(req.body || {}),
      clientId,
    });
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid brand profile data',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await createBrandProfile(req.userId, parsed.data);

    if ('error' in result) {
      if (result.error === 'client_not_found') {
        res.status(404).json({ error: 'Client not found' });
        return;
      }
      if (result.error === 'already_exists') {
        res
          .status(409)
          .json({ error: 'Brand profile already exists for this client' });
        return;
      }
    }

    res.status(201).json({ brandProfile: result.brandProfile });
  },
);

/**
 * PATCH /api/brand-profiles/:id
 * Update a brand profile
 */
router.patch(
  '/brand-profiles/:id',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid brand profile ID' });
      return;
    }

    const parsed = brandProfileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid brand profile data',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await updateBrandProfile(id, req.userId, parsed.data);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Brand profile not found' });
        return;
      }
    }

    res.json({ brandProfile: result.brandProfile });
  },
);

/**
 * GET /api/brand-profiles/:id/assets
 * Get all brand assets for a brand profile
 */
router.get(
  '/brand-profiles/:id/assets',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid brand profile ID' });
      return;
    }

    const result = await getBrandAssets(id, req.userId);

    if ('error' in result) {
      if (result.error === 'profile_not_found') {
        res.status(404).json({ error: 'Brand profile not found' });
        return;
      }
    }

    res.json({ assets: result.assets });
  },
);

/**
 * POST /api/brand-profiles/:id/assets
 * Create a brand asset
 */
router.post(
  '/brand-profiles/:id/assets',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const brandProfileId = parseInt(req.params.id, 10);
    if (isNaN(brandProfileId)) {
      res.status(400).json({ error: 'Invalid brand profile ID' });
      return;
    }

    const parsed = brandAssetCreateSchema.safeParse({
      ...(req.body || {}),
      brandProfileId,
    });
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid brand asset data',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await createBrandAsset(req.userId, parsed.data);

    if ('error' in result) {
      if (result.error === 'profile_not_found') {
        res.status(404).json({ error: 'Brand profile not found' });
        return;
      }
    }

    res.status(201).json({ asset: result.asset });
  },
);

/**
 * PATCH /api/brand-assets/:id
 * Update a brand asset
 */
router.patch(
  '/brand-assets/:id',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid brand asset ID' });
      return;
    }

    const parsed = brandAssetUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid brand asset data',
        details: parsed.error.format(),
      });
      return;
    }

    const result = await updateBrandAsset(id, req.userId, parsed.data);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Brand asset not found' });
        return;
      }
    }

    res.json({ asset: result.asset });
  },
);

/**
 * DELETE /api/brand-assets/:id
 * Archive a brand asset (soft delete)
 */
router.delete(
  '/brand-assets/:id',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid brand asset ID' });
      return;
    }

    const result = await archiveBrandAsset(id, req.userId);

    if ('error' in result) {
      if (result.error === 'not_found') {
        res.status(404).json({ error: 'Brand asset not found' });
        return;
      }
    }

    res.json({ success: true, asset: result.asset });
  },
);

export default router;
