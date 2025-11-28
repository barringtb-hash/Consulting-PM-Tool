/**
 * Summary Card Component
 *
 * Base component for dashboard summary metric cards.
 * Used by summary card plugins to display key metrics.
 */

import { Card, CardBody, CardTitle } from '../../../../ui/Card';
import type { SummaryCardVariant } from '../types';

export interface SummaryCardProps {
  /** Title displayed above the metric value */
  title: string;
  /** The main metric value to display */
  value: number;
  /** Description text below the value */
  description: string;
  /** Visual variant styling */
  variant?: SummaryCardVariant;
  /** Click handler for interactive cards */
  onClick?: () => void;
  /** Whether the card is in loading state */
  isLoading?: boolean;
}

const variantStyles: Record<SummaryCardVariant, string> = {
  default: 'border-neutral-200',
  primary: 'border-primary-200 bg-primary-50/30',
  warning: 'border-warning-200 bg-warning-50/30',
  danger: 'border-danger-200 bg-danger-50/30',
};

const valueColors: Record<SummaryCardVariant, string> = {
  default: 'text-neutral-900',
  primary: 'text-primary-700',
  warning: 'text-warning-700',
  danger: 'text-danger-700',
};

export function SummaryCard({
  title,
  value,
  description,
  variant = 'default',
  onClick,
  isLoading,
}: SummaryCardProps): JSX.Element {
  const wrapperProps = onClick
    ? {
        onClick,
        className: `w-full text-left transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${variantStyles[variant]}`,
      }
    : {
        className: variantStyles[variant],
      };

  return (
    <Card {...wrapperProps}>
      <CardBody>
        <div className="flex flex-col gap-2">
          <CardTitle as="h2" className="text-sm font-medium text-neutral-600">
            {title}
          </CardTitle>
          {isLoading ? (
            <div className="h-10 w-20 bg-neutral-200 animate-pulse rounded" />
          ) : (
            <div className={`text-3xl font-bold ${valueColors[variant]}`}>
              {value}
            </div>
          )}
          <p className="text-sm text-neutral-500">{description}</p>
        </div>
      </CardBody>
    </Card>
  );
}
