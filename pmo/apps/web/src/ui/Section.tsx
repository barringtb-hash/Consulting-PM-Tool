import React from 'react';
import { cn } from './utils';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

/**
 * Section component for consistent page padding and max-width
 */
export function Section({
  className,
  children,
  ...props
}: SectionProps): JSX.Element {
  return (
    <section
      className={cn('container-padding section-spacing', className)}
      {...props}
    >
      {children}
    </section>
  );
}

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

const maxWidthStyles: Record<
  NonNullable<ContainerProps['maxWidth']>,
  string
> = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
};

/**
 * Container component for constraining content width
 */
export function Container({
  className,
  children,
  maxWidth = 'xl',
  ...props
}: ContainerProps): JSX.Element {
  return (
    <div
      className={cn('mx-auto w-full', maxWidthStyles[maxWidth], className)}
      {...props}
    >
      {children}
    </div>
  );
}
