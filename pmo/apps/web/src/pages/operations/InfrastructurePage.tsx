/**
 * Infrastructure Monitoring Page
 *
 * View API latency, error rates, system health, and slow queries.
 */

import React from 'react';
import {
  Server,
  Activity,
  AlertTriangle,
  Clock,
  Database,
  RefreshCw,
  Cpu,
  HardDrive,
} from 'lucide-react';
import { Card, Badge, Button } from '../../ui';
import {
  useInfrastructureMetrics,
  useSystemHealth,
  useSlowQueries,
} from '../../api/hooks/useMonitoring';

function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatBytes(mb: number): string {
  if (mb < 1024) return `${Math.round(mb)}MB`;
  return `${(mb / 1024).toFixed(2)}GB`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function HealthGauge({
  label,
  value,
  max,
  unit = '%',
  thresholds = { warning: 75, critical: 90 },
}: {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  thresholds?: { warning: number; critical: number };
}) {
  const percentage = max ? (value / max) * 100 : value;
  const getColor = () => {
    if (percentage >= thresholds.critical) return 'bg-red-500';
    if (percentage >= thresholds.warning) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-neutral-600 dark:text-neutral-400">
          {label}
        </span>
        <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          {max
            ? `${Math.round(value)} / ${Math.round(max)} ${unit}`
            : `${value.toFixed(1)}${unit}`}
        </span>
      </div>
      <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function InfrastructurePage(): JSX.Element {
  const {
    data: metrics,
    isLoading: metricsLoading,
    refetch,
  } = useInfrastructureMetrics();
  const { data: health, isLoading: healthLoading } = useSystemHealth();
  const { data: slowQueries, isLoading: queriesLoading } = useSlowQueries(
    50,
    100,
  );

  const isLoading = metricsLoading || healthLoading || queriesLoading;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
            Infrastructure Monitoring
          </h1>
          <p className="text-neutral-500 mt-1">
            API performance, system health, and database metrics
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* System Health Overview */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-500" />
            System Health
          </h2>
          {healthLoading ? (
            <div className="h-32 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : health?.data ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <HealthGauge
                label="Memory Usage"
                value={health.data.memoryUsedMB}
                max={health.data.memoryTotalMB}
                unit="MB"
              />
              <HealthGauge
                label="Heap Usage"
                value={health.data.heapUsedMB}
                max={health.data.heapTotalMB}
                unit="MB"
              />
              <HealthGauge
                label="CPU Usage"
                value={health.data.cpuUsagePercent}
              />
              <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    Event Loop Lag
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      health.data.eventLoopLagMs > 100
                        ? 'text-red-600'
                        : health.data.eventLoopLagMs > 50
                          ? 'text-yellow-600'
                          : 'text-green-600'
                    }`}
                  >
                    {health.data.eventLoopLagMs.toFixed(2)}ms
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-neutral-400" />
                    <span className="text-xs text-neutral-500">
                      Uptime: {formatUptime(health.data.uptimeSeconds)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-neutral-500 py-4">
              No health data available
            </div>
          )}
        </div>
      </Card>

      {/* API Latency */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-500" />
            API Latency Statistics
          </h2>
          {metricsLoading ? (
            <div className="h-48 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : (metrics?.data?.latency?.length || 0) > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-500 border-b border-neutral-200 dark:border-neutral-700">
                    <th className="pb-2 font-medium">Endpoint</th>
                    <th className="pb-2 font-medium text-right">Avg</th>
                    <th className="pb-2 font-medium text-right">P50</th>
                    <th className="pb-2 font-medium text-right">P95</th>
                    <th className="pb-2 font-medium text-right">P99</th>
                    <th className="pb-2 font-medium text-right">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {metrics?.data?.latency?.slice(0, 20).map((endpoint) => (
                    <tr key={endpoint.endpoint}>
                      <td className="py-2 text-neutral-700 dark:text-neutral-300 font-mono text-xs">
                        {endpoint.endpoint}
                      </td>
                      <td className="py-2 text-right text-neutral-700 dark:text-neutral-300">
                        {formatMs(endpoint.avgMs)}
                      </td>
                      <td className="py-2 text-right text-neutral-700 dark:text-neutral-300">
                        {formatMs(endpoint.p50Ms)}
                      </td>
                      <td
                        className={`py-2 text-right ${
                          endpoint.p95Ms > 1000
                            ? 'text-red-600'
                            : endpoint.p95Ms > 500
                              ? 'text-yellow-600'
                              : 'text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {formatMs(endpoint.p95Ms)}
                      </td>
                      <td
                        className={`py-2 text-right ${
                          endpoint.p99Ms > 2000
                            ? 'text-red-600'
                            : endpoint.p99Ms > 1000
                              ? 'text-yellow-600'
                              : 'text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {formatMs(endpoint.p99Ms)}
                      </td>
                      <td className="py-2 text-right text-neutral-500">
                        {endpoint.count.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-neutral-500 py-8">
              No latency data available
            </div>
          )}
        </div>
      </Card>

      {/* Error Rates */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Error Rates
          </h2>
          {metricsLoading ? (
            <div className="h-32 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : (metrics?.data?.errors?.filter((e) => e.errorRate > 0)?.length ||
              0) > 0 ? (
            <div className="space-y-3">
              {metrics?.data?.errors
                ?.filter((e) => e.errorRate > 0)
                .map((endpoint) => (
                  <div
                    key={endpoint.endpoint}
                    className="flex items-center gap-4 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50"
                  >
                    <div className="flex-1">
                      <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 font-mono">
                        {endpoint.endpoint}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {endpoint.errorCount} errors / {endpoint.totalCount}{' '}
                        total
                      </div>
                    </div>
                    <Badge
                      variant={
                        endpoint.errorRate > 10
                          ? 'danger'
                          : endpoint.errorRate > 5
                            ? 'warning'
                            : 'default'
                      }
                    >
                      {endpoint.errorRate.toFixed(1)}% error rate
                    </Badge>
                  </div>
                ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <Activity className="w-5 h-5 text-green-500" />
              <span className="text-sm text-green-700 dark:text-green-300">
                No endpoints with errors detected
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Slow Queries */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-primary-500" />
            Slow Database Queries
          </h2>
          {queriesLoading ? (
            <div className="h-48 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : (slowQueries?.data?.length || 0) > 0 ? (
            <div className="space-y-3">
              {slowQueries?.data?.slice(0, 10).map((query) => (
                <div
                  key={query.id}
                  className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge
                      variant={
                        query.durationMs > 1000
                          ? 'danger'
                          : query.durationMs > 500
                            ? 'warning'
                            : 'default'
                      }
                    >
                      {formatMs(query.durationMs)}
                    </Badge>
                    <span className="text-xs text-neutral-500">
                      {new Date(query.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <pre className="text-xs text-neutral-600 dark:text-neutral-400 overflow-x-auto whitespace-pre-wrap break-all font-mono bg-neutral-100 dark:bg-neutral-900 p-2 rounded">
                    {query.query.length > 500
                      ? query.query.substring(0, 500) + '...'
                      : query.query}
                  </pre>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <Database className="w-5 h-5 text-green-500" />
              <span className="text-sm text-green-700 dark:text-green-300">
                No slow queries detected (threshold: 100ms)
              </span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default InfrastructurePage;
