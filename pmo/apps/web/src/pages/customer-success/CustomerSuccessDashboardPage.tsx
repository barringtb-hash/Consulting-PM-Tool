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
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import {
  usePortfolioHealthSummary,
  useCockpit,
  usePopularPlaybooks,
} from '../../api/hooks/customer-success';

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2 mb-3" />
              <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3 mb-2" />
              <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !summary) {
    return (
      <Card className="p-6 border-danger-200 dark:border-danger-800">
        <p className="text-danger-600 dark:text-danger-400">
          Failed to load portfolio health summary
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-6 h-full">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Portfolio Health
            </p>
            <p className="text-3xl font-bold text-neutral-900 dark:text-white mt-1">
              {summary.averageScore}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {summary.averageChurnRisk * 100}% avg churn risk
            </p>
          </div>
          <div
            className={`p-3 rounded-xl shrink-0 ${
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
      </Card>

      <Card className="p-6 h-full">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Healthy Clients
            </p>
            <p className="text-3xl font-bold text-success-600 dark:text-success-400 mt-1">
              {summary.healthyCount}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {summary.totalClients > 0
                ? Math.round(
                    (summary.healthyCount / summary.totalClients) * 100,
                  )
                : 0}
              % of portfolio
            </p>
          </div>
          <div className="p-3 rounded-xl bg-success-100 dark:bg-success-900/30 shrink-0">
            <CheckCircle className="w-6 h-6 text-success-600 dark:text-success-400" />
          </div>
        </div>
      </Card>

      <Card className="p-6 h-full">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              At Risk
            </p>
            <p className="text-3xl font-bold text-warning-600 dark:text-warning-400 mt-1">
              {summary.atRiskCount}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Needs attention
            </p>
          </div>
          <div className="p-3 rounded-xl bg-warning-100 dark:bg-warning-900/30 shrink-0">
            <AlertTriangle className="w-6 h-6 text-warning-600 dark:text-warning-400" />
          </div>
        </div>
      </Card>

      <Card className="p-6 h-full">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Critical
            </p>
            <p className="text-3xl font-bold text-danger-600 dark:text-danger-400 mt-1">
              {summary.criticalCount}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Immediate action required
            </p>
          </div>
          <div className="p-3 rounded-xl bg-danger-100 dark:bg-danger-900/30 shrink-0">
            <AlertCircle className="w-6 h-6 text-danger-600 dark:text-danger-400" />
          </div>
        </div>
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
      <Card className="p-6 h-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">My Cockpit</h3>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-neutral-200 dark:bg-neutral-700 rounded"
            />
          ))}
        </div>
      </Card>
    );
  }

  if (error || !cockpit) {
    return (
      <Card className="p-6 h-full border-danger-200 dark:border-danger-800">
        <p className="text-danger-600 dark:text-danger-400">
          Failed to load cockpit data
        </p>
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
    <Card className="p-6 h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold flex items-center gap-2 text-neutral-900 dark:text-white">
          <Target className="w-5 h-5" />
          My Cockpit
        </h3>
        <Link to="/customer-success/ctas">
          <Button variant="ghost" size="sm">
            View All CTAs
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-4 mb-4">
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
        <div className="text-center py-12 text-neutral-500 dark:text-neutral-400">
          <div className="rounded-full bg-neutral-100 dark:bg-neutral-800 p-4 w-fit mx-auto mb-3">
            <CheckCircle className="w-8 h-8 opacity-50" />
          </div>
          <p className="font-medium text-neutral-900 dark:text-neutral-100">
            No CTAs to action
          </p>
          <p className="text-sm mt-1">Great job! You&apos;re all caught up.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allCTAs.map((cta) => (
            <div
              key={cta.id}
              className={`p-3 rounded-lg border transition-colors ${
                cta.section === 'overdue'
                  ? 'border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-900/20'
                  : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <CTAPriorityBadge priority={cta.priority} />
                    <Badge variant="secondary">{cta.type}</Badge>
                    {cta.section === 'overdue' && (
                      <Badge variant="danger">Overdue</Badge>
                    )}
                  </div>
                  <h4 className="font-medium text-neutral-900 dark:text-white truncate">
                    {cta.title}
                  </h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                    {cta.client?.name}
                  </p>
                </div>
                <div className="text-right shrink-0">
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
    </Card>
  );
}

/**
 * Health Scores card component
 */
function HealthScoresCard(): JSX.Element {
  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold flex items-center gap-2 text-neutral-900 dark:text-white">
          <Users className="w-5 h-5" />
          Health Scores
        </h3>
        <Link to="/customer-success/health-scores">
          <Button variant="ghost" size="sm">
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
        Monitor and manage customer health across your portfolio with weighted
        scoring dimensions.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link to="/customer-success/health-scores?category=CRITICAL">
          <Badge
            variant="danger"
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            View Critical
          </Badge>
        </Link>
        <Link to="/customer-success/health-scores?category=AT_RISK">
          <Badge
            variant="warning"
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            View At Risk
          </Badge>
        </Link>
      </div>
    </Card>
  );
}

/**
 * Playbooks card component
 */
function PlaybooksCard(): JSX.Element {
  const { data: playbooks } = usePopularPlaybooks(3);

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold flex items-center gap-2 text-neutral-900 dark:text-white">
          <BookOpen className="w-5 h-5" />
          Playbooks
        </h3>
        <Link to="/customer-success/playbooks">
          <Button variant="ghost" size="sm">
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
        Standardized task sequences for consistent CS responses.
      </p>
      {playbooks && playbooks.length > 0 ? (
        <ul className="space-y-2">
          {playbooks.map((pb) => (
            <li
              key={pb.id}
              className="text-sm flex justify-between items-center py-1"
            >
              <span className="text-neutral-900 dark:text-white truncate mr-2">
                {pb.name}
              </span>
              <span className="text-neutral-500 dark:text-neutral-400 shrink-0">
                {pb.timesUsed} uses
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            No playbooks created yet.
          </p>
          <Link to="/customer-success/playbooks/new">
            <Button variant="secondary" size="sm" className="mt-2">
              Create Playbook
            </Button>
          </Link>
        </div>
      )}
    </Card>
  );
}

/**
 * Customer Success Dashboard Page Component
 */
function CustomerSuccessDashboardPage(): JSX.Element {
  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Customer Success
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Monitor customer health, manage CTAs, and drive outcomes with your
            customer success platform.
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/customer-success/ctas/new">
            <Button variant="primary">New CTA</Button>
          </Link>
          <Link to="/customer-success/success-plans/new">
            <Button variant="secondary">New Success Plan</Button>
          </Link>
        </div>
      </div>

      {/* Portfolio Health Summary */}
      <PortfolioHealthSummary />

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cockpit - 2/3 width */}
        <div className="lg:col-span-2">
          <CockpitSection />
        </div>

        {/* Sidebar - 1/3 width */}
        <div className="space-y-6">
          <HealthScoresCard />
          <PlaybooksCard />
        </div>
      </div>
    </div>
  );
}

export default CustomerSuccessDashboardPage;
