/**
 * No-Show Prediction Router
 *
 * API endpoints for enhanced no-show prediction ML model
 */

import { Router } from 'express';
import { requireAuth } from '../../auth/auth.middleware';
import * as noshowService from './noshow-prediction.service';
import { z } from 'zod';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const experimentSchema = z.object({
  name: z.string().min(1).max(200),
  variants: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      weights: z
        .object({
          previousNoShowRate: z.number().min(0).max(1).optional(),
          isNewPatient: z.number().min(0).max(1).optional(),
          leadTime: z.number().min(0).max(1).optional(),
          dayOfWeek: z.number().min(0).max(1).optional(),
          timeOfDay: z.number().min(0).max(1).optional(),
          contactInfo: z.number().min(0).max(1).optional(),
          reminderEngagement: z.number().min(0).max(1).optional(),
          rescheduleHistory: z.number().min(0).max(1).optional(),
          providerHistory: z.number().min(0).max(1).optional(),
          appointmentType: z.number().min(0).max(1).optional(),
        })
        .optional(),
      trafficPercent: z.number().min(0).max(100),
    }),
  ),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  isActive: z.boolean(),
});

// ============================================================================
// PREDICTION ENDPOINTS
// ============================================================================

/**
 * GET /api/scheduling/:configId/noshow/predict/:appointmentId
 * Get no-show prediction for an appointment
 */
router.get(
  '/:configId/noshow/predict/:appointmentId',
  requireAuth,
  async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.appointmentId);

      const prediction = await noshowService.predictNoShow(appointmentId);

      return res.json({ data: prediction });
    } catch (error) {
      console.error('Failed to predict no-show:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Prediction failed',
      });
    }
  },
);

/**
 * GET /api/scheduling/:configId/noshow/features/:appointmentId
 * Get extracted features for an appointment (for debugging)
 */
router.get(
  '/:configId/noshow/features/:appointmentId',
  requireAuth,
  async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.appointmentId);

      const features = await noshowService.extractFeatures(appointmentId);

      return res.json({ data: features });
    } catch (error) {
      console.error('Failed to extract features:', error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Feature extraction failed',
      });
    }
  },
);

/**
 * POST /api/scheduling/:configId/noshow/outcome/:appointmentId
 * Record actual outcome for learning
 */
router.post(
  '/:configId/noshow/outcome/:appointmentId',
  requireAuth,
  async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.appointmentId);
      const { wasNoShow } = req.body;

      if (typeof wasNoShow !== 'boolean') {
        return res.status(400).json({ error: 'wasNoShow must be a boolean' });
      }

      await noshowService.recordOutcome(appointmentId, wasNoShow);

      return res.json({ data: { success: true } });
    } catch (error) {
      console.error('Failed to record outcome:', error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to record outcome',
      });
    }
  },
);

/**
 * GET /api/scheduling/:configId/noshow/high-risk
 * Get high-risk appointments
 */
router.get('/:configId/noshow/high-risk', requireAuth, async (req, res) => {
  try {
    const configId = parseInt(req.params.configId);
    const threshold = parseFloat(req.query.threshold as string) || 0.5;
    const limit = parseInt(req.query.limit as string) || 50;

    const appointments = await noshowService.getHighRiskAppointments(configId, {
      threshold,
      limit,
    });

    return res.json({
      data: {
        appointments,
        threshold,
        count: appointments.length,
      },
    });
  } catch (error) {
    console.error('Failed to get high-risk appointments:', error);
    return res
      .status(500)
      .json({ error: 'Failed to get high-risk appointments' });
  }
});

/**
 * POST /api/scheduling/:configId/noshow/refresh
 * Refresh predictions for all upcoming appointments
 */
router.post('/:configId/noshow/refresh', requireAuth, async (req, res) => {
  try {
    const configId = parseInt(req.params.configId);

    const updated = await noshowService.updateAllPredictions(configId);

    return res.json({
      data: {
        success: true,
        updatedCount: updated,
      },
    });
  } catch (error) {
    console.error('Failed to refresh predictions:', error);
    return res.status(500).json({ error: 'Failed to refresh predictions' });
  }
});

// ============================================================================
// MODEL PERFORMANCE ENDPOINTS
// ============================================================================

/**
 * GET /api/scheduling/:configId/noshow/performance
 * Get model performance metrics
 */
router.get('/:configId/noshow/performance', requireAuth, async (req, res) => {
  try {
    const configId = parseInt(req.params.configId);
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;
    const experimentVariant = req.query.variant as string | undefined;

    const performance = await noshowService.getModelPerformance(configId, {
      startDate,
      endDate,
      experimentVariant,
    });

    return res.json({ data: performance });
  } catch (error) {
    console.error('Failed to get model performance:', error);
    return res.status(500).json({ error: 'Failed to get performance metrics' });
  }
});

// ============================================================================
// A/B TESTING ENDPOINTS
// ============================================================================

/**
 * GET /api/scheduling/:configId/noshow/experiments
 * Get active experiment
 */
router.get('/:configId/noshow/experiments', requireAuth, async (req, res) => {
  try {
    const configId = parseInt(req.params.configId);

    const experiment = await noshowService.getActiveExperiment(configId);

    return res.json({ data: experiment });
  } catch (error) {
    console.error('Failed to get experiment:', error);
    return res.status(500).json({ error: 'Failed to get experiment' });
  }
});

/**
 * POST /api/scheduling/:configId/noshow/experiments
 * Create an A/B test experiment
 */
router.post('/:configId/noshow/experiments', requireAuth, async (req, res) => {
  try {
    const configId = parseInt(req.params.configId);

    const parsed = experimentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const experiment = await noshowService.createExperiment(configId, {
      ...parsed.data,
      startDate: new Date(parsed.data.startDate),
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
    });

    return res.status(201).json({ data: experiment });
  } catch (error) {
    console.error('Failed to create experiment:', error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to create experiment',
    });
  }
});

/**
 * POST /api/scheduling/:configId/noshow/experiments/:experimentId/end
 * End an experiment
 */
router.post(
  '/:configId/noshow/experiments/:experimentId/end',
  requireAuth,
  async (req, res) => {
    try {
      const configId = parseInt(req.params.configId);
      const { experimentId } = req.params;

      await noshowService.endExperiment(configId, experimentId);

      return res.json({ data: { success: true } });
    } catch (error) {
      console.error('Failed to end experiment:', error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to end experiment',
      });
    }
  },
);

export { router as noshowPredictionRouter };
