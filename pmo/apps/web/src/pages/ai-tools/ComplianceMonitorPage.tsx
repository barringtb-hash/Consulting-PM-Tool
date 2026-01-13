/**
 * Compliance Monitor Page
 *
 * Tool 3.2: Real-time compliance monitoring with rule engine,
 * risk scoring, and regulatory reporting for HIPAA, SOX, GDPR, PCI
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
import { buildOptions, ApiError } from '../../api/http';
import { buildApiUrl } from '../../api/config';
import { PageHeader } from '../../ui/PageHeader';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Select } from '../../ui/Select';
import { Badge } from '../../ui/Badge';
import { useToast } from '../../ui/Toast';
import { useAccounts } from '../../api/hooks/crm';
import {
  Scale,
  Settings,
  Plus,
  Shield,
  AlertTriangle,
  FileText,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';

// Types
interface ComplianceConfig {
  id: number;
  clientId: number;
  frameworks: string[];
  autoScanEnabled: boolean;
  scanFrequencyHours: number;
  riskThreshold: number;
  isActive: boolean;
  client?: { id: number; name: string };
}

interface ComplianceRule {
  id: number;
  framework: string;
  code: string;
  name: string;
  description: string | null;
  severity: string;
  isActive: boolean;
}

interface ComplianceViolation {
  id: number;
  ruleCode: string;
  ruleName: string;
  severity: string;
  status: string;
  detectedAt: string;
  resolvedAt: string | null;
}

interface ComplianceAudit {
  id: number;
  type: string;
  status: string;
  score: number | null;
  findings: number;
  startedAt: string;
  completedAt: string | null;
}

const SEVERITY_VARIANTS: Record<
  string,
  'primary' | 'success' | 'warning' | 'neutral' | 'secondary'
> = {
  CRITICAL: 'secondary',
  HIGH: 'warning',
  MEDIUM: 'primary',
  LOW: 'neutral',
};

const STATUS_VARIANTS: Record<
  string,
  'primary' | 'success' | 'warning' | 'neutral' | 'secondary'
> = {
  OPEN: 'secondary',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
  ACCEPTED: 'neutral',
};

// Skeleton loader for stats cards (available for future overview loading states)
function _StatCardSkeleton(): JSX.Element {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
            <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          </div>
          <div className="h-8 w-8 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>
      </CardBody>
    </Card>
  );
}

// Skeleton loader for table rows
function TableRowSkeleton(): JSX.Element {
  return (
    <tr className="border-b border-neutral-200 dark:border-neutral-700">
      <td className="px-6 py-4">
        <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
      <td className="px-6 py-4">
        <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
      <td className="px-6 py-4">
        <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
      <td className="px-6 py-4">
        <div className="h-5 w-5 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
    </tr>
  );
}

// Skeleton loader for violation cards
function ViolationSkeleton(): JSX.Element {
  return (
    <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          </div>
          <div className="h-4 w-48 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
          <div className="h-3 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>
        <div className="h-6 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </div>
    </div>
  );
}

// API functions
async function fetchComplianceConfigs(): Promise<ComplianceConfig[]> {
  const res = await fetch(
    buildApiUrl('/compliance-monitor/configs'),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch compliance configs') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.configs || [];
}

async function fetchRules(configId: number): Promise<ComplianceRule[]> {
  const res = await fetch(
    buildApiUrl(`/compliance-monitor/${configId}/rules`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch rules') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.rules || [];
}

async function fetchViolations(
  configId: number,
): Promise<ComplianceViolation[]> {
  const res = await fetch(
    buildApiUrl(`/compliance-monitor/${configId}/violations`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch violations') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.violations || [];
}

async function fetchAudits(configId: number): Promise<ComplianceAudit[]> {
  const res = await fetch(
    buildApiUrl(`/compliance-monitor/${configId}/audits`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch audits') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.audits || [];
}

async function createComplianceConfig(
  clientId: number,
  data: Partial<ComplianceConfig>,
): Promise<ComplianceConfig> {
  const res = await fetch(
    buildApiUrl(`/clients/${clientId}/compliance-monitor`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to create compliance config') as ApiError;
    error.status = res.status;
    throw error;
  }
  const result = await res.json();
  return result.config;
}

function ComplianceMonitorPage(): JSX.Element {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'rules' | 'violations' | 'audits'
  >('overview');

  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const accountsQuery = useAccounts({ archived: false });
  const configsQuery = useQuery({
    queryKey: ['compliance-configs'],
    queryFn: fetchComplianceConfigs,
  });

  const selectedConfig = useMemo(() => {
    if (!selectedConfigId || !configsQuery.data) return null;
    return configsQuery.data.find((c) => c.id === selectedConfigId) || null;
  }, [selectedConfigId, configsQuery.data]);

  const rulesQuery = useQuery({
    queryKey: ['compliance-rules', selectedConfigId],
    queryFn: () => fetchRules(selectedConfigId!),
    enabled: !!selectedConfigId && activeTab === 'rules',
  });

  const violationsQuery = useQuery({
    queryKey: ['compliance-violations', selectedConfigId],
    queryFn: () => fetchViolations(selectedConfigId!),
    enabled: !!selectedConfigId && activeTab === 'violations',
  });

  const auditsQuery = useQuery({
    queryKey: ['compliance-audits', selectedConfigId],
    queryFn: () => fetchAudits(selectedConfigId!),
    enabled: !!selectedConfigId && activeTab === 'audits',
  });

  // Mutations
  const createConfigMutation = useMutation({
    mutationFn: (data: {
      clientId: number;
      config: Partial<ComplianceConfig>;
    }) => createComplianceConfig(data.clientId, data.config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compliance-configs'] });
      setShowCreateModal(false);
      showToast('Compliance Monitor configuration created', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });

  // Redirect to login on 401 errors from queries or mutations
  useRedirectOnUnauthorized(configsQuery.error);
  useRedirectOnUnauthorized(accountsQuery.error);
  useRedirectOnUnauthorized(createConfigMutation.error);
  useRedirectOnUnauthorized(rulesQuery.error);
  useRedirectOnUnauthorized(violationsQuery.error);
  useRedirectOnUnauthorized(auditsQuery.error);

  const handleCreateConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const clientId = parseInt(formData.get('clientId') as string, 10);
    const frameworks = formData.getAll('frameworks') as string[];

    createConfigMutation.mutate({
      clientId,
      config: {
        frameworks,
        autoScanEnabled: formData.get('autoScanEnabled') === 'on',
        scanFrequencyHours:
          parseInt(formData.get('scanFrequencyHours') as string, 10) || 24,
        riskThreshold:
          parseInt(formData.get('riskThreshold') as string, 10) || 70,
      },
    });
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="Compliance Monitor"
        description="Real-time compliance monitoring with risk scoring and regulatory reporting"
        icon={Scale}
        actions={
          <Button variant="secondary" onClick={() => setShowCreateModal(true)}>
            <Settings className="mr-2 h-4 w-4" />
            New Configuration
          </Button>
        }
      />

      <div className="page-content space-y-6">
        {/* Configuration Selector */}
        <Card>
          <CardBody>
            <div className="flex gap-4 flex-wrap">
              <Select
                label="Select Configuration"
                value={selectedConfigId?.toString() || ''}
                onChange={(e) =>
                  setSelectedConfigId(
                    e.target.value ? parseInt(e.target.value, 10) : null,
                  )
                }
              >
                <option value="">Select a configuration...</option>
                {configsQuery.data?.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.client?.name || `Config ${config.id}`}
                  </option>
                ))}
              </Select>
            </div>
          </CardBody>
        </Card>

        {/* Tabs */}
        {selectedConfigId && (
          <div className="border-b border-neutral-200 dark:border-neutral-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', label: 'Overview', icon: Shield },
                { id: 'rules', label: 'Rules', icon: FileText },
                { id: 'violations', label: 'Violations', icon: AlertTriangle },
                { id: 'audits', label: 'Audits', icon: CheckCircle },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as typeof activeTab)}
                  className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        )}

        {/* Overview Tab */}
        {selectedConfigId && activeTab === 'overview' && selectedConfig && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Frameworks
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedConfig.frameworks.map((fw) => (
                        <Badge key={fw} variant="primary">
                          {fw}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Shield className="h-8 w-8 text-blue-500" />
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Auto Scan
                    </p>
                    <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                      {selectedConfig.autoScanEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <RefreshCw className="h-8 w-8 text-green-500" />
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Scan Frequency
                    </p>
                    <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {selectedConfig.scanFrequencyHours}h
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-purple-500" />
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Risk Threshold
                    </p>
                    <p className="text-2xl font-bold text-orange-500">
                      {selectedConfig.riskThreshold}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-500" />
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Rules Tab */}
        {selectedConfigId && activeTab === 'rules' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Compliance Rules
                </h3>
                <Button
                  onClick={() =>
                    showToast(
                      'Rule creation coming soon. Contact admin to add rules.',
                      'info',
                    )
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Rule
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {rulesQuery.isLoading ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                    <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Framework
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Severity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...Array(5)].map((_, i) => (
                        <TableRowSkeleton key={i} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : rulesQuery.data?.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                  No rules configured. Add compliance rules to monitor.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                    <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Framework
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Severity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                      {rulesQuery.data?.map((rule) => (
                        <tr key={rule.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-neutral-900 dark:text-neutral-100">
                            {rule.code}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-100">
                            {rule.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="primary">{rule.framework}</Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge
                              variant={
                                SEVERITY_VARIANTS[rule.severity] || 'neutral'
                              }
                            >
                              {rule.severity}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {rule.isActive ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="h-5 w-5 text-neutral-400 dark:text-neutral-500" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Violations Tab */}
        {selectedConfigId && activeTab === 'violations' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Compliance Violations
                </h3>
                <Button
                  variant="secondary"
                  onClick={() =>
                    queryClient.invalidateQueries({
                      queryKey: ['compliance-violations'],
                    })
                  }
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {violationsQuery.isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <ViolationSkeleton key={i} />
                  ))}
                </div>
              ) : violationsQuery.data?.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                  No violations detected. Your compliance status is healthy.
                </div>
              ) : (
                <div className="space-y-4">
                  {violationsQuery.data?.map((violation) => (
                    <div
                      key={violation.id}
                      className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-neutral-900 dark:text-neutral-100">
                              {violation.ruleCode}
                            </span>
                            <Badge
                              variant={
                                SEVERITY_VARIANTS[violation.severity] ||
                                'neutral'
                              }
                            >
                              {violation.severity}
                            </Badge>
                          </div>
                          <p className="font-medium mt-1 text-neutral-900 dark:text-neutral-100">
                            {violation.ruleName}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                            Detected:{' '}
                            {new Date(violation.detectedAt).toLocaleString()}
                          </p>
                        </div>
                        <Badge
                          variant={
                            STATUS_VARIANTS[violation.status] || 'neutral'
                          }
                        >
                          {violation.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Audits Tab */}
        {selectedConfigId && activeTab === 'audits' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Compliance Audits
                </h3>
                <Button
                  onClick={() =>
                    showToast(
                      'Audit scheduling coming soon. Contact admin to initiate audits.',
                      'info',
                    )
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Start Audit
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {auditsQuery.isLoading ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                    <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Findings
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Started
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...Array(5)].map((_, i) => (
                        <TableRowSkeleton key={i} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : auditsQuery.data?.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                  No audits performed yet. Start your first compliance audit.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                    <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Score
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Findings
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                          Started
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                      {auditsQuery.data?.map((audit) => (
                        <tr key={audit.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-100">
                            {audit.type}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge
                              variant={
                                audit.status === 'COMPLETED'
                                  ? 'success'
                                  : audit.status === 'IN_PROGRESS'
                                    ? 'warning'
                                    : 'neutral'
                              }
                            >
                              {audit.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {audit.score !== null ? (
                              <span
                                className={
                                  audit.score >= 80
                                    ? 'text-green-600 dark:text-green-400'
                                    : audit.score >= 60
                                      ? 'text-yellow-600 dark:text-yellow-400'
                                      : 'text-red-600 dark:text-red-400'
                                }
                              >
                                {audit.score}%
                              </span>
                            ) : (
                              <span className="text-neutral-500 dark:text-neutral-400">
                                -
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-900 dark:text-neutral-100">
                            {audit.findings}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                            {new Date(audit.startedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {/* Create Configuration Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black dark:bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4 text-neutral-900 dark:text-neutral-100">
              Create Compliance Monitor Configuration
            </h2>
            <form onSubmit={handleCreateConfig} className="space-y-4">
              <Select
                label="Client"
                name="clientId"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                required
              >
                <option value="">Select a client...</option>
                {accountsQuery.data?.data?.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>

              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Compliance Frameworks
                </label>
                <div className="space-y-2">
                  {['HIPAA', 'SOX', 'GDPR', 'PCI-DSS'].map((fw) => (
                    <label key={fw} className="flex items-center gap-2">
                      <input type="checkbox" name="frameworks" value={fw} />
                      <span className="text-sm text-neutral-900 dark:text-neutral-100">
                        {fw}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Select
                label="Scan Frequency"
                name="scanFrequencyHours"
                defaultValue="24"
              >
                <option value="1">Every hour</option>
                <option value="6">Every 6 hours</option>
                <option value="12">Every 12 hours</option>
                <option value="24">Daily</option>
                <option value="168">Weekly</option>
              </Select>

              <Select
                label="Risk Threshold"
                name="riskThreshold"
                defaultValue="70"
              >
                <option value="50">50 (Low sensitivity)</option>
                <option value="70">70 (Medium sensitivity)</option>
                <option value="90">90 (High sensitivity)</option>
              </Select>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="autoScanEnabled"
                    defaultChecked
                  />
                  <span className="text-sm text-neutral-900 dark:text-neutral-100">
                    Enable Automated Scanning
                  </span>
                </label>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createConfigMutation.isPending}>
                  {createConfigMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ComplianceMonitorPage;
