import { Prisma } from '@prisma/client';
import prisma from '../../prisma/client';
import { getTenantId, hasTenantContext } from '../../tenant/tenant.context';
import {
  CreateCampaignInput,
  UpdateCampaignInput,
} from '../../types/marketing';

/**
 * Validate that the user has access to the account
 * @param accountId - Account ID (or legacy clientId)
 */
const validateAccountAccess = async (
  accountId: number,

  _ownerId: number,
) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;
  const account = await prisma.account.findFirst({
    where: { id: accountId, tenantId },
  });
  if (!account) {
    return 'not_found' as const;
  }
  return account;
};

/**
 * Validate that the user has access to the project
 */
const validateProjectAccess = async (projectId: number, ownerId: number) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId },
  });
  if (!project) {
    return 'not_found' as const;
  }
  if (project.ownerId !== ownerId) {
    return 'forbidden' as const;
  }
  return project;
};

/**
 * Find a campaign and validate user access
 */
const findCampaignWithAccess = async (id: number, ownerId: number) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;
  const campaign = await prisma.campaign.findFirst({
    where: { id, tenantId },
    include: {
      client: true,
      project: true,
    },
  });

  if (!campaign) {
    return { error: 'not_found' as const };
  }

  // Check authorization:
  // 1. If campaign has a project, user must own that project
  // 2. If campaign has no project, user must have created it
  if (campaign.project) {
    if (campaign.project.ownerId !== ownerId) {
      return { error: 'forbidden' as const };
    }
  } else {
    // No project - check if user created this campaign
    if (campaign.createdById !== ownerId) {
      return { error: 'forbidden' as const };
    }
  }

  return { campaign };
};

/**
 * List campaigns with optional filters
 */
export const listCampaigns = async (
  ownerId: number,
  query: {
    clientId?: number;
    projectId?: number;
    status?: string;
    archived?: boolean;
  },
) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;
  const where: Prisma.CampaignWhereInput = {
    archived: query.archived ?? false,
    tenantId,
    // Authorization: only show campaigns user has access to
    OR: [
      // Campaigns linked to projects owned by this user
      {
        project: {
          ownerId: ownerId,
        },
      },
      // Campaigns with no project (client-level campaigns)
      {
        projectId: null,
      },
    ],
  };

  if (query.clientId) {
    where.clientId = query.clientId;
  }

  if (query.projectId) {
    where.projectId = query.projectId;
  }

  if (query.status) {
    where.status = query.status as Prisma.EnumCampaignStatusFilter;
  }

  const campaigns = await prisma.campaign.findMany({
    where,
    include: {
      client: {
        select: { id: true, name: true },
      },
      project: {
        select: { id: true, name: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: { contents: true },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  return campaigns;
};

/**
 * Get a single campaign by ID
 */
export const getCampaignById = async (id: number, ownerId: number) => {
  const result = await findCampaignWithAccess(id, ownerId);
  if (result.error) {
    return result;
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      client: {
        select: { id: true, name: true },
      },
      project: {
        select: { id: true, name: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      contents: {
        where: { archived: false },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: { contents: true },
      },
    },
  });

  return { campaign };
};

/**
 * Create a new campaign
 */
export const createCampaign = async (
  ownerId: number,
  input: CreateCampaignInput,
) => {
  // Validate account access (clientId maps to accountId)
  const accountCheck = await validateAccountAccess(input.clientId, ownerId);
  if (accountCheck === 'not_found') {
    return { error: 'client_not_found' as const };
  }

  // Validate project access if projectId is provided
  if (input.projectId) {
    const projectCheck = await validateProjectAccess(input.projectId, ownerId);
    if (projectCheck === 'not_found') {
      return { error: 'project_not_found' as const };
    }
    if (projectCheck === 'forbidden') {
      return { error: 'project_forbidden' as const };
    }
  }

  const tenantId = hasTenantContext() ? getTenantId() : undefined;
  const campaign = await prisma.campaign.create({
    data: {
      ...input,
      createdById: ownerId,
      tenantId,
      goals: input.goals as Prisma.InputJsonValue,
    },
    include: {
      client: {
        select: { id: true, name: true },
      },
      project: {
        select: { id: true, name: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return { campaign };
};

/**
 * Update an existing campaign
 */
export const updateCampaign = async (
  id: number,
  ownerId: number,
  input: UpdateCampaignInput,
) => {
  const result = await findCampaignWithAccess(id, ownerId);
  if (result.error) {
    return result;
  }

  // Validate project access if projectId is being updated
  if (input.projectId !== undefined && input.projectId !== null) {
    const projectCheck = await validateProjectAccess(input.projectId, ownerId);
    if (projectCheck === 'not_found') {
      return { error: 'project_not_found' as const };
    }
    if (projectCheck === 'forbidden') {
      return { error: 'project_forbidden' as const };
    }
  }

  const campaign = await prisma.campaign.update({
    where: { id },
    data: {
      ...input,
      goals:
        input.goals !== undefined
          ? (input.goals as Prisma.InputJsonValue)
          : undefined,
    },
    include: {
      client: {
        select: { id: true, name: true },
      },
      project: {
        select: { id: true, name: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return { campaign };
};

/**
 * Archive a campaign (soft delete)
 */
export const archiveCampaign = async (id: number, ownerId: number) => {
  const result = await findCampaignWithAccess(id, ownerId);
  if (result.error) {
    return result;
  }

  const campaign = await prisma.campaign.update({
    where: { id },
    data: { archived: true },
  });

  return { campaign };
};

/**
 * Get all marketing contents for a campaign
 */
export const getCampaignContents = async (
  campaignId: number,
  ownerId: number,
) => {
  const result = await findCampaignWithAccess(campaignId, ownerId);
  if (result.error) {
    return result;
  }

  const tenantId = hasTenantContext() ? getTenantId() : undefined;
  const contents = await prisma.marketingContent.findMany({
    where: {
      campaignId,
      tenantId,
      archived: false,
    },
    include: {
      client: {
        select: { id: true, name: true },
      },
      project: {
        select: { id: true, name: true },
      },
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return { contents };
};
