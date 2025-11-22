import React from 'react';
import { useProjectTasks } from '../../hooks/tasks';
import { TaskKanbanBoard } from '../../components/TaskKanbanBoard';
import { Card, CardBody } from '../../ui/Card';

interface ProjectTasksTabProps {
  projectId: number;
}

export function ProjectTasksTab({ projectId }: ProjectTasksTabProps) {
  const tasksQuery = useProjectTasks(projectId);

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

  return (
    <div className="space-y-6">
      <TaskKanbanBoard projectId={projectId} tasks={tasks} />
    </div>
  );
}
