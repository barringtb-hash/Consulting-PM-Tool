/**
 * Lead ML Router
 *
 * API endpoints for Lead ML predictions and analytics.
 *
 * @module lead-ml
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth } from '../../auth/auth.middleware';
import { getTenantId, hasTenantContext } from '../../tenant/tenant.context';

import {
  predictLeadConversion,
  predictTimeToClose,
  predictLeadScore,
  bulkPredictConversions,
  getLeadPrediction,
  validatePrediction,
  getPredictionAccuracy,
} from './services/lead-conversion-prediction.service';
import {
  getRankedLeads,
  getTopPriorityLeads,
  getLeadsByTier,
} from './services/lead-priority-ranking.service';
import { extractLeadFeatures } from './services/lead-feature-extraction.service';

// ============================================================================
// Validation Schemas
// ============================================================================

const predictLeadSchema = z.object({
  forceRefresh: z.boolean().optional().default(false),
  ruleBasedOnly: z.boolean().optional().default(false),
  includeExplanation: z.boolean().optional().default(true),
});

const bulkPredictSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  minScore: z.number().int().min(0).max(100).optional().default(0),
  forceRefresh: z.boolean().optional().default(false),
  ruleBasedOnly: z.boolean().optional().default(false),
});

const rankLeadsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(20),
  minScore: z.number().int().min(0).max(100).optional().default(0),
  minProbability: z.number().min(0).max(1).optional(),
  useLLM: z.boolean().optional().default(true),
});

const validatePredictionSchema = z.object({
  wasAccurate: z.boolean(),
});

const accuracyQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// ============================================================================
// Router Setup
// ============================================================================

const router = Router();

// Apply auth middleware to all routes
router.use(requireAuth);

// ============================================================================
// Prediction Endpoints
// ============================================================================

/**
 * POST /api/lead-scoring/leads/:id/ml/predict
 * Generate conversion prediction for a lead
 */
router.post(
  '/leads/:id/ml/predict',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const leadId = parseInt(req.params.id, 10);
      if (isNaN(leadId)) {
        return res.status(400).json({ error: 'Invalid lead ID' });
      }

      const body = predictLeadSchema.parse(req.body || {});
      const tenantId = hasTenantContext() ? getTenantId() : 'system';

      const prediction = await predictLeadConversion({
        leadId,
        tenantId,
        configId: 0, // Will be determined from lead
        predictionType: 'CONVERSION',
        options: {
          forceRefresh: body.forceRefresh,
          ruleBasedOnly: body.ruleBasedOnly,
          includeExplanation: body.includeExplanation,
        },
      });

      res.json({ prediction });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/lead-scoring/leads/:id/ml/prediction
 * Get latest prediction for a lead
 */
router.get(
  '/leads/:id/ml/prediction',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const leadId = parseInt(req.params.id, 10);
      if (isNaN(leadId)) {
        return res.status(400).json({ error: 'Invalid lead ID' });
      }

      const predictionType = (req.query.type as string) || 'CONVERSION';
      const prediction = await getLeadPrediction(
        leadId,
        predictionType as 'CONVERSION' | 'TIME_TO_CLOSE' | 'SCORE' | 'PRIORITY',
      );

      if (!prediction) {
        return res.status(404).json({ error: 'No prediction found' });
      }

      res.json({
        id: prediction.id,
        isExpired: prediction.isExpired,
        prediction: prediction.prediction,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/lead-scoring/leads/:id/ml/predict-time
 * Generate time-to-close prediction
 */
router.post(
  '/leads/:id/ml/predict-time',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const leadId = parseInt(req.params.id, 10);
      if (isNaN(leadId)) {
        return res.status(400).json({ error: 'Invalid lead ID' });
      }

      const body = predictLeadSchema.parse(req.body || {});
      const tenantId = hasTenantContext() ? getTenantId() : 'system';

      const prediction = await predictTimeToClose({
        leadId,
        tenantId,
        configId: 0,
        predictionType: 'TIME_TO_CLOSE',
        options: {
          forceRefresh: body.forceRefresh,
          ruleBasedOnly: body.ruleBasedOnly,
        },
      });

      res.json({ prediction });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * POST /api/lead-scoring/leads/:id/ml/predict-score
 * Generate score prediction with explanation
 */
router.post(
  '/leads/:id/ml/predict-score',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const leadId = parseInt(req.params.id, 10);
      if (isNaN(leadId)) {
        return res.status(400).json({ error: 'Invalid lead ID' });
      }

      const body = predictLeadSchema.parse(req.body || {});
      const tenantId = hasTenantContext() ? getTenantId() : 'system';

      const prediction = await predictLeadScore({
        leadId,
        tenantId,
        configId: 0,
        predictionType: 'SCORE',
        options: {
          forceRefresh: body.forceRefresh,
          ruleBasedOnly: body.ruleBasedOnly,
        },
      });

      res.json({ prediction });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/lead-scoring/leads/:id/ml/features
 * Get extracted features for a lead
 */
router.get(
  '/leads/:id/ml/features',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const leadId = parseInt(req.params.id, 10);
      if (isNaN(leadId)) {
        return res.status(400).json({ error: 'Invalid lead ID' });
      }

      const features = await extractLeadFeatures(leadId);
      res.json({ features });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================================
// Bulk Prediction Endpoints
// ============================================================================

/**
 * POST /api/lead-scoring/:configId/ml/bulk-predict
 * Bulk prediction for leads in a config
 */
router.post(
  '/:configId/ml/bulk-predict',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const configId = parseInt(req.params.configId, 10);
      if (isNaN(configId)) {
        return res.status(400).json({ error: 'Invalid config ID' });
      }

      const body = bulkPredictSchema.parse(req.body || {});
      const tenantId = hasTenantContext() ? getTenantId() : 'system';

      const result = await bulkPredictConversions({
        configId,
        tenantId,
        predictionType: 'CONVERSION',
        limit: body.limit,
        minScore: body.minScore,
        options: {
          forceRefresh: body.forceRefresh,
          ruleBasedOnly: body.ruleBasedOnly,
        },
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================================
// Priority Ranking Endpoints
// ============================================================================

/**
 * GET /api/lead-scoring/:configId/ml/ranked-leads
 * Get priority-ranked leads
 */
router.get(
  '/:configId/ml/ranked-leads',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const configId = parseInt(req.params.configId, 10);
      if (isNaN(configId)) {
        return res.status(400).json({ error: 'Invalid config ID' });
      }

      const query = rankLeadsSchema.parse({
        limit: req.query.limit
          ? parseInt(req.query.limit as string, 10)
          : undefined,
        minScore: req.query.minScore
          ? parseInt(req.query.minScore as string, 10)
          : undefined,
        minProbability: req.query.minProbability
          ? parseFloat(req.query.minProbability as string)
          : undefined,
        useLLM: req.query.useLLM === 'true',
      });

      const result = await getRankedLeads(configId, query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/lead-scoring/:configId/ml/top-leads
 * Get top N priority leads
 */
router.get(
  '/:configId/ml/top-leads',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const configId = parseInt(req.params.configId, 10);
      if (isNaN(configId)) {
        return res.status(400).json({ error: 'Invalid config ID' });
      }

      const n = req.query.n ? parseInt(req.query.n as string, 10) : 10;
      const leads = await getTopPriorityLeads(configId, n);
      res.json({ leads });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/lead-scoring/:configId/ml/leads-by-tier
 * Get leads by priority tier
 */
router.get(
  '/:configId/ml/leads-by-tier',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const configId = parseInt(req.params.configId, 10);
      if (isNaN(configId)) {
        return res.status(400).json({ error: 'Invalid config ID' });
      }

      const tier = req.query.tier as 'top' | 'high' | 'medium' | 'low';
      if (!['top', 'high', 'medium', 'low'].includes(tier)) {
        return res.status(400).json({ error: 'Invalid tier' });
      }

      const leads = await getLeadsByTier(configId, tier);
      res.json({ leads });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================================
// Validation & Accuracy Endpoints
// ============================================================================

/**
 * POST /api/lead-scoring/predictions/:id/validate
 * Validate a prediction against actual outcome
 */
router.post(
  '/predictions/:id/validate',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const predictionId = parseInt(req.params.id, 10);
      if (isNaN(predictionId)) {
        return res.status(400).json({ error: 'Invalid prediction ID' });
      }

      const body = validatePredictionSchema.parse(req.body);
      await validatePrediction(predictionId, body.wasAccurate);

      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/lead-scoring/:configId/ml/accuracy
 * Get prediction accuracy metrics
 */
router.get(
  '/:configId/ml/accuracy',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const configId = parseInt(req.params.configId, 10);
      if (isNaN(configId)) {
        return res.status(400).json({ error: 'Invalid config ID' });
      }

      const query = accuracyQuerySchema.parse({
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
      });

      const accuracy = await getPredictionAccuracy(configId, {
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      });

      res.json(accuracy);
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================================
// Feature Importance Endpoints
// ============================================================================

/**
 * GET /api/lead-scoring/:configId/ml/feature-importance
 * Get feature importance from model
 */
router.get(
  '/:configId/ml/feature-importance',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const configId = parseInt(req.params.configId, 10);
      if (isNaN(configId)) {
        return res.status(400).json({ error: 'Invalid config ID' });
      }

      // Return default feature importance based on weights
      const importance = [
        { name: 'Email Clicks', importance: 0.15, category: 'behavioral' },
        { name: 'Form Submissions', importance: 0.14, category: 'behavioral' },
        { name: 'Title Seniority', importance: 0.12, category: 'demographic' },
        { name: 'Meetings', importance: 0.11, category: 'behavioral' },
        { name: 'Activity Velocity', importance: 0.1, category: 'behavioral' },
        { name: 'Recency Score', importance: 0.09, category: 'temporal' },
        { name: 'Email Open Rate', importance: 0.08, category: 'engagement' },
        {
          name: 'Company Identified',
          importance: 0.07,
          category: 'demographic',
        },
        { name: 'Channel Diversity', importance: 0.06, category: 'behavioral' },
        {
          name: 'Email Domain Type',
          importance: 0.05,
          category: 'demographic',
        },
        {
          name: 'Sequence Engagement',
          importance: 0.03,
          category: 'engagement',
        },
      ];

      res.json({ importance });
    } catch (error) {
      next(error);
    }
  },
);

// ============================================================================
// Export
// ============================================================================

export default router;
export { router as leadMLRouter };
