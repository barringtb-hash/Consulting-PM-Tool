import React from 'react';
import { ChevronDown } from 'lucide-react';
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
      <div className="relative">
        <select
          id={selectId}
          className={cn(
            'w-full px-4 py-2.5 rounded-lg border text-sm text-neutral-900 dark:text-neutral-100',
            'focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary-500 focus:border-primary-500',
            'disabled:bg-neutral-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed disabled:text-neutral-500 dark:disabled:text-neutral-400',
            'bg-white dark:bg-neutral-700 appearance-none cursor-pointer',
            'pr-10 transition-shadow',
            hasError
              ? 'border-danger-300 dark:border-danger-500 focus:ring-danger-600 dark:focus:ring-danger-400'
              : 'border-neutral-300 dark:border-neutral-600 hover:border-neutral-400 dark:hover:border-neutral-500',
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
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500 pointer-events-none"
          aria-hidden="true"
        />
      </div>
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
