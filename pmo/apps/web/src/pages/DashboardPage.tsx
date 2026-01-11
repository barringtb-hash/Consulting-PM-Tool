/**
 * Dashboard Page
 *
 * Main dashboard with modular plugin-based panels. Uses the dashboard plugin
 * architecture for extensibility while maintaining a clean, consistent UI.
 * Updated to match ContactsPage UI patterns.
 */

import { AlertCircle, RefreshCw } from 'lucide-react';
import { PageHeader } from '../ui/PageHeader';
import { Card, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import {
  DashboardPluginProvider,
  DashboardLayout,
  registerCorePlugins,
  useDashboardPluginContext,
} from '../features/plugins/dashboard';

// Register core plugins on module load
registerCorePlugins();

/**
 * Error banner component for dashboard-level errors
 * Matches the error state patterns used in ContactsPage
 */
function DashboardErrorBanner(): JSX.Element | null {
  const { hasError, refetchAll } = useDashboardPluginContext();

  if (!hasError) {
    return null;
  }

  return (
    <Card className="mb-8 border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/20">
      <CardBody>
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/50 flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-rose-900 dark:text-rose-100 mb-1">
              Failed to load dashboard data
            </h3>
            <p className="text-sm text-rose-700 dark:text-rose-300 mb-3">
              There was a problem loading some of your data. Please try again.
            </p>
            <Button variant="secondary" size="sm" onClick={refetchAll}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

/**
 * Inner dashboard content using plugin system
 */
function DashboardContent(): JSX.Element {
  return (
    <>
      <DashboardErrorBanner />
      <DashboardLayout />
    </>
  );
}

/**
 * Main Dashboard Page Component
 *
 * Renders a modular dashboard with plugin-based panels:
 * - Summary cards: Active accounts, active projects, open tasks, overdue tasks
 * - Main content: Upcoming tasks and recent projects
 *
 * UI patterns match ContactsPage for consistency:
 * - Stats cards with icons and colored backgrounds
 * - Table-style layouts for lists
 * - Skeleton loaders for loading states
 * - Empty states with icons and CTAs
 * - Full dark mode support
 *
 * The dashboard uses a plugin architecture allowing new panels to be added
 * without modifying this component. See features/plugins/dashboard for details.
 */
function DashboardPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="Dashboard"
        description="Welcome to your AI Consulting PMO workspace. Track your clients, projects, tasks, and AI assets."
      />

      <div className="page-content">
        <DashboardPluginProvider>
          <DashboardContent />
        </DashboardPluginProvider>
      </div>
    </div>
  );
}

export default DashboardPage;
