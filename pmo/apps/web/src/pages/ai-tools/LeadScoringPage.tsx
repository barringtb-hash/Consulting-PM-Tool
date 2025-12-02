/**
 * Lead Scoring & CRM Assistant Page
 *
 * Tool 2.3: ML-based lead scoring with nurture sequences and CRM integration
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
import { buildOptions, ApiError } from '../../api/http';
import { PageHeader } from '../../ui/PageHeader';
import { Button } from '../../ui/Button';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Badge } from '../../ui/Badge';
import { useToast } from '../../ui/Toast';
import { useClients } from '../../api/queries';
import {
  Plus,
  Target,
  Settings,
  BarChart3,
  Users,
  RefreshCw,
  TrendingUp,
  Mail,
  Flame,
  Thermometer,
  Snowflake,
} from 'lucide-react';

// Types
interface LeadScoringConfig {
  id: number;
  clientId: number;
  hotThreshold: number;
  warmThreshold: number;
  coldThreshold: number;
  trackEmailOpens: boolean;
  trackEmailClicks: boolean;
  trackWebsiteVisits: boolean;
  crmType: string | null;
  crmSyncEnabled: boolean;
  isActive: boolean;
  client?: { id: number; name: string };
}

interface ScoredLead {
  id: number;
  email: string;
  name: string | null;
  company: string | null;
  score: number;
  scoreLevel: string;
  pipelineStage: string | null;
  lastEngagementAt: string | null;
  conversionProbability: number | null;
  createdAt: string;
}

interface NurtureSequence {
  id: number;
  name: string;
  totalEnrollments: number;
  totalCompletions: number;
  totalConversions: number;
  isActive: boolean;
}

const SCORE_LEVEL_VARIANTS: Record<
  string,
  'primary' | 'success' | 'warning' | 'neutral' | 'secondary'
> = {
  HOT: 'secondary',
  WARM: 'warning',
  COLD: 'primary',
  DEAD: 'neutral',
};

const SCORE_LEVEL_ICONS: Record<string, JSX.Element> = {
  HOT: <Flame className="h-4 w-4 text-red-500" />,
  WARM: <Thermometer className="h-4 w-4 text-orange-500" />,
  COLD: <Snowflake className="h-4 w-4 text-blue-500" />,
  DEAD: <Snowflake className="h-4 w-4 text-gray-400" />,
};

// API functions
async function fetchLeadScoringConfigs(): Promise<LeadScoringConfig[]> {
  const res = await fetch('/api/lead-scoring/configs', buildOptions());
  if (!res.ok) {
    const error = new Error('Failed to fetch lead scoring configs') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.configs || [];
}

async function fetchLeads(
  configId: number,
  scoreLevel?: string,
): Promise<ScoredLead[]> {
  const params = new URLSearchParams();
  if (scoreLevel) params.append('scoreLevel', scoreLevel);
  const res = await fetch(
    `/api/lead-scoring/${configId}/leads?${params}`,
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch leads') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.leads || [];
}

async function fetchSequences(configId: number): Promise<NurtureSequence[]> {
  const res = await fetch(
    `/api/lead-scoring/${configId}/sequences`,
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch sequences') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.sequences || [];
}

async function fetchAnalytics(configId: number): Promise<{
  leadDistribution: { level: string; count: number }[];
  summary: { totalLeads: number; hotLeads: number; hotLeadPercentage: number };
}> {
  const res = await fetch(
    `/api/lead-scoring/${configId}/analytics`,
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch analytics') as ApiError;
    error.status = res.status;
    throw error;
  }
  return res.json();
}

async function createLeadScoringConfig(
  clientId: number,
  data: Partial<LeadScoringConfig>,
): Promise<LeadScoringConfig> {
  const res = await fetch(
    `/api/clients/${clientId}/lead-scoring`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to create lead scoring config') as ApiError;
    error.status = res.status;
    throw error;
  }
  const result = await res.json();
  return result.config;
}

async function createLead(
  configId: number,
  data: { email: string; name?: string; company?: string },
): Promise<ScoredLead> {
  const res = await fetch(
    `/api/lead-scoring/${configId}/leads`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to create lead') as ApiError;
    error.status = res.status;
    throw error;
  }
  const result = await res.json();
  return result.lead;
}

async function rescoreLead(leadId: number): Promise<void> {
  const res = await fetch(
    `/api/lead-scoring/leads/${leadId}/rescore`,
    buildOptions({ method: 'POST' }),
  );
  if (!res.ok) {
    const error = new Error('Failed to rescore lead') as ApiError;
    error.status = res.status;
    throw error;
  }
}

function LeadScoringPage(): JSX.Element {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [scoreLevelFilter, setScoreLevelFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'leads' | 'sequences' | 'analytics'
  >('overview');

  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const clientsQuery = useClients({ includeArchived: false });
  const configsQuery = useQuery({
    queryKey: ['lead-scoring-configs'],
    queryFn: fetchLeadScoringConfigs,
  });

  const selectedConfig = useMemo(() => {
    if (!selectedConfigId || !configsQuery.data) return null;
    return configsQuery.data.find((c) => c.id === selectedConfigId) || null;
  }, [selectedConfigId, configsQuery.data]);

  const leadsQuery = useQuery({
    queryKey: ['scored-leads', selectedConfigId, scoreLevelFilter],
    queryFn: () => fetchLeads(selectedConfigId!, scoreLevelFilter || undefined),
    enabled: !!selectedConfigId && activeTab === 'leads',
  });

  const sequencesQuery = useQuery({
    queryKey: ['nurture-sequences', selectedConfigId],
    queryFn: () => fetchSequences(selectedConfigId!),
    enabled: !!selectedConfigId && activeTab === 'sequences',
  });

  const analyticsQuery = useQuery({
    queryKey: ['lead-analytics', selectedConfigId],
    queryFn: () => fetchAnalytics(selectedConfigId!),
    enabled: !!selectedConfigId && activeTab === 'analytics',
  });

  // Mutations
  const createConfigMutation = useMutation({
    mutationFn: (data: {
      clientId: number;
      config: Partial<LeadScoringConfig>;
    }) => createLeadScoringConfig(data.clientId, data.config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-scoring-configs'] });
      setShowCreateModal(false);
      showToast({
        message: 'Lead Scoring configuration created',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      showToast({ message: error.message, variant: 'error' });
    },
  });

  const createLeadMutation = useMutation({
    mutationFn: (data: { email: string; name?: string; company?: string }) =>
      createLead(selectedConfigId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scored-leads'] });
      setShowAddLeadModal(false);
      showToast({ message: 'Lead added and scored', variant: 'success' });
    },
    onError: (error: Error) => {
      showToast({ message: error.message, variant: 'error' });
    },
  });

  const rescoreMutation = useMutation({
    mutationFn: rescoreLead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scored-leads'] });
      showToast({ message: 'Lead rescored', variant: 'success' });
    },
    onError: (error: Error) => {
      showToast({ message: error.message, variant: 'error' });
    },
  });

  // Redirect to login on 401 errors from queries or mutations
  useRedirectOnUnauthorized(configsQuery.error);
  useRedirectOnUnauthorized(clientsQuery.error);
  useRedirectOnUnauthorized(createConfigMutation.error);
  useRedirectOnUnauthorized(createLeadMutation.error);
  useRedirectOnUnauthorized(rescoreMutation.error);

  const handleCreateConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const clientId = parseInt(formData.get('clientId') as string, 10);

    createConfigMutation.mutate({
      clientId,
      config: {
        hotThreshold:
          parseInt(formData.get('hotThreshold') as string, 10) || 80,
        warmThreshold:
          parseInt(formData.get('warmThreshold') as string, 10) || 50,
        coldThreshold:
          parseInt(formData.get('coldThreshold') as string, 10) || 20,
        trackEmailOpens: formData.get('trackEmailOpens') === 'on',
        trackEmailClicks: formData.get('trackEmailClicks') === 'on',
        trackWebsiteVisits: formData.get('trackWebsiteVisits') === 'on',
      },
    });
  };

  const handleAddLead = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    createLeadMutation.mutate({
      email: formData.get('email') as string,
      name: (formData.get('name') as string) || undefined,
      company: (formData.get('company') as string) || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lead Scoring & CRM Assistant"
        subtitle="ML-powered lead scoring with predictive analytics and nurture sequences"
        icon={Target}
        actions={
          <div className="flex gap-2">
            {selectedConfigId && (
              <Button onClick={() => setShowAddLeadModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Lead
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(true)}
            >
              <Settings className="mr-2 h-4 w-4" />
              New Configuration
            </Button>
          </div>
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

            {selectedConfigId && activeTab === 'leads' && (
              <Select
                label="Score Level"
                value={scoreLevelFilter}
                onChange={(e) => setScoreLevelFilter(e.target.value)}
              >
                <option value="">All Levels</option>
                <option value="HOT">Hot</option>
                <option value="WARM">Warm</option>
                <option value="COLD">Cold</option>
                <option value="DEAD">Dead</option>
              </Select>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Tabs */}
      {selectedConfigId && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Target },
              { id: 'leads', label: 'Leads', icon: Users },
              { id: 'sequences', label: 'Sequences', icon: Mail },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
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
                  <p className="text-sm text-gray-500">Hot Threshold</p>
                  <p className="text-2xl font-bold text-red-500">
                    {selectedConfig.hotThreshold}+
                  </p>
                </div>
                <Flame className="h-8 w-8 text-red-500" />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Warm Threshold</p>
                  <p className="text-2xl font-bold text-orange-500">
                    {selectedConfig.warmThreshold}+
                  </p>
                </div>
                <Thermometer className="h-8 w-8 text-orange-500" />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Cold Threshold</p>
                  <p className="text-2xl font-bold text-blue-500">
                    {selectedConfig.coldThreshold}+
                  </p>
                </div>
                <Snowflake className="h-8 w-8 text-blue-500" />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">CRM Sync</p>
                  <p className="text-lg font-semibold">
                    {selectedConfig.crmSyncEnabled
                      ? selectedConfig.crmType || 'Enabled'
                      : 'Disabled'}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Leads Tab */}
      {selectedConfigId && activeTab === 'leads' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Scored Leads</h3>
              <Button
                variant="secondary"
                onClick={() =>
                  queryClient.invalidateQueries({ queryKey: ['scored-leads'] })
                }
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {leadsQuery.isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading leads...
              </div>
            ) : leadsQuery.data?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No leads found. Add your first lead to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lead
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Level
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Conversion %
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {leadsQuery.data?.map((lead) => (
                      <tr key={lead.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {lead.name || '-'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {lead.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {lead.company || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className={`h-2 rounded-full ${
                                  lead.score >= 80
                                    ? 'bg-red-500'
                                    : lead.score >= 50
                                      ? 'bg-orange-500'
                                      : lead.score >= 20
                                        ? 'bg-blue-500'
                                        : 'bg-gray-400'
                                }`}
                                style={{ width: `${lead.score}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">
                              {lead.score}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {SCORE_LEVEL_ICONS[lead.scoreLevel]}
                            <Badge
                              variant={
                                SCORE_LEVEL_VARIANTS[lead.scoreLevel] ||
                                'neutral'
                              }
                            >
                              {lead.scoreLevel}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {lead.conversionProbability !== null
                            ? `${Math.round(lead.conversionProbability * 100)}%`
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => rescoreMutation.mutate(lead.id)}
                            disabled={rescoreMutation.isPending}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Rescore
                          </Button>
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

      {/* Sequences Tab */}
      {selectedConfigId && activeTab === 'sequences' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Nurture Sequences</h3>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Sequence
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {sequencesQuery.isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading sequences...
              </div>
            ) : sequencesQuery.data?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No sequences found. Create your first nurture sequence.
              </div>
            ) : (
              <div className="space-y-4">
                {sequencesQuery.data?.map((sequence) => (
                  <div key={sequence.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{sequence.name}</h4>
                        <Badge
                          variant={sequence.isActive ? 'success' : 'neutral'}
                        >
                          {sequence.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-lg font-semibold">
                            {sequence.totalEnrollments}
                          </div>
                          <div className="text-gray-500">Enrolled</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold">
                            {sequence.totalCompletions}
                          </div>
                          <div className="text-gray-500">Completed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-green-600">
                            {sequence.totalConversions}
                          </div>
                          <div className="text-gray-500">Conversions</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Analytics Tab */}
      {selectedConfigId && activeTab === 'analytics' && analyticsQuery.data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Lead Distribution</h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                {analyticsQuery.data.leadDistribution.map((item) => (
                  <div key={item.level} className="flex items-center gap-4">
                    <div className="w-20 flex items-center gap-1">
                      {SCORE_LEVEL_ICONS[item.level]}
                      <span className="text-sm font-medium">{item.level}</span>
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-4">
                      <div
                        className={`h-4 rounded-full ${
                          item.level === 'HOT'
                            ? 'bg-red-500'
                            : item.level === 'WARM'
                              ? 'bg-orange-500'
                              : item.level === 'COLD'
                                ? 'bg-blue-500'
                                : 'bg-gray-400'
                        }`}
                        style={{
                          width: `${(item.count / analyticsQuery.data.summary.totalLeads) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-12 text-right text-sm font-medium">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Summary</h3>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-3xl font-bold">
                    {analyticsQuery.data.summary.totalLeads}
                  </div>
                  <div className="text-sm text-gray-500">Total Leads</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-3xl font-bold text-red-600">
                    {analyticsQuery.data.summary.hotLeads}
                  </div>
                  <div className="text-sm text-gray-500">Hot Leads</div>
                </div>
                <div className="col-span-2 text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-3xl font-bold text-green-600">
                    {analyticsQuery.data.summary.hotLeadPercentage.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500">Hot Lead Rate</div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Create Configuration Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">
              Create Lead Scoring Configuration
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

              <div className="grid grid-cols-3 gap-2">
                <Input
                  label="Hot Threshold"
                  name="hotThreshold"
                  type="number"
                  defaultValue={80}
                  min={0}
                  max={100}
                />
                <Input
                  label="Warm Threshold"
                  name="warmThreshold"
                  type="number"
                  defaultValue={50}
                  min={0}
                  max={100}
                />
                <Input
                  label="Cold Threshold"
                  name="coldThreshold"
                  type="number"
                  defaultValue={20}
                  min={0}
                  max={100}
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="trackEmailOpens"
                    defaultChecked
                  />
                  <span className="text-sm">Track Email Opens</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="trackEmailClicks"
                    defaultChecked
                  />
                  <span className="text-sm">Track Email Clicks</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="trackWebsiteVisits"
                    defaultChecked
                  />
                  <span className="text-sm">Track Website Visits</span>
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

      {/* Add Lead Modal */}
      {showAddLeadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">Add New Lead</h2>
            <form onSubmit={handleAddLead} className="space-y-4">
              <Input
                label="Email"
                name="email"
                type="email"
                required
                placeholder="lead@company.com"
              />
              <Input label="Name" name="name" placeholder="John Doe" />
              <Input label="Company" name="company" placeholder="Acme Inc." />

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddLeadModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createLeadMutation.isPending}>
                  {createLeadMutation.isPending ? 'Adding...' : 'Add Lead'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeadScoringPage;
