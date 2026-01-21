/**
 * AI Tools Routes
 *
 * AI-powered tool routes organized by phase:
 * - Phase 1: Chatbot, Product Descriptions, Scheduling, Intake
 * - Phase 2: Document Analyzer, Content Generator, Lead Scoring, Prior Auth
 * - Phase 3: Inventory, Compliance, Maintenance, Revenue, Safety
 * - Project Assistant
 */

import { lazy } from 'react';
import { Route } from 'react-router';
import { LazyPage } from './components';

// Phase 1 AI Tools pages
const ChatbotPage = lazy(() => import('../pages/ai-tools/ChatbotPage'));
const ProductDescriptionsPage = lazy(
  () => import('../pages/ai-tools/ProductDescriptionsPage'),
);
const SchedulingPage = lazy(() => import('../pages/ai-tools/SchedulingPage'));
const GoogleCalendarCallback = lazy(() =>
  import('../pages/ai-tools/scheduling/OAuthCallbackPage').then((m) => ({
    default: m.GoogleCalendarCallback,
  })),
);
const OutlookCalendarCallback = lazy(() =>
  import('../pages/ai-tools/scheduling/OAuthCallbackPage').then((m) => ({
    default: m.OutlookCalendarCallback,
  })),
);
const ZoomCallback = lazy(() =>
  import('../pages/ai-tools/scheduling/OAuthCallbackPage').then((m) => ({
    default: m.ZoomCallback,
  })),
);
const GoogleMeetCallback = lazy(() =>
  import('../pages/ai-tools/scheduling/OAuthCallbackPage').then((m) => ({
    default: m.GoogleMeetCallback,
  })),
);
const TeamsCallback = lazy(() =>
  import('../pages/ai-tools/scheduling/OAuthCallbackPage').then((m) => ({
    default: m.TeamsCallback,
  })),
);
const IntakePage = lazy(() => import('../pages/ai-tools/IntakePage'));

// Phase 2 AI Tools pages
const DocumentAnalyzerPage = lazy(
  () => import('../pages/ai-tools/DocumentAnalyzerPage'),
);
const ContentGeneratorPage = lazy(
  () => import('../pages/ai-tools/ContentGeneratorPage'),
);
const LeadScoringPage = lazy(() => import('../pages/ai-tools/LeadScoringPage'));
const PriorAuthPage = lazy(() => import('../pages/ai-tools/PriorAuthPage'));

// Phase 3 AI Tools pages
const InventoryForecastingPage = lazy(
  () => import('../pages/ai-tools/InventoryForecastingPage'),
);
const ComplianceMonitorPage = lazy(
  () => import('../pages/ai-tools/ComplianceMonitorPage'),
);
const PredictiveMaintenancePage = lazy(
  () => import('../pages/ai-tools/PredictiveMaintenancePage'),
);
const RevenueManagementPage = lazy(
  () => import('../pages/ai-tools/RevenueManagementPage'),
);
const SafetyMonitorPage = lazy(
  () => import('../pages/ai-tools/SafetyMonitorPage'),
);

// AI Project Assistant page
const ProjectAssistantPage = lazy(
  () => import('../pages/ai-tools/ProjectAssistantPage'),
);

// Demo pages
const AIToolsShowcasePage = lazy(
  () => import('../pages/demo/AIToolsShowcasePage'),
);

interface AIToolsRoutesProps {
  isModuleEnabled: (moduleId: string) => boolean;
}

/**
 * AI Tools module routes
 */
export function aiToolsRoutes({
  isModuleEnabled,
}: AIToolsRoutesProps): JSX.Element {
  return (
    <>
      {/* Phase 1: AI Chatbot (Tool 1.1) */}
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

      {/* Phase 1: Product Descriptions (Tool 1.2) */}
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

      {/* Phase 1: AI Scheduling (Tool 1.3) */}
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

      {/* Phase 1: Client Intake (Tool 1.4) */}
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

      {/* Phase 2: Document Analyzer (Tool 2.1) */}
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

      {/* Phase 2: Content Generator (Tool 2.2) */}
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

      {/* Phase 2: Lead Scoring (Tool 2.3) */}
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

      {/* Phase 2: Prior Authorization (Tool 2.4) */}
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

      {/* Phase 3: Inventory Forecasting (Tool 3.1) */}
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

      {/* Phase 3: Compliance Monitor (Tool 3.2) */}
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

      {/* Phase 3: Predictive Maintenance (Tool 3.3) */}
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

      {/* Phase 3: Revenue Management (Tool 3.4) */}
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

      {/* Phase 3: Safety Monitor (Tool 3.5) */}
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

      {/* AI Project Assistant */}
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
    </>
  );
}
