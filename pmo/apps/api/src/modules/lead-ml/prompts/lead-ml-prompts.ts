/**
 * Lead ML Prompts
 *
 * LLM prompt templates for Lead ML predictions.
 * Designed to produce structured JSON responses matching our type definitions.
 *
 * @module lead-ml/prompts
 */

import type { LeadMLContext, ActivitySummary, LeadFeatures } from '../types';
import { escapePromptContent } from '../../../utils/prompt-sanitizer';

// ============================================================================
// System Prompts
// ============================================================================

/**
 * Base system prompt for Lead ML analysis
 */
export const LEAD_ML_SYSTEM_PROMPT = `You are an expert lead scoring and conversion analyst specializing in B2B sales. You analyze lead behavior, engagement patterns, and demographic data to predict conversion likelihood and prioritize leads.

Your analysis should be:
- Data-driven: Base conclusions on the metrics provided
- Specific: Reference actual engagement values and patterns
- Actionable: Provide clear recommendations for sales follow-up
- Balanced: Consider both positive signals and risk factors

Always respond with valid JSON matching the requested schema.`;

// ============================================================================
// Conversion Prediction Prompt
// ============================================================================

/**
 * Prompt template for conversion prediction.
 */
export const CONVERSION_PREDICTION_PROMPT = `You are an expert lead conversion analyst. Analyze the following lead data and predict conversion probability.

## LEAD PROFILE
{leadProfile}

## ENGAGEMENT METRICS
{engagementMetrics}

## ACTIVITY SUMMARY
{activitySummary}

## FEATURE ANALYSIS
{featureAnalysis}

## SCORE HISTORY
{scoreHistory}

## NURTURE SEQUENCE STATUS
{sequenceStatus}

## TASK
Analyze this lead and predict the probability of conversion (becoming a paying customer) in the next 90 days.

Respond with a JSON object matching this exact schema:
{
  "conversionProbability": <number 0-1 representing probability of conversion>,
  "confidence": <number 0-1 representing your confidence in this prediction>,
  "predictedScoreLevel": <"HOT" | "WARM" | "COLD" | "DEAD">,
  "predictedDaysToClose": <number of estimated days to conversion, or null if unlikely>,
  "predictedValue": <estimated deal value in dollars, or null if unknown>,
  "riskFactors": [
    {
      "factor": "<name of the factor>",
      "impact": <"high" | "medium" | "low">,
      "currentValue": "<current state or value>",
      "trend": <"improving" | "stable" | "declining">,
      "description": "<1-2 sentence explanation>"
    }
  ],
  "explanation": "<2-3 sentence human-readable summary of the conversion assessment>",
  "recommendations": [
    {
      "priority": <"urgent" | "high" | "medium" | "low">,
      "action": "<specific action to take>",
      "rationale": "<why this action helps>",
      "expectedImpact": "<expected outcome>",
      "timeframe": "<when to do this>"
    }
  ]
}

## GUIDELINES
- Conversion probability thresholds: HOT >= 0.7, WARM >= 0.4, COLD >= 0.15, DEAD < 0.15
- Weight recent activity (last 7 days) more heavily
- Multiple activity types (channel diversity) indicates genuine interest
- High-value actions: form submissions, email clicks, meeting attendance
- Email opens without clicks may indicate passive interest
- Long time since last activity is a negative signal
- Corporate email domains are more likely to convert than free email
- C-level or VP titles indicate higher conversion potential
- Consider score trajectory (improving vs declining)
- Provide at least 3 risk factors and 3 recommendations
- Make recommendations specific and actionable`;

// ============================================================================
// Time-to-Close Prediction Prompt
// ============================================================================

/**
 * Prompt template for time-to-close prediction.
 */
export const TIME_TO_CLOSE_PROMPT = `You are analyzing this lead to predict time-to-close (days until conversion).

## LEAD PROFILE
{leadProfile}

## ENGAGEMENT METRICS
{engagementMetrics}

## ACTIVITY VELOCITY
{activityVelocity}

## PIPELINE STAGE
{pipelineInfo}

## TASK
Predict how many days until this lead converts (if they convert).

Respond with a JSON object matching this exact schema:
{
  "predictedDays": <number of days until likely conversion>,
  "confidenceInterval": {
    "low": <minimum days (optimistic)>,
    "high": <maximum days (conservative)>
  },
  "confidence": <number 0-1>,
  "velocity": <"fast" | "normal" | "slow">,
  "accelerators": [
    {
      "factor": "<what could speed up conversion>",
      "potentialImpact": "<days saved if addressed>",
      "action": "<how to leverage this>"
    }
  ],
  "blockers": [
    {
      "factor": "<what's slowing conversion>",
      "severity": <"high" | "medium" | "low">,
      "mitigation": "<how to address>"
    }
  ],
  "explanation": "<2-3 sentence summary of the time-to-close prediction>"
}

## GUIDELINES
- Base prediction on activity velocity and engagement patterns
- Fast velocity: consistent daily/weekly engagement
- Slow velocity: sporadic, declining engagement
- Corporate email + senior title typically = faster close
- Active nurture sequence participation shortens cycle
- Long gaps between activities extend timeline
- Consider typical B2B sales cycles (30-90 days)`;

// ============================================================================
// Priority Ranking Prompt
// ============================================================================

/**
 * Prompt template for lead priority ranking.
 */
export const PRIORITY_RANKING_PROMPT = `You are prioritizing a batch of leads for sales outreach.

## LEADS TO RANK
{leadsData}

## TASK
Rank these leads by priority for immediate sales outreach.

Respond with a JSON object matching this exact schema:
{
  "rankings": [
    {
      "leadId": <lead ID>,
      "priorityRank": <1 = highest priority>,
      "priorityTier": <"top" | "high" | "medium" | "low">,
      "priorityScore": <number 0-100>,
      "conversionProbability": <number 0-1>,
      "reasoning": "<why this lead is ranked here>"
    }
  ],
  "insights": {
    "topLeadCount": <number of leads in "top" tier>,
    "avgConversionProbability": <average probability across all leads>,
    "commonPatterns": ["<pattern 1>", "<pattern 2>"]
  }
}

## GUIDELINES
- top tier: immediate outreach required (highest engagement + conversion signals)
- high tier: contact within 24-48 hours
- medium tier: contact this week
- low tier: continue nurturing
- Prioritize leads with: recent activity, multiple engagement types, senior titles
- Deprioritize leads with: stale engagement, free email, unknown company`;

// ============================================================================
// Score Explanation Prompt
// ============================================================================

/**
 * Prompt template for explaining a lead's score.
 */
export const SCORE_EXPLANATION_PROMPT = `Explain this lead's score and provide improvement suggestions.

## LEAD DATA
{leadProfile}

## CURRENT SCORE
{currentScore}

## SCORE BREAKDOWN
{scoreBreakdown}

## ACTIVITY HISTORY
{activityHistory}

## TASK
Explain why this lead has this score and what would improve it.

Respond with a JSON object matching this exact schema:
{
  "scoreExplanation": "<2-3 sentence explanation of the current score>",
  "topPositiveFactors": [
    {
      "factor": "<what's helping the score>",
      "contribution": <points contributed>,
      "description": "<why this matters>"
    }
  ],
  "topNegativeFactors": [
    {
      "factor": "<what's hurting the score>",
      "impact": <points lost>,
      "description": "<why this matters>"
    }
  ],
  "improvementActions": [
    {
      "action": "<what the lead could do to improve score>",
      "potentialPoints": <points that could be gained>,
      "likelihood": <"likely" | "possible" | "unlikely">
    }
  ],
  "salesActions": [
    {
      "action": "<what sales should do to improve engagement>",
      "priority": <"high" | "medium" | "low">,
      "expectedOutcome": "<what we expect to happen>"
    }
  ]
}`;

// ============================================================================
// Prompt Helper Functions
// ============================================================================

/**
 * Format lead profile for prompts.
 * All user-provided string fields are sanitized to prevent prompt injection.
 */
export function formatLeadProfile(lead: {
  id: number;
  email: string;
  name: string | null;
  company: string | null;
  phone: string | null;
  title: string | null;
  score: number;
  scoreLevel: string;
  pipelineStage: string | null;
  pipelineValue: number | null;
  createdAt: Date;
}): string {
  const leadAge = Math.floor(
    (Date.now() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Sanitize user-provided content to prevent prompt injection
  const safeEmail = escapePromptContent(lead.email, { maxLength: 254 });
  const safeName = escapePromptContent(lead.name || 'Unknown', {
    maxLength: 200,
  });
  const safeCompany = escapePromptContent(lead.company || 'Unknown', {
    maxLength: 200,
  });
  const safePhone = escapePromptContent(lead.phone || 'Not provided', {
    maxLength: 50,
  });
  const safeTitle = escapePromptContent(lead.title || 'Unknown', {
    maxLength: 200,
  });
  const safePipelineStage = escapePromptContent(
    lead.pipelineStage || 'Not in pipeline',
    { maxLength: 100 },
  );

  return `Lead ID: ${lead.id}
Email: ${safeEmail}
Name: ${safeName}
Company: ${safeCompany}
Phone: ${safePhone}
Title: ${safeTitle}
Current Score: ${lead.score}
Score Level: ${lead.scoreLevel}
Pipeline Stage: ${safePipelineStage}
Pipeline Value: ${lead.pipelineValue ? '$' + lead.pipelineValue.toLocaleString() : 'Not set'}
Lead Age: ${leadAge} days`;
}

/**
 * Format engagement metrics for prompts
 */
export function formatEngagementMetrics(metrics: {
  totalEmailsSent: number;
  totalEmailsOpened: number;
  totalEmailsClicked: number;
  totalWebsiteVisits: number;
  lastEngagementAt: Date | null;
}): string {
  const daysSinceEngagement = metrics.lastEngagementAt
    ? Math.floor(
        (Date.now() - metrics.lastEngagementAt.getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  const openRate =
    metrics.totalEmailsSent > 0
      ? ((metrics.totalEmailsOpened / metrics.totalEmailsSent) * 100).toFixed(1)
      : '0';

  const clickRate =
    metrics.totalEmailsOpened > 0
      ? (
          (metrics.totalEmailsClicked / metrics.totalEmailsOpened) *
          100
        ).toFixed(1)
      : '0';

  return `Emails Sent: ${metrics.totalEmailsSent}
Emails Opened: ${metrics.totalEmailsOpened} (${openRate}% open rate)
Emails Clicked: ${metrics.totalEmailsClicked} (${clickRate}% click rate)
Website Visits: ${metrics.totalWebsiteVisits}
Days Since Last Engagement: ${daysSinceEngagement ?? 'Never engaged'}`;
}

/**
 * Format activity summary for prompts.
 * Activity type strings are sanitized to prevent prompt injection.
 */
export function formatActivitySummary(activities: ActivitySummary[]): string {
  if (activities.length === 0) {
    return 'No activity recorded';
  }

  return activities
    .map((a) => {
      // Sanitize the activity type which could come from user-defined events
      const safeType = escapePromptContent(a.type, { maxLength: 100 });
      return `${safeType}: ${a.count} occurrences${a.lastOccurred ? `, last: ${a.lastOccurred.toISOString().split('T')[0]}` : ''}`;
    })
    .join('\n');
}

/**
 * Format feature analysis for prompts
 */
export function formatFeatureAnalysis(features: LeadFeatures): string {
  return `## Demographic Features
- Has Company: ${features.demographic.hasCompany}
- Has Title: ${features.demographic.hasTitle}
- Has Phone: ${features.demographic.hasPhone}
- Email Domain Type: ${features.demographic.emailDomainType}
- Title Seniority: ${features.demographic.titleSeniority}
- Company Size Estimate: ${features.demographic.companySizeEstimate}

## Behavioral Features
- Total Activities: ${features.behavioral.totalActivities}
- Email Opens: ${features.behavioral.emailOpenCount}
- Email Clicks: ${features.behavioral.emailClickCount}
- Page Views: ${features.behavioral.pageViewCount}
- Form Submissions: ${features.behavioral.formSubmitCount}
- Activity Velocity: ${features.behavioral.activityVelocity.toFixed(2)}/day
- Channel Diversity: ${features.behavioral.channelDiversity} types

## Temporal Features
- Days Since Created: ${features.temporal.daysSinceCreated}
- Days Since Last Activity: ${features.temporal.daysSinceLastActivity}
- Recency Score: ${features.temporal.recencyScore}
- Activity Burst: ${features.temporal.activityBurst}

## Engagement Features
- Engagement Score: ${features.engagement.totalEngagementScore}
- Email Open Rate: ${(features.engagement.emailOpenRate * 100).toFixed(1)}%
- Email Click Rate: ${(features.engagement.emailClickRate * 100).toFixed(1)}%
- In Active Sequence: ${features.engagement.isInActiveSequence}`;
}

/**
 * Format score history for prompts.
 * Reason strings are sanitized to prevent prompt injection.
 */
export function formatScoreHistory(
  history: Array<{
    score: number;
    level: string;
    scoredAt: Date;
    reason: string | null;
  }>,
): string {
  if (!history || history.length === 0) {
    return 'No score history available';
  }

  return history
    .slice(0, 10)
    .map((h) => {
      // Sanitize reason which could contain user-provided data
      const safeReason = h.reason
        ? escapePromptContent(h.reason, { maxLength: 200 })
        : '';
      return `${h.scoredAt.toISOString().split('T')[0]}: Score=${h.score} (${h.level})${safeReason ? ` - ${safeReason}` : ''}`;
    })
    .join('\n');
}

/**
 * Format sequence status for prompts.
 * Sequence name is sanitized to prevent prompt injection.
 */
export function formatSequenceStatus(
  sequenceInfo: {
    isEnrolled: boolean;
    sequenceName: string | null;
    currentStep: number | null;
    totalSteps: number | null;
  } | null,
): string {
  if (!sequenceInfo || !sequenceInfo.isEnrolled) {
    return 'Not enrolled in any nurture sequence';
  }

  // Sanitize sequence name which could be user-defined
  const safeSequenceName = escapePromptContent(
    sequenceInfo.sequenceName || 'Unknown Sequence',
    { maxLength: 200 },
  );

  return `Enrolled in: ${safeSequenceName}
Progress: Step ${sequenceInfo.currentStep ?? '?'} of ${sequenceInfo.totalSteps ?? '?'}`;
}

/**
 * Build complete conversion prediction prompt
 */
export function buildConversionPredictionPrompt(
  context: LeadMLContext,
): string {
  return CONVERSION_PREDICTION_PROMPT.replace(
    '{leadProfile}',
    formatLeadProfile(context.lead),
  )
    .replace('{engagementMetrics}', formatEngagementMetrics(context.engagement))
    .replace(
      '{activitySummary}',
      formatActivitySummary(context.activitySummary),
    )
    .replace('{featureAnalysis}', formatFeatureAnalysis(context.features))
    .replace('{scoreHistory}', formatScoreHistory(context.scoreHistory))
    .replace('{sequenceStatus}', formatSequenceStatus(context.sequenceInfo));
}

/**
 * Build time-to-close prompt
 */
export function buildTimeToClosePrompt(context: LeadMLContext): string {
  const activityVelocity = `Activities per day: ${context.features.behavioral.activityVelocity.toFixed(2)}
Total activities (30 days): ${context.features.behavioral.totalActivities}
Days since last activity: ${context.features.temporal.daysSinceLastActivity}
Activity burst detected: ${context.features.temporal.activityBurst}`;

  const pipelineInfo = `Stage: ${context.lead.pipelineStage || 'Not in pipeline'}
Value: ${context.lead.pipelineValue ? '$' + context.lead.pipelineValue.toLocaleString() : 'Not set'}`;

  return TIME_TO_CLOSE_PROMPT.replace(
    '{leadProfile}',
    formatLeadProfile(context.lead),
  )
    .replace('{engagementMetrics}', formatEngagementMetrics(context.engagement))
    .replace('{activityVelocity}', activityVelocity)
    .replace('{pipelineInfo}', pipelineInfo);
}

/**
 * Build priority ranking prompt for multiple leads.
 * All user-provided lead data is sanitized to prevent prompt injection.
 */
export function buildPriorityRankingPrompt(
  leads: Array<{
    id: number;
    email: string;
    name: string | null;
    company: string | null;
    title: string | null;
    score: number;
    scoreLevel: string;
    daysSinceLastActivity: number;
    totalActivities: number;
    emailOpenRate: number;
  }>,
): string {
  const leadsData = leads
    .map((l, i) => {
      // Sanitize all user-provided fields
      const safeEmail = escapePromptContent(l.email, { maxLength: 254 });
      const safeName = escapePromptContent(l.name || 'Unknown', {
        maxLength: 200,
      });
      const safeCompany = escapePromptContent(l.company || 'Unknown', {
        maxLength: 200,
      });
      const safeTitle = escapePromptContent(l.title || 'Unknown', {
        maxLength: 200,
      });

      return `${i + 1}. ID: ${l.id}
   Email: ${safeEmail}
   Name: ${safeName}
   Company: ${safeCompany}
   Title: ${safeTitle}
   Score: ${l.score} (${l.scoreLevel})
   Days Since Activity: ${l.daysSinceLastActivity}
   Total Activities: ${l.totalActivities}
   Email Open Rate: ${(l.emailOpenRate * 100).toFixed(1)}%`;
    })
    .join('\n\n');

  return PRIORITY_RANKING_PROMPT.replace('{leadsData}', leadsData);
}

/**
 * Build score explanation prompt.
 * Activity types are sanitized to prevent prompt injection.
 */
export function buildScoreExplanationPrompt(
  context: LeadMLContext,
  scoreBreakdown: {
    demographic: number;
    behavioral: number;
    temporal: number;
    engagement: number;
  },
): string {
  const scoreBreakdownStr = `Demographic: ${scoreBreakdown.demographic}
Behavioral: ${scoreBreakdown.behavioral}
Temporal: ${scoreBreakdown.temporal}
Engagement: ${scoreBreakdown.engagement}
Total: ${context.lead.score}`;

  const activityHistory = context.recentActivities
    .slice(0, 20)
    .map((a) => {
      // Sanitize activity type which could come from user-defined events
      const safeType = escapePromptContent(a.type, { maxLength: 100 });
      return `${a.createdAt.toISOString().split('T')[0]}: ${safeType}`;
    })
    .join('\n');

  return SCORE_EXPLANATION_PROMPT.replace(
    '{leadProfile}',
    formatLeadProfile(context.lead),
  )
    .replace(
      '{currentScore}',
      `${context.lead.score} (${context.lead.scoreLevel})`,
    )
    .replace('{scoreBreakdown}', scoreBreakdownStr)
    .replace('{activityHistory}', activityHistory || 'No recent activity');
}
