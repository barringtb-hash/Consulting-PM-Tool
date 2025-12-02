/**
 * Content Generation Suite Page
 *
 * Tool 2.2: AI-powered content generation with brand voice, templates, and approval workflows
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
  PenTool,
  Settings,
  BarChart3,
  FileText,
  RefreshCw,
  Sparkles,
  CheckCircle,
} from 'lucide-react';

// Types
interface ContentGeneratorConfig {
  id: number;
  clientId: number;
  brandVoiceDescription: string | null;
  toneKeywords: string[];
  enableSEO: boolean;
  enablePlagiarismCheck: boolean;
  defaultTone: string | null;
  defaultLength: string | null;
  isActive: boolean;
  client?: { id: number; name: string };
}

interface GeneratedContent {
  id: number;
  title: string;
  type: string;
  content: string;
  approvalStatus: string;
  seoScore: number | null;
  voiceConsistencyScore: number | null;
  createdAt: string;
}

const STATUS_VARIANTS: Record<
  string,
  'primary' | 'success' | 'warning' | 'neutral' | 'secondary'
> = {
  DRAFT: 'neutral',
  PENDING_REVIEW: 'warning',
  REVISION_REQUESTED: 'secondary',
  APPROVED: 'success',
  REJECTED: 'secondary',
  PUBLISHED: 'primary',
};

const CONTENT_TYPES = [
  { value: 'SOCIAL_POST', label: 'Social Post' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'BLOG_POST', label: 'Blog Post' },
  { value: 'AD_COPY', label: 'Ad Copy' },
  { value: 'LANDING_PAGE', label: 'Landing Page' },
  { value: 'NEWSLETTER', label: 'Newsletter' },
  { value: 'PRESS_RELEASE', label: 'Press Release' },
  { value: 'PRODUCT_COPY', label: 'Product Copy' },
  { value: 'VIDEO_SCRIPT', label: 'Video Script' },
];

// API functions
async function fetchContentGeneratorConfigs(): Promise<
  ContentGeneratorConfig[]
> {
  const res = await fetch(
    buildApiUrl('/content-generator/configs'),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error(
      'Failed to fetch content generator configs',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.configs || [];
}

async function fetchContents(
  configId: number,
  type?: string,
  status?: string,
): Promise<GeneratedContent[]> {
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  if (status) params.append('status', status);
  const res = await fetch(
    buildApiUrl(`/content-generator/${configId}/contents?${params}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch contents') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.contents || [];
}

async function createContentGeneratorConfig(
  clientId: number,
  data: Partial<ContentGeneratorConfig>,
): Promise<ContentGeneratorConfig> {
  const res = await fetch(
    buildApiUrl(`/clients/${clientId}/content-generator`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );
  if (!res.ok) {
    const error = new Error(
      'Failed to create content generator config',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  const result = await res.json();
  return result.config;
}

async function generateContent(
  configId: number,
  data: {
    title: string;
    type: string;
    prompt?: string;
    tone?: string;
    targetLength?: string;
  },
): Promise<{ contents: GeneratedContent[] }> {
  const res = await fetch(
    buildApiUrl(`/content-generator/${configId}/generate`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to generate content') as ApiError;
    error.status = res.status;
    throw error;
  }
  return res.json();
}

function ContentGeneratorPage(): JSX.Element {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'contents' | 'templates' | 'workflows'
  >('overview');

  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const clientsQuery = useClients({ includeArchived: false });
  const configsQuery = useQuery({
    queryKey: ['content-generator-configs'],
    queryFn: fetchContentGeneratorConfigs,
  });

  const selectedConfig = useMemo(() => {
    if (!selectedConfigId || !configsQuery.data) return null;
    return configsQuery.data.find((c) => c.id === selectedConfigId) || null;
  }, [selectedConfigId, configsQuery.data]);

  const contentsQuery = useQuery({
    queryKey: [
      'generated-contents',
      selectedConfigId,
      typeFilter,
      statusFilter,
    ],
    queryFn: () =>
      fetchContents(
        selectedConfigId!,
        typeFilter || undefined,
        statusFilter || undefined,
      ),
    enabled: !!selectedConfigId && activeTab === 'contents',
  });

  // Mutations
  const createConfigMutation = useMutation({
    mutationFn: (data: {
      clientId: number;
      config: Partial<ContentGeneratorConfig>;
    }) => createContentGeneratorConfig(data.clientId, data.config),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['content-generator-configs'],
      });
      setShowCreateModal(false);
      showToast({
        message: 'Content Generator configuration created',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      showToast({ message: error.message, variant: 'error' });
    },
  });

  const generateMutation = useMutation({
    mutationFn: (data: {
      title: string;
      type: string;
      prompt?: string;
      tone?: string;
      targetLength?: string;
    }) => generateContent(selectedConfigId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generated-contents'] });
      setShowGenerateModal(false);
      showToast({
        message: 'Content generated successfully',
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
  useRedirectOnUnauthorized(generateMutation.error);

  const handleCreateConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const clientId = parseInt(formData.get('clientId') as string, 10);

    createConfigMutation.mutate({
      clientId,
      config: {
        brandVoiceDescription:
          (formData.get('brandVoiceDescription') as string) || null,
        enableSEO: formData.get('enableSEO') === 'on',
        enablePlagiarismCheck: formData.get('enablePlagiarismCheck') === 'on',
        defaultTone: (formData.get('defaultTone') as string) || null,
        defaultLength: (formData.get('defaultLength') as string) || null,
      },
    });
  };

  const handleGenerateContent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    generateMutation.mutate({
      title: formData.get('title') as string,
      type: formData.get('type') as string,
      prompt: (formData.get('prompt') as string) || undefined,
      tone: (formData.get('tone') as string) || undefined,
      targetLength: (formData.get('targetLength') as string) || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content Generation Suite"
        subtitle="AI-powered content creation with brand voice consistency and approval workflows"
        icon={PenTool}
        actions={
          <div className="flex gap-2">
            {selectedConfigId && (
              <Button onClick={() => setShowGenerateModal(true)}>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Content
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
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

            {selectedConfigId && (
              <>
                <Select
                  label="Content Type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="">All Types</option>
                  {CONTENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>

                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PENDING_REVIEW">Pending Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PUBLISHED">Published</option>
                </Select>
              </>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Tabs */}
      {selectedConfigId && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: PenTool },
              { id: 'contents', label: 'Contents', icon: FileText },
              { id: 'templates', label: 'Templates', icon: Settings },
              { id: 'workflows', label: 'Workflows', icon: CheckCircle },
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
                  <p className="text-sm text-gray-500">SEO Optimization</p>
                  <p className="text-lg font-semibold">
                    {selectedConfig.enableSEO ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-blue-500" />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Plagiarism Check</p>
                  <p className="text-lg font-semibold">
                    {selectedConfig.enablePlagiarismCheck
                      ? 'Enabled'
                      : 'Disabled'}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Default Tone</p>
                  <p className="text-lg font-semibold">
                    {selectedConfig.defaultTone || 'Not set'}
                  </p>
                </div>
                <PenTool className="h-8 w-8 text-purple-500" />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Default Length</p>
                  <p className="text-lg font-semibold">
                    {selectedConfig.defaultLength || 'Medium'}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-orange-500" />
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Contents Tab */}
      {selectedConfigId && activeTab === 'contents' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Generated Content</h3>
              <Button
                variant="secondary"
                onClick={() =>
                  queryClient.invalidateQueries({
                    queryKey: ['generated-contents'],
                  })
                }
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {contentsQuery.isLoading ? (
              <div className="text-center py-8 text-gray-500">
                Loading content...
              </div>
            ) : contentsQuery.data?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No content found. Generate your first piece of content!
              </div>
            ) : (
              <div className="space-y-4">
                {contentsQuery.data?.map((content) => (
                  <div key={content.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{content.title}</h4>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="neutral">
                            {content.type.replace('_', ' ')}
                          </Badge>
                          <Badge
                            variant={
                              STATUS_VARIANTS[content.approvalStatus] ||
                              'neutral'
                            }
                          >
                            {content.approvalStatus.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        {content.seoScore !== null && (
                          <div>SEO: {content.seoScore}%</div>
                        )}
                        {content.voiceConsistencyScore !== null && (
                          <div>
                            Voice:{' '}
                            {Math.round(content.voiceConsistencyScore * 100)}%
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600 line-clamp-3">
                      {content.content}
                    </p>
                  </div>
                ))}
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
              Create Content Generator Configuration
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Brand Voice Description
                </label>
                <textarea
                  name="brandVoiceDescription"
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Describe your brand voice (e.g., professional, friendly, innovative...)"
                />
              </div>

              <Select label="Default Tone" name="defaultTone">
                <option value="">Select tone...</option>
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="formal">Formal</option>
                <option value="friendly">Friendly</option>
                <option value="authoritative">Authoritative</option>
              </Select>

              <Select label="Default Length" name="defaultLength">
                <option value="medium">Medium</option>
                <option value="short">Short</option>
                <option value="long">Long</option>
              </Select>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="enableSEO" defaultChecked />
                  <span className="text-sm">Enable SEO Optimization</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="enablePlagiarismCheck"
                    defaultChecked
                  />
                  <span className="text-sm">Enable Plagiarism Checking</span>
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

      {/* Generate Content Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h2 className="text-lg font-semibold mb-4">Generate New Content</h2>
            <form onSubmit={handleGenerateContent} className="space-y-4">
              <Input
                label="Title"
                name="title"
                required
                placeholder="Enter content title..."
              />

              <Select label="Content Type" name="type" required>
                <option value="">Select type...</option>
                {CONTENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prompt / Instructions
                </label>
                <textarea
                  name="prompt"
                  rows={4}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Describe what you want to generate..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select label="Tone" name="tone">
                  <option value="">Use default</option>
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="formal">Formal</option>
                  <option value="friendly">Friendly</option>
                </Select>

                <Select label="Length" name="targetLength">
                  <option value="">Use default</option>
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </Select>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowGenerateModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={generateMutation.isPending}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {generateMutation.isPending ? 'Generating...' : 'Generate'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContentGeneratorPage;
