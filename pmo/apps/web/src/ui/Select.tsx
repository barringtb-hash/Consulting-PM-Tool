import React from 'react';
import { cn } from './utils';

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export function Select({
  label,
  helperText,
  error,
  className,
  id,
  children,
  ...props
}: SelectProps): JSX.Element {
  const selectId = id || `select-${label?.replace(/\s+/g, '-').toLowerCase()}`;
  const hasError = Boolean(error);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
        >
          {label}
          {props.required && (
            <span className="text-danger-600 dark:text-danger-400 ml-1">*</span>
          )}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'w-full px-3 py-2 rounded-lg border text-neutral-900 dark:text-neutral-100',
          'focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary-600 dark:focus:ring-primary-400',
          'disabled:bg-neutral-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed disabled:text-neutral-500 dark:disabled:text-neutral-400',
          'bg-white dark:bg-neutral-700 appearance-none',
          "bg-[url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")] dark:bg-[url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")] bg-[length:1.25rem] bg-[center_right_0.5rem] bg-no-repeat pr-10",
          hasError
            ? 'border-danger-300 dark:border-danger-500 focus:ring-danger-600 dark:focus:ring-danger-400'
            : 'border-neutral-300 dark:border-neutral-600',
          className,
        )}
        aria-invalid={hasError}
        aria-describedby={
          error
            ? `${selectId}-error`
            : helperText
              ? `${selectId}-helper`
              : undefined
        }
        {...props}
      >
        {children}
      </select>
      {error && (
        <p
          id={`${selectId}-error`}
          className="mt-1.5 text-sm text-danger-600 dark:text-danger-400"
          role="alert"
        >
          {error}
        </p>
      )}
      {!error && helperText && (
        <p
          id={`${selectId}-helper`}
          className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400"
        >
          {helperText}
        </p>
      )}
    </div>
  );
}
