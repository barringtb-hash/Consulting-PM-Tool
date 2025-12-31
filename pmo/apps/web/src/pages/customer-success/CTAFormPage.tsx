/**
 * CTA Form Page
 *
 * Form for creating a new Call-to-Action in the Customer Success module.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { PageHeader } from '../../ui/PageHeader';
import { useToast } from '../../ui/Toast';
import { useCreateCTA } from '../../api/hooks/customer-success';
import { useClients } from '../../api/hooks/clients';
import type { CreateCTAInput } from '../../api/customer-success';

const CTA_TYPES = [
  { value: 'RISK', label: 'Risk' },
  { value: 'OPPORTUNITY', label: 'Opportunity' },
  { value: 'LIFECYCLE', label: 'Lifecycle' },
  { value: 'ACTIVITY', label: 'Activity' },
  { value: 'OBJECTIVE', label: 'Objective' },
] as const;

const CTA_PRIORITIES = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
] as const;

function CTAFormPage(): JSX.Element {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const createCTA = useCreateCTA();
  const { data: clientsData, isLoading: clientsLoading } = useClients();

  const [formData, setFormData] = useState<Partial<CreateCTAInput>>({
    type: 'RISK',
    priority: 'MEDIUM',
  });

  const clients = clientsData ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId || !formData.title || !formData.type) {
      showToast({
        message: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createCTA.mutateAsync(formData as CreateCTAInput);
      showToast({
        message: 'CTA created successfully',
        variant: 'success',
      });
      navigate('/customer-success');
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : 'Failed to create CTA',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/customer-success')}
              className="-ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span>New CTA</span>
          </div>
        }
        description="Create a new Call-to-Action to track customer success tasks"
      />

      <div className="container-padding py-6">
        <Card className="p-6 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Selection */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Client <span className="text-danger-500">*</span>
            </label>
            <Select
              value={formData.clientId?.toString() ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  clientId: value === '' ? undefined : parseInt(value, 10),
                }));
              }}
              disabled={clientsLoading}
            >
              <option value="">Select a client...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Title <span className="text-danger-500">*</span>
            </label>
            <Input
              value={formData.title ?? ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Enter CTA title..."
            />
          </div>

          {/* Type and Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Type <span className="text-danger-500">*</span>
              </label>
              <Select
                value={formData.type ?? 'RISK'}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    type: e.target.value as CreateCTAInput['type'],
                  }))
                }
              >
                {CTA_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Priority
              </label>
              <Select
                value={formData.priority ?? 'MEDIUM'}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    priority: e.target.value as CreateCTAInput['priority'],
                  }))
                }
              >
                {CTA_PRIORITIES.map((priority) => (
                  <option key={priority.value} value={priority.value}>
                    {priority.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Due Date
            </label>
            <Input
              type="date"
              value={formData.dueDate ?? ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, dueDate: e.target.value }))
              }
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description ?? ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Enter CTA description..."
              rows={3}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Reason
            </label>
            <textarea
              value={formData.reason ?? ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, reason: e.target.value }))
              }
              placeholder="Why is this CTA needed?"
              rows={2}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/customer-success')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={createCTA.isPending}
              isLoading={createCTA.isPending}
            >
              Create CTA
            </Button>
          </div>
        </form>
        </Card>
      </div>
    </div>
  );
}

export default CTAFormPage;
