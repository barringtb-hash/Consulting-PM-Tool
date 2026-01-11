/**
 * Summary Card Component
 *
 * Base component for dashboard summary metric cards.
 * Updated to match ContactsPage UI patterns with icons and colored backgrounds.
 */

import type { ReactNode } from 'react';
import { Card } from '../../../../ui/Card';

/**
 * Style configuration for stat card variants.
 * Matches the pattern used in ContactsPage.
 */
export const STAT_STYLES = {
  blue: {
    iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  emerald: {
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  violet: {
    iconBg: 'bg-violet-100 dark:bg-violet-900/50',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
  amber: {
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  rose: {
    iconBg: 'bg-rose-100 dark:bg-rose-900/50',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  neutral: {
    iconBg: 'bg-neutral-100 dark:bg-neutral-800',
    iconColor: 'text-neutral-600 dark:text-neutral-400',
  },
} as const;

export type StatStyleVariant = keyof typeof STAT_STYLES;

export interface SummaryCardProps {
  /** Icon to display in the colored background */
  icon: ReactNode;
  /** Title/label displayed above the metric value */
  title: string;
  /** The main metric value to display */
  value: number;
  /** Color variant for the icon background */
  variant?: StatStyleVariant;
  /** Click handler for interactive cards */
  onClick?: () => void;
  /** Whether the card is in loading state */
  isLoading?: boolean;
}

/**
 * Skeleton loader for stat cards - matches ContactsPage pattern
 */
export function SummaryCardSkeleton(): JSX.Element {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
        <div className="flex-1">
          <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
          <div className="h-6 w-12 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>
      </div>
    </Card>
  );
}

/**
 * Summary card component with icon and colored background.
 * Follows the ContactsPage StatCard pattern for consistency.
 */
export function SummaryCard({
  icon,
  title,
  value,
  variant = 'neutral',
  onClick,
  isLoading,
}: SummaryCardProps): JSX.Element {
  const styles = STAT_STYLES[variant];

  const cardContent = (
    <div className="flex items-center gap-3">
      <div
        className={`flex items-center justify-center w-10 h-10 rounded-lg ${styles.iconBg}`}
      >
        <div className={styles.iconColor}>{icon}</div>
      </div>
      <div>
        <div className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          {title}
        </div>
        {isLoading ? (
          <div className="h-6 sm:h-7 w-12 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mt-0.5" />
        ) : (
          <div className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            {value}
          </div>
        )}
      </div>
    </div>
  );

  if (onClick) {
    return (
      <Card
        className="p-4 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] hover:border-primary-300 dark:hover:border-primary-600"
        onClick={onClick}
      >
        {cardContent}
      </Card>
    );
  }

  return <Card className="p-4">{cardContent}</Card>;
}
