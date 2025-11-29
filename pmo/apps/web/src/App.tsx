import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, Outlet } from 'react-router-dom';
import ProtectedRoute from './auth/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import { ClientProjectProvider } from './pages/ClientProjectContext';
import { useModules } from './modules';

// Core pages (always loaded)
import DashboardPage from './pages/DashboardPage';
import ClientsPage from './pages/ClientsPage';
import ClientDetailsPage from './pages/ClientDetailsPage';
import ClientIntakePage from './pages/ClientIntakePage';
import ProjectSetupPage from './pages/ProjectSetupPage';
import ProjectDashboardPage from './pages/ProjectDashboardPage';
import LoginPage from './pages/LoginPage';
import MyTasksPage from './pages/MyTasksPage';
import MeetingDetailPage from './features/meetings/MeetingDetailPage';

// Lazy-loaded optional module pages
const AssetsPage = lazy(() => import('./pages/AssetsPage'));
const MarketingContentPage = lazy(() => import('./pages/MarketingContentPage'));
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
const AdminModulesPage = lazy(() =>
  import('./pages/AdminModulesPage').then((m) => ({
    default: m.AdminModulesPage,
  })),
);

// Phase 1 AI Tools pages
const ChatbotPage = lazy(() => import('./pages/ai-tools/ChatbotPage'));
const ProductDescriptionsPage = lazy(
  () => import('./pages/ai-tools/ProductDescriptionsPage'),
);
const SchedulingPage = lazy(() => import('./pages/ai-tools/SchedulingPage'));
const IntakePage = lazy(() => import('./pages/ai-tools/IntakePage'));

/**
 * Loading fallback for lazy-loaded pages
 */
function PageLoader(): JSX.Element {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-pulse text-neutral-500">Loading...</div>
    </div>
  );
}

/**
 * Wrapper for lazy-loaded pages
 */
function LazyPage({ children }: { children: React.ReactNode }): JSX.Element {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

/**
 * Layout wrapper for authenticated routes
 */
function AuthenticatedLayout(): JSX.Element {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

/**
 * Main App component with conditional routing based on enabled modules
 */
function App(): JSX.Element {
  const { isModuleEnabled } = useModules();

  return (
    <ClientProjectProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes with layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AuthenticatedLayout />}>
            {/* Core routes (always available) */}
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tasks" element={<MyTasksPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/clients/:clientId" element={<ClientDetailsPage />} />
            <Route path="/client-intake" element={<ClientIntakePage />} />
            <Route path="/projects/new" element={<ProjectSetupPage />} />
            <Route path="/projects/:id" element={<ProjectDashboardPage />} />
            <Route path="/meetings/:id" element={<MeetingDetailPage />} />

            {/* Assets module (toggleable) */}
            {isModuleEnabled('assets') && (
              <Route
                path="/assets"
                element={
                  <LazyPage>
                    <AssetsPage />
                  </LazyPage>
                }
              />
            )}

            {/* Marketing module (toggleable) */}
            {isModuleEnabled('marketing') && (
              <Route
                path="/marketing"
                element={
                  <LazyPage>
                    <MarketingContentPage />
                  </LazyPage>
                }
              />
            )}

            {/* Sales module - Leads (toggleable) */}
            {isModuleEnabled('leads') && (
              <Route
                path="/sales/leads"
                element={
                  <LazyPage>
                    <LeadsPage />
                  </LazyPage>
                }
              />
            )}

            {/* Sales module - Pipeline (toggleable) */}
            {isModuleEnabled('pipeline') && (
              <Route
                path="/sales/pipeline"
                element={
                  <LazyPage>
                    <PipelinePage />
                  </LazyPage>
                }
              />
            )}

            {/* Admin module (toggleable) */}
            {isModuleEnabled('admin') && (
              <>
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
              </>
            )}

            {/* AI Chatbot module (Tool 1.1) */}
            {isModuleEnabled('chatbot') && (
              <Route
                path="/ai-tools/chatbot"
                element={
                  <LazyPage>
                    <ChatbotPage />
                  </LazyPage>
                }
              />
            )}

            {/* Product Descriptions module (Tool 1.2) */}
            {isModuleEnabled('productDescriptions') && (
              <Route
                path="/ai-tools/product-descriptions"
                element={
                  <LazyPage>
                    <ProductDescriptionsPage />
                  </LazyPage>
                }
              />
            )}

            {/* AI Scheduling module (Tool 1.3) */}
            {isModuleEnabled('scheduling') && (
              <Route
                path="/ai-tools/scheduling"
                element={
                  <LazyPage>
                    <SchedulingPage />
                  </LazyPage>
                }
              />
            )}

            {/* Client Intake module (Tool 1.4) */}
            {isModuleEnabled('intake') && (
              <Route
                path="/ai-tools/intake"
                element={
                  <LazyPage>
                    <IntakePage />
                  </LazyPage>
                }
              />
            )}
          </Route>
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ClientProjectProvider>
  );
}

export default App;
