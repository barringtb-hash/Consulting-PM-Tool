import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useProjectTasks, useCreateTask } from '../../hooks/tasks';
import { useProjectMilestones } from '../../hooks/milestones';
import { TaskKanbanBoard } from '../../components/TaskKanbanBoard';
import { TaskFormModal } from '../tasks/TaskFormModal';
import { Card, CardBody } from '../../ui/Card';
import { Button } from '../../ui/Button';
import type { TaskPayload } from '../../api/tasks';

interface ProjectTasksTabProps {
  projectId: number;
}

export function ProjectTasksTab({ projectId }: ProjectTasksTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tasksQuery = useProjectTasks(projectId);
  const milestonesQuery = useProjectMilestones(projectId);
  const createTaskMutation = useCreateTask();

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setError(null);
  };

  const handleSubmit = async (payload: TaskPayload) => {
    try {
      setError(null);
      await createTaskMutation.mutateAsync(payload);
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    }
  };

  if (tasksQuery.isLoading) {
    return (
      <Card>
        <CardBody>
          <p className="text-neutral-600">Loading tasks...</p>
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
        <h2 className="text-2xl font-semibold text-neutral-900">Tasks</h2>
        <Button variant="primary" size="default" onClick={handleOpenModal}>
          <Plus className="w-5 h-5" />
          Add Task
        </Button>
      </div>

      <TaskKanbanBoard projectId={projectId} tasks={tasks} />

      <TaskFormModal
        isOpen={isModalOpen}
        projectId={projectId}
        milestones={milestones}
        onSubmit={handleSubmit}
        onCancel={handleCloseModal}
        isSubmitting={createTaskMutation.isPending}
        error={error}
      />
    </div>
  );
}
