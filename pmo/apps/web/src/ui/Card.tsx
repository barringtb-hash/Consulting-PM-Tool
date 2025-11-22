import React from 'react';
import { cn } from './utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ className, children, ...props }: CardProps): JSX.Element {
  return (
    <div
      className={cn(
        'bg-white rounded-lg border border-neutral-200 shadow-sm',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardHeader({
  className,
  children,
  ...props
}: CardHeaderProps): JSX.Element {
  return (
    <div
      className={cn('px-6 py-4 border-b border-neutral-200', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export function CardTitle({
  className,
  children,
  as: Component = 'h3',
  ...props
}: CardTitleProps): JSX.Element {
  return (
    <Component
      className={cn('text-lg font-semibold text-neutral-900', className)}
      {...props}
    >
      {children}
    </Component>
  );
}

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardBody({
  className,
  children,
  ...props
}: CardBodyProps): JSX.Element {
  return (
    <div className={cn('px-6 py-4', className)} {...props}>
      {children}
    </div>
  );
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardFooter({
  className,
  children,
  ...props
}: CardFooterProps): JSX.Element {
  return (
    <div
      className={cn(
        'px-6 py-4 border-t border-neutral-200 bg-neutral-50',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
