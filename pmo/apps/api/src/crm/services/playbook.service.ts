/**
 * Playbook Service
 *
 * Manages playbooks for the Customer Success Platform.
 * Playbooks are reusable task sequences that standardize CS responses.
 */

import { Prisma, PlaybookStatus, CTAType } from '@prisma/client';
import prisma from '../../prisma/client';
import { getTenantId, hasTenantContext } from '../../tenant/tenant.context';

// Re-exported from CRM module as part of Customer Success merge

export interface CreatePlaybookInput {
  name: string;
  description?: string;
  ctaType?: CTAType;
  category?: string;
  createdById?: number;
  tasks?: Array<{
    title: string;
    description?: string;
    daysFromStart?: number;
    assignToOwner?: boolean;
  }>;
}

export interface UpdatePlaybookInput {
  name?: string;
  description?: string;
  status?: PlaybookStatus;
  ctaType?: CTAType | null;
  category?: string | null;
}

export interface PlaybookWithTasks {
  id: number;
  name: string;
  description: string | null;
  status: PlaybookStatus;
  ctaType: CTAType | null;
  category: string | null;
  timesUsed: number;
  createdById: number | null;
  createdAt: Date;
  updatedAt: Date;
  tasks: Array<{
    id: number;
    title: string;
    description: string | null;
    daysFromStart: number;
    assignToOwner: boolean;
    orderIndex: number;
  }>;
}

/**
 * Create a new playbook
 */
export async function createPlaybook(
  input: CreatePlaybookInput,
): Promise<PlaybookWithTasks> {
  const playbook = await prisma.playbook.create({
    data: {
      name: input.name,
      description: input.description,
      status: 'DRAFT',
      ctaType: input.ctaType,
      category: input.category,
      createdById: input.createdById,
      ...(hasTenantContext() && { tenantId: getTenantId() }),
      tasks: input.tasks
        ? {
            create: input.tasks.map((task, index) => ({
              title: task.title,
              description: task.description,
              daysFromStart: task.daysFromStart ?? 0,
              assignToOwner: task.assignToOwner ?? true,
              orderIndex: index,
            })),
          }
        : undefined,
    },
    include: {
      tasks: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  return playbook as PlaybookWithTasks;
}

/**
 * Update a playbook
 */
export async function updatePlaybook(
  id: number,
  input: UpdatePlaybookInput,
): Promise<PlaybookWithTasks> {
  const playbook = await prisma.playbook.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.status && { status: input.status }),
      ...(input.ctaType !== undefined && { ctaType: input.ctaType }),
      ...(input.category !== undefined && { category: input.category }),
    },
    include: {
      tasks: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  return playbook as PlaybookWithTasks;
}

/**
 * Get a playbook by ID
 */
export async function getPlaybookById(
  id: number,
): Promise<PlaybookWithTasks | null> {
  const playbook = await prisma.playbook.findUnique({
    where: { id },
    include: {
      tasks: {
        orderBy: { orderIndex: 'asc' },
      },
      createdBy: {
        select: { id: true, name: true },
      },
    },
  });

  return playbook as unknown as PlaybookWithTasks | null;
}

/**
 * List playbooks with filtering
 */
export async function listPlaybooks(options: {
  status?: PlaybookStatus;
  ctaType?: CTAType;
  category?: string;
  search?: string;
  sortBy?: 'name' | 'timesUsed' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}): Promise<{
  data: PlaybookWithTasks[];
  total: number;
}> {
  const where: Prisma.PlaybookWhereInput = {
    ...(options.status && { status: options.status }),
    ...(options.ctaType && { ctaType: options.ctaType }),
    ...(options.category && { category: options.category }),
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

  const orderBy: Prisma.PlaybookOrderByWithRelationInput = {};
  if (options.sortBy === 'name') {
    orderBy.name = options.sortOrder ?? 'asc';
  } else if (options.sortBy === 'timesUsed') {
    orderBy.timesUsed = options.sortOrder ?? 'desc';
  } else {
    orderBy.createdAt = options.sortOrder ?? 'desc';
  }

  const [data, total] = await Promise.all([
    prisma.playbook.findMany({
      where,
      orderBy,
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
      include: {
        tasks: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    }),
    prisma.playbook.count({ where }),
  ]);

  return {
    data: data as PlaybookWithTasks[],
    total,
  };
}

/**
 * Delete a playbook
 */
export async function deletePlaybook(id: number): Promise<void> {
  await prisma.playbook.delete({ where: { id } });
}

/**
 * Add a task to a playbook
 */
export async function addPlaybookTask(
  playbookId: number,
  task: {
    title: string;
    description?: string;
    daysFromStart?: number;
    assignToOwner?: boolean;
  },
): Promise<PlaybookWithTasks> {
  // PERF FIX: Use transaction and return playbook directly to avoid extra query
  return prisma.$transaction(async (tx) => {
    // Get current max orderIndex using aggregate (more efficient)
    const maxOrder = await tx.playbookTask.aggregate({
      where: { playbookId },
      _max: { orderIndex: true },
    });

    const orderIndex = (maxOrder._max.orderIndex ?? -1) + 1;

    await tx.playbookTask.create({
      data: {
        playbookId,
        title: task.title,
        description: task.description,
        daysFromStart: task.daysFromStart ?? 0,
        assignToOwner: task.assignToOwner ?? true,
        orderIndex,
      },
    });

    // Fetch and return playbook with tasks in same transaction
    const playbook = await tx.playbook.findUnique({
      where: { id: playbookId },
      include: {
        tasks: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    return playbook as PlaybookWithTasks;
  });
}

/**
 * Update a playbook task
 */
export async function updatePlaybookTask(
  taskId: number,
  task: {
    title?: string;
    description?: string;
    daysFromStart?: number;
    assignToOwner?: boolean;
    orderIndex?: number;
  },
): Promise<void> {
  await prisma.playbookTask.update({
    where: { id: taskId },
    data: {
      ...(task.title && { title: task.title }),
      ...(task.description !== undefined && { description: task.description }),
      ...(task.daysFromStart !== undefined && {
        daysFromStart: task.daysFromStart,
      }),
      ...(task.assignToOwner !== undefined && {
        assignToOwner: task.assignToOwner,
      }),
      ...(task.orderIndex !== undefined && { orderIndex: task.orderIndex }),
    },
  });
}

/**
 * Delete a playbook task
 */
export async function deletePlaybookTask(taskId: number): Promise<void> {
  await prisma.playbookTask.delete({ where: { id: taskId } });
}

/**
 * Reorder playbook tasks
 */
export async function reorderPlaybookTasks(
  playbookId: number,
  taskIds: number[],
): Promise<PlaybookWithTasks> {
  // Update each task's orderIndex in a transaction
  await prisma.$transaction(
    taskIds.map((taskId, index) =>
      prisma.playbookTask.update({
        where: { id: taskId },
        data: { orderIndex: index },
      }),
    ),
  );

  return getPlaybookById(playbookId) as Promise<PlaybookWithTasks>;
}

/**
 * Clone a playbook
 */
export async function clonePlaybook(
  id: number,
  newName: string,
  createdById?: number,
): Promise<PlaybookWithTasks> {
  const original = await getPlaybookById(id);
  if (!original) {
    throw new Error('Playbook not found');
  }

  return createPlaybook({
    name: newName,
    description: original.description ?? undefined,
    ctaType: original.ctaType ?? undefined,
    category: original.category ?? undefined,
    createdById,
    tasks: original.tasks.map((task) => ({
      title: task.title,
      description: task.description ?? undefined,
      daysFromStart: task.daysFromStart,
      assignToOwner: task.assignToOwner,
    })),
  });
}

/**
 * Get popular playbooks by usage
 */
export async function getPopularPlaybooks(limit: number = 5): Promise<
  Array<{
    id: number;
    name: string;
    category: string | null;
    timesUsed: number;
  }>
> {
  const where: Prisma.PlaybookWhereInput = { status: 'ACTIVE' };

  // Apply tenant context when available
  if (hasTenantContext()) {
    where.tenantId = getTenantId();
  }

  return prisma.playbook.findMany({
    where,
    select: {
      id: true,
      name: true,
      category: true,
      timesUsed: true,
    },
    orderBy: { timesUsed: 'desc' },
    take: limit,
  });
}

/**
 * Get playbook categories
 */
export async function getPlaybookCategories(): Promise<string[]> {
  const categories = await prisma.playbook.findMany({
    where: {
      category: { not: null },
    },
    select: {
      category: true,
    },
    distinct: ['category'],
  });

  return categories
    .map((c) => c.category)
    .filter((c): c is string => c !== null);
}

/**
 * Seed default playbooks
 */
export async function seedDefaultPlaybooks(createdById: number): Promise<void> {
  const defaultPlaybooks: CreatePlaybookInput[] = [
    {
      name: 'Onboarding - New Customer',
      description: 'Standard onboarding playbook for new customers',
      category: 'Onboarding',
      ctaType: 'LIFECYCLE',
      createdById,
      tasks: [
        { title: 'Schedule kickoff call', daysFromStart: 0 },
        { title: 'Send welcome email with resources', daysFromStart: 1 },
        { title: 'Complete technical setup', daysFromStart: 3 },
        { title: 'Conduct training session', daysFromStart: 7 },
        { title: 'Check-in on initial adoption', daysFromStart: 14 },
        { title: 'First value milestone review', daysFromStart: 30 },
      ],
    },
    {
      name: 'Risk Mitigation - Usage Drop',
      description: 'Response playbook when customer usage drops significantly',
      category: 'Risk Mitigation',
      ctaType: 'RISK',
      createdById,
      tasks: [
        {
          title: 'Review usage data and identify specific drop',
          daysFromStart: 0,
        },
        {
          title: 'Schedule discovery call with key stakeholder',
          daysFromStart: 1,
        },
        { title: 'Document root cause and blockers', daysFromStart: 2 },
        { title: 'Create action plan with customer', daysFromStart: 3 },
        { title: 'Follow up on action plan progress', daysFromStart: 7 },
        { title: 'Verify usage recovery', daysFromStart: 14 },
      ],
    },
    {
      name: 'Renewal - 90 Days Out',
      description: 'Renewal preparation starting 90 days before contract end',
      category: 'Renewal',
      ctaType: 'LIFECYCLE',
      createdById,
      tasks: [
        {
          title: 'Review account health and value delivered',
          daysFromStart: 0,
        },
        { title: 'Prepare renewal deck with ROI summary', daysFromStart: 7 },
        {
          title: 'Schedule renewal discussion with champion',
          daysFromStart: 14,
        },
        { title: 'Identify expansion opportunities', daysFromStart: 21 },
        { title: 'Send renewal proposal', daysFromStart: 30 },
        { title: 'Follow up on proposal', daysFromStart: 45 },
        { title: 'Finalize contract', daysFromStart: 60 },
      ],
    },
    {
      name: 'Expansion - Upsell Opportunity',
      description: 'Playbook for pursuing expansion opportunities',
      category: 'Expansion',
      ctaType: 'OPPORTUNITY',
      createdById,
      tasks: [
        { title: 'Document expansion opportunity details', daysFromStart: 0 },
        { title: 'Identify decision makers and influencers', daysFromStart: 2 },
        { title: 'Prepare business case and ROI', daysFromStart: 5 },
        { title: 'Schedule expansion discovery call', daysFromStart: 7 },
        { title: 'Present solution and pricing', daysFromStart: 14 },
        { title: 'Handle objections and negotiate', daysFromStart: 21 },
        { title: 'Close expansion deal', daysFromStart: 30 },
      ],
    },
    {
      name: 'QBR - Quarterly Business Review',
      description: 'Standard QBR preparation and execution',
      category: 'Engagement',
      ctaType: 'LIFECYCLE',
      createdById,
      tasks: [
        { title: 'Gather usage and adoption metrics', daysFromStart: 0 },
        { title: 'Compile success stories and wins', daysFromStart: 3 },
        { title: 'Create QBR presentation deck', daysFromStart: 7 },
        { title: 'Review with internal team', daysFromStart: 10 },
        { title: 'Send agenda to customer', daysFromStart: 12 },
        { title: 'Conduct QBR meeting', daysFromStart: 14 },
        { title: 'Send follow-up with action items', daysFromStart: 15 },
      ],
    },
  ];

  for (const playbook of defaultPlaybooks) {
    const existing = await prisma.playbook.findFirst({
      where: { name: playbook.name },
    });

    if (!existing) {
      const created = await createPlaybook(playbook);
      // Activate the playbook
      await updatePlaybook(created.id, { status: 'ACTIVE' });
    }
  }
}
