import React, { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, Outlet } from 'react-router';
import ProtectedRoute from './auth/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import { ClientProjectProvider } from './pages/ClientProjectContext';
import { useModules } from './modules';
import { ErrorBoundary } from './components/ErrorBoundary';

// Core pages (always loaded)
import DashboardPage from './pages/DashboardPage';
import NotFoundPage from './pages/NotFoundPage';
// ClientsPage, ClientDetailsPage, ClientIntakePage removed - see CRM Accounts
import ProjectsPage from './pages/ProjectsPage';
import ProjectSetupPage from './pages/ProjectSetupPage';
import ProjectDashboardPage from './pages/ProjectDashboardPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import MyTasksPage from './pages/MyTasksPage';
import MeetingDetailPage from './features/meetings/MeetingDetailPage';

// Lazy-loaded optional module pages
const AssetsPage = lazy(() => import('./pages/AssetsPage'));
const MarketingContentPage = lazy(() => import('./pages/MarketingContentPage'));
const LeadsPage = lazy(() => import('./pages/LeadsPage'));
// PipelinePage removed - now redirects to CRM Opportunities
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

// System Admin - Tenant Management pages
const TenantListPage = lazy(() =>
  import('./pages/admin/TenantListPage').then((m) => ({
    default: m.TenantListPage,
  })),
);
const TenantDetailPage = lazy(() =>
  import('./pages/admin/TenantDetailPage').then((m) => ({
    default: m.TenantDetailPage,
  })),
);
const TenantFormPage = lazy(() =>
  import('./pages/admin/TenantFormPage').then((m) => ({
    default: m.TenantFormPage,
  })),
);
const TenantHealthPage = lazy(() =>
  import('./pages/admin/TenantHealthPage').then((m) => ({
    default: m.TenantHealthPage,
  })),
);

// Operations Dashboard pages (admin only)
const OperationsDashboardPage = lazy(() =>
  import('./pages/operations/OperationsDashboardPage').then((m) => ({
    default: m.OperationsDashboardPage,
  })),
);
const AIUsagePage = lazy(() =>
  import('./pages/operations/AIUsagePage').then((m) => ({
    default: m.AIUsagePage,
  })),
);
const OperationsInfrastructurePage = lazy(() =>
  import('./pages/operations/InfrastructurePage').then((m) => ({
    default: m.InfrastructurePage,
  })),
);
const AnomaliesPage = lazy(() =>
  import('./pages/operations/AnomaliesPage').then((m) => ({
    default: m.AnomaliesPage,
  })),
);
const AlertsPage = lazy(() =>
  import('./pages/operations/AlertsPage').then((m) => ({
    default: m.AlertsPage,
  })),
);
const CostAnalysisPage = lazy(() =>
  import('./pages/operations/CostAnalysisPage').then((m) => ({
    default: m.CostAnalysisPage,
  })),
);
const MonitoringAssistantPage = lazy(() =>
  import('./pages/operations/MonitoringAssistantPage').then((m) => ({
    default: m.MonitoringAssistantPage,
  })),
);

// Public pages (no auth required)
const PublicBookingPage = lazy(
  () => import('./pages/public/PublicBookingPage'),
);
const BookingWidget = lazy(() =>
  import('./pages/public/BookingWidget').then((m) => ({
    default: m.BookingWidget,
  })),
);
const BookingManagementPage = lazy(() =>
  import('./pages/public/BookingManagementPage').then((m) => ({
    default: m.BookingManagementPage,
  })),
);

// Phase 1 AI Tools pages
const ChatbotPage = lazy(() => import('./pages/ai-tools/ChatbotPage'));
const ProductDescriptionsPage = lazy(
  () => import('./pages/ai-tools/ProductDescriptionsPage'),
);
const SchedulingPage = lazy(() => import('./pages/ai-tools/SchedulingPage'));
const GoogleCalendarCallback = lazy(() =>
  import('./pages/ai-tools/scheduling/OAuthCallbackPage').then((m) => ({
    default: m.GoogleCalendarCallback,
  })),
);
const OutlookCalendarCallback = lazy(() =>
  import('./pages/ai-tools/scheduling/OAuthCallbackPage').then((m) => ({
    default: m.OutlookCalendarCallback,
  })),
);
const ZoomCallback = lazy(() =>
  import('./pages/ai-tools/scheduling/OAuthCallbackPage').then((m) => ({
    default: m.ZoomCallback,
  })),
);
const GoogleMeetCallback = lazy(() =>
  import('./pages/ai-tools/scheduling/OAuthCallbackPage').then((m) => ({
    default: m.GoogleMeetCallback,
  })),
);
const TeamsCallback = lazy(() =>
  import('./pages/ai-tools/scheduling/OAuthCallbackPage').then((m) => ({
    default: m.TeamsCallback,
  })),
);
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

// AI Project Assistant page
const ProjectAssistantPage = lazy(
  () => import('./pages/ai-tools/ProjectAssistantPage'),
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
const CTAFormPage = lazy(() => import('./pages/customer-success/CTAFormPage'));
const CTAsListPage = lazy(
  () => import('./pages/customer-success/CTAsListPage'),
);
const SuccessPlanFormPage = lazy(
  () => import('./pages/customer-success/SuccessPlanFormPage'),
);

// CRM pages
const AccountsPage = lazy(() => import('./pages/crm/AccountsPage'));
const AccountDetailPage = lazy(() => import('./pages/crm/AccountDetailPage'));
const CRMOpportunitiesPage = lazy(
  () => import('./pages/crm/OpportunitiesPage'),
);
const OpportunityDetailPage = lazy(
  () => import('./pages/crm/OpportunityDetailPage'),
);
const OpportunityNewPage = lazy(() => import('./pages/crm/OpportunityNewPage'));
const ContactsPage = lazy(() => import('./pages/crm/ContactsPage'));
const ContactNewPage = lazy(() => import('./pages/crm/ContactNewPage'));
const ContactDetailPage = lazy(() => import('./pages/crm/ContactDetailPage'));

// Finance Tracking pages
const FinanceDashboardPage = lazy(
  () => import('./pages/finance/FinanceDashboardPage'),
);
const ExpensesPage = lazy(() => import('./pages/finance/ExpensesPage'));
const ExpenseFormPage = lazy(() => import('./pages/finance/ExpenseFormPage'));
const ExpenseDetailPage = lazy(
  () => import('./pages/finance/ExpenseDetailPage'),
);
const BudgetsPage = lazy(() => import('./pages/finance/BudgetsPage'));
const BudgetFormPage = lazy(() => import('./pages/finance/BudgetFormPage'));
const RecurringCostsPage = lazy(
  () => import('./pages/finance/RecurringCostsPage'),
);
const RecurringCostFormPage = lazy(
  () => import('./pages/finance/RecurringCostFormPage'),
);

// Bug Tracking pages
const BugTrackingIssuesPage = lazy(
  () => import('./pages/bug-tracking/IssuesPage'),
);
const BugTrackingIssueNewPage = lazy(
  () => import('./pages/bug-tracking/IssueNewPage'),
);
const BugTrackingIssueDetailPage = lazy(
  () => import('./pages/bug-tracking/IssueDetailPage'),
);
const BugTrackingIssueEditPage = lazy(
  () => import('./pages/bug-tracking/IssueEditPage'),
);
const BugTrackingApiKeysPage = lazy(
  () => import('./pages/bug-tracking/ApiKeysTab'),
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
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/book/:slug"
          element={
            <Suspense
              fallback={
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              }
            >
              <PublicBookingPage />
            </Suspense>
          }
        />
        <Route
          path="/booking/:slug/widget"
          element={
            <Suspense
              fallback={
                <div className="min-h-screen bg-white flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              }
            >
              <BookingWidget />
            </Suspense>
          }
        />
        <Route
          path="/booking/:slug/manage"
          element={
            <Suspense
              fallback={
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              }
            >
              <BookingManagementPage />
            </Suspense>
          }
        />

        {/* Protected routes with layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AuthenticatedLayout />}>
            {/* Core routes (always available) */}
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/tasks" element={<MyTasksPage />} />
            {/* Legacy /clients and /client-intake redirect to CRM Accounts */}
            <Route
              path="/clients"
              element={<Navigate to="/crm/accounts" replace />}
            />
            <Route
              path="/clients/:clientId"
              element={<Navigate to="/crm/accounts" replace />}
            />
            <Route
              path="/client-intake"
              element={<Navigate to="/crm/accounts" replace />}
            />
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

            {/* CRM module - Inbound Leads (toggleable) */}
            {isModuleEnabled('leads') && (
              <>
                <Route
                  path="/crm/leads"
                  element={
                    <LazyPage>
                      <LeadsPage />
                    </LazyPage>
                  }
                />
                {/* Legacy redirect */}
                <Route
                  path="/sales/leads"
                  element={<Navigate to="/crm/leads" replace />}
                />
              </>
            )}

            {/* Legacy Pipeline redirects to CRM Opportunities */}
            {isModuleEnabled('pipeline') && (
              <Route
                path="/sales/pipeline"
                element={<Navigate to="/crm/opportunities" replace />}
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
                {/* Tenant Health Dashboard - available to tenant admins */}
                <Route
                  path="/admin/health"
                  element={
                    <LazyPage>
                      <TenantHealthPage />
                    </LazyPage>
                  }
                />

                {/* Operations Dashboard - AI & Infrastructure Monitoring */}
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
              <>
                <Route
                  path="/ai-tools/scheduling"
                  element={
                    <LazyPage>
                      <SchedulingPage />
                    </LazyPage>
                  }
                />
                {/* OAuth Callback Routes for Scheduling Integrations */}
                <Route
                  path="/ai-tools/scheduling/callback/google-calendar"
                  element={
                    <LazyPage>
                      <GoogleCalendarCallback />
                    </LazyPage>
                  }
                />
                <Route
                  path="/ai-tools/scheduling/callback/outlook-calendar"
                  element={
                    <LazyPage>
                      <OutlookCalendarCallback />
                    </LazyPage>
                  }
                />
                <Route
                  path="/ai-tools/scheduling/callback/zoom"
                  element={
                    <LazyPage>
                      <ZoomCallback />
                    </LazyPage>
                  }
                />
                <Route
                  path="/ai-tools/scheduling/callback/google-meet"
                  element={
                    <LazyPage>
                      <GoogleMeetCallback />
                    </LazyPage>
                  }
                />
                <Route
                  path="/ai-tools/scheduling/callback/teams"
                  element={
                    <LazyPage>
                      <TeamsCallback />
                    </LazyPage>
                  }
                />
              </>
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

            {/* AI Project Assistant module */}
            {isModuleEnabled('aiProjects') && (
              <Route
                path="/ai-tools/project-assistant"
                element={
                  <LazyPage>
                    <ProjectAssistantPage />
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
                <Route
                  path="/customer-success/ctas"
                  element={
                    <LazyPage>
                      <CTAsListPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="/customer-success/ctas/new"
                  element={
                    <LazyPage>
                      <CTAFormPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="/customer-success/success-plans/new"
                  element={
                    <LazyPage>
                      <SuccessPlanFormPage />
                    </LazyPage>
                  }
                />
              </>
            )}

            {/* Finance Tracking module (admin only) */}
            {isModuleEnabled('financeTracking') && (
              <>
                <Route
                  path="/finance"
                  element={
                    <LazyPage>
                      <FinanceDashboardPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="/finance/expenses"
                  element={
                    <LazyPage>
                      <ExpensesPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="/finance/expenses/new"
                  element={
                    <LazyPage>
                      <ExpenseFormPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="/finance/expenses/:id"
                  element={
                    <LazyPage>
                      <ExpenseDetailPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="/finance/expenses/:id/edit"
                  element={
                    <LazyPage>
                      <ExpenseFormPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="/finance/budgets"
                  element={
                    <LazyPage>
                      <BudgetsPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="/finance/budgets/new"
                  element={
                    <LazyPage>
                      <BudgetFormPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="/finance/budgets/:id"
                  element={
                    <LazyPage>
                      <BudgetFormPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="/finance/budgets/:id/edit"
                  element={
                    <LazyPage>
                      <BudgetFormPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="/finance/recurring-costs"
                  element={
                    <LazyPage>
                      <RecurringCostsPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="/finance/recurring-costs/new"
                  element={
                    <LazyPage>
                      <RecurringCostFormPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="/finance/recurring-costs/:id"
                  element={
                    <LazyPage>
                      <RecurringCostFormPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="/finance/recurring-costs/:id/edit"
                  element={
                    <LazyPage>
                      <RecurringCostFormPage />
                    </LazyPage>
                  }
                />
              </>
            )}

            {/* Bug Tracking module */}
            {isModuleEnabled('bugTracking') && (
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
            )}

            {/* CRM module - wrapped with ErrorBoundary for graceful error handling */}
            {isModuleEnabled('crm') && (
              <>
                <Route
                  path="/crm/accounts"
                  element={
                    <ErrorBoundary>
                      <LazyPage>
                        <AccountsPage />
                      </LazyPage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/crm/accounts/:accountId"
                  element={
                    <ErrorBoundary>
                      <LazyPage>
                        <AccountDetailPage />
                      </LazyPage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/crm/opportunities"
                  element={
                    <ErrorBoundary>
                      <LazyPage>
                        <CRMOpportunitiesPage />
                      </LazyPage>
                    </ErrorBoundary>
                  }
                />
                {/* Static routes must come before dynamic :opportunityId route */}
                <Route
                  path="/crm/opportunities/new"
                  element={
                    <ErrorBoundary>
                      <LazyPage>
                        <OpportunityNewPage />
                      </LazyPage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/crm/opportunities/:opportunityId"
                  element={
                    <ErrorBoundary>
                      <LazyPage>
                        <OpportunityDetailPage />
                      </LazyPage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/crm/contacts"
                  element={
                    <ErrorBoundary>
                      <LazyPage>
                        <ContactsPage />
                      </LazyPage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/crm/contacts/new"
                  element={
                    <ErrorBoundary>
                      <LazyPage>
                        <ContactNewPage />
                      </LazyPage>
                    </ErrorBoundary>
                  }
                />
                <Route
                  path="/crm/contacts/:id"
                  element={
                    <ErrorBoundary>
                      <LazyPage>
                        <ContactDetailPage />
                      </LazyPage>
                    </ErrorBoundary>
                  }
                />
              </>
            )}
          </Route>
        </Route>

        {/* 404 Not Found - catch-all route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </ClientProjectProvider>
  );
}

export default App;
