/**
 * Scheduling - AI Features API
 * API functions for AI-powered scheduling features (smart scheduling, no-show prediction)
 */

import { buildOptions, ApiError } from '../http';
import { buildApiUrl } from '../config';
import type { Appointment, TimeSlot } from './appointments';

// ============================================================================
// TYPES
// ============================================================================

export interface SmartSchedulingRecommendation {
  slot: TimeSlot;
  score: number;
  reasons: string[];
  providerScore: number;
  timeScore: number;
  availabilityScore: number;
}

export interface NoShowPrediction {
  appointmentId: number;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: NoShowFactor[];
  recommendations: string[];
}

export interface NoShowFactor {
  factor: string;
  impact: number;
  description: string;
}

export interface NoShowStats {
  totalPredictions: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  averageRiskScore: number;
  topFactors: { factor: string; count: number }[];
}

export interface OptimalTimeSlot {
  datetime: string;
  providerId: number | null;
  providerName: string | null;
  score: number;
  factors: {
    providerAvailability: number;
    historicalNoShowRate: number;
    patientPreference: number;
    utilizationBalance: number;
  };
}

export interface ScheduleOptimization {
  currentUtilization: number;
  optimizedUtilization: number;
  suggestions: OptimizationSuggestion[];
  savingsEstimate: {
    timeSavedMinutes: number;
    revenueRecovery: number;
  };
}

export interface OptimizationSuggestion {
  type: 'reschedule' | 'fill_gap' | 'redistribute' | 'overbooking';
  appointmentId?: number;
  currentSlot?: string;
  suggestedSlot?: string;
  reason: string;
  impact: string;
  priority: 'high' | 'medium' | 'low';
}

export interface NLBookingResponse {
  conversationId: string;
  message: string;
  intent: NLIntent;
  entities: NLEntities;
  suggestedSlots?: TimeSlot[];
  confirmationRequired?: boolean;
  bookingConfirmed?: boolean;
  appointment?: Appointment;
}

export type NLIntent =
  | 'book_appointment'
  | 'reschedule'
  | 'cancel'
  | 'check_availability'
  | 'get_info'
  | 'confirm'
  | 'deny'
  | 'unknown';

export interface NLEntities {
  date?: string;
  time?: string;
  provider?: string;
  appointmentType?: string;
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
}

// ============================================================================
// API FUNCTIONS - SMART SCHEDULING
// ============================================================================

export async function getSmartRecommendations(
  configId: number,
  params: {
    startDate: string;
    endDate: string;
    providerId?: number;
    appointmentTypeId?: number;
    patientHistory?: { noShowCount: number; totalAppointments: number };
  },
): Promise<SmartSchedulingRecommendation[]> {
  const searchParams = new URLSearchParams();
  searchParams.set('startDate', params.startDate);
  searchParams.set('endDate', params.endDate);
  if (params.providerId)
    searchParams.set('providerId', params.providerId.toString());
  if (params.appointmentTypeId)
    searchParams.set('appointmentTypeId', params.appointmentTypeId.toString());

  const res = await fetch(
    buildApiUrl(
      `/scheduling/${configId}/smart-recommendations?${searchParams}`,
    ),
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ patientHistory: params.patientHistory }),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to get smart recommendations') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.recommendations || [];
}

export async function getOptimalSlots(
  configId: number,
  params: {
    date: string;
    providerId?: number;
    appointmentTypeId?: number;
    limit?: number;
  },
): Promise<OptimalTimeSlot[]> {
  const searchParams = new URLSearchParams();
  searchParams.set('date', params.date);
  if (params.providerId)
    searchParams.set('providerId', params.providerId.toString());
  if (params.appointmentTypeId)
    searchParams.set('appointmentTypeId', params.appointmentTypeId.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());

  const res = await fetch(
    buildApiUrl(`/scheduling/${configId}/optimal-slots?${searchParams}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to get optimal slots') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.slots || [];
}

export async function getScheduleOptimization(
  configId: number,
  params: { startDate: string; endDate: string },
): Promise<ScheduleOptimization> {
  const searchParams = new URLSearchParams();
  searchParams.set('startDate', params.startDate);
  searchParams.set('endDate', params.endDate);

  const res = await fetch(
    buildApiUrl(`/scheduling/${configId}/optimization?${searchParams}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to get schedule optimization') as ApiError;
    error.status = res.status;
    throw error;
  }
  return await res.json();
}

// ============================================================================
// API FUNCTIONS - NO-SHOW PREDICTION
// ============================================================================

export async function predictNoShow(
  appointmentId: number,
): Promise<NoShowPrediction> {
  const res = await fetch(
    buildApiUrl(`/scheduling/appointments/${appointmentId}/no-show-prediction`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to get no-show prediction') as ApiError;
    error.status = res.status;
    throw error;
  }
  return await res.json();
}

export async function getBatchNoShowPredictions(
  configId: number,
  params: { startDate: string; endDate: string; minRisk?: number },
): Promise<NoShowPrediction[]> {
  const searchParams = new URLSearchParams();
  searchParams.set('startDate', params.startDate);
  searchParams.set('endDate', params.endDate);
  if (params.minRisk !== undefined)
    searchParams.set('minRisk', params.minRisk.toString());

  const res = await fetch(
    buildApiUrl(`/scheduling/${configId}/no-show-predictions?${searchParams}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to get no-show predictions') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.predictions || [];
}

export async function getNoShowStats(
  configId: number,
  params?: { startDate?: string; endDate?: string },
): Promise<NoShowStats> {
  const searchParams = new URLSearchParams();
  if (params?.startDate) searchParams.set('startDate', params.startDate);
  if (params?.endDate) searchParams.set('endDate', params.endDate);

  const res = await fetch(
    buildApiUrl(`/scheduling/${configId}/no-show-stats?${searchParams}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to get no-show stats') as ApiError;
    error.status = res.status;
    throw error;
  }
  return await res.json();
}

// ============================================================================
// API FUNCTIONS - NATURAL LANGUAGE BOOKING
// ============================================================================

export async function sendNLMessage(
  slug: string,
  message: string,
  conversationId?: string,
): Promise<NLBookingResponse> {
  const res = await fetch(
    buildApiUrl(`/booking/${slug}/nl/message`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ message, conversationId }),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to process message') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

export async function clearNLConversation(
  slug: string,
  conversationId: string,
): Promise<void> {
  const res = await fetch(
    buildApiUrl(`/booking/${slug}/nl/conversation/${conversationId}`),
    buildOptions({ method: 'DELETE' }),
  );
  if (!res.ok) {
    const error = new Error('Failed to clear conversation') as ApiError;
    error.status = res.status;
    throw error;
  }
}
