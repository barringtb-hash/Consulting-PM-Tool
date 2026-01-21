/**
 * Route Helper Components
 *
 * Shared components used across route configurations:
 * - PageLoader: Loading fallback for lazy-loaded pages
 * - LazyPage: Wrapper with Suspense for lazy-loaded pages
 * - AuthenticatedLayout: Layout wrapper for protected routes
 */

import { ReactNode, Suspense } from 'react';
import { Outlet } from 'react-router';
import AppLayout from '../layouts/AppLayout';

/**
 * Loading fallback for lazy-loaded pages
 */
export function PageLoader(): JSX.Element {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-pulse text-neutral-500">Loading...</div>
    </div>
  );
}

/**
 * Wrapper for lazy-loaded pages with suspense fallback
 */
export function LazyPage({ children }: { children: ReactNode }): JSX.Element {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

/**
 * Layout wrapper for authenticated routes
 */
export function AuthenticatedLayout(): JSX.Element {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
