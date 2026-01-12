/**
 * Intelligent CTA Service
 *
 * Auto-generates CTAs based on ML predictions.
 * Handles cooldown periods, duplicate checking, and playbook matching.
 *
 * @module customer-success-ml/services/intelligent-cta
 */

import prisma from '../../../prisma/client';
import { createAccountCTA } from '../../../crm/services/account-cta.service';
import { linkCTAToPrediction, getMLConfig } from './cs-ml-prediction.service';
import type {
  GeneratedCTAResult,
  ChurnPredictionOutput,
  MLPredictionResult,
} from '../types';
import type { CTAType, CTAPriority } from '@prisma/client';
import { logger } from '../../../utils/logger';

// ============================================================================
// Configuration
// ============================================================================

/**
 * CTA generation configuration
 */
const CTA_CONFIG = {
  /** Minimum days between auto-generated CTAs for same account/type */
  cooldownDays: 7,
  /** Minimum confidence to generate CTA */
  minConfidenceThreshold: 0.5,
  /** Priority mappings for churn probability */
  churnPriorityMapping: {
    critical: 'CRITICAL' as CTAPriority,
    high: 'HIGH' as CTAPriority,
    medium: 'MEDIUM' as CTAPriority,
    low: 'LOW' as CTAPriority,
  },
};

// ============================================================================
// Main CTA Generation
// ============================================================================

/**
 * Generate a CTA from an ML prediction.
 *
 * Handles:
 * - Cooldown checking (avoid CTA flooding)
 * - Duplicate checking
 * - Playbook matching
 * - CTA creation and linking to prediction
 *
 * @param accountId - Account to create CTA for
 * @param tenantId - Tenant context
 * @param prediction - ML prediction that triggered this CTA
 * @param ownerId - User to assign CTA to
 * @returns Generated CTA result
 *
 * @example
 * ```typescript
 * const result = await generateCTAFromPrediction(
 *   123,
 *   'tenant-abc',
 *   churnPrediction,
 *   456
 * );
 *
 * if (result.wasCreated) {
 *   console.log('CTA created:', result.cta?.id);
 * } else {
 *   console.log('Skipped:', result.skippedReason);
 * }
 * ```
 */
export async function generateCTAFromPrediction(
  accountId: number,
  tenantId: string,
  prediction: MLPredictionResult,
  ownerId: number,
  predictionId?: number,
): Promise<GeneratedCTAResult> {
  // Check if CTA generation is enabled
  const config = getMLConfig();
  if (!config) {
    return {
      cta: null,
      predictionId: predictionId ?? 0,
      generationReason: 'ML config not available',
      wasCreated: false,
      skippedReason: 'ML configuration not available',
    };
  }

  // Check confidence threshold
  if (prediction.confidence < CTA_CONFIG.minConfidenceThreshold) {
    return {
      cta: null,
      predictionId: predictionId ?? 0,
      generationReason: 'Low confidence prediction',
      wasCreated: false,
      skippedReason: `Confidence ${prediction.confidence} below threshold ${CTA_CONFIG.minConfidenceThreshold}`,
    };
  }

  // Check if prediction has a suggested CTA
  if (!prediction.suggestedCTA) {
    return {
      cta: null,
      predictionId: predictionId ?? 0,
      generationReason: 'No CTA suggested by prediction',
      wasCreated: false,
      skippedReason: 'Prediction did not include a CTA suggestion',
    };
  }

  const suggestedCTA = prediction.suggestedCTA;

  // Check cooldown
  const isOnCooldown = await checkCTACooldown(
    accountId,
    suggestedCTA.type,
    CTA_CONFIG.cooldownDays,
  );
  if (isOnCooldown) {
    return {
      cta: null,
      predictionId: predictionId ?? 0,
      generationReason: prediction.explanation,
      wasCreated: false,
      skippedReason: `CTA cooldown active (${CTA_CONFIG.cooldownDays} days)`,
    };
  }

  // Check for existing similar CTA
  const hasSimilar = await checkSimilarCTA(accountId, suggestedCTA.title);
  if (hasSimilar) {
    return {
      cta: null,
      predictionId: predictionId ?? 0,
      generationReason: prediction.explanation,
      wasCreated: false,
      skippedReason: 'Similar CTA already exists',
    };
  }

  // Find matching playbook
  const playbookId = await findMatchingPlaybook(suggestedCTA.type, tenantId);

  // Calculate due date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + suggestedCTA.dueDays);

  // Create the CTA
  try {
    const cta = await createAccountCTA({
      accountId,
      ownerId,
      type: suggestedCTA.type,
      priority: suggestedCTA.priority,
      title: suggestedCTA.title,
      description: formatCTADescription(prediction),
      reason: suggestedCTA.reason,
      dueDate,
      playbookId: playbookId ?? undefined,
      isAutomated: true,
      triggerRule: `ML_${prediction.predictionType}`,
      triggerData: {
        predictionType: prediction.predictionType,
        probability: prediction.probability,
        confidence: prediction.confidence,
        predictionId,
      },
    });

    // Link CTA to prediction
    if (predictionId) {
      await linkCTAToPrediction(predictionId, cta.id);
    }

    logger.info('Generated CTA from ML prediction', {
      accountId,
      ctaId: cta.id,
      predictionType: prediction.predictionType,
      probability: prediction.probability,
    });

    return {
      cta: cta as unknown as GeneratedCTAResult['cta'],
      predictionId: predictionId ?? 0,
      generationReason: prediction.explanation,
      wasCreated: true,
    };
  } catch (error) {
    logger.error('Failed to create CTA from prediction', {
      accountId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      cta: null,
      predictionId: predictionId ?? 0,
      generationReason: prediction.explanation,
      wasCreated: false,
      skippedReason: `CTA creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ============================================================================
// Batch CTA Generation
// ============================================================================

/**
 * Generate CTAs from multiple predictions.
 *
 * Used for batch processing of high-risk accounts.
 *
 * @param predictions - Array of predictions with account info
 * @param tenantId - Tenant context
 * @param defaultOwnerId - Default owner for CTAs
 * @param maxCTAs - Maximum CTAs to generate
 * @returns Array of generation results
 */
export async function generateBatchCTAs(
  predictions: Array<{
    accountId: number;
    predictionId: number;
    prediction: MLPredictionResult;
  }>,
  tenantId: string,
  defaultOwnerId: number,
  maxCTAs: number = 20,
): Promise<{
  generated: number;
  skipped: number;
  results: GeneratedCTAResult[];
}> {
  const results: GeneratedCTAResult[] = [];
  let generated = 0;

  // Sort by probability descending to prioritize highest risk
  const sorted = [...predictions].sort(
    (a, b) => b.prediction.probability - a.prediction.probability,
  );

  for (const item of sorted) {
    if (generated >= maxCTAs) {
      break;
    }

    const result = await generateCTAFromPrediction(
      item.accountId,
      tenantId,
      item.prediction,
      defaultOwnerId,
      item.predictionId,
    );

    results.push(result);

    if (result.wasCreated) {
      generated++;
    }
  }

  return {
    generated,
    skipped: results.filter((r) => !r.wasCreated).length,
    results,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if CTA cooldown is active for this account/type combination
 */
async function checkCTACooldown(
  accountId: number,
  ctaType: CTAType,
  cooldownDays: number,
): Promise<boolean> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - cooldownDays);

  const recentCTA = await prisma.cTA.findFirst({
    where: {
      accountId,
      type: ctaType,
      isAutomated: true,
      createdAt: { gte: cutoffDate },
    },
  });

  return recentCTA !== null;
}

/**
 * Check if a similar CTA already exists (by title similarity)
 */
async function checkSimilarCTA(
  accountId: number,
  title: string,
): Promise<boolean> {
  // Check for exact title match in open CTAs
  const existingCTA = await prisma.cTA.findFirst({
    where: {
      accountId,
      title,
      status: { in: ['OPEN', 'IN_PROGRESS'] },
    },
  });

  return existingCTA !== null;
}

/**
 * Find a matching playbook for the CTA type
 */
async function findMatchingPlaybook(
  ctaType: CTAType,
  tenantId: string,
): Promise<number | null> {
  // Look for playbooks tagged for this CTA type
  const playbook = await prisma.playbook.findFirst({
    where: {
      tenantId,
      status: 'ACTIVE',
      // Match playbooks that are commonly used for this type
      OR: [{ name: { contains: ctaType.toLowerCase() } }, { ctaType }],
    },
    orderBy: { timesUsed: 'desc' },
  });

  return playbook?.id ?? null;
}

/**
 * Format CTA description from prediction
 */
function formatCTADescription(prediction: MLPredictionResult): string {
  let description = `**ML Analysis**: ${prediction.explanation}\n\n`;

  if (prediction.riskFactors.length > 0) {
    description += '**Key Risk Factors:**\n';
    for (const factor of prediction.riskFactors.slice(0, 3)) {
      description += `- ${factor.factor}: ${factor.description}\n`;
    }
    description += '\n';
  }

  if (prediction.recommendations.length > 0) {
    description += '**Recommended Actions:**\n';
    for (const rec of prediction.recommendations.slice(0, 3)) {
      description += `- ${rec.action}\n`;
    }
  }

  description += `\n*Confidence: ${Math.round(prediction.confidence * 100)}%*`;

  return description;
}

// ============================================================================
// CTA Generation from Churn Prediction
// ============================================================================

/**
 * Generate CTA specifically from churn prediction.
 *
 * Specialized handling for churn predictions with urgency-based priority.
 *
 * @param accountId - Account ID
 * @param tenantId - Tenant context
 * @param churnPrediction - Churn prediction output
 * @param ownerId - Owner to assign CTA
 * @param predictionId - ID of stored prediction
 * @returns Generated CTA result
 */
export async function generateChurnCTA(
  accountId: number,
  tenantId: string,
  churnPrediction: ChurnPredictionOutput,
  ownerId: number,
  predictionId?: number,
): Promise<GeneratedCTAResult> {
  // Only generate for high-risk accounts
  if (
    churnPrediction.riskCategory !== 'critical' &&
    churnPrediction.riskCategory !== 'high'
  ) {
    return {
      cta: null,
      predictionId: predictionId ?? 0,
      generationReason: 'Low churn risk',
      wasCreated: false,
      skippedReason: `Risk category '${churnPrediction.riskCategory}' does not warrant CTA`,
    };
  }

  // Use the suggested CTA from the prediction, or create default
  const suggestedCTA = churnPrediction.suggestedCTA ?? {
    type: 'RISK' as CTAType,
    priority: CTA_CONFIG.churnPriorityMapping[churnPrediction.riskCategory],
    title: `Address churn risk - ${Math.round(churnPrediction.churnProbability * 100)}% probability`,
    reason: churnPrediction.explanation,
    dueDays: getUrgencyDueDays(churnPrediction.interventionUrgency),
  };

  // Override the prediction's suggestedCTA with our churn-specific one
  const predictionWithCTA: MLPredictionResult = {
    ...churnPrediction,
    suggestedCTA,
  };

  return generateCTAFromPrediction(
    accountId,
    tenantId,
    predictionWithCTA,
    ownerId,
    predictionId,
  );
}

/**
 * Get due days from intervention urgency
 */
function getUrgencyDueDays(
  urgency: 'immediate' | 'this_week' | 'this_month' | 'monitor',
): number {
  switch (urgency) {
    case 'immediate':
      return 1;
    case 'this_week':
      return 5;
    case 'this_month':
      return 14;
    default:
      return 30;
  }
}

// ============================================================================
// CTA Stats
// ============================================================================

/**
 * Get statistics on ML-generated CTAs
 */
export async function getMLCTAStats(tenantId: string): Promise<{
  totalGenerated: number;
  openCount: number;
  completedCount: number;
  completionRate: number;
  byType: Record<string, number>;
  averageResolutionDays: number | null;
}> {
  const baseWhere = {
    tenantId,
    isAutomated: true,
    triggerRule: { startsWith: 'ML_' },
  };

  const [totalGenerated, openCount, completedCount, byType, completedCTAs] =
    await Promise.all([
      prisma.cTA.count({ where: baseWhere }),
      prisma.cTA.count({
        where: { ...baseWhere, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
      prisma.cTA.count({ where: { ...baseWhere, status: 'COMPLETED' } }),
      prisma.cTA.groupBy({
        by: ['type'],
        where: baseWhere,
        _count: true,
      }),
      prisma.cTA.findMany({
        where: {
          ...baseWhere,
          status: 'COMPLETED',
          completedAt: { not: null },
        },
        select: { createdAt: true, completedAt: true },
      }),
    ]);

  // Calculate average resolution time
  let averageResolutionDays: number | null = null;
  if (completedCTAs.length > 0) {
    const totalDays = completedCTAs.reduce((sum, cta) => {
      const days = cta.completedAt
        ? (cta.completedAt.getTime() - cta.createdAt.getTime()) /
          (1000 * 60 * 60 * 24)
        : 0;
      return sum + days;
    }, 0);
    averageResolutionDays = Math.round(totalDays / completedCTAs.length);
  }

  // Format by type
  const byTypeRecord: Record<string, number> = {};
  for (const item of byType) {
    byTypeRecord[item.type] = item._count;
  }

  return {
    totalGenerated,
    openCount,
    completedCount,
    completionRate: totalGenerated > 0 ? completedCount / totalGenerated : 0,
    byType: byTypeRecord,
    averageResolutionDays,
  };
}
