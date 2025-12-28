import React, { useState } from 'react';
import { Plus } from 'lucide-react';
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
import { Card, CardBody } from '../../ui/Card';
import { Button } from '../../ui/Button';
import type { TaskPayload, TaskStatus } from '../../api/tasks';
import type { MilestonePayload } from '../../api/milestones';

interface ProjectTasksTabProps {
  projectId: number;
}

export function ProjectTasksTab({ projectId }: ProjectTasksTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subtaskError, setSubtaskError] = useState<string | null>(null);

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
      console.error('Failed to move task:', err);
    }
  };

  const handleTaskDelete = async (taskId: number) => {
    try {
      await deleteTaskMutation.mutateAsync(taskId);
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  if (tasksQuery.isLoading) {
    return (
      <Card>
        <CardBody>
          <p className="text-neutral-600 dark:text-neutral-400">
            Loading tasks...
          </p>
        </CardBody>
      </Card>
    );
  }

  if (tasksQuery.error) {
    return (
      <Card>
        <CardBody>
          <p className="text-danger-600">Unable to load tasks</p>
        </CardBody>
      </Card>
    );
  }

  const tasks = tasksQuery.data ?? [];
  const milestones = milestonesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Tasks
        </h2>
        <Button variant="primary" size="default" onClick={handleOpenModal}>
          <Plus className="w-5 h-5" />
          Add Task
        </Button>
      </div>

      <TaskKanbanBoard
        tasks={tasks}
        onTaskMove={handleTaskMove}
        onTaskDelete={handleTaskDelete}
        onTaskClick={setSelectedTaskId}
      />

      <TaskFormModal
        isOpen={isModalOpen}
        projectId={projectId}
        milestones={milestones}
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
        onClose={() => setSelectedTaskId(null)}
      />
    </div>
  );
}
