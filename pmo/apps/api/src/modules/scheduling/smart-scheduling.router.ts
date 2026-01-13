/**
 * Smart Scheduling Router
 *
 * API endpoints for AI-powered scheduling optimization
 */

import { Router } from 'express';
import { requireAuth } from '../../auth/auth.middleware';
import * as smartSchedulingService from './smart-scheduling.service';
import { z } from 'zod';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const optimalSlotsSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  appointmentTypeId: z.number().int().optional(),
  providerId: z.number().int().optional(),
  patientEmail: z.string().email().optional(),
  preferences: z
    .object({
      preferredTimeOfDay: z
        .enum(['morning', 'afternoon', 'evening'])
        .optional(),
      preferredDaysOfWeek: z.array(z.number().min(0).max(6)).optional(),
      preferredProviderId: z.number().int().optional(),
      avoidConsecutiveSlots: z.boolean().optional(),
      minimizeWaitTime: z.boolean().optional(),
    })
    .optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

const overbookingConfigSchema = z.object({
  enabled: z.boolean().optional(),
  maxOverbookingsPerSlot: z.number().int().min(1).max(3).optional(),
  minNoShowProbability: z.number().min(0).max(1).optional(),
  maxDailyOverbookings: z.number().int().min(1).max(20).optional(),
  appointmentTypesAllowed: z.array(z.number().int()).optional(),
  providersAllowed: z.array(z.number().int()).optional(),
});

// ============================================================================
// OPTIMAL SLOT RECOMMENDATIONS
// ============================================================================

/**
 * POST /api/scheduling/:configId/smart/optimal-slots
 * Get AI-recommended optimal time slots
 */
router.post('/:configId/smart/optimal-slots', requireAuth, async (req, res) => {
  try {
    const configId = parseInt(String(req.params.configId));

    const parsed = optimalSlotsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const slots = await smartSchedulingService.getOptimalSlots({
      configId,
      startDate: new Date(parsed.data.startDate),
      endDate: new Date(parsed.data.endDate),
      appointmentTypeId: parsed.data.appointmentTypeId,
      providerId: parsed.data.providerId,
      patientEmail: parsed.data.patientEmail,
      preferences: parsed.data.preferences,
      limit: parsed.data.limit,
    });

    return res.json({
      data: {
        slots: slots.map((s) => ({
          slot: s.slot.toISOString(),
          providerId: s.providerId,
          score: Math.round(s.score * 100) / 100,
          factors: {
            noShowRisk: Math.round(s.factors.noShowRisk * 100),
            providerUtilization: Math.round(
              s.factors.providerUtilization * 100,
            ),
            patientPreference: Math.round(s.factors.patientPreference * 100),
            historicalConversion: Math.round(
              s.factors.historicalConversion * 100,
            ),
            timeOptimality: Math.round(s.factors.timeOptimality * 100),
            bufferOptimality: Math.round(s.factors.bufferOptimality * 100),
          },
          overbookingAllowed: s.overbookingAllowed,
          overbookingReason: s.overbookingReason,
        })),
        count: slots.length,
      },
    });
  } catch (error) {
    console.error('Failed to get optimal slots:', error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to get optimal slots',
    });
  }
});

// ============================================================================
// PROVIDER WORKLOAD
// ============================================================================

/**
 * GET /api/scheduling/:configId/smart/workload
 * Get provider workload analysis
 */
router.get('/:configId/smart/workload', requireAuth, async (req, res) => {
  try {
    const configId = parseInt(String(req.params.configId));
    const date = req.query.date
      ? new Date(req.query.date as string)
      : new Date();
    const providerId = req.query.providerId
      ? parseInt(req.query.providerId as string)
      : undefined;

    const workloads = await smartSchedulingService.getProviderWorkload(
      configId,
      date,
      providerId,
    );

    return res.json({
      data: {
        workloads,
        date: date.toISOString().split('T')[0],
      },
    });
  } catch (error) {
    console.error('Failed to get workload:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get workload',
    });
  }
});

// ============================================================================
// OVERBOOKING MANAGEMENT
// ============================================================================

/**
 * GET /api/scheduling/:configId/smart/overbooking/config
 * Get overbooking configuration
 */
router.get(
  '/:configId/smart/overbooking/config',
  requireAuth,
  async (req, res) => {
    try {
      const configId = parseInt(String(req.params.configId));

      const config =
        await smartSchedulingService.getOverbookingConfig(configId);

      return res.json({ data: config });
    } catch (error) {
      console.error('Failed to get overbooking config:', error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get overbooking config',
      });
    }
  },
);

/**
 * PATCH /api/scheduling/:configId/smart/overbooking/config
 * Update overbooking configuration
 */
router.patch(
  '/:configId/smart/overbooking/config',
  requireAuth,
  async (req, res) => {
    try {
      const configId = parseInt(String(req.params.configId));

      const parsed = overbookingConfigSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const config = await smartSchedulingService.updateOverbookingConfig(
        configId,
        parsed.data,
      );

      return res.json({ data: config });
    } catch (error) {
      console.error('Failed to update overbooking config:', error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update overbooking config',
      });
    }
  },
);

/**
 * GET /api/scheduling/:configId/smart/overbooking/recommendations
 * Get recommended slots for overbooking
 */
router.get(
  '/:configId/smart/overbooking/recommendations',
  requireAuth,
  async (req, res) => {
    try {
      const configId = parseInt(String(req.params.configId));
      const date = req.query.date
        ? new Date(req.query.date as string)
        : new Date();

      const recommendations =
        await smartSchedulingService.getRecommendedOverbookingSlots(
          configId,
          date,
        );

      return res.json({
        data: {
          recommendations: recommendations.map((r) => ({
            slot: r.slot.toISOString(),
            providerId: r.providerId,
            probability: Math.round(r.probability * 100),
            reason: r.reason,
          })),
          date: date.toISOString().split('T')[0],
          count: recommendations.length,
        },
      });
    } catch (error) {
      console.error('Failed to get overbooking recommendations:', error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get overbooking recommendations',
      });
    }
  },
);

/**
 * POST /api/scheduling/:configId/smart/overbooking/check
 * Check if a slot can be overbooked
 */
router.post(
  '/:configId/smart/overbooking/check',
  requireAuth,
  async (req, res) => {
    try {
      const configId = parseInt(String(req.params.configId));
      const body = req.body as { slot?: string; providerId?: number };
      const { slot, providerId } = body;

      if (!slot || !providerId) {
        return res
          .status(400)
          .json({ error: 'slot and providerId are required' });
      }

      const result = await smartSchedulingService.canOverbook(
        configId,
        new Date(slot),
        providerId,
      );

      return res.json({ data: result });
    } catch (error) {
      console.error('Failed to check overbooking:', error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to check overbooking',
      });
    }
  },
);

// ============================================================================
// SCHEDULING INSIGHTS
// ============================================================================

/**
 * GET /api/scheduling/:configId/smart/insights
 * Get scheduling insights and analytics
 */
router.get('/:configId/smart/insights', requireAuth, async (req, res) => {
  try {
    const configId = parseInt(String(req.params.configId));

    const now = new Date();
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const insights = await smartSchedulingService.getSchedulingInsights(
      configId,
      startDate,
      endDate,
    );

    return res.json({
      data: {
        ...insights,
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Failed to get insights:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get insights',
    });
  }
});

/**
 * GET /api/scheduling/:configId/smart/optimal-times
 * Get historically optimal booking times
 */
router.get('/:configId/smart/optimal-times', requireAuth, async (req, res) => {
  try {
    const configId = parseInt(String(req.params.configId));

    const now = new Date();
    const insights = await smartSchedulingService.getSchedulingInsights(
      configId,
      new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      now,
    );

    // Format optimal times for easy display
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const formattedTimes = insights.optimalBookingTimes.map((t) => ({
      dayOfWeek: dayNames[t.dayOfWeek],
      hour: t.hour,
      time: `${t.hour.toString().padStart(2, '0')}:00`,
      conversionRate: Math.round(t.conversionRate * 100),
    }));

    return res.json({
      data: {
        optimalTimes: formattedTimes,
        patientPreferences: insights.patientPreferencePatterns,
      },
    });
  } catch (error) {
    console.error('Failed to get optimal times:', error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to get optimal times',
    });
  }
});

/**
 * GET /api/scheduling/:configId/smart/demand-forecast
 * Get demand forecast for upcoming period
 */
router.get(
  '/:configId/smart/demand-forecast',
  requireAuth,
  async (req, res) => {
    try {
      const configId = parseInt(String(req.params.configId));

      const now = new Date();
      const daysAhead = parseInt(req.query.days as string) || 14;
      const startDate = now;
      const endDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

      const insights = await smartSchedulingService.getSchedulingInsights(
        configId,
        startDate,
        endDate,
      );

      return res.json({
        data: {
          highDemandPeriods: insights.highDemandPeriods.map((p) => ({
            start: p.start.toISOString(),
            end: p.end.toISOString(),
            demandScore: Math.round(p.demandScore * 100) / 100,
          })),
          lowUtilizationPeriods: insights.lowUtilizationPeriods.map((p) => ({
            start: p.start.toISOString(),
            end: p.end.toISOString(),
            utilizationPercent: p.utilizationPercent,
          })),
          period: {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
        },
      });
    } catch (error) {
      console.error('Failed to get demand forecast:', error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get demand forecast',
      });
    }
  },
);

export { router as smartSchedulingRouter };
