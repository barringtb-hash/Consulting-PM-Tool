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
import { hasProjectAccess } from '../utils/project-access';
import {
  SubtaskCreateInput,
  SubtaskUpdateStatusInput,
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

/** Assignee data with user information */
type _AssigneeWithUser = {
  id: number;
  userId: number;
  assignedAt: Date;
  assignedById: number | null;
  user: {
    id: number;
    name: string;
    email: string;
  };
};

/** Task with subtask counts for display */
type _TaskWithSubtaskCounts = Prisma.TaskGetPayload<{
  include: { _count: { select: { subTasks: true } } };
}> & {
  subTaskCompletedCount?: number;
};

/** Task with full subtasks array */
type _TaskWithSubtasks = Prisma.TaskGetPayload<{
  include: { subTasks: true };
}>;

const stripProject = ({
  project,
  ...taskData
}: TaskWithOwner): TaskWithoutProject => {
  void project;
  return taskData;
};

/**
 * Validates that all assignee IDs are valid project members or the project owner.
 * @returns Array of invalid user IDs, or empty array if all are valid
 */
const validateAssignees = async (
  projectId: number,
  assigneeIds: number[],
): Promise<number[]> => {
  if (assigneeIds.length === 0) return [];

  // Get tenant context for multi-tenant filtering
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  // Get the project with owner and members (with tenant isolation)
  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId },
    select: {
      ownerId: true,
      members: { select: { userId: true } },
    },
  });

  if (!project) return assigneeIds; // All invalid if project not found

  // Valid user IDs are: project owner + all project members
  const validUserIds = new Set([
    project.ownerId,
    ...project.members.map((m) => m.userId),
  ]);

  // Return any IDs that are not in the valid set
  return assigneeIds.filter((id) => !validUserIds.has(id));
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
 * Lists all parent tasks for a project (excludes subtasks).
 * Includes subtask counts for each task.
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

  // Get parent tasks only (no subtasks) with subtask counts and assignees
  const tasks = await prisma.task.findMany({
    where: { projectId, parentTaskId: null },
    include: {
      _count: { select: { subTasks: true } },
      subTasks: { select: { status: true } },
      assignees: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Transform to include completed subtask count
  const tasksWithCounts = tasks.map((task) => {
    const { subTasks, _count, ...taskData } = task;
    return {
      ...taskData,
      subTaskCount: _count.subTasks,
      subTaskCompletedCount: subTasks.filter((st) => st.status === 'DONE')
        .length,
    };
  });

  return { tasks: tasksWithCounts } as const;
};

/**
 * Retrieves a task by ID, verifying user access.
 *
 * @param id - The task ID
 * @param userId - The ID of the user requesting access (must have project access)
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
 * Retrieves a task by ID with its subtasks, verifying user access.
 *
 * @param id - The task ID
 * @param userId - The ID of the user requesting access (must have project access)
 * @returns Object with either { task } (including subtasks) or { error }
 */
export const getTaskWithSubtasks = async (id: number, userId: number) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const task = await prisma.task.findFirst({
    where: { id, tenantId },
    include: {
      project: {
        select: { ownerId: true, name: true, isSharedWithTenant: true },
      },
      milestone: { select: { id: true, name: true } },
      subTasks: {
        orderBy: { createdAt: 'asc' },
        include: {
          assignees: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
      assignees: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  if (!task) {
    return { error: 'not_found' as const };
  }

  if (!hasProjectAccess(task.project, userId)) {
    return { error: 'forbidden' as const };
  }

  return { task } as const;
};

/**
 * Creates a new task within a project.
 *
 * Validates project ownership, milestone association, and assignees before creation.
 * Automatically assigns tenant context for multi-tenant isolation.
 * If parentTaskId is provided, validates single-level nesting (subtasks can't have subtasks).
 *
 * @param ownerId - The ID of the user creating the task (must be project owner)
 * @param data - Task creation data including title, projectId, optional milestoneId
 * @returns Object with either { task } or { error } with 'not_found' | 'forbidden' | 'invalid_milestone' | 'invalid_parent' | 'invalid_assignees'
 */
export const createTask = async (ownerId: number, data: TaskCreateData) => {
  const projectAccess = await validateProjectAccess(data.projectId, ownerId);

  if (projectAccess === 'not_found' || projectAccess === 'forbidden') {
    return { error: projectAccess } as const;
  }

  // Validate parentTaskId if provided (enforce single-level nesting)
  if (data.parentTaskId) {
    const tenantId = hasTenantContext() ? getTenantId() : undefined;
    const parentTask = await prisma.task.findFirst({
      where: { id: data.parentTaskId, tenantId },
    });

    if (!parentTask) {
      return { error: 'invalid_parent' as const };
    }

    // Prevent subtasks from having their own subtasks
    if (parentTask.parentTaskId !== null) {
      return { error: 'invalid_parent' as const };
    }

    // Parent task must belong to the same project
    if (parentTask.projectId !== data.projectId) {
      return { error: 'invalid_parent' as const };
    }
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

  // Validate assignees are project members or owner
  if (data.assigneeIds && data.assigneeIds.length > 0) {
    const invalidAssignees = await validateAssignees(
      data.projectId,
      data.assigneeIds,
    );
    if (invalidAssignees.length > 0) {
      return { error: 'invalid_assignees' as const };
    }
  }

  // Get tenant context for multi-tenant isolation
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  // Extract assigneeIds from data before creating task
  const { assigneeIds, ...taskData } = data;

  try {
    const task = await prisma.task.create({
      data: {
        // Required fields - must be explicit for TypeScript
        title: taskData.title,
        projectId: taskData.projectId,
        ownerId,
        tenantId,
        // Optional fields - only include if defined
        ...(taskData.description !== undefined && {
          description: taskData.description,
        }),
        ...(taskData.status !== undefined && { status: taskData.status }),
        ...(taskData.priority !== undefined && { priority: taskData.priority }),
        ...(taskData.milestoneId !== undefined && {
          milestoneId: taskData.milestoneId,
        }),
        ...(taskData.dueDate !== undefined && { dueDate: taskData.dueDate }),
        ...(taskData.parentTaskId !== undefined && {
          parentTaskId: taskData.parentTaskId,
        }),
        ...(taskData.sourceMeetingId !== undefined && {
          sourceMeetingId: taskData.sourceMeetingId,
        }),
        // Create assignee relationships if provided
        ...(assigneeIds && assigneeIds.length > 0
          ? {
              assignees: {
                create: assigneeIds.map((userId) => ({
                  userId,
                  assignedById: ownerId,
                })),
              },
            }
          : {}),
      },
      include: {
        assignees: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return { task } as const;
  } catch (error) {
    console.error('Task creation error:', error);
    return { error: 'database_error' as const };
  }
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
 * @returns Object with either { task } or { error } with 'not_found' | 'forbidden' | 'invalid_milestone' | 'invalid_assignees'
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

  // Validate assignees are project members or owner
  if (data.assigneeIds && data.assigneeIds.length > 0) {
    const invalidAssignees = await validateAssignees(
      targetProjectId,
      data.assigneeIds,
    );
    if (invalidAssignees.length > 0) {
      return { error: 'invalid_assignees' as const };
    }
  }

  // Extract assigneeIds from data before updating task
  const { assigneeIds, ...updateData } = data;

  // If assigneeIds provided, update assignees (replace all)
  if (assigneeIds !== undefined) {
    // Delete existing assignees and create new ones in a transaction
    await prisma.$transaction([
      prisma.taskAssignee.deleteMany({ where: { taskId: id } }),
      ...(assigneeIds.length > 0
        ? [
            prisma.taskAssignee.createMany({
              data: assigneeIds.map((userId) => ({
                taskId: id,
                userId,
                assignedById: ownerId,
              })),
            }),
          ]
        : []),
    ]);
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...updateData,
      projectId: updateData.projectId ?? undefined,
      milestoneId:
        updateData.milestoneId === undefined
          ? undefined
          : updateData.milestoneId,
    },
    include: {
      assignees: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
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
 * @param userId - The ID of the user moving (must have project access)
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
 * @param userId - The ID of the user deleting (must have project access)
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

// ============================================================================
// Subtask-specific operations
// ============================================================================

/**
 * Creates a subtask for a parent task.
 * Inherits projectId, ownerId, and tenantId from parent task.
 * Validates single-level nesting (parent must not be a subtask itself).
 *
 * @param parentTaskId - The ID of the parent task
 * @param ownerId - The ID of the user creating the subtask (must be project owner)
 * @param data - Subtask creation data (title, description, status, priority, dueDate, milestoneId)
 * @returns Object with either { subtask } or { error } with 'not_found' | 'forbidden' | 'invalid_parent' | 'invalid_milestone' | 'invalid_assignees'
 */
export const createSubtask = async (
  parentTaskId: number,
  ownerId: number,
  data: SubtaskCreateInput,
) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  // Find parent task and verify it's not already a subtask
  const parentTask = await prisma.task.findFirst({
    where: { id: parentTaskId, tenantId },
    include: { project: { select: { ownerId: true } } },
  });

  if (!parentTask) {
    return { error: 'not_found' as const };
  }

  if (parentTask.project.ownerId !== ownerId) {
    return { error: 'forbidden' as const };
  }

  // Enforce single-level nesting
  if (parentTask.parentTaskId !== null) {
    return { error: 'invalid_parent' as const };
  }

  // Validate milestone if provided
  if (data.milestoneId) {
    const milestoneValid = await validateMilestoneForProject(
      data.milestoneId,
      parentTask.projectId,
    );

    if (!milestoneValid) {
      return { error: 'invalid_milestone' as const };
    }
  }

  // Validate assignees are project members or owner
  if (data.assigneeIds && data.assigneeIds.length > 0) {
    const invalidAssignees = await validateAssignees(
      parentTask.projectId,
      data.assigneeIds,
    );
    if (invalidAssignees.length > 0) {
      return { error: 'invalid_assignees' as const };
    }
  }

  // Extract assigneeIds from data before creating subtask
  const { assigneeIds, ...subtaskData } = data;

  const subtask = await prisma.task.create({
    data: {
      // Required fields - must be explicit for TypeScript
      title: subtaskData.title,
      projectId: parentTask.projectId,
      ownerId,
      tenantId,
      parentTaskId,
      // Optional fields - only include if defined
      ...(subtaskData.description !== undefined && {
        description: subtaskData.description,
      }),
      ...(subtaskData.status !== undefined && { status: subtaskData.status }),
      ...(subtaskData.dueDate !== undefined && {
        dueDate: subtaskData.dueDate,
      }),
      ...(subtaskData.milestoneId !== undefined && {
        milestoneId: subtaskData.milestoneId,
      }),
      // Create assignee relationships if provided
      ...(assigneeIds && assigneeIds.length > 0
        ? {
            assignees: {
              create: assigneeIds.map((userId) => ({
                userId,
                assignedById: ownerId,
              })),
            },
          }
        : {}),
    },
    include: {
      assignees: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  return { subtask } as const;
};

/**
 * Lists all subtasks for a given parent task.
 *
 * @param parentTaskId - The ID of the parent task
 * @param ownerId - The ID of the user requesting access (must be project owner)
 * @returns Object with either { subtasks } or { error }
 */
export const listSubtasks = async (parentTaskId: number, ownerId: number) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const parentTask = await prisma.task.findFirst({
    where: { id: parentTaskId, tenantId },
    include: { project: { select: { ownerId: true } } },
  });

  if (!parentTask) {
    return { error: 'not_found' as const };
  }

  if (parentTask.project.ownerId !== ownerId) {
    return { error: 'forbidden' as const };
  }

  const subtasks = await prisma.task.findMany({
    where: { parentTaskId, tenantId },
    orderBy: { createdAt: 'asc' },
  });

  return { subtasks } as const;
};

/**
 * Toggles a subtask's completion status (DONE <-> BACKLOG).
 *
 * @param subtaskId - The ID of the subtask to toggle
 * @param ownerId - The ID of the user toggling (must be project owner)
 * @param parentTaskId - Optional parent task ID to validate relationship
 * @returns Object with either { subtask } or { error }
 */
export const toggleSubtask = async (
  subtaskId: number,
  ownerId: number,
  parentTaskId?: number,
) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const subtask = await prisma.task.findFirst({
    where: { id: subtaskId, tenantId },
    include: { project: { select: { ownerId: true } } },
  });

  if (!subtask) {
    return { error: 'not_found' as const };
  }

  if (subtask.project.ownerId !== ownerId) {
    return { error: 'forbidden' as const };
  }

  // Must be a subtask (have a parent)
  if (subtask.parentTaskId === null) {
    return { error: 'not_subtask' as const };
  }

  // Validate parent task ID if provided
  if (parentTaskId !== undefined && subtask.parentTaskId !== parentTaskId) {
    return { error: 'parent_mismatch' as const };
  }

  const newStatus = subtask.status === 'DONE' ? 'BACKLOG' : 'DONE';

  const updated = await prisma.task.update({
    where: { id: subtaskId },
    data: { status: newStatus },
  });

  return { subtask: updated } as const;
};

/**
 * Updates a subtask's status to any valid status.
 *
 * @param subtaskId - The ID of the subtask to update
 * @param ownerId - The ID of the user updating (must be project owner)
 * @param data - Object containing the new status
 * @param parentTaskId - Optional parent task ID to validate relationship
 * @returns Object with either { subtask } or { error }
 */
export const updateSubtaskStatus = async (
  subtaskId: number,
  ownerId: number,
  data: SubtaskUpdateStatusInput,
  parentTaskId?: number,
) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const subtask = await prisma.task.findFirst({
    where: { id: subtaskId, tenantId },
    include: {
      project: { select: { ownerId: true, isSharedWithTenant: true } },
    },
  });

  if (!subtask) {
    return { error: 'not_found' as const };
  }

  if (!hasProjectAccess(subtask.project, ownerId)) {
    return { error: 'forbidden' as const };
  }

  // Must be a subtask (have a parent)
  if (subtask.parentTaskId === null) {
    return { error: 'not_subtask' as const };
  }

  // Validate parent task ID if provided
  if (parentTaskId !== undefined && subtask.parentTaskId !== parentTaskId) {
    return { error: 'parent_mismatch' as const };
  }

  const updated = await prisma.task.update({
    where: { id: subtaskId },
    data: { status: data.status },
  });

  return { subtask: updated } as const;
};

// ============================================================================
// User-specific task operations
// ============================================================================

/**
 * Lists all tasks (including subtasks) where a user is assigned.
 * Returns tasks across all projects accessible to the user.
 *
 * @param userId - The ID of the user to find tasks for
 * @returns Object with { tasks } array including project info
 */
export const listTasksForUser = async (userId: number) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  // Find all tasks where user is an assignee
  const tasks = await prisma.task.findMany({
    where: {
      tenantId,
      assignees: {
        some: {
          userId,
        },
      },
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          ownerId: true,
          isSharedWithTenant: true,
        },
      },
      parentTask: {
        select: {
          id: true,
          title: true,
        },
      },
      assignees: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      },
      _count: { select: { subTasks: true } },
      subTasks: { select: { status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Filter out tasks with missing projects (orphaned data) and tasks the user doesn't have access to
  const accessibleTasks = tasks.filter(
    (task) => task.project && hasProjectAccess(task.project, userId),
  );

  // Transform to include completed subtask count and project name
  const tasksWithCounts = accessibleTasks.map((task) => {
    const { subTasks, _count, project, parentTask, ...taskData } = task;
    // Null checks for safety (project is guaranteed non-null from filter above)
    const completedSubtasks = (subTasks ?? []).filter(
      (st) => st.status === 'DONE',
    ).length;
    return {
      ...taskData,
      project: { id: project!.id, name: project!.name },
      parentTask: parentTask
        ? { id: parentTask.id, title: parentTask.title }
        : null,
      subTaskCount: _count?.subTasks ?? 0,
      subTaskCompletedCount: completedSubtasks,
    };
  });

  return { tasks: tasksWithCounts } as const;
};
