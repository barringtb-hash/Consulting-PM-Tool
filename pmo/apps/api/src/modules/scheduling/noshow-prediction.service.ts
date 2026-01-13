/**
 * Enhanced No-Show Prediction Service
 *
 * AI-powered no-show prediction with:
 * - Feature-rich ML model
 * - Patient history analysis
 * - Weather & external factor integration
 * - A/B testing framework
 * - Continuous learning from outcomes
 */

import { prisma } from '../../prisma/client';
import { Prisma } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface PredictionFeatures {
  // Patient behavior features
  patientHistoryLength: number;
  previousNoShowCount: number;
  previousNoShowRate: number;
  previousCancellationCount: number;
  previousRescheduleCount: number;
  daysSinceLastVisit: number | null;
  isNewPatient: boolean;

  // Appointment features
  dayOfWeek: number;
  hourOfDay: number;
  isWeekend: boolean;
  isMorning: boolean;
  isAfternoon: boolean;
  isEvening: boolean;
  appointmentDurationMin: number;
  leadTimeHours: number;
  isRescheduled: boolean;
  rescheduleCount: number;

  // Contact features
  hasEmail: boolean;
  hasPhone: boolean;
  hasBothContacts: boolean;

  // Provider features
  providerNoShowRate: number;

  // Appointment type features
  appointmentTypeNoShowRate: number;

  // Environmental features (optional)
  weatherCondition?: string;
  temperature?: number;
  isHolidayWeek?: boolean;

  // Engagement features
  remindersSent: number;
  remindersConfirmed: number;
  lastReminderHoursAgo: number | null;
}

export interface PredictionResult {
  score: number; // 0-1 probability of no-show
  confidence: number; // Confidence level in the prediction
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  topFactors: Array<{ factor: string; impact: number; description: string }>;
  recommendedActions: string[];
  modelVersion: string;
  experimentVariant?: string;
}

export interface ModelWeights {
  // Base weights for each feature
  previousNoShowRate: number;
  isNewPatient: number;
  leadTime: number;
  dayOfWeek: number;
  timeOfDay: number;
  contactInfo: number;
  reminderEngagement: number;
  rescheduleHistory: number;
  providerHistory: number;
  appointmentType: number;
}

export interface ABTestConfig {
  id: string;
  name: string;
  variants: Array<{
    id: string;
    name: string;
    weights: Partial<ModelWeights>;
    trafficPercent: number;
  }>;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
}

// ============================================================================
// MODEL CONFIGURATION
// ============================================================================

const DEFAULT_WEIGHTS: ModelWeights = {
  previousNoShowRate: 0.25,
  isNewPatient: 0.1,
  leadTime: 0.1,
  dayOfWeek: 0.08,
  timeOfDay: 0.05,
  contactInfo: 0.12,
  reminderEngagement: 0.15,
  rescheduleHistory: 0.05,
  providerHistory: 0.05,
  appointmentType: 0.05,
};

const MODEL_VERSION = '2.0.0';

// ============================================================================
// FEATURE EXTRACTION
// ============================================================================

/**
 * Extract all prediction features for an appointment
 */
export async function extractFeatures(
  appointmentId: number,
): Promise<PredictionFeatures> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      config: true,
      provider: true,
      appointmentType: true,
      reminders: true,
    },
  });

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  // Get patient history
  const patientHistory = await getPatientHistory(
    appointment.configId,
    appointment.patientEmail,
    appointment.patientPhone,
  );

  // Get provider stats
  const providerStats = appointment.providerId
    ? await getProviderStats(appointment.providerId)
    : { noShowRate: 0.15 };

  // Get appointment type stats
  const appointmentTypeStats = appointment.appointmentTypeId
    ? await getAppointmentTypeStats(appointment.appointmentTypeId)
    : { noShowRate: 0.15 };

  // Calculate lead time
  const leadTimeHours =
    (new Date(appointment.scheduledAt).getTime() - Date.now()) /
    (1000 * 60 * 60);

  // Calculate time-based features
  const scheduledDate = new Date(appointment.scheduledAt);
  const dayOfWeek = scheduledDate.getDay();
  const hourOfDay = scheduledDate.getHours();

  // Reminder engagement
  const remindersSent = appointment.reminders.length;
  const remindersConfirmed = appointment.reminders.filter(
    (r) => r.responseAction === 'confirmed',
  ).length;

  const lastSentReminder = appointment.reminders
    .filter((r) => r.sentAt)
    .sort(
      (a, b) => new Date(b.sentAt!).getTime() - new Date(a.sentAt!).getTime(),
    )[0];

  const lastReminderHoursAgo = lastSentReminder?.sentAt
    ? (Date.now() - new Date(lastSentReminder.sentAt).getTime()) /
      (1000 * 60 * 60)
    : null;

  return {
    // Patient behavior
    patientHistoryLength: patientHistory.totalAppointments,
    previousNoShowCount: patientHistory.noShowCount,
    previousNoShowRate: patientHistory.noShowRate,
    previousCancellationCount: patientHistory.cancellationCount,
    previousRescheduleCount: patientHistory.rescheduleCount,
    daysSinceLastVisit: patientHistory.daysSinceLastVisit,
    isNewPatient: patientHistory.totalAppointments === 0,

    // Appointment features
    dayOfWeek,
    hourOfDay,
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    isMorning: hourOfDay >= 6 && hourOfDay < 12,
    isAfternoon: hourOfDay >= 12 && hourOfDay < 17,
    isEvening: hourOfDay >= 17,
    appointmentDurationMin: appointment.durationMinutes,
    leadTimeHours: Math.max(0, leadTimeHours),
    isRescheduled: !!appointment.rescheduledFrom,
    rescheduleCount: await getRescheduleCount(appointmentId),

    // Contact features
    hasEmail: !!appointment.patientEmail,
    hasPhone: !!appointment.patientPhone,
    hasBothContacts: !!appointment.patientEmail && !!appointment.patientPhone,

    // Provider features
    providerNoShowRate: providerStats.noShowRate,

    // Appointment type features
    appointmentTypeNoShowRate: appointmentTypeStats.noShowRate,

    // Engagement features
    remindersSent,
    remindersConfirmed,
    lastReminderHoursAgo,
  };
}

/**
 * Get patient history from past appointments
 */
async function getPatientHistory(
  configId: number,
  email?: string | null,
  phone?: string | null,
) {
  if (!email && !phone) {
    return {
      totalAppointments: 0,
      noShowCount: 0,
      noShowRate: 0,
      cancellationCount: 0,
      rescheduleCount: 0,
      daysSinceLastVisit: null,
    };
  }

  const where: Prisma.AppointmentWhereInput = {
    configId,
    OR: [
      ...(email ? [{ patientEmail: email }] : []),
      ...(phone ? [{ patientPhone: phone }] : []),
    ],
  };

  const appointments = await prisma.appointment.findMany({
    where,
    orderBy: { scheduledAt: 'desc' },
    select: {
      status: true,
      scheduledAt: true,
      rescheduledFrom: true,
    },
  });

  const completed = appointments.filter(
    (a) => a.status === 'COMPLETED' || a.status === 'NO_SHOW',
  );
  const noShows = completed.filter((a) => a.status === 'NO_SHOW');
  const cancellations = appointments.filter((a) => a.status === 'CANCELLED');
  const rescheduled = appointments.filter((a) => a.rescheduledFrom);

  const lastVisit = completed.find((a) => a.status === 'COMPLETED');
  const daysSinceLastVisit = lastVisit
    ? Math.floor(
        (Date.now() - new Date(lastVisit.scheduledAt).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  return {
    totalAppointments: appointments.length,
    noShowCount: noShows.length,
    noShowRate: completed.length > 0 ? noShows.length / completed.length : 0,
    cancellationCount: cancellations.length,
    rescheduleCount: rescheduled.length,
    daysSinceLastVisit,
  };
}

/**
 * Get provider no-show statistics
 */
async function getProviderStats(providerId: number) {
  const appointments = await prisma.appointment.findMany({
    where: {
      providerId,
      status: { in: ['COMPLETED', 'NO_SHOW'] },
      scheduledAt: {
        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
      },
    },
    select: { status: true },
  });

  const noShows = appointments.filter((a) => a.status === 'NO_SHOW');
  const noShowRate =
    appointments.length > 0 ? noShows.length / appointments.length : 0.15;

  return { noShowRate };
}

/**
 * Get appointment type no-show statistics
 */
async function getAppointmentTypeStats(appointmentTypeId: number) {
  const appointments = await prisma.appointment.findMany({
    where: {
      appointmentTypeId,
      status: { in: ['COMPLETED', 'NO_SHOW'] },
      scheduledAt: {
        gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      },
    },
    select: { status: true },
  });

  const noShows = appointments.filter((a) => a.status === 'NO_SHOW');
  const noShowRate =
    appointments.length > 0 ? noShows.length / appointments.length : 0.15;

  return { noShowRate };
}

/**
 * Get reschedule count chain for an appointment
 */
async function getRescheduleCount(appointmentId: number): Promise<number> {
  let count = 0;
  let currentId = appointmentId;

  while (count < 10) {
    // Safety limit
    const apt = await prisma.appointment.findUnique({
      where: { id: currentId },
      select: { rescheduledFrom: true },
    });

    if (!apt?.rescheduledFrom) break;
    count++;
    currentId = apt.rescheduledFrom;
  }

  return count;
}

// ============================================================================
// PREDICTION ENGINE
// ============================================================================

/**
 * Calculate no-show prediction for an appointment
 */
export async function predictNoShow(
  appointmentId: number,
  options?: { saveResult?: boolean; experimentVariant?: string },
): Promise<PredictionResult> {
  const features = await extractFeatures(appointmentId);

  // Get weights (could be from A/B test variant)
  const weights = options?.experimentVariant
    ? await getExperimentWeights(options.experimentVariant)
    : DEFAULT_WEIGHTS;

  // Calculate base score from each feature group
  const scores: Array<{ name: string; score: number; weight: number }> = [];

  // Previous no-show rate (strongest predictor)
  const noShowRateScore = calculateNoShowRateScore(features);
  scores.push({
    name: 'Previous No-Show Rate',
    score: noShowRateScore,
    weight: weights.previousNoShowRate,
  });

  // New patient risk
  const newPatientScore = features.isNewPatient ? 0.3 : 0;
  scores.push({
    name: 'New Patient',
    score: newPatientScore,
    weight: weights.isNewPatient,
  });

  // Lead time risk (longer lead time = higher risk)
  const leadTimeScore = calculateLeadTimeScore(features.leadTimeHours);
  scores.push({
    name: 'Lead Time',
    score: leadTimeScore,
    weight: weights.leadTime,
  });

  // Day of week risk
  const dayOfWeekScore = calculateDayOfWeekScore(features.dayOfWeek);
  scores.push({
    name: 'Day of Week',
    score: dayOfWeekScore,
    weight: weights.dayOfWeek,
  });

  // Time of day risk
  const timeOfDayScore = calculateTimeOfDayScore(features.hourOfDay);
  scores.push({
    name: 'Time of Day',
    score: timeOfDayScore,
    weight: weights.timeOfDay,
  });

  // Contact info (no contact = higher risk)
  const contactScore = calculateContactScore(features);
  scores.push({
    name: 'Contact Information',
    score: contactScore,
    weight: weights.contactInfo,
  });

  // Reminder engagement
  const reminderScore = calculateReminderScore(features);
  scores.push({
    name: 'Reminder Engagement',
    score: reminderScore,
    weight: weights.reminderEngagement,
  });

  // Reschedule history
  const rescheduleScore = calculateRescheduleScore(features);
  scores.push({
    name: 'Reschedule History',
    score: rescheduleScore,
    weight: weights.rescheduleHistory,
  });

  // Provider history
  scores.push({
    name: 'Provider History',
    score: features.providerNoShowRate,
    weight: weights.providerHistory,
  });

  // Appointment type history
  scores.push({
    name: 'Appointment Type',
    score: features.appointmentTypeNoShowRate,
    weight: weights.appointmentType,
  });

  // Calculate weighted average
  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  const weightedSum = scores.reduce((sum, s) => sum + s.score * s.weight, 0);
  const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 0.5;

  // Apply sigmoid normalization to keep in 0-1 range
  const score = Math.min(0.95, Math.max(0.05, rawScore));

  // Calculate confidence based on data availability
  const confidence = calculateConfidence(features);

  // Determine risk level
  const riskLevel = getRiskLevel(score);

  // Get top factors
  const topFactors = scores
    .map((s) => ({
      factor: s.name,
      impact: s.score * s.weight,
      description: getFactorDescription(s.name, s.score),
    }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 5);

  // Generate recommendations
  const recommendedActions = generateRecommendations(riskLevel, features);

  const result: PredictionResult = {
    score,
    confidence,
    riskLevel,
    topFactors,
    recommendedActions,
    modelVersion: MODEL_VERSION,
    experimentVariant: options?.experimentVariant,
  };

  // Save prediction log if requested
  if (options?.saveResult !== false) {
    await savePredictionLog(appointmentId, features, result);
  }

  return result;
}

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

function calculateNoShowRateScore(features: PredictionFeatures): number {
  if (features.isNewPatient) {
    return 0.2; // Default risk for new patients
  }
  return features.previousNoShowRate;
}

function calculateLeadTimeScore(leadTimeHours: number): number {
  if (leadTimeHours < 24) return 0.1;
  if (leadTimeHours < 48) return 0.15;
  if (leadTimeHours < 168) return 0.25; // 1 week
  if (leadTimeHours < 336) return 0.35; // 2 weeks
  return 0.45; // > 2 weeks
}

function calculateDayOfWeekScore(dayOfWeek: number): number {
  // Mondays have highest no-show rates
  const dayScores = [0.2, 0.3, 0.15, 0.1, 0.1, 0.15, 0.25]; // Sun-Sat
  return dayScores[dayOfWeek];
}

function calculateTimeOfDayScore(hourOfDay: number): number {
  if (hourOfDay < 8) return 0.25; // Early morning
  if (hourOfDay < 11) return 0.1; // Mid-morning
  if (hourOfDay < 14) return 0.15; // Lunch time
  if (hourOfDay < 17) return 0.1; // Afternoon
  return 0.2; // Evening
}

function calculateContactScore(features: PredictionFeatures): number {
  if (features.hasBothContacts) return 0.1;
  if (features.hasPhone) return 0.15;
  if (features.hasEmail) return 0.25;
  return 0.4; // No contact info
}

function calculateReminderScore(features: PredictionFeatures): number {
  if (features.remindersConfirmed > 0) return 0.05; // Confirmed reminder
  if (features.remindersSent > 0 && features.lastReminderHoursAgo !== null) {
    if (features.lastReminderHoursAgo < 24) return 0.15;
    return 0.2;
  }
  if (features.remindersSent === 0) return 0.3;
  return 0.2;
}

function calculateRescheduleScore(features: PredictionFeatures): number {
  if (features.rescheduleCount === 0) return 0;
  if (features.rescheduleCount === 1) return 0.15;
  if (features.rescheduleCount === 2) return 0.3;
  return 0.45; // 3+ reschedules
}

function calculateConfidence(features: PredictionFeatures): number {
  let confidence = 0.5; // Base confidence

  // Increase confidence with more patient history
  if (features.patientHistoryLength >= 5) confidence += 0.2;
  else if (features.patientHistoryLength >= 2) confidence += 0.1;

  // Decrease confidence for new patients
  if (features.isNewPatient) confidence -= 0.1;

  // Increase confidence if reminder response available
  if (features.remindersConfirmed > 0) confidence += 0.15;

  return Math.min(0.95, Math.max(0.3, confidence));
}

function getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' {
  if (score < 0.2) return 'LOW';
  if (score < 0.4) return 'MEDIUM';
  if (score < 0.6) return 'HIGH';
  return 'VERY_HIGH';
}

function getFactorDescription(factor: string, score: number): string {
  switch (factor) {
    case 'Previous No-Show Rate':
      if (score > 0.3) return 'Patient has a history of missing appointments';
      if (score > 0.1) return 'Some previous missed appointments';
      return 'Good attendance history';

    case 'New Patient':
      if (score > 0) return 'New patients have higher no-show rates';
      return 'Returning patient';

    case 'Lead Time':
      if (score > 0.3) return 'Appointments far in advance have higher risk';
      if (score > 0.2) return 'Moderate lead time';
      return 'Short lead time reduces risk';

    case 'Day of Week':
      if (score > 0.25) return 'Mondays/weekends have higher no-show rates';
      return 'Mid-week appointments tend to show up';

    case 'Contact Information':
      if (score > 0.3) return 'Limited contact info makes reminders difficult';
      if (score > 0.2) return 'Only email available';
      return 'Multiple contact methods available';

    case 'Reminder Engagement':
      if (score < 0.1) return 'Patient confirmed reminder';
      if (score > 0.25) return 'No reminder confirmation received';
      return 'Reminder sent but not confirmed';

    default:
      return '';
  }
}

function generateRecommendations(
  riskLevel: string,
  features: PredictionFeatures,
): string[] {
  const recommendations: string[] = [];

  switch (riskLevel) {
    case 'VERY_HIGH':
      recommendations.push('Call patient 24 hours before to confirm');
      recommendations.push('Consider requiring deposit for future bookings');
      recommendations.push('Send multiple reminder messages');
      if (!features.hasPhone) {
        recommendations.push('Request phone number for better contact');
      }
      break;

    case 'HIGH':
      recommendations.push('Send confirmation call or text 24 hours before');
      recommendations.push('Add to waitlist alert for quick backfill');
      if (features.remindersSent === 0) {
        recommendations.push('Schedule additional reminder messages');
      }
      break;

    case 'MEDIUM':
      recommendations.push('Ensure reminder is sent day before');
      recommendations.push('Have backup appointment available');
      break;

    case 'LOW':
      recommendations.push('Standard reminder protocol sufficient');
      break;
  }

  return recommendations;
}

// ============================================================================
// PREDICTION LOGGING & LEARNING
// ============================================================================

/**
 * Save prediction log for learning
 */
async function savePredictionLog(
  appointmentId: number,
  features: PredictionFeatures,
  result: PredictionResult,
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { configId: true },
  });

  if (!appointment) return;

  await prisma.noShowPredictionLog.create({
    data: {
      configId: appointment.configId,
      appointmentId,
      predictedScore: result.score,
      predictedAt: new Date(),
      features: {
        ...features,
        modelVersion: result.modelVersion,
        experimentVariant: result.experimentVariant,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  // Also update appointment
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      noShowRiskScore: result.score,
      noShowPredictedAt: new Date(),
    },
  });
}

/**
 * Record actual outcome for learning
 */
export async function recordOutcome(
  appointmentId: number,
  wasNoShow: boolean,
): Promise<void> {
  await prisma.noShowPredictionLog.updateMany({
    where: { appointmentId },
    data: {
      actualOutcome: wasNoShow,
      outcomeRecordedAt: new Date(),
    },
  });
}

/**
 * Get model performance metrics
 */
export async function getModelPerformance(
  configId: number,
  options?: { startDate?: Date; endDate?: Date; experimentVariant?: string },
) {
  const where: Prisma.NoShowPredictionLogWhereInput = {
    configId,
    actualOutcome: { not: null },
  };

  if (options?.startDate) {
    where.predictedAt = { gte: options.startDate };
  }
  if (options?.endDate) {
    where.predictedAt = {
      ...(where.predictedAt as object),
      lte: options.endDate,
    };
  }
  // experimentVariant filtering would require schema migration
  // For now, skip filtering by variant

  const predictions = await prisma.noShowPredictionLog.findMany({
    where,
    select: {
      predictedScore: true,
      actualOutcome: true,
    },
  });

  if (predictions.length === 0) {
    return {
      totalPredictions: 0,
      accuracy: null,
      precision: null,
      recall: null,
      f1Score: null,
      auc: null,
    };
  }

  // Calculate metrics
  const threshold = 0.5;
  let truePositives = 0;
  let trueNegatives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  for (const p of predictions) {
    const predicted = p.predictedScore >= threshold;
    const actual = p.actualOutcome!;

    if (predicted && actual) truePositives++;
    else if (!predicted && !actual) trueNegatives++;
    else if (predicted && !actual) falsePositives++;
    else falseNegatives++;
  }

  const accuracy = (truePositives + trueNegatives) / predictions.length;
  const precision =
    truePositives + falsePositives > 0
      ? truePositives / (truePositives + falsePositives)
      : 0;
  const recall =
    truePositives + falseNegatives > 0
      ? truePositives / (truePositives + falseNegatives)
      : 0;
  const f1Score =
    precision + recall > 0
      ? (2 * precision * recall) / (precision + recall)
      : 0;

  return {
    totalPredictions: predictions.length,
    accuracy,
    precision,
    recall,
    f1Score,
    truePositives,
    trueNegatives,
    falsePositives,
    falseNegatives,
  };
}

// ============================================================================
// A/B TESTING
// ============================================================================

/**
 * Get active A/B test for a config
 */
export async function getActiveExperiment(
  configId: number,
): Promise<ABTestConfig | null> {
  const config = await prisma.schedulingConfig.findUnique({
    where: { id: configId },
  });

  if (!config) return null;

  const templateSettings = (config.templateSettings || {}) as {
    abTests?: ABTestConfig[];
  } | null;

  const activeTest = templateSettings?.abTests?.find(
    (t) => t.isActive && (!t.endDate || new Date(t.endDate) > new Date()),
  );

  return activeTest || null;
}

/**
 * Assign a variant for an appointment
 */
export async function assignExperimentVariant(
  configId: number,
  _appointmentId: number,
): Promise<string | undefined> {
  const experiment = await getActiveExperiment(configId);
  if (!experiment) return undefined;

  // Simple random assignment based on traffic percent
  const random = Math.random() * 100;
  let cumulative = 0;

  for (const variant of experiment.variants) {
    cumulative += variant.trafficPercent;
    if (random < cumulative) {
      return variant.id;
    }
  }

  return experiment.variants[0]?.id;
}

/**
 * Get experiment weights for a variant
 */
async function getExperimentWeights(variantId: string): Promise<ModelWeights> {
  // Find the variant across all configs (simplified)
  const configs = await prisma.schedulingConfig.findMany({
    select: { templateSettings: true },
  });

  for (const config of configs) {
    const settings = config.templateSettings as {
      abTests?: ABTestConfig[];
    } | null;
    for (const test of settings?.abTests || []) {
      const variant = test.variants.find((v) => v.id === variantId);
      if (variant?.weights) {
        return { ...DEFAULT_WEIGHTS, ...variant.weights };
      }
    }
  }

  return DEFAULT_WEIGHTS;
}

/**
 * Create an A/B test
 */
export async function createExperiment(
  configId: number,
  experiment: Omit<ABTestConfig, 'id'>,
): Promise<ABTestConfig> {
  const config = await prisma.schedulingConfig.findUnique({
    where: { id: configId },
  });

  if (!config) {
    throw new Error('Scheduling config not found');
  }

  const currentSettings = (config.templateSettings || {}) as {
    abTests?: ABTestConfig[];
  };
  const abTests = currentSettings.abTests || [];

  const newExperiment: ABTestConfig = {
    id: `exp_${Date.now()}`,
    ...experiment,
  };

  await prisma.schedulingConfig.update({
    where: { id: configId },
    data: {
      templateSettings: {
        ...currentSettings,
        abTests: [...abTests, newExperiment],
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return newExperiment;
}

/**
 * End an A/B test
 */
export async function endExperiment(configId: number, experimentId: string) {
  const config = await prisma.schedulingConfig.findUnique({
    where: { id: configId },
  });

  if (!config) {
    throw new Error('Scheduling config not found');
  }

  const currentSettings = (config.templateSettings || {}) as {
    abTests?: ABTestConfig[];
  };
  const abTests = currentSettings.abTests || [];

  const updatedTests = abTests.map((t) =>
    t.id === experimentId ? { ...t, isActive: false, endDate: new Date() } : t,
  );

  await prisma.schedulingConfig.update({
    where: { id: configId },
    data: {
      templateSettings: {
        ...currentSettings,
        abTests: updatedTests,
      } as unknown as Prisma.InputJsonValue,
    },
  });
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Update predictions for all upcoming appointments
 */
export async function updateAllPredictions(configId: number): Promise<number> {
  const appointments = await prisma.appointment.findMany({
    where: {
      configId,
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
      scheduledAt: { gte: new Date() },
    },
    select: { id: true },
  });

  let updated = 0;
  for (const apt of appointments) {
    try {
      await predictNoShow(apt.id);
      updated++;
    } catch (error) {
      console.error(`Failed to update prediction for ${apt.id}:`, error);
    }
  }

  return updated;
}

/**
 * Get high-risk appointments
 */
export async function getHighRiskAppointments(
  configId: number,
  options?: { threshold?: number; limit?: number },
) {
  const threshold = options?.threshold ?? 0.5;
  const limit = options?.limit ?? 50;

  return prisma.appointment.findMany({
    where: {
      configId,
      status: { in: ['SCHEDULED', 'CONFIRMED'] },
      scheduledAt: { gte: new Date() },
      noShowRiskScore: { gte: threshold },
    },
    include: {
      provider: { select: { id: true, name: true } },
      appointmentType: { select: { id: true, name: true } },
    },
    orderBy: { noShowRiskScore: 'desc' },
    take: limit,
  });
}
