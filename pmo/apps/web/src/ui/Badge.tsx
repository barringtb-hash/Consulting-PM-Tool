import React from 'react';
import { cn } from './utils';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    'bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300',
  primary:
    'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300',
  secondary:
    'bg-neutral-200 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-200',
  success:
    'bg-success-100 dark:bg-success-900/50 text-success-700 dark:text-success-300',
  warning:
    'bg-warning-100 dark:bg-warning-900/50 text-warning-700 dark:text-warning-300',
  danger:
    'bg-danger-100 dark:bg-danger-900/50 text-danger-700 dark:text-danger-300',
  neutral:
    'bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200',
};

export function Badge({
  variant = 'default',
  className,
  children,
  ...props
}: BadgeProps): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
