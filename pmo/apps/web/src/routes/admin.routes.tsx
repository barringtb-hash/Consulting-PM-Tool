/**
 * Admin Routes
 *
 * Administrative routes (requires admin module):
 * - User management
 * - Module configuration
 * - Tenant management (system admin)
 * - Operations dashboard
 * - Bug tracking
 */

import { lazy } from 'react';
import { Route } from 'react-router';
import { LazyPage } from './components';

// Admin user management pages
const AdminUsersListPage = lazy(() =>
  import('../pages/AdminUsersListPage').then((m) => ({
    default: m.AdminUsersListPage,
  })),
);
const AdminCreateUserPage = lazy(() =>
  import('../pages/AdminCreateUserPage').then((m) => ({
    default: m.AdminCreateUserPage,
  })),
);
const AdminUserEditPage = lazy(() =>
  import('../pages/AdminUserEditPage').then((m) => ({
    default: m.AdminUserEditPage,
  })),
);
const AdminModulesPage = lazy(() =>
  import('../pages/AdminModulesPage').then((m) => ({
    default: m.AdminModulesPage,
  })),
);

// System Admin - Tenant Management pages
const TenantListPage = lazy(() =>
  import('../pages/admin/TenantListPage').then((m) => ({
    default: m.TenantListPage,
  })),
);
const TenantDetailPage = lazy(() =>
  import('../pages/admin/TenantDetailPage').then((m) => ({
    default: m.TenantDetailPage,
  })),
);
const TenantFormPage = lazy(() =>
  import('../pages/admin/TenantFormPage').then((m) => ({
    default: m.TenantFormPage,
  })),
);
const TenantHealthPage = lazy(() =>
  import('../pages/admin/TenantHealthPage').then((m) => ({
    default: m.TenantHealthPage,
  })),
);

// Operations Dashboard pages
const OperationsDashboardPage = lazy(() =>
  import('../pages/operations/OperationsDashboardPage').then((m) => ({
    default: m.OperationsDashboardPage,
  })),
);
const AIUsagePage = lazy(() =>
  import('../pages/operations/AIUsagePage').then((m) => ({
    default: m.AIUsagePage,
  })),
);
const OperationsInfrastructurePage = lazy(() =>
  import('../pages/operations/InfrastructurePage').then((m) => ({
    default: m.InfrastructurePage,
  })),
);
const AnomaliesPage = lazy(() =>
  import('../pages/operations/AnomaliesPage').then((m) => ({
    default: m.AnomaliesPage,
  })),
);
const AlertsPage = lazy(() =>
  import('../pages/operations/AlertsPage').then((m) => ({
    default: m.AlertsPage,
  })),
);
const CostAnalysisPage = lazy(() =>
  import('../pages/operations/CostAnalysisPage').then((m) => ({
    default: m.CostAnalysisPage,
  })),
);
const MonitoringAssistantPage = lazy(() =>
  import('../pages/operations/MonitoringAssistantPage').then((m) => ({
    default: m.MonitoringAssistantPage,
  })),
);

// Bug Tracking pages
const BugTrackingIssuesPage = lazy(
  () => import('../pages/bug-tracking/IssuesPage'),
);
const BugTrackingIssueNewPage = lazy(
  () => import('../pages/bug-tracking/IssueNewPage'),
);
const BugTrackingIssueDetailPage = lazy(
  () => import('../pages/bug-tracking/IssueDetailPage'),
);
const BugTrackingIssueEditPage = lazy(
  () => import('../pages/bug-tracking/IssueEditPage'),
);
const BugTrackingApiKeysPage = lazy(
  () => import('../pages/bug-tracking/ApiKeysTab'),
);

interface AdminRoutesProps {
  isModuleEnabled: (moduleId: string) => boolean;
}

/**
 * Admin module routes
 */
export function adminRoutes({
  isModuleEnabled,
}: AdminRoutesProps): JSX.Element | null {
  if (!isModuleEnabled('admin')) {
    // Only return bug tracking if enabled but admin is not
    if (isModuleEnabled('bugTracking')) {
      return bugTrackingRoutes();
    }
    return null;
  }

  return (
    <>
      {/* User management */}
      <Route
        path="/admin/users"
        element={
          <LazyPage>
            <AdminUsersListPage />
          </LazyPage>
        }
      />
      <Route
        path="/admin/users/new"
        element={
          <LazyPage>
            <AdminCreateUserPage />
          </LazyPage>
        }
      />
      <Route
        path="/admin/users/:id"
        element={
          <LazyPage>
            <AdminUserEditPage />
          </LazyPage>
        }
      />
      <Route
        path="/admin/modules"
        element={
          <LazyPage>
            <AdminModulesPage />
          </LazyPage>
        }
      />

      {/* System Admin - Tenant Management */}
      {isModuleEnabled('tenantAdmin') && (
        <>
          <Route
            path="/admin/tenants"
            element={
              <LazyPage>
                <TenantListPage />
              </LazyPage>
            }
          />
          <Route
            path="/admin/tenants/new"
            element={
              <LazyPage>
                <TenantFormPage />
              </LazyPage>
            }
          />
          <Route
            path="/admin/tenants/:tenantId"
            element={
              <LazyPage>
                <TenantDetailPage />
              </LazyPage>
            }
          />
          <Route
            path="/admin/tenants/:tenantId/edit"
            element={
              <LazyPage>
                <TenantFormPage />
              </LazyPage>
            }
          />
        </>
      )}

      {/* Tenant Health Dashboard */}
      <Route
        path="/admin/health"
        element={
          <LazyPage>
            <TenantHealthPage />
          </LazyPage>
        }
      />

      {/* Operations Dashboard */}
      <Route
        path="/operations"
        element={
          <LazyPage>
            <OperationsDashboardPage />
          </LazyPage>
        }
      />
      <Route
        path="/operations/ai-usage"
        element={
          <LazyPage>
            <AIUsagePage />
          </LazyPage>
        }
      />
      <Route
        path="/operations/infrastructure"
        element={
          <LazyPage>
            <OperationsInfrastructurePage />
          </LazyPage>
        }
      />
      <Route
        path="/operations/anomalies"
        element={
          <LazyPage>
            <AnomaliesPage />
          </LazyPage>
        }
      />
      <Route
        path="/operations/alerts"
        element={
          <LazyPage>
            <AlertsPage />
          </LazyPage>
        }
      />
      <Route
        path="/operations/costs"
        element={
          <LazyPage>
            <CostAnalysisPage />
          </LazyPage>
        }
      />
      <Route
        path="/operations/assistant"
        element={
          <LazyPage>
            <MonitoringAssistantPage />
          </LazyPage>
        }
      />

      {/* Bug Tracking (if enabled) */}
      {isModuleEnabled('bugTracking') && bugTrackingRoutes()}
    </>
  );
}

/**
 * Bug tracking routes (can be standalone if admin is disabled)
 */
function bugTrackingRoutes(): JSX.Element {
  return (
    <>
      <Route
        path="/bug-tracking"
        element={
          <LazyPage>
            <BugTrackingIssuesPage />
          </LazyPage>
        }
      />
      {/* Static routes must come before dynamic :id routes */}
      <Route
        path="/bug-tracking/api-keys"
        element={
          <LazyPage>
            <BugTrackingApiKeysPage />
          </LazyPage>
        }
      />
      <Route
        path="/bug-tracking/new"
        element={
          <LazyPage>
            <BugTrackingIssueNewPage />
          </LazyPage>
        }
      />
      <Route
        path="/bug-tracking/:id"
        element={
          <LazyPage>
            <BugTrackingIssueDetailPage />
          </LazyPage>
        }
      />
      <Route
        path="/bug-tracking/:id/edit"
        element={
          <LazyPage>
            <BugTrackingIssueEditPage />
          </LazyPage>
        }
      />
    </>
  );
}
