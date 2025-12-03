/**
 * AI Chatbot Management Page
 *
 * Tool 1.1: Customer Service Chatbot configuration, conversations, and analytics
 */

import React, { useState, useMemo, useEffect } from 'react';
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
  Search,
  Edit3,
  Eye,
  EyeOff,
  X,
  Tag,
  AlertCircle,
  CheckCircle,
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
): Promise<{
  message: ChatMessage;
  response: { content: string; suggestedActions?: SuggestedAction[] };
}> {
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

async function fetchKnowledgeBase(
  configId: number,
): Promise<KnowledgeBaseItem[]> {
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

async function createKnowledgeBaseItem(
  configId: number,
  data: {
    question: string;
    answer: string;
    keywords?: string[];
    category?: string;
    priority?: number;
    isPublished?: boolean;
  },
): Promise<KnowledgeBaseItem> {
  const res = await fetch(
    buildApiUrl(`/chatbot/${configId}/knowledge-base`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error = new Error(
      errorData.message ||
        errorData.error ||
        'Failed to create knowledge base item',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  const result = await res.json();
  return result.item;
}

async function updateKnowledgeBaseItem(
  id: number,
  data: {
    question?: string;
    answer?: string;
    keywords?: string[];
    category?: string;
    priority?: number;
    isPublished?: boolean;
  },
): Promise<KnowledgeBaseItem> {
  const res = await fetch(
    buildApiUrl(`/chatbot/knowledge-base/${id}`),
    buildOptions({
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error = new Error(
      errorData.message ||
        errorData.error ||
        'Failed to update knowledge base item',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  const result = await res.json();
  return result.item;
}

async function deleteKnowledgeBaseItem(id: number): Promise<void> {
  const res = await fetch(
    buildApiUrl(`/chatbot/knowledge-base/${id}`),
    buildOptions({
      method: 'DELETE',
    }),
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const error = new Error(
      errorData.message ||
        errorData.error ||
        'Failed to delete knowledge base item',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
}

// Knowledge base categories
const KB_CATEGORIES = [
  'General',
  'Orders',
  'Returns',
  'Shipping',
  'Products',
  'Payments',
  'Account',
  'Technical',
] as const;

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
  const [lastSuggestedActions, setLastSuggestedActions] = useState<
    SuggestedAction[]
  >([]);
  const [showKnowledgePanel, setShowKnowledgePanel] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<string>('0:00');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Knowledge Base management state
  const [kbSearchQuery, setKbSearchQuery] = useState('');
  const [kbCategoryFilter, setKbCategoryFilter] = useState('');
  const [kbPublishedFilter, setKbPublishedFilter] = useState<
    'all' | 'published' | 'unpublished'
  >('all');
  const [showKbModal, setShowKbModal] = useState(false);
  const [editingKbItem, setEditingKbItem] = useState<KnowledgeBaseItem | null>(
    null,
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [kbFormData, setKbFormData] = useState({
    question: '',
    answer: '',
    keywords: '',
    category: '',
    priority: 1,
    isPublished: true,
  });

  // Update elapsed time every second when session is active
  useEffect(() => {
    if (!sessionStats?.startTime) {
      setElapsedTime('0:00');
      return;
    }

    const updateTimer = () => {
      const elapsed = Math.floor(
        (Date.now() - sessionStats.startTime.getTime()) / 1000,
      );
      const mins = Math.floor(elapsed / 60);
      const secs = elapsed % 60;
      setElapsedTime(`${mins}:${secs.toString().padStart(2, '0')}`);
    };

    updateTimer(); // Initial update
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [sessionStats?.startTime]);

  // Helper function to get sentiment icon and color
  const getSentimentDisplay = (sentiment: number | undefined) => {
    if (sentiment === undefined) return null;
    if (sentiment > 0.3)
      return { icon: Smile, color: 'text-green-500', label: 'Positive' };
    if (sentiment < -0.3)
      return { icon: Frown, color: 'text-red-500', label: 'Negative' };
    return { icon: Meh, color: 'text-yellow-500', label: 'Neutral' };
  };

  // Update session stats when messages change
  const updateSessionStats = React.useCallback(
    (messages: ChatMessage[], startTime?: Date) => {
      const customerMessages = messages.filter((m) => m.sender === 'CUSTOMER');
      const botMessages = messages.filter((m) => m.sender === 'BOT');

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
    },
    [sessionStats?.startTime],
  );

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
    enabled:
      !!selectedConfigId && (activeTab === 'test' || activeTab === 'knowledge'),
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

  // Knowledge Base mutations
  const createKbItemMutation = useMutation({
    mutationFn: (data: {
      question: string;
      answer: string;
      keywords?: string[];
      category?: string;
      priority?: number;
      isPublished?: boolean;
    }) => createKnowledgeBaseItem(selectedConfigId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['chatbot-knowledge-base', selectedConfigId],
      });
      queryClient.invalidateQueries({ queryKey: ['chatbot-configs'] });
      setShowKbModal(false);
      resetKbForm();
      showToast('Knowledge base item created successfully', 'success');
    },
    onError: (error) => {
      showToast(
        error instanceof Error
          ? error.message
          : 'Failed to create knowledge base item',
        'error',
      );
    },
  });

  const updateKbItemMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: Partial<KnowledgeBaseItem>;
    }) => updateKnowledgeBaseItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['chatbot-knowledge-base', selectedConfigId],
      });
      setShowKbModal(false);
      setEditingKbItem(null);
      resetKbForm();
      showToast('Knowledge base item updated successfully', 'success');
    },
    onError: (error) => {
      showToast(
        error instanceof Error
          ? error.message
          : 'Failed to update knowledge base item',
        'error',
      );
    },
  });

  const deleteKbItemMutation = useMutation({
    mutationFn: (id: number) => deleteKnowledgeBaseItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['chatbot-knowledge-base', selectedConfigId],
      });
      queryClient.invalidateQueries({ queryKey: ['chatbot-configs'] });
      setDeleteConfirmId(null);
      showToast('Knowledge base item deleted successfully', 'success');
    },
    onError: (error) => {
      showToast(
        error instanceof Error
          ? error.message
          : 'Failed to delete knowledge base item',
        'error',
      );
    },
  });

  // Helper function to reset KB form
  const resetKbForm = () => {
    setKbFormData({
      question: '',
      answer: '',
      keywords: '',
      category: '',
      priority: 1,
      isPublished: true,
    });
  };

  // Open modal for editing KB item
  const openEditKbModal = (item: KnowledgeBaseItem) => {
    setEditingKbItem(item);
    setKbFormData({
      question: item.question,
      answer: item.answer,
      keywords: item.keywords.join(', '),
      category: item.category || '',
      priority: item.priority,
      isPublished: item.isPublished,
    });
    setShowKbModal(true);
  };

  // Handle KB form submission
  const handleKbFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const keywords = kbFormData.keywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    const data = {
      question: kbFormData.question,
      answer: kbFormData.answer,
      keywords,
      category: kbFormData.category || undefined,
      priority: kbFormData.priority,
      isPublished: kbFormData.isPublished,
    };

    if (editingKbItem) {
      updateKbItemMutation.mutate({ id: editingKbItem.id, data });
    } else {
      createKbItemMutation.mutate(data);
    }
  };

  // Filter knowledge base items
  const filteredKbItems = useMemo(() => {
    if (!knowledgeBaseQuery.data) return [];

    return knowledgeBaseQuery.data.filter((item) => {
      // Search filter
      if (kbSearchQuery) {
        const query = kbSearchQuery.toLowerCase();
        const matchesQuestion = item.question.toLowerCase().includes(query);
        const matchesAnswer = item.answer.toLowerCase().includes(query);
        const matchesKeywords = item.keywords.some((k) =>
          k.toLowerCase().includes(query),
        );
        if (!matchesQuestion && !matchesAnswer && !matchesKeywords)
          return false;
      }

      // Category filter
      if (kbCategoryFilter && item.category !== kbCategoryFilter) return false;

      // Published filter
      if (kbPublishedFilter === 'published' && !item.isPublished) return false;
      if (kbPublishedFilter === 'unpublished' && item.isPublished) return false;

      return true;
    });
  }, [
    knowledgeBaseQuery.data,
    kbSearchQuery,
    kbCategoryFilter,
    kbPublishedFilter,
  ]);

  // Calculate helpfulness percentage
  const getHelpfulnessPercent = (item: KnowledgeBaseItem) => {
    const total = item.helpfulCount + item.notHelpfulCount;
    if (total === 0) return null;
    return Math.round((item.helpfulCount / total) * 100);
  };

  // Redirect to login on 401 errors from any query or mutation
  useRedirectOnUnauthorized(configsQuery.error);
  useRedirectOnUnauthorized(clientsQuery.error);
  useRedirectOnUnauthorized(conversationsQuery.error);
  useRedirectOnUnauthorized(analyticsQuery.error);
  useRedirectOnUnauthorized(knowledgeBaseQuery.error);
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
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
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
          <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-700">
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
                    : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
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
                <p className="text-neutral-600 dark:text-neutral-400">
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
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Configuration
                    </h3>
                  </CardHeader>
                  <CardBody>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                          Name
                        </dt>
                        <dd className="font-medium text-neutral-900 dark:text-neutral-100">
                          {selectedConfig.name}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                          Status
                        </dt>
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
                        <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                          Welcome Message
                        </dt>
                        <dd className="text-sm text-neutral-900 dark:text-neutral-100">
                          {selectedConfig.welcomeMessage || 'Not set'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-neutral-500 dark:text-neutral-400">
                          Features
                        </dt>
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
                    <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5" />
                      Quick Stats
                    </h3>
                  </CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                        <p className="text-2xl font-bold text-primary-600">
                          {selectedConfig._count?.conversations ?? 0}
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          Total Conversations
                        </p>
                      </div>
                      <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                        <p className="text-2xl font-bold text-primary-600">
                          {selectedConfig._count?.knowledgeBase ?? 0}
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
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
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        <Play className="w-5 h-5" />
                        Test Your Chatbot
                        {sessionStats && (
                          <Badge variant="neutral" className="ml-2">
                            <Clock className="w-3 h-3 mr-1" />
                            {elapsedTime}
                          </Badge>
                        )}
                      </h3>
                      <div className="flex gap-2">
                        {testSessionId && (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                setShowKnowledgePanel(!showKnowledgePanel)
                              }
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
                                const conv =
                                  await startTestConversation(selectedConfigId);
                                setTestSessionId(conv.sessionId);
                                const fullConv = await getTestConversation(
                                  conv.sessionId,
                                );
                                setTestMessages(fullConv.messages || []);
                                const startTime = new Date();
                                updateSessionStats(
                                  fullConv.messages || [],
                                  startTime,
                                );
                                showToast(
                                  'Test conversation started',
                                  'success',
                                );
                              } catch (error) {
                                showToast(
                                  error instanceof Error
                                    ? error.message
                                    : 'Failed to start conversation',
                                  'error',
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
                          <Bot className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
                          <p className="text-neutral-600 dark:text-neutral-400 mb-2">
                            Click &quot;Start Test Chat&quot; to begin testing
                            your chatbot
                          </p>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            You can send messages and see how your chatbot
                            responds.
                            <br />
                            All interactions are logged for analytics.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                          {testMessages.length === 0 ? (
                            <p className="text-center text-neutral-500 dark:text-neutral-400 py-4">
                              No messages yet. Start typing below!
                            </p>
                          ) : (
                            testMessages.map((msg) => {
                              const sentimentDisplay =
                                msg.sender === 'CUSTOMER'
                                  ? getSentimentDisplay(msg.sentiment)
                                  : null;
                              const SentimentIcon = sentimentDisplay?.icon;
                              return (
                                <div
                                  key={msg.id}
                                  className={`flex items-start gap-3 ${
                                    msg.sender === 'CUSTOMER'
                                      ? 'flex-row-reverse'
                                      : ''
                                  }`}
                                >
                                  <div
                                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                                      msg.sender === 'CUSTOMER'
                                        ? 'bg-primary-100 dark:bg-primary-900/30'
                                        : 'bg-neutral-200 dark:bg-neutral-700'
                                    }`}
                                  >
                                    {msg.sender === 'CUSTOMER' ? (
                                      <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                                    ) : (
                                      <Bot className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
                                    )}
                                  </div>
                                  <div
                                    className={`max-w-[70%] ${msg.sender === 'CUSTOMER' ? 'text-right' : ''}`}
                                  >
                                    <div
                                      className={`rounded-lg p-3 ${
                                        msg.sender === 'CUSTOMER'
                                          ? 'bg-primary-500 text-white'
                                          : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700'
                                      }`}
                                    >
                                      <p className="text-sm whitespace-pre-wrap">
                                        {msg.content}
                                      </p>
                                    </div>
                                    {/* Message metadata */}
                                    {msg.sender === 'CUSTOMER' &&
                                      (msg.detectedIntent ||
                                        sentimentDisplay) && (
                                        <div className="flex items-center gap-2 mt-1 justify-end text-xs text-neutral-500 dark:text-neutral-400">
                                          {msg.detectedIntent && (
                                            <span className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-700 px-2 py-0.5 rounded">
                                              <Zap className="w-3 h-3" />
                                              {msg.detectedIntent}
                                              {msg.intentConfidence && (
                                                <span className="opacity-60">
                                                  (
                                                  {Math.round(
                                                    msg.intentConfidence * 100,
                                                  )}
                                                  %)
                                                </span>
                                              )}
                                            </span>
                                          )}
                                          {sentimentDisplay &&
                                            SentimentIcon && (
                                              <span
                                                className={`flex items-center gap-1 ${sentimentDisplay.color}`}
                                              >
                                                <SentimentIcon className="w-3 h-3" />
                                                {sentimentDisplay.label}
                                              </span>
                                            )}
                                        </div>
                                      )}
                                    {/* Suggested actions for bot messages */}
                                    {msg.sender === 'BOT' &&
                                      msg.suggestedActions &&
                                      msg.suggestedActions.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                          {msg.suggestedActions.map(
                                            (action, idx) => (
                                              <button
                                                key={idx}
                                                className="text-xs px-3 py-1 bg-primary-100 text-primary-700 rounded-full hover:bg-primary-200 transition-colors flex items-center gap-1"
                                                onClick={() => {
                                                  if (
                                                    action.action === 'feedback'
                                                  ) {
                                                    const payload =
                                                      action.payload as
                                                        | { helpful?: boolean }
                                                        | undefined;
                                                    if (
                                                      payload?.helpful !==
                                                      undefined
                                                    ) {
                                                      showToast(
                                                        payload.helpful
                                                          ? 'Thanks for the positive feedback!'
                                                          : "Thanks for your feedback. We'll improve.",
                                                        'success',
                                                      );
                                                    }
                                                  } else if (
                                                    action.action === 'escalate'
                                                  ) {
                                                    showToast(
                                                      'Escalation requested - in production this would connect to a human agent',
                                                      'info',
                                                    );
                                                  } else {
                                                    setTestInput(action.label);
                                                  }
                                                }}
                                              >
                                                <ChevronRight className="w-3 h-3" />
                                                {action.label}
                                              </button>
                                            ),
                                          )}
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
                          <div className="flex flex-wrap gap-2 mb-3 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                            <span className="text-xs text-neutral-500 dark:text-neutral-400 self-center">
                              Quick replies:
                            </span>
                            {lastSuggestedActions.map((action, idx) => (
                              <button
                                key={idx}
                                className="text-xs px-3 py-1 bg-white dark:bg-neutral-800 border border-primary-200 dark:border-primary-700 text-primary-700 rounded-full hover:bg-primary-100 dark:hover:bg-neutral-700 transition-colors"
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
                            if (
                              !testInput.trim() ||
                              !testSessionId ||
                              isTestLoading
                            )
                              return;

                            const messageContent = testInput.trim();
                            setTestInput('');
                            setIsTestLoading(true);

                            const tempCustomerMsg: ChatMessage = {
                              id: Date.now(),
                              sender: 'CUSTOMER',
                              content: messageContent,
                              createdAt: new Date().toISOString(),
                            };
                            setTestMessages((prev) => [
                              ...prev,
                              tempCustomerMsg,
                            ]);

                            try {
                              const result = await sendTestMessage(
                                testSessionId,
                                messageContent,
                              );

                              setTestMessages((prev) => {
                                const withoutTemp = prev.filter(
                                  (m) => m.id !== tempCustomerMsg.id,
                                );
                                const customerMsg: ChatMessage = {
                                  ...result.message,
                                  sender: 'CUSTOMER',
                                };
                                const botMsg: ChatMessage = {
                                  id: Date.now() + 1,
                                  sender: 'BOT',
                                  content: result.response.content,
                                  createdAt: new Date().toISOString(),
                                  suggestedActions:
                                    result.response.suggestedActions,
                                };
                                const newMessages = [
                                  ...withoutTemp,
                                  customerMsg,
                                  botMsg,
                                ];
                                updateSessionStats(newMessages);
                                return newMessages;
                              });

                              // Store suggested actions for quick reply bar
                              if (result.response.suggestedActions) {
                                setLastSuggestedActions(
                                  result.response.suggestedActions,
                                );
                              } else {
                                setLastSuggestedActions([]);
                              }

                              setTimeout(() => {
                                messagesEndRef.current?.scrollIntoView({
                                  behavior: 'smooth',
                                });
                              }, 100);
                            } catch (error) {
                              showToast(
                                error instanceof Error
                                  ? error.message
                                  : 'Failed to send message',
                                'error',
                              );
                              setTestMessages((prev) =>
                                prev.filter((m) => m.id !== tempCustomerMsg.id),
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
                          <Button
                            type="submit"
                            disabled={isTestLoading || !testInput.trim()}
                          >
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
                      <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Session Analytics
                      </h4>
                    </CardHeader>
                    <CardBody className="space-y-3">
                      {!sessionStats ? (
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                          Start a chat to see analytics
                        </p>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-neutral-50 dark:bg-neutral-800 p-2 rounded text-center">
                              <p className="text-lg font-bold text-primary-600">
                                {sessionStats.messageCount}
                              </p>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                Messages
                              </p>
                            </div>
                            <div className="bg-neutral-50 dark:bg-neutral-800 p-2 rounded text-center">
                              <p className="text-lg font-bold text-primary-600">
                                {
                                  Object.keys(sessionStats.intentsDetected)
                                    .length
                                }
                              </p>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                Intents
                              </p>
                            </div>
                          </div>

                          {/* Sentiment Gauge */}
                          {sessionStats.sentimentCount > 0 && (
                            <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded">
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                                Avg. Sentiment
                              </p>
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
                          {Object.keys(sessionStats.intentsDetected).length >
                            0 && (
                            <div>
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                                Detected Intents
                              </p>
                              <div className="space-y-1">
                                {Object.entries(
                                  sessionStats.intentsDetected,
                                ).map(([intent, count]) => (
                                  <div
                                    key={intent}
                                    className="flex items-center justify-between text-sm bg-neutral-50 dark:bg-neutral-800 px-2 py-1 rounded"
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
                        <h4 className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          Knowledge Base
                        </h4>
                      </CardHeader>
                      <CardBody className="max-h-[300px] overflow-y-auto">
                        {knowledgeBaseQuery.isLoading ? (
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            Loading...
                          </p>
                        ) : !knowledgeBaseQuery.data?.length ? (
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            No knowledge base items
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {knowledgeBaseQuery.data.map((item) => (
                              <div
                                key={item.id}
                                className="border border-neutral-200 dark:border-neutral-700 rounded p-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer transition-colors"
                                onClick={() => {
                                  setTestInput(item.question);
                                }}
                              >
                                <div className="flex items-start gap-2">
                                  <HelpCircle className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                                      {item.question}
                                    </p>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                                      {item.answer}
                                    </p>
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
                                        <Badge
                                          variant="neutral"
                                          className="text-[10px]"
                                        >
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
                    <CardBody className="text-xs text-neutral-500 dark:text-neutral-400 space-y-2">
                      <p className="font-medium text-neutral-700 dark:text-neutral-300">
                        Testing Tips:
                      </p>
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
                      <p className="text-center text-neutral-500 dark:text-neutral-400">
                        Loading conversations...
                      </p>
                    </CardBody>
                  </Card>
                ) : (conversationsQuery.data?.length ?? 0) === 0 ? (
                  <Card>
                    <CardBody>
                      <p className="text-center text-neutral-500 dark:text-neutral-400">
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
                              <span className="font-medium text-neutral-900 dark:text-neutral-100">
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
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              {conv.messageCount} messages
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
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
              <div className="space-y-4">
                {/* Filters and Actions */}
                <Card>
                  <CardBody className="p-5">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
                      {/* Search */}
                      <div className="flex-1 relative min-w-0">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                        <input
                          type="text"
                          placeholder="Search questions, answers, or keywords..."
                          className="w-full h-11 pl-12 pr-4 text-sm border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900/50 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow placeholder:text-neutral-400"
                          value={kbSearchQuery}
                          onChange={(e) => setKbSearchQuery(e.target.value)}
                        />
                      </div>

                      {/* Filter Dropdowns */}
                      <div className="flex flex-col sm:flex-row gap-3">
                        {/* Category Filter */}
                        <Select
                          value={kbCategoryFilter}
                          onChange={(e) => setKbCategoryFilter(e.target.value)}
                          className="w-full sm:w-44 h-11"
                        >
                          <option value="">All Categories</option>
                          {KB_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </Select>

                        {/* Published Filter */}
                        <Select
                          value={kbPublishedFilter}
                          onChange={(e) =>
                            setKbPublishedFilter(
                              e.target.value as
                                | 'all'
                                | 'published'
                                | 'unpublished',
                            )
                          }
                          className="w-full sm:w-36 h-11"
                        >
                          <option value="all">All Status</option>
                          <option value="published">Published</option>
                          <option value="unpublished">Unpublished</option>
                        </Select>
                      </div>

                      {/* Add Button */}
                      <Button
                        onClick={() => {
                          resetKbForm();
                          setEditingKbItem(null);
                          setShowKbModal(true);
                        }}
                        className="h-11 px-5 whitespace-nowrap"
                      >
                        <Plus className="w-4 h-4" />
                        Add Item
                      </Button>
                    </div>
                  </CardBody>
                </Card>

                {/* Stats Summary */}
                {knowledgeBaseQuery.data &&
                  knowledgeBaseQuery.data.length > 0 && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card className="border-l-4 border-l-primary-500">
                        <CardBody className="py-4 px-5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                                Total Items
                              </p>
                              <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                                {knowledgeBaseQuery.data.length}
                              </p>
                            </div>
                            <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                              <BookOpen className="w-5 h-5 text-primary-600" />
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                      <Card className="border-l-4 border-l-green-500">
                        <CardBody className="py-4 px-5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                                Published
                              </p>
                              <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                                {
                                  knowledgeBaseQuery.data.filter(
                                    (i) => i.isPublished,
                                  ).length
                                }
                              </p>
                            </div>
                            <div className="w-10 h-10 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                      <Card className="border-l-4 border-l-blue-500">
                        <CardBody className="py-4 px-5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                                Total Views
                              </p>
                              <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                                {knowledgeBaseQuery.data.reduce(
                                  (sum, i) => sum + i.viewCount,
                                  0,
                                )}
                              </p>
                            </div>
                            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                              <Eye className="w-5 h-5 text-blue-600" />
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                      <Card className="border-l-4 border-l-amber-500">
                        <CardBody className="py-4 px-5">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                                Helpful Rate
                              </p>
                              <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
                                {(() => {
                                  const total = knowledgeBaseQuery.data.reduce(
                                    (sum, i) =>
                                      sum + i.helpfulCount + i.notHelpfulCount,
                                    0,
                                  );
                                  const helpful =
                                    knowledgeBaseQuery.data.reduce(
                                      (sum, i) => sum + i.helpfulCount,
                                      0,
                                    );
                                  return total > 0
                                    ? Math.round((helpful / total) * 100)
                                    : 0;
                                })()}
                                %
                              </p>
                            </div>
                            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                              <ThumbsUp className="w-5 h-5 text-amber-600" />
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    </div>
                  )}

                {/* Knowledge Base Items List */}
                {knowledgeBaseQuery.isLoading ? (
                  <Card>
                    <CardBody className="py-16">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-10 h-10 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                          Loading knowledge base items...
                        </p>
                      </div>
                    </CardBody>
                  </Card>
                ) : filteredKbItems.length === 0 ? (
                  <Card>
                    <CardBody className="py-16">
                      <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto">
                        <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6">
                          <BookOpen className="w-10 h-10 text-neutral-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
                          {kbSearchQuery ||
                          kbCategoryFilter ||
                          kbPublishedFilter !== 'all'
                            ? 'No items match your filters'
                            : 'No knowledge base items yet'}
                        </h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">
                          {kbSearchQuery ||
                          kbCategoryFilter ||
                          kbPublishedFilter !== 'all'
                            ? "Try adjusting your search or filters to find what you're looking for."
                            : 'Add FAQ items to help your chatbot answer common questions and provide better support to your customers.'}
                        </p>
                        {!kbSearchQuery &&
                          !kbCategoryFilter &&
                          kbPublishedFilter === 'all' && (
                            <Button
                              onClick={() => {
                                resetKbForm();
                                setEditingKbItem(null);
                                setShowKbModal(true);
                              }}
                              className="px-6"
                            >
                              <Plus className="w-4 h-4" />
                              Add Your First Item
                            </Button>
                          )}
                      </div>
                    </CardBody>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {filteredKbItems.map((item) => {
                      const helpfulPercent = getHelpfulnessPercent(item);
                      return (
                        <Card
                          key={item.id}
                          className="hover:shadow-md transition-shadow"
                        >
                          <CardBody>
                            <div className="flex items-start gap-4">
                              {/* Main Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2 mb-2">
                                  <HelpCircle className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                                  <div className="flex-1">
                                    <h4 className="font-medium text-neutral-900 dark:text-neutral-100">
                                      {item.question}
                                    </h4>
                                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2">
                                      {item.answer}
                                    </p>
                                  </div>
                                </div>

                                {/* Tags and Metadata */}
                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                  {/* Status Badge */}
                                  {item.isPublished ? (
                                    <Badge
                                      variant="success"
                                      className="flex items-center gap-1"
                                    >
                                      <Eye className="w-3 h-3" />
                                      Published
                                    </Badge>
                                  ) : (
                                    <Badge
                                      variant="neutral"
                                      className="flex items-center gap-1"
                                    >
                                      <EyeOff className="w-3 h-3" />
                                      Draft
                                    </Badge>
                                  )}

                                  {/* Category Badge */}
                                  {item.category && (
                                    <Badge
                                      variant="secondary"
                                      className="flex items-center gap-1"
                                    >
                                      <Tag className="w-3 h-3" />
                                      {item.category}
                                    </Badge>
                                  )}

                                  {/* Priority */}
                                  <Badge variant="neutral">
                                    Priority: {item.priority}
                                  </Badge>

                                  {/* Keywords */}
                                  {item.keywords.length > 0 && (
                                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                      Keywords:{' '}
                                      {item.keywords.slice(0, 3).join(', ')}
                                      {item.keywords.length > 3 &&
                                        ` +${item.keywords.length - 3}`}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Stats */}
                              <div className="flex flex-col items-end gap-2 text-sm">
                                <div className="flex items-center gap-3 text-neutral-500 dark:text-neutral-400">
                                  <span className="flex items-center gap-1">
                                    <Eye className="w-4 h-4" />
                                    {item.viewCount}
                                  </span>
                                  <span className="flex items-center gap-1 text-green-600">
                                    <ThumbsUp className="w-4 h-4" />
                                    {item.helpfulCount}
                                  </span>
                                  <span className="flex items-center gap-1 text-red-600">
                                    <ThumbsDown className="w-4 h-4" />
                                    {item.notHelpfulCount}
                                  </span>
                                </div>

                                {/* Helpfulness Bar */}
                                {helpfulPercent !== null && (
                                  <div className="flex items-center gap-2">
                                    <div className="w-20 h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full ${
                                          helpfulPercent >= 70
                                            ? 'bg-green-500'
                                            : helpfulPercent >= 40
                                              ? 'bg-yellow-500'
                                              : 'bg-red-500'
                                        }`}
                                        style={{ width: `${helpfulPercent}%` }}
                                      />
                                    </div>
                                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                      {helpfulPercent}% helpful
                                    </span>
                                  </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-2 mt-2">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => openEditKbModal(item)}
                                  >
                                    <Edit3 className="w-4 h-4" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() =>
                                      updateKbItemMutation.mutate({
                                        id: item.id,
                                        data: {
                                          isPublished: !item.isPublished,
                                        },
                                      })
                                    }
                                    disabled={updateKbItemMutation.isPending}
                                  >
                                    {item.isPublished ? (
                                      <>
                                        <EyeOff className="w-4 h-4" />
                                        Unpublish
                                      </>
                                    ) : (
                                      <>
                                        <Eye className="w-4 h-4" />
                                        Publish
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setDeleteConfirmId(item.id)}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {analyticsQuery.isLoading ? (
                  <Card className="col-span-full">
                    <CardBody>
                      <p className="text-center text-neutral-500 dark:text-neutral-400">
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
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
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
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
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
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
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
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          Avg Satisfaction
                        </p>
                      </CardBody>
                    </Card>
                  </>
                ) : (
                  <Card className="col-span-full">
                    <CardBody>
                      <p className="text-center text-neutral-500 dark:text-neutral-400">
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

      {/* Knowledge Base Add/Edit Modal */}
      {showKbModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  {editingKbItem
                    ? 'Edit Knowledge Base Item'
                    : 'Add Knowledge Base Item'}
                </h2>
                <button
                  onClick={() => {
                    setShowKbModal(false);
                    setEditingKbItem(null);
                    resetKbForm();
                  }}
                  className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleKbFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                    Question <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={kbFormData.question}
                    onChange={(e) =>
                      setKbFormData((prev) => ({
                        ...prev,
                        question: e.target.value,
                      }))
                    }
                    placeholder="e.g., How do I track my order?"
                    required
                  />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    The question customers might ask
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                    Answer <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={kbFormData.answer}
                    onChange={(e) =>
                      setKbFormData((prev) => ({
                        ...prev,
                        answer: e.target.value,
                      }))
                    }
                    placeholder="Provide a helpful answer to the question..."
                    required
                    rows={4}
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-900/50 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    The answer the chatbot will provide
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                      Category
                    </label>
                    <Select
                      value={kbFormData.category}
                      onChange={(e) =>
                        setKbFormData((prev) => ({
                          ...prev,
                          category: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select a category...</option>
                      {KB_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                      Priority
                    </label>
                    <Select
                      value={kbFormData.priority.toString()}
                      onChange={(e) =>
                        setKbFormData((prev) => ({
                          ...prev,
                          priority: parseInt(e.target.value, 10),
                        }))
                      }
                    >
                      <option value="1">1 - Low</option>
                      <option value="2">2</option>
                      <option value="3">3 - Medium</option>
                      <option value="4">4</option>
                      <option value="5">5 - High</option>
                    </Select>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      Higher priority items are matched first
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1">
                    Keywords
                  </label>
                  <Input
                    value={kbFormData.keywords}
                    onChange={(e) =>
                      setKbFormData((prev) => ({
                        ...prev,
                        keywords: e.target.value,
                      }))
                    }
                    placeholder="e.g., order, tracking, shipping, status"
                  />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Comma-separated keywords to help match this answer
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isPublished"
                    checked={kbFormData.isPublished}
                    onChange={(e) =>
                      setKbFormData((prev) => ({
                        ...prev,
                        isPublished: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
                  />
                  <label
                    htmlFor="isPublished"
                    className="text-sm text-neutral-900 dark:text-neutral-100"
                  >
                    Publish immediately (visible to customers)
                  </label>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowKbModal(false);
                      setEditingKbItem(null);
                      resetKbForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      createKbItemMutation.isPending ||
                      updateKbItemMutation.isPending
                    }
                  >
                    {createKbItemMutation.isPending ||
                    updateKbItemMutation.isPending
                      ? 'Saving...'
                      : editingKbItem
                        ? 'Update Item'
                        : 'Add Item'}
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5" />
                <h2 className="text-xl font-semibold">Delete Item</h2>
              </div>
            </CardHeader>
            <CardBody>
              <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                Are you sure you want to delete this knowledge base item? This
                action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setDeleteConfirmId(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => deleteKbItemMutation.mutate(deleteConfirmId)}
                  disabled={deleteKbItemMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleteKbItemMutation.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                Create New Chatbot
              </h2>
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
