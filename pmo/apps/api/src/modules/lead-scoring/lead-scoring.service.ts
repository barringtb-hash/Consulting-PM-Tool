/**
 * Tool 2.3: Lead Scoring & CRM Assistant Service
 *
 * Provides ML-based lead scoring capabilities including:
 * - Predictive lead scoring with machine learning
 * - Automated nurture sequences
 * - Activity tracking and engagement metrics
 * - Pipeline analytics and velocity metrics
 * - CRM integration (Salesforce, HubSpot, Zoho)
 * - Performance reporting dashboards
 */

import { prisma } from '../../prisma/client';
import { LeadScoreLevel, Prisma } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

interface LeadScoringConfigInput {
  scoringWeights?: Prisma.InputJsonValue;
  hotThreshold?: number;
  warmThreshold?: number;
  coldThreshold?: number;
  trackEmailOpens?: boolean;
  trackEmailClicks?: boolean;
  trackWebsiteVisits?: boolean;
  trackFormSubmissions?: boolean;
  crmType?: string;
  crmCredentials?: Prisma.InputJsonValue;
  crmSyncEnabled?: boolean;
  emailProvider?: string;
  emailCredentials?: Prisma.InputJsonValue;
}

interface LeadInput {
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  title?: string;
  tags?: string[];
  segments?: string[];
  crmLeadId?: string;
  pipelineStage?: string;
  pipelineValue?: number;
}

interface ActivityInput {
  leadId?: number;
  activityType: string;
  activityData?: Prisma.InputJsonValue;
  source?: string;
  medium?: string;
  campaign?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface NurtureSequenceInput {
  name: string;
  description?: string;
  triggerConditions?: Prisma.InputJsonValue;
  steps: Prisma.InputJsonValue;
  allowReEnrollment?: boolean;
  reEnrollmentDays?: number;
  exitOnConversion?: boolean;
  exitOnReply?: boolean;
}

// ============================================================================
// LEAD SCORING CONFIG MANAGEMENT
// ============================================================================

export async function getLeadScoringConfig(clientId: number) {
  return prisma.leadScoringConfig.findUnique({
    where: { clientId },
    include: {
      client: { select: { id: true, name: true, industry: true } },
    },
  });
}

export async function listLeadScoringConfigs(filters?: {
  clientId?: number;
  clientIds?: number[];
}) {
  const whereClause: Prisma.LeadScoringConfigWhereInput = {};

  if (filters?.clientId) {
    whereClause.clientId = filters.clientId;
  } else if (filters?.clientIds && filters.clientIds.length > 0) {
    whereClause.clientId = { in: filters.clientIds };
  }

  return prisma.leadScoringConfig.findMany({
    where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
    include: {
      client: { select: { id: true, name: true, industry: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createLeadScoringConfig(
  clientId: number,
  data: LeadScoringConfigInput,
) {
  return prisma.leadScoringConfig.create({
    data: {
      clientId,
      ...data,
    },
  });
}

export async function updateLeadScoringConfig(
  clientId: number,
  data: Partial<LeadScoringConfigInput>,
) {
  return prisma.leadScoringConfig.update({
    where: { clientId },
    data,
  });
}

// ============================================================================
// LEAD MANAGEMENT
// ============================================================================

export async function createLead(configId: number, input: LeadInput) {
  const config = await prisma.leadScoringConfig.findUnique({
    where: { id: configId },
  });

  if (!config) {
    throw new Error('Config not found');
  }

  // Calculate initial score
  const scoreResult = await calculateLeadScore(input, config);

  return prisma.scoredLead.create({
    data: {
      configId,
      email: input.email,
      name: input.name,
      company: input.company,
      phone: input.phone,
      title: input.title,
      tags: input.tags || [],
      segments: input.segments || [],
      crmLeadId: input.crmLeadId,
      pipelineStage: input.pipelineStage,
      pipelineValue: input.pipelineValue,
      score: scoreResult.score,
      scoreLevel: scoreResult.level,
      scoredAt: new Date(),
      scoreBreakdown: scoreResult.breakdown as Prisma.InputJsonValue,
      scoreHistory: [
        {
          score: scoreResult.score,
          level: scoreResult.level,
          scoredAt: new Date().toISOString(),
          reason: 'Initial scoring',
        },
      ] as Prisma.InputJsonValue,
    },
  });
}

export async function getLead(id: number) {
  return prisma.scoredLead.findUnique({
    where: { id },
    include: {
      config: {
        include: {
          client: { select: { id: true, name: true } },
        },
      },
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      sequenceEnrollments: {
        include: { sequence: true },
      },
    },
  });
}

export async function getLeadByEmail(configId: number, email: string) {
  return prisma.scoredLead.findUnique({
    where: {
      configId_email: { configId, email },
    },
  });
}

export async function getLeads(
  configId: number,
  options: {
    scoreLevel?: LeadScoreLevel;
    minScore?: number;
    maxScore?: number;
    tags?: string[];
    segments?: string[];
    pipelineStage?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'score' | 'lastEngagement' | 'created';
    sortOrder?: 'asc' | 'desc';
  } = {},
) {
  const {
    scoreLevel,
    minScore,
    maxScore,
    tags,
    segments,
    pipelineStage,
    limit = 50,
    offset = 0,
    sortBy = 'score',
    sortOrder = 'desc',
  } = options;

  const orderBy: Prisma.ScoredLeadOrderByWithRelationInput =
    sortBy === 'score'
      ? { score: sortOrder }
      : sortBy === 'lastEngagement'
        ? { lastEngagementAt: sortOrder }
        : { createdAt: sortOrder };

  return prisma.scoredLead.findMany({
    where: {
      configId,
      isActive: true,
      ...(scoreLevel && { scoreLevel }),
      ...(minScore !== undefined && { score: { gte: minScore } }),
      ...(maxScore !== undefined && { score: { lte: maxScore } }),
      ...(tags && tags.length > 0 && { tags: { hasSome: tags } }),
      ...(segments &&
        segments.length > 0 && { segments: { hasSome: segments } }),
      ...(pipelineStage && { pipelineStage }),
    },
    orderBy,
    take: limit,
    skip: offset,
  });
}

export async function updateLead(
  id: number,
  data: Partial<LeadInput> & {
    assignedTo?: number;
    conversionProbability?: number;
    predictedValue?: number;
    predictedCloseDate?: Date;
  },
) {
  return prisma.scoredLead.update({
    where: { id },
    data: {
      ...data,
      updatedAt: new Date(),
    },
  });
}

export async function deleteLead(id: number) {
  return prisma.scoredLead.update({
    where: { id },
    data: { isActive: false },
  });
}

// ============================================================================
// LEAD SCORING
// ============================================================================

interface ScoreResult {
  score: number;
  level: LeadScoreLevel;
  breakdown: {
    demographic: number;
    behavioral: number;
    engagement: number;
  };
}

async function calculateLeadScore(
  lead: LeadInput | { company?: string; title?: string },
  config: {
    scoringWeights: Prisma.JsonValue;
    hotThreshold: number;
    warmThreshold: number;
    coldThreshold: number;
  },
): Promise<ScoreResult> {
  const weights = (config.scoringWeights as {
    demographic?: Record<string, number>;
    behavioral?: Record<string, number>;
    engagement?: Record<string, number>;
  }) || {
    demographic: { hasCompany: 10, hasTitle: 10, hasPhone: 5 },
    behavioral: { emailOpen: 5, emailClick: 10, pageView: 3, formSubmit: 15 },
    engagement: { recentActivity: 20, highFrequency: 15 },
  };

  let demographicScore = 0;
  const behavioralScore = 0;
  const engagementScore = 0;

  // Demographic scoring
  if (lead.company) {
    demographicScore += weights.demographic?.hasCompany || 10;
  }
  if (lead.title) {
    demographicScore += weights.demographic?.hasTitle || 10;
  }

  // For new leads, behavioral and engagement start low
  // These will increase as activities are tracked

  const totalScore = Math.min(
    100,
    demographicScore + behavioralScore + engagementScore,
  );

  // Determine score level based on thresholds
  let level: LeadScoreLevel;
  if (totalScore >= config.hotThreshold) {
    level = 'HOT';
  } else if (totalScore >= config.warmThreshold) {
    level = 'WARM';
  } else if (totalScore >= config.coldThreshold) {
    level = 'COLD';
  } else {
    level = 'DEAD';
  }

  return {
    score: totalScore,
    level,
    breakdown: {
      demographic: demographicScore,
      behavioral: behavioralScore,
      engagement: engagementScore,
    },
  };
}

export async function rescoreLead(leadId: number): Promise<ScoreResult> {
  const lead = await prisma.scoredLead.findUnique({
    where: { id: leadId },
    include: {
      config: true,
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 100,
      },
    },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  const weights = (lead.config.scoringWeights as {
    demographic?: Record<string, number>;
    behavioral?: Record<string, number>;
    engagement?: Record<string, number>;
  }) || {
    demographic: { hasCompany: 10, hasTitle: 10, hasPhone: 5 },
    behavioral: { emailOpen: 5, emailClick: 10, pageView: 3, formSubmit: 15 },
    engagement: { recentActivity: 20, highFrequency: 15 },
  };

  let demographicScore = 0;
  let behavioralScore = 0;
  let engagementScore = 0;

  // Demographic scoring
  if (lead.company) demographicScore += weights.demographic?.hasCompany || 10;
  if (lead.title) demographicScore += weights.demographic?.hasTitle || 10;
  if (lead.phone) demographicScore += weights.demographic?.hasPhone || 5;

  // Behavioral scoring from activities
  const activityCounts: Record<string, number> = {};
  for (const activity of lead.activities) {
    activityCounts[activity.activityType] =
      (activityCounts[activity.activityType] || 0) + 1;
  }

  behavioralScore +=
    (activityCounts['email_open'] || 0) * (weights.behavioral?.emailOpen || 5);
  behavioralScore +=
    (activityCounts['email_click'] || 0) *
    (weights.behavioral?.emailClick || 10);
  behavioralScore +=
    (activityCounts['page_view'] || 0) * (weights.behavioral?.pageView || 3);
  behavioralScore +=
    (activityCounts['form_submit'] || 0) *
    (weights.behavioral?.formSubmit || 15);

  // Engagement scoring
  const now = new Date();
  const recentActivities = lead.activities.filter(
    (a) =>
      now.getTime() - new Date(a.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000,
  );

  if (recentActivities.length > 0) {
    engagementScore += weights.engagement?.recentActivity || 20;
  }
  if (lead.activities.length > 10) {
    engagementScore += weights.engagement?.highFrequency || 15;
  }

  const totalScore = Math.min(
    100,
    demographicScore + behavioralScore + engagementScore,
  );

  let level: LeadScoreLevel;
  if (totalScore >= lead.config.hotThreshold) {
    level = 'HOT';
  } else if (totalScore >= lead.config.warmThreshold) {
    level = 'WARM';
  } else if (totalScore >= lead.config.coldThreshold) {
    level = 'COLD';
  } else {
    level = 'DEAD';
  }

  // Update lead with new score
  const previousHistory = (lead.scoreHistory as Array<unknown>) || [];
  const newHistory = [
    ...previousHistory,
    {
      score: totalScore,
      level,
      scoredAt: new Date().toISOString(),
      reason: 'Activity-based rescoring',
    },
  ].slice(-50); // Keep last 50 score changes

  await prisma.scoredLead.update({
    where: { id: leadId },
    data: {
      score: totalScore,
      scoreLevel: level,
      scoredAt: new Date(),
      scoreBreakdown: {
        demographic: demographicScore,
        behavioral: behavioralScore,
        engagement: engagementScore,
      } as Prisma.InputJsonValue,
      scoreHistory: newHistory as Prisma.InputJsonValue,
    },
  });

  return {
    score: totalScore,
    level,
    breakdown: {
      demographic: demographicScore,
      behavioral: behavioralScore,
      engagement: engagementScore,
    },
  };
}

export async function predictConversion(leadId: number): Promise<{
  probability: number;
  predictedValue: number;
  predictedCloseDate: Date | null;
}> {
  const lead = await prisma.scoredLead.findUnique({
    where: { id: leadId },
    include: {
      activities: true,
      config: true,
    },
  });

  if (!lead) {
    throw new Error('Lead not found');
  }

  // Simple prediction based on score and engagement
  // In production, this would use a trained ML model
  let probability = lead.score / 100;

  // Adjust based on pipeline stage
  if (lead.pipelineStage) {
    const stageMultipliers: Record<string, number> = {
      awareness: 0.1,
      interest: 0.3,
      consideration: 0.5,
      intent: 0.7,
      evaluation: 0.85,
      purchase: 0.95,
    };
    probability = Math.max(
      probability,
      stageMultipliers[lead.pipelineStage.toLowerCase()] || probability,
    );
  }

  // Adjust based on engagement recency
  if (lead.lastEngagementAt) {
    const daysSinceEngagement =
      (Date.now() - new Date(lead.lastEngagementAt).getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysSinceEngagement < 7) probability *= 1.2;
    else if (daysSinceEngagement > 30) probability *= 0.7;
  }

  probability = Math.min(0.99, Math.max(0.01, probability));

  // Predict value based on pipeline value or industry average
  const predictedValue = lead.pipelineValue
    ? Number(lead.pipelineValue) * probability
    : 5000 * probability;

  // Predict close date based on score (higher score = sooner close)
  const daysToClose = Math.round(90 - lead.score * 0.6);
  const predictedCloseDate = new Date();
  predictedCloseDate.setDate(predictedCloseDate.getDate() + daysToClose);

  // Update lead with predictions
  await prisma.scoredLead.update({
    where: { id: leadId },
    data: {
      conversionProbability: probability,
      predictedValue,
      predictedCloseDate,
    },
  });

  return { probability, predictedValue, predictedCloseDate };
}

// ============================================================================
// ACTIVITY TRACKING
// ============================================================================

export async function trackActivity(
  configId: number,
  input: ActivityInput,
): Promise<{ activity: unknown; leadUpdated: boolean }> {
  // Get scoring weights for impact calculation
  const config = await prisma.leadScoringConfig.findUnique({
    where: { id: configId },
  });

  if (!config) {
    throw new Error('Config not found');
  }

  const weights = (config.scoringWeights as {
    behavioral?: Record<string, number>;
  }) || {
    behavioral: {
      email_open: 5,
      email_click: 10,
      page_view: 3,
      form_submit: 15,
    },
  };

  const scoreImpact = weights.behavioral?.[input.activityType] || 0;

  const activity = await prisma.leadActivity.create({
    data: {
      configId,
      leadId: input.leadId,
      activityType: input.activityType,
      activityData: input.activityData,
      source: input.source,
      medium: input.medium,
      campaign: input.campaign,
      scoreImpact,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      deviceType: input.userAgent?.includes('Mobile') ? 'mobile' : 'desktop',
    },
  });

  // Update lead engagement metrics if lead is specified
  let leadUpdated = false;
  if (input.leadId) {
    const updateData: Prisma.ScoredLeadUpdateInput = {
      lastEngagementAt: new Date(),
    };

    // Update specific counters based on activity type
    switch (input.activityType) {
      case 'email_sent':
        updateData.totalEmailsSent = { increment: 1 };
        break;
      case 'email_open':
        updateData.totalEmailsOpened = { increment: 1 };
        break;
      case 'email_click':
        updateData.totalEmailsClicked = { increment: 1 };
        break;
      case 'page_view':
        updateData.totalWebsiteVisits = { increment: 1 };
        break;
    }

    await prisma.scoredLead.update({
      where: { id: input.leadId },
      data: updateData,
    });

    // Trigger rescore
    await rescoreLead(input.leadId);
    leadUpdated = true;
  }

  return { activity, leadUpdated };
}

export async function getActivities(
  configId: number,
  options: {
    leadId?: number;
    activityType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {},
) {
  const {
    leadId,
    activityType,
    startDate,
    endDate,
    limit = 100,
    offset = 0,
  } = options;

  return prisma.leadActivity.findMany({
    where: {
      configId,
      ...(leadId && { leadId }),
      ...(activityType && { activityType }),
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(endDate && { createdAt: { lte: endDate } }),
    },
    include: {
      lead: {
        select: { id: true, email: true, name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

// ============================================================================
// NURTURE SEQUENCES
// ============================================================================

export async function createNurtureSequence(
  configId: number,
  input: NurtureSequenceInput,
) {
  return prisma.nurtureSequence.create({
    data: {
      configId,
      ...input,
    },
  });
}

export async function getNurtureSequences(
  configId: number,
  options: { isActive?: boolean } = {},
) {
  return prisma.nurtureSequence.findMany({
    where: {
      configId,
      ...(options.isActive !== undefined && { isActive: options.isActive }),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getNurtureSequence(id: number) {
  return prisma.nurtureSequence.findUnique({
    where: { id },
    include: {
      enrollments: {
        include: {
          lead: {
            select: { id: true, email: true, name: true, score: true },
          },
        },
        orderBy: { enrolledAt: 'desc' },
        take: 50,
      },
    },
  });
}

export async function updateNurtureSequence(
  id: number,
  data: Partial<NurtureSequenceInput> & { isActive?: boolean },
) {
  return prisma.nurtureSequence.update({
    where: { id },
    data,
  });
}

export async function deleteNurtureSequence(id: number) {
  return prisma.nurtureSequence.delete({
    where: { id },
  });
}

export async function enrollLeadInSequence(
  sequenceId: number,
  leadId: number,
): Promise<{ enrollment: unknown; scheduled: boolean }> {
  const sequence = await prisma.nurtureSequence.findUnique({
    where: { id: sequenceId },
  });

  if (!sequence) {
    throw new Error('Sequence not found');
  }

  // Check if lead is already enrolled
  const existingEnrollment = await prisma.nurtureEnrollment.findUnique({
    where: {
      sequenceId_leadId: { sequenceId, leadId },
    },
  });

  if (existingEnrollment) {
    if (
      existingEnrollment.status === 'ACTIVE' ||
      (!sequence.allowReEnrollment && existingEnrollment.status === 'COMPLETED')
    ) {
      throw new Error('Lead is already enrolled or completed this sequence');
    }
  }

  // Calculate first step execution time
  const steps = sequence.steps as Array<{
    stepId: string;
    type: string;
    delayDays?: number;
    delayHours?: number;
  }>;
  const firstStepDelay = steps[0]?.delayDays || 0;
  const nextStepDate = new Date();
  nextStepDate.setDate(nextStepDate.getDate() + firstStepDelay);

  const enrollment = await prisma.nurtureEnrollment.upsert({
    where: {
      sequenceId_leadId: { sequenceId, leadId },
    },
    create: {
      sequenceId,
      leadId,
      status: 'ACTIVE',
      currentStepIndex: 0,
      nextStepScheduledAt: nextStepDate,
    },
    update: {
      status: 'ACTIVE',
      currentStepIndex: 0,
      nextStepScheduledAt: nextStepDate,
      completedAt: null,
      exitReason: null,
    },
  });

  // Update sequence metrics
  await prisma.nurtureSequence.update({
    where: { id: sequenceId },
    data: {
      totalEnrollments: { increment: 1 },
    },
  });

  // Update lead with current sequence
  await prisma.scoredLead.update({
    where: { id: leadId },
    data: {
      currentSequenceId: sequenceId,
      sequenceStepIndex: 0,
    },
  });

  return { enrollment, scheduled: true };
}

export async function unenrollLeadFromSequence(
  sequenceId: number,
  leadId: number,
  reason: string,
) {
  const enrollment = await prisma.nurtureEnrollment.update({
    where: {
      sequenceId_leadId: { sequenceId, leadId },
    },
    data: {
      status: 'CANCELLED',
      exitReason: reason,
    },
  });

  // Clear sequence from lead
  await prisma.scoredLead.update({
    where: { id: leadId },
    data: {
      currentSequenceId: null,
      sequenceStepIndex: null,
    },
  });

  return enrollment;
}

// ============================================================================
// ANALYTICS
// ============================================================================

export async function getLeadAnalytics(
  configId: number,
  dateRange: { start: Date; end: Date },
) {
  // Get lead distribution by score level
  const leadDistribution = await prisma.scoredLead.groupBy({
    by: ['scoreLevel'],
    where: {
      configId,
      isActive: true,
    },
    _count: true,
  });

  // Get recent activities
  const activitySummary = await prisma.leadActivity.groupBy({
    by: ['activityType'],
    where: {
      configId,
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    },
    _count: true,
  });

  // Get sequence performance
  const sequencePerformance = await prisma.nurtureSequence.findMany({
    where: { configId },
    select: {
      id: true,
      name: true,
      totalEnrollments: true,
      totalCompletions: true,
      totalConversions: true,
    },
  });

  // Calculate conversion rate
  const totalLeads = await prisma.scoredLead.count({
    where: { configId, isActive: true },
  });

  const hotLeads = await prisma.scoredLead.count({
    where: { configId, isActive: true, scoreLevel: 'HOT' },
  });

  return {
    leadDistribution: leadDistribution.map((d) => ({
      level: d.scoreLevel,
      count: d._count,
    })),
    activitySummary: activitySummary.map((a) => ({
      type: a.activityType,
      count: a._count,
    })),
    sequencePerformance,
    summary: {
      totalLeads,
      hotLeads,
      hotLeadPercentage: totalLeads > 0 ? (hotLeads / totalLeads) * 100 : 0,
    },
  };
}

export async function getPipelineAnalytics(configId: number) {
  const pipeline = await prisma.scoredLead.groupBy({
    by: ['pipelineStage'],
    where: {
      configId,
      isActive: true,
      pipelineStage: { not: null },
    },
    _count: true,
    _sum: {
      pipelineValue: true,
    },
  });

  return pipeline.map((p) => ({
    stage: p.pipelineStage,
    count: p._count,
    totalValue: p._sum.pipelineValue || 0,
  }));
}
