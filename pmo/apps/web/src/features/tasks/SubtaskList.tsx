import React, { useState, useRef, useEffect } from 'react';
import { Plus, Check, UserPlus, List } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/Textarea';
import { Badge } from '../../ui/Badge';
import {
  formatStatusLabel,
  STATUS_BADGE_VARIANTS,
  TASK_STATUSES,
  type Task,
  type TaskStatus,
} from '../../api/tasks';
import type { ProjectMember } from '../../api/projects';

interface SubtaskListProps {
  subtasks: Task[];
  projectMembers?: ProjectMember[];
  onAddSubtask: (
    title: string,
    status: TaskStatus,
    assigneeIds?: number[],
  ) => Promise<void>;
  onAddBulkSubtasks?: (
    subtasks: Array<{
      title: string;
      status: TaskStatus;
      assigneeIds?: number[];
    }>,
  ) => Promise<void>;
  onUpdateSubtaskStatus: (
    subtaskId: number,
    status: TaskStatus,
  ) => Promise<void>;
  isAddingSubtask?: boolean;
}

export function SubtaskList({
  subtasks,
  projectMembers = [],
  onAddSubtask,
  onAddBulkSubtasks,
  onUpdateSubtaskStatus,
  isAddingSubtask = false,
}: SubtaskListProps): JSX.Element {
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskStatus, setNewSubtaskStatus] =
    useState<TaskStatus>('NOT_STARTED');
  const [selectedAssignees, setSelectedAssignees] = useState<number[]>([]);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [isInputVisible, setIsInputVisible] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [updatingIds, setUpdatingIds] = useState<Set<number>>(new Set());
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside handler for assignee dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        assigneeDropdownRef.current &&
        !assigneeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowAssigneeDropdown(false);
      }
    };

    if (showAssigneeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAssigneeDropdown]);

  const toggleAssignee = (userId: number): void => {
    setSelectedAssignees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  // Defensive: ensure subtasks is always an array
  const safeSubtasks = subtasks ?? [];
  const completedCount = safeSubtasks.filter(
    (st) => st.status === 'DONE',
  ).length;
  const totalCount = safeSubtasks.length;

  const handleAddSubtask = async (): Promise<void> => {
    if (!newSubtaskTitle.trim()) return;

    await onAddSubtask(
      newSubtaskTitle.trim(),
      newSubtaskStatus,
      selectedAssignees.length > 0 ? selectedAssignees : undefined,
    );
    setNewSubtaskTitle('');
    setNewSubtaskStatus('NOT_STARTED');
    setSelectedAssignees([]);
    setShowAssigneeDropdown(false);
    setIsInputVisible(false);
  };

  const handleBulkAdd = async (): Promise<void> => {
    if (!bulkText.trim()) return;

    const lines = bulkText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) return;

    if (onAddBulkSubtasks) {
      const subtasksToCreate = lines.map((title) => ({
        title,
        status: newSubtaskStatus,
        assigneeIds:
          selectedAssignees.length > 0 ? selectedAssignees : undefined,
      }));
      await onAddBulkSubtasks(subtasksToCreate);
    } else {
      // Fallback: create one by one
      for (const title of lines) {
        await onAddSubtask(
          title,
          newSubtaskStatus,
          selectedAssignees.length > 0 ? selectedAssignees : undefined,
        );
      }
    }

    setBulkText('');
    setNewSubtaskStatus('NOT_STARTED');
    setSelectedAssignees([]);
    setShowAssigneeDropdown(false);
    setIsBulkMode(false);
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
    if (e.key === 'Enter' && !isBulkMode) {
      e.preventDefault();
      handleAddSubtask();
    } else if (e.key === 'Escape') {
      resetForm();
    }
  };

  const resetForm = (): void => {
    setNewSubtaskTitle('');
    setBulkText('');
    setNewSubtaskStatus('NOT_STARTED');
    setSelectedAssignees([]);
    setShowAssigneeDropdown(false);
    setIsBulkMode(false);
    setIsInputVisible(false);
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
        return 'bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-neutral-700 dark:text-neutral-200 dark:border-neutral-600';
      case 'primary':
        return 'bg-primary-100 text-primary-700 border-primary-300 dark:bg-primary-900 dark:text-primary-200 dark:border-primary-700';
      case 'danger':
        return 'bg-danger-100 text-danger-700 border-danger-300 dark:bg-danger-900 dark:text-danger-200 dark:border-danger-700';
      case 'success':
        return 'bg-success-100 text-success-700 border-success-300 dark:bg-success-900 dark:text-success-200 dark:border-success-700';
      default:
        return 'bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-neutral-700 dark:text-neutral-200 dark:border-neutral-600';
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
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsBulkMode(true);
                setIsInputVisible(true);
              }}
              className="flex items-center gap-1"
              title="Add multiple subtasks at once"
            >
              <List className="h-4 w-4" />
              Bulk Add
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsBulkMode(false);
                setIsInputVisible(true);
              }}
              className="flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Subtask
            </Button>
          </div>
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
      {safeSubtasks.length > 0 ? (
        <ul className="space-y-2">
          {safeSubtasks.map((subtask) => {
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
                      aria-label="Subtask status"
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
                    {subtask.assignees && subtask.assignees.length > 0 && (
                      <div className="flex items-center gap-1">
                        {subtask.assignees.map((assignee) => (
                          <Badge
                            key={assignee.userId}
                            variant="primary"
                            size="sm"
                          >
                            {assignee.user.name}
                          </Badge>
                        ))}
                      </div>
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
        <div className="space-y-3 mt-2 p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
          {isBulkMode ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Add Multiple Subtasks
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  One subtask per line
                </span>
              </div>
              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Enter subtask titles (one per line)..."
                disabled={isAddingSubtask}
                rows={4}
                autoFocus
              />
            </>
          ) : (
            <Input
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter subtask title..."
              disabled={isAddingSubtask}
              autoFocus
            />
          )}

          <div className="flex items-center gap-3">
            <select
              value={newSubtaskStatus}
              onChange={(e) =>
                setNewSubtaskStatus(e.target.value as TaskStatus)
              }
              disabled={isAddingSubtask}
              aria-label="Initial status for new subtask"
              className={`text-sm font-medium px-3 py-2 min-w-[140px] rounded-lg border cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 ${getStatusBgColor(newSubtaskStatus)}`}
            >
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {formatStatusLabel(status)}
                </option>
              ))}
            </select>

            {/* Assignee selector */}
            {projectMembers.length > 0 && (
              <div ref={assigneeDropdownRef} className="relative flex-1">
                <button
                  type="button"
                  onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                  disabled={isAddingSubtask}
                  className="w-full flex items-center justify-between px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-sm text-left focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <span className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-neutral-400" />
                    {selectedAssignees.length === 0
                      ? 'Assign to...'
                      : `${selectedAssignees.length} assigned`}
                  </span>
                </button>
                {showAssigneeDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {projectMembers.map((member) => (
                      <button
                        key={member.userId}
                        type="button"
                        onClick={() => toggleAssignee(member.userId)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-left"
                      >
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center ${
                            selectedAssignees.includes(member.userId)
                              ? 'bg-primary-500 border-primary-500 text-white'
                              : 'border-neutral-300 dark:border-neutral-600'
                          }`}
                        >
                          {selectedAssignees.includes(member.userId) && (
                            <Check className="h-3 w-3" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-neutral-900 dark:text-neutral-100 truncate">
                              {member.user.name}
                            </span>
                            {member.role === 'OWNER' && (
                              <span className="px-1.5 py-0.5 text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded">
                                Owner
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected assignees display */}
          {selectedAssignees.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedAssignees.map((userId) => {
                const member = projectMembers.find((m) => m.userId === userId);
                return member ? (
                  <Badge key={userId} variant="primary" size="sm">
                    {member.user.name}
                  </Badge>
                ) : null;
              })}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={isBulkMode ? handleBulkAdd : handleAddSubtask}
              disabled={
                isBulkMode
                  ? !bulkText.trim() || isAddingSubtask
                  : !newSubtaskTitle.trim() || isAddingSubtask
              }
              isLoading={isAddingSubtask}
            >
              {isBulkMode ? 'Add All' : 'Add'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={resetForm}
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
