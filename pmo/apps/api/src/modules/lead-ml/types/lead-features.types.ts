/**
 * Lead ML Feature Types
 *
 * Type definitions for feature engineering in lead ML predictions.
 * Features are extracted from lead data for scoring and predictions.
 *
 * @module lead-ml/types
 */

// ============================================================================
// Demographic Features
// ============================================================================

/**
 * Email domain classification
 */
export type EmailDomainType =
  | 'corporate'
  | 'free'
  | 'edu'
  | 'government'
  | 'unknown';

/**
 * Title seniority classification
 */
export type TitleSeniority =
  | 'c_level'
  | 'vp'
  | 'director'
  | 'manager'
  | 'individual'
  | 'unknown';

/**
 * Estimated company size from signals
 */
export type CompanySizeEstimate =
  | 'enterprise'
  | 'mid_market'
  | 'smb'
  | 'startup'
  | 'unknown';

/**
 * Demographic features extracted from lead profile
 */
export interface DemographicFeatures {
  /** Has company name */
  hasCompany: boolean;
  /** Has job title */
  hasTitle: boolean;
  /** Has phone number */
  hasPhone: boolean;
  /** Type of email domain */
  emailDomainType: EmailDomainType;
  /** Seniority level from title */
  titleSeniority: TitleSeniority;
  /** Estimated company size */
  companySizeEstimate: CompanySizeEstimate;
  /** Raw email domain */
  emailDomain: string | null;
}

// ============================================================================
// Behavioral Features
// ============================================================================

/**
 * Behavioral features from activity tracking
 */
export interface BehavioralFeatures {
  /** Number of email opens */
  emailOpenCount: number;
  /** Number of email clicks */
  emailClickCount: number;
  /** Number of page views */
  pageViewCount: number;
  /** Number of form submissions */
  formSubmitCount: number;
  /** Number of meetings attended */
  meetingCount: number;
  /** Number of calls made/received */
  callCount: number;
  /** Activities per day (velocity) */
  activityVelocity: number;
  /** Number of unique activity types */
  channelDiversity: number;
  /** Count of high-value actions (form_submit + email_click) */
  highValueActionCount: number;
  /** Total activities */
  totalActivities: number;
}

// ============================================================================
// Temporal Features
// ============================================================================

/**
 * Time-based activity pattern
 */
export type TimePattern = 'business_hours' | 'after_hours' | 'mixed';

/**
 * Day pattern for activities
 */
export type DayPattern = 'weekday' | 'weekend' | 'mixed';

/**
 * Temporal features based on time patterns
 */
export interface TemporalFeatures {
  /** Days since lead was created */
  daysSinceCreated: number;
  /** Days since last activity */
  daysSinceLastActivity: number;
  /** Recency score with exponential decay (0-100) */
  recencyScore: number;
  /** Had 3+ activities in 24h period */
  activityBurst: boolean;
  /** Activity day pattern */
  dayPattern: DayPattern;
  /** Activity time pattern */
  timePattern: TimePattern;
  /** Lead age in weeks */
  leadAgeWeeks: number;
}

// ============================================================================
// Engagement Features
// ============================================================================

/**
 * Engagement features from email and sequence metrics
 */
export interface EngagementFeatures {
  /** Total engagement score (0-100) */
  totalEngagementScore: number;
  /** Email open rate (opens/sent) */
  emailOpenRate: number;
  /** Email click rate (clicks/opens) */
  emailClickRate: number;
  /** Sequence completion rate (steps completed/total) */
  sequenceEngagement: number;
  /** Average response time in hours */
  avgResponseTime: number | null;
  /** Is currently in an active nurture sequence */
  isInActiveSequence: boolean;
  /** Current sequence step */
  currentSequenceStep: number | null;
}

// ============================================================================
// Text Features (LLM-Extracted)
// ============================================================================

/**
 * Sentiment classification
 */
export type MessageSentiment = 'positive' | 'neutral' | 'negative';

/**
 * Intent classification
 */
export type MessageIntent =
  | 'inquiry'
  | 'demo_request'
  | 'pricing'
  | 'support'
  | 'complaint'
  | 'partnership'
  | 'other';

/**
 * Urgency level
 */
export type UrgencyLevel = 'high' | 'medium' | 'low';

/**
 * Text features extracted via LLM
 */
export interface TextFeatures {
  /** Detected sentiment */
  messageSentiment: MessageSentiment | null;
  /** Detected intent */
  messageIntent: MessageIntent | null;
  /** Extracted topic tags */
  topicTags: string[];
  /** Detected urgency */
  urgencyLevel: UrgencyLevel | null;
  /** Has meaningful message content */
  hasMessage: boolean;
  /** Message length */
  messageLength: number;
}

// ============================================================================
// Combined Feature Set
// ============================================================================

/**
 * Complete feature set for ML prediction
 */
export interface LeadFeatures {
  demographic: DemographicFeatures;
  behavioral: BehavioralFeatures;
  temporal: TemporalFeatures;
  engagement: EngagementFeatures;
  text: TextFeatures;
}

/**
 * Feature weights for scoring
 */
export interface FeatureWeights {
  demographic: Record<keyof DemographicFeatures, number>;
  behavioral: Record<keyof BehavioralFeatures, number>;
  temporal: Record<keyof TemporalFeatures, number>;
  engagement: Record<keyof EngagementFeatures, number>;
}

/**
 * Default feature weights (rule-based baseline)
 */
export const DEFAULT_FEATURE_WEIGHTS: FeatureWeights = {
  demographic: {
    hasCompany: 10,
    hasTitle: 10,
    hasPhone: 5,
    emailDomainType: 5,
    titleSeniority: 10,
    companySizeEstimate: 5,
    emailDomain: 0,
  },
  behavioral: {
    emailOpenCount: 5,
    emailClickCount: 10,
    pageViewCount: 3,
    formSubmitCount: 15,
    meetingCount: 20,
    callCount: 10,
    activityVelocity: 5,
    channelDiversity: 5,
    highValueActionCount: 10,
    totalActivities: 2,
  },
  temporal: {
    daysSinceCreated: -0.5,
    daysSinceLastActivity: -2,
    recencyScore: 1,
    activityBurst: 15,
    dayPattern: 0,
    timePattern: 0,
    leadAgeWeeks: -0.5,
  },
  engagement: {
    totalEngagementScore: 1,
    emailOpenRate: 10,
    emailClickRate: 15,
    sequenceEngagement: 10,
    avgResponseTime: -1,
    isInActiveSequence: 5,
    currentSequenceStep: 0,
  },
};
