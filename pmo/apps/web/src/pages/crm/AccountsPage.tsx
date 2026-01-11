/**
 * CRM Accounts Page
 *
 * Displays a list of CRM accounts with filtering and basic CRUD operations.
 * Features:
 * - Stats cards with icons and colored accents
 * - Professional table layout with hover states
 * - Initials-based colored avatars
 * - Dropdown action menu
 * - Skeleton loading states
 * - Responsive design
 */

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  Plus,
  Building2,
  Search,
  Archive,
  Users,
  UserPlus,
  Crown,
  TrendingUp,
  MoreVertical,
  Pencil,
  Trash2,
  DollarSign,
} from 'lucide-react';

import {
  useAccounts,
  useCreateAccount,
  useDeleteAccount,
  useAccountStats,
  type AccountType,
} from '../../api/hooks/crm';
import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { PageHeader } from '../../ui/PageHeader';
import { Select } from '../../ui/Select';
import { useToast } from '../../ui/Toast';
import { EMPTY_STATES } from '../../utils/typography';

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
  // Generate a consistent color based on the name
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

// Dropdown menu component
interface ActionMenuProps {
  onEdit: () => void;
  onDelete: () => void;
}

function ActionMenu({ onEdit, onDelete }: ActionMenuProps): JSX.Element {
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

// Account avatar component
interface AccountAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

function AccountAvatar({ name, size = 'md' }: AccountAvatarProps): JSX.Element {
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

// Stats card component with icon
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
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

// Empty state component
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
            <Search className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
          ) : (
            <Building2 className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
          {hasFilters ? 'No matching accounts' : 'No accounts yet'}
        </h3>
        <p className="text-neutral-500 dark:text-neutral-400 mb-6">
          {hasFilters
            ? 'Try adjusting your search or filter criteria to find what you are looking for.'
            : EMPTY_STATES.accounts +
              ' Get started by adding your first account to build your CRM.'}
        </p>
        {!hasFilters && (
          <Button onClick={onAddAccount}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Account
          </Button>
        )}
      </div>
    </Card>
  );
}

function AccountsPage(): JSX.Element {
  const navigate = useNavigate();
  const { showToast } = useToast();
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
      archived: filters.includeArchived ? undefined : false, // Only show non-archived by default
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

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="Accounts"
        description="Manage your CRM accounts and companies"
        action={
          <Button onClick={() => navigate('/crm/accounts/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Account
          </Button>
        }
      />

      <div className="page-content space-y-6">
        {/* Stats Cards */}
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
              disabled={!newAccountName.trim() || createAccount.isPending}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </form>
        </Card>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500" />
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
                className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-primary-600 focus:ring-primary-500"
              />
              <Archive className="h-4 w-4" />
              Include Archived
            </label>
          </div>
        </Card>

        {/* Accounts Table */}
        {accountsQuery.isLoading ? (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                      Type / Industry
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                      Contacts
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                      Type / Industry
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                      Contacts
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {accounts.map((account) => (
                    <tr
                      key={account.id}
                      onClick={() => navigate(`/crm/accounts/${account.id}`)}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <AccountAvatar name={account.name} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                {account.name}
                              </span>
                              {account.archivedAt && (
                                <Badge
                                  variant="warning"
                                  size="sm"
                                  className="flex items-center gap-1"
                                >
                                  <Archive className="h-3 w-3" />
                                  Archived
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                              {account.annualRevenue ? (
                                <span className="inline-flex items-center gap-1">
                                  <DollarSign className="h-3 w-3 inline" />
                                  {formatCurrency(account.annualRevenue)}
                                </span>
                              ) : (
                                <span className="text-neutral-400 dark:text-neutral-500">
                                  No revenue data
                                </span>
                              )}
                            </div>
                            {/* Show type on mobile */}
                            <div className="sm:hidden mt-1">
                              <Badge
                                variant={getTypeVariant(account.type)}
                                size="sm"
                              >
                                {formatType(account.type)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={getTypeVariant(account.type)}
                            size="sm"
                          >
                            {formatType(account.type)}
                          </Badge>
                          {account.industry ? (
                            <span className="text-sm text-neutral-600 dark:text-neutral-300">
                              {account.industry}
                            </span>
                          ) : (
                            <span className="text-sm text-neutral-400 dark:text-neutral-500">
                              No industry
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                          <Users className="h-4 w-4 text-neutral-400" />
                          <span>
                            {account._count?.crmContacts ?? 0} contacts
                          </span>
                        </div>
                        <div className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                          {account._count?.opportunities ?? 0} opportunities
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <ActionMenu
                          onEdit={() => handleEditAccount(account.id)}
                          onDelete={() => handleDeleteAccount(account.id)}
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
                  {accounts.length}
                </span>{' '}
                account{accounts.length !== 1 ? 's' : ''}
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default AccountsPage;
