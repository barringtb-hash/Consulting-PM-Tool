/**
 * Customer Success Analytics Page
 *
 * Comprehensive analytics dashboard for the Customer Success Platform featuring:
 * - Portfolio health overview and trends
 * - CTA performance metrics
 * - CSM performance leaderboard
 * - Time-to-value metrics
 */

import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Clock,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Award,
} from 'lucide-react';
import { PageHeader } from '../../ui/PageHeader';
import { Section } from '../../ui/Section';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import {
  useDashboardSummary,
  usePortfolioAnalytics,
  useCTAAnalytics,
  useCSMPerformanceMetrics,
  useTimeToValueMetrics,
} from '../../api/hooks/customer-success';

/**
 * Summary stat card component
 */
function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendLabel,
  variant = 'default',
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'stable';
  trendLabel?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}): JSX.Element {
  const variantStyles = {
    default:
      'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400',
    success:
      'bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400',
    warning:
      'bg-warning-100 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400',
    danger:
      'bg-danger-100 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400',
  };

  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {title}
            </p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white mt-1">
              {value}
            </p>
          </div>
          <div className={`p-3 rounded-full ${variantStyles[variant]}`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          {description && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {description}
            </p>
          )}
          {trend && trendLabel && (
            <div className="flex items-center gap-1 text-xs">
              {trend === 'up' && (
                <TrendingUp className="w-3 h-3 text-success-500" />
              )}
              {trend === 'down' && (
                <TrendingDown className="w-3 h-3 text-danger-500" />
              )}
              <span
                className={
                  trend === 'up'
                    ? 'text-success-500'
                    : trend === 'down'
                      ? 'text-danger-500'
                      : 'text-neutral-500'
                }
              >
                {trendLabel}
              </span>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

/**
 * Dashboard summary cards section
 */
function DashboardSummarySection(): JSX.Element {
  const { data: summary, isLoading, error } = useDashboardSummary();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardBody>
              <div className="animate-pulse h-24 bg-neutral-200 dark:bg-neutral-700 rounded" />
            </CardBody>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !summary) {
    return (
      <Card className="border-danger-200 dark:border-danger-800">
        <CardBody>
          <p className="text-danger-600 dark:text-danger-400">
            Failed to load dashboard summary
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Portfolio Health"
        value={summary.portfolioHealth.avgScore}
        icon={TrendingUp}
        trend={summary.portfolioHealth.trend}
        trendLabel={`${summary.portfolioHealth.trendPercent}%`}
        variant={summary.portfolioHealth.avgScore >= 70 ? 'success' : 'warning'}
      />
      <StatCard
        title="Open CTAs"
        value={summary.ctaMetrics.open}
        icon={Target}
        description={`${summary.ctaMetrics.overdue} overdue`}
        variant={summary.ctaMetrics.overdue > 0 ? 'danger' : 'default'}
      />
      <StatCard
        title="Active Contacts"
        value={summary.engagementMetrics.totalContacts}
        icon={Users}
        description={`${summary.engagementMetrics.champions} champions`}
        variant="success"
      />
      <StatCard
        title="Upcoming Renewals"
        value={summary.renewalMetrics.upcomingRenewals}
        icon={Clock}
        description={`${summary.renewalMetrics.atRiskRenewals} at risk`}
        variant={
          summary.renewalMetrics.atRiskRenewals > 0 ? 'warning' : 'default'
        }
      />
    </div>
  );
}

/**
 * Portfolio health analytics section
 */
function PortfolioAnalyticsSection(): JSX.Element {
  const { data: analytics, isLoading, error } = usePortfolioAnalytics(30);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Portfolio Health</h3>
        </CardHeader>
        <CardBody>
          <div className="animate-pulse h-48 bg-neutral-200 dark:bg-neutral-700 rounded" />
        </CardBody>
      </Card>
    );
  }

  if (error || !analytics) {
    return (
      <Card className="border-danger-200 dark:border-danger-800">
        <CardBody>
          <p className="text-danger-600 dark:text-danger-400">
            Failed to load portfolio analytics
          </p>
        </CardBody>
      </Card>
    );
  }

  const total =
    analytics.healthDistribution.healthy +
    analytics.healthDistribution.atRisk +
    analytics.healthDistribution.critical;

  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Portfolio Health Distribution
        </h3>
      </CardHeader>
      <CardBody>
        <div className="space-y-6">
          {/* Distribution bars */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success-500" />
                  Healthy
                </span>
                <span className="font-medium">
                  {analytics.healthDistribution.healthy} (
                  {total > 0
                    ? Math.round(
                        (analytics.healthDistribution.healthy / total) * 100,
                      )
                    : 0}
                  %)
                </span>
              </div>
              <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-success-500 rounded-full"
                  style={{
                    width: `${total > 0 ? (analytics.healthDistribution.healthy / total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning-500" />
                  At Risk
                </span>
                <span className="font-medium">
                  {analytics.healthDistribution.atRisk} (
                  {total > 0
                    ? Math.round(
                        (analytics.healthDistribution.atRisk / total) * 100,
                      )
                    : 0}
                  %)
                </span>
              </div>
              <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-warning-500 rounded-full"
                  style={{
                    width: `${total > 0 ? (analytics.healthDistribution.atRisk / total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-danger-500" />
                  Critical
                </span>
                <span className="font-medium">
                  {analytics.healthDistribution.critical} (
                  {total > 0
                    ? Math.round(
                        (analytics.healthDistribution.critical / total) * 100,
                      )
                    : 0}
                  %)
                </span>
              </div>
              <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-danger-500 rounded-full"
                  style={{
                    width: `${total > 0 ? (analytics.healthDistribution.critical / total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Churn risk breakdown */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <h4 className="text-sm font-medium mb-3">Churn Risk Analysis</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-danger-500">
                  {analytics.churnRiskAnalysis.highRisk}
                </p>
                <p className="text-xs text-neutral-500">High Risk</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-warning-500">
                  {analytics.churnRiskAnalysis.mediumRisk}
                </p>
                <p className="text-xs text-neutral-500">Medium Risk</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-success-500">
                  {analytics.churnRiskAnalysis.lowRisk}
                </p>
                <p className="text-xs text-neutral-500">Low Risk</p>
              </div>
            </div>
          </div>

          {/* Expansion opportunities */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Expansion Opportunities
              </span>
              <Badge variant="success">
                {analytics.expansionOpportunities}
              </Badge>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

/**
 * CTA analytics section
 */
function CTAAnalyticsSection(): JSX.Element {
  const { data: analytics, isLoading, error } = useCTAAnalytics(30);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="font-semibold">CTA Performance</h3>
        </CardHeader>
        <CardBody>
          <div className="animate-pulse h-48 bg-neutral-200 dark:bg-neutral-700 rounded" />
        </CardBody>
      </Card>
    );
  }

  if (error || !analytics) {
    return (
      <Card className="border-danger-200 dark:border-danger-800">
        <CardBody>
          <p className="text-danger-600 dark:text-danger-400">
            Failed to load CTA analytics
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2">
          <Target className="w-5 h-5" />
          CTA Performance (Last 30 Days)
        </h3>
      </CardHeader>
      <CardBody>
        <div className="space-y-6">
          {/* Key metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <p className="text-2xl font-bold">{analytics.totalCTAs}</p>
              <p className="text-xs text-neutral-500">Total CTAs</p>
            </div>
            <div className="text-center p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <p className="text-2xl font-bold text-danger-500">
                {analytics.overdueCount}
              </p>
              <p className="text-xs text-neutral-500">Overdue</p>
            </div>
            <div className="text-center p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <p className="text-2xl font-bold text-success-500">
                {analytics.completionRate}%
              </p>
              <p className="text-xs text-neutral-500">Completion Rate</p>
            </div>
            <div className="text-center p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
              <p className="text-2xl font-bold">
                {analytics.avgResolutionTime}h
              </p>
              <p className="text-xs text-neutral-500">Avg Resolution</p>
            </div>
          </div>

          {/* Status breakdown */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <h4 className="text-sm font-medium mb-3">By Status</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(analytics.byStatus).map(([status, count]) => (
                <Badge key={status} variant="secondary">
                  {status}: {count}
                </Badge>
              ))}
            </div>
          </div>

          {/* Type breakdown */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <h4 className="text-sm font-medium mb-3">By Type</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(analytics.byType).map(([type, count]) => (
                <Badge key={type} variant="default">
                  {type}: {count}
                </Badge>
              ))}
            </div>
          </div>

          {/* Priority breakdown */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <h4 className="text-sm font-medium mb-3">By Priority</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(analytics.byPriority).map(([priority, count]) => {
                const variant =
                  priority === 'CRITICAL'
                    ? 'danger'
                    : priority === 'HIGH'
                      ? 'warning'
                      : 'secondary';
                return (
                  <Badge key={priority} variant={variant}>
                    {priority}: {count}
                  </Badge>
                );
              })}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

/**
 * CSM performance section
 */
function CSMPerformanceSection(): JSX.Element {
  const { data: metrics, isLoading, error } = useCSMPerformanceMetrics();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="font-semibold">CSM Performance</h3>
        </CardHeader>
        <CardBody>
          <div className="animate-pulse h-48 bg-neutral-200 dark:bg-neutral-700 rounded" />
        </CardBody>
      </Card>
    );
  }

  if (error || !metrics) {
    return (
      <Card className="border-danger-200 dark:border-danger-800">
        <CardBody>
          <p className="text-danger-600 dark:text-danger-400">
            Failed to load CSM performance metrics
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2">
          <Award className="w-5 h-5" />
          CSM Performance
        </h3>
      </CardHeader>
      <CardBody>
        {metrics.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No CSM performance data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {metrics.map((csm, index) => (
              <div
                key={csm.userId}
                className="flex items-center gap-4 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
              >
                <div className="flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0
                        ? 'bg-yellow-500 text-white'
                        : index === 1
                          ? 'bg-neutral-400 text-white'
                          : index === 2
                            ? 'bg-amber-600 text-white'
                            : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'
                    }`}
                  >
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 dark:text-white truncate">
                    {csm.userName}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {csm.totalClients} clients
                  </p>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <p
                      className={`font-bold ${
                        csm.avgHealthScore >= 70
                          ? 'text-success-500'
                          : csm.avgHealthScore >= 40
                            ? 'text-warning-500'
                            : 'text-danger-500'
                      }`}
                    >
                      {csm.avgHealthScore}
                    </p>
                    <p className="text-xs text-neutral-500">Health</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-success-500">
                      {csm.ctasCompleted}
                    </p>
                    <p className="text-xs text-neutral-500">Completed</p>
                  </div>
                  <div className="text-center">
                    <p
                      className={`font-bold ${csm.ctasOverdue > 0 ? 'text-danger-500' : 'text-neutral-500'}`}
                    >
                      {csm.ctasOverdue}
                    </p>
                    <p className="text-xs text-neutral-500">Overdue</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/**
 * Time-to-value metrics section
 */
function TimeToValueSection(): JSX.Element {
  const { data: metrics, isLoading, error } = useTimeToValueMetrics();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Time-to-Value</h3>
        </CardHeader>
        <CardBody>
          <div className="animate-pulse h-32 bg-neutral-200 dark:bg-neutral-700 rounded" />
        </CardBody>
      </Card>
    );
  }

  if (error || !metrics) {
    return (
      <Card className="border-danger-200 dark:border-danger-800">
        <CardBody>
          <p className="text-danger-600 dark:text-danger-400">
            Failed to load time-to-value metrics
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Time-to-Value Metrics
        </h3>
      </CardHeader>
      <CardBody>
        <div className="space-y-6">
          {/* Key metrics */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                {metrics.avgOnboardingDays}
              </p>
              <p className="text-sm text-neutral-500">Avg Onboarding (days)</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                {metrics.avgFirstValueDays}
              </p>
              <p className="text-sm text-neutral-500">First Value (days)</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-success-600 dark:text-success-400">
                {metrics.avgTimeToHealthy}
              </p>
              <p className="text-sm text-neutral-500">Time to Healthy (days)</p>
            </div>
          </div>

          {/* Onboarding funnel */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <h4 className="text-sm font-medium mb-3">Onboarding Funnel</h4>
            <div className="space-y-3">
              {metrics.onboardingFunnel.map((stage, index) => (
                <div key={stage.stage} className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      index === 0
                        ? 'bg-primary-500 text-white'
                        : index === metrics.onboardingFunnel.length - 1
                          ? 'bg-success-500 text-white'
                          : 'bg-neutral-300 dark:bg-neutral-600 text-neutral-700 dark:text-neutral-200'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="text-sm">{stage.stage}</span>
                      <span className="text-sm font-medium">{stage.count}</span>
                    </div>
                    {stage.avgDays > 0 && (
                      <p className="text-xs text-neutral-500">
                        Avg: {stage.avgDays} days
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

/**
 * Customer Success Analytics Page Component
 */
function CustomerSuccessAnalyticsPage(): JSX.Element {
  return (
    <>
      <PageHeader
        title="CS Analytics"
        description="Track customer success metrics, performance trends, and key indicators across your portfolio."
      />

      <Section>
        <div className="space-y-6">
          {/* Summary stats */}
          <DashboardSummarySection />

          {/* Main analytics grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PortfolioAnalyticsSection />
            <CTAAnalyticsSection />
          </div>

          {/* Performance and TTV */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CSMPerformanceSection />
            <TimeToValueSection />
          </div>
        </div>
      </Section>
    </>
  );
}

export default CustomerSuccessAnalyticsPage;
