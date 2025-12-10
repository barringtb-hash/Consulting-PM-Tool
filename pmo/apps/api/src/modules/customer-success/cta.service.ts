/**
 * CTA (Call-to-Action) Service
 *
 * Manages CTAs for the Customer Success Platform.
 * CTAs are actionable items that help CSMs manage their daily workflow.
 *
 * CTA Types:
 * - RISK: Negative trend detected (usage drop, support issues)
 * - OPPORTUNITY: Positive signal (expansion potential, advocate)
 * - LIFECYCLE: Scheduled event (renewal, QBR, onboarding milestone)
 * - ACTIVITY: Tied to timeline activity
 * - OBJECTIVE: Used in Success Plans
 */

import {
  Prisma,
  CTAType,
  CTAStatus,
  CTAPriority,
  TaskStatus,
} from '@prisma/client';
import prisma from '../../prisma/client';

export interface CreateCTAInput {
  clientId: number;
  projectId?: number;
  ownerId: number;
  type: CTAType;
  priority?: CTAPriority;
  title: string;
  description?: string;
  reason?: string;
  dueDate?: Date;
  playbookId?: number;
  successPlanId?: number;
  linkedMeetingId?: number;
  isAutomated?: boolean;
  triggerRule?: string;
  triggerData?: Prisma.InputJsonValue;
}

export interface UpdateCTAInput {
  status?: CTAStatus;
  priority?: CTAPriority;
  title?: string;
  description?: string;
  reason?: string;
  dueDate?: Date;
  snoozeUntil?: Date;
  resolutionNotes?: string;
  outcome?: string;
  ownerId?: number;
  playbookId?: number | null;
}

export interface CTAListOptions {
  clientId?: number;
  projectId?: number;
  ownerId?: number;
  type?: CTAType;
  status?: CTAStatus | CTAStatus[];
  priority?: CTAPriority;
  overdue?: boolean;
  snoozed?: boolean;
  sortBy?: 'dueDate' | 'priority' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface CTAWithRelations {
  id: number;
  clientId: number;
  projectId: number | null;
  ownerId: number;
  type: CTAType;
  status: CTAStatus;
  priority: CTAPriority;
  title: string;
  description: string | null;
  reason: string | null;
  dueDate: Date | null;
  snoozeUntil: Date | null;
  completedAt: Date | null;
  playbookId: number | null;
  successPlanId: number | null;
  linkedMeetingId: number | null;
  resolutionNotes: string | null;
  outcome: string | null;
  isAutomated: boolean;
  triggerRule: string | null;
  createdAt: Date;
  updatedAt: Date;
  client: { id: number; name: string };
  project?: { id: number; name: string } | null;
  owner: { id: number; name: string; email: string };
  playbook?: { id: number; name: string } | null;
  ctaTasks: Array<{
    id: number;
    title: string;
    status: TaskStatus;
    dueDate: Date | null;
  }>;
}

/**
 * Create a new CTA
 */
export async function createCTA(
  input: CreateCTAInput,
): Promise<CTAWithRelations> {
  const cta = await prisma.cTA.create({
    data: {
      clientId: input.clientId,
      projectId: input.projectId,
      ownerId: input.ownerId,
      type: input.type,
      status: 'OPEN',
      priority: input.priority ?? 'MEDIUM',
      title: input.title,
      description: input.description,
      reason: input.reason,
      dueDate: input.dueDate,
      playbookId: input.playbookId,
      successPlanId: input.successPlanId,
      linkedMeetingId: input.linkedMeetingId,
      isAutomated: input.isAutomated ?? false,
      triggerRule: input.triggerRule,
      triggerData: input.triggerData,
    },
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true, email: true } },
      playbook: { select: { id: true, name: true } },
      ctaTasks: {
        select: { id: true, title: true, status: true, dueDate: true },
      },
    },
  });

  // If playbook is attached, create tasks from playbook template
  if (input.playbookId) {
    await applyPlaybookToCTA(cta.id, input.playbookId, input.ownerId);
  }

  return cta as unknown as CTAWithRelations;
}

/**
 * Apply playbook tasks to a CTA
 */
async function applyPlaybookToCTA(
  ctaId: number,
  playbookId: number,
  defaultOwnerId: number,
): Promise<void> {
  const playbook = await prisma.playbook.findUnique({
    where: { id: playbookId },
    include: {
      tasks: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  if (!playbook) return;

  const now = new Date();

  // Create CTA tasks from playbook tasks
  const ctaTasks = playbook.tasks.map((task, index) => {
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + task.daysFromStart);

    return {
      ctaId,
      ownerId: task.assignToOwner ? defaultOwnerId : null,
      title: task.title,
      description: task.description,
      status: 'BACKLOG' as TaskStatus,
      dueDate,
      orderIndex: index,
      isFromPlaybook: true,
    };
  });

  await prisma.cTATask.createMany({ data: ctaTasks });

  // Increment playbook usage counter
  await prisma.playbook.update({
    where: { id: playbookId },
    data: { timesUsed: { increment: 1 } },
  });
}

/**
 * Update a CTA
 */
export async function updateCTA(
  id: number,
  input: UpdateCTAInput,
): Promise<CTAWithRelations> {
  const updateData: Prisma.CTAUpdateInput = {
    ...(input.status && { status: input.status }),
    ...(input.priority && { priority: input.priority }),
    ...(input.title && { title: input.title }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.reason !== undefined && { reason: input.reason }),
    ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
    ...(input.snoozeUntil !== undefined && { snoozeUntil: input.snoozeUntil }),
    ...(input.resolutionNotes !== undefined && {
      resolutionNotes: input.resolutionNotes,
    }),
    ...(input.outcome !== undefined && { outcome: input.outcome }),
    ...(input.ownerId && { owner: { connect: { id: input.ownerId } } }),
    ...(input.playbookId !== undefined && {
      playbook: input.playbookId
        ? { connect: { id: input.playbookId } }
        : { disconnect: true },
    }),
  };

  // Set completedAt when status changes to COMPLETED
  if (input.status === 'COMPLETED') {
    updateData.completedAt = new Date();
  }

  // Clear snoozeUntil when status changes from SNOOZED
  if (input.status && input.status !== 'SNOOZED') {
    updateData.snoozeUntil = null;
  }

  const cta = await prisma.cTA.update({
    where: { id },
    data: updateData,
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true, email: true } },
      playbook: { select: { id: true, name: true } },
      ctaTasks: {
        select: { id: true, title: true, status: true, dueDate: true },
      },
    },
  });

  return cta as unknown as CTAWithRelations;
}

/**
 * Get a CTA by ID
 */
export async function getCTAById(id: number): Promise<CTAWithRelations | null> {
  const cta = await prisma.cTA.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      project: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true, email: true } },
      playbook: { select: { id: true, name: true } },
      ctaTasks: {
        select: { id: true, title: true, status: true, dueDate: true },
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  return cta as unknown as CTAWithRelations | null;
}

/**
 * List CTAs with filtering
 */
export async function listCTAs(options: CTAListOptions): Promise<{
  data: CTAWithRelations[];
  total: number;
}> {
  const now = new Date();

  const where: Prisma.CTAWhereInput = {
    ...(options.clientId && { clientId: options.clientId }),
    ...(options.projectId && { projectId: options.projectId }),
    ...(options.ownerId && { ownerId: options.ownerId }),
    ...(options.type && { type: options.type }),
    ...(options.priority && { priority: options.priority }),
  };

  // Handle status filter
  if (options.status) {
    if (Array.isArray(options.status)) {
      where.status = { in: options.status };
    } else {
      where.status = options.status;
    }
  }

  // Handle overdue filter
  if (options.overdue) {
    where.dueDate = { lt: now };
    where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
  }

  // Handle snoozed filter
  if (options.snoozed) {
    where.status = 'SNOOZED';
    where.snoozeUntil = { gt: now };
  }

  // Build orderBy
  const orderBy: Prisma.CTAOrderByWithRelationInput = {};
  if (options.sortBy === 'dueDate') {
    orderBy.dueDate = options.sortOrder ?? 'asc';
  } else if (options.sortBy === 'priority') {
    // Custom priority ordering: CRITICAL > HIGH > MEDIUM > LOW
    orderBy.priority = options.sortOrder ?? 'asc';
  } else {
    orderBy.createdAt = options.sortOrder ?? 'desc';
  }

  const [data, total] = await Promise.all([
    prisma.cTA.findMany({
      where,
      orderBy,
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, email: true } },
        playbook: { select: { id: true, name: true } },
        ctaTasks: {
          select: { id: true, title: true, status: true, dueDate: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    }),
    prisma.cTA.count({ where }),
  ]);

  return {
    data: data as unknown as CTAWithRelations[],
    total,
  };
}

/**
 * Delete a CTA
 */
export async function deleteCTA(id: number): Promise<void> {
  await prisma.cTA.delete({ where: { id } });
}

/**
 * Get CTA summary/statistics
 */
export async function getCTASummary(ownerId?: number): Promise<{
  totalOpen: number;
  totalOverdue: number;
  byCTAType: Record<CTAType, number>;
  byPriority: Record<CTAPriority, number>;
  completedThisWeek: number;
  completedThisMonth: number;
}> {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthAgo = new Date(now);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const ownerFilter = ownerId ? { ownerId } : {};

  const [
    totalOpen,
    totalOverdue,
    riskCount,
    opportunityCount,
    lifecycleCount,
    activityCount,
    objectiveCount,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    completedThisWeek,
    completedThisMonth,
  ] = await Promise.all([
    prisma.cTA.count({
      where: { ...ownerFilter, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),
    prisma.cTA.count({
      where: {
        ...ownerFilter,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        dueDate: { lt: now },
      },
    }),
    prisma.cTA.count({
      where: {
        ...ownerFilter,
        type: 'RISK',
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    }),
    prisma.cTA.count({
      where: {
        ...ownerFilter,
        type: 'OPPORTUNITY',
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    }),
    prisma.cTA.count({
      where: {
        ...ownerFilter,
        type: 'LIFECYCLE',
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    }),
    prisma.cTA.count({
      where: {
        ...ownerFilter,
        type: 'ACTIVITY',
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    }),
    prisma.cTA.count({
      where: {
        ...ownerFilter,
        type: 'OBJECTIVE',
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    }),
    prisma.cTA.count({
      where: {
        ...ownerFilter,
        priority: 'CRITICAL',
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    }),
    prisma.cTA.count({
      where: {
        ...ownerFilter,
        priority: 'HIGH',
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    }),
    prisma.cTA.count({
      where: {
        ...ownerFilter,
        priority: 'MEDIUM',
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    }),
    prisma.cTA.count({
      where: {
        ...ownerFilter,
        priority: 'LOW',
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    }),
    prisma.cTA.count({
      where: {
        ...ownerFilter,
        status: 'COMPLETED',
        completedAt: { gte: weekAgo },
      },
    }),
    prisma.cTA.count({
      where: {
        ...ownerFilter,
        status: 'COMPLETED',
        completedAt: { gte: monthAgo },
      },
    }),
  ]);

  return {
    totalOpen,
    totalOverdue,
    byCTAType: {
      RISK: riskCount,
      OPPORTUNITY: opportunityCount,
      LIFECYCLE: lifecycleCount,
      ACTIVITY: activityCount,
      OBJECTIVE: objectiveCount,
    },
    byPriority: {
      CRITICAL: criticalCount,
      HIGH: highCount,
      MEDIUM: mediumCount,
      LOW: lowCount,
    },
    completedThisWeek,
    completedThisMonth,
  };
}

/**
 * Get Cockpit view (prioritized CTAs for daily workflow)
 */
export async function getCockpit(ownerId: number): Promise<{
  critical: CTAWithRelations[];
  overdue: CTAWithRelations[];
  dueToday: CTAWithRelations[];
  dueThisWeek: CTAWithRelations[];
  snoozedReady: CTAWithRelations[];
}> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const includeRelations = {
    client: { select: { id: true, name: true } },
    project: { select: { id: true, name: true } },
    owner: { select: { id: true, name: true, email: true } },
    playbook: { select: { id: true, name: true } },
    ctaTasks: {
      select: { id: true, title: true, status: true, dueDate: true },
      orderBy: { orderIndex: 'asc' as const },
    },
  };

  const [critical, overdue, dueToday, dueThisWeek, snoozedReady] =
    await Promise.all([
      // Critical priority CTAs
      prisma.cTA.findMany({
        where: {
          ownerId,
          priority: 'CRITICAL',
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
        include: includeRelations,
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      // Overdue CTAs
      prisma.cTA.findMany({
        where: {
          ownerId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          dueDate: { lt: today },
        },
        include: includeRelations,
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      // Due today
      prisma.cTA.findMany({
        where: {
          ownerId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          dueDate: { gte: today, lt: tomorrow },
        },
        include: includeRelations,
        orderBy: { priority: 'asc' },
        take: 10,
      }),
      // Due this week
      prisma.cTA.findMany({
        where: {
          ownerId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          dueDate: { gte: tomorrow, lt: weekEnd },
        },
        include: includeRelations,
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
        take: 10,
      }),
      // Snoozed CTAs that are ready to resume
      prisma.cTA.findMany({
        where: {
          ownerId,
          status: 'SNOOZED',
          snoozeUntil: { lte: now },
        },
        include: includeRelations,
        orderBy: { snoozeUntil: 'asc' },
        take: 5,
      }),
    ]);

  return {
    critical: critical as unknown as CTAWithRelations[],
    overdue: overdue as unknown as CTAWithRelations[],
    dueToday: dueToday as unknown as CTAWithRelations[],
    dueThisWeek: dueThisWeek as unknown as CTAWithRelations[],
    snoozedReady: snoozedReady as unknown as CTAWithRelations[],
  };
}

/**
 * Create automated CTA based on trigger conditions
 */
export async function createAutomatedCTA(
  trigger: {
    ruleType: string;
    clientId: number;
    projectId?: number;
    data: Record<string, unknown>;
  },
  ctaConfig: {
    type: CTAType;
    priority: CTAPriority;
    titleTemplate: string;
    reasonTemplate?: string;
    playbookId?: number;
    dueDays?: number;
  },
  defaultOwnerId: number,
): Promise<CTAWithRelations> {
  // Replace template variables
  const title = ctaConfig.titleTemplate
    .replace('{clientName}', String(trigger.data.clientName ?? ''))
    .replace('{projectName}', String(trigger.data.projectName ?? ''))
    .replace('{value}', String(trigger.data.value ?? ''));

  const reason = ctaConfig.reasonTemplate
    ?.replace('{clientName}', String(trigger.data.clientName ?? ''))
    .replace('{projectName}', String(trigger.data.projectName ?? ''))
    .replace('{value}', String(trigger.data.value ?? ''));

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (ctaConfig.dueDays ?? 7));

  return createCTA({
    clientId: trigger.clientId,
    projectId: trigger.projectId,
    ownerId: defaultOwnerId,
    type: ctaConfig.type,
    priority: ctaConfig.priority,
    title,
    reason,
    dueDate,
    playbookId: ctaConfig.playbookId,
    isAutomated: true,
    triggerRule: trigger.ruleType,
    triggerData: trigger.data as Prisma.InputJsonValue,
  });
}
