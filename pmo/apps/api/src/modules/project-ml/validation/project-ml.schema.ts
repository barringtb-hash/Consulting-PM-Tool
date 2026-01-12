/**
 * Project ML Validation Schemas
 *
 * Zod schemas for validating Project ML API requests.
 *
 * @module project-ml/validation
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export const projectMLPredictionTypeSchema = z.enum([
  'SUCCESS_PREDICTION',
  'RISK_FORECAST',
  'TIMELINE_PREDICTION',
  'RESOURCE_OPTIMIZATION',
]);

// ============================================================================
// Parameter Schemas
// ============================================================================

export const projectIdParamSchema = z.object({
  projectId: z.coerce.number().int().positive(),
});

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Schema for generating a prediction
 */
export const generatePredictionSchema = z.object({
  predictionType: projectMLPredictionTypeSchema,
  options: z
    .object({
      forceRefresh: z.boolean().optional(),
      predictionWindowDays: z.number().int().positive().max(365).optional(),
    })
    .optional(),
});

/**
 * Schema for getting predictions list
 */
export const listPredictionsQuerySchema = z.object({
  type: projectMLPredictionTypeSchema.optional(),
  includeExpired: z.coerce.boolean().optional().default(false),
});

/**
 * Schema for batch prediction
 */
export const batchPredictionSchema = z.object({
  predictionType: projectMLPredictionTypeSchema,
  maxProjects: z.number().int().positive().max(100).optional().default(50),
  filter: z.enum(['active', 'all']).optional().default('active'),
});

/**
 * Schema for high-risk projects query
 */
export const highRiskQuerySchema = z.object({
  minRisk: z.coerce.number().min(0).max(1).optional().default(0.6),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

/**
 * Schema for accuracy query
 */
export const accuracyQuerySchema = z.object({
  predictionType: projectMLPredictionTypeSchema.optional(),
});

// ============================================================================
// Response Types (for documentation)
// ============================================================================

/**
 * Base prediction response structure
 */
export interface PredictionResponse {
  success: boolean;
  data: {
    id?: number;
    predictionType: string;
    probability: number;
    confidence: number;
    predictionWindowDays: number;
    riskFactors: unknown[];
    explanation: string;
    recommendations: unknown[];
    predictedAt?: string;
    validUntil?: string;
  };
  llmMetadata?: {
    model: string;
    tokensUsed: number;
    latencyMs: number;
    estimatedCost: number;
  };
}

/**
 * High-risk projects response structure
 */
export interface HighRiskProjectsResponse {
  success: boolean;
  data: Array<{
    project: {
      id: number;
      name: string;
      status: string;
      healthStatus: string;
    };
    prediction: {
      id: number;
      predictionType: string;
      probability: number;
      confidence: number;
      explanation: string | null;
      predictedAt: string;
    };
  }>;
}

/**
 * Accuracy metrics response structure
 */
export interface AccuracyResponse {
  success: boolean;
  data: {
    totalPredictions: number;
    validatedCount: number;
    accurateCount: number;
    accuracy: number;
    byType: Record<
      string,
      {
        total: number;
        accurate: number;
      }
    >;
  };
}

/**
 * ML status response structure
 */
export interface MLStatusResponse {
  success: boolean;
  data: {
    available: boolean;
    features: string[];
    config: {
      defaultPredictionWindowDays: number;
      predictionValidityDays: number;
    };
  };
}
