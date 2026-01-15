/**
 * Action Item Service
 *
 * Provides CRUD operations and business logic for Action Items.
 * Action Items are tasks identified during meetings or project work
 * that need to be tracked but haven't been converted to formal tasks yet.
 *
 * @module modules/raid/services
 */

import { prisma } from '../../../prisma/client';
import { getTenantId, hasTenantContext } from '../../../tenant/tenant.context';
import { hasProjectAccess } from '../../../utils/project-access';
import { createTask } from '../../../services/task.service';
import type {
  CreateActionItemInput,
  UpdateActionItemInput,
  ActionItemFilters,
  ConvertToTaskInput,
} from '../validation/raid.schema';
import type { ActionItemStatus, Priority, Prisma } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Action Item data shape returned from the service
 */
export interface ActionItem {
  id: number;
  tenantId: string | null;
  projectId: number;
  title: string;
  description: string | null;
  assigneeId: number | null;
  assigneeName: string | null;
  dueDate: Date | null;
  priority: string;
  status: string;
  sourceMeetingId: number | null;
  sourceText: string | null;
  notes: string | null;
  linkedTaskId: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service result type for single item operations
 */
type ActionItemResult =
  | { actionItem: ActionItem }
  | {
      error: 'not_found' | 'forbidden' | 'validation_error' | 'database_error';
    };

/**
 * Service result type for list operations
 */
type ActionItemListResult =
  | { actionItems: ActionItem[]; total: number }
  | { error: 'not_found' | 'forbidden' };

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validates that the user has access to the project
 */
const validateProjectAccess = async (projectId: number, userId: number) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId },
    select: {
      id: true,
      ownerId: true,
      isSharedWithTenant: true,
      visibility: true,
    },
  });

  if (!project) {
    return 'not_found' as const;
  }

  if (!hasProjectAccess(project, userId)) {
    return 'forbidden' as const;
  }

  return project;
};

/**
 * Finds an action item with project access info
 */
const findActionItemWithAccess = async (id: number) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  // Query the ActionItem table with proper column name
  const actionItem = await prisma.$queryRaw<ActionItem[]>`
    SELECT * FROM "ActionItem"
    WHERE id = ${id}
    AND ("tenantId" = ${tenantId} OR "tenantId" IS NULL)
    LIMIT 1
  `.catch(() => null);

  if (!actionItem || actionItem.length === 0) {
    return null;
  }

  const project = await prisma.project.findFirst({
    where: { id: actionItem[0].projectId },
    select: {
      id: true,
      ownerId: true,
      isSharedWithTenant: true,
      visibility: true,
    },
  });

  return { actionItem: actionItem[0], project };
};

// =============================================================================
// SERVICE FUNCTIONS
// =============================================================================

/**
 * Lists action items for a project with optional filtering
 *
 * @param projectId - The project ID to list action items for
 * @param userId - The ID of the user requesting access
 * @param filters - Optional filters for status, priority, assignee, etc.
 * @returns Object with { actionItems, total } or { error }
 */
export const listByProject = async (
  projectId: number,
  userId: number,
  filters?: ActionItemFilters,
): Promise<ActionItemListResult> => {
  const projectAccess = await validateProjectAccess(projectId, userId);

  if (projectAccess === 'not_found' || projectAccess === 'forbidden') {
    return { error: projectAccess };
  }

  const tenantId = hasTenantContext() ? getTenantId() : undefined;
  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  // Build where conditions
  const whereConditions: Record<string, unknown> = {
    projectId,
    OR: tenantId ? [{ tenantId }, { tenantId: null }] : undefined,
  };

  if (filters?.status?.length) {
    whereConditions.status = { in: filters.status };
  }

  if (filters?.priority?.length) {
    whereConditions.priority = { in: filters.priority };
  }

  if (filters?.assigneeId) {
    whereConditions.assigneeId = filters.assigneeId;
  }

  if (filters?.overdue) {
    whereConditions.dueDate = { lt: new Date() };
    whereConditions.status = {
      notIn: ['COMPLETED', 'CANCELLED', 'CONVERTED_TO_TASK'] as (
        | 'OPEN'
        | 'IN_PROGRESS'
        | 'COMPLETED'
        | 'CANCELLED'
        | 'CONVERTED_TO_TASK'
      )[],
    };
  }

  try {
    // Build where clause for Prisma using properly typed conditions
    const where: Prisma.ActionItemWhereInput = {
      projectId,
    };

    if (tenantId) {
      where.tenantId = tenantId;
    }

    if (filters?.status?.length) {
      where.status = { in: filters.status as ActionItemStatus[] };
    }

    if (filters?.priority?.length) {
      where.priority = { in: filters.priority as Priority[] };
    }

    if (filters?.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }

    if (filters?.overdue) {
      where.dueDate = { lt: new Date() };
      where.status = {
        notIn: [
          'COMPLETED',
          'CANCELLED',
          'CONVERTED_TO_TASK',
        ] as ActionItemStatus[],
      };
    }

    // Query using Prisma client for correct column mapping
    const [actionItems, total] = await Promise.all([
      prisma.actionItem.findMany({
        where,
        orderBy: [
          { priority: 'asc' }, // P0 < P1 < P2
          { dueDate: 'asc' },
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.actionItem.count({ where }),
    ]);

    return {
      actionItems: actionItems as unknown as ActionItem[],
      total,
    };
  } catch (error) {
    console.error('Error listing action items:', error);
    // Return empty result if table doesn't exist yet
    return { actionItems: [], total: 0 };
  }
};

/**
 * Creates a new action item
 *
 * @param data - The action item data including projectId
 * @param userId - The ID of the user creating the action item
 * @returns Object with { actionItem } or { error }
 */
export const create = async (
  data: CreateActionItemInput,
  userId: number,
): Promise<ActionItemResult> => {
  const projectAccess = await validateProjectAccess(data.projectId, userId);

  if (projectAccess === 'not_found' || projectAccess === 'forbidden') {
    return { error: projectAccess };
  }

  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  try {
    // Use Prisma client instead of raw SQL for correct column mapping
    const result = await prisma.actionItem.create({
      data: {
        tenantId: tenantId ?? '',
        projectId: data.projectId,
        title: data.title,
        description: data.description ?? null,
        assigneeId: data.assigneeId ?? null,
        assigneeName: data.assigneeName ?? null,
        dueDate: data.dueDate ?? null,
        priority: (data.priority as 'P0' | 'P1' | 'P2') ?? 'P2',
        status:
          (data.status as
            | 'OPEN'
            | 'IN_PROGRESS'
            | 'COMPLETED'
            | 'CANCELLED'
            | 'CONVERTED_TO_TASK') ?? 'OPEN',
        sourceMeetingId: data.sourceMeetingId ?? null,
        sourceText: data.sourceText ?? null,
      },
    });

    if (!result) {
      return { error: 'database_error' };
    }

    return { actionItem: result as unknown as ActionItem };
  } catch (error) {
    console.error('Error creating action item:', error);
    return { error: 'database_error' };
  }
};

/**
 * Gets an action item by ID
 *
 * @param id - The action item ID
 * @param userId - The ID of the user requesting access
 * @returns Object with { actionItem } or { error }
 */
export const getById = async (
  id: number,
  userId: number,
): Promise<ActionItemResult> => {
  const found = await findActionItemWithAccess(id);

  if (!found) {
    return { error: 'not_found' };
  }

  if (!found.project || !hasProjectAccess(found.project, userId)) {
    return { error: 'forbidden' };
  }

  return { actionItem: found.actionItem };
};

/**
 * Updates an action item
 *
 * @param id - The action item ID
 * @param data - The update data
 * @param userId - The ID of the user updating
 * @returns Object with { actionItem } or { error }
 */
export const update = async (
  id: number,
  data: UpdateActionItemInput,
  userId: number,
): Promise<ActionItemResult> => {
  const found = await findActionItemWithAccess(id);

  if (!found) {
    return { error: 'not_found' };
  }

  if (!found.project || !hasProjectAccess(found.project, userId)) {
    return { error: 'forbidden' };
  }

  try {
    // Build SET clause dynamically
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.assigneeId !== undefined) {
      updates.push(`"assigneeId" = $${paramIndex++}`);
      values.push(data.assigneeId);
    }
    if (data.assigneeName !== undefined) {
      updates.push(`"assigneeName" = $${paramIndex++}`);
      values.push(data.assigneeName);
    }
    if (data.dueDate !== undefined) {
      updates.push(`"dueDate" = $${paramIndex++}`);
      values.push(data.dueDate);
    }
    if (data.priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(data.priority);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(data.notes);
    }

    updates.push(`"updatedAt" = NOW()`);
    values.push(id);

    const result = await prisma.$queryRawUnsafe<ActionItem[]>(
      `
      UPDATE "ActionItem"
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `,
      ...values,
    );

    if (!result || result.length === 0) {
      return { error: 'database_error' };
    }

    return { actionItem: result[0] };
  } catch (error) {
    console.error('Error updating action item:', error);
    return { error: 'database_error' };
  }
};

/**
 * Deletes an action item
 *
 * @param id - The action item ID
 * @param userId - The ID of the user deleting
 * @returns Object with { deleted: true } or { error }
 */
export const deleteActionItem = async (
  id: number,
  userId: number,
): Promise<
  { deleted: true } | { error: 'not_found' | 'forbidden' | 'database_error' }
> => {
  const found = await findActionItemWithAccess(id);

  if (!found) {
    return { error: 'not_found' };
  }

  if (!found.project || !hasProjectAccess(found.project, userId)) {
    return { error: 'forbidden' };
  }

  try {
    await prisma.$queryRawUnsafe(
      `
      DELETE FROM "ActionItem" WHERE id = $1
    `,
      id,
    );

    return { deleted: true };
  } catch (error) {
    console.error('Error deleting action item:', error);
    return { error: 'database_error' };
  }
};

/**
 * Converts an action item to a formal task
 *
 * @param id - The action item ID
 * @param userId - The ID of the user converting
 * @param taskData - Optional override data for the task
 * @returns Object with { task, actionItem } or { error }
 */
export const convertToTask = async (
  id: number,
  userId: number,
  taskData?: ConvertToTaskInput,
): Promise<
  | { task: unknown; actionItem: ActionItem }
  | {
      error:
        | 'not_found'
        | 'forbidden'
        | 'database_error'
        | 'invalid_milestone'
        | 'invalid_assignees';
    }
> => {
  const found = await findActionItemWithAccess(id);

  if (!found) {
    return { error: 'not_found' };
  }

  if (!found.project || !hasProjectAccess(found.project, userId)) {
    return { error: 'forbidden' };
  }

  const actionItem = found.actionItem;

  // Create the task using existing task service
  const taskResult = await createTask(userId, {
    projectId: actionItem.projectId,
    title: taskData?.title ?? actionItem.title,
    description: taskData?.description ?? actionItem.description ?? undefined,
    status: taskData?.status ?? 'BACKLOG',
    priority:
      taskData?.priority ??
      (actionItem.priority === 'P1'
        ? 'P0'
        : actionItem.priority === 'P2'
          ? 'P1'
          : 'P2'),
    dueDate: taskData?.dueDate ?? actionItem.dueDate ?? undefined,
    milestoneId: taskData?.milestoneId,
    assigneeIds:
      taskData?.assigneeIds ??
      (actionItem.assigneeId ? [actionItem.assigneeId] : undefined),
  });

  if (taskResult.error) {
    if (taskResult.error === 'invalid_milestone') {
      return { error: 'invalid_milestone' };
    }
    if (taskResult.error === 'invalid_assignees') {
      return { error: 'invalid_assignees' };
    }
    return { error: 'database_error' };
  }

  // Update action item status to CONVERTED_TO_TASK
  try {
    const updatedResult = await prisma.$queryRawUnsafe<ActionItem[]>(
      `
      UPDATE "ActionItem"
      SET status = 'CONVERTED_TO_TASK',
          "linkedTaskId" = $1,
          "updatedAt" = NOW()
      WHERE id = $2
      RETURNING *
    `,
      taskResult.task.id,
      id,
    );

    return {
      task: taskResult.task,
      actionItem: updatedResult[0] ?? actionItem,
    };
  } catch (error) {
    console.error('Error updating action item after conversion:', error);
    // Task was created, so still return success
    return {
      task: taskResult.task,
      actionItem: {
        ...actionItem,
        status: 'CONVERTED_TO_TASK',
        linkedTaskId: taskResult.task.id,
      },
    };
  }
};

/**
 * Gets action item counts by status for a project
 *
 * @param projectId - The project ID
 * @param userId - The ID of the user requesting
 * @returns Status counts or error
 */
export const getStatusCounts = async (
  projectId: number,
  userId: number,
): Promise<
  { counts: Record<string, number> } | { error: 'not_found' | 'forbidden' }
> => {
  const projectAccess = await validateProjectAccess(projectId, userId);

  if (projectAccess === 'not_found' || projectAccess === 'forbidden') {
    return { error: projectAccess };
  }

  try {
    const result = await prisma.$queryRawUnsafe<
      { status: string; count: bigint }[]
    >(
      `
      SELECT status, COUNT(*) as count
      FROM "ActionItem"
      WHERE "projectId" = $1
      GROUP BY status
    `,
      projectId,
    );

    const counts: Record<string, number> = {
      OPEN: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      CONVERTED_TO_TASK: 0,
    };

    for (const row of result) {
      counts[row.status] = Number(row.count);
    }

    return { counts };
  } catch {
    // Table might not exist yet
    return {
      counts: {
        OPEN: 0,
        IN_PROGRESS: 0,
        COMPLETED: 0,
        CANCELLED: 0,
        CONVERTED_TO_TASK: 0,
      },
    };
  }
};
