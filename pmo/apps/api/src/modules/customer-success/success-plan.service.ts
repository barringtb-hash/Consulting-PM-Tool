/**
 * Success Plan Service
 *
 * Manages Success Plans for the Customer Success Platform.
 * Success Plans are goal-based customer success plans with objectives and tasks.
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

export interface CreateSuccessPlanInput {
  clientId: number;
  projectId?: number;
  ownerId: number;
  name: string;
  description?: string;
  startDate?: Date;
  targetDate?: Date;
  customerGoals?: Prisma.InputJsonValue;
  isCustomerVisible?: boolean;
}

export interface UpdateSuccessPlanInput {
  name?: string;
  description?: string;
  status?: SuccessPlanStatus;
  startDate?: Date;
  targetDate?: Date;
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

export interface CreateSuccessTaskInput {
  objectiveId: number;
  ownerId?: number;
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: Date;
}

export interface SuccessPlanWithRelations {
  id: number;
  clientId: number;
  projectId: number | null;
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
  client: { id: number; name: string };
  project?: { id: number; name: string } | null;
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

/**
 * Create a new success plan
 */
export async function createSuccessPlan(
  input: CreateSuccessPlanInput,
): Promise<SuccessPlanWithRelations> {
  const plan = await prisma.successPlan.create({
    data: {
      clientId: input.clientId,
      projectId: input.projectId,
      ownerId: input.ownerId,
      name: input.name,
      description: input.description,
      status: 'DRAFT',
      startDate: input.startDate,
      targetDate: input.targetDate,
      customerGoals: input.customerGoals,
      isCustomerVisible: input.isCustomerVisible ?? false,
      ...(hasTenantContext() && { tenantId: getTenantId() }),
    },
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true, email: true } },
      objectives: {
        include: {
          tasks: {
            orderBy: { orderIndex: 'asc' },
          },
        },
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  return plan as unknown as SuccessPlanWithRelations;
}

/**
 * Update a success plan
 */
export async function updateSuccessPlan(
  id: number,
  input: UpdateSuccessPlanInput,
): Promise<SuccessPlanWithRelations> {
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
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true, email: true } },
      objectives: {
        include: {
          tasks: {
            orderBy: { orderIndex: 'asc' },
          },
        },
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  return plan as unknown as SuccessPlanWithRelations;
}

/**
 * Get a success plan by ID
 */
export async function getSuccessPlanById(
  id: number,
): Promise<SuccessPlanWithRelations | null> {
  const plan = await prisma.successPlan.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true, email: true } },
      objectives: {
        include: {
          tasks: {
            orderBy: { orderIndex: 'asc' },
          },
        },
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  return plan as unknown as SuccessPlanWithRelations | null;
}

/**
 * List success plans with filtering
 */
export async function listSuccessPlans(options: {
  clientId?: number;
  projectId?: number;
  ownerId?: number;
  status?: SuccessPlanStatus | SuccessPlanStatus[];
  isCustomerVisible?: boolean;
  search?: string;
  sortBy?: 'name' | 'targetDate' | 'createdAt' | 'progressPercent';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}): Promise<{
  data: SuccessPlanWithRelations[];
  total: number;
}> {
  const where: Prisma.SuccessPlanWhereInput = {
    ...(options.clientId && { clientId: options.clientId }),
    ...(options.projectId && { projectId: options.projectId }),
    ...(options.ownerId && { ownerId: options.ownerId }),
    ...(options.isCustomerVisible !== undefined && {
      isCustomerVisible: options.isCustomerVisible,
    }),
    ...(options.search && {
      OR: [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ],
    }),
  };

  // Apply tenant context when available
  if (hasTenantContext()) {
    where.tenantId = getTenantId();
  }

  if (options.status) {
    if (Array.isArray(options.status)) {
      where.status = { in: options.status };
    } else {
      where.status = options.status;
    }
  }

  const orderBy: Prisma.SuccessPlanOrderByWithRelationInput = {};
  if (options.sortBy === 'name') {
    orderBy.name = options.sortOrder ?? 'asc';
  } else if (options.sortBy === 'targetDate') {
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
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, email: true } },
        objectives: {
          include: {
            tasks: {
              orderBy: { orderIndex: 'asc' },
            },
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    }),
    prisma.successPlan.count({ where }),
  ]);

  return {
    data: data as unknown as SuccessPlanWithRelations[],
    total,
  };
}

/**
 * Delete a success plan
 */
export async function deleteSuccessPlan(id: number): Promise<void> {
  await prisma.successPlan.delete({ where: { id } });
}

/**
 * Add an objective to a success plan
 */
export async function addObjective(
  input: CreateObjectiveInput,
): Promise<SuccessPlanWithRelations> {
  // Get current max orderIndex
  const lastObjective = await prisma.successObjective.findFirst({
    where: { successPlanId: input.successPlanId },
    orderBy: { orderIndex: 'desc' },
  });

  const orderIndex = (lastObjective?.orderIndex ?? -1) + 1;

  await prisma.successObjective.create({
    data: {
      successPlanId: input.successPlanId,
      title: input.title,
      description: input.description,
      dueDate: input.dueDate,
      successCriteria: input.successCriteria,
      orderIndex,
    },
  });

  // Recalculate progress
  await recalculateSuccessPlanProgress(input.successPlanId);

  return getSuccessPlanById(
    input.successPlanId,
  ) as Promise<SuccessPlanWithRelations>;
}

/**
 * Update an objective
 */
export async function updateObjective(
  objectiveId: number,
  input: {
    title?: string;
    description?: string;
    status?: ObjectiveStatus;
    dueDate?: Date;
    successCriteria?: string;
  },
): Promise<void> {
  const updateData: Prisma.SuccessObjectiveUpdateInput = {
    ...(input.title && { title: input.title }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.status && { status: input.status }),
    ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
    ...(input.successCriteria !== undefined && {
      successCriteria: input.successCriteria,
    }),
  };

  if (input.status === 'COMPLETED') {
    updateData.completedAt = new Date();
    updateData.progressPercent = 100;
  }

  const objective = await prisma.successObjective.update({
    where: { id: objectiveId },
    data: updateData,
    select: { successPlanId: true },
  });

  // Recalculate plan progress
  await recalculateSuccessPlanProgress(objective.successPlanId);
}

/**
 * Delete an objective
 */
export async function deleteObjective(objectiveId: number): Promise<void> {
  const objective = await prisma.successObjective.findUnique({
    where: { id: objectiveId },
    select: { successPlanId: true },
  });

  await prisma.successObjective.delete({ where: { id: objectiveId } });

  if (objective) {
    await recalculateSuccessPlanProgress(objective.successPlanId);
  }
}

/**
 * Add a task to an objective
 */
export async function addSuccessTask(
  input: CreateSuccessTaskInput,
): Promise<void> {
  // Get current max orderIndex
  const lastTask = await prisma.successTask.findFirst({
    where: { objectiveId: input.objectiveId },
    orderBy: { orderIndex: 'desc' },
  });

  const orderIndex = (lastTask?.orderIndex ?? -1) + 1;

  await prisma.successTask.create({
    data: {
      objectiveId: input.objectiveId,
      ownerId: input.ownerId,
      title: input.title,
      description: input.description,
      priority: input.priority ?? 'P1',
      dueDate: input.dueDate,
      orderIndex,
    },
  });

  // Recalculate objective progress
  const objective = await prisma.successObjective.findUnique({
    where: { id: input.objectiveId },
    select: { successPlanId: true },
  });

  if (objective) {
    await recalculateObjectiveProgress(input.objectiveId);
    await recalculateSuccessPlanProgress(objective.successPlanId);
  }
}

/**
 * Update a success task
 */
export async function updateSuccessTask(
  taskId: number,
  input: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: Priority;
    dueDate?: Date;
    ownerId?: number;
  },
): Promise<void> {
  const updateData: Prisma.SuccessTaskUpdateInput = {
    ...(input.title && { title: input.title }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.status && { status: input.status }),
    ...(input.priority && { priority: input.priority }),
    ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
    ...(input.ownerId !== undefined && {
      owner: input.ownerId
        ? { connect: { id: input.ownerId } }
        : { disconnect: true },
    }),
  };

  if (input.status === 'DONE') {
    updateData.completedAt = new Date();
  }

  const task = await prisma.successTask.update({
    where: { id: taskId },
    data: updateData,
    select: {
      objective: {
        select: { id: true, successPlanId: true },
      },
    },
  });

  // Recalculate progress
  await recalculateObjectiveProgress(task.objective.id);
  await recalculateSuccessPlanProgress(task.objective.successPlanId);
}

/**
 * Delete a success task
 */
export async function deleteSuccessTask(taskId: number): Promise<void> {
  const task = await prisma.successTask.findUnique({
    where: { id: taskId },
    select: {
      objective: {
        select: { id: true, successPlanId: true },
      },
    },
  });

  await prisma.successTask.delete({ where: { id: taskId } });

  if (task) {
    await recalculateObjectiveProgress(task.objective.id);
    await recalculateSuccessPlanProgress(task.objective.successPlanId);
  }
}

/**
 * Recalculate objective progress based on tasks
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

  await prisma.successObjective.update({
    where: { id: objectiveId },
    data: { progressPercent },
  });
}

/**
 * Recalculate success plan progress based on objectives
 */
async function recalculateSuccessPlanProgress(planId: number): Promise<void> {
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
 * Get customer-visible success plan (for customer portal)
 */
export async function getCustomerVisiblePlan(
  clientId: number,
  planId: number,
): Promise<{
  id: number;
  name: string;
  description: string | null;
  status: SuccessPlanStatus;
  startDate: Date | null;
  targetDate: Date | null;
  progressPercent: number;
  customerNotes: string | null;
  objectives: Array<{
    id: number;
    title: string;
    description: string | null;
    status: ObjectiveStatus;
    dueDate: Date | null;
    progressPercent: number;
  }>;
} | null> {
  const plan = await prisma.successPlan.findFirst({
    where: {
      id: planId,
      clientId,
      isCustomerVisible: true,
    },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      startDate: true,
      targetDate: true,
      progressPercent: true,
      customerNotes: true,
      objectives: {
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          dueDate: true,
          progressPercent: true,
        },
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  return plan;
}

/**
 * Get success plan summary for dashboard
 */
export async function getSuccessPlanSummary(ownerId?: number): Promise<{
  totalPlans: number;
  activePlans: number;
  completedPlans: number;
  averageProgress: number;
  upcomingMilestones: Array<{
    planId: number;
    planName: string;
    objectiveTitle: string;
    dueDate: Date;
    clientName: string;
  }>;
}> {
  const ownerFilter = ownerId ? { ownerId } : {};

  const [
    totalPlans,
    activePlans,
    completedPlans,
    allPlans,
    upcomingObjectives,
  ] = await Promise.all([
    prisma.successPlan.count({ where: ownerFilter }),
    prisma.successPlan.count({
      where: { ...ownerFilter, status: 'ACTIVE' },
    }),
    prisma.successPlan.count({
      where: { ...ownerFilter, status: 'COMPLETED' },
    }),
    prisma.successPlan.findMany({
      where: { ...ownerFilter, status: 'ACTIVE' },
      select: { progressPercent: true },
    }),
    prisma.successObjective.findMany({
      where: {
        successPlan: ownerFilter,
        status: { notIn: ['COMPLETED', 'BLOCKED'] },
        dueDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Next 14 days
        },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        successPlan: {
          select: {
            id: true,
            name: true,
            client: { select: { name: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
    }),
  ]);

  const averageProgress =
    allPlans.length > 0
      ? Math.round(
          allPlans.reduce((sum, p) => sum + p.progressPercent, 0) /
            allPlans.length,
        )
      : 0;

  const upcomingMilestones = upcomingObjectives.map((obj) => ({
    planId: obj.successPlan.id,
    planName: obj.successPlan.name,
    objectiveTitle: obj.title,
    dueDate: obj.dueDate!,
    clientName: obj.successPlan.client?.name ?? 'Unknown',
  }));

  return {
    totalPlans,
    activePlans,
    completedPlans,
    averageProgress,
    upcomingMilestones,
  };
}
