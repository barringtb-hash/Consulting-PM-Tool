import React, { memo, useCallback, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router';
import { CheckSquare, Trash2 } from 'lucide-react';

import { formatPriorityLabel, type TaskWithProject } from '../api/tasks';
import { Badge, type BadgeVariant } from '../ui/Badge';
import { EMPTY_STATES } from '../utils/typography';

interface TaskKanbanCardProps {
  task: TaskWithProject;
  onDelete?: (taskId: number) => void;
  onClick?: (taskId: number) => void;
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
    return EMPTY_STATES.noDueDate;
  }

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const TaskKanbanCard = memo(function TaskKanbanCard({
  task,
  onDelete,
  onClick,
}: TaskKanbanCardProps): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  // Track if we started a drag to prevent click on drag end
  const isDraggingRef = useRef(false);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (
        window.confirm(
          `Are you sure you want to delete "${task.title}"? This action cannot be undone.`,
        )
      ) {
        onDelete?.(task.id);
      }
    },
    [task.id, task.title, onDelete],
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    isDraggingRef.current = false;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (mouseDownPosRef.current) {
      const dx = Math.abs(e.clientX - mouseDownPosRef.current.x);
      const dy = Math.abs(e.clientY - mouseDownPosRef.current.y);
      // If mouse moved more than 5px, consider it a drag
      if (dx > 5 || dy > 5) {
        isDraggingRef.current = true;
      }
    }
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Don't trigger click if we were dragging
      if (isDraggingRef.current || isDragging) {
        return;
      }
      // Don't trigger if clicking on interactive elements
      const target = e.target as HTMLElement;
      if (target.closest('a') || target.closest('button')) {
        return;
      }
      onClick?.(task.id);
    },
    [task.id, onClick, isDragging],
  );

  const handleMouseUp = useCallback(() => {
    mouseDownPosRef.current = null;
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Handle Enter/Space for click accessibility
      if ((e.key === 'Enter' || e.key === ' ') && onClick) {
        e.preventDefault();
        onClick(task.id);
      }
    },
    [task.id, onClick],
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasSubtasks = (task.subTaskCount ?? 0) > 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? `Open task details for ${task.title}` : undefined}
      className={`bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 shadow-sm ${
        isDragging
          ? 'shadow-lg cursor-grabbing'
          : onClick
            ? 'hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600 cursor-pointer'
            : 'hover:shadow-md dark:hover:shadow-neutral-900/50 cursor-grab'
      } transition-all`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 line-clamp-2 flex-1">
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
            <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
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
          {hasSubtasks && (
            <span className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
              <CheckSquare size={12} />
              {task.subTaskCompletedCount ?? 0}/{task.subTaskCount}
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
});

TaskKanbanCard.displayName = 'TaskKanbanCard';
