/**
 * AI Insights Tab Component
 *
 * No-show predictions, smart scheduling recommendations, and schedule optimization.
 */

import React, { useState, useMemo } from 'react';
import { Card, CardBody, CardHeader } from '../../../ui/Card';
import { Button } from '../../../ui/Button';
import { Badge } from '../../../ui/Badge';
import {
  useHighRiskAppointments,
  useSchedulingAnalytics,
} from '../../../api/hooks/scheduling';
import {
  AlertTriangle,
  TrendingDown,
  Calendar,
  Clock,
  Brain,
  Target,
  Activity,
  BarChart3,
  PieChart,
  Lightbulb,
  RefreshCw,
} from 'lucide-react';

interface AIInsightsTabProps {
  configId: number;
}

const RISK_COLORS = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  medium:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
};

export function AIInsightsTab({ configId }: AIInsightsTabProps): JSX.Element {
  const [dateRange, _setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [riskThreshold, setRiskThreshold] = useState(0.5);

  // Queries
  const highRiskQuery = useHighRiskAppointments(configId, riskThreshold);
  const analyticsQuery = useSchedulingAnalytics(configId, {
    start: dateRange.start,
    end: dateRange.end,
  });

  const highRiskAppointments = highRiskQuery.data || [];
  const analytics = analyticsQuery.data;

  // Calculate risk distribution
  const riskDistribution = useMemo(() => {
    const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
    const appointments = highRiskQuery.data || [];
    appointments.forEach((appt) => {
      const score = appt.noShowRiskScore || 0;
      if (score >= 0.8) distribution.critical++;
      else if (score >= 0.6) distribution.high++;
      else if (score >= 0.4) distribution.medium++;
      else distribution.low++;
    });
    return distribution;
  }, [highRiskQuery.data]);

  const getRiskLevel = (
    score: number,
  ): 'low' | 'medium' | 'high' | 'critical' => {
    if (score >= 0.8) return 'critical';
    if (score >= 0.6) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  High Risk Appointments
                </p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {highRiskAppointments.length}
                </p>
              </div>
              <AlertTriangle className="w-10 h-10 text-orange-200 dark:text-orange-800" />
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              Risk score ≥ {(riskThreshold * 100).toFixed(0)}%
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  No-Show Rate
                </p>
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                  {analytics
                    ? `${(analytics.noShowRate * 100).toFixed(1)}%`
                    : '-'}
                </p>
              </div>
              <TrendingDown className="w-10 h-10 text-primary-200 dark:text-primary-800" />
            </div>
            <p className="text-xs text-neutral-500 mt-2">Last 30 days</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Utilization Rate
                </p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {analytics
                    ? `${(analytics.utilizationRate * 100).toFixed(1)}%`
                    : '-'}
                </p>
              </div>
              <Target className="w-10 h-10 text-green-200 dark:text-green-800" />
            </div>
            <p className="text-xs text-neutral-500 mt-2">Schedule efficiency</p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Avg Lead Time
                </p>
                <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                  {analytics
                    ? `${analytics.averageLeadTimeDays.toFixed(1)}d`
                    : '-'}
                </p>
              </div>
              <Clock className="w-10 h-10 text-primary-200 dark:text-primary-800" />
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              Booking advance time
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* High Risk Appointments */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary-500 flex-shrink-0" />
                  <h3 className="font-semibold">High-Risk Appointments</h3>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm text-neutral-500 hidden sm:inline">
                    Risk threshold:
                  </span>
                  <select
                    value={riskThreshold}
                    onChange={(e) => setRiskThreshold(Number(e.target.value))}
                    className="text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800 rounded px-2 py-1"
                    aria-label="Risk threshold"
                  >
                    <option value={0.3}>30%</option>
                    <option value={0.4}>40%</option>
                    <option value={0.5}>50%</option>
                    <option value={0.6}>60%</option>
                    <option value={0.7}>70%</option>
                  </select>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => highRiskQuery.refetch()}
                    disabled={highRiskQuery.isFetching}
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${highRiskQuery.isFetching ? 'animate-spin' : ''}`}
                    />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              {highRiskQuery.isLoading ? (
                <p className="text-center text-neutral-500 py-8">
                  Loading predictions...
                </p>
              ) : highRiskAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <p className="text-neutral-600 dark:text-neutral-400">
                    No high-risk appointments found.
                  </p>
                  <p className="text-sm text-neutral-500">
                    All scheduled appointments have a risk score below{' '}
                    {(riskThreshold * 100).toFixed(0)}%.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {highRiskAppointments.map((appt) => {
                    const riskLevel = getRiskLevel(appt.noShowRiskScore || 0);
                    return (
                      <div
                        key={appt.id}
                        className={`p-3 sm:p-4 rounded-lg border ${
                          riskLevel === 'critical'
                            ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
                            : riskLevel === 'high'
                              ? 'border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/10'
                              : 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
                              <span className="font-medium">
                                {appt.patientName}
                              </span>
                              <Badge className={RISK_COLORS[riskLevel]}>
                                {Math.round((appt.noShowRiskScore || 0) * 100)}%
                                risk
                              </Badge>
                            </div>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              {formatDate(appt.scheduledAt)} at{' '}
                              {formatTime(appt.scheduledAt)}
                            </p>
                            {appt.provider && (
                              <p className="text-sm text-neutral-500">
                                Provider: {appt.provider.name}
                              </p>
                            )}
                          </div>
                          <div className="flex sm:flex-col gap-2 sm:gap-1 flex-shrink-0">
                            <Button size="sm" variant="secondary" className="flex-1 sm:flex-none">
                              Send Reminder
                            </Button>
                            <Button size="sm" variant="secondary" className="flex-1 sm:flex-none">
                              Confirm
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Risk Distribution */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-primary-500" />
                <h3 className="font-semibold">Risk Distribution</h3>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-sm">Critical (80%+)</span>
                  </div>
                  <span className="font-semibold">
                    {riskDistribution.critical}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500" />
                    <span className="text-sm">High (60-79%)</span>
                  </div>
                  <span className="font-semibold">{riskDistribution.high}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="text-sm">Medium (40-59%)</span>
                  </div>
                  <span className="font-semibold">
                    {riskDistribution.medium}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm">Low (&lt;40%)</span>
                  </div>
                  <span className="font-semibold">{riskDistribution.low}</span>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary-500" />
                <h3 className="font-semibold">AI Recommendations</h3>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-3">
                {highRiskAppointments.length > 5 && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                      High no-show volume
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-300">
                      Consider implementing automated SMS reminders 24 hours
                      before appointments.
                    </p>
                  </div>
                )}

                {analytics && analytics.utilizationRate < 0.7 && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Low utilization detected
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-300">
                      Consider offering same-day appointments or reducing slot
                      buffer times.
                    </p>
                  </div>
                )}

                {analytics && analytics.noShowRate > 0.1 && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Elevated no-show rate
                    </p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-300">
                      Enable overbooking for high-risk slots to compensate for
                      expected no-shows.
                    </p>
                  </div>
                )}

                {(!analytics || analytics.utilizationRate >= 0.9) && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Schedule is well optimized
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-300">
                      Your current booking patterns are performing well.
                    </p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Analytics by Provider */}
      {analytics && analytics.byProvider && analytics.byProvider.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary-500" />
              <h3 className="font-semibold">Performance by Provider</h3>
            </div>
          </CardHeader>
          <CardBody>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-200 dark:border-neutral-700">
                    <th className="text-left py-2 px-3 text-sm font-medium text-neutral-500">
                      Provider
                    </th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-neutral-500">
                      Total
                    </th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-neutral-500">
                      Completed
                    </th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-neutral-500">
                      No-Shows
                    </th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-neutral-500">
                      No-Show Rate
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.byProvider.map((provider) => {
                    const noShowRate =
                      provider.total > 0
                        ? (provider.noShows / provider.total) * 100
                        : 0;
                    return (
                      <tr
                        key={provider.providerId}
                        className="border-b border-neutral-100 dark:border-neutral-800"
                      >
                        <td className="py-3 px-3 font-medium">
                          {provider.providerName}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {provider.total}
                        </td>
                        <td className="py-3 px-3 text-right text-green-600">
                          {provider.completed}
                        </td>
                        <td className="py-3 px-3 text-right text-orange-600">
                          {provider.noShows}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Badge
                            variant={
                              noShowRate > 15
                                ? 'warning'
                                : noShowRate > 10
                                  ? 'neutral'
                                  : 'success'
                            }
                          >
                            {noShowRate.toFixed(1)}%
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Analytics by Appointment Type */}
      {analytics &&
        analytics.byAppointmentType &&
        analytics.byAppointmentType.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary-500" />
                <h3 className="font-semibold">
                  Performance by Appointment Type
                </h3>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analytics.byAppointmentType.map((type) => {
                  const completionRate =
                    type.total > 0 ? (type.completed / type.total) * 100 : 0;
                  return (
                    <div
                      key={type.typeId}
                      className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg"
                    >
                      <p className="font-medium mb-2">{type.typeName}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-500">
                          Total: {type.total}
                        </span>
                        <span className="text-green-600">
                          {completionRate.toFixed(0)}% completed
                        </span>
                      </div>
                      <div className="mt-2 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${completionRate}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        )}
    </div>
  );
}

export default AIInsightsTab;
