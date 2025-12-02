import React from 'react';
import { cn } from './utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
}

export function Input({
  label,
  helperText,
  error,
  className,
  id,
  ...props
}: InputProps): JSX.Element {
  const inputId = id || `input-${label?.replace(/\s+/g, '-').toLowerCase()}`;
  const hasError = Boolean(error);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
        >
          {label}
          {props.required && (
            <span className="text-danger-600 dark:text-danger-400 ml-1">*</span>
          )}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full px-3 py-2 rounded-lg border text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500',
          'bg-white dark:bg-neutral-700',
          'focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary-600 dark:focus:ring-primary-400',
          'disabled:bg-neutral-100 dark:disabled:bg-neutral-800 disabled:cursor-not-allowed disabled:text-neutral-500 dark:disabled:text-neutral-400',
          hasError
            ? 'border-danger-300 dark:border-danger-500 focus:ring-danger-600 dark:focus:ring-danger-400'
            : 'border-neutral-300 dark:border-neutral-600',
          className,
        )}
        aria-invalid={hasError}
        aria-describedby={
          error
            ? `${inputId}-error`
            : helperText
              ? `${inputId}-helper`
              : undefined
        }
        {...props}
      />
      {error && (
        <p
          id={`${inputId}-error`}
          className="mt-1.5 text-sm text-danger-600 dark:text-danger-400"
          role="alert"
        >
          {error}
        </p>
      )}
      {!error && helperText && (
        <p
          id={`${inputId}-helper`}
          className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400"
        >
          {helperText}
        </p>
      )}
    </div>
  );
}
