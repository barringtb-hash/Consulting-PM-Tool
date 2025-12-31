/**
 * Dashboard Page
 *
 * Main dashboard with modular plugin-based panels. Uses the dashboard plugin
 * architecture for extensibility while maintaining a clean, consistent UI.
 */

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
 */
function DashboardErrorBanner(): JSX.Element | null {
  const { hasError, refetchAll } = useDashboardPluginContext();

  if (!hasError) {
    return null;
  }

  return (
    <Card className="mb-8 border-danger-200 dark:border-danger-800 bg-danger-50 dark:bg-danger-900/20">
      <CardBody>
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-danger-600 dark:text-danger-400 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="font-semibold text-danger-900 dark:text-danger-100 mb-1">
              Failed to load dashboard data
            </h3>
            <p className="text-sm text-danger-700 dark:text-danger-300 mb-3">
              There was a problem loading some of your data. Please try again.
            </p>
            <Button variant="secondary" size="sm" onClick={refetchAll}>
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
 * - Summary cards: Active clients, active projects, open tasks, overdue tasks
 * - Main content: Upcoming tasks and recent projects
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

      <div className="container-padding py-6">
        <DashboardPluginProvider>
          <DashboardContent />
        </DashboardPluginProvider>
      </div>
    </div>
  );
}

export default DashboardPage;
