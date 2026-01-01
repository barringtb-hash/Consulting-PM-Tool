import { prisma } from '../../prisma/client';
import { getTenantId, hasTenantContext } from '../../tenant/tenant.context';
import {
  Prisma,
  IssueStatus,
  IssuePriority,
  IssueType,
  IssueSource,
} from '@prisma/client';
import {
  CreateIssueInput,
  UpdateIssueInput,
  IssueFilters,
  PaginationOptions,
  CreateLabelInput,
  UpdateLabelInput,
  CreateCommentInput,
  IssueStats,
} from './types';

// ============================================================================
// ISSUE CRUD OPERATIONS
// ============================================================================

/**
 * Create a new issue
 */
export async function createIssue(
  input: CreateIssueInput,
  reportedById?: number,
) {
  const tenantId = hasTenantContext() ? getTenantId() : null;
  const { labelIds, ...issueData } = input;

  const issue = await prisma.issue.create({
    data: {
      ...issueData,
      tenantId,
      reportedById,
      labels: labelIds?.length
        ? { connect: labelIds.map((id) => ({ id })) }
        : undefined,
    },
    include: {
      tenant: { select: { id: true, name: true } },
      reportedBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      labels: true,
      project: { select: { id: true, name: true } },
      account: { select: { id: true, name: true } },
      _count: {
        select: { comments: true, attachments: true, errorLogs: true },
      },
    },
  });

  // Add system comment for issue creation
  if (reportedById) {
    await addSystemComment(issue.id, `Issue created by user`);
  }

  return issue;
}

/**
 * Get issue by ID
 */
export async function getIssueById(id: number) {
  const tenantId = hasTenantContext() ? getTenantId() : null;

  const where: Prisma.IssueWhereInput = { id };
  if (tenantId) {
    where.tenantId = tenantId;
  }

  return prisma.issue.findFirst({
    where,
    include: {
      tenant: { select: { id: true, name: true } },
      reportedBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      labels: true,
      project: { select: { id: true, name: true } },
      account: { select: { id: true, name: true } },
      comments: {
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      attachments: true,
      errorLogs: {
        take: 10,
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: { comments: true, attachments: true, errorLogs: true },
      },
    },
  });
}

/**
 * List issues with filters and pagination
 */
export async function listIssues(
  filters: IssueFilters = {},
  pagination: PaginationOptions = {},
) {
  const tenantId = hasTenantContext() ? getTenantId() : null;
  const {
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = pagination;

  const where: Prisma.IssueWhereInput = {};

  if (tenantId) {
    where.tenantId = tenantId;
  }

  // Apply filters
  if (filters.status) {
    where.status = Array.isArray(filters.status)
      ? { in: filters.status }
      : filters.status;
  } else if (!filters.includeClosed) {
    // By default, exclude CLOSED and WONT_FIX issues unless explicitly requested
    where.status = { notIn: ['CLOSED', 'WONT_FIX'] };
  }
  if (filters.priority) {
    where.priority = Array.isArray(filters.priority)
      ? { in: filters.priority }
      : filters.priority;
  }
  if (filters.type) {
    where.type = Array.isArray(filters.type)
      ? { in: filters.type }
      : filters.type;
  }
  if (filters.source) {
    where.source = Array.isArray(filters.source)
      ? { in: filters.source }
      : filters.source;
  }
  if (filters.assignedToId !== undefined) {
    where.assignedToId = filters.assignedToId;
  }
  if (filters.reportedById) {
    where.reportedById = filters.reportedById;
  }
  if (filters.projectId) {
    where.projectId = filters.projectId;
  }
  if (filters.accountId) {
    where.accountId = filters.accountId;
  }
  if (filters.module) {
    where.module = filters.module;
  }
  if (filters.labelIds?.length) {
    where.labels = { some: { id: { in: filters.labelIds } } };
  }
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.createdAfter) {
    where.createdAt = {
      ...(where.createdAt as object),
      gte: filters.createdAfter,
    };
  }
  if (filters.createdBefore) {
    where.createdAt = {
      ...(where.createdAt as object),
      lte: filters.createdBefore,
    };
  }

  const [issues, total] = await Promise.all([
    prisma.issue.findMany({
      where,
      include: {
        tenant: { select: { id: true, name: true } },
        reportedBy: { select: { id: true, name: true, email: true } },
        assignedTo: { select: { id: true, name: true, email: true } },
        labels: true,
        project: { select: { id: true, name: true } },
        account: { select: { id: true, name: true } },
        _count: {
          select: { comments: true, attachments: true, errorLogs: true },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.issue.count({ where }),
  ]);

  return {
    data: issues,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Update an issue
 */
export async function updateIssue(
  id: number,
  input: UpdateIssueInput,
  _updatedById?: number,
) {
  const tenantId = hasTenantContext() ? getTenantId() : null;
  const { labelIds, ...updateData } = input;

  // Verify issue exists and belongs to tenant
  const existing = await prisma.issue.findFirst({
    where: tenantId ? { id, tenantId } : { id },
    select: { id: true, status: true, assignedToId: true },
  });

  if (!existing) {
    throw new Error('Issue not found');
  }

  // Track changes for system comments
  const changes: string[] = [];
  if (input.status && input.status !== existing.status) {
    changes.push(`Status changed from ${existing.status} to ${input.status}`);
  }
  if (
    input.assignedToId !== undefined &&
    input.assignedToId !== existing.assignedToId
  ) {
    changes.push(
      input.assignedToId
        ? `Assigned to user #${input.assignedToId}`
        : 'Unassigned',
    );
  }

  const issue = await prisma.issue.update({
    where: { id },
    data: {
      ...updateData,
      labels: labelIds
        ? { set: labelIds.map((labelId) => ({ id: labelId })) }
        : undefined,
      resolvedAt:
        input.status === 'RESOLVED' || input.status === 'CLOSED'
          ? new Date()
          : undefined,
      closedAt: input.status === 'CLOSED' ? new Date() : undefined,
    },
    include: {
      tenant: { select: { id: true, name: true } },
      reportedBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      labels: true,
      project: { select: { id: true, name: true } },
      account: { select: { id: true, name: true } },
      _count: {
        select: { comments: true, attachments: true, errorLogs: true },
      },
    },
  });

  // Add system comments for changes
  for (const change of changes) {
    await addSystemComment(id, change);
  }

  return issue;
}

/**
 * Delete an issue
 */
export async function deleteIssue(id: number) {
  const tenantId = hasTenantContext() ? getTenantId() : null;

  // Verify issue exists and belongs to tenant
  const existing = await prisma.issue.findFirst({
    where: tenantId ? { id, tenantId } : { id },
    select: { id: true },
  });

  if (!existing) {
    throw new Error('Issue not found');
  }

  await prisma.issue.delete({ where: { id } });
}

/**
 * Assign issue to a user
 */
export async function assignIssue(id: number, assignedToId: number | null) {
  return updateIssue(id, { assignedToId });
}

/**
 * Change issue status
 */
export async function changeIssueStatus(id: number, status: IssueStatus) {
  return updateIssue(id, { status });
}

// ============================================================================
// LABEL OPERATIONS
// ============================================================================

/**
 * Create a label
 */
export async function createLabel(input: CreateLabelInput) {
  const tenantId = hasTenantContext() ? getTenantId() : null;

  return prisma.issueLabel.create({
    data: {
      ...input,
      tenantId,
    },
  });
}

/**
 * List labels
 */
export async function listLabels() {
  const tenantId = hasTenantContext() ? getTenantId() : null;

  return prisma.issueLabel.findMany({
    where: tenantId ? { tenantId } : {},
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { issues: true } },
    },
  });
}

/**
 * Update a label
 */
export async function updateLabel(id: number, input: UpdateLabelInput) {
  const tenantId = hasTenantContext() ? getTenantId() : null;

  const existing = await prisma.issueLabel.findFirst({
    where: tenantId ? { id, tenantId } : { id },
  });

  if (!existing) {
    throw new Error('Label not found');
  }

  return prisma.issueLabel.update({
    where: { id },
    data: input,
  });
}

/**
 * Delete a label
 */
export async function deleteLabel(id: number) {
  const tenantId = hasTenantContext() ? getTenantId() : null;

  const existing = await prisma.issueLabel.findFirst({
    where: tenantId ? { id, tenantId } : { id },
  });

  if (!existing) {
    throw new Error('Label not found');
  }

  await prisma.issueLabel.delete({ where: { id } });
}

// ============================================================================
// COMMENT OPERATIONS
// ============================================================================

/**
 * Add a comment to an issue
 */
export async function addComment(
  issueId: number,
  input: CreateCommentInput,
  userId?: number,
) {
  const tenantId = hasTenantContext() ? getTenantId() : null;

  // Verify issue exists
  const issue = await prisma.issue.findFirst({
    where: tenantId ? { id: issueId, tenantId } : { id: issueId },
  });

  if (!issue) {
    throw new Error('Issue not found');
  }

  return prisma.issueComment.create({
    data: {
      issueId,
      userId,
      content: input.content,
      isSystem: input.isSystem || false,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
}

/**
 * Add a system-generated comment
 */
async function addSystemComment(issueId: number, content: string) {
  return prisma.issueComment.create({
    data: {
      issueId,
      content,
      isSystem: true,
    },
  });
}

/**
 * List comments for an issue
 */
export async function listComments(issueId: number) {
  return prisma.issueComment.findMany({
    where: { issueId },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Delete a comment
 */
export async function deleteComment(id: number, userId?: number) {
  const comment = await prisma.issueComment.findUnique({
    where: { id },
  });

  if (!comment) {
    throw new Error('Comment not found');
  }

  // Only allow deleting own comments (unless system comment)
  if (comment.userId && userId && comment.userId !== userId) {
    throw new Error("Cannot delete other user's comments");
  }

  // Don't allow deleting system comments
  if (comment.isSystem) {
    throw new Error('Cannot delete system comments');
  }

  await prisma.issueComment.delete({ where: { id } });
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get issue statistics
 */
export async function getIssueStats(): Promise<IssueStats> {
  const tenantId = hasTenantContext() ? getTenantId() : null;
  const where: Prisma.IssueWhereInput = tenantId ? { tenantId } : {};

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    total,
    byStatus,
    byPriority,
    byType,
    bySource,
    resolvedToday,
    createdToday,
    _avgResolutionTime,
  ] = await Promise.all([
    prisma.issue.count({ where }),
    prisma.issue.groupBy({
      by: ['status'],
      where,
      _count: true,
    }),
    prisma.issue.groupBy({
      by: ['priority'],
      where,
      _count: true,
    }),
    prisma.issue.groupBy({
      by: ['type'],
      where,
      _count: true,
    }),
    prisma.issue.groupBy({
      by: ['source'],
      where,
      _count: true,
    }),
    prisma.issue.count({
      where: {
        ...where,
        resolvedAt: { gte: today },
      },
    }),
    prisma.issue.count({
      where: {
        ...where,
        createdAt: { gte: today },
      },
    }),
    prisma.issue.aggregate({
      where: {
        ...where,
        resolvedAt: { not: null },
      },
      _avg: {
        // This is a workaround - Prisma doesn't directly support date diff
        // We'll calculate this manually below
        id: true,
      },
    }),
  ]);

  // Calculate average resolution time manually
  const resolvedIssues = await prisma.issue.findMany({
    where: {
      ...where,
      resolvedAt: { not: null },
    },
    select: {
      createdAt: true,
      resolvedAt: true,
    },
    take: 100, // Sample for performance
    orderBy: { resolvedAt: 'desc' },
  });

  let avgResolutionTimeHours: number | null = null;
  if (resolvedIssues.length > 0) {
    const totalHours = resolvedIssues.reduce((sum, issue) => {
      const diff = issue.resolvedAt!.getTime() - issue.createdAt.getTime();
      return sum + diff / (1000 * 60 * 60);
    }, 0);
    avgResolutionTimeHours = Math.round(totalHours / resolvedIssues.length);
  }

  // Convert grouped results to records
  const statusRecord = Object.values(IssueStatus).reduce(
    (acc, status) => ({ ...acc, [status]: 0 }),
    {} as Record<IssueStatus, number>,
  );
  byStatus.forEach((s) => {
    statusRecord[s.status] = s._count;
  });

  const priorityRecord = Object.values(IssuePriority).reduce(
    (acc, priority) => ({ ...acc, [priority]: 0 }),
    {} as Record<IssuePriority, number>,
  );
  byPriority.forEach((p) => {
    priorityRecord[p.priority] = p._count;
  });

  const typeRecord = Object.values(IssueType).reduce(
    (acc, type) => ({ ...acc, [type]: 0 }),
    {} as Record<IssueType, number>,
  );
  byType.forEach((t) => {
    typeRecord[t.type] = t._count;
  });

  const sourceRecord = Object.values(IssueSource).reduce(
    (acc, source) => ({ ...acc, [source]: 0 }),
    {} as Record<IssueSource, number>,
  );
  bySource.forEach((s) => {
    sourceRecord[s.source] = s._count;
  });

  const openCount =
    (statusRecord.OPEN || 0) +
    (statusRecord.TRIAGING || 0) +
    (statusRecord.IN_PROGRESS || 0) +
    (statusRecord.IN_REVIEW || 0);

  return {
    total,
    byStatus: statusRecord,
    byPriority: priorityRecord,
    byType: typeRecord,
    bySource: sourceRecord,
    openCount,
    resolvedToday,
    createdToday,
    avgResolutionTimeHours,
  };
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk update issue status
 */
export async function bulkUpdateStatus(
  issueIds: number[],
  status: IssueStatus,
) {
  const tenantId = hasTenantContext() ? getTenantId() : null;

  const updateData: Prisma.IssueUpdateManyMutationInput = {
    status,
    resolvedAt:
      status === 'RESOLVED' || status === 'CLOSED' ? new Date() : undefined,
    closedAt: status === 'CLOSED' ? new Date() : undefined,
  };

  return prisma.issue.updateMany({
    where: tenantId
      ? { id: { in: issueIds }, tenantId }
      : { id: { in: issueIds } },
    data: updateData,
  });
}

/**
 * Bulk assign issues
 */
export async function bulkAssign(
  issueIds: number[],
  assignedToId: number | null,
) {
  const tenantId = hasTenantContext() ? getTenantId() : null;

  return prisma.issue.updateMany({
    where: tenantId
      ? { id: { in: issueIds }, tenantId }
      : { id: { in: issueIds } },
    data: { assignedToId },
  });
}

/**
 * Bulk add labels to issues
 */
export async function bulkAddLabels(issueIds: number[], labelIds: number[]) {
  const tenantId = hasTenantContext() ? getTenantId() : null;

  // Verify issues belong to tenant
  const issues = await prisma.issue.findMany({
    where: tenantId
      ? { id: { in: issueIds }, tenantId }
      : { id: { in: issueIds } },
    select: { id: true },
  });

  const validIds = issues.map((i) => i.id);

  // Update each issue with new labels
  await Promise.all(
    validIds.map((id) =>
      prisma.issue.update({
        where: { id },
        data: {
          labels: {
            connect: labelIds.map((labelId) => ({ id: labelId })),
          },
        },
      }),
    ),
  );

  return { updated: validIds.length };
}
