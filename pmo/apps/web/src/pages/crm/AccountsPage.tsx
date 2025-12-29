/**
 * CRM Accounts Page
 *
 * Displays a list of CRM accounts with filtering and basic CRUD operations.
 */

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Plus, Building2, Search, MoreHorizontal } from 'lucide-react';

import {
  useAccounts,
  useCreateAccount,
  useDeleteAccount,
  useAccountStats,
  type Account,
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

function AccountsPage(): JSX.Element {
  const { showToast } = useToast();
  const [newAccountName, setNewAccountName] = useState('');
  const [filters, setFilters] = useState<Filters>({
    search: '',
    type: '',
    industry: '',
  });

  const createAccount = useCreateAccount();
  const deleteAccount = useDeleteAccount();

  const filterParams = useMemo(
    () => ({
      search: filters.search || undefined,
      type: filters.type || undefined,
      industry: filters.industry || undefined,
    }),
    [filters.search, filters.type, filters.industry],
  );

  const accountsQuery = useAccounts(filterParams);
  const statsQuery = useAccountStats();

  useRedirectOnUnauthorized(accountsQuery.error);

  const accounts = useMemo(
    () => accountsQuery.data?.data ?? [],
    [accountsQuery.data],
  );
  const stats = statsQuery.data;

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts"
        description="Manage your CRM accounts and companies"
      />

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-500 leading-tight">
              Total Accounts
            </div>
            <div className="text-xl sm:text-2xl font-semibold">
              {stats.total}
            </div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-500 leading-tight">
              Customers
            </div>
            <div className="text-xl sm:text-2xl font-semibold text-green-600">
              {stats.byType?.CUSTOMER ?? 0}
            </div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-500 leading-tight">
              Prospects
            </div>
            <div className="text-xl sm:text-2xl font-semibold text-blue-600">
              {stats.byType?.PROSPECT ?? 0}
            </div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="text-xs sm:text-sm text-gray-500 leading-tight">
              At Risk
            </div>
            <div className="text-xl sm:text-2xl font-semibold text-red-600">
              {stats.healthDistribution?.critical ?? 0}
            </div>
          </Card>
        </div>
      )}

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
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                placeholder="Search accounts..."
                className="pl-10"
              />
            </div>
          </div>
          <Select
            value={filters.type}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                type: e.target.value as AccountType | '',
              }))
            }
          >
            <option value="">All Types</option>
            <option value="PROSPECT">Prospect</option>
            <option value="CUSTOMER">Customer</option>
            <option value="PARTNER">Partner</option>
            <option value="COMPETITOR">Competitor</option>
            <option value="CHURNED">Churned</option>
            <option value="OTHER">Other</option>
          </Select>
        </div>
      </Card>

      {/* Accounts List */}
      <Card>
        {accountsQuery.isLoading ? (
          <div className="p-8 text-center text-gray-500">
            Loading accounts...
          </div>
        ) : accounts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {filters.search || filters.type
              ? 'No accounts match your filters'
              : EMPTY_STATES.accounts}
          </div>
        ) : (
          <div className="divide-y">
            {accounts.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                onDelete={() => handleDeleteAccount(account.id)}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

interface AccountRowProps {
  account: Account;
  onDelete: () => void;
}

function AccountRow({ account, onDelete }: AccountRowProps): JSX.Element {
  return (
    <div className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
      <Link
        to={`/crm/accounts/${account.id}`}
        className="flex items-center gap-4 flex-1"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <Building2 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </div>
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400">
            {account.name}
          </div>
          <div className="text-sm text-gray-500">
            {account.industry ?? 'No industry'} •{' '}
            {account._count?.contacts ?? 0} contacts •{' '}
            {account._count?.opportunities ?? 0} opportunities
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-4">
        <Badge variant={getTypeVariant(account.type)}>
          {formatType(account.type)}
        </Badge>
        {account.annualRevenue && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {formatCurrency(account.annualRevenue)}
          </div>
        )}
        <div className="text-sm text-gray-500">
          Created {formatDate(account.createdAt)}
        </div>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default AccountsPage;
