/**
 * CRM Opportunities Page
 *
 * Displays a pipeline view of CRM opportunities with stats and filtering.
 * Features:
 * - Stats cards with icons and colored accents (matching ContactsPage)
 * - Professional table layout with hover states for list view
 * - Initials-based colored avatars
 * - Dropdown action menu
 * - Skeleton loading states
 * - Responsive design
 * - Kanban board view
 */

import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { Link, useNavigate } from 'react-router';
import {
  TrendingUp,
  DollarSign,
  Target,
  Clock,
  Search,
  Plus,
  List,
  LayoutGrid,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Building2,
} from 'lucide-react';

import {
  useOpportunities,
  usePipelineStats,
  useClosingSoon,
  usePipelineStages,
  useDeleteOpportunity,
} from '../../api/hooks/crm';
import { moveOpportunityToStage } from '../../api/opportunities';
import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { PageHeader } from '../../ui/PageHeader';
import { Select } from '../../ui/Select';
import { useToast } from '../../ui/Toast';
import { EMPTY_STATES } from '../../utils/typography';
import { OpportunityKanbanBoard } from '../../components/OpportunityKanbanBoard';

interface Filters {
  search: string;
  stageType: '' | 'OPEN' | 'WON' | 'LOST';
}

// Avatar color palette based on initials (matching ContactsPage)
const AVATAR_COLORS = [
  {
    bg: 'bg-blue-100 dark:bg-blue-900/50',
    text: 'text-blue-700 dark:text-blue-300',
  },
  {
    bg: 'bg-emerald-100 dark:bg-emerald-900/50',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    bg: 'bg-violet-100 dark:bg-violet-900/50',
    text: 'text-violet-700 dark:text-violet-300',
  },
  {
    bg: 'bg-amber-100 dark:bg-amber-900/50',
    text: 'text-amber-700 dark:text-amber-300',
  },
  {
    bg: 'bg-rose-100 dark:bg-rose-900/50',
    text: 'text-rose-700 dark:text-rose-300',
  },
  {
    bg: 'bg-cyan-100 dark:bg-cyan-900/50',
    text: 'text-cyan-700 dark:text-cyan-300',
  },
  {
    bg: 'bg-orange-100 dark:bg-orange-900/50',
    text: 'text-orange-700 dark:text-orange-300',
  },
  {
    bg: 'bg-indigo-100 dark:bg-indigo-900/50',
    text: 'text-indigo-700 dark:text-indigo-300',
  },
];

function getAvatarColor(name: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase() || '??';
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStageVariant(
  stageType: string,
): 'default' | 'success' | 'warning' | 'destructive' {
  switch (stageType) {
    case 'WON':
      return 'success';
    case 'LOST':
      return 'destructive';
    default:
      return 'default';
  }
}

type ViewMode = 'list' | 'kanban';

// Skeleton loader for stats cards
function StatCardSkeleton(): JSX.Element {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
        <div className="flex-1">
          <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
          <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
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
          <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
          <div>
            <div className="h-4 w-36 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
            <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-4 py-4 hidden sm:table-cell">
        <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
      <td className="px-4 py-4 hidden md:table-cell">
        <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
      <td className="px-4 py-4">
        <div className="h-8 w-8 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
    </tr>
  );
}

// Stats card component with icon (matching ContactsPage)
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
}

function StatCard({
  icon,
  label,
  value,
  iconBg,
  iconColor,
  valueColor = 'text-neutral-900 dark:text-neutral-100',
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
          <div className={`text-xl sm:text-2xl font-semibold ${valueColor}`}>
            {value}
          </div>
        </div>
      </div>
    </Card>
  );
}

// Opportunity avatar component
interface OpportunityAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

function OpportunityAvatar({
  name,
  size = 'md',
}: OpportunityAvatarProps): JSX.Element {
  const initials = getInitials(name);
  const colors = getAvatarColor(name);

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold ${sizeClasses[size]} ${colors.bg} ${colors.text}`}
    >
      {initials}
    </div>
  );
}

// Dropdown action menu component
interface ActionMenuProps {
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ActionMenu({
  onView,
  onEdit,
  onDelete,
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
  onAddOpportunity,
}: {
  hasFilters: boolean;
  onAddOpportunity: () => void;
}): JSX.Element {
  return (
    <Card className="p-12">
      <div className="flex flex-col items-center text-center max-w-md mx-auto">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-4">
          {hasFilters ? (
            <Search className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
          ) : (
            <Target className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
          {hasFilters ? 'No matching opportunities' : 'No opportunities yet'}
        </h3>
        <p className="text-neutral-500 dark:text-neutral-400 mb-6">
          {hasFilters
            ? 'Try adjusting your search or filter criteria to find what you are looking for.'
            : EMPTY_STATES.opportunities +
              ' Get started by adding your first opportunity to build your pipeline.'}
        </p>
        {!hasFilters && (
          <Button onClick={onAddOpportunity}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Opportunity
          </Button>
        )}
      </div>
    </Card>
  );
}

function OpportunitiesPage(): JSX.Element {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [filters, setFilters] = useState<Filters>({
    search: '',
    stageType: '',
  });

  const deleteOpportunity = useDeleteOpportunity();

  // OPTIMIZED: Send stageType to server instead of filtering client-side
  const filterParams = useMemo(
    () => ({
      search: filters.search || undefined,
      stageType: filters.stageType || undefined,
    }),
    [filters.search, filters.stageType],
  );

  const opportunitiesQuery = useOpportunities(filterParams);
  const statsQuery = usePipelineStats();
  const closingSoonQuery = useClosingSoon(7);
  const pipelineStagesQuery = usePipelineStages();

  // State for tracking which opportunity is being moved (for optimistic UI)
  const [_movingOpportunityId, setMovingOpportunityId] = useState<
    number | null
  >(null);

  useRedirectOnUnauthorized(opportunitiesQuery.error);

  const opportunities = opportunitiesQuery.data?.data ?? [];
  const stages = pipelineStagesQuery.data?.stages ?? [];

  const stats = statsQuery.data;
  const closingSoon = closingSoonQuery.data ?? [];

  const hasFilters = Boolean(filters.search || filters.stageType);
  const isLoading =
    opportunitiesQuery.isLoading || pipelineStagesQuery.isLoading;

  // Handle opportunity click in Kanban view
  const handleOpportunityClick = useCallback(
    (opportunityId: number) => {
      navigate(`/crm/opportunities/${opportunityId}`);
    },
    [navigate],
  );

  // Handle opportunity stage move in Kanban view
  const handleOpportunityMove = useCallback(
    async (opportunityId: number, newStageId: number) => {
      setMovingOpportunityId(opportunityId);
      try {
        await moveOpportunityToStage(opportunityId, newStageId);
        showToast({ message: 'Stage updated', variant: 'success' });
        opportunitiesQuery.refetch();
        statsQuery.refetch();
      } catch (error) {
        showToast({
          message:
            error instanceof Error ? error.message : 'Failed to update stage',
          variant: 'destructive',
        });
      } finally {
        setMovingOpportunityId(null);
      }
    },
    [showToast, opportunitiesQuery, statsQuery],
  );

  const handleViewOpportunity = (id: number): void => {
    navigate(`/crm/opportunities/${id}`);
  };

  const handleEditOpportunity = (id: number): void => {
    navigate(`/crm/opportunities/${id}/edit`);
  };

  const handleDeleteOpportunity = async (id: number): Promise<void> => {
    if (!confirm('Are you sure you want to delete this opportunity?')) return;

    try {
      await deleteOpportunity.mutateAsync(id);
      showToast({
        message: 'Opportunity deleted successfully',
        variant: 'success',
      });
    } catch (error) {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : 'Failed to delete opportunity',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="Opportunities"
        description="Manage your sales pipeline and deals"
        action={
          <Link to="/crm/opportunities/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Opportunity
            </Button>
          </Link>
        }
      />

      <div className="page-content space-y-6">
        {/* Stats Cards */}
        {statsQuery.isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<DollarSign className="h-5 w-5" />}
              label="Pipeline Value"
              value={formatCurrency(stats.totalValue)}
              iconBg="bg-blue-100 dark:bg-blue-900/50"
              iconColor="text-blue-600 dark:text-blue-400"
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Weighted Value"
              value={formatCurrency(stats.weightedValue)}
              iconBg="bg-emerald-100 dark:bg-emerald-900/50"
              iconColor="text-emerald-600 dark:text-emerald-400"
              valueColor="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              icon={<Target className="h-5 w-5" />}
              label="Win Rate"
              value={`${(stats.winRate * 100).toFixed(1)}%`}
              iconBg="bg-violet-100 dark:bg-violet-900/50"
              iconColor="text-violet-600 dark:text-violet-400"
              valueColor="text-violet-600 dark:text-violet-400"
            />
            <StatCard
              icon={<Clock className="h-5 w-5" />}
              label="Avg Deal Size"
              value={formatCurrency(stats.averageDealSize)}
              iconBg="bg-amber-100 dark:bg-amber-900/50"
              iconColor="text-amber-600 dark:text-amber-400"
            />
          </div>
        ) : null}

        {/* Closing Soon */}
        {closingSoon.length > 0 && (
          <Card className="p-4">
            <h3 className="font-medium mb-3">Closing This Week</h3>
            <div className="flex flex-wrap gap-2">
              {closingSoon.map((opp) => (
                <div
                  key={opp.id}
                  className="flex items-center gap-2 px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
                >
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">
                    {opp.name}
                  </span>
                  <span className="text-sm text-neutral-600 dark:text-neutral-300">
                    {formatCurrency(opp.amount)}
                  </span>
                  <Badge variant="warning">
                    {opp.daysUntilClose} day
                    {opp.daysUntilClose !== 1 ? 's' : ''}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Filters and View Toggle */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                <Input
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  placeholder="Search opportunities..."
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={filters.stageType}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  stageType: e.target.value as Filters['stageType'],
                }))
              }
            >
              <option value="">All Stages</option>
              <option value="OPEN">Open</option>
              <option value="WON">Won</option>
              <option value="LOST">Lost</option>
            </Select>

            {/* View Toggle */}
            <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'kanban'
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                }`}
                title="Kanban view"
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden sm:inline">Board</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-l border-neutral-200 dark:border-neutral-700 ${
                  viewMode === 'list'
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700'
                }`}
                title="List view"
              >
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>
          </div>
        </Card>

        {/* Pipeline by Stage */}
        {stats && (
          <Card className="p-4">
            <h3 className="font-medium mb-4">Pipeline by Stage</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
              {stats.byStage.map((stage) => (
                <div
                  key={stage.stageId}
                  className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg border border-neutral-200 dark:border-neutral-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm text-neutral-900 dark:text-neutral-100">
                      {stage.stageName}
                    </span>
                    <Badge variant={getStageVariant(stage.stageType)}>
                      {stage.count}
                    </Badge>
                  </div>
                  <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    {formatCurrency(stage.value)}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400">
                    Weighted: {formatCurrency(stage.weightedValue)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Opportunities - Kanban or List View */}
        {isLoading ? (
          viewMode === 'kanban' ? (
            <Card className="p-8 text-center text-neutral-500 dark:text-neutral-400">
              Loading opportunities...
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Opportunity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                        Account
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                        Amount
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
          )
        ) : opportunities.length === 0 ? (
          <EmptyState
            hasFilters={hasFilters}
            onAddOpportunity={() => navigate('/crm/opportunities/new')}
          />
        ) : viewMode === 'kanban' ? (
          /* Kanban Board View */
          <Card className="overflow-hidden">
            <OpportunityKanbanBoard
              opportunities={opportunities}
              stages={stages}
              onOpportunityMove={handleOpportunityMove}
              onOpportunityClick={handleOpportunityClick}
            />
          </Card>
        ) : (
          /* List View - Clean table matching ContactsPage pattern */
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Opportunity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                      Account
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {opportunities.map((opportunity) => (
                    <tr
                      key={opportunity.id}
                      onClick={() => handleViewOpportunity(opportunity.id)}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <OpportunityAvatar name={opportunity.name} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                {opportunity.name}
                              </span>
                              {opportunity.stage && (
                                <Badge
                                  variant={getStageVariant(
                                    opportunity.stage.type,
                                  )}
                                  size="sm"
                                >
                                  {opportunity.stage.name}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-neutral-500 dark:text-neutral-400">
                              {opportunity.probability}% probability
                              {opportunity.expectedCloseDate && (
                                <span className="hidden lg:inline">
                                  {' '}
                                  - Close:{' '}
                                  {formatDate(opportunity.expectedCloseDate)}
                                </span>
                              )}
                            </div>
                            {/* Show account on mobile */}
                            {opportunity.account && (
                              <div className="sm:hidden text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1 mt-1">
                                <Building2 className="h-3 w-3" />
                                <span className="truncate">
                                  {opportunity.account.name}
                                </span>
                              </div>
                            )}
                            {/* Show amount on mobile */}
                            <div className="md:hidden text-sm font-medium text-neutral-700 dark:text-neutral-300 mt-1">
                              {formatCurrency(opportunity.amount)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        {opportunity.account ? (
                          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                            <Building2 className="h-4 w-4 text-neutral-400" />
                            <span className="truncate max-w-[200px]">
                              {opportunity.account.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-neutral-400 dark:text-neutral-500">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                          {formatCurrency(opportunity.amount)}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <ActionMenu
                          onView={() => handleViewOpportunity(opportunity.id)}
                          onEdit={() => handleEditOpportunity(opportunity.id)}
                          onDelete={() =>
                            handleDeleteOpportunity(opportunity.id)
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Results count footer */}
            <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800/30 border-t border-neutral-200 dark:border-neutral-700">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Showing{' '}
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  {opportunities.length}
                </span>{' '}
                opportunit{opportunities.length !== 1 ? 'ies' : 'y'}
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default OpportunitiesPage;
