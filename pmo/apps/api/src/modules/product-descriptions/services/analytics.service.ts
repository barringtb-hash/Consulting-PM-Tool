/**
 * Performance Analytics Service for Product Descriptions
 *
 * Provides comprehensive analytics including:
 * - Description performance metrics (CTR, conversion rates)
 * - A/B test results and statistical significance
 * - Marketplace performance comparison
 * - Trend analysis over time
 * - SEO score distribution
 * - Compliance status overview
 * - Generation statistics
 */

import { prisma } from '../../../prisma/client';
import {
  Marketplace,
  GenerationJobStatus,
  ComplianceStatus,
} from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface PerformanceMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number; // Click-through rate (%)
  conversionRate: number; // Conversion rate (%)
  revenue?: number;
}

export interface DescriptionPerformance extends PerformanceMetrics {
  id: number;
  productId: number;
  productName: string;
  title: string;
  variant: string | null;
  isControl: boolean;
  marketplace: Marketplace;
  seoScore: number | null;
  complianceStatus: ComplianceStatus;
  createdAt: Date;
}

export interface ABTestResult {
  productId: number;
  productName: string;
  controlVariant: DescriptionPerformance | null;
  testVariants: DescriptionPerformance[];
  winner: 'control' | string | null;
  confidenceLevel: number;
  improvement: number; // Percentage improvement
  sampleSize: number;
  isStatisticallySignificant: boolean;
}

export interface MarketplaceAnalytics {
  marketplace: Marketplace;
  totalDescriptions: number;
  avgSeoScore: number;
  avgCtr: number;
  avgConversionRate: number;
  topPerformers: DescriptionPerformance[];
  complianceBreakdown: {
    approved: number;
    pending: number;
    flagged: number;
    requiresReview: number;
  };
}

export interface TrendDataPoint {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  conversionRate: number;
  descriptionsGenerated: number;
}

export interface OverviewAnalytics {
  totalProducts: number;
  totalDescriptions: number;
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  overallCtr: number;
  overallConversionRate: number;
  avgSeoScore: number;
  descriptionsGeneratedToday: number;
  descriptionsGeneratedThisWeek: number;
  descriptionsGeneratedThisMonth: number;
  complianceOverview: {
    approved: number;
    pending: number;
    flagged: number;
    requiresReview: number;
  };
  topMarketplaces: Array<{
    marketplace: Marketplace;
    count: number;
    avgCtr: number;
  }>;
  recentActivity: Array<{
    type: 'generated' | 'updated' | 'approved' | 'flagged';
    productName: string;
    timestamp: Date;
  }>;
}

export interface GenerationStats {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  pendingJobs: number;
  avgProcessingTime: number; // in seconds
  successRate: number;
  totalItemsProcessed: number;
  avgItemsPerJob: number;
  jobsByMarketplace: Array<{
    marketplace: Marketplace;
    count: number;
  }>;
}

export interface SEODistribution {
  excellent: number; // 80-100
  good: number; // 60-79
  average: number; // 40-59
  poor: number; // 0-39
  unscored: number;
  avgScore: number;
  medianScore: number;
  scoreByMarketplace: Array<{
    marketplace: Marketplace;
    avgScore: number;
    count: number;
  }>;
}

// ============================================================================
// OVERVIEW ANALYTICS
// ============================================================================

/**
 * Get comprehensive overview analytics for a config
 */
export async function getOverviewAnalytics(
  configId: number,
): Promise<OverviewAnalytics> {
  const now = new Date();
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now);
  monthStart.setDate(monthStart.getDate() - 30);

  // Get totals
  const [
    productCount,
    descriptionStats,
    todayCount,
    weekCount,
    monthCount,
    complianceCounts,
    marketplaceStats,
    recentDescriptions,
  ] = await Promise.all([
    prisma.product.count({
      where: { configId, isActive: true },
    }),
    prisma.productDescription.aggregate({
      where: { product: { configId } },
      _count: true,
      _sum: {
        impressions: true,
        clicks: true,
        conversions: true,
      },
      _avg: {
        seoScore: true,
      },
    }),
    prisma.productDescription.count({
      where: {
        product: { configId },
        createdAt: { gte: todayStart },
      },
    }),
    prisma.productDescription.count({
      where: {
        product: { configId },
        createdAt: { gte: weekStart },
      },
    }),
    prisma.productDescription.count({
      where: {
        product: { configId },
        createdAt: { gte: monthStart },
      },
    }),
    prisma.productDescription.groupBy({
      by: ['complianceStatus'],
      where: { product: { configId } },
      _count: true,
    }),
    prisma.productDescription.groupBy({
      by: ['marketplace'],
      where: { product: { configId } },
      _count: true,
      _avg: {
        seoScore: true,
      },
      _sum: {
        impressions: true,
        clicks: true,
      },
    }),
    prisma.productDescription.findMany({
      where: { product: { configId } },
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const totalImpressions = descriptionStats._sum.impressions || 0;
  const totalClicks = descriptionStats._sum.clicks || 0;
  const totalConversions = descriptionStats._sum.conversions || 0;

  // Build compliance overview
  const complianceOverview = {
    approved: 0,
    pending: 0,
    flagged: 0,
    requiresReview: 0,
  };
  for (const c of complianceCounts) {
    switch (c.complianceStatus) {
      case 'APPROVED':
        complianceOverview.approved = c._count;
        break;
      case 'PENDING':
        complianceOverview.pending = c._count;
        break;
      case 'FLAGGED':
        complianceOverview.flagged = c._count;
        break;
      case 'REQUIRES_REVIEW':
        complianceOverview.requiresReview = c._count;
        break;
    }
  }

  // Build top marketplaces
  const topMarketplaces = marketplaceStats
    .map((m) => ({
      marketplace: m.marketplace,
      count: m._count,
      avgCtr:
        m._sum.impressions && m._sum.impressions > 0
          ? ((m._sum.clicks || 0) / m._sum.impressions) * 100
          : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Build recent activity
  const recentActivity = recentDescriptions.map((d) => ({
    type: 'generated' as const,
    productName: d.product.name,
    timestamp: d.createdAt,
  }));

  return {
    totalProducts: productCount,
    totalDescriptions: descriptionStats._count || 0,
    totalImpressions,
    totalClicks,
    totalConversions,
    overallCtr:
      totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
    overallConversionRate:
      totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
    avgSeoScore: descriptionStats._avg.seoScore || 0,
    descriptionsGeneratedToday: todayCount,
    descriptionsGeneratedThisWeek: weekCount,
    descriptionsGeneratedThisMonth: monthCount,
    complianceOverview,
    topMarketplaces,
    recentActivity,
  };
}

// ============================================================================
// DESCRIPTION PERFORMANCE
// ============================================================================

/**
 * Get performance metrics for individual descriptions
 */
export async function getDescriptionPerformance(
  configId: number,
  options: {
    productId?: number;
    marketplace?: Marketplace;
    limit?: number;
    offset?: number;
    sortBy?: 'ctr' | 'conversions' | 'impressions' | 'seoScore' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  } = {},
): Promise<{
  descriptions: DescriptionPerformance[];
  total: number;
}> {
  const {
    productId,
    marketplace,
    limit = 50,
    offset = 0,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const where = {
    product: {
      configId,
      ...(productId && { id: productId }),
    },
    ...(marketplace && { marketplace }),
  };

  const [descriptions, total] = await Promise.all([
    prisma.productDescription.findMany({
      where,
      include: {
        product: { select: { id: true, name: true } },
      },
      orderBy:
        sortBy === 'ctr' || sortBy === 'conversions'
          ? { clicks: sortOrder } // Sort by clicks as proxy
          : { [sortBy]: sortOrder },
      take: limit,
      skip: offset,
    }),
    prisma.productDescription.count({ where }),
  ]);

  const result: DescriptionPerformance[] = descriptions.map((d) => ({
    id: d.id,
    productId: d.productId,
    productName: d.product.name,
    title: d.title || '',
    variant: d.variant,
    isControl: d.isControl,
    marketplace: d.marketplace,
    seoScore: d.seoScore,
    complianceStatus: d.complianceStatus,
    createdAt: d.createdAt,
    impressions: d.impressions,
    clicks: d.clicks,
    conversions: d.conversions,
    ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
    conversionRate: d.clicks > 0 ? (d.conversions / d.clicks) * 100 : 0,
  }));

  // Sort by calculated fields if needed
  if (sortBy === 'ctr') {
    result.sort((a, b) =>
      sortOrder === 'desc' ? b.ctr - a.ctr : a.ctr - b.ctr,
    );
  } else if (sortBy === 'conversions') {
    result.sort((a, b) =>
      sortOrder === 'desc'
        ? b.conversionRate - a.conversionRate
        : a.conversionRate - b.conversionRate,
    );
  }

  return { descriptions: result, total };
}

// ============================================================================
// A/B TEST ANALYSIS
// ============================================================================

/**
 * Analyze A/B test results for a product
 */
export async function getABTestResults(
  productId: number,
): Promise<ABTestResult | null> {
  const descriptions = await prisma.productDescription.findMany({
    where: { productId },
    include: { product: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  if (descriptions.length === 0) {
    return null;
  }

  const productName = descriptions[0].product.name;

  // Separate control and test variants
  const control = descriptions.find((d) => d.isControl);
  const testVariants = descriptions.filter((d) => !d.isControl);

  if (!control || testVariants.length === 0) {
    return {
      productId,
      productName,
      controlVariant: control
        ? toPerformanceMetrics(control, productName)
        : null,
      testVariants: [],
      winner: null,
      confidenceLevel: 0,
      improvement: 0,
      sampleSize: control?.impressions || 0,
      isStatisticallySignificant: false,
    };
  }

  const controlMetrics = toPerformanceMetrics(control, productName);
  const testMetricsArray = testVariants.map((v) =>
    toPerformanceMetrics(v, productName),
  );

  // Find best performing variant
  let bestVariant: DescriptionPerformance | null = null;
  let bestConversionRate = controlMetrics.conversionRate;

  for (const test of testMetricsArray) {
    if (test.conversionRate > bestConversionRate) {
      bestConversionRate = test.conversionRate;
      bestVariant = test;
    }
  }

  // Calculate statistical significance using Z-test
  const totalSampleSize = descriptions.reduce(
    (sum, d) => sum + d.impressions,
    0,
  );
  const { isSignificant, confidenceLevel } = calculateStatisticalSignificance(
    controlMetrics,
    bestVariant || controlMetrics,
  );

  const improvement = bestVariant
    ? ((bestVariant.conversionRate - controlMetrics.conversionRate) /
        (controlMetrics.conversionRate || 1)) *
      100
    : 0;

  return {
    productId,
    productName,
    controlVariant: controlMetrics,
    testVariants: testMetricsArray,
    winner: bestVariant
      ? bestVariant.variant || `Variant ${bestVariant.id}`
      : 'control',
    confidenceLevel,
    improvement,
    sampleSize: totalSampleSize,
    isStatisticallySignificant: isSignificant,
  };
}

/**
 * Get A/B test results for all products with active tests
 */
export async function getAllABTestResults(
  configId: number,
): Promise<ABTestResult[]> {
  // Find products with multiple description variants
  const productsWithVariants = await prisma.product.findMany({
    where: {
      configId,
      isActive: true,
      descriptions: {
        some: {
          isControl: false,
        },
      },
    },
    select: { id: true },
  });

  const results: ABTestResult[] = [];
  for (const product of productsWithVariants) {
    const result = await getABTestResults(product.id);
    if (result) {
      results.push(result);
    }
  }

  return results;
}

// ============================================================================
// MARKETPLACE ANALYTICS
// ============================================================================

/**
 * Get analytics broken down by marketplace
 */
export async function getMarketplaceAnalytics(
  configId: number,
): Promise<MarketplaceAnalytics[]> {
  const marketplaces: Marketplace[] = [
    'AMAZON',
    'EBAY',
    'SHOPIFY',
    'ETSY',
    'WALMART',
    'WOOCOMMERCE',
    'GENERIC',
  ];

  const results: MarketplaceAnalytics[] = [];

  for (const marketplace of marketplaces) {
    const [stats, complianceCounts, topPerformers] = await Promise.all([
      prisma.productDescription.aggregate({
        where: {
          product: { configId },
          marketplace,
        },
        _count: true,
        _avg: {
          seoScore: true,
        },
        _sum: {
          impressions: true,
          clicks: true,
          conversions: true,
        },
      }),
      prisma.productDescription.groupBy({
        by: ['complianceStatus'],
        where: {
          product: { configId },
          marketplace,
        },
        _count: true,
      }),
      prisma.productDescription.findMany({
        where: {
          product: { configId },
          marketplace,
          impressions: { gt: 0 },
        },
        include: { product: { select: { name: true } } },
        orderBy: { clicks: 'desc' },
        take: 5,
      }),
    ]);

    if (stats._count === 0) continue;

    const totalImpressions = stats._sum.impressions || 0;
    const totalClicks = stats._sum.clicks || 0;
    const totalConversions = stats._sum.conversions || 0;

    const complianceBreakdown = {
      approved: 0,
      pending: 0,
      flagged: 0,
      requiresReview: 0,
    };
    for (const c of complianceCounts) {
      switch (c.complianceStatus) {
        case 'APPROVED':
          complianceBreakdown.approved = c._count;
          break;
        case 'PENDING':
          complianceBreakdown.pending = c._count;
          break;
        case 'FLAGGED':
          complianceBreakdown.flagged = c._count;
          break;
        case 'REQUIRES_REVIEW':
          complianceBreakdown.requiresReview = c._count;
          break;
      }
    }

    results.push({
      marketplace,
      totalDescriptions: stats._count,
      avgSeoScore: stats._avg.seoScore || 0,
      avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      avgConversionRate:
        totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
      topPerformers: topPerformers.map((d) =>
        toPerformanceMetrics(d, d.product.name),
      ),
      complianceBreakdown,
    });
  }

  return results.sort((a, b) => b.totalDescriptions - a.totalDescriptions);
}

// ============================================================================
// TREND ANALYSIS
// ============================================================================

/**
 * Get performance trends over time
 */
export async function getPerformanceTrends(
  configId: number,
  options: {
    startDate?: Date;
    endDate?: Date;
    granularity?: 'day' | 'week' | 'month';
  } = {},
): Promise<TrendDataPoint[]> {
  const {
    startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate = new Date(),
    granularity = 'day',
  } = options;

  // Get all descriptions in range
  const descriptions = await prisma.productDescription.findMany({
    where: {
      product: { configId },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      createdAt: true,
      impressions: true,
      clicks: true,
      conversions: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Group by date
  const groupedData = new Map<
    string,
    {
      impressions: number;
      clicks: number;
      conversions: number;
      count: number;
    }
  >();

  for (const d of descriptions) {
    const key = formatDateKey(d.createdAt, granularity);
    const existing = groupedData.get(key) || {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      count: 0,
    };
    groupedData.set(key, {
      impressions: existing.impressions + d.impressions,
      clicks: existing.clicks + d.clicks,
      conversions: existing.conversions + d.conversions,
      count: existing.count + 1,
    });
  }

  // Convert to array
  const trends: TrendDataPoint[] = [];
  for (const [date, data] of groupedData) {
    trends.push({
      date,
      impressions: data.impressions,
      clicks: data.clicks,
      conversions: data.conversions,
      ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
      conversionRate:
        data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0,
      descriptionsGenerated: data.count,
    });
  }

  return trends.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

// ============================================================================
// GENERATION STATISTICS
// ============================================================================

/**
 * Get bulk generation job statistics
 */
export async function getGenerationStats(
  configId: number,
): Promise<GenerationStats> {
  const [jobs, statusCounts, marketplaceCounts] = await Promise.all([
    prisma.bulkGenerationJob.findMany({
      where: { configId },
      select: {
        status: true,
        totalItems: true,
        processedItems: true,
        successfulItems: true,
        failedItems: true,
        startedAt: true,
        completedAt: true,
        marketplace: true,
      },
    }),
    prisma.bulkGenerationJob.groupBy({
      by: ['status'],
      where: { configId },
      _count: true,
    }),
    prisma.bulkGenerationJob.groupBy({
      by: ['marketplace'],
      where: { configId },
      _count: true,
    }),
  ]);

  // Calculate processing times
  const completedJobs = jobs.filter(
    (j) => j.status === 'COMPLETED' && j.startedAt && j.completedAt,
  );
  const totalProcessingTime = completedJobs.reduce((sum, j) => {
    const duration = (j.completedAt!.getTime() - j.startedAt!.getTime()) / 1000;
    return sum + duration;
  }, 0);

  const totalItemsProcessed = jobs.reduce(
    (sum, j) => sum + j.processedItems,
    0,
  );
  const successfulItems = jobs.reduce((sum, j) => sum + j.successfulItems, 0);

  // Status counts
  const statusMap: Record<GenerationJobStatus, number> = {
    PENDING: 0,
    PROCESSING: 0,
    COMPLETED: 0,
    FAILED: 0,
    CANCELLED: 0,
  };
  for (const s of statusCounts) {
    statusMap[s.status] = s._count;
  }

  return {
    totalJobs: jobs.length,
    completedJobs: statusMap.COMPLETED,
    failedJobs: statusMap.FAILED,
    pendingJobs: statusMap.PENDING + statusMap.PROCESSING,
    avgProcessingTime:
      completedJobs.length > 0 ? totalProcessingTime / completedJobs.length : 0,
    successRate:
      totalItemsProcessed > 0
        ? (successfulItems / totalItemsProcessed) * 100
        : 0,
    totalItemsProcessed,
    avgItemsPerJob: jobs.length > 0 ? totalItemsProcessed / jobs.length : 0,
    jobsByMarketplace: marketplaceCounts.map((m) => ({
      marketplace: m.marketplace,
      count: m._count,
    })),
  };
}

// ============================================================================
// SEO DISTRIBUTION
// ============================================================================

/**
 * Get SEO score distribution
 */
export async function getSEODistribution(
  configId: number,
): Promise<SEODistribution> {
  const descriptions = await prisma.productDescription.findMany({
    where: { product: { configId } },
    select: {
      seoScore: true,
      marketplace: true,
    },
  });

  const distribution = {
    excellent: 0,
    good: 0,
    average: 0,
    poor: 0,
    unscored: 0,
  };

  const scores: number[] = [];
  const marketplaceScores = new Map<
    Marketplace,
    { total: number; count: number }
  >();

  for (const d of descriptions) {
    if (d.seoScore === null) {
      distribution.unscored++;
    } else {
      scores.push(d.seoScore);
      if (d.seoScore >= 80) distribution.excellent++;
      else if (d.seoScore >= 60) distribution.good++;
      else if (d.seoScore >= 40) distribution.average++;
      else distribution.poor++;

      // Track by marketplace
      const existing = marketplaceScores.get(d.marketplace) || {
        total: 0,
        count: 0,
      };
      marketplaceScores.set(d.marketplace, {
        total: existing.total + d.seoScore,
        count: existing.count + 1,
      });
    }
  }

  // Calculate avg and median
  const avgScore =
    scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : 0;

  const sortedScores = [...scores].sort((a, b) => a - b);
  const medianScore =
    sortedScores.length > 0
      ? sortedScores.length % 2 === 0
        ? (sortedScores[sortedScores.length / 2 - 1] +
            sortedScores[sortedScores.length / 2]) /
          2
        : sortedScores[Math.floor(sortedScores.length / 2)]
      : 0;

  const scoreByMarketplace: SEODistribution['scoreByMarketplace'] = [];
  for (const [marketplace, data] of marketplaceScores) {
    scoreByMarketplace.push({
      marketplace,
      avgScore: data.count > 0 ? data.total / data.count : 0,
      count: data.count,
    });
  }

  return {
    ...distribution,
    avgScore,
    medianScore,
    scoreByMarketplace: scoreByMarketplace.sort((a, b) => b.count - a.count),
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function toPerformanceMetrics(
  description: {
    id: number;
    productId: number;
    title: string | null;
    variant: string | null;
    isControl: boolean;
    marketplace: Marketplace;
    seoScore: number | null;
    complianceStatus: ComplianceStatus;
    createdAt: Date;
    impressions: number;
    clicks: number;
    conversions: number;
  },
  productName: string,
): DescriptionPerformance {
  return {
    id: description.id,
    productId: description.productId,
    productName,
    title: description.title || '',
    variant: description.variant,
    isControl: description.isControl,
    marketplace: description.marketplace,
    seoScore: description.seoScore,
    complianceStatus: description.complianceStatus,
    createdAt: description.createdAt,
    impressions: description.impressions,
    clicks: description.clicks,
    conversions: description.conversions,
    ctr:
      description.impressions > 0
        ? (description.clicks / description.impressions) * 100
        : 0,
    conversionRate:
      description.clicks > 0
        ? (description.conversions / description.clicks) * 100
        : 0,
  };
}

function calculateStatisticalSignificance(
  control: PerformanceMetrics,
  variant: PerformanceMetrics,
): { isSignificant: boolean; confidenceLevel: number } {
  // Simple Z-test for proportions
  const n1 = control.impressions;
  const n2 = variant.impressions;

  if (n1 < 100 || n2 < 100) {
    return { isSignificant: false, confidenceLevel: 0 };
  }

  const p1 = control.conversionRate / 100;
  const p2 = variant.conversionRate / 100;

  const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
  const se = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2));

  if (se === 0) {
    return { isSignificant: false, confidenceLevel: 0 };
  }

  const z = Math.abs((p2 - p1) / se);

  // Z-score to confidence level mapping
  // 1.645 = 90%, 1.96 = 95%, 2.576 = 99%
  let confidenceLevel = 0;
  if (z >= 2.576) confidenceLevel = 99;
  else if (z >= 1.96) confidenceLevel = 95;
  else if (z >= 1.645) confidenceLevel = 90;
  else if (z >= 1.28) confidenceLevel = 80;
  else confidenceLevel = Math.min(Math.round(z * 50), 79);

  return {
    isSignificant: z >= 1.96, // 95% confidence threshold
    confidenceLevel,
  };
}

function formatDateKey(
  date: Date,
  granularity: 'day' | 'week' | 'month',
): string {
  const d = new Date(date);
  switch (granularity) {
    case 'day':
      return d.toISOString().split('T')[0];
    case 'week': {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      return weekStart.toISOString().split('T')[0];
    }
    case 'month':
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    default:
      return d.toISOString().split('T')[0];
  }
}
