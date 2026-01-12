/**
 * Customer Success ML Router
 *
 * REST API endpoints for ML-powered Customer Success predictions.
 * Provides churn prediction, health insights, and intelligent CTA generation.
 *
 * @module customer-success-ml/router
 */

import { Router, Response } from 'express';
import {
  requireAuth,
  type AuthenticatedRequest,
} from '../../auth/auth.middleware';
import {
  tenantMiddleware,
  requireTenant as _requireTenant,
  type TenantRequest,
} from '../../tenant/tenant.middleware';
import {
  generatePredictionSchema,
  batchPredictSchema,
  generateBatchCTAsSchema,
  listPredictionsSchema,
  highRiskAccountsSchema,
  predictionAccuracySchema,
  accountIdParamSchema,
} from '../../validation/crm/ml-prediction.schema';
import {
  predictChurn,
  getExistingChurnPrediction,
  analyzeAccountHealth,
  listAccountPredictions,
  getHighRiskAccounts,
  getPredictionAccuracy,
  validateExpiredPredictions,
  generateCTAFromPrediction,
  generateBatchCTAs,
  getMLCTAStats,
  isMLAvailable,
  gatherAccountContext as _gatherAccountContext,
} from './services';
import { logger } from '../../utils/logger';

const router = Router();

// All routes require authentication and tenant context
router.use(requireAuth, tenantMiddleware);

// ============================================================================
// Account-Level ML Endpoints
// ============================================================================

/**
 * POST /api/crm/accounts/:id/ml/predict
 *
 * Generate an ML prediction for an account.
 */
router.post(
  '/:id/ml/predict',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = accountIdParamSchema.parse(req.params);
      const { predictionType, options } = generatePredictionSchema.parse(
        req.body,
      );

      const tenantId = (req as TenantRequest).tenantContext?.tenantId;
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant context required' });
      }

      // Note: Services have built-in rule-based fallback when LLM is unavailable
      let result;

      switch (predictionType) {
        case 'CHURN':
          // Check for existing prediction unless force refresh
          if (!options?.forceRefresh) {
            const existing = await getExistingChurnPrediction(id);
            if (existing) {
              return res.json({
                data: existing,
                cached: true,
              });
            }
          }

          result = await predictChurn({
            accountId: id,
            tenantId,
            predictionWindowDays: 90,
          });
          break;

        case 'HEALTH_TREND':
          result = await analyzeAccountHealth({
            accountId: id,
            tenantId,
          });
          break;

        default:
          return res.status(400).json({
            error: 'Invalid prediction type',
            message: `Prediction type '${predictionType}' is not yet implemented`,
          });
      }

      return res.json({ data: result });
    } catch (error) {
      logger.error('ML prediction failed', {
        accountId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Account not found' });
      }

      return res.status(500).json({
        error: 'Prediction failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

/**
 * GET /api/crm/accounts/:id/ml/churn-risk
 *
 * Get churn prediction for an account.
 */
router.get(
  '/:id/ml/churn-risk',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = accountIdParamSchema.parse(req.params);
      const tenantId = (req as TenantRequest).tenantContext?.tenantId;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant context required' });
      }

      // Try to get existing prediction first
      const existing = await getExistingChurnPrediction(id);
      if (existing) {
        return res.json({ data: existing, cached: true });
      }

      // Generate new prediction (services have built-in rule-based fallback)
      const result = await predictChurn({
        accountId: id,
        tenantId,
        predictionWindowDays: 90,
      });

      return res.json({ data: result });
    } catch (error) {
      logger.error('Churn prediction failed', {
        accountId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Account not found' });
      }

      return res.status(500).json({
        error: 'Prediction failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

/**
 * GET /api/crm/accounts/:id/ml/health-insights
 *
 * Get ML-enhanced health analysis for an account.
 */
router.get(
  '/:id/ml/health-insights',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = accountIdParamSchema.parse(req.params);
      const tenantId = (req as TenantRequest).tenantContext?.tenantId;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant context required' });
      }

      const result = await analyzeAccountHealth({
        accountId: id,
        tenantId,
      });

      return res.json({ data: result });
    } catch (error) {
      logger.error('Health analysis failed', {
        accountId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Account not found' });
      }

      return res.status(500).json({
        error: 'Analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

/**
 * GET /api/crm/accounts/:id/ml/predictions
 *
 * List ML predictions for an account.
 */
router.get(
  '/:id/ml/predictions',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = accountIdParamSchema.parse(req.params);
      const query = listPredictionsSchema.parse(req.query);

      const predictions = await listAccountPredictions(id, {
        type: query.type,
        includeExpired: query.includeExpired,
      });

      return res.json({ data: predictions });
    } catch (error) {
      logger.error('List predictions failed', {
        accountId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        error: 'Failed to list predictions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

/**
 * POST /api/crm/accounts/:id/ml/generate-cta
 *
 * Generate a CTA from the latest prediction.
 */
router.post(
  '/:id/ml/generate-cta',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = accountIdParamSchema.parse(req.params);
      const tenantId = (req as TenantRequest).tenantContext?.tenantId;
      const userId = req.userId;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant context required' });
      }

      if (!userId) {
        return res.status(401).json({ error: 'User authentication required' });
      }

      // Get the latest churn prediction
      const prediction = await getExistingChurnPrediction(id);
      if (!prediction) {
        return res.status(404).json({
          error: 'No prediction found',
          message: 'Generate a prediction first before creating a CTA',
        });
      }

      // Generate CTA from prediction
      const result = await generateCTAFromPrediction(
        id,
        tenantId,
        prediction as Parameters<typeof generateCTAFromPrediction>[2],
        userId,
      );

      if (!result.wasCreated) {
        return res.status(400).json({
          error: 'CTA not created',
          reason: result.skippedReason,
        });
      }

      return res.status(201).json({ data: result });
    } catch (error) {
      logger.error('CTA generation failed', {
        accountId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        error: 'CTA generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

// ============================================================================
// Portfolio-Level ML Endpoints
// ============================================================================

/**
 * GET /api/crm/accounts/portfolio/ml/high-risk
 *
 * List high-risk accounts based on ML predictions.
 */
router.get(
  '/portfolio/ml/high-risk',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const query = highRiskAccountsSchema.parse(req.query);
      const tenantId = (req as TenantRequest).tenantContext?.tenantId;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant context required' });
      }

      const accounts = await getHighRiskAccounts(
        tenantId,
        query.minProbability,
        query.limit,
      );

      return res.json({
        data: accounts,
        count: accounts.length,
      });
    } catch (error) {
      logger.error('High-risk accounts fetch failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        error: 'Failed to fetch high-risk accounts',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

/**
 * POST /api/crm/accounts/portfolio/ml/batch-predict
 *
 * Generate predictions for multiple accounts.
 */
router.post(
  '/portfolio/ml/batch-predict',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { predictionType, maxAccounts, priorityFilter } =
        batchPredictSchema.parse(req.body);
      const tenantId = (req as TenantRequest).tenantContext?.tenantId;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant context required' });
      }

      // This is a simplified batch implementation (services have rule-based fallback)
      // In production, you would use a job queue
      const _results = {
        processed: 0,
        predictions: [] as unknown[],
        errors: 0,
      };

      // For now, return a placeholder indicating batch processing is queued
      return res.status(202).json({
        message: 'Batch prediction queued',
        predictionType,
        maxAccounts,
        priorityFilter,
        note: 'Full batch processing implementation requires a job queue',
      });
    } catch (error) {
      logger.error('Batch prediction failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        error: 'Batch prediction failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

/**
 * POST /api/crm/accounts/portfolio/ml/generate-ctas
 *
 * Generate CTAs from predictions for multiple accounts.
 */
router.post(
  '/portfolio/ml/generate-ctas',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { predictionType: _predictionType, maxCTAs } =
        generateBatchCTAsSchema.parse(req.body);
      const tenantId = (req as TenantRequest).tenantContext?.tenantId;
      const userId = req.userId;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant context required' });
      }

      if (!userId) {
        return res.status(401).json({ error: 'User authentication required' });
      }

      // Get high-risk predictions
      const highRiskAccounts = await getHighRiskAccounts(
        tenantId,
        0.6,
        maxCTAs,
      );

      if (highRiskAccounts.length === 0) {
        return res.json({
          generated: 0,
          skipped: 0,
          message: 'No high-risk accounts with predictions found',
        });
      }

      // Generate CTAs for each
      const predictions = highRiskAccounts.map((a) => ({
        accountId: a.account.id,
        predictionId: a.prediction.id,
        prediction: {
          predictionType: 'CHURN' as const,
          probability: a.prediction.probability,
          confidence: a.prediction.confidence,
          predictionWindowDays: 90,
          riskFactors: [],
          explanation: a.prediction.explanation ?? '',
          recommendations: [],
          llmMetadata: {
            model: 'cached',
            tokensUsed: 0,
            latencyMs: 0,
            estimatedCost: 0,
          },
        },
      }));

      const result = await generateBatchCTAs(
        predictions as Parameters<typeof generateBatchCTAs>[0],
        tenantId,
        userId,
        maxCTAs,
      );

      return res.json({
        generated: result.generated,
        skipped: result.skipped,
        results: result.results,
      });
    } catch (error) {
      logger.error('Batch CTA generation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        error: 'Batch CTA generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

/**
 * POST /api/crm/accounts/portfolio/ml/validate-predictions
 *
 * Validate expired predictions against actual outcomes.
 */
router.post(
  '/portfolio/ml/validate-predictions',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = (req as TenantRequest).tenantContext?.tenantId;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant context required' });
      }

      const result = await validateExpiredPredictions(tenantId);

      return res.json({
        validated: result.validated,
        message: `Validated ${result.validated} expired predictions`,
      });
    } catch (error) {
      logger.error('Prediction validation failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        error: 'Validation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

/**
 * GET /api/crm/accounts/portfolio/ml/accuracy
 *
 * Get prediction accuracy metrics.
 */
router.get(
  '/portfolio/ml/accuracy',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const query = predictionAccuracySchema.parse(req.query);
      const tenantId = (req as TenantRequest).tenantContext?.tenantId;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant context required' });
      }

      const metrics = await getPredictionAccuracy(
        tenantId,
        query.predictionType,
      );

      return res.json({ data: metrics });
    } catch (error) {
      logger.error('Accuracy fetch failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        error: 'Failed to fetch accuracy metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

/**
 * GET /api/crm/accounts/portfolio/ml/cta-stats
 *
 * Get statistics on ML-generated CTAs.
 */
router.get(
  '/portfolio/ml/cta-stats',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const tenantId = (req as TenantRequest).tenantContext?.tenantId;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant context required' });
      }

      const stats = await getMLCTAStats(tenantId);

      return res.json({ data: stats });
    } catch (error) {
      logger.error('CTA stats fetch failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return res.status(500).json({
        error: 'Failed to fetch CTA stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },
);

/**
 * GET /api/crm/accounts/portfolio/ml/status
 *
 * Check ML service availability.
 */
router.get(
  '/portfolio/ml/status',
  async (_req: AuthenticatedRequest, res: Response) => {
    const available = isMLAvailable();

    return res.json({
      available,
      message: available
        ? 'ML service is available'
        : 'ML service unavailable - OpenAI API key not configured',
    });
  },
);

export default router;
