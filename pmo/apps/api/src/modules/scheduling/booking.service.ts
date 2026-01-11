/**
 * Public Booking Service
 *
 * Handles public-facing booking functionality:
 * - Public booking page configuration
 * - Available slot generation
 * - Public appointment creation
 * - Self-service reschedule/cancel
 */

import { prisma } from '../../prisma/client';
import { Prisma } from '@prisma/client';
import crypto from 'crypto';
import * as calendarService from './calendar.service';
import * as notificationsService from './notifications.service';
import * as paymentService from './payment.service';
import * as videoService from './video.service';

// ============================================================================
// TYPES
// ============================================================================

interface PublicBookingInput {
  appointmentTypeId?: number;
  providerId?: number;
  scheduledAt: Date;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  timezone?: string;
  intakeFormResponses?: Record<string, unknown>;
}

interface AvailabilityQuery {
  startDate: Date;
  endDate: Date;
  providerId?: number;
  appointmentTypeId?: number;
  timezone?: string;
}

interface TimeSlot {
  datetime: Date;
  providerId: number | null;
  providerName: string | null;
  available: boolean;
}

// ============================================================================
// BOOKING PAGE MANAGEMENT
// ============================================================================

/**
 * Get booking page by slug for public access
 */
export async function getBookingPageBySlug(slug: string) {
  const bookingPage = await prisma.bookingPage.findUnique({
    where: { slug },
    include: {
      config: {
        include: {
          client: { select: { id: true, name: true } },
          providers: { where: { isActive: true }, orderBy: { name: 'asc' } },
          appointmentTypes: {
            where: { isActive: true },
            orderBy: { name: 'asc' },
          },
        },
      },
      intakeForms: {
        where: { isRequired: true },
        orderBy: { displayOrder: 'asc' },
      },
    },
  });

  if (!bookingPage || !bookingPage.isActive) {
    return null;
  }

  return bookingPage;
}

/**
 * Create a new booking page for a scheduling config
 */
export async function createBookingPage(
  configId: number,
  data: {
    slug: string;
    title: string;
    description?: string;
    logoUrl?: string;
    primaryColor?: string;
    showProviderSelection?: boolean;
    showAppointmentTypes?: boolean;
    requirePhone?: boolean;
    requireIntakeForm?: boolean;
    metaTitle?: string;
    metaDescription?: string;
  },
) {
  return prisma.bookingPage.create({
    data: {
      configId,
      ...data,
    },
  });
}

/**
 * Update booking page settings
 */
export async function updateBookingPage(
  id: number,
  data: Partial<{
    slug: string;
    title: string;
    description: string | null;
    logoUrl: string | null;
    primaryColor: string;
    showProviderSelection: boolean;
    showAppointmentTypes: boolean;
    requirePhone: boolean;
    requireIntakeForm: boolean;
    metaTitle: string | null;
    metaDescription: string | null;
    isActive: boolean;
  }>,
) {
  return prisma.bookingPage.update({
    where: { id },
    data,
  });
}

/**
 * Get booking pages for a config
 */
export async function getBookingPages(configId: number) {
  return prisma.bookingPage.findMany({
    where: { configId },
    orderBy: { createdAt: 'desc' },
  });
}

// ============================================================================
// AVAILABILITY CALCULATION
// ============================================================================

/**
 * Get available time slots for public booking
 */
export async function getAvailableSlots(
  slug: string,
  query: AvailabilityQuery,
): Promise<TimeSlot[]> {
  const bookingPage = await getBookingPageBySlug(slug);
  if (!bookingPage) {
    throw new Error('Booking page not found');
  }

  const config = bookingPage.config;
  const { startDate, endDate, providerId, appointmentTypeId } = query;

  // Get appointment duration
  let slotDuration = config.defaultSlotDurationMin;
  if (appointmentTypeId) {
    const appointmentType = config.appointmentTypes.find(
      (t) => t.id === appointmentTypeId,
    );
    if (appointmentType) {
      slotDuration = appointmentType.durationMinutes;
    }
  }

  // Get providers to check availability for
  let providers = config.providers;
  if (providerId) {
    providers = providers.filter((p) => p.id === providerId);
  }

  // Get existing appointments in the date range
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      configId: config.id,
      scheduledAt: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'],
      },
      ...(providerId ? { providerId } : {}),
    },
    select: {
      scheduledAt: true,
      durationMinutes: true,
      providerId: true,
    },
  });

  // Generate time slots
  const slots: TimeSlot[] = [];
  const bufferMinutes = config.bufferBetweenSlotsMin;
  const minAdvanceHours = config.minAdvanceBookingHours;
  const now = new Date();
  const minBookingTime = new Date(
    now.getTime() + minAdvanceHours * 60 * 60 * 1000,
  );

  // Iterate through each day
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay().toString();

    for (const provider of providers) {
      // Get provider availability for this day
      const availabilitySchedule =
        (provider.availabilitySchedule as Record<
          string,
          Array<{ start: string; end: string }>
        >) || {};
      const dayAvailability = availabilitySchedule[dayOfWeek] || [];

      // Check for overrides (blocked days or custom hours)
      const dateStr = currentDate.toISOString().split('T')[0];
      const overrides =
        (provider.availabilityOverrides as Record<string, unknown>) || {};
      const dayOverride = overrides[dateStr];

      if (dayOverride === 'blocked') {
        // Entire day is blocked
        continue;
      }

      const scheduleToUse =
        Array.isArray(dayOverride) && dayOverride.length > 0
          ? (dayOverride as Array<{ start: string; end: string }>)
          : dayAvailability;

      for (const window of scheduleToUse) {
        // Parse start and end times
        const [startHour, startMin] = window.start.split(':').map(Number);
        const [endHour, endMin] = window.end.split(':').map(Number);

        const windowStart = new Date(currentDate);
        windowStart.setHours(startHour, startMin, 0, 0);

        const windowEnd = new Date(currentDate);
        windowEnd.setHours(endHour, endMin, 0, 0);

        // Generate slots within this window
        let slotStart = new Date(windowStart);
        while (
          slotStart.getTime() + slotDuration * 60 * 1000 <=
          windowEnd.getTime()
        ) {
          const slotEnd = new Date(
            slotStart.getTime() + slotDuration * 60 * 1000,
          );

          // Check if slot is bookable (after minimum advance time)
          if (slotStart > minBookingTime) {
            // Check for conflicts with existing appointments
            const hasConflict = existingAppointments.some((apt) => {
              if (apt.providerId !== provider.id) return false;

              const aptStart = new Date(apt.scheduledAt);
              const aptEnd = new Date(
                aptStart.getTime() + apt.durationMinutes * 60 * 1000,
              );

              // Check for overlap (with buffer)
              const slotStartWithBuffer = new Date(
                slotStart.getTime() - bufferMinutes * 60 * 1000,
              );
              const slotEndWithBuffer = new Date(
                slotEnd.getTime() + bufferMinutes * 60 * 1000,
              );

              return !(
                aptEnd <= slotStartWithBuffer || aptStart >= slotEndWithBuffer
              );
            });

            slots.push({
              datetime: new Date(slotStart),
              providerId: provider.id,
              providerName: provider.name,
              available: !hasConflict,
            });
          }

          // Move to next slot
          slotStart = new Date(
            slotStart.getTime() +
              slotDuration * 60 * 1000 +
              bufferMinutes * 60 * 1000,
          );
        }
      }
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Sort slots by datetime
  slots.sort((a, b) => a.datetime.getTime() - b.datetime.getTime());

  return slots;
}

// ============================================================================
// PUBLIC BOOKING
// ============================================================================

/**
 * Generate a unique confirmation code
 */
function generateConfirmationCode(): string {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}

/**
 * Create a public booking (no authentication required)
 */
export async function createPublicBooking(
  slug: string,
  data: PublicBookingInput,
) {
  const bookingPage = await getBookingPageBySlug(slug);
  if (!bookingPage) {
    throw new Error('Booking page not found');
  }

  const config = bookingPage.config;

  // Validate phone if required
  if (bookingPage.requirePhone && !data.patientPhone) {
    throw new Error('Phone number is required');
  }

  // Validate provider if specified
  if (data.providerId) {
    const provider = config.providers.find((p) => p.id === data.providerId);
    if (!provider) {
      throw new Error('Invalid provider selected');
    }
  }

  // Validate appointment type if specified
  let duration = config.defaultSlotDurationMin;
  if (data.appointmentTypeId) {
    const appointmentType = config.appointmentTypes.find(
      (t) => t.id === data.appointmentTypeId,
    );
    if (!appointmentType) {
      throw new Error('Invalid appointment type selected');
    }
    duration = appointmentType.durationMinutes;
  }

  // Validate the slot is available
  const slotStart = new Date(data.scheduledAt);
  const minAdvanceHours = config.minAdvanceBookingHours;
  const minBookingTime = new Date(
    Date.now() + minAdvanceHours * 60 * 60 * 1000,
  );

  if (slotStart < minBookingTime) {
    throw new Error(
      `Appointments must be booked at least ${minAdvanceHours} hours in advance`,
    );
  }

  // Check for conflicts
  const conflictingAppointment = await prisma.appointment.findFirst({
    where: {
      configId: config.id,
      providerId: data.providerId || undefined,
      scheduledAt: {
        gte: new Date(
          slotStart.getTime() - config.bufferBetweenSlotsMin * 60 * 1000,
        ),
        lt: new Date(
          slotStart.getTime() +
            duration * 60 * 1000 +
            config.bufferBetweenSlotsMin * 60 * 1000,
        ),
      },
      status: {
        in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'],
      },
    },
  });

  if (conflictingAppointment) {
    throw new Error('This time slot is no longer available');
  }

  // Generate confirmation code
  const confirmationCode = generateConfirmationCode();

  // Create the appointment
  const appointment = await prisma.appointment.create({
    data: {
      configId: config.id,
      bookingPageId: bookingPage.id,
      providerId: data.providerId || null,
      appointmentTypeId: data.appointmentTypeId || null,
      patientName: data.patientName,
      patientEmail: data.patientEmail || null,
      patientPhone: data.patientPhone || null,
      scheduledAt: data.scheduledAt,
      durationMinutes: duration,
      confirmationCode,
      customerTimezone: data.timezone || null,
      status: 'SCHEDULED',
    },
    include: {
      provider: true,
      appointmentType: true,
      bookingPage: true,
    },
  });

  // Save intake form responses if provided
  if (data.intakeFormResponses && bookingPage.intakeForms.length > 0) {
    for (const form of bookingPage.intakeForms) {
      const formResponses = data.intakeFormResponses[form.id.toString()];
      if (formResponses) {
        await prisma.bookingIntakeFormResponse.create({
          data: {
            formId: form.id,
            appointmentId: appointment.id,
            responses: formResponses as Prisma.InputJsonValue,
          },
        });
      }
    }
  }

  // Schedule reminders and send confirmation notifications
  try {
    await notificationsService.scheduleReminders(appointment.id);
    await notificationsService.sendAppointmentConfirmation(appointment.id);
  } catch (error) {
    console.error('Failed to schedule reminders:', error);
    // Don't fail the booking if notifications fail
  }

  // Sync to calendar if integration is configured
  try {
    await calendarService.syncAppointmentToCalendar(appointment.id);
  } catch (error) {
    console.error('Failed to sync to calendar:', error);
    // Don't fail the booking if calendar sync fails
  }

  // Create video meeting if configured
  try {
    await videoService.createMeetingForAppointment(appointment.id);
  } catch (error) {
    console.error('Failed to create video meeting:', error);
    // Don't fail the booking if video meeting creation fails
  }

  // Check if payment is required and return payment info
  let paymentRequired = false;
  let paymentInfo: {
    clientSecret?: string;
    paymentIntentId?: string;
    amount?: number;
    currency?: string;
  } | null = null;

  try {
    const paymentDetails = await paymentService.calculateAppointmentPayment(
      appointment.id,
    );
    if (paymentDetails && paymentDetails.totalAmount > 0) {
      paymentRequired = true;
      // Note: Actual payment intent creation happens in payment.router.ts
      // We just flag that payment is required
      paymentInfo = {
        amount: paymentDetails.depositAmount || paymentDetails.totalAmount,
        currency: paymentDetails.currency,
      };
    }
  } catch (error) {
    console.error('Failed to check payment requirements:', error);
  }

  return {
    appointment,
    confirmationCode,
    paymentRequired,
    paymentInfo,
  };
}

// ============================================================================
// CONFIRMATION CODE LOOKUP
// ============================================================================

/**
 * Get appointment by confirmation code (for self-service)
 */
export async function getAppointmentByConfirmationCode(code: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { confirmationCode: code },
    include: {
      provider: { select: { id: true, name: true, title: true } },
      appointmentType: {
        select: { id: true, name: true, durationMinutes: true },
      },
      bookingPage: {
        select: { id: true, title: true, slug: true },
        include: {
          config: {
            select: {
              practiceName: true,
              timezone: true,
              minAdvanceBookingHours: true,
            },
          },
        },
      },
      intakeFormResponses: true,
    },
  });

  if (!appointment) {
    return null;
  }

  // Check if rescheduling/cancellation is allowed
  const config = appointment.bookingPage?.config;
  const minAdvanceHours = config?.minAdvanceBookingHours || 24;
  const canModify =
    appointment.status === 'SCHEDULED' &&
    new Date(appointment.scheduledAt).getTime() >
      Date.now() + minAdvanceHours * 60 * 60 * 1000;

  return {
    ...appointment,
    canReschedule: canModify,
    canCancel: canModify,
  };
}

/**
 * Reschedule an appointment by confirmation code
 */
export async function rescheduleByConfirmationCode(
  code: string,
  newScheduledAt: Date,
  timezone?: string,
) {
  const appointment = await getAppointmentByConfirmationCode(code);
  if (!appointment) {
    throw new Error('Appointment not found');
  }

  if (!appointment.canReschedule) {
    throw new Error('This appointment cannot be rescheduled');
  }

  if (!appointment.bookingPage) {
    throw new Error('Booking page not found for this appointment');
  }

  const config = appointment.bookingPage.config;
  const minAdvanceHours = config?.minAdvanceBookingHours || 24;
  const minBookingTime = new Date(
    Date.now() + minAdvanceHours * 60 * 60 * 1000,
  );

  if (newScheduledAt < minBookingTime) {
    throw new Error(
      `Appointments must be booked at least ${minAdvanceHours} hours in advance`,
    );
  }

  // Get the configId from the appointment
  const fullAppointment = await prisma.appointment.findUnique({
    where: { confirmationCode: code },
    select: { configId: true },
  });

  if (!fullAppointment) {
    throw new Error('Appointment not found');
  }

  // Check for conflicts at the new time
  const conflictingAppointment = await prisma.appointment.findFirst({
    where: {
      configId: fullAppointment.configId,
      providerId: appointment.provider?.id || undefined,
      id: { not: appointment.id },
      scheduledAt: {
        gte: new Date(newScheduledAt.getTime() - 30 * 60 * 1000), // 30 min buffer
        lt: new Date(
          newScheduledAt.getTime() +
            appointment.durationMinutes * 60 * 1000 +
            30 * 60 * 1000,
        ),
      },
      status: {
        in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'],
      },
    },
  });

  if (conflictingAppointment) {
    throw new Error('This time slot is not available');
  }

  // Update the appointment
  const updatedAppointment = await prisma.appointment.update({
    where: { confirmationCode: code },
    data: {
      scheduledAt: newScheduledAt,
      customerTimezone: timezone || appointment.customerTimezone,
      status: 'SCHEDULED',
      rescheduledFrom: appointment.id,
    },
    include: {
      provider: true,
      appointmentType: true,
    },
  });

  // Update calendar event
  try {
    await calendarService.updateAppointmentCalendarEvent(updatedAppointment.id);
  } catch (error) {
    console.error('Failed to update calendar event:', error);
  }

  // Update video meeting
  try {
    await videoService.updateMeetingForAppointment(updatedAppointment.id);
  } catch (error) {
    console.error('Failed to update video meeting:', error);
  }

  // Send reschedule confirmation notification
  try {
    await notificationsService.sendAppointmentReschedule(updatedAppointment.id);
    // Re-schedule reminders for the new time
    await notificationsService.scheduleReminders(updatedAppointment.id);
  } catch (error) {
    console.error('Failed to send reschedule notification:', error);
  }

  return updatedAppointment;
}

/**
 * Cancel an appointment by confirmation code
 */
export async function cancelByConfirmationCode(code: string, reason?: string) {
  const appointment = await getAppointmentByConfirmationCode(code);
  if (!appointment) {
    throw new Error('Appointment not found');
  }

  if (!appointment.canCancel) {
    throw new Error('This appointment cannot be cancelled');
  }

  // Update the appointment
  const cancelledAppointment = await prisma.appointment.update({
    where: { confirmationCode: code },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancellationReason: reason || null,
      cancelledBy: 'patient',
    },
  });

  // Delete calendar event
  try {
    await calendarService.deleteAppointmentCalendarEvent(
      cancelledAppointment.id,
    );
  } catch (error) {
    console.error('Failed to delete calendar event:', error);
  }

  // Delete video meeting
  try {
    await videoService.deleteMeetingForAppointment(cancelledAppointment.id);
  } catch (error) {
    console.error('Failed to delete video meeting:', error);
  }

  // Send cancellation confirmation notification
  try {
    await notificationsService.sendAppointmentCancellation(
      cancelledAppointment.id,
    );
  } catch (error) {
    console.error('Failed to send cancellation notification:', error);
  }

  // Process refund if payment was made
  try {
    const isPaid = await paymentService.isAppointmentPaid(
      cancelledAppointment.id,
    );
    if (isPaid) {
      await paymentService.processRefund(
        cancelledAppointment.id,
        'Appointment cancelled by customer',
      );
    }
  } catch (error) {
    console.error('Failed to process refund:', error);
    // Don't fail the cancellation if refund fails - handle manually
  }

  // Notify waitlist about the now-available slot
  try {
    await notifyWaitlistOfOpening(
      cancelledAppointment.configId,
      cancelledAppointment.providerId,
      cancelledAppointment.scheduledAt,
      cancelledAppointment.durationMinutes,
    );
  } catch (error) {
    console.error('Failed to notify waitlist:', error);
  }

  return cancelledAppointment;
}

/**
 * Notify waitlist entries about an opening
 */
async function notifyWaitlistOfOpening(
  configId: number,
  providerId: number | null,
  scheduledAt: Date,
  durationMinutes: number,
): Promise<void> {
  // Find matching waitlist entries
  const entries = await prisma.waitlistEntry.findMany({
    where: {
      configId,
      isActive: true,
      OR: [{ preferredProviderId: providerId }, { preferredProviderId: null }],
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    take: 5, // Notify top 5 matches
  });

  if (entries.length === 0) {
    return;
  }

  // Get config for practice name and timezone
  const config = await prisma.schedulingConfig.findUnique({
    where: { id: configId },
    select: { practiceName: true, timezone: true },
  });

  const dateTime = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: config?.timezone || 'America/New_York',
  }).format(scheduledAt);

  const practice = config?.practiceName || 'Our office';

  for (const entry of entries) {
    // Send SMS notification if phone provided
    if (entry.patientPhone) {
      const message =
        `${practice}: A ${durationMinutes}-minute appointment slot just opened up ` +
        `for ${dateTime}. Book now before it's taken! Reply BOOK to claim this slot.`;

      await notificationsService.sendSMS(entry.patientPhone, message);
    }

    // Send email notification if email provided
    if (entry.patientEmail) {
      const subject = `Appointment Opening - ${practice}`;
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Appointment Opening Available!</h2>
          <p>Hello ${entry.patientName},</p>
          <p>Great news! A ${durationMinutes}-minute appointment slot has just become available:</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Date & Time:</strong> ${dateTime}</p>
            <p style="margin: 5px 0;"><strong>Duration:</strong> ${durationMinutes} minutes</p>
          </div>
          <p>This slot is available on a first-come, first-served basis.</p>
          <p style="color: #666; margin-top: 30px;">Thank you for your patience!</p>
        </div>
      `;

      await notificationsService.sendEmail(entry.patientEmail, subject, html);
    }

    // Mark entry as notified
    await prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: {
        notifiedAt: new Date(),
      },
    });
  }
}

// ============================================================================
// INTAKE FORM MANAGEMENT
// ============================================================================

/**
 * Create an intake form for a booking page
 */
export async function createBookingIntakeForm(
  bookingPageId: number,
  data: {
    name: string;
    description?: string;
    fields: Prisma.InputJsonValue;
    isRequired?: boolean;
    displayOrder?: number;
  },
) {
  return prisma.bookingIntakeForm.create({
    data: {
      bookingPageId,
      ...data,
    },
  });
}

/**
 * Get intake forms for a booking page
 */
export async function getBookingIntakeForms(bookingPageId: number) {
  return prisma.bookingIntakeForm.findMany({
    where: { bookingPageId },
    orderBy: { displayOrder: 'asc' },
  });
}

/**
 * Update an intake form
 */
export async function updateBookingIntakeForm(
  id: number,
  data: Partial<{
    name: string;
    description: string | null;
    fields: Prisma.InputJsonValue;
    isRequired: boolean;
    displayOrder: number;
  }>,
) {
  return prisma.bookingIntakeForm.update({
    where: { id },
    data,
  });
}

/**
 * Delete an intake form
 */
export async function deleteBookingIntakeForm(id: number) {
  return prisma.bookingIntakeForm.delete({
    where: { id },
  });
}
