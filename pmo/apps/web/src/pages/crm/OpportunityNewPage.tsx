/**
 * CRM New Opportunity Page
 *
 * Create a new opportunity/deal in the sales pipeline.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft,
  Save,
  Loader2,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

import {
  useAccounts,
  useCreateOpportunity,
  usePipelineStages,
  type OpportunityPayload,
} from '../../api/hooks/crm';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { PageHeader } from '../../ui/PageHeader';
import { Select } from '../../ui/Select';
import { Textarea } from '../../ui/Textarea';
import { useToast } from '../../ui/Toast';

const LEAD_SOURCES = [
  { value: '', label: 'Select source...' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'OUTBOUND', label: 'Outbound' },
  { value: 'EVENT', label: 'Event' },
  { value: 'OTHER', label: 'Other' },
];

function OpportunityNewPage(): JSX.Element {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const createOpportunity = useCreateOpportunity();

  // Fetch accounts for dropdown
  const accountsQuery = useAccounts({ limit: 100 });
  const accounts = accountsQuery.data?.data ?? [];

  // Fetch pipeline stages for dropdown
  const stagesQuery = usePipelineStages();
  const stages = stagesQuery.data?.stages ?? [];

  // Form state
  const [formData, setFormData] = useState<{
    name: string;
    accountId: string;
    stageId: string;
    amount: string;
    probability: string;
    expectedCloseDate: string;
    description: string;
    nextStep: string;
    leadSource: string;
  }>({
    name: '',
    accountId: '',
    stageId: '',
    amount: '',
    probability: '',
    expectedCloseDate: '',
    description: '',
    nextStep: '',
    leadSource: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (!formData.accountId) {
      newErrors.accountId = 'Account is required';
    }
    if (!formData.stageId) {
      newErrors.stageId = 'Stage is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const payload: OpportunityPayload = {
      name: formData.name.trim(),
      accountId: Number(formData.accountId),
      stageId: Number(formData.stageId),
      amount: formData.amount ? Number(formData.amount) : undefined,
      probability: formData.probability
        ? Number(formData.probability)
        : undefined,
      expectedCloseDate: formData.expectedCloseDate || undefined,
      description: formData.description.trim() || undefined,
      nextStep: formData.nextStep.trim() || undefined,
      leadSource: formData.leadSource || undefined,
    };

    try {
      const opportunity = await createOpportunity.mutateAsync(payload);
      showToast({
        message: 'Opportunity created successfully',
        variant: 'success',
      });
      navigate(`/crm/opportunities/${opportunity.id}`);
    } catch (error) {
      showToast({
        message:
          error instanceof Error
            ? error.message
            : 'Failed to create opportunity',
        variant: 'destructive',
      });
    }
  };

  const isLoading = accountsQuery.isLoading || stagesQuery.isLoading;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="New Opportunity"
        icon={TrendingUp}
        description="Create a new deal in your sales pipeline"
        breadcrumbs={[
          { label: 'CRM', href: '/crm/opportunities' },
          { label: 'Opportunities', href: '/crm/opportunities' },
          { label: 'New Opportunity' },
        ]}
        action={
          <Button
            variant="secondary"
            onClick={() => navigate('/crm/opportunities')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        }
      />

      <div className="container-padding py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="max-w-3xl">
            <Card className="p-6">
              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                  >
                    Opportunity Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Enterprise License Deal"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Account and Stage */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="accountId"
                      className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                    >
                      Account <span className="text-red-500">*</span>
                    </label>
                    <Select
                      id="accountId"
                      name="accountId"
                      value={formData.accountId}
                      onChange={handleChange}
                      className={errors.accountId ? 'border-red-500' : ''}
                    >
                      <option value="">Select account...</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </Select>
                    {errors.accountId && (
                      <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.accountId}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="stageId"
                      className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                    >
                      Stage <span className="text-red-500">*</span>
                    </label>
                    <Select
                      id="stageId"
                      name="stageId"
                      value={formData.stageId}
                      onChange={handleChange}
                      className={errors.stageId ? 'border-red-500' : ''}
                    >
                      <option value="">Select stage...</option>
                      {stages.map((stage) => (
                        <option key={stage.stageId} value={stage.stageId}>
                          {stage.stageName}
                        </option>
                      ))}
                    </Select>
                    {errors.stageId && (
                      <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.stageId}
                      </p>
                    )}
                  </div>
                </div>

                {/* Amount and Probability */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="amount"
                      className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                    >
                      Amount (USD)
                    </label>
                    <Input
                      id="amount"
                      name="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.amount}
                      onChange={handleChange}
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="probability"
                      className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                    >
                      Probability (%)
                    </label>
                    <Input
                      id="probability"
                      name="probability"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.probability}
                      onChange={handleChange}
                      placeholder="50"
                    />
                  </div>
                </div>

                {/* Expected Close Date and Lead Source */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="expectedCloseDate"
                      className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                    >
                      Expected Close Date
                    </label>
                    <Input
                      id="expectedCloseDate"
                      name="expectedCloseDate"
                      type="date"
                      value={formData.expectedCloseDate}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="leadSource"
                      className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                    >
                      Lead Source
                    </label>
                    <Select
                      id="leadSource"
                      name="leadSource"
                      value={formData.leadSource}
                      onChange={handleChange}
                    >
                      {LEAD_SOURCES.map((source) => (
                        <option key={source.value} value={source.value}>
                          {source.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                  >
                    Description
                  </label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Details about this opportunity..."
                  />
                </div>

                {/* Next Step */}
                <div>
                  <label
                    htmlFor="nextStep"
                    className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                  >
                    Next Step
                  </label>
                  <Input
                    id="nextStep"
                    name="nextStep"
                    value={formData.nextStep}
                    onChange={handleChange}
                    placeholder="e.g., Schedule demo call"
                  />
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => navigate('/crm/opportunities')}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createOpportunity.isPending}>
                    {createOpportunity.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Create Opportunity
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </form>
        )}
      </div>
    </div>
  );
}

export default OpportunityNewPage;
