/**
 * Booking Rules Service
 *
 * Manages booking modification rules and policies:
 * - Reschedule/cancel policies
 * - Booking limits per customer
 * - Blackout dates
 * - Buffer time requirements
 * - Deposit/refund policies
 */

import { prisma } from '../../prisma/client';
import { Prisma } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface BookingModificationRules {
  // Reschedule policies
  allowReschedule: boolean;
  rescheduleMinHoursNotice: number; // Minimum hours before appointment to reschedule
  rescheduleMaxTimes: number; // Maximum number of reschedules allowed
  rescheduleFee?: number; // Optional fee for rescheduling
  rescheduleFeeCurrency?: string;

  // Cancel policies
  allowCancel: boolean;
  cancelMinHoursNotice: number; // Minimum hours before appointment to cancel
  cancelFee?: number; // Optional cancellation fee
  cancelFeeCurrency?: string;
  fullRefundHoursNotice?: number; // Hours notice for full refund (else partial)
  partialRefundPercent?: number; // Percentage refund if less than full notice

  // No-show policies
  noShowFee?: number;
  noShowFeeCurrency?: string;
  noShowCountMax?: number; // Maximum no-shows before blacklisting
}

export interface BookingLimits {
  maxActiveBookingsPerCustomer: number;
  maxBookingsPerDay: number; // For the practice
  maxBookingsPerProviderPerDay: number;
  minIntervalBetweenBookingsHours: number; // Same customer
}

export interface BlackoutDate {
  id: number;
  date: Date;
  reason?: string;
  affectedProviderIds?: number[]; // null = all providers
  createdAt: Date;
}

export interface BufferTimeSettings {
  // Buffer between appointments
  bufferBetweenAppointmentsMin: number;

  // Buffer for different appointment types
  bufferByAppointmentType?: Record<number, { before: number; after: number }>;

  // Lunch/break times
  breakTimes?: Array<{
    startTime: string; // HH:MM
    endTime: string;
    daysOfWeek: number[]; // 0-6
  }>;
}

export interface ModificationEligibility {
  canReschedule: boolean;
  canCancel: boolean;
  rescheduleReason?: string;
  cancelReason?: string;
  rescheduleCount: number;
  rescheduleMaxReached: boolean;
  rescheduleDeadline?: Date;
  cancelDeadline?: Date;
  rescheduleFee?: number;
  cancelFeeDue?: number;
  refundAmount?: number;
  refundPercent?: number;
}

// ============================================================================
// BOOKING MODIFICATION RULES
// ============================================================================

/**
 * Default modification rules
 */
export const DEFAULT_MODIFICATION_RULES: BookingModificationRules = {
  allowReschedule: true,
  rescheduleMinHoursNotice: 24,
  rescheduleMaxTimes: 2,

  allowCancel: true,
  cancelMinHoursNotice: 24,
  fullRefundHoursNotice: 48,
  partialRefundPercent: 50,

  noShowCountMax: 3,
};

/**
 * Get modification rules for a scheduling config
 */
export async function getModificationRules(
  configId: number,
): Promise<BookingModificationRules> {
  const config = await prisma.schedulingConfig.findUnique({
    where: { id: configId },
  });

  if (!config) {
    throw new Error('Scheduling config not found');
  }

  // Check for custom rules in config (stored in JSON field)
  const templateSettings = config.templateSettings as {
    modificationRules?: Partial<BookingModificationRules>;
  } | null;

  if (templateSettings?.modificationRules) {
    return {
      ...DEFAULT_MODIFICATION_RULES,
      ...templateSettings.modificationRules,
    };
  }

  return DEFAULT_MODIFICATION_RULES;
}

/**
 * Update modification rules for a scheduling config
 */
export async function updateModificationRules(
  configId: number,
  rules: Partial<BookingModificationRules>,
) {
  const config = await prisma.schedulingConfig.findUnique({
    where: { id: configId },
  });

  if (!config) {
    throw new Error('Scheduling config not found');
  }

  const currentSettings = (config.templateSettings || {}) as Record<
    string,
    unknown
  >;

  return prisma.schedulingConfig.update({
    where: { id: configId },
    data: {
      templateSettings: {
        ...currentSettings,
        modificationRules: {
          ...(currentSettings.modificationRules || {}),
          ...rules,
        },
      } as Prisma.InputJsonValue,
    },
  });
}

/**
 * Check if a booking can be modified and get eligibility details
 */
export async function checkModificationEligibility(
  appointmentId: number,
): Promise<ModificationEligibility> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      config: true,
      appointmentType: true,
      paymentTransactions: true,
    },
  });

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  const rules = await getModificationRules(appointment.configId);
  const now = new Date();
  const scheduledAt = new Date(appointment.scheduledAt);
  const hoursUntilAppointment =
    (scheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Check reschedule count
  const rescheduleCount = await prisma.appointment.count({
    where: {
      OR: [
        { rescheduledFrom: appointmentId },
        { rescheduledTo: appointmentId },
      ],
    },
  });

  // Calculate deadlines
  const rescheduleDeadline = new Date(
    scheduledAt.getTime() - rules.rescheduleMinHoursNotice * 60 * 60 * 1000,
  );
  const cancelDeadline = new Date(
    scheduledAt.getTime() - rules.cancelMinHoursNotice * 60 * 60 * 1000,
  );
  const fullRefundDeadline = rules.fullRefundHoursNotice
    ? new Date(
        scheduledAt.getTime() - rules.fullRefundHoursNotice * 60 * 60 * 1000,
      )
    : null;

  // Calculate refund amount
  let refundPercent = 100;
  if (fullRefundDeadline && now > fullRefundDeadline) {
    refundPercent = rules.partialRefundPercent || 0;
  }

  const paidAmount =
    appointment.paymentTransactions
      ?.filter((t) => t.status === 'COMPLETED' && t.type === 'CHARGE')
      ?.reduce((sum, t) => sum + (t.amount?.toNumber() || 0), 0) || 0;

  const refundAmount = (paidAmount * refundPercent) / 100;

  // Build eligibility result
  const result: ModificationEligibility = {
    canReschedule: false,
    canCancel: false,
    rescheduleCount,
    rescheduleMaxReached: rescheduleCount >= rules.rescheduleMaxTimes,
    rescheduleDeadline,
    cancelDeadline,
    refundAmount,
    refundPercent,
  };

  // Check reschedule eligibility
  if (!rules.allowReschedule) {
    result.rescheduleReason = 'Rescheduling is not allowed for this booking';
  } else if (appointment.status !== 'SCHEDULED') {
    result.rescheduleReason = `Cannot reschedule ${appointment.status.toLowerCase()} appointment`;
  } else if (rescheduleCount >= rules.rescheduleMaxTimes) {
    result.rescheduleReason = `Maximum reschedule limit (${rules.rescheduleMaxTimes}) reached`;
  } else if (hoursUntilAppointment < rules.rescheduleMinHoursNotice) {
    result.rescheduleReason = `Rescheduling requires at least ${rules.rescheduleMinHoursNotice} hours notice`;
  } else {
    result.canReschedule = true;
    if (rules.rescheduleFee) {
      result.rescheduleFee = rules.rescheduleFee;
    }
  }

  // Check cancel eligibility
  if (!rules.allowCancel) {
    result.cancelReason = 'Cancellation is not allowed for this booking';
  } else if (
    appointment.status !== 'SCHEDULED' &&
    appointment.status !== 'CONFIRMED'
  ) {
    result.cancelReason = `Cannot cancel ${appointment.status.toLowerCase()} appointment`;
  } else if (hoursUntilAppointment < rules.cancelMinHoursNotice) {
    result.cancelReason = `Cancellation requires at least ${rules.cancelMinHoursNotice} hours notice`;
  } else {
    result.canCancel = true;
    if (rules.cancelFee) {
      result.cancelFeeDue = rules.cancelFee;
    }
  }

  return result;
}

// ============================================================================
// BOOKING LIMITS
// ============================================================================

/**
 * Default booking limits
 */
export const DEFAULT_BOOKING_LIMITS: BookingLimits = {
  maxActiveBookingsPerCustomer: 3,
  maxBookingsPerDay: 50,
  maxBookingsPerProviderPerDay: 20,
  minIntervalBetweenBookingsHours: 0,
};

/**
 * Get booking limits for a scheduling config
 */
export async function getBookingLimits(
  configId: number,
): Promise<BookingLimits> {
  const config = await prisma.schedulingConfig.findUnique({
    where: { id: configId },
  });

  if (!config) {
    throw new Error('Scheduling config not found');
  }

  const templateSettings = config.templateSettings as {
    bookingLimits?: Partial<BookingLimits>;
  } | null;

  if (templateSettings?.bookingLimits) {
    return {
      ...DEFAULT_BOOKING_LIMITS,
      ...templateSettings.bookingLimits,
    };
  }

  return DEFAULT_BOOKING_LIMITS;
}

/**
 * Update booking limits
 */
export async function updateBookingLimits(
  configId: number,
  limits: Partial<BookingLimits>,
) {
  const config = await prisma.schedulingConfig.findUnique({
    where: { id: configId },
  });

  if (!config) {
    throw new Error('Scheduling config not found');
  }

  const currentSettings = (config.templateSettings || {}) as Record<
    string,
    unknown
  >;

  return prisma.schedulingConfig.update({
    where: { id: configId },
    data: {
      templateSettings: {
        ...currentSettings,
        bookingLimits: {
          ...(currentSettings.bookingLimits || {}),
          ...limits,
        },
      } as Prisma.InputJsonValue,
    },
  });
}

/**
 * Check if customer can make a new booking
 */
export async function checkCustomerBookingEligibility(
  configId: number,
  customerEmail: string,
  customerPhone?: string,
): Promise<{ eligible: boolean; reason?: string; activeBookings: number }> {
  const limits = await getBookingLimits(configId);

  // Count active bookings for this customer
  const activeBookings = await prisma.appointment.count({
    where: {
      configId,
      OR: [
        { patientEmail: customerEmail },
        ...(customerPhone ? [{ patientPhone: customerPhone }] : []),
      ],
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
      scheduledAt: { gte: new Date() },
    },
  });

  if (activeBookings >= limits.maxActiveBookingsPerCustomer) {
    return {
      eligible: false,
      reason: `Maximum active bookings (${limits.maxActiveBookingsPerCustomer}) reached`,
      activeBookings,
    };
  }

  return { eligible: true, activeBookings };
}

/**
 * Check if a date/provider has booking capacity
 */
export async function checkBookingCapacity(
  configId: number,
  date: Date,
  providerId?: number,
): Promise<{
  hasCapacity: boolean;
  currentBookings: number;
  maxBookings: number;
}> {
  const limits = await getBookingLimits(configId);

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const where: Prisma.AppointmentWhereInput = {
    configId,
    scheduledAt: { gte: startOfDay, lte: endOfDay },
    status: { in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] },
  };

  if (providerId) {
    where.providerId = providerId;
  }

  const currentBookings = await prisma.appointment.count({ where });
  const maxBookings = providerId
    ? limits.maxBookingsPerProviderPerDay
    : limits.maxBookingsPerDay;

  return {
    hasCapacity: currentBookings < maxBookings,
    currentBookings,
    maxBookings,
  };
}

// ============================================================================
// BLACKOUT DATES
// ============================================================================

/**
 * Add a blackout date
 */
export async function addBlackoutDate(
  configId: number,
  data: {
    date: Date;
    reason?: string;
    providerIds?: number[];
  },
) {
  const config = await prisma.schedulingConfig.findUnique({
    where: { id: configId },
  });

  if (!config) {
    throw new Error('Scheduling config not found');
  }

  const currentSettings = (config.templateSettings || {}) as {
    blackoutDates?: Array<{
      id: number;
      date: string;
      reason?: string;
      providerIds?: number[];
    }>;
  };
  const blackoutDates = currentSettings.blackoutDates || [];

  const newBlackout = {
    id: Date.now(),
    date: data.date.toISOString(),
    reason: data.reason,
    providerIds: data.providerIds,
  };

  await prisma.schedulingConfig.update({
    where: { id: configId },
    data: {
      templateSettings: {
        ...currentSettings,
        blackoutDates: [...blackoutDates, newBlackout],
      } as Prisma.InputJsonValue,
    },
  });

  return newBlackout;
}

/**
 * Remove a blackout date
 */
export async function removeBlackoutDate(configId: number, blackoutId: number) {
  const config = await prisma.schedulingConfig.findUnique({
    where: { id: configId },
  });

  if (!config) {
    throw new Error('Scheduling config not found');
  }

  const currentSettings = (config.templateSettings || {}) as {
    blackoutDates?: Array<{ id: number }>;
  };
  const blackoutDates = currentSettings.blackoutDates || [];

  return prisma.schedulingConfig.update({
    where: { id: configId },
    data: {
      templateSettings: {
        ...currentSettings,
        blackoutDates: blackoutDates.filter((b) => b.id !== blackoutId),
      } as Prisma.InputJsonValue,
    },
  });
}

/**
 * Get blackout dates for a config
 */
export async function getBlackoutDates(
  configId: number,
  options?: { startDate?: Date; endDate?: Date; providerId?: number },
) {
  const config = await prisma.schedulingConfig.findUnique({
    where: { id: configId },
  });

  if (!config) {
    throw new Error('Scheduling config not found');
  }

  const currentSettings = (config.templateSettings || {}) as {
    blackoutDates?: Array<{
      id: number;
      date: string;
      reason?: string;
      providerIds?: number[];
    }>;
  };
  let blackoutDates = currentSettings.blackoutDates || [];

  // Filter by date range
  if (options?.startDate || options?.endDate) {
    blackoutDates = blackoutDates.filter((b) => {
      const date = new Date(b.date);
      if (options.startDate && date < options.startDate) return false;
      if (options.endDate && date > options.endDate) return false;
      return true;
    });
  }

  // Filter by provider
  if (options?.providerId) {
    blackoutDates = blackoutDates.filter((b) => {
      if (!b.providerIds) return true; // Affects all providers
      return b.providerIds.includes(options.providerId!);
    });
  }

  return blackoutDates;
}

/**
 * Check if a date is blacked out
 */
export async function isDateBlackedOut(
  configId: number,
  date: Date,
  providerId?: number,
): Promise<boolean> {
  const blackoutDates = await getBlackoutDates(configId, { providerId });

  const dateStr = date.toISOString().split('T')[0];

  return blackoutDates.some((b) => {
    const blackoutDateStr = new Date(b.date).toISOString().split('T')[0];
    return blackoutDateStr === dateStr;
  });
}

// ============================================================================
// BUFFER TIME SETTINGS
// ============================================================================

/**
 * Get buffer time settings
 */
export async function getBufferTimeSettings(
  configId: number,
): Promise<BufferTimeSettings> {
  const config = await prisma.schedulingConfig.findUnique({
    where: { id: configId },
  });

  if (!config) {
    throw new Error('Scheduling config not found');
  }

  const templateSettings = config.templateSettings as {
    bufferTimeSettings?: BufferTimeSettings;
  } | null;

  if (templateSettings?.bufferTimeSettings) {
    return templateSettings.bufferTimeSettings;
  }

  return {
    bufferBetweenAppointmentsMin: config.bufferBetweenSlotsMin,
  };
}

/**
 * Update buffer time settings
 */
export async function updateBufferTimeSettings(
  configId: number,
  settings: Partial<BufferTimeSettings>,
) {
  const config = await prisma.schedulingConfig.findUnique({
    where: { id: configId },
  });

  if (!config) {
    throw new Error('Scheduling config not found');
  }

  const currentSettings = (config.templateSettings || {}) as Record<
    string,
    unknown
  >;

  return prisma.schedulingConfig.update({
    where: { id: configId },
    data: {
      templateSettings: {
        ...currentSettings,
        bufferTimeSettings: {
          ...(currentSettings.bufferTimeSettings || {}),
          ...settings,
        },
      } as Prisma.InputJsonValue,
    },
  });
}

/**
 * Get buffer time for a specific appointment type
 */
export function getAppointmentTypeBuffer(
  settings: BufferTimeSettings,
  appointmentTypeId: number,
): { before: number; after: number } {
  const typeBuffer = settings.bufferByAppointmentType?.[appointmentTypeId];

  if (typeBuffer) {
    return typeBuffer;
  }

  return {
    before: settings.bufferBetweenAppointmentsMin / 2,
    after: settings.bufferBetweenAppointmentsMin / 2,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get all booking rules for a config (combined)
 */
export async function getAllBookingRules(configId: number) {
  const [modificationRules, bookingLimits, bufferSettings, blackoutDates] =
    await Promise.all([
      getModificationRules(configId),
      getBookingLimits(configId),
      getBufferTimeSettings(configId),
      getBlackoutDates(configId),
    ]);

  return {
    modificationRules,
    bookingLimits,
    bufferSettings,
    blackoutDates,
  };
}

/**
 * Update all booking rules for a config
 */
export async function updateAllBookingRules(
  configId: number,
  data: {
    modificationRules?: Partial<BookingModificationRules>;
    bookingLimits?: Partial<BookingLimits>;
    bufferSettings?: Partial<BufferTimeSettings>;
  },
) {
  const updates: Promise<unknown>[] = [];

  if (data.modificationRules) {
    updates.push(updateModificationRules(configId, data.modificationRules));
  }

  if (data.bookingLimits) {
    updates.push(updateBookingLimits(configId, data.bookingLimits));
  }

  if (data.bufferSettings) {
    updates.push(updateBufferTimeSettings(configId, data.bufferSettings));
  }

  await Promise.all(updates);

  return getAllBookingRules(configId);
}
