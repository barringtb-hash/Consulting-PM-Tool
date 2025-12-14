import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Users,
  Building2,
  Database,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  BarChart3,
  Clock,
  Zap,
} from 'lucide-react';
import { Button, Card, Badge } from '../../ui';
import { http } from '../../api/http';

interface UsageMetrics {
  users: { total: number; active: number; limit: number; percentage: number };
  accounts: { total: number; limit: number; percentage: number };
  contacts: { total: number; limit: number; percentage: number };
  opportunities: { total: number; limit: number; percentage: number };
  storage: { usedMB: number; limitMB: number; percentage: number };
  apiCalls: {
    today: number;
    thisMonth: number;
    dailyLimit: number;
    percentage: number;
  };
}

interface EngagementMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  avgSessionDuration: number;
  lastActivityAt: string | null;
  activitiesCreatedThisWeek: number;
  opportunitiesUpdatedThisWeek: number;
}

interface HealthAlert {
  type: 'warning' | 'critical';
  category: 'usage' | 'engagement' | 'billing' | 'security';
  message: string;
  metric?: string;
  currentValue?: number;
  threshold?: number;
}

interface TenantHealthData {
  tenantId: string;
  tenantName: string;
  plan: string;
  status: string;
  healthScore: number;
  usage: UsageMetrics;
  engagement: EngagementMetrics;
  alerts: HealthAlert[];
  recordedAt: string;
}

interface HistoryRecord {
  recordedAt: string;
  activeUsers: number;
  totalUsers: number;
  accountCount: number;
  contactCount: number;
  opportunityCount: number;
  apiCallsToday: number;
}

function UsageGauge({
  label,
  current,
  limit,
  percentage,
  icon: Icon,
}: {
  label: string;
  current: number;
  limit: number;
  percentage: number;
  icon: React.ElementType;
}) {
  const getColor = () => {
    if (limit === -1) return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    if (percentage >= 90) return 'text-red-600 bg-red-100 dark:bg-red-900/30';
    if (percentage >= 75)
      return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
    return 'text-green-600 bg-green-100 dark:bg-green-900/30';
  };

  const getBarColor = () => {
    if (limit === -1) return 'bg-green-500';
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${getColor()}`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {label}
          </span>
        </div>
        <span className="text-sm text-neutral-500">
          {current.toLocaleString()}
          {limit !== -1 && ` / ${limit.toLocaleString()}`}
        </span>
      </div>
      <div className="w-full h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${getBarColor()} transition-all duration-500`}
          style={{
            width: limit === -1 ? '10%' : `${Math.min(percentage, 100)}%`,
          }}
        />
      </div>
      {limit !== -1 && (
        <div className="text-xs text-neutral-500 mt-1 text-right">
          {percentage}% used
        </div>
      )}
      {limit === -1 && (
        <div className="text-xs text-green-600 mt-1 text-right">Unlimited</div>
      )}
    </div>
  );
}

function HealthScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = () => {
    if (score >= 80) return '#22c55e'; // green-500
    if (score >= 60) return '#eab308'; // yellow-500
    if (score >= 40) return '#f97316'; // orange-500
    return '#ef4444'; // red-500
  };

  const getStatus = () => {
    if (score >= 80) return 'Healthy';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'At Risk';
    return 'Critical';
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-32 h-32 transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-neutral-200 dark:text-neutral-700"
          />
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke={getColor()}
            strokeWidth="8"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">
            {score}
          </span>
        </div>
      </div>
      <div className="mt-2 text-sm font-medium" style={{ color: getColor() }}>
        {getStatus()}
      </div>
    </div>
  );
}

function AlertItem({ alert }: { alert: HealthAlert }) {
  const Icon = alert.type === 'critical' ? XCircle : AlertTriangle;
  const bgColor =
    alert.type === 'critical'
      ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
  const iconColor =
    alert.type === 'critical' ? 'text-red-500' : 'text-yellow-500';

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${bgColor}`}>
      <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
          {alert.message}
        </p>
        {alert.metric && (
          <p className="text-xs text-neutral-500 mt-1">
            Category: {alert.category} • Metric: {alert.metric}
          </p>
        )}
      </div>
      <Badge variant={alert.type === 'critical' ? 'danger' : 'warning'}>
        {alert.type}
      </Badge>
    </div>
  );
}

export function TenantHealthPage(): JSX.Element {
  const [historyDays, setHistoryDays] = useState(30);

  const {
    data: health,
    isLoading: healthLoading,
    error: healthError,
    refetch: refetchHealth,
  } = useQuery<TenantHealthData>({
    queryKey: ['tenant-health'],
    queryFn: async () => {
      const res = await http.get('/tenant-health');
      return res.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: history, isLoading: historyLoading } = useQuery<
    HistoryRecord[]
  >({
    queryKey: ['tenant-health-history', historyDays],
    queryFn: async () => {
      const res = await http.get(`/tenant-health/history?days=${historyDays}`);
      return res.data;
    },
  });

  if (healthLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </div>
    );
  }

  if (healthError) {
    return (
      <div className="p-6">
        <Card>
          <div className="p-6 text-center">
            <XCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
              Failed to load health data
            </h3>
            <p className="text-neutral-500 mb-4">
              {healthError instanceof Error
                ? healthError.message
                : 'An error occurred'}
            </p>
            <Button onClick={() => refetchHealth()}>Try Again</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="p-6">
        <Card>
          <div className="p-6 text-center">
            <Activity className="w-12 h-12 mx-auto text-neutral-400 mb-4" />
            <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
              No health data available
            </h3>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
            Tenant Health Dashboard
          </h1>
          <p className="text-neutral-500 mt-1">
            {health.tenantName} • {health.plan} Plan • Last updated:{' '}
            {new Date(health.recordedAt).toLocaleString()}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetchHealth()}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Health Score & Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Score Card */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-500" />
              Health Score
            </h2>
            <div className="flex items-center justify-center py-4">
              <HealthScoreRing score={health.healthScore} />
            </div>
            <div className="mt-4 text-center">
              <Badge
                variant={health.status === 'ACTIVE' ? 'success' : 'warning'}
              >
                {health.status}
              </Badge>
            </div>
          </div>
        </Card>

        {/* Alerts Card */}
        <Card className="lg:col-span-2">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Active Alerts ({health.alerts.length})
            </h2>
            {health.alerts.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-green-700 dark:text-green-300">
                  No active alerts. Your tenant is healthy!
                </span>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {health.alerts.map((alert, index) => (
                  <AlertItem key={index} alert={alert} />
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Usage Metrics */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-500" />
            Usage Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <UsageGauge
              label="Users"
              current={health.usage.users.total}
              limit={health.usage.users.limit}
              percentage={health.usage.users.percentage}
              icon={Users}
            />
            <UsageGauge
              label="Accounts"
              current={health.usage.accounts.total}
              limit={health.usage.accounts.limit}
              percentage={health.usage.accounts.percentage}
              icon={Building2}
            />
            <UsageGauge
              label="Contacts"
              current={health.usage.contacts.total}
              limit={health.usage.contacts.limit}
              percentage={health.usage.contacts.percentage}
              icon={Users}
            />
            <UsageGauge
              label="Opportunities"
              current={health.usage.opportunities.total}
              limit={health.usage.opportunities.limit}
              percentage={health.usage.opportunities.percentage}
              icon={TrendingUp}
            />
            <UsageGauge
              label="Storage"
              current={health.usage.storage.usedMB}
              limit={health.usage.storage.limitMB}
              percentage={health.usage.storage.percentage}
              icon={Database}
            />
            <UsageGauge
              label="API Calls Today"
              current={health.usage.apiCalls.today}
              limit={health.usage.apiCalls.dailyLimit}
              percentage={health.usage.apiCalls.percentage}
              icon={Zap}
            />
          </div>
        </div>
      </Card>

      {/* Engagement Metrics */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-500" />
            Engagement Metrics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">
                {health.engagement.dailyActiveUsers}
              </div>
              <div className="text-sm text-neutral-500 mt-1">Daily Active</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">
                {health.engagement.weeklyActiveUsers}
              </div>
              <div className="text-sm text-neutral-500 mt-1">Weekly Active</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">
                {health.engagement.monthlyActiveUsers}
              </div>
              <div className="text-sm text-neutral-500 mt-1">
                Monthly Active
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600">
                {health.usage.users.active}/{health.usage.users.total}
              </div>
              <div className="text-sm text-neutral-500 mt-1">Active Users</div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                <Clock className="w-5 h-5 text-neutral-400" />
                <div>
                  <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Last Activity
                  </div>
                  <div className="text-xs text-neutral-500">
                    {health.engagement.lastActivityAt
                      ? new Date(
                          health.engagement.lastActivityAt,
                        ).toLocaleString()
                      : 'No activity recorded'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                <Activity className="w-5 h-5 text-neutral-400" />
                <div>
                  <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Activities This Week
                  </div>
                  <div className="text-xs text-neutral-500">
                    {health.engagement.activitiesCreatedThisWeek} created
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                <TrendingUp className="w-5 h-5 text-neutral-400" />
                <div>
                  <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Opportunities This Week
                  </div>
                  <div className="text-xs text-neutral-500">
                    {health.engagement.opportunitiesUpdatedThisWeek} updated
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* History Chart */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-500" />
              Usage History
            </h2>
            <select
              value={historyDays}
              onChange={(e) => setHistoryDays(Number(e.target.value))}
              className="px-3 py-1.5 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
          {historyLoading ? (
            <div className="h-64 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin text-primary-500" />
            </div>
          ) : history && history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-500 border-b border-neutral-200 dark:border-neutral-700">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Active Users</th>
                    <th className="pb-2 font-medium">Total Users</th>
                    <th className="pb-2 font-medium">Accounts</th>
                    <th className="pb-2 font-medium">Contacts</th>
                    <th className="pb-2 font-medium">Opportunities</th>
                    <th className="pb-2 font-medium">API Calls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {history.slice(-10).map((record, index) => (
                    <tr key={index}>
                      <td className="py-2 text-neutral-700 dark:text-neutral-300">
                        {new Date(record.recordedAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 text-neutral-700 dark:text-neutral-300">
                        {record.activeUsers}
                      </td>
                      <td className="py-2 text-neutral-700 dark:text-neutral-300">
                        {record.totalUsers}
                      </td>
                      <td className="py-2 text-neutral-700 dark:text-neutral-300">
                        {record.accountCount}
                      </td>
                      <td className="py-2 text-neutral-700 dark:text-neutral-300">
                        {record.contactCount}
                      </td>
                      <td className="py-2 text-neutral-700 dark:text-neutral-300">
                        {record.opportunityCount}
                      </td>
                      <td className="py-2 text-neutral-700 dark:text-neutral-300">
                        {record.apiCallsToday}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-neutral-500">
              No history data available yet. Check back after metrics are
              recorded.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default TenantHealthPage;
