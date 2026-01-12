/**
 * Project ML Prediction Service
 *
 * Core orchestration service for ML-powered predictions in Project Management.
 * Handles prediction storage, retrieval, validation, and accuracy tracking.
 *
 * @module project-ml/services/project-ml-prediction
 */

import prisma from '../../../prisma/client';
import { isAIAvailable } from '../../ai-monitoring/ai-client';
import type {
  ProjectMLPredictionType,
  MLPredictionStatus,
} from '@prisma/client';
import type {
  ProjectMLPredictionResult,
  StoredPrediction,
  ListPredictionsOptions,
  PredictionAccuracyMetrics,
  RiskFactor,
  Recommendation,
} from '../types';

// ============================================================================
// Configuration
// ============================================================================

/**
 * ML prediction configuration
 */
export const ML_CONFIG = {
  defaultPredictionWindowDays: 30,
  predictionValidityDays: 7,
  maxPredictionsPerDay: 100,
  minConfidenceThreshold: 0.5,
  successThresholds: {
    excellent: 0.8,
    good: 0.6,
    fair: 0.4,
    poor: 0,
  },
  riskThresholds: {
    critical: 0.8,
    high: 0.6,
    medium: 0.3,
    low: 0,
  },
};

// ============================================================================
// Prediction Storage
// ============================================================================

/**
 * Store a prediction in the database.
 *
 * @param projectId - Project the prediction is for
 * @param tenantId - Tenant context
 * @param result - ML prediction result
 * @returns Created prediction record ID
 */
export async function storePrediction(
  projectId: number,
  tenantId: string,
  result: ProjectMLPredictionResult,
  additionalData?: {
    predictedEndDate?: Date;
    originalEndDate?: Date;
    daysVariance?: number;
    resourceRecommendations?: unknown;
    workloadAnalysis?: unknown;
  },
): Promise<{ id: number }> {
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + ML_CONFIG.predictionValidityDays);

  const prediction = await prisma.projectMLPrediction.create({
    data: {
      tenantId,
      projectId,
      predictionType: result.predictionType,
      probability: result.probability,
      confidence: result.confidence,
      predictionWindow: result.predictionWindowDays,
      riskFactors: result.riskFactors as unknown as object,
      explanation: result.explanation,
      recommendations: result.recommendations as unknown as object,
      validUntil,
      llmModel: result.llmMetadata.model,
      llmTokensUsed: result.llmMetadata.tokensUsed,
      llmCost: result.llmMetadata.estimatedCost,
      // Additional fields for specific prediction types
      predictedEndDate: additionalData?.predictedEndDate,
      originalEndDate: additionalData?.originalEndDate,
      daysVariance: additionalData?.daysVariance,
      resourceRecommendations:
        additionalData?.resourceRecommendations as object,
      workloadAnalysis: additionalData?.workloadAnalysis as object,
    },
    select: { id: true },
  });

  return prediction;
}

/**
 * Get the most recent prediction of a type for a project
 */
export async function getLatestPrediction(
  projectId: number,
  predictionType: ProjectMLPredictionType,
  includeExpired: boolean = false,
): Promise<StoredPrediction | null> {
  const now = new Date();

  const prediction = await prisma.projectMLPrediction.findFirst({
    where: {
      projectId,
      predictionType,
      ...(!includeExpired && { validUntil: { gte: now }, status: 'ACTIVE' }),
    },
    orderBy: { predictedAt: 'desc' },
    select: {
      id: true,
      predictionType: true,
      probability: true,
      confidence: true,
      riskFactors: true,
      explanation: true,
      recommendations: true,
      predictedAt: true,
      validUntil: true,
      status: true,
      wasAccurate: true,
      predictedEndDate: true,
      daysVariance: true,
      resourceRecommendations: true,
      workloadAnalysis: true,
    },
  });

  if (!prediction) {
    return null;
  }

  return {
    id: prediction.id,
    predictionType: prediction.predictionType,
    probability: prediction.probability,
    confidence: prediction.confidence,
    riskFactors: prediction.riskFactors as unknown as RiskFactor[],
    explanation: prediction.explanation,
    recommendations: prediction.recommendations as Recommendation[] | null,
    predictedAt: prediction.predictedAt,
    validUntil: prediction.validUntil,
    status: prediction.status,
    wasAccurate: prediction.wasAccurate,
    predictedEndDate: prediction.predictedEndDate,
    daysVariance: prediction.daysVariance,
    resourceRecommendations: prediction.resourceRecommendations as unknown[],
    workloadAnalysis: prediction.workloadAnalysis,
  } as StoredPrediction;
}

/**
 * List predictions for a project
 */
export async function listProjectPredictions(
  projectId: number,
  options: ListPredictionsOptions = {},
): Promise<StoredPrediction[]> {
  const now = new Date();

  const predictions = await prisma.projectMLPrediction.findMany({
    where: {
      projectId,
      ...(options.type && { predictionType: options.type }),
      ...(!options.includeExpired && {
        OR: [{ validUntil: { gte: now } }, { status: 'VALIDATED' }],
      }),
    },
    select: {
      id: true,
      predictionType: true,
      probability: true,
      confidence: true,
      riskFactors: true,
      explanation: true,
      recommendations: true,
      predictedAt: true,
      validUntil: true,
      status: true,
      wasAccurate: true,
      predictedEndDate: true,
      daysVariance: true,
    },
    orderBy: { predictedAt: 'desc' },
    take: 50,
  });

  return predictions.map((p) => ({
    id: p.id,
    predictionType: p.predictionType,
    probability: p.probability,
    confidence: p.confidence,
    riskFactors: p.riskFactors as unknown as RiskFactor[],
    explanation: p.explanation,
    recommendations: p.recommendations as Recommendation[] | null,
    predictedAt: p.predictedAt,
    validUntil: p.validUntil,
    status: p.status,
    wasAccurate: p.wasAccurate,
    predictedEndDate: p.predictedEndDate,
    daysVariance: p.daysVariance,
  })) as StoredPrediction[];
}

// ============================================================================
// Prediction Validation
// ============================================================================

/**
 * Validate expired predictions against actual outcomes.
 *
 * @param tenantId - Tenant context
 * @returns Number of predictions validated
 */
export async function validateExpiredPredictions(
  tenantId: string,
): Promise<{ validated: number }> {
  const now = new Date();

  // Find expired but unvalidated predictions
  const expiredPredictions = await prisma.projectMLPrediction.findMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      validUntil: { lt: now },
    },
    include: {
      project: {
        select: {
          status: true,
          healthStatus: true,
          endDate: true,
        },
      },
    },
  });

  let validated = 0;

  for (const prediction of expiredPredictions) {
    let actualOutcome: boolean | null = null;
    let wasAccurate: boolean | null = null;

    if (prediction.predictionType === 'SUCCESS_PREDICTION') {
      // Check if project was completed successfully
      const isCompleted = prediction.project.status === 'COMPLETED';
      const wasOnTrack = prediction.project.healthStatus === 'ON_TRACK';
      actualOutcome = isCompleted && wasOnTrack;

      if (actualOutcome !== null) {
        const predictedSuccess = prediction.probability >= 0.5;
        wasAccurate = predictedSuccess === actualOutcome;
      }
    } else if (prediction.predictionType === 'RISK_FORECAST') {
      // Check if project encountered problems
      const hadProblems =
        prediction.project.healthStatus === 'AT_RISK' ||
        prediction.project.healthStatus === 'OFF_TRACK';
      actualOutcome = hadProblems;

      if (actualOutcome !== null) {
        const predictedRisk = prediction.probability >= 0.5;
        wasAccurate = predictedRisk === actualOutcome;
      }
    } else if (prediction.predictionType === 'TIMELINE_PREDICTION') {
      // Check if prediction was within tolerance
      if (prediction.predictedEndDate && prediction.project.endDate) {
        const actualEnd = new Date(prediction.project.endDate);
        const predictedEnd = new Date(prediction.predictedEndDate);
        const diffDays = Math.abs(
          (actualEnd.getTime() - predictedEnd.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        // Consider accurate if within 7 days
        wasAccurate = diffDays <= 7;
        actualOutcome = true;
      }
    }

    // Update prediction with validation results
    await prisma.projectMLPrediction.update({
      where: { id: prediction.id },
      data: {
        status: 'VALIDATED',
        validatedAt: now,
        actualOutcome,
        wasAccurate,
      },
    });

    validated++;
  }

  return { validated };
}

/**
 * Get prediction accuracy metrics for a tenant
 */
export async function getPredictionAccuracy(
  tenantId: string,
  predictionType?: ProjectMLPredictionType,
): Promise<PredictionAccuracyMetrics> {
  const where = {
    tenantId,
    status: 'VALIDATED' as MLPredictionStatus,
    ...(predictionType && { predictionType }),
  };

  const [totalPredictions, validatedPredictions] = await Promise.all([
    prisma.projectMLPrediction.count({
      where: { tenantId, ...(predictionType && { predictionType }) },
    }),
    prisma.projectMLPrediction.findMany({
      where,
      select: {
        predictionType: true,
        wasAccurate: true,
      },
    }),
  ]);

  // Calculate accuracy by type
  const byType: Record<string, { total: number; accurate: number }> = {};

  for (const pred of validatedPredictions) {
    if (!byType[pred.predictionType]) {
      byType[pred.predictionType] = { total: 0, accurate: 0 };
    }
    byType[pred.predictionType].total++;
    if (pred.wasAccurate) {
      byType[pred.predictionType].accurate++;
    }
  }

  const validatedCount = validatedPredictions.length;
  const accurateCount = validatedPredictions.filter(
    (p) => p.wasAccurate,
  ).length;
  const accuracy = validatedCount > 0 ? accurateCount / validatedCount : 0;

  return {
    totalPredictions,
    validatedCount,
    accurateCount,
    accuracy,
    byType,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a recent prediction exists and is still valid
 */
export async function hasRecentPrediction(
  projectId: number,
  predictionType: ProjectMLPredictionType,
  maxAgeDays: number = 1,
): Promise<boolean> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxAgeDays);

  const count = await prisma.projectMLPrediction.count({
    where: {
      projectId,
      predictionType,
      predictedAt: { gte: cutoff },
      status: 'ACTIVE',
    },
  });

  return count > 0;
}

/**
 * Check if AI/LLM is available for predictions
 */
export function isMLAvailable(): boolean {
  return isAIAvailable();
}

/**
 * Get ML configuration
 */
export function getMLConfig() {
  return { ...ML_CONFIG };
}

/**
 * Get high-risk projects based on ML predictions
 */
export async function getHighRiskProjects(
  tenantId: string,
  minProbability: number = 0.6,
  limit: number = 50,
): Promise<
  Array<{
    project: {
      id: number;
      name: string;
      status: string;
      healthStatus: string;
    };
    prediction: {
      id: number;
      predictionType: ProjectMLPredictionType;
      probability: number;
      confidence: number;
      explanation: string | null;
      predictedAt: Date;
    };
  }>
> {
  const now = new Date();

  const predictions = await prisma.projectMLPrediction.findMany({
    where: {
      tenantId,
      predictionType: { in: ['SUCCESS_PREDICTION', 'RISK_FORECAST'] },
      status: 'ACTIVE',
      validUntil: { gte: now },
      // For success, low probability = high risk; for risk, high probability = high risk
      OR: [
        {
          predictionType: 'SUCCESS_PREDICTION',
          probability: { lte: 1 - minProbability },
        },
        {
          predictionType: 'RISK_FORECAST',
          probability: { gte: minProbability },
        },
      ],
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          status: true,
          healthStatus: true,
        },
      },
    },
    orderBy: { probability: 'desc' },
    take: limit,
  });

  return predictions.map((p) => ({
    project: {
      id: p.project.id,
      name: p.project.name,
      status: p.project.status,
      healthStatus: p.project.healthStatus,
    },
    prediction: {
      id: p.id,
      predictionType: p.predictionType,
      probability: p.probability,
      confidence: p.confidence,
      explanation: p.explanation,
      predictedAt: p.predictedAt,
    },
  }));
}

/**
 * Expire old predictions that are past their validity period
 */
export async function expireOldPredictions(tenantId: string): Promise<number> {
  const now = new Date();

  const result = await prisma.projectMLPrediction.updateMany({
    where: {
      tenantId,
      status: 'ACTIVE',
      validUntil: { lt: now },
    },
    data: {
      status: 'EXPIRED',
    },
  });

  return result.count;
}
