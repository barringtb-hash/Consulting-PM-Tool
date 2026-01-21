/**
 * Marketing Routes
 *
 * Marketing and customer success module routes:
 * - Unified Marketing (content, social, calendar)
 * - Customer Success Dashboard
 * - CTAs
 * - Success Plans
 * - Demo pages
 */

import { lazy } from 'react';
import { Navigate, Route } from 'react-router';
import { LazyPage } from './components';

// Marketing pages
const UnifiedMarketingPage = lazy(
  () => import('../pages/UnifiedMarketingPage'),
);

// Customer Success pages
const CustomerSuccessDashboardPage = lazy(
  () => import('../pages/customer-success/CustomerSuccessDashboardPage'),
);
const CustomerSuccessAnalyticsPage = lazy(
  () => import('../pages/customer-success/CustomerSuccessAnalyticsPage'),
);
const CTAFormPage = lazy(() => import('../pages/customer-success/CTAFormPage'));
const CTAsListPage = lazy(
  () => import('../pages/customer-success/CTAsListPage'),
);
const SuccessPlanFormPage = lazy(
  () => import('../pages/customer-success/SuccessPlanFormPage'),
);

// Demo pages
const MarketingDemoPage = lazy(() => import('../pages/demo/MarketingDemoPage'));

interface MarketingRoutesProps {
  isModuleEnabled: (moduleId: string) => boolean;
}

/**
 * Marketing and customer success module routes
 */
export function marketingRoutes({
  isModuleEnabled,
}: MarketingRoutesProps): JSX.Element {
  return (
    <>
      {/* Marketing module (unified with Social Publishing and Content Calendar) */}
      {isModuleEnabled('marketing') && (
        <>
          <Route
            path="/marketing"
            element={
              <LazyPage>
                <UnifiedMarketingPage />
              </LazyPage>
            }
          />
          {/* Social Publishing - redirect to unified Marketing page */}
          <Route
            path="/social-publishing"
            element={<Navigate to="/marketing?tab=social" replace />}
          />
          {/* Content Calendar - redirect to unified Marketing page */}
          <Route
            path="/content-calendar"
            element={<Navigate to="/marketing?tab=calendar" replace />}
          />
        </>
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
    </>
  );
}
