/**
 * CRM Account Detail Page
 *
 * Displays detailed information about a single account with related data.
 * Features:
 * - Stats cards with icons and colored backgrounds
 * - Clean card layouts with dl/dt/dd for key-value pairs
 * - Consistent section headers with icons
 * - Table pattern for related lists (contacts, opportunities)
 * - Action dropdown for secondary actions
 * - Skeleton loaders for loading states
 * - Friendly empty states for empty sections
 */

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Link, useParams } from 'react-router';
import {
  Building2,
  Globe,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Edit2,
  Archive,
  RefreshCw,
  AlertTriangle,
  Clock,
  Target,
  CheckCircle,
  Plus,
  MoreVertical,
  Briefcase,
  Hash,
  Activity,
  ChevronRight,
  UserX,
  FileX,
} from 'lucide-react';

import {
  useAccount,
  useUpdateAccount,
  useArchiveAccount,
  useRestoreAccount,
  useOpportunities,
  useAccountCTAs,
  useAccountSuccessPlans,
  useCreateAccountCTA,
  useCreateAccountSuccessPlan,
  useAutoCalculateAccountHealthScore,
  type AccountType,
  type AccountUpdatePayload,
  type CreateCTAPayload,
  type CreateSuccessPlanPayload,
  type CTAType,
  type CTAPriority,
} from '../../api/hooks/crm';
import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { Textarea } from '../../ui/Textarea';
import { PageHeader } from '../../ui/PageHeader';
import { Select } from '../../ui/Select';
import { useToast } from '../../ui/Toast';
import { EMPTY_STATES } from '../../utils/typography';

// ============================================================================
// Helper Functions
// ============================================================================

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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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

function formatAddress(
  address:
    | {
        street?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        country?: string;
      }
    | null
    | undefined,
): string | null {
  if (!address) return null;
  const parts = [
    address.street,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
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
];

function getAvatarColor(name: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return first + last || '?';
}

// ============================================================================
// Skeleton Loaders
// ============================================================================

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

function CardSkeleton(): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-40 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i}>
                <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
                <div className="h-5 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </CardBody>
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
        <div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
      <td className="px-4 py-4 hidden md:table-cell">
        <div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
      <td className="px-4 py-4">
        <div className="h-4 w-4 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse ml-auto" />
      </td>
    </tr>
  );
}

function SidebarCardSkeleton(): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </CardHeader>
      <CardBody className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex justify-between">
            <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

// ============================================================================
// Reusable Components
// ============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconBg: string;
  iconColor: string;
  href?: string;
}

function StatCard({
  icon,
  label,
  value,
  iconBg,
  iconColor,
  href,
}: StatCardProps): JSX.Element {
  const content = (
    <Card
      className={`p-4 ${href ? 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer' : ''}`}
    >
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

  if (href) {
    return <Link to={href}>{content}</Link>;
  }
  return content;
}

function HealthScoreIndicator({ score }: { score: number }): JSX.Element {
  // Match backend thresholds from account-health.service.ts
  // CRITICAL: < 31, AT_RISK: 31-70, HEALTHY: >= 71
  let color = 'bg-green-500';
  let label = 'Healthy';
  if (score < 31) {
    color = 'bg-red-500';
    label = 'Critical';
  } else if (score < 71) {
    color = 'bg-yellow-500';
    label = 'At Risk';
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-sm font-medium w-12 text-right">{score}%</span>
      <Badge
        variant={
          score >= 71 ? 'success' : score >= 31 ? 'warning' : 'destructive'
        }
      >
        {label}
      </Badge>
    </div>
  );
}

// Section header with icon
interface SectionHeaderProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  action?: React.ReactNode;
}

function SectionHeader({
  icon,
  iconBg,
  title,
  action,
}: SectionHeaderProps): JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <CardTitle className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${iconBg}`}>{icon}</div>
        {title}
      </CardTitle>
      {action}
    </div>
  );
}

// Contact avatar component
interface ContactAvatarProps {
  firstName: string;
  lastName: string;
  size?: 'sm' | 'md' | 'lg';
}

function ContactAvatar({
  firstName,
  lastName,
  size = 'md',
}: ContactAvatarProps): JSX.Element {
  const initials = getInitials(firstName, lastName);
  const colors = getAvatarColor(`${firstName}${lastName}`);

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

// Action menu dropdown
interface ActionMenuProps {
  onEdit: () => void;
  onArchive: () => void;
  onRestore?: () => void;
  isArchived: boolean;
  isLoading?: boolean;
}

function ActionMenu({
  onEdit,
  onArchive,
  onRestore,
  isArchived,
  isLoading,
}: ActionMenuProps): JSX.Element {
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
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        aria-label="Open actions menu"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-20">
          <button
            onClick={() => {
              setIsOpen(false);
              onEdit();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <Edit2 className="h-4 w-4" />
            Edit Account
          </button>
          {isArchived ? (
            <button
              onClick={() => {
                setIsOpen(false);
                onRestore?.();
              }}
              disabled={isLoading}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              {isLoading ? 'Restoring...' : 'Restore Account'}
            </button>
          ) : (
            <button
              onClick={() => {
                setIsOpen(false);
                onArchive();
              }}
              disabled={isLoading}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            >
              <Archive className="h-4 w-4" />
              {isLoading ? 'Archiving...' : 'Archive Account'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Empty state component
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-full mb-3">
        {icon}
      </div>
      <p className="font-medium text-neutral-900 dark:text-neutral-100">
        {title}
      </p>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

function AccountDetailPage(): JSX.Element {
  const { accountId: accountIdParam } = useParams<{ accountId: string }>();
  const accountId = useMemo(
    () => (accountIdParam ? Number(accountIdParam) : undefined),
    [accountIdParam],
  );
  const { showToast } = useToast();

  const accountQuery = useAccount(accountId);
  const updateAccount = useUpdateAccount(accountId ?? 0);
  const archiveAccount = useArchiveAccount();
  const restoreAccount = useRestoreAccount();

  // Fetch related opportunities
  const opportunitiesQuery = useOpportunities(
    accountId ? { accountId, limit: 5 } : undefined,
  );

  // Memoize CTA params to prevent unstable query keys causing cache misses
  const ctaParams = useMemo(
    () => ({
      status: ['OPEN', 'IN_PROGRESS'] as const,
      sortBy: 'dueDate' as const,
      sortOrder: 'asc' as const,
      limit: 5,
    }),
    [],
  );

  // Fetch CTAs (Customer Success feature)
  const ctasQuery = useAccountCTAs(accountId, ctaParams);

  // Memoize Success Plans params to prevent unstable query keys
  const successPlansParams = useMemo(
    () => ({
      status: ['ACTIVE', 'DRAFT'] as const,
      sortBy: 'targetDate' as const,
      sortOrder: 'asc' as const,
      limit: 5,
    }),
    [],
  );

  // Fetch Success Plans (Customer Success feature)
  const successPlansQuery = useAccountSuccessPlans(
    accountId,
    successPlansParams,
  );

  // Mutation hooks for creating CTAs and Success Plans
  const createCTA = useCreateAccountCTA(accountId ?? 0);
  const createSuccessPlan = useCreateAccountSuccessPlan(accountId ?? 0);

  // Health score auto-calculation mutation
  const calculateHealthScore = useAutoCalculateAccountHealthScore(
    accountId ?? 0,
  );

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<AccountUpdatePayload>>({});

  // Modal states
  const [showCTAModal, setShowCTAModal] = useState(false);
  const [showSuccessPlanModal, setShowSuccessPlanModal] = useState(false);
  const [ctaForm, setCTAForm] = useState<Partial<CreateCTAPayload>>({
    type: 'RISK',
    priority: 'MEDIUM',
  });
  const [successPlanForm, setSuccessPlanForm] = useState<
    Partial<CreateSuccessPlanPayload>
  >({});

  useRedirectOnUnauthorized(accountQuery.error);

  // Invalid account ID state
  if (!accountId || Number.isNaN(accountId)) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="container-padding py-8">
          <Card className="max-w-md mx-auto text-center py-12">
            <CardBody>
              <Building2 className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                Invalid Account
              </h2>
              <p className="text-neutral-500 mb-4">
                The account ID provided is not valid.
              </p>
              <Link to="/crm/accounts">
                <Button variant="secondary">Back to Accounts</Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state with skeleton loaders
  if (accountQuery.isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <PageHeader
          title={
            <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          }
          description={
            <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mt-2" />
          }
          breadcrumbs={[
            { label: 'CRM', href: '/crm/accounts' },
            { label: 'Accounts', href: '/crm/accounts' },
            { label: 'Loading...' },
          ]}
        />
        <div className="page-content space-y-6">
          {/* Stats skeleton */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content skeleton */}
            <div className="lg:col-span-2 space-y-6">
              <CardSkeleton />
              <CardSkeleton />
            </div>
            {/* Sidebar skeleton */}
            <div className="space-y-6">
              <SidebarCardSkeleton />
              <SidebarCardSkeleton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (accountQuery.error) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="container-padding py-8">
          <Card className="max-w-md mx-auto text-center py-12">
            <CardBody>
              <Building2 className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                Account Not Found
              </h2>
              <p className="text-neutral-500 mb-4">
                {accountQuery.error instanceof Error
                  ? accountQuery.error.message
                  : 'Unable to load account'}
              </p>
              <Link to="/crm/accounts">
                <Button variant="secondary">Back to Accounts</Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  const account = accountQuery.data!;
  const opportunities = opportunitiesQuery.data?.data ?? [];
  const ctas = ctasQuery.data ?? [];
  const successPlans = successPlansQuery.data ?? [];

  const handleStartEdit = () => {
    setEditForm({
      name: account.name,
      website: account.website ?? '',
      phone: account.phone ?? '',
      industry: account.industry ?? '',
      type: account.type,
      annualRevenue: account.annualRevenue ?? undefined,
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    try {
      await updateAccount.mutateAsync(editForm);
      setIsEditing(false);
      showToast({
        message: 'Account updated successfully',
        variant: 'success',
      });
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : 'Failed to update account',
        variant: 'destructive',
      });
    }
  };

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this account?')) return;
    try {
      await archiveAccount.mutateAsync(account.id);
      showToast({ message: 'Account archived', variant: 'success' });
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : 'Failed to archive account',
        variant: 'destructive',
      });
    }
  };

  const handleRestore = async () => {
    try {
      await restoreAccount.mutateAsync(account.id);
      showToast({ message: 'Account restored', variant: 'success' });
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : 'Failed to restore account',
        variant: 'destructive',
      });
    }
  };

  const handleCreateCTA = async () => {
    if (!ctaForm.title || !ctaForm.type || !ctaForm.priority) {
      showToast({
        message: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }
    try {
      await createCTA.mutateAsync(ctaForm as CreateCTAPayload);
      setShowCTAModal(false);
      setCTAForm({ type: 'RISK', priority: 'MEDIUM' });
      showToast({ message: 'CTA created successfully', variant: 'success' });
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : 'Failed to create CTA',
        variant: 'destructive',
      });
    }
  };

  const handleCreateSuccessPlan = async () => {
    if (!successPlanForm.name) {
      showToast({
        message: 'Please provide a plan name',
        variant: 'destructive',
      });
      return;
    }
    try {
      await createSuccessPlan.mutateAsync(
        successPlanForm as CreateSuccessPlanPayload,
      );
      setShowSuccessPlanModal(false);
      setSuccessPlanForm({});
      showToast({
        message: 'Success Plan created successfully',
        variant: 'success',
      });
    } catch (error) {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : 'Failed to create Success Plan',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title={account.name}
        description={account.industry ?? 'No industry specified'}
        breadcrumbs={[
          { label: 'CRM', href: '/crm/accounts' },
          { label: 'Accounts', href: '/crm/accounts' },
          { label: account.name },
        ]}
        action={
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <Button onClick={handleStartEdit}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <ActionMenu
                  onEdit={handleStartEdit}
                  onArchive={handleArchive}
                  onRestore={handleRestore}
                  isArchived={account.archived}
                  isLoading={
                    archiveAccount.isPending || restoreAccount.isPending
                  }
                />
              </>
            )}
          </div>
        }
      >
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={getTypeVariant(account.type)}>
            {formatType(account.type)}
          </Badge>
          {account.archived && <Badge variant="warning">Archived</Badge>}
        </div>
      </PageHeader>

      <div className="page-content space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Health Score"
            value={`${account.healthScore}%`}
            iconBg="bg-blue-100 dark:bg-blue-900/50"
            iconColor="text-blue-600 dark:text-blue-400"
          />
          <StatCard
            icon={<DollarSign className="h-5 w-5" />}
            label="Annual Revenue"
            value={formatCurrency(account.annualRevenue)}
            iconBg="bg-green-100 dark:bg-green-900/50"
            iconColor="text-green-600 dark:text-green-400"
          />
          <StatCard
            icon={<Users className="h-5 w-5" />}
            label="Contacts"
            value={account._count?.crmContacts ?? 0}
            iconBg="bg-purple-100 dark:bg-purple-900/50"
            iconColor="text-purple-600 dark:text-purple-400"
            href={`/crm/contacts?accountId=${account.id}`}
          />
          <StatCard
            icon={<Briefcase className="h-5 w-5" />}
            label="Opportunities"
            value={account._count?.opportunities ?? 0}
            iconBg="bg-orange-100 dark:bg-orange-900/50"
            iconColor="text-orange-600 dark:text-orange-400"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Information */}
            <Card>
              <CardHeader>
                <SectionHeader
                  icon={
                    <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  }
                  iconBg="bg-blue-100 dark:bg-blue-900/30"
                  title="Account Information"
                />
              </CardHeader>
              <CardBody>
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Name
                      </label>
                      <Input
                        value={editForm.name ?? ''}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                          Type
                        </label>
                        <Select
                          value={editForm.type ?? ''}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              type: e.target.value as AccountType,
                            }))
                          }
                        >
                          <option value="PROSPECT">Prospect</option>
                          <option value="CUSTOMER">Customer</option>
                          <option value="PARTNER">Partner</option>
                          <option value="COMPETITOR">Competitor</option>
                          <option value="CHURNED">Churned</option>
                          <option value="OTHER">Other</option>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                          Industry
                        </label>
                        <Input
                          value={editForm.industry ?? ''}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              industry: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                          Website
                        </label>
                        <Input
                          value={editForm.website ?? ''}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              website: e.target.value,
                            }))
                          }
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                          Phone
                        </label>
                        <Input
                          value={editForm.phone ?? ''}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              phone: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Annual Revenue
                      </label>
                      <Input
                        type="number"
                        value={editForm.annualRevenue ?? ''}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            annualRevenue: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          }))
                        }
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                      <Button variant="secondary" onClick={handleCancelEdit}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveEdit}
                        disabled={updateAccount.isPending}
                      >
                        {updateAccount.isPending ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                        Website
                      </dt>
                      <dd className="font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2 mt-1">
                        <Globe className="h-4 w-4 text-neutral-400" />
                        {account.website ? (
                          <a
                            href={account.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:underline"
                          >
                            {account.website}
                          </a>
                        ) : (
                          <span className="text-neutral-400 dark:text-neutral-500 italic">
                            Not provided
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                        Phone
                      </dt>
                      <dd className="font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2 mt-1">
                        <Phone className="h-4 w-4 text-neutral-400" />
                        {account.phone || (
                          <span className="text-neutral-400 dark:text-neutral-500 italic">
                            Not provided
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                        Employee Count
                      </dt>
                      <dd className="font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2 mt-1">
                        <Hash className="h-4 w-4 text-neutral-400" />
                        {account.employeeCount || (
                          <span className="text-neutral-400 dark:text-neutral-500 italic">
                            Not provided
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                        Annual Revenue
                      </dt>
                      <dd className="font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2 mt-1">
                        <DollarSign className="h-4 w-4 text-neutral-400" />
                        {account.annualRevenue ? (
                          formatCurrency(account.annualRevenue)
                        ) : (
                          <span className="text-neutral-400 dark:text-neutral-500 italic">
                            Not provided
                          </span>
                        )}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                        Billing Address
                      </dt>
                      <dd className="font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2 mt-1">
                        <MapPin className="h-4 w-4 text-neutral-400" />
                        {formatAddress(account.billingAddress) || (
                          <span className="text-neutral-400 dark:text-neutral-500 italic">
                            Not provided
                          </span>
                        )}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                        Created
                      </dt>
                      <dd className="font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-neutral-400" />
                        {formatDate(account.createdAt)}
                      </dd>
                    </div>
                  </dl>
                )}
              </CardBody>
            </Card>

            {/* Contacts Table */}
            <Card>
              <CardHeader>
                <SectionHeader
                  icon={
                    <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  }
                  iconBg="bg-purple-100 dark:bg-purple-900/30"
                  title="Contacts"
                  action={
                    <Link to={`/crm/contacts?accountId=${account.id}`}>
                      <Button variant="secondary" size="sm">
                        View All
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  }
                />
              </CardHeader>
              <CardBody className="p-0">
                {account.crmContacts && account.crmContacts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Contact
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                            Role
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            <span className="sr-only">View</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                        {account.crmContacts.map((contact) => (
                          <tr
                            key={contact.id}
                            className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group"
                          >
                            <td className="px-6 py-4">
                              <Link
                                to={`/crm/contacts/${contact.id}`}
                                className="flex items-center gap-3"
                              >
                                <ContactAvatar
                                  firstName={contact.firstName}
                                  lastName={contact.lastName}
                                />
                                <div className="min-w-0">
                                  <div className="font-medium text-neutral-900 dark:text-neutral-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                    {contact.firstName} {contact.lastName}
                                  </div>
                                  {contact.email && (
                                    <div className="text-sm text-neutral-500 dark:text-neutral-400 truncate sm:hidden">
                                      {contact.email}
                                    </div>
                                  )}
                                </div>
                              </Link>
                            </td>
                            <td className="px-6 py-4 hidden sm:table-cell">
                              {contact.email ? (
                                <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                                  <Mail className="h-4 w-4 text-neutral-400" />
                                  <span className="truncate max-w-[180px]">
                                    {contact.email}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-neutral-400 dark:text-neutral-500">
                                  -
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 hidden md:table-cell">
                              {contact.jobTitle ? (
                                <span className="text-sm text-neutral-600 dark:text-neutral-300">
                                  {contact.jobTitle}
                                </span>
                              ) : (
                                <span className="text-sm text-neutral-400 dark:text-neutral-500">
                                  -
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Link to={`/crm/contacts/${contact.id}`}>
                                <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors inline-block" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-6 py-8">
                    <EmptyState
                      icon={
                        <UserX className="h-6 w-6 text-neutral-400 dark:text-neutral-500" />
                      }
                      title="No contacts yet"
                      description="This account does not have any associated contacts."
                      action={
                        <Link to={`/crm/contacts/new?accountId=${account.id}`}>
                          <Button variant="secondary" size="sm">
                            <Plus className="h-4 w-4 mr-1" />
                            Add Contact
                          </Button>
                        </Link>
                      }
                    />
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Opportunities Table */}
            <Card>
              <CardHeader>
                <SectionHeader
                  icon={
                    <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                  }
                  iconBg="bg-green-100 dark:bg-green-900/30"
                  title="Opportunities"
                  action={
                    <Link to={`/crm/opportunities?accountId=${account.id}`}>
                      <Button variant="secondary" size="sm">
                        View All
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  }
                />
              </CardHeader>
              <CardBody className="p-0">
                {opportunitiesQuery.isLoading ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Opportunity
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                            Stage
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...Array(3)].map((_, i) => (
                          <TableRowSkeleton key={i} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : opportunities.length === 0 ? (
                  <div className="px-6 py-8">
                    <EmptyState
                      icon={
                        <FileX className="h-6 w-6 text-neutral-400 dark:text-neutral-500" />
                      }
                      title="No opportunities yet"
                      description={EMPTY_STATES.opportunities}
                      action={
                        <Link
                          to={`/crm/opportunities/new?accountId=${account.id}`}
                        >
                          <Button variant="secondary" size="sm">
                            <Plus className="h-4 w-4 mr-1" />
                            Create Opportunity
                          </Button>
                        </Link>
                      }
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Opportunity
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                            Stage
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                        {opportunities.map((opp) => (
                          <tr
                            key={opp.id}
                            className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group"
                          >
                            <td className="px-6 py-4">
                              <Link
                                to={`/crm/opportunities/${opp.id}`}
                                className="block"
                              >
                                <div className="font-medium text-neutral-900 dark:text-neutral-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                  {opp.name}
                                </div>
                                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                                  {opp.expectedCloseDate
                                    ? `Close: ${formatDate(opp.expectedCloseDate)}`
                                    : 'No close date'}
                                </div>
                              </Link>
                            </td>
                            <td className="px-6 py-4 hidden sm:table-cell">
                              <Badge variant="default">
                                {opp.stage?.name ?? 'No stage'}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                                {formatCurrency(opp.amount)}
                              </div>
                              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                                {opp.probability}% probability
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* CTAs - Customer Success */}
            <Card>
              <CardHeader>
                <SectionHeader
                  icon={
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  }
                  iconBg="bg-amber-100 dark:bg-amber-900/30"
                  title="Calls to Action"
                  action={
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowCTAModal(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      New CTA
                    </Button>
                  }
                />
              </CardHeader>
              <CardBody>
                {ctasQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-amber-500" />
                  </div>
                ) : ctasQuery.error ? (
                  <EmptyState
                    icon={
                      <AlertTriangle className="h-6 w-6 text-red-400 dark:text-red-500" />
                    }
                    title="Failed to load CTAs"
                    description="There was an error loading the calls to action. Please try again."
                  />
                ) : ctas.length === 0 ? (
                  <EmptyState
                    icon={
                      <CheckCircle className="h-6 w-6 text-green-500 dark:text-green-400" />
                    }
                    title="All caught up!"
                    description="No open calls to action for this account."
                  />
                ) : (
                  <div className="space-y-3">
                    {ctas.map((cta) => (
                      <div
                        key={cta.id}
                        className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-neutral-900 dark:text-neutral-100">
                              {cta.title}
                            </div>
                            <div className="text-sm text-neutral-500 mt-1 flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                                {cta.type.replace(/_/g, ' ')}
                              </span>
                              <span className="text-neutral-300 dark:text-neutral-600">
                                |
                              </span>
                              <span>{cta.status}</span>
                            </div>
                          </div>
                          <Badge
                            variant={
                              cta.priority === 'CRITICAL'
                                ? 'destructive'
                                : cta.priority === 'HIGH'
                                  ? 'warning'
                                  : 'default'
                            }
                          >
                            {cta.priority}
                          </Badge>
                        </div>
                        {cta.dueDate && (
                          <div className="flex items-center gap-2 text-sm mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                            <Clock className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                            <span className="text-neutral-600 dark:text-neutral-400">
                              Due: {formatDate(cta.dueDate)}
                            </span>
                            {new Date(cta.dueDate) < new Date() && (
                              <Badge variant="destructive" className="ml-auto">
                                Overdue
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Success Plans - Customer Success */}
            <Card>
              <CardHeader>
                <SectionHeader
                  icon={
                    <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  }
                  iconBg="bg-emerald-100 dark:bg-emerald-900/30"
                  title="Success Plans"
                  action={
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowSuccessPlanModal(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      New Plan
                    </Button>
                  }
                />
              </CardHeader>
              <CardBody>
                {successPlansQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-emerald-500" />
                  </div>
                ) : successPlansQuery.error ? (
                  <EmptyState
                    icon={
                      <AlertTriangle className="h-6 w-6 text-red-400 dark:text-red-500" />
                    }
                    title="Failed to load Success Plans"
                    description="There was an error loading the success plans. Please try again."
                  />
                ) : successPlans.length === 0 ? (
                  <EmptyState
                    icon={
                      <Target className="h-6 w-6 text-neutral-400 dark:text-neutral-500" />
                    }
                    title="No success plans yet"
                    description="Create a plan to track customer goals and milestones."
                    action={
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowSuccessPlanModal(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Create First Plan
                      </Button>
                    }
                  />
                ) : (
                  <div className="space-y-3">
                    {successPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-neutral-900 dark:text-neutral-100">
                              {plan.name}
                            </div>
                            {plan.targetDate && (
                              <div className="text-sm text-neutral-500 mt-1 flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>
                                  Target: {formatDate(plan.targetDate)}
                                </span>
                              </div>
                            )}
                          </div>
                          <Badge
                            variant={
                              plan.status === 'ACTIVE'
                                ? 'success'
                                : plan.status === 'DRAFT'
                                  ? 'default'
                                  : 'warning'
                            }
                          >
                            {plan.status}
                          </Badge>
                        </div>
                        <div className="mt-4">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-neutral-500 dark:text-neutral-400">
                              Progress
                            </span>
                            <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                              {plan.progressPercent}%
                            </span>
                          </div>
                          <div className="h-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                plan.progressPercent >= 75
                                  ? 'bg-green-500'
                                  : plan.progressPercent >= 50
                                    ? 'bg-blue-500'
                                    : plan.progressPercent >= 25
                                      ? 'bg-amber-500'
                                      : 'bg-neutral-400'
                              }`}
                              style={{ width: `${plan.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            {/* Health & Engagement */}
            <Card>
              <CardHeader>
                <SectionHeader
                  icon={
                    <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  }
                  iconBg="bg-blue-100 dark:bg-blue-900/30"
                  title="Health & Engagement"
                />
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <dt className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
                    Health Score
                  </dt>
                  <dd>
                    <HealthScoreIndicator score={account.healthScore} />
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
                    Engagement Score
                  </dt>
                  <dd className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${account.engagementScore}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {account.engagementScore}%
                    </span>
                  </dd>
                </div>
                {account.churnRisk != null && account.churnRisk > 0 && (
                  <div>
                    <dt className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
                      Churn Risk
                    </dt>
                    <dd>
                      <Badge variant="destructive">
                        {Math.round(account.churnRisk * 100)}% Risk
                      </Badge>
                    </dd>
                  </div>
                )}
                <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      calculateHealthScore.mutate(undefined, {
                        onSuccess: () => {
                          showToast({
                            message: 'Health score recalculated from CRM data',
                            variant: 'success',
                          });
                        },
                        onError: (error) => {
                          showToast({
                            message:
                              error.message ||
                              'Failed to recalculate health score',
                            variant: 'destructive',
                          });
                        },
                      });
                    }}
                    disabled={calculateHealthScore.isPending}
                  >
                    {calculateHealthScore.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Calculating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Recalculate Health
                      </>
                    )}
                  </Button>
                </div>
              </CardBody>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <SectionHeader
                  icon={
                    <Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  }
                  iconBg="bg-indigo-100 dark:bg-indigo-900/30"
                  title="Quick Actions"
                />
              </CardHeader>
              <CardBody className="space-y-2">
                <Button variant="secondary" className="w-full justify-start">
                  <Mail className="h-4 w-4 mr-2" />
                  Send Email
                </Button>
                <Button variant="secondary" className="w-full justify-start">
                  <Phone className="h-4 w-4 mr-2" />
                  Log Call
                </Button>
                <Link
                  to={`/crm/opportunities/new?accountId=${account.id}`}
                  className="block"
                >
                  <Button variant="secondary" className="w-full justify-start">
                    <DollarSign className="h-4 w-4 mr-2" />
                    New Opportunity
                  </Button>
                </Link>
              </CardBody>
            </Card>

            {/* Tags */}
            {account.tags && account.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Tags</CardTitle>
                </CardHeader>
                <CardBody>
                  <div className="flex flex-wrap gap-2">
                    {account.tags.map((tag, index) => (
                      <Badge key={index} variant="default">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Activity Summary */}
            <Card>
              <CardHeader>
                <SectionHeader
                  icon={
                    <Clock className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                  }
                  iconBg="bg-neutral-100 dark:bg-neutral-800"
                  title="Activity"
                />
              </CardHeader>
              <CardBody>
                <dl className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <dt className="text-neutral-500 dark:text-neutral-400">
                      Total Activities
                    </dt>
                    <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                      {account._count?.activities ?? 0}
                    </dd>
                  </div>
                  {account.lastActivityAt && (
                    <div className="flex items-center justify-between text-sm">
                      <dt className="text-neutral-500 dark:text-neutral-400">
                        Last Activity
                      </dt>
                      <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                        {formatDate(account.lastActivityAt)}
                      </dd>
                    </div>
                  )}
                </dl>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      {/* Create CTA Modal */}
      <Modal
        isOpen={showCTAModal}
        onClose={() => {
          setShowCTAModal(false);
          setCTAForm({ type: 'RISK', priority: 'MEDIUM' });
        }}
        title="Create Call to Action"
        size="medium"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              value={ctaForm.title ?? ''}
              onChange={(e) =>
                setCTAForm((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="e.g., Schedule QBR meeting"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Type <span className="text-red-500">*</span>
              </label>
              <Select
                value={ctaForm.type ?? 'RISK'}
                onChange={(e) =>
                  setCTAForm((prev) => ({
                    ...prev,
                    type: e.target.value as CTAType,
                  }))
                }
              >
                <option value="RISK">Risk</option>
                <option value="OPPORTUNITY">Opportunity</option>
                <option value="LIFECYCLE">Lifecycle</option>
                <option value="ACTIVITY">Activity</option>
                <option value="OBJECTIVE">Objective</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Priority <span className="text-red-500">*</span>
              </label>
              <Select
                value={ctaForm.priority ?? 'MEDIUM'}
                onChange={(e) =>
                  setCTAForm((prev) => ({
                    ...prev,
                    priority: e.target.value as CTAPriority,
                  }))
                }
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Due Date
            </label>
            <Input
              type="date"
              value={ctaForm.dueDate ?? ''}
              onChange={(e) =>
                setCTAForm((prev) => ({
                  ...prev,
                  dueDate: e.target.value || undefined,
                }))
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Description
            </label>
            <Textarea
              value={ctaForm.description ?? ''}
              onChange={(e) =>
                setCTAForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Additional details about this CTA..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <Button
              variant="secondary"
              onClick={() => {
                setShowCTAModal(false);
                setCTAForm({ type: 'RISK', priority: 'MEDIUM' });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateCTA} disabled={createCTA.isPending}>
              {createCTA.isPending ? 'Creating...' : 'Create CTA'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Success Plan Modal */}
      <Modal
        isOpen={showSuccessPlanModal}
        onClose={() => {
          setShowSuccessPlanModal(false);
          setSuccessPlanForm({});
        }}
        title="Create Success Plan"
        size="medium"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Plan Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={successPlanForm.name ?? ''}
              onChange={(e) =>
                setSuccessPlanForm((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
              placeholder="e.g., Q1 2025 Adoption Goals"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Start Date
              </label>
              <Input
                type="date"
                value={successPlanForm.startDate ?? ''}
                onChange={(e) =>
                  setSuccessPlanForm((prev) => ({
                    ...prev,
                    startDate: e.target.value || undefined,
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Target Date
              </label>
              <Input
                type="date"
                value={successPlanForm.targetDate ?? ''}
                onChange={(e) =>
                  setSuccessPlanForm((prev) => ({
                    ...prev,
                    targetDate: e.target.value || undefined,
                  }))
                }
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Description
            </label>
            <Textarea
              value={successPlanForm.description ?? ''}
              onChange={(e) =>
                setSuccessPlanForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="What are the goals of this success plan?"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <Button
              variant="secondary"
              onClick={() => {
                setShowSuccessPlanModal(false);
                setSuccessPlanForm({});
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSuccessPlan}
              disabled={createSuccessPlan.isPending}
            >
              {createSuccessPlan.isPending ? 'Creating...' : 'Create Plan'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default AccountDetailPage;
