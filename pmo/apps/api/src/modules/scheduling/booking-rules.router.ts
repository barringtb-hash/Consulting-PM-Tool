/**
 * Booking Rules Router
 *
 * API endpoints for managing booking modification rules and policies
 */

import { Router, Request, Response } from 'express';
import { requireAuth } from '../../auth/auth.middleware';
import * as bookingRulesService from './booking-rules.service';
import { z } from 'zod';

interface CustomerEligibilityBody {
  email?: string;
  phone?: string;
}

interface CapacityCheckBody {
  date?: string;
  providerId?: number;
}

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const modificationRulesSchema = z.object({
  allowReschedule: z.boolean().optional(),
  rescheduleMinHoursNotice: z.number().min(0).max(168).optional(),
  rescheduleMaxTimes: z.number().min(0).max(10).optional(),
  rescheduleFee: z.number().min(0).optional(),
  rescheduleFeeCurrency: z.string().max(3).optional(),

  allowCancel: z.boolean().optional(),
  cancelMinHoursNotice: z.number().min(0).max(168).optional(),
  cancelFee: z.number().min(0).optional(),
  cancelFeeCurrency: z.string().max(3).optional(),
  fullRefundHoursNotice: z.number().min(0).max(168).optional(),
  partialRefundPercent: z.number().min(0).max(100).optional(),

  noShowFee: z.number().min(0).optional(),
  noShowFeeCurrency: z.string().max(3).optional(),
  noShowCountMax: z.number().min(1).max(10).optional(),
});

const bookingLimitsSchema = z.object({
  maxActiveBookingsPerCustomer: z.number().min(1).max(20).optional(),
  maxBookingsPerDay: z.number().min(1).max(500).optional(),
  maxBookingsPerProviderPerDay: z.number().min(1).max(100).optional(),
  minIntervalBetweenBookingsHours: z.number().min(0).max(168).optional(),
});

const bufferSettingsSchema = z.object({
  bufferBetweenAppointmentsMin: z.number().min(0).max(120).optional(),
  bufferByAppointmentType: z
    .record(
      z.string(),
      z.object({
        before: z.number().min(0).max(60),
        after: z.number().min(0).max(60),
      }),
    )
    .optional(),
  breakTimes: z
    .array(
      z.object({
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        daysOfWeek: z.array(z.number().min(0).max(6)),
      }),
    )
    .optional(),
});

const blackoutDateSchema = z.object({
  date: z.string().datetime(),
  reason: z.string().max(500).optional(),
  providerIds: z.array(z.number()).optional(),
});

const allRulesSchema = z.object({
  modificationRules: modificationRulesSchema.optional(),
  bookingLimits: bookingLimitsSchema.optional(),
  bufferSettings: bufferSettingsSchema.optional(),
});

// ============================================================================
// MODIFICATION RULES ROUTES
// ============================================================================

/**
 * GET /api/scheduling/:configId/booking-rules
 * Get all booking rules
 */
router.get('/:configId/booking-rules', requireAuth, async (req, res) => {
  try {
    const configId = parseInt(req.params.configId);
    const rules = await bookingRulesService.getAllBookingRules(configId);

    return res.json({ data: rules });
  } catch (error) {
    console.error('Failed to get booking rules:', error);
    return res.status(500).json({
      error:
        error instanceof Error ? error.message : 'Failed to get booking rules',
    });
  }
});

/**
 * PATCH /api/scheduling/:configId/booking-rules
 * Update booking rules
 */
router.patch('/:configId/booking-rules', requireAuth, async (req, res) => {
  try {
    const configId = parseInt(req.params.configId);

    const parsed = allRulesSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const rules = await bookingRulesService.updateAllBookingRules(
      configId,
      parsed.data,
    );

    return res.json({ data: rules });
  } catch (error) {
    console.error('Failed to update booking rules:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to update rules',
    });
  }
});

/**
 * GET /api/scheduling/:configId/booking-rules/modification
 * Get modification rules
 */
router.get(
  '/:configId/booking-rules/modification',
  requireAuth,
  async (req, res) => {
    try {
      const configId = parseInt(req.params.configId);
      const rules = await bookingRulesService.getModificationRules(configId);

      return res.json({ data: rules });
    } catch (error) {
      console.error('Failed to get modification rules:', error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to get rules',
      });
    }
  },
);

/**
 * PATCH /api/scheduling/:configId/booking-rules/modification
 * Update modification rules
 */
router.patch(
  '/:configId/booking-rules/modification',
  requireAuth,
  async (req, res) => {
    try {
      const configId = parseInt(req.params.configId);

      const parsed = modificationRulesSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      await bookingRulesService.updateModificationRules(configId, parsed.data);
      const rules = await bookingRulesService.getModificationRules(configId);

      return res.json({ data: rules });
    } catch (error) {
      console.error('Failed to update modification rules:', error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to update rules',
      });
    }
  },
);

// ============================================================================
// BOOKING LIMITS ROUTES
// ============================================================================

/**
 * GET /api/scheduling/:configId/booking-rules/limits
 * Get booking limits
 */
router.get('/:configId/booking-rules/limits', requireAuth, async (req, res) => {
  try {
    const configId = parseInt(req.params.configId);
    const limits = await bookingRulesService.getBookingLimits(configId);

    return res.json({ data: limits });
  } catch (error) {
    console.error('Failed to get booking limits:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get limits',
    });
  }
});

/**
 * PATCH /api/scheduling/:configId/booking-rules/limits
 * Update booking limits
 */
router.patch(
  '/:configId/booking-rules/limits',
  requireAuth,
  async (req, res) => {
    try {
      const configId = parseInt(req.params.configId);

      const parsed = bookingLimitsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      await bookingRulesService.updateBookingLimits(configId, parsed.data);
      const limits = await bookingRulesService.getBookingLimits(configId);

      return res.json({ data: limits });
    } catch (error) {
      console.error('Failed to update booking limits:', error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to update limits',
      });
    }
  },
);

// ============================================================================
// BUFFER TIME ROUTES
// ============================================================================

/**
 * GET /api/scheduling/:configId/booking-rules/buffer
 * Get buffer time settings
 */
router.get('/:configId/booking-rules/buffer', requireAuth, async (req, res) => {
  try {
    const configId = parseInt(req.params.configId);
    const settings = await bookingRulesService.getBufferTimeSettings(configId);

    return res.json({ data: settings });
  } catch (error) {
    console.error('Failed to get buffer settings:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get settings',
    });
  }
});

/**
 * PATCH /api/scheduling/:configId/booking-rules/buffer
 * Update buffer time settings
 */
router.patch(
  '/:configId/booking-rules/buffer',
  requireAuth,
  async (req, res) => {
    try {
      const configId = parseInt(req.params.configId);

      const parsed = bufferSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      await bookingRulesService.updateBufferTimeSettings(configId, parsed.data);
      const settings =
        await bookingRulesService.getBufferTimeSettings(configId);

      return res.json({ data: settings });
    } catch (error) {
      console.error('Failed to update buffer settings:', error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to update settings',
      });
    }
  },
);

// ============================================================================
// BLACKOUT DATES ROUTES
// ============================================================================

/**
 * GET /api/scheduling/:configId/booking-rules/blackout-dates
 * Get blackout dates
 */
router.get(
  '/:configId/booking-rules/blackout-dates',
  requireAuth,
  async (req, res) => {
    try {
      const configId = parseInt(req.params.configId);

      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : undefined;
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : undefined;
      const providerId = req.query.providerId
        ? parseInt(req.query.providerId as string)
        : undefined;

      const blackoutDates = await bookingRulesService.getBlackoutDates(
        configId,
        {
          startDate,
          endDate,
          providerId,
        },
      );

      return res.json({ data: blackoutDates });
    } catch (error) {
      console.error('Failed to get blackout dates:', error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to get blackout dates',
      });
    }
  },
);

/**
 * POST /api/scheduling/:configId/booking-rules/blackout-dates
 * Add a blackout date
 */
router.post(
  '/:configId/booking-rules/blackout-dates',
  requireAuth,
  async (req, res) => {
    try {
      const configId = parseInt(req.params.configId);

      const parsed = blackoutDateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ errors: parsed.error.flatten() });
      }

      const blackout = await bookingRulesService.addBlackoutDate(configId, {
        date: new Date(parsed.data.date),
        reason: parsed.data.reason,
        providerIds: parsed.data.providerIds,
      });

      return res.status(201).json({ data: blackout });
    } catch (error) {
      console.error('Failed to add blackout date:', error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to add blackout date',
      });
    }
  },
);

/**
 * DELETE /api/scheduling/:configId/booking-rules/blackout-dates/:id
 * Remove a blackout date
 */
router.delete(
  '/:configId/booking-rules/blackout-dates/:id',
  requireAuth,
  async (req, res) => {
    try {
      const configId = parseInt(req.params.configId);
      const blackoutId = parseInt(req.params.id);

      await bookingRulesService.removeBlackoutDate(configId, blackoutId);

      return res.json({ data: { success: true } });
    } catch (error) {
      console.error('Failed to remove blackout date:', error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to remove blackout date',
      });
    }
  },
);

// ============================================================================
// ELIGIBILITY CHECK ROUTES
// ============================================================================

/**
 * GET /api/scheduling/:configId/appointments/:appointmentId/modification-eligibility
 * Check if an appointment can be modified
 */
router.get(
  '/:configId/appointments/:appointmentId/modification-eligibility',
  requireAuth,
  async (req, res) => {
    try {
      const appointmentId = parseInt(req.params.appointmentId);

      const eligibility =
        await bookingRulesService.checkModificationEligibility(appointmentId);

      return res.json({ data: eligibility });
    } catch (error) {
      console.error('Failed to check eligibility:', error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to check eligibility',
      });
    }
  },
);

/**
 * POST /api/scheduling/:configId/check-customer-eligibility
 * Check if a customer can make a new booking
 */
router.post(
  '/:configId/check-customer-eligibility',
  requireAuth,
  async (
    req: Request<{ configId: string }, unknown, CustomerEligibilityBody>,
    res: Response,
  ) => {
    try {
      const configId = parseInt(req.params.configId);
      const { email, phone } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const eligibility =
        await bookingRulesService.checkCustomerBookingEligibility(
          configId,
          email,
          phone,
        );

      return res.json({ data: eligibility });
    } catch (error) {
      console.error('Failed to check customer eligibility:', error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to check eligibility',
      });
    }
  },
);

/**
 * POST /api/scheduling/:configId/check-capacity
 * Check booking capacity for a date
 */
router.post(
  '/:configId/check-capacity',
  requireAuth,
  async (
    req: Request<{ configId: string }, unknown, CapacityCheckBody>,
    res: Response,
  ) => {
    try {
      const configId = parseInt(req.params.configId);
      const { date, providerId } = req.body;

      if (!date) {
        return res.status(400).json({ error: 'Date is required' });
      }

      const capacity = await bookingRulesService.checkBookingCapacity(
        configId,
        new Date(date),
        providerId,
      );

      return res.json({ data: capacity });
    } catch (error) {
      console.error('Failed to check capacity:', error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Failed to check capacity',
      });
    }
  },
);

export { router as bookingRulesRouter };
