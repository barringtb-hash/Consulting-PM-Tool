/**
 * Analytics Dashboard Component for Product Descriptions
 *
 * Displays:
 * - Overview metrics
 * - Performance trends
 * - A/B test results
 * - Marketplace comparison
 * - SEO distribution
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { http } from '../../api/http';
import { Card, Badge, Button } from '../../ui';
import {
  BarChart3,
  TrendingUp,
  Eye,
  MousePointer,
  ShoppingCart,
  Package,
  FileText,
  Calendar,
  RefreshCw,
  ChevronRight,
  Award,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';

interface OverviewAnalytics {
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
    marketplace: string;
    count: number;
    avgCtr: number;
  }>;
  recentActivity: Array<{
    type: string;
    productName: string;
    timestamp: string;
  }>;
}

interface SEODistribution {
  excellent: number;
  good: number;
  average: number;
  poor: number;
  unscored: number;
  avgScore: number;
  medianScore: number;
}

interface ABTestResult {
  productId: number;
  productName: string;
  winner: string | null;
  confidenceLevel: number;
  improvement: number;
  isStatisticallySignificant: boolean;
}

interface TrendDataPoint {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  conversionRate: number;
  descriptionsGenerated: number;
}

interface AnalyticsDashboardProps {
  configId: number;
}

export function AnalyticsDashboard({ configId }: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');

  // Fetch overview analytics
  const {
    data: overview,
    isLoading: overviewLoading,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ['product-descriptions', 'analytics', 'overview', configId],
    queryFn: () =>
      http.get<OverviewAnalytics>(
        `/api/product-descriptions/${configId}/analytics/overview`,
      ),
    enabled: !!configId,
  });

  // Fetch SEO distribution
  const { data: seoDistribution } = useQuery({
    queryKey: [
      'product-descriptions',
      'analytics',
      'seo-distribution',
      configId,
    ],
    queryFn: () =>
      http.get<SEODistribution>(
        `/api/product-descriptions/${configId}/analytics/seo-distribution`,
      ),
    enabled: !!configId,
  });

  // Fetch A/B test results
  const { data: abTestsData } = useQuery({
    queryKey: ['product-descriptions', 'analytics', 'ab-tests', configId],
    queryFn: () =>
      http.get<{ abTests: ABTestResult[] }>(
        `/api/product-descriptions/${configId}/analytics/ab-tests`,
      ),
    enabled: !!configId,
  });

  // Fetch trends (for future chart implementation)
  const { data: _trendsData } = useQuery({
    queryKey: [
      'product-descriptions',
      'analytics',
      'trends',
      configId,
      timeRange,
    ],
    queryFn: () => {
      const endDate = new Date();
      const startDate = new Date();
      if (timeRange === 'day') startDate.setDate(startDate.getDate() - 1);
      else if (timeRange === 'week') startDate.setDate(startDate.getDate() - 7);
      else startDate.setDate(startDate.getDate() - 30);

      return http.get<{ trends: TrendDataPoint[] }>(
        `/api/product-descriptions/${configId}/analytics/trends?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&granularity=${timeRange === 'month' ? 'week' : 'day'}`,
      );
    },
    enabled: !!configId,
  });

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercent = (num: number) => `${num.toFixed(1)}%`;

  if (overviewLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Analytics Dashboard
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) =>
              setTimeRange(e.target.value as 'day' | 'week' | 'month')
            }
            className="border rounded px-3 py-1.5 text-sm"
          >
            <option value="day">Last 24 Hours</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => refetchOverview()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold">
            {overview?.totalProducts || 0}
          </p>
          <p className="text-sm text-gray-500">Total Products</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-green-100 rounded-lg">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold">
            {overview?.totalDescriptions || 0}
          </p>
          <p className="text-sm text-gray-500">Total Descriptions</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Eye className="h-5 w-5 text-purple-600" />
            </div>
            {overview && overview.overallCtr > 2 && (
              <TrendingUp className="h-4 w-4 text-green-500" />
            )}
          </div>
          <p className="mt-2 text-2xl font-bold">
            {formatNumber(overview?.totalImpressions || 0)}
          </p>
          <p className="text-sm text-gray-500">Total Impressions</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-orange-100 rounded-lg">
              <MousePointer className="h-5 w-5 text-orange-600" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold">
            {formatPercent(overview?.overallCtr || 0)}
          </p>
          <p className="text-sm text-gray-500">Click-Through Rate</p>
        </Card>
      </div>

      {/* Performance & Conversion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Conversion Funnel</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-gray-400" />
                <span>Impressions</span>
              </div>
              <span className="font-medium">
                {formatNumber(overview?.totalImpressions || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MousePointer className="h-4 w-4 text-gray-400" />
                <span>Clicks</span>
              </div>
              <span className="font-medium">
                {formatNumber(overview?.totalClicks || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-gray-400" />
                <span>Conversions</span>
              </div>
              <span className="font-medium">
                {formatNumber(overview?.totalConversions || 0)}
              </span>
            </div>
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">CTR</span>
                <span className="font-medium text-blue-600">
                  {formatPercent(overview?.overallCtr || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-500">Conversion Rate</span>
                <span className="font-medium text-green-600">
                  {formatPercent(overview?.overallConversionRate || 0)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Generation Activity */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Generation Activity
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="text-sm text-gray-600">Today</span>
              <span className="font-bold text-lg">
                {overview?.descriptionsGeneratedToday || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="text-sm text-gray-600">This Week</span>
              <span className="font-bold text-lg">
                {overview?.descriptionsGeneratedThisWeek || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="text-sm text-gray-600">This Month</span>
              <span className="font-bold text-lg">
                {overview?.descriptionsGeneratedThisMonth || 0}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* SEO & Compliance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* SEO Distribution */}
        {seoDistribution && (
          <Card className="p-4">
            <h3 className="font-semibold mb-4">SEO Score Distribution</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-green-500 h-3 rounded-full"
                    style={{
                      width: `${(seoDistribution.excellent / (seoDistribution.excellent + seoDistribution.good + seoDistribution.average + seoDistribution.poor + seoDistribution.unscored)) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-sm w-20">
                  Excellent ({seoDistribution.excellent})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-blue-500 h-3 rounded-full"
                    style={{
                      width: `${(seoDistribution.good / (seoDistribution.excellent + seoDistribution.good + seoDistribution.average + seoDistribution.poor + seoDistribution.unscored)) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-sm w-20">
                  Good ({seoDistribution.good})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-yellow-500 h-3 rounded-full"
                    style={{
                      width: `${(seoDistribution.average / (seoDistribution.excellent + seoDistribution.good + seoDistribution.average + seoDistribution.poor + seoDistribution.unscored)) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-sm w-20">
                  Average ({seoDistribution.average})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-red-500 h-3 rounded-full"
                    style={{
                      width: `${(seoDistribution.poor / (seoDistribution.excellent + seoDistribution.good + seoDistribution.average + seoDistribution.poor + seoDistribution.unscored)) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-sm w-20">
                  Poor ({seoDistribution.poor})
                </span>
              </div>
              <div className="pt-3 border-t mt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Average Score</span>
                  <span className="font-medium">
                    {seoDistribution.avgScore.toFixed(0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Median Score</span>
                  <span className="font-medium">
                    {seoDistribution.medianScore.toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Compliance Overview */}
        {overview?.complianceOverview && (
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Compliance Status</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-2xl font-bold text-green-700">
                    {overview.complianceOverview.approved}
                  </span>
                </div>
                <p className="text-sm text-green-600 mt-1">Approved</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  <span className="text-2xl font-bold text-yellow-700">
                    {overview.complianceOverview.pending}
                  </span>
                </div>
                <p className="text-sm text-yellow-600 mt-1">Pending</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-2xl font-bold text-red-700">
                    {overview.complianceOverview.flagged}
                  </span>
                </div>
                <p className="text-sm text-red-600 mt-1">Flagged</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-orange-600" />
                  <span className="text-2xl font-bold text-orange-700">
                    {overview.complianceOverview.requiresReview}
                  </span>
                </div>
                <p className="text-sm text-orange-600 mt-1">Needs Review</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* A/B Test Results */}
      {abTestsData?.abTests && abTestsData.abTests.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Award className="h-5 w-5" />
            A/B Test Results
          </h3>
          <div className="space-y-3">
            {abTestsData.abTests.slice(0, 5).map((test) => (
              <div
                key={test.productId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{test.productName}</p>
                  <p className="text-sm text-gray-500">
                    Winner: {test.winner || 'No winner yet'}
                    {test.isStatisticallySignificant && (
                      <Badge variant="success" className="ml-2">
                        Significant
                      </Badge>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`font-medium ${test.improvement > 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {test.improvement > 0 ? '+' : ''}
                    {test.improvement.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-500">
                    {test.confidenceLevel}% confidence
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Top Marketplaces */}
      {overview?.topMarketplaces && overview.topMarketplaces.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Top Marketplaces</h3>
          <div className="space-y-2">
            {overview.topMarketplaces.map((mp, index) => (
              <div
                key={mp.marketplace}
                className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-400 w-6">
                    {index + 1}
                  </span>
                  <span className="font-medium">{mp.marketplace}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    {mp.count} descriptions
                  </span>
                  <span className="text-sm font-medium">
                    {mp.avgCtr.toFixed(1)}% CTR
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent Activity */}
      {overview?.recentActivity && overview.recentActivity.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-2">
            {overview.recentActivity.slice(0, 5).map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{activity.productName}</span>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(activity.timestamp).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default AnalyticsDashboard;
