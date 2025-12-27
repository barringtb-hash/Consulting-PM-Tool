import React from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Link } from 'react-router';

import { TASK_STATUSES, type TaskStatus } from '../hooks/tasks';
import { formatPriorityLabel, type TaskWithProject } from '../api/tasks';
import { Badge, type BadgeVariant } from '../ui/Badge';
import { TaskKanbanCard } from './TaskKanbanCard';

interface TaskKanbanBoardProps {
  tasks: TaskWithProject[];
  onTaskMove: (taskId: number, newStatus: TaskStatus) => void;
  onTaskDelete?: (taskId: number) => void;
  onTaskClick?: (taskId: number) => void;
}

function formatStatusLabel(status: TaskStatus): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l: string) => l.toUpperCase());
}

function getStatusBadgeVariant(status: TaskStatus): BadgeVariant {
  switch (status) {
    case 'DONE':
      return 'success';
    case 'IN_PROGRESS':
      return 'primary';
    case 'BLOCKED':
      return 'danger';
    case 'NOT_STARTED':
    case 'BACKLOG':
    default:
      return 'neutral';
  }
}

function getPriorityBadgeVariant(priority?: string | null): BadgeVariant {
  if (!priority) return 'neutral';
  switch (priority) {
    case 'P0':
      return 'danger';
    case 'P1':
      return 'warning';
    case 'P2':
    default:
      return 'neutral';
  }
}

function formatDate(value?: string | null): string {
  if (!value) {
    return 'No due date';
  }

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function TaskKanbanBoard({
  tasks,
  onTaskMove,
  onTaskDelete,
  onTaskClick,
}: TaskKanbanBoardProps): JSX.Element {
  const [activeTask, setActiveTask] = React.useState<TaskWithProject | null>(
    null,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const tasksByStatus = React.useMemo(() => {
    const grouped: Record<TaskStatus, TaskWithProject[]> = {
      NOT_STARTED: [],
      BACKLOG: [],
      IN_PROGRESS: [],
      BLOCKED: [],
      DONE: [],
    };

    tasks.forEach((task) => {
      // Defensive: only push to known status columns
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });

    return grouped;
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as number;
    // Get the container ID (column status) instead of the item ID
    const newStatus = (over.data?.current?.sortable?.containerId ||
      over.id) as TaskStatus;

    const task = tasks.find((t) => t.id === taskId);
    if (task && task.status !== newStatus) {
      onTaskMove(taskId, newStatus);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 p-6">
        {TASK_STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status]}
            onTaskDelete={onTaskDelete}
            onTaskClick={onTaskClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="opacity-90 rotate-3 scale-105">
            <TaskCard task={activeTask} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: TaskWithProject[];
  onTaskDelete?: (taskId: number) => void;
  onTaskClick?: (taskId: number) => void;
}

function KanbanColumn({
  status,
  tasks,
  onTaskDelete,
  onTaskClick,
}: KanbanColumnProps): JSX.Element {
  return (
    <div className="flex flex-col bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 min-h-[500px]">
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
            {formatStatusLabel(status)}
          </h3>
          <Badge variant={getStatusBadgeVariant(status)}>{tasks.length}</Badge>
        </div>
      </div>

      <SortableContext
        id={status}
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 p-3 space-y-3 overflow-y-auto">
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-neutral-400 dark:text-neutral-500 text-sm">
              No tasks
            </div>
          ) : (
            tasks.map((task) => (
              <TaskKanbanCard
                key={task.id}
                task={task}
                onDelete={onTaskDelete}
                onClick={onTaskClick}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

interface TaskCardProps {
  task: TaskWithProject;
  isDragging?: boolean;
}

function TaskCard({ task, isDragging = false }: TaskCardProps): JSX.Element {
  return (
    <div
      className={`bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 shadow-sm ${
        isDragging
          ? 'shadow-lg'
          : 'hover:shadow-md dark:hover:shadow-neutral-900/50'
      } transition-shadow cursor-grab active:cursor-grabbing`}
    >
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 line-clamp-2">
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {task.priority && (
            <Badge
              variant={getPriorityBadgeVariant(task.priority)}
              className="text-xs"
            >
              {formatPriorityLabel(task.priority)}
            </Badge>
          )}
          {task.dueDate && (
            <span className="text-xs text-neutral-600 dark:text-neutral-400">
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>

        {task.projectName && (
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-700">
            <Link
              to={`/projects/${task.projectId}`}
              className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {task.projectName}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
