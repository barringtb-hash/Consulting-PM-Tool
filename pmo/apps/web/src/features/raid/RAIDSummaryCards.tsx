/**
 * RAID Summary Cards Component
 *
 * Displays summary statistics for RAID items (Risks, Action Items, Issues, Decisions)
 * in a grid of colored cards with icons.
 *
 * @module features/raid/RAIDSummaryCards
 */

import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  FileCheck2,
} from 'lucide-react';
import { useRAIDSummary } from './hooks/useRAIDData';

// ============================================================================
// Types
// ============================================================================

interface RAIDSummaryCardsProps {
  projectId: number;
}

interface SummaryCard {
  title: string;
  count: number;
  icon: React.ElementType;
  color: 'amber' | 'blue' | 'rose' | 'emerald';
  subtitle?: string;
}

// ============================================================================
// Style Configuration
// ============================================================================

const colorMap = {
  amber:
    'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400',
  blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400',
  rose: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400',
  emerald:
    'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400',
} as const;

// ============================================================================
// Skeleton Component
// ============================================================================

function SummaryCardSkeleton(): JSX.Element {
  return (
    <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-700 rounded" />
      </div>
      <div className="h-8 w-12 bg-neutral-200 dark:bg-neutral-700 rounded" />
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function RAIDSummaryCards({
  projectId,
}: RAIDSummaryCardsProps): JSX.Element {
  const { data: summary, isLoading, error } = useRAIDSummary(projectId);

  // Build summary cards array
  const summaryCards: SummaryCard[] = [
    {
      title: 'Open Risks',
      count: summary?.risks?.open ?? summary?.openRisks ?? 0,
      icon: AlertTriangle,
      color: 'amber',
      subtitle: summary?.highPriorityRisks
        ? `${summary.highPriorityRisks} high priority`
        : undefined,
    },
    {
      title: 'Action Items',
      count: summary?.actionItems?.open ?? 0,
      icon: CheckCircle2,
      color: 'blue',
      subtitle: summary?.overdueActionItems
        ? `${summary.overdueActionItems} overdue`
        : undefined,
    },
    {
      title: 'Open Issues',
      count: summary?.issues?.open ?? summary?.openIssues ?? 0,
      icon: AlertOctagon,
      color: 'rose',
      subtitle: summary?.criticalIssues
        ? `${summary.criticalIssues} critical`
        : undefined,
    },
    {
      title: 'Decisions',
      count: summary?.decisions?.total ?? 0,
      icon: FileCheck2,
      color: 'emerald',
      subtitle: summary?.decisions?.pending
        ? `${summary.decisions.pending} pending`
        : undefined,
    },
  ];

  // Show loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCardSkeleton />
        <SummaryCardSkeleton />
        <SummaryCardSkeleton />
        <SummaryCardSkeleton />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-4 rounded-lg border border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-900/20">
        <p className="text-sm text-danger-700 dark:text-danger-300">
          Failed to load RAID summary. Please try again.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {summaryCards.map(({ title, count, icon: Icon, color, subtitle }) => (
        <div key={title} className={`p-4 rounded-lg border ${colorMap[color]}`}>
          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-5 h-5" />
            <span className="text-sm font-medium">{title}</span>
          </div>
          <div className="text-3xl font-bold">{count}</div>
          {subtitle && (
            <div className="text-xs mt-1 opacity-80">{subtitle}</div>
          )}
        </div>
      ))}
    </div>
  );
}
