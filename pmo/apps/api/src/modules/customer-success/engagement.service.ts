/**
 * Engagement Tracking Service
 *
 * Tracks and analyzes customer engagement for the Customer Success Platform.
 * Monitors contact interactions, meeting attendance, and response patterns.
 */

import { Prisma, EngagementLevel, CSActivityType } from '@prisma/client';
import prisma from '../../prisma/client';

export interface ContactEngagementInput {
  contactId: number;
  lastContactDate?: Date;
  meetingAttendance?: number;
  responseTime?: number;
  engagementLevel?: EngagementLevel;
  isChampion?: boolean;
  isDecisionMaker?: boolean;
  isEconomicBuyer?: boolean;
  influence?: string;
  contactFrequency?: string;
  notes?: string;
}

export interface EngagementSummary {
  totalContacts: number;
  champions: number;
  decisionMakers: number;
  engaged: number;
  neutral: number;
  disengaged: number;
  atRisk: number;
  avgMeetingAttendance: number;
  avgResponseTime: number;
}

export interface ActivityLogInput {
  clientId: number;
  projectId?: number;
  contactId?: number;
  userId?: number;
  activityType: CSActivityType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  sentiment?: string;
  sentimentScore?: number;
}

/**
 * Calculate engagement level based on metrics
 */
function calculateEngagementLevel(
  meetingAttendance: number | null,
  responseTime: number | null,
  lastContactDate: Date | null,
): EngagementLevel {
  let score = 0;

  // Score based on meeting attendance (0-40 points)
  if (meetingAttendance !== null) {
    if (meetingAttendance >= 0.9) score += 40;
    else if (meetingAttendance >= 0.7) score += 30;
    else if (meetingAttendance >= 0.5) score += 20;
    else if (meetingAttendance >= 0.3) score += 10;
  }

  // Score based on response time (0-30 points) - lower is better
  if (responseTime !== null) {
    if (responseTime <= 4)
      score += 30; // Within 4 hours
    else if (responseTime <= 24)
      score += 20; // Within 24 hours
    else if (responseTime <= 72) score += 10; // Within 3 days
  }

  // Score based on recency of contact (0-30 points)
  if (lastContactDate !== null) {
    const daysSinceContact = Math.floor(
      (Date.now() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceContact <= 7)
      score += 30; // Within a week
    else if (daysSinceContact <= 14)
      score += 20; // Within two weeks
    else if (daysSinceContact <= 30) score += 10; // Within a month
  }

  // Map score to engagement level
  if (score >= 80) return 'CHAMPION';
  if (score >= 60) return 'ENGAGED';
  if (score >= 40) return 'NEUTRAL';
  if (score >= 20) return 'DISENGAGED';
  return 'AT_RISK';
}

/**
 * Get or create contact engagement record
 */
export async function getOrCreateContactEngagement(contactId: number): Promise<{
  id: number;
  contactId: number;
  engagementLevel: EngagementLevel;
  isChampion: boolean;
  isDecisionMaker: boolean;
  isEconomicBuyer: boolean;
  influence: string | null;
  lastContactDate: Date | null;
  contactFrequency: string | null;
  responseTime: number | null;
  meetingAttendance: number | null;
  lastSentiment: string | null;
  npsScore: number | null;
  notes: string | null;
}> {
  const existing = await prisma.contactEngagement.findUnique({
    where: { contactId },
  });

  if (existing) {
    return existing;
  }

  const newEngagement = await prisma.contactEngagement.create({
    data: {
      contactId,
      engagementLevel: 'NEUTRAL',
    },
  });

  return newEngagement;
}

/**
 * Update contact engagement metrics
 */
export async function updateContactEngagement(
  contactId: number,
  input: Partial<ContactEngagementInput>,
): Promise<{
  id: number;
  contactId: number;
  engagementLevel: EngagementLevel;
}> {
  // Get existing or create new
  await getOrCreateContactEngagement(contactId);

  // Calculate new engagement level if metrics changed
  let engagementLevel = input.engagementLevel;
  if (
    input.meetingAttendance !== undefined ||
    input.responseTime !== undefined ||
    input.lastContactDate !== undefined
  ) {
    const current = await prisma.contactEngagement.findUnique({
      where: { contactId },
    });

    const meetingAttendance =
      input.meetingAttendance ?? current?.meetingAttendance ?? null;
    const responseTime = input.responseTime ?? current?.responseTime ?? null;
    const lastContactDate =
      input.lastContactDate ?? current?.lastContactDate ?? null;

    engagementLevel = calculateEngagementLevel(
      meetingAttendance,
      responseTime,
      lastContactDate,
    );
  }

  const updated = await prisma.contactEngagement.update({
    where: { contactId },
    data: {
      ...(input.lastContactDate && { lastContactDate: input.lastContactDate }),
      ...(input.meetingAttendance !== undefined && {
        meetingAttendance: input.meetingAttendance,
      }),
      ...(input.responseTime !== undefined && {
        responseTime: input.responseTime,
      }),
      ...(input.isChampion !== undefined && { isChampion: input.isChampion }),
      ...(input.isDecisionMaker !== undefined && {
        isDecisionMaker: input.isDecisionMaker,
      }),
      ...(input.isEconomicBuyer !== undefined && {
        isEconomicBuyer: input.isEconomicBuyer,
      }),
      ...(input.influence && { influence: input.influence }),
      ...(input.contactFrequency && {
        contactFrequency: input.contactFrequency,
      }),
      ...(input.notes && { notes: input.notes }),
      engagementLevel,
    },
  });

  return updated;
}

/**
 * Record an interaction with a contact
 */
export async function recordInteraction(contactId: number): Promise<void> {
  await getOrCreateContactEngagement(contactId);

  await prisma.contactEngagement.update({
    where: { contactId },
    data: {
      lastContactDate: new Date(),
    },
  });
}

/**
 * Get engagement summary for a client
 */
export async function getClientEngagementSummary(
  clientId: number,
): Promise<EngagementSummary> {
  const contacts = await prisma.contact.findMany({
    where: { clientId },
    include: {
      engagement: true,
    },
  });

  const engagements = contacts
    .map((c) => c.engagement)
    .filter((e): e is NonNullable<typeof e> => e !== null);

  const totalContacts = contacts.length;
  const champions = engagements.filter((e) => e.isChampion).length;
  const decisionMakers = engagements.filter((e) => e.isDecisionMaker).length;

  const engaged = engagements.filter(
    (e) => e.engagementLevel === 'CHAMPION' || e.engagementLevel === 'ENGAGED',
  ).length;
  const neutral = engagements.filter(
    (e) => e.engagementLevel === 'NEUTRAL',
  ).length;
  const disengaged = engagements.filter(
    (e) => e.engagementLevel === 'DISENGAGED',
  ).length;
  const atRisk = engagements.filter(
    (e) => e.engagementLevel === 'AT_RISK',
  ).length;

  const attendanceRates = engagements
    .map((e) => e.meetingAttendance)
    .filter((r): r is number => r !== null);
  const avgMeetingAttendance =
    attendanceRates.length > 0
      ? Math.round(
          (attendanceRates.reduce((a, b) => a + b, 0) /
            attendanceRates.length) *
            100,
        ) / 100
      : 0;

  const responseTimes = engagements
    .map((e) => e.responseTime)
    .filter((r): r is number => r !== null);
  const avgResponseTime =
    responseTimes.length > 0
      ? Math.round(
          responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
        )
      : 0;

  return {
    totalContacts,
    champions,
    decisionMakers,
    engaged,
    neutral,
    disengaged,
    atRisk,
    avgMeetingAttendance,
    avgResponseTime,
  };
}

/**
 * List contact engagements with filtering
 */
export async function listContactEngagements(options: {
  clientId?: number;
  engagementLevel?: EngagementLevel;
  isChampion?: boolean;
  isDecisionMaker?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{
  data: Array<{
    id: number;
    contact: { id: number; name: string; email: string; role: string | null };
    engagementLevel: EngagementLevel;
    lastContactDate: Date | null;
    isChampion: boolean;
    isDecisionMaker: boolean;
    meetingAttendance: number | null;
    responseTime: number | null;
  }>;
  total: number;
}> {
  const where: Prisma.ContactEngagementWhereInput = {
    ...(options.engagementLevel && {
      engagementLevel: options.engagementLevel,
    }),
    ...(options.isChampion !== undefined && { isChampion: options.isChampion }),
    ...(options.isDecisionMaker !== undefined && {
      isDecisionMaker: options.isDecisionMaker,
    }),
    ...(options.clientId && {
      contact: { clientId: options.clientId },
    }),
  };

  const [data, total] = await Promise.all([
    prisma.contactEngagement.findMany({
      where,
      include: {
        contact: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
      orderBy: { lastContactDate: 'desc' },
    }),
    prisma.contactEngagement.count({ where }),
  ]);

  return {
    data: data.map((e) => ({
      id: e.id,
      contact: e.contact,
      engagementLevel: e.engagementLevel,
      lastContactDate: e.lastContactDate,
      isChampion: e.isChampion,
      isDecisionMaker: e.isDecisionMaker,
      meetingAttendance: e.meetingAttendance,
      responseTime: e.responseTime,
    })),
    total,
  };
}

/**
 * Log a customer success activity
 */
export async function logActivity(
  input: ActivityLogInput,
): Promise<{ id: number }> {
  const activity = await prisma.cSActivityLog.create({
    data: {
      clientId: input.clientId,
      projectId: input.projectId,
      contactId: input.contactId,
      userId: input.userId,
      activityType: input.activityType,
      title: input.title,
      description: input.description,
      metadata: input.metadata as Prisma.InputJsonValue,
      sentiment: input.sentiment,
      sentimentScore: input.sentimentScore,
      activityDate: new Date(),
    },
  });

  // If contact was involved, record the interaction
  if (input.contactId) {
    await recordInteraction(input.contactId);
  }

  return { id: activity.id };
}

/**
 * Get activity timeline for a client
 */
export async function getActivityTimeline(
  clientId: number,
  options?: {
    projectId?: number;
    contactId?: number;
    activityTypes?: CSActivityType[];
    limit?: number;
    offset?: number;
  },
): Promise<{
  data: Array<{
    id: number;
    activityType: CSActivityType;
    title: string;
    description: string | null;
    activityDate: Date;
    contact: { id: number; name: string } | null;
    user: { id: number; name: string } | null;
    sentiment: string | null;
  }>;
  total: number;
}> {
  const where: Prisma.CSActivityLogWhereInput = {
    clientId,
    ...(options?.projectId && { projectId: options.projectId }),
    ...(options?.contactId && { contactId: options.contactId }),
    ...(options?.activityTypes &&
      options.activityTypes.length > 0 && {
        activityType: { in: options.activityTypes },
      }),
  };

  const [data, total] = await Promise.all([
    prisma.cSActivityLog.findMany({
      where,
      include: {
        contact: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
      orderBy: { activityDate: 'desc' },
    }),
    prisma.cSActivityLog.count({ where }),
  ]);

  return {
    data: data.map((a) => ({
      id: a.id,
      activityType: a.activityType,
      title: a.title,
      description: a.description,
      activityDate: a.activityDate,
      contact: a.contact,
      user: a.user,
      sentiment: a.sentiment,
    })),
    total,
  };
}

/**
 * Mark a contact as champion
 */
export async function setChampionStatus(
  contactId: number,
  isChampion: boolean,
): Promise<void> {
  await getOrCreateContactEngagement(contactId);
  await prisma.contactEngagement.update({
    where: { contactId },
    data: { isChampion },
  });
}

/**
 * Mark a contact as decision maker
 */
export async function setDecisionMakerStatus(
  contactId: number,
  isDecisionMaker: boolean,
): Promise<void> {
  await getOrCreateContactEngagement(contactId);
  await prisma.contactEngagement.update({
    where: { contactId },
    data: { isDecisionMaker },
  });
}

/**
 * Get recent activities across all clients for a user
 */
export async function getRecentActivities(
  userId: number,
  limit: number = 20,
): Promise<
  Array<{
    id: number;
    activityType: CSActivityType;
    title: string;
    activityDate: Date;
    client: { id: number; name: string };
  }>
> {
  // Get activities for clients that the user has success plans for
  const activities = await prisma.cSActivityLog.findMany({
    where: {
      client: {
        successPlans: {
          some: { ownerId: userId },
        },
      },
    },
    include: {
      client: { select: { id: true, name: true } },
    },
    orderBy: { activityDate: 'desc' },
    take: limit,
  });

  return activities.map((a) => ({
    id: a.id,
    activityType: a.activityType,
    title: a.title,
    activityDate: a.activityDate,
    client: a.client,
  }));
}
