import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes, Outlet } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import { ClientProjectProvider } from './pages/ClientProjectContext';
import { FeatureProvider, FeatureGate } from './features';

// Core pages (always loaded)
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import ClientDetailsPage from './pages/ClientDetailsPage';
import ClientIntakePage from './pages/ClientIntakePage';
import ProjectSetupPage from './pages/ProjectSetupPage';
import ProjectDashboardPage from './pages/ProjectDashboardPage';
import MyTasksPage from './pages/MyTasksPage';

// Feature-gated pages (lazy loaded for code splitting)
const AssetsPage = lazy(() => import('./pages/AssetsPage'));
const MarketingContentPage = lazy(() => import('./pages/MarketingContentPage'));
const MeetingDetailPage = lazy(
  () => import('./features/meetings/MeetingDetailPage'),
);
const LeadsPage = lazy(() => import('./pages/LeadsPage'));
const PipelinePage = lazy(() => import('./pages/PipelinePage'));
const AdminUsersListPage = lazy(() =>
  import('./pages/AdminUsersListPage').then((m) => ({
    default: m.AdminUsersListPage,
  })),
);
const AdminCreateUserPage = lazy(() =>
  import('./pages/AdminCreateUserPage').then((m) => ({
    default: m.AdminCreateUserPage,
  })),
);
const AdminUserEditPage = lazy(() =>
  import('./pages/AdminUserEditPage').then((m) => ({
    default: m.AdminUserEditPage,
  })),
);

/**
 * Loading fallback for lazy-loaded components.
 */
function PageLoader(): JSX.Element {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
    </div>
  );
}

/**
 * Wrapper for feature-gated routes that redirects to dashboard if feature is disabled.
 */
function FeatureRoute({
  feature,
  children,
}: {
  feature: 'marketing' | 'sales' | 'aiAssets' | 'meetings' | 'admin';
  children: React.ReactNode;
}): JSX.Element {
  return (
    <FeatureGate
      feature={feature}
      fallback={<Navigate to="/dashboard" replace />}
    >
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </FeatureGate>
  );
}

function AuthenticatedLayout(): JSX.Element {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

function App(): JSX.Element {
  return (
    <FeatureProvider>
      <ClientProjectProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes with layout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AuthenticatedLayout />}>
              {/* ─────────────────────────────────────────────────────────────
                  Core routes (always enabled)
                  ───────────────────────────────────────────────────────────── */}
              <Route path="/" element={<DashboardPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/tasks" element={<MyTasksPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route
                path="/clients/:clientId"
                element={<ClientDetailsPage />}
              />
              <Route path="/client-intake" element={<ClientIntakePage />} />
              <Route path="/projects/new" element={<ProjectSetupPage />} />
              <Route path="/projects/:id" element={<ProjectDashboardPage />} />

              {/* ─────────────────────────────────────────────────────────────
                  Feature-gated routes
                  ───────────────────────────────────────────────────────────── */}

              {/* AI Assets feature */}
              <Route
                path="/assets"
                element={
                  <FeatureRoute feature="aiAssets">
                    <AssetsPage />
                  </FeatureRoute>
                }
              />

              {/* Marketing feature */}
              <Route
                path="/marketing"
                element={
                  <FeatureRoute feature="marketing">
                    <MarketingContentPage />
                  </FeatureRoute>
                }
              />

              {/* Meetings feature */}
              <Route
                path="/meetings/:id"
                element={
                  <FeatureRoute feature="meetings">
                    <MeetingDetailPage />
                  </FeatureRoute>
                }
              />

              {/* Sales feature */}
              <Route
                path="/sales/leads"
                element={
                  <FeatureRoute feature="sales">
                    <LeadsPage />
                  </FeatureRoute>
                }
              />
              <Route
                path="/sales/pipeline"
                element={
                  <FeatureRoute feature="sales">
                    <PipelinePage />
                  </FeatureRoute>
                }
              />

              {/* Admin feature */}
              <Route
                path="/admin/users"
                element={
                  <FeatureRoute feature="admin">
                    <AdminUsersListPage />
                  </FeatureRoute>
                }
              />
              <Route
                path="/admin/users/new"
                element={
                  <FeatureRoute feature="admin">
                    <AdminCreateUserPage />
                  </FeatureRoute>
                }
              />
              <Route
                path="/admin/users/:id"
                element={
                  <FeatureRoute feature="admin">
                    <AdminUserEditPage />
                  </FeatureRoute>
                }
              />
            </Route>
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ClientProjectProvider>
    </FeatureProvider>
  );
}

export default App;
