/**
 * Customer Success Dashboard Page
 *
 * Main dashboard for the Customer Success Platform featuring:
 * - Portfolio health summary with category breakdown
 * - Cockpit view with prioritized CTAs
 * - Quick access to success plans and playbooks
 */

import { Link } from 'react-router';
import {
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  BookOpen,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { PageHeader } from '../../ui/PageHeader';
import { Section } from '../../ui/Section';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import {
  usePortfolioHealthSummary,
  useCockpit,
  usePopularPlaybooks,
} from '../../api/hooks/customer-success';

/**
 * Health score category badge component
 */
function _HealthCategoryBadge({
  category,
}: {
  category: 'HEALTHY' | 'AT_RISK' | 'CRITICAL';
}): JSX.Element {
  const config = {
    HEALTHY: {
      variant: 'success' as const,
      icon: CheckCircle,
      label: 'Healthy',
    },
    AT_RISK: {
      variant: 'warning' as const,
      icon: AlertTriangle,
      label: 'At Risk',
    },
    CRITICAL: {
      variant: 'danger' as const,
      icon: AlertCircle,
      label: 'Critical',
    },
  };
  const { variant, icon: Icon, label } = config[category];

  return (
    <Badge variant={variant} className="inline-flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}

/**
 * CTA priority badge component
 */
function CTAPriorityBadge({
  priority,
}: {
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}): JSX.Element {
  const config = {
    CRITICAL: { variant: 'danger' as const, label: 'Critical' },
    HIGH: { variant: 'warning' as const, label: 'High' },
    MEDIUM: { variant: 'default' as const, label: 'Medium' },
    LOW: { variant: 'secondary' as const, label: 'Low' },
  };
  const { variant, label } = config[priority];

  return <Badge variant={variant}>{label}</Badge>;
}

/**
 * Portfolio health summary cards
 */
function PortfolioHealthSummary(): JSX.Element {
  const { data: summary, isLoading, error } = usePortfolioHealthSummary();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardBody>
              <div className="animate-pulse h-16 bg-neutral-200 dark:bg-neutral-700 rounded" />
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
            Failed to load portfolio health summary
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Portfolio Health
              </p>
              <p className="text-3xl font-bold text-neutral-900 dark:text-white">
                {summary.averageScore}
              </p>
            </div>
            <div
              className={`p-3 rounded-full ${
                summary.averageScore >= 70
                  ? 'bg-success-100 dark:bg-success-900/30'
                  : summary.averageScore >= 40
                    ? 'bg-warning-100 dark:bg-warning-900/30'
                    : 'bg-danger-100 dark:bg-danger-900/30'
              }`}
            >
              {summary.averageScore >= 70 ? (
                <TrendingUp className="w-6 h-6 text-success-600 dark:text-success-400" />
              ) : (
                <TrendingDown className="w-6 h-6 text-danger-600 dark:text-danger-400" />
              )}
            </div>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
            {summary.averageChurnRisk * 100}% avg churn risk
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Healthy Clients
              </p>
              <p className="text-3xl font-bold text-success-600 dark:text-success-400">
                {summary.healthyCount}
              </p>
            </div>
            <div className="p-3 rounded-full bg-success-100 dark:bg-success-900/30">
              <CheckCircle className="w-6 h-6 text-success-600 dark:text-success-400" />
            </div>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
            {summary.totalClients > 0
              ? Math.round((summary.healthyCount / summary.totalClients) * 100)
              : 0}
            % of portfolio
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                At Risk
              </p>
              <p className="text-3xl font-bold text-warning-600 dark:text-warning-400">
                {summary.atRiskCount}
              </p>
            </div>
            <div className="p-3 rounded-full bg-warning-100 dark:bg-warning-900/30">
              <AlertTriangle className="w-6 h-6 text-warning-600 dark:text-warning-400" />
            </div>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
            Needs attention
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Critical
              </p>
              <p className="text-3xl font-bold text-danger-600 dark:text-danger-400">
                {summary.criticalCount}
              </p>
            </div>
            <div className="p-3 rounded-full bg-danger-100 dark:bg-danger-900/30">
              <AlertCircle className="w-6 h-6 text-danger-600 dark:text-danger-400" />
            </div>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
            Immediate action required
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

/**
 * Cockpit CTAs section
 */
function CockpitSection(): JSX.Element {
  const { data: cockpit, isLoading, error } = useCockpit();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="font-semibold">My Cockpit</h3>
        </CardHeader>
        <CardBody>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-neutral-200 dark:bg-neutral-700 rounded"
              />
            ))}
          </div>
        </CardBody>
      </Card>
    );
  }

  if (error || !cockpit) {
    return (
      <Card className="border-danger-200 dark:border-danger-800">
        <CardBody>
          <p className="text-danger-600 dark:text-danger-400">
            Failed to load cockpit data
          </p>
        </CardBody>
      </Card>
    );
  }

  const allCTAs = [
    ...cockpit.overdueCTAs.map((cta) => ({ ...cta, section: 'overdue' })),
    ...cockpit.todayCTAs.map((cta) => ({ ...cta, section: 'today' })),
    ...cockpit.upcomingCTAs
      .slice(0, 3)
      .map((cta) => ({ ...cta, section: 'upcoming' })),
  ];

  return (
    <Card>
      <CardHeader className="flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2">
          <Target className="w-5 h-5" />
          My Cockpit
        </h3>
        <Link to="/customer-success/ctas">
          <Button variant="ghost" size="sm">
            View All CTAs
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardBody>
        {/* Summary badges */}
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Badge variant="danger">{cockpit.summary.overdue}</Badge>
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Overdue
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="warning">{cockpit.summary.open}</Badge>
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              Open
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="default">{cockpit.summary.inProgress}</Badge>
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              In Progress
            </span>
          </div>
        </div>

        {/* CTA list */}
        {allCTAs.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No CTAs to action. Great job!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allCTAs.map((cta) => (
              <div
                key={cta.id}
                className={`p-3 rounded-lg border ${
                  cta.section === 'overdue'
                    ? 'border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-900/20'
                    : 'border-neutral-200 dark:border-neutral-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CTAPriorityBadge priority={cta.priority} />
                      <Badge variant="secondary">{cta.type}</Badge>
                      {cta.section === 'overdue' && (
                        <Badge variant="danger">Overdue</Badge>
                      )}
                    </div>
                    <h4 className="font-medium text-neutral-900 dark:text-white">
                      {cta.title}
                    </h4>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">
                      {cta.client?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    {cta.dueDate && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(cta.dueDate).toLocaleDateString()}
                      </p>
                    )}
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
 * Quick links section
 */
function QuickLinksSection(): JSX.Element {
  const { data: playbooks } = usePopularPlaybooks(3);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Health Scores */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Health Scores
          </h3>
          <Link to="/customer-success/health-scores">
            <Button variant="ghost" size="sm">
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
            Monitor and manage customer health across your portfolio with
            weighted scoring dimensions.
          </p>
          <div className="flex gap-2">
            <Link to="/customer-success/health-scores?category=CRITICAL">
              <Badge
                variant="danger"
                className="cursor-pointer hover:opacity-80"
              >
                View Critical
              </Badge>
            </Link>
            <Link to="/customer-success/health-scores?category=AT_RISK">
              <Badge
                variant="warning"
                className="cursor-pointer hover:opacity-80"
              >
                View At Risk
              </Badge>
            </Link>
          </div>
        </CardBody>
      </Card>

      {/* Playbooks */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h3 className="font-semibold flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Playbooks
          </h3>
          <Link to="/customer-success/playbooks">
            <Button variant="ghost" size="sm">
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
            Standardized task sequences for consistent CS responses.
          </p>
          {playbooks && playbooks.length > 0 ? (
            <ul className="space-y-2">
              {playbooks.map((pb) => (
                <li
                  key={pb.id}
                  className="text-sm flex justify-between items-center"
                >
                  <span className="text-neutral-900 dark:text-white">
                    {pb.name}
                  </span>
                  <span className="text-neutral-500 dark:text-neutral-400">
                    {pb.timesUsed} uses
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              No playbooks created yet.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

/**
 * Customer Success Dashboard Page Component
 */
function CustomerSuccessDashboardPage(): JSX.Element {
  return (
    <>
      <PageHeader
        title="Customer Success"
        description="Monitor customer health, manage CTAs, and drive outcomes with your customer success platform."
        actions={
          <div className="flex gap-2">
            <Link to="/customer-success/ctas/new">
              <Button variant="primary">New CTA</Button>
            </Link>
            <Link to="/customer-success/success-plans/new">
              <Button variant="secondary">New Success Plan</Button>
            </Link>
          </div>
        }
      />

      <Section>
        <div className="space-y-6">
          {/* Portfolio Health Summary */}
          <PortfolioHealthSummary />

          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cockpit - 2/3 width */}
            <div className="lg:col-span-2">
              <CockpitSection />
            </div>

            {/* Quick links - 1/3 width */}
            <div className="space-y-4">
              <QuickLinksSection />
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}

export default CustomerSuccessDashboardPage;
