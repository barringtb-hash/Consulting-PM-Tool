/**
 * Recurring Cost Form Page
 *
 * Create or edit a recurring cost.
 */

import { useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, RefreshCw, Loader2 } from 'lucide-react';
import { Card, Button, Input } from '../../ui';
import {
  useRecurringCost,
  useCreateRecurringCost,
  useUpdateRecurringCost,
  useCategories,
} from '../../api/hooks/useFinance';
import { useAccounts } from '../../api/hooks/crm';
import { toUTCISOString } from '../../utils/dateUtils';

const recurringCostFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),
  type: z.enum([
    'SUBSCRIPTION',
    'LICENSE',
    'PAYROLL',
    'BENEFITS',
    'CONTRACTOR',
    'RENT',
    'UTILITIES',
    'INSURANCE',
    'MAINTENANCE',
    'OTHER',
  ]),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('USD'),
  frequency: z.enum([
    'WEEKLY',
    'BIWEEKLY',
    'MONTHLY',
    'QUARTERLY',
    'SEMIANNUALLY',
    'YEARLY',
  ]),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  nextDueDate: z.string().min(1, 'Next due date is required'),
  categoryId: z.coerce
    .number()
    .positive('Category is required')
    .or(z.literal('').transform(() => undefined)),
  accountId: z.coerce.number().positive().optional().or(z.literal('')),
  vendorName: z.string().max(255).optional(),
  status: z
    .enum(['DRAFT', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED'])
    .optional(),
});

type RecurringCostFormData = z.infer<typeof recurringCostFormSchema>;

const TYPE_OPTIONS = [
  {
    value: 'SUBSCRIPTION',
    label: 'Subscription',
    description: 'SaaS tools, streaming services',
  },
  {
    value: 'LICENSE',
    label: 'License',
    description: 'Software licenses, certifications',
  },
  {
    value: 'PAYROLL',
    label: 'Payroll',
    description: 'Employee salaries and wages',
  },
  {
    value: 'BENEFITS',
    label: 'Benefits',
    description: 'Health insurance, retirement plans',
  },
  {
    value: 'CONTRACTOR',
    label: 'Contractor',
    description: 'Freelancer and contractor fees',
  },
  {
    value: 'RENT',
    label: 'Rent',
    description: 'Office space, equipment rental',
  },
  {
    value: 'UTILITIES',
    label: 'Utilities',
    description: 'Electricity, water, internet',
  },
  {
    value: 'INSURANCE',
    label: 'Insurance',
    description: 'Business insurance policies',
  },
  {
    value: 'MAINTENANCE',
    label: 'Maintenance',
    description: 'Equipment and facility maintenance',
  },
  { value: 'OTHER', label: 'Other', description: 'Other recurring costs' },
];

const FREQUENCY_OPTIONS = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'BIWEEKLY', label: 'Bi-weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'SEMIANNUALLY', label: 'Semi-annually' },
  { value: 'YEARLY', label: 'Yearly' },
];

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'EXPIRED', label: 'Expired' },
];

export default function RecurringCostFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = id && id !== 'new';

  const { data: recurringCost, isLoading: costLoading } = useRecurringCost(
    isEditing ? parseInt(id) : 0,
  );
  const { data: categoriesData } = useCategories({});
  const { data: accountsData } = useAccounts({});

  const createRecurringCost = useCreateRecurringCost();
  const updateRecurringCost = useUpdateRecurringCost();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RecurringCostFormData>({
    resolver: zodResolver(recurringCostFormSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'SUBSCRIPTION',
      amount: 0,
      currency: 'USD',
      frequency: 'MONTHLY',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      nextDueDate: new Date().toISOString().split('T')[0],
      categoryId: '',
      accountId: '',
      vendorName: '',
      status: 'ACTIVE',
    },
  });

  const startDate = watch('startDate');

  // Auto-set next due date when start date changes
  useEffect(() => {
    if (startDate && !isEditing) {
      setValue('nextDueDate', startDate);
    }
  }, [startDate, setValue, isEditing]);

  useEffect(() => {
    if (recurringCost && isEditing) {
      reset({
        name: recurringCost.name,
        description: recurringCost.description || '',
        type: recurringCost.type,
        amount: recurringCost.amount,
        currency: recurringCost.currency,
        frequency: recurringCost.frequency,
        startDate: recurringCost.startDate.split('T')[0],
        endDate: recurringCost.endDate?.split('T')[0] || '',
        nextDueDate: recurringCost.nextDueDate.split('T')[0],
        categoryId: recurringCost.categoryId || '',
        accountId: recurringCost.accountId || '',
        vendorName: recurringCost.vendorName || '',
        status: recurringCost.status,
      });
    }
  }, [recurringCost, isEditing, reset]);

  const onSubmit = async (data: RecurringCostFormData) => {
    try {
      const payload = {
        name: data.name,
        description: data.description,
        type: data.type,
        amount: data.amount,
        currency: data.currency,
        frequency: data.frequency,
        categoryId: data.categoryId ? Number(data.categoryId) : undefined,
        accountId: data.accountId ? Number(data.accountId) : undefined,
        vendorName: data.vendorName,
        status: data.status,
        startDate: toUTCISOString(data.startDate),
        endDate: data.endDate ? toUTCISOString(data.endDate) : undefined,
        nextDueDate: toUTCISOString(data.nextDueDate),
      };

      if (isEditing) {
        await updateRecurringCost.mutateAsync({
          id: parseInt(id),
          input: payload,
        });
      } else {
        await createRecurringCost.mutateAsync(payload);
      }
      navigate('/finance/recurring-costs');
    } catch (error) {
      console.error('Failed to save recurring cost:', error);
      // Display error to user - the mutation hooks should handle toast notifications
    }
  };

  if (isEditing && costLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="secondary" as={Link} to="/finance/recurring-costs">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100">
            {isEditing ? 'Edit Recurring Cost' : 'New Recurring Cost'}
          </h1>
          <p className="text-gray-500 dark:text-neutral-400">
            {isEditing
              ? 'Update recurring cost details'
              : 'Add a new subscription or recurring expense'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Cost Details
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                {...register('name')}
                placeholder="e.g., GitHub Enterprise, AWS Services"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                {...register('description')}
                rows={2}
                placeholder="Describe what this recurring cost covers..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="text-red-500">*</span>
              </label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => field.onChange(opt.value)}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          field.value === opt.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-medium text-sm">{opt.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {opt.description}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register('amount')}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className={errors.amount ? 'border-red-500' : ''}
                />
                {errors.amount && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.amount.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <select
                  {...register('currency')}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                  <option value="AUD">AUD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequency <span className="text-red-500">*</span>
                </label>
                <Controller
                  name="frequency"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {FREQUENCY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-4 pt-4 border-t">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">Schedule</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register('startDate')}
                  type="date"
                  className={errors.startDate ? 'border-red-500' : ''}
                />
                {errors.startDate && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.startDate.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <Input {...register('endDate')} type="date" />
                <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
                  Leave empty for ongoing costs
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Next Due Date <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register('nextDueDate')}
                  type="date"
                  className={errors.nextDueDate ? 'border-red-500' : ''}
                />
                {errors.nextDueDate && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.nextDueDate.message}
                  </p>
                )}
              </div>
            </div>

            {isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>
            )}
          </div>

          {/* Associations */}
          <div className="space-y-4 pt-4 border-t">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-neutral-100">
              Associations (Optional)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor Name
                </label>
                <Input
                  {...register('vendorName')}
                  placeholder="e.g., Microsoft, Amazon, Salesforce"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <Controller
                  name="categoryId"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No category</option>
                      {categoriesData?.categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account
              </label>
              <Controller
                name="accountId"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No account</option>
                    {accountsData?.data.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" as={Link} to="/finance/recurring-costs">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? 'Update' : 'Create'} Recurring Cost
                </>
              )}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
