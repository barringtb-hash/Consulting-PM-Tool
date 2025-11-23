import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';

import type { TaskWithProject } from '../api/tasks';
import { Badge, type BadgeVariant } from '../ui/Badge';

interface TaskKanbanCardProps {
  task: TaskWithProject;
  onDelete?: (taskId: number) => void;
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

export function TaskKanbanCard({
  task,
  onDelete,
}: TaskKanbanCardProps): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      window.confirm(
        `Are you sure you want to delete "${task.title}"? This action cannot be undone.`,
      )
    ) {
      onDelete?.(task.id);
    }
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`bg-white rounded-lg border border-neutral-200 p-4 shadow-sm ${
        isDragging ? 'shadow-lg cursor-grabbing' : 'hover:shadow-md cursor-grab'
      } transition-shadow`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-neutral-900 line-clamp-2 flex-1">
            {task.title}
          </p>
          {onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="text-neutral-400 hover:text-danger-600 transition-colors p-1 -m-1"
              title="Delete task"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
        <div>
          {task.description && (
            <p className="text-xs text-neutral-600 line-clamp-2">
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
              {task.priority}
            </Badge>
          )}
          {task.dueDate && (
            <span className="text-xs text-neutral-600">
              {formatDate(task.dueDate)}
            </span>
          )}
        </div>

        {task.projectName && (
          <div className="pt-2 border-t border-neutral-100">
            <Link
              to={`/projects/${task.projectId}`}
              className="text-xs text-primary-600 hover:text-primary-700 hover:underline"
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
