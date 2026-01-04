/**
 * CTAs List Page
 *
 * Lists all CTAs (Calls-to-Action) in the Customer Success module with filtering.
 */

import { useState } from 'react';
import { Link } from 'react-router';
import {
  Target,
  Plus,
  Clock,
  AlertTriangle,
  Filter,
  ChevronRight,
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Select } from '../../ui/Select';
import { PageHeader } from '../../ui/PageHeader';
import { useCTAs, useCTASummary } from '../../api/hooks/customer-success';
import type { CTAListFilters, CTA } from '../../api/customer-success';

/**
 * CTA priority badge component
 */
function CTAPriorityBadge({
  priority,
}: {
  priority: CTA['priority'];
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
 * CTA status badge component
 */
function CTAStatusBadge({ status }: { status: CTA['status'] }): JSX.Element {
  const config = {
    OPEN: { variant: 'default' as const, label: 'Open' },
    IN_PROGRESS: { variant: 'warning' as const, label: 'In Progress' },
    SNOOZED: { variant: 'secondary' as const, label: 'Snoozed' },
    COMPLETED: { variant: 'success' as const, label: 'Completed' },
    CANCELLED: { variant: 'secondary' as const, label: 'Cancelled' },
  };
  const { variant, label } = config[status];

  return <Badge variant={variant}>{label}</Badge>;
}

/**
 * Summary stats section
 */
const INCLUDE_ALL_CTAS_IN_SUMMARY = true;

function CTASummaryStats(): JSX.Element {
  const { data: summary, isLoading } = useCTASummary(
    INCLUDE_ALL_CTAS_IN_SUMMARY,
  );

  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2 mb-2" />
              <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <Card className="p-4">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Total</p>
        <p className="text-2xl font-bold text-neutral-900 dark:text-white">
          {summary.total}
        </p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Open</p>
        <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
          {summary.open}
        </p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          In Progress
        </p>
        <p className="text-2xl font-bold text-warning-600 dark:text-warning-400">
          {summary.inProgress}
        </p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Completed
        </p>
        <p className="text-2xl font-bold text-success-600 dark:text-success-400">
          {summary.completed}
        </p>
      </Card>
      <Card className="p-4">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Overdue
        </p>
        <p className="text-2xl font-bold text-danger-600 dark:text-danger-400">
          {summary.overdue}
        </p>
      </Card>
    </div>
  );
}

/**
 * CTA row component
 */
function CTARow({ cta }: { cta: CTA }): JSX.Element {
  const isOverdue =
    cta.dueDate &&
    new Date(cta.dueDate) < new Date() &&
    cta.status !== 'COMPLETED' &&
    cta.status !== 'CANCELLED';

  return (
    <div
      className={`p-4 border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors ${
        isOverdue ? 'bg-danger-50 dark:bg-danger-900/20' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <CTAPriorityBadge priority={cta.priority} />
            <Badge variant="secondary">{cta.type}</Badge>
            <CTAStatusBadge status={cta.status} />
            {isOverdue && (
              <Badge variant="danger" className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Overdue
              </Badge>
            )}
          </div>
          <h3 className="font-medium text-neutral-900 dark:text-white mb-1">
            {cta.title}
          </h3>
          {cta.client && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {cta.client.name}
            </p>
          )}
          {cta.description && (
            <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-1 line-clamp-2">
              {cta.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {cta.dueDate && (
            <div className="text-right">
              <p
                className={`text-sm flex items-center gap-1 ${
                  isOverdue
                    ? 'text-danger-600 dark:text-danger-400'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                <Clock className="w-4 h-4" />
                {new Date(cta.dueDate).toLocaleDateString()}
              </p>
            </div>
          )}
          <Link to={`/customer-success/ctas/${cta.id}`}>
            <Button variant="ghost" size="sm">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * CTAs List Page Component
 */
function CTAsListPage(): JSX.Element {
  const [filters, setFilters] = useState<CTAListFilters>({
    sortBy: 'dueDate',
    sortOrder: 'asc',
  });

  const { data, isLoading, error } = useCTAs(filters);

  const ctas = data?.data ?? [];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="CTAs"
        description="View and manage all Calls-to-Action across your customer portfolio."
        icon={Target}
        actions={
          <Link to="/customer-success/ctas/new">
            <Button variant="primary">
              <Plus className="w-4 h-4 mr-2" />
              New CTA
            </Button>
          </Link>
        }
      />

      <div className="page-content space-y-6">
        {/* Summary stats */}
        <CTASummaryStats />

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-neutral-500" />
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Filters
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                Status
              </label>
              <Select
                value={filters.status ?? ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: e.target.value
                      ? (e.target.value as CTA['status'])
                      : undefined,
                  }))
                }
              >
                <option value="">All statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="SNOOZED">Snoozed</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                Type
              </label>
              <Select
                value={filters.type ?? ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    type: e.target.value
                      ? (e.target.value as CTA['type'])
                      : undefined,
                  }))
                }
              >
                <option value="">All types</option>
                <option value="RISK">Risk</option>
                <option value="OPPORTUNITY">Opportunity</option>
                <option value="LIFECYCLE">Lifecycle</option>
                <option value="ACTIVITY">Activity</option>
                <option value="OBJECTIVE">Objective</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                Priority
              </label>
              <Select
                value={filters.priority ?? ''}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    priority: e.target.value
                      ? (e.target.value as CTA['priority'])
                      : undefined,
                  }))
                }
              >
                <option value="">All priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                Sort by
              </label>
              <Select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-') as [
                    CTAListFilters['sortBy'],
                    CTAListFilters['sortOrder'],
                  ];
                  setFilters((prev) => ({ ...prev, sortBy, sortOrder }));
                }}
              >
                <option value="dueDate-asc">Due date (earliest)</option>
                <option value="dueDate-desc">Due date (latest)</option>
                <option value="priority-desc">Priority (highest)</option>
                <option value="priority-asc">Priority (lowest)</option>
                <option value="createdAt-desc">Newest first</option>
                <option value="createdAt-asc">Oldest first</option>
              </Select>
            </div>
          </div>
        </Card>

        {/* CTA list */}
        <Card>
          {isLoading && (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
              <p className="mt-4 text-neutral-500 dark:text-neutral-400">
                Loading CTAs...
              </p>
            </div>
          )}

          {error && (
            <div className="p-8 text-center">
              <p className="text-danger-600 dark:text-danger-400">
                Failed to load CTAs
              </p>
            </div>
          )}

          {!isLoading && !error && ctas.length === 0 && (
            <div className="p-8 text-center">
              <div className="rounded-full bg-neutral-100 dark:bg-neutral-800 p-4 w-fit mx-auto mb-3">
                <Target className="w-8 h-8 text-neutral-400" />
              </div>
              <p className="font-medium text-neutral-900 dark:text-neutral-100">
                No CTAs found
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                {filters.status || filters.type || filters.priority
                  ? 'Try adjusting your filters'
                  : 'Create your first CTA to get started'}
              </p>
              {!filters.status && !filters.type && !filters.priority && (
                <Link to="/customer-success/ctas/new">
                  <Button variant="primary" className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Create CTA
                  </Button>
                </Link>
              )}
            </div>
          )}

          {!isLoading && !error && ctas.length > 0 && (
            <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {ctas.map((cta) => (
                <CTARow key={cta.id} cta={cta} />
              ))}
            </div>
          )}
        </Card>

        {/* Results count */}
        {data && data.total > 0 && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-4 text-center">
            Showing {ctas.length} of {data.total} CTAs
          </p>
        )}
      </div>
    </div>
  );
}

export default CTAsListPage;
