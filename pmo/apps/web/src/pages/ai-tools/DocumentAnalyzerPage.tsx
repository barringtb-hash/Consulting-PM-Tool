/**
 * Smart Document Analyzer Page (Upgraded)
 *
 * Tool 2.1: Document analysis with OCR, NER, field extraction, compliance checking,
 * industry-specific templates, integrations, and ROI analytics.
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
import { useAccounts } from '../../api/hooks/crm';
import {
  Plus,
  FileSearch,
  Upload,
  RefreshCw,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  BarChart3,
  Plug,
  FileCode,
  TrendingUp,
  DollarSign,
  Zap,
  Building2,
  Shield,
} from 'lucide-react';

// Types
interface DocumentAnalyzerConfig {
  id: number;
  clientId: number;
  industryType: string;
  enableOCR: boolean;
  enableNER: boolean;
  enableCompliance: boolean;
  enableVersionCompare: boolean;
  enableAutoClassification: boolean;
  enableAutoRouting: boolean;
  classificationThreshold: number;
  retentionDays: number;
  isActive: boolean;
  client?: { id: number; name: string; industry?: string };
}

interface AnalyzedDocument {
  id: number;
  filename: string;
  format: string;
  status: string;
  category: string | null;
  documentType: string | null;
  complianceStatus: string | null;
  riskScore: number | null;
  totalAmount: number | null;
  analyzedAt: string | null;
  createdAt: string;
}

interface BuiltInTemplate {
  name: string;
  description: string;
  category: string;
  industryType: string | null;
  documentType: string;
  fieldDefinitions: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
  }>;
  confidenceThreshold: number;
}

interface Integration {
  id: number;
  name: string;
  integrationType: string;
  isActive: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
}

interface DashboardData {
  processing: {
    totalDocuments: number;
    successfulDocuments: number;
    failedDocuments: number;
    successRate: number;
    avgProcessingTimeMs: number;
  };
  categories: Array<{ category: string; count: number; percentage: number }>;
  compliance: {
    passCount: number;
    warningCount: number;
    failCount: number;
    passRate: number;
  };
  roi: {
    documentsProcessed: number;
    timeSavedMinutes: number;
    estimatedCostSaved: number;
    timeSavingsPercentage: number;
  };
  recentActivity: Array<{
    id: number;
    filename: string;
    category: string;
    status: string;
    processedAt: string;
  }>;
}

const STATUS_VARIANTS: Record<
  string,
  'primary' | 'success' | 'warning' | 'neutral' | 'secondary'
> = {
  PENDING: 'neutral',
  PROCESSING: 'primary',
  COMPLETED: 'success',
  FAILED: 'secondary',
  NEEDS_REVIEW: 'warning',
};

const COMPLIANCE_ICONS: Record<string, JSX.Element> = {
  PASS: <CheckCircle className="h-4 w-4 text-green-500" />,
  WARNING: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  FAIL: <XCircle className="h-4 w-4 text-red-500" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  INVOICE: 'bg-blue-100 text-blue-800',
  CONTRACT: 'bg-purple-100 text-purple-800',
  COMPLIANCE: 'bg-green-100 text-green-800',
  HEALTHCARE: 'bg-red-100 text-red-800',
  LEGAL: 'bg-indigo-100 text-indigo-800',
  FINANCIAL: 'bg-yellow-100 text-yellow-800',
  REAL_ESTATE: 'bg-orange-100 text-orange-800',
  MANUFACTURING: 'bg-gray-100 text-gray-800',
  GENERAL: 'bg-neutral-100 text-neutral-800',
};

const INDUSTRY_TYPES = [
  'HEALTHCARE',
  'LEGAL',
  'FINANCIAL_SERVICES',
  'REAL_ESTATE',
  'MANUFACTURING',
  'RETAIL',
  'PROFESSIONAL_SERVICES',
  'TECHNOLOGY',
  'CONSTRUCTION',
  'EDUCATION',
  'GOVERNMENT',
  'NONPROFIT',
  'OTHER',
];

// API functions
async function fetchDocumentAnalyzerConfigs(): Promise<
  DocumentAnalyzerConfig[]
> {
  const res = await fetch(
    buildApiUrl('/document-analyzer/configs'),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error(
      'Failed to fetch document analyzer configs',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.configs || [];
}

async function fetchDocuments(
  configId: number,
  status?: string,
): Promise<AnalyzedDocument[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  const res = await fetch(
    buildApiUrl(`/document-analyzer/${configId}/documents?${params}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch documents') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.documents || [];
}

async function fetchTemplateLibrary(): Promise<{
  templates: BuiltInTemplate[];
  categories: string[];
  industries: string[];
}> {
  const res = await fetch(
    buildApiUrl('/document-analyzer/templates/library'),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch template library') as ApiError;
    error.status = res.status;
    throw error;
  }
  return res.json();
}

async function fetchIntegrations(configId: number): Promise<Integration[]> {
  const res = await fetch(
    buildApiUrl(`/document-analyzer/${configId}/integrations`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch integrations') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.integrations || [];
}

async function fetchDashboard(
  configId: number,
  period: string,
): Promise<DashboardData> {
  const res = await fetch(
    buildApiUrl(
      `/document-analyzer/${configId}/analytics/dashboard?period=${period}`,
    ),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch dashboard') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.dashboard;
}

async function createDocumentAnalyzerConfig(
  clientId: number,
  data: Partial<DocumentAnalyzerConfig>,
): Promise<DocumentAnalyzerConfig> {
  const res = await fetch(
    buildApiUrl(`/clients/${clientId}/document-analyzer`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );
  if (!res.ok) {
    const error = new Error(
      'Failed to create document analyzer config',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  const result = await res.json();
  return result.config;
}

async function analyzeDocument(documentId: number): Promise<void> {
  const res = await fetch(
    buildApiUrl(`/document-analyzer/documents/${documentId}/analyze`),
    buildOptions({ method: 'POST' }),
  );
  if (!res.ok) {
    const error = new Error('Failed to analyze document') as ApiError;
    error.status = res.status;
    throw error;
  }
}

async function uploadDocument(
  configId: number,
  data: {
    filename: string;
    originalUrl: string;
    mimeType: string;
    sizeBytes: number;
    format: string;
  },
): Promise<AnalyzedDocument> {
  const res = await fetch(
    buildApiUrl(`/document-analyzer/${configId}/documents`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to upload document') as ApiError;
    error.status = res.status;
    throw error;
  }
  const result = await res.json();
  return result.document;
}

function DocumentAnalyzerPage(): JSX.Element {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'documents' | 'templates' | 'integrations' | 'analytics'
  >('overview');
  const [templateCategory, setTemplateCategory] = useState<string>('');
  const [analyticsPeriod, setAnalyticsPeriod] = useState<string>('MONTHLY');

  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const accountsQuery = useAccounts({ archived: false });
  const configsQuery = useQuery({
    queryKey: ['document-analyzer-configs'],
    queryFn: fetchDocumentAnalyzerConfigs,
  });

  const selectedConfig = useMemo(() => {
    if (!selectedConfigId || !configsQuery.data) return null;
    return configsQuery.data.find((c) => c.id === selectedConfigId) || null;
  }, [selectedConfigId, configsQuery.data]);

  const documentsQuery = useQuery({
    queryKey: ['analyzed-documents', selectedConfigId, statusFilter],
    queryFn: () => fetchDocuments(selectedConfigId!, statusFilter || undefined),
    enabled: !!selectedConfigId && activeTab === 'documents',
  });

  const templatesQuery = useQuery({
    queryKey: ['template-library'],
    queryFn: fetchTemplateLibrary,
    enabled: activeTab === 'templates',
  });

  const integrationsQuery = useQuery({
    queryKey: ['document-integrations', selectedConfigId],
    queryFn: () => fetchIntegrations(selectedConfigId!),
    enabled: !!selectedConfigId && activeTab === 'integrations',
  });

  const dashboardQuery = useQuery({
    queryKey: ['document-dashboard', selectedConfigId, analyticsPeriod],
    queryFn: () => fetchDashboard(selectedConfigId!, analyticsPeriod),
    enabled: !!selectedConfigId && activeTab === 'analytics',
  });

  // Mutations
  const createConfigMutation = useMutation({
    mutationFn: (data: {
      clientId: number;
      config: Partial<DocumentAnalyzerConfig>;
    }) => createDocumentAnalyzerConfig(data.clientId, data.config),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['document-analyzer-configs'],
      });
      setShowCreateModal(false);
      showToast('Document Analyzer configuration created', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: analyzeDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyzed-documents'] });
      showToast('Document analysis started', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (data: {
      configId: number;
      filename: string;
      originalUrl: string;
      mimeType: string;
      sizeBytes: number;
      format: string;
    }) =>
      uploadDocument(data.configId, {
        filename: data.filename,
        originalUrl: data.originalUrl,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        format: data.format,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyzed-documents'] });
      setShowUploadModal(false);
      showToast('Document uploaded successfully', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });

  // Redirect to login on 401 errors
  useRedirectOnUnauthorized(configsQuery.error);
  useRedirectOnUnauthorized(accountsQuery.error);
  useRedirectOnUnauthorized(createConfigMutation.error);
  useRedirectOnUnauthorized(analyzeMutation.error);
  useRedirectOnUnauthorized(uploadMutation.error);

  const handleCreateConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const clientId = parseInt(formData.get('clientId') as string, 10);

    createConfigMutation.mutate({
      clientId,
      config: {
        industryType: formData.get('industryType') as string,
        enableOCR: formData.get('enableOCR') === 'on',
        enableNER: formData.get('enableNER') === 'on',
        enableCompliance: formData.get('enableCompliance') === 'on',
        enableVersionCompare: formData.get('enableVersionCompare') === 'on',
        enableAutoClassification:
          formData.get('enableAutoClassification') === 'on',
        retentionDays:
          parseInt(formData.get('retentionDays') as string, 10) || 365,
      },
    });
  };

  const handleUploadDocument = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedConfigId) return;

    const formData = new FormData(e.currentTarget);
    const filename = formData.get('filename') as string;
    const originalUrl = formData.get('originalUrl') as string;
    const mimeType = formData.get('mimeType') as string;
    const sizeBytes = parseInt(formData.get('sizeBytes') as string, 10) || 0;
    const format = formData.get('format') as string;

    uploadMutation.mutate({
      configId: selectedConfigId,
      filename,
      originalUrl,
      mimeType,
      sizeBytes,
      format,
    });
  };

  const filteredTemplates = useMemo(() => {
    if (!templatesQuery.data?.templates) return [];
    if (!templateCategory) return templatesQuery.data.templates;
    return templatesQuery.data.templates.filter(
      (t) => t.category === templateCategory,
    );
  }, [templatesQuery.data, templateCategory]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileSearch },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'templates', label: 'Templates', icon: FileCode },
    { id: 'integrations', label: 'Integrations', icon: Plug },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="Smart Document Analyzer"
        subtitle="AI-powered document analysis with industry templates, compliance checking, and ROI tracking"
        icon={FileSearch}
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Configuration
          </Button>
        }
      />

      <div className="container-padding py-6 space-y-6">
        {/* Configuration Selector */}
      <Card>
        <CardBody>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
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
                    {config.client?.name || `Config ${config.id}`} (
                    {config.industryType})
                  </option>
                ))}
              </Select>
            </div>

            {selectedConfigId && activeTab === 'documents' && (
              <div className="w-48">
                <Select
                  label="Status Filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="FAILED">Failed</option>
                  <option value="NEEDS_REVIEW">Needs Review</option>
                </Select>
              </div>
            )}

            {selectedConfigId && activeTab === 'analytics' && (
              <div className="w-48">
                <Select
                  label="Period"
                  value={analyticsPeriod}
                  onChange={(e) => setAnalyticsPeriod(e.target.value)}
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                </Select>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Tabs */}
      {selectedConfigId && (
        <div className="border-b border-neutral-200 dark:border-neutral-700">
          <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:border-neutral-300'
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
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Industry
                    </p>
                    <p className="text-lg font-semibold">
                      {selectedConfig.industryType}
                    </p>
                  </div>
                  <Building2 className="h-8 w-8 text-purple-500" />
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Auto-Classify
                    </p>
                    <p className="text-lg font-semibold">
                      {selectedConfig.enableAutoClassification
                        ? 'Enabled'
                        : 'Disabled'}
                    </p>
                  </div>
                  <Zap className="h-8 w-8 text-yellow-500" />
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Compliance
                    </p>
                    <p className="text-lg font-semibold">
                      {selectedConfig.enableCompliance ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <Shield className="h-8 w-8 text-green-500" />
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Retention
                    </p>
                    <p className="text-lg font-semibold">
                      {selectedConfig.retentionDays} days
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-500" />
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Features</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>OCR (Optical Character Recognition)</span>
                    <Badge
                      variant={selectedConfig.enableOCR ? 'success' : 'neutral'}
                    >
                      {selectedConfig.enableOCR ? 'On' : 'Off'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Named Entity Recognition (NER)</span>
                    <Badge
                      variant={selectedConfig.enableNER ? 'success' : 'neutral'}
                    >
                      {selectedConfig.enableNER ? 'On' : 'Off'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Version Comparison</span>
                    <Badge
                      variant={
                        selectedConfig.enableVersionCompare
                          ? 'success'
                          : 'neutral'
                      }
                    >
                      {selectedConfig.enableVersionCompare ? 'On' : 'Off'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Auto-Routing</span>
                    <Badge
                      variant={
                        selectedConfig.enableAutoRouting ? 'success' : 'neutral'
                      }
                    >
                      {selectedConfig.enableAutoRouting ? 'On' : 'Off'}
                    </Badge>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Configuration</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Classification Threshold</span>
                    <span className="font-mono">
                      {Math.round(selectedConfig.classificationThreshold * 100)}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Status</span>
                    <Badge
                      variant={
                        selectedConfig.isActive ? 'success' : 'secondary'
                      }
                    >
                      {selectedConfig.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Client</span>
                    <span>{selectedConfig.client?.name || 'Unknown'}</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {selectedConfigId && activeTab === 'documents' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Analyzed Documents</h3>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() =>
                    queryClient.invalidateQueries({
                      queryKey: ['analyzed-documents'],
                    })
                  }
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button onClick={() => setShowUploadModal(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {documentsQuery.isLoading ? (
              <div className="text-center py-8 text-neutral-500">
                Loading documents...
              </div>
            ) : documentsQuery.data?.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                No documents found. Upload a document to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Filename
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Compliance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                    {documentsQuery.data?.map((doc) => (
                      <tr key={doc.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {doc.filename}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {doc.category && (
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.GENERAL}`}
                            >
                              {doc.category}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                          {doc.documentType || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            variant={STATUS_VARIANTS[doc.status] || 'neutral'}
                          >
                            {doc.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {doc.complianceStatus &&
                              COMPLIANCE_ICONS[doc.complianceStatus]}
                            {doc.riskScore !== null && (
                              <span className="text-xs text-neutral-500">
                                ({Math.round(doc.riskScore)}%)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                          {doc.totalAmount
                            ? `$${doc.totalAmount.toLocaleString()}`
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {doc.status === 'PENDING' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => analyzeMutation.mutate(doc.id)}
                              disabled={analyzeMutation.isPending}
                            >
                              Analyze
                            </Button>
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

      {/* Templates Tab */}
      {selectedConfigId && activeTab === 'templates' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Template Library</h3>
                <Select
                  value={templateCategory}
                  onChange={(e) => setTemplateCategory(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {templatesQuery.data?.categories?.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Select>
              </div>
            </CardHeader>
            <CardBody>
              {templatesQuery.isLoading ? (
                <div className="text-center py-8 text-neutral-500">
                  Loading templates...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.documentType}
                      className="border rounded-lg p-4 hover:border-blue-500 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
                            {template.name}
                          </h4>
                          <p className="text-sm text-neutral-500 mt-1">
                            {template.description}
                          </p>
                        </div>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${CATEGORY_COLORS[template.category] || CATEGORY_COLORS.GENERAL}`}
                        >
                          {template.category}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center gap-4 text-xs text-neutral-500">
                        <span>{template.fieldDefinitions.length} fields</span>
                        {template.industryType && (
                          <span>{template.industryType}</span>
                        )}
                        <span>
                          {Math.round(template.confidenceThreshold * 100)}%
                          threshold
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="secondary">
                          Preview
                        </Button>
                        <Button size="sm">Use Template</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Integrations Tab */}
      {selectedConfigId && activeTab === 'integrations' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Connected Integrations
                </h3>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Integration
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {integrationsQuery.isLoading ? (
                <div className="text-center py-8 text-neutral-500">
                  Loading integrations...
                </div>
              ) : integrationsQuery.data?.length === 0 ? (
                <div className="text-center py-8 text-neutral-500">
                  <Plug className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No integrations configured</p>
                  <p className="text-sm mt-2">
                    Connect to QuickBooks, Xero, Salesforce, DocuSign, and more.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {integrationsQuery.data?.map((integration) => (
                    <div key={integration.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{integration.name}</h4>
                        <Badge
                          variant={integration.isActive ? 'success' : 'neutral'}
                        >
                          {integration.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-neutral-500 mt-1">
                        {integration.integrationType}
                      </p>
                      {integration.lastSyncAt && (
                        <p className="text-xs text-neutral-400 mt-2">
                          Last sync:{' '}
                          {new Date(
                            integration.lastSyncAt,
                          ).toLocaleDateString()}
                          {integration.lastSyncStatus &&
                            ` (${integration.lastSyncStatus})`}
                        </p>
                      )}
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="secondary">
                          Configure
                        </Button>
                        <Button size="sm" variant="secondary">
                          Sync Now
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Available Integrations</h3>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[
                  'QuickBooks',
                  'Xero',
                  'Salesforce',
                  'DocuSign',
                  'Google Drive',
                  'SharePoint',
                  'Dropbox',
                  'Slack',
                  'Webhook',
                ].map((name) => (
                  <button
                    key={name}
                    className="border rounded-lg p-4 text-center hover:border-blue-500 transition-colors"
                  >
                    <div className="text-2xl mb-2">
                      {name === 'QuickBooks' && '📊'}
                      {name === 'Xero' && '📈'}
                      {name === 'Salesforce' && '☁️'}
                      {name === 'DocuSign' && '✍️'}
                      {name === 'Google Drive' && '📁'}
                      {name === 'SharePoint' && '📂'}
                      {name === 'Dropbox' && '📦'}
                      {name === 'Slack' && '💬'}
                      {name === 'Webhook' && '🔗'}
                    </div>
                    <span className="text-sm font-medium">{name}</span>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Analytics Tab */}
      {selectedConfigId && activeTab === 'analytics' && (
        <div className="space-y-6">
          {dashboardQuery.isLoading ? (
            <div className="text-center py-8 text-neutral-500">
              Loading analytics...
            </div>
          ) : dashboardQuery.data ? (
            <>
              {/* ROI Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-neutral-500">
                          Documents Processed
                        </p>
                        <p className="text-2xl font-bold">
                          {dashboardQuery.data.roi.documentsProcessed}
                        </p>
                      </div>
                      <FileText className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-neutral-500">Time Saved</p>
                        <p className="text-2xl font-bold">
                          {Math.round(dashboardQuery.data.roi.timeSavedMinutes)}{' '}
                          min
                        </p>
                        <p className="text-xs text-green-500">
                          {Math.round(
                            dashboardQuery.data.roi.timeSavingsPercentage,
                          )}
                          % faster
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-500" />
                    </div>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-neutral-500">
                          Est. Cost Saved
                        </p>
                        <p className="text-2xl font-bold">
                          $
                          {Math.round(
                            dashboardQuery.data.roi.estimatedCostSaved,
                          ).toLocaleString()}
                        </p>
                      </div>
                      <DollarSign className="h-8 w-8 text-yellow-500" />
                    </div>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-neutral-500">Success Rate</p>
                        <p className="text-2xl font-bold">
                          {Math.round(
                            dashboardQuery.data.processing.successRate,
                          )}
                          %
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </CardBody>
                </Card>
              </div>

              {/* Processing Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Processing Stats</h3>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span>Total Documents</span>
                        <span className="font-semibold">
                          {dashboardQuery.data.processing.totalDocuments}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Successful</span>
                        <span className="font-semibold text-green-600">
                          {dashboardQuery.data.processing.successfulDocuments}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Failed</span>
                        <span className="font-semibold text-red-600">
                          {dashboardQuery.data.processing.failedDocuments}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Processing Time</span>
                        <span className="font-semibold">
                          {Math.round(
                            dashboardQuery.data.processing.avgProcessingTimeMs,
                          )}
                          ms
                        </span>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Compliance Stats</h3>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />{' '}
                          Pass
                        </span>
                        <span className="font-semibold">
                          {dashboardQuery.data.compliance.passCount}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />{' '}
                          Warning
                        </span>
                        <span className="font-semibold">
                          {dashboardQuery.data.compliance.warningCount}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-500" /> Fail
                        </span>
                        <span className="font-semibold">
                          {dashboardQuery.data.compliance.failCount}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pass Rate</span>
                        <span className="font-semibold">
                          {Math.round(dashboardQuery.data.compliance.passRate)}%
                        </span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>

              {/* Category Breakdown */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Category Breakdown</h3>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {dashboardQuery.data.categories.map((cat) => (
                      <div
                        key={cat.category}
                        className="text-center p-4 border rounded-lg"
                      >
                        <span
                          className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${CATEGORY_COLORS[cat.category] || CATEGORY_COLORS.GENERAL}`}
                        >
                          {cat.category}
                        </span>
                        <p className="text-2xl font-bold mt-2">{cat.count}</p>
                        <p className="text-xs text-neutral-500">
                          {Math.round(cat.percentage)}%
                        </p>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Recent Activity</h3>
                </CardHeader>
                <CardBody>
                  <div className="space-y-2">
                    {dashboardQuery.data.recentActivity.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-neutral-400" />
                          <span className="text-sm">{item.filename}</span>
                          {item.category && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded ${CATEGORY_COLORS[item.category] || CATEGORY_COLORS.GENERAL}`}
                            >
                              {item.category}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={STATUS_VARIANTS[item.status] || 'neutral'}
                            className="text-xs"
                          >
                            {item.status}
                          </Badge>
                          {item.processedAt && (
                            <span className="text-xs text-neutral-500">
                              {new Date(item.processedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            </>
          ) : (
            <div className="text-center py-8 text-neutral-500">
              No analytics data available. Process some documents to see
              metrics.
            </div>
          )}
        </div>
      )}

      {/* Create Configuration Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              Create Document Analyzer Configuration
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

              <Select
                label="Industry Type"
                name="industryType"
                defaultValue="OTHER"
              >
                {INDUSTRY_TYPES.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry.replace(/_/g, ' ')}
                  </option>
                ))}
              </Select>

              <div className="space-y-2">
                <label className="text-sm font-medium">Features</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="enableOCR" defaultChecked />
                    <span className="text-sm">
                      Enable OCR for scanned documents
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="enableNER" defaultChecked />
                    <span className="text-sm">
                      Enable Named Entity Recognition
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="enableCompliance"
                      defaultChecked
                    />
                    <span className="text-sm">Enable Compliance Checking</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="enableAutoClassification"
                      defaultChecked
                    />
                    <span className="text-sm">Enable Auto-Classification</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="enableVersionCompare" />
                    <span className="text-sm">Enable Version Comparison</span>
                  </label>
                </div>
              </div>

              <Input
                label="Retention Days"
                name="retentionDays"
                type="number"
                defaultValue={365}
                min={1}
                max={3650}
              />

              <div className="flex gap-2 justify-end pt-4">
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

      {/* Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Upload Document</h2>
            <form onSubmit={handleUploadDocument} className="space-y-4">
              <Input
                label="Filename"
                name="filename"
                placeholder="document.pdf"
                required
              />

              <Input
                label="Document URL"
                name="originalUrl"
                type="url"
                placeholder="https://example.com/document.pdf"
                required
              />

              <Select label="Format" name="format" required>
                <option value="PDF">PDF</option>
                <option value="WORD">Word Document</option>
                <option value="EXCEL">Excel Spreadsheet</option>
                <option value="IMAGE">Image</option>
                <option value="SCANNED">Scanned Document</option>
                <option value="TEXT">Text File</option>
                <option value="OTHER">Other</option>
              </Select>

              <Input
                label="MIME Type"
                name="mimeType"
                placeholder="application/pdf"
                defaultValue="application/pdf"
                required
              />

              <Input
                label="File Size (bytes)"
                name="sizeBytes"
                type="number"
                placeholder="1024"
                defaultValue={0}
                min={0}
              />

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={uploadMutation.isPending}>
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentAnalyzerPage;
