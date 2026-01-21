/**
 * Infrastructure Routes
 *
 * Infrastructure and compliance module routes:
 * - Core Infrastructure (INF.1)
 * - AI/ML Infrastructure (INF.2)
 * - IoT Infrastructure (INF.3)
 * - Healthcare Compliance (COMP.1)
 * - Financial Compliance (COMP.2)
 * - General Compliance (COMP.3)
 */

import { lazy } from 'react';
import { Route } from 'react-router';
import { LazyPage } from './components';

// Infrastructure pages
const CoreInfrastructurePage = lazy(
  () => import('../pages/infrastructure/CoreInfrastructurePage'),
);
const AiMlInfrastructurePage = lazy(
  () => import('../pages/infrastructure/AiMlInfrastructurePage'),
);
const IotInfrastructurePage = lazy(
  () => import('../pages/infrastructure/IotInfrastructurePage'),
);

// Compliance pages
const HealthcareCompliancePage = lazy(
  () => import('../pages/infrastructure/HealthcareCompliancePage'),
);
const FinancialCompliancePage = lazy(
  () => import('../pages/infrastructure/FinancialCompliancePage'),
);
const GeneralCompliancePage = lazy(
  () => import('../pages/infrastructure/GeneralCompliancePage'),
);

interface InfrastructureRoutesProps {
  isModuleEnabled: (moduleId: string) => boolean;
}

/**
 * Infrastructure and compliance module routes
 */
export function infrastructureRoutes({
  isModuleEnabled,
}: InfrastructureRoutesProps): JSX.Element {
  return (
    <>
      {/* Core Infrastructure (INF.1) */}
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

      {/* AI/ML Infrastructure (INF.2) */}
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

      {/* IoT Infrastructure (INF.3) */}
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

      {/* Healthcare Compliance (COMP.1) */}
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

      {/* Financial Compliance (COMP.2) */}
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

      {/* General Compliance (COMP.3) */}
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
    </>
  );
}
