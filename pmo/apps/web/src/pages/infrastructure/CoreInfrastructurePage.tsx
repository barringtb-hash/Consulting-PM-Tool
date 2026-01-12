/**
 * Core Infrastructure Page (INF.1)
 *
 * Auth, API gateway, audit logging, and billing management
 * Dependencies: Phase 0.3 (Environment Setup)
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
import { PageHeader } from '../../ui/PageHeader';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import {
  Server,
  Shield,
  Key,
  CreditCard,
  Activity,
  Lock,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Settings,
  RefreshCw,
} from 'lucide-react';

// Types
interface AuthSystemStatus {
  provider: string;
  mfaEnabled: boolean;
  ssoConfigured: boolean;
  activeSessions: number;
  lastLoginAttempt: string;
  status: 'healthy' | 'degraded' | 'down';
}

interface ApiGatewayStatus {
  totalRequests24h: number;
  avgResponseTime: number;
  errorRate: number;
  rateLimitHits: number;
  activeRoutes: number;
  status: 'healthy' | 'degraded' | 'down';
}

interface AuditLogStats {
  totalLogs24h: number;
  criticalEvents: number;
  complianceEvents: number;
  retentionDays: number;
  storageUsedMb: number;
}

interface BillingStatus {
  activeSubscriptions: number;
  mrr: number;
  pendingInvoices: number;
  failedPayments: number;
  paymentProcessor: string;
}

// Mock API functions
async function fetchAuthStatus(): Promise<AuthSystemStatus> {
  // In production, this would call the actual API
  return {
    provider: 'JWT + Cookie',
    mfaEnabled: true,
    ssoConfigured: false,
    activeSessions: 47,
    lastLoginAttempt: new Date().toISOString(),
    status: 'healthy',
  };
}

async function fetchApiGatewayStatus(): Promise<ApiGatewayStatus> {
  return {
    totalRequests24h: 125680,
    avgResponseTime: 145,
    errorRate: 0.12,
    rateLimitHits: 23,
    activeRoutes: 156,
    status: 'healthy',
  };
}

async function fetchAuditLogStats(): Promise<AuditLogStats> {
  return {
    totalLogs24h: 8924,
    criticalEvents: 3,
    complianceEvents: 156,
    retentionDays: 365,
    storageUsedMb: 2340,
  };
}

async function fetchBillingStatus(): Promise<BillingStatus> {
  return {
    activeSubscriptions: 34,
    mrr: 28500,
    pendingInvoices: 5,
    failedPayments: 1,
    paymentProcessor: 'Stripe',
  };
}

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'secondary'> = {
  healthy: 'success',
  degraded: 'warning',
  down: 'secondary',
};

// Skeleton loader for stat cards
function StatCardSkeleton(): JSX.Element {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          </div>
          <div className="h-12 w-12 bg-neutral-200 dark:bg-neutral-700 rounded-full animate-pulse" />
        </div>
      </CardBody>
    </Card>
  );
}

function CoreInfrastructurePage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'auth' | 'api' | 'audit' | 'billing'
  >('overview');

  useRedirectOnUnauthorized();

  // Queries
  const authQuery = useQuery({
    queryKey: ['infrastructure', 'auth-status'],
    queryFn: fetchAuthStatus,
  });

  const apiQuery = useQuery({
    queryKey: ['infrastructure', 'api-gateway-status'],
    queryFn: fetchApiGatewayStatus,
  });

  const auditQuery = useQuery({
    queryKey: ['infrastructure', 'audit-stats'],
    queryFn: fetchAuditLogStats,
  });

  const billingQuery = useQuery({
    queryKey: ['infrastructure', 'billing-status'],
    queryFn: fetchBillingStatus,
  });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

  const isLoading =
    authQuery.isLoading ||
    apiQuery.isLoading ||
    auditQuery.isLoading ||
    billingQuery.isLoading;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="Core Infrastructure"
        description="INF.1 - Authentication, API Gateway, Audit Logging, and Billing"
        icon={Server}
        actions={
          <Button variant="secondary">
            <Settings className="mr-2 h-4 w-4" />
            Configure
          </Button>
        }
      />

      <div className="page-content space-y-6">
        {/* Status Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <Card>
                <CardBody>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Authentication
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={
                            STATUS_VARIANTS[authQuery.data?.status || 'down']
                          }
                        >
                          {authQuery.data?.status || 'loading'}
                        </Badge>
                      </div>
                      <p className="text-lg font-semibold mt-1 text-neutral-900 dark:text-neutral-100">
                        {authQuery.data?.activeSessions || 0} sessions
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/50">
                      <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        API Gateway
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant={
                            STATUS_VARIANTS[apiQuery.data?.status || 'down']
                          }
                        >
                          {apiQuery.data?.status || 'loading'}
                        </Badge>
                      </div>
                      <p className="text-lg font-semibold mt-1 text-neutral-900 dark:text-neutral-100">
                        {apiQuery.data?.avgResponseTime || 0}ms avg
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/50">
                      <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Audit Logs (24h)
                      </p>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {auditQuery.data?.totalLogs24h?.toLocaleString() || 0}
                      </p>
                      <p className="text-sm text-orange-500">
                        {auditQuery.data?.criticalEvents || 0} critical
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/50">
                      <FileText className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        Monthly Revenue
                      </p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-500">
                        {formatCurrency(billingQuery.data?.mrr || 0)}
                      </p>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {billingQuery.data?.activeSubscriptions || 0}{' '}
                        subscriptions
                      </p>
                    </div>
                    <div className="p-3 rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                      <CreditCard className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                </CardBody>
              </Card>
            </>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-neutral-200 dark:border-neutral-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Server },
              { id: 'auth', label: 'Authentication', icon: Key },
              { id: 'api', label: 'API Gateway', icon: Activity },
              { id: 'audit', label: 'Audit Logging', icon: FileText },
              { id: 'billing', label: 'Billing', icon: CreditCard },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Infrastructure Checklist
                </h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  {[
                    { label: 'User Authentication System', done: true },
                    { label: 'Role-Based Access Control (RBAC)', done: true },
                    { label: 'MFA Support', done: true },
                    { label: 'SSO Integration', done: false },
                    { label: 'API Rate Limiting', done: true },
                    { label: 'API Versioning', done: true },
                    { label: 'Request/Response Logging', done: true },
                    { label: 'Immutable Audit Trail', done: true },
                    { label: 'Stripe Integration', done: true },
                    { label: 'Subscription Management', done: true },
                    { label: 'Usage-Based Billing', done: false },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700 last:border-0"
                    >
                      <span
                        className={
                          item.done
                            ? 'text-neutral-900 dark:text-neutral-100'
                            : 'text-neutral-500 dark:text-neutral-400'
                        }
                      >
                        {item.label}
                      </span>
                      {item.done ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-neutral-400 dark:text-neutral-500" />
                      )}
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  System Health
                </h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  {[
                    {
                      name: 'Auth Service',
                      status: 'healthy',
                      uptime: '99.99%',
                    },
                    {
                      name: 'API Gateway',
                      status: 'healthy',
                      uptime: '99.95%',
                    },
                    { name: 'Audit Logger', status: 'healthy', uptime: '100%' },
                    {
                      name: 'Payment Processor',
                      status: 'healthy',
                      uptime: '99.99%',
                    },
                    { name: 'Database', status: 'healthy', uptime: '99.99%' },
                  ].map((service, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            service.status === 'healthy'
                              ? 'bg-green-500'
                              : service.status === 'degraded'
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }`}
                        />
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">
                          {service.name}
                        </span>
                      </div>
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {service.uptime}
                      </span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Authentication Tab */}
        {activeTab === 'auth' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Authentication Configuration
                </h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-neutral-200 dark:border-neutral-700">
                    <span className="text-neutral-600 dark:text-neutral-400">
                      Authentication Provider
                    </span>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {authQuery.data?.provider}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-neutral-200 dark:border-neutral-700">
                    <span className="text-neutral-600 dark:text-neutral-400">
                      MFA Status
                    </span>
                    <Badge
                      variant={
                        authQuery.data?.mfaEnabled ? 'success' : 'warning'
                      }
                    >
                      {authQuery.data?.mfaEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-neutral-200 dark:border-neutral-700">
                    <span className="text-neutral-600 dark:text-neutral-400">
                      SSO Integration
                    </span>
                    <Badge
                      variant={
                        authQuery.data?.ssoConfigured ? 'success' : 'neutral'
                      }
                    >
                      {authQuery.data?.ssoConfigured
                        ? 'Configured'
                        : 'Not Configured'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-neutral-600 dark:text-neutral-400">
                      Active Sessions
                    </span>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {authQuery.data?.activeSessions}
                    </span>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Security Features
                </h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  {[
                    { feature: 'Password Hashing (bcrypt)', enabled: true },
                    { feature: 'Session Timeout (30 min)', enabled: true },
                    { feature: 'Account Lockout Policy', enabled: true },
                    { feature: 'IP Rate Limiting', enabled: true },
                    { feature: 'Brute Force Protection', enabled: true },
                    { feature: 'OAuth 2.0 Support', enabled: false },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="flex items-center gap-2">
                        {item.enabled ? (
                          <Lock className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
                        )}
                        <span className="text-neutral-900 dark:text-neutral-100">
                          {item.feature}
                        </span>
                      </div>
                      <Badge variant={item.enabled ? 'success' : 'neutral'}>
                        {item.enabled ? 'Active' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* API Gateway Tab */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardBody>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Requests (24h)
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {apiQuery.data?.totalRequests24h?.toLocaleString()}
                  </p>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Avg Response Time
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {apiQuery.data?.avgResponseTime}ms
                  </p>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Error Rate
                  </p>
                  <p className="text-2xl font-bold text-red-500">
                    {apiQuery.data?.errorRate}%
                  </p>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Active Routes
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {apiQuery.data?.activeRoutes}
                  </p>
                </CardBody>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    API Gateway Features
                  </h3>
                  <Button variant="secondary" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      name: 'Rate Limiting',
                      status: 'active',
                      hits: apiQuery.data?.rateLimitHits,
                    },
                    {
                      name: 'Request Validation',
                      status: 'active',
                      hits: null,
                    },
                    { name: 'Response Caching', status: 'active', hits: null },
                    {
                      name: 'CORS Configuration',
                      status: 'active',
                      hits: null,
                    },
                    { name: 'API Versioning', status: 'active', hits: null },
                    {
                      name: 'Swagger Documentation',
                      status: 'active',
                      hits: null,
                    },
                  ].map((feature, idx) => (
                    <div
                      key={idx}
                      className="p-4 border border-neutral-200 dark:border-neutral-700 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">
                          {feature.name}
                        </p>
                        {feature.hits !== null && (
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            {feature.hits} rate limit hits (24h)
                          </p>
                        )}
                      </div>
                      <Badge variant="success">{feature.status}</Badge>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Audit Logging Tab */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardBody>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Total Logs (24h)
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {auditQuery.data?.totalLogs24h?.toLocaleString()}
                  </p>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Critical Events
                  </p>
                  <p className="text-2xl font-bold text-red-500">
                    {auditQuery.data?.criticalEvents}
                  </p>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Compliance Events
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {auditQuery.data?.complianceEvents}
                  </p>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Retention Period
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {auditQuery.data?.retentionDays} days
                  </p>
                </CardBody>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Audit Log Configuration
                </h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  {[
                    { name: 'User Authentication Events', enabled: true },
                    { name: 'Data Access Logging', enabled: true },
                    { name: 'Configuration Changes', enabled: true },
                    { name: 'API Request Logging', enabled: true },
                    { name: 'Compliance Events (HIPAA/SOX)', enabled: true },
                    { name: 'Immutable Storage', enabled: true },
                    { name: 'Export to SIEM', enabled: false },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700 last:border-0"
                    >
                      <span className="text-neutral-900 dark:text-neutral-100">
                        {item.name}
                      </span>
                      <Badge variant={item.enabled ? 'success' : 'neutral'}>
                        {item.enabled ? 'Enabled' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Billing Tab */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardBody>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Active Subscriptions
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {billingQuery.data?.activeSubscriptions}
                  </p>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Monthly Revenue
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-500">
                    {formatCurrency(billingQuery.data?.mrr || 0)}
                  </p>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Pending Invoices
                  </p>
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {billingQuery.data?.pendingInvoices}
                  </p>
                </CardBody>
              </Card>
              <Card>
                <CardBody>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Failed Payments
                  </p>
                  <p className="text-2xl font-bold text-red-500">
                    {billingQuery.data?.failedPayments}
                  </p>
                </CardBody>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Billing Configuration
                </h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-neutral-200 dark:border-neutral-700">
                    <span className="text-neutral-600 dark:text-neutral-400">
                      Payment Processor
                    </span>
                    <span className="font-medium text-neutral-900 dark:text-neutral-100">
                      {billingQuery.data?.paymentProcessor}
                    </span>
                  </div>
                  {[
                    { name: 'Subscription Management', enabled: true },
                    { name: 'Invoice Generation', enabled: true },
                    { name: 'Usage-Based Billing', enabled: false },
                    { name: 'Payment History', enabled: true },
                    { name: 'Dunning Management', enabled: false },
                    { name: 'Tax Calculation', enabled: true },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-700 last:border-0"
                    >
                      <span className="text-neutral-900 dark:text-neutral-100">
                        {item.name}
                      </span>
                      <Badge variant={item.enabled ? 'success' : 'neutral'}>
                        {item.enabled ? 'Active' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default CoreInfrastructurePage;
