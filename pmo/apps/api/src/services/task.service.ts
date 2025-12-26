/**
 * Task Service
 *
 * Provides task management operations for the PMO module.
 * Tasks are the primary work items within projects, supporting:
 * - Kanban-style status workflow (TODO, IN_PROGRESS, DONE)
 * - Priority levels (LOW, MEDIUM, HIGH, URGENT)
 * - Milestone associations
 * - Meeting-to-task conversion (sourceMeetingId)
 *
 * Access Control:
 * - Tasks belong to projects, which have owners
 * - Only project owners can CRUD tasks within their projects
 * - Multi-tenant isolation via tenantId filtering
 *
 * @module services/task
 */

import { Prisma } from '@prisma/client';

import prisma from '../prisma/client';
import { getTenantId, hasTenantContext } from '../tenant/tenant.context';
import {
  TaskCreateInput,
  TaskMoveInput,
  TaskUpdateInput,
} from '../validation/task.schema';

/** Task with project owner information for access control checks */
type TaskWithOwner = Prisma.TaskGetPayload<{
  include: { project: { select: { ownerId: true; isSharedWithTenant: true } } };
}>;

/** Task data without the nested project relation */
type TaskWithoutProject = Omit<TaskWithOwner, 'project'>;

/** Task creation data including optional meeting source */
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

/**
 * Lists all tasks for a project.
 *
 * @param projectId - The ID of the project to list tasks for
 * @param ownerId - The ID of the user requesting access (must be project owner)
 * @returns Object with either { tasks } array or { error } with 'not_found' | 'forbidden'
 */
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

/**
 * Retrieves a task by ID, verifying owner access.
 *
 * @param id - The task ID
 * @param ownerId - The ID of the user requesting access (must be project owner)
 * @returns Object with either { task } or { error } with 'not_found' | 'forbidden'
 */
export const getTaskForOwner = async (id: number, userId: number) => {
  const task = await findTaskWithOwner(id);

  if (!task) {
    return { error: 'not_found' as const };
  }

  if (!hasProjectAccess(task.project, userId)) {
    return { error: 'forbidden' as const };
  }

  return { task: stripProject(task) } as const;
};

/**
 * Creates a new task within a project.
 *
 * Validates project ownership and milestone association before creation.
 * Automatically assigns tenant context for multi-tenant isolation.
 *
 * @param ownerId - The ID of the user creating the task (must be project owner)
 * @param data - Task creation data including title, projectId, optional milestoneId
 * @returns Object with either { task } or { error } with 'not_found' | 'forbidden' | 'invalid_milestone'
 */
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

/**
 * Updates an existing task.
 *
 * Supports updating title, description, status, priority, milestone, and project.
 * Validates ownership and milestone association before update.
 *
 * @param id - The task ID to update
 * @param ownerId - The ID of the user updating (must be project owner)
 * @param data - Partial task data to update
 * @returns Object with either { task } or { error } with 'not_found' | 'forbidden' | 'invalid_milestone'
 */
export const updateTask = async (
  id: number,
  ownerId: number,
  data: TaskUpdateInput,
) => {
  const existing = await findTaskWithOwner(id);

  if (!existing) {
    return { error: 'not_found' as const };
  }

  if (!hasProjectAccess(existing.project, ownerId)) {
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

/**
 * Moves a task to a different status or milestone (Kanban board operation).
 *
 * Optimized for drag-and-drop operations, only updating status and milestone.
 *
 * @param id - The task ID to move
 * @param ownerId - The ID of the user moving (must be project owner)
 * @param data - Object with new status and optional milestoneId
 * @returns Object with either { task } or { error } with 'not_found' | 'forbidden' | 'invalid_milestone'
 */
export const moveTask = async (
  id: number,
  userId: number,
  data: TaskMoveInput,
) => {
  const existing = await findTaskWithOwner(id);

  if (!existing) {
    return { error: 'not_found' as const };
  }

  if (!hasProjectAccess(existing.project, userId)) {
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

/**
 * Deletes a task permanently.
 *
 * @param id - The task ID to delete
 * @param ownerId - The ID of the user deleting (must be project owner)
 * @returns Object with either { deleted: true } or { error } with 'not_found' | 'forbidden'
 */
export const deleteTask = async (id: number, userId: number) => {
  const existing = await findTaskWithOwner(id);

  if (!existing) {
    return { error: 'not_found' as const };
  }

  if (!hasProjectAccess(existing.project, userId)) {
    return { error: 'forbidden' as const };
  }

  await prisma.task.delete({ where: { id } });

  return { deleted: true } as const;
};
