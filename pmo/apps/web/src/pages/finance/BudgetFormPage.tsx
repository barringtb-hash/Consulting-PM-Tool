/**
 * Budget Form Page
 *
 * Create or edit a budget with validation.
 */

import { useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Wallet, Loader2 } from 'lucide-react';
import { Card, Button, Input } from '../../ui';
import { PageHeader } from '../../ui/PageHeader';
import {
  useBudget,
  useCreateBudget,
  useUpdateBudget,
  useCategories,
} from '../../api/hooks/useFinance';
import { useAccounts } from '../../api/hooks/crm';
import { useProjects } from '../../api/hooks/projects';

const budgetFormSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(255),
    description: z.string().max(1000).optional(),
    amount: z.coerce.number().positive('Amount must be positive'),
    currency: z.string().length(3).default('USD'),
    period: z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'CUSTOM']),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().optional(),
    accountId: z.coerce.number().positive().optional().or(z.literal('')),
    projectId: z.coerce.number().positive().optional().or(z.literal('')),
    categoryId: z.coerce.number().positive().optional().or(z.literal('')),
    alertThresholds: z.string().optional(),
    allowRollover: z.boolean().default(false),
    status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED']).optional(),
  })
  .refine(
    (data) => {
      // End date is required for CUSTOM period
      if (data.period === 'CUSTOM' && !data.endDate) {
        return false;
      }
      // End date must be after start date if provided
      if (data.endDate && data.startDate) {
        return new Date(data.endDate) > new Date(data.startDate);
      }
      return true;
    },
    {
      message:
        'End date is required for custom period and must be after start date',
      path: ['endDate'],
    },
  );

type BudgetFormData = z.infer<typeof budgetFormSchema>;

const PERIOD_OPTIONS = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'CUSTOM', label: 'Custom' },
];

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'CLOSED', label: 'Closed' },
];

export default function BudgetFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = id && id !== 'new';

  const { data: budget, isLoading: budgetLoading } = useBudget(
    isEditing ? parseInt(id) : 0,
  );
  const { data: categoriesData } = useCategories({});
  const { data: accountsData } = useAccounts({});
  const { data: projectsData } = useProjects({});

  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      name: '',
      description: '',
      amount: 0,
      currency: 'USD',
      period: 'MONTHLY',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      accountId: '',
      projectId: '',
      categoryId: '',
      alertThresholds: '50, 75, 90, 100',
      allowRollover: false,
      status: 'DRAFT',
    },
  });

  const selectedAccountId = watch('accountId');
  const selectedPeriod = watch('period');

  // Filter projects by selected account
  const filteredProjects = projectsData?.filter(
    (p) => !selectedAccountId || p.accountId === Number(selectedAccountId),
  );

  useEffect(() => {
    if (budget && isEditing) {
      reset({
        name: budget.name,
        description: budget.description || '',
        amount: budget.amount,
        currency: budget.currency,
        period: budget.period,
        startDate: budget.startDate.split('T')[0],
        endDate: budget.endDate?.split('T')[0] || '',
        accountId: budget.accountId || '',
        projectId: budget.projectId || '',
        categoryId: budget.categoryId || '',
        alertThresholds:
          budget.alertThresholds?.join(', ') || '50, 75, 90, 100',
        allowRollover: budget.allowRollover,
        status: budget.status,
      });
    }
  }, [budget, isEditing, reset]);

  const onSubmit = async (data: BudgetFormData) => {
    try {
      // Convert date strings to ISO format using UTC
      // This completely avoids timezone and DST-related date shifts
      const toISODate = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(Date.UTC(year, month - 1, day));
        return date.toISOString();
      };

      const payload = {
        ...data,
        accountId: data.accountId ? Number(data.accountId) : undefined,
        projectId: data.projectId ? Number(data.projectId) : undefined,
        categoryId: data.categoryId ? Number(data.categoryId) : undefined,
        startDate: toISODate(data.startDate),
        endDate: data.endDate ? toISODate(data.endDate) : undefined,
        alertThresholds: data.alertThresholds
          ? data.alertThresholds
              .split(',')
              .map((t) => parseFloat(t.trim()))
              .filter((n) => !isNaN(n))
          : [50, 75, 90, 100],
      };

      if (isEditing) {
        await updateBudget.mutateAsync({ id: parseInt(id), input: payload });
      } else {
        await createBudget.mutateAsync(payload);
      }
      navigate('/finance/budgets');
    } catch (error) {
      console.error('Failed to save budget:', error);
    }
  };

  if (isEditing && budgetLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title={isEditing ? 'Edit Budget' : 'New Budget'}
        description={
          isEditing ? 'Update budget details' : 'Create a new spending budget'
        }
        icon={Wallet}
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Budgets', href: '/finance/budgets' },
          { label: isEditing ? 'Edit' : 'New' },
        ]}
        action={
          <Button variant="secondary" as={Link} to="/finance/budgets">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        }
      />

      <div className="page-content">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl mx-auto">
          <Card className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Budget Details
              </h2>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register('name')}
                  placeholder="Enter budget name"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={2}
                  placeholder="Describe the purpose of this budget..."
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
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
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Currency
                  </label>
                  <select
                    {...register('currency')}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                    <option value="AUD">AUD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Period <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    name="period"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                      >
                        {PERIOD_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
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
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    End Date{' '}
                    {selectedPeriod === 'CUSTOM' && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <Input {...register('endDate')} type="date" />
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {selectedPeriod !== 'CUSTOM'
                      ? 'Optional - budget will repeat based on period'
                      : 'Required for custom period budgets'}
                  </p>
                </div>
              </div>

              {isEditing && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Status
                  </label>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
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
            <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Scope (Optional)
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Associate this budget with an account, project, or category to
                track spending automatically.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Account
                  </label>
                  <Controller
                    name="accountId"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                      >
                        <option value="">All accounts</option>
                        {accountsData?.data.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Project
                  </label>
                  <Controller
                    name="projectId"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                      >
                        <option value="">All projects</option>
                        {filteredProjects?.map((proj) => (
                          <option key={proj.id} value={proj.id}>
                            {proj.name}
                          </option>
                        ))}
                      </select>
                    )}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Category
                  </label>
                  <Controller
                    name="categoryId"
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                      >
                        <option value="">All categories</option>
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
            </div>

            {/* Alert Settings */}
            <div className="space-y-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Alert Settings
              </h2>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Alert Thresholds (%)
                </label>
                <Input
                  {...register('alertThresholds')}
                  placeholder="50, 75, 90, 100"
                />
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Comma-separated percentages at which to trigger budget alerts
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register('allowRollover')}
                  id="allowRollover"
                  className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-600 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="allowRollover"
                  className="text-sm text-neutral-700 dark:text-neutral-300"
                >
                  Allow rollover of unused budget to the next period
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <Button variant="secondary" as={Link} to="/finance/budgets">
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
                    {isEditing ? 'Update Budget' : 'Create Budget'}
                  </>
                )}
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </div>
  );
}
