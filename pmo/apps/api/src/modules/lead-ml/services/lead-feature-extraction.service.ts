/**
 * Lead Feature Extraction Service
 *
 * Extracts features from lead data for ML predictions.
 * Features are organized into categories: demographic, behavioral, temporal, engagement, and text.
 *
 * @module lead-ml/services
 */

import { prisma } from '../../../prisma/client';
import type {
  LeadActivity,
  ScoredLead,
  NurtureEnrollment,
  NurtureSequence,
} from '@prisma/client';
import type {
  LeadFeatures,
  DemographicFeatures,
  BehavioralFeatures,
  TemporalFeatures,
  EngagementFeatures,
  TextFeatures,
  EmailDomainType,
  TitleSeniority,
  CompanySizeEstimate,
  TimePattern,
  DayPattern,
} from '../types';

// ============================================================================
// Constants
// ============================================================================

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'aol.com',
  'icloud.com',
  'mail.com',
  'protonmail.com',
  'zoho.com',
  'yandex.com',
  'gmx.com',
  'live.com',
]);

const EDU_DOMAIN_PATTERN = /\.edu$/i;
const GOV_DOMAIN_PATTERN = /\.gov$/i;

const C_LEVEL_TITLES = /\b(ceo|cto|cfo|cio|coo|cmo|chief|founder|president)\b/i;
const VP_TITLES = /\b(vp|vice president|svp|evp)\b/i;
const DIRECTOR_TITLES = /\b(director|head of)\b/i;
const MANAGER_TITLES = /\b(manager|lead|supervisor|team lead)\b/i;

const ENTERPRISE_KEYWORDS =
  /\b(enterprise|corporation|inc\.|corp\.|holdings|international|global)\b/i;
const SMB_KEYWORDS = /\b(llc|studio|shop|consulting|freelance|solo)\b/i;

// ============================================================================
// Demographic Feature Extraction
// ============================================================================

/**
 * Classify email domain type
 */
function classifyEmailDomain(email: string): EmailDomainType {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return 'unknown';

  if (FREE_EMAIL_DOMAINS.has(domain)) return 'free';
  if (EDU_DOMAIN_PATTERN.test(domain)) return 'edu';
  if (GOV_DOMAIN_PATTERN.test(domain)) return 'government';

  return 'corporate';
}

/**
 * Classify title seniority
 */
function classifyTitleSeniority(title: string | null): TitleSeniority {
  if (!title) return 'unknown';

  const titleLower = title.toLowerCase();

  if (C_LEVEL_TITLES.test(titleLower)) return 'c_level';
  if (VP_TITLES.test(titleLower)) return 'vp';
  if (DIRECTOR_TITLES.test(titleLower)) return 'director';
  if (MANAGER_TITLES.test(titleLower)) return 'manager';

  return 'individual';
}

/**
 * Estimate company size from company name
 */
function estimateCompanySize(company: string | null): CompanySizeEstimate {
  if (!company) return 'unknown';

  if (ENTERPRISE_KEYWORDS.test(company)) return 'enterprise';
  if (SMB_KEYWORDS.test(company)) return 'smb';

  // Heuristic: longer company names tend to be larger companies
  if (company.length > 30) return 'mid_market';
  if (company.length < 10) return 'startup';

  return 'mid_market';
}

/**
 * Extract demographic features from lead
 */
export function extractDemographicFeatures(lead: {
  email: string;
  name: string | null;
  company: string | null;
  phone: string | null;
  title: string | null;
}): DemographicFeatures {
  const domain = lead.email.split('@')[1] || null;

  return {
    hasCompany: !!lead.company && lead.company.trim().length > 0,
    hasTitle: !!lead.title && lead.title.trim().length > 0,
    hasPhone: !!lead.phone && lead.phone.trim().length > 0,
    emailDomainType: classifyEmailDomain(lead.email),
    titleSeniority: classifyTitleSeniority(lead.title),
    companySizeEstimate: estimateCompanySize(lead.company),
    emailDomain: domain,
  };
}

// ============================================================================
// Behavioral Feature Extraction
// ============================================================================

/**
 * Extract behavioral features from activities
 */
export function extractBehavioralFeatures(
  activities: Array<{
    activityType: string;
    createdAt: Date;
  }>,
  daysSinceCreated: number,
): BehavioralFeatures {
  const counts: Record<string, number> = {
    email_open: 0,
    email_click: 0,
    page_view: 0,
    form_submit: 0,
    meeting: 0,
    call: 0,
  };

  const activityTypes = new Set<string>();

  for (const activity of activities) {
    const type = activity.activityType.toLowerCase();
    activityTypes.add(type);

    if (type.includes('open') || type === 'email_open') {
      counts.email_open++;
    } else if (type.includes('click') || type === 'email_click') {
      counts.email_click++;
    } else if (type.includes('view') || type === 'page_view') {
      counts.page_view++;
    } else if (type.includes('submit') || type === 'form_submit') {
      counts.form_submit++;
    } else if (type.includes('meeting')) {
      counts.meeting++;
    } else if (type.includes('call')) {
      counts.call++;
    }
  }

  const totalActivities = activities.length;
  const daysActive = Math.max(1, daysSinceCreated);
  const activityVelocity = totalActivities / daysActive;

  return {
    emailOpenCount: counts.email_open,
    emailClickCount: counts.email_click,
    pageViewCount: counts.page_view,
    formSubmitCount: counts.form_submit,
    meetingCount: counts.meeting,
    callCount: counts.call,
    activityVelocity,
    channelDiversity: activityTypes.size,
    highValueActionCount:
      counts.form_submit + counts.email_click + counts.meeting,
    totalActivities,
  };
}

// ============================================================================
// Temporal Feature Extraction
// ============================================================================

/**
 * Calculate exponential decay recency score
 */
function calculateRecencyScore(daysSinceLastActivity: number): number {
  // Exponential decay with half-life of 7 days
  const halfLife = 7;
  const decay = Math.pow(0.5, daysSinceLastActivity / halfLife);
  return Math.round(decay * 100);
}

/**
 * Detect activity burst (3+ activities in 24h)
 */
function detectActivityBurst(activities: Array<{ createdAt: Date }>): boolean {
  if (activities.length < 3) return false;

  // Group activities by day
  const byDay = new Map<string, number>();
  for (const activity of activities) {
    const day = activity.createdAt.toISOString().split('T')[0];
    byDay.set(day, (byDay.get(day) || 0) + 1);
  }

  // Check if any day has 3+ activities
  let hasBurst = false;
  byDay.forEach((count) => {
    if (count >= 3) hasBurst = true;
  });

  return hasBurst;
}

/**
 * Detect activity time pattern
 */
function detectTimePattern(
  activities: Array<{ createdAt: Date }>,
): TimePattern {
  if (activities.length === 0) return 'mixed';

  let businessHours = 0;
  let afterHours = 0;

  for (const activity of activities) {
    const hour = activity.createdAt.getHours();
    if (hour >= 9 && hour <= 17) {
      businessHours++;
    } else {
      afterHours++;
    }
  }

  const ratio = businessHours / (businessHours + afterHours);
  if (ratio > 0.7) return 'business_hours';
  if (ratio < 0.3) return 'after_hours';
  return 'mixed';
}

/**
 * Detect activity day pattern
 */
function detectDayPattern(activities: Array<{ createdAt: Date }>): DayPattern {
  if (activities.length === 0) return 'mixed';

  let weekday = 0;
  let weekend = 0;

  for (const activity of activities) {
    const day = activity.createdAt.getDay();
    if (day === 0 || day === 6) {
      weekend++;
    } else {
      weekday++;
    }
  }

  const ratio = weekday / (weekday + weekend);
  if (ratio > 0.8) return 'weekday';
  if (ratio < 0.2) return 'weekend';
  return 'mixed';
}

/**
 * Extract temporal features
 */
export function extractTemporalFeatures(
  lead: { createdAt: Date },
  activities: Array<{ createdAt: Date }>,
  lastEngagementAt: Date | null,
): TemporalFeatures {
  const now = new Date();
  const daysSinceCreated = Math.floor(
    (now.getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  const daysSinceLastActivity = lastEngagementAt
    ? Math.floor(
        (now.getTime() - lastEngagementAt.getTime()) / (1000 * 60 * 60 * 24),
      )
    : daysSinceCreated;

  return {
    daysSinceCreated,
    daysSinceLastActivity,
    recencyScore: calculateRecencyScore(daysSinceLastActivity),
    activityBurst: detectActivityBurst(activities),
    dayPattern: detectDayPattern(activities),
    timePattern: detectTimePattern(activities),
    leadAgeWeeks: Math.floor(daysSinceCreated / 7),
  };
}

// ============================================================================
// Engagement Feature Extraction
// ============================================================================

/**
 * Extract engagement features
 */
export function extractEngagementFeatures(
  lead: {
    totalEmailsSent: number;
    totalEmailsOpened: number;
    totalEmailsClicked: number;
    totalWebsiteVisits: number;
    currentSequenceId: number | null;
    sequenceStepIndex: number | null;
  },
  enrollment: {
    isEnrolled: boolean;
    totalSteps: number | null;
  } | null,
): EngagementFeatures {
  const emailsSent = lead.totalEmailsSent || 0;
  const emailsOpened = lead.totalEmailsOpened || 0;
  const emailsClicked = lead.totalEmailsClicked || 0;

  const emailOpenRate = emailsSent > 0 ? emailsOpened / emailsSent : 0;
  const emailClickRate = emailsOpened > 0 ? emailsClicked / emailsOpened : 0;

  // Calculate sequence engagement
  let sequenceEngagement = 0;
  if (
    enrollment?.isEnrolled &&
    enrollment.totalSteps &&
    lead.sequenceStepIndex !== null
  ) {
    sequenceEngagement = (lead.sequenceStepIndex + 1) / enrollment.totalSteps;
  }

  // Total engagement score (0-100)
  const totalEngagementScore = Math.min(
    100,
    Math.round(
      emailOpenRate * 30 +
        emailClickRate * 40 +
        sequenceEngagement * 20 +
        (lead.totalWebsiteVisits > 0 ? 10 : 0),
    ),
  );

  return {
    totalEngagementScore,
    emailOpenRate,
    emailClickRate,
    sequenceEngagement,
    avgResponseTime: null, // Would need response tracking to calculate
    isInActiveSequence: !!enrollment?.isEnrolled,
    currentSequenceStep: lead.sequenceStepIndex,
  };
}

// ============================================================================
// Text Feature Extraction
// ============================================================================

/**
 * Extract text features (basic, without LLM)
 */
export function extractTextFeatures(message: string | null): TextFeatures {
  const hasMessage = !!message && message.trim().length > 0;
  const messageLength = message?.trim().length || 0;

  // Basic sentiment heuristics (real implementation would use LLM)
  let messageSentiment: TextFeatures['messageSentiment'] = null;
  let messageIntent: TextFeatures['messageIntent'] = null;
  let urgencyLevel: TextFeatures['urgencyLevel'] = null;

  if (hasMessage && message) {
    const lowerMessage = message.toLowerCase();

    // Basic sentiment detection
    if (/excited|interested|love|great|amazing|thank/i.test(message)) {
      messageSentiment = 'positive';
    } else if (/issue|problem|frustrated|disappointed|cancel/i.test(message)) {
      messageSentiment = 'negative';
    } else {
      messageSentiment = 'neutral';
    }

    // Basic intent detection
    if (/demo|demonstration|see it in action/i.test(lowerMessage)) {
      messageIntent = 'demo_request';
    } else if (/price|pricing|cost|quote|budget/i.test(lowerMessage)) {
      messageIntent = 'pricing';
    } else if (/help|support|issue|problem|bug/i.test(lowerMessage)) {
      messageIntent = 'support';
    } else if (/partner|integrate|collaboration/i.test(lowerMessage)) {
      messageIntent = 'partnership';
    } else {
      messageIntent = 'inquiry';
    }

    // Basic urgency detection
    if (/urgent|asap|immediately|right away|today/i.test(lowerMessage)) {
      urgencyLevel = 'high';
    } else if (/soon|this week|next week/i.test(lowerMessage)) {
      urgencyLevel = 'medium';
    } else {
      urgencyLevel = 'low';
    }
  }

  return {
    messageSentiment,
    messageIntent,
    topicTags: [], // Would be extracted by LLM
    urgencyLevel,
    hasMessage,
    messageLength,
  };
}

// ============================================================================
// Complete Feature Extraction
// ============================================================================

/**
 * Extract all features for a lead
 */
export async function extractLeadFeatures(
  leadId: number,
): Promise<LeadFeatures> {
  // Fetch lead with activities and enrollments
  const lead = await prisma.scoredLead.findUnique({
    where: { id: leadId },
    include: {
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 100,
      },
      sequenceEnrollments: {
        where: { status: 'ACTIVE' },
        include: {
          sequence: {
            select: { steps: true },
          },
        },
        take: 1,
      },
    },
  });

  if (!lead) {
    throw new Error(`Lead not found: ${leadId}`);
  }

  const activities = lead.activities || [];
  const enrollment = lead.sequenceEnrollments?.[0];

  // Extract all feature categories
  const demographic = extractDemographicFeatures(lead);

  const daysSinceCreated = Math.floor(
    (Date.now() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );
  const behavioral = extractBehavioralFeatures(activities, daysSinceCreated);

  const temporal = extractTemporalFeatures(
    lead,
    activities,
    lead.lastEngagementAt,
  );

  // Get sequence info for engagement features
  let enrollmentInfo: {
    isEnrolled: boolean;
    totalSteps: number | null;
  } | null = null;
  if (enrollment) {
    const steps = enrollment.sequence.steps as unknown[];
    enrollmentInfo = {
      isEnrolled: true,
      totalSteps: Array.isArray(steps) ? steps.length : null,
    };
  }

  const engagement = extractEngagementFeatures(lead, enrollmentInfo);

  // Text features would need message from original lead
  // For now, return empty text features
  const text = extractTextFeatures(null);

  return {
    demographic,
    behavioral,
    temporal,
    engagement,
    text,
  };
}

/**
 * Extract features for a lead with provided context
 */
export function extractFeaturesFromContext(
  lead: ScoredLead,
  activities: LeadActivity[],
  enrollment: (NurtureEnrollment & { sequence: NurtureSequence }) | null,
): LeadFeatures {
  const demographic = extractDemographicFeatures(lead);

  const daysSinceCreated = Math.floor(
    (Date.now() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );
  const behavioral = extractBehavioralFeatures(activities, daysSinceCreated);

  const temporal = extractTemporalFeatures(
    lead,
    activities,
    lead.lastEngagementAt,
  );

  let enrollmentInfo: {
    isEnrolled: boolean;
    totalSteps: number | null;
  } | null = null;
  if (enrollment) {
    const steps = enrollment.sequence.steps as unknown[];
    enrollmentInfo = {
      isEnrolled: true,
      totalSteps: Array.isArray(steps) ? steps.length : null,
    };
  }

  const engagement = extractEngagementFeatures(lead, enrollmentInfo);
  const text = extractTextFeatures(null);

  return {
    demographic,
    behavioral,
    temporal,
    engagement,
    text,
  };
}

/**
 * Batch extract features for multiple leads
 */
export async function extractLeadFeaturesBatch(
  leadIds: number[],
): Promise<Map<number, LeadFeatures>> {
  const results = new Map<number, LeadFeatures>();

  for (const leadId of leadIds) {
    try {
      const features = await extractLeadFeatures(leadId);
      results.set(leadId, features);
    } catch (error) {
      console.error(`Failed to extract features for lead ${leadId}:`, error);
    }
  }

  return results;
}
