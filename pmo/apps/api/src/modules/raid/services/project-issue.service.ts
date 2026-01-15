/**
 * Project Issue Service
 *
 * Provides CRUD operations and business logic for Project Issues.
 * Issues are current problems that are actively affecting the project,
 * distinct from risks (future uncertainties).
 *
 * @module modules/raid/services
 */

import { prisma } from '../../../prisma/client';
import { getTenantId, hasTenantContext } from '../../../tenant/tenant.context';
import { hasProjectAccess } from '../../../utils/project-access';
import type {
  CreateProjectIssueInput,
  UpdateProjectIssueInput,
  ProjectIssueFilters,
  EscalateIssueInput,
} from '../validation/raid.schema';
import type {
  ProjectIssueStatus,
  ProjectIssueSeverity,
  Prisma,
} from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Project Issue data shape returned from the service.
 * Matches the database schema for ProjectIssue table.
 */
export interface ProjectIssue {
  id: number;
  tenantId: string | null;
  projectId: number;
  sourceType: string;
  sourceMeetingId: number | null;
  title: string;
  description: string;
  affectedAreas: string[];
  severity: string;
  impact: string | null;
  status: string;
  reportedById: number | null;
  reportedByName: string | null;
  ownerId: number | null;
  resolvedById: number | null;
  escalationLevel: number;
  resolution: string | null;
  resolvedAt: Date | null;
  identifiedDate: Date;
  targetResolutionDate: Date | null;
  relatedRiskId: number | null;
  sourceText: string | null;
  confidence: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service result type for single item operations
 */
type ProjectIssueResult =
  | { issue: ProjectIssue }
  | {
      error:
        | 'not_found'
        | 'forbidden'
        | 'validation_error'
        | 'database_error'
        | 'max_escalation';
    };

/**
 * Service result type for list operations
 */
type ProjectIssueListResult =
  | { issues: ProjectIssue[]; total: number }
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
 * Finds an issue with project access info
 */
const findIssueWithAccess = async (id: number) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const issue = await prisma.$queryRaw<ProjectIssue[]>`
    SELECT * FROM "ProjectIssue"
    WHERE id = ${id}
    AND ("tenantId" = ${tenantId} OR "tenantId" IS NULL)
    LIMIT 1
  `.catch(() => null);

  if (!issue || issue.length === 0) {
    return null;
  }

  const project = await prisma.project.findFirst({
    where: { id: issue[0].projectId },
    select: {
      id: true,
      ownerId: true,
      isSharedWithTenant: true,
      visibility: true,
    },
  });

  return { issue: issue[0], project };
};

// =============================================================================
// SERVICE FUNCTIONS
// =============================================================================

/**
 * Lists issues for a project with optional filtering
 *
 * @param projectId - The project ID to list issues for
 * @param userId - The ID of the user requesting access
 * @param filters - Optional filters for status, severity, category, etc.
 * @returns Object with { issues, total } or { error }
 */
export const listByProject = async (
  projectId: number,
  userId: number,
  filters?: ProjectIssueFilters,
): Promise<ProjectIssueListResult> => {
  const projectAccess = await validateProjectAccess(projectId, userId);

  if (projectAccess === 'not_found' || projectAccess === 'forbidden') {
    return { error: projectAccess };
  }

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  try {
    // Build where clause for Prisma with proper types
    const where: Prisma.ProjectIssueWhereInput = {
      projectId,
    };

    if (filters?.status?.length) {
      where.status = { in: filters.status as ProjectIssueStatus[] };
    }

    if (filters?.severity?.length) {
      where.severity = { in: filters.severity as ProjectIssueSeverity[] };
    }

    if (filters?.ownerId) {
      where.ownerId = filters.ownerId;
    }

    if (filters?.escalated) {
      where.escalationLevel = { gt: 0 };
    }

    // Use Prisma client for proper column mapping
    const [issues, total] = await Promise.all([
      prisma.projectIssue.findMany({
        where,
        orderBy: [
          { severity: 'desc' }, // CRITICAL > HIGH > MEDIUM > LOW
          { escalationLevel: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.projectIssue.count({ where }),
    ]);

    return {
      issues: issues as unknown as ProjectIssue[],
      total,
    };
  } catch (error) {
    console.error('Error listing issues:', error);
    return { issues: [], total: 0 };
  }
};

/**
 * Creates a new project issue
 *
 * @param data - The issue data including projectId
 * @param userId - The ID of the user creating the issue
 * @returns Object with { issue } or { error }
 */
export const create = async (
  data: CreateProjectIssueInput,
  userId: number,
): Promise<ProjectIssueResult> => {
  const projectAccess = await validateProjectAccess(data.projectId, userId);

  if (projectAccess === 'not_found' || projectAccess === 'forbidden') {
    return { error: projectAccess };
  }

  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  try {
    const result = await prisma.$queryRawUnsafe<ProjectIssue[]>(
      `
      INSERT INTO "ProjectIssue" (
        "tenantId", "projectId", "sourceType", "sourceMeetingId",
        "title", "description", "affectedAreas", "severity", "impact", "status",
        "reportedById", "reportedByName", "ownerId", "escalationLevel",
        "identifiedDate", "targetResolutionDate", "relatedRiskId",
        "sourceText", "confidence", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7::text[], $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, $17,
        $18, $19, NOW(), NOW()
      )
      RETURNING *
    `,
      tenantId ?? null,
      data.projectId,
      data.sourceType ?? 'MANUAL',
      data.sourceMeetingId ?? null,
      data.title,
      data.description ?? '',
      data.affectedAreas ?? [],
      data.severity ?? 'MEDIUM',
      data.impact ?? null,
      data.status ?? 'OPEN',
      data.reportedById ?? userId,
      data.reportedByName ?? null,
      data.ownerId ?? null,
      data.escalationLevel ?? 0,
      data.identifiedDate ?? new Date(),
      data.targetResolutionDate ?? null,
      data.relatedRiskId ?? null,
      data.sourceText ?? null,
      data.confidence ?? null,
    );

    if (!result || result.length === 0) {
      return { error: 'database_error' };
    }

    return { issue: result[0] };
  } catch (error) {
    console.error('Error creating issue:', error);
    return { error: 'database_error' };
  }
};

/**
 * Gets an issue by ID
 *
 * @param id - The issue ID
 * @param userId - The ID of the user requesting access
 * @returns Object with { issue } or { error }
 */
export const getById = async (
  id: number,
  userId: number,
): Promise<ProjectIssueResult> => {
  const found = await findIssueWithAccess(id);

  if (!found) {
    return { error: 'not_found' };
  }

  if (!found.project || !hasProjectAccess(found.project, userId)) {
    return { error: 'forbidden' };
  }

  return { issue: found.issue };
};

/**
 * Updates an issue
 *
 * @param id - The issue ID
 * @param data - The update data
 * @param userId - The ID of the user updating
 * @returns Object with { issue } or { error }
 */
export const update = async (
  id: number,
  data: UpdateProjectIssueInput,
  userId: number,
): Promise<ProjectIssueResult> => {
  const found = await findIssueWithAccess(id);

  if (!found) {
    return { error: 'not_found' };
  }

  if (!found.project || !hasProjectAccess(found.project, userId)) {
    return { error: 'forbidden' };
  }

  try {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      updates.push(`"title" = $${paramIndex++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push(`"description" = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.affectedAreas !== undefined) {
      updates.push(`"affectedAreas" = $${paramIndex++}::text[]`);
      values.push(data.affectedAreas);
    }
    if (data.sourceType !== undefined) {
      updates.push(`"sourceType" = $${paramIndex++}`);
      values.push(data.sourceType);
    }
    if (data.severity !== undefined) {
      updates.push(`"severity" = $${paramIndex++}`);
      values.push(data.severity);
    }
    if (data.impact !== undefined) {
      updates.push(`"impact" = $${paramIndex++}`);
      values.push(data.impact);
    }
    if (data.status !== undefined) {
      updates.push(`"status" = $${paramIndex++}`);
      values.push(data.status);

      // Auto-set resolution date when resolved/closed/wont_fix
      if (
        data.status === 'RESOLVED' ||
        data.status === 'CLOSED' ||
        data.status === 'WONT_FIX'
      ) {
        updates.push(`"resolvedAt" = $${paramIndex++}`);
        values.push(new Date());
        updates.push(`"resolvedById" = $${paramIndex++}`);
        values.push(userId);
      }
    }
    if (data.ownerId !== undefined) {
      updates.push(`"ownerId" = $${paramIndex++}`);
      values.push(data.ownerId);
    }
    if (data.targetResolutionDate !== undefined) {
      updates.push(`"targetResolutionDate" = $${paramIndex++}`);
      values.push(data.targetResolutionDate);
    }
    if (data.resolution !== undefined) {
      updates.push(`"resolution" = $${paramIndex++}`);
      values.push(data.resolution);
    }
    if (data.relatedRiskId !== undefined) {
      updates.push(`"relatedRiskId" = $${paramIndex++}`);
      values.push(data.relatedRiskId);
    }
    if (data.confidence !== undefined) {
      updates.push(`"confidence" = $${paramIndex++}`);
      values.push(data.confidence);
    }

    updates.push(`"updatedAt" = NOW()`);
    values.push(id);

    const result = await prisma.$queryRawUnsafe<ProjectIssue[]>(
      `
      UPDATE "ProjectIssue"
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `,
      ...values,
    );

    if (!result || result.length === 0) {
      return { error: 'database_error' };
    }

    return { issue: result[0] };
  } catch (error) {
    console.error('Error updating issue:', error);
    return { error: 'database_error' };
  }
};

/**
 * Deletes an issue
 *
 * @param id - The issue ID
 * @param userId - The ID of the user deleting
 * @returns Object with { deleted: true } or { error }
 */
export const deleteIssue = async (
  id: number,
  userId: number,
): Promise<
  { deleted: true } | { error: 'not_found' | 'forbidden' | 'database_error' }
> => {
  const found = await findIssueWithAccess(id);

  if (!found) {
    return { error: 'not_found' };
  }

  if (!found.project || !hasProjectAccess(found.project, userId)) {
    return { error: 'forbidden' };
  }

  try {
    await prisma.$queryRawUnsafe(
      `
      DELETE FROM "ProjectIssue" WHERE id = $1
    `,
      id,
    );

    return { deleted: true };
  } catch (error) {
    console.error('Error deleting issue:', error);
    return { error: 'database_error' };
  }
};

/**
 * Escalates an issue to the next level
 *
 * @param id - The issue ID
 * @param data - Escalation data (reason, escalateTo)
 * @param userId - The ID of the user escalating
 * @returns Object with { issue } or { error }
 */
export const escalate = async (
  id: number,
  data: EscalateIssueInput,
  userId: number,
): Promise<ProjectIssueResult> => {
  const found = await findIssueWithAccess(id);

  if (!found) {
    return { error: 'not_found' };
  }

  if (!found.project || !hasProjectAccess(found.project, userId)) {
    return { error: 'forbidden' };
  }

  const currentLevel = found.issue.escalationLevel ?? 0;
  const maxLevel = 5;

  if (currentLevel >= maxLevel) {
    return { error: 'max_escalation' };
  }

  const newLevel = currentLevel + 1;

  try {
    // Note: The database doesn't have an escalation_history column,
    // so we just update the escalation level. The reason and escalateTo
    // are logged but not stored in a separate history field.
    const result = await prisma.$queryRawUnsafe<ProjectIssue[]>(
      `
      UPDATE "ProjectIssue"
      SET "escalationLevel" = $1,
          "updatedAt" = NOW()
      WHERE id = $2
      RETURNING *
    `,
      newLevel,
      id,
    );

    if (!result || result.length === 0) {
      return { error: 'database_error' };
    }

    return { issue: result[0] };
  } catch (error) {
    console.error('Error escalating issue:', error);
    return { error: 'database_error' };
  }
};

/**
 * Gets issue counts by status for a project
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
      FROM "ProjectIssue"
      WHERE "projectId" = $1
      GROUP BY status
    `,
      projectId,
    );

    // Match the database enum values from ProjectIssueStatus
    const counts: Record<string, number> = {
      OPEN: 0,
      INVESTIGATING: 0,
      IN_PROGRESS: 0,
      BLOCKED: 0,
      RESOLVED: 0,
      CLOSED: 0,
      WONT_FIX: 0,
    };

    for (const row of result) {
      counts[row.status] = Number(row.count);
    }

    return { counts };
  } catch {
    return {
      counts: {
        OPEN: 0,
        INVESTIGATING: 0,
        IN_PROGRESS: 0,
        BLOCKED: 0,
        RESOLVED: 0,
        CLOSED: 0,
        WONT_FIX: 0,
      },
    };
  }
};

/**
 * Gets issue counts by severity for a project
 *
 * @param projectId - The project ID
 * @param userId - The ID of the user requesting
 * @returns Severity counts or error
 */
export const getSeverityCounts = async (
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
      { severity: string; count: bigint }[]
    >(
      `
      SELECT severity, COUNT(*) as count
      FROM "ProjectIssue"
      WHERE "projectId" = $1
      AND status NOT IN ('RESOLVED', 'CLOSED', 'WONT_FIX')
      GROUP BY severity
    `,
      projectId,
    );

    const counts: Record<string, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    for (const row of result) {
      counts[row.severity] = Number(row.count);
    }

    return { counts };
  } catch {
    return {
      counts: {
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        CRITICAL: 0,
      },
    };
  }
};

/**
 * Gets critical open issues for a project
 *
 * @param projectId - The project ID
 * @param userId - The ID of the user requesting
 * @returns Critical issues or error
 */
export const getCriticalIssues = async (
  projectId: number,
  userId: number,
): Promise<ProjectIssueListResult> => {
  const projectAccess = await validateProjectAccess(projectId, userId);

  if (projectAccess === 'not_found' || projectAccess === 'forbidden') {
    return { error: projectAccess };
  }

  try {
    const issues = await prisma.$queryRawUnsafe<ProjectIssue[]>(
      `
      SELECT * FROM "ProjectIssue"
      WHERE "projectId" = $1
      AND severity IN ('CRITICAL', 'HIGH')
      AND status NOT IN ('RESOLVED', 'CLOSED', 'WONT_FIX')
      ORDER BY
        CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 END,
        "escalationLevel" DESC,
        "createdAt" ASC
    `,
      projectId,
    );

    return { issues, total: issues.length };
  } catch {
    return { issues: [], total: 0 };
  }
};
