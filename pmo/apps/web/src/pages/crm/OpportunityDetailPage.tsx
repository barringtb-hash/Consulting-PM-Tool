/**
 * CRM Opportunity Detail Page
 *
 * Displays detailed information about a single opportunity/deal.
 * Features:
 * - Clean dl/dt/dd layouts for info sections
 * - Contact avatars with initials
 * - Prominent stage indicator with colored badge
 * - Grouped action buttons
 * - Skeleton loaders during loading
 * - Timeline design for stage history
 */

import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  Building2,
  DollarSign,
  Calendar,
  Edit2,
  Trash2,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  User,
  MoreVertical,
  AlertCircle,
} from 'lucide-react';

import {
  useOpportunity,
  useUpdateOpportunity,
  useMarkOpportunityWon,
  useMarkOpportunityLost,
  useDeleteOpportunity,
  usePipelineStages,
  useMoveOpportunityToStage,
  type OpportunityUpdatePayload,
} from '../../api/hooks/crm';
import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { PageHeader } from '../../ui/PageHeader';
import { Textarea } from '../../ui/Textarea';
import { useToast } from '../../ui/Toast';
import { EMPTY_STATES } from '../../utils/typography';

// Avatar background color palette for contacts
const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-pink-500',
];

function getAvatarColor(name: string): string {
  // Generate consistent color based on name
  const hash = name
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'Not provided';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return 'Not provided';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStatusBadge(stage: { type?: string; name: string } | undefined): {
  variant: 'default' | 'success' | 'warning' | 'destructive';
  label: string;
} {
  if (!stage) {
    return { variant: 'default', label: 'Unknown' };
  }
  switch (stage.type) {
    case 'WON':
      return { variant: 'success', label: 'Won' };
    case 'LOST':
      return { variant: 'destructive', label: 'Lost' };
    default:
      return { variant: 'default', label: 'Open' };
  }
}

function getStageBadgeVariant(
  stageType: string | undefined,
): 'default' | 'primary' | 'success' | 'warning' | 'destructive' {
  switch (stageType) {
    case 'WON':
      return 'success';
    case 'LOST':
      return 'destructive';
    default:
      return 'primary';
  }
}

function ProbabilityIndicator({
  probability,
}: {
  probability: number;
}): JSX.Element {
  let color = 'bg-success-500';
  let label = 'High';
  if (probability < 30) {
    color = 'bg-danger-500';
    label = 'Low';
  } else if (probability < 70) {
    color = 'bg-warning-500';
    label = 'Medium';
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${probability}%` }}
        />
      </div>
      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 w-10">
        {probability}%
      </span>
      <Badge
        variant={
          probability >= 70
            ? 'success'
            : probability >= 30
              ? 'warning'
              : 'destructive'
        }
        size="sm"
      >
        {label}
      </Badge>
    </div>
  );
}

// Skeleton loader components
function SkeletonBox({ className }: { className?: string }): JSX.Element {
  return (
    <div
      className={`animate-pulse bg-neutral-200 dark:bg-neutral-700 rounded ${className ?? ''}`}
    />
  );
}

function StatCardSkeleton(): JSX.Element {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <SkeletonBox className="h-9 w-9 rounded-lg" />
        <div className="flex-1">
          <SkeletonBox className="h-4 w-16 mb-2" />
          <SkeletonBox className="h-6 w-24" />
        </div>
      </div>
    </Card>
  );
}

function DetailsSkeleton(): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <SkeletonBox className="h-6 w-40" />
      </CardHeader>
      <CardBody>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i}>
              <SkeletonBox className="h-4 w-20 mb-2" />
              <SkeletonBox className="h-5 w-32" />
            </div>
          ))}
        </dl>
      </CardBody>
    </Card>
  );
}

function ContactsSkeleton(): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <SkeletonBox className="h-6 w-24" />
      </CardHeader>
      <CardBody>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <SkeletonBox className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <SkeletonBox className="h-4 w-32 mb-2" />
                <SkeletonBox className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function SidebarSkeleton(): JSX.Element {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <SkeletonBox className="h-6 w-20" />
        </CardHeader>
        <CardBody className="space-y-3">
          <SkeletonBox className="h-10 w-full" />
          <SkeletonBox className="h-10 w-full" />
          <SkeletonBox className="h-10 w-full" />
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <SkeletonBox className="h-6 w-28" />
        </CardHeader>
        <CardBody>
          <SkeletonBox className="h-20 w-full" />
        </CardBody>
      </Card>
    </div>
  );
}

function PageSkeleton(): JSX.Element {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Header skeleton */}
      <div className="border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
        <div className="container-padding py-6">
          <SkeletonBox className="h-4 w-48 mb-4" />
          <SkeletonBox className="h-8 w-64 mb-2" />
          <SkeletonBox className="h-4 w-32 mb-4" />
          <div className="flex gap-2">
            <SkeletonBox className="h-6 w-16 rounded-md" />
            <SkeletonBox className="h-6 w-20 rounded-md" />
          </div>
        </div>
      </div>

      <div className="page-content space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <DetailsSkeleton />
            <ContactsSkeleton />
          </div>
          <SidebarSkeleton />
        </div>
      </div>
    </div>
  );
}

function OpportunityDetailPage(): JSX.Element {
  const { opportunityId: opportunityIdParam } = useParams<{
    opportunityId: string;
  }>();
  const opportunityId = useMemo(
    () => (opportunityIdParam ? Number(opportunityIdParam) : undefined),
    [opportunityIdParam],
  );
  const navigate = useNavigate();
  const { showToast } = useToast();

  const opportunityQuery = useOpportunity(opportunityId);
  const updateOpportunity = useUpdateOpportunity(opportunityId ?? 0);
  const markWon = useMarkOpportunityWon(opportunityId ?? 0);
  const markLost = useMarkOpportunityLost(opportunityId ?? 0);
  const deleteOpportunity = useDeleteOpportunity();
  const moveToStage = useMoveOpportunityToStage(opportunityId ?? 0);
  const pipelineStagesQuery = usePipelineStages();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<OpportunityUpdatePayload>>(
    {},
  );
  const [lostReason, setLostReason] = useState('');
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  useRedirectOnUnauthorized(opportunityQuery.error);

  if (!opportunityId || Number.isNaN(opportunityId)) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="container-padding py-8">
          <Card className="max-w-md mx-auto text-center py-12">
            <CardBody>
              <AlertCircle className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                Invalid Opportunity
              </h2>
              <p className="text-neutral-500 mb-4">
                The opportunity ID provided is not valid.
              </p>
              <Link to="/crm/opportunities">
                <Button variant="secondary">Back to Opportunities</Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  if (opportunityQuery.isLoading) {
    return <PageSkeleton />;
  }

  if (opportunityQuery.error) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="container-padding py-8">
          <Card className="max-w-md mx-auto text-center py-12">
            <CardBody>
              <AlertCircle className="h-12 w-12 mx-auto text-danger-400 mb-4" />
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                Error Loading Opportunity
              </h2>
              <p className="text-neutral-500 mb-4">
                {opportunityQuery.error instanceof Error
                  ? opportunityQuery.error.message
                  : 'Unable to load opportunity'}
              </p>
              <Link to="/crm/opportunities">
                <Button variant="secondary">Back to Opportunities</Button>
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    );
  }

  const opportunity = opportunityQuery.data!;
  const statusBadge = getStatusBadge(opportunity.stage);
  const isOpen = opportunity.stage?.type === 'OPEN';
  const isWon = opportunity.stage?.type === 'WON';
  const isLost = opportunity.stage?.type === 'LOST';

  const handleStartEdit = () => {
    setEditForm({
      name: opportunity.name,
      description: opportunity.description ?? '',
      amount: opportunity.amount ?? undefined,
      probability: opportunity.probability,
      expectedCloseDate: opportunity.expectedCloseDate ?? undefined,
      nextStep: opportunity.nextStep ?? '',
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    try {
      await updateOpportunity.mutateAsync(editForm);
      setIsEditing(false);
      showToast({
        message: 'Opportunity updated successfully',
        variant: 'success',
      });
    } catch (error) {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : 'Failed to update opportunity',
        variant: 'destructive',
      });
    }
  };

  const handleMarkWon = async () => {
    if (!confirm('Mark this opportunity as won?')) return;
    try {
      await markWon.mutateAsync(new Date().toISOString());
      showToast({ message: 'Opportunity marked as won!', variant: 'success' });
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : 'Failed to mark as won',
        variant: 'destructive',
      });
    }
  };

  const handleMarkLost = async () => {
    try {
      await markLost.mutateAsync(lostReason || undefined);
      setShowLostDialog(false);
      setLostReason('');
      showToast({ message: 'Opportunity marked as lost', variant: 'success' });
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : 'Failed to mark as lost',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this opportunity? This cannot be undone.',
      )
    ) {
      return;
    }
    try {
      await deleteOpportunity.mutateAsync(opportunity.id);
      showToast({ message: 'Opportunity deleted', variant: 'success' });
      navigate('/crm/opportunities');
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

  const handleMoveToStage = async (stageId: number) => {
    try {
      await moveToStage.mutateAsync(stageId);
      showToast({
        message: 'Stage updated successfully',
        variant: 'success',
      });
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : 'Failed to update stage',
        variant: 'destructive',
      });
    }
  };

  // Get available stages (filter to only OPEN stages for stage selector)
  const availableStages =
    pipelineStagesQuery.data?.stages?.filter((s) => s.type === 'OPEN') ?? [];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title={opportunity.name}
        description={opportunity.account?.name ?? 'No account'}
        breadcrumbs={[
          { label: 'CRM', href: '/crm/opportunities' },
          { label: 'Opportunities', href: '/crm/opportunities' },
          { label: opportunity.name },
        ]}
        action={
          <div className="flex items-center gap-2">
            {!isEditing && isOpen && (
              <>
                <Button variant="secondary" onClick={handleStartEdit}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                {/* Actions dropdown */}
                <div className="relative">
                  <Button
                    variant="secondary"
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    aria-label="More actions"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                  {showActionsMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowActionsMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 z-20">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setShowActionsMenu(false);
                              handleMarkWon();
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2"
                          >
                            <CheckCircle className="h-4 w-4 text-success-500" />
                            Mark as Won
                          </button>
                          <button
                            onClick={() => {
                              setShowActionsMenu(false);
                              setShowLostDialog(true);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 flex items-center gap-2"
                          >
                            <XCircle className="h-4 w-4 text-danger-500" />
                            Mark as Lost
                          </button>
                          <div className="border-t border-neutral-200 dark:border-neutral-700 my-1" />
                          <button
                            onClick={() => {
                              setShowActionsMenu(false);
                              handleDelete();
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20 flex items-center gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        }
      >
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          {/* Prominent stage indicator */}
          <Badge
            variant={getStageBadgeVariant(opportunity.stage?.type)}
            size="lg"
          >
            {opportunity.stage?.name ?? 'No stage'}
          </Badge>
          {opportunity.archived && <Badge variant="warning">Archived</Badge>}
        </div>
      </PageHeader>

      <div className="page-content space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success-100 dark:bg-success-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-success-600 dark:text-success-400" />
              </div>
              <div>
                <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                  Amount
                </dt>
                <dd className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {formatCurrency(opportunity.amount)}
                </dd>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                  Weighted Value
                </dt>
                <dd className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {formatCurrency(opportunity.weightedAmount)}
                </dd>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                  Expected Close
                </dt>
                <dd className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {formatDate(opportunity.expectedCloseDate)}
                </dd>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                  Activities
                </dt>
                <dd className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {opportunity._count?.activities ?? 0}
                </dd>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Opportunity Information */}
            <Card>
              <CardHeader>
                <CardTitle>Opportunity Details</CardTitle>
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
                          Amount
                        </label>
                        <Input
                          type="number"
                          value={editForm.amount ?? ''}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              amount: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                          Probability (%)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={editForm.probability ?? ''}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              probability: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Expected Close Date
                      </label>
                      <Input
                        type="date"
                        value={
                          editForm.expectedCloseDate
                            ? new Date(editForm.expectedCloseDate)
                                .toISOString()
                                .split('T')[0]
                            : ''
                        }
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            expectedCloseDate: e.target.value || undefined,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Description
                      </label>
                      <Textarea
                        value={editForm.description ?? ''}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Next Step
                      </label>
                      <Input
                        value={editForm.nextStep ?? ''}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            nextStep: e.target.value,
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
                        disabled={updateOpportunity.isPending}
                      >
                        {updateOpportunity.isPending
                          ? 'Saving...'
                          : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                        Description
                      </dt>
                      <dd className="mt-1 font-medium text-neutral-900 dark:text-neutral-100">
                        {opportunity.description || 'Not provided'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                        Amount
                      </dt>
                      <dd className="mt-1 font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        {formatCurrency(opportunity.amount)}
                        {opportunity.currency && (
                          <span className="text-sm text-neutral-500 dark:text-neutral-400">
                            ({opportunity.currency})
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                        Probability
                      </dt>
                      <dd className="mt-1">
                        <ProbabilityIndicator
                          probability={opportunity.probability}
                        />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                        Expected Close
                      </dt>
                      <dd className="mt-1 font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                        {formatDate(opportunity.expectedCloseDate)}
                      </dd>
                    </div>
                    {opportunity.actualCloseDate && (
                      <div>
                        <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                          Actual Close
                        </dt>
                        <dd className="mt-1 font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                          {formatDate(opportunity.actualCloseDate)}
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                        Lead Source
                      </dt>
                      <dd className="mt-1 font-medium text-neutral-900 dark:text-neutral-100">
                        {opportunity.leadSource || 'Not provided'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                        Created
                      </dt>
                      <dd className="mt-1 font-medium text-neutral-900 dark:text-neutral-100">
                        {formatDate(opportunity.createdAt)}
                      </dd>
                    </div>
                    {opportunity.nextStep && (
                      <div className="sm:col-span-2">
                        <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                          Next Step
                        </dt>
                        <dd className="mt-1 font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-primary-500" />
                          {opportunity.nextStep}
                        </dd>
                      </div>
                    )}
                    {isLost && opportunity.lostReason && (
                      <div className="sm:col-span-2">
                        <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                          Lost Reason
                        </dt>
                        <dd className="mt-1 font-medium text-danger-600 dark:text-danger-400">
                          {opportunity.lostReason}
                        </dd>
                      </div>
                    )}
                  </dl>
                )}
              </CardBody>
            </Card>

            {/* Account Information */}
            {opportunity.account && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Account</CardTitle>
                    <Link to={`/crm/accounts/${opportunity.account.id}`}>
                      <Button variant="secondary" size="sm">
                        View Account
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                      <Building2 className="h-6 w-6 text-neutral-600 dark:text-neutral-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">
                        {opportunity.account.name}
                      </div>
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        {opportunity.account.type}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Contacts with avatars */}
            <Card>
              <CardHeader>
                <CardTitle>Contacts</CardTitle>
              </CardHeader>
              <CardBody>
                {opportunity.contacts && opportunity.contacts.length > 0 ? (
                  <div className="space-y-3">
                    {opportunity.contacts.map((oc) => {
                      const initials = getInitials(
                        oc.contact.firstName,
                        oc.contact.lastName,
                      );
                      const avatarColor = getAvatarColor(
                        `${oc.contact.firstName}${oc.contact.lastName}`,
                      );
                      return (
                        <Link
                          key={oc.contact.id}
                          to={`/crm/contacts/${oc.contact.id}`}
                          className="flex items-center gap-3 p-3 -mx-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                        >
                          {/* Avatar with initials */}
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-full ${avatarColor} text-white font-medium text-sm`}
                          >
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                              {oc.contact.firstName} {oc.contact.lastName}
                              {oc.isPrimary && (
                                <Badge variant="primary" size="sm">
                                  Primary
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                              {oc.contact.jobTitle ||
                                oc.contact.email ||
                                'No details'}
                            </div>
                            {oc.role && (
                              <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                                Role: {oc.role}
                              </div>
                            )}
                          </div>
                          <User className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                        </Link>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <User className="h-8 w-8 mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
                    <p className="text-neutral-500 dark:text-neutral-400">
                      {EMPTY_STATES.noContacts}
                    </p>
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
              <CardBody className="space-y-3">
                {isOpen && (
                  <>
                    {/* Stage Selector */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                        Move to Stage
                      </label>
                      <select
                        value={opportunity.stage?.id ?? ''}
                        onChange={(e) => {
                          const stageId = Number(e.target.value);
                          if (stageId && stageId !== opportunity.stage?.id) {
                            handleMoveToStage(stageId);
                          }
                        }}
                        disabled={moveToStage.isPending}
                        className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50"
                      >
                        {availableStages.map((stage) => (
                          <option key={stage.id} value={stage.id}>
                            {stage.name} ({stage.probability}%)
                          </option>
                        ))}
                      </select>
                      {moveToStage.isPending && (
                        <p className="text-xs text-neutral-500 mt-1">
                          Updating stage...
                        </p>
                      )}
                    </div>

                    <div className="border-t border-neutral-200 dark:border-neutral-700 pt-3 mt-3 space-y-2">
                      <Button
                        variant="primary"
                        className="w-full justify-center bg-success-600 hover:bg-success-700"
                        onClick={handleMarkWon}
                        disabled={markWon.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {markWon.isPending ? 'Marking...' : 'Mark as Won'}
                      </Button>
                      <Button
                        variant="destructive"
                        className="w-full justify-center"
                        onClick={() => setShowLostDialog(true)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Mark as Lost
                      </Button>
                    </div>

                    <div className="border-t border-neutral-200 dark:border-neutral-700 pt-3">
                      <Button
                        variant="secondary"
                        className="w-full justify-center text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20"
                        onClick={handleDelete}
                        disabled={deleteOpportunity.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {deleteOpportunity.isPending
                          ? 'Deleting...'
                          : 'Delete Opportunity'}
                      </Button>
                    </div>
                  </>
                )}
                {!isOpen && (
                  <div className="text-center py-4">
                    <div
                      className={`inline-flex items-center justify-center h-12 w-12 rounded-full mb-3 ${
                        isWon
                          ? 'bg-success-100 dark:bg-success-900/30'
                          : 'bg-danger-100 dark:bg-danger-900/30'
                      }`}
                    >
                      {isWon ? (
                        <CheckCircle className="h-6 w-6 text-success-600 dark:text-success-400" />
                      ) : (
                        <XCircle className="h-6 w-6 text-danger-600 dark:text-danger-400" />
                      )}
                    </div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">
                      This opportunity is {isWon ? 'won' : 'lost'}
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                      Closed on {formatDate(opportunity.actualCloseDate)}
                    </p>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Timeline / Stage History */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardBody>
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-neutral-200 dark:bg-neutral-700" />

                  <div className="space-y-4">
                    {/* Created event */}
                    <div className="relative flex gap-3">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center z-10">
                        <div className="h-2 w-2 rounded-full bg-primary-500" />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          Opportunity Created
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {formatDate(opportunity.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* Stage history count indicator */}
                    {(opportunity._count?.stageHistory ?? 0) > 0 && (
                      <div className="relative flex gap-3">
                        <div className="flex-shrink-0 h-6 w-6 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center z-10">
                          <div className="h-2 w-2 rounded-full bg-neutral-400" />
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            Stage Changes
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            {opportunity._count?.stageHistory} stage updates
                            recorded
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Last update */}
                    <div className="relative flex gap-3">
                      <div className="flex-shrink-0 h-6 w-6 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center z-10">
                        <div className="h-2 w-2 rounded-full bg-neutral-400" />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          Last Updated
                        </p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          {formatDate(opportunity.updatedAt)}
                        </p>
                      </div>
                    </div>

                    {/* Current stage */}
                    <div className="relative flex gap-3">
                      <div
                        className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center z-10 ${
                          isWon
                            ? 'bg-success-100 dark:bg-success-900/30'
                            : isLost
                              ? 'bg-danger-100 dark:bg-danger-900/30'
                              : 'bg-primary-100 dark:bg-primary-900/30'
                        }`}
                      >
                        <div
                          className={`h-2 w-2 rounded-full ${
                            isWon
                              ? 'bg-success-500'
                              : isLost
                                ? 'bg-danger-500'
                                : 'bg-primary-500'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          Current Stage: {opportunity.stage?.name ?? 'Unknown'}
                        </p>
                        {opportunity.expectedCloseDate && isOpen && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            Expected close:{' '}
                            {formatDate(opportunity.expectedCloseDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>

      {/* Lost Dialog */}
      {showLostDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Mark as Lost</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-neutral-600 dark:text-neutral-400">
                Why was this opportunity lost?
              </p>
              <Textarea
                value={lostReason}
                onChange={(e) => setLostReason(e.target.value)}
                placeholder="Enter reason (optional)..."
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowLostDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleMarkLost}
                  disabled={markLost.isPending}
                >
                  {markLost.isPending ? 'Saving...' : 'Mark as Lost'}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}

export default OpportunityDetailPage;
