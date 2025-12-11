/**
 * Report Builder Service
 *
 * Custom report generation and scheduling.
 */

import { prisma } from '../prisma/client';
import type {
  ReportConfig,
  ReportColumn,
  ReportFilter,
  ExportOptions,
} from '../analytics/analytics.types';

// ============================================================================
// REPORT GENERATION
// ============================================================================

/**
 * Execute a report and return data.
 */
export async function executeReport(
  tenantId: string,
  config: ReportConfig,
): Promise<{
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
  total: number;
}> {
  const { entity, columns, filters, sortBy, groupBy } = config;

  // Build base query
  const whereClause = buildWhereClause(tenantId, filters);

  // Execute query based on entity
  let rows: Record<string, unknown>[] = [];
  let total = 0;

  switch (entity) {
    case 'opportunities':
      rows = await queryOpportunities(whereClause, columns, sortBy);
      total = await prisma.opportunity.count({ where: whereClause });
      break;

    case 'accounts':
      rows = await queryAccounts(whereClause, columns, sortBy);
      total = await prisma.account.count({ where: whereClause });
      break;

    case 'contacts':
      rows = await queryContacts(whereClause, columns, sortBy);
      total = await prisma.cRMContact.count({ where: whereClause });
      break;

    case 'activities':
      rows = await queryActivities(whereClause, columns, sortBy);
      total = await prisma.cRMActivity.count({ where: whereClause });
      break;

    default:
      throw new Error(`Unsupported entity: ${entity}`);
  }

  // Apply grouping if specified
  if (groupBy && groupBy.length > 0) {
    rows = groupRows(rows, groupBy, columns);
  }

  return { columns, rows, total };
}

/**
 * Query opportunities.
 */
async function queryOpportunities(
  whereClause: Record<string, unknown>,
  columns: ReportColumn[],
  sortBy?: { column: string; direction: 'ASC' | 'DESC' },
) {
  const select = buildSelectClause(columns);

  const opportunities = await prisma.opportunity.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      amount: true,
      probability: true,
      weightedAmount: true,
      status: true,
      expectedCloseDate: true,
      closedAt: true,
      leadSource: true,
      createdAt: true,
      account: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
      stage: { select: { id: true, name: true } },
    },
    orderBy: sortBy
      ? { [sortBy.column]: sortBy.direction.toLowerCase() }
      : { createdAt: 'desc' },
    take: 1000,
  });

  return opportunities.map((opp) => ({
    id: opp.id,
    name: opp.name,
    amount: opp.amount,
    probability: opp.probability,
    weightedAmount: opp.weightedAmount,
    status: opp.status,
    expectedCloseDate: opp.expectedCloseDate,
    closedAt: opp.closedAt,
    leadSource: opp.leadSource,
    createdAt: opp.createdAt,
    accountName: opp.account?.name,
    ownerName: opp.owner?.name,
    stageName: opp.stage?.name,
  }));
}

/**
 * Query accounts.
 */
async function queryAccounts(
  whereClause: Record<string, unknown>,
  columns: ReportColumn[],
  sortBy?: { column: string; direction: 'ASC' | 'DESC' },
) {
  const accounts = await prisma.account.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      type: true,
      industry: true,
      website: true,
      phone: true,
      employeeCount: true,
      annualRevenue: true,
      healthScore: true,
      engagementScore: true,
      churnRisk: true,
      createdAt: true,
      owner: { select: { id: true, name: true } },
      _count: { select: { opportunities: true, contacts: true } },
    },
    orderBy: sortBy
      ? { [sortBy.column]: sortBy.direction.toLowerCase() }
      : { createdAt: 'desc' },
    take: 1000,
  });

  return accounts.map((acc) => ({
    id: acc.id,
    name: acc.name,
    type: acc.type,
    industry: acc.industry,
    website: acc.website,
    phone: acc.phone,
    employeeCount: acc.employeeCount,
    annualRevenue: acc.annualRevenue,
    healthScore: acc.healthScore,
    engagementScore: acc.engagementScore,
    churnRisk: acc.churnRisk,
    createdAt: acc.createdAt,
    ownerName: acc.owner?.name,
    opportunityCount: acc._count.opportunities,
    contactCount: acc._count.contacts,
  }));
}

/**
 * Query contacts.
 */
async function queryContacts(
  whereClause: Record<string, unknown>,
  columns: ReportColumn[],
  sortBy?: { column: string; direction: 'ASC' | 'DESC' },
) {
  const contacts = await prisma.cRMContact.findMany({
    where: whereClause,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      jobTitle: true,
      lifecycle: true,
      leadScore: true,
      createdAt: true,
      account: { select: { id: true, name: true } },
    },
    orderBy: sortBy
      ? { [sortBy.column]: sortBy.direction.toLowerCase() }
      : { createdAt: 'desc' },
    take: 1000,
  });

  return contacts.map((contact) => ({
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    fullName: `${contact.firstName} ${contact.lastName}`,
    email: contact.email,
    phone: contact.phone,
    jobTitle: contact.jobTitle,
    lifecycle: contact.lifecycle,
    leadScore: contact.leadScore,
    createdAt: contact.createdAt,
    accountName: contact.account?.name,
  }));
}

/**
 * Query activities.
 */
async function queryActivities(
  whereClause: Record<string, unknown>,
  columns: ReportColumn[],
  sortBy?: { column: string; direction: 'ASC' | 'DESC' },
) {
  const activities = await prisma.cRMActivity.findMany({
    where: whereClause,
    select: {
      id: true,
      type: true,
      subject: true,
      status: true,
      priority: true,
      dueDate: true,
      completedAt: true,
      createdAt: true,
      account: { select: { id: true, name: true } },
      contact: { select: { id: true, firstName: true, lastName: true } },
      opportunity: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
    },
    orderBy: sortBy
      ? { [sortBy.column]: sortBy.direction.toLowerCase() }
      : { createdAt: 'desc' },
    take: 1000,
  });

  return activities.map((activity) => ({
    id: activity.id,
    type: activity.type,
    subject: activity.subject,
    status: activity.status,
    priority: activity.priority,
    dueDate: activity.dueDate,
    completedAt: activity.completedAt,
    createdAt: activity.createdAt,
    accountName: activity.account?.name,
    contactName: activity.contact
      ? `${activity.contact.firstName} ${activity.contact.lastName}`
      : null,
    opportunityName: activity.opportunity?.name,
    ownerName: activity.owner?.name,
  }));
}

// ============================================================================
// SAVED REPORTS
// ============================================================================

/**
 * Save a report configuration.
 */
export async function saveReport(
  tenantId: string,
  userId: number,
  config: Omit<ReportConfig, 'id'>,
): Promise<ReportConfig> {
  const report = await prisma.savedReport.create({
    data: {
      tenantId,
      createdById: userId,
      name: config.name,
      description: config.description,
      type: config.type,
      entity: config.entity,
      config: {
        columns: config.columns,
        filters: config.filters,
        sortBy: config.sortBy,
        groupBy: config.groupBy,
        schedule: config.schedule,
      },
    },
  });

  return {
    id: report.id.toString(),
    ...config,
  };
}

/**
 * Get saved reports for a tenant.
 */
export async function getSavedReports(tenantId: string) {
  const reports = await prisma.savedReport.findMany({
    where: { tenantId },
    orderBy: { updatedAt: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  return reports.map((r) => ({
    id: r.id.toString(),
    name: r.name,
    description: r.description,
    type: r.type,
    entity: r.entity,
    createdBy: r.createdBy.name,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

/**
 * Get a saved report by ID.
 */
export async function getSavedReport(
  reportId: number,
  tenantId: string,
): Promise<ReportConfig | null> {
  const report = await prisma.savedReport.findFirst({
    where: { id: reportId, tenantId },
  });

  if (!report) return null;

  const config = report.config as Record<string, unknown>;

  return {
    id: report.id.toString(),
    name: report.name,
    description: report.description || undefined,
    type: report.type as 'STANDARD' | 'CUSTOM',
    entity: report.entity,
    columns: config.columns as ReportColumn[],
    filters: config.filters as ReportFilter[],
    sortBy: config.sortBy as
      | { column: string; direction: 'ASC' | 'DESC' }
      | undefined,
    groupBy: config.groupBy as string[] | undefined,
    schedule: config.schedule as ReportConfig['schedule'] | undefined,
  };
}

/**
 * Delete a saved report.
 */
export async function deleteSavedReport(
  reportId: number,
  tenantId: string,
): Promise<void> {
  await prisma.savedReport.deleteMany({
    where: { id: reportId, tenantId },
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build WHERE clause from filters.
 */
function buildWhereClause(
  tenantId: string,
  filters: ReportFilter[],
): Record<string, unknown> {
  const where: Record<string, unknown> = { tenantId };

  for (const filter of filters) {
    const { field, operator, value } = filter;

    switch (operator) {
      case 'EQUALS':
        where[field] = value;
        break;
      case 'NOT_EQUALS':
        where[field] = { not: value };
        break;
      case 'CONTAINS':
        where[field] = { contains: value, mode: 'insensitive' };
        break;
      case 'GT':
        where[field] = { gt: value };
        break;
      case 'GTE':
        where[field] = { gte: value };
        break;
      case 'LT':
        where[field] = { lt: value };
        break;
      case 'LTE':
        where[field] = { lte: value };
        break;
      case 'BETWEEN':
        if (Array.isArray(value) && value.length === 2) {
          where[field] = { gte: value[0], lte: value[1] };
        }
        break;
      case 'IN':
        where[field] = { in: value };
        break;
    }
  }

  return where;
}

/**
 * Build SELECT clause from columns.
 */
function buildSelectClause(columns: ReportColumn[]): Record<string, boolean> {
  const select: Record<string, boolean> = { id: true };

  for (const column of columns) {
    select[column.field] = true;
  }

  return select;
}

/**
 * Group rows by specified fields.
 */
function groupRows(
  rows: Record<string, unknown>[],
  groupBy: string[],
  columns: ReportColumn[],
): Record<string, unknown>[] {
  const groups = new Map<string, Record<string, unknown>[]>();

  for (const row of rows) {
    const key = groupBy.map((field) => String(row[field])).join('|');

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  }

  return Array.from(groups.entries()).map(([key, groupRows]) => {
    const result: Record<string, unknown> = {};

    // Set group by values
    const keyParts = key.split('|');
    groupBy.forEach((field, index) => {
      result[field] = keyParts[index];
    });

    // Calculate aggregations
    for (const column of columns) {
      if (column.aggregation) {
        const values = groupRows
          .map((r) => r[column.field])
          .filter((v) => v !== null && v !== undefined)
          .map((v) => Number(v));

        switch (column.aggregation) {
          case 'COUNT':
            result[column.field] = values.length;
            break;
          case 'SUM':
            result[column.field] = values.reduce((a, b) => a + b, 0);
            break;
          case 'AVG':
            result[column.field] =
              values.length > 0
                ? values.reduce((a, b) => a + b, 0) / values.length
                : 0;
            break;
          case 'MIN':
            result[column.field] =
              values.length > 0 ? Math.min(...values) : null;
            break;
          case 'MAX':
            result[column.field] =
              values.length > 0 ? Math.max(...values) : null;
            break;
        }
      }
    }

    result._count = groupRows.length;
    return result;
  });
}
