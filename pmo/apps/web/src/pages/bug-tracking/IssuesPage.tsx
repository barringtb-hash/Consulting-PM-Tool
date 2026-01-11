/**
 * Bug Tracking Issues Page
 *
 * Displays a list of issues with filtering and basic CRUD operations.
 * Features:
 * - Stats cards with icons and colored accents
 * - Professional table layout with hover states
 * - Severity-based colored badges
 * - Dropdown action menu
 * - Skeleton loading states
 * - Responsive design
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Bug,
  Plus,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  Key,
  MoreVertical,
  Eye,
  Pencil,
  XCircle,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Button, Input, Badge, Card } from '../../ui';
import { PageHeader } from '../../ui/PageHeader';
import { Select } from '../../ui/Select';
import { useToast } from '../../ui/Toast';
import {
  useIssues,
  useIssueStats,
  useDeleteIssue,
  useChangeIssueStatus,
} from '../../api/hooks/useBugTracking';
import type { IssueStatus, IssuePriority, Issue } from '../../api/bug-tracking';

// Status badge configuration
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

// Priority/Severity badge configuration with consistent colors
const PRIORITY_CONFIG: Record<
  IssuePriority,
  {
    label: string;
    bg: string;
    text: string;
  }
> = {
  LOW: {
    label: 'Low',
    bg: 'bg-neutral-100 dark:bg-neutral-700',
    text: 'text-neutral-700 dark:text-neutral-300',
  },
  MEDIUM: {
    label: 'Medium',
    bg: 'bg-blue-100 dark:bg-blue-900/50',
    text: 'text-blue-700 dark:text-blue-300',
  },
  HIGH: {
    label: 'High',
    bg: 'bg-amber-100 dark:bg-amber-900/50',
    text: 'text-amber-700 dark:text-amber-300',
  },
  CRITICAL: {
    label: 'Critical',
    bg: 'bg-red-100 dark:bg-red-900/50',
    text: 'text-red-700 dark:text-red-300',
  },
};

// Skeleton loader for stats cards
function StatCardSkeleton(): JSX.Element {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
        <div className="flex-1">
          <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
          <div className="h-6 w-12 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>
      </div>
    </Card>
  );
}

// Skeleton loader for table rows
function TableRowSkeleton(): JSX.Element {
  return (
    <tr className="border-b border-neutral-200 dark:border-neutral-700">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
          <div>
            <div className="h-4 w-48 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
            <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-4 py-4 hidden sm:table-cell">
        <div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
      <td className="px-4 py-4 hidden md:table-cell">
        <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
      <td className="px-4 py-4">
        <div className="h-8 w-8 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
    </tr>
  );
}

// Stats card component with icon
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  iconBg: string;
  iconColor: string;
}

function StatCard({
  icon,
  label,
  value,
  iconBg,
  iconColor,
}: StatCardProps): JSX.Element {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-lg ${iconBg}`}
        >
          <div className={iconColor}>{icon}</div>
        </div>
        <div>
          <div className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
            {label}
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            {value}
          </div>
        </div>
      </div>
    </Card>
  );
}

// Dropdown action menu component
interface ActionMenuProps {
  onView: () => void;
  onEdit: () => void;
  onClose: () => void;
  onDelete: () => void;
  isClosed: boolean;
}

function ActionMenu({
  onView,
  onEdit,
  onClose,
  onDelete,
  isClosed,
}: ActionMenuProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        aria-label="Open actions menu"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onView();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <Eye className="h-4 w-4" />
            View
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onEdit();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          {!isClosed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
                onClose();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <XCircle className="h-4 w-4" />
              Close Issue
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onDelete();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// Empty state component
function EmptyState({
  hasFilters,
  onAddIssue,
}: {
  hasFilters: boolean;
  onAddIssue: () => void;
}): JSX.Element {
  return (
    <Card className="p-12">
      <div className="flex flex-col items-center text-center max-w-md mx-auto">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-4">
          {hasFilters ? (
            <Search className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
          ) : (
            <Bug className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
          {hasFilters ? 'No matching issues' : 'No issues yet'}
        </h3>
        <p className="text-neutral-500 dark:text-neutral-400 mb-6">
          {hasFilters
            ? 'Try adjusting your search or filter criteria to find what you are looking for.'
            : 'Get started by creating your first issue to track bugs and feature requests.'}
        </p>
        {!hasFilters && (
          <Button onClick={onAddIssue}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Issue
          </Button>
        )}
      </div>
    </Card>
  );
}

// Issue row component
function IssueRow({
  issue,
  onView,
  onEdit,
  onClose,
  onDelete,
}: {
  issue: Issue;
  onView: () => void;
  onEdit: () => void;
  onClose: () => void;
  onDelete: () => void;
}): JSX.Element {
  const priorityConfig = PRIORITY_CONFIG[issue.priority];
  const statusConfig = STATUS_CONFIG[issue.status];
  const isClosed = issue.status === 'CLOSED' || issue.status === 'RESOLVED';

  return (
    <tr
      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors group"
      onClick={onView}
    >
      {/* Column 1: Title with severity badge and ID */}
      <td className="px-4 py-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 ${priorityConfig.bg}`}
          >
            {issue.priority === 'CRITICAL' ? (
              <AlertTriangle className={`h-4 w-4 ${priorityConfig.text}`} />
            ) : (
              <Bug className={`h-4 w-4 ${priorityConfig.text}`} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                #{issue.id}
              </span>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${priorityConfig.bg} ${priorityConfig.text}`}
              >
                {priorityConfig.label}
              </span>
            </div>
            <div className="mt-1">
              <span className="font-medium text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors line-clamp-1">
                {issue.title}
              </span>
            </div>
            {/* Show labels if any */}
            {issue.labels.length > 0 && (
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {issue.labels.slice(0, 3).map((label) => (
                  <span
                    key={label.id}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: label.color + '20',
                      color: label.color,
                    }}
                  >
                    {label.name}
                  </span>
                ))}
                {issue.labels.length > 3 && (
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">
                    +{issue.labels.length - 3}
                  </span>
                )}
              </div>
            )}
            {/* Show status on mobile */}
            <div className="sm:hidden mt-2">
              <Badge variant={statusConfig.variant} size="sm">
                {statusConfig.label}
              </Badge>
            </div>
          </div>
        </div>
      </td>

      {/* Column 2: Status (hidden on mobile) */}
      <td className="px-4 py-4 hidden sm:table-cell">
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
      </td>

      {/* Column 3: Created date or assignee (hidden on mobile) */}
      <td className="px-4 py-4 hidden md:table-cell">
        <div className="flex flex-col gap-1">
          {issue.assignedTo ? (
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-medium text-neutral-700 dark:text-neutral-300">
                {issue.assignedTo.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate max-w-[120px]">
                {issue.assignedTo.name}
              </span>
            </div>
          ) : (
            <span className="text-sm text-neutral-500 dark:text-neutral-400">
              {new Date(issue.createdAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </td>

      {/* Actions column */}
      <td className="px-4 py-4 text-right">
        <ActionMenu
          onView={onView}
          onEdit={onEdit}
          onClose={onClose}
          onDelete={onDelete}
          isClosed={isClosed}
        />
      </td>
    </tr>
  );
}

export default function IssuesPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<IssueStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<IssuePriority | ''>('');
  const [showClosed, setShowClosed] = useState(false);
  const [page, setPage] = useState(1);

  const deleteIssue = useDeleteIssue();
  const changeStatus = useChangeIssueStatus();

  const { data: issuesData, isLoading } = useIssues({
    page,
    limit: 20,
    search: search || undefined,
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    includeClosed: showClosed,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const { data: stats, isLoading: statsLoading } = useIssueStats();

  const issues = issuesData?.data || [];
  const pagination = issuesData?.pagination;

  const hasFilters = Boolean(search || statusFilter || priorityFilter);

  const handleDeleteIssue = async (id: number): Promise<void> => {
    if (!confirm('Are you sure you want to delete this issue?')) return;

    try {
      await deleteIssue.mutateAsync(id);
      showToast({
        message: 'Issue deleted successfully',
        variant: 'success',
      });
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : 'Failed to delete issue',
        variant: 'destructive',
      });
    }
  };

  const handleCloseIssue = async (id: number): Promise<void> => {
    try {
      await changeStatus.mutateAsync({ id, status: 'CLOSED' });
      showToast({
        message: 'Issue closed successfully',
        variant: 'success',
      });
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : 'Failed to close issue',
        variant: 'destructive',
      });
    }
  };

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
        {statsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<Bug className="h-5 w-5" />}
              label="Total Issues"
              value={stats.total}
              iconBg="bg-blue-100 dark:bg-blue-900/50"
              iconColor="text-blue-600 dark:text-blue-400"
            />
            <StatCard
              icon={<AlertCircle className="h-5 w-5" />}
              label="Open"
              value={stats.openCount}
              iconBg="bg-amber-100 dark:bg-amber-900/50"
              iconColor="text-amber-600 dark:text-amber-400"
            />
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="Closed"
              value={stats.byStatus?.CLOSED || 0}
              iconBg="bg-emerald-100 dark:bg-emerald-900/50"
              iconColor="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              icon={<AlertTriangle className="h-5 w-5" />}
              label="Critical"
              value={stats.byPriority?.CRITICAL || 0}
              iconBg="bg-red-100 dark:bg-red-900/50"
              iconColor="text-red-600 dark:text-red-400"
            />
          </div>
        ) : null}

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500" />
              <Input
                placeholder="Search issues..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
              <Filter className="h-4 w-4 text-neutral-500 dark:text-neutral-500 hidden sm:block flex-shrink-0" />

              {/* Status filter */}
              <div className="w-full sm:w-auto">
                <Select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as IssueStatus | '')
                  }
                  className="sm:w-36"
                >
                  <option value="">All Status</option>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Priority filter */}
              <div className="w-full sm:w-auto">
                <Select
                  value={priorityFilter}
                  onChange={(e) =>
                    setPriorityFilter(e.target.value as IssuePriority | '')
                  }
                  className="sm:w-36"
                >
                  <option value="">All Priority</option>
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Show Closed toggle */}
              <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 cursor-pointer whitespace-nowrap flex-shrink-0">
                <input
                  type="checkbox"
                  checked={showClosed}
                  onChange={(e) => setShowClosed(e.target.checked)}
                  className="rounded border-neutral-300 dark:border-neutral-600 dark:bg-neutral-700 text-primary-600 focus:ring-primary-500"
                />
                Show Closed
              </label>
            </div>
          </div>
        </Card>

        {/* Issues Table */}
        {isLoading ? (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Issue
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                      Assignee / Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <TableRowSkeleton key={i} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : issues.length === 0 ? (
          <EmptyState
            hasFilters={hasFilters}
            onAddIssue={() => navigate('/bug-tracking/new')}
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Issue
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                      Assignee / Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {issues.map((issue) => (
                    <IssueRow
                      key={issue.id}
                      issue={issue}
                      onView={() => navigate(`/bug-tracking/${issue.id}`)}
                      onEdit={() => navigate(`/bug-tracking/${issue.id}/edit`)}
                      onClose={() => handleCloseIssue(issue.id)}
                      onDelete={() => handleDeleteIssue(issue.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Results count footer */}
            <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800/30 border-t border-neutral-200 dark:border-neutral-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Showing{' '}
                  <span className="font-medium text-neutral-700 dark:text-neutral-300">
                    {issues.length}
                  </span>{' '}
                  {pagination
                    ? `of ${pagination.total}`
                    : `issue${issues.length !== 1 ? 's' : ''}`}
                </p>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => setPage(pagination.page - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-neutral-500 dark:text-neutral-500">
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
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
