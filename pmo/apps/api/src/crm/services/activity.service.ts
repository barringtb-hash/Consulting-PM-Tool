/**
 * Activity Service
 *
 * Business logic for unified Activity timeline management.
 * Activities represent all interactions with accounts, contacts,
 * and opportunities - calls, emails, meetings, tasks, notes, etc.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { getTenantId } from '../../tenant/tenant.context';

// ============================================================================
// TYPES
// ============================================================================

export type ActivityType =
  | 'CALL'
  | 'EMAIL'
  | 'MEETING'
  | 'TASK'
  | 'NOTE'
  | 'SMS'
  | 'LINKEDIN_MESSAGE'
  | 'CHAT'
  | 'DEMO'
  | 'PROPOSAL'
  | 'CONTRACT'
  | 'OTHER';

export type ActivityStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type ActivityPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface CreateActivityInput {
  type: ActivityType;
  accountId?: number;
  contactId?: number;
  opportunityId?: number;
  subject?: string;
  description?: string;
  outcome?: string;
  scheduledAt?: Date;
  dueAt?: Date;
  duration?: number; // minutes
  status?: ActivityStatus;
  priority?: ActivityPriority;
  externalId?: string;
  externalSource?: string;
  ownerId: number;
  createdById: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateActivityInput {
  type?: ActivityType;
  accountId?: number | null;
  contactId?: number | null;
  opportunityId?: number | null;
  subject?: string;
  description?: string;
  outcome?: string;
  scheduledAt?: Date | null;
  dueAt?: Date | null;
  completedAt?: Date | null;
  duration?: number;
  status?: ActivityStatus;
  priority?: ActivityPriority;
  ownerId?: number;
  metadata?: Record<string, unknown>;
}

export interface ActivityFilters {
  type?: ActivityType | ActivityType[];
  status?: ActivityStatus | ActivityStatus[];
  priority?: ActivityPriority;
  accountId?: number;
  contactId?: number;
  opportunityId?: number;
  ownerId?: number;
  scheduledFrom?: Date;
  scheduledTo?: Date;
  dueFrom?: Date;
  dueTo?: Date;
  search?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Create a new activity.
 */
export async function createActivity(input: CreateActivityInput) {
  const tenantId = getTenantId();

  return prisma.cRMActivity.create({
    data: {
      tenantId,
      type: input.type,
      accountId: input.accountId,
      contactId: input.contactId,
      opportunityId: input.opportunityId,
      subject: input.subject,
      description: input.description,
      outcome: input.outcome,
      scheduledAt: input.scheduledAt,
      dueAt: input.dueAt,
      duration: input.duration,
      status: input.status || 'PLANNED',
      priority: input.priority || 'NORMAL',
      externalId: input.externalId,
      externalSource: input.externalSource,
      ownerId: input.ownerId,
      createdById: input.createdById,
      metadata: input.metadata as Prisma.InputJsonValue,
    },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      account: { select: { id: true, name: true } },
      contact: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      opportunity: { select: { id: true, name: true } },
    },
  });
}

/**
 * Get activity by ID.
 */
export async function getActivityById(id: number) {
  const tenantId = getTenantId();

  return prisma.cRMActivity.findFirst({
    where: { id, tenantId },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      account: {
        select: { id: true, name: true, website: true, industry: true },
      },
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          jobTitle: true,
          phone: true,
        },
      },
      opportunity: {
        select: { id: true, name: true, amount: true, status: true },
        include: { stage: { select: { id: true, name: true, color: true } } },
      },
    },
  });
}

/**
 * List activities with filtering and pagination.
 */
export async function listActivities(
  filters: ActivityFilters = {},
  pagination: PaginationOptions = {},
) {
  const tenantId = getTenantId();
  const page = pagination.page || 1;
  const limit = Math.min(pagination.limit || 50, 100);
  const skip = (page - 1) * limit;
  const sortBy = pagination.sortBy || 'createdAt';
  const sortOrder = pagination.sortOrder || 'desc';

  // Build where clause
  const where: Prisma.CRMActivityWhereInput = { tenantId };

  if (filters.type) {
    if (Array.isArray(filters.type)) {
      where.type = { in: filters.type };
    } else {
      where.type = filters.type;
    }
  }

  if (filters.status) {
    if (Array.isArray(filters.status)) {
      where.status = { in: filters.status };
    } else {
      where.status = filters.status;
    }
  }

  if (filters.priority) {
    where.priority = filters.priority;
  }

  if (filters.accountId) {
    where.accountId = filters.accountId;
  }

  if (filters.contactId) {
    where.contactId = filters.contactId;
  }

  if (filters.opportunityId) {
    where.opportunityId = filters.opportunityId;
  }

  if (filters.ownerId) {
    where.ownerId = filters.ownerId;
  }

  if (filters.scheduledFrom || filters.scheduledTo) {
    where.scheduledAt = {
      gte: filters.scheduledFrom,
      lte: filters.scheduledTo,
    };
  }

  if (filters.dueFrom || filters.dueTo) {
    where.dueAt = {
      gte: filters.dueFrom,
      lte: filters.dueTo,
    };
  }

  if (filters.search) {
    where.OR = [
      { subject: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
      { outcome: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  // Execute query with count
  const [activities, total] = await Promise.all([
    prisma.cRMActivity.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        owner: { select: { id: true, name: true } },
        account: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        opportunity: { select: { id: true, name: true } },
      },
    }),
    prisma.cRMActivity.count({ where }),
  ]);

  return {
    data: activities,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Update an activity.
 */
export async function updateActivity(id: number, input: UpdateActivityInput) {
  const tenantId = getTenantId();

  return prisma.cRMActivity.update({
    where: { id, tenantId },
    data: {
      type: input.type,
      accountId: input.accountId,
      contactId: input.contactId,
      opportunityId: input.opportunityId,
      subject: input.subject,
      description: input.description,
      outcome: input.outcome,
      scheduledAt: input.scheduledAt,
      dueAt: input.dueAt,
      completedAt: input.completedAt,
      duration: input.duration,
      status: input.status,
      priority: input.priority,
      ownerId: input.ownerId,
      metadata: input.metadata as Prisma.InputJsonValue,
    },
    include: {
      owner: { select: { id: true, name: true } },
      account: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      opportunity: { select: { id: true, name: true } },
    },
  });
}

/**
 * Complete an activity.
 */
export async function completeActivity(id: number, outcome?: string) {
  const tenantId = getTenantId();

  return prisma.cRMActivity.update({
    where: { id, tenantId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      outcome,
    },
  });
}

/**
 * Cancel an activity.
 */
export async function cancelActivity(id: number) {
  const tenantId = getTenantId();

  return prisma.cRMActivity.update({
    where: { id, tenantId },
    data: {
      status: 'CANCELLED',
    },
  });
}

/**
 * Delete an activity.
 */
export async function deleteActivity(id: number) {
  const tenantId = getTenantId();

  return prisma.cRMActivity.delete({
    where: { id, tenantId },
  });
}

// ============================================================================
// TIMELINE QUERIES
// ============================================================================

/**
 * Get unified timeline for an entity (account, contact, or opportunity).
 */
export async function getEntityTimeline(
  entityType: 'account' | 'contact' | 'opportunity',
  entityId: number,
  options: { limit?: number; offset?: number } = {},
) {
  const tenantId = getTenantId();
  const limit = options.limit || 20;
  const offset = options.offset || 0;

  const where: Prisma.CRMActivityWhereInput = { tenantId };

  switch (entityType) {
    case 'account':
      where.accountId = entityId;
      break;
    case 'contact':
      where.contactId = entityId;
      break;
    case 'opportunity':
      where.opportunityId = entityId;
      break;
  }

  return prisma.cRMActivity.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limit,
    include: {
      owner: { select: { id: true, name: true } },
      account: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      opportunity: { select: { id: true, name: true } },
    },
  });
}

/**
 * Get upcoming activities for the current user.
 */
export async function getMyUpcomingActivities(
  userId: number,
  options: { limit?: number; days?: number } = {},
) {
  const tenantId = getTenantId();
  const limit = options.limit || 10;
  const days = options.days || 7;

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  return prisma.cRMActivity.findMany({
    where: {
      tenantId,
      ownerId: userId,
      status: { in: ['PLANNED', 'IN_PROGRESS'] },
      OR: [
        {
          scheduledAt: {
            gte: new Date(),
            lte: futureDate,
          },
        },
        {
          dueAt: {
            gte: new Date(),
            lte: futureDate,
          },
        },
      ],
    },
    orderBy: [
      { dueAt: { sort: 'asc', nulls: 'last' } },
      { scheduledAt: { sort: 'asc', nulls: 'last' } },
    ],
    take: limit,
    include: {
      account: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      opportunity: { select: { id: true, name: true } },
    },
  });
}

/**
 * Get overdue activities for the current user.
 */
export async function getMyOverdueActivities(
  userId: number,
  options: { limit?: number } = {},
) {
  const tenantId = getTenantId();
  const limit = options.limit || 10;

  return prisma.cRMActivity.findMany({
    where: {
      tenantId,
      ownerId: userId,
      status: { in: ['PLANNED', 'IN_PROGRESS'] },
      dueAt: {
        lt: new Date(),
      },
    },
    orderBy: { dueAt: 'asc' },
    take: limit,
    include: {
      account: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      opportunity: { select: { id: true, name: true } },
    },
  });
}

// ============================================================================
// ACTIVITY STATS
// ============================================================================

/**
 * Get activity statistics for dashboard.
 */
export async function getActivityStats(
  filters: { userId?: number; dateFrom?: Date; dateTo?: Date } = {},
) {
  const tenantId = getTenantId();

  const where: Prisma.CRMActivityWhereInput = {
    tenantId,
    ownerId: filters.userId,
  };

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {
      gte: filters.dateFrom,
      lte: filters.dateTo,
    };
  }

  const [totalCount, byType, byStatus, completedThisWeek, overdueCount] =
    await Promise.all([
      // Total count
      prisma.cRMActivity.count({ where }),

      // By type
      prisma.cRMActivity.groupBy({
        by: ['type'],
        where,
        _count: true,
      }),

      // By status
      prisma.cRMActivity.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),

      // Completed this week
      prisma.cRMActivity.count({
        where: {
          ...where,
          status: 'COMPLETED',
          completedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Overdue
      prisma.cRMActivity.count({
        where: {
          ...where,
          status: { in: ['PLANNED', 'IN_PROGRESS'] },
          dueAt: { lt: new Date() },
        },
      }),
    ]);

  return {
    total: totalCount,
    byType,
    byStatus,
    completedThisWeek,
    overdue: overdueCount,
  };
}

// ============================================================================
// LOG ACTIVITY HELPERS
// ============================================================================

/**
 * Quick log a call activity.
 */
export async function logCall(
  accountId: number,
  userId: number,
  options: {
    contactId?: number;
    opportunityId?: number;
    subject?: string;
    description?: string;
    outcome?: string;
    duration?: number;
  } = {},
) {
  return createActivity({
    type: 'CALL',
    accountId,
    contactId: options.contactId,
    opportunityId: options.opportunityId,
    subject: options.subject || 'Phone Call',
    description: options.description,
    outcome: options.outcome,
    duration: options.duration,
    status: 'COMPLETED',
    completedAt: new Date(),
    ownerId: userId,
    createdById: userId,
  } as CreateActivityInput & { completedAt: Date });
}

/**
 * Quick log an email activity.
 */
export async function logEmail(
  accountId: number,
  userId: number,
  options: {
    contactId?: number;
    opportunityId?: number;
    subject?: string;
    description?: string;
    externalId?: string;
  } = {},
) {
  return createActivity({
    type: 'EMAIL',
    accountId,
    contactId: options.contactId,
    opportunityId: options.opportunityId,
    subject: options.subject || 'Email',
    description: options.description,
    status: 'COMPLETED',
    externalId: options.externalId,
    externalSource: 'email',
    ownerId: userId,
    createdById: userId,
  });
}

/**
 * Quick log a note.
 */
export async function logNote(
  accountId: number,
  userId: number,
  description: string,
  options: {
    contactId?: number;
    opportunityId?: number;
    subject?: string;
  } = {},
) {
  return createActivity({
    type: 'NOTE',
    accountId,
    contactId: options.contactId,
    opportunityId: options.opportunityId,
    subject: options.subject || 'Note',
    description,
    status: 'COMPLETED',
    ownerId: userId,
    createdById: userId,
  });
}
