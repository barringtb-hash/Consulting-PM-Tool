import { Prisma } from '@prisma/client';

import prisma from '../prisma/client';
import { getTenantId, hasTenantContext } from '../tenant/tenant.context';
import {
  TaskCreateInput,
  TaskMoveInput,
  TaskUpdateInput,
} from '../validation/task.schema';

type TaskWithOwner = Prisma.TaskGetPayload<{
  include: { project: { select: { ownerId: true } } };
}>;

type TaskWithoutProject = Omit<TaskWithOwner, 'project'>;

type TaskCreateData = TaskCreateInput & { sourceMeetingId?: number };

const stripProject = ({
  project,
  ...taskData
}: TaskWithOwner): TaskWithoutProject => {
  void project;
  return taskData;
};

const findTaskWithOwner = async (id: number) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  return prisma.task.findFirst({
    where: { id, tenantId },
    include: { project: { select: { ownerId: true } } },
  });
};

const validateProjectAccess = async (projectId: number, ownerId: number) => {
  // Get tenant context for multi-tenant filtering
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

const validateMilestoneForProject = async (
  milestoneId: number,
  projectId: number,
) => {
  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const milestone = await prisma.milestone.findFirst({
    where: { id: milestoneId, tenantId },
  });

  if (!milestone || milestone.projectId !== projectId) {
    return false;
  }

  return true;
};

export const listTasksForProject = async (
  projectId: number,
  ownerId: number,
) => {
  const projectAccess = await validateProjectAccess(projectId, ownerId);

  if (projectAccess === 'not_found' || projectAccess === 'forbidden') {
    return { error: projectAccess } as const;
  }

  const tasks = await prisma.task.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
  });

  return { tasks } as const;
};

export const getTaskForOwner = async (id: number, ownerId: number) => {
  const task = await findTaskWithOwner(id);

  if (!task) {
    return { error: 'not_found' as const };
  }

  if (task.project.ownerId !== ownerId) {
    return { error: 'forbidden' as const };
  }

  return { task: stripProject(task) } as const;
};

export const createTask = async (ownerId: number, data: TaskCreateData) => {
  const projectAccess = await validateProjectAccess(data.projectId, ownerId);

  if (projectAccess === 'not_found' || projectAccess === 'forbidden') {
    return { error: projectAccess } as const;
  }

  if (data.milestoneId) {
    const milestoneValid = await validateMilestoneForProject(
      data.milestoneId,
      data.projectId,
    );

    if (!milestoneValid) {
      return { error: 'invalid_milestone' as const };
    }
  }

  // Get tenant context for multi-tenant isolation
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const task = await prisma.task.create({
    data: {
      ...data,
      ownerId,
      tenantId,
      sourceMeetingId: data.sourceMeetingId ?? undefined,
    },
  });

  return { task } as const;
};

export const updateTask = async (
  id: number,
  ownerId: number,
  data: TaskUpdateInput,
) => {
  const existing = await findTaskWithOwner(id);

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

  if (data.milestoneId !== undefined && data.milestoneId !== null) {
    const milestoneValid = await validateMilestoneForProject(
      data.milestoneId,
      targetProjectId,
    );

    if (!milestoneValid) {
      return { error: 'invalid_milestone' as const };
    }
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...data,
      projectId: data.projectId ?? undefined,
      milestoneId:
        data.milestoneId === undefined ? undefined : data.milestoneId,
    },
  });

  return { task: updated } as const;
};

export const moveTask = async (
  id: number,
  ownerId: number,
  data: TaskMoveInput,
) => {
  const existing = await findTaskWithOwner(id);

  if (!existing) {
    return { error: 'not_found' as const };
  }

  if (existing.project.ownerId !== ownerId) {
    return { error: 'forbidden' as const };
  }

  if (data.milestoneId !== undefined && data.milestoneId !== null) {
    const milestoneValid = await validateMilestoneForProject(
      data.milestoneId,
      existing.projectId,
    );

    if (!milestoneValid) {
      return { error: 'invalid_milestone' as const };
    }
  }

  const moved = await prisma.task.update({
    where: { id },
    data: {
      status: data.status,
      milestoneId: data.milestoneId ?? undefined,
    },
  });

  return { task: moved } as const;
};

export const deleteTask = async (id: number, ownerId: number) => {
  const existing = await findTaskWithOwner(id);

  if (!existing) {
    return { error: 'not_found' as const };
  }

  if (existing.project.ownerId !== ownerId) {
    return { error: 'forbidden' as const };
  }

  await prisma.task.delete({ where: { id } });

  return { deleted: true } as const;
};
