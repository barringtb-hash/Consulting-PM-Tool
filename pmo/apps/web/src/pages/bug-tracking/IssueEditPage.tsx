/**
 * Issue Edit Page
 *
 * Edit an existing issue's core fields (title, description, type, priority, labels).
 */

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Card, Button, Input } from '../../ui';
import { PageHeader } from '../../ui/PageHeader';
import {
  useIssue,
  useUpdateIssue,
  useLabels,
  useAssignableUsers,
} from '../../api/hooks/useBugTracking';
import type {
  IssueType,
  IssuePriority,
  IssueStatus,
} from '../../api/bug-tracking';

const issueFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().optional(),
  type: z.enum(['BUG', 'ISSUE', 'FEATURE_REQUEST', 'IMPROVEMENT', 'TASK']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  status: z.enum([
    'OPEN',
    'TRIAGING',
    'IN_PROGRESS',
    'IN_REVIEW',
    'RESOLVED',
    'CLOSED',
    'WONT_FIX',
  ]),
  assignedToId: z.number().nullable().optional(),
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

const STATUS_OPTIONS: { value: IssueStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'TRIAGING', label: 'Triaging' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'IN_REVIEW', label: 'In Review' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'WONT_FIX', label: "Won't Fix" },
];

export default function IssueEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const issueId = Number(id);

  const { data: issue, isLoading: issueLoading } = useIssue(issueId);
  const { data: labels } = useLabels();
  const { data: users } = useAssignableUsers();
  const updateIssue = useUpdateIssue();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<IssueFormData>({
    resolver: zodResolver(issueFormSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'BUG',
      priority: 'MEDIUM',
      status: 'OPEN',
      assignedToId: null,
      labelIds: [],
    },
  });

  const selectedLabelIds = watch('labelIds') || [];

  // Populate form when issue data loads
  useEffect(() => {
    if (issue) {
      reset({
        title: issue.title,
        description: issue.description || '',
        type: issue.type,
        priority: issue.priority,
        status: issue.status,
        assignedToId: issue.assignedTo?.id ?? null,
        labelIds: issue.labels?.map((l) => l.id) || [],
      });
    }
  }, [issue, reset]);

  const onSubmit = async (data: IssueFormData) => {
    try {
      await updateIssue.mutateAsync({
        id: issueId,
        input: {
          title: data.title,
          description: data.description,
          type: data.type as IssueType,
          priority: data.priority as IssuePriority,
          status: data.status as IssueStatus,
          assignedToId: data.assignedToId,
          labelIds: data.labelIds,
        },
      });
      navigate(`/bug-tracking/${issueId}`);
    } catch (error) {
      console.error('Failed to update issue:', error);
    }
  };

  const handleLabelToggle = (labelId: number) => {
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

  if (issueLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      </div>
    );
  }

  if (!issue) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-gray-500">Issue not found</div>
          <Button variant="outline" onClick={() => navigate('/bug-tracking')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Issues
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title={
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/bug-tracking/${issueId}`)}
              className="-ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span>Edit Issue #{issue.id}</span>
          </div>
        }
        description="Update issue details"
      />

      <div className="container-padding py-6">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-6">
          {/* Title */}
          <Card className="p-6">
            <h2 className="text-lg font-medium mb-4 dark:text-white">
              Basic Information
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Title <span className="text-red-500">*</span>
                </label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="Brief summary of the issue"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-500">
                    {errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  {...register('description')}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-neutral-800 dark:text-white"
                  placeholder="Detailed description of the issue..."
                />
              </div>
            </div>
          </Card>

          {/* Type, Priority, Status */}
          <Card className="p-6">
            <h2 className="text-lg font-medium mb-4 dark:text-white">
              Classification
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="type"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Type
                </label>
                <select
                  id="type"
                  {...register('type')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-neutral-800 dark:text-white"
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
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Priority
                </label>
                <select
                  id="priority"
                  {...register('priority')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-neutral-800 dark:text-white"
                >
                  {PRIORITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Status
                </label>
                <select
                  id="status"
                  {...register('status')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-neutral-800 dark:text-white"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Assignee */}
          <Card className="p-6">
            <h2 className="text-lg font-medium mb-4 dark:text-white">
              Assignment
            </h2>
            <div>
              <label
                htmlFor="assignedToId"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Assigned To
              </label>
              <select
                id="assignedToId"
                {...register('assignedToId', {
                  setValueAs: (v) => (v === '' ? null : Number(v)),
                })}
                className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-neutral-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-neutral-800 dark:text-white"
              >
                <option value="">Unassigned</option>
                {users?.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          </Card>

          {/* Labels */}
          {labels && labels.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-medium mb-4 dark:text-white">
                Labels
              </h2>
              <div className="flex flex-wrap gap-2">
                {labels.map((label) => (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => handleLabelToggle(label.id)}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium transition-all ${
                      selectedLabelIds.includes(label.id)
                        ? 'ring-2 ring-offset-2 ring-blue-500'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: label.color + '20',
                      color: label.color,
                    }}
                  >
                    {label.name}
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Submit */}
          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/bug-tracking/${issueId}`)}
            >
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
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
