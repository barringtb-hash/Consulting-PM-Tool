/**
 * ML Prediction Validation Schemas
 *
 * Zod validation schemas for Customer Success ML prediction endpoints.
 * Validates request bodies and query parameters.
 *
 * @module validation/crm/ml-prediction
 */

import { z } from 'zod';

// ============================================================================
// Enum Schemas
// ============================================================================

/**
 * Valid ML prediction types
 */
export const mlPredictionTypeSchema = z.enum([
  'CHURN',
  'HEALTH_TREND',
  'EXPANSION',
  'ENGAGEMENT_DECLINE',
]);

/**
 * Valid prediction statuses
 */
export const mlPredictionStatusSchema = z.enum([
  'ACTIVE',
  'EXPIRED',
  'VALIDATED',
]);

// ============================================================================
// Request Body Schemas
// ============================================================================

/**
 * Schema for generating a single prediction
 *
 * @example
 * POST /api/crm/accounts/:id/ml/predict
 * {
 *   "predictionType": "CHURN",
 *   "options": {
 *     "forceRefresh": true,
 *     "skipCTAGeneration": false
 *   }
 * }
 */
export const generatePredictionSchema = z.object({
  /** Type of prediction to generate */
  predictionType: mlPredictionTypeSchema,
  /** Optional prediction options */
  options: z
    .object({
      /** Force refresh even if recent prediction exists */
      forceRefresh: z.boolean().optional(),
      /** Skip automatic CTA generation */
      skipCTAGeneration: z.boolean().optional(),
    })
    .optional(),
});

/**
 * Schema for batch prediction generation
 *
 * @example
 * POST /api/crm/accounts/portfolio/ml/batch-predict
 * {
 *   "predictionType": "CHURN",
 *   "maxAccounts": 50,
 *   "priorityFilter": "high_risk"
 * }
 */
export const batchPredictSchema = z.object({
  /** Type of prediction to generate */
  predictionType: mlPredictionTypeSchema,
  /** Maximum accounts to process (1-500) */
  maxAccounts: z.coerce
    .number()
    .int()
    .positive()
    .max(500)
    .optional()
    .default(100),
  /** Filter accounts by risk level */
  priorityFilter: z.enum(['high_risk', 'all']).optional().default('high_risk'),
});

/**
 * Schema for batch CTA generation from predictions
 *
 * @example
 * POST /api/crm/accounts/portfolio/ml/generate-ctas
 * {
 *   "predictionType": "CHURN",
 *   "maxCTAs": 20
 * }
 */
export const generateBatchCTAsSchema = z.object({
  /** Filter by prediction type (optional) */
  predictionType: mlPredictionTypeSchema.optional(),
  /** Maximum CTAs to generate (1-50) */
  maxCTAs: z.coerce.number().int().positive().max(50).optional().default(20),
});

/**
 * Schema for validating predictions
 *
 * @example
 * POST /api/crm/accounts/portfolio/ml/validate-predictions
 * {}
 */
export const validatePredictionsSchema = z.object({}).optional();

// ============================================================================
// Query Parameter Schemas
// ============================================================================

/**
 * Schema for listing predictions
 *
 * @example
 * GET /api/crm/accounts/:id/ml/predictions?type=CHURN&includeExpired=false
 */
export const listPredictionsSchema = z.object({
  /** Filter by prediction type */
  type: mlPredictionTypeSchema.optional(),
  /** Include expired predictions */
  includeExpired: z.coerce.boolean().optional().default(false),
});

/**
 * Schema for fetching high-risk accounts
 *
 * @example
 * GET /api/crm/accounts/portfolio/ml/high-risk?minProbability=0.6&limit=50
 */
export const highRiskAccountsSchema = z.object({
  /** Minimum churn probability (0-1) */
  minProbability: z.coerce.number().min(0).max(1).optional().default(0.6),
  /** Maximum accounts to return */
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

/**
 * Schema for fetching prediction accuracy
 *
 * @example
 * GET /api/crm/accounts/portfolio/ml/accuracy?predictionType=CHURN
 */
export const predictionAccuracySchema = z.object({
  /** Filter by prediction type */
  predictionType: mlPredictionTypeSchema.optional(),
});

// ============================================================================
// Path Parameter Schemas
// ============================================================================

/**
 * Schema for account ID path parameter
 */
export const accountIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/**
 * Schema for prediction ID path parameter
 */
export const predictionIdParamSchema = z.object({
  predictionId: z.coerce.number().int().positive(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type GeneratePredictionInput = z.infer<typeof generatePredictionSchema>;
export type BatchPredictInput = z.infer<typeof batchPredictSchema>;
export type GenerateBatchCTAsInput = z.infer<typeof generateBatchCTAsSchema>;
export type ListPredictionsQuery = z.infer<typeof listPredictionsSchema>;
export type HighRiskAccountsQuery = z.infer<typeof highRiskAccountsSchema>;
export type PredictionAccuracyQuery = z.infer<typeof predictionAccuracySchema>;
