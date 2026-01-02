import React from 'react';
import { Link } from 'react-router';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from './utils';

export interface BreadcrumbItem {
  /** Label to display for this breadcrumb item */
  label: string;
  /** Path to navigate to when clicked (optional for last item) */
  href?: string;
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  /** Array of breadcrumb items to display */
  items: BreadcrumbItem[];
  /** Whether to show home icon at the start */
  showHome?: boolean;
  /** Home path (defaults to /dashboard) */
  homePath?: string;
}

export function Breadcrumb({
  items,
  showHome = true,
  homePath = '/dashboard',
  className,
  ...props
}: BreadcrumbProps): JSX.Element {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn('flex items-center text-sm', className)}
      {...props}
    >
      <ol className="flex items-center gap-1">
        {showHome && (
          <li className="flex items-center">
            <Link
              to={homePath}
              className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
              aria-label="Home"
            >
              <Home className="h-4 w-4" />
            </Link>
            <ChevronRight className="h-4 w-4 mx-1 text-neutral-400 dark:text-neutral-500" />
          </li>
        )}
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center">
              {isLast || !item.href ? (
                <span
                  className={cn(
                    'font-medium',
                    isLast
                      ? 'text-neutral-900 dark:text-neutral-100'
                      : 'text-neutral-500 dark:text-neutral-400',
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
                >
                  {item.label}
                </Link>
              )}
              {!isLast && (
                <ChevronRight className="h-4 w-4 mx-1 text-neutral-400 dark:text-neutral-500" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
