/**
 * AI Chatbot Management Page
 *
 * Tool 1.1: Customer Service Chatbot configuration, conversations, and analytics
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
import { buildOptions, ApiError } from '../../api/http';
import { buildApiUrl } from '../../api/config';
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
  Play,
  Send,
  User,
  Bot,
  Trash2,
  Smile,
  Meh,
  Frown,
  Zap,
  TrendingUp,
  Clock,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  ChevronRight,
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

interface SuggestedAction {
  label: string;
  action: string;
  payload?: unknown;
}

interface ChatMessage {
  id: number;
  sender: 'CUSTOMER' | 'BOT' | 'AGENT';
  content: string;
  createdAt: string;
  detectedIntent?: string;
  intentConfidence?: number;
  sentiment?: number;
  suggestedActions?: SuggestedAction[];
}

interface TestConversation {
  id: number;
  sessionId: string;
  status: string;
  messages: ChatMessage[];
}

interface KnowledgeBaseItem {
  id: number;
  question: string;
  answer: string;
  keywords: string[];
  category: string | null;
  priority: number;
  isPublished: boolean;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
}

interface SessionStats {
  messageCount: number;
  customerMessageCount: number;
  botMessageCount: number;
  intentsDetected: Record<string, number>;
  avgSentiment: number;
  sentimentCount: number;
  startTime: Date;
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
  const res = await fetch(buildApiUrl('/chatbot/configs'), buildOptions());
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
    buildApiUrl(`/chatbot/${configId}/conversations?${params}`),
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
  const res = await fetch(
    buildApiUrl(`/chatbot/${configId}/analytics`),
    buildOptions(),
  );
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
    buildApiUrl(`/clients/${clientId}/chatbot`),
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

// Test chat API functions
async function startTestConversation(
  configId: number,
): Promise<TestConversation> {
  const res = await fetch(
    buildApiUrl(`/chatbot/${configId}/conversations`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify({
        customerName: 'Test User',
        customerEmail: 'test@example.com',
        channel: 'WEB',
      }),
    }),
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(
      data.message || data.error || 'Failed to start test conversation',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  const result = await res.json();
  return result.conversation;
}

async function getTestConversation(
  sessionId: string,
): Promise<TestConversation> {
  const res = await fetch(
    buildApiUrl(`/chatbot/conversations/${sessionId}`),
    buildOptions(),
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(
      data.message || data.error || 'Failed to fetch conversation',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  const result = await res.json();
  return result.conversation;
}

async function sendTestMessage(
  sessionId: string,
  content: string,
): Promise<{ message: ChatMessage; response: { content: string; suggestedActions?: SuggestedAction[] } }> {
  const res = await fetch(
    buildApiUrl(`/chatbot/conversations/${sessionId}/messages`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(
      data.message || data.error || 'Failed to send message',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  return res.json();
}

async function fetchKnowledgeBase(configId: number): Promise<KnowledgeBaseItem[]> {
  const res = await fetch(
    buildApiUrl(`/chatbot/${configId}/knowledge-base`),
    buildOptions(),
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(
      data.message || data.error || 'Failed to fetch knowledge base',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  const result = await res.json();
  return result.items || [];
}

async function submitKnowledgeBaseFeedback(
  itemId: number,
  helpful: boolean,
): Promise<void> {
  const res = await fetch(
    buildApiUrl(`/chatbot/knowledge-base/${itemId}/feedback`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify({ helpful }),
    }),
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(
      data.message || data.error || 'Failed to submit feedback',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
}

function ChatbotPage(): JSX.Element {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'conversations' | 'knowledge' | 'analytics' | 'test'
  >('overview');

  // Test chat state
  const [testSessionId, setTestSessionId] = useState<string | null>(null);
  const [testMessages, setTestMessages] = useState<ChatMessage[]>([]);
  const [testInput, setTestInput] = useState('');
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [lastSuggestedActions, setLastSuggestedActions] = useState<SuggestedAction[]>([]);
  const [showKnowledgePanel, setShowKnowledgePanel] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Helper function to get sentiment icon and color
  const getSentimentDisplay = (sentiment: number | undefined) => {
    if (sentiment === undefined) return null;
    if (sentiment > 0.3) return { icon: Smile, color: 'text-green-500', label: 'Positive' };
    if (sentiment < -0.3) return { icon: Frown, color: 'text-red-500', label: 'Negative' };
    return { icon: Meh, color: 'text-yellow-500', label: 'Neutral' };
  };

  // Helper function to format elapsed time
  const formatElapsedTime = (startTime: Date) => {
    const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Update session stats when messages change
  const updateSessionStats = React.useCallback((messages: ChatMessage[], startTime?: Date) => {
    const customerMessages = messages.filter(m => m.sender === 'CUSTOMER');
    const botMessages = messages.filter(m => m.sender === 'BOT');

    const intents: Record<string, number> = {};
    let totalSentiment = 0;
    let sentimentCount = 0;

    for (const msg of customerMessages) {
      if (msg.detectedIntent) {
        intents[msg.detectedIntent] = (intents[msg.detectedIntent] || 0) + 1;
      }
      if (msg.sentiment !== undefined) {
        totalSentiment += msg.sentiment;
        sentimentCount++;
      }
    }

    setSessionStats({
      messageCount: messages.length,
      customerMessageCount: customerMessages.length,
      botMessageCount: botMessages.length,
      intentsDetected: intents,
      avgSentiment: sentimentCount > 0 ? totalSentiment / sentimentCount : 0,
      sentimentCount,
      startTime: startTime || sessionStats?.startTime || new Date(),
    });
  }, [sessionStats?.startTime]);

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

  const knowledgeBaseQuery = useQuery({
    queryKey: ['chatbot-knowledge-base', selectedConfigId],
    queryFn: () => fetchKnowledgeBase(selectedConfigId!),
    enabled: !!selectedConfigId && (activeTab === 'test' || activeTab === 'knowledge'),
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

  // Redirect to login on 401 errors from any query or mutation
  useRedirectOnUnauthorized(configsQuery.error);
  useRedirectOnUnauthorized(clientsQuery.error);
  useRedirectOnUnauthorized(conversationsQuery.error);
  useRedirectOnUnauthorized(analyticsQuery.error);
  useRedirectOnUnauthorized(createConfigMutation.error);

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
              { id: 'test', label: 'Test Chat', icon: Play },
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

            {/* Test Chat Tab */}
            {activeTab === 'test' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Main Chat Area */}
                <Card className="lg:col-span-3 h-[650px] flex flex-col">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Play className="w-5 h-5" />
                        Test Your Chatbot
                        {sessionStats && (
                          <Badge variant="neutral" className="ml-2">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatElapsedTime(sessionStats.startTime)}
                          </Badge>
                        )}
                      </h3>
                      <div className="flex gap-2">
                        {testSessionId && (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => setShowKnowledgePanel(!showKnowledgePanel)}
                            >
                              <BookOpen className="w-4 h-4" />
                              {showKnowledgePanel ? 'Hide' : 'Show'} KB
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setTestSessionId(null);
                                setTestMessages([]);
                                setTestInput('');
                                setSessionStats(null);
                                setLastSuggestedActions([]);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                              Clear Chat
                            </Button>
                          </>
                        )}
                        {!testSessionId && (
                          <Button
                            size="sm"
                            disabled={isTestLoading}
                            onClick={async () => {
                              if (!selectedConfigId) return;
                              setIsTestLoading(true);
                              try {
                                const conv = await startTestConversation(selectedConfigId);
                                setTestSessionId(conv.sessionId);
                                const fullConv = await getTestConversation(conv.sessionId);
                                setTestMessages(fullConv.messages || []);
                                const startTime = new Date();
                                updateSessionStats(fullConv.messages || [], startTime);
                                showToast('Test conversation started', 'success');
                              } catch (error) {
                                showToast(
                                  error instanceof Error ? error.message : 'Failed to start conversation',
                                  'error'
                                );
                              } finally {
                                setIsTestLoading(false);
                              }
                            }}
                          >
                            <Play className="w-4 h-4" />
                            Start Test Chat
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardBody className="flex-1 flex flex-col overflow-hidden">
                    {!testSessionId ? (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <Bot className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                          <p className="text-neutral-600 mb-2">
                            Click "Start Test Chat" to begin testing your chatbot
                          </p>
                          <p className="text-sm text-neutral-500">
                            You can send messages and see how your chatbot responds.
                            <br />
                            All interactions are logged for analytics.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-neutral-50 rounded-lg">
                          {testMessages.length === 0 ? (
                            <p className="text-center text-neutral-500 py-4">
                              No messages yet. Start typing below!
                            </p>
                          ) : (
                            testMessages.map((msg) => {
                              const sentimentDisplay = msg.sender === 'CUSTOMER' ? getSentimentDisplay(msg.sentiment) : null;
                              const SentimentIcon = sentimentDisplay?.icon;
                              return (
                                <div
                                  key={msg.id}
                                  className={`flex items-start gap-3 ${
                                    msg.sender === 'CUSTOMER' ? 'flex-row-reverse' : ''
                                  }`}
                                >
                                  <div
                                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                      msg.sender === 'CUSTOMER'
                                        ? 'bg-primary-100'
                                        : 'bg-neutral-200'
                                    }`}
                                  >
                                    {msg.sender === 'CUSTOMER' ? (
                                      <User className="w-4 h-4 text-primary-600" />
                                    ) : (
                                      <Bot className="w-4 h-4 text-neutral-600" />
                                    )}
                                  </div>
                                  <div className={`max-w-[70%] ${msg.sender === 'CUSTOMER' ? 'text-right' : ''}`}>
                                    <div
                                      className={`rounded-lg p-3 ${
                                        msg.sender === 'CUSTOMER'
                                          ? 'bg-primary-500 text-white'
                                          : 'bg-white border border-neutral-200'
                                      }`}
                                    >
                                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                    {/* Message metadata */}
                                    {msg.sender === 'CUSTOMER' && (msg.detectedIntent || sentimentDisplay) && (
                                      <div className="flex items-center gap-2 mt-1 justify-end text-xs text-neutral-500">
                                        {msg.detectedIntent && (
                                          <span className="flex items-center gap-1 bg-neutral-100 px-2 py-0.5 rounded">
                                            <Zap className="w-3 h-3" />
                                            {msg.detectedIntent}
                                            {msg.intentConfidence && (
                                              <span className="opacity-60">
                                                ({Math.round(msg.intentConfidence * 100)}%)
                                              </span>
                                            )}
                                          </span>
                                        )}
                                        {sentimentDisplay && SentimentIcon && (
                                          <span className={`flex items-center gap-1 ${sentimentDisplay.color}`}>
                                            <SentimentIcon className="w-3 h-3" />
                                            {sentimentDisplay.label}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {/* Suggested actions for bot messages */}
                                    {msg.sender === 'BOT' && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {msg.suggestedActions.map((action, idx) => (
                                          <button
                                            key={idx}
                                            className="text-xs px-3 py-1 bg-primary-100 text-primary-700 rounded-full hover:bg-primary-200 transition-colors flex items-center gap-1"
                                            onClick={() => {
                                              if (action.action === 'feedback') {
                                                const payload = action.payload as { helpful?: boolean } | undefined;
                                                if (payload?.helpful !== undefined) {
                                                  showToast(
                                                    payload.helpful ? 'Thanks for the positive feedback!' : 'Thanks for your feedback. We\'ll improve.',
                                                    'success'
                                                  );
                                                }
                                              } else if (action.action === 'escalate') {
                                                showToast('Escalation requested - in production this would connect to a human agent', 'info');
                                              } else {
                                                setTestInput(action.label);
                                              }
                                            }}
                                          >
                                            <ChevronRight className="w-3 h-3" />
                                            {action.label}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                          <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Actions from last response */}
                        {lastSuggestedActions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3 p-2 bg-primary-50 rounded-lg">
                            <span className="text-xs text-neutral-500 self-center">Quick replies:</span>
                            {lastSuggestedActions.map((action, idx) => (
                              <button
                                key={idx}
                                className="text-xs px-3 py-1 bg-white border border-primary-200 text-primary-700 rounded-full hover:bg-primary-100 transition-colors"
                                onClick={() => setTestInput(action.label)}
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Input Area */}
                        <form
                          className="flex gap-2"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (!testInput.trim() || !testSessionId || isTestLoading) return;

                            const messageContent = testInput.trim();
                            setTestInput('');
                            setIsTestLoading(true);

                            const tempCustomerMsg: ChatMessage = {
                              id: Date.now(),
                              sender: 'CUSTOMER',
                              content: messageContent,
                              createdAt: new Date().toISOString(),
                            };
                            setTestMessages((prev) => [...prev, tempCustomerMsg]);

                            try {
                              const result = await sendTestMessage(testSessionId, messageContent);

                              setTestMessages((prev) => {
                                const withoutTemp = prev.filter((m) => m.id !== tempCustomerMsg.id);
                                const customerMsg: ChatMessage = {
                                  ...result.message,
                                  sender: 'CUSTOMER',
                                };
                                const botMsg: ChatMessage = {
                                  id: Date.now() + 1,
                                  sender: 'BOT',
                                  content: result.response.content,
                                  createdAt: new Date().toISOString(),
                                  suggestedActions: result.response.suggestedActions,
                                };
                                const newMessages = [...withoutTemp, customerMsg, botMsg];
                                updateSessionStats(newMessages);
                                return newMessages;
                              });

                              // Store suggested actions for quick reply bar
                              if (result.response.suggestedActions) {
                                setLastSuggestedActions(result.response.suggestedActions);
                              } else {
                                setLastSuggestedActions([]);
                              }

                              setTimeout(() => {
                                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                              }, 100);
                            } catch (error) {
                              showToast(
                                error instanceof Error ? error.message : 'Failed to send message',
                                'error'
                              );
                              setTestMessages((prev) =>
                                prev.filter((m) => m.id !== tempCustomerMsg.id)
                              );
                            } finally {
                              setIsTestLoading(false);
                            }
                          }}
                        >
                          <Input
                            placeholder="Type a message to test your chatbot..."
                            value={testInput}
                            onChange={(e) => setTestInput(e.target.value)}
                            disabled={isTestLoading}
                            className="flex-1"
                          />
                          <Button type="submit" disabled={isTestLoading || !testInput.trim()}>
                            <Send className="w-4 h-4" />
                            Send
                          </Button>
                        </form>
                      </>
                    )}
                  </CardBody>
                </Card>

                {/* Session Stats & Knowledge Base Panel */}
                <div className="space-y-4">
                  {/* Session Analytics */}
                  <Card>
                    <CardHeader>
                      <h4 className="font-semibold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Session Analytics
                      </h4>
                    </CardHeader>
                    <CardBody className="space-y-3">
                      {!sessionStats ? (
                        <p className="text-sm text-neutral-500">Start a chat to see analytics</p>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-neutral-50 p-2 rounded text-center">
                              <p className="text-lg font-bold text-primary-600">
                                {sessionStats.messageCount}
                              </p>
                              <p className="text-xs text-neutral-500">Messages</p>
                            </div>
                            <div className="bg-neutral-50 p-2 rounded text-center">
                              <p className="text-lg font-bold text-primary-600">
                                {Object.keys(sessionStats.intentsDetected).length}
                              </p>
                              <p className="text-xs text-neutral-500">Intents</p>
                            </div>
                          </div>

                          {/* Sentiment Gauge */}
                          {sessionStats.sentimentCount > 0 && (
                            <div className="bg-neutral-50 p-3 rounded">
                              <p className="text-xs text-neutral-500 mb-2">Avg. Sentiment</p>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-neutral-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all ${
                                      sessionStats.avgSentiment > 0.3
                                        ? 'bg-green-500'
                                        : sessionStats.avgSentiment < -0.3
                                          ? 'bg-red-500'
                                          : 'bg-yellow-500'
                                    }`}
                                    style={{
                                      width: `${((sessionStats.avgSentiment + 1) / 2) * 100}%`,
                                    }}
                                  />
                                </div>
                                <span className="text-sm font-medium">
                                  {sessionStats.avgSentiment > 0 ? '+' : ''}
                                  {sessionStats.avgSentiment.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Intents Breakdown */}
                          {Object.keys(sessionStats.intentsDetected).length > 0 && (
                            <div>
                              <p className="text-xs text-neutral-500 mb-2">Detected Intents</p>
                              <div className="space-y-1">
                                {Object.entries(sessionStats.intentsDetected).map(([intent, count]) => (
                                  <div
                                    key={intent}
                                    className="flex items-center justify-between text-sm bg-neutral-50 px-2 py-1 rounded"
                                  >
                                    <span className="flex items-center gap-1">
                                      <Zap className="w-3 h-3 text-primary-500" />
                                      {intent}
                                    </span>
                                    <Badge variant="neutral">{count}</Badge>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </CardBody>
                  </Card>

                  {/* Knowledge Base Panel */}
                  {showKnowledgePanel && (
                    <Card>
                      <CardHeader>
                        <h4 className="font-semibold flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          Knowledge Base
                        </h4>
                      </CardHeader>
                      <CardBody className="max-h-[300px] overflow-y-auto">
                        {knowledgeBaseQuery.isLoading ? (
                          <p className="text-sm text-neutral-500">Loading...</p>
                        ) : !knowledgeBaseQuery.data?.length ? (
                          <p className="text-sm text-neutral-500">No knowledge base items</p>
                        ) : (
                          <div className="space-y-2">
                            {knowledgeBaseQuery.data.map((item) => (
                              <div
                                key={item.id}
                                className="border border-neutral-200 rounded p-2 hover:bg-neutral-50 cursor-pointer transition-colors"
                                onClick={() => {
                                  setTestInput(item.question);
                                }}
                              >
                                <div className="flex items-start gap-2">
                                  <HelpCircle className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{item.question}</p>
                                    <p className="text-xs text-neutral-500 truncate">{item.answer}</p>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
                                      <span className="flex items-center gap-1">
                                        <ThumbsUp className="w-3 h-3" />
                                        {item.helpfulCount}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <ThumbsDown className="w-3 h-3" />
                                        {item.notHelpfulCount}
                                      </span>
                                      {item.category && (
                                        <Badge variant="neutral" className="text-[10px]">
                                          {item.category}
                                        </Badge>
                                      )}
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

                  {/* Tips Card */}
                  <Card>
                    <CardBody className="text-xs text-neutral-500 space-y-2">
                      <p className="font-medium text-neutral-700">Testing Tips:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Try asking about order status</li>
                        <li>Request a return or refund</li>
                        <li>Ask to speak with an agent</li>
                        <li>Test FAQ questions from KB</li>
                      </ul>
                    </CardBody>
                  </Card>
                </div>
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
                          {analyticsQuery.data.totalConversations ?? 0}
                        </p>
                        <p className="text-sm text-neutral-600">
                          Total Conversations
                        </p>
                      </CardBody>
                    </Card>
                    <Card>
                      <CardBody>
                        <p className="text-3xl font-bold text-primary-600">
                          {(analyticsQuery.data.avgResponseTime ?? 0).toFixed(
                            1,
                          )}
                          s
                        </p>
                        <p className="text-sm text-neutral-600">
                          Avg Response Time
                        </p>
                      </CardBody>
                    </Card>
                    <Card>
                      <CardBody>
                        <p className="text-3xl font-bold text-primary-600">
                          {(
                            (analyticsQuery.data.resolutionRate ?? 0) * 100
                          ).toFixed(0)}
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
                          {(analyticsQuery.data.avgSatisfaction ?? 0).toFixed(
                            1,
                          )}
                          /5
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
