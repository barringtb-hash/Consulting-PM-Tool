/**
 * ML Health Insights Service
 *
 * Provides ML-enhanced health analysis and anomaly detection for accounts.
 * Complements the base health scoring with predictive insights.
 *
 * @module customer-success-ml/services/ml-health-insights
 */

import { jsonPrompt, isAIAvailable } from '../../ai-monitoring/ai-client';
import {
  gatherAccountContext,
  storePrediction,
} from './cs-ml-prediction.service';
import {
  CS_ML_SYSTEM_PROMPT,
  HEALTH_ANALYSIS_PROMPT,
} from '../prompts/cs-ml-prompts';
import type {
  AccountMLContext,
  HealthScoreSnapshot,
  RiskFactor,
  Recommendation as _Recommendation,
  LLMMetadata,
  MLPredictionResult as _MLPredictionResult,
} from '../types';
import { logger } from '../../../utils/logger';

// ============================================================================
// Types
// ============================================================================

/**
 * Health insight about a specific dimension
 */
export interface HealthInsight {
  /** Which dimension this insight is about */
  dimension:
    | 'usage'
    | 'support'
    | 'engagement'
    | 'sentiment'
    | 'financial'
    | 'overall';
  /** The insight observation */
  insight: string;
  /** Severity of this insight */
  severity: 'critical' | 'warning' | 'info' | 'positive';
  /** Trend direction */
  trend: 'improving' | 'stable' | 'declining';
  /** Optional suggested action */
  suggestedAction?: string;
}

/**
 * Detected anomaly in health data
 */
export interface HealthAnomaly {
  /** Which dimension is affected */
  dimension: string;
  /** Type of anomaly */
  anomalyType: 'sudden_drop' | 'sustained_decline' | 'unusual_pattern';
  /** Description of the anomaly */
  description: string;
  /** Severity level */
  severity: 'high' | 'medium' | 'low';
  /** Possible causes */
  possibleCauses: string[];
}

/**
 * Output from health analysis
 */
export interface HealthAnalysisOutput {
  /** Account ID */
  accountId: number;
  /** Account name */
  accountName: string;
  /** Current health score */
  currentScore: number;
  /** Predicted score in 30 days */
  predictedScore: number;
  /** Score trajectory */
  scoreTrajectory: 'improving' | 'stable' | 'declining';
  /** Detailed insights by dimension */
  insights: HealthInsight[];
  /** Detected anomalies */
  anomalies: HealthAnomaly[];
  /** Areas of strength */
  strengthAreas: string[];
  /** Areas of risk */
  riskAreas: string[];
  /** Executive summary */
  summary: string;
  /** LLM metadata for tracking */
  llmMetadata: LLMMetadata;
}

/**
 * Input for health analysis
 */
export interface HealthAnalysisInput {
  accountId: number;
  tenantId: string;
}

/**
 * LLM response structure for health analysis
 */
interface HealthAnalysisLLMResponse {
  predictedScore: number;
  scoreTrajectory: 'improving' | 'stable' | 'declining';
  insights: HealthInsight[];
  anomalies: HealthAnomaly[];
  strengthAreas: string[];
  riskAreas: string[];
  summary: string;
}

// ============================================================================
// Main Analysis Function
// ============================================================================

/**
 * Analyze account health with ML-enhanced insights.
 *
 * Provides:
 * - Predicted health score trajectory
 * - Dimension-specific insights
 * - Anomaly detection
 * - Strength/risk areas
 * - Executive summary
 *
 * @param input - Analysis input parameters
 * @returns Health analysis with predictions and insights
 *
 * @example
 * ```typescript
 * const analysis = await analyzeAccountHealth({
 *   accountId: 123,
 *   tenantId: 'tenant-abc'
 * });
 *
 * if (analysis.scoreTrajectory === 'declining') {
 *   console.log('Health trending down:', analysis.summary);
 *   console.log('Risk areas:', analysis.riskAreas);
 * }
 *
 * for (const anomaly of analysis.anomalies) {
 *   console.log(`Anomaly detected: ${anomaly.description}`);
 * }
 * ```
 */
export async function analyzeAccountHealth(
  input: HealthAnalysisInput,
): Promise<HealthAnalysisOutput> {
  const { accountId, tenantId } = input;

  // Gather context
  const context = await gatherAccountContext(accountId, tenantId);
  const currentScore = context.account.healthScore ?? 50;

  let analysis: HealthAnalysisOutput;

  // Try LLM analysis first
  if (isAIAvailable()) {
    try {
      analysis = await analyzeWithLLM(context, currentScore);
    } catch (error) {
      logger.warn('LLM health analysis failed, using rule-based', {
        accountId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      analysis = analyzeRuleBased(context, currentScore);
    }
  } else {
    analysis = analyzeRuleBased(context, currentScore);
  }

  // Store as HEALTH_TREND prediction
  await storePrediction(accountId, tenantId, {
    predictionType: 'HEALTH_TREND',
    probability:
      analysis.scoreTrajectory === 'declining'
        ? 0.7
        : analysis.scoreTrajectory === 'stable'
          ? 0.5
          : 0.3,
    confidence: 0.7,
    predictionWindowDays: 30,
    riskFactors: analysis.insights
      .filter((i) => i.severity === 'critical' || i.severity === 'warning')
      .map((i) => ({
        factor: i.dimension,
        impact: i.severity === 'critical' ? 'high' : 'medium',
        currentValue: i.insight,
        trend: i.trend,
        description: i.insight,
      })) as RiskFactor[],
    explanation: analysis.summary,
    recommendations: [],
    llmMetadata: analysis.llmMetadata,
  });

  return analysis;
}

// ============================================================================
// LLM-Based Analysis
// ============================================================================

/**
 * Perform health analysis using LLM
 */
async function analyzeWithLLM(
  context: AccountMLContext,
  currentScore: number,
): Promise<HealthAnalysisOutput> {
  // Format health history for prompt
  const historyStr =
    context.healthHistory.length > 0
      ? context.healthHistory
          .map(
            (h) =>
              `${h.calculatedAt.toISOString().split('T')[0]}: Overall=${h.overallScore}, ` +
              `Usage=${h.usageScore ?? '-'}, Support=${h.supportScore ?? '-'}, ` +
              `Engagement=${h.engagementScore ?? '-'}, Trend=${h.scoreTrend ?? 'unknown'}`,
          )
          .join('\n')
      : 'No health history available';

  // Format dimension scores
  const latestHistory = context.healthHistory[0];
  const dimensionStr = latestHistory
    ? `Usage: ${latestHistory.usageScore ?? 'N/A'}
Support: ${latestHistory.supportScore ?? 'N/A'}
Engagement: ${latestHistory.engagementScore ?? 'N/A'}
Sentiment: ${latestHistory.sentimentScore ?? 'N/A'}`
    : 'No dimension scores available';

  const prompt = HEALTH_ANALYSIS_PROMPT.replace(
    '{accountName}',
    context.account.name,
  )
    .replace('{currentScore}', currentScore.toString())
    .replace('{healthHistory}', historyStr)
    .replace('{dimensionScores}', dimensionStr);

  const startTime = Date.now();

  const result = await jsonPrompt<HealthAnalysisLLMResponse>(prompt, {
    tenantId: context.account.id.toString(),
    toolId: 'customer-success-ml',
    operation: 'health-analysis',
    systemPrompt: CS_ML_SYSTEM_PROMPT,
    model: 'gpt-4o-mini',
    temperature: 0.3,
    maxTokens: 2000,
  });

  const latencyMs = Date.now() - startTime;

  return {
    accountId: context.account.id,
    accountName: context.account.name,
    currentScore,
    predictedScore: result.data.predictedScore,
    scoreTrajectory: result.data.scoreTrajectory,
    insights: result.data.insights,
    anomalies: result.data.anomalies,
    strengthAreas: result.data.strengthAreas,
    riskAreas: result.data.riskAreas,
    summary: result.data.summary,
    llmMetadata: {
      model: result.usage.model,
      tokensUsed: result.usage.totalTokens,
      latencyMs,
      estimatedCost: result.usage.estimatedCost,
    },
  };
}

// ============================================================================
// Rule-Based Analysis
// ============================================================================

/**
 * Perform health analysis using rules when LLM unavailable
 */
function analyzeRuleBased(
  context: AccountMLContext,
  currentScore: number,
): HealthAnalysisOutput {
  const insights: HealthInsight[] = [];
  const anomalies: HealthAnomaly[] = [];
  const strengthAreas: string[] = [];
  const riskAreas: string[] = [];

  // Analyze score trajectory
  const scoreTrajectory = analyzeTrajectory(context.healthHistory);

  // Predict future score based on trend
  const predictedScore = predictFutureScore(
    currentScore,
    scoreTrajectory,
    context.healthHistory,
  );

  // Analyze each dimension
  const latestHistory = context.healthHistory[0];

  if (latestHistory) {
    // Usage analysis
    if (latestHistory.usageScore !== null) {
      const usageInsight = analyzeUsageDimension(
        latestHistory.usageScore,
        context.healthHistory,
      );
      insights.push(usageInsight);
      if (usageInsight.severity === 'positive') {
        strengthAreas.push('Product usage');
      } else if (
        usageInsight.severity === 'critical' ||
        usageInsight.severity === 'warning'
      ) {
        riskAreas.push('Product usage');
      }
    }

    // Support analysis
    if (latestHistory.supportScore !== null) {
      const supportInsight = analyzeSupportDimension(
        latestHistory.supportScore,
        context.healthHistory,
      );
      insights.push(supportInsight);
      if (supportInsight.severity === 'positive') {
        strengthAreas.push('Support health');
      } else if (
        supportInsight.severity === 'critical' ||
        supportInsight.severity === 'warning'
      ) {
        riskAreas.push('Support health');
      }
    }

    // Engagement analysis
    if (latestHistory.engagementScore !== null) {
      const engagementInsight = analyzeEngagementDimension(
        latestHistory.engagementScore,
        context.crmMetrics,
      );
      insights.push(engagementInsight);
      if (engagementInsight.severity === 'positive') {
        strengthAreas.push('Engagement level');
      } else if (
        engagementInsight.severity === 'critical' ||
        engagementInsight.severity === 'warning'
      ) {
        riskAreas.push('Engagement level');
      }
    }
  }

  // Detect anomalies
  const detectedAnomalies = detectAnomalies(context.healthHistory);
  anomalies.push(...detectedAnomalies);

  // Generate overall insight
  insights.push({
    dimension: 'overall',
    insight: generateOverallInsight(currentScore, scoreTrajectory),
    severity:
      currentScore >= 70 ? 'positive' : currentScore >= 50 ? 'info' : 'warning',
    trend: scoreTrajectory,
  });

  // Generate summary
  const summary = generateSummary(
    context.account.name,
    currentScore,
    predictedScore,
    scoreTrajectory,
    riskAreas,
  );

  return {
    accountId: context.account.id,
    accountName: context.account.name,
    currentScore,
    predictedScore,
    scoreTrajectory,
    insights,
    anomalies,
    strengthAreas,
    riskAreas,
    summary,
    llmMetadata: {
      model: 'rule-based-fallback',
      tokensUsed: 0,
      latencyMs: 0,
      estimatedCost: 0,
    },
  };
}

/**
 * Analyze score trajectory from history
 */
function analyzeTrajectory(
  history: HealthScoreSnapshot[],
): 'improving' | 'stable' | 'declining' {
  if (history.length < 2) return 'stable';

  // Compare first and last scores
  const newest = history[0].overallScore;
  const oldest = history[history.length - 1].overallScore;
  const diff = newest - oldest;

  if (diff > 10) return 'improving';
  if (diff < -10) return 'declining';
  return 'stable';
}

/**
 * Predict future score based on trajectory
 */
function predictFutureScore(
  currentScore: number,
  trajectory: 'improving' | 'stable' | 'declining',
  history: HealthScoreSnapshot[],
): number {
  if (history.length < 2) return currentScore;

  // Calculate average daily change
  const newest = history[0];
  const oldest = history[history.length - 1];
  const daysDiff = Math.max(
    1,
    Math.floor(
      (newest.calculatedAt.getTime() - oldest.calculatedAt.getTime()) /
        (1000 * 60 * 60 * 24),
    ),
  );
  const scoreDiff = newest.overallScore - oldest.overallScore;
  const dailyChange = scoreDiff / daysDiff;

  // Project 30 days forward
  const projected = currentScore + dailyChange * 30;

  // Clamp to valid range
  return Math.min(100, Math.max(0, Math.round(projected)));
}

/**
 * Analyze usage dimension
 */
function analyzeUsageDimension(
  usageScore: number,
  history: HealthScoreSnapshot[],
): HealthInsight {
  const trend = getDimensionTrend(history, 'usageScore');

  let severity: HealthInsight['severity'] = 'info';
  if (usageScore >= 70) severity = 'positive';
  else if (usageScore < 40) severity = 'critical';
  else if (usageScore < 60) severity = 'warning';

  return {
    dimension: 'usage',
    insight:
      usageScore >= 70
        ? 'Strong product adoption and feature utilization'
        : usageScore >= 50
          ? 'Moderate product usage with room for deeper adoption'
          : 'Low product usage indicates potential adoption issues',
    severity,
    trend,
    suggestedAction:
      usageScore < 60
        ? 'Schedule product training or feature walkthrough'
        : undefined,
  };
}

/**
 * Analyze support dimension
 */
function analyzeSupportDimension(
  supportScore: number,
  history: HealthScoreSnapshot[],
): HealthInsight {
  const trend = getDimensionTrend(history, 'supportScore');

  let severity: HealthInsight['severity'] = 'info';
  if (supportScore >= 70) severity = 'positive';
  else if (supportScore < 40) severity = 'critical';
  else if (supportScore < 60) severity = 'warning';

  return {
    dimension: 'support',
    insight:
      supportScore >= 70
        ? 'Low support burden indicates smooth product experience'
        : supportScore >= 50
          ? 'Moderate support activity, some issues may need attention'
          : 'High support volume suggests product or service issues',
    severity,
    trend,
    suggestedAction:
      supportScore < 60
        ? 'Review open tickets and escalation history'
        : undefined,
  };
}

/**
 * Analyze engagement dimension
 */
function analyzeEngagementDimension(
  engagementScore: number,
  crmMetrics: { activitiesLast30Days: number; meetingsLast30Days: number },
): HealthInsight {
  let severity: HealthInsight['severity'] = 'info';
  if (engagementScore >= 70) severity = 'positive';
  else if (engagementScore < 40) severity = 'critical';
  else if (engagementScore < 60) severity = 'warning';

  const trend: HealthInsight['trend'] =
    crmMetrics.activitiesLast30Days > 5
      ? 'improving'
      : crmMetrics.activitiesLast30Days < 2
        ? 'declining'
        : 'stable';

  return {
    dimension: 'engagement',
    insight:
      engagementScore >= 70
        ? 'Strong stakeholder engagement and communication'
        : engagementScore >= 50
          ? 'Adequate engagement but could be more proactive'
          : 'Low engagement may indicate relationship deterioration',
    severity,
    trend,
    suggestedAction:
      crmMetrics.meetingsLast30Days === 0
        ? 'Schedule a check-in meeting'
        : undefined,
  };
}

/**
 * Get trend for a specific dimension
 */
function getDimensionTrend(
  history: HealthScoreSnapshot[],
  field: 'usageScore' | 'supportScore' | 'engagementScore' | 'sentimentScore',
): 'improving' | 'stable' | 'declining' {
  if (history.length < 2) return 'stable';

  const newest = history[0][field];
  const oldest = history[history.length - 1][field];

  if (newest === null || oldest === null) return 'stable';

  const diff = newest - oldest;
  if (diff > 10) return 'improving';
  if (diff < -10) return 'declining';
  return 'stable';
}

/**
 * Detect anomalies in health history
 */
function detectAnomalies(history: HealthScoreSnapshot[]): HealthAnomaly[] {
  const anomalies: HealthAnomaly[] = [];

  if (history.length < 2) return anomalies;

  // Check for sudden drops (>15 points between consecutive records)
  for (let i = 0; i < history.length - 1; i++) {
    const current = history[i];
    const previous = history[i + 1];
    const drop = previous.overallScore - current.overallScore;

    if (drop > 15) {
      anomalies.push({
        dimension: 'overall',
        anomalyType: 'sudden_drop',
        description: `Health score dropped ${drop} points from ${previous.overallScore} to ${current.overallScore}`,
        severity: drop > 25 ? 'high' : 'medium',
        possibleCauses: [
          'Major product issue or outage',
          'Key stakeholder departure',
          'Escalation or complaint',
          'Contract/billing dispute',
        ],
      });
    }
  }

  // Check for sustained decline (3+ consecutive decreases)
  let consecutiveDeclines = 0;
  for (let i = 0; i < history.length - 1; i++) {
    if (history[i].overallScore < history[i + 1].overallScore) {
      consecutiveDeclines++;
    } else {
      consecutiveDeclines = 0;
    }

    if (consecutiveDeclines >= 3) {
      anomalies.push({
        dimension: 'overall',
        anomalyType: 'sustained_decline',
        description: `Health score has declined for ${consecutiveDeclines + 1} consecutive periods`,
        severity: consecutiveDeclines >= 5 ? 'high' : 'medium',
        possibleCauses: [
          'Gradual disengagement',
          'Unresolved issues accumulating',
          'Competition or alternative evaluation',
          'Budget constraints',
        ],
      });
      break;
    }
  }

  return anomalies;
}

/**
 * Generate overall insight text
 */
function generateOverallInsight(
  score: number,
  trajectory: 'improving' | 'stable' | 'declining',
): string {
  const scoreLevel =
    score >= 70 ? 'healthy' : score >= 50 ? 'moderate' : 'concerning';
  const trajectoryText =
    trajectory === 'improving'
      ? 'trending upward'
      : trajectory === 'declining'
        ? 'trending downward'
        : 'stable';

  return `Overall health score of ${score} is ${scoreLevel} and ${trajectoryText}`;
}

/**
 * Generate executive summary
 */
function generateSummary(
  accountName: string,
  currentScore: number,
  predictedScore: number,
  trajectory: 'improving' | 'stable' | 'declining',
  riskAreas: string[],
): string {
  const scoreDirection =
    trajectory === 'improving'
      ? 'improving'
      : trajectory === 'declining'
        ? 'declining'
        : 'stable';

  let summary = `${accountName} has a health score of ${currentScore} which is ${scoreDirection}. `;

  if (predictedScore !== currentScore) {
    summary += `The score is projected to ${predictedScore > currentScore ? 'increase' : 'decrease'} to ${predictedScore} over the next 30 days. `;
  }

  if (riskAreas.length > 0) {
    summary += `Key areas requiring attention: ${riskAreas.join(', ')}.`;
  } else {
    summary += 'No critical areas of concern identified.';
  }

  return summary;
}
