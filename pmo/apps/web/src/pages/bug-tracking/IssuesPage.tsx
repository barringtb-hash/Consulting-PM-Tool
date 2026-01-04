import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Bug,
  Plus,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  Clock,
  Key,
} from 'lucide-react';
import { Button, Input, Badge, Card } from '../../ui';
import { PageHeader } from '../../ui/PageHeader';
import { useIssues, useIssueStats } from '../../api/hooks/useBugTracking';
import type {
  IssueStatus,
  IssuePriority,
  IssueType,
  Issue,
} from '../../api/bug-tracking';

// Status badge colors
const STATUS_CONFIG: Record<
  IssueStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'success' | 'destructive' | 'warning';
  }
> = {
  OPEN: { label: 'Open', variant: 'destructive' },
  TRIAGING: { label: 'Triaging', variant: 'warning' },
  IN_PROGRESS: { label: 'In Progress', variant: 'default' },
  IN_REVIEW: { label: 'In Review', variant: 'secondary' },
  RESOLVED: { label: 'Resolved', variant: 'success' },
  CLOSED: { label: 'Closed', variant: 'secondary' },
  WONT_FIX: { label: "Won't Fix", variant: 'secondary' },
};

// Priority badge colors
const PRIORITY_CONFIG: Record<IssuePriority, { label: string; color: string }> =
  {
    LOW: {
      label: 'Low',
      color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    },
    MEDIUM: {
      label: 'Medium',
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    },
    HIGH: {
      label: 'High',
      color:
        'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
    },
    CRITICAL: {
      label: 'Critical',
      color: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    },
  };

// Type icons
const TYPE_CONFIG: Record<IssueType, { label: string; icon: React.ReactNode }> =
  {
    BUG: { label: 'Bug', icon: <Bug className="h-4 w-4 text-red-500" /> },
    ISSUE: {
      label: 'Issue',
      icon: <AlertCircle className="h-4 w-4 text-yellow-500" />,
    },
    FEATURE_REQUEST: {
      label: 'Feature',
      icon: <Plus className="h-4 w-4 text-green-500" />,
    },
    IMPROVEMENT: {
      label: 'Improvement',
      icon: <CheckCircle2 className="h-4 w-4 text-blue-500" />,
    },
    TASK: {
      label: 'Task',
      icon: <Clock className="h-4 w-4 text-gray-500 dark:text-neutral-400" />,
    },
  };

function IssueRow({ issue }: { issue: Issue }) {
  const navigate = useNavigate();

  return (
    <tr
      className="hover:bg-gray-50 dark:hover:bg-neutral-800 cursor-pointer"
      onClick={() => navigate(`/bug-tracking/${issue.id}`)}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {TYPE_CONFIG[issue.type]?.icon}
          <span className="text-sm text-gray-500 dark:text-neutral-500">
            #{issue.id}
          </span>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          <span className="font-medium text-gray-900 dark:text-white line-clamp-1">
            {issue.title}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {issue.labels.map((label) => (
              <span
                key={label.id}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: label.color + '20',
                  color: label.color,
                }}
              >
                {label.name}
              </span>
            ))}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <Badge variant={STATUS_CONFIG[issue.status]?.variant || 'default'}>
          {STATUS_CONFIG[issue.status]?.label || issue.status}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${PRIORITY_CONFIG[issue.priority]?.color}`}
        >
          {PRIORITY_CONFIG[issue.priority]?.label || issue.priority}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-1">
          {issue.tenant && (
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              {issue.tenant.name}
            </span>
          )}
          {issue.module && (
            <span className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-1.5 py-0.5 rounded">
              {issue.module}
            </span>
          )}
          {!issue.tenant && !issue.module && (
            <span className="text-xs text-gray-400 dark:text-neutral-400">
              -
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {issue.assignedTo ? (
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-medium dark:text-white">
              {issue.assignedTo.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {issue.assignedTo.name}
            </span>
          </div>
        ) : (
          <span className="text-sm text-gray-400 dark:text-neutral-400">
            Unassigned
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 dark:text-neutral-500">
        {new Date(issue.createdAt).toLocaleDateString()}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-neutral-500">
          {issue._count.comments > 0 && (
            <span className="flex items-center gap-1">
              <span>💬</span>
              {issue._count.comments}
            </span>
          )}
          {issue.errorCount > 1 && (
            <span className="flex items-center gap-1">
              <span>🔄</span>
              {issue.errorCount}
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function IssuesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<IssueStatus[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<IssuePriority[]>([]);
  const [showClosed, setShowClosed] = useState(false);
  const [page, setPage] = useState(1);

  const { data: issuesData, isLoading } = useIssues({
    page,
    limit: 20,
    search: search || undefined,
    status: statusFilter.length > 0 ? statusFilter : undefined,
    priority: priorityFilter.length > 0 ? priorityFilter : undefined,
    includeClosed: showClosed,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const { data: stats } = useIssueStats();

  const issues = issuesData?.data || [];
  const pagination = issuesData?.pagination;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="Bug Tracking"
        description="Track bugs, issues, and feature requests"
        icon={Bug}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/bug-tracking/api-keys')}
            >
              <Key className="h-4 w-4 mr-1" />
              API Keys
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/bug-tracking/errors')}
            >
              Error Dashboard
            </Button>
            <Button onClick={() => navigate('/bug-tracking/new')}>
              <Plus className="h-4 w-4 mr-1" />
              New Issue
            </Button>
          </div>
        }
      />

      <div className="page-content space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-neutral-500">
                    Open Issues
                  </p>
                  <p className="text-2xl font-semibold dark:text-white">
                    {stats.openCount}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500 opacity-50" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-neutral-500">
                    Created Today
                  </p>
                  <p className="text-2xl font-semibold dark:text-white">
                    {stats.createdToday}
                  </p>
                </div>
                <Plus className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-neutral-500">
                    Resolved Today
                  </p>
                  <p className="text-2xl font-semibold dark:text-white">
                    {stats.resolvedToday}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-neutral-500">
                    Avg Resolution
                  </p>
                  <p className="text-2xl font-semibold dark:text-white">
                    {stats.avgResolutionTimeHours
                      ? `${stats.avgResolutionTimeHours}h`
                      : 'N/A'}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-gray-500 opacity-50" />
              </div>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-neutral-400" />
                <Input
                  placeholder="Search issues..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500 dark:text-neutral-500" />

              {/* Status filter */}
              <select
                className="border rounded px-3 py-1.5 text-sm bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                value={statusFilter.length === 1 ? statusFilter[0] : ''}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value ? [e.target.value as IssueStatus] : [],
                  )
                }
              >
                <option value="">All Status</option>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>

              {/* Priority filter */}
              <select
                className="border rounded px-3 py-1.5 text-sm bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-white"
                value={priorityFilter.length === 1 ? priorityFilter[0] : ''}
                onChange={(e) =>
                  setPriorityFilter(
                    e.target.value ? [e.target.value as IssuePriority] : [],
                  )
                }
              >
                <option value="">All Priority</option>
                {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>

              {/* Show Closed toggle */}
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showClosed}
                  onChange={(e) => setShowClosed(e.target.checked)}
                  className="rounded border-gray-300 dark:border-neutral-600 dark:bg-neutral-700"
                />
                Show Closed
              </label>
            </div>
          </div>
        </Card>

        {/* Issues Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-neutral-800 border-b dark:border-neutral-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Title
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Tenant / Module
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Assignee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Activity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-neutral-700">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-gray-500 dark:text-neutral-500"
                    >
                      Loading issues...
                    </td>
                  </tr>
                ) : issues.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-gray-500 dark:text-neutral-500"
                    >
                      No issues found.{' '}
                      <Link
                        to="/bug-tracking/new"
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Create one
                      </Link>
                    </td>
                  </tr>
                ) : (
                  issues.map((issue) => (
                    <IssueRow key={issue.id} issue={issue} />
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t dark:border-neutral-700">
              <div className="text-sm text-gray-500 dark:text-neutral-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{' '}
                of {pagination.total} issues
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage(pagination.page - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-500 dark:text-neutral-500">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
