/**
 * Scheduling Notifications Service
 *
 * Handles appointment reminders via SMS (Twilio) and Email (SendGrid).
 * Supports:
 * - Appointment confirmation notifications
 * - Reminder scheduling and delivery
 * - Cancellation/reschedule notifications
 */

import { prisma } from '../../prisma/client';

// ============================================================================
// CONFIGURATION
// ============================================================================

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const SENDGRID_FROM_EMAIL =
  process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com';
const SENDGRID_FROM_NAME =
  process.env.SENDGRID_FROM_NAME || 'Appointment Booking';

// ============================================================================
// TYPES
// ============================================================================

interface AppointmentDetails {
  id: number;
  patientName: string;
  patientEmail: string | null;
  patientPhone: string | null;
  scheduledAt: Date;
  durationMinutes: number;
  confirmationCode: string | null;
  config: {
    practiceName: string | null;
    timezone: string;
  };
  provider: {
    name: string;
    title: string | null;
  } | null;
  appointmentType: {
    name: string;
  } | null;
}

// ============================================================================
// TWILIO SMS
// ============================================================================

/**
 * Send SMS via Twilio
 */
export async function sendSMS(
  to: string,
  message: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.warn('Twilio credentials not configured, skipping SMS');
    return { success: false, error: 'Twilio not configured' };
  }

  try {
    // Format phone number (ensure it starts with +)
    const formattedPhone = to.startsWith('+')
      ? to
      : `+1${to.replace(/\D/g, '')}`;

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization:
            'Basic ' +
            Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString(
              'base64',
            ),
        },
        body: new URLSearchParams({
          From: TWILIO_PHONE_NUMBER,
          To: formattedPhone,
          Body: message,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Twilio error:', data);
      return { success: false, error: data.message || 'SMS sending failed' };
    }

    return { success: true, messageId: data.sid };
  } catch (error) {
    console.error('Twilio SMS error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// SENDGRID EMAIL
// ============================================================================

/**
 * Send email via SendGrid
 */
export async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string,
  textContent?: string,
): Promise<{ success: boolean; error?: string }> {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured, skipping email');
    return { success: false, error: 'SendGrid not configured' };
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: {
          email: SENDGRID_FROM_EMAIL,
          name: SENDGRID_FROM_NAME,
        },
        subject,
        content: [
          { type: 'text/plain', value: textContent || htmlContent },
          { type: 'text/html', value: htmlContent },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('SendGrid error:', error);
      return { success: false, error: 'Email sending failed' };
    }

    return { success: true };
  } catch (error) {
    console.error('SendGrid email error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// MESSAGE TEMPLATES
// ============================================================================

/**
 * Format date for display
 */
function formatDateTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  }).format(date);
}

/**
 * Generate confirmation SMS message
 */
function getConfirmationSMS(appointment: AppointmentDetails): string {
  const dateTime = formatDateTime(
    appointment.scheduledAt,
    appointment.config.timezone,
  );
  const practice = appointment.config.practiceName || 'Our office';
  const code = appointment.confirmationCode || '';

  return (
    `${practice}: Your appointment is confirmed for ${dateTime}. ` +
    `Confirmation code: ${code}. ` +
    `Reply CANCEL to cancel or HELP for assistance.`
  );
}

/**
 * Generate reminder SMS message
 */
function getReminderSMS(
  appointment: AppointmentDetails,
  hoursBefore: number,
): string {
  const dateTime = formatDateTime(
    appointment.scheduledAt,
    appointment.config.timezone,
  );
  const practice = appointment.config.practiceName || 'Our office';
  const timeLabel =
    hoursBefore >= 24
      ? `${Math.floor(hoursBefore / 24)} day(s)`
      : `${hoursBefore} hours`;

  return (
    `Reminder: Your appointment at ${practice} is in ${timeLabel} ` +
    `(${dateTime}). Reply CONFIRM to confirm or CANCEL to cancel.`
  );
}

/**
 * Generate cancellation SMS message
 */
function getCancellationSMS(appointment: AppointmentDetails): string {
  const dateTime = formatDateTime(
    appointment.scheduledAt,
    appointment.config.timezone,
  );
  const practice = appointment.config.practiceName || 'Our office';

  return (
    `${practice}: Your appointment for ${dateTime} has been cancelled. ` +
    `Please contact us if you need to reschedule.`
  );
}

/**
 * Generate reschedule SMS message
 */
function getRescheduleSMS(appointment: AppointmentDetails): string {
  const dateTime = formatDateTime(
    appointment.scheduledAt,
    appointment.config.timezone,
  );
  const practice = appointment.config.practiceName || 'Our office';
  const code = appointment.confirmationCode || '';

  return (
    `${practice}: Your appointment has been rescheduled to ${dateTime}. ` +
    `Confirmation code: ${code}. Reply CANCEL to cancel.`
  );
}

/**
 * Generate confirmation email content
 */
function getConfirmationEmail(appointment: AppointmentDetails): {
  subject: string;
  html: string;
  text: string;
} {
  const dateTime = formatDateTime(
    appointment.scheduledAt,
    appointment.config.timezone,
  );
  const practice = appointment.config.practiceName || 'Our Office';
  const code = appointment.confirmationCode || '';

  const subject = `Appointment Confirmation - ${practice}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Your Appointment is Confirmed</h2>
      <p>Hello ${appointment.patientName},</p>
      <p>Your appointment has been successfully scheduled:</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Date & Time:</strong> ${dateTime}</p>
        <p style="margin: 5px 0;"><strong>Duration:</strong> ${appointment.durationMinutes} minutes</p>
        ${appointment.provider ? `<p style="margin: 5px 0;"><strong>Provider:</strong> ${appointment.provider.name}${appointment.provider.title ? `, ${appointment.provider.title}` : ''}</p>` : ''}
        ${appointment.appointmentType ? `<p style="margin: 5px 0;"><strong>Service:</strong> ${appointment.appointmentType.name}</p>` : ''}
        <p style="margin: 5px 0;"><strong>Confirmation Code:</strong> <span style="font-family: monospace; font-size: 18px; color: #2563eb;">${code}</span></p>
      </div>
      <p>Save your confirmation code to manage your appointment online.</p>
      <p>If you need to cancel or reschedule, please contact us or use your confirmation code.</p>
      <p style="color: #666; margin-top: 30px;">Thank you for choosing ${practice}!</p>
    </div>
  `;

  const text = `
Your Appointment is Confirmed

Hello ${appointment.patientName},

Your appointment has been successfully scheduled:

Date & Time: ${dateTime}
Duration: ${appointment.durationMinutes} minutes
${appointment.provider ? `Provider: ${appointment.provider.name}${appointment.provider.title ? `, ${appointment.provider.title}` : ''}\n` : ''}${appointment.appointmentType ? `Service: ${appointment.appointmentType.name}\n` : ''}Confirmation Code: ${code}

Save your confirmation code to manage your appointment online.

If you need to cancel or reschedule, please contact us or use your confirmation code.

Thank you for choosing ${practice}!
  `.trim();

  return { subject, html, text };
}

/**
 * Generate reminder email content
 */
function getReminderEmail(
  appointment: AppointmentDetails,
  hoursBefore: number,
): {
  subject: string;
  html: string;
  text: string;
} {
  const dateTime = formatDateTime(
    appointment.scheduledAt,
    appointment.config.timezone,
  );
  const practice = appointment.config.practiceName || 'Our Office';
  const timeLabel =
    hoursBefore >= 24
      ? `${Math.floor(hoursBefore / 24)} day(s)`
      : `${hoursBefore} hours`;

  const subject = `Appointment Reminder - ${practice}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Appointment Reminder</h2>
      <p>Hello ${appointment.patientName},</p>
      <p>This is a friendly reminder that your appointment is in <strong>${timeLabel}</strong>:</p>
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Date & Time:</strong> ${dateTime}</p>
        <p style="margin: 5px 0;"><strong>Duration:</strong> ${appointment.durationMinutes} minutes</p>
        ${appointment.provider ? `<p style="margin: 5px 0;"><strong>Provider:</strong> ${appointment.provider.name}</p>` : ''}
      </div>
      <p>If you need to cancel or reschedule, please do so as soon as possible.</p>
      <p style="color: #666; margin-top: 30px;">We look forward to seeing you!</p>
    </div>
  `;

  const text = `
Appointment Reminder

Hello ${appointment.patientName},

This is a friendly reminder that your appointment is in ${timeLabel}:

Date & Time: ${dateTime}
Duration: ${appointment.durationMinutes} minutes
${appointment.provider ? `Provider: ${appointment.provider.name}\n` : ''}
If you need to cancel or reschedule, please do so as soon as possible.

We look forward to seeing you!
  `.trim();

  return { subject, html, text };
}

// ============================================================================
// NOTIFICATION SENDING
// ============================================================================

/**
 * Send appointment confirmation notifications
 */
export async function sendAppointmentConfirmation(
  appointmentId: number,
): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      config: {
        select: { practiceName: true, timezone: true, enableReminders: true },
      },
      provider: { select: { name: true, title: true } },
      appointmentType: { select: { name: true } },
    },
  });

  if (!appointment || !appointment.config.enableReminders) {
    return;
  }

  const details: AppointmentDetails = {
    id: appointment.id,
    patientName: appointment.patientName,
    patientEmail: appointment.patientEmail,
    patientPhone: appointment.patientPhone,
    scheduledAt: appointment.scheduledAt,
    durationMinutes: appointment.durationMinutes,
    confirmationCode: appointment.confirmationCode,
    config: {
      practiceName: appointment.config.practiceName,
      timezone: appointment.config.timezone,
    },
    provider: appointment.provider,
    appointmentType: appointment.appointmentType,
  };

  // Send SMS confirmation
  if (appointment.patientPhone) {
    const smsMessage = getConfirmationSMS(details);
    const smsResult = await sendSMS(appointment.patientPhone, smsMessage);

    await prisma.appointmentReminder.create({
      data: {
        appointmentId,
        channel: 'SMS',
        status: smsResult.success ? 'SENT' : 'FAILED',
        scheduledFor: new Date(),
        sentAt: smsResult.success ? new Date() : null,
        message: smsMessage,
        errorMessage: smsResult.error || null,
      },
    });
  }

  // Send email confirmation
  if (appointment.patientEmail) {
    const { subject, html, text } = getConfirmationEmail(details);
    const emailResult = await sendEmail(
      appointment.patientEmail,
      subject,
      html,
      text,
    );

    await prisma.appointmentReminder.create({
      data: {
        appointmentId,
        channel: 'EMAIL',
        status: emailResult.success ? 'SENT' : 'FAILED',
        scheduledFor: new Date(),
        sentAt: emailResult.success ? new Date() : null,
        message: subject,
        errorMessage: emailResult.error || null,
      },
    });
  }
}

/**
 * Send appointment cancellation notifications
 */
export async function sendAppointmentCancellation(
  appointmentId: number,
): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      config: {
        select: { practiceName: true, timezone: true, enableReminders: true },
      },
      provider: { select: { name: true, title: true } },
      appointmentType: { select: { name: true } },
    },
  });

  if (!appointment || !appointment.config.enableReminders) {
    return;
  }

  const details: AppointmentDetails = {
    id: appointment.id,
    patientName: appointment.patientName,
    patientEmail: appointment.patientEmail,
    patientPhone: appointment.patientPhone,
    scheduledAt: appointment.scheduledAt,
    durationMinutes: appointment.durationMinutes,
    confirmationCode: appointment.confirmationCode,
    config: {
      practiceName: appointment.config.practiceName,
      timezone: appointment.config.timezone,
    },
    provider: appointment.provider,
    appointmentType: appointment.appointmentType,
  };

  // Send SMS cancellation
  if (appointment.patientPhone) {
    const smsMessage = getCancellationSMS(details);
    await sendSMS(appointment.patientPhone, smsMessage);
  }

  // Send email cancellation
  if (appointment.patientEmail) {
    const practice = details.config.practiceName || 'Our Office';
    const dateTime = formatDateTime(
      details.scheduledAt,
      details.config.timezone,
    );

    await sendEmail(
      appointment.patientEmail,
      `Appointment Cancelled - ${practice}`,
      `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Appointment Cancelled</h2>
          <p>Hello ${details.patientName},</p>
          <p>Your appointment scheduled for <strong>${dateTime}</strong> has been cancelled.</p>
          <p>If you would like to reschedule, please contact us or book a new appointment online.</p>
          <p style="color: #666; margin-top: 30px;">Thank you for understanding.</p>
        </div>
      `,
    );
  }
}

/**
 * Send appointment reschedule notifications
 */
export async function sendAppointmentReschedule(
  appointmentId: number,
): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      config: {
        select: { practiceName: true, timezone: true, enableReminders: true },
      },
      provider: { select: { name: true, title: true } },
      appointmentType: { select: { name: true } },
    },
  });

  if (!appointment || !appointment.config.enableReminders) {
    return;
  }

  const details: AppointmentDetails = {
    id: appointment.id,
    patientName: appointment.patientName,
    patientEmail: appointment.patientEmail,
    patientPhone: appointment.patientPhone,
    scheduledAt: appointment.scheduledAt,
    durationMinutes: appointment.durationMinutes,
    confirmationCode: appointment.confirmationCode,
    config: {
      practiceName: appointment.config.practiceName,
      timezone: appointment.config.timezone,
    },
    provider: appointment.provider,
    appointmentType: appointment.appointmentType,
  };

  // Send SMS reschedule notification
  if (appointment.patientPhone) {
    const smsMessage = getRescheduleSMS(details);
    await sendSMS(appointment.patientPhone, smsMessage);
  }

  // Send email reschedule notification
  if (appointment.patientEmail) {
    const { subject, html, text } = getConfirmationEmail(details);
    const rescheduledSubject = subject.replace('Confirmation', 'Rescheduled');
    await sendEmail(appointment.patientEmail, rescheduledSubject, html, text);
  }
}

// ============================================================================
// REMINDER SCHEDULING
// ============================================================================

/**
 * Schedule reminders for an appointment
 */
export async function scheduleReminders(appointmentId: number): Promise<void> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      config: {
        select: {
          enableReminders: true,
          reminderHoursBefore: true,
        },
      },
    },
  });

  if (!appointment || !appointment.config.enableReminders) {
    return;
  }

  const reminderHours = appointment.config.reminderHoursBefore || [24, 2];

  for (const hours of reminderHours) {
    const scheduledFor = new Date(
      appointment.scheduledAt.getTime() - hours * 60 * 60 * 1000,
    );

    // Don't schedule if it's in the past
    if (scheduledFor < new Date()) {
      continue;
    }

    // Schedule SMS reminder if phone provided
    if (appointment.patientPhone) {
      await prisma.appointmentReminder.create({
        data: {
          appointmentId,
          channel: 'SMS',
          status: 'PENDING',
          scheduledFor,
          message: `Reminder scheduled for ${hours} hours before appointment`,
        },
      });
    }

    // Schedule email reminder if email provided
    if (appointment.patientEmail) {
      await prisma.appointmentReminder.create({
        data: {
          appointmentId,
          channel: 'EMAIL',
          status: 'PENDING',
          scheduledFor,
          message: `Reminder scheduled for ${hours} hours before appointment`,
        },
      });
    }
  }
}

/**
 * Process pending reminders (called by scheduled job)
 */
export async function processPendingReminders(): Promise<number> {
  const now = new Date();

  // Find pending reminders that should be sent
  const pendingReminders = await prisma.appointmentReminder.findMany({
    where: {
      status: 'PENDING',
      scheduledFor: { lte: now },
    },
    include: {
      appointment: {
        include: {
          config: { select: { practiceName: true, timezone: true } },
          provider: { select: { name: true, title: true } },
          appointmentType: { select: { name: true } },
        },
      },
    },
    take: 100, // Process in batches
  });

  let sentCount = 0;

  for (const reminder of pendingReminders) {
    const appointment = reminder.appointment;

    // Skip if appointment is cancelled or completed
    if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(appointment.status)) {
      await prisma.appointmentReminder.update({
        where: { id: reminder.id },
        data: {
          status: 'FAILED',
          errorMessage: 'Appointment cancelled/completed',
        },
      });
      continue;
    }

    const details: AppointmentDetails = {
      id: appointment.id,
      patientName: appointment.patientName,
      patientEmail: appointment.patientEmail,
      patientPhone: appointment.patientPhone,
      scheduledAt: appointment.scheduledAt,
      durationMinutes: appointment.durationMinutes,
      confirmationCode: appointment.confirmationCode,
      config: {
        practiceName: appointment.config.practiceName,
        timezone: appointment.config.timezone,
      },
      provider: appointment.provider,
      appointmentType: appointment.appointmentType,
    };

    // Calculate hours before appointment
    const hoursBefore = Math.round(
      (appointment.scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60),
    );

    try {
      let success = false;

      if (reminder.channel === 'SMS' && appointment.patientPhone) {
        const message = getReminderSMS(details, hoursBefore);
        const result = await sendSMS(appointment.patientPhone, message);
        success = result.success;

        if (!success) {
          await prisma.appointmentReminder.update({
            where: { id: reminder.id },
            data: {
              status: 'FAILED',
              errorMessage: result.error,
              retryCount: reminder.retryCount + 1,
            },
          });
        }
      } else if (reminder.channel === 'EMAIL' && appointment.patientEmail) {
        const { subject, html, text } = getReminderEmail(details, hoursBefore);
        const result = await sendEmail(
          appointment.patientEmail,
          subject,
          html,
          text,
        );
        success = result.success;

        if (!success) {
          await prisma.appointmentReminder.update({
            where: { id: reminder.id },
            data: {
              status: 'FAILED',
              errorMessage: result.error,
              retryCount: reminder.retryCount + 1,
            },
          });
        }
      }

      if (success) {
        await prisma.appointmentReminder.update({
          where: { id: reminder.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
          },
        });
        sentCount++;
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      await prisma.appointmentReminder.update({
        where: { id: reminder.id },
        data: {
          status: 'FAILED',
          errorMessage:
            error instanceof Error ? error.message : 'Unknown error',
          retryCount: reminder.retryCount + 1,
        },
      });
    }
  }

  return sentCount;
}
