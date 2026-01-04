/**
 * Issue New Page
 *
 * Create a new issue with title, description, type, priority, and labels.
 */

import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Loader2, Bug, AlertCircle } from 'lucide-react';
import { Card, Button, Input, PageHeader } from '../../ui';
import { useCreateIssue, useLabels } from '../../api/hooks/useBugTracking';
import type { IssueType, IssuePriority } from '../../api/bug-tracking';
import { useToast } from '../../ui/Toast';

const issueFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().optional(),
  type: z.enum(['BUG', 'ISSUE', 'FEATURE_REQUEST', 'IMPROVEMENT', 'TASK']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  labelIds: z.array(z.number()).optional(),
});

type IssueFormData = z.infer<typeof issueFormSchema>;

const TYPE_OPTIONS: { value: IssueType; label: string }[] = [
  { value: 'BUG', label: 'Bug' },
  { value: 'ISSUE', label: 'Issue' },
  { value: 'FEATURE_REQUEST', label: 'Feature Request' },
  { value: 'IMPROVEMENT', label: 'Improvement' },
  { value: 'TASK', label: 'Task' },
];

const PRIORITY_OPTIONS: { value: IssuePriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

export default function IssueNewPage() {
  const navigate = useNavigate();
  const { data: labels } = useLabels();
  const createIssue = useCreateIssue();
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<IssueFormData>({
    resolver: zodResolver(issueFormSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'BUG',
      priority: 'MEDIUM',
      labelIds: [],
    },
  });

  const selectedLabelIds = watch('labelIds') || [];

  const toggleLabel = (labelId: number) => {
    const current = selectedLabelIds;
    if (current.includes(labelId)) {
      setValue(
        'labelIds',
        current.filter((id) => id !== labelId),
      );
    } else {
      setValue('labelIds', [...current, labelId]);
    }
  };

  const onSubmit = async (data: IssueFormData) => {
    try {
      const result = await createIssue.mutateAsync({
        title: data.title,
        description: data.description || undefined,
        type: data.type,
        priority: data.priority,
        labelIds: data.labelIds?.length ? data.labelIds : undefined,
      });
      showToast('Issue created successfully', 'success');
      navigate(`/bug-tracking/${result.id}`);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to create issue',
        'error',
      );
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="New Issue"
        icon={Bug}
        description="Create a new bug report or feature request"
        breadcrumbs={[
          { label: 'Bug Tracking', href: '/bug-tracking' },
          { label: 'Issues', href: '/bug-tracking' },
          { label: 'New Issue' },
        ]}
        action={
          <Button variant="secondary" onClick={() => navigate('/bug-tracking')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        }
      />

      <div className="page-content">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl">
          <Card className="p-6">
            <div className="space-y-6">
              {/* Title */}
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  Title <span className="text-red-500">*</span>
                </label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="Brief description of the issue"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.title.message}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  {...register('description')}
                  rows={6}
                  placeholder="Detailed description, steps to reproduce, expected vs actual behavior..."
                  className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Type and Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="type"
                    className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                  >
                    Type
                  </label>
                  <select
                    id="type"
                    {...register('type')}
                    className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="priority"
                    className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
                  >
                    Priority
                  </label>
                  <select
                    id="priority"
                    {...register('priority')}
                    className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {PRIORITY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Labels */}
              {labels && labels.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Labels
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {labels.map((label) => (
                      <button
                        key={label.id}
                        type="button"
                        onClick={() => toggleLabel(label.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          selectedLabelIds.includes(label.id)
                            ? 'ring-2 ring-offset-2 ring-primary-500'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: label.color + '20',
                          color: label.color,
                          borderColor: label.color,
                        }}
                      >
                        {label.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => navigate('/bug-tracking')}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Issue
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </form>
      </div>
    </div>
  );
}
