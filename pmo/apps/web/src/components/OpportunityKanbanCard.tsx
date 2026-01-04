import React, { memo, useCallback, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from 'react-router';
import { DollarSign, Calendar, Building2 } from 'lucide-react';

import { type Opportunity } from '../api/opportunities';
import { Badge } from '../ui/Badge';

interface OpportunityKanbanCardProps {
  opportunity: Opportunity;
  onClick?: (opportunityId: number) => void;
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value?: string | null): string {
  if (!value) {
    return 'No close date';
  }

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export const OpportunityKanbanCard = memo(function OpportunityKanbanCard({
  opportunity,
  onClick,
}: OpportunityKanbanCardProps): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: opportunity.id });

  // Track if we started a drag to prevent click on drag end
  const isDraggingRef = useRef(false);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

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
      onClick?.(opportunity.id);
    },
    [opportunity.id, onClick, isDragging],
  );

  const handleMouseUp = useCallback(() => {
    mouseDownPosRef.current = null;
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Handle Enter/Space for click accessibility
      if ((e.key === 'Enter' || e.key === ' ') && onClick) {
        e.preventDefault();
        onClick(opportunity.id);
      }
    },
    [opportunity.id, onClick],
  );

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
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={
        onClick ? `Open opportunity details for ${opportunity.name}` : undefined
      }
      className={`bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 shadow-sm ${
        isDragging
          ? 'shadow-lg cursor-grabbing'
          : onClick
            ? 'hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600 cursor-pointer'
            : 'hover:shadow-md dark:hover:shadow-neutral-900/50 cursor-grab'
      } transition-all`}
    >
      <div className="space-y-3">
        {/* Title */}
        <div>
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 line-clamp-2">
            {opportunity.name}
          </p>
        </div>

        {/* Amount and Probability */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-neutral-900 dark:text-neutral-100">
            <DollarSign className="h-3.5 w-3.5 text-green-600" />
            <span className="text-sm font-semibold">
              {formatCurrency(opportunity.amount)}
            </span>
          </div>
          <Badge variant="default" className="text-xs">
            {opportunity.probability}%
          </Badge>
        </div>

        {/* Account and Close Date */}
        <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
          {opportunity.account && (
            <Link
              to={`/crm/accounts/${opportunity.account.id}`}
              className="flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400"
              onClick={(e) => e.stopPropagation()}
            >
              <Building2 className="h-3 w-3" />
              <span className="truncate max-w-[100px]">
                {opportunity.account.name}
              </span>
            </Link>
          )}
          {opportunity.expectedCloseDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(opportunity.expectedCloseDate)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

OpportunityKanbanCard.displayName = 'OpportunityKanbanCard';
