import React, { useEffect, useState } from 'react';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Textarea } from '../../ui/Textarea';
import { Button } from '../../ui/Button';
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  type TaskPayload,
} from '../../api/tasks';
import type { Milestone } from '../../api/milestones';

export interface TaskFormValues {
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  milestoneId: string;
}

interface TaskFormModalProps {
  isOpen: boolean;
  projectId: number;
  milestones: Milestone[];
  onSubmit: (values: TaskPayload) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: string | null;
}

const initialFormValues: TaskFormValues = {
  title: '',
  description: '',
  status: 'BACKLOG',
  priority: 'P1',
  dueDate: '',
  milestoneId: '',
};

export function TaskFormModal({
  isOpen,
  projectId,
  milestones,
  onSubmit,
  onCancel,
  isSubmitting = false,
  error,
}: TaskFormModalProps): JSX.Element | null {
  const [values, setValues] = useState<TaskFormValues>(initialFormValues);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (isOpen) {
      setValues(initialFormValues);
      setValidationErrors({});
    }
  }, [isOpen]);

  const handleChange = (field: keyof TaskFormValues, value: string): void => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear validation error for this field when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!values.title.trim()) {
      errors.title = 'Title is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    const payload: TaskPayload = {
      projectId,
      title: values.title.trim(),
      description: values.description.trim() || undefined,
      status: values.status as TaskPayload['status'],
      priority: values.priority as TaskPayload['priority'],
      dueDate: values.dueDate || undefined,
      milestoneId: values.milestoneId
        ? parseInt(values.milestoneId, 10)
        : undefined,
    };

    await onSubmit(payload);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Create New Task"
      size="medium"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
            <p className="text-sm text-danger-800 dark:text-danger-200" role="alert">
              {error}
            </p>
          </div>
        )}

        <Input
          label="Title"
          value={values.title}
          onChange={(e) => handleChange('title', e.target.value)}
          error={validationErrors.title}
          required
          placeholder="Enter task title"
          disabled={isSubmitting}
        />

        <Textarea
          label="Description"
          value={values.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Enter task description (optional)"
          disabled={isSubmitting}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Status"
            value={values.status}
            onChange={(e) => handleChange('status', e.target.value)}
            disabled={isSubmitting}
          >
            {TASK_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </Select>

          <Select
            label="Priority"
            value={values.priority}
            onChange={(e) => handleChange('priority', e.target.value)}
            disabled={isSubmitting}
          >
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Due Date"
            type="date"
            value={values.dueDate}
            onChange={(e) => handleChange('dueDate', e.target.value)}
            disabled={isSubmitting}
          />

          <Select
            label="Milestone"
            value={values.milestoneId}
            onChange={(e) => handleChange('milestoneId', e.target.value)}
            disabled={isSubmitting}
          >
            <option value="">No milestone</option>
            {milestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            Create Task
          </Button>
        </div>
      </form>
    </Modal>
  );
}
