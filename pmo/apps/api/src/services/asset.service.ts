import { AssetType, Prisma } from '@prisma/client';

import prisma from '../prisma/client';
import { getTenantId, hasTenantContext } from '../tenant/tenant.context';
import {
  AssetCloneInput,
  AssetCreateInput,
  AssetProjectLinkInput,
  AssetUpdateInput,
} from '../validation/asset.schema';

type AssetWithOwner = Prisma.AIAssetGetPayload<{
  include: { client: true };
}>;

const normalizeJsonInput = (
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
};

const validateProjectAccess = async (projectId: number, userId: number) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId },
  });

  if (!project) {
    return 'not_found' as const;
  }

  // Allow access if user is owner OR project is shared with tenant
  if (project.ownerId !== userId && !project.isSharedWithTenant) {
    return 'forbidden' as const;
  }

  return project;
};

interface ListAssetsParams {
  clientId?: number;
  type?: AssetType;
  isTemplate?: boolean;
  search?: string;
  includeArchived?: boolean;
}

export const listAssets = async ({
  clientId,
  type,
  isTemplate,
  search,
  includeArchived = false,
}: ListAssetsParams) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const where: Prisma.AIAssetWhereInput = {
    tenantId,
    clientId,
    type,
    isTemplate,
    archived: includeArchived ? undefined : false,
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { tags: { has: search } },
    ];
  }

  return prisma.aIAsset.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
  });
};

export const getAssetById = async (id: number, includeArchived = false) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  return prisma.aIAsset.findFirst({
    where: { id, tenantId, archived: includeArchived ? undefined : false },
  });
};

export const createAsset = async (ownerId: number, data: AssetCreateInput) => {
  // Get tenant context for multi-tenant isolation
  const tenantId = hasTenantContext() ? getTenantId() : undefined;
  const { content, ...rest } = data;

  return prisma.aIAsset.create({
    data: {
      ...rest,
      content: normalizeJsonInput(content),
      createdById: ownerId,
      tenantId,
      isTemplate: data.isTemplate ?? false,
      tags: data.tags ?? [],
      clientId: data.clientId ?? null,
    },
  });
};

export const updateAsset = async (
  id: number,
  requesterId: number,
  data: AssetUpdateInput,
) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const existing = await prisma.aIAsset.findFirst({
    where: { id, tenantId },
  });

  if (!existing || existing.archived) {
    return { error: 'not_found' as const };
  }

  // Only the creator can update the asset
  if (existing.createdById !== requesterId) {
    return { error: 'forbidden' as const };
  }

  const { content, ...rest } = data;

  const asset = await prisma.aIAsset.update({
    where: { id },
    data: {
      ...rest,
      content: normalizeJsonInput(content),
      clientId: data.clientId ?? undefined,
      tags: data.tags ?? undefined,
    },
  });

  return { asset };
};

export const archiveAsset = async (id: number, requesterId: number) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const existing = await prisma.aIAsset.findFirst({
    where: { id, tenantId },
  });

  if (!existing || existing.archived) {
    return { error: 'not_found' as const };
  }

  // Only the creator can archive the asset
  if (existing.createdById !== requesterId) {
    return { error: 'forbidden' as const };
  }

  const asset = await prisma.aIAsset.update({
    where: { id },
    data: { archived: true },
  });

  return { asset };
};

export const cloneAsset = async (
  id: number,
  requesterId: number,
  overrides: AssetCloneInput,
) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const source = await prisma.aIAsset.findFirst({
    where: { id, tenantId },
  });

  if (!source || source.archived) {
    return { error: 'not_found' as const };
  }

  // Users can clone:
  // 1. Their own assets
  // 2. Template assets (public templates)
  const canClone = source.createdById === requesterId || source.isTemplate;

  if (!canClone) {
    return { error: 'forbidden' as const };
  }

  const name = overrides.name ?? `${source.name} (Copy)`;

  const asset = await prisma.aIAsset.create({
    data: {
      name,
      type: source.type,
      description: overrides.description ?? source.description,
      content: normalizeJsonInput(source.content),
      tags: overrides.tags ?? source.tags,
      isTemplate: overrides.isTemplate ?? false,
      clientId: overrides.clientId ?? source.clientId ?? null,
      createdById: requesterId,
      tenantId,
    },
  });

  return { asset };
};

export const listAssetsForProject = async (
  projectId: number,
  ownerId: number,
  includeArchived = false,
) => {
  const project = await validateProjectAccess(projectId, ownerId);

  if (project === 'not_found') {
    return { error: 'project_not_found' as const };
  }

  if (project === 'forbidden') {
    return { error: 'forbidden' as const };
  }

  const assets = await prisma.projectAIAsset.findMany({
    where: {
      projectId,
      asset: { archived: includeArchived ? undefined : false },
    },
    include: { asset: true },
    orderBy: { createdAt: 'desc' },
  });

  return { assets } as const;
};

export const linkAssetToProject = async (
  projectId: number,
  assetId: number,
  ownerId: number,
  data: AssetProjectLinkInput,
) => {
  const project = await validateProjectAccess(projectId, ownerId);

  if (project === 'not_found') {
    return { error: 'project_not_found' as const };
  }

  if (project === 'forbidden') {
    return { error: 'forbidden' as const };
  }

  const asset = (await prisma.aIAsset.findUnique({
    where: { id: assetId },
  })) as AssetWithOwner | null;

  if (!asset || asset.archived) {
    return { error: 'asset_not_found' as const };
  }

  if (asset.clientId && asset.clientId !== project.clientId) {
    return { error: 'client_mismatch' as const };
  }

  const link = await prisma.projectAIAsset.upsert({
    where: { projectId_assetId: { projectId, assetId } },
    update: { notes: data.notes ?? null },
    create: { projectId, assetId, notes: data.notes },
    include: { asset: true },
  });

  return { link } as const;
};

export const unlinkAssetFromProject = async (
  projectId: number,
  assetId: number,
  ownerId: number,
) => {
  const project = await validateProjectAccess(projectId, ownerId);

  if (project === 'not_found') {
    return { error: 'project_not_found' as const };
  }

  if (project === 'forbidden') {
    return { error: 'forbidden' as const };
  }

  const existingLink = await prisma.projectAIAsset.findUnique({
    where: { projectId_assetId: { projectId, assetId } },
  });

  if (!existingLink) {
    return { error: 'link_not_found' as const };
  }

  await prisma.projectAIAsset.delete({
    where: { projectId_assetId: { projectId, assetId } },
  });

  return { success: true } as const;
};
