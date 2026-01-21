/**
 * CRM Routes
 *
 * Customer Relationship Management routes:
 * - Accounts (formerly Clients)
 * - Contacts
 * - Opportunities (formerly Pipeline)
 * - Leads
 */

import { lazy } from 'react';
import { Navigate, Route } from 'react-router';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { LazyPage } from './components';

// CRM pages (lazy-loaded)
const AccountsPage = lazy(() => import('../pages/crm/AccountsPage'));
const AccountDetailPage = lazy(() => import('../pages/crm/AccountDetailPage'));
const CRMOpportunitiesPage = lazy(
  () => import('../pages/crm/OpportunitiesPage'),
);
const OpportunityDetailPage = lazy(
  () => import('../pages/crm/OpportunityDetailPage'),
);
const OpportunityNewPage = lazy(
  () => import('../pages/crm/OpportunityNewPage'),
);
const ContactsPage = lazy(() => import('../pages/crm/ContactsPage'));
const ContactNewPage = lazy(() => import('../pages/crm/ContactNewPage'));
const ContactDetailPage = lazy(() => import('../pages/crm/ContactDetailPage'));

// Leads page (from leads module)
const LeadsPage = lazy(() => import('../pages/LeadsPage'));

interface CRMRoutesProps {
  isModuleEnabled: (moduleId: string) => boolean;
}

/**
 * CRM module routes
 */
export function crmRoutes({ isModuleEnabled }: CRMRoutesProps): JSX.Element {
  return (
    <>
      {/* CRM Leads module (toggleable) */}
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
    </>
  );
}
