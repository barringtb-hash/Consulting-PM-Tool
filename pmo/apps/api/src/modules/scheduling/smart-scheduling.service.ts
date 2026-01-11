/**
 * Smart Scheduling Service
 *
 * AI-powered scheduling optimization including:
 * - Optimal slot recommendations based on historical patterns
 * - Intelligent overbooking based on no-show predictions
 * - Provider workload balancing
 * - Patient preference matching
 * - Time-of-day optimization
 */

import { prisma } from '../../prisma/client';
import * as noshowService from './noshow-prediction.service';

// ============================================================================
// TYPES
// ============================================================================

export interface SlotScore {
  slot: Date;
  providerId: number;
  score: number;
  factors: {
    noShowRisk: number;
    providerUtilization: number;
    patientPreference: number;
    historicalConversion: number;
    timeOptimality: number;
    bufferOptimality: number;
  };
  overbookingAllowed: boolean;
  overbookingReason?: string;
}

export interface SchedulingPreferences {
  preferredTimeOfDay?: 'morning' | 'afternoon' | 'evening';
  preferredDaysOfWeek?: number[];
  preferredProviderId?: number;
  avoidConsecutiveSlots?: boolean;
  minimizeWaitTime?: boolean;
}

export interface OptimalSlotRequest {
  configId: number;
  startDate: Date;
  endDate: Date;
  appointmentTypeId?: number;
  providerId?: number;
  patientEmail?: string;
  preferences?: SchedulingPreferences;
  limit?: number;
}

export interface OverbookingConfig {
  enabled: boolean;
  maxOverbookingsPerSlot: number;
  minNoShowProbability: number;
  maxDailyOverbookings: number;
  appointmentTypesAllowed: number[];
  providersAllowed: number[];
}

export interface ProviderWorkload {
  providerId: number;
  providerName: string;
  date: Date;
  scheduledAppointments: number;
  totalMinutes: number;
  utilizationPercent: number;
  breaks: { start: string; end: string }[];
  overbookings: number;
  highRiskAppointments: number;
}

export interface SchedulingInsights {
  optimalBookingTimes: {
    hour: number;
    dayOfWeek: number;
    conversionRate: number;
  }[];
  highDemandPeriods: { start: Date; end: Date; demandScore: number }[];
  lowUtilizationPeriods: {
    start: Date;
    end: Date;
    utilizationPercent: number;
  }[];
  recommendedOverbookingSlots: {
    slot: Date;
    providerId: number;
    reason: string;
  }[];
  patientPreferencePatterns: { preference: string; percentage: number }[];
}

// ============================================================================
// HISTORICAL DATA ANALYSIS
// ============================================================================

interface HistoricalSlotData {
  hour: number;
  dayOfWeek: number;
  bookingCount: number;
  noShowCount: number;
  cancelCount: number;
  completedCount: number;
  avgLeadTimeDays: number;
}

async function getHistoricalSlotData(
  configId: number,
  lookbackDays: number = 90,
): Promise<HistoricalSlotData[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - lookbackDays);

  const appointments = await prisma.appointment.findMany({
    where: {
      bookingPage: {
        configId,
      },
      scheduledAt: {
        gte: startDate,
      },
    },
    select: {
      scheduledAt: true,
      status: true,
      createdAt: true,
    },
  });

  // Aggregate by hour and day of week
  const slotMap = new Map<string, HistoricalSlotData>();

  for (const apt of appointments) {
    const hour = apt.scheduledAt.getHours();
    const dayOfWeek = apt.scheduledAt.getDay();
    const key = `${hour}-${dayOfWeek}`;

    if (!slotMap.has(key)) {
      slotMap.set(key, {
        hour,
        dayOfWeek,
        bookingCount: 0,
        noShowCount: 0,
        cancelCount: 0,
        completedCount: 0,
        avgLeadTimeDays: 0,
      });
    }

    const data = slotMap.get(key)!;
    data.bookingCount++;

    const leadTimeDays = Math.floor(
      (apt.scheduledAt.getTime() - apt.createdAt.getTime()) /
        (1000 * 60 * 60 * 24),
    );
    data.avgLeadTimeDays =
      (data.avgLeadTimeDays * (data.bookingCount - 1) + leadTimeDays) /
      data.bookingCount;

    switch (apt.status) {
      case 'NO_SHOW':
        data.noShowCount++;
        break;
      case 'CANCELLED':
        data.cancelCount++;
        break;
      case 'COMPLETED':
        data.completedCount++;
        break;
    }
  }

  return Array.from(slotMap.values());
}

function calculateHistoricalConversionScore(
  historicalData: HistoricalSlotData[],
  hour: number,
  dayOfWeek: number,
): number {
  const data = historicalData.find(
    (d) => d.hour === hour && d.dayOfWeek === dayOfWeek,
  );

  if (!data || data.bookingCount < 5) {
    // Not enough data, return neutral score
    return 0.5;
  }

  const completionRate = data.completedCount / data.bookingCount;
  const noShowRate = data.noShowCount / data.bookingCount;

  // Score based on completion rate and inverse of no-show rate
  return Math.min(
    1,
    Math.max(0, completionRate * 0.7 + (1 - noShowRate) * 0.3),
  );
}

// ============================================================================
// PATIENT PREFERENCE ANALYSIS
// ============================================================================

interface PatientBookingHistory {
  preferredHours: number[];
  preferredDays: number[];
  preferredProviders: number[];
  avgLeadTimeDays: number;
  noShowRate: number;
  rescheduleRate: number;
}

async function getPatientBookingHistory(
  configId: number,
  patientEmail: string,
): Promise<PatientBookingHistory | null> {
  const appointments = await prisma.appointment.findMany({
    where: {
      patientEmail,
      bookingPage: {
        configId,
      },
    },
    select: {
      scheduledAt: true,
      status: true,
      providerId: true,
      createdAt: true,
      rescheduledFrom: true,
    },
    orderBy: {
      scheduledAt: 'desc',
    },
    take: 20,
  });

  if (appointments.length === 0) {
    return null;
  }

  const hours = appointments.map((a) => a.scheduledAt.getHours());
  const days = appointments.map((a) => a.scheduledAt.getDay());
  const providers = appointments
    .filter((a) => a.providerId)
    .map((a) => a.providerId!);

  // Find most common values
  const hourCounts = hours.reduce(
    (acc, h) => {
      acc[h] = (acc[h] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>,
  );
  const dayCounts = days.reduce(
    (acc, d) => {
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>,
  );
  const providerCounts = providers.reduce(
    (acc, p) => {
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>,
  );

  const preferredHours = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([h]) => parseInt(h));

  const preferredDays = Object.entries(dayCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([d]) => parseInt(d));

  const preferredProviders = Object.entries(providerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([p]) => parseInt(p));

  const noShowCount = appointments.filter((a) => a.status === 'NO_SHOW').length;
  const rescheduleCount = appointments.filter(
    (a) => a.rescheduledFrom !== null,
  ).length;

  const avgLeadTime =
    appointments.reduce((sum, a) => {
      return (
        sum +
        (a.scheduledAt.getTime() - a.createdAt.getTime()) /
          (1000 * 60 * 60 * 24)
      );
    }, 0) / appointments.length;

  return {
    preferredHours,
    preferredDays,
    preferredProviders,
    avgLeadTimeDays: avgLeadTime,
    noShowRate: noShowCount / appointments.length,
    rescheduleRate: rescheduleCount / appointments.length,
  };
}

function calculatePatientPreferenceScore(
  history: PatientBookingHistory | null,
  preferences: SchedulingPreferences | undefined,
  slot: Date,
  providerId: number,
): number {
  if (!history && !preferences) {
    return 0.5; // Neutral score for new patients
  }

  let score = 0.5;
  const hour = slot.getHours();
  const dayOfWeek = slot.getDay();

  // Check explicit preferences
  if (preferences) {
    if (preferences.preferredTimeOfDay) {
      const isMorning = hour >= 6 && hour < 12;
      const isAfternoon = hour >= 12 && hour < 17;
      const isEvening = hour >= 17 && hour < 21;

      if (
        (preferences.preferredTimeOfDay === 'morning' && isMorning) ||
        (preferences.preferredTimeOfDay === 'afternoon' && isAfternoon) ||
        (preferences.preferredTimeOfDay === 'evening' && isEvening)
      ) {
        score += 0.2;
      }
    }

    if (
      preferences.preferredDaysOfWeek &&
      preferences.preferredDaysOfWeek.includes(dayOfWeek)
    ) {
      score += 0.15;
    }

    if (preferences.preferredProviderId === providerId) {
      score += 0.15;
    }
  }

  // Check historical preferences
  if (history) {
    if (history.preferredHours.includes(hour)) {
      score += 0.1;
    }
    if (history.preferredDays.includes(dayOfWeek)) {
      score += 0.1;
    }
    if (history.preferredProviders.includes(providerId)) {
      score += 0.1;
    }
  }

  return Math.min(1, score);
}

// ============================================================================
// PROVIDER WORKLOAD ANALYSIS
// ============================================================================

export async function getProviderWorkload(
  configId: number,
  date: Date,
  providerId?: number,
): Promise<ProviderWorkload[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const whereClause: Record<string, unknown> = {
    bookingPage: {
      configId,
    },
    scheduledAt: {
      gte: startOfDay,
      lte: endOfDay,
    },
    status: {
      in: ['SCHEDULED', 'CONFIRMED'],
    },
  };

  if (providerId) {
    whereClause.providerId = providerId;
  }

  const appointments = await prisma.appointment.findMany({
    where: whereClause,
    include: {
      provider: true,
    },
  });

  // Get high-risk appointments using no-show prediction
  const highRiskIds = new Set<number>();
  for (const apt of appointments) {
    try {
      const prediction = await noshowService.predictNoShow(apt.id);
      if (prediction.score > 0.5) {
        highRiskIds.add(apt.id);
      }
    } catch {
      // Ignore prediction errors
    }
  }

  // Group by provider
  const workloadMap = new Map<number, ProviderWorkload>();

  for (const apt of appointments) {
    if (!apt.providerId) continue;

    if (!workloadMap.has(apt.providerId)) {
      workloadMap.set(apt.providerId, {
        providerId: apt.providerId,
        providerName: apt.provider?.name || 'Unknown',
        date,
        scheduledAppointments: 0,
        totalMinutes: 0,
        utilizationPercent: 0,
        breaks: [],
        overbookings: 0,
        highRiskAppointments: 0,
      });
    }

    const workload = workloadMap.get(apt.providerId)!;
    workload.scheduledAppointments++;
    workload.totalMinutes += apt.durationMinutes || 30;

    if (highRiskIds.has(apt.id)) {
      workload.highRiskAppointments++;
    }
  }

  // Calculate utilization (assuming 8-hour workday = 480 minutes)
  const workdayMinutes = 480;
  for (const workload of workloadMap.values()) {
    workload.utilizationPercent = Math.round(
      (workload.totalMinutes / workdayMinutes) * 100,
    );
  }

  return Array.from(workloadMap.values());
}

function calculateProviderUtilizationScore(
  workloads: ProviderWorkload[],
  providerId: number,
  targetUtilization: number = 80,
): number {
  const workload = workloads.find((w) => w.providerId === providerId);

  if (!workload) {
    return 1.0; // No appointments, fully available
  }

  // Score based on how close to target utilization
  const _utilizationDiff = Math.abs(
    workload.utilizationPercent - targetUtilization,
  );

  if (workload.utilizationPercent >= 95) {
    return 0.1; // Very overbooked
  }

  if (workload.utilizationPercent >= targetUtilization) {
    return (
      0.3 + 0.2 * (1 - (workload.utilizationPercent - targetUtilization) / 15)
    );
  }

  // Under-utilized, prefer filling these slots
  return 0.5 + 0.5 * (workload.utilizationPercent / targetUtilization);
}

// ============================================================================
// TIME OPTIMALITY ANALYSIS
// ============================================================================

function calculateTimeOptimalityScore(
  slot: Date,
  _preferences?: SchedulingPreferences,
): number {
  const hour = slot.getHours();

  // Base score based on typical preference patterns
  let score = 0.5;

  // Peak hours (9-11 AM, 2-4 PM) tend to have higher show rates
  if ((hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16)) {
    score += 0.2;
  }

  // Early morning and late afternoon slightly less optimal
  if (hour < 9 || hour > 17) {
    score -= 0.1;
  }

  // Lunch time typically has higher no-show rates
  if (hour >= 12 && hour < 14) {
    score -= 0.1;
  }

  // Friday afternoons have higher cancellation rates
  if (slot.getDay() === 5 && hour >= 14) {
    score -= 0.15;
  }

  // Monday mornings can have higher no-shows
  if (slot.getDay() === 1 && hour < 10) {
    score -= 0.1;
  }

  return Math.max(0, Math.min(1, score));
}

// ============================================================================
// BUFFER OPTIMALITY ANALYSIS
// ============================================================================

async function calculateBufferOptimalityScore(
  configId: number,
  slot: Date,
  providerId: number,
  durationMinutes: number,
): Promise<number> {
  // Check appointments before and after this slot
  const slotEnd = new Date(slot.getTime() + durationMinutes * 60 * 1000);

  const nearbyAppointments = await prisma.appointment.findMany({
    where: {
      providerId,
      bookingPage: {
        configId,
      },
      scheduledAt: {
        gte: new Date(slot.getTime() - 2 * 60 * 60 * 1000), // 2 hours before
        lte: new Date(slotEnd.getTime() + 2 * 60 * 60 * 1000), // 2 hours after
      },
      status: {
        in: ['SCHEDULED', 'CONFIRMED'],
      },
    },
    orderBy: {
      scheduledAt: 'asc',
    },
  });

  if (nearbyAppointments.length === 0) {
    return 0.5; // No nearby appointments, neutral
  }

  let bufferScore = 0.5;

  // Check if there's a natural gap before
  const beforeAppointments = nearbyAppointments.filter(
    (a) => a.scheduledAt < slot,
  );
  if (beforeAppointments.length > 0) {
    const lastBefore = beforeAppointments[beforeAppointments.length - 1];
    const lastBeforeEnd = new Date(
      lastBefore.scheduledAt.getTime() +
        (lastBefore.durationMinutes || 30) * 60 * 1000,
    );
    const gapBefore = (slot.getTime() - lastBeforeEnd.getTime()) / (60 * 1000);

    if (gapBefore >= 15 && gapBefore <= 30) {
      bufferScore += 0.2; // Good buffer
    } else if (gapBefore < 10) {
      bufferScore -= 0.1; // Too tight
    }
  }

  // Check if there's a natural gap after
  const afterAppointments = nearbyAppointments.filter(
    (a) => a.scheduledAt >= slotEnd,
  );
  if (afterAppointments.length > 0) {
    const firstAfter = afterAppointments[0];
    const gapAfter =
      (firstAfter.scheduledAt.getTime() - slotEnd.getTime()) / (60 * 1000);

    if (gapAfter >= 15 && gapAfter <= 30) {
      bufferScore += 0.2; // Good buffer
    } else if (gapAfter < 10) {
      bufferScore -= 0.1; // Too tight
    }
  }

  // Bonus for consolidating schedule (reduces gaps)
  const totalAppointments = nearbyAppointments.length;
  if (totalAppointments >= 2 && totalAppointments <= 4) {
    bufferScore += 0.1; // Healthy schedule density
  }

  return Math.max(0, Math.min(1, bufferScore));
}

// ============================================================================
// OPTIMAL SLOT RECOMMENDATIONS
// ============================================================================

export async function getOptimalSlots(
  request: OptimalSlotRequest,
): Promise<SlotScore[]> {
  const {
    configId,
    startDate,
    endDate,
    appointmentTypeId,
    providerId,
    patientEmail,
    preferences,
    limit = 10,
  } = request;

  // Get available slots from the booking service
  const config = await prisma.schedulingConfig.findUnique({
    where: { id: configId },
    include: {
      providers: true,
      appointmentTypes: true,
    },
  });

  if (!config) {
    throw new Error('Scheduling config not found');
  }

  // Get historical data for conversion scoring
  const historicalData = await getHistoricalSlotData(configId);

  // Get patient history if email provided
  const patientHistory = patientEmail
    ? await getPatientBookingHistory(configId, patientEmail)
    : null;

  // Get provider workloads for the date range
  const workloadsByDate = new Map<string, ProviderWorkload[]>();

  // Generate candidate slots
  const candidateSlots: SlotScore[] = [];
  const slotDuration = appointmentTypeId
    ? config.appointmentTypes.find((t) => t.id === appointmentTypeId)
        ?.durationMinutes || 30
    : config.defaultSlotDurationMin || 30;

  // Filter providers
  const providers = providerId
    ? config.providers.filter((p) => p.id === providerId)
    : config.providers;

  // Iterate through date range
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];

    // Get workloads for this date
    if (!workloadsByDate.has(dateKey)) {
      const workloads = await getProviderWorkload(configId, currentDate);
      workloadsByDate.set(dateKey, workloads);
    }
    const workloads = workloadsByDate.get(dateKey)!;

    // Generate slots for each provider
    for (const provider of providers) {
      // Simple slot generation (in real implementation, check availability)
      const workStart = 9; // 9 AM
      const workEnd = 17; // 5 PM

      for (let hour = workStart; hour < workEnd; hour++) {
        for (let minute = 0; minute < 60; minute += slotDuration) {
          const slot = new Date(currentDate);
          slot.setHours(hour, minute, 0, 0);

          // Skip past slots
          if (slot < new Date()) continue;

          // Calculate scores
          const noShowRisk = patientHistory?.noShowRate || 0.1;
          const providerUtilization = calculateProviderUtilizationScore(
            workloads,
            provider.id,
          );
          const patientPreference = calculatePatientPreferenceScore(
            patientHistory,
            preferences,
            slot,
            provider.id,
          );
          const historicalConversion = calculateHistoricalConversionScore(
            historicalData,
            hour,
            currentDate.getDay(),
          );
          const timeOptimality = calculateTimeOptimalityScore(
            slot,
            preferences,
          );
          const bufferOptimality = await calculateBufferOptimalityScore(
            configId,
            slot,
            provider.id,
            slotDuration,
          );

          // Composite score with weights
          const score =
            providerUtilization * 0.2 +
            patientPreference * 0.25 +
            historicalConversion * 0.2 +
            timeOptimality * 0.15 +
            bufferOptimality * 0.1 +
            (1 - noShowRisk) * 0.1;

          candidateSlots.push({
            slot,
            providerId: provider.id,
            score,
            factors: {
              noShowRisk,
              providerUtilization,
              patientPreference,
              historicalConversion,
              timeOptimality,
              bufferOptimality,
            },
            overbookingAllowed: false,
          });
        }
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Sort by score and return top results
  candidateSlots.sort((a, b) => b.score - a.score);

  return candidateSlots.slice(0, limit);
}

// ============================================================================
// INTELLIGENT OVERBOOKING
// ============================================================================

export async function getOverbookingConfig(
  configId: number,
): Promise<OverbookingConfig> {
  const config = await prisma.schedulingConfig.findUnique({
    where: { id: configId },
  });

  if (!config) {
    throw new Error('Scheduling config not found');
  }

  // Default overbooking configuration
  const templateSettings =
    (config.templateSettings as Record<string, unknown>) || {};
  const overbookingSettings = templateSettings.overbooking as
    | Partial<OverbookingConfig>
    | undefined;

  return {
    enabled: overbookingSettings?.enabled ?? false,
    maxOverbookingsPerSlot: overbookingSettings?.maxOverbookingsPerSlot ?? 1,
    minNoShowProbability: overbookingSettings?.minNoShowProbability ?? 0.4,
    maxDailyOverbookings: overbookingSettings?.maxDailyOverbookings ?? 5,
    appointmentTypesAllowed: overbookingSettings?.appointmentTypesAllowed ?? [],
    providersAllowed: overbookingSettings?.providersAllowed ?? [],
  };
}

export async function updateOverbookingConfig(
  configId: number,
  updates: Partial<OverbookingConfig>,
): Promise<OverbookingConfig> {
  const config = await prisma.schedulingConfig.findUnique({
    where: { id: configId },
  });

  if (!config) {
    throw new Error('Scheduling config not found');
  }

  const templateSettings =
    (config.templateSettings as Record<string, unknown>) || {};
  const currentSettings =
    (templateSettings.overbooking as Partial<OverbookingConfig>) || {};

  const newSettings = {
    ...currentSettings,
    ...updates,
  };

  await prisma.schedulingConfig.update({
    where: { id: configId },
    data: {
      templateSettings: {
        ...templateSettings,
        overbooking: newSettings,
      },
    },
  });

  return getOverbookingConfig(configId);
}

export async function getRecommendedOverbookingSlots(
  configId: number,
  date: Date,
): Promise<
  { slot: Date; providerId: number; probability: number; reason: string }[]
> {
  const overbookingConfig = await getOverbookingConfig(configId);

  if (!overbookingConfig.enabled) {
    return [];
  }

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Get all appointments for the day
  const appointments = await prisma.appointment.findMany({
    where: {
      bookingPage: {
        configId,
      },
      scheduledAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        in: ['SCHEDULED', 'CONFIRMED'],
      },
    },
    include: {
      provider: true,
    },
  });

  const recommendations: {
    slot: Date;
    providerId: number;
    probability: number;
    reason: string;
  }[] = [];

  // Check each appointment's no-show probability
  for (const apt of appointments) {
    if (!apt.providerId) continue;

    // Check provider is allowed for overbooking
    if (
      overbookingConfig.providersAllowed.length > 0 &&
      !overbookingConfig.providersAllowed.includes(apt.providerId)
    ) {
      continue;
    }

    try {
      const prediction = await noshowService.predictNoShow(apt.id);

      if (prediction.score >= overbookingConfig.minNoShowProbability) {
        recommendations.push({
          slot: apt.scheduledAt,
          providerId: apt.providerId,
          probability: prediction.score,
          reason: `High no-show probability (${Math.round(prediction.score * 100)}%) based on ${prediction.confidence} confidence prediction`,
        });
      }
    } catch {
      // Skip if prediction fails
    }
  }

  // Sort by probability (highest first) and limit
  recommendations.sort((a, b) => b.probability - a.probability);

  return recommendations.slice(0, overbookingConfig.maxDailyOverbookings);
}

export async function canOverbook(
  configId: number,
  slot: Date,
  providerId: number,
): Promise<{ allowed: boolean; reason: string }> {
  const overbookingConfig = await getOverbookingConfig(configId);

  if (!overbookingConfig.enabled) {
    return {
      allowed: false,
      reason: 'Overbooking is not enabled for this practice',
    };
  }

  // Check if provider is allowed
  if (
    overbookingConfig.providersAllowed.length > 0 &&
    !overbookingConfig.providersAllowed.includes(providerId)
  ) {
    return {
      allowed: false,
      reason: 'Provider is not enabled for overbooking',
    };
  }

  // Check daily limit - count total appointments for today
  // Note: Proper overbooking tracking would require an isOverbooked field on Appointment
  const startOfDay = new Date(slot);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(slot);
  endOfDay.setHours(23, 59, 59, 999);

  const todayAppointments = await prisma.appointment.count({
    where: {
      bookingPage: {
        configId,
      },
      scheduledAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        in: ['SCHEDULED', 'CONFIRMED'],
      },
    },
  });

  // Simple heuristic: If daily appointments exceed a threshold, limit overbookings
  // This is a simplified check since we don't have an isOverbooked field
  const maxDailyAppointments = overbookingConfig.maxDailyOverbookings * 10; // Assume 10 slots per day
  if (todayAppointments >= maxDailyAppointments) {
    return { allowed: false, reason: 'Daily capacity limit reached' };
  }

  // Check slot limit - count appointments at this specific slot
  const slotAppointments = await prisma.appointment.count({
    where: {
      providerId,
      scheduledAt: slot,
      status: {
        in: ['SCHEDULED', 'CONFIRMED'],
      },
    },
  });

  // Only allow overbooking if there's already one appointment at this slot
  // and we haven't exceeded the overbooking limit
  if (slotAppointments >= overbookingConfig.maxOverbookingsPerSlot + 1) {
    return { allowed: false, reason: 'Slot overbooking limit reached' };
  }

  // Check if there's a high-risk appointment at this slot
  const existingAppointment = await prisma.appointment.findFirst({
    where: {
      providerId,
      scheduledAt: slot,
      status: {
        in: ['SCHEDULED', 'CONFIRMED'],
      },
    },
  });

  if (!existingAppointment) {
    return { allowed: false, reason: 'No existing appointment to overbook' };
  }

  try {
    const prediction = await noshowService.predictNoShow(
      existingAppointment.id,
    );

    if (prediction.score >= overbookingConfig.minNoShowProbability) {
      return {
        allowed: true,
        reason: `Existing appointment has ${Math.round(prediction.score * 100)}% no-show probability`,
      };
    } else {
      return {
        allowed: false,
        reason: `Existing appointment no-show probability (${Math.round(prediction.score * 100)}%) is below threshold (${Math.round(overbookingConfig.minNoShowProbability * 100)}%)`,
      };
    }
  } catch {
    return { allowed: false, reason: 'Unable to assess no-show probability' };
  }
}

// ============================================================================
// SCHEDULING INSIGHTS
// ============================================================================

export async function getSchedulingInsights(
  configId: number,
  startDate: Date,
  endDate: Date,
): Promise<SchedulingInsights> {
  const historicalData = await getHistoricalSlotData(configId);

  // Find optimal booking times
  const optimalTimes = historicalData
    .filter((d) => d.bookingCount >= 5)
    .map((d) => ({
      hour: d.hour,
      dayOfWeek: d.dayOfWeek,
      conversionRate: d.completedCount / d.bookingCount,
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate)
    .slice(0, 10);

  // Find high demand periods
  const highDemandPeriods: SchedulingInsights['highDemandPeriods'] = [];
  const demandThreshold =
    historicalData.reduce((sum, d) => sum + d.bookingCount, 0) /
    historicalData.length;

  for (const data of historicalData) {
    if (data.bookingCount > demandThreshold * 1.5) {
      // Create a representative period
      const periodStart = new Date(startDate);
      periodStart.setDate(
        periodStart.getDate() +
          ((data.dayOfWeek - periodStart.getDay() + 7) % 7),
      );
      periodStart.setHours(data.hour, 0, 0, 0);

      const periodEnd = new Date(periodStart);
      periodEnd.setHours(data.hour + 1, 0, 0, 0);

      highDemandPeriods.push({
        start: periodStart,
        end: periodEnd,
        demandScore: data.bookingCount / demandThreshold,
      });
    }
  }

  // Find low utilization periods
  const workloads: ProviderWorkload[] = [];
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dayWorkloads = await getProviderWorkload(configId, currentDate);
    workloads.push(...dayWorkloads);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const lowUtilizationPeriods = workloads
    .filter((w) => w.utilizationPercent < 50)
    .map((w) => ({
      start: w.date,
      end: new Date(w.date.getTime() + 24 * 60 * 60 * 1000),
      utilizationPercent: w.utilizationPercent,
    }));

  // Get recommended overbooking slots
  const recommendedOverbookingSlots: SchedulingInsights['recommendedOverbookingSlots'] =
    [];
  const overbookingDate = new Date(startDate);
  while (overbookingDate <= endDate) {
    const dayRecommendations = await getRecommendedOverbookingSlots(
      configId,
      overbookingDate,
    );
    for (const rec of dayRecommendations) {
      recommendedOverbookingSlots.push({
        slot: rec.slot,
        providerId: rec.providerId,
        reason: rec.reason,
      });
    }
    overbookingDate.setDate(overbookingDate.getDate() + 1);
  }

  // Analyze patient preference patterns
  const insightAppointments = await prisma.appointment.findMany({
    where: {
      bookingPage: {
        configId,
      },
      scheduledAt: {
        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      },
    },
    select: {
      scheduledAt: true,
    },
  });

  const morningCount = insightAppointments.filter(
    (a) => a.scheduledAt.getHours() >= 6 && a.scheduledAt.getHours() < 12,
  ).length;
  const afternoonCount = insightAppointments.filter(
    (a) => a.scheduledAt.getHours() >= 12 && a.scheduledAt.getHours() < 17,
  ).length;
  const eveningCount = insightAppointments.filter(
    (a) => a.scheduledAt.getHours() >= 17 && a.scheduledAt.getHours() < 21,
  ).length;
  const total = insightAppointments.length || 1;

  const patientPreferencePatterns = [
    {
      preference: 'Morning (6 AM - 12 PM)',
      percentage: Math.round((morningCount / total) * 100),
    },
    {
      preference: 'Afternoon (12 PM - 5 PM)',
      percentage: Math.round((afternoonCount / total) * 100),
    },
    {
      preference: 'Evening (5 PM - 9 PM)',
      percentage: Math.round((eveningCount / total) * 100),
    },
  ];

  return {
    optimalBookingTimes: optimalTimes,
    highDemandPeriods,
    lowUtilizationPeriods,
    recommendedOverbookingSlots,
    patientPreferencePatterns,
  };
}
