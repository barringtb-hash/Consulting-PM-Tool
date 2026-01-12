/**
 * Customer Success ML Prompts
 *
 * LLM prompt templates for Customer Success predictions.
 * These prompts are designed to produce structured JSON responses
 * that can be parsed into our type definitions.
 *
 * @module customer-success-ml/prompts
 */

// ============================================================================
// System Prompts
// ============================================================================

/**
 * Base system prompt for Customer Success ML analysis
 */
export const CS_ML_SYSTEM_PROMPT = `You are an expert Customer Success analyst specializing in SaaS account health analysis and churn prediction. You analyze account data to identify risks, opportunities, and provide actionable recommendations.

Your analysis should be:
- Data-driven: Base conclusions on the metrics provided
- Specific: Reference actual values and thresholds
- Actionable: Provide clear, implementable recommendations
- Balanced: Consider both risks and opportunities

Always respond with valid JSON matching the requested schema.`;

// ============================================================================
// Churn Prediction Prompt
// ============================================================================

/**
 * Prompt template for churn prediction.
 * Variables: {accountContext}, {healthHistory}, {recentActivities}, {openCTAs}, {engagementMetrics}, {predictionWindow}
 */
export const CHURN_PREDICTION_PROMPT = `You are an expert Customer Success analyst. Analyze the following account data and predict churn risk.

## ACCOUNT CONTEXT
{accountContext}

## HEALTH SCORE HISTORY (last 90 days)
{healthHistory}

## RECENT ACTIVITIES (last 30 days)
{recentActivities}

## OPEN CTAS
{openCTAs}

## ENGAGEMENT METRICS
{engagementMetrics}

## TASK
Analyze this data and predict the likelihood of this account churning in the next {predictionWindow} days.

Respond with a JSON object matching this exact schema:
{
  "churnProbability": <number 0-1 representing probability of churn>,
  "confidence": <number 0-1 representing your confidence in this prediction>,
  "riskCategory": <"critical" | "high" | "medium" | "low">,
  "primaryChurnDrivers": [<string array of top 3 factors driving churn risk>],
  "riskFactors": [
    {
      "factor": "<name of the risk factor>",
      "impact": <"high" | "medium" | "low">,
      "currentValue": "<current state or value>",
      "threshold": "<optional threshold that defines concern>",
      "trend": <"improving" | "stable" | "worsening">,
      "description": "<1-2 sentence explanation>"
    }
  ],
  "explanation": "<2-3 sentence human-readable summary of the churn risk assessment>",
  "recommendations": [
    {
      "priority": <"urgent" | "high" | "medium" | "low">,
      "action": "<specific action to take>",
      "rationale": "<why this action helps>",
      "expectedImpact": "<expected outcome>",
      "effort": <"low" | "medium" | "high">,
      "timeframe": "<when to do this>"
    }
  ],
  "interventionUrgency": <"immediate" | "this_week" | "this_month" | "monitor">,
  "suggestedCTA": {
    "type": <"RISK" | "OPPORTUNITY" | "LIFECYCLE">,
    "priority": <"CRITICAL" | "HIGH" | "MEDIUM" | "LOW">,
    "title": "<action-oriented CTA title, max 100 chars>",
    "reason": "<why this CTA is needed>"
  }
}

## GUIDELINES
- churnProbability thresholds: critical >= 0.8, high >= 0.6, medium >= 0.3, low < 0.3
- Consider health score trends, not just current values
- Weight recent activity more heavily than older data
- Support issues (tickets, escalations) are strong churn indicators
- Declining engagement (fewer meetings, emails) indicates risk
- Consider the account type (PROSPECT vs CUSTOMER have different expectations)
- Provide at least 3 risk factors and 3 recommendations
- Make CTA title action-oriented (e.g., "Schedule QBR with {Account}" not "Account needs QBR")`;

// ============================================================================
// Health Analysis Prompt
// ============================================================================

/**
 * Prompt template for health score analysis.
 * Variables: {accountName}, {currentScore}, {healthHistory}, {dimensionScores}
 */
export const HEALTH_ANALYSIS_PROMPT = `You are a Customer Success health score analyst. Analyze this account's health metrics and provide insights.

## ACCOUNT
{accountName}

## CURRENT HEALTH SCORE
{currentScore}

## HEALTH HISTORY (30-90 days)
{healthHistory}

## CURRENT DIMENSION SCORES
{dimensionScores}

## TASK
Analyze the health data and provide insights about the account's trajectory.

Respond with a JSON object matching this exact schema:
{
  "predictedScore": <number 0-100, predicted health score in 30 days>,
  "scoreTrajectory": <"improving" | "stable" | "declining">,
  "insights": [
    {
      "dimension": <"usage" | "support" | "engagement" | "sentiment" | "financial" | "overall">,
      "insight": "<specific observation about this dimension>",
      "severity": <"critical" | "warning" | "info" | "positive">,
      "trend": <"improving" | "stable" | "declining">,
      "suggestedAction": "<optional recommended action>"
    }
  ],
  "anomalies": [
    {
      "dimension": "<affected dimension>",
      "anomalyType": <"sudden_drop" | "sustained_decline" | "unusual_pattern">,
      "description": "<what's unusual>",
      "severity": <"high" | "medium" | "low">,
      "possibleCauses": ["<potential reason 1>", "<potential reason 2>"]
    }
  ],
  "strengthAreas": ["<area 1>", "<area 2>"],
  "riskAreas": ["<area 1>", "<area 2>"],
  "summary": "<2-3 sentence executive summary>"
}

## GUIDELINES
- Look for patterns across multiple dimensions
- Identify leading indicators of health changes
- sudden_drop: >15 point decrease in <7 days
- sustained_decline: consistent decrease over 30+ days
- Consider dimension interdependencies (e.g., low usage often precedes low engagement)
- Highlight positive trends as well as risks`;

// ============================================================================
// CTA Generation Prompt
// ============================================================================

/**
 * Prompt template for generating CTAs from predictions.
 * Variables: {accountName}, {predictionType}, {probability}, {riskFactors}, {recommendations}
 */
export const CTA_GENERATION_PROMPT = `Based on this ML prediction, generate a specific CTA for the Customer Success Manager.

## ACCOUNT
{accountName}

## PREDICTION TYPE
{predictionType}

## PROBABILITY/SCORE
{probability}

## RISK FACTORS
{riskFactors}

## RECOMMENDATIONS
{recommendations}

## TASK
Generate a single, actionable CTA that addresses the most critical aspect of this prediction.

Respond with a JSON object matching this exact schema:
{
  "title": "<action-oriented title, max 100 characters>",
  "description": "<detailed description of what to do, 2-3 sentences>",
  "reason": "<why this CTA was generated, referencing specific data points>",
  "priority": <"CRITICAL" | "HIGH" | "MEDIUM" | "LOW">,
  "dueDays": <number of days until due, based on urgency>,
  "type": <"RISK" | "OPPORTUNITY" | "LIFECYCLE">,
  "successCriteria": "<how to measure if this CTA was successful>"
}

## GUIDELINES
- Title should be action-oriented (verb first): "Schedule...", "Review...", "Escalate..."
- Description should be specific enough to act on without additional context
- Reference specific data points in the reason (e.g., "Health score dropped from 75 to 45")
- dueDays should match urgency: CRITICAL=1-2, HIGH=3-5, MEDIUM=7-14, LOW=14-30
- Priority should align with the prediction probability/risk level`;

// ============================================================================
// Expansion Opportunity Prompt
// ============================================================================

/**
 * Prompt template for expansion opportunity prediction.
 * Variables: {accountContext}, {healthHistory}, {opportunities}, {engagementMetrics}
 */
export const EXPANSION_PREDICTION_PROMPT = `You are analyzing this account for expansion and upsell opportunities.

## ACCOUNT CONTEXT
{accountContext}

## HEALTH HISTORY
{healthHistory}

## CURRENT OPPORTUNITIES
{opportunities}

## ENGAGEMENT METRICS
{engagementMetrics}

## TASK
Identify expansion opportunities for this account.

Respond with a JSON object matching this exact schema:
{
  "expansionProbability": <number 0-1 representing likelihood of successful expansion>,
  "confidence": <number 0-1>,
  "opportunityType": <"upsell" | "cross_sell" | "renewal_expansion" | "new_use_case">,
  "signals": [
    {
      "signal": "<positive indicator name>",
      "strength": <"strong" | "moderate" | "weak">,
      "evidence": "<specific data supporting this signal>",
      "description": "<explanation of why this indicates expansion potential>"
    }
  ],
  "recommendedApproach": {
    "tactic": "<recommended sales/success approach>",
    "timing": "<when to engage>",
    "stakeholders": ["<who to involve>"],
    "valueProposition": "<key value message>"
  },
  "risks": ["<potential objection or risk 1>", "<potential objection or risk 2>"],
  "explanation": "<2-3 sentence summary of the expansion opportunity>"
}

## GUIDELINES
- High health scores (>70) are prerequisite for expansion
- Champion engagement is a strong signal
- Recent successful implementations increase expansion likelihood
- Consider contract timing (near renewal is good timing)
- Multiple positive signals increase confidence`;

// ============================================================================
// Engagement Decline Prompt
// ============================================================================

/**
 * Prompt template for engagement decline detection.
 * Variables: {accountContext}, {engagementHistory}, {contactActivity}
 */
export const ENGAGEMENT_DECLINE_PROMPT = `You are analyzing this account for signs of engagement decline.

## ACCOUNT CONTEXT
{accountContext}

## ENGAGEMENT HISTORY
{engagementHistory}

## CONTACT ACTIVITY
{contactActivity}

## TASK
Detect and analyze any engagement decline patterns.

Respond with a JSON object matching this exact schema:
{
  "declineProbability": <number 0-1>,
  "confidence": <number 0-1>,
  "declineIndicators": [
    {
      "indicator": "<what's declining>",
      "previousLevel": "<previous engagement level>",
      "currentLevel": "<current engagement level>",
      "changePercent": <number representing % change>,
      "severity": <"critical" | "concerning" | "notable">
    }
  ],
  "affectedStakeholders": [
    {
      "role": "<stakeholder role>",
      "previousEngagement": "<how engaged they were>",
      "currentEngagement": "<how engaged they are now>",
      "riskLevel": <"high" | "medium" | "low">
    }
  ],
  "rootCauseHypotheses": ["<possible reason 1>", "<possible reason 2>"],
  "reengagementStrategies": [
    {
      "strategy": "<specific re-engagement tactic>",
      "target": "<who to target>",
      "expectedOutcome": "<what success looks like>",
      "effort": <"low" | "medium" | "high">
    }
  ],
  "explanation": "<2-3 sentence summary of the engagement situation>"
}

## GUIDELINES
- Compare to baseline engagement (first 30 days after onboarding)
- Champion disengagement is highest priority
- Meeting cancellations and reschedules are early warning signs
- Email response time increases indicate declining interest
- Consider external factors (holidays, company changes)`;

// ============================================================================
// Prompt Helper Functions
// ============================================================================

/**
 * Format account context for prompts
 */
export function formatAccountContext(account: {
  id: number;
  name: string;
  type: string;
  healthScore: number | null;
  engagementScore: number | null;
  churnRisk: number | null;
  createdAt: Date;
}): string {
  return `Account: ${account.name}
Type: ${account.type}
Health Score: ${account.healthScore ?? 'Not calculated'}
Engagement Score: ${account.engagementScore ?? 'Not calculated'}
Current Churn Risk: ${account.churnRisk ? (account.churnRisk * 100).toFixed(1) + '%' : 'Not calculated'}
Account Age: ${Math.floor((Date.now() - account.createdAt.getTime()) / (1000 * 60 * 60 * 24))} days`;
}

/**
 * Format health history for prompts
 */
export function formatHealthHistory(
  history: Array<{
    overallScore: number;
    calculatedAt: Date;
    usageScore: number | null;
    supportScore: number | null;
    engagementScore: number | null;
    sentimentScore: number | null;
    scoreTrend: string | null;
    churnRisk: number | null;
  }>,
): string {
  if (history.length === 0) {
    return 'No health history available';
  }

  return history
    .map(
      (h) =>
        `${h.calculatedAt.toISOString().split('T')[0]}: Score=${h.overallScore}, ` +
        `Usage=${h.usageScore ?? '-'}, Support=${h.supportScore ?? '-'}, ` +
        `Engagement=${h.engagementScore ?? '-'}, Sentiment=${h.sentimentScore ?? '-'}, ` +
        `Trend=${h.scoreTrend ?? 'unknown'}, ChurnRisk=${h.churnRisk ? (h.churnRisk * 100).toFixed(0) + '%' : '-'}`,
    )
    .join('\n');
}

/**
 * Format activities for prompts
 */
export function formatActivities(
  activities: Array<{
    type: string;
    createdAt: Date;
    sentiment: string | null;
  }>,
): string {
  if (activities.length === 0) {
    return 'No recent activities';
  }

  const grouped = activities.reduce(
    (acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const summary = Object.entries(grouped)
    .map(([type, count]) => `${type}: ${count}`)
    .join(', ');

  const sentiments = activities
    .filter((a) => a.sentiment)
    .map((a) => a.sentiment);
  const sentimentSummary =
    sentiments.length > 0
      ? `\nSentiment breakdown: ${sentiments.filter((s) => s === 'POSITIVE').length} positive, ${sentiments.filter((s) => s === 'NEUTRAL').length} neutral, ${sentiments.filter((s) => s === 'NEGATIVE').length} negative`
      : '';

  return `Activity counts: ${summary}${sentimentSummary}`;
}

/**
 * Format open CTAs for prompts
 */
export function formatOpenCTAs(
  ctas: Array<{
    type: string;
    priority: string;
    status: string;
    dueDate: Date | null;
  }>,
): string {
  if (ctas.length === 0) {
    return 'No open CTAs';
  }

  return ctas
    .map(
      (c) =>
        `- ${c.type} (${c.priority}): ${c.status}${c.dueDate ? `, Due: ${c.dueDate.toISOString().split('T')[0]}` : ''}`,
    )
    .join('\n');
}

/**
 * Format engagement metrics for prompts
 */
export function formatEngagementMetrics(metrics: {
  daysSinceLastActivity: number;
  activitiesLast30Days: number;
  meetingsLast30Days: number;
  emailsLast30Days: number;
}): string {
  return `Days since last activity: ${metrics.daysSinceLastActivity}
Activities (30 days): ${metrics.activitiesLast30Days}
Meetings (30 days): ${metrics.meetingsLast30Days}
Emails (30 days): ${metrics.emailsLast30Days}`;
}

/**
 * Build complete churn prediction prompt with context
 */
export function buildChurnPredictionPrompt(
  context: {
    account: {
      id: number;
      name: string;
      type: string;
      healthScore: number | null;
      engagementScore: number | null;
      churnRisk: number | null;
      createdAt: Date;
    };
    healthHistory: Array<{
      overallScore: number;
      calculatedAt: Date;
      usageScore: number | null;
      supportScore: number | null;
      engagementScore: number | null;
      sentimentScore: number | null;
      scoreTrend: string | null;
      churnRisk: number | null;
    }>;
    recentActivities: Array<{
      type: string;
      createdAt: Date;
      sentiment: string | null;
    }>;
    openCTAs: Array<{
      type: string;
      priority: string;
      status: string;
      dueDate: Date | null;
    }>;
    crmMetrics: {
      daysSinceLastActivity: number;
      activitiesLast30Days: number;
      meetingsLast30Days: number;
      emailsLast30Days: number;
    };
  },
  predictionWindowDays: number,
): string {
  return CHURN_PREDICTION_PROMPT.replace(
    '{accountContext}',
    formatAccountContext(context.account),
  )
    .replace('{healthHistory}', formatHealthHistory(context.healthHistory))
    .replace('{recentActivities}', formatActivities(context.recentActivities))
    .replace('{openCTAs}', formatOpenCTAs(context.openCTAs))
    .replace('{engagementMetrics}', formatEngagementMetrics(context.crmMetrics))
    .replace('{predictionWindow}', String(predictionWindowDays));
}
