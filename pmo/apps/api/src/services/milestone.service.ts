import { Prisma } from '@prisma/client';

import prisma from '../prisma/client';
import { getTenantId, hasTenantContext } from '../tenant/tenant.context';
import {
  MilestoneCreateInput,
  MilestoneUpdateInput,
} from '../validation/milestone.schema';

type MilestoneWithOwner = Prisma.MilestoneGetPayload<{
  include: { project: { select: { ownerId: true; isSharedWithTenant: true } } };
}>;

type MilestoneWithoutProject = Omit<MilestoneWithOwner, 'project'>;

const stripProject = ({
  project,
  ...milestoneData
}: MilestoneWithOwner): MilestoneWithoutProject => {
  void project;
  return milestoneData;
};

const findMilestoneWithOwner = async (id: number) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  return prisma.milestone.findFirst({
    where: { id, tenantId },
    include: {
      project: { select: { ownerId: true, isSharedWithTenant: true } },
    },
  });
};

/** Check if user has access to the project (owner or shared) */
const hasProjectAccess = (
  project: { ownerId: number; isSharedWithTenant: boolean },
  userId: number,
): boolean => {
  return project.ownerId === userId || project.isSharedWithTenant;
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

export const listMilestonesForProject = async (
  projectId: number,
  ownerId: number,
) => {
  const projectAccess = await validateProjectAccess(projectId, ownerId);

  if (projectAccess === 'not_found' || projectAccess === 'forbidden') {
    return { error: projectAccess } as const;
  }

  const milestones = await prisma.milestone.findMany({
    where: { projectId },
    orderBy: { dueDate: 'asc' },
  });

  return { milestones } as const;
};

export const getMilestoneForOwner = async (id: number, userId: number) => {
  const milestone = await findMilestoneWithOwner(id);

  if (!milestone) {
    return { error: 'not_found' as const };
  }

  if (!hasProjectAccess(milestone.project, userId)) {
    return { error: 'forbidden' as const };
  }

  return { milestone: stripProject(milestone) } as const;
};

export const createMilestone = async (
  ownerId: number,
  data: MilestoneCreateInput,
) => {
  const projectAccess = await validateProjectAccess(data.projectId, ownerId);

  if (projectAccess === 'not_found' || projectAccess === 'forbidden') {
    return { error: projectAccess } as const;
  }

  // Get tenant context for multi-tenant isolation
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const milestone = await prisma.milestone.create({
    data: {
      ...data,
      tenantId,
    },
  });

  return { milestone } as const;
};

export const updateMilestone = async (
  id: number,
  userId: number,
  data: MilestoneUpdateInput,
) => {
  const existing = await findMilestoneWithOwner(id);

  if (!existing) {
    return { error: 'not_found' as const };
  }

  if (!hasProjectAccess(existing.project, userId)) {
    return { error: 'forbidden' as const };
  }

  const targetProjectId = data.projectId ?? existing.projectId;

  const projectAccess = await validateProjectAccess(targetProjectId, userId);

  if (projectAccess === 'not_found' || projectAccess === 'forbidden') {
    return { error: projectAccess } as const;
  }

  const updated = await prisma.milestone.update({
    where: { id },
    data: {
      ...data,
      projectId: data.projectId ?? undefined,
    },
  });

  return { milestone: updated } as const;
};

export const deleteMilestone = async (id: number, userId: number) => {
  const existing = await findMilestoneWithOwner(id);

  if (!existing) {
    return { error: 'not_found' as const };
  }

  if (!hasProjectAccess(existing.project, userId)) {
    return { error: 'forbidden' as const };
  }

  await prisma.milestone.delete({ where: { id } });

  return { deleted: true } as const;
};
