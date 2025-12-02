import React from 'react';
import { cn } from './utils';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  helperText?: string;
  error?: string;
}

export function Checkbox({
  label,
  helperText,
  error,
  className,
  id,
  ...props
}: CheckboxProps): JSX.Element {
  const checkboxId =
    id || `checkbox-${label?.replace(/\s+/g, '-').toLowerCase()}`;
  const hasError = Boolean(error);

  return (
    <div className="flex items-start">
      <div className="flex items-center h-5">
        <input
          type="checkbox"
          id={checkboxId}
          className={cn(
            'w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-primary-600 dark:text-primary-500',
            'bg-white dark:bg-neutral-700',
            'focus:ring-2 focus:ring-offset-0 focus:ring-primary-600 dark:focus:ring-primary-400',
            'disabled:cursor-not-allowed disabled:opacity-50',
            hasError && 'border-danger-300 dark:border-danger-500',
            className,
          )}
          aria-invalid={hasError}
          aria-describedby={
            error
              ? `${checkboxId}-error`
              : helperText
                ? `${checkboxId}-helper`
                : undefined
          }
          {...props}
        />
      </div>
      {(label || helperText || error) && (
        <div className="ml-3 text-sm">
          {label && (
            <label
              htmlFor={checkboxId}
              className="font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer"
            >
              {label}
            </label>
          )}
          {error && (
            <p
              id={`${checkboxId}-error`}
              className="text-danger-600 dark:text-danger-400"
              role="alert"
            >
              {error}
            </p>
          )}
          {!error && helperText && (
            <p
              id={`${checkboxId}-helper`}
              className="text-neutral-500 dark:text-neutral-400"
            >
              {helperText}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
