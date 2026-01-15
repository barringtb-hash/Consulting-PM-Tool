/**
 * Decision Service
 *
 * Provides CRUD operations and business logic for Decisions.
 * Decisions are choices made during project work that need to be
 * documented for traceability and future reference.
 *
 * @module modules/raid/services
 */

import { prisma } from '../../../prisma/client';
import { getTenantId, hasTenantContext } from '../../../tenant/tenant.context';
import { hasProjectAccess } from '../../../utils/project-access';
import type {
  CreateDecisionInput,
  UpdateDecisionInput,
  DecisionFilters,
  SupersedeDecisionInput,
} from '../validation/raid.schema';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Decision data shape returned from the service
 */
export interface Decision {
  id: number;
  tenantId: string | null;
  projectId: number;
  title: string;
  description: string | null;
  context: string | null;
  rationale: string | null;
  impact: string;
  status: string;
  decisionMakerId: number | null;
  decisionMakerName: string | null;
  decisionDate: Date | null;
  effectiveDate: Date | null;
  reviewDate: Date | null;
  supersededById: number | null;
  supersedingId: number | null;
  sourceMeetingId: number | null;
  sourceText: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service result type for single item operations
 */
type DecisionResult =
  | { decision: Decision }
  | {
      error:
        | 'not_found'
        | 'forbidden'
        | 'validation_error'
        | 'database_error'
        | 'invalid_decision';
    };

/**
 * Service result type for list operations
 */
type DecisionListResult =
  | { decisions: Decision[]; total: number }
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
 * Finds a decision with project access info
 */
const findDecisionWithAccess = async (id: number) => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const decision = await prisma.$queryRaw<Decision[]>`
    SELECT * FROM "Decision"
    WHERE id = ${id}
    AND (tenant_id = ${tenantId} OR tenant_id IS NULL)
    LIMIT 1
  `.catch(() => null);

  if (!decision || decision.length === 0) {
    return null;
  }

  const project = await prisma.project.findFirst({
    where: { id: decision[0].projectId },
    select: {
      id: true,
      ownerId: true,
      isSharedWithTenant: true,
      visibility: true,
    },
  });

  return { decision: decision[0], project };
};

// =============================================================================
// SERVICE FUNCTIONS
// =============================================================================

/**
 * Lists decisions for a project with optional filtering
 *
 * @param projectId - The project ID to list decisions for
 * @param userId - The ID of the user requesting access
 * @param filters - Optional filters for status, impact, date range, etc.
 * @returns Object with { decisions, total } or { error }
 */
export const listByProject = async (
  projectId: number,
  userId: number,
  filters?: DecisionFilters,
): Promise<DecisionListResult> => {
  const projectAccess = await validateProjectAccess(projectId, userId);

  if (projectAccess === 'not_found' || projectAccess === 'forbidden') {
    return { error: projectAccess };
  }

  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  try {
    const decisions = await prisma
      .$queryRawUnsafe<Decision[]>(
        `
      SELECT * FROM "Decision"
      WHERE project_id = $1
      ${filters?.status?.length ? `AND status = ANY($2::text[])` : ''}
      ${filters?.impact?.length ? `AND impact = ANY($3::text[])` : ''}
      ${filters?.decisionMakerId ? `AND decision_maker_id = $4` : ''}
      ${filters?.fromDate ? `AND decision_date >= $5` : ''}
      ${filters?.toDate ? `AND decision_date <= $6` : ''}
      ORDER BY decision_date DESC NULLS LAST, created_at DESC
      LIMIT $7 OFFSET $8
    `,
        projectId,
        filters?.status ?? [],
        filters?.impact ?? [],
        filters?.decisionMakerId ?? null,
        filters?.fromDate ?? null,
        filters?.toDate ?? null,
        limit,
        offset,
      )
      .catch(() => []);

    const countResult = await prisma
      .$queryRawUnsafe<[{ count: bigint }]>(
        `
      SELECT COUNT(*) as count FROM "Decision"
      WHERE project_id = $1
    `,
        projectId,
      )
      .catch(() => [{ count: BigInt(0) }]);

    return {
      decisions,
      total: Number(countResult[0]?.count ?? 0),
    };
  } catch (error) {
    console.error('Error listing decisions:', error);
    return { decisions: [], total: 0 };
  }
};

/**
 * Creates a new decision
 *
 * @param data - The decision data including projectId
 * @param userId - The ID of the user creating the decision
 * @returns Object with { decision } or { error }
 */
export const create = async (
  data: CreateDecisionInput,
  userId: number,
): Promise<DecisionResult> => {
  const projectAccess = await validateProjectAccess(data.projectId, userId);

  if (projectAccess === 'not_found' || projectAccess === 'forbidden') {
    return { error: projectAccess };
  }

  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  try {
    const result = await prisma.$queryRawUnsafe<Decision[]>(
      `
      INSERT INTO "Decision" (
        tenant_id, project_id, title, description, context, rationale,
        impact, status, decision_maker_id, decision_maker_name,
        decision_date, effective_date, review_date,
        source_meeting_id, source_text, tags,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW()
      )
      RETURNING *
    `,
      tenantId ?? null,
      data.projectId,
      data.title,
      data.description ?? null,
      data.context ?? null,
      data.rationale ?? null,
      data.impact ?? 'MEDIUM',
      data.status ?? 'PENDING',
      data.decisionMakerId ?? null,
      data.decisionMakerName ?? null,
      data.decisionDate ?? null,
      data.effectiveDate ?? null,
      data.reviewDate ?? null,
      data.sourceMeetingId ?? null,
      data.sourceText ?? null,
      data.tags ?? [],
    );

    if (!result || result.length === 0) {
      return { error: 'database_error' };
    }

    return { decision: result[0] };
  } catch (error) {
    console.error('Error creating decision:', error);
    return { error: 'database_error' };
  }
};

/**
 * Gets a decision by ID
 *
 * @param id - The decision ID
 * @param userId - The ID of the user requesting access
 * @returns Object with { decision } or { error }
 */
export const getById = async (
  id: number,
  userId: number,
): Promise<DecisionResult> => {
  const found = await findDecisionWithAccess(id);

  if (!found) {
    return { error: 'not_found' };
  }

  if (!found.project || !hasProjectAccess(found.project, userId)) {
    return { error: 'forbidden' };
  }

  return { decision: found.decision };
};

/**
 * Updates a decision
 *
 * @param id - The decision ID
 * @param data - The update data
 * @param userId - The ID of the user updating
 * @returns Object with { decision } or { error }
 */
export const update = async (
  id: number,
  data: UpdateDecisionInput,
  userId: number,
): Promise<DecisionResult> => {
  const found = await findDecisionWithAccess(id);

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
    if (data.context !== undefined) {
      updates.push(`context = $${paramIndex++}`);
      values.push(data.context);
    }
    if (data.rationale !== undefined) {
      updates.push(`rationale = $${paramIndex++}`);
      values.push(data.rationale);
    }
    if (data.impact !== undefined) {
      updates.push(`impact = $${paramIndex++}`);
      values.push(data.impact);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.decisionMakerId !== undefined) {
      updates.push(`decision_maker_id = $${paramIndex++}`);
      values.push(data.decisionMakerId);
    }
    if (data.decisionMakerName !== undefined) {
      updates.push(`decision_maker_name = $${paramIndex++}`);
      values.push(data.decisionMakerName);
    }
    if (data.decisionDate !== undefined) {
      updates.push(`decision_date = $${paramIndex++}`);
      values.push(data.decisionDate);
    }
    if (data.effectiveDate !== undefined) {
      updates.push(`effective_date = $${paramIndex++}`);
      values.push(data.effectiveDate);
    }
    if (data.reviewDate !== undefined) {
      updates.push(`review_date = $${paramIndex++}`);
      values.push(data.reviewDate);
    }
    if (data.tags !== undefined) {
      updates.push(`tags = $${paramIndex++}`);
      values.push(data.tags);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await prisma.$queryRawUnsafe<Decision[]>(
      `
      UPDATE "Decision"
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `,
      ...values,
    );

    if (!result || result.length === 0) {
      return { error: 'database_error' };
    }

    return { decision: result[0] };
  } catch (error) {
    console.error('Error updating decision:', error);
    return { error: 'database_error' };
  }
};

/**
 * Deletes a decision
 *
 * @param id - The decision ID
 * @param userId - The ID of the user deleting
 * @returns Object with { deleted: true } or { error }
 */
export const deleteDecision = async (
  id: number,
  userId: number,
): Promise<
  { deleted: true } | { error: 'not_found' | 'forbidden' | 'database_error' }
> => {
  const found = await findDecisionWithAccess(id);

  if (!found) {
    return { error: 'not_found' };
  }

  if (!found.project || !hasProjectAccess(found.project, userId)) {
    return { error: 'forbidden' };
  }

  try {
    await prisma.$queryRawUnsafe(
      `
      DELETE FROM "Decision" WHERE id = $1
    `,
      id,
    );

    return { deleted: true };
  } catch (error) {
    console.error('Error deleting decision:', error);
    return { error: 'database_error' };
  }
};

/**
 * Marks a decision as superseded by a new decision
 *
 * @param id - The decision ID to supersede
 * @param data - Contains newDecisionId and optional reason
 * @param userId - The ID of the user performing the action
 * @returns Object with { decision, newDecision } or { error }
 */
export const supersede = async (
  id: number,
  data: SupersedeDecisionInput,
  userId: number,
): Promise<
  | { decision: Decision; newDecision: Decision }
  | { error: 'not_found' | 'forbidden' | 'database_error' | 'invalid_decision' }
> => {
  // Verify original decision
  const found = await findDecisionWithAccess(id);
  if (!found) {
    return { error: 'not_found' };
  }

  if (!found.project || !hasProjectAccess(found.project, userId)) {
    return { error: 'forbidden' };
  }

  // Verify new decision exists and is in same project
  const newDecisionFound = await findDecisionWithAccess(data.newDecisionId);
  if (!newDecisionFound) {
    return { error: 'invalid_decision' };
  }

  if (newDecisionFound.decision.projectId !== found.decision.projectId) {
    return { error: 'invalid_decision' };
  }

  try {
    // Update original decision to SUPERSEDED
    const updatedOriginal = await prisma.$queryRawUnsafe<Decision[]>(
      `
      UPDATE "Decision"
      SET status = 'SUPERSEDED',
          superseded_by_id = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `,
      data.newDecisionId,
      id,
    );

    // Update new decision to reference original
    const updatedNew = await prisma.$queryRawUnsafe<Decision[]>(
      `
      UPDATE "Decision"
      SET superseding_id = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `,
      id,
      data.newDecisionId,
    );

    return {
      decision: updatedOriginal[0] ?? {
        ...found.decision,
        status: 'SUPERSEDED',
      },
      newDecision: updatedNew[0] ?? newDecisionFound.decision,
    };
  } catch (error) {
    console.error('Error superseding decision:', error);
    return { error: 'database_error' };
  }
};

/**
 * Gets decision counts by status for a project
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
      FROM "Decision"
      WHERE project_id = $1
      GROUP BY status
    `,
      projectId,
    );

    const counts: Record<string, number> = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
      SUPERSEDED: 0,
      DEFERRED: 0,
    };

    for (const row of result) {
      counts[row.status] = Number(row.count);
    }

    return { counts };
  } catch {
    return {
      counts: {
        PENDING: 0,
        APPROVED: 0,
        REJECTED: 0,
        SUPERSEDED: 0,
        DEFERRED: 0,
      },
    };
  }
};

/**
 * Gets decisions pending review
 *
 * @param projectId - The project ID
 * @param userId - The ID of the user requesting
 * @returns Decisions with review dates in the past or near future
 */
export const getPendingReviews = async (
  projectId: number,
  userId: number,
): Promise<DecisionListResult> => {
  const projectAccess = await validateProjectAccess(projectId, userId);

  if (projectAccess === 'not_found' || projectAccess === 'forbidden') {
    return { error: projectAccess };
  }

  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  try {
    const decisions = await prisma.$queryRawUnsafe<Decision[]>(
      `
      SELECT * FROM "Decision"
      WHERE project_id = $1
      AND review_date IS NOT NULL
      AND review_date <= $2
      AND status NOT IN ('SUPERSEDED', 'REJECTED')
      ORDER BY review_date ASC
    `,
      projectId,
      thirtyDaysFromNow,
    );

    return { decisions, total: decisions.length };
  } catch {
    return { decisions: [], total: 0 };
  }
};
