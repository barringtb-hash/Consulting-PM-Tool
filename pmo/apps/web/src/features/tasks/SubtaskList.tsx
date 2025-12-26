import React, { useState } from 'react';
import { Plus, Square, CheckSquare } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
import type { Task } from '../../api/tasks';

interface SubtaskListProps {
  subtasks: Task[];
  onAddSubtask: (title: string) => Promise<void>;
  onToggleSubtask: (subtaskId: number) => Promise<void>;
  isAddingSubtask?: boolean;
}

const priorityColors: Record<string, 'danger' | 'warning' | 'neutral'> = {
  P0: 'danger',
  P1: 'warning',
  P2: 'neutral',
};

const statusColors: Record<
  string,
  'neutral' | 'primary' | 'danger' | 'success'
> = {
  BACKLOG: 'neutral',
  IN_PROGRESS: 'primary',
  BLOCKED: 'danger',
  DONE: 'success',
};

function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function SubtaskList({
  subtasks,
  onAddSubtask,
  onToggleSubtask,
  isAddingSubtask = false,
}: SubtaskListProps): JSX.Element {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isInputVisible, setIsInputVisible] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

  const completedCount = subtasks.filter((st) => st.status === 'DONE').length;
  const totalCount = subtasks.length;

  const handleAddSubtask = async (): Promise<void> => {
    if (!newSubtaskTitle.trim()) return;

    await onAddSubtask(newSubtaskTitle.trim());
    setNewSubtaskTitle('');
    setIsInputVisible(false);
  };

  const handleToggle = async (subtaskId: number): Promise<void> => {
    setTogglingIds((prev) => new Set(prev).add(subtaskId));
    try {
      await onToggleSubtask(subtaskId);
    } finally {
      setTogglingIds((prev) => {
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

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-neutral-700">Subtasks</h3>
          {totalCount > 0 && (
            <span className="text-xs text-neutral-500">
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
        <div className="w-full bg-neutral-200 rounded-full h-1.5">
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
            const isToggling = togglingIds.has(subtask.id);

            return (
              <li
                key={subtask.id}
                className={`flex items-start gap-3 p-4 rounded-lg border shadow-sm transition-colors ${
                  isDone
                    ? 'bg-neutral-50 border-neutral-200'
                    : 'bg-white border-neutral-200 hover:border-neutral-300 hover:shadow-md'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleToggle(subtask.id)}
                  disabled={isToggling}
                  className={`flex-shrink-0 mt-0.5 transition-colors ${
                    isToggling
                      ? 'opacity-50'
                      : isDone
                        ? 'text-success-600 hover:text-success-700'
                        : 'text-neutral-400 hover:text-neutral-600'
                  }`}
                  aria-label={
                    isDone ? 'Mark as incomplete' : 'Mark as complete'
                  }
                >
                  {isDone ? (
                    <CheckSquare className="h-5 w-5" />
                  ) : (
                    <Square className="h-5 w-5" />
                  )}
                </button>

                <div className="flex-1 min-w-0 space-y-2">
                  <p
                    className={`text-sm font-medium ${
                      isDone
                        ? 'text-neutral-500 line-through'
                        : 'text-neutral-900'
                    }`}
                  >
                    {subtask.title}
                  </p>
                  {subtask.description && (
                    <p className="text-xs text-neutral-600 line-clamp-2">
                      {subtask.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      variant={statusColors[subtask.status] ?? 'neutral'}
                      size="sm"
                    >
                      {formatStatusLabel(subtask.status)}
                    </Badge>
                    {subtask.priority && (
                      <Badge
                        variant={priorityColors[subtask.priority] ?? 'neutral'}
                        size="sm"
                      >
                        {subtask.priority}
                      </Badge>
                    )}
                    {subtask.dueDate && (
                      <span className="text-xs text-neutral-600">
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
          <p className="text-sm text-neutral-500 italic py-2">
            No subtasks yet. Click &quot;Add Subtask&quot; to create one.
          </p>
        )
      )}

      {/* Add subtask input */}
      {isInputVisible && (
        <div className="flex items-center gap-2 mt-2">
          <Input
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter subtask title..."
            disabled={isAddingSubtask}
            autoFocus
            className="flex-1"
          />
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
              setIsInputVisible(false);
            }}
            disabled={isAddingSubtask}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
