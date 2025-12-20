/**
 * Intake Analytics Service
 *
 * Provides comprehensive analytics for intake form performance,
 * conversion funnels, drop-off analysis, and optimization insights.
 */

import { prisma } from '../../../prisma/client';
import { env } from '../../../config/env';

// ============================================================================
// TYPES
// ============================================================================

export interface IntakeAnalytics {
  overview: OverviewMetrics;
  funnel: FunnelMetrics;
  fieldAnalytics: FieldAnalytics[];
  timeMetrics: TimeMetrics;
  sourceMetrics: SourceMetrics[];
  formComparison?: FormComparisonMetrics[];
  trends: TrendData[];
}

export interface OverviewMetrics {
  totalSubmissions: number;
  completedSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  inProgressSubmissions: number;
  conversionRate: number;
  approvalRate: number;
  avgCompletionTime: number; // in minutes
}

export interface FunnelMetrics {
  stages: FunnelStage[];
  overallDropOffRate: number;
  biggestDropOffStage: string;
}

export interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  dropOffRate: number;
}

export interface FieldAnalytics {
  fieldId: number;
  fieldName: string;
  fieldLabel: string;
  completionRate: number;
  avgTimeToComplete: number; // seconds
  errorRate: number;
  skipRate: number;
  dropOffCount: number;
  isBottleneck: boolean;
}

export interface TimeMetrics {
  avgStartToComplete: number; // minutes
  avgStartToSubmit: number;
  avgSubmitToReview: number;
  avgReviewToDecision: number;
  peakHours: number[];
  peakDays: string[];
}

export interface SourceMetrics {
  source: string;
  count: number;
  percentage: number;
  conversionRate: number;
  avgScore: number;
}

export interface FormComparisonMetrics {
  formId: number;
  formName: string;
  submissions: number;
  completionRate: number;
  avgTime: number;
  conversionRate: number;
}

export interface TrendData {
  date: string;
  submissions: number;
  completions: number;
  approvals: number;
  avgTime: number;
}

export interface OptimizationSuggestion {
  type: 'field' | 'form' | 'flow' | 'timing';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImpact: string;
  fieldId?: number;
}

export interface AnalyticsFilter {
  startDate: Date;
  endDate: Date;
  formId?: number;
  source?: string;
  status?: string;
}

// ============================================================================
// MAIN ANALYTICS FUNCTIONS
// ============================================================================

/**
 * Get comprehensive intake analytics
 */
export async function getIntakeAnalytics(
  configId: number,
  filter: AnalyticsFilter
): Promise<IntakeAnalytics> {
  const { startDate, endDate, formId, source, status } = filter;

  // Build base where clause
  const whereClause: Record<string, unknown> = {
    form: {
      configId,
    },
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (formId) whereClause.formId = formId;

  // Get all submissions in date range
  const submissions = await prisma.intakeSubmission.findMany({
    where: whereClause,
    include: {
      form: {
        include: {
          fields: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Calculate overview metrics
  const overview = calculateOverviewMetrics(submissions);

  // Calculate funnel metrics
  const funnel = calculateFunnelMetrics(submissions);

  // Calculate field-level analytics
  const fieldAnalytics = await calculateFieldAnalytics(configId, submissions);

  // Calculate time metrics
  const timeMetrics = calculateTimeMetrics(submissions);

  // Calculate source metrics
  const sourceMetrics = calculateSourceMetrics(submissions);

  // Calculate trends
  const trends = calculateTrends(submissions, startDate, endDate);

  // Get form comparison if multiple forms
  const forms = await prisma.intakeForm.findMany({
    where: { configId },
    select: { id: true, name: true },
  });

  let formComparison: FormComparisonMetrics[] | undefined;
  if (forms.length > 1) {
    formComparison = await calculateFormComparison(configId, submissions);
  }

  return {
    overview,
    funnel,
    fieldAnalytics,
    timeMetrics,
    sourceMetrics,
    formComparison,
    trends,
  };
}

/**
 * Get optimization suggestions based on analytics
 */
export async function getOptimizationSuggestions(
  configId: number,
  filter: AnalyticsFilter
): Promise<OptimizationSuggestion[]> {
  const analytics = await getIntakeAnalytics(configId, filter);
  const suggestions: OptimizationSuggestion[] = [];

  // Check for high drop-off fields
  const bottleneckFields = analytics.fieldAnalytics.filter(f => f.isBottleneck);
  for (const field of bottleneckFields) {
    suggestions.push({
      type: 'field',
      priority: 'high',
      title: `Optimize field: ${field.fieldLabel}`,
      description: `This field has a ${(field.dropOffCount / analytics.overview.totalSubmissions * 100).toFixed(1)}% drop-off rate and ${field.avgTimeToComplete.toFixed(0)}s average completion time.`,
      expectedImpact: `Could improve completion rate by ${(field.dropOffCount * 0.3).toFixed(0)} submissions`,
      fieldId: field.fieldId,
    });
  }

  // Check for low completion rate
  if (analytics.overview.conversionRate < 0.5) {
    suggestions.push({
      type: 'form',
      priority: 'high',
      title: 'Low form completion rate',
      description: `Only ${(analytics.overview.conversionRate * 100).toFixed(1)}% of started forms are completed. Consider simplifying the form or adding progress indicators.`,
      expectedImpact: 'Could increase completions by 20-30%',
    });
  }

  // Check for slow completion times
  if (analytics.timeMetrics.avgStartToComplete > 20) {
    suggestions.push({
      type: 'flow',
      priority: 'medium',
      title: 'Long form completion time',
      description: `Average completion time is ${analytics.timeMetrics.avgStartToComplete.toFixed(0)} minutes. Consider breaking the form into multiple pages or reducing required fields.`,
      expectedImpact: 'Reduce abandonment by 15-20%',
    });
  }

  // Check for peak time optimization
  if (analytics.timeMetrics.peakHours.length > 0) {
    const peakHour = analytics.timeMetrics.peakHours[0];
    suggestions.push({
      type: 'timing',
      priority: 'low',
      title: 'Optimize for peak hours',
      description: `Most submissions occur around ${peakHour}:00. Consider sending reminders or marketing during off-peak hours to balance load.`,
      expectedImpact: 'Better resource utilization',
    });
  }

  // Check for low-performing sources
  const lowSources = analytics.sourceMetrics.filter(
    s => s.conversionRate < analytics.overview.conversionRate * 0.7
  );
  for (const source of lowSources) {
    suggestions.push({
      type: 'flow',
      priority: 'medium',
      title: `Optimize intake from ${source.source}`,
      description: `Submissions from ${source.source} have a ${(source.conversionRate * 100).toFixed(1)}% conversion rate, below average.`,
      expectedImpact: `Could improve ${source.count} submissions`,
    });
  }

  // Use AI for additional insights if available
  if (env.openaiApiKey && suggestions.length < 5) {
    try {
      const aiSuggestions = await getAISuggestions(analytics);
      suggestions.push(...aiSuggestions);
    } catch {
      // AI suggestions are optional
    }
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return suggestions;
}

/**
 * Get drop-off analysis
 */
export async function getDropOffAnalysis(
  configId: number,
  formId: number
): Promise<{
  totalStarted: number;
  dropOffPoints: Array<{
    fieldId: number;
    fieldName: string;
    dropOffs: number;
    percentage: number;
  }>;
  avgProgressAtAbandonment: number;
}> {
  // Get form with fields
  const form = await prisma.intakeForm.findUnique({
    where: { id: formId },
    include: {
      fields: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!form) {
    throw new Error('Form not found');
  }

  // Get incomplete submissions (IN_PROGRESS)
  const abandonedSubmissions = await prisma.intakeSubmission.findMany({
    where: {
      formId,
      status: 'IN_PROGRESS',
    },
  });

  const totalStarted = abandonedSubmissions.length + await prisma.intakeSubmission.count({
    where: { formId, status: { not: 'IN_PROGRESS' } },
  });

  const fieldDropOffs = new Map<number, number>();
  let totalProgress = 0;

  for (const submission of abandonedSubmissions) {
    const formData = submission.formData as Record<string, unknown> | null;
    if (!formData) continue;

    // Find last completed field
    let lastCompletedIndex = -1;
    for (let i = 0; i < form.fields.length; i++) {
      const field = form.fields[i];
      if (formData[field.name] !== undefined && formData[field.name] !== '') {
        lastCompletedIndex = i;
      }
    }

    // Mark drop-off at next field
    const dropOffFieldIndex = lastCompletedIndex + 1;
    if (dropOffFieldIndex < form.fields.length) {
      const fieldId = form.fields[dropOffFieldIndex].id;
      fieldDropOffs.set(fieldId, (fieldDropOffs.get(fieldId) || 0) + 1);
    }

    // Calculate progress
    totalProgress += (lastCompletedIndex + 1) / form.fields.length;
  }

  const dropOffPoints = form.fields.map(field => ({
    fieldId: field.id,
    fieldName: field.name,
    dropOffs: fieldDropOffs.get(field.id) || 0,
    percentage: totalStarted > 0
      ? ((fieldDropOffs.get(field.id) || 0) / totalStarted) * 100
      : 0,
  })).filter(d => d.dropOffs > 0);

  return {
    totalStarted,
    dropOffPoints,
    avgProgressAtAbandonment: abandonedSubmissions.length > 0
      ? (totalProgress / abandonedSubmissions.length) * 100
      : 0,
  };
}

/**
 * Export analytics report
 */
export async function exportAnalyticsReport(
  configId: number,
  filter: AnalyticsFilter,
  format: 'csv' | 'json'
): Promise<string> {
  const analytics = await getIntakeAnalytics(configId, filter);

  if (format === 'json') {
    return JSON.stringify(analytics, null, 2);
  }

  // Generate CSV
  const lines: string[] = [];

  // Overview section
  lines.push('# INTAKE ANALYTICS REPORT');
  lines.push(`# Period: ${filter.startDate.toISOString()} to ${filter.endDate.toISOString()}`);
  lines.push('');
  lines.push('## Overview');
  lines.push('Metric,Value');
  lines.push(`Total Submissions,${analytics.overview.totalSubmissions}`);
  lines.push(`Completed,${analytics.overview.completedSubmissions}`);
  lines.push(`Approved,${analytics.overview.approvedSubmissions}`);
  lines.push(`Rejected,${analytics.overview.rejectedSubmissions}`);
  lines.push(`Conversion Rate,${(analytics.overview.conversionRate * 100).toFixed(1)}%`);
  lines.push(`Avg Completion Time,${analytics.overview.avgCompletionTime.toFixed(0)} min`);
  lines.push('');

  // Funnel section
  lines.push('## Conversion Funnel');
  lines.push('Stage,Count,Percentage,Drop-off Rate');
  for (const stage of analytics.funnel.stages) {
    lines.push(`${stage.name},${stage.count},${stage.percentage.toFixed(1)}%,${stage.dropOffRate.toFixed(1)}%`);
  }
  lines.push('');

  // Field analytics
  lines.push('## Field Analytics');
  lines.push('Field,Completion Rate,Avg Time (s),Error Rate,Skip Rate,Bottleneck');
  for (const field of analytics.fieldAnalytics) {
    lines.push(`${field.fieldLabel},${(field.completionRate * 100).toFixed(1)}%,${field.avgTimeToComplete.toFixed(0)},${(field.errorRate * 100).toFixed(1)}%,${(field.skipRate * 100).toFixed(1)}%,${field.isBottleneck ? 'Yes' : 'No'}`);
  }
  lines.push('');

  // Trends
  lines.push('## Daily Trends');
  lines.push('Date,Submissions,Completions,Approvals,Avg Time (min)');
  for (const trend of analytics.trends) {
    lines.push(`${trend.date},${trend.submissions},${trend.completions},${trend.approvals},${trend.avgTime.toFixed(0)}`);
  }

  return lines.join('\n');
}

// ============================================================================
// CALCULATION HELPERS
// ============================================================================

interface SubmissionWithForm {
  id: number;
  status: string;
  formData: unknown;
  createdAt: Date;
  updatedAt: Date;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  form: {
    id: number;
    name: string;
    fields: Array<{
      id: number;
      name: string;
      label: string;
    }>;
  };
}

function calculateOverviewMetrics(submissions: SubmissionWithForm[]): OverviewMetrics {
  const total = submissions.length;
  const completed = submissions.filter(s => s.status !== 'IN_PROGRESS').length;
  const approved = submissions.filter(s => s.status === 'APPROVED').length;
  const rejected = submissions.filter(s => s.status === 'REJECTED').length;
  const inProgress = submissions.filter(s => s.status === 'IN_PROGRESS').length;

  // Calculate average completion time
  let totalTime = 0;
  let completedCount = 0;
  for (const s of submissions) {
    if (s.submittedAt && s.createdAt) {
      totalTime += (s.submittedAt.getTime() - s.createdAt.getTime()) / (1000 * 60);
      completedCount++;
    }
  }

  return {
    totalSubmissions: total,
    completedSubmissions: completed,
    approvedSubmissions: approved,
    rejectedSubmissions: rejected,
    inProgressSubmissions: inProgress,
    conversionRate: total > 0 ? completed / total : 0,
    approvalRate: completed > 0 ? approved / completed : 0,
    avgCompletionTime: completedCount > 0 ? totalTime / completedCount : 0,
  };
}

function calculateFunnelMetrics(submissions: SubmissionWithForm[]): FunnelMetrics {
  const stages = [
    { name: 'Started', status: null },
    { name: 'In Progress', status: 'IN_PROGRESS' },
    { name: 'Submitted', status: 'SUBMITTED' },
    { name: 'Under Review', status: 'UNDER_REVIEW' },
    { name: 'Approved', status: 'APPROVED' },
  ];

  const total = submissions.length;
  const stageCounts: FunnelStage[] = [];
  let prevCount = total;

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    let count: number;

    if (stage.status === null) {
      count = total;
    } else if (stage.status === 'APPROVED') {
      count = submissions.filter(s => s.status === 'APPROVED').length;
    } else {
      // Count submissions that have reached or passed this stage
      const laterStages = stages.slice(i).map(s => s.status).filter(Boolean);
      count = submissions.filter(s =>
        s.status === stage.status || laterStages.includes(s.status!)
      ).length;
    }

    const dropOff = prevCount > 0 ? ((prevCount - count) / prevCount) * 100 : 0;

    stageCounts.push({
      name: stage.name,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
      dropOffRate: dropOff,
    });

    prevCount = count;
  }

  // Find biggest drop-off
  let biggestDropOff = stageCounts[0];
  for (const stage of stageCounts) {
    if (stage.dropOffRate > biggestDropOff.dropOffRate) {
      biggestDropOff = stage;
    }
  }

  return {
    stages: stageCounts,
    overallDropOffRate: total > 0
      ? ((total - submissions.filter(s => s.status === 'APPROVED').length) / total) * 100
      : 0,
    biggestDropOffStage: biggestDropOff.name,
  };
}

async function calculateFieldAnalytics(
  configId: number,
  submissions: SubmissionWithForm[]
): Promise<FieldAnalytics[]> {
  // Get all fields for forms in this config
  const forms = await prisma.intakeForm.findMany({
    where: { configId },
    include: {
      fields: true,
    },
  });

  const fieldStats = new Map<number, {
    field: { id: number; name: string; label: string };
    completions: number;
    errors: number;
    skips: number;
    dropOffs: number;
    totalTime: number;
    timeCount: number;
  }>();

  // Initialize field stats
  for (const form of forms) {
    for (const field of form.fields) {
      fieldStats.set(field.id, {
        field: { id: field.id, name: field.name, label: field.label },
        completions: 0,
        errors: 0,
        skips: 0,
        dropOffs: 0,
        totalTime: 5, // Default estimate
        timeCount: 1,
      });
    }
  }

  // Analyze submissions
  for (const submission of submissions) {
    const formData = submission.formData as Record<string, unknown> | null;
    if (!formData) continue;

    for (const field of submission.form.fields) {
      const stats = fieldStats.get(field.id);
      if (!stats) continue;

      const value = formData[field.name];

      if (value !== undefined && value !== null && value !== '') {
        stats.completions++;
      } else if (submission.status !== 'IN_PROGRESS') {
        stats.skips++;
      }
    }
  }

  // Calculate metrics
  const result: FieldAnalytics[] = [];
  const avgDropOff = submissions.length * 0.1; // 10% baseline

  for (const [fieldId, stats] of fieldStats) {
    const total = submissions.filter(s =>
      s.form.fields.some(f => f.id === fieldId)
    ).length;

    const completionRate = total > 0 ? stats.completions / total : 0;
    const errorRate = total > 0 ? stats.errors / total : 0;
    const skipRate = total > 0 ? stats.skips / total : 0;

    result.push({
      fieldId: stats.field.id,
      fieldName: stats.field.name,
      fieldLabel: stats.field.label,
      completionRate,
      avgTimeToComplete: stats.timeCount > 0 ? stats.totalTime / stats.timeCount : 5,
      errorRate,
      skipRate,
      dropOffCount: stats.dropOffs,
      isBottleneck: stats.dropOffs > avgDropOff || completionRate < 0.7,
    });
  }

  return result;
}

function calculateTimeMetrics(submissions: SubmissionWithForm[]): TimeMetrics {
  let totalStartToComplete = 0;
  let totalStartToSubmit = 0;
  let totalSubmitToReview = 0;
  let totalReviewToDecision = 0;
  let countComplete = 0;
  let countSubmit = 0;
  let countReview = 0;
  let countDecision = 0;

  const hourCounts = new Map<number, number>();
  const dayCounts = new Map<string, number>();

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (const s of submissions) {
    // Track peak hours and days
    const hour = s.createdAt.getHours();
    hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);

    const day = dayNames[s.createdAt.getDay()];
    dayCounts.set(day, (dayCounts.get(day) || 0) + 1);

    // Time calculations
    if (s.submittedAt) {
      const startToSubmit = (s.submittedAt.getTime() - s.createdAt.getTime()) / (1000 * 60);
      totalStartToSubmit += startToSubmit;
      countSubmit++;

      if (s.status !== 'IN_PROGRESS' && s.status !== 'SUBMITTED') {
        totalStartToComplete += startToSubmit;
        countComplete++;
      }
    }

    if (s.reviewedAt && s.submittedAt) {
      const submitToReview = (s.reviewedAt.getTime() - s.submittedAt.getTime()) / (1000 * 60);
      totalSubmitToReview += submitToReview;
      countReview++;
    }

    if (s.status === 'APPROVED' || s.status === 'REJECTED') {
      if (s.reviewedAt && s.submittedAt) {
        const reviewToDecision = (s.updatedAt.getTime() - s.reviewedAt.getTime()) / (1000 * 60);
        totalReviewToDecision += reviewToDecision;
        countDecision++;
      }
    }
  }

  // Find peak hours (top 3)
  const sortedHours = [...hourCounts.entries()].sort((a, b) => b[1] - a[1]);
  const peakHours = sortedHours.slice(0, 3).map(([hour]) => hour);

  // Find peak days (top 2)
  const sortedDays = [...dayCounts.entries()].sort((a, b) => b[1] - a[1]);
  const peakDays = sortedDays.slice(0, 2).map(([day]) => day);

  return {
    avgStartToComplete: countComplete > 0 ? totalStartToComplete / countComplete : 0,
    avgStartToSubmit: countSubmit > 0 ? totalStartToSubmit / countSubmit : 0,
    avgSubmitToReview: countReview > 0 ? totalSubmitToReview / countReview : 0,
    avgReviewToDecision: countDecision > 0 ? totalReviewToDecision / countDecision : 0,
    peakHours,
    peakDays,
  };
}

function calculateSourceMetrics(submissions: SubmissionWithForm[]): SourceMetrics[] {
  const sourceStats = new Map<string, {
    count: number;
    completed: number;
    totalScore: number;
    scoreCount: number;
  }>();

  for (const s of submissions) {
    const formData = s.formData as Record<string, unknown> | null;
    const source = (formData?.source as string) ||
      (formData?.lead_source as string) ||
      (formData?.utm_source as string) ||
      'Direct';

    const stats = sourceStats.get(source) || {
      count: 0,
      completed: 0,
      totalScore: 0,
      scoreCount: 0,
    };

    stats.count++;
    if (s.status === 'APPROVED' || s.status === 'COMPLETED') {
      stats.completed++;
    }

    const leadScore = formData?._leadScore as { score?: number } | undefined;
    if (leadScore?.score) {
      stats.totalScore += leadScore.score;
      stats.scoreCount++;
    }

    sourceStats.set(source, stats);
  }

  const total = submissions.length;
  const result: SourceMetrics[] = [];

  for (const [source, stats] of sourceStats) {
    result.push({
      source,
      count: stats.count,
      percentage: total > 0 ? (stats.count / total) * 100 : 0,
      conversionRate: stats.count > 0 ? stats.completed / stats.count : 0,
      avgScore: stats.scoreCount > 0 ? stats.totalScore / stats.scoreCount : 0,
    });
  }

  return result.sort((a, b) => b.count - a.count);
}

function calculateTrends(
  submissions: SubmissionWithForm[],
  startDate: Date,
  endDate: Date
): TrendData[] {
  const trends = new Map<string, {
    submissions: number;
    completions: number;
    approvals: number;
    totalTime: number;
    timeCount: number;
  }>();

  // Initialize all dates in range
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateKey = current.toISOString().split('T')[0];
    trends.set(dateKey, {
      submissions: 0,
      completions: 0,
      approvals: 0,
      totalTime: 0,
      timeCount: 0,
    });
    current.setDate(current.getDate() + 1);
  }

  // Populate with submission data
  for (const s of submissions) {
    const dateKey = s.createdAt.toISOString().split('T')[0];
    const stats = trends.get(dateKey);
    if (!stats) continue;

    stats.submissions++;

    if (s.status !== 'IN_PROGRESS') {
      stats.completions++;
    }

    if (s.status === 'APPROVED') {
      stats.approvals++;
    }

    if (s.submittedAt) {
      const time = (s.submittedAt.getTime() - s.createdAt.getTime()) / (1000 * 60);
      stats.totalTime += time;
      stats.timeCount++;
    }
  }

  return [...trends.entries()].map(([date, stats]) => ({
    date,
    submissions: stats.submissions,
    completions: stats.completions,
    approvals: stats.approvals,
    avgTime: stats.timeCount > 0 ? stats.totalTime / stats.timeCount : 0,
  }));
}

async function calculateFormComparison(
  configId: number,
  submissions: SubmissionWithForm[]
): Promise<FormComparisonMetrics[]> {
  const formStats = new Map<number, {
    name: string;
    total: number;
    completed: number;
    approved: number;
    totalTime: number;
    timeCount: number;
  }>();

  for (const s of submissions) {
    const stats = formStats.get(s.form.id) || {
      name: s.form.name,
      total: 0,
      completed: 0,
      approved: 0,
      totalTime: 0,
      timeCount: 0,
    };

    stats.total++;

    if (s.status !== 'IN_PROGRESS') {
      stats.completed++;
    }

    if (s.status === 'APPROVED') {
      stats.approved++;
    }

    if (s.submittedAt) {
      stats.totalTime += (s.submittedAt.getTime() - s.createdAt.getTime()) / (1000 * 60);
      stats.timeCount++;
    }

    formStats.set(s.form.id, stats);
  }

  return [...formStats.entries()].map(([formId, stats]) => ({
    formId,
    formName: stats.name,
    submissions: stats.total,
    completionRate: stats.total > 0 ? stats.completed / stats.total : 0,
    avgTime: stats.timeCount > 0 ? stats.totalTime / stats.timeCount : 0,
    conversionRate: stats.total > 0 ? stats.approved / stats.total : 0,
  }));
}

async function getAISuggestions(analytics: IntakeAnalytics): Promise<OptimizationSuggestion[]> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 500,
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an intake form optimization expert. Analyze the metrics and suggest 2-3 improvements.
Return JSON: { "suggestions": [{ "type": "field"|"form"|"flow"|"timing", "priority": "high"|"medium"|"low", "title": string, "description": string, "expectedImpact": string }] }`,
        },
        {
          role: 'user',
          content: `Metrics:
- Conversion rate: ${(analytics.overview.conversionRate * 100).toFixed(1)}%
- Avg completion time: ${analytics.overview.avgCompletionTime.toFixed(0)} min
- Biggest drop-off: ${analytics.funnel.biggestDropOffStage}
- Bottleneck fields: ${analytics.fieldAnalytics.filter(f => f.isBottleneck).map(f => f.fieldLabel).join(', ')}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const parsed = JSON.parse(data.choices[0].message.content);

  return parsed.suggestions || [];
}
