import prisma from '../../prisma/client';
import { Prisma } from '@prisma/client';
import {
  CreateBrandProfileInput,
  UpdateBrandProfileInput,
  CreateBrandAssetInput,
  UpdateBrandAssetInput,
} from '../../types/marketing';

/**
 * Get brand profile by client ID
 */
export const getBrandProfileByClientId = async (
  clientId: number,

  _ownerId: number,
) => {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return { error: 'client_not_found' as const };
  }

  const brandProfile = await prisma.brandProfile.findUnique({
    where: { clientId },
    include: {
      client: {
        select: { id: true, name: true },
      },
      assets: {
        where: { archived: false },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!brandProfile) {
    return { error: 'not_found' as const };
  }

  return { brandProfile };
};

/**
 * Create a brand profile
 */
export const createBrandProfile = async (
  _ownerId: number,
  input: CreateBrandProfileInput,
) => {
  const client = await prisma.client.findUnique({
    where: { id: input.clientId },
  });
  if (!client) {
    return { error: 'client_not_found' as const };
  }

  // Check if brand profile already exists
  const existing = await prisma.brandProfile.findUnique({
    where: { clientId: input.clientId },
  });
  if (existing) {
    return { error: 'already_exists' as const };
  }

  const brandProfile = await prisma.brandProfile.create({
    data: {
      ...input,
      fonts: input.fonts as Prisma.InputJsonValue,
      metadata: input.metadata as Prisma.InputJsonValue,
    },
    include: {
      client: {
        select: { id: true, name: true },
      },
      assets: true,
    },
  });

  return { brandProfile };
};

/**
 * Update a brand profile
 */
export const updateBrandProfile = async (
  id: number,
  _ownerId: number,
  input: UpdateBrandProfileInput,
) => {
  const existing = await prisma.brandProfile.findUnique({ where: { id } });
  if (!existing) {
    return { error: 'not_found' as const };
  }

  const brandProfile = await prisma.brandProfile.update({
    where: { id },
    data: {
      ...input,
      fonts:
        input.fonts !== undefined
          ? (input.fonts as Prisma.InputJsonValue)
          : undefined,
      metadata:
        input.metadata !== undefined
          ? (input.metadata as Prisma.InputJsonValue)
          : undefined,
    },
    include: {
      client: {
        select: { id: true, name: true },
      },
      assets: true,
    },
  });

  return { brandProfile };
};

/**
 * Get all brand assets for a brand profile
 */
export const getBrandAssets = async (
  brandProfileId: number,

  _ownerId: number,
) => {
  const brandProfile = await prisma.brandProfile.findUnique({
    where: { id: brandProfileId },
  });
  if (!brandProfile) {
    return { error: 'profile_not_found' as const };
  }

  const assets = await prisma.brandAsset.findMany({
    where: {
      brandProfileId,
      archived: false,
    },
    orderBy: { createdAt: 'desc' },
  });

  return { assets };
};

/**
 * Create a brand asset
 */
export const createBrandAsset = async (
  _ownerId: number,
  input: CreateBrandAssetInput,
) => {
  const brandProfile = await prisma.brandProfile.findUnique({
    where: { id: input.brandProfileId },
  });
  if (!brandProfile) {
    return { error: 'profile_not_found' as const };
  }

  const asset = await prisma.brandAsset.create({
    data: input,
  });

  return { asset };
};

/**
 * Update a brand asset
 */
export const updateBrandAsset = async (
  id: number,
  _ownerId: number,
  input: UpdateBrandAssetInput,
) => {
  const existing = await prisma.brandAsset.findUnique({ where: { id } });
  if (!existing) {
    return { error: 'not_found' as const };
  }

  const asset = await prisma.brandAsset.update({
    where: { id },
    data: input,
  });

  return { asset };
};

/**
 * Archive a brand asset (soft delete)
 */
export const archiveBrandAsset = async (
  id: number,

  _ownerId: number,
) => {
  const existing = await prisma.brandAsset.findUnique({ where: { id } });
  if (!existing) {
    return { error: 'not_found' as const };
  }

  const asset = await prisma.brandAsset.update({
    where: { id },
    data: { archived: true },
  });

  return { asset };
};
