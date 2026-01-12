import React, { useState } from 'react';
import { Plus, CheckSquare, ListTodo } from 'lucide-react';
import {
  useProjectTasks,
  useCreateTask,
  useCreateSubtask,
  useMoveTask,
  useDeleteTask,
} from '../../hooks/tasks';
import {
  useProjectMilestones,
  useCreateMilestone,
} from '../../hooks/milestones';
import { useProjectMembers } from '../../api/hooks/projects';
import { TaskKanbanBoard } from '../../components/TaskKanbanBoard';
import { TaskFormModal } from '../tasks/TaskFormModal';
import { TaskDetailModal } from '../tasks/TaskDetailModal';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { useToast } from '../../ui/Toast';
import type { TaskPayload, TaskStatus } from '../../api/tasks';
import type { MilestonePayload } from '../../api/milestones';

interface ProjectTasksTabProps {
  projectId: number;
}

// Style configuration for consistent theming
const STAT_STYLES = {
  blue: {
    iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  neutral: {
    iconBg: 'bg-neutral-100 dark:bg-neutral-800',
    iconColor: 'text-neutral-600 dark:text-neutral-400',
  },
} as const;

// Section header with icon in colored background
interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  variant?: keyof typeof STAT_STYLES;
  action?: React.ReactNode;
}

function SectionHeader({
  icon,
  title,
  variant = 'neutral',
  action,
}: SectionHeaderProps): JSX.Element {
  const styles = STAT_STYLES[variant];

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-lg ${styles.iconBg}`}
        >
          <div className={styles.iconColor}>{icon}</div>
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {title}
        </h3>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// Empty state component
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center text-center py-12 px-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-4">
        <div className="text-neutral-400 dark:text-neutral-500">{icon}</div>
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-neutral-500 dark:text-neutral-400 max-w-md mb-6">
        {description}
      </p>
      {action}
    </div>
  );
}

// Skeleton loader for Kanban board
function KanbanSkeleton(): JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[...Array(4)].map((_, columnIndex) => (
        <div
          key={columnIndex}
          className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-4"
        >
          {/* Column header skeleton */}
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            <div className="h-5 w-6 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          </div>
          {/* Card skeletons */}
          <div className="space-y-3">
            {[...Array(columnIndex === 0 ? 3 : columnIndex === 1 ? 2 : 1)].map(
              (_, cardIndex) => (
                <div
                  key={cardIndex}
                  className="bg-white dark:bg-neutral-700 rounded-lg p-4 shadow-sm"
                >
                  <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-600 rounded animate-pulse mb-3" />
                  <div className="h-3 w-3/4 bg-neutral-200 dark:bg-neutral-600 rounded animate-pulse mb-2" />
                  <div className="flex items-center gap-2 mt-3">
                    <div className="h-6 w-6 rounded-full bg-neutral-200 dark:bg-neutral-600 animate-pulse" />
                    <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-600 rounded animate-pulse" />
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProjectTasksTab({ projectId }: ProjectTasksTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subtaskError, setSubtaskError] = useState<string | null>(null);
  const { showToast } = useToast();

  const tasksQuery = useProjectTasks(projectId);
  const milestonesQuery = useProjectMilestones(projectId);
  const membersQuery = useProjectMembers(projectId);
  const createTaskMutation = useCreateTask();
  const createSubtaskMutation = useCreateSubtask(undefined, projectId);
  const createMilestoneMutation = useCreateMilestone();
  const moveTaskMutation = useMoveTask(projectId);
  const deleteTaskMutation = useDeleteTask(projectId);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setError(null);
    setSubtaskError(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setError(null);
    setSubtaskError(null);
  };

  const handleSubmit = async (
    payload: TaskPayload,
  ): Promise<{ id: number } | void> => {
    try {
      setError(null);
      setSubtaskError(null);
      const task = await createTaskMutation.mutateAsync(payload);
      // Don't close modal here - let caller decide after subtasks are created
      return { id: task.id };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    }
  };

  const handleCreateMilestone = async (payload: MilestonePayload) => {
    return await createMilestoneMutation.mutateAsync(payload);
  };

  const handleCreateSubtasks = async (
    parentTaskId: number,
    subtasks: Array<{ title: string; status: TaskStatus }>,
  ): Promise<{ failedCount: number }> => {
    setSubtaskError(null);

    try {
      // Create subtasks in parallel and track which ones fail
      // Pass parentTaskId in each payload so the mutation knows which task to attach to
      const results = await Promise.allSettled(
        subtasks.map((subtask) =>
          createSubtaskMutation.mutateAsync({ ...subtask, parentTaskId }),
        ),
      );

      const failed = results.filter((r) => r.status === 'rejected');

      if (failed.length > 0) {
        const failedTitles = subtasks
          .filter((_, index) => results[index].status === 'rejected')
          .map((s) => s.title);

        const errorMsg =
          failed.length === subtasks.length
            ? 'Failed to create all subtasks. Please try adding them manually.'
            : `Failed to create ${failed.length} subtask(s): ${failedTitles.join(', ')}`;

        setSubtaskError(errorMsg);
        return { failedCount: failed.length };
      }

      return { failedCount: 0 };
    } catch (err) {
      // Unexpected error (shouldn't happen with allSettled, but defensive)
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to create subtasks';
      setSubtaskError(errorMsg);
      return { failedCount: subtasks.length };
    }
  };

  const handleTaskMove = async (taskId: number, newStatus: TaskStatus) => {
    try {
      await moveTaskMutation.mutateAsync({
        taskId,
        payload: { status: newStatus },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showToast({
        message: `Failed to move task: ${message}`,
        variant: 'destructive',
      });
    }
  };

  const handleTaskDelete = async (taskId: number) => {
    try {
      await deleteTaskMutation.mutateAsync(taskId);
      showToast({ message: 'Task deleted successfully', variant: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      showToast({
        message: `Failed to delete task: ${message}`,
        variant: 'destructive',
      });
    }
  };

  // Loading state with skeleton
  if (tasksQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <SectionHeader
              icon={<CheckSquare className="h-5 w-5" />}
              title="Tasks"
              variant="blue"
              action={
                <Button variant="primary" size="default" disabled>
                  <Plus className="w-5 h-5" />
                  Add Task
                </Button>
              }
            />
          </CardHeader>
          <CardBody>
            <KanbanSkeleton />
          </CardBody>
        </Card>
      </div>
    );
  }

  // Error state
  if (tasksQuery.error) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            icon={<CheckSquare className="h-8 w-8" />}
            title="Unable to load tasks"
            description="There was a problem loading the tasks for this project. Please try again."
            action={
              <Button variant="secondary" onClick={() => tasksQuery.refetch()}>
                Retry
              </Button>
            }
          />
        </CardBody>
      </Card>
    );
  }

  const tasks = tasksQuery.data ?? [];
  const milestones = milestonesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <SectionHeader
            icon={<CheckSquare className="h-5 w-5" />}
            title="Tasks"
            variant="blue"
            action={
              <Button
                variant="primary"
                size="default"
                onClick={handleOpenModal}
              >
                <Plus className="w-5 h-5" />
                Add Task
              </Button>
            }
          />
        </CardHeader>
        <CardBody>
          {tasks.length === 0 ? (
            <EmptyState
              icon={<ListTodo className="h-8 w-8" />}
              title="No tasks yet"
              description="Create your first task to start tracking work for this project. Tasks can be organized in a Kanban board and assigned to team members."
              action={
                <Button variant="primary" onClick={handleOpenModal}>
                  <Plus className="w-5 h-5" />
                  Create First Task
                </Button>
              }
            />
          ) : (
            <TaskKanbanBoard
              tasks={tasks}
              onTaskMove={handleTaskMove}
              onTaskDelete={handleTaskDelete}
              onTaskClick={setSelectedTaskId}
            />
          )}
        </CardBody>
      </Card>

      <TaskFormModal
        isOpen={isModalOpen}
        projectId={projectId}
        projectMembers={membersQuery.data ?? []}
        onSubmit={handleSubmit}
        onCreateSubtasks={handleCreateSubtasks}
        onCreateMilestone={handleCreateMilestone}
        onCancel={handleCloseModal}
        onSuccess={handleCloseModal}
        isSubmitting={createTaskMutation.isPending}
        error={error}
        subtaskError={subtaskError}
      />

      <TaskDetailModal
        isOpen={selectedTaskId !== null}
        taskId={selectedTaskId}
        projectId={projectId}
        milestones={milestones}
        projectMembers={membersQuery.data ?? []}
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
}
