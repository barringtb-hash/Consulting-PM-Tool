/**
 * Project ML Router
 *
 * Express router for Project ML prediction endpoints.
 *
 * @module project-ml
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../../auth/auth.middleware';
import { getTenantId } from '../../tenant/tenant.context';
import {
  predictProjectSuccess,
  forecastProjectRisks,
  predictProjectTimeline,
  optimizeProjectResources,
  listProjectPredictions,
  getHighRiskProjects,
  getPredictionAccuracy,
  validateExpiredPredictions,
  isMLAvailable,
  getMLConfig,
} from './services';
import {
  projectIdParamSchema,
  generatePredictionSchema,
  listPredictionsQuerySchema,
  batchPredictionSchema,
  highRiskQuerySchema,
  accuracyQuerySchema,
} from './validation/project-ml.schema';
import type { ProjectMLPredictionType } from '@prisma/client';

const router = Router();

// ============================================================================
// Project-Level ML Endpoints
// ============================================================================

/**
 * POST /api/projects/:projectId/ml/predict
 * Generate a prediction for a project
 */
router.post(
  '/projects/:projectId/ml/predict',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId();
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant context required' });
      }

      const params = projectIdParamSchema.safeParse(req.params);
      if (!params.success) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const body = generatePredictionSchema.safeParse(req.body);
      if (!body.success) {
        return res.status(400).json({ error: body.error.message });
      }

      const { projectId } = params.data;
      const { predictionType, options } = body.data;

      let result;
      switch (predictionType) {
        case 'SUCCESS_PREDICTION':
          result = await predictProjectSuccess(projectId, tenantId, options);
          break;
        case 'RISK_FORECAST':
          result = await forecastProjectRisks(projectId, tenantId, options);
          break;
        case 'TIMELINE_PREDICTION':
          result = await predictProjectTimeline(projectId, tenantId, options);
          break;
        case 'RESOURCE_OPTIMIZATION':
          result = await optimizeProjectResources(projectId, tenantId, options);
          break;
        default:
          return res.status(400).json({ error: 'Invalid prediction type' });
      }

      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('Project ML prediction error:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Prediction failed',
      });
    }
  },
);

/**
 * GET /api/projects/:projectId/ml/success-prediction
 * Get success prediction for a project
 */
router.get(
  '/projects/:projectId/ml/success-prediction',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId();
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant context required' });
      }

      const params = projectIdParamSchema.safeParse(req.params);
      if (!params.success) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const { projectId } = params.data;
      const forceRefresh = req.query.refresh === 'true';

      const result = await predictProjectSuccess(projectId, tenantId, {
        forceRefresh,
      });

      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('Success prediction error:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Prediction failed',
      });
    }
  },
);

/**
 * GET /api/projects/:projectId/ml/risk-forecast
 * Get risk forecast for a project
 */
router.get(
  '/projects/:projectId/ml/risk-forecast',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId();
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant context required' });
      }

      const params = projectIdParamSchema.safeParse(req.params);
      if (!params.success) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const { projectId } = params.data;
      const forceRefresh = req.query.refresh === 'true';

      const result = await forecastProjectRisks(projectId, tenantId, {
        forceRefresh,
      });

      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('Risk forecast error:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Forecast failed',
      });
    }
  },
);

/**
 * GET /api/projects/:projectId/ml/timeline-prediction
 * Get timeline prediction for a project
 */
router.get(
  '/projects/:projectId/ml/timeline-prediction',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId();
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant context required' });
      }

      const params = projectIdParamSchema.safeParse(req.params);
      if (!params.success) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const { projectId } = params.data;
      const forceRefresh = req.query.refresh === 'true';

      const result = await predictProjectTimeline(projectId, tenantId, {
        forceRefresh,
      });

      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('Timeline prediction error:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Prediction failed',
      });
    }
  },
);

/**
 * GET /api/projects/:projectId/ml/resource-optimization
 * Get resource optimization for a project
 */
router.get(
  '/projects/:projectId/ml/resource-optimization',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId();
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant context required' });
      }

      const params = projectIdParamSchema.safeParse(req.params);
      if (!params.success) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const { projectId } = params.data;
      const forceRefresh = req.query.refresh === 'true';

      const result = await optimizeProjectResources(projectId, tenantId, {
        forceRefresh,
      });

      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('Resource optimization error:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Optimization failed',
      });
    }
  },
);

/**
 * GET /api/projects/:projectId/ml/predictions
 * List all predictions for a project
 */
router.get(
  '/projects/:projectId/ml/predictions',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const params = projectIdParamSchema.safeParse(req.params);
      if (!params.success) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }

      const query = listPredictionsQuerySchema.safeParse(req.query);
      if (!query.success) {
        return res.status(400).json({ error: query.error.message });
      }

      const { projectId } = params.data;
      const predictions = await listProjectPredictions(projectId, {
        type: query.data.type as ProjectMLPredictionType | undefined,
        includeExpired: query.data.includeExpired,
      });

      return res.json({ success: true, data: predictions });
    } catch (error) {
      console.error('List predictions error:', error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to list predictions',
      });
    }
  },
);

// ============================================================================
// Portfolio-Level ML Endpoints
// ============================================================================

/**
 * GET /api/projects/portfolio/ml/at-risk
 * Get projects at risk based on ML predictions
 */
router.get(
  '/projects/portfolio/ml/at-risk',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId();
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant context required' });
      }

      const query = highRiskQuerySchema.safeParse(req.query);
      if (!query.success) {
        return res.status(400).json({ error: query.error.message });
      }

      const { minRisk, limit } = query.data;
      const projects = await getHighRiskProjects(tenantId, minRisk, limit);

      return res.json({ success: true, data: projects });
    } catch (error) {
      console.error('High risk projects error:', error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get at-risk projects',
      });
    }
  },
);

/**
 * POST /api/projects/portfolio/ml/batch-predict
 * Generate predictions for multiple projects
 */
router.post(
  '/projects/portfolio/ml/batch-predict',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId();
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant context required' });
      }

      const body = batchPredictionSchema.safeParse(req.body);
      if (!body.success) {
        return res.status(400).json({ error: body.error.message });
      }

      // TODO: Implement batch prediction
      // For now, return a placeholder
      return res.json({
        success: true,
        data: {
          message: 'Batch prediction queued',
          predictionType: body.data.predictionType,
          maxProjects: body.data.maxProjects,
        },
      });
    } catch (error) {
      console.error('Batch prediction error:', error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Batch prediction failed',
      });
    }
  },
);

/**
 * POST /api/projects/portfolio/ml/validate-predictions
 * Validate expired predictions against actual outcomes
 */
router.post(
  '/projects/portfolio/ml/validate-predictions',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId();
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant context required' });
      }

      const result = await validateExpiredPredictions(tenantId);

      return res.json({ success: true, data: result });
    } catch (error) {
      console.error('Validate predictions error:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Validation failed',
      });
    }
  },
);

/**
 * GET /api/projects/portfolio/ml/accuracy
 * Get prediction accuracy metrics
 */
router.get(
  '/projects/portfolio/ml/accuracy',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId();
      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant context required' });
      }

      const query = accuracyQuerySchema.safeParse(req.query);
      if (!query.success) {
        return res.status(400).json({ error: query.error.message });
      }

      const accuracy = await getPredictionAccuracy(
        tenantId,
        query.data.predictionType as ProjectMLPredictionType | undefined,
      );

      return res.json({ success: true, data: accuracy });
    } catch (error) {
      console.error('Accuracy metrics error:', error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to get accuracy',
      });
    }
  },
);

/**
 * GET /api/projects/portfolio/ml/status
 * Get ML service status
 */
router.get(
  '/projects/portfolio/ml/status',
  requireAuth,
  async (_req: Request, res: Response) => {
    try {
      const available = isMLAvailable();
      const config = getMLConfig();

      return res.json({
        success: true,
        data: {
          available,
          features: [
            'SUCCESS_PREDICTION',
            'RISK_FORECAST',
            'TIMELINE_PREDICTION',
            'RESOURCE_OPTIMIZATION',
          ],
          config: {
            defaultPredictionWindowDays: config.defaultPredictionWindowDays,
            predictionValidityDays: config.predictionValidityDays,
          },
        },
      });
    } catch (error) {
      console.error('ML status error:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get status',
      });
    }
  },
);

export default router;
