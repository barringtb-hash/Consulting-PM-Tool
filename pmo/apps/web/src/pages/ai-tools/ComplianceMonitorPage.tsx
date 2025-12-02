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
import { useClients } from '../../api/queries';
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
  const clientsQuery = useClients({ includeArchived: false });
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
      showToast({
        message: 'Compliance Monitor configuration created',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      showToast({ message: error.message, variant: 'error' });
    },
  });

  // Redirect to login on 401 errors from queries or mutations
  useRedirectOnUnauthorized(configsQuery.error);
  useRedirectOnUnauthorized(clientsQuery.error);
  useRedirectOnUnauthorized(createConfigMutation.error);

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
    <div className="space-y-6">
      <PageHeader
        title="Compliance Monitor"
        subtitle="Real-time compliance monitoring with risk scoring and regulatory reporting"
        icon={Scale}
        actions={
          <Button variant="secondary" onClick={() => setShowCreateModal(true)}>
            <Settings className="mr-2 h-4 w-4" />
            New Configuration
          </Button>
        }
      />

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
        <div className="border-b border-gray-200">
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
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                  <p className="text-sm text-gray-500">Frameworks</p>
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
                  <p className="text-sm text-gray-500">Auto Scan</p>
                  <p className="text-lg font-semibold">
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
                  <p className="text-sm text-gray-500">Scan Frequency</p>
                  <p className="text-2xl font-bold">
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
                  <p className="text-sm text-gray-500">Risk Threshold</p>
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
              <h3 className="text-lg font-semibold">Compliance Rules</h3>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Rule
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {rulesQuery.isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading rules...
              </div>
            ) : rulesQuery.data?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No rules configured. Add compliance rules to monitor.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Framework
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Severity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rulesQuery.data?.map((rule) => (
                      <tr key={rule.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                          {rule.code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
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
                            <XCircle className="h-5 w-5 text-gray-400" />
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
              <h3 className="text-lg font-semibold">Compliance Violations</h3>
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
              <div className="text-center py-8 text-gray-500">
                Loading violations...
              </div>
            ) : violationsQuery.data?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No violations detected. Your compliance status is healthy.
              </div>
            ) : (
              <div className="space-y-4">
                {violationsQuery.data?.map((violation) => (
                  <div key={violation.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {violation.ruleCode}
                          </span>
                          <Badge
                            variant={
                              SEVERITY_VARIANTS[violation.severity] || 'neutral'
                            }
                          >
                            {violation.severity}
                          </Badge>
                        </div>
                        <p className="font-medium mt-1">{violation.ruleName}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Detected:{' '}
                          {new Date(violation.detectedAt).toLocaleString()}
                        </p>
                      </div>
                      <Badge
                        variant={STATUS_VARIANTS[violation.status] || 'neutral'}
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
              <h3 className="text-lg font-semibold">Compliance Audits</h3>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Start Audit
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {auditsQuery.isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading audits...
              </div>
            ) : auditsQuery.data?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No audits performed yet. Start your first compliance audit.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Findings
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Started
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {auditsQuery.data?.map((audit) => (
                      <tr key={audit.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
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
                                  ? 'text-green-600'
                                  : audit.score >= 60
                                    ? 'text-yellow-600'
                                    : 'text-red-600'
                              }
                            >
                              {audit.score}%
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {audit.findings}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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

      {/* Create Configuration Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">
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
                {clientsQuery.data?.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Compliance Frameworks
                </label>
                <div className="space-y-2">
                  {['HIPAA', 'SOX', 'GDPR', 'PCI-DSS'].map((fw) => (
                    <label key={fw} className="flex items-center gap-2">
                      <input type="checkbox" name="frameworks" value={fw} />
                      <span className="text-sm">{fw}</span>
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
                  <span className="text-sm">Enable Automated Scanning</span>
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
