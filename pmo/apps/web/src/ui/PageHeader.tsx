import React from 'react';
import { cn } from './utils';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  ...props
}: PageHeaderProps): JSX.Element {
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
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 max-w-2xl">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex-shrink-0 flex items-center gap-3">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
