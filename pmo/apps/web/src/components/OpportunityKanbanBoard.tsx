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
import { DollarSign } from 'lucide-react';

import { type Opportunity, type PipelineStage } from '../api/opportunities';
import { Badge, type BadgeVariant } from '../ui/Badge';
import { OpportunityKanbanCard } from './OpportunityKanbanCard';

interface OpportunityKanbanBoardProps {
  opportunities: Opportunity[];
  stages: PipelineStage[];
  onOpportunityMove: (opportunityId: number, newStageId: number) => void;
  onOpportunityClick?: (opportunityId: number) => void;
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStageVariant(stageType: string): BadgeVariant {
  switch (stageType) {
    case 'WON':
      return 'success';
    case 'LOST':
      return 'danger';
    default:
      return 'default';
  }
}

export function OpportunityKanbanBoard({
  opportunities,
  stages,
  onOpportunityMove,
  onOpportunityClick,
}: OpportunityKanbanBoardProps): JSX.Element {
  const [activeOpportunity, setActiveOpportunity] =
    React.useState<Opportunity | null>(null);

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

  // Group opportunities by stage
  const opportunitiesByStage = React.useMemo(() => {
    const grouped: Record<number, Opportunity[]> = {};

    // Initialize all stages with empty arrays
    stages.forEach((stage) => {
      grouped[stage.id] = [];
    });

    // Populate with opportunities
    opportunities.forEach((opp) => {
      if (grouped[opp.stageId]) {
        grouped[opp.stageId].push(opp);
      }
    });

    return grouped;
  }, [opportunities, stages]);

  // Calculate totals per stage
  const stageTotals = React.useMemo(() => {
    const totals: Record<number, { count: number; value: number }> = {};

    stages.forEach((stage) => {
      const stageOpps = opportunitiesByStage[stage.id] || [];
      totals[stage.id] = {
        count: stageOpps.length,
        value: stageOpps.reduce((sum, opp) => sum + (opp.amount || 0), 0),
      };
    });

    return totals;
  }, [stages, opportunitiesByStage]);

  const handleDragStart = (event: DragStartEvent) => {
    const opp = opportunities.find((o) => o.id === event.active.id);
    setActiveOpportunity(opp ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOpportunity(null);

    if (!over) return;

    const opportunityId = active.id as number;
    // Get the container ID (column stage) instead of the item ID
    const newStageId = (over.data?.current?.sortable?.containerId ||
      over.id) as number;

    const opportunity = opportunities.find((o) => o.id === opportunityId);
    if (opportunity && opportunity.stageId !== newStageId) {
      onOpportunityMove(opportunityId, newStageId);
    }
  };

  // Only show OPEN stages in Kanban (WON/LOST are terminal states)
  const openStages = stages.filter((s) => s.stageType === 'OPEN');

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 p-4 overflow-x-auto min-h-[600px]">
        {openStages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            opportunities={opportunitiesByStage[stage.id] || []}
            total={stageTotals[stage.id]}
            onOpportunityClick={onOpportunityClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeOpportunity ? (
          <div className="opacity-90 rotate-3 scale-105">
            <OpportunityCardOverlay opportunity={activeOpportunity} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

interface KanbanColumnProps {
  stage: PipelineStage;
  opportunities: Opportunity[];
  total: { count: number; value: number };
  onOpportunityClick?: (opportunityId: number) => void;
}

function KanbanColumn({
  stage,
  opportunities,
  total,
  onOpportunityClick,
}: KanbanColumnProps): JSX.Element {
  return (
    <div
      className="flex flex-col bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 min-w-[300px] max-w-[300px]"
      style={{ borderTopColor: stage.color || undefined, borderTopWidth: 3 }}
    >
      {/* Column Header */}
      <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 rounded-t-lg">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
            {stage.name}
          </h3>
          <Badge variant={getStageVariant(stage.stageType)}>
            {total.count}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
          <DollarSign className="h-3 w-3" />
          {formatCurrency(total.value)}
          <span className="mx-1">|</span>
          <span>{stage.probability}% prob</span>
        </div>
      </div>

      {/* Column Content */}
      <SortableContext
        id={stage.id}
        items={opportunities.map((o) => o.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-300px)]">
          {opportunities.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-neutral-400 dark:text-neutral-500 text-sm">
              No opportunities
            </div>
          ) : (
            opportunities.map((opportunity) => (
              <OpportunityKanbanCard
                key={opportunity.id}
                opportunity={opportunity}
                onClick={onOpportunityClick}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}

interface OpportunityCardOverlayProps {
  opportunity: Opportunity;
}

function OpportunityCardOverlay({
  opportunity,
}: OpportunityCardOverlayProps): JSX.Element {
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 shadow-lg cursor-grabbing min-w-[280px]">
      <div className="space-y-2">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 line-clamp-2">
          {opportunity.name}
        </p>
        <div className="flex items-center gap-1">
          <DollarSign className="h-3.5 w-3.5 text-green-600" />
          <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {formatCurrency(opportunity.amount)}
          </span>
        </div>
      </div>
    </div>
  );
}
