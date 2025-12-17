import React from 'react';
import { cn } from './utils';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  description?: string;
  /** Alias for description - used by infrastructure pages */
  subtitle?: string;
  /** Optional icon component to display next to the title */
  icon?: React.ComponentType<{ className?: string }>;
  actions?: React.ReactNode;
  /** Alias for actions - used by some pages */
  action?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  subtitle,
  icon: Icon,
  actions,
  action,
  className,
  ...props
}: PageHeaderProps): JSX.Element {
  // Use subtitle as fallback for description
  const displayDescription = description || subtitle;
  // Use action as fallback for actions
  const displayActions = actions || action;

  return (
    <header
      className={cn(
        'border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800',
        className,
      )}
      {...props}
    >
      <div className="container-padding py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              {Icon && (
                <Icon className="h-7 w-7 text-primary-600 dark:text-primary-400" />
              )}
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                {title}
              </h1>
            </div>
            {displayDescription && (
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 max-w-2xl">
                {displayDescription}
              </p>
            )}
          </div>
          {displayActions && (
            <div className="flex-shrink-0 flex items-center gap-3">
              {displayActions}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
