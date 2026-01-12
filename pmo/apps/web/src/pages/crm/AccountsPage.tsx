/**
 * CRM Accounts Page with Customer Success Dashboard & Analytics
 *
 * Enhanced CRM Accounts page featuring:
 * - Accounts list with filtering and CRUD operations
 * - Customer Success Dashboard with portfolio health and CTAs
 * - Analytics with health distribution and churn risk analysis
 */

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router';
import {
  Plus,
  Building2,
  Search,
  Archive,
  Users,
  UserPlus,
  Crown,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  Pencil,
  Trash2,
  DollarSign,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  BarChart3,
  Activity,
  Heart,
  List,
} from 'lucide-react';

import {
  useAccounts,
  useCreateAccount,
  useDeleteAccount,
  useAccountStats,
  usePortfolioHealthSummary,
  useCTACockpit,
  usePortfolioCTASummary,
  type AccountType,
} from '../../api/hooks/crm';
import { useCTAAnalytics } from '../../api/hooks/customer-success';
import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { PageHeader } from '../../ui/PageHeader';
import { Select } from '../../ui/Select';
import { useToast } from '../../ui/Toast';
import { EMPTY_STATES } from '../../utils/typography';

// Tab types
type TabType = 'accounts' | 'dashboard' | 'analytics';

interface Filters {
  search: string;
  type: AccountType | '';
  industry: string;
  includeArchived: boolean;
}

// Avatar color palette based on initials
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
  return name.substring(0, 2).toUpperCase() || '?';
}

function getTypeVariant(
  type: AccountType,
): 'default' | 'success' | 'warning' | 'destructive' {
  switch (type) {
    case 'CUSTOMER':
      return 'success';
    case 'PROSPECT':
      return 'default';
    case 'PARTNER':
      return 'warning';
    case 'CHURNED':
    case 'COMPETITOR':
      return 'destructive';
    default:
      return 'default';
  }
}

function formatType(type: AccountType): string {
  return type.charAt(0) + type.slice(1).toLowerCase();
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

// Skeleton loaders
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

function TableRowSkeleton(): JSX.Element {
  return (
    <tr className="border-b border-neutral-200 dark:border-neutral-700">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
          <div>
            <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
            <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-4 py-4 hidden sm:table-cell">
        <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
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

// Action Menu
interface ActionMenuProps {
  onEdit: () => void;
  onDelete: () => void;
}

function ActionMenu({ onEdit, onDelete }: ActionMenuProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    if (isOpen) document.addEventListener('keydown', handleEscape);
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
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onEdit();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            <Pencil className="h-4 w-4" /> Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onDelete();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

// Account Avatar
function AccountAvatar({
  name,
  size = 'md',
}: {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}): JSX.Element {
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

// Stats Card
function StatCard({
  icon,
  label,
  value,
  iconBg,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  iconBg: string;
  iconColor: string;
}): JSX.Element {
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

// Empty State
function EmptyState({
  hasFilters,
  onAddAccount,
}: {
  hasFilters: boolean;
  onAddAccount: () => void;
}): JSX.Element {
  return (
    <Card className="p-12">
      <div className="flex flex-col items-center text-center max-w-md mx-auto">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-4">
          {hasFilters ? (
            <Search className="h-8 w-8 text-neutral-400" />
          ) : (
            <Building2 className="h-8 w-8 text-neutral-400" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
          {hasFilters ? 'No matching accounts' : 'No accounts yet'}
        </h3>
        <p className="text-neutral-500 dark:text-neutral-400 mb-6">
          {hasFilters
            ? 'Try adjusting your search or filter criteria.'
            : EMPTY_STATES.accounts +
              ' Get started by adding your first account.'}
        </p>
        {!hasFilters && (
          <Button onClick={onAddAccount}>
            <Plus className="h-4 w-4 mr-2" /> Add Your First Account
          </Button>
        )}
      </div>
    </Card>
  );
}

// CTA Priority Badge
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

// ============== DASHBOARD TAB ==============

function PortfolioHealthSummary(): JSX.Element {
  const { data: summary, isLoading, error } = usePortfolioHealthSummary();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error || !summary) {
    return (
      <Card className="p-6 border-red-200 dark:border-red-800">
        <p className="text-red-600 dark:text-red-400">
          Failed to load portfolio health summary
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Portfolio Health
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mt-1">
              {summary.averageScore}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {Math.round(summary.averageChurnRisk * 100)}% avg churn risk
            </p>
          </div>
          <div
            className={`p-2 sm:p-3 rounded-xl shrink-0 ${summary.averageScore >= 70 ? 'bg-green-100 dark:bg-green-900/30' : summary.averageScore >= 40 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}
          >
            {summary.averageScore >= 70 ? (
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
            ) : (
              <TrendingDown className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />
            )}
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Healthy
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400 mt-1">
              {summary.healthyCount}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {summary.totalAccounts > 0
                ? Math.round(
                    (summary.healthyCount / summary.totalAccounts) * 100,
                  )
                : 0}
              % of portfolio
            </p>
          </div>
          <div className="p-2 sm:p-3 rounded-xl bg-green-100 dark:bg-green-900/30 shrink-0">
            <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400">
              At Risk
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
              {summary.atRiskCount}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Needs attention
            </p>
          </div>
          <div className="p-2 sm:p-3 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 shrink-0">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-neutral-500 dark:text-neutral-400">
              Critical
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400 mt-1">
              {summary.criticalCount}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Immediate action
            </p>
          </div>
          <div className="p-2 sm:p-3 rounded-xl bg-red-100 dark:bg-red-900/30 shrink-0">
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />
          </div>
        </div>
      </Card>
    </div>
  );
}

function CockpitSection(): JSX.Element {
  const { data: cockpit, isLoading, error } = useCTACockpit();

  if (isLoading) {
    return (
      <Card className="p-6 h-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">CTA Cockpit</h3>
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
      <Card className="p-6 h-full border-red-200 dark:border-red-800">
        <p className="text-red-600 dark:text-red-400">
          Failed to load cockpit data
        </p>
      </Card>
    );
  }

  const allCTAs = [
    ...cockpit.overdueCTAs.map((cta: Record<string, unknown>) => ({
      ...cta,
      section: 'overdue',
    })),
    ...cockpit.todayCTAs.map((cta: Record<string, unknown>) => ({
      ...cta,
      section: 'today',
    })),
    ...cockpit.upcomingCTAs
      .slice(0, 3)
      .map((cta: Record<string, unknown>) => ({ ...cta, section: 'upcoming' })),
  ];

  return (
    <Card className="p-6 h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold flex items-center gap-2 text-neutral-900 dark:text-white">
          <Target className="w-5 h-5" /> CTA Cockpit
        </h3>
      </div>

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
          {allCTAs.map((cta: Record<string, unknown>) => (
            <div
              key={cta.id as number}
              className={`p-3 rounded-lg border transition-colors ${cta.section === 'overdue' ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20' : 'border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <CTAPriorityBadge
                      priority={
                        cta.priority as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
                      }
                    />
                    <Badge variant="secondary">{cta.type as string}</Badge>
                    {cta.section === 'overdue' && (
                      <Badge variant="danger">Overdue</Badge>
                    )}
                  </div>
                  <h4 className="font-medium text-neutral-900 dark:text-white truncate">
                    {cta.title as string}
                  </h4>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                    {((cta.account as Record<string, unknown>)
                      ?.name as string) ||
                      ((cta.client as Record<string, unknown>)?.name as string)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {cta.dueDate && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(cta.dueDate as string).toLocaleDateString()}
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

function DashboardTab(): JSX.Element {
  return (
    <div className="space-y-6">
      <PortfolioHealthSummary />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CockpitSection />
        </div>
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold flex items-center gap-2 text-neutral-900 dark:text-white">
                <Heart className="w-5 h-5" /> Quick Actions
              </h3>
            </div>
            <div className="space-y-3">
              <Link to="/crm/accounts?health=critical" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <AlertCircle className="w-4 h-4 mr-2 text-red-500" /> View
                  Critical Accounts
                </Button>
              </Link>
              <Link to="/crm/accounts?health=at_risk" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <AlertTriangle className="w-4 h-4 mr-2 text-yellow-500" />{' '}
                  View At-Risk Accounts
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============== ANALYTICS TAB ==============

function AnalyticsTab(): JSX.Element {
  // Use CRM portfolio health for account data
  const { data: portfolioHealth, isLoading: healthLoading } =
    usePortfolioHealthSummary();
  const { data: ctaSummary, isLoading: ctaSummaryLoading } =
    usePortfolioCTASummary();
  const { data: ctaAnalytics, isLoading: ctaLoading } = useCTAAnalytics(30);

  const isLoading = healthLoading || ctaSummaryLoading || ctaLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
        <Card className="p-6">
          <div className="animate-pulse h-48 bg-neutral-200 dark:bg-neutral-700 rounded" />
        </Card>
      </div>
    );
  }

  // Calculate totals from CRM portfolio health data
  const total = portfolioHealth
    ? portfolioHealth.healthyCount +
      portfolioHealth.atRiskCount +
      portfolioHealth.criticalCount
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats - Using CRM portfolio health data */}
      {portfolioHealth && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Portfolio Health
                </p>
                <p className="text-3xl font-bold text-neutral-900 dark:text-white mt-1">
                  {portfolioHealth.averageScore}
                </p>
              </div>
              <div
                className={`p-3 rounded-full ${portfolioHealth.averageScore >= 70 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}
              >
                <TrendingUp
                  className={`w-6 h-6 ${portfolioHealth.averageScore >= 70 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}
                />
              </div>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
              {Math.round(portfolioHealth.averageChurnRisk * 100)}% avg churn
              risk
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Open CTAs
                </p>
                <p className="text-3xl font-bold text-neutral-900 dark:text-white mt-1">
                  {ctaSummary?.open ?? 0}
                </p>
              </div>
              <div
                className={`p-3 rounded-full ${(ctaSummary?.overdue ?? 0) > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}
              >
                <Target
                  className={`w-6 h-6 ${(ctaSummary?.overdue ?? 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}
                />
              </div>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
              {ctaSummary?.overdue ?? 0} overdue
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Total Accounts
                </p>
                <p className="text-3xl font-bold text-neutral-900 dark:text-white mt-1">
                  {portfolioHealth.totalAccounts}
                </p>
              </div>
              <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
              {portfolioHealth.healthyCount} healthy
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  At Risk
                </p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                  {portfolioHealth.atRiskCount}
                </p>
              </div>
              <div className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
              {portfolioHealth.criticalCount} critical
            </p>
          </Card>
        </div>
      )}

      {/* Health Distribution - Using CRM portfolio health data */}
      {portfolioHealth && (
        <Card>
          <CardHeader className="flex justify-between items-center">
            <h3 className="font-semibold flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> Portfolio Health Distribution
            </h3>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" /> Healthy
                  </span>
                  <span className="font-medium">
                    {portfolioHealth.healthyCount} (
                    {total > 0
                      ? Math.round((portfolioHealth.healthyCount / total) * 100)
                      : 0}
                    %)
                  </span>
                </div>
                <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{
                      width: `${total > 0 ? (portfolioHealth.healthyCount / total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" /> At
                    Risk
                  </span>
                  <span className="font-medium">
                    {portfolioHealth.atRiskCount} (
                    {total > 0
                      ? Math.round((portfolioHealth.atRiskCount / total) * 100)
                      : 0}
                    %)
                  </span>
                </div>
                <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 rounded-full"
                    style={{
                      width: `${total > 0 ? (portfolioHealth.atRiskCount / total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" /> Critical
                  </span>
                  <span className="font-medium">
                    {portfolioHealth.criticalCount} (
                    {total > 0
                      ? Math.round(
                          (portfolioHealth.criticalCount / total) * 100,
                        )
                      : 0}
                    %)
                  </span>
                </div>
                <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{
                      width: `${total > 0 ? (portfolioHealth.criticalCount / total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Churn Risk Analysis - Using CRM portfolio health */}
            <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
              <h4 className="font-medium mb-4">Churn Risk Analysis</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {portfolioHealth.criticalCount}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    High Risk
                  </p>
                </div>
                <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {portfolioHealth.atRiskCount}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Medium Risk
                  </p>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {portfolioHealth.healthyCount}
                  </p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Low Risk
                  </p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* CTA Analytics */}
      {ctaAnalytics && (
        <Card>
          <CardHeader>
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="w-5 h-5" /> CTA Performance
            </h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                  {ctaAnalytics.totalCTAs}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Total CTAs
                </p>
              </div>
              <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {ctaAnalytics.overdueCount}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Overdue
                </p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {Math.round(ctaAnalytics.completionRate * 100)}%
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Completion Rate
                </p>
              </div>
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {ctaAnalytics.avgResolutionTime?.toFixed(1) || '-'}
                </p>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Avg Resolution (days)
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

// ============== ACCOUNTS TAB ==============

interface AccountsTabProps {
  accounts: Array<Record<string, unknown>>;
  isLoading: boolean;
  hasFilters: boolean;
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
  newAccountName: string;
  setNewAccountName: (name: string) => void;
  handleCreateAccount: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleDeleteAccount: (id: number) => Promise<void>;
  handleEditAccount: (id: number) => void;
  createAccountPending: boolean;
  navigate: (path: string) => void;
}

function AccountsTab({
  accounts,
  isLoading,
  hasFilters,
  filters,
  setFilters,
  newAccountName,
  setNewAccountName,
  handleCreateAccount,
  handleDeleteAccount,
  handleEditAccount,
  createAccountPending,
  navigate,
}: AccountsTabProps): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Quick Create Form */}
      <Card className="p-4">
        <form onSubmit={handleCreateAccount} className="flex gap-2">
          <Input
            value={newAccountName}
            onChange={(e) => setNewAccountName(e.target.value)}
            placeholder="Enter account name..."
            className="flex-1"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!newAccountName.trim() || createAccountPending}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Account
          </Button>
        </form>
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input
              type="text"
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              placeholder="Search accounts..."
              className="pl-10"
            />
          </div>
          <Select
            value={filters.type}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                type: e.target.value as AccountType | '',
              }))
            }
            className="w-full sm:w-44"
          >
            <option value="">All Types</option>
            <option value="PROSPECT">Prospect</option>
            <option value="CUSTOMER">Customer</option>
            <option value="PARTNER">Partner</option>
            <option value="COMPETITOR">Competitor</option>
            <option value="CHURNED">Churned</option>
            <option value="OTHER">Other</option>
          </Select>
          <label className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300 cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={filters.includeArchived}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  includeArchived: e.target.checked,
                }))
              }
              className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600"
            />
            <Archive className="h-4 w-4" /> Include Archived
          </label>
        </div>
      </Card>

      {/* Accounts Table */}
      {isLoading ? (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">
                    Account
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase hidden sm:table-cell">
                    Type / Industry
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase hidden md:table-cell">
                    Contacts
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 uppercase">
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
      ) : accounts.length === 0 ? (
        <EmptyState
          hasFilters={hasFilters}
          onAddAccount={() => navigate('/crm/accounts/new')}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase">
                    Account
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase hidden sm:table-cell">
                    Type / Industry
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase hidden md:table-cell">
                    Contacts
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 uppercase">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {accounts.map((account) => (
                  <tr
                    key={account.id as number}
                    onClick={() => navigate(`/crm/accounts/${account.id}`)}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <AccountAvatar name={account.name as string} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {account.name as string}
                            </span>
                            {account.archivedAt && (
                              <Badge
                                variant="warning"
                                size="sm"
                                className="flex items-center gap-1"
                              >
                                <Archive className="h-3 w-3" /> Archived
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                            {account.annualRevenue ? (
                              <span className="inline-flex items-center gap-1">
                                <DollarSign className="h-3 w-3" />
                                {formatCurrency(
                                  account.annualRevenue as number,
                                )}
                              </span>
                            ) : (
                              <span className="text-neutral-400">
                                No revenue data
                              </span>
                            )}
                          </div>
                          <div className="sm:hidden mt-1">
                            <Badge
                              variant={getTypeVariant(
                                account.type as AccountType,
                              )}
                              size="sm"
                            >
                              {formatType(account.type as AccountType)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <div className="flex flex-col gap-1">
                        <Badge
                          variant={getTypeVariant(account.type as AccountType)}
                          size="sm"
                        >
                          {formatType(account.type as AccountType)}
                        </Badge>
                        {account.industry ? (
                          <span className="text-sm text-neutral-600 dark:text-neutral-300">
                            {account.industry as string}
                          </span>
                        ) : (
                          <span className="text-sm text-neutral-400">
                            No industry
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                        <Users className="h-4 w-4 text-neutral-400" />
                        <span>
                          {(account._count as Record<string, number>)
                            ?.crmContacts ?? 0}{' '}
                          contacts
                        </span>
                      </div>
                      <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        {(account._count as Record<string, number>)
                          ?.opportunities ?? 0}{' '}
                        opportunities
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <ActionMenu
                        onEdit={() => handleEditAccount(account.id as number)}
                        onDelete={() =>
                          handleDeleteAccount(account.id as number)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800/30 border-t border-neutral-200 dark:border-neutral-700">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Showing{' '}
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                {accounts.length}
              </span>{' '}
              account{accounts.length !== 1 ? 's' : ''}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============== MAIN PAGE ==============

function AccountsPage(): JSX.Element {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('accounts');
  const [newAccountName, setNewAccountName] = useState('');
  const [filters, setFilters] = useState<Filters>({
    search: '',
    type: '',
    industry: '',
    includeArchived: false,
  });

  const createAccount = useCreateAccount();
  const deleteAccount = useDeleteAccount();

  const filterParams = useMemo(
    () => ({
      search: filters.search || undefined,
      type: filters.type || undefined,
      industry: filters.industry || undefined,
      archived: filters.includeArchived ? undefined : false,
    }),
    [filters.search, filters.type, filters.industry, filters.includeArchived],
  );

  const accountsQuery = useAccounts(filterParams);
  const statsQuery = useAccountStats();

  useRedirectOnUnauthorized(accountsQuery.error);

  const accounts = useMemo(
    () => accountsQuery.data?.data ?? [],
    [accountsQuery.data],
  );
  const stats = statsQuery.data;
  const hasFilters = Boolean(
    filters.search || filters.type || filters.includeArchived,
  );

  const handleCreateAccount = async (
    e: React.FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    e.preventDefault();
    if (!newAccountName.trim()) return;
    try {
      await createAccount.mutateAsync({ name: newAccountName.trim() });
      setNewAccountName('');
      showToast({
        message: 'Account created successfully',
        variant: 'success',
      });
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : 'Failed to create account',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAccount = async (id: number): Promise<void> => {
    if (!confirm('Are you sure you want to delete this account?')) return;
    try {
      await deleteAccount.mutateAsync(id);
      showToast({
        message: 'Account deleted successfully',
        variant: 'success',
      });
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : 'Failed to delete account',
        variant: 'destructive',
      });
    }
  };

  const handleEditAccount = (id: number): void => {
    navigate(`/crm/accounts/${id}`);
  };

  const tabs = [
    { id: 'accounts' as const, label: 'Accounts', icon: List },
    { id: 'dashboard' as const, label: 'Dashboard', icon: Heart },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="Accounts"
        description="Manage accounts, track customer health, and analyze portfolio performance"
        action={
          <Button onClick={() => navigate('/crm/accounts/new')}>
            <Plus className="h-4 w-4 mr-2" /> New Account
          </Button>
        }
      />

      <div className="page-content space-y-6">
        {/* Stats Cards (visible on Accounts tab) */}
        {activeTab === 'accounts' && (
          <>
            {statsQuery.isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </div>
            ) : stats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  icon={<Users className="h-5 w-5" />}
                  label="Total Accounts"
                  value={stats.total}
                  iconBg="bg-blue-100 dark:bg-blue-900/50"
                  iconColor="text-blue-600 dark:text-blue-400"
                />
                <StatCard
                  icon={<UserPlus className="h-5 w-5" />}
                  label="Prospects"
                  value={stats.byType?.PROSPECT ?? 0}
                  iconBg="bg-emerald-100 dark:bg-emerald-900/50"
                  iconColor="text-emerald-600 dark:text-emerald-400"
                />
                <StatCard
                  icon={<Crown className="h-5 w-5" />}
                  label="Customers"
                  value={stats.byType?.CUSTOMER ?? 0}
                  iconBg="bg-amber-100 dark:bg-amber-900/50"
                  iconColor="text-amber-600 dark:text-amber-400"
                />
                <StatCard
                  icon={<TrendingUp className="h-5 w-5" />}
                  label="At Risk"
                  value={stats.healthDistribution?.critical ?? 0}
                  iconBg="bg-violet-100 dark:bg-violet-900/50"
                  iconColor="text-violet-600 dark:text-violet-400"
                />
              </div>
            ) : null}
          </>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-neutral-200 dark:border-neutral-700">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300 dark:text-neutral-400 dark:hover:text-neutral-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'accounts' && (
          <AccountsTab
            accounts={accounts as Array<Record<string, unknown>>}
            isLoading={accountsQuery.isLoading}
            hasFilters={hasFilters}
            filters={filters}
            setFilters={setFilters}
            newAccountName={newAccountName}
            setNewAccountName={setNewAccountName}
            handleCreateAccount={handleCreateAccount}
            handleDeleteAccount={handleDeleteAccount}
            handleEditAccount={handleEditAccount}
            createAccountPending={createAccount.isPending}
            navigate={navigate}
          />
        )}

        {activeTab === 'dashboard' && <DashboardTab />}

        {activeTab === 'analytics' && <AnalyticsTab />}
      </div>
    </div>
  );
}

export default AccountsPage;
