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
import type { DecisionStatus, DecisionImpact, Prisma } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Decision data shape returned from the service.
 * Matches the database schema for Decision table.
 */
export interface Decision {
  id: number;
  tenantId: string | null;
  projectId: number;
  sourceType: string;
  sourceMeetingId: number | null;
  title: string;
  description: string;
  rationale: string | null;
  madeById: number | null;
  madeByName: string | null;
  stakeholders: string[];
  impact: string;
  category: string;
  status: string;
  supersededById: number | null;
  decisionDate: Date;
  effectiveDate: Date | null;
  reviewDate: Date | null;
  sourceText: string | null;
  confidence: number | null;
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
    AND ("tenantId" = ${tenantId} OR "tenantId" IS NULL)
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
    // Build where clause for Prisma with proper types
    const where: Prisma.DecisionWhereInput = {
      projectId,
    };

    if (filters?.status?.length) {
      where.status = { in: filters.status as DecisionStatus[] };
    }

    if (filters?.impact?.length) {
      where.impact = { in: filters.impact as DecisionImpact[] };
    }

    if (filters?.madeById) {
      where.madeById = filters.madeById;
    }

    if (filters?.fromDate) {
      where.decisionDate = { gte: filters.fromDate };
    }

    if (filters?.toDate) {
      where.decisionDate = {
        ...(where.decisionDate as object),
        lte: filters.toDate,
      };
    }

    // Use Prisma client for proper column mapping
    const [decisions, total] = await Promise.all([
      prisma.decision.findMany({
        where,
        orderBy: [{ decisionDate: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      prisma.decision.count({ where }),
    ]);

    return {
      decisions: decisions as unknown as Decision[],
      total,
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
    // Use Prisma client for proper column mapping
    const result = await prisma.decision.create({
      data: {
        tenantId: tenantId ?? '',
        projectId: data.projectId,
        sourceType:
          (data.sourceType as
            | 'MANUAL'
            | 'MEETING'
            | 'AI_EXTRACTED'
            | 'IMPORTED') ?? 'MANUAL',
        sourceMeetingId: data.sourceMeetingId ?? null,
        title: data.title,
        description: data.description ?? '',
        rationale: data.rationale ?? null,
        madeById: data.madeById ?? null,
        madeByName: data.madeByName ?? null,
        stakeholders: data.stakeholders ?? [],
        impact:
          (data.impact as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') ?? 'MEDIUM',
        category:
          (data.category as
            | 'TECHNICAL'
            | 'SCOPE'
            | 'TIMELINE'
            | 'BUDGET'
            | 'RESOURCE'
            | 'PROCESS'
            | 'PROJECT'
            | 'STAKEHOLDER') ?? 'PROJECT',
        status:
          (data.status as 'PENDING' | 'ACTIVE' | 'SUPERSEDED' | 'REVOKED') ??
          'PENDING',
        decisionDate: data.decisionDate ?? new Date(),
        effectiveDate: data.effectiveDate ?? null,
        reviewDate: data.reviewDate ?? null,
        sourceText: data.sourceText ?? null,
        confidence: data.confidence ?? null,
      },
    });

    return { decision: result as unknown as Decision };
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
    // Build update data - use raw object to avoid Prisma type issues
    const updateData: Record<string, unknown> = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.rationale !== undefined) updateData.rationale = data.rationale;
    if (data.sourceType !== undefined) updateData.sourceType = data.sourceType;
    if (data.impact !== undefined) updateData.impact = data.impact;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.madeById !== undefined) updateData.madeById = data.madeById;
    if (data.madeByName !== undefined) updateData.madeByName = data.madeByName;
    if (data.stakeholders !== undefined)
      updateData.stakeholders = data.stakeholders;
    if (data.decisionDate !== undefined)
      updateData.decisionDate = data.decisionDate ?? undefined;
    if (data.effectiveDate !== undefined)
      updateData.effectiveDate = data.effectiveDate ?? undefined;
    if (data.reviewDate !== undefined)
      updateData.reviewDate = data.reviewDate ?? undefined;
    if (data.sourceText !== undefined) updateData.sourceText = data.sourceText;
    if (data.confidence !== undefined) updateData.confidence = data.confidence;

    const result = await prisma.decision.update({
      where: { id },
      data: updateData as Prisma.DecisionUpdateInput,
    });

    return { decision: result as unknown as Decision };
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
          "supersededById" = $1,
          "updatedAt" = NOW()
      WHERE id = $2
      RETURNING *
    `,
      data.newDecisionId,
      id,
    );

    return {
      decision: updatedOriginal[0] ?? {
        ...found.decision,
        status: 'SUPERSEDED',
      },
      newDecision: newDecisionFound.decision,
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
      WHERE "projectId" = $1
      GROUP BY status
    `,
      projectId,
    );

    const counts: Record<string, number> = {
      PENDING: 0,
      ACTIVE: 0,
      SUPERSEDED: 0,
      REVOKED: 0,
    };

    for (const row of result) {
      counts[row.status] = Number(row.count);
    }

    return { counts };
  } catch {
    return {
      counts: {
        PENDING: 0,
        ACTIVE: 0,
        SUPERSEDED: 0,
        REVOKED: 0,
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
      AND status NOT IN ('SUPERSEDED', 'REVOKED')
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
