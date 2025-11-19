import { Prisma } from '@prisma/client';

import prisma from '../prisma/client';
import {
  MilestoneCreateInput,
  MilestoneUpdateInput,
} from '../validation/milestone.schema';

type MilestoneWithOwner = Prisma.MilestoneGetPayload<{
  include: { project: { select: { ownerId: true } } };
}>;

type MilestoneWithoutProject = Omit<MilestoneWithOwner, 'project'>;

const stripProject = ({
  project,
  ...milestoneData
}: MilestoneWithOwner): MilestoneWithoutProject => {
  void project;
  return milestoneData;
};

const findMilestoneWithOwner = async (id: number) =>
  prisma.milestone.findUnique({
    where: { id },
    include: { project: { select: { ownerId: true } } },
  });

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

export const getMilestoneForOwner = async (id: number, ownerId: number) => {
  const milestone = await findMilestoneWithOwner(id);

  if (!milestone) {
    return { error: 'not_found' as const };
  }

  if (milestone.project.ownerId !== ownerId) {
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

  const milestone = await prisma.milestone.create({ data });

  return { milestone } as const;
};

export const updateMilestone = async (
  id: number,
  ownerId: number,
  data: MilestoneUpdateInput,
) => {
  const existing = await findMilestoneWithOwner(id);

  if (!existing) {
    return { error: 'not_found' as const };
  }

  if (existing.project.ownerId !== ownerId) {
    return { error: 'forbidden' as const };
  }

  const targetProjectId = data.projectId ?? existing.projectId;

  const projectAccess = await validateProjectAccess(targetProjectId, ownerId);

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

export const deleteMilestone = async (id: number, ownerId: number) => {
  const existing = await findMilestoneWithOwner(id);

  if (!existing) {
    return { error: 'not_found' as const };
  }

  if (existing.project.ownerId !== ownerId) {
    return { error: 'forbidden' as const };
  }

  await prisma.milestone.delete({ where: { id } });

  return { deleted: true } as const;
};
