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
import ProjectsPage from './pages/ProjectsPage';
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

// Phase 2 AI Tools pages
const DocumentAnalyzerPage = lazy(
  () => import('./pages/ai-tools/DocumentAnalyzerPage'),
);
const ContentGeneratorPage = lazy(
  () => import('./pages/ai-tools/ContentGeneratorPage'),
);
const LeadScoringPage = lazy(() => import('./pages/ai-tools/LeadScoringPage'));
const PriorAuthPage = lazy(() => import('./pages/ai-tools/PriorAuthPage'));

// Phase 3 AI Tools pages
const InventoryForecastingPage = lazy(
  () => import('./pages/ai-tools/InventoryForecastingPage'),
);
const ComplianceMonitorPage = lazy(
  () => import('./pages/ai-tools/ComplianceMonitorPage'),
);
const PredictiveMaintenancePage = lazy(
  () => import('./pages/ai-tools/PredictiveMaintenancePage'),
);
const RevenueManagementPage = lazy(
  () => import('./pages/ai-tools/RevenueManagementPage'),
);
const SafetyMonitorPage = lazy(
  () => import('./pages/ai-tools/SafetyMonitorPage'),
);

// Infrastructure pages (INF.1, INF.2, INF.3)
const CoreInfrastructurePage = lazy(
  () => import('./pages/infrastructure/CoreInfrastructurePage'),
);
const AiMlInfrastructurePage = lazy(
  () => import('./pages/infrastructure/AiMlInfrastructurePage'),
);
const IotInfrastructurePage = lazy(
  () => import('./pages/infrastructure/IotInfrastructurePage'),
);

// Compliance pages (COMP.1, COMP.2, COMP.3)
const HealthcareCompliancePage = lazy(
  () => import('./pages/infrastructure/HealthcareCompliancePage'),
);
const FinancialCompliancePage = lazy(
  () => import('./pages/infrastructure/FinancialCompliancePage'),
);
const GeneralCompliancePage = lazy(
  () => import('./pages/infrastructure/GeneralCompliancePage'),
);

// Demo pages
const AIToolsShowcasePage = lazy(
  () => import('./pages/demo/AIToolsShowcasePage'),
);
const MarketingDemoPage = lazy(() => import('./pages/demo/MarketingDemoPage'));

// Customer Success pages
const CustomerSuccessDashboardPage = lazy(
  () => import('./pages/customer-success/CustomerSuccessDashboardPage'),
);
const CustomerSuccessAnalyticsPage = lazy(
  () => import('./pages/customer-success/CustomerSuccessAnalyticsPage'),
);

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
            <Route path="/projects" element={<ProjectsPage />} />
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

            {/* Document Analyzer module (Tool 2.1) */}
            {isModuleEnabled('documentAnalyzer') && (
              <Route
                path="/ai-tools/document-analyzer"
                element={
                  <LazyPage>
                    <DocumentAnalyzerPage />
                  </LazyPage>
                }
              />
            )}

            {/* Content Generator module (Tool 2.2) */}
            {isModuleEnabled('contentGenerator') && (
              <Route
                path="/ai-tools/content-generator"
                element={
                  <LazyPage>
                    <ContentGeneratorPage />
                  </LazyPage>
                }
              />
            )}

            {/* Lead Scoring module (Tool 2.3) */}
            {isModuleEnabled('leadScoring') && (
              <Route
                path="/ai-tools/lead-scoring"
                element={
                  <LazyPage>
                    <LeadScoringPage />
                  </LazyPage>
                }
              />
            )}

            {/* Prior Authorization module (Tool 2.4) */}
            {isModuleEnabled('priorAuth') && (
              <Route
                path="/ai-tools/prior-auth"
                element={
                  <LazyPage>
                    <PriorAuthPage />
                  </LazyPage>
                }
              />
            )}

            {/* Inventory Forecasting module (Tool 3.1) */}
            {isModuleEnabled('inventoryForecasting') && (
              <Route
                path="/ai-tools/inventory-forecasting"
                element={
                  <LazyPage>
                    <InventoryForecastingPage />
                  </LazyPage>
                }
              />
            )}

            {/* Compliance Monitor module (Tool 3.2) */}
            {isModuleEnabled('complianceMonitor') && (
              <Route
                path="/ai-tools/compliance-monitor"
                element={
                  <LazyPage>
                    <ComplianceMonitorPage />
                  </LazyPage>
                }
              />
            )}

            {/* Predictive Maintenance module (Tool 3.3) */}
            {isModuleEnabled('predictiveMaintenance') && (
              <Route
                path="/ai-tools/predictive-maintenance"
                element={
                  <LazyPage>
                    <PredictiveMaintenancePage />
                  </LazyPage>
                }
              />
            )}

            {/* Revenue Management module (Tool 3.4) */}
            {isModuleEnabled('revenueManagement') && (
              <Route
                path="/ai-tools/revenue-management"
                element={
                  <LazyPage>
                    <RevenueManagementPage />
                  </LazyPage>
                }
              />
            )}

            {/* Safety Monitor module (Tool 3.5) */}
            {isModuleEnabled('safetyMonitor') && (
              <Route
                path="/ai-tools/safety-monitor"
                element={
                  <LazyPage>
                    <SafetyMonitorPage />
                  </LazyPage>
                }
              />
            )}

            {/* Core Infrastructure module (INF.1) */}
            {isModuleEnabled('coreInfrastructure') && (
              <Route
                path="/infrastructure/core"
                element={
                  <LazyPage>
                    <CoreInfrastructurePage />
                  </LazyPage>
                }
              />
            )}

            {/* AI/ML Infrastructure module (INF.2) */}
            {isModuleEnabled('aiMlInfrastructure') && (
              <Route
                path="/infrastructure/ai-ml"
                element={
                  <LazyPage>
                    <AiMlInfrastructurePage />
                  </LazyPage>
                }
              />
            )}

            {/* IoT Infrastructure module (INF.3) */}
            {isModuleEnabled('iotInfrastructure') && (
              <Route
                path="/infrastructure/iot"
                element={
                  <LazyPage>
                    <IotInfrastructurePage />
                  </LazyPage>
                }
              />
            )}

            {/* Healthcare Compliance module (COMP.1) */}
            {isModuleEnabled('healthcareCompliance') && (
              <Route
                path="/compliance/healthcare"
                element={
                  <LazyPage>
                    <HealthcareCompliancePage />
                  </LazyPage>
                }
              />
            )}

            {/* Financial Compliance module (COMP.2) */}
            {isModuleEnabled('financialCompliance') && (
              <Route
                path="/compliance/financial"
                element={
                  <LazyPage>
                    <FinancialCompliancePage />
                  </LazyPage>
                }
              />
            )}

            {/* General Compliance module (COMP.3) */}
            {isModuleEnabled('generalCompliance') && (
              <Route
                path="/compliance/general"
                element={
                  <LazyPage>
                    <GeneralCompliancePage />
                  </LazyPage>
                }
              />
            )}

            {/* Demo AI Tools Showcase */}
            {isModuleEnabled('demoAITools') && (
              <Route
                path="/demo/ai-tools"
                element={
                  <LazyPage>
                    <AIToolsShowcasePage />
                  </LazyPage>
                }
              />
            )}

            {/* Demo Marketing Page */}
            {isModuleEnabled('demoMarketing') && (
              <Route
                path="/demo/marketing"
                element={
                  <LazyPage>
                    <MarketingDemoPage />
                  </LazyPage>
                }
              />
            )}

            {/* Customer Success module */}
            {isModuleEnabled('customerSuccess') && (
              <>
                <Route
                  path="/customer-success"
                  element={
                    <LazyPage>
                      <CustomerSuccessDashboardPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="/customer-success/dashboard"
                  element={
                    <LazyPage>
                      <CustomerSuccessDashboardPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="/customer-success/analytics"
                  element={
                    <LazyPage>
                      <CustomerSuccessAnalyticsPage />
                    </LazyPage>
                  }
                />
              </>
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
