import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Textarea } from '../../ui/Textarea';
import { Button } from '../../ui/Button';
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  formatStatusLabel,
  type TaskPayload,
  type TaskStatus,
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
  onSubmit: (values: TaskPayload) => Promise<{ id: number } | void>;
  onCreateSubtasks?: (
    parentTaskId: number,
    subtasks: Array<{ title: string; status: TaskStatus }>,
  ) => Promise<{ failedCount: number }>;
  onCancel: () => void;
  onSuccess?: () => void;
  isSubmitting?: boolean;
  error?: string | null;
  subtaskError?: string | null;
}

const initialFormValues: TaskFormValues = {
  title: '',
  description: '',
  status: 'NOT_STARTED',
  priority: 'P1',
  dueDate: '',
  milestoneId: '',
};

interface PendingSubtask {
  id: string;
  title: string;
  status: TaskStatus;
}

export function TaskFormModal({
  isOpen,
  projectId,
  milestones,
  onSubmit,
  onCreateSubtasks,
  onCancel,
  onSuccess,
  isSubmitting = false,
  error,
  subtaskError,
}: TaskFormModalProps): JSX.Element | null {
  const [values, setValues] = useState<TaskFormValues>(initialFormValues);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});
  const [pendingSubtasks, setPendingSubtasks] = useState<PendingSubtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskStatus, setNewSubtaskStatus] =
    useState<TaskStatus>('NOT_STARTED');

  useEffect(() => {
    if (isOpen) {
      setValues(initialFormValues);
      setValidationErrors({});
      setPendingSubtasks([]);
      setNewSubtaskTitle('');
      setNewSubtaskStatus('NOT_STARTED');
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

  const handleAddSubtask = (): void => {
    if (!newSubtaskTitle.trim()) return;

    setPendingSubtasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: newSubtaskTitle.trim(),
        status: newSubtaskStatus,
      },
    ]);
    setNewSubtaskTitle('');
    setNewSubtaskStatus('NOT_STARTED');
  };

  const handleRemoveSubtask = (id: string): void => {
    setPendingSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubtaskStatusChange = (id: string, status: TaskStatus): void => {
    setPendingSubtasks((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s)),
    );
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

    // Create parent task
    const result = await onSubmit(payload);

    // If parent task creation failed, don't proceed
    if (!result?.id) {
      return;
    }

    // Create subtasks if any
    if (pendingSubtasks.length > 0 && onCreateSubtasks) {
      const subtaskPayloads = pendingSubtasks.map((s) => ({
        title: s.title,
        status: s.status,
      }));
      const subtaskResult = await onCreateSubtasks(result.id, subtaskPayloads);

      // If any subtasks failed, keep modal open so user sees the error
      // User can close manually or retry by clicking Create Task again
      if (subtaskResult.failedCount > 0) {
        // Clear all pending subtasks since some were created and we can't
        // reliably track which ones failed with parallel execution
        setPendingSubtasks([]);
        return;
      }
    }

    // All operations successful, close the modal
    onSuccess?.();
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
            <p
              className="text-sm text-danger-800 dark:text-danger-200"
              role="alert"
            >
              {error}
            </p>
          </div>
        )}

        {subtaskError && (
          <div className="p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-lg">
            <p
              className="text-sm text-warning-800 dark:text-warning-200"
              role="alert"
            >
              Task created successfully, but: {subtaskError}
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
                {formatStatusLabel(status)}
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

        {/* Subtasks Section */}
        <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
          <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
            Subtasks
          </h3>

          {/* Pending subtasks list */}
          {pendingSubtasks.length > 0 && (
            <ul className="space-y-2 mb-3">
              {pendingSubtasks.map((subtask) => (
                <li
                  key={subtask.id}
                  className="flex items-center gap-2 p-2 bg-neutral-50 dark:bg-neutral-800 rounded-lg"
                >
                  <span className="flex-1 text-sm text-neutral-900 dark:text-neutral-100 truncate">
                    {subtask.title}
                  </span>
                  <select
                    value={subtask.status}
                    onChange={(e) =>
                      handleSubtaskStatusChange(
                        subtask.id,
                        e.target.value as TaskStatus,
                      )
                    }
                    disabled={isSubmitting}
                    className="text-xs px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200"
                  >
                    {TASK_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {formatStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubtask(subtask.id)}
                    disabled={isSubmitting}
                    className="p-1 text-neutral-400 hover:text-danger-500 dark:text-neutral-500 dark:hover:text-danger-400"
                    aria-label="Remove subtask"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Add subtask input */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <Input
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                  placeholder="Enter subtask title..."
                  disabled={isSubmitting}
                />
              </div>
              <select
                value={newSubtaskStatus}
                onChange={(e) =>
                  setNewSubtaskStatus(e.target.value as TaskStatus)
                }
                disabled={isSubmitting}
                aria-label="Initial status for new subtask"
                className="text-sm font-medium px-3 py-2 min-w-[140px] rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {TASK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {formatStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleAddSubtask}
                disabled={!newSubtaskTitle.trim() || isSubmitting}
              >
                Add
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setNewSubtaskTitle('');
                  setNewSubtaskStatus('NOT_STARTED');
                }}
                disabled={isSubmitting || !newSubtaskTitle.trim()}
              >
                Cancel
              </Button>
            </div>
          </div>
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
