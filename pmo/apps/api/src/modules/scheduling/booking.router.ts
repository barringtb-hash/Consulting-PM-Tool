/**
 * Public Booking Router
 *
 * Public-facing API endpoints for self-service booking.
 * These endpoints do NOT require authentication.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as bookingService from './booking.service';
import * as bookingRulesService from './booking-rules.service';
import * as nlService from './natural-language.service';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const availabilityQuerySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  providerId: z.coerce.number().int().optional(),
  appointmentTypeId: z.coerce.number().int().optional(),
  timezone: z.string().optional(),
});

const createBookingSchema = z.object({
  appointmentTypeId: z.number().int().optional(),
  providerId: z.number().int().optional(),
  scheduledAt: z.string().datetime(),
  patientName: z.string().min(1).max(200),
  patientEmail: z.string().email().optional(),
  patientPhone: z.string().max(20).optional(),
  timezone: z.string().optional(),
  intakeFormResponses: z.record(z.string(), z.unknown()).optional(),
});

const rescheduleSchema = z.object({
  newScheduledAt: z.string().datetime(),
  timezone: z.string().optional(),
});

const cancelSchema = z.object({
  reason: z.string().max(500).optional(),
});

// ============================================================================
// PUBLIC BOOKING ENDPOINTS
// ============================================================================

/**
 * GET /api/booking/:slug
 * Get booking page configuration (public)
 */
router.get('/:slug', async (req: Request, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const bookingPage = await bookingService.getBookingPageBySlug(slug);

    if (!bookingPage) {
      res.status(404).json({ error: 'Booking page not found' });
      return;
    }

    // Return public-safe data
    res.json({
      data: {
        id: bookingPage.id,
        slug: bookingPage.slug,
        title: bookingPage.title,
        description: bookingPage.description,
        logoUrl: bookingPage.logoUrl,
        primaryColor: bookingPage.primaryColor,
        showProviderSelection: bookingPage.showProviderSelection,
        showAppointmentTypes: bookingPage.showAppointmentTypes,
        requirePhone: bookingPage.requirePhone,
        requireIntakeForm: bookingPage.requireIntakeForm,
        metaTitle: bookingPage.metaTitle,
        metaDescription: bookingPage.metaDescription,
        config: {
          practiceName: bookingPage.config.practiceName,
          timezone: bookingPage.config.timezone,
          minAdvanceBookingHours: bookingPage.config.minAdvanceBookingHours,
          maxAdvanceBookingDays: bookingPage.config.maxAdvanceBookingDays,
          defaultSlotDurationMin: bookingPage.config.defaultSlotDurationMin,
        },
        providers: bookingPage.showProviderSelection
          ? bookingPage.config.providers.map((p) => ({
              id: p.id,
              name: p.name,
              title: p.title,
              specialty: p.specialty,
            }))
          : [],
        appointmentTypes: bookingPage.showAppointmentTypes
          ? bookingPage.config.appointmentTypes.map((t) => ({
              id: t.id,
              name: t.name,
              description: t.description,
              durationMinutes: t.durationMinutes,
              price: t.price,
              currency: t.currency,
            }))
          : [],
        intakeForms: bookingPage.intakeForms.map((f) => ({
          id: f.id,
          name: f.name,
          description: f.description,
          fields: f.fields,
          isRequired: f.isRequired,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching booking page:', error);
    res.status(500).json({ error: 'Failed to fetch booking page' });
  }
});

/**
 * GET /api/booking/:slug/availability
 * Get available time slots (public)
 */
router.get(
  '/:slug/availability',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const parsed = availabilityQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten() });
        return;
      }

      const { startDate, endDate, providerId, appointmentTypeId, timezone } =
        parsed.data;

      const slots = await bookingService.getAvailableSlots(slug, {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        providerId,
        appointmentTypeId,
        timezone,
      });

      // Filter to only available slots and limit response
      const availableSlots = slots.filter((s) => s.available).slice(0, 200);

      res.json({
        data: {
          slots: availableSlots,
          totalSlots: availableSlots.length,
          timezone,
        },
      });
    } catch (error) {
      console.error('Error fetching availability:', error);
      if (
        error instanceof Error &&
        error.message === 'Booking page not found'
      ) {
        res.status(404).json({ error: 'Booking page not found' });
        return;
      }
      res.status(500).json({ error: 'Failed to fetch availability' });
    }
  },
);

/**
 * POST /api/booking/:slug/book
 * Create a new booking (public, no auth required)
 */
router.post(
  '/:slug/book',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;
      const parsed = createBookingSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten() });
        return;
      }

      const result = await bookingService.createPublicBooking(slug, {
        ...parsed.data,
        scheduledAt: new Date(parsed.data.scheduledAt),
      });

      res.status(201).json({
        data: {
          appointment: {
            id: result.appointment.id,
            confirmationCode: result.confirmationCode,
            scheduledAt: result.appointment.scheduledAt,
            durationMinutes: result.appointment.durationMinutes,
            status: result.appointment.status,
            provider: result.appointment.provider
              ? {
                  id: result.appointment.provider.id,
                  name: result.appointment.provider.name,
                  title: result.appointment.provider.title,
                }
              : null,
            appointmentType: result.appointment.appointmentType
              ? {
                  id: result.appointment.appointmentType.id,
                  name: result.appointment.appointmentType.name,
                }
              : null,
          },
          confirmationCode: result.confirmationCode,
          message: 'Booking confirmed successfully',
        },
      });
    } catch (error) {
      console.error('Error creating booking:', error);
      if (error instanceof Error) {
        if (
          error.message.includes('not found') ||
          error.message.includes('Invalid')
        ) {
          res.status(400).json({ error: error.message });
          return;
        }
        if (error.message.includes('no longer available')) {
          res.status(409).json({ error: error.message });
          return;
        }
      }
      res.status(500).json({ error: 'Failed to create booking' });
    }
  },
);

/**
 * GET /api/booking/confirmation/:code
 * Get booking details by confirmation code (public)
 */
router.get(
  '/confirmation/:code',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;

      const appointment =
        await bookingService.getAppointmentByConfirmationCode(code);

      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }

      res.json({
        data: {
          id: appointment.id,
          confirmationCode: appointment.confirmationCode,
          scheduledAt: appointment.scheduledAt,
          durationMinutes: appointment.durationMinutes,
          status: appointment.status,
          patientName: appointment.patientName,
          customerTimezone: appointment.customerTimezone,
          provider: appointment.provider,
          appointmentType: appointment.appointmentType,
          bookingPage: appointment.bookingPage
            ? {
                title: appointment.bookingPage.title,
                practiceName: appointment.bookingPage.config?.practiceName,
              }
            : null,
          canReschedule: appointment.canReschedule,
          canCancel: appointment.canCancel,
        },
      });
    } catch (error) {
      console.error('Error fetching appointment:', error);
      res.status(500).json({ error: 'Failed to fetch appointment' });
    }
  },
);

/**
 * POST /api/booking/confirmation/:code/reschedule
 * Reschedule a booking by confirmation code (public)
 */
router.post(
  '/confirmation/:code/reschedule',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;
      const parsed = rescheduleSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten() });
        return;
      }

      const appointment = await bookingService.rescheduleByConfirmationCode(
        code,
        new Date(parsed.data.newScheduledAt),
        parsed.data.timezone,
      );

      res.json({
        data: {
          appointment: {
            id: appointment.id,
            scheduledAt: appointment.scheduledAt,
            durationMinutes: appointment.durationMinutes,
            status: appointment.status,
          },
          message: 'Appointment rescheduled successfully',
        },
      });
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      if (error instanceof Error) {
        if (
          error.message.includes('not found') ||
          error.message.includes('cannot be')
        ) {
          res.status(400).json({ error: error.message });
          return;
        }
        if (error.message.includes('not available')) {
          res.status(409).json({ error: error.message });
          return;
        }
      }
      res.status(500).json({ error: 'Failed to reschedule appointment' });
    }
  },
);

/**
 * POST /api/booking/confirmation/:code/cancel
 * Cancel a booking by confirmation code (public)
 */
router.post(
  '/confirmation/:code/cancel',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;
      const parsed = cancelSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten() });
        return;
      }

      await bookingService.cancelByConfirmationCode(code, parsed.data.reason);

      res.json({
        data: {
          message: 'Appointment cancelled successfully',
        },
      });
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      if (error instanceof Error) {
        if (
          error.message.includes('not found') ||
          error.message.includes('cannot be')
        ) {
          res.status(400).json({ error: error.message });
          return;
        }
      }
      res.status(500).json({ error: 'Failed to cancel appointment' });
    }
  },
);

// ============================================================================
// SELF-SERVICE ENHANCEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/booking/confirmation/:code/eligibility
 * Get modification eligibility for a booking (public)
 * Returns detailed info about reschedule/cancel deadlines, fees, etc.
 */
router.get(
  '/confirmation/:code/eligibility',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;

      const appointment =
        await bookingService.getAppointmentByConfirmationCode(code);

      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }

      // Get detailed eligibility information
      const eligibility =
        await bookingRulesService.checkModificationEligibility(appointment.id);

      res.json({
        data: {
          ...eligibility,
          appointment: {
            id: appointment.id,
            scheduledAt: appointment.scheduledAt,
            status: appointment.status,
          },
        },
      });
    } catch (error) {
      console.error('Error checking eligibility:', error);
      res.status(500).json({ error: 'Failed to check eligibility' });
    }
  },
);

/**
 * GET /api/booking/confirmation/:code/reschedule-availability
 * Get available slots for rescheduling a booking (public)
 */
router.get(
  '/confirmation/:code/reschedule-availability',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;
      const parsed = availabilityQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten() });
        return;
      }

      const appointment =
        await bookingService.getAppointmentByConfirmationCode(code);

      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }

      if (!appointment.canReschedule) {
        res
          .status(400)
          .json({ error: 'This appointment cannot be rescheduled' });
        return;
      }

      if (!appointment.bookingPage) {
        res.status(400).json({ error: 'Booking page not found' });
        return;
      }

      const { startDate, endDate, timezone } = parsed.data;

      // Get available slots from the original booking page
      const slots = await bookingService.getAvailableSlots(
        appointment.bookingPage.slug,
        {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          providerId: appointment.provider?.id,
          appointmentTypeId: appointment.appointmentType?.id,
          timezone,
        },
      );

      // Filter to only available slots
      const availableSlots = slots.filter((s) => s.available).slice(0, 200);

      res.json({
        data: {
          slots: availableSlots,
          totalSlots: availableSlots.length,
          timezone,
          currentAppointment: {
            scheduledAt: appointment.scheduledAt,
            provider: appointment.provider,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching reschedule availability:', error);
      res.status(500).json({ error: 'Failed to fetch availability' });
    }
  },
);

/**
 * GET /api/booking/confirmation/:code/policies
 * Get modification policies for a booking's practice (public)
 */
router.get(
  '/confirmation/:code/policies',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { code } = req.params;

      const appointment =
        await bookingService.getAppointmentByConfirmationCode(code);

      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }

      // Get the appointment with config to get configId
      const fullAppointment =
        await bookingService.getAppointmentByConfirmationCode(code);
      if (!fullAppointment?.bookingPage?.config) {
        res.status(404).json({ error: 'Configuration not found' });
        return;
      }

      // We need to get the configId from the booking page's config
      const bookingPage = await bookingService.getBookingPageBySlug(
        fullAppointment.bookingPage.slug,
      );
      if (!bookingPage) {
        res.status(404).json({ error: 'Booking page not found' });
        return;
      }

      const rules = await bookingRulesService.getModificationRules(
        bookingPage.config.id,
      );

      // Return sanitized policy information for public display
      res.json({
        data: {
          reschedule: {
            allowed: rules.allowReschedule,
            minHoursNotice: rules.rescheduleMinHoursNotice,
            maxTimes: rules.rescheduleMaxTimes,
            fee: rules.rescheduleFee || null,
          },
          cancellation: {
            allowed: rules.allowCancel,
            minHoursNotice: rules.cancelMinHoursNotice,
            fee: rules.cancelFee || null,
            fullRefundHoursNotice: rules.fullRefundHoursNotice || null,
            partialRefundPercent: rules.partialRefundPercent || null,
          },
          practiceName: fullAppointment.bookingPage.config.practiceName,
        },
      });
    } catch (error) {
      console.error('Error fetching policies:', error);
      res.status(500).json({ error: 'Failed to fetch policies' });
    }
  },
);

// ============================================================================
// NATURAL LANGUAGE BOOKING ENDPOINTS (PUBLIC)
// ============================================================================

const nlMessageSchema = z.object({
  message: z.string().min(1).max(1000),
  conversationId: z.string().optional(),
});

/**
 * POST /api/booking/:slug/nl/message
 * Public endpoint for natural language booking via chatbot
 */
router.post(
  '/:slug/nl/message',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { slug } = req.params;

      // Get booking page to find configId
      const bookingPage = await bookingService.getBookingPageBySlug(slug);

      if (!bookingPage) {
        res.status(404).json({ error: 'Booking page not found' });
        return;
      }

      const parsed = nlMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ errors: parsed.error.flatten() });
        return;
      }

      const response = await nlService.processMessage(
        bookingPage.config.id,
        parsed.data.message,
        parsed.data.conversationId,
      );

      res.json({
        data: {
          ...response,
          bookingPage: {
            slug: bookingPage.slug,
            title: bookingPage.title,
            practiceName: bookingPage.config.practiceName,
          },
        },
      });
    } catch (error) {
      console.error('Error processing NL message:', error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  },
);

/**
 * DELETE /api/booking/:slug/nl/conversation/:conversationId
 * Clear a conversation state (public)
 */
router.delete(
  '/:slug/nl/conversation/:conversationId',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { conversationId } = req.params;

      nlService.clearConversation(conversationId);

      res.json({ data: { success: true } });
    } catch (error) {
      console.error('Error clearing conversation:', error);
      res.status(500).json({ error: 'Failed to clear conversation' });
    }
  },
);

export default router;
