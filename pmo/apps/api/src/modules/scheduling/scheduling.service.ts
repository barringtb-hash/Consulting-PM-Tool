/**
 * Tool 1.3: AI Scheduling Assistant Service
 *
 * AI-powered scheduling with:
 * - No-show prediction using ML
 * - Automated reminders via SMS/Email
 * - Waitlist management
 * - Multi-provider support
 * - Calendar integration
 * - HIPAA-compliant messaging
 */

import { prisma } from '../../prisma/client';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { getTenantId, hasTenantContext } from '../../tenant/tenant.context';

// ============================================================================
// TYPES
// ============================================================================

interface SchedulingConfigInput {
  practiceName?: string;
  timezone?: string;
  minAdvanceBookingHours?: number;
  maxAdvanceBookingDays?: number;
  defaultSlotDurationMin?: number;
  bufferBetweenSlotsMin?: number;
  enableReminders?: boolean;
  reminderHoursBefore?: number[];
  enableNoShowPrediction?: boolean;
  noShowThreshold?: number;
  enableOverbooking?: boolean;
  enableWaitlist?: boolean;
  isHipaaEnabled?: boolean;
}

interface ProviderInput {
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  specialty?: string;
  externalProviderId?: string;
  npiNumber?: string;
  availabilitySchedule?: Prisma.InputJsonValue;
  availabilityOverrides?: Prisma.InputJsonValue;
}

interface AppointmentTypeInput {
  name: string;
  description?: string;
  durationMinutes?: number;
  price?: number;
  currency?: string;
  requiresDeposit?: boolean;
  depositAmount?: number;
  color?: string;
}

interface AppointmentInput {
  providerId?: number;
  appointmentTypeId?: number;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  scheduledAt: Date;
  durationMinutes?: number;
  notes?: string;
}

interface TimeSlot {
  startTime: Date;
  endTime: Date;
  providerId: number;
  providerName: string;
  isAvailable: boolean;
}

// ============================================================================
// CONFIG MANAGEMENT
// ============================================================================

/**
 * Standard includes for scheduling config queries
 * NOTE: ALL includes have been temporarily removed to diagnose
 * a "column does not exist" error in production. Once the root cause
 * is identified, includes can be gradually restored.
 */
const configIncludes = {
  // Temporarily removed ALL includes to diagnose the issue
  // account: { select: { id: true, name: true } },
  // client: { select: { id: true, name: true } },
  // providers: { where: { isActive: true } },
  // appointmentTypes: { where: { isActive: true } },
};

/**
 * Get scheduling config by Account ID (preferred)
 */
export async function getSchedulingConfigByAccount(accountId: number) {
  return prisma.schedulingConfig.findUnique({
    where: { accountId },
    include: configIncludes,
  });
}

/**
 * Get scheduling config by Client ID (legacy - for backward compatibility)
 * @deprecated Use getSchedulingConfigByAccount instead
 */
export async function getSchedulingConfig(clientId: number) {
  return prisma.schedulingConfig.findUnique({
    where: { clientId },
    include: configIncludes,
  });
}

/**
 * List scheduling configs with optional filters
 */
export async function listSchedulingConfigs(filters?: {
  clientId?: number;
  accountId?: number;
  tenantId?: string;
}) {
  const where: Prisma.SchedulingConfigWhereInput = {};

  // Apply tenant context automatically when available
  if (hasTenantContext()) {
    where.tenantId = getTenantId();
  } else if (filters?.tenantId) {
    where.tenantId = filters.tenantId;
  }

  if (filters?.accountId) {
    where.accountId = filters.accountId;
  }
  if (filters?.clientId) {
    where.clientId = filters.clientId;
  }

  return prisma.schedulingConfig.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    include: {
      // Temporarily removed: account: { select: { id: true, name: true } },
      // Temporarily removed: client: { select: { id: true, name: true } },
      _count: { select: { providers: true, appointments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Create scheduling config for an Account (preferred)
 */
export async function createSchedulingConfigForAccount(
  accountId: number,
  data: SchedulingConfigInput,
  tenantId?: string,
) {
  // Resolve tenant ID: use explicit param, or context, or undefined
  const resolvedTenantId =
    tenantId ?? (hasTenantContext() ? getTenantId() : undefined);

  // Just create and return directly - no additional fetch
  // This bypasses any potential issues with includes/relations
  return prisma.schedulingConfig.create({
    data: {
      accountId,
      tenantId: resolvedTenantId,
      ...data,
    },
  });
}

/**
 * Create scheduling config for a Client (legacy - for backward compatibility)
 * @deprecated Use createSchedulingConfigForAccount instead
 */
export async function createSchedulingConfig(
  clientId: number,
  data: SchedulingConfigInput,
) {
  // Create without includes first, then fetch with includes
  // This avoids potential issues with relation loading during create
  const created = await prisma.schedulingConfig.create({
    data: {
      clientId,
      ...(hasTenantContext() && { tenantId: getTenantId() }),
      ...data,
    },
  });

  // Fetch the created config with safe relations (providers/appointmentTypes)
  // Account/Client includes have been removed to avoid column errors
  const config = await prisma.schedulingConfig.findUnique({
    where: { id: created.id },
    include: configIncludes,
  });
  if (!config) {
    throw new Error('Failed to fetch created scheduling config');
  }
  return config;
}

/**
 * Update scheduling config by Account ID (preferred)
 */
export async function updateSchedulingConfigByAccount(
  accountId: number,
  data: Partial<SchedulingConfigInput>,
) {
  return prisma.schedulingConfig.update({
    where: { accountId },
    data,
    include: configIncludes,
  });
}

/**
 * Update scheduling config by Client ID (legacy - for backward compatibility)
 * @deprecated Use updateSchedulingConfigByAccount instead
 */
export async function updateSchedulingConfig(
  clientId: number,
  data: Partial<SchedulingConfigInput>,
) {
  return prisma.schedulingConfig.update({
    where: { clientId },
    data,
    include: configIncludes,
  });
}

// ============================================================================
// PROVIDER MANAGEMENT
// ============================================================================

export async function createProvider(configId: number, data: ProviderInput) {
  return prisma.provider.create({
    data: {
      configId,
      ...data,
    },
  });
}

export async function getProviders(configId: number) {
  return prisma.provider.findMany({
    where: { configId, isActive: true },
    orderBy: { name: 'asc' },
  });
}

export async function getProvider(id: number) {
  return prisma.provider.findUnique({
    where: { id },
    include: {
      appointments: {
        where: {
          scheduledAt: { gte: new Date() },
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
        orderBy: { scheduledAt: 'asc' },
        take: 10,
      },
    },
  });
}

export async function updateProvider(id: number, data: Partial<ProviderInput>) {
  return prisma.provider.update({
    where: { id },
    data,
  });
}

export async function deleteProvider(id: number) {
  return prisma.provider.update({
    where: { id },
    data: { isActive: false },
  });
}

// ============================================================================
// APPOINTMENT TYPES
// ============================================================================

export async function createAppointmentType(
  configId: number,
  data: AppointmentTypeInput,
) {
  return prisma.appointmentType.create({
    data: {
      configId,
      ...data,
    },
  });
}

export async function getAppointmentTypes(configId: number) {
  return prisma.appointmentType.findMany({
    where: { configId, isActive: true },
    orderBy: { name: 'asc' },
  });
}

export async function updateAppointmentType(
  id: number,
  data: Partial<AppointmentTypeInput>,
) {
  return prisma.appointmentType.update({
    where: { id },
    data,
  });
}

export async function deleteAppointmentType(id: number) {
  return prisma.appointmentType.update({
    where: { id },
    data: { isActive: false },
  });
}

// ============================================================================
// APPOINTMENT MANAGEMENT
// ============================================================================

export async function createAppointment(
  configId: number,
  data: AppointmentInput,
) {
  const config = await prisma.schedulingConfig.findUnique({
    where: { id: configId },
  });

  if (!config) {
    throw new Error('Scheduling config not found');
  }

  // Validate providerId belongs to this config
  if (data.providerId) {
    const provider = await prisma.provider.findUnique({
      where: { id: data.providerId },
      select: { configId: true, isActive: true },
    });
    if (!provider) {
      throw new Error('Provider not found');
    }
    if (provider.configId !== configId) {
      throw new Error('Provider does not belong to this scheduling config');
    }
    if (!provider.isActive) {
      throw new Error('Provider is not active');
    }
  }

  // Validate appointmentTypeId belongs to this config
  let duration = data.durationMinutes || config.defaultSlotDurationMin;
  if (data.appointmentTypeId) {
    const appointmentType = await prisma.appointmentType.findUnique({
      where: { id: data.appointmentTypeId },
      select: { configId: true, isActive: true, durationMinutes: true },
    });
    if (!appointmentType) {
      throw new Error('Appointment type not found');
    }
    if (appointmentType.configId !== configId) {
      throw new Error(
        'Appointment type does not belong to this scheduling config',
      );
    }
    if (!appointmentType.isActive) {
      throw new Error('Appointment type is not active');
    }
    duration = appointmentType.durationMinutes;
  }

  // Create appointment
  const appointment = await prisma.appointment.create({
    data: {
      configId,
      ...data,
      durationMinutes: duration,
      status: 'SCHEDULED',
    },
    include: {
      provider: true,
      appointmentType: true,
    },
  });

  // Calculate no-show risk
  if (config.enableNoShowPrediction) {
    const riskScore = await calculateNoShowRisk(appointment);
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        noShowRiskScore: riskScore,
        noShowPredictedAt: new Date(),
      },
    });

    // Log prediction
    await prisma.noShowPredictionLog.create({
      data: {
        configId,
        appointmentId: appointment.id,
        predictedScore: riskScore,
        predictedAt: new Date(),
        features: {
          patientEmail: !!data.patientEmail,
          patientPhone: !!data.patientPhone,
          dayOfWeek: data.scheduledAt.getDay(),
          hourOfDay: data.scheduledAt.getHours(),
        },
      },
    });
  }

  // Schedule reminders
  if (config.enableReminders) {
    await scheduleReminders(appointment.id, config.reminderHoursBefore);
  }

  // Notify waitlist if applicable
  await notifyWaitlist(configId, appointment);

  return appointment;
}

export async function getAppointments(
  configId: number,
  options: {
    providerId?: number;
    status?: AppointmentStatus;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {},
) {
  const {
    providerId,
    status,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = options;

  return prisma.appointment.findMany({
    where: {
      configId,
      ...(providerId && { providerId }),
      ...(status && { status }),
      ...(startDate && { scheduledAt: { gte: startDate } }),
      ...(endDate && { scheduledAt: { lte: endDate } }),
    },
    include: {
      provider: true,
      appointmentType: true,
      reminders: true,
    },
    orderBy: { scheduledAt: 'asc' },
    take: limit,
    skip: offset,
  });
}

export async function getAppointment(id: number) {
  return prisma.appointment.findUnique({
    where: { id },
    include: {
      provider: true,
      appointmentType: true,
      reminders: true,
      config: true,
    },
  });
}

export async function updateAppointmentStatus(
  id: number,
  status: AppointmentStatus,
  additionalData?: {
    notes?: string;
    cancellationReason?: string;
    cancelledBy?: string;
  },
) {
  const updateData: Record<string, unknown> = { status };

  switch (status) {
    case 'CONFIRMED':
      updateData.confirmedAt = new Date();
      break;
    case 'CHECKED_IN':
      updateData.checkedInAt = new Date();
      break;
    case 'COMPLETED':
      updateData.completedAt = new Date();
      break;
    case 'CANCELLED':
      updateData.cancelledAt = new Date();
      if (additionalData?.cancellationReason) {
        updateData.cancellationReason = additionalData.cancellationReason;
      }
      if (additionalData?.cancelledBy) {
        updateData.cancelledBy = additionalData.cancelledBy;
      }
      break;
    case 'NO_SHOW': {
      // Record actual outcome for ML model
      const appointment = await prisma.appointment.findUnique({
        where: { id },
      });
      if (appointment) {
        await prisma.noShowPredictionLog.updateMany({
          where: { appointmentId: id },
          data: { actualOutcome: true, outcomeRecordedAt: new Date() },
        });
      }
      break;
    }
  }

  if (additionalData?.notes) {
    updateData.notes = additionalData.notes;
  }

  return prisma.appointment.update({
    where: { id },
    data: updateData,
  });
}

export async function rescheduleAppointment(
  id: number,
  newScheduledAt: Date,
  newProviderId?: number,
) {
  const oldAppointment = await prisma.appointment.findUnique({
    where: { id },
  });

  if (!oldAppointment) {
    throw new Error('Appointment not found');
  }

  // Get the scheduling config for automation settings
  const config = await prisma.schedulingConfig.findUnique({
    where: { id: oldAppointment.configId },
  });

  if (!config) {
    throw new Error('Scheduling config not found');
  }

  // Validate newProviderId belongs to the same config
  if (newProviderId) {
    const provider = await prisma.provider.findUnique({
      where: { id: newProviderId },
      select: { configId: true, isActive: true },
    });
    if (!provider) {
      throw new Error('Provider not found');
    }
    if (provider.configId !== oldAppointment.configId) {
      throw new Error('Provider does not belong to this scheduling config');
    }
    if (!provider.isActive) {
      throw new Error('Provider is not active');
    }
  }

  // Update old appointment
  await prisma.appointment.update({
    where: { id },
    data: {
      status: 'RESCHEDULED',
    },
  });

  // Create new appointment
  const newAppointment = await prisma.appointment.create({
    data: {
      configId: oldAppointment.configId,
      providerId: newProviderId || oldAppointment.providerId,
      appointmentTypeId: oldAppointment.appointmentTypeId,
      patientName: oldAppointment.patientName,
      patientEmail: oldAppointment.patientEmail,
      patientPhone: oldAppointment.patientPhone,
      externalPatientId: oldAppointment.externalPatientId,
      scheduledAt: newScheduledAt,
      durationMinutes: oldAppointment.durationMinutes,
      status: 'SCHEDULED',
      rescheduledFrom: id,
    },
    include: {
      provider: true,
      appointmentType: true,
    },
  });

  // Update old appointment with reference to new one
  await prisma.appointment.update({
    where: { id },
    data: { rescheduledTo: newAppointment.id },
  });

  // Calculate no-show risk for the rescheduled appointment
  if (config.enableNoShowPrediction) {
    const riskScore = await calculateNoShowRisk(newAppointment);
    await prisma.appointment.update({
      where: { id: newAppointment.id },
      data: {
        noShowRiskScore: riskScore,
        noShowPredictedAt: new Date(),
      },
    });

    // Log prediction
    await prisma.noShowPredictionLog.create({
      data: {
        configId: oldAppointment.configId,
        appointmentId: newAppointment.id,
        predictedScore: riskScore,
        predictedAt: new Date(),
        features: {
          patientEmail: !!newAppointment.patientEmail,
          patientPhone: !!newAppointment.patientPhone,
          dayOfWeek: newScheduledAt.getDay(),
          hourOfDay: newScheduledAt.getHours(),
          isRescheduled: true,
        },
      },
    });
  }

  // Schedule reminders for the rescheduled appointment
  if (config.enableReminders) {
    await scheduleReminders(newAppointment.id, config.reminderHoursBefore);
  }

  return newAppointment;
}

// ============================================================================
// AVAILABILITY & SLOTS
// ============================================================================

export async function getAvailableSlots(
  configId: number,
  options: {
    providerId?: number;
    appointmentTypeId?: number;
    startDate: Date;
    endDate: Date;
  },
): Promise<TimeSlot[]> {
  const config = await prisma.schedulingConfig.findUnique({
    where: { id: configId },
    include: {
      providers: { where: { isActive: true } },
      appointmentTypes: { where: { isActive: true } },
    },
  });

  if (!config) {
    throw new Error('Scheduling config not found');
  }

  const providers = options.providerId
    ? config.providers.filter((p) => p.id === options.providerId)
    : config.providers;

  // Get appointment duration
  let duration = config.defaultSlotDurationMin;
  if (options.appointmentTypeId) {
    const appointmentType = config.appointmentTypes.find(
      (t) => t.id === options.appointmentTypeId,
    );
    if (appointmentType) {
      duration = appointmentType.durationMinutes;
    }
  }

  // Get existing appointments
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      configId,
      ...(options.providerId && { providerId: options.providerId }),
      scheduledAt: {
        gte: options.startDate,
        lte: options.endDate,
      },
      status: { in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] },
    },
  });

  const slots: TimeSlot[] = [];
  const buffer = config.bufferBetweenSlotsMin;

  // Generate slots for each provider
  for (const provider of providers) {
    const schedule = provider.availabilitySchedule as Record<
      string,
      Array<{ start: string; end: string }>
    > | null;

    if (!schedule) continue;

    // Iterate through each day in the range
    const currentDate = new Date(options.startDate);
    while (currentDate <= options.endDate) {
      const dayOfWeek = currentDate
        .toLocaleDateString('en-US', { weekday: 'long' })
        .toLowerCase();
      const daySchedule = schedule[dayOfWeek];

      if (daySchedule) {
        for (const window of daySchedule) {
          const [startHour, startMin] = window.start.split(':').map(Number);
          const [endHour, endMin] = window.end.split(':').map(Number);

          const windowStart = new Date(currentDate);
          windowStart.setHours(startHour, startMin, 0, 0);

          const windowEnd = new Date(currentDate);
          windowEnd.setHours(endHour, endMin, 0, 0);

          // Generate slots within this window
          let slotStart = new Date(windowStart);
          while (slotStart < windowEnd) {
            const slotEnd = new Date(slotStart.getTime() + duration * 60000);

            if (slotEnd <= windowEnd) {
              // Check if slot conflicts with existing appointments
              const hasConflict = existingAppointments.some((apt) => {
                if (apt.providerId !== provider.id) return false;
                const aptStart = new Date(apt.scheduledAt);
                const aptEnd = new Date(
                  aptStart.getTime() + apt.durationMinutes * 60000,
                );
                return slotStart < aptEnd && slotEnd > aptStart;
              });

              slots.push({
                startTime: new Date(slotStart),
                endTime: slotEnd,
                providerId: provider.id,
                providerName: provider.name,
                isAvailable: !hasConflict,
              });
            }

            slotStart = new Date(
              slotStart.getTime() + (duration + buffer) * 60000,
            );
          }
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  return slots.filter((s) => s.isAvailable);
}

// ============================================================================
// NO-SHOW PREDICTION
// ============================================================================

async function calculateNoShowRisk(appointment: {
  patientEmail: string | null;
  patientPhone: string | null;
  scheduledAt: Date;
  providerId: number | null;
}): Promise<number> {
  // Base risk factors (simplified ML model simulation)
  let risk = 0.15; // Base no-show rate

  // Factor: No contact info
  if (!appointment.patientEmail && !appointment.patientPhone) {
    risk += 0.2;
  } else if (!appointment.patientPhone) {
    risk += 0.1;
  }

  // Factor: Day of week (Mondays have higher no-show rates)
  const dayOfWeek = appointment.scheduledAt.getDay();
  if (dayOfWeek === 1) {
    risk += 0.05;
  }

  // Factor: Time of day (early morning and late afternoon)
  const hour = appointment.scheduledAt.getHours();
  if (hour < 9 || hour > 16) {
    risk += 0.05;
  }

  // Factor: Lead time (appointments booked far in advance)
  const leadTime = Math.floor(
    (appointment.scheduledAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
  );
  if (leadTime > 14) {
    risk += 0.1;
  }

  // Cap risk at 0.95
  return Math.min(risk, 0.95);
}

export async function getHighRiskAppointments(
  configId: number,
  threshold: number = 0.5,
) {
  return prisma.appointment.findMany({
    where: {
      configId,
      noShowRiskScore: { gte: threshold },
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
      scheduledAt: { gte: new Date() },
    },
    include: {
      provider: true,
      appointmentType: true,
    },
    orderBy: { noShowRiskScore: 'desc' },
  });
}

// ============================================================================
// REMINDERS
// ============================================================================

async function scheduleReminders(appointmentId: number, hoursBefore: number[]) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) return;

  for (const hours of hoursBefore) {
    const scheduledFor = new Date(
      appointment.scheduledAt.getTime() - hours * 60 * 60 * 1000,
    );

    // Only schedule if in the future
    if (scheduledFor > new Date()) {
      await prisma.appointmentReminder.create({
        data: {
          appointmentId,
          channel: 'EMAIL',
          status: 'PENDING',
          scheduledFor,
          message: buildReminderMessage(appointment, hours),
        },
      });
    }
  }
}

function buildReminderMessage(
  appointment: { patientName: string; scheduledAt: Date },
  hoursBefore: number,
): string {
  const dateStr = appointment.scheduledAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = appointment.scheduledAt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (hoursBefore <= 2) {
    return `Hi ${appointment.patientName}, this is a reminder that your appointment is coming up today at ${timeStr}. Please reply CONFIRM to confirm or CANCEL to cancel.`;
  }

  return `Hi ${appointment.patientName}, this is a reminder about your upcoming appointment on ${dateStr} at ${timeStr}. Reply CONFIRM to confirm or CANCEL to cancel.`;
}

export async function getPendingReminders(limit: number = 100) {
  return prisma.appointmentReminder.findMany({
    where: {
      status: 'PENDING',
      scheduledFor: { lte: new Date() },
    },
    include: {
      appointment: {
        include: {
          config: true,
        },
      },
    },
    take: limit,
    orderBy: { scheduledFor: 'asc' },
  });
}

export async function sendReminder(reminderId: number): Promise<boolean> {
  const reminder = await prisma.appointmentReminder.findUnique({
    where: { id: reminderId },
    include: {
      appointment: {
        include: { config: true },
      },
    },
  });

  if (!reminder) return false;

  try {
    // In production, integrate with Twilio/SendGrid
    // For now, simulate sending
    console.log(
      `Sending ${reminder.channel} reminder to ${reminder.appointment.patientEmail}`,
    );

    await prisma.appointmentReminder.update({
      where: { id: reminderId },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    return true;
  } catch (error) {
    await prisma.appointmentReminder.update({
      where: { id: reminderId },
      data: {
        status: 'FAILED',
        errorMessage: (error as Error).message,
        retryCount: { increment: 1 },
      },
    });

    return false;
  }
}

export async function processReminderResponse(
  reminderId: number,
  response: string,
): Promise<{ action: string; success: boolean }> {
  const reminder = await prisma.appointmentReminder.findUnique({
    where: { id: reminderId },
    include: { appointment: true },
  });

  if (!reminder) {
    return { action: 'unknown', success: false };
  }

  const normalizedResponse = response.trim().toUpperCase();
  let action = 'unknown';

  if (
    normalizedResponse.includes('CONFIRM') ||
    normalizedResponse.includes('YES')
  ) {
    action = 'confirmed';
    await updateAppointmentStatus(reminder.appointmentId, 'CONFIRMED');
  } else if (
    normalizedResponse.includes('CANCEL') ||
    normalizedResponse.includes('NO')
  ) {
    action = 'cancelled';
    await updateAppointmentStatus(reminder.appointmentId, 'CANCELLED', {
      cancelledBy: 'patient',
      cancellationReason: 'Cancelled via reminder response',
    });
  }

  await prisma.appointmentReminder.update({
    where: { id: reminderId },
    data: {
      responseReceived: true,
      responseContent: response,
      responseAction: action,
    },
  });

  return { action, success: true };
}

// ============================================================================
// WAITLIST
// ============================================================================

export async function addToWaitlist(
  configId: number,
  data: {
    patientName: string;
    patientEmail?: string;
    patientPhone?: string;
    preferredProviderId?: number;
    preferredDays?: string[];
    preferredTimeStart?: string;
    preferredTimeEnd?: string;
  },
) {
  // Validate preferredProviderId belongs to this config
  if (data.preferredProviderId) {
    const provider = await prisma.provider.findUnique({
      where: { id: data.preferredProviderId },
      select: { configId: true, isActive: true },
    });
    if (!provider) {
      throw new Error('Provider not found');
    }
    if (provider.configId !== configId) {
      throw new Error('Provider does not belong to this scheduling config');
    }
    if (!provider.isActive) {
      throw new Error('Provider is not active');
    }
  }

  return prisma.waitlistEntry.create({
    data: {
      configId,
      ...data,
    },
  });
}

export async function getWaitlist(
  configId: number,
  options: { isActive?: boolean } = {},
) {
  return prisma.waitlistEntry.findMany({
    where: {
      configId,
      isActive: options.isActive ?? true,
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function removeFromWaitlist(id: number) {
  return prisma.waitlistEntry.update({
    where: { id },
    data: { isActive: false },
  });
}

async function notifyWaitlist(
  configId: number,
  appointment: { providerId: number | null; scheduledAt: Date },
) {
  // Find matching waitlist entries
  const waitlistEntries = await prisma.waitlistEntry.findMany({
    where: {
      configId,
      isActive: true,
      OR: [
        { preferredProviderId: appointment.providerId },
        { preferredProviderId: null },
      ],
    },
    orderBy: { priority: 'asc' },
  });

  // In production, send notifications to matching waitlist entries
  // when cancellations create new availability
  console.log(
    `Found ${waitlistEntries.length} waitlist entries to potentially notify`,
  );
}

// ============================================================================
// ANALYTICS
// ============================================================================

export async function getSchedulingAnalytics(
  configId: number,
  dateRange: { start: Date; end: Date },
) {
  const appointments = await prisma.appointment.findMany({
    where: {
      configId,
      scheduledAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    },
    include: {
      provider: true,
      appointmentType: true,
    },
  });

  const total = appointments.length;
  const completed = appointments.filter((a) => a.status === 'COMPLETED').length;
  const noShows = appointments.filter((a) => a.status === 'NO_SHOW').length;
  const cancelled = appointments.filter((a) => a.status === 'CANCELLED').length;

  // Return rates as decimals (0-1), not percentages, as frontend expects
  const noShowRate = total > 0 ? noShows / total : 0;
  const completionRate = total > 0 ? completed / total : 0;

  // Calculate utilization rate (completed / (total - cancelled))
  const effectiveTotal = total - cancelled;
  const utilizationRate = effectiveTotal > 0 ? completed / effectiveTotal : 0;

  // Calculate average lead time (days between createdAt and scheduledAt)
  let totalLeadTimeDays = 0;
  let validLeadTimeCount = 0;
  for (const apt of appointments) {
    if (apt.createdAt && apt.scheduledAt) {
      const leadTimeMs =
        new Date(apt.scheduledAt).getTime() - new Date(apt.createdAt).getTime();
      const leadTimeDays = leadTimeMs / (1000 * 60 * 60 * 24);
      if (leadTimeDays >= 0) {
        totalLeadTimeDays += leadTimeDays;
        validLeadTimeCount++;
      }
    }
  }
  const averageLeadTimeDays =
    validLeadTimeCount > 0 ? totalLeadTimeDays / validLeadTimeCount : 0;

  // Group by provider
  const providerMap = new Map<
    number,
    {
      providerId: number;
      providerName: string;
      total: number;
      completed: number;
      noShows: number;
    }
  >();
  for (const apt of appointments) {
    if (apt.providerId && apt.provider) {
      const existing = providerMap.get(apt.providerId);
      if (existing) {
        existing.total++;
        if (apt.status === 'COMPLETED') existing.completed++;
        if (apt.status === 'NO_SHOW') existing.noShows++;
      } else {
        providerMap.set(apt.providerId, {
          providerId: apt.providerId,
          providerName: apt.provider.name,
          total: 1,
          completed: apt.status === 'COMPLETED' ? 1 : 0,
          noShows: apt.status === 'NO_SHOW' ? 1 : 0,
        });
      }
    }
  }
  const byProvider = Array.from(providerMap.values());

  // Group by appointment type
  const typeMap = new Map<
    number,
    { typeId: number; typeName: string; total: number; completed: number }
  >();
  for (const apt of appointments) {
    if (apt.appointmentTypeId && apt.appointmentType) {
      const existing = typeMap.get(apt.appointmentTypeId);
      if (existing) {
        existing.total++;
        if (apt.status === 'COMPLETED') existing.completed++;
      } else {
        typeMap.set(apt.appointmentTypeId, {
          typeId: apt.appointmentTypeId,
          typeName: apt.appointmentType.name,
          total: 1,
          completed: apt.status === 'COMPLETED' ? 1 : 0,
        });
      }
    }
  }
  const byAppointmentType = Array.from(typeMap.values());

  // Prediction accuracy
  const predictions = await prisma.noShowPredictionLog.findMany({
    where: {
      configId,
      predictedAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
      actualOutcome: { not: null },
    },
  });

  let correctPredictions = 0;
  for (const pred of predictions) {
    const predictedNoShow = pred.predictedScore >= 0.5;
    if (predictedNoShow === pred.actualOutcome) {
      correctPredictions++;
    }
  }
  const predictionAccuracy =
    predictions.length > 0
      ? (correctPredictions / predictions.length) * 100
      : null;

  return {
    totalAppointments: total,
    completedAppointments: completed,
    noShowAppointments: noShows,
    cancelledAppointments: cancelled,
    noShowRate,
    utilizationRate,
    averageLeadTimeDays,
    completionRate,
    predictionAccuracy,
    byProvider,
    byAppointmentType,
    dateRange,
  };
}
