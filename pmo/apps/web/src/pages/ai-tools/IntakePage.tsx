/**
 * Client Intake Automator Page
 *
 * Tool 1.4: Automated client intake with smart forms, document collection, and compliance
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
  ClipboardList,
  FileCheck,
  Users,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';

// Types
interface IntakeConfig {
  id: number;
  clientId: number;
  industryType: string;
  enableDocumentCollection: boolean;
  enableComplianceChecks: boolean;
  enableESignature: boolean;
  client?: { id: number; name: string };
  _count?: { forms: number; submissions: number; workflows: number };
}

interface IntakeForm {
  id: number;
  name: string;
  description: string | null;
  isPublished: boolean;
  requiresAuthentication: boolean;
  publicUrl: string | null;
  fields?: IntakeFormField[];
  _count?: { submissions: number };
}

interface IntakeFormField {
  id: number;
  label: string;
  fieldType: string;
  isRequired: boolean;
  order: number;
  options: string[];
}

interface IntakeSubmission {
  id: number;
  formId: number;
  status: string;
  submitterName: string | null;
  submitterEmail: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  form?: { name: string };
  _count?: { documents: number; complianceChecks: number };
}

const SUBMISSION_STATUS_VARIANTS: Record<
  string,
  'primary' | 'success' | 'warning' | 'neutral' | 'secondary'
> = {
  DRAFT: 'neutral',
  SUBMITTED: 'primary',
  IN_REVIEW: 'warning',
  PENDING_DOCUMENTS: 'warning',
  PENDING_SIGNATURE: 'warning',
  COMPLETED: 'success',
  REJECTED: 'secondary',
};

// API functions
async function fetchConfigs(): Promise<IntakeConfig[]> {
  const res = await fetch(buildApiUrl('/intake/configs'), buildOptions());
  if (!res.ok) {
    const error = new Error('Failed to fetch configs') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.configs || [];
}

async function fetchForms(configId: number): Promise<IntakeForm[]> {
  const res = await fetch(
    buildApiUrl(`/intake/${configId}/forms`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch forms') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.forms || [];
}

async function fetchSubmissions(
  configId: number,
  status?: string,
): Promise<IntakeSubmission[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);
  const res = await fetch(
    buildApiUrl(`/intake/${configId}/submissions?${params}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch submissions') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.submissions || [];
}

async function createConfig(
  clientId: number,
  data: Partial<IntakeConfig>,
): Promise<IntakeConfig> {
  const res = await fetch(
    buildApiUrl(`/clients/${clientId}/intake`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to create config') as ApiError;
    error.status = res.status;
    throw error;
  }
  const result = await res.json();
  return result.config;
}

async function createForm(
  configId: number,
  data: { name: string; description?: string },
): Promise<IntakeForm> {
  const res = await fetch(
    buildApiUrl(`/intake/${configId}/forms`),
    buildOptions({
      method: 'POST',
      body: JSON.stringify(data),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to create form') as ApiError;
    error.status = res.status;
    throw error;
  }
  const result = await res.json();
  return result.form;
}

async function updateSubmissionStatus(
  submissionId: number,
  status: string,
): Promise<IntakeSubmission> {
  const res = await fetch(
    buildApiUrl(`/intake/submissions/${submissionId}/status`),
    buildOptions({
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  );
  if (!res.ok) {
    const error = new Error('Failed to update submission status') as ApiError;
    error.status = res.status;
    throw error;
  }
  const result = await res.json();
  return result.submission;
}

function IntakePage(): JSX.Element {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [activeTab, setActiveTab] = useState<
    'forms' | 'submissions' | 'compliance'
  >('forms');
  const [showCreateConfigModal, setShowCreateConfigModal] = useState(false);
  const [showCreateFormModal, setShowCreateFormModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<number | null>(null);

  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Queries
  const accountsQuery = useAccounts({ archived: false });
  const configsQuery = useQuery({
    queryKey: ['intake-configs'],
    queryFn: fetchConfigs,
  });

  const formsQuery = useQuery({
    queryKey: ['intake-forms', selectedConfigId],
    queryFn: () => fetchForms(selectedConfigId!),
    enabled: !!selectedConfigId,
  });

  const submissionsQuery = useQuery({
    queryKey: ['intake-submissions', selectedConfigId, statusFilter],
    queryFn: () =>
      fetchSubmissions(selectedConfigId!, statusFilter || undefined),
    enabled: !!selectedConfigId && activeTab === 'submissions',
  });

  // Redirect to login on 401 errors from queries
  useRedirectOnUnauthorized(configsQuery.error);
  useRedirectOnUnauthorized(accountsQuery.error);
  useRedirectOnUnauthorized(formsQuery.error);
  useRedirectOnUnauthorized(submissionsQuery.error);

  const accounts = accountsQuery.data?.data ?? [];
  const forms = formsQuery.data ?? [];
  const submissions = submissionsQuery.data ?? [];

  const selectedConfig = useMemo(() => {
    const configList = configsQuery.data ?? [];
    if (!selectedConfigId) return null;
    return configList.find((c) => c.id === selectedConfigId) || null;
  }, [selectedConfigId, configsQuery.data]);

  const filteredConfigs = useMemo(() => {
    const configList = configsQuery.data ?? [];
    if (!selectedClientId) return configList;
    return configList.filter((c) => c.clientId === Number(selectedClientId));
  }, [configsQuery.data, selectedClientId]);

  // Stats
  const pendingSubmissions = useMemo(() => {
    const submissionList = submissionsQuery.data ?? [];
    return submissionList.filter(
      (s) => s.status === 'SUBMITTED' || s.status === 'IN_REVIEW',
    ).length;
  }, [submissionsQuery.data]);

  // Mutations
  const createConfigMutation = useMutation({
    mutationFn: ({
      clientId,
      data,
    }: {
      clientId: number;
      data: Partial<IntakeConfig>;
    }) => createConfig(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake-configs'] });
      setShowCreateConfigModal(false);
      showToast('Intake configuration created successfully', 'success');
    },
    onError: (error) => {
      showToast(
        error instanceof Error ? error.message : 'Failed to create config',
        'error',
      );
    },
  });

  const createFormMutation = useMutation({
    mutationFn: ({
      configId,
      data,
    }: {
      configId: number;
      data: { name: string; description?: string };
    }) => createForm(configId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['intake-forms', selectedConfigId],
      });
      setShowCreateFormModal(false);
      showToast('Form created successfully', 'success');
    },
    onError: (error) => {
      showToast(
        error instanceof Error ? error.message : 'Failed to create form',
        'error',
      );
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      submissionId,
      status,
    }: {
      submissionId: number;
      status: string;
    }) => updateSubmissionStatus(submissionId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake-submissions'] });
      showToast('Submission status updated', 'success');
    },
    onError: (error) => {
      showToast(
        error instanceof Error ? error.message : 'Failed to update status',
        'error',
      );
    },
  });

  // Redirect to login on 401 errors from mutations
  useRedirectOnUnauthorized(createConfigMutation.error);
  useRedirectOnUnauthorized(createFormMutation.error);
  useRedirectOnUnauthorized(updateStatusMutation.error);

  const handleCreateConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createConfigMutation.mutate({
      clientId: Number(formData.get('clientId')),
      data: {
        industryType: formData.get('industryType') as string,
        enableDocumentCollection:
          formData.get('enableDocumentCollection') === 'on',
        enableComplianceChecks: formData.get('enableComplianceChecks') === 'on',
        enableESignature: formData.get('enableESignature') === 'on',
      },
    });
  };

  const handleCreateForm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createFormMutation.mutate({
      configId: selectedConfigId!,
      data: {
        name: formData.get('name') as string,
        description: (formData.get('description') as string) || undefined,
      },
    });
  };

  const handleCopyUrl = async (url: string, formId: number) => {
    await navigator.clipboard.writeText(url);
    setCopiedUrl(formId);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Client Intake"
        description="Automated client intake with smart forms and compliance management"
        actions={
          <Button onClick={() => setShowCreateConfigModal(true)}>
            <Plus className="w-4 h-4" />
            New Configuration
          </Button>
        }
      />

      <div className="page-content space-y-6">
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
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
              <Select
                label="Configuration"
                value={selectedConfigId?.toString() || ''}
                onChange={(e) =>
                  setSelectedConfigId(
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              >
                <option value="">Select a configuration...</option>
                {filteredConfigs.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.client?.name || `Config ${config.id}`} (
                    {config.industryType})
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
              { id: 'forms', label: 'Forms', icon: ClipboardList },
              {
                id: 'submissions',
                label: 'Submissions',
                icon: Users,
                badge: pendingSubmissions,
              },
              { id: 'compliance', label: 'Compliance', icon: FileCheck },
            ].map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
                  activeTab === id
                    ? 'border-primary-500 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                    : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                {badge !== undefined && badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded-full">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Content Area */}
        {!selectedConfig ? (
          <Card>
            <CardBody>
              <div className="text-center py-8">
                <ClipboardList className="w-12 h-12 text-neutral-400 dark:text-neutral-500 mx-auto mb-4" />
                <p className="text-neutral-600 dark:text-neutral-400">
                  Select an intake configuration to manage forms and
                  submissions, or create a new one.
                </p>
              </div>
            </CardBody>
          </Card>
        ) : (
          <>
            {/* Forms Tab */}
            {activeTab === 'forms' && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <Button onClick={() => setShowCreateFormModal(true)}>
                    <Plus className="w-4 h-4" />
                    Create Form
                  </Button>
                </div>

                {formsQuery.isLoading ? (
                  <Card>
                    <CardBody>
                      <p className="text-center text-neutral-500 dark:text-neutral-400">
                        Loading forms...
                      </p>
                    </CardBody>
                  </Card>
                ) : forms.length === 0 ? (
                  <Card>
                    <CardBody>
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-neutral-400 dark:text-neutral-500 mx-auto mb-4" />
                        <p className="text-neutral-600 dark:text-neutral-400">
                          No intake forms created yet. Create your first form to
                          start collecting client information.
                        </p>
                      </div>
                    </CardBody>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {forms.map((form) => (
                      <Card
                        key={form.id}
                        className="hover:shadow-md transition-shadow"
                      >
                        <CardBody>
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-lg text-neutral-900 dark:text-neutral-100">
                                {form.name}
                              </h3>
                              {form.description && (
                                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                                  {form.description}
                                </p>
                              )}
                            </div>
                            <Badge
                              variant={form.isPublished ? 'success' : 'neutral'}
                            >
                              {form.isPublished ? 'Published' : 'Draft'}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                            <span>
                              {form._count?.submissions ?? 0} submissions
                            </span>
                            <span>{form.fields?.length ?? 0} fields</span>
                          </div>

                          {form.isPublished && form.publicUrl && (
                            <div className="flex items-center gap-2">
                              <Input
                                value={form.publicUrl}
                                readOnly
                                className="text-xs"
                              />
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  handleCopyUrl(form.publicUrl!, form.id)
                                }
                              >
                                {copiedUrl === form.id ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  window.open(form.publicUrl!, '_blank')
                                }
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Submissions Tab */}
            {activeTab === 'submissions' && (
              <div className="space-y-4">
                <Card>
                  <CardBody>
                    <Select
                      label="Filter by Status"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="">All Statuses</option>
                      <option value="DRAFT">Draft</option>
                      <option value="SUBMITTED">Submitted</option>
                      <option value="IN_REVIEW">In Review</option>
                      <option value="PENDING_DOCUMENTS">
                        Pending Documents
                      </option>
                      <option value="PENDING_SIGNATURE">
                        Pending Signature
                      </option>
                      <option value="COMPLETED">Completed</option>
                      <option value="REJECTED">Rejected</option>
                    </Select>
                  </CardBody>
                </Card>

                {submissionsQuery.isLoading ? (
                  <Card>
                    <CardBody>
                      <p className="text-center text-neutral-500 dark:text-neutral-400">
                        Loading submissions...
                      </p>
                    </CardBody>
                  </Card>
                ) : submissions.length === 0 ? (
                  <Card>
                    <CardBody>
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-neutral-400 dark:text-neutral-500 mx-auto mb-4" />
                        <p className="text-neutral-600 dark:text-neutral-400">
                          No submissions found.
                        </p>
                      </div>
                    </CardBody>
                  </Card>
                ) : (
                  submissions.map((submission) => (
                    <Card
                      key={submission.id}
                      className="hover:shadow-md transition-shadow"
                    >
                      <CardBody>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                                {submission.submitterName ||
                                  submission.submitterEmail ||
                                  'Anonymous'}
                              </span>
                              <Badge
                                variant={
                                  SUBMISSION_STATUS_VARIANTS[
                                    submission.status
                                  ] || 'neutral'
                                }
                              >
                                {submission.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-sm text-neutral-600 dark:text-neutral-400">
                              Form: {submission.form?.name}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400 mt-2">
                              {submission.submittedAt && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Submitted:{' '}
                                  {new Date(
                                    submission.submittedAt,
                                  ).toLocaleString()}
                                </span>
                              )}
                              <span>
                                {submission._count?.documents ?? 0} documents
                              </span>
                              <span>
                                {submission._count?.complianceChecks ?? 0}{' '}
                                compliance checks
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {submission.status === 'SUBMITTED' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    submissionId: submission.id,
                                    status: 'IN_REVIEW',
                                  })
                                }
                              >
                                Start Review
                              </Button>
                            )}
                            {submission.status === 'IN_REVIEW' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      submissionId: submission.id,
                                      status: 'COMPLETED',
                                    })
                                  }
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      submissionId: submission.id,
                                      status: 'REJECTED',
                                    })
                                  }
                                >
                                  <AlertCircle className="w-4 h-4" />
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Compliance Tab */}
            {activeTab === 'compliance' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileCheck className="w-5 h-5" />
                      Compliance Status
                    </h3>
                  </CardHeader>
                  <CardBody>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                        <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                          {selectedConfig.enableDocumentCollection ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                          )}
                          <span>Document Collection</span>
                        </div>
                        <Badge
                          variant={
                            selectedConfig.enableDocumentCollection
                              ? 'success'
                              : 'neutral'
                          }
                        >
                          {selectedConfig.enableDocumentCollection
                            ? 'Enabled'
                            : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                        <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                          {selectedConfig.enableComplianceChecks ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                          )}
                          <span>Compliance Checks</span>
                        </div>
                        <Badge
                          variant={
                            selectedConfig.enableComplianceChecks
                              ? 'success'
                              : 'neutral'
                          }
                        >
                          {selectedConfig.enableComplianceChecks
                            ? 'Enabled'
                            : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                        <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100">
                          {selectedConfig.enableESignature ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                          )}
                          <span>E-Signatures</span>
                        </div>
                        <Badge
                          variant={
                            selectedConfig.enableESignature
                              ? 'success'
                              : 'neutral'
                          }
                        >
                          {selectedConfig.enableESignature
                            ? 'Enabled'
                            : 'Disabled'}
                        </Badge>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">Quick Stats</h3>
                  </CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                        <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                          {selectedConfig._count?.forms ?? 0}
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          Active Forms
                        </p>
                      </div>
                      <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                        <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                          {selectedConfig._count?.submissions ?? 0}
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          Total Submissions
                        </p>
                      </div>
                      <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {pendingSubmissions}
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          Pending Review
                        </p>
                      </div>
                      <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                        <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                          {selectedConfig._count?.workflows ?? 0}
                        </p>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          Workflows
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Config Modal */}
      {showCreateConfigModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                New Intake Configuration
              </h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleCreateConfig} className="space-y-4">
                <Select label="Client" name="clientId" required>
                  <option value="">Select a client...</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </Select>
                <Select label="Industry Type" name="industryType" required>
                  <option value="">Select industry...</option>
                  <option value="HEALTHCARE">Healthcare</option>
                  <option value="LEGAL">Legal</option>
                  <option value="FINANCIAL">Financial Services</option>
                  <option value="REAL_ESTATE">Real Estate</option>
                  <option value="CONSULTING">Consulting</option>
                  <option value="OTHER">Other</option>
                </Select>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                    <input
                      type="checkbox"
                      name="enableDocumentCollection"
                      className="rounded"
                    />
                    <span className="text-sm">Enable Document Collection</span>
                  </label>
                  <label className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                    <input
                      type="checkbox"
                      name="enableComplianceChecks"
                      className="rounded"
                    />
                    <span className="text-sm">Enable Compliance Checks</span>
                  </label>
                  <label className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
                    <input
                      type="checkbox"
                      name="enableESignature"
                      className="rounded"
                    />
                    <span className="text-sm">Enable E-Signatures</span>
                  </label>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCreateConfigModal(false)}
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

      {/* Create Form Modal */}
      {showCreateFormModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                Create Intake Form
              </h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={handleCreateForm} className="space-y-4">
                <Input
                  label="Form Name"
                  name="name"
                  required
                  placeholder="e.g., New Client Intake"
                />
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    rows={3}
                    className="w-full rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900/50 text-neutral-900 dark:text-neutral-100 px-3 py-2 text-sm"
                    placeholder="Optional description for the form..."
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCreateFormModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createFormMutation.isPending}>
                    {createFormMutation.isPending
                      ? 'Creating...'
                      : 'Create Form'}
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

export default IntakePage;
