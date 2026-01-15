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

// =============================================================================
// TYPES
// =============================================================================

/**
 * Project Issue data shape returned from the service
 */
export interface ProjectIssue {
  id: number;
  tenantId: string | null;
  projectId: number;
  title: string;
  description: string | null;
  severity: string;
  category: string;
  status: string;
  assigneeId: number | null;
  assigneeName: string | null;
  reportedById: number | null;
  reportedByName: string | null;
  reportedDate: Date | null;
  targetResolutionDate: Date | null;
  actualResolutionDate: Date | null;
  resolution: string | null;
  impact: string | null;
  workaround: string | null;
  sourceMeetingId: number | null;
  sourceText: string | null;
  escalationLevel: number;
  escalationHistory: EscalationEntry[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Escalation history entry
 */
interface EscalationEntry {
  level: number;
  escalatedAt: Date;
  escalatedBy: number;
  reason?: string;
  escalateTo?: string;
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
    AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
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
    const issues = await prisma
      .$queryRawUnsafe<ProjectIssue[]>(
        `
      SELECT * FROM "ProjectIssue"
      WHERE project_id = $1
      ${filters?.status?.length ? `AND status = ANY($2::text[])` : ''}
      ${filters?.severity?.length ? `AND severity = ANY($3::text[])` : ''}
      ${filters?.category?.length ? `AND category = ANY($4::text[])` : ''}
      ${filters?.assigneeId ? `AND assignee_id = $5` : ''}
      ${filters?.escalated ? `AND escalation_level > 0` : ''}
      ORDER BY
        CASE severity
          WHEN 'CRITICAL' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MEDIUM' THEN 3
          WHEN 'LOW' THEN 4
        END,
        escalation_level DESC,
        created_at DESC
      LIMIT $6 OFFSET $7
    `,
        projectId,
        filters?.status ?? [],
        filters?.severity ?? [],
        filters?.category ?? [],
        filters?.assigneeId ?? null,
        limit,
        offset,
      )
      .catch(() => []);

    const countResult = await prisma
      .$queryRawUnsafe<[{ count: bigint }]>(
        `
      SELECT COUNT(*) as count FROM "ProjectIssue"
      WHERE project_id = $1
    `,
        projectId,
      )
      .catch(() => [{ count: BigInt(0) }]);

    return {
      issues,
      total: Number(countResult[0]?.count ?? 0),
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
        tenant_id, project_id, title, description, severity, category, status,
        assignee_id, assignee_name, reported_by_id, reported_by_name,
        reported_date, target_resolution_date, impact, workaround,
        source_meeting_id, source_text, escalation_level, escalation_history,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19::jsonb, NOW(), NOW()
      )
      RETURNING *
    `,
      tenantId ?? null,
      data.projectId,
      data.title,
      data.description ?? null,
      data.severity ?? 'MEDIUM',
      data.category ?? 'OTHER',
      data.status ?? 'OPEN',
      data.assigneeId ?? null,
      data.assigneeName ?? null,
      data.reportedById ?? userId,
      data.reportedByName ?? null,
      data.reportedDate ?? new Date(),
      data.targetResolutionDate ?? null,
      data.impact ?? null,
      data.workaround ?? null,
      data.sourceMeetingId ?? null,
      data.sourceText ?? null,
      data.escalationLevel ?? 0,
      JSON.stringify([]),
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
      updates.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.severity !== undefined) {
      updates.push(`severity = $${paramIndex++}`);
      values.push(data.severity);
    }
    if (data.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(data.category);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);

      // Auto-set resolution date when resolved/closed
      if (data.status === 'RESOLVED' || data.status === 'CLOSED') {
        updates.push(`actual_resolution_date = $${paramIndex++}`);
        values.push(new Date());
      }
    }
    if (data.assigneeId !== undefined) {
      updates.push(`assignee_id = $${paramIndex++}`);
      values.push(data.assigneeId);
    }
    if (data.assigneeName !== undefined) {
      updates.push(`assignee_name = $${paramIndex++}`);
      values.push(data.assigneeName);
    }
    if (data.targetResolutionDate !== undefined) {
      updates.push(`target_resolution_date = $${paramIndex++}`);
      values.push(data.targetResolutionDate);
    }
    if (data.resolution !== undefined) {
      updates.push(`resolution = $${paramIndex++}`);
      values.push(data.resolution);
    }
    if (data.impact !== undefined) {
      updates.push(`impact = $${paramIndex++}`);
      values.push(data.impact);
    }
    if (data.workaround !== undefined) {
      updates.push(`workaround = $${paramIndex++}`);
      values.push(data.workaround);
    }

    updates.push(`updated_at = NOW()`);
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
  const escalationEntry: EscalationEntry = {
    level: newLevel,
    escalatedAt: new Date(),
    escalatedBy: userId,
    reason: data.reason,
    escalateTo: data.escalateTo,
  };

  try {
    const existingHistory = found.issue.escalationHistory ?? [];
    const newHistory = [...existingHistory, escalationEntry];

    const result = await prisma.$queryRawUnsafe<ProjectIssue[]>(
      `
      UPDATE "ProjectIssue"
      SET escalation_level = $1,
          status = 'ESCALATED',
          escalation_history = $2::jsonb,
          updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `,
      newLevel,
      JSON.stringify(newHistory),
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
      WHERE project_id = $1
      GROUP BY status
    `,
      projectId,
    );

    const counts: Record<string, number> = {
      OPEN: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
      CLOSED: 0,
      ESCALATED: 0,
    };

    for (const row of result) {
      counts[row.status] = Number(row.count);
    }

    return { counts };
  } catch {
    return {
      counts: {
        OPEN: 0,
        IN_PROGRESS: 0,
        RESOLVED: 0,
        CLOSED: 0,
        ESCALATED: 0,
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
      WHERE project_id = $1
      AND status NOT IN ('RESOLVED', 'CLOSED')
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
      WHERE project_id = $1
      AND severity IN ('CRITICAL', 'HIGH')
      AND status NOT IN ('RESOLVED', 'CLOSED')
      ORDER BY
        CASE severity WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 END,
        escalation_level DESC,
        created_at ASC
    `,
      projectId,
    );

    return { issues, total: issues.length };
  } catch {
    return { issues: [], total: 0 };
  }
};
