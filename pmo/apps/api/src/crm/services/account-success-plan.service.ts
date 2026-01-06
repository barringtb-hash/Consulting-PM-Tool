/**
 * Account Success Plan Service
 *
 * Manages Success Plans for Accounts in the CRM.
 * Success Plans are goal-based customer success plans with objectives and tasks.
 * Replaces legacy client-based Success Plan service with Account-centric approach.
 */

import {
  Prisma,
  SuccessPlanStatus,
  ObjectiveStatus,
  TaskStatus,
  Priority,
} from '@prisma/client';
import prisma from '../../prisma/client';
import { getTenantId, hasTenantContext } from '../../tenant/tenant.context';

export interface CreateAccountSuccessPlanInput {
  accountId: number;
  ownerId: number;
  name: string;
  description?: string;
  startDate?: Date;
  targetDate?: Date;
  customerGoals?: Prisma.InputJsonValue;
  isCustomerVisible?: boolean;
}

export interface UpdateAccountSuccessPlanInput {
  name?: string;
  description?: string;
  status?: SuccessPlanStatus;
  startDate?: Date | null;
  targetDate?: Date | null;
  customerGoals?: Prisma.InputJsonValue;
  isCustomerVisible?: boolean;
  customerNotes?: string;
  ownerId?: number;
}

export interface CreateObjectiveInput {
  successPlanId: number;
  title: string;
  description?: string;
  dueDate?: Date;
  successCriteria?: string;
}

export interface UpdateObjectiveInput {
  title?: string;
  description?: string;
  status?: ObjectiveStatus;
  dueDate?: Date | null;
  successCriteria?: string;
  progressPercent?: number;
}

export interface CreateSuccessTaskInput {
  objectiveId: number;
  ownerId?: number;
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: Date;
}

export interface AccountSuccessPlanWithRelations {
  id: number;
  accountId: number;
  ownerId: number;
  name: string;
  description: string | null;
  status: SuccessPlanStatus;
  startDate: Date | null;
  targetDate: Date | null;
  completedAt: Date | null;
  customerGoals: Prisma.JsonValue;
  progressPercent: number;
  isCustomerVisible: boolean;
  customerNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  account: { id: number; name: string; type: string };
  owner: { id: number; name: string; email: string };
  objectives: Array<{
    id: number;
    title: string;
    description: string | null;
    status: ObjectiveStatus;
    dueDate: Date | null;
    completedAt: Date | null;
    progressPercent: number;
    successCriteria: string | null;
    tasks: Array<{
      id: number;
      title: string;
      status: TaskStatus;
      priority: Priority;
      dueDate: Date | null;
    }>;
  }>;
}

const includeRelations = {
  account: { select: { id: true, name: true, type: true } },
  owner: { select: { id: true, name: true, email: true } },
  objectives: {
    include: {
      tasks: {
        orderBy: { orderIndex: 'asc' as const },
      },
    },
    orderBy: { orderIndex: 'asc' as const },
  },
};

/**
 * Create a new success plan for an Account
 */
export async function createAccountSuccessPlan(
  input: CreateAccountSuccessPlanInput,
): Promise<AccountSuccessPlanWithRelations> {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const plan = await prisma.successPlan.create({
    data: {
      accountId: input.accountId,
      ownerId: input.ownerId,
      name: input.name,
      description: input.description,
      status: 'DRAFT',
      startDate: input.startDate,
      targetDate: input.targetDate,
      customerGoals: input.customerGoals,
      isCustomerVisible: input.isCustomerVisible ?? false,
      ...(tenantId && { tenantId }),
    },
    include: includeRelations,
  });

  return plan as unknown as AccountSuccessPlanWithRelations;
}

/**
 * Update a success plan
 */
export async function updateAccountSuccessPlan(
  id: number,
  input: UpdateAccountSuccessPlanInput,
): Promise<AccountSuccessPlanWithRelations> {
  const updateData: Prisma.SuccessPlanUpdateInput = {
    ...(input.name && { name: input.name }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.status && { status: input.status }),
    ...(input.startDate !== undefined && { startDate: input.startDate }),
    ...(input.targetDate !== undefined && { targetDate: input.targetDate }),
    ...(input.customerGoals !== undefined && {
      customerGoals: input.customerGoals,
    }),
    ...(input.isCustomerVisible !== undefined && {
      isCustomerVisible: input.isCustomerVisible,
    }),
    ...(input.customerNotes !== undefined && {
      customerNotes: input.customerNotes,
    }),
    ...(input.ownerId && { owner: { connect: { id: input.ownerId } } }),
  };

  // Set completedAt when status changes to COMPLETED
  if (input.status === 'COMPLETED') {
    updateData.completedAt = new Date();
  }

  const plan = await prisma.successPlan.update({
    where: { id },
    data: updateData,
    include: includeRelations,
  });

  // Recalculate progress after update
  await recalculatePlanProgress(id);

  return plan as unknown as AccountSuccessPlanWithRelations;
}

/**
 * Get a success plan by ID
 */
export async function getAccountSuccessPlanById(
  id: number,
): Promise<AccountSuccessPlanWithRelations | null> {
  const plan = await prisma.successPlan.findUnique({
    where: { id },
    include: includeRelations,
  });

  return plan as unknown as AccountSuccessPlanWithRelations | null;
}

/**
 * List success plans for an Account with filtering
 */
export async function listAccountSuccessPlans(options: {
  accountId?: number;
  ownerId?: number;
  status?: SuccessPlanStatus | SuccessPlanStatus[];
  sortBy?: 'targetDate' | 'createdAt' | 'progressPercent';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}): Promise<{
  data: AccountSuccessPlanWithRelations[];
  total: number;
}> {
  const where: Prisma.SuccessPlanWhereInput = {
    accountId: { not: null }, // Only account-based plans
    ...(options.accountId && { accountId: options.accountId }),
    ...(options.ownerId && { ownerId: options.ownerId }),
  };

  // Apply tenant context when available
  if (hasTenantContext()) {
    where.tenantId = getTenantId();
  }

  // Handle status filter
  if (options.status) {
    if (Array.isArray(options.status)) {
      where.status = { in: options.status };
    } else {
      where.status = options.status;
    }
  }

  // Build orderBy
  const orderBy: Prisma.SuccessPlanOrderByWithRelationInput = {};
  if (options.sortBy === 'targetDate') {
    orderBy.targetDate = options.sortOrder ?? 'asc';
  } else if (options.sortBy === 'progressPercent') {
    orderBy.progressPercent = options.sortOrder ?? 'desc';
  } else {
    orderBy.createdAt = options.sortOrder ?? 'desc';
  }

  const [data, total] = await Promise.all([
    prisma.successPlan.findMany({
      where,
      orderBy,
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
      include: includeRelations,
    }),
    prisma.successPlan.count({ where }),
  ]);

  return {
    data: data as unknown as AccountSuccessPlanWithRelations[],
    total,
  };
}

/**
 * Delete a success plan
 */
export async function deleteAccountSuccessPlan(id: number): Promise<void> {
  await prisma.successPlan.delete({ where: { id } });
}

/**
 * Add an objective to a success plan
 */
export async function addObjective(
  input: CreateObjectiveInput,
): Promise<AccountSuccessPlanWithRelations> {
  // PERF FIX: Use transaction to combine aggregate + create + fetch in fewer round trips
  return prisma.$transaction(async (tx) => {
    // Get current max order index
    const maxOrder = await tx.successObjective.aggregate({
      where: { successPlanId: input.successPlanId },
      _max: { orderIndex: true },
    });

    await tx.successObjective.create({
      data: {
        successPlanId: input.successPlanId,
        title: input.title,
        description: input.description,
        dueDate: input.dueDate,
        successCriteria: input.successCriteria,
        orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
      },
    });

    // Recalculate progress inline to avoid extra queries
    const objectives = await tx.successObjective.findMany({
      where: { successPlanId: input.successPlanId },
      select: { progressPercent: true },
    });

    const progressPercent =
      objectives.length > 0
        ? Math.round(
            objectives.reduce((sum, o) => sum + o.progressPercent, 0) /
              objectives.length,
          )
        : 0;

    await tx.successPlan.update({
      where: { id: input.successPlanId },
      data: { progressPercent },
    });

    // Return the updated plan with all relations
    const plan = await tx.successPlan.findUnique({
      where: { id: input.successPlanId },
      include: includeRelations,
    });

    return plan as unknown as AccountSuccessPlanWithRelations;
  });
}

/**
 * Update an objective
 */
export async function updateObjective(
  objectiveId: number,
  input: UpdateObjectiveInput,
): Promise<AccountSuccessPlanWithRelations> {
  const updateData: Prisma.SuccessObjectiveUpdateInput = {
    ...(input.title && { title: input.title }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.status && { status: input.status }),
    ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
    ...(input.successCriteria !== undefined && {
      successCriteria: input.successCriteria,
    }),
    ...(input.progressPercent !== undefined && {
      progressPercent: input.progressPercent,
    }),
  };

  // Set completedAt when status changes to COMPLETED
  if (input.status === 'COMPLETED') {
    updateData.completedAt = new Date();
  }

  const objective = await prisma.successObjective.update({
    where: { id: objectiveId },
    data: updateData,
    select: { successPlanId: true },
  });

  // Recalculate plan progress
  await recalculatePlanProgress(objective.successPlanId);

  const plan = await getAccountSuccessPlanById(objective.successPlanId);
  return plan!;
}

/**
 * Delete an objective
 */
export async function deleteObjective(
  objectiveId: number,
): Promise<AccountSuccessPlanWithRelations> {
  const objective = await prisma.successObjective.findUnique({
    where: { id: objectiveId },
    select: { successPlanId: true },
  });

  if (!objective) {
    throw new Error(`Objective ${objectiveId} not found`);
  }

  await prisma.successObjective.delete({ where: { id: objectiveId } });

  // Recalculate plan progress
  await recalculatePlanProgress(objective.successPlanId);

  const plan = await getAccountSuccessPlanById(objective.successPlanId);
  return plan!;
}

/**
 * Add a task to an objective
 */
export async function addTask(
  input: CreateSuccessTaskInput,
): Promise<AccountSuccessPlanWithRelations> {
  // Get current max order index
  const maxOrder = await prisma.successTask.aggregate({
    where: { objectiveId: input.objectiveId },
    _max: { orderIndex: true },
  });

  await prisma.successTask.create({
    data: {
      objectiveId: input.objectiveId,
      ownerId: input.ownerId,
      title: input.title,
      description: input.description,
      priority: input.priority ?? 'P1',
      dueDate: input.dueDate,
      orderIndex: (maxOrder._max.orderIndex ?? -1) + 1,
    },
  });

  // Get the objective to find the plan
  const objective = await prisma.successObjective.findUnique({
    where: { id: input.objectiveId },
    select: { successPlanId: true },
  });

  // Recalculate progress
  await recalculateObjectiveProgress(input.objectiveId);
  await recalculatePlanProgress(objective!.successPlanId);

  const plan = await getAccountSuccessPlanById(objective!.successPlanId);
  return plan!;
}

/**
 * Update a task status
 */
export async function updateTaskStatus(
  taskId: number,
  status: TaskStatus,
): Promise<AccountSuccessPlanWithRelations> {
  const task = await prisma.successTask.update({
    where: { id: taskId },
    data: {
      status,
      completedAt: status === 'DONE' ? new Date() : null,
    },
    select: {
      objective: {
        select: { id: true, successPlanId: true },
      },
    },
  });

  // Recalculate progress
  await recalculateObjectiveProgress(task.objective.id);
  await recalculatePlanProgress(task.objective.successPlanId);

  const plan = await getAccountSuccessPlanById(task.objective.successPlanId);
  return plan!;
}

/**
 * Recalculate objective progress based on task completion
 */
async function recalculateObjectiveProgress(
  objectiveId: number,
): Promise<void> {
  const tasks = await prisma.successTask.findMany({
    where: { objectiveId },
    select: { status: true },
  });

  if (tasks.length === 0) {
    await prisma.successObjective.update({
      where: { id: objectiveId },
      data: { progressPercent: 0 },
    });
    return;
  }

  const completedCount = tasks.filter((t) => t.status === 'DONE').length;
  const progressPercent = Math.round((completedCount / tasks.length) * 100);

  // Determine status based on progress
  let status: ObjectiveStatus = 'NOT_STARTED';
  if (progressPercent === 100) {
    status = 'COMPLETED';
  } else if (progressPercent > 0) {
    status = 'IN_PROGRESS';
  }

  await prisma.successObjective.update({
    where: { id: objectiveId },
    data: {
      progressPercent,
      status,
      completedAt: status === 'COMPLETED' ? new Date() : null,
    },
  });
}

/**
 * Recalculate plan progress based on objective completion
 */
async function recalculatePlanProgress(planId: number): Promise<void> {
  const objectives = await prisma.successObjective.findMany({
    where: { successPlanId: planId },
    select: { progressPercent: true },
  });

  if (objectives.length === 0) {
    await prisma.successPlan.update({
      where: { id: planId },
      data: { progressPercent: 0 },
    });
    return;
  }

  const totalProgress = objectives.reduce(
    (sum, o) => sum + o.progressPercent,
    0,
  );
  const progressPercent = Math.round(totalProgress / objectives.length);

  await prisma.successPlan.update({
    where: { id: planId },
    data: { progressPercent },
  });
}

/**
 * Get success plan summary for an account or portfolio
 */
export async function getAccountSuccessPlanSummary(
  accountId?: number,
): Promise<{
  total: number;
  draft: number;
  active: number;
  completed: number;
  onHold: number;
  averageProgress: number;
}> {
  const baseWhere: Prisma.SuccessPlanWhereInput = {
    accountId: { not: null },
    ...(accountId && { accountId }),
    ...(hasTenantContext() && { tenantId: getTenantId() }),
  };

  const [draftCount, activeCount, completedCount, onHoldCount, allPlans] =
    await Promise.all([
      prisma.successPlan.count({ where: { ...baseWhere, status: 'DRAFT' } }),
      prisma.successPlan.count({ where: { ...baseWhere, status: 'ACTIVE' } }),
      prisma.successPlan.count({
        where: { ...baseWhere, status: 'COMPLETED' },
      }),
      prisma.successPlan.count({ where: { ...baseWhere, status: 'ON_HOLD' } }),
      prisma.successPlan.findMany({
        where: { ...baseWhere, status: 'ACTIVE' },
        select: { progressPercent: true },
      }),
    ]);

  const total = draftCount + activeCount + completedCount + onHoldCount;
  const averageProgress =
    allPlans.length > 0
      ? Math.round(
          allPlans.reduce((sum, p) => sum + p.progressPercent, 0) /
            allPlans.length,
        )
      : 0;

  return {
    total,
    draft: draftCount,
    active: activeCount,
    completed: completedCount,
    onHold: onHoldCount,
    averageProgress,
  };
}

/**
 * Activate a draft success plan
 */
export async function activateSuccessPlan(
  id: number,
): Promise<AccountSuccessPlanWithRelations> {
  return updateAccountSuccessPlan(id, {
    status: 'ACTIVE',
    startDate: new Date(),
  });
}

/**
 * Put a success plan on hold
 */
export async function holdSuccessPlan(
  id: number,
): Promise<AccountSuccessPlanWithRelations> {
  return updateAccountSuccessPlan(id, { status: 'ON_HOLD' });
}

/**
 * Complete a success plan
 */
export async function completeSuccessPlan(
  id: number,
): Promise<AccountSuccessPlanWithRelations> {
  return updateAccountSuccessPlan(id, { status: 'COMPLETED' });
}
