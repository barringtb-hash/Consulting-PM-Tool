import React, { useEffect, useState } from 'react';
import { Check, Pencil, Trash2, UserPlus } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Textarea } from '../../ui/Textarea';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { SubtaskList } from './SubtaskList';
import {
  TASK_STATUSES,
  TASK_PRIORITIES,
  formatPriorityLabel,
  type TaskStatus,
  type TaskUpdatePayload,
} from '../../api/tasks';
import type { Milestone } from '../../api/milestones';
import type { ProjectMember } from '../../api/projects';
import {
  useTaskWithSubtasks,
  useUpdateTask,
  useDeleteTask,
  useCreateSubtask,
  useUpdateSubtaskStatus,
} from '../../api/hooks/tasks';

interface TaskDetailModalProps {
  isOpen: boolean;
  taskId: number | null;
  projectId?: number;
  milestones: Milestone[];
  projectMembers?: ProjectMember[];
  onClose: () => void;
  onDeleted?: () => void;
}

interface FormValues {
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  milestoneId: string;
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
  NOT_STARTED: 'neutral',
  BACKLOG: 'neutral',
  IN_PROGRESS: 'primary',
  BLOCKED: 'danger',
  DONE: 'success',
};

export function TaskDetailModal({
  isOpen,
  taskId,
  projectId,
  milestones,
  projectMembers = [],
  onClose,
  onDeleted,
}: TaskDetailModalProps): JSX.Element | null {
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState<FormValues>({
    title: '',
    description: '',
    status: '',
    priority: '',
    dueDate: '',
    milestoneId: '',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState<number[]>([]);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);

  // Queries
  const {
    data: task,
    isLoading,
    error,
  } = useTaskWithSubtasks(taskId ?? undefined);

  // Mutations
  const updateTask = useUpdateTask(projectId);
  const deleteTask = useDeleteTask(projectId);
  const createSubtask = useCreateSubtask(taskId ?? undefined, projectId);
  const updateSubtaskStatusMutation = useUpdateSubtaskStatus(
    taskId ?? undefined,
    projectId,
  );

  // Initialize form when task data loads
  useEffect(() => {
    if (task) {
      setFormValues({
        title: task.title,
        description: task.description ?? '',
        status: task.status,
        priority: task.priority ?? 'P1',
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        milestoneId: task.milestoneId?.toString() ?? '',
      });
      // Initialize assignees from task
      if (task.assignees) {
        setSelectedAssignees(task.assignees.map((a) => a.userId));
      }
    }
  }, [task]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      setShowDeleteConfirm(false);
      setShowAssigneeDropdown(false);
    }
  }, [isOpen]);

  const handleChange = (field: keyof FormValues, value: string): void => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const toggleAssignee = (userId: number): void => {
    setSelectedAssignees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleSave = async (): Promise<void> => {
    if (!taskId) return;

    const payload: TaskUpdatePayload = {
      title: formValues.title.trim(),
      description: formValues.description.trim() || undefined,
      status: formValues.status as TaskUpdatePayload['status'],
      priority: formValues.priority as TaskUpdatePayload['priority'],
      dueDate: formValues.dueDate || null,
      milestoneId: formValues.milestoneId
        ? parseInt(formValues.milestoneId, 10)
        : null,
      assigneeIds: selectedAssignees,
    };

    await updateTask.mutateAsync({ taskId, payload });
    setIsEditing(false);
    setShowAssigneeDropdown(false);
  };

  const handleDelete = async (): Promise<void> => {
    if (!taskId) return;
    await deleteTask.mutateAsync(taskId);
    onDeleted?.();
    onClose();
  };

  const handleAddSubtask = async (
    title: string,
    status: TaskStatus,
  ): Promise<void> => {
    await createSubtask.mutateAsync({ title, status });
  };

  const handleUpdateSubtaskStatus = async (
    subtaskId: number,
    status: TaskStatus,
  ): Promise<void> => {
    await updateSubtaskStatusMutation.mutateAsync({ subtaskId, status });
  };

  const handleCancelEdit = (): void => {
    if (task) {
      setFormValues({
        title: task.title,
        description: task.description ?? '',
        status: task.status,
        priority: task.priority ?? 'P1',
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        milestoneId: task.milestoneId?.toString() ?? '',
      });
      // Reset assignees to original
      if (task.assignees) {
        setSelectedAssignees(task.assignees.map((a) => a.userId));
      }
    }
    setIsEditing(false);
    setShowAssigneeDropdown(false);
  };

  const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!isOpen || !taskId) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="xl">
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : error ? (
        <div className="p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
          <p className="text-sm text-danger-800 dark:text-danger-200">
            Failed to load task details
          </p>
        </div>
      ) : task ? (
        <div className="space-y-6">
          {/* Header with actions */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <Input
                  label="Title"
                  value={formValues.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="text-lg font-semibold"
                />
              ) : (
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                  {task.title}
                </h2>
              )}
              {task.project?.name && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  Project: {task.project.name}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isEditing && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Delete confirmation */}
          {showDeleteConfirm && (
            <div className="p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg">
              <p className="text-sm text-danger-800 dark:text-danger-200 mb-3">
                Are you sure you want to delete this task? This will also delete
                all subtasks.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDelete}
                  isLoading={deleteTask.isPending}
                >
                  Delete
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Status and Priority badges (view mode) */}
          {!isEditing && (
            <div className="flex flex-wrap gap-2">
              <Badge variant={statusColors[task.status] ?? 'neutral'}>
                {task.status.replace('_', ' ')}
              </Badge>
              {task.priority && (
                <Badge variant={priorityColors[task.priority] ?? 'neutral'}>
                  {formatPriorityLabel(task.priority)}
                </Badge>
              )}
              {task.dueDate && (
                <Badge variant="neutral">Due: {formatDate(task.dueDate)}</Badge>
              )}
              {task.milestone?.name && (
                <Badge variant="neutral">
                  Milestone: {task.milestone.name}
                </Badge>
              )}
            </div>
          )}

          {/* Assignees display (view mode) */}
          {!isEditing && task.assignees && task.assignees.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Assignees
              </h3>
              <div className="flex flex-wrap gap-2">
                {task.assignees.map((assignee) => (
                  <Badge key={assignee.userId} variant="primary">
                    {assignee.user.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Edit form fields */}
          {isEditing && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Status"
                  value={formValues.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  {TASK_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ')}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Priority"
                  value={formValues.priority}
                  onChange={(e) => handleChange('priority', e.target.value)}
                >
                  {TASK_PRIORITIES.map((priority) => (
                    <option key={priority} value={priority}>
                      {formatPriorityLabel(priority)}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Due Date"
                  type="date"
                  value={formValues.dueDate}
                  onChange={(e) => handleChange('dueDate', e.target.value)}
                />

                <Select
                  label="Milestone"
                  value={formValues.milestoneId}
                  onChange={(e) => handleChange('milestoneId', e.target.value)}
                >
                  <option value="">No milestone</option>
                  {milestones.map((milestone) => (
                    <option key={milestone.id} value={milestone.id}>
                      {milestone.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Assignees Section */}
              {projectMembers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Assignees
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setShowAssigneeDropdown(!showAssigneeDropdown)
                      }
                      disabled={updateTask.isPending}
                      className="w-full flex items-center justify-between px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-left focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <span className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4 text-neutral-400" />
                        {selectedAssignees.length === 0
                          ? 'Select assignees...'
                          : `${selectedAssignees.length} assignee${selectedAssignees.length > 1 ? 's' : ''} selected`}
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
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-neutral-900 dark:text-neutral-100">
                                  {member.user.name}
                                </span>
                                {member.role === 'OWNER' && (
                                  <span className="px-1.5 py-0.5 text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded">
                                    Owner
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-neutral-500">
                                {member.user.email}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Show selected assignees as badges */}
                  {selectedAssignees.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedAssignees.map((userId) => {
                        const member = projectMembers.find(
                          (m) => m.userId === userId,
                        );
                        return member ? (
                          <Badge key={userId} variant="primary">
                            {member.user.name}
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Description
            </h3>
            {isEditing ? (
              <Textarea
                value={formValues.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Add a description..."
                rows={4}
              />
            ) : (
              <p className="text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">
                {task.description || 'No description provided.'}
              </p>
            )}
          </div>

          {/* Subtasks section */}
          <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
            <SubtaskList
              subtasks={task.subTasks ?? []}
              onAddSubtask={handleAddSubtask}
              onUpdateSubtaskStatus={handleUpdateSubtaskStatus}
              isAddingSubtask={createSubtask.isPending}
            />
          </div>

          {/* Edit mode action buttons */}
          {isEditing && (
            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <Button
                variant="secondary"
                onClick={handleCancelEdit}
                disabled={updateTask.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                isLoading={updateTask.isPending}
              >
                Save Changes
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
