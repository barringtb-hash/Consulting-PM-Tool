import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useCreateProject } from '../api/queries';
import { useAccounts } from '../api/hooks/crm';
import { type ProjectStatus } from '../api/projects';
import useRedirectOnUnauthorized from '../auth/useRedirectOnUnauthorized';
import { useClientProjectContext } from './ClientProjectContext';
import { Button } from '../ui/Button';
import { Card, CardBody, CardHeader, CardTitle } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';
import { PageHeader } from '../ui/PageHeader';
import { useToast } from '../ui/Toast';

// Project templates based on AI Consulting PMO model
interface ProjectTemplate {
  id: string;
  name: string;
  type: string;
  description: string;
  duration: string;
  milestones: string[];
  tasks: string[];
}

const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'discovery',
    name: 'AI Discovery & Roadmap',
    type: 'Discovery',
    description:
      'Comprehensive discovery phase to assess AI readiness, identify use cases, and create a strategic roadmap.',
    duration: '2-4 weeks',
    milestones: [
      'Kickoff & stakeholder alignment',
      'Current state assessment',
      'Use case identification & prioritization',
      'Roadmap delivery',
    ],
    tasks: [
      'Conduct stakeholder interviews',
      'Assess data infrastructure',
      'Identify quick wins and strategic initiatives',
      'Create prioritized roadmap',
    ],
  },
  {
    id: 'poc',
    name: 'Proof of Concept / Pilot',
    type: 'PoC',
    description:
      'Build and validate a small-scale AI solution to prove feasibility and business value.',
    duration: '4-8 weeks',
    milestones: [
      'Requirements finalization',
      'Prototype development',
      'Testing & validation',
      'Results presentation',
    ],
    tasks: [
      'Define success criteria',
      'Build minimal viable solution',
      'Conduct user testing',
      'Document findings and recommendations',
    ],
  },
  {
    id: 'implementation',
    name: 'Implementation / Rollout',
    type: 'Implementation',
    description:
      'Full-scale implementation of AI solution with production deployment and user adoption.',
    duration: '8-16 weeks',
    milestones: [
      'Solution design & architecture',
      'Development & integration',
      'Testing & QA',
      'Deployment & go-live',
      'Post-launch support',
    ],
    tasks: [
      'Design system architecture',
      'Develop core features',
      'Integrate with existing systems',
      'Conduct UAT',
      'Deploy to production',
      'Monitor and optimize',
    ],
  },
  {
    id: 'training',
    name: 'Training & Workshop',
    type: 'Training',
    description:
      'Hands-on training and workshops to build AI literacy and enable teams.',
    duration: '1-2 weeks',
    milestones: [
      'Training content development',
      'Workshop delivery',
      'Hands-on exercises',
      'Post-training support',
    ],
    tasks: [
      'Create training materials',
      'Conduct interactive workshops',
      'Provide hands-on examples',
      'Share resources and documentation',
    ],
  },
  {
    id: 'retainer',
    name: 'Retainer / Ongoing Support',
    type: 'Retainer',
    description:
      'Continuous advisory and support for AI initiatives, optimization, and troubleshooting.',
    duration: 'Ongoing',
    milestones: ['Monthly check-ins', 'Quarterly reviews'],
    tasks: [
      'Regular advisory sessions',
      'Performance monitoring',
      'Optimization recommendations',
      'Ad-hoc support',
    ],
  },
  {
    id: 'custom',
    name: 'Custom / Mixed',
    type: 'Mixed',
    description:
      'Flexible project structure combining multiple engagement types.',
    duration: 'Variable',
    milestones: [],
    tasks: [],
  },
];

const STATUS_OPTIONS: Array<{ value: ProjectStatus; label: string }> = [
  { value: 'PLANNING', label: 'Planning' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

interface ProjectFormData {
  clientId: number | '';
  templateId: string;
  name: string;
  type: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  goals: string;
  description: string;
}

type WizardStep = 'client' | 'template' | 'details' | 'preview';

function ProjectSetupPage(): JSX.Element {
  const navigate = useNavigate();
  const { selectedClient, setSelectedClient, setSelectedProject } =
    useClientProjectContext();
  const { showToast } = useToast();

  const accountsQuery = useAccounts({ archived: false });
  const createProjectMutation = useCreateProject();

  // Check URL params for initial step (useful for testing)
  const urlParams = new URLSearchParams(window.location.search);
  const urlStep = urlParams.get('step') as WizardStep | null;
  const urlClientId = urlParams.get('clientId');
  const initialStep: WizardStep =
    urlStep && ['client', 'template', 'details', 'preview'].includes(urlStep)
      ? urlStep
      : 'client';

  const [step, setStep] = useState<WizardStep>(initialStep);
  const [formData, setFormData] = useState<ProjectFormData>(() => {
    const clientId = urlClientId
      ? Number(urlClientId)
      : (selectedClient?.id ?? '');
    const templateId = urlParams.get('templateId') || '';
    const template = PROJECT_TEMPLATES.find((t) => t.id === templateId);

    return {
      clientId,
      templateId,
      name: '',
      type: template?.type || '',
      status: 'PLANNING',
      startDate: '',
      endDate: '',
      goals: '',
      description: '',
    };
  });
  const [accountSearchTerm, setAccountSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  useRedirectOnUnauthorized(accountsQuery.error);
  useRedirectOnUnauthorized(createProjectMutation.error);

  useEffect(() => {
    if (selectedClient && !formData.clientId) {
      setFormData((prev) => ({ ...prev, clientId: selectedClient.id }));
      // If client is pre-selected and we're on the client step, skip to template
      if (step === 'client') {
        setStep('template');
      }
    }
  }, [selectedClient, formData.clientId, step]);

  const selectedTemplate = useMemo(
    () => PROJECT_TEMPLATES.find((t) => t.id === formData.templateId),
    [formData.templateId],
  );

  const selectedAccountData = useMemo(
    () => accountsQuery.data?.data?.find((c) => c.id === formData.clientId),
    [accountsQuery.data?.data, formData.clientId],
  );

  const filteredAccounts = useMemo(() => {
    if (!accountsQuery.data?.data) return [];
    if (!accountSearchTerm) return accountsQuery.data.data;

    const term = accountSearchTerm.toLowerCase();
    return accountsQuery.data.data.filter((account) =>
      account.name.toLowerCase().includes(term),
    );
  }, [accountsQuery.data?.data, accountSearchTerm]);

  const stepConfig = [
    { key: 'client' as const, label: 'Choose Account', number: 1 },
    { key: 'template' as const, label: 'Choose Template', number: 2 },
    { key: 'details' as const, label: 'Project Details', number: 3 },
    { key: 'preview' as const, label: 'Review & Create', number: 4 },
  ];

  const currentStepIndex = stepConfig.findIndex((s) => s.key === step);

  const handleNext = () => {
    setError(null);

    if (step === 'client') {
      if (!formData.clientId) {
        setError('Please select an account to continue');
        return;
      }
      const client = accountsQuery.data?.data?.find(
        (c) => c.id === formData.clientId,
      );
      if (client) {
        setSelectedClient(client);
      }
      setStep('template');
    } else if (step === 'template') {
      if (!formData.templateId) {
        setError('Please select a template to continue');
        return;
      }
      setStep('details');
    } else if (step === 'details') {
      if (!formData.name.trim()) {
        setError('Project name is required');
        return;
      }
      setStep('preview');
    }
  };

  const handleBack = () => {
    setError(null);
    if (step === 'template') setStep('client');
    else if (step === 'details') setStep('template');
    else if (step === 'preview') setStep('details');
  };

  const handleSelectTemplate = (templateId: string) => {
    const template = PROJECT_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setFormData((prev) => ({
        ...prev,
        templateId: template.id,
        type: template.type,
        // Auto-fill project name if empty
        name:
          prev.name ||
          `${selectedAccountData?.name || 'Account'} - ${template.name}`,
      }));
    }
  };

  const handleCreateProject = async () => {
    if (!formData.clientId) {
      setError('Account is required');
      return;
    }

    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }

    setError(null);

    try {
      const project = await createProjectMutation.mutateAsync({
        clientId: formData.clientId,
        name: formData.name,
        status: formData.status,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
      });

      setSelectedProject(project);
      showToast(`Project "${formData.name}" created successfully!`, 'success');
      navigate(`/projects/${project.id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to create project';
      setError(message);
      showToast(message, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="New Project Setup"
        description="Create a new project using guided workflow templates"
        action={
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        }
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <nav aria-label="Progress">
            <ol className="flex items-center justify-between">
              {stepConfig.map((s, idx) => {
                const isActive = s.key === step;
                const isCompleted = idx < currentStepIndex;
                const isAccessible = idx <= currentStepIndex;

                return (
                  <li key={s.key} className="flex items-center flex-1">
                    <div
                      className={`flex items-center ${idx < stepConfig.length - 1 ? 'w-full' : ''}`}
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                            isCompleted
                              ? 'bg-primary-600 border-primary-600'
                              : isActive
                                ? 'border-primary-600 bg-white dark:bg-neutral-800'
                                : 'border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-5 h-5 text-white" />
                          ) : (
                            <span
                              className={`text-sm font-medium ${
                                isActive
                                  ? 'text-primary-600'
                                  : 'text-neutral-500'
                              }`}
                            >
                              {s.number}
                            </span>
                          )}
                        </div>
                        <span
                          className={`mt-2 text-xs font-medium ${
                            isAccessible
                              ? 'text-neutral-900 dark:text-neutral-100'
                              : 'text-neutral-500 dark:text-neutral-400'
                          }`}
                        >
                          {s.label}
                        </span>
                      </div>
                      {idx < stepConfig.length - 1 && (
                        <div
                          className={`flex-1 h-0.5 mx-4 ${
                            isCompleted
                              ? 'bg-primary-600'
                              : 'bg-neutral-300 dark:bg-neutral-600'
                          }`}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        {/* Step Content */}
        {step === 'client' && (
          <Card>
            <CardHeader>
              <CardTitle>Select an Account</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-neutral-600 dark:text-neutral-400">
                Choose which account this project belongs to. You can also{' '}
                <Link
                  to="/crm/accounts"
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  create a new account
                </Link>{' '}
                if needed.
              </p>

              {accountsQuery.isLoading && (
                <p className="text-neutral-600 dark:text-neutral-400">
                  Loading accounts…
                </p>
              )}

              {accountsQuery.error && (
                <p className="text-danger-600">Unable to load accounts.</p>
              )}

              {accountsQuery.data?.data && (
                <>
                  <div>
                    <label htmlFor="account-search" className="sr-only">
                      Search accounts
                    </label>
                    <Input
                      id="account-search"
                      type="text"
                      placeholder="Search accounts by name..."
                      value={accountSearchTerm}
                      onChange={(e) => setAccountSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                    {filteredAccounts.map((account) => (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            clientId: account.id,
                          }))
                        }
                        className={`p-4 text-left border-2 rounded-lg transition-all ${
                          formData.clientId === account.id
                            ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30'
                            : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                              {account.name}
                            </h3>
                            {account.industry && (
                              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                                {account.industry}
                              </p>
                            )}
                          </div>
                          {formData.clientId === account.id && (
                            <Check className="w-5 h-5 text-primary-600 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>

                  {filteredAccounts.length === 0 && (
                    <p className="text-neutral-600 dark:text-neutral-400 text-center py-4">
                      No accounts found matching your search.
                    </p>
                  )}
                </>
              )}

              {error && (
                <p className="text-danger-600 text-sm font-medium">{error}</p>
              )}
            </CardBody>
          </Card>
        )}

        {step === 'template' && (
          <Card>
            <CardHeader>
              <CardTitle>Choose a Project Template</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <p className="text-neutral-600 dark:text-neutral-400">
                Select a template that best matches your engagement type.
                Templates provide suggested milestones and tasks to help you get
                started quickly.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PROJECT_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelectTemplate(template.id)}
                    className={`p-4 text-left border-2 rounded-lg transition-all ${
                      formData.templateId === template.id
                        ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/30'
                        : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {template.name}
                      </h3>
                      {formData.templateId === template.id && (
                        <Check className="w-5 h-5 text-primary-600 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
                      {template.description}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Duration: {template.duration}
                    </p>
                  </button>
                ))}
              </div>

              {error && (
                <p className="text-danger-600 text-sm font-medium">{error}</p>
              )}
            </CardBody>
          </Card>
        )}

        {step === 'details' && (
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardBody className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label
                    htmlFor="project-name"
                    className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1"
                  >
                    Project Name <span className="text-danger-600">*</span>
                  </label>
                  <Input
                    id="project-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Acme Corp - AI Discovery & Roadmap"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="project-type"
                    className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1"
                  >
                    Project Type
                  </label>
                  <Input
                    id="project-type"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, type: e.target.value }))
                    }
                    placeholder="e.g., Discovery, PoC, Implementation"
                  />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Auto-filled from template, can be customized
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="project-status"
                    className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1"
                  >
                    Initial Status
                  </label>
                  <Select
                    id="project-status"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        status: e.target.value as ProjectStatus,
                      }))
                    }
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label
                    htmlFor="project-start-date"
                    className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1"
                  >
                    Start Date
                  </label>
                  <Input
                    id="project-start-date"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label
                    htmlFor="project-end-date"
                    className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1"
                  >
                    Target End Date
                  </label>
                  <Input
                    id="project-end-date"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="project-goals"
                    className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1"
                  >
                    Goals & Objectives
                  </label>
                  <Textarea
                    id="project-goals"
                    value={formData.goals}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        goals: e.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="What are the key goals and success criteria for this project?"
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="project-description"
                    className="block text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-1"
                  >
                    Description
                  </label>
                  <Textarea
                    id="project-description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="Additional context, scope, or notes about this project..."
                  />
                </div>
              </div>

              {error && (
                <p className="text-danger-600 text-sm font-medium">{error}</p>
              )}
            </CardBody>
          </Card>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Review Project Details</CardTitle>
              </CardHeader>
              <CardBody className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                      Account
                    </h4>
                    <p className="text-neutral-900 dark:text-neutral-100">
                      {selectedAccountData?.name || 'Not selected'}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                      Template
                    </h4>
                    <p className="text-neutral-900 dark:text-neutral-100">
                      {selectedTemplate?.name || 'Not selected'}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                      Project Name
                    </h4>
                    <p className="text-neutral-900 dark:text-neutral-100">
                      {formData.name}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                      Type
                    </h4>
                    <p className="text-neutral-900 dark:text-neutral-100">
                      {formData.type || 'Not specified'}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                      Status
                    </h4>
                    <p className="text-neutral-900 dark:text-neutral-100">
                      {STATUS_OPTIONS.find((s) => s.value === formData.status)
                        ?.label || formData.status}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                      Duration
                    </h4>
                    <p className="text-neutral-900 dark:text-neutral-100">
                      {formData.startDate && formData.endDate
                        ? `${new Date(formData.startDate).toLocaleDateString()} - ${new Date(formData.endDate).toLocaleDateString()}`
                        : formData.startDate
                          ? `From ${new Date(formData.startDate).toLocaleDateString()}`
                          : 'Not specified'}
                    </p>
                  </div>

                  {formData.goals && (
                    <div className="md:col-span-2">
                      <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                        Goals
                      </h4>
                      <p className="text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap">
                        {formData.goals}
                      </p>
                    </div>
                  )}

                  {formData.description && (
                    <div className="md:col-span-2">
                      <h4 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">
                        Description
                      </h4>
                      <p className="text-neutral-900 dark:text-neutral-100 whitespace-pre-wrap">
                        {formData.description}
                      </p>
                    </div>
                  )}
                </div>

                {error && (
                  <p className="text-danger-600 text-sm font-medium">{error}</p>
                )}
              </CardBody>
            </Card>

            {selectedTemplate && selectedTemplate.milestones.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Suggested Milestones & Tasks</CardTitle>
                </CardHeader>
                <CardBody>
                  <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                    Based on the {selectedTemplate.name} template, here are
                    suggested milestones and tasks. You can customize these
                    after creating the project.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                        Milestones
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-neutral-700 dark:text-neutral-300">
                        {selectedTemplate.milestones.map((milestone, idx) => (
                          <li key={idx}>{milestone}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                        Tasks
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-neutral-700 dark:text-neutral-300">
                        {selectedTemplate.tasks.map((task, idx) => (
                          <li key={idx}>{task}</li>
                        ))}
                      </ul>
                    </div>

                    <p className="text-xs text-neutral-500 dark:text-neutral-400 italic">
                      Note: Automatic milestone and task creation from templates
                      will be enabled in a future update. For now, you&apos;ll
                      need to add these manually after project creation.
                    </p>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8">
          <div>
            {currentStepIndex > 0 && (
              <Button variant="secondary" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-3">
            {step !== 'preview' && (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="w-4 h-4" />
              </Button>
            )}

            {step === 'preview' && (
              <Button
                onClick={handleCreateProject}
                isLoading={createProjectMutation.isPending}
                disabled={createProjectMutation.isPending}
              >
                <Check className="w-4 h-4" />
                Create Project
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default ProjectSetupPage;
