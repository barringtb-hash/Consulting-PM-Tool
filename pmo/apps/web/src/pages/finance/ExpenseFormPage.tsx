/**
 * Expense Form Page
 *
 * Create or edit an expense with validation and category selection.
 */

import { useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Receipt, Loader2 } from 'lucide-react';
import { Card, Button, Input } from '../../ui';
import {
  useExpense,
  useCreateExpense,
  useUpdateExpense,
  useCategories,
  useBudgets,
} from '../../api/hooks/useFinance';
import { useAccounts } from '../../api/hooks/crm';
import { useProjects } from '../../api/hooks/projects';

const expenseFormSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('USD'),
  date: z.string().min(1, 'Date is required'),
  categoryId: z.coerce.number().positive('Category is required'),
  accountId: z.coerce.number().positive().optional().or(z.literal('')),
  projectId: z.coerce.number().positive().optional().or(z.literal('')),
  budgetId: z.coerce.number().positive().optional().or(z.literal('')),
  vendorName: z.string().max(255).optional(),
  invoiceNumber: z.string().max(100).optional(),
  tags: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

type ExpenseFormData = z.infer<typeof expenseFormSchema>;

export default function ExpenseFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = id && id !== 'new';

  const { data: expense, isLoading: expenseLoading } = useExpense(
    isEditing ? parseInt(id) : 0,
  );
  const { data: categoriesData } = useCategories({});
  const { data: accountsData } = useAccounts({});
  const { data: projectsData } = useProjects({});
  const { data: budgetsData } = useBudgets({ status: 'ACTIVE' });

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      description: '',
      amount: 0,
      currency: 'USD',
      date: new Date().toISOString().split('T')[0],
      categoryId: undefined,
      accountId: '',
      projectId: '',
      budgetId: '',
      vendorName: '',
      invoiceNumber: '',
      tags: '',
      notes: '',
    },
  });

  const selectedAccountId = watch('accountId');

  // Filter projects by selected account
  const filteredProjects = projectsData?.projects.filter(
    (p) => !selectedAccountId || p.accountId === Number(selectedAccountId),
  );

  // Filter budgets by selected account
  const filteredBudgets = budgetsData?.budgets.filter(
    (b) =>
      !selectedAccountId ||
      b.accountId === Number(selectedAccountId) ||
      !b.accountId,
  );

  useEffect(() => {
    if (expense && isEditing) {
      reset({
        description: expense.description,
        amount: expense.amount,
        currency: expense.currency,
        date: expense.date.split('T')[0],
        categoryId: expense.categoryId,
        accountId: expense.accountId || '',
        projectId: expense.projectId || '',
        budgetId: expense.budgetId || '',
        vendorName: expense.vendorName || '',
        invoiceNumber: expense.invoiceNumber || '',
        tags: expense.tags?.join(', ') || '',
        notes: expense.notes || '',
      });
    }
  }, [expense, isEditing, reset]);

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      const payload = {
        ...data,
        accountId: data.accountId ? Number(data.accountId) : undefined,
        projectId: data.projectId ? Number(data.projectId) : undefined,
        budgetId: data.budgetId ? Number(data.budgetId) : undefined,
        tags: data.tags
          ? data.tags
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        date: new Date(data.date).toISOString(),
      };

      if (isEditing) {
        await updateExpense.mutateAsync({ id: parseInt(id), input: payload });
      } else {
        await createExpense.mutateAsync(payload);
      }
      navigate('/finance/expenses');
    } catch (error) {
      console.error('Failed to save expense:', error);
    }
  };

  if (isEditing && expenseLoading) {
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
        <Button variant="secondary" as={Link} to="/finance/expenses">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Edit Expense' : 'New Expense'}
          </h1>
          <p className="text-gray-500">
            {isEditing
              ? 'Update expense details'
              : 'Create a new expense record'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Expense Details
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <Input
                {...register('description')}
                placeholder="Enter expense description"
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.description.message}
                </p>
              )}
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
                  Date <span className="text-red-500">*</span>
                </label>
                <Input
                  {...register('date')}
                  type="date"
                  className={errors.date ? 'border-red-500' : ''}
                />
                {errors.date && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.date.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.categoryId ? 'border-red-500' : ''
                    }`}
                  >
                    <option value="">Select a category</option>
                    {categoriesData?.categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.categoryId && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.categoryId.message}
                </p>
              )}
            </div>
          </div>

          {/* Associations */}
          <div className="space-y-4 pt-4 border-t">
            <h2 className="text-lg font-semibold text-gray-900">
              Associations (Optional)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      {accountsData?.accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project
                </label>
                <Controller
                  name="projectId"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No project</option>
                      {filteredProjects?.map((proj) => (
                        <option key={proj.id} value={proj.id}>
                          {proj.name}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Budget
              </label>
              <Controller
                name="budgetId"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No budget</option>
                    {filteredBudgets?.map((budget) => (
                      <option key={budget.id} value={budget.id}>
                        {budget.name} ({budget.currency}{' '}
                        {new Intl.NumberFormat().format(
                          budget.amount - budget.spent,
                        )}{' '}
                        remaining)
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
          </div>

          {/* Vendor Info */}
          <div className="space-y-4 pt-4 border-t">
            <h2 className="text-lg font-semibold text-gray-900">
              Vendor Information (Optional)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor Name
                </label>
                <Input
                  {...register('vendorName')}
                  placeholder="Enter vendor name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Number
                </label>
                <Input
                  {...register('invoiceNumber')}
                  placeholder="Enter invoice number"
                />
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="space-y-4 pt-4 border-t">
            <h2 className="text-lg font-semibold text-gray-900">
              Additional Information
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (comma-separated)
              </label>
              <Input
                {...register('tags')}
                placeholder="e.g., software, monthly, subscription"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                placeholder="Add any additional notes..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" as={Link} to="/finance/expenses">
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
                  {isEditing ? 'Update Expense' : 'Create Expense'}
                </>
              )}
            </Button>
          </div>
        </Card>
      </form>
    </div>
  );
}
