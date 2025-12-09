/**
 * Document Analyzer Analytics Service
 *
 * Provides comprehensive analytics, ROI tracking, and reporting
 * for document processing operations.
 */

import { prisma } from '../../../prisma/client';
import { DocumentCategory, AnalysisStatus } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface AnalyticsPeriod {
  start: Date;
  end: Date;
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
}

export interface ProcessingStats {
  totalDocuments: number;
  successfulDocuments: number;
  failedDocuments: number;
  pendingDocuments: number;
  manualReviewDocuments: number;
  successRate: number;
  avgProcessingTimeMs: number;
  totalProcessingTimeMs: number;
}

export interface CategoryStats {
  category: DocumentCategory;
  count: number;
  percentage: number;
  avgConfidence: number;
  avgProcessingTimeMs: number;
}

export interface ComplianceStats {
  passCount: number;
  warningCount: number;
  failCount: number;
  passRate: number;
  avgRiskScore: number;
  topIssues: Array<{ issue: string; count: number }>;
}

export interface ROIMetrics {
  documentsProcessed: number;
  estimatedManualTimeMinutes: number;
  actualProcessingTimeMinutes: number;
  timeSavedMinutes: number;
  timeSavingsPercentage: number;
  estimatedCostSaved: number;
  costPerDocument: number;
  roi: number; // Return on investment percentage
}

export interface DashboardData {
  period: AnalyticsPeriod;
  processing: ProcessingStats;
  categories: CategoryStats[];
  compliance: ComplianceStats;
  roi: ROIMetrics;
  trends: TrendData;
  recentActivity: ActivityItem[];
}

export interface TrendData {
  labels: string[];
  documentsProcessed: number[];
  successRate: number[];
  avgProcessingTime: number[];
}

export interface ActivityItem {
  id: number;
  filename: string;
  category: DocumentCategory | null;
  status: AnalysisStatus;
  processedAt: Date | null;
  processingTimeMs: number | null;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

// Estimated time to manually process documents (in minutes)
const MANUAL_PROCESSING_TIME: Record<string, number> = {
  INVOICE: 7, // Based on research: 7+ minutes per invoice manually
  CONTRACT: 45, // Contract review averages 45 minutes
  COMPLIANCE: 15,
  HEALTHCARE: 12, // Healthcare forms complex
  LEGAL: 30,
  FINANCIAL: 10,
  REAL_ESTATE: 20,
  MANUFACTURING: 8,
  GENERAL: 5,
  OTHER: 5,
};

// Estimated hourly cost of manual document processing
const HOURLY_PROCESSING_COST = 35; // $35/hour average

// ============================================================================
// ANALYTICS SERVICE
// ============================================================================

/**
 * Get processing statistics for a config and period
 */
export async function getProcessingStats(
  configId: number,
  period: AnalyticsPeriod,
): Promise<ProcessingStats> {
  const documents = await prisma.analyzedDocument.findMany({
    where: {
      configId,
      createdAt: {
        gte: period.start,
        lte: period.end,
      },
    },
    select: {
      status: true,
      analysisTimeMs: true,
    },
  });

  const total = documents.length;
  const successful = documents.filter((d) => d.status === 'COMPLETED').length;
  const failed = documents.filter((d) => d.status === 'FAILED').length;
  const pending = documents.filter(
    (d) => d.status === 'PENDING' || d.status === 'PROCESSING',
  ).length;
  const manualReview = documents.filter(
    (d) => d.status === 'NEEDS_REVIEW',
  ).length;

  const processingTimes = documents
    .filter((d) => d.analysisTimeMs !== null)
    .map((d) => d.analysisTimeMs as number);

  const totalTime = processingTimes.reduce((sum, t) => sum + t, 0);
  const avgTime =
    processingTimes.length > 0 ? totalTime / processingTimes.length : 0;

  return {
    totalDocuments: total,
    successfulDocuments: successful,
    failedDocuments: failed,
    pendingDocuments: pending,
    manualReviewDocuments: manualReview,
    successRate: total > 0 ? (successful / total) * 100 : 0,
    avgProcessingTimeMs: avgTime,
    totalProcessingTimeMs: totalTime,
  };
}

/**
 * Get category breakdown statistics
 */
export async function getCategoryStats(
  configId: number,
  period: AnalyticsPeriod,
): Promise<CategoryStats[]> {
  const documents = await prisma.analyzedDocument.findMany({
    where: {
      configId,
      status: 'COMPLETED',
      createdAt: {
        gte: period.start,
        lte: period.end,
      },
    },
    select: {
      category: true,
      documentTypeConfidence: true,
      analysisTimeMs: true,
    },
  });

  const categoryMap = new Map<
    DocumentCategory,
    {
      count: number;
      confidenceSum: number;
      timeSum: number;
      timeCount: number;
    }
  >();

  for (const doc of documents) {
    const category = doc.category || 'GENERAL';
    const existing = categoryMap.get(category) || {
      count: 0,
      confidenceSum: 0,
      timeSum: 0,
      timeCount: 0,
    };

    existing.count++;
    if (doc.documentTypeConfidence) {
      existing.confidenceSum += doc.documentTypeConfidence;
    }
    if (doc.analysisTimeMs) {
      existing.timeSum += doc.analysisTimeMs;
      existing.timeCount++;
    }

    categoryMap.set(category, existing);
  }

  const total = documents.length;
  const stats: CategoryStats[] = [];

  for (const [category, data] of categoryMap.entries()) {
    stats.push({
      category,
      count: data.count,
      percentage: total > 0 ? (data.count / total) * 100 : 0,
      avgConfidence: data.count > 0 ? data.confidenceSum / data.count : 0,
      avgProcessingTimeMs:
        data.timeCount > 0 ? data.timeSum / data.timeCount : 0,
    });
  }

  return stats.sort((a, b) => b.count - a.count);
}

/**
 * Get compliance statistics
 */
export async function getComplianceStats(
  configId: number,
  period: AnalyticsPeriod,
): Promise<ComplianceStats> {
  const documents = await prisma.analyzedDocument.findMany({
    where: {
      configId,
      status: 'COMPLETED',
      createdAt: {
        gte: period.start,
        lte: period.end,
      },
    },
    select: {
      complianceStatus: true,
      complianceFlags: true,
      riskScore: true,
    },
  });

  let passCount = 0;
  let warningCount = 0;
  let failCount = 0;
  let riskScoreSum = 0;
  let riskScoreCount = 0;
  const issueCounter = new Map<string, number>();

  for (const doc of documents) {
    switch (doc.complianceStatus) {
      case 'PASS':
        passCount++;
        break;
      case 'WARNING':
        warningCount++;
        break;
      case 'FAIL':
        failCount++;
        break;
    }

    if (doc.riskScore !== null) {
      riskScoreSum += doc.riskScore;
      riskScoreCount++;
    }

    // Count compliance flags
    if (doc.complianceFlags && Array.isArray(doc.complianceFlags)) {
      for (const flag of doc.complianceFlags as Array<{ ruleName: string }>) {
        if (flag.ruleName) {
          issueCounter.set(
            flag.ruleName,
            (issueCounter.get(flag.ruleName) || 0) + 1,
          );
        }
      }
    }
  }

  const total = passCount + warningCount + failCount;
  const topIssues = Array.from(issueCounter.entries())
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    passCount,
    warningCount,
    failCount,
    passRate: total > 0 ? (passCount / total) * 100 : 0,
    avgRiskScore: riskScoreCount > 0 ? riskScoreSum / riskScoreCount : 0,
    topIssues,
  };
}

/**
 * Calculate ROI metrics
 */
export async function calculateROI(
  configId: number,
  period: AnalyticsPeriod,
): Promise<ROIMetrics> {
  const documents = await prisma.analyzedDocument.findMany({
    where: {
      configId,
      status: 'COMPLETED',
      createdAt: {
        gte: period.start,
        lte: period.end,
      },
    },
    select: {
      category: true,
      analysisTimeMs: true,
    },
  });

  let totalManualMinutes = 0;
  let totalActualMs = 0;

  for (const doc of documents) {
    const category = doc.category || 'GENERAL';
    const manualTime =
      MANUAL_PROCESSING_TIME[category] || MANUAL_PROCESSING_TIME.GENERAL;
    totalManualMinutes += manualTime;

    if (doc.analysisTimeMs) {
      totalActualMs += doc.analysisTimeMs;
    }
  }

  const actualMinutes = totalActualMs / (1000 * 60);
  const timeSaved = totalManualMinutes - actualMinutes;
  const timeSavingsPercentage =
    totalManualMinutes > 0 ? (timeSaved / totalManualMinutes) * 100 : 0;

  // Cost calculations
  const manualCost = (totalManualMinutes / 60) * HOURLY_PROCESSING_COST;
  const automatedCost = 0; // Assuming minimal API costs for now
  const costSaved = manualCost - automatedCost;

  const costPerDocument =
    documents.length > 0 ? automatedCost / documents.length : 0;

  // ROI calculation: (Savings - Investment) / Investment * 100
  // For simplicity, we consider investment as the automated processing cost
  const roi =
    automatedCost > 0
      ? ((costSaved - automatedCost) / automatedCost) * 100
      : costSaved > 0
        ? 100
        : 0;

  return {
    documentsProcessed: documents.length,
    estimatedManualTimeMinutes: totalManualMinutes,
    actualProcessingTimeMinutes: actualMinutes,
    timeSavedMinutes: timeSaved,
    timeSavingsPercentage,
    estimatedCostSaved: costSaved,
    costPerDocument,
    roi,
  };
}

/**
 * Get trend data for charts
 */
export async function getTrendData(
  configId: number,
  period: AnalyticsPeriod,
  dataPoints: number = 7,
): Promise<TrendData> {
  const totalMs = period.end.getTime() - period.start.getTime();
  const intervalMs = totalMs / dataPoints;

  const labels: string[] = [];
  const documentsProcessed: number[] = [];
  const successRate: number[] = [];
  const avgProcessingTime: number[] = [];

  for (let i = 0; i < dataPoints; i++) {
    const intervalStart = new Date(period.start.getTime() + i * intervalMs);
    const intervalEnd = new Date(period.start.getTime() + (i + 1) * intervalMs);

    labels.push(formatDateLabel(intervalStart, period.type));

    const documents = await prisma.analyzedDocument.findMany({
      where: {
        configId,
        createdAt: {
          gte: intervalStart,
          lt: intervalEnd,
        },
      },
      select: {
        status: true,
        analysisTimeMs: true,
      },
    });

    documentsProcessed.push(documents.length);

    const successful = documents.filter((d) => d.status === 'COMPLETED').length;
    successRate.push(
      documents.length > 0 ? (successful / documents.length) * 100 : 0,
    );

    const times = documents
      .filter((d) => d.analysisTimeMs !== null)
      .map((d) => d.analysisTimeMs as number);
    avgProcessingTime.push(
      times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0,
    );
  }

  return {
    labels,
    documentsProcessed,
    successRate,
    avgProcessingTime,
  };
}

/**
 * Get recent activity
 */
export async function getRecentActivity(
  configId: number,
  limit: number = 10,
): Promise<ActivityItem[]> {
  const documents = await prisma.analyzedDocument.findMany({
    where: { configId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      filename: true,
      category: true,
      status: true,
      analyzedAt: true,
      analysisTimeMs: true,
    },
  });

  return documents.map((d) => ({
    id: d.id,
    filename: d.filename,
    category: d.category,
    status: d.status,
    processedAt: d.analyzedAt,
    processingTimeMs: d.analysisTimeMs,
  }));
}

/**
 * Get complete dashboard data
 */
export async function getDashboardData(
  configId: number,
  period: AnalyticsPeriod,
): Promise<DashboardData> {
  const [processing, categories, compliance, roi, trends, recentActivity] =
    await Promise.all([
      getProcessingStats(configId, period),
      getCategoryStats(configId, period),
      getComplianceStats(configId, period),
      calculateROI(configId, period),
      getTrendData(configId, period),
      getRecentActivity(configId),
    ]);

  return {
    period,
    processing,
    categories,
    compliance,
    roi,
    trends,
    recentActivity,
  };
}

/**
 * Record processing metrics for a period
 */
export async function recordProcessingMetrics(
  configId: number,
  period: AnalyticsPeriod,
): Promise<void> {
  const [processing, categories, compliance, roi] = await Promise.all([
    getProcessingStats(configId, period),
    getCategoryStats(configId, period),
    getComplianceStats(configId, period),
    calculateROI(configId, period),
  ]);

  const categoryBreakdown: Record<string, number> = {};
  for (const cat of categories) {
    categoryBreakdown[cat.category] = cat.count;
  }

  await prisma.processingMetrics.upsert({
    where: {
      configId_periodStart_periodType: {
        configId,
        periodStart: period.start,
        periodType: period.type,
      },
    },
    update: {
      periodEnd: period.end,
      documentsProcessed: processing.totalDocuments,
      documentsSuccessful: processing.successfulDocuments,
      documentsFailed: processing.failedDocuments,
      documentsManualReview: processing.manualReviewDocuments,
      categoryBreakdown,
      totalProcessingTime: processing.totalProcessingTimeMs,
      avgProcessingTime: processing.avgProcessingTimeMs,
      avgConfidence:
        categories.length > 0
          ? categories.reduce((sum, c) => sum + c.avgConfidence, 0) /
            categories.length
          : null,
      compliancePassRate: compliance.passRate,
      complianceWarnings: compliance.warningCount,
      complianceFailures: compliance.failCount,
      estimatedTimeSaved: Math.round(roi.timeSavedMinutes),
      estimatedCostSaved: roi.estimatedCostSaved,
      updatedAt: new Date(),
    },
    create: {
      configId,
      periodStart: period.start,
      periodEnd: period.end,
      periodType: period.type,
      documentsProcessed: processing.totalDocuments,
      documentsSuccessful: processing.successfulDocuments,
      documentsFailed: processing.failedDocuments,
      documentsManualReview: processing.manualReviewDocuments,
      categoryBreakdown,
      totalProcessingTime: processing.totalProcessingTimeMs,
      avgProcessingTime: processing.avgProcessingTimeMs,
      avgConfidence:
        categories.length > 0
          ? categories.reduce((sum, c) => sum + c.avgConfidence, 0) /
            categories.length
          : null,
      compliancePassRate: compliance.passRate,
      complianceWarnings: compliance.warningCount,
      complianceFailures: compliance.failCount,
      estimatedTimeSaved: Math.round(roi.timeSavedMinutes),
      estimatedCostSaved: roi.estimatedCostSaved,
    },
  });
}

/**
 * Get historical metrics
 */
export async function getHistoricalMetrics(
  configId: number,
  periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY',
  limit: number = 30,
) {
  return prisma.processingMetrics.findMany({
    where: {
      configId,
      periodType,
    },
    orderBy: { periodStart: 'desc' },
    take: limit,
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDateLabel(
  date: Date,
  periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
): string {
  switch (periodType) {
    case 'DAILY':
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    case 'WEEKLY':
      return `Week ${getWeekNumber(date)}`;
    case 'MONTHLY':
      return date.toLocaleDateString('en-US', { month: 'short' });
    case 'QUARTERLY':
      return `Q${Math.ceil((date.getMonth() + 1) / 3)}`;
    case 'YEARLY':
      return date.getFullYear().toString();
    default:
      return date.toLocaleDateString();
  }
}

function getWeekNumber(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Create period from date range
 */
export function createPeriod(
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY',
  referenceDate: Date = new Date(),
): AnalyticsPeriod {
  const start = new Date(referenceDate);
  const end = new Date(referenceDate);

  switch (type) {
    case 'DAILY':
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'WEEKLY': {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'MONTHLY':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      break;
    case 'QUARTERLY': {
      const quarter = Math.floor(start.getMonth() / 3);
      start.setMonth(quarter * 3, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth((quarter + 1) * 3, 0);
      end.setHours(23, 59, 59, 999);
      break;
    }
    case 'YEARLY':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      break;
  }

  return { start, end, type };
}
