import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import {
  formatStatusLabel,
  STATUS_BADGE_VARIANTS,
  TASK_STATUSES,
  type Task,
  type TaskStatus,
} from '../../api/tasks';

interface SubtaskListProps {
  subtasks: Task[];
  onAddSubtask: (title: string, status: TaskStatus) => Promise<void>;
  onUpdateSubtaskStatus: (
    subtaskId: number,
    status: TaskStatus,
  ) => Promise<void>;
  isAddingSubtask?: boolean;
}

export function SubtaskList({
  subtasks,
  onAddSubtask,
  onUpdateSubtaskStatus,
  isAddingSubtask = false,
}: SubtaskListProps): JSX.Element {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskStatus, setNewSubtaskStatus] =
    useState<TaskStatus>('BACKLOG');
  const [isInputVisible, setIsInputVisible] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set());

  const completedCount = subtasks.filter((st) => st.status === 'DONE').length;
  const totalCount = subtasks.length;

  const handleAddSubtask = async (): Promise<void> => {
    if (!newSubtaskTitle.trim()) return;

    await onAddSubtask(newSubtaskTitle.trim(), newSubtaskStatus);
    setNewSubtaskTitle('');
    setNewSubtaskStatus('BACKLOG');
    setIsInputVisible(false);
  };

  const handleStatusChange = async (
    subtaskId: number,
    newStatus: TaskStatus,
  ): Promise<void> => {
    setUpdatingIds((prev) => new Set(prev).add(subtaskId));
    try {
      await onUpdateSubtaskStatus(subtaskId, newStatus);
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(subtaskId);
        return next;
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubtask();
    } else if (e.key === 'Escape') {
      setNewSubtaskTitle('');
      setNewSubtaskStatus('BACKLOG');
      setIsInputVisible(false);
    }
  };

  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBgColor = (status: TaskStatus): string => {
    const variant = STATUS_BADGE_VARIANTS[status];
    switch (variant) {
      case 'neutral':
        return 'bg-neutral-100 text-neutral-700 border-neutral-300';
      case 'primary':
        return 'bg-primary-100 text-primary-700 border-primary-300';
      case 'danger':
        return 'bg-danger-100 text-danger-700 border-danger-300';
      case 'success':
        return 'bg-success-100 text-success-700 border-success-300';
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-300';
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Subtasks
          </h3>
          {totalCount > 0 && (
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              ({completedCount}/{totalCount} completed)
            </span>
          )}
        </div>
        {!isInputVisible && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsInputVisible(true)}
            className="flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Subtask
          </Button>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5">
          <div
            className="bg-success-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      )}

      {/* Subtask list */}
      {subtasks.length > 0 ? (
        <ul className="space-y-2">
          {subtasks.map((subtask) => {
            const isDone = subtask.status === 'DONE';
            const isUpdating = updatingIds.has(subtask.id);

            return (
              <li
                key={subtask.id}
                className={`flex items-start gap-3 p-4 rounded-lg border shadow-sm transition-colors ${
                  isDone
                    ? 'bg-neutral-50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-600'
                    : 'bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 hover:border-neutral-300 dark:hover:border-neutral-500 hover:shadow-md'
                }`}
              >
                <div className="flex-1 min-w-0 space-y-2">
                  <p
                    className={`text-sm font-medium ${
                      isDone
                        ? 'text-neutral-500 dark:text-neutral-400 line-through'
                        : 'text-neutral-900 dark:text-neutral-100'
                    }`}
                  >
                    {subtask.title}
                  </p>
                  {subtask.description && (
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                      {subtask.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={subtask.status}
                      onChange={(e) =>
                        handleStatusChange(
                          subtask.id,
                          e.target.value as TaskStatus,
                        )
                      }
                      disabled={isUpdating}
                      className={`text-xs font-medium px-2 py-1 rounded border cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 ${getStatusBgColor(subtask.status)} ${isUpdating ? 'opacity-50 cursor-wait' : ''}`}
                    >
                      {TASK_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {formatStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                    {subtask.dueDate && (
                      <span className="text-xs text-neutral-600 dark:text-neutral-400">
                        {formatDate(subtask.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        !isInputVisible && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 italic py-2">
            No subtasks yet. Click &quot;Add Subtask&quot; to create one.
          </p>
        )
      )}

      {/* Add subtask input */}
      {isInputVisible && (
        <div className="space-y-2 mt-2">
          <div className="flex items-center gap-2">
            <Input
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter subtask title..."
              disabled={isAddingSubtask}
              autoFocus
              className="flex-1"
            />
            <select
              value={newSubtaskStatus}
              onChange={(e) =>
                setNewSubtaskStatus(e.target.value as TaskStatus)
              }
              disabled={isAddingSubtask}
              className={`text-xs font-medium px-2 py-2 rounded border cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 ${getStatusBgColor(newSubtaskStatus)}`}
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
              variant="primary"
              size="sm"
              onClick={handleAddSubtask}
              disabled={!newSubtaskTitle.trim() || isAddingSubtask}
              isLoading={isAddingSubtask}
            >
              Add
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setNewSubtaskTitle('');
                setNewSubtaskStatus('BACKLOG');
                setIsInputVisible(false);
              }}
              disabled={isAddingSubtask}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
