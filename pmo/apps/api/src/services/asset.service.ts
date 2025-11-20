import { AssetType, Prisma } from '@prisma/client';

import prisma from '../prisma/client';
import {
  AssetCloneInput,
  AssetCreateInput,
  AssetProjectLinkInput,
  AssetUpdateInput,
} from '../validation/asset.schema';

type AssetWithOwner = Prisma.AIAssetGetPayload<{
  include: { client: true };
}>;

const validateProjectAccess = async (projectId: number, ownerId: number) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });

  if (!project) {
    return 'not_found' as const;
  }

  if (project.ownerId !== ownerId) {
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
  const where: Prisma.AIAssetWhereInput = {
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

export const getAssetById = async (id: number, includeArchived = false) =>
  prisma.aIAsset.findFirst({
    where: { id, archived: includeArchived ? undefined : false },
  });

export const createAsset = async (ownerId: number, data: AssetCreateInput) =>
  prisma.aIAsset.create({
    data: {
      ...data,
      createdById: ownerId,
      isTemplate: data.isTemplate ?? false,
      tags: data.tags ?? [],
      clientId: data.clientId ?? null,
    },
  });

export const updateAsset = async (id: number, data: AssetUpdateInput) => {
  const existing = await prisma.aIAsset.findUnique({ where: { id } });

  if (!existing || existing.archived) {
    return null;
  }

  return prisma.aIAsset.update({
    where: { id },
    data: {
      ...data,
      clientId: data.clientId ?? undefined,
      tags: data.tags ?? undefined,
    },
  });
};

export const archiveAsset = async (id: number) => {
  const existing = await prisma.aIAsset.findUnique({ where: { id } });

  if (!existing || existing.archived) {
    return null;
  }

  return prisma.aIAsset.update({
    where: { id },
    data: { archived: true },
  });
};

export const cloneAsset = async (
  id: number,
  ownerId: number,
  overrides: AssetCloneInput,
) => {
  const source = await prisma.aIAsset.findUnique({ where: { id } });

  if (!source || source.archived) {
    return null;
  }

  const name = overrides.name ?? `${source.name} (Copy)`;

  return prisma.aIAsset.create({
    data: {
      name,
      type: source.type,
      description: overrides.description ?? source.description,
      content: source.content,
      tags: overrides.tags ?? source.tags,
      isTemplate: overrides.isTemplate ?? false,
      clientId: overrides.clientId ?? source.clientId ?? null,
      createdById: ownerId,
    },
  });
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
