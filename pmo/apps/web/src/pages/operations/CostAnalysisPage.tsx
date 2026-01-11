/**
 * AI Cost Analysis Page
 *
 * Detailed cost breakdown and analysis for AI tool usage.
 */

import React, { useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Card, Button, PageHeader } from '../../ui';
import {
  useAICostBreakdown,
  useGlobalCostBreakdown,
  useAIUsageTrends,
} from '../../api/hooks/useMonitoring';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

// Cost thresholds - should match backend config
const COST_THRESHOLDS = {
  warningMonthly: 100,
  criticalMonthly: 150,
};

function ContentSkeleton() {
  return (
    <div className="h-48 flex items-center justify-center">
      <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <div className="p-6 text-center">
        <div className="w-8 h-8 mx-auto bg-neutral-200 dark:bg-neutral-700 animate-pulse rounded mb-2" />
        <div className="h-8 w-24 mx-auto bg-neutral-200 dark:bg-neutral-700 animate-pulse rounded mb-1" />
        <div className="h-4 w-16 mx-auto bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded" />
      </div>
    </Card>
  );
}

function CostAlert({ currentCost }: { currentCost: number }) {
  const percentOfWarning = (currentCost / COST_THRESHOLDS.warningMonthly) * 100;
  const percentOfCritical =
    (currentCost / COST_THRESHOLDS.criticalMonthly) * 100;

  if (percentOfCritical >= 100) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        <div>
          <div className="text-sm font-medium text-red-700 dark:text-red-300">
            Critical: Monthly cost threshold exceeded!
          </div>
          <div className="text-xs text-red-600 dark:text-red-400">
            Current: {formatCurrency(currentCost)} / Threshold:{' '}
            {formatCurrency(COST_THRESHOLDS.criticalMonthly)}
          </div>
        </div>
      </div>
    );
  }

  if (percentOfWarning >= 100) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
        <AlertTriangle className="w-5 h-5 text-yellow-500" />
        <div>
          <div className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
            Warning: Approaching monthly cost limit
          </div>
          <div className="text-xs text-yellow-600 dark:text-yellow-400">
            Current: {formatCurrency(currentCost)} / Warning:{' '}
            {formatCurrency(COST_THRESHOLDS.warningMonthly)} / Critical:{' '}
            {formatCurrency(COST_THRESHOLDS.criticalMonthly)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
      <DollarSign className="w-5 h-5 text-green-500" />
      <div>
        <div className="text-sm font-medium text-green-700 dark:text-green-300">
          Costs within budget
        </div>
        <div className="text-xs text-green-600 dark:text-green-400">
          {percentOfWarning.toFixed(1)}% of warning threshold (
          {formatCurrency(COST_THRESHOLDS.warningMonthly)})
        </div>
      </div>
    </div>
  );
}

function CostProgressBar({
  current,
  warning,
  critical,
}: {
  current: number;
  warning: number;
  critical: number;
}) {
  const percentOfCritical = Math.min((current / critical) * 100, 100);
  const warningPoint = (warning / critical) * 100;

  return (
    <div className="relative">
      <div className="w-full h-4 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            percentOfCritical >= 100
              ? 'bg-red-500'
              : percentOfCritical >= warningPoint
                ? 'bg-yellow-500'
                : 'bg-green-500'
          }`}
          style={{ width: `${percentOfCritical}%` }}
        />
      </div>
      {/* Warning marker */}
      <div
        className="absolute top-0 w-0.5 h-4 bg-yellow-600"
        style={{ left: `${warningPoint}%` }}
        title={`Warning: ${formatCurrency(warning)}`}
      />
      {/* Labels */}
      <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 mt-1">
        <span>$0</span>
        <span className="text-yellow-600 dark:text-yellow-400">
          Warning: {formatCurrency(warning)}
        </span>
        <span className="text-red-600 dark:text-red-400">
          Critical: {formatCurrency(critical)}
        </span>
      </div>
    </div>
  );
}

export function CostAnalysisPage(): JSX.Element {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [trendDays, setTrendDays] = useState(30);

  const {
    data: costs,
    isLoading: costsLoading,
    refetch,
  } = useAICostBreakdown(period);
  const { data: globalCosts, isLoading: globalLoading } =
    useGlobalCostBreakdown(period);
  const { data: trends, isLoading: trendsLoading } =
    useAIUsageTrends(trendDays);

  const isLoading = costsLoading || globalLoading;

  // Calculate daily average and projection
  const dailyAverage = trends?.data?.length
    ? trends.data.reduce((sum, d) => sum + d.cost, 0) / trends.data.length
    : 0;
  const daysInMonth = 30;
  const projectedMonthly = dailyAverage * daysInMonth;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="AI Cost Analysis"
        description="Detailed cost breakdown and budget tracking"
        icon={DollarSign}
        actions={
          <div className="flex items-center gap-4">
            <select
              value={period}
              onChange={(e) =>
                setPeriod(e.target.value as 'day' | 'week' | 'month')
              }
              className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="gap-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="page-content space-y-6">
        {/* Budget Status */}
        {period === 'month' && (
          <>
            <CostAlert currentCost={costs?.data?.total || 0} />
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4">
                  Monthly Budget Progress
                </h2>
                <CostProgressBar
                  current={costs?.data?.total || 0}
                  warning={COST_THRESHOLDS.warningMonthly}
                  critical={COST_THRESHOLDS.criticalMonthly}
                />
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                    <div className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">
                      {formatCurrency(costs?.data?.total || 0)}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      Current Spend
                    </div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                    <div className="text-2xl font-bold text-neutral-800 dark:text-neutral-200">
                      {formatCurrency(dailyAverage)}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      Daily Average
                    </div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                    <div
                      className={`text-2xl font-bold ${
                        projectedMonthly > COST_THRESHOLDS.criticalMonthly
                          ? 'text-red-600 dark:text-red-400'
                          : projectedMonthly > COST_THRESHOLDS.warningMonthly
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-green-600 dark:text-green-400'
                      }`}
                    >
                      {formatCurrency(projectedMonthly)}
                    </div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      Projected Monthly
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}

        {/* Total Cost */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {costsLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <Card>
                <div className="p-6 text-center">
                  <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50 w-fit mx-auto mb-2">
                    <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-3xl font-bold text-neutral-800 dark:text-neutral-200">
                    {formatCurrency(costs?.data?.total || 0)}
                  </div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    {period === 'day'
                      ? 'Today'
                      : period === 'week'
                        ? 'This Week'
                        : 'This Month'}
                  </div>
                </div>
              </Card>
              <Card>
                <div className="p-6 text-center">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 w-fit mx-auto mb-2">
                    <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-3xl font-bold text-neutral-800 dark:text-neutral-200">
                    {formatCurrency(dailyAverage)}
                  </div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    Daily Average
                  </div>
                </div>
              </Card>
              <Card>
                <div className="p-6 text-center">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50 w-fit mx-auto mb-2">
                    <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-3xl font-bold text-neutral-800 dark:text-neutral-200">
                    {costs?.data?.byTool?.length || 0}
                  </div>
                  <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    Active Tools
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>

        {/* Cost Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Tool */}
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                  <PieChart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                Cost by AI Tool
              </h2>
              {costsLoading ? (
                <ContentSkeleton />
              ) : (costs?.data?.byTool?.length || 0) > 0 ? (
                <div className="space-y-3">
                  {costs?.data?.byTool?.map((item) => (
                    <div key={item.toolId}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">
                          {item.toolId}
                        </span>
                        <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                          {formatCurrency(item.cost)} (
                          {item.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-neutral-500 dark:text-neutral-400 py-8">
                  No cost data
                </div>
              )}
            </div>
          </Card>

          {/* By Model */}
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                  <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                Cost by Model
              </h2>
              {costsLoading ? (
                <ContentSkeleton />
              ) : (costs?.data?.byModel?.length || 0) > 0 ? (
                <div className="space-y-3">
                  {costs?.data?.byModel?.map((item) => (
                    <div key={item.model}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-neutral-700 dark:text-neutral-300 font-mono">
                          {item.model}
                        </span>
                        <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                          {formatCurrency(item.cost)} (
                          {item.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500 transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-neutral-500 dark:text-neutral-400 py-8">
                  No cost data
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Cost Trends */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/50">
                  <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                Cost Trends
              </h2>
              <select
                value={trendDays}
                onChange={(e) => setTrendDays(Number(e.target.value))}
                className="px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>
            {trendsLoading ? (
              <ContentSkeleton />
            ) : (trends?.data?.length || 0) > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-700">
                      <th className="pb-2 font-medium">Date</th>
                      <th className="pb-2 font-medium text-right">Calls</th>
                      <th className="pb-2 font-medium text-right">Tokens</th>
                      <th className="pb-2 font-medium text-right">Cost</th>
                      <th className="pb-2 font-medium text-right">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                    {trends?.data?.slice(-14).map((day, index, arr) => {
                      const prevDay = arr[index - 1];
                      const trend = prevDay
                        ? ((day.cost - prevDay.cost) / prevDay.cost) * 100
                        : 0;

                      return (
                        <tr key={day.date}>
                          <td className="py-2 text-neutral-700 dark:text-neutral-300">
                            {new Date(day.date).toLocaleDateString()}
                          </td>
                          <td className="py-2 text-right text-neutral-700 dark:text-neutral-300">
                            {day.calls.toLocaleString()}
                          </td>
                          <td className="py-2 text-right text-neutral-700 dark:text-neutral-300">
                            {day.tokens.toLocaleString()}
                          </td>
                          <td className="py-2 text-right text-neutral-700 dark:text-neutral-300">
                            {formatCurrency(day.cost)}
                          </td>
                          <td className="py-2 text-right">
                            {index > 0 && (
                              <span
                                className={`flex items-center justify-end gap-1 ${
                                  trend > 0
                                    ? 'text-red-500'
                                    : trend < 0
                                      ? 'text-green-500'
                                      : 'text-neutral-500 dark:text-neutral-400'
                                }`}
                              >
                                {trend > 0 ? (
                                  <TrendingUp className="w-3 h-3" />
                                ) : trend < 0 ? (
                                  <TrendingDown className="w-3 h-3" />
                                ) : null}
                                {Math.abs(trend).toFixed(1)}%
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-neutral-500 dark:text-neutral-400">
                No trend data available
              </div>
            )}
          </div>
        </Card>

        {/* By Tenant (Global View) */}
        {globalCosts?.data?.byTenant &&
          globalCosts.data.byTenant.length > 0 && (
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/50">
                    <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  Cost by Tenant
                </h2>
                <div className="space-y-3">
                  {globalCosts.data.byTenant.map((item) => (
                    <div key={item.tenantId}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">
                          {item.tenantId}
                        </span>
                        <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                          {formatCurrency(item.cost)} (
                          {item.percentage.toFixed(1)}
                          %)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
      </div>
    </div>
  );
}

export default CostAnalysisPage;
