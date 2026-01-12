/**
 * Lead Rule-Based Prediction Service
 *
 * Provides rule-based predictions as a fallback when LLM is unavailable.
 * Uses weighted scoring based on extracted features.
 *
 * @module lead-ml/services
 */

import type { LeadScoreLevel } from '@prisma/client';
import type {
  LeadFeatures,
  LeadRiskFactor,
  LeadRecommendation,
  ConversionPrediction,
  TimeToClosePrediction,
  ScorePrediction,
} from '../types';

// ============================================================================
// Feature Weights for Rule-Based Scoring
// ============================================================================

const FEATURE_WEIGHTS = {
  // Demographic weights
  demographic: {
    hasCompany: { weight: 0.08, description: 'Company identified' },
    hasTitle: { weight: 0.08, description: 'Job title provided' },
    hasPhone: { weight: 0.04, description: 'Phone number available' },
    emailDomainType: {
      corporate: { weight: 0.1, description: 'Corporate email domain' },
      free: { weight: -0.05, description: 'Free email provider' },
      edu: { weight: 0.05, description: 'Educational institution' },
      government: { weight: 0.08, description: 'Government organization' },
      unknown: { weight: 0, description: 'Unknown domain' },
    },
    titleSeniority: {
      c_level: { weight: 0.15, description: 'C-level executive' },
      vp: { weight: 0.12, description: 'VP-level decision maker' },
      director: { weight: 0.1, description: 'Director-level' },
      manager: { weight: 0.05, description: 'Manager-level' },
      individual: { weight: 0, description: 'Individual contributor' },
      unknown: { weight: 0, description: 'Unknown seniority' },
    },
    companySizeEstimate: {
      enterprise: { weight: 0.08, description: 'Enterprise company' },
      mid_market: { weight: 0.05, description: 'Mid-market company' },
      smb: { weight: 0.02, description: 'Small business' },
      startup: { weight: 0.03, description: 'Startup' },
      unknown: { weight: 0, description: 'Unknown size' },
    },
  },
  // Behavioral weights
  behavioral: {
    emailOpenWeight: 0.02,
    emailClickWeight: 0.05,
    pageViewWeight: 0.01,
    formSubmitWeight: 0.08,
    meetingWeight: 0.1,
    callWeight: 0.06,
    activityVelocityThreshold: 0.5,
    activityVelocityBonus: 0.1,
    channelDiversityThreshold: 3,
    channelDiversityBonus: 0.08,
  },
  // Temporal weights
  temporal: {
    recencyHalfLife: 7,
    recencyMaxBonus: 0.15,
    activityBurstBonus: 0.1,
    staleThresholdDays: 14,
    stalePenalty: -0.15,
    veryStaleThresholdDays: 30,
    veryStalePenalty: -0.25,
  },
  // Engagement weights
  engagement: {
    emailOpenRateThreshold: 0.3,
    emailOpenRateBonus: 0.08,
    emailClickRateThreshold: 0.1,
    emailClickRateBonus: 0.1,
    sequenceEngagementWeight: 0.12,
    inActiveSequenceBonus: 0.05,
  },
};

// ============================================================================
// Prediction Functions
// ============================================================================

/**
 * Calculate conversion probability from features (rule-based)
 */
export function calculateConversionProbability(features: LeadFeatures): number {
  let probability = 0.15; // Base probability

  // Demographic contributions
  if (features.demographic.hasCompany)
    probability += FEATURE_WEIGHTS.demographic.hasCompany.weight;
  if (features.demographic.hasTitle)
    probability += FEATURE_WEIGHTS.demographic.hasTitle.weight;
  if (features.demographic.hasPhone)
    probability += FEATURE_WEIGHTS.demographic.hasPhone.weight;

  const domainWeight =
    FEATURE_WEIGHTS.demographic.emailDomainType[
      features.demographic.emailDomainType
    ];
  probability += domainWeight?.weight || 0;

  const seniorityWeight =
    FEATURE_WEIGHTS.demographic.titleSeniority[
      features.demographic.titleSeniority
    ];
  probability += seniorityWeight?.weight || 0;

  const sizeWeight =
    FEATURE_WEIGHTS.demographic.companySizeEstimate[
      features.demographic.companySizeEstimate
    ];
  probability += sizeWeight?.weight || 0;

  // Behavioral contributions
  const behavioralScore =
    features.behavioral.emailOpenCount *
      FEATURE_WEIGHTS.behavioral.emailOpenWeight +
    features.behavioral.emailClickCount *
      FEATURE_WEIGHTS.behavioral.emailClickWeight +
    features.behavioral.pageViewCount *
      FEATURE_WEIGHTS.behavioral.pageViewWeight +
    features.behavioral.formSubmitCount *
      FEATURE_WEIGHTS.behavioral.formSubmitWeight +
    features.behavioral.meetingCount *
      FEATURE_WEIGHTS.behavioral.meetingWeight +
    features.behavioral.callCount * FEATURE_WEIGHTS.behavioral.callWeight;

  probability += Math.min(0.25, behavioralScore); // Cap behavioral contribution

  if (
    features.behavioral.activityVelocity >=
    FEATURE_WEIGHTS.behavioral.activityVelocityThreshold
  ) {
    probability += FEATURE_WEIGHTS.behavioral.activityVelocityBonus;
  }

  if (
    features.behavioral.channelDiversity >=
    FEATURE_WEIGHTS.behavioral.channelDiversityThreshold
  ) {
    probability += FEATURE_WEIGHTS.behavioral.channelDiversityBonus;
  }

  // Temporal contributions
  const recencyBonus =
    (features.temporal.recencyScore / 100) *
    FEATURE_WEIGHTS.temporal.recencyMaxBonus;
  probability += recencyBonus;

  if (features.temporal.activityBurst) {
    probability += FEATURE_WEIGHTS.temporal.activityBurstBonus;
  }

  if (
    features.temporal.daysSinceLastActivity >
    FEATURE_WEIGHTS.temporal.veryStaleThresholdDays
  ) {
    probability += FEATURE_WEIGHTS.temporal.veryStalePenalty;
  } else if (
    features.temporal.daysSinceLastActivity >
    FEATURE_WEIGHTS.temporal.staleThresholdDays
  ) {
    probability += FEATURE_WEIGHTS.temporal.stalePenalty;
  }

  // Engagement contributions
  if (
    features.engagement.emailOpenRate >=
    FEATURE_WEIGHTS.engagement.emailOpenRateThreshold
  ) {
    probability += FEATURE_WEIGHTS.engagement.emailOpenRateBonus;
  }

  if (
    features.engagement.emailClickRate >=
    FEATURE_WEIGHTS.engagement.emailClickRateThreshold
  ) {
    probability += FEATURE_WEIGHTS.engagement.emailClickRateBonus;
  }

  probability +=
    features.engagement.sequenceEngagement *
    FEATURE_WEIGHTS.engagement.sequenceEngagementWeight;

  if (features.engagement.isInActiveSequence) {
    probability += FEATURE_WEIGHTS.engagement.inActiveSequenceBonus;
  }

  // Clamp to valid range
  return Math.max(0.01, Math.min(0.99, probability));
}

/**
 * Determine score level from probability
 */
function getScoreLevelFromProbability(probability: number): LeadScoreLevel {
  if (probability >= 0.7) return 'HOT';
  if (probability >= 0.4) return 'WARM';
  if (probability >= 0.15) return 'COLD';
  return 'DEAD';
}

/**
 * Calculate confidence for rule-based prediction
 */
function calculateConfidence(features: LeadFeatures): number {
  let confidence = 0.5; // Base confidence

  // More data = higher confidence
  if (features.behavioral.totalActivities > 10) confidence += 0.15;
  else if (features.behavioral.totalActivities > 5) confidence += 0.1;
  else if (features.behavioral.totalActivities > 0) confidence += 0.05;

  // Complete profile = higher confidence
  if (features.demographic.hasCompany) confidence += 0.05;
  if (features.demographic.hasTitle) confidence += 0.05;
  if (features.demographic.hasPhone) confidence += 0.03;

  // Recent activity = higher confidence
  if (features.temporal.daysSinceLastActivity < 7) confidence += 0.1;
  else if (features.temporal.daysSinceLastActivity < 14) confidence += 0.05;

  // Clamp
  return Math.min(0.95, confidence);
}

/**
 * Generate risk factors from features
 */
function generateRiskFactors(features: LeadFeatures): LeadRiskFactor[] {
  const factors: LeadRiskFactor[] = [];

  // Positive factors
  if (
    features.demographic.titleSeniority === 'c_level' ||
    features.demographic.titleSeniority === 'vp'
  ) {
    factors.push({
      factor: 'Decision Maker',
      impact: 'high',
      currentValue: features.demographic.titleSeniority
        .replace('_', '-')
        .toUpperCase(),
      trend: 'stable',
      description:
        'Lead has decision-making authority based on title seniority',
    });
  }

  if (features.behavioral.highValueActionCount > 0) {
    factors.push({
      factor: 'High-Value Engagement',
      impact: 'high',
      currentValue: features.behavioral.highValueActionCount,
      trend: features.temporal.recencyScore > 50 ? 'improving' : 'stable',
      description: `${features.behavioral.highValueActionCount} high-value actions (form submissions, meetings, clicks)`,
    });
  }

  if (features.engagement.emailClickRate > 0.1) {
    factors.push({
      factor: 'Email Engagement',
      impact: 'medium',
      currentValue: `${(features.engagement.emailClickRate * 100).toFixed(1)}%`,
      trend: 'stable',
      description: 'Strong email click-through rate indicates active interest',
    });
  }

  if (features.temporal.activityBurst) {
    factors.push({
      factor: 'Activity Burst',
      impact: 'high',
      currentValue: 'Yes',
      trend: 'improving',
      description:
        'Multiple activities in 24-hour period shows heightened interest',
    });
  }

  // Negative factors
  if (features.temporal.daysSinceLastActivity > 14) {
    factors.push({
      factor: 'Stale Lead',
      impact: features.temporal.daysSinceLastActivity > 30 ? 'high' : 'medium',
      currentValue: `${features.temporal.daysSinceLastActivity} days`,
      trend: 'declining',
      description: `No activity in ${features.temporal.daysSinceLastActivity} days indicates cooling interest`,
    });
  }

  if (features.demographic.emailDomainType === 'free') {
    factors.push({
      factor: 'Personal Email',
      impact: 'medium',
      currentValue: 'Free email provider',
      trend: 'stable',
      description: 'Personal email addresses have lower B2B conversion rates',
    });
  }

  if (!features.demographic.hasCompany) {
    factors.push({
      factor: 'Unknown Company',
      impact: 'medium',
      currentValue: 'Not provided',
      trend: 'stable',
      description: 'No company information limits qualification ability',
    });
  }

  if (features.behavioral.totalActivities === 0) {
    factors.push({
      factor: 'No Engagement',
      impact: 'high',
      currentValue: '0 activities',
      trend: 'stable',
      description: 'Lead has not engaged with any content or emails',
    });
  }

  return factors.slice(0, 6); // Limit to 6 factors
}

/**
 * Generate recommendations from features
 */
function generateRecommendations(
  features: LeadFeatures,
  probability: number,
): LeadRecommendation[] {
  const recommendations: LeadRecommendation[] = [];

  // High probability leads
  if (probability >= 0.7) {
    recommendations.push({
      priority: 'urgent',
      action: 'Schedule a demo or discovery call',
      rationale: 'Lead shows strong buying signals and high engagement',
      expectedImpact: 'Move lead to pipeline within 1 week',
      timeframe: 'Within 24 hours',
    });
  }

  // Stale leads
  if (features.temporal.daysSinceLastActivity > 14) {
    recommendations.push({
      priority:
        features.temporal.daysSinceLastActivity > 30 ? 'high' : 'medium',
      action: 'Send re-engagement email with new value proposition',
      rationale: `Lead has been inactive for ${features.temporal.daysSinceLastActivity} days`,
      expectedImpact: 'Rekindle interest and trigger engagement',
      timeframe: 'This week',
    });
  }

  // Missing company info
  if (!features.demographic.hasCompany) {
    recommendations.push({
      priority: 'medium',
      action: 'Research lead to identify company and qualify',
      rationale: 'Company information is missing, limiting qualification',
      expectedImpact: 'Better targeting and personalization',
      timeframe: 'Before next outreach',
    });
  }

  // Not in sequence
  if (!features.engagement.isInActiveSequence && probability < 0.5) {
    recommendations.push({
      priority: 'medium',
      action: 'Enroll in nurture sequence',
      rationale: 'Lead needs consistent touchpoints to build engagement',
      expectedImpact: 'Automated nurturing to warm up lead',
      timeframe: 'This week',
    });
  }

  // Low engagement
  if (
    features.engagement.emailOpenRate < 0.2 &&
    features.behavioral.totalActivities < 3
  ) {
    recommendations.push({
      priority: 'low',
      action: 'Try different email subject lines or content format',
      rationale: 'Current emails are not resonating with this lead',
      expectedImpact: 'Improved open and click rates',
      timeframe: 'Next email campaign',
    });
  }

  // Good profile but no engagement
  if (
    features.demographic.hasCompany &&
    features.demographic.titleSeniority !== 'unknown' &&
    features.behavioral.totalActivities < 2
  ) {
    recommendations.push({
      priority: 'high',
      action: 'Direct outreach via LinkedIn or phone',
      rationale: 'Good profile match but email engagement is low',
      expectedImpact: 'Personal touch may be more effective',
      timeframe: 'Within 48 hours',
    });
  }

  return recommendations.slice(0, 5); // Limit to 5 recommendations
}

/**
 * Calculate predicted days to close
 */
function calculateDaysToClose(
  features: LeadFeatures,
  probability: number,
): number {
  // Base cycle: 60 days
  let days = 60;

  // Higher probability = shorter cycle
  days -= probability * 30;

  // Senior titles close faster
  if (features.demographic.titleSeniority === 'c_level') days -= 10;
  else if (features.demographic.titleSeniority === 'vp') days -= 7;
  else if (features.demographic.titleSeniority === 'director') days -= 5;

  // High activity velocity = faster
  if (features.behavioral.activityVelocity > 1) days -= 10;
  else if (features.behavioral.activityVelocity > 0.5) days -= 5;

  // Stale leads take longer
  if (features.temporal.daysSinceLastActivity > 14) days += 15;

  return Math.max(7, Math.min(180, Math.round(days)));
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Generate conversion prediction using rule-based approach
 */
export function predictConversionRuleBased(
  features: LeadFeatures,
): ConversionPrediction {
  const probability = calculateConversionProbability(features);
  const confidence = calculateConfidence(features);
  const predictedScoreLevel = getScoreLevelFromProbability(probability);
  const riskFactors = generateRiskFactors(features);
  const recommendations = generateRecommendations(features, probability);
  const predictedDays = calculateDaysToClose(features, probability);

  // Generate explanation
  const positiveFactors = riskFactors
    .filter((f) => f.trend === 'improving' || f.impact === 'high')
    .slice(0, 2);
  const negativeFactors = riskFactors
    .filter((f) => f.trend === 'declining')
    .slice(0, 2);

  let explanation = `This lead has a ${(probability * 100).toFixed(0)}% probability of conversion. `;

  if (positiveFactors.length > 0) {
    explanation += `Key positive signals include ${positiveFactors.map((f) => f.factor.toLowerCase()).join(' and ')}. `;
  }

  if (negativeFactors.length > 0) {
    explanation += `Areas of concern: ${negativeFactors.map((f) => f.factor.toLowerCase()).join(', ')}.`;
  }

  return {
    predictionType: 'CONVERSION',
    probability,
    confidence,
    predictedValue: null,
    predictedDays,
    predictedScoreLevel,
    riskFactors,
    explanation: explanation.trim(),
    recommendations,
    llmMetadata: {
      model: 'rule-based-fallback',
      tokensUsed: 0,
      latencyMs: 0,
      estimatedCost: 0,
    },
  };
}

/**
 * Generate time-to-close prediction using rule-based approach
 */
export function predictTimeToCloseRuleBased(
  features: LeadFeatures,
): TimeToClosePrediction {
  const probability = calculateConversionProbability(features);
  const confidence = calculateConfidence(features);
  const predictedDays = calculateDaysToClose(features, probability);
  const riskFactors = generateRiskFactors(features);
  const recommendations = generateRecommendations(features, probability);

  // Calculate confidence interval
  const variance = (1 - confidence) * predictedDays * 0.5;
  const confidenceInterval = {
    low: Math.max(7, Math.round(predictedDays - variance)),
    high: Math.round(predictedDays + variance),
  };

  const explanation = `Based on current engagement patterns, this lead is estimated to convert in ${predictedDays} days (range: ${confidenceInterval.low}-${confidenceInterval.high} days). ${features.behavioral.activityVelocity > 0.5 ? 'Active engagement suggests potential for faster close.' : 'Increasing engagement could accelerate timeline.'}`;

  return {
    predictionType: 'TIME_TO_CLOSE',
    probability,
    confidence,
    predictedValue: null,
    predictedDays,
    confidenceInterval,
    riskFactors,
    explanation,
    recommendations,
    llmMetadata: {
      model: 'rule-based-fallback',
      tokensUsed: 0,
      latencyMs: 0,
      estimatedCost: 0,
    },
  };
}

/**
 * Generate score prediction using rule-based approach
 */
export function predictScoreRuleBased(features: LeadFeatures): ScorePrediction {
  const probability = calculateConversionProbability(features);
  const confidence = calculateConfidence(features);

  // Calculate score breakdown
  const scoreBreakdown = {
    demographic: Math.round(
      (features.demographic.hasCompany ? 10 : 0) +
        (features.demographic.hasTitle ? 10 : 0) +
        (features.demographic.hasPhone ? 5 : 0),
    ),
    behavioral: Math.min(
      40,
      Math.round(
        features.behavioral.emailClickCount * 10 +
          features.behavioral.formSubmitCount * 15 +
          features.behavioral.meetingCount * 20,
      ),
    ),
    temporal: Math.round(features.temporal.recencyScore * 0.2),
    engagement: Math.round(features.engagement.totalEngagementScore * 0.15),
  };

  const predictedScore = Math.min(
    100,
    scoreBreakdown.demographic +
      scoreBreakdown.behavioral +
      scoreBreakdown.temporal +
      scoreBreakdown.engagement,
  );

  const riskFactors = generateRiskFactors(features);
  const recommendations = generateRecommendations(features, probability);

  const explanation = `Lead score of ${predictedScore} is composed of: demographic signals (${scoreBreakdown.demographic}), behavioral engagement (${scoreBreakdown.behavioral}), recency (${scoreBreakdown.temporal}), and engagement quality (${scoreBreakdown.engagement}).`;

  return {
    predictionType: 'SCORE',
    probability,
    confidence,
    predictedValue: null,
    predictedDays: null,
    predictedScore,
    scoreBreakdown,
    riskFactors,
    explanation,
    recommendations,
    llmMetadata: {
      model: 'rule-based-fallback',
      tokensUsed: 0,
      latencyMs: 0,
      estimatedCost: 0,
    },
  };
}

/**
 * Get risk category based on probability
 */
export function getRiskCategory(
  probability: number,
): 'critical' | 'high' | 'medium' | 'low' {
  if (probability >= 0.8) return 'critical';
  if (probability >= 0.6) return 'high';
  if (probability > 0.3) return 'medium';
  return 'low';
}
