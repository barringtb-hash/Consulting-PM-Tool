/**
 * Public Booking Router
 *
 * Public-facing API endpoints for self-service booking.
 * These endpoints do NOT require authentication.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as bookingService from './booking.service';

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
  intakeFormResponses: z.record(z.unknown()).optional(),
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

export default router;
