/**
 * Account CTA (Call-to-Action) Service
 *
 * Manages CTAs for Accounts in the CRM.
 * CTAs are actionable items that help CSMs manage their daily workflow.
 * Replaces legacy client-based CTA service with Account-centric approach.
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
import { getTenantId, hasTenantContext } from '../../tenant/tenant.context';

export interface CreateAccountCTAInput {
  accountId: number;
  ownerId: number;
  type: CTAType;
  priority?: CTAPriority;
  title: string;
  description?: string;
  reason?: string;
  dueDate?: Date;
  playbookId?: number;
  successPlanId?: number;
  isAutomated?: boolean;
  triggerRule?: string;
  triggerData?: Prisma.InputJsonValue;
}

export interface UpdateAccountCTAInput {
  status?: CTAStatus;
  priority?: CTAPriority;
  title?: string;
  description?: string;
  reason?: string;
  dueDate?: Date | null;
  snoozeUntil?: Date | null;
  resolutionNotes?: string;
  outcome?: string;
  ownerId?: number;
  playbookId?: number | null;
}

export interface AccountCTAListOptions {
  accountId?: number;
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

export interface AccountCTAWithRelations {
  id: number;
  accountId: number;
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
  resolutionNotes: string | null;
  outcome: string | null;
  isAutomated: boolean;
  triggerRule: string | null;
  createdAt: Date;
  updatedAt: Date;
  account: { id: number; name: string; type: string };
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
 * Create a new CTA for an Account
 */
export async function createAccountCTA(
  input: CreateAccountCTAInput,
): Promise<AccountCTAWithRelations> {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const cta = await prisma.cTA.create({
    data: {
      accountId: input.accountId,
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
      isAutomated: input.isAutomated ?? false,
      triggerRule: input.triggerRule,
      triggerData: input.triggerData,
      ...(tenantId && { tenantId }),
    },
    include: {
      account: { select: { id: true, name: true, type: true } },
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

  return cta as unknown as AccountCTAWithRelations;
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
export async function updateAccountCTA(
  id: number,
  input: UpdateAccountCTAInput,
): Promise<AccountCTAWithRelations> {
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
      account: { select: { id: true, name: true, type: true } },
      owner: { select: { id: true, name: true, email: true } },
      playbook: { select: { id: true, name: true } },
      ctaTasks: {
        select: { id: true, title: true, status: true, dueDate: true },
      },
    },
  });

  return cta as unknown as AccountCTAWithRelations;
}

/**
 * Get a CTA by ID
 */
export async function getAccountCTAById(
  id: number,
): Promise<AccountCTAWithRelations | null> {
  const cta = await prisma.cTA.findUnique({
    where: { id },
    include: {
      account: { select: { id: true, name: true, type: true } },
      owner: { select: { id: true, name: true, email: true } },
      playbook: { select: { id: true, name: true } },
      ctaTasks: {
        select: { id: true, title: true, status: true, dueDate: true },
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  return cta as unknown as AccountCTAWithRelations | null;
}

/**
 * List CTAs for an Account with filtering
 */
export async function listAccountCTAs(options: AccountCTAListOptions): Promise<{
  data: AccountCTAWithRelations[];
  total: number;
}> {
  const now = new Date();

  const where: Prisma.CTAWhereInput = {
    accountId: { not: null }, // Only account-based CTAs
    ...(options.accountId && { accountId: options.accountId }),
    ...(options.ownerId && { ownerId: options.ownerId }),
    ...(options.type && { type: options.type }),
    ...(options.priority && { priority: options.priority }),
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
        account: { select: { id: true, name: true, type: true } },
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
    data: data as unknown as AccountCTAWithRelations[],
    total,
  };
}

/**
 * Delete a CTA
 */
export async function deleteAccountCTA(id: number): Promise<void> {
  await prisma.cTA.delete({ where: { id } });
}

/**
 * Close a CTA (mark as completed with outcome)
 */
export async function closeAccountCTA(
  id: number,
  outcome: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE',
  resolutionNotes?: string,
): Promise<AccountCTAWithRelations> {
  return updateAccountCTA(id, {
    status: 'COMPLETED',
    outcome,
    resolutionNotes,
  });
}

/**
 * Snooze a CTA until a future date
 */
export async function snoozeAccountCTA(
  id: number,
  snoozeUntil: Date,
): Promise<AccountCTAWithRelations> {
  return updateAccountCTA(id, {
    status: 'SNOOZED',
    snoozeUntil,
  });
}

/**
 * Unsnooze a CTA (reopen it)
 */
export async function unsnoozeAccountCTA(
  id: number,
): Promise<AccountCTAWithRelations> {
  return updateAccountCTA(id, {
    status: 'OPEN',
    snoozeUntil: undefined,
  });
}

/**
 * Get CTA summary for an account or portfolio
 */
export async function getAccountCTASummary(accountId?: number): Promise<{
  total: number;
  open: number;
  inProgress: number;
  completed: number;
  overdue: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}> {
  const now = new Date();

  const baseWhere: Prisma.CTAWhereInput = {
    accountId: { not: null },
    ...(accountId && { accountId }),
    ...(hasTenantContext() && { tenantId: getTenantId() }),
  };

  const [
    openCount,
    inProgressCount,
    completedCount,
    overdueCount,
    ctasByType,
    ctasByPriority,
  ] = await Promise.all([
    prisma.cTA.count({ where: { ...baseWhere, status: 'OPEN' } }),
    prisma.cTA.count({ where: { ...baseWhere, status: 'IN_PROGRESS' } }),
    prisma.cTA.count({ where: { ...baseWhere, status: 'COMPLETED' } }),
    prisma.cTA.count({
      where: {
        ...baseWhere,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        dueDate: { lt: now },
      },
    }),
    prisma.cTA.groupBy({
      by: ['type'],
      where: { ...baseWhere, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      _count: true,
    }),
    prisma.cTA.groupBy({
      by: ['priority'],
      where: { ...baseWhere, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      _count: true,
    }),
  ]);

  const byType: Record<string, number> = {};
  for (const item of ctasByType) {
    byType[item.type] = item._count;
  }

  const byPriority: Record<string, number> = {};
  for (const item of ctasByPriority) {
    byPriority[item.priority] = item._count;
  }

  return {
    total: openCount + inProgressCount,
    open: openCount,
    inProgress: inProgressCount,
    completed: completedCount,
    overdue: overdueCount,
    byType,
    byPriority,
  };
}

/**
 * Get Cockpit view for a user (prioritized CTAs for daily workflow)
 */
export async function getAccountCTACockpit(ownerId: number): Promise<{
  overdueCTAs: AccountCTAWithRelations[];
  todayCTAs: AccountCTAWithRelations[];
  upcomingCTAs: AccountCTAWithRelations[];
  summary: {
    total: number;
    open: number;
    inProgress: number;
    completed: number;
    overdue: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  };
}> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const baseWhere: Prisma.CTAWhereInput = {
    ownerId,
    accountId: { not: null },
    ...(hasTenantContext() && { tenantId: getTenantId() }),
  };

  const includeRelations = {
    account: { select: { id: true, name: true, type: true } },
    owner: { select: { id: true, name: true, email: true } },
    playbook: { select: { id: true, name: true } },
    ctaTasks: {
      select: { id: true, title: true, status: true, dueDate: true },
      orderBy: { orderIndex: 'asc' as const },
    },
  };

  const [overdueCTAs, todayCTAs, upcomingCTAs, summary] = await Promise.all([
    // Overdue CTAs
    prisma.cTA.findMany({
      where: {
        ...baseWhere,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        dueDate: { lt: today },
      },
      include: includeRelations,
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      take: 20,
    }),
    // Due today
    prisma.cTA.findMany({
      where: {
        ...baseWhere,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        dueDate: { gte: today, lt: tomorrow },
      },
      include: includeRelations,
      orderBy: { priority: 'asc' },
      take: 20,
    }),
    // Due this week (upcoming)
    prisma.cTA.findMany({
      where: {
        ...baseWhere,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        dueDate: { gte: tomorrow, lt: weekEnd },
      },
      include: includeRelations,
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      take: 20,
    }),
    // Get summary
    getAccountCTASummary(),
  ]);

  return {
    overdueCTAs: overdueCTAs as unknown as AccountCTAWithRelations[],
    todayCTAs: todayCTAs as unknown as AccountCTAWithRelations[],
    upcomingCTAs: upcomingCTAs as unknown as AccountCTAWithRelations[],
    summary,
  };
}

/**
 * Create automated CTA based on trigger conditions
 */
export async function createAutomatedAccountCTA(
  trigger: {
    ruleType: string;
    accountId: number;
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
): Promise<AccountCTAWithRelations> {
  // Replace template variables
  const title = ctaConfig.titleTemplate
    .replace('{accountName}', String(trigger.data.accountName ?? ''))
    .replace('{value}', String(trigger.data.value ?? ''));

  const reason = ctaConfig.reasonTemplate
    ?.replace('{accountName}', String(trigger.data.accountName ?? ''))
    .replace('{value}', String(trigger.data.value ?? ''));

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (ctaConfig.dueDays ?? 7));

  return createAccountCTA({
    accountId: trigger.accountId,
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
