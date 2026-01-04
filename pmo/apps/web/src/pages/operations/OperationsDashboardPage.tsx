/**
 * Operations Dashboard - Main Overview Page
 *
 * Provides a unified view of AI usage, infrastructure health,
 * anomalies, and alerts for operations teams.
 */

import React from 'react';
import { Link } from 'react-router';
import {
  Activity,
  AlertTriangle,
  Bell,
  Brain,
  DollarSign,
  Server,
  TrendingUp,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Bot,
} from 'lucide-react';
import { Card, Badge, Button } from '../../ui';
import {
  useRealtimeUsageStats,
  useAICostBreakdown,
  useSystemHealth,
  useAnomalyStats,
  useAlertHistory,
  useMonitoringAssistantHealth,
} from '../../api/hooks/useMonitoring';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendDirection,
  to,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  to?: string;
}) {
  const content = (
    <Card className="hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/30">
            <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          {trend && (
            <Badge
              variant={
                trendDirection === 'up'
                  ? 'success'
                  : trendDirection === 'down'
                    ? 'danger'
                    : 'default'
              }
            >
              {trend}
            </Badge>
          )}
        </div>
        <div className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 mb-1">
          {value}
        </div>
        <div className="text-sm text-neutral-500">{title}</div>
        {subtitle && (
          <div className="text-xs text-neutral-400 mt-1">{subtitle}</div>
        )}
      </div>
    </Card>
  );

  if (to) {
    return (
      <Link to={to} className="block">
        {content}
      </Link>
    );
  }
  return content;
}

function SystemHealthGauge({
  health,
}: {
  health: {
    memoryUsagePercent: number;
    cpuUsagePercent: number;
    eventLoopLagMs: number;
  };
}) {
  const getHealthStatus = () => {
    if (
      health.memoryUsagePercent > 90 ||
      health.cpuUsagePercent > 90 ||
      health.eventLoopLagMs > 100
    ) {
      return {
        status: 'Critical',
        color: 'text-red-500',
        bg: 'bg-red-100 dark:bg-red-900/30',
      };
    }
    if (
      health.memoryUsagePercent > 75 ||
      health.cpuUsagePercent > 75 ||
      health.eventLoopLagMs > 50
    ) {
      return {
        status: 'Warning',
        color: 'text-yellow-500',
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      };
    }
    return {
      status: 'Healthy',
      color: 'text-green-500',
      bg: 'bg-green-100 dark:bg-green-900/30',
    };
  };

  const { status, color, bg } = getHealthStatus();

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${bg}`}>
      <Activity className={`w-4 h-4 ${color}`} />
      <span className={`text-sm font-medium ${color}`}>{status}</span>
    </div>
  );
}

export function OperationsDashboardPage(): JSX.Element {
  const {
    data: realtimeStats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useRealtimeUsageStats();
  const { data: costBreakdown, isLoading: costLoading } =
    useAICostBreakdown('month');
  const { data: systemHealth, isLoading: healthLoading } = useSystemHealth();
  const { data: anomalyStats, isLoading: anomalyLoading } = useAnomalyStats();
  const { data: alertHistory, isLoading: alertLoading } = useAlertHistory({
    limit: 5,
  });
  const { isSuccess: assistantAvailable } = useMonitoringAssistantHealth();

  const isLoading =
    statsLoading ||
    costLoading ||
    healthLoading ||
    anomalyLoading ||
    alertLoading;

  return (
    <div className="page-content space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
            Operations Dashboard
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            AI usage, infrastructure health, and system monitoring
          </p>
        </div>
        <div className="flex items-center gap-4">
          {systemHealth?.data && (
            <SystemHealthGauge health={systemHealth.data} />
          )}
          {assistantAvailable && (
            <Link to="/operations/assistant">
              <Button variant="primary" className="gap-2">
                <Bot className="w-4 h-4" />
                AI Assistant
              </Button>
            </Link>
          )}
          <Button
            variant="outline"
            onClick={() => refetchStats()}
            className="gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="AI Calls Today"
          value={formatNumber(realtimeStats?.data?.today?.calls || 0)}
          subtitle={`${formatNumber(realtimeStats?.data?.today?.tokens || 0)} tokens`}
          icon={Brain}
          to="/operations/ai-usage"
        />
        <StatCard
          title="Monthly AI Cost"
          value={formatCurrency(costBreakdown?.data?.total || 0)}
          subtitle="Current month"
          icon={DollarSign}
          to="/operations/costs"
        />
        <StatCard
          title="Open Anomalies"
          value={String(anomalyStats?.data?.open || 0)}
          subtitle={`${anomalyStats?.data?.total || 0} total detected`}
          icon={AlertTriangle}
          trend={
            anomalyStats?.data?.open && anomalyStats.data.open > 0
              ? 'Needs attention'
              : undefined
          }
          trendDirection={
            anomalyStats?.data?.open && anomalyStats.data.open > 0
              ? 'down'
              : undefined
          }
          to="/operations/anomalies"
        />
        <StatCard
          title="System Status"
          value={
            systemHealth?.data
              ? `${Math.round(systemHealth.data.memoryUsagePercent)}%`
              : '--'
          }
          subtitle="Memory usage"
          icon={Server}
          to="/operations/infrastructure"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time AI Usage */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary-500" />
                Real-time AI Usage
              </h2>
              <Link to="/operations/ai-usage">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
            {statsLoading ? (
              <div className="h-32 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                    <div className="text-2xl font-bold text-primary-600">
                      {formatNumber(
                        realtimeStats?.data?.last5Minutes?.calls || 0,
                      )}
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                      Last 5 min
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                    <div className="text-2xl font-bold text-primary-600">
                      {formatNumber(realtimeStats?.data?.last1Hour?.calls || 0)}
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                      Last hour
                    </div>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                    <div className="text-2xl font-bold text-primary-600">
                      {formatNumber(realtimeStats?.data?.today?.calls || 0)}
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">Today</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-neutral-500 mb-2">
                    Active Tools
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(realtimeStats?.data?.activeTools || [])
                      .slice(0, 5)
                      .map((tool) => (
                        <Badge key={tool} variant="default">
                          {tool}
                        </Badge>
                      ))}
                    {(realtimeStats?.data?.activeTools?.length || 0) === 0 && (
                      <span className="text-neutral-400 text-sm">
                        No active tools
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Anomaly Summary */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Anomalies
              </h2>
              <Link to="/operations/anomalies">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
            {anomalyLoading ? (
              <div className="h-32 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {anomalyStats?.data?.open || 0}
                    </div>
                    <div className="text-xs text-neutral-500">Open</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {anomalyStats?.data?.acknowledged || 0}
                    </div>
                    <div className="text-xs text-neutral-500">Acknowledged</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {anomalyStats?.data?.resolved || 0}
                    </div>
                    <div className="text-xs text-neutral-500">Resolved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-neutral-600">
                      {anomalyStats?.data?.falsePositive || 0}
                    </div>
                    <div className="text-xs text-neutral-500">
                      False Positives
                    </div>
                  </div>
                </div>
                {anomalyStats?.data?.bySeverity && (
                  <div>
                    <div className="text-sm text-neutral-500 mb-2">
                      By Severity
                    </div>
                    <div className="flex gap-2">
                      {Object.entries(anomalyStats.data.bySeverity).map(
                        ([severity, count]) => (
                          <Badge
                            key={severity}
                            variant={
                              severity === 'CRITICAL'
                                ? 'danger'
                                : severity === 'HIGH'
                                  ? 'warning'
                                  : 'default'
                            }
                          >
                            {severity}: {count}
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* System Health */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                <Server className="w-5 h-5 text-primary-500" />
                System Health
              </h2>
              <Link to="/operations/infrastructure">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
            {healthLoading ? (
              <div className="h-32 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
              </div>
            ) : systemHealth?.data ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-neutral-600 dark:text-neutral-400">
                        Memory
                      </span>
                      <span className="text-neutral-800 dark:text-neutral-200">
                        {Math.round(systemHealth.data.memoryUsedMB ?? 0)}MB /{' '}
                        {Math.round(systemHealth.data.memoryTotalMB ?? 0)}MB
                      </span>
                    </div>
                    <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          (systemHealth.data.memoryUsagePercent ?? 0) > 90
                            ? 'bg-red-500'
                            : (systemHealth.data.memoryUsagePercent ?? 0) > 75
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        }`}
                        style={{
                          width: `${systemHealth.data.memoryUsagePercent ?? 0}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-neutral-600 dark:text-neutral-400">
                        CPU
                      </span>
                      <span className="text-neutral-800 dark:text-neutral-200">
                        {Math.round(systemHealth.data.cpuUsagePercent ?? 0)}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          (systemHealth.data.cpuUsagePercent ?? 0) > 90
                            ? 'bg-red-500'
                            : (systemHealth.data.cpuUsagePercent ?? 0) > 75
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        }`}
                        style={{
                          width: `${systemHealth.data.cpuUsagePercent ?? 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="text-center p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                    <div className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">
                      {(systemHealth.data.eventLoopLagMs ?? 0).toFixed(1)}ms
                    </div>
                    <div className="text-xs text-neutral-500">
                      Event Loop Lag
                    </div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                    <div className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">
                      {Math.round(
                        (systemHealth.data.uptimeSeconds ?? 0) / 3600,
                      )}
                      h
                    </div>
                    <div className="text-xs text-neutral-500">Uptime</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-neutral-500 py-8">
                No system health data available
              </div>
            )}
          </div>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary-500" />
                Recent Alerts
              </h2>
              <Link to="/operations/alerts">
                <Button variant="ghost" size="sm">
                  View All
                </Button>
              </Link>
            </div>
            {alertLoading ? (
              <div className="h-32 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
              </div>
            ) : (alertHistory?.data?.length || 0) > 0 ? (
              <div className="space-y-3">
                {alertHistory?.data?.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50"
                  >
                    {alert.status === 'SENT' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : alert.status === 'FAILED' ? (
                      <XCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-yellow-500" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate">
                        {alert.rule?.name || 'Alert'}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {alert.channel} •{' '}
                        {new Date(alert.sentAt).toLocaleString()}
                      </div>
                    </div>
                    <Badge
                      variant={
                        alert.status === 'SENT'
                          ? 'success'
                          : alert.status === 'FAILED'
                            ? 'danger'
                            : 'warning'
                      }
                    >
                      {alert.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-neutral-500 py-8">
                No recent alerts
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Cost Breakdown */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-500" />
              Monthly Cost Breakdown
            </h2>
            <Link to="/operations/costs">
              <Button variant="ghost" size="sm">
                View Details
              </Button>
            </Link>
          </div>
          {costLoading ? (
            <div className="h-32 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : costBreakdown?.data ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-3">
                  By AI Tool
                </h3>
                <div className="space-y-2">
                  {(costBreakdown.data.byTool || []).slice(0, 5).map((item) => (
                    <div
                      key={item.toolId}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">
                        {item.toolId}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                          {formatCurrency(item.cost)}
                        </span>
                        <span className="text-xs text-neutral-500">
                          ({item.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-3">
                  By Model
                </h3>
                <div className="space-y-2">
                  {(costBreakdown.data.byModel || [])
                    .slice(0, 5)
                    .map((item) => (
                      <div
                        key={item.model}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">
                          {item.model}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                            {formatCurrency(item.cost)}
                          </span>
                          <span className="text-xs text-neutral-500">
                            ({item.percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-neutral-500 py-8">
              No cost data available
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default OperationsDashboardPage;
