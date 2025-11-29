/**
 * Smart Document Analyzer Page
 *
 * Tool 2.1: Document analysis with OCR, NER, field extraction, and compliance checking
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
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
  FileSearch,
  Settings,
  BarChart3,
  Upload,
  RefreshCw,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';

// Types
interface DocumentAnalyzerConfig {
  id: number;
  clientId: number;
  enableOCR: boolean;
  enableNER: boolean;
  enableCompliance: boolean;
  enableVersionCompare: boolean;
  retentionDays: number;
  isActive: boolean;
  client?: { id: number; name: string };
}

interface AnalyzedDocument {
  id: number;
  filename: string;
  format: string;
  status: string;
  documentType: string | null;
  complianceStatus: string | null;
  analyzedAt: string | null;
  createdAt: string;
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

// API functions
async function fetchDocumentAnalyzerConfigs(): Promise<DocumentAnalyzerConfig[]> {
  const res = await fetch('/api/document-analyzer/configs', { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch document analyzer configs');
  const data = await res.json();
  return data.configs || [];
}

async function fetchDocuments(
  configId: number,
  status?: string,
): Promise<AnalyzedDocument[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  const res = await fetch(`/api/document-analyzer/${configId}/documents?${params}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to fetch documents');
  const data = await res.json();
  return data.documents || [];
}

async function createDocumentAnalyzerConfig(
  clientId: number,
  data: Partial<DocumentAnalyzerConfig>,
): Promise<DocumentAnalyzerConfig> {
  const res = await fetch(`/api/clients/${clientId}/document-analyzer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create document analyzer config');
  const result = await res.json();
  return result.config;
}

async function uploadDocument(
  configId: number,
  data: { filename: string; originalUrl: string; mimeType: string; sizeBytes: number; format: string },
): Promise<AnalyzedDocument> {
  const res = await fetch(`/api/document-analyzer/${configId}/documents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to upload document');
  const result = await res.json();
  return result.document;
}

async function analyzeDocument(documentId: number): Promise<void> {
  const res = await fetch(`/api/document-analyzer/documents/${documentId}/analyze`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to analyze document');
}

function DocumentAnalyzerPage(): JSX.Element {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'templates' | 'settings'>('overview');

  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const clientsQuery = useClients({ includeArchived: false });
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

  // Mutations
  const createConfigMutation = useMutation({
    mutationFn: (data: { clientId: number; config: Partial<DocumentAnalyzerConfig> }) =>
      createDocumentAnalyzerConfig(data.clientId, data.config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-analyzer-configs'] });
      setShowCreateModal(false);
      showToast({ message: 'Document Analyzer configuration created', variant: 'success' });
    },
    onError: (error: Error) => {
      showToast({ message: error.message, variant: 'error' });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: analyzeDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyzed-documents'] });
      showToast({ message: 'Document analysis started', variant: 'success' });
    },
    onError: (error: Error) => {
      showToast({ message: error.message, variant: 'error' });
    },
  });

  useRedirectOnUnauthorized();

  const handleCreateConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const clientId = parseInt(formData.get('clientId') as string, 10);

    createConfigMutation.mutate({
      clientId,
      config: {
        enableOCR: formData.get('enableOCR') === 'on',
        enableNER: formData.get('enableNER') === 'on',
        enableCompliance: formData.get('enableCompliance') === 'on',
        enableVersionCompare: formData.get('enableVersionCompare') === 'on',
        retentionDays: parseInt(formData.get('retentionDays') as string, 10) || 365,
      },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Smart Document Analyzer"
        subtitle="AI-powered document analysis with OCR, field extraction, and compliance checking"
        icon={FileSearch}
        actions={
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Configuration
          </Button>
        }
      />

      {/* Configuration Selector */}
      <Card>
        <CardBody>
          <div className="flex gap-4">
            <Select
              label="Select Configuration"
              value={selectedConfigId?.toString() || ''}
              onChange={(e) => setSelectedConfigId(e.target.value ? parseInt(e.target.value, 10) : null)}
            >
              <option value="">Select a configuration...</option>
              {configsQuery.data?.map((config) => (
                <option key={config.id} value={config.id}>
                  {config.client?.name || `Config ${config.id}`}
                </option>
              ))}
            </Select>

            {selectedConfigId && (
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
            )}
          </div>
        </CardBody>
      </Card>

      {/* Tabs */}
      {selectedConfigId && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: FileSearch },
              { id: 'documents', label: 'Documents', icon: FileText },
              { id: 'templates', label: 'Templates', icon: Settings },
              { id: 'settings', label: 'Settings', icon: Settings },
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

      {/* Content */}
      {selectedConfigId && activeTab === 'overview' && selectedConfig && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">OCR</p>
                  <p className="text-lg font-semibold">
                    {selectedConfig.enableOCR ? 'Enabled' : 'Disabled'}
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
                  <p className="text-sm text-gray-500">NER</p>
                  <p className="text-lg font-semibold">
                    {selectedConfig.enableNER ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <FileSearch className="h-8 w-8 text-green-500" />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Compliance</p>
                  <p className="text-lg font-semibold">
                    {selectedConfig.enableCompliance ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Retention</p>
                  <p className="text-lg font-semibold">{selectedConfig.retentionDays} days</p>
                </div>
                <Clock className="h-8 w-8 text-purple-500" />
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {selectedConfigId && activeTab === 'documents' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Analyzed Documents</h3>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['analyzed-documents'] })}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Document
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            {documentsQuery.isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading documents...</div>
            ) : documentsQuery.data?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No documents found. Upload a document to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Filename
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Format
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Compliance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {documentsQuery.data?.map((doc) => (
                      <tr key={doc.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {doc.filename}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {doc.format}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {doc.documentType || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={STATUS_VARIANTS[doc.status] || 'neutral'}>
                            {doc.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {doc.complianceStatus && COMPLIANCE_ICONS[doc.complianceStatus]}
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

      {/* Create Configuration Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold mb-4">Create Document Analyzer Configuration</h2>
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

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="enableOCR" defaultChecked />
                  <span className="text-sm">Enable OCR for scanned documents</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="enableNER" defaultChecked />
                  <span className="text-sm">Enable Named Entity Recognition</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="enableCompliance" defaultChecked />
                  <span className="text-sm">Enable Compliance Checking</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="enableVersionCompare" />
                  <span className="text-sm">Enable Version Comparison</span>
                </label>
              </div>

              <Input
                label="Retention Days"
                name="retentionDays"
                type="number"
                defaultValue={365}
                min={1}
                max={3650}
              />

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
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

export default DocumentAnalyzerPage;
