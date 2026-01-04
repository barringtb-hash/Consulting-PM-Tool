/**
 * AI Usage Monitoring Page
 *
 * Detailed view of AI tool usage, costs, and trends.
 */

import React, { useState } from 'react';
import {
  Brain,
  DollarSign,
  TrendingUp,
  Clock,
  Zap,
  RefreshCw,
  BarChart3,
} from 'lucide-react';
import { Card, Badge, Button } from '../../ui';
import {
  useAIUsageSummary,
  useRealtimeUsageStats,
  useAICostBreakdown,
  useAIUsageTrends,
} from '../../api/hooks/useMonitoring';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function AIUsagePage(): JSX.Element {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [trendDays, setTrendDays] = useState(30);

  const {
    data: summary,
    isLoading: summaryLoading,
    refetch,
  } = useAIUsageSummary(period);
  const { data: realtime, isLoading: realtimeLoading } =
    useRealtimeUsageStats();
  const { isLoading: costsLoading } = useAICostBreakdown(period);
  const { data: trends, isLoading: trendsLoading } =
    useAIUsageTrends(trendDays);

  const isLoading = summaryLoading || realtimeLoading || costsLoading;

  return (
    <div className="page-content space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
            AI Usage Monitoring
          </h1>
          <p className="text-neutral-500 mt-1">
            Track AI tool usage, costs, and performance metrics
          </p>
        </div>
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
          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Real-time Stats */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Real-time Usage
          </h2>
          {realtimeLoading ? (
            <div className="h-24 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                <div className="text-3xl font-bold text-primary-600">
                  {formatNumber(realtime?.data?.last5Minutes?.calls || 0)}
                </div>
                <div className="text-sm text-neutral-500 mt-1">
                  Calls (5 min)
                </div>
                <div className="text-xs text-neutral-400">
                  {formatCurrency(realtime?.data?.last5Minutes?.cost || 0)}
                </div>
              </div>
              <div className="text-center p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                <div className="text-3xl font-bold text-primary-600">
                  {formatNumber(realtime?.data?.last1Hour?.calls || 0)}
                </div>
                <div className="text-sm text-neutral-500 mt-1">
                  Calls (1 hour)
                </div>
                <div className="text-xs text-neutral-400">
                  {formatCurrency(realtime?.data?.last1Hour?.cost || 0)}
                </div>
              </div>
              <div className="text-center p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                <div className="text-3xl font-bold text-primary-600">
                  {formatNumber(realtime?.data?.today?.calls || 0)}
                </div>
                <div className="text-sm text-neutral-500 mt-1">
                  Calls (Today)
                </div>
                <div className="text-xs text-neutral-400">
                  {formatCurrency(realtime?.data?.today?.cost || 0)}
                </div>
              </div>
              <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                <div className="text-sm text-neutral-500 mb-2">
                  Active Tools
                </div>
                <div className="flex flex-wrap gap-1">
                  {(realtime?.data?.activeTools || []).map((tool) => (
                    <Badge key={tool} variant="default" className="text-xs">
                      {tool}
                    </Badge>
                  ))}
                  {(realtime?.data?.activeTools?.length || 0) === 0 && (
                    <span className="text-neutral-400 text-sm">None</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Brain className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-neutral-600 dark:text-neutral-400">
                Total Calls
              </span>
            </div>
            <div className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">
              {formatNumber(summary?.data?.totalCalls || 0)}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-neutral-600 dark:text-neutral-400">
                Total Tokens
              </span>
            </div>
            <div className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">
              {formatNumber(summary?.data?.totalTokens || 0)}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-neutral-600 dark:text-neutral-400">
                Total Cost
              </span>
            </div>
            <div className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">
              {formatCurrency(summary?.data?.totalCost || 0)}
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-neutral-600 dark:text-neutral-400">
                Avg Latency
              </span>
            </div>
            <div className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">
              {Math.round(summary?.data?.avgLatencyMs || 0)}ms
            </div>
            <div className="text-sm text-neutral-500 mt-1">
              {((summary?.data?.successRate || 0) * 100).toFixed(1)}% success
              rate
            </div>
          </div>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary-500" />
              Top AI Tools
            </h2>
            {summaryLoading ? (
              <div className="h-48 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
              </div>
            ) : (
              <div className="space-y-4">
                {(summary?.data?.topTools || []).map((tool, index) => (
                  <div key={tool.toolId} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 font-semibold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {tool.toolId}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {formatNumber(tool.calls)} calls
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                        {formatCurrency(tool.cost)}
                      </div>
                    </div>
                  </div>
                ))}
                {(summary?.data?.topTools?.length || 0) === 0 && (
                  <div className="text-center text-neutral-500 py-4">
                    No data
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-500" />
              Top Models
            </h2>
            {summaryLoading ? (
              <div className="h-48 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
              </div>
            ) : (
              <div className="space-y-4">
                {(summary?.data?.topModels || []).map((model, index) => (
                  <div key={model.model} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 font-semibold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {model.model}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {formatNumber(model.calls)} calls
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                        {formatCurrency(model.cost)}
                      </div>
                    </div>
                  </div>
                ))}
                {(summary?.data?.topModels?.length || 0) === 0 && (
                  <div className="text-center text-neutral-500 py-4">
                    No data
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Usage Trends */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-500" />
              Usage Trends
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
            <div className="h-64 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : (trends?.data?.length || 0) > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-500 border-b border-neutral-200 dark:border-neutral-700">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium text-right">Calls</th>
                    <th className="pb-2 font-medium text-right">Tokens</th>
                    <th className="pb-2 font-medium text-right">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {trends?.data?.slice(-14).map((day) => (
                    <tr key={day.date}>
                      <td className="py-2 text-neutral-700 dark:text-neutral-300">
                        {new Date(day.date).toLocaleDateString()}
                      </td>
                      <td className="py-2 text-right text-neutral-700 dark:text-neutral-300">
                        {formatNumber(day.calls)}
                      </td>
                      <td className="py-2 text-right text-neutral-700 dark:text-neutral-300">
                        {formatNumber(day.tokens)}
                      </td>
                      <td className="py-2 text-right text-neutral-700 dark:text-neutral-300">
                        {formatCurrency(day.cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-neutral-500">
              No trend data available
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default AIUsagePage;
