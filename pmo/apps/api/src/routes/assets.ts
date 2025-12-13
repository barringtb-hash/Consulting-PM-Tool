import { AssetType } from '@prisma/client';
import { Router } from 'express';

import { AuthenticatedRequest, requireAuth } from '../auth/auth.middleware';
import { tenantMiddleware } from '../tenant/tenant.middleware';
import prisma from '../prisma/client';
import {
  archiveAsset,
  cloneAsset,
  createAsset,
  getAssetById,
  linkAssetToProject,
  listAssets,
  listAssetsForProject,
  unlinkAssetFromProject,
  updateAsset,
} from '../services/asset.service';
import {
  assetCloneSchema,
  assetCreateSchema,
  assetProjectLinkSchema,
  assetUpdateSchema,
} from '../validation/asset.schema';

const router = Router();

// All routes require authentication and tenant context
router.use(requireAuth);
router.use(tenantMiddleware);

router.get('/assets', async (req: AuthenticatedRequest, res) => {
  const { clientId, assetType, isTemplate, search, archived } = req.query;

  const parsedClientId =
    typeof clientId === 'string' && clientId.length > 0
      ? Number(clientId)
      : undefined;

  if (parsedClientId !== undefined && Number.isNaN(parsedClientId)) {
    res.status(400).json({ error: 'Invalid client id' });
    return;
  }

  const parsedAssetType =
    typeof assetType === 'string' &&
    Object.values(AssetType).includes(assetType as AssetType)
      ? (assetType as AssetType)
      : undefined;

  if (assetType && !parsedAssetType) {
    res.status(400).json({ error: 'Invalid asset type' });
    return;
  }

  const parsedIsTemplate =
    isTemplate === 'true' ? true : isTemplate === 'false' ? false : undefined;

  if (isTemplate && parsedIsTemplate === undefined) {
    res.status(400).json({ error: 'Invalid isTemplate flag' });
    return;
  }

  const includeArchived = archived === 'true';

  const assets = await listAssets({
    clientId: parsedClientId,
    type: parsedAssetType,
    isTemplate: parsedIsTemplate,
    search: typeof search === 'string' ? search : undefined,
    includeArchived,
  });

  res.json({ assets });
});

router.get('/assets/:id', async (req: AuthenticatedRequest, res) => {
  const assetId = Number(req.params.id);

  if (Number.isNaN(assetId)) {
    res.status(400).json({ error: 'Invalid asset id' });
    return;
  }

  const asset = await getAssetById(assetId);

  if (!asset) {
    res.status(404).json({ error: 'Asset not found' });
    return;
  }

  res.json({ asset });
});

router.post('/assets', async (req: AuthenticatedRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parsed = assetCreateSchema.safeParse(req.body);

  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'Invalid asset data', details: parsed.error.format() });
    return;
  }

  if (parsed.data.clientId) {
    const client = await prisma.client.findUnique({
      where: { id: parsed.data.clientId },
    });

    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
  }

  const asset = await createAsset(req.userId, parsed.data);

  res.status(201).json({ asset });
});

router.patch('/assets/:id', async (req: AuthenticatedRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const assetId = Number(req.params.id);

  if (Number.isNaN(assetId)) {
    res.status(400).json({ error: 'Invalid asset id' });
    return;
  }

  const parsed = assetUpdateSchema.safeParse(req.body);

  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'Invalid asset data', details: parsed.error.format() });
    return;
  }

  const result = await updateAsset(assetId, req.userId, parsed.data);

  if (result.error === 'not_found') {
    res.status(404).json({ error: 'Asset not found' });
    return;
  }

  if (result.error === 'forbidden') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  res.json({ asset: result.asset });
});

router.delete('/assets/:id', async (req: AuthenticatedRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const assetId = Number(req.params.id);

  if (Number.isNaN(assetId)) {
    res.status(400).json({ error: 'Invalid asset id' });
    return;
  }

  const result = await archiveAsset(assetId, req.userId);

  if (result.error === 'not_found') {
    res.status(404).json({ error: 'Asset not found' });
    return;
  }

  if (result.error === 'forbidden') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  res.status(204).send();
});

router.post('/assets/:id/clone', async (req: AuthenticatedRequest, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const assetId = Number(req.params.id);

  if (Number.isNaN(assetId)) {
    res.status(400).json({ error: 'Invalid asset id' });
    return;
  }

  const parsed = assetCloneSchema.safeParse(req.body ?? {});

  if (!parsed.success) {
    res
      .status(400)
      .json({ error: 'Invalid clone data', details: parsed.error.format() });
    return;
  }

  const result = await cloneAsset(assetId, req.userId, parsed.data);

  if (result.error === 'not_found') {
    res.status(404).json({ error: 'Asset not found' });
    return;
  }

  if (result.error === 'forbidden') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  res.status(201).json({ asset: result.asset });
});

router.get(
  '/projects/:projectId/assets',
  async (req: AuthenticatedRequest, res) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const projectId = Number(req.params.projectId);

    if (Number.isNaN(projectId)) {
      res.status(400).json({ error: 'Invalid project id' });
      return;
    }

    const includeArchived = req.query.archived === 'true';
    const result = await listAssetsForProject(
      projectId,
      req.userId,
      includeArchived,
    );

    if (result.error === 'project_not_found') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (result.error === 'forbidden') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json({ assets: result.assets });
  },
);

router.post(
  '/projects/:projectId/assets/:assetId/link',
  async (req: AuthenticatedRequest, res) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const projectId = Number(req.params.projectId);
    const assetId = Number(req.params.assetId);

    if (Number.isNaN(projectId) || Number.isNaN(assetId)) {
      res.status(400).json({ error: 'Invalid project or asset id' });
      return;
    }

    const parsed = assetProjectLinkSchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid link data', details: parsed.error.format() });
      return;
    }

    const result = await linkAssetToProject(
      projectId,
      assetId,
      req.userId,
      parsed.data,
    );

    if (result.error === 'project_not_found') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (result.error === 'forbidden') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (result.error === 'asset_not_found') {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    if (result.error === 'client_mismatch') {
      res
        .status(400)
        .json({ error: 'Asset client does not match project client' });
      return;
    }

    res.status(201).json({ link: result.link });
  },
);

router.delete(
  '/projects/:projectId/assets/:assetId/unlink',
  async (req: AuthenticatedRequest, res) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const projectId = Number(req.params.projectId);
    const assetId = Number(req.params.assetId);

    if (Number.isNaN(projectId) || Number.isNaN(assetId)) {
      res.status(400).json({ error: 'Invalid project or asset id' });
      return;
    }

    const result = await unlinkAssetFromProject(projectId, assetId, req.userId);

    if (result.error === 'project_not_found') {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (result.error === 'forbidden') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    if (result.error === 'link_not_found') {
      res.status(404).json({ error: 'Asset link not found' });
      return;
    }

    res.status(204).send();
  },
);

export default router;
