/**
 * AI Chatbot Management Page
 *
 * Tool 1.1: Customer Service Chatbot configuration, conversations, and analytics
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
  MessageCircle,
  Settings,
  BarChart3,
  BookOpen,
  RefreshCw,
} from 'lucide-react';

// Types
interface ChatbotConfig {
  id: number;
  clientId: number;
  name: string;
  welcomeMessage: string | null;
  fallbackMessage: string | null;
  enableOrderTracking: boolean;
  enableReturns: boolean;
  enableFAQ: boolean;
  enableHumanHandoff: boolean;
  isActive: boolean;
  client?: { id: number; name: string };
  _count?: { conversations: number; knowledgeBase: number };
}

interface ConversationSummary {
  id: number;
  sessionId: string;
  status: string;
  customerName: string | null;
  customerEmail: string | null;
  channel: string;
  messageCount: number;
  startedAt: string;
  lastMessageAt: string | null;
}

const STATUS_VARIANTS: Record<
  string,
  'primary' | 'success' | 'warning' | 'neutral' | 'secondary'
> = {
  ACTIVE: 'primary',
  WAITING_CUSTOMER: 'warning',
  WAITING_AGENT: 'warning',
  ESCALATED: 'secondary',
  RESOLVED: 'success',
  CLOSED: 'neutral',
};

// API functions
async function fetchChatbotConfigs(): Promise<ChatbotConfig[]> {
  const res = await fetch('/api/chatbot/configs', buildOptions());
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(
      data.message || data.error || 'Failed to fetch chatbot configs',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.configs || [];
}

async function fetchConversations(
  configId: number,
  status?: string,
): Promise<ConversationSummary[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  const res = await fetch(
    `/api/chatbot/${configId}/conversations?${params}`,
    buildOptions(),
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(
      data.message || data.error || 'Failed to fetch conversations',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.conversations || [];
}

async function fetchAnalytics(configId: number): Promise<{
  totalConversations: number;
  avgResponseTime: number;
  resolutionRate: number;
  avgSatisfaction: number;
  topIntents: { intent: string; count: number }[];
}> {
  const res = await fetch(`/api/chatbot/${configId}/analytics`, buildOptions());
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(
      data.message || data.error || 'Failed to fetch analytics',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  return res.json();
}

async function createChatbotConfig(
  clientId: number,
  data: Partial<ChatbotConfig>,
): Promise<ChatbotConfig> {
  const res = await fetch(
    `/api/clients/${clientId}/chatbot`,
    buildOptions({
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error = new Error(
      errorData.message || errorData.error || 'Failed to create chatbot config',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  const result = await res.json();
  return result.config;
}

function ChatbotPage(): JSX.Element {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'conversations' | 'knowledge' | 'analytics'
  >('overview');

  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const clientsQuery = useClients({ includeArchived: false });
  const configsQuery = useQuery({
    queryKey: ['chatbot-configs'],
    queryFn: fetchChatbotConfigs,
  });

  const selectedConfig = useMemo(() => {
    if (!selectedConfigId || !configsQuery.data) return null;
    return configsQuery.data.find((c) => c.id === selectedConfigId) || null;
  }, [selectedConfigId, configsQuery.data]);

  const conversationsQuery = useQuery({
    queryKey: ['chatbot-conversations', selectedConfigId, statusFilter],
    queryFn: () =>
      fetchConversations(selectedConfigId!, statusFilter || undefined),
    enabled: !!selectedConfigId && activeTab === 'conversations',
  });

  const analyticsQuery = useQuery({
    queryKey: ['chatbot-analytics', selectedConfigId],
    queryFn: () => fetchAnalytics(selectedConfigId!),
    enabled: !!selectedConfigId && activeTab === 'analytics',
  });

  // Mutations
  const createConfigMutation = useMutation({
    mutationFn: ({
      clientId,
      data,
    }: {
      clientId: number;
      data: Partial<ChatbotConfig>;
    }) => createChatbotConfig(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatbot-configs'] });
      setShowCreateModal(false);
      showToast('Chatbot configuration created successfully', 'success');
    },
    onError: (error) => {
      showToast(
        error instanceof Error ? error.message : 'Failed to create config',
        'error',
      );
    },
  });

  useRedirectOnUnauthorized(configsQuery.error);
  useRedirectOnUnauthorized(clientsQuery.error);

  const clients = clientsQuery.data ?? [];

  const filteredConfigs = useMemo(() => {
    const configList = configsQuery.data ?? [];
    if (!selectedClientId) return configList;
    return configList.filter((c) => c.clientId === Number(selectedClientId));
  }, [configsQuery.data, selectedClientId]);

  const handleCreateConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const clientId = Number(formData.get('clientId'));
    const name = formData.get('name') as string;
    const welcomeMessage = formData.get('welcomeMessage') as string;

    createConfigMutation.mutate({
      clientId,
      data: { name, welcomeMessage },
    });
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <PageHeader
        title="AI Chatbot"
        description="Configure and manage AI-powered customer service chatbots"
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4" />
            New Chatbot
          </Button>
        }
      />

      <div className="container-padding py-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Client"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
              >
                <option value="">All Clients</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>
              <Select
                label="Chatbot Configuration"
                value={selectedConfigId?.toString() || ''}
                onChange={(e) =>
                  setSelectedConfigId(
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              >
                <option value="">Select a chatbot...</option>
                {filteredConfigs.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.name}{' '}
                    {config.client ? `(${config.client.name})` : ''}
                  </option>
                ))}
              </Select>
              <div className="flex items-end">
                <Button
                  variant="secondary"
                  onClick={() => configsQuery.refetch()}
                  disabled={configsQuery.isFetching}
                >
                  <RefreshCw
                    className={`w-4 h-4 ${configsQuery.isFetching ? 'animate-spin' : ''}`}
                  />
                  Refresh
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Tab Navigation */}
        {selectedConfig && (
          <div className="flex gap-2 border-b border-neutral-200">
            {[
              { id: 'overview', label: 'Overview', icon: MessageCircle },
              {
                id: 'conversations',
                label: 'Conversations',
                icon: MessageCircle,
              },
              { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                  activeTab === id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Content Area */}
        {!selectedConfig ? (
          <Card>
            <CardBody>
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                <p className="text-neutral-600">
                  Select a chatbot configuration to view details, or create a
                  new one.
                </p>
              </div>
            </CardBody>
          </Card>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Configuration
                    </h3>
                  </CardHeader>
                  <CardBody>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm text-neutral-500">Name</dt>
                        <dd className="font-medium">{selectedConfig.name}</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Status</dt>
                        <dd>
                          <Badge
                            variant={
                              selectedConfig.isActive ? 'success' : 'neutral'
                            }
                          >
                            {selectedConfig.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">
                          Welcome Message
                        </dt>
                        <dd className="text-sm">
                          {selectedConfig.welcomeMessage || 'Not set'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500">Features</dt>
                        <dd className="flex gap-2 flex-wrap mt-1">
                          {selectedConfig.enableFAQ && (
                            <Badge variant="primary">FAQ</Badge>
                          )}
                          {selectedConfig.enableOrderTracking && (
                            <Badge variant="primary">Order Tracking</Badge>
                          )}
                          {selectedConfig.enableReturns && (
                            <Badge variant="primary">Returns</Badge>
                          )}
                          {selectedConfig.enableHumanHandoff && (
                            <Badge variant="primary">Human Handoff</Badge>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Quick Stats
                    </h3>
                  </CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-neutral-50 rounded-lg">
                        <p className="text-2xl font-bold text-primary-600">
                          {selectedConfig._count?.conversations ?? 0}
                        </p>
                        <p className="text-sm text-neutral-600">
                          Total Conversations
                        </p>
                      </div>
                      <div className="p-4 bg-neutral-50 rounded-lg">
                        <p className="text-2xl font-bold text-primary-600">
                          {selectedConfig._count?.knowledgeBase ?? 0}
                        </p>
                        <p className="text-sm text-neutral-600">
                          Knowledge Base Items
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>
            )}

            {/* Conversations Tab */}
            {activeTab === 'conversations' && (
              <div className="space-y-4">
                <Card>
                  <CardBody>
                    <Select
                      label="Filter by Status"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="ACTIVE">Active</option>
                      <option value="ESCALATED">Escalated</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </Select>
                  </CardBody>
                </Card>

                {conversationsQuery.isLoading ? (
                  <Card>
                    <CardBody>
                      <p className="text-center text-neutral-500">
                        Loading conversations...
                      </p>
                    </CardBody>
                  </Card>
                ) : (conversationsQuery.data?.length ?? 0) === 0 ? (
                  <Card>
                    <CardBody>
                      <p className="text-center text-neutral-500">
                        No conversations found.
                      </p>
                    </CardBody>
                  </Card>
                ) : (
                  conversationsQuery.data?.map((conv) => (
                    <Card
                      key={conv.id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <CardBody>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">
                                {conv.customerName ||
                                  conv.customerEmail ||
                                  'Anonymous'}
                              </span>
                              <Badge
                                variant={
                                  STATUS_VARIANTS[conv.status] || 'neutral'
                                }
                              >
                                {conv.status}
                              </Badge>
                              <Badge variant="neutral">{conv.channel}</Badge>
                            </div>
                            <p className="text-sm text-neutral-600">
                              {conv.messageCount} messages
                            </p>
                            <p className="text-xs text-neutral-500 mt-1">
                              Started:{' '}
                              {new Date(conv.startedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Knowledge Base Tab */}
            {activeTab === 'knowledge' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Knowledge Base</h3>
                    <Button size="sm">
                      <Plus className="w-4 h-4" />
                      Add Item
                    </Button>
                  </div>
                </CardHeader>
                <CardBody>
                  <p className="text-neutral-500 text-center py-8">
                    Knowledge base management coming soon. Add FAQ items to help
                    your chatbot answer common questions.
                  </p>
                </CardBody>
              </Card>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {analyticsQuery.isLoading ? (
                  <Card className="col-span-full">
                    <CardBody>
                      <p className="text-center text-neutral-500">
                        Loading analytics...
                      </p>
                    </CardBody>
                  </Card>
                ) : analyticsQuery.data ? (
                  <>
                    <Card>
                      <CardBody>
                        <p className="text-3xl font-bold text-primary-600">
                          {analyticsQuery.data.totalConversations}
                        </p>
                        <p className="text-sm text-neutral-600">
                          Total Conversations
                        </p>
                      </CardBody>
                    </Card>
                    <Card>
                      <CardBody>
                        <p className="text-3xl font-bold text-primary-600">
                          {analyticsQuery.data.avgResponseTime.toFixed(1)}s
                        </p>
                        <p className="text-sm text-neutral-600">
                          Avg Response Time
                        </p>
                      </CardBody>
                    </Card>
                    <Card>
                      <CardBody>
                        <p className="text-3xl font-bold text-primary-600">
                          {(analyticsQuery.data.resolutionRate * 100).toFixed(
                            0,
                          )}
                          %
                        </p>
                        <p className="text-sm text-neutral-600">
                          Resolution Rate
                        </p>
                      </CardBody>
                    </Card>
                    <Card>
                      <CardBody>
                        <p className="text-3xl font-bold text-primary-600">
                          {analyticsQuery.data.avgSatisfaction.toFixed(1)}/5
                        </p>
                        <p className="text-sm text-neutral-600">
                          Avg Satisfaction
                        </p>
                      </CardBody>
                    </Card>
                  </>
                ) : (
                  <Card className="col-span-full">
                    <CardBody>
                      <p className="text-center text-neutral-500">
                        No analytics data available.
                      </p>
                    </CardBody>
                  </Card>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <h2 className="text-xl font-semibold">Create New Chatbot</h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleCreateConfig} className="space-y-4">
                <Select label="Client" name="clientId" required>
                  <option value="">Select a client...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Chatbot Name"
                  name="name"
                  required
                  placeholder="e.g., Customer Support Bot"
                />
                <Input
                  label="Welcome Message"
                  name="welcomeMessage"
                  placeholder="Hi! How can I help you today?"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCreateModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createConfigMutation.isPending}
                  >
                    {createConfigMutation.isPending ? 'Creating...' : 'Create'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ChatbotPage;
