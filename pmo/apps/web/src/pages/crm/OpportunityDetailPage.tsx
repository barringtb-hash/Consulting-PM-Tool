/**
 * CRM Opportunity Detail Page
 *
 * Displays detailed information about a single opportunity/deal.
 */

import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  Building2,
  DollarSign,
  Calendar,
  ArrowLeft,
  Edit2,
  Trash2,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
} from 'lucide-react';

import {
  useOpportunity,
  useUpdateOpportunity,
  useMarkOpportunityWon,
  useMarkOpportunityLost,
  useDeleteOpportunity,
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

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
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

function getStatusBadge(
  stage: { stageType: string; name: string } | undefined,
): {
  variant: 'default' | 'success' | 'warning' | 'destructive';
  label: string;
} {
  if (!stage) {
    return { variant: 'default', label: 'Unknown' };
  }
  switch (stage.stageType) {
    case 'WON':
      return { variant: 'success', label: 'Won' };
    case 'LOST':
      return { variant: 'destructive', label: 'Lost' };
    default:
      return { variant: 'default', label: 'Open' };
  }
}

function ProbabilityIndicator({
  probability,
}: {
  probability: number;
}): JSX.Element {
  let color = 'bg-green-500';
  if (probability < 30) {
    color = 'bg-red-500';
  } else if (probability < 70) {
    color = 'bg-yellow-500';
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${probability}%` }}
        />
      </div>
      <span className="text-sm font-medium w-12">{probability}%</span>
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

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<OpportunityUpdatePayload>>(
    {},
  );
  const [lostReason, setLostReason] = useState('');
  const [showLostDialog, setShowLostDialog] = useState(false);

  useRedirectOnUnauthorized(opportunityQuery.error);

  if (!opportunityId || Number.isNaN(opportunityId)) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="container-padding py-8">
          <p>Invalid opportunity ID.</p>
          <Link to="/crm/opportunities" className="text-blue-600 hover:underline">
            Back to opportunities
          </Link>
        </div>
      </div>
    );
  }

  if (opportunityQuery.isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="container-padding py-8">
          <p className="text-gray-500">Loading opportunity...</p>
        </div>
      </div>
    );
  }

  if (opportunityQuery.error) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="container-padding py-8">
          <p className="text-red-600">
            {opportunityQuery.error instanceof Error
              ? opportunityQuery.error.message
              : 'Unable to load opportunity'}
          </p>
          <Link to="/crm/opportunities" className="text-blue-600 hover:underline">
            Back to opportunities
          </Link>
        </div>
      </div>
    );
  }

  const opportunity = opportunityQuery.data!;
  const statusBadge = getStatusBadge(opportunity.stage);
  const isOpen = opportunity.stage?.stageType === 'OPEN';
  const isWon = opportunity.stage?.stageType === 'WON';
  const isLost = opportunity.stage?.stageType === 'LOST';

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

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title={opportunity.name}
        description={opportunity.account?.name ?? 'No account'}
        action={
          <div className="flex items-center gap-2">
            <Link to="/crm/opportunities">
              <Button variant="secondary">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
            {!isEditing && isOpen && (
              <Button onClick={handleStartEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        }
      >
        <div className="flex items-center gap-2 mt-2">
          <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
          <Badge variant="default">
            {opportunity.stage?.name ?? 'No stage'}
          </Badge>
          {opportunity.archived && <Badge variant="warning">Archived</Badge>}
        </div>
      </PageHeader>

      <div className="container-padding py-6 space-y-6">
        {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Amount</div>
              <div className="text-xl font-semibold">
                {formatCurrency(opportunity.amount)}
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Weighted Value</div>
              <div className="text-xl font-semibold">
                {formatCurrency(opportunity.weightedAmount)}
              </div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-sm text-gray-500">Expected Close</div>
              <div className="text-xl font-semibold">
                {formatDate(opportunity.expectedCloseDate)}
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
              <div className="text-sm text-gray-500">Activities</div>
              <div className="text-xl font-semibold">
                {opportunity._count?.activities ?? 0}
              </div>
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
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                  <div className="flex justify-end gap-2 pt-4 border-t">
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
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">
                      Description
                    </dt>
                    <dd className="mt-1 text-gray-900 dark:text-gray-100">
                      {opportunity.description || '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Amount
                    </dt>
                    <dd className="mt-1 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      {formatCurrency(opportunity.amount)}
                      <span className="text-sm text-gray-500">
                        ({opportunity.currency})
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Probability
                    </dt>
                    <dd className="mt-1">
                      <ProbabilityIndicator
                        probability={opportunity.probability}
                      />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Expected Close
                    </dt>
                    <dd className="mt-1 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {formatDate(opportunity.expectedCloseDate)}
                    </dd>
                  </div>
                  {opportunity.actualCloseDate && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Actual Close
                      </dt>
                      <dd className="mt-1 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {formatDate(opportunity.actualCloseDate)}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Lead Source
                    </dt>
                    <dd className="mt-1">{opportunity.leadSource || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Created
                    </dt>
                    <dd className="mt-1">
                      {formatDate(opportunity.createdAt)}
                    </dd>
                  </div>
                  {opportunity.nextStep && (
                    <div className="md:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">
                        Next Step
                      </dt>
                      <dd className="mt-1 flex items-center gap-2">
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        {opportunity.nextStep}
                      </dd>
                    </div>
                  )}
                  {isLost && opportunity.lostReason && (
                    <div className="md:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">
                        Lost Reason
                      </dt>
                      <dd className="mt-1 text-red-600">
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                    <Building2 className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <div className="font-semibold text-lg">
                      {opportunity.account.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {opportunity.account.type}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Contacts */}
          <Card>
            <CardHeader>
              <CardTitle>Contacts</CardTitle>
            </CardHeader>
            <CardBody>
              {(opportunity._count?.contacts ?? 0) > 0 ? (
                <p className="text-gray-500">
                  {opportunity._count?.contacts} contacts linked to this
                  opportunity.
                </p>
              ) : (
                <p className="text-gray-500">{EMPTY_STATES.noContacts}</p>
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
              {isOpen && (
                <>
                  <Button
                    variant="primary"
                    className="w-full justify-start bg-green-600 hover:bg-green-700"
                    onClick={handleMarkWon}
                    disabled={markWon.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {markWon.isPending ? 'Marking...' : 'Mark as Won'}
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full justify-start"
                    onClick={() => setShowLostDialog(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Mark as Lost
                  </Button>
                  <div className="border-t pt-2 mt-2">
                    <Button
                      variant="secondary"
                      className="w-full justify-start text-red-600"
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
                <div className="text-center text-gray-500 py-4">
                  This opportunity is {isWon ? 'won' : 'lost'}.
                </div>
              )}
            </CardBody>
          </Card>

          {/* Stage History */}
          <Card>
            <CardHeader>
              <CardTitle>Stage History</CardTitle>
            </CardHeader>
            <CardBody>
              {(opportunity._count?.stageHistory ?? 0) > 0 ? (
                <p className="text-gray-500 text-sm">
                  {opportunity._count?.stageHistory} stage changes recorded.
                </p>
              ) : (
                <p className="text-gray-500 text-sm">No stage changes yet.</p>
              )}
            </CardBody>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="text-sm text-gray-500 space-y-2">
                <div className="flex justify-between">
                  <span>Created</span>
                  <span className="font-medium">
                    {formatDate(opportunity.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Last Updated</span>
                  <span className="font-medium">
                    {formatDate(opportunity.updatedAt)}
                  </span>
                </div>
                {opportunity.expectedCloseDate && (
                  <div className="flex justify-between">
                    <span>Expected Close</span>
                    <span className="font-medium">
                      {formatDate(opportunity.expectedCloseDate)}
                    </span>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
      </div>

      {/* Lost Dialog */}
      {showLostDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Mark as Lost</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
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
