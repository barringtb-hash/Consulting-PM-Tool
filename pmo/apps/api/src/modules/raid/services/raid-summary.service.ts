/**
 * RAID Summary Service
 *
 * Provides aggregation and summary statistics for RAID items.
 * Used for dashboards, reports, and project health assessments.
 *
 * @module modules/raid/services
 */

import { prisma } from '../../../prisma/client';
import { getTenantId, hasTenantContext } from '../../../tenant/tenant.context';
import { hasProjectAccess } from '../../../utils/project-access';
import { llmService } from '../../../services/llm.service';
import { RAID_SUMMARY_PROMPT } from '../prompts/raid-extraction-prompts';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Health indicator for project RAID status
 */
export type HealthIndicator = 'HEALTHY' | 'AT_RISK' | 'CRITICAL';

/**
 * RAID counts by category
 */
export interface RAIDCounts {
  risks: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    open: number;
    resolved: number;
  };
  actionItems: {
    total: number;
    open: number;
    inProgress: number;
    completed: number;
    overdue: number;
    convertedToTask: number;
  };
  issues: {
    total: number;
    critical: number;
    high: number;
    open: number;
    escalated: number;
    resolved: number;
  };
  decisions: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    superseded: number;
    recentCount: number;
  };
}

/**
 * RAID Summary result (full version with health indicators)
 */
export interface RAIDSummaryFull {
  projectId: number;
  projectName: string;
  counts: RAIDCounts;
  healthIndicator: HealthIndicator;
  healthScore: number;
  topConcerns: string[];
  recommendations: string[];
  summary: string;
  generatedAt: Date;
  aiGenerated: boolean;
}

/**
 * RAID Summary result (simplified version for dashboard cards)
 * Returns counts in nested objects for each RAID category
 */
export interface RAIDSummary {
  // Nested counts (requested format)
  risks: { total: number; open: number };
  actionItems: { total: number; open: number };
  issues: { total: number; open: number };
  decisions: { total: number; pending: number };
  // Flat counts (for backward compatibility with frontend)
  openRisks: number;
  overdueActionItems: number;
  openIssues: number;
  highPriorityRisks: number;
  criticalIssues: number;
}

/**
 * RAID Trend data point
 */
export interface RAIDTrendPoint {
  date: Date;
  risks: number;
  actionItems: number;
  issues: number;
  decisions: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validates project access
 */
type ProjectAccessResult =
  | { error: 'not_found' | 'forbidden' }
  | {
      project: {
        id: number;
        name: string;
        ownerId: number;
        isSharedWithTenant: boolean | null;
        visibility: string | null;
      };
    };

const validateProjectAccess = async (
  projectId: number,
  userId: number,
): Promise<ProjectAccessResult> => {
  const tenantId = hasTenantContext() ? getTenantId() : undefined;

  const project = await prisma.project.findFirst({
    where: { id: projectId, tenantId },
    select: {
      id: true,
      name: true,
      ownerId: true,
      isSharedWithTenant: true,
      visibility: true,
    },
  });

  if (!project) {
    return { error: 'not_found' };
  }

  if (!hasProjectAccess(project, userId)) {
    return { error: 'forbidden' };
  }

  return { project };
};

/**
 * Calculate health score based on RAID metrics
 * Score: 0-100, where 100 is perfectly healthy
 */
const calculateHealthScore = (counts: RAIDCounts): number => {
  let score = 100;

  // Deduct for critical risks (15 points each, max 30)
  score -= Math.min(counts.risks.critical * 15, 30);

  // Deduct for high risks (8 points each, max 24)
  score -= Math.min(counts.risks.high * 8, 24);

  // Deduct for critical issues (12 points each, max 24)
  score -= Math.min(counts.issues.critical * 12, 24);

  // Deduct for high issues (6 points each, max 18)
  score -= Math.min(counts.issues.high * 6, 18);

  // Deduct for overdue action items (5 points each, max 20)
  score -= Math.min(counts.actionItems.overdue * 5, 20);

  // Deduct for escalated issues (10 points each, max 20)
  score -= Math.min(counts.issues.escalated * 10, 20);

  // Deduct for pending decisions (2 points each, max 10)
  score -= Math.min(counts.decisions.pending * 2, 10);

  return Math.max(0, score);
};

/**
 * Determine health indicator from score
 */
const getHealthIndicator = (score: number): HealthIndicator => {
  if (score >= 70) return 'HEALTHY';
  if (score >= 40) return 'AT_RISK';
  return 'CRITICAL';
};

/**
 * Generate default concerns based on counts
 */
const generateDefaultConcerns = (counts: RAIDCounts): string[] => {
  const concerns: string[] = [];

  if (counts.risks.critical > 0) {
    concerns.push(
      `${counts.risks.critical} critical risk(s) require immediate attention`,
    );
  }
  if (counts.issues.critical > 0) {
    concerns.push(
      `${counts.issues.critical} critical issue(s) affecting project`,
    );
  }
  if (counts.actionItems.overdue > 0) {
    concerns.push(`${counts.actionItems.overdue} action item(s) are overdue`);
  }
  if (counts.issues.escalated > 0) {
    concerns.push(`${counts.issues.escalated} issue(s) have been escalated`);
  }
  if (counts.decisions.pending > 3) {
    concerns.push(`${counts.decisions.pending} decisions are pending approval`);
  }

  return concerns.slice(0, 5);
};

/**
 * Generate default recommendations based on counts
 */
const generateDefaultRecommendations = (counts: RAIDCounts): string[] => {
  const recommendations: string[] = [];

  if (counts.risks.critical > 0 || counts.risks.high > 1) {
    recommendations.push(
      'Schedule a risk review meeting to address high-priority risks',
    );
  }
  if (counts.actionItems.overdue > 0) {
    recommendations.push('Review and reassign overdue action items');
  }
  if (counts.issues.escalated > 0) {
    recommendations.push(
      'Involve senior stakeholders to resolve escalated issues',
    );
  }
  if (counts.decisions.pending > 2) {
    recommendations.push(
      'Prioritize pending decisions to unblock project progress',
    );
  }
  if (counts.actionItems.open > 10) {
    recommendations.push(
      'Consider converting key action items to formal tasks',
    );
  }

  return recommendations.slice(0, 5);
};

// =============================================================================
// SERVICE FUNCTIONS
// =============================================================================

/**
 * Gets a simplified RAID summary for a project
 *
 * Returns actual counts from database tables:
 * - ProjectRisk for risks
 * - ActionItem for action items
 * - ProjectIssue for issues
 * - Decision for decisions
 *
 * @param projectId - The project ID
 * @param userId - The ID of the user requesting
 * @returns RAID summary with counts for dashboard display
 */
export const getSummary = async (
  projectId: number,
  userId: number,
): Promise<RAIDSummary | { error: 'not_found' | 'forbidden' }> => {
  const accessResult = await validateProjectAccess(projectId, userId);

  if ('error' in accessResult) {
    return { error: accessResult.error };
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Gather all counts in parallel from database
  const [riskCounts, actionItemCounts, issueCounts, decisionCounts] =
    await Promise.all([
      getRiskCounts(projectId),
      getActionItemCounts(projectId, now),
      getIssueCounts(projectId),
      getDecisionCounts(projectId, thirtyDaysAgo),
    ]);

  // Return simplified format for dashboard cards
  return {
    // Nested counts (requested format)
    risks: {
      total: riskCounts.total,
      open: riskCounts.open,
    },
    actionItems: {
      total: actionItemCounts.total,
      open: actionItemCounts.open + actionItemCounts.inProgress,
    },
    issues: {
      total: issueCounts.total,
      open: issueCounts.open,
    },
    decisions: {
      total: decisionCounts.total,
      pending: decisionCounts.pending,
    },
    // Flat counts (for backward compatibility with frontend)
    openRisks: riskCounts.open,
    overdueActionItems: actionItemCounts.overdue,
    openIssues: issueCounts.open,
    highPriorityRisks: riskCounts.critical + riskCounts.high,
    criticalIssues: issueCounts.critical,
  };
};

/**
 * Gets a comprehensive RAID summary for a project with health indicators
 *
 * @param projectId - The project ID
 * @param userId - The ID of the user requesting
 * @returns Full RAID summary with counts, health indicators, and recommendations
 */
export const getFullSummary = async (
  projectId: number,
  userId: number,
): Promise<RAIDSummaryFull | { error: 'not_found' | 'forbidden' }> => {
  const accessResult = await validateProjectAccess(projectId, userId);

  if ('error' in accessResult) {
    return { error: accessResult.error };
  }

  const { project } = accessResult;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Gather all counts in parallel
  const [riskCounts, actionItemCounts, issueCounts, decisionCounts] =
    await Promise.all([
      getRiskCounts(projectId),
      getActionItemCounts(projectId, now),
      getIssueCounts(projectId),
      getDecisionCounts(projectId, thirtyDaysAgo),
    ]);

  const counts: RAIDCounts = {
    risks: riskCounts,
    actionItems: actionItemCounts,
    issues: issueCounts,
    decisions: decisionCounts,
  };

  const healthScore = calculateHealthScore(counts);
  const healthIndicator = getHealthIndicator(healthScore);

  // Try to get AI-generated summary
  let summary = '';
  let topConcerns = generateDefaultConcerns(counts);
  let recommendations = generateDefaultRecommendations(counts);
  let aiGenerated = false;

  if (llmService.isAvailable()) {
    try {
      const response = await llmService.complete(
        RAID_SUMMARY_PROMPT(
          {
            riskCount: counts.risks.total,
            criticalRisks: counts.risks.critical + counts.risks.high,
            actionItemCount: counts.actionItems.total,
            overdueActionItems: counts.actionItems.overdue,
            openIssueCount: counts.issues.open,
            criticalIssues: counts.issues.critical,
            recentDecisions: counts.decisions.recentCount,
            pendingDecisions: counts.decisions.pending,
          },
          project.name,
        ),
        { maxTokens: 500, temperature: 0.3 },
      );

      const parsed = JSON.parse(response.content);
      if (parsed) {
        summary = parsed.summary ?? '';
        topConcerns = parsed.topConcerns ?? topConcerns;
        recommendations = parsed.recommendations ?? recommendations;
        aiGenerated = true;
      }
    } catch {
      // Use defaults
    }
  }

  if (!summary) {
    summary = generateDefaultSummary(counts, project.name, healthIndicator);
  }

  return {
    projectId,
    projectName: project.name,
    counts,
    healthIndicator,
    healthScore,
    topConcerns,
    recommendations,
    summary,
    generatedAt: new Date(),
    aiGenerated,
  };
};

/**
 * Get risk counts for a project
 */
const getRiskCounts = async (projectId: number) => {
  try {
    const risks = await prisma.projectRisk.groupBy({
      by: ['severity', 'status'],
      where: { projectId },
      _count: true,
    });

    const counts = {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      open: 0,
      resolved: 0,
    };

    for (const r of risks) {
      counts.total += r._count;

      if (r.severity === 'CRITICAL') counts.critical += r._count;
      else if (r.severity === 'HIGH') counts.high += r._count;
      else if (r.severity === 'MEDIUM') counts.medium += r._count;
      else if (r.severity === 'LOW') counts.low += r._count;

      if (r.status === 'RESOLVED' || r.status === 'ACCEPTED') {
        counts.resolved += r._count;
      } else {
        counts.open += r._count;
      }
    }

    return counts;
  } catch {
    return {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      open: 0,
      resolved: 0,
    };
  }
};

/**
 * Get action item counts for a project
 */
const getActionItemCounts = async (projectId: number, now: Date) => {
  try {
    const results = await prisma.$queryRawUnsafe<
      {
        status: string;
        count: bigint;
        overdue_count: bigint;
      }[]
    >(
      `
      SELECT
        status,
        COUNT(*) as count,
        SUM(CASE WHEN "dueDate" < $2 AND status NOT IN ('COMPLETED', 'CANCELLED', 'CONVERTED_TO_TASK') THEN 1 ELSE 0 END) as overdue_count
      FROM "ActionItem"
      WHERE "projectId" = $1
      GROUP BY status
    `,
      projectId,
      now,
    );

    const counts = {
      total: 0,
      open: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0,
      convertedToTask: 0,
    };

    for (const r of results) {
      const c = Number(r.count);
      counts.total += c;
      counts.overdue += Number(r.overdue_count);

      if (r.status === 'OPEN') counts.open += c;
      else if (r.status === 'IN_PROGRESS') counts.inProgress += c;
      else if (r.status === 'COMPLETED') counts.completed += c;
      else if (r.status === 'CONVERTED_TO_TASK') counts.convertedToTask += c;
    }

    return counts;
  } catch {
    return {
      total: 0,
      open: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0,
      convertedToTask: 0,
    };
  }
};

/**
 * Get issue counts for a project
 */
const getIssueCounts = async (projectId: number) => {
  try {
    const results = await prisma.$queryRawUnsafe<
      {
        status: string;
        severity: string;
        count: bigint;
      }[]
    >(
      `
      SELECT status, severity, COUNT(*) as count
      FROM "ProjectIssue"
      WHERE "projectId" = $1
      GROUP BY status, severity
    `,
      projectId,
    );

    const counts = {
      total: 0,
      critical: 0,
      high: 0,
      open: 0,
      escalated: 0,
      resolved: 0,
    };

    for (const r of results) {
      const c = Number(r.count);
      counts.total += c;

      if (r.severity === 'CRITICAL') counts.critical += c;
      else if (r.severity === 'HIGH') counts.high += c;

      if (r.status === 'OPEN' || r.status === 'IN_PROGRESS') counts.open += c;
      else if (r.status === 'ESCALATED') counts.escalated += c;
      else if (r.status === 'RESOLVED' || r.status === 'CLOSED')
        counts.resolved += c;
    }

    return counts;
  } catch {
    return {
      total: 0,
      critical: 0,
      high: 0,
      open: 0,
      escalated: 0,
      resolved: 0,
    };
  }
};

/**
 * Get decision counts for a project
 */
const getDecisionCounts = async (projectId: number, thirtyDaysAgo: Date) => {
  try {
    const results = await prisma.$queryRawUnsafe<
      {
        status: string;
        count: bigint;
        recent_count: bigint;
      }[]
    >(
      `
      SELECT
        status,
        COUNT(*) as count,
        SUM(CASE WHEN "createdAt" >= $2 THEN 1 ELSE 0 END) as recent_count
      FROM "Decision"
      WHERE "projectId" = $1
      GROUP BY status
    `,
      projectId,
      thirtyDaysAgo,
    );

    const counts = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      superseded: 0,
      recentCount: 0,
    };

    for (const r of results) {
      const c = Number(r.count);
      counts.total += c;
      counts.recentCount += Number(r.recent_count);

      if (r.status === 'PENDING') counts.pending += c;
      else if (r.status === 'APPROVED') counts.approved += c;
      else if (r.status === 'REJECTED') counts.rejected += c;
      else if (r.status === 'SUPERSEDED') counts.superseded += c;
    }

    return counts;
  } catch {
    return {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      superseded: 0,
      recentCount: 0,
    };
  }
};

/**
 * Generate a default summary string
 */
const generateDefaultSummary = (
  counts: RAIDCounts,
  projectName: string,
  health: HealthIndicator,
): string => {
  const healthText =
    health === 'HEALTHY'
      ? 'in good shape'
      : health === 'AT_RISK'
        ? 'showing some concerns'
        : 'requires immediate attention';

  const parts = [`The ${projectName} project is ${healthText}.`];

  if (counts.risks.open > 0) {
    parts.push(`${counts.risks.open} open risk(s) being tracked.`);
  }
  if (counts.issues.open > 0) {
    parts.push(`${counts.issues.open} issue(s) currently being worked.`);
  }
  if (counts.actionItems.open > 0) {
    parts.push(`${counts.actionItems.open} action item(s) pending.`);
  }

  return parts.join(' ');
};

/**
 * Gets RAID trends over time for a project
 *
 * @param projectId - The project ID
 * @param userId - The ID of the user requesting
 * @param days - Number of days to include (default 30)
 * @returns Array of trend data points
 */
export const getTrends = async (
  projectId: number,
  userId: number,
  days: number = 30,
): Promise<RAIDTrendPoint[] | { error: 'not_found' | 'forbidden' }> => {
  const accessResult = await validateProjectAccess(projectId, userId);

  if ('error' in accessResult) {
    return { error: accessResult.error };
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    // Get daily counts for each RAID category
    const [riskTrends, actionTrends, issueTrends, decisionTrends] =
      await Promise.all([
        prisma.$queryRawUnsafe<{ date: Date; count: bigint }[]>(
          `
        SELECT DATE("createdAt") as date, COUNT(*) as count
        FROM "ProjectRisk"
        WHERE "projectId" = $1 AND "createdAt" >= $2
        GROUP BY DATE("createdAt")
        ORDER BY date
      `,
          projectId,
          startDate,
        ),
        prisma
          .$queryRawUnsafe<{ date: Date; count: bigint }[]>(
            `
        SELECT DATE("createdAt") as date, COUNT(*) as count
        FROM "ActionItem"
        WHERE "projectId" = $1 AND "createdAt" >= $2
        GROUP BY DATE("createdAt")
        ORDER BY date
      `,
            projectId,
            startDate,
          )
          .catch(() => []),
        prisma
          .$queryRawUnsafe<{ date: Date; count: bigint }[]>(
            `
        SELECT DATE("createdAt") as date, COUNT(*) as count
        FROM "ProjectIssue"
        WHERE "projectId" = $1 AND "createdAt" >= $2
        GROUP BY DATE("createdAt")
        ORDER BY date
      `,
            projectId,
            startDate,
          )
          .catch(() => []),
        prisma
          .$queryRawUnsafe<{ date: Date; count: bigint }[]>(
            `
        SELECT DATE("createdAt") as date, COUNT(*) as count
        FROM "Decision"
        WHERE "projectId" = $1 AND "createdAt" >= $2
        GROUP BY DATE("createdAt")
        ORDER BY date
      `,
            projectId,
            startDate,
          )
          .catch(() => []),
      ]);

    // Build trend points
    const trendMap = new Map<string, RAIDTrendPoint>();

    // Initialize all dates
    for (let i = 0; i <= days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      trendMap.set(key, {
        date: new Date(key),
        risks: 0,
        actionItems: 0,
        issues: 0,
        decisions: 0,
      });
    }

    // Populate from results
    for (const r of riskTrends) {
      const key = new Date(r.date).toISOString().split('T')[0];
      const point = trendMap.get(key);
      if (point) point.risks = Number(r.count);
    }
    for (const r of actionTrends) {
      const key = new Date(r.date).toISOString().split('T')[0];
      const point = trendMap.get(key);
      if (point) point.actionItems = Number(r.count);
    }
    for (const r of issueTrends) {
      const key = new Date(r.date).toISOString().split('T')[0];
      const point = trendMap.get(key);
      if (point) point.issues = Number(r.count);
    }
    for (const r of decisionTrends) {
      const key = new Date(r.date).toISOString().split('T')[0];
      const point = trendMap.get(key);
      if (point) point.decisions = Number(r.count);
    }

    return Array.from(trendMap.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
  } catch {
    return [];
  }
};
