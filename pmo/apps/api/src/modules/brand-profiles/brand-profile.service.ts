import prisma from '../../prisma/client';
import { Prisma } from '@prisma/client';
import { getTenantId, hasTenantContext } from '../../tenant/tenant.context';
import {
  CreateBrandProfileInput,
  UpdateBrandProfileInput,
  CreateBrandAssetInput,
  UpdateBrandAssetInput,
} from '../../types/marketing';

/**
 * Get brand profile by account ID
 * @param accountId - Account ID (or legacy clientId)
 */
export const getBrandProfileByClientId = async (
  accountId: number,

  _ownerId: number,
) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;
  const account = await prisma.account.findFirst({
    where: { id: accountId, tenantId },
  });
  if (!account) {
    return { error: 'client_not_found' as const };
  }

  const brandProfile = await prisma.brandProfile.findFirst({
    where: {
      clientId: accountId,
      ...(tenantId ? { client: { tenantId } } : {}),
    },
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
 * Note: input.clientId now represents accountId for backwards compatibility
 */
export const createBrandProfile = async (
  _ownerId: number,
  input: CreateBrandProfileInput,
) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;
  const account = await prisma.account.findFirst({
    where: { id: input.clientId, tenantId },
  });
  if (!account) {
    return { error: 'client_not_found' as const };
  }

  // Check if brand profile already exists
  const existing = await prisma.brandProfile.findFirst({
    where: {
      clientId: input.clientId,
      ...(tenantId ? { client: { tenantId } } : {}),
    },
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
  const tenantId = hasTenantContext() ? getTenantId() : undefined;
  const existing = await prisma.brandProfile.findFirst({
    where: {
      id,
      ...(tenantId ? { client: { tenantId } } : {}),
    },
  });
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
  const tenantId = hasTenantContext() ? getTenantId() : undefined;
  const brandProfile = await prisma.brandProfile.findFirst({
    where: {
      id: brandProfileId,
      ...(tenantId ? { client: { tenantId } } : {}),
    },
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
  const tenantId = hasTenantContext() ? getTenantId() : undefined;
  const brandProfile = await prisma.brandProfile.findFirst({
    where: {
      id: input.brandProfileId,
      ...(tenantId ? { client: { tenantId } } : {}),
    },
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
  const tenantId = hasTenantContext() ? getTenantId() : undefined;
  // Join with brand profile to verify tenant access
  const existing = await prisma.brandAsset.findFirst({
    where: {
      id,
      ...(tenantId ? { brandProfile: { client: { tenantId } } } : {}),
    },
  });
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
  const tenantId = hasTenantContext() ? getTenantId() : undefined;
  // Join with brand profile to verify tenant access
  const existing = await prisma.brandAsset.findFirst({
    where: {
      id,
      ...(tenantId ? { brandProfile: { client: { tenantId } } } : {}),
    },
  });
  if (!existing) {
    return { error: 'not_found' as const };
  }

  const asset = await prisma.brandAsset.update({
    where: { id },
    data: { archived: true },
  });

  return { asset };
};
