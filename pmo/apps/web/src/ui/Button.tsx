import React from 'react';
import { cn } from './utils';

/**
 * Button variant styles.
 * Note: 'danger' and 'destructive' are semantic aliases with identical styling.
 * - Use 'destructive' when following shadcn/ui conventions
 * - Use 'danger' when following Bootstrap/Tailwind conventions
 */
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'subtle'
  | 'destructive'
  | 'danger' // Alias for 'destructive' - same styling, different semantic naming
  | 'ghost'
  | 'outline';

/**
 * Button size options.
 * Note: 'md' is an alias for 'default' for compatibility with size="md" usage.
 */
export type ButtonSize = 'sm' | 'default' | 'md' | 'lg';

interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  className?: string;
  children: React.ReactNode;
}

export type ButtonProps = ButtonBaseProps &
  (
    | (React.ButtonHTMLAttributes<HTMLButtonElement> & { as?: undefined })
    | (React.AnchorHTMLAttributes<HTMLAnchorElement> & {
        as: React.ElementType;
        to?: string;
      })
  );

// Shared danger/destructive styling extracted for DRY
const DANGER_STYLES =
  'bg-danger-600 text-white hover:bg-danger-700 active:bg-danger-800 disabled:bg-danger-300 dark:bg-danger-500 dark:hover:bg-danger-600 dark:active:bg-danger-700 dark:disabled:bg-danger-800';

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 disabled:bg-primary-300 dark:bg-primary-500 dark:hover:bg-primary-600 dark:active:bg-primary-700 dark:disabled:bg-primary-800',
  secondary:
    'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-600 active:bg-neutral-100 dark:active:bg-neutral-500 disabled:bg-neutral-100 dark:disabled:bg-neutral-800 disabled:text-neutral-400 dark:disabled:text-neutral-500',
  subtle:
    'bg-transparent text-primary-700 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/50 active:bg-primary-100 dark:active:bg-primary-900 disabled:text-neutral-400 dark:disabled:text-neutral-500',
  destructive: DANGER_STYLES,
  danger: DANGER_STYLES, // Alias for destructive
  ghost:
    'bg-transparent text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 active:bg-neutral-200 dark:active:bg-neutral-700 disabled:text-neutral-400 dark:disabled:text-neutral-500',
  outline:
    'bg-transparent text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-800 active:bg-neutral-100 dark:active:bg-neutral-700 disabled:text-neutral-400 dark:disabled:text-neutral-500',
};

// Shared default/md styling extracted for DRY
const DEFAULT_SIZE_STYLES = 'px-4 py-2 text-base';

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  default: DEFAULT_SIZE_STYLES,
  md: DEFAULT_SIZE_STYLES, // Alias for default
  lg: 'px-6 py-3 text-lg',
};

export function Button({
  variant = 'primary',
  size = 'default',
  isLoading = false,
  className,
  children,
  ...props
}: ButtonProps): JSX.Element {
  const buttonClasses = cn(
    'inline-flex items-center justify-center gap-2',
    'font-medium rounded-lg',
    'transition-colors duration-150',
    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 dark:focus-visible:outline-primary-400',
    'disabled:cursor-not-allowed disabled:opacity-60',
    variantStyles[variant],
    sizeStyles[size],
    className,
  );

  const loadingSpinner = isLoading && (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );

  // Polymorphic rendering - support `as` prop for rendering as Link, etc.
  if ('as' in props && props.as) {
    const { as: Component, to, ...restProps } = props;
    return (
      <Component className={buttonClasses} to={to} {...restProps}>
        {loadingSpinner}
        {children}
      </Component>
    );
  }

  // Default button rendering
  const {
    type = 'button',
    disabled,
    ...buttonProps
  } = props as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={disabled || isLoading}
      {...buttonProps}
    >
      {loadingSpinner}
      {children}
    </button>
  );
}
