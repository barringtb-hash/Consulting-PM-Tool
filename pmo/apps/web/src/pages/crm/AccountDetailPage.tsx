/**
 * CRM Account Detail Page
 *
 * Displays detailed information about a single account with related data.
 */

import React, { useMemo, useState } from 'react';
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
  ArrowLeft,
  Edit2,
  Archive,
  RefreshCw,
  AlertTriangle,
  Clock,
  Target,
  CheckCircle,
  Plus,
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
): string {
  if (!address) return '-';
  const parts = [
    address.street,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '-';
}

function HealthScoreIndicator({ score }: { score: number }): JSX.Element {
  let color = 'bg-green-500';
  let label = 'Healthy';
  if (score < 50) {
    color = 'bg-red-500';
    label = 'Critical';
  } else if (score < 80) {
    color = 'bg-yellow-500';
    label = 'At Risk';
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-sm font-medium w-16">{score}%</span>
      <Badge
        variant={
          score >= 80 ? 'success' : score >= 50 ? 'warning' : 'destructive'
        }
      >
        {label}
      </Badge>
    </div>
  );
}

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

  // Fetch CTAs (Customer Success feature)
  const ctasQuery = useAccountCTAs(accountId, {
    status: ['OPEN', 'IN_PROGRESS'],
    sortBy: 'dueDate',
    sortOrder: 'asc',
    limit: 5,
  });

  // Fetch Success Plans (Customer Success feature)
  const successPlansQuery = useAccountSuccessPlans(accountId, {
    status: ['ACTIVE', 'DRAFT'],
    sortBy: 'targetDate',
    sortOrder: 'asc',
    limit: 5,
  });

  // Mutation hooks for creating CTAs and Success Plans
  const createCTA = useCreateAccountCTA(accountId ?? 0);
  const createSuccessPlan = useCreateAccountSuccessPlan(accountId ?? 0);

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

  if (!accountId || Number.isNaN(accountId)) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="container-padding py-8">
          <p>Invalid account ID.</p>
          <Link to="/crm/accounts" className="text-blue-600 hover:underline">
            Back to accounts
          </Link>
        </div>
      </div>
    );
  }

  if (accountQuery.isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="container-padding py-8">
          <p className="text-gray-500">Loading account...</p>
        </div>
      </div>
    );
  }

  if (accountQuery.error) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="container-padding py-8">
          <p className="text-red-600">
            {accountQuery.error instanceof Error
              ? accountQuery.error.message
              : 'Unable to load account'}
          </p>
          <Link to="/crm/accounts" className="text-blue-600 hover:underline">
            Back to accounts
          </Link>
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
        action={
          <div className="flex items-center gap-2">
            <Link to="/crm/accounts">
              <Button variant="secondary">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            {!isEditing && (
              <Button onClick={handleStartEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
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

      <div className="container-padding py-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Health Score</div>
                <div className="text-xl font-semibold">
                  {account.healthScore}%
                </div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Annual Revenue</div>
                <div className="text-xl font-semibold">
                  {formatCurrency(account.annualRevenue)}
                </div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Contacts</div>
                <div className="text-xl font-semibold">
                  {account._count?.contacts ?? 0}
                </div>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Building2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="text-sm text-gray-500">Opportunities</div>
                <div className="text-xl font-semibold">
                  {account._count?.opportunities ?? 0}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardBody>
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                    <div className="flex justify-end gap-2 pt-4 border-t">
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
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Website
                      </dt>
                      <dd className="mt-1 flex items-center gap-2">
                        <Globe className="h-4 w-4 text-gray-400" />
                        {account.website ? (
                          <a
                            href={account.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {account.website}
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Phone
                      </dt>
                      <dd className="mt-1 flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        {account.phone ?? '-'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Employee Count
                      </dt>
                      <dd className="mt-1">{account.employeeCount ?? '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Annual Revenue
                      </dt>
                      <dd className="mt-1">
                        {formatCurrency(account.annualRevenue)}
                      </dd>
                    </div>
                    <div className="md:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">
                        Billing Address
                      </dt>
                      <dd className="mt-1 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        {formatAddress(account.billingAddress)}
                      </dd>
                    </div>
                    <div className="md:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">
                        Created
                      </dt>
                      <dd className="mt-1 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDate(account.createdAt)}
                      </dd>
                    </div>
                  </dl>
                )}
              </CardBody>
            </Card>

            {/* Health & Engagement */}
            <Card>
              <CardHeader>
                <CardTitle>Health & Engagement</CardTitle>
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-2">
                    Health Score
                  </div>
                  <HealthScoreIndicator score={account.healthScore} />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-2">
                    Engagement Score
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: `${account.engagementScore}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-16">
                      {account.engagementScore}%
                    </span>
                  </div>
                </div>
                {account.churnRisk != null && account.churnRisk > 0 && (
                  <div>
                    <div className="text-sm font-medium text-gray-500 mb-2">
                      Churn Risk
                    </div>
                    <Badge variant="destructive">
                      {Math.round(account.churnRisk * 100)}% Risk
                    </Badge>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Opportunities */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Opportunities</CardTitle>
                  <Link to={`/crm/opportunities?accountId=${account.id}`}>
                    <Button variant="secondary" size="sm">
                      View All
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardBody>
                {opportunitiesQuery.isLoading ? (
                  <p className="text-gray-500">Loading opportunities...</p>
                ) : opportunities.length === 0 ? (
                  <p className="text-gray-500">{EMPTY_STATES.opportunities}</p>
                ) : (
                  <div className="divide-y">
                    {opportunities.map((opp) => (
                      <Link
                        key={opp.id}
                        to={`/crm/opportunities/${opp.id}`}
                        className="block py-3 hover:bg-gray-50 dark:hover:bg-gray-800 -mx-4 px-4 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{opp.name}</div>
                            <div className="text-sm text-gray-500">
                              {opp.stage?.name ?? 'No stage'} •{' '}
                              {opp.expectedCloseDate
                                ? formatDate(opp.expectedCloseDate)
                                : 'No close date'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">
                              {formatCurrency(opp.amount)}
                            </div>
                            <div className="text-sm text-gray-500">
                              {opp.probability}% probability
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* CTAs - Customer Success */}
            <Card>
              <CardHeader className="border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    Calls to Action
                  </CardTitle>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowCTAModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    New CTA
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                {ctasQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-500" />
                  </div>
                ) : ctas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full mb-3">
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      All caught up!
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      No open calls to action for this account
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ctas.map((cta) => (
                      <div
                        key={cta.id}
                        className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {cta.title}
                            </div>
                            <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                {cta.type.replace(/_/g, ' ')}
                              </span>
                              <span>•</span>
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
                          <div className="flex items-center gap-2 text-sm mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">
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
              <CardHeader className="border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    Success Plans
                  </CardTitle>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowSuccessPlanModal(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    New Plan
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                {successPlansQuery.isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500" />
                  </div>
                ) : successPlans.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full mb-3">
                      <Target className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      No success plans yet
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Create a plan to track customer goals and milestones
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-4"
                      onClick={() => setShowSuccessPlanModal(true)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Create First Plan
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {successPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-gray-100">
                              {plan.name}
                            </div>
                            <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                              {plan.targetDate && (
                                <>
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>
                                    Target: {formatDate(plan.targetDate)}
                                  </span>
                                </>
                              )}
                            </div>
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
                            <span className="text-gray-500">Progress</span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {plan.progressPercent}%
                            </span>
                          </div>
                          <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                plan.progressPercent >= 75
                                  ? 'bg-green-500'
                                  : plan.progressPercent >= 50
                                    ? 'bg-blue-500'
                                    : plan.progressPercent >= 25
                                      ? 'bg-amber-500'
                                      : 'bg-gray-400'
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
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
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
                  to={`/crm/opportunities?accountId=${account.id}`}
                  className="block"
                >
                  <Button variant="secondary" className="w-full justify-start">
                    <DollarSign className="h-4 w-4 mr-2" />
                    New Opportunity
                  </Button>
                </Link>
                <div className="pt-2 border-t">
                  {account.archived ? (
                    <Button
                      variant="secondary"
                      className="w-full justify-start"
                      onClick={handleRestore}
                      disabled={restoreAccount.isPending}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {restoreAccount.isPending
                        ? 'Restoring...'
                        : 'Restore Account'}
                    </Button>
                  ) : (
                    <Button
                      variant="destructive"
                      className="w-full justify-start"
                      onClick={handleArchive}
                      disabled={archiveAccount.isPending}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      {archiveAccount.isPending
                        ? 'Archiving...'
                        : 'Archive Account'}
                    </Button>
                  )}
                </div>
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
                <CardTitle>Activity</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="text-sm text-gray-500">
                  <div className="flex justify-between py-1">
                    <span>Total Activities</span>
                    <span className="font-medium">
                      {account._count?.activities ?? 0}
                    </span>
                  </div>
                  {account.lastActivityAt && (
                    <div className="flex justify-between py-1">
                      <span>Last Activity</span>
                      <span className="font-medium">
                        {formatDate(account.lastActivityAt)}
                      </span>
                    </div>
                  )}
                </div>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                <option value="EXPANSION">Expansion</option>
                <option value="RENEWAL">Renewal</option>
                <option value="ONBOARDING">Onboarding</option>
                <option value="ENGAGEMENT">Engagement</option>
                <option value="ADVOCACY">Advocacy</option>
                <option value="ESCALATION">Escalation</option>
                <option value="LIFECYCLE">Lifecycle</option>
                <option value="OTHER">Other</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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

          <div className="flex justify-end gap-3 pt-4 border-t">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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

          <div className="flex justify-end gap-3 pt-4 border-t">
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
