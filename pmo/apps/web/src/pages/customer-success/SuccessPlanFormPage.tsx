/**
 * Success Plan Form Page
 *
 * Form for creating a new Success Plan in the Customer Success module.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { PageHeader } from '../../ui/PageHeader';
import { useToast } from '../../ui/Toast';
import { useCreateSuccessPlan } from '../../api/hooks/customer-success';
import { useClients } from '../../api/hooks/clients';
import { Select } from '../../ui/Select';

interface FormData {
  clientId?: number;
  name: string;
  description: string;
  startDate: string;
  targetDate: string;
  isCustomerVisible: boolean;
}

function SuccessPlanFormPage(): JSX.Element {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const createSuccessPlan = useCreateSuccessPlan();
  const { data: clientsData, isLoading: clientsLoading } = useClients();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    startDate: '',
    targetDate: '',
    isCustomerVisible: false,
  });

  const clients = clientsData ?? [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId || !formData.name) {
      showToast({
        message: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (formData.startDate && formData.targetDate) {
      const start = new Date(formData.startDate);
      const target = new Date(formData.targetDate);
      if (target < start) {
        showToast({
          message: 'Target date cannot be before start date',
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      await createSuccessPlan.mutateAsync({
        clientId: formData.clientId,
        name: formData.name,
        description: formData.description || undefined,
        startDate: formData.startDate || undefined,
        targetDate: formData.targetDate || undefined,
        isCustomerVisible: formData.isCustomerVisible,
      });
      showToast({
        message: 'Success Plan created successfully',
        variant: 'success',
      });
      navigate('/customer-success');
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
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/customer-success')}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <PageHeader
        title="New Success Plan"
        description="Create a success plan to track customer goals and objectives"
      />

      <Card className="p-6 mt-6">
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

          {/* Plan Name */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Plan Name <span className="text-danger-500">*</span>
            </label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="Enter success plan name..."
            />
          </div>

          {/* Start and Target Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Start Date
              </label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    startDate: e.target.value,
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
                value={formData.targetDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    targetDate: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Describe the goals and scope of this success plan..."
              rows={4}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Customer Visibility */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isCustomerVisible"
              checked={formData.isCustomerVisible}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  isCustomerVisible: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-600 text-primary-600 focus:ring-primary-500"
            />
            <label
              htmlFor="isCustomerVisible"
              className="text-sm text-neutral-700 dark:text-neutral-300"
            >
              Make this plan visible to the customer
            </label>
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
              disabled={createSuccessPlan.isPending}
              isLoading={createSuccessPlan.isPending}
            >
              Create Success Plan
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default SuccessPlanFormPage;
