import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft } from 'lucide-react';

import ClientForm, { ClientFormValues } from '../components/ClientForm';
import ContactForm, { ContactFormValues } from '../components/ContactForm';
import { useCreateClient, useCreateContact } from '../api/queries';
import { type Client } from '../api/clients';
import useRedirectOnUnauthorized from '../auth/useRedirectOnUnauthorized';
import { useClientProjectContext } from './ClientProjectContext';
import { Button } from '../ui/Button';
import { PageHeader } from '../ui/PageHeader';
import { useToast } from '../ui/Toast';

function mapClientFormToPayload(values: ClientFormValues) {
  return {
    name: values.name,
    industry: values.industry || undefined,
    companySize: values.companySize || undefined,
    timezone: values.timezone || undefined,
    aiMaturity: values.aiMaturity || undefined,
    notes: values.notes || undefined,
  };
}

function mapContactFormToPayload(clientId: number, values: ContactFormValues) {
  return {
    clientId,
    name: values.name,
    email: values.email,
    role: values.role || undefined,
    phone: values.phone || undefined,
    notes: values.notes || undefined,
  };
}

type IntakeStep = 'client' | 'contact' | 'engagement';

type ClientSummary = Pick<
  Client,
  'id' | 'name' | 'industry' | 'companySize' | 'aiMaturity' | 'timezone'
>;

interface EngagementFormValues {
  goals: string;
  projectIdea: string;
  constraints: string;
}

const steps: { id: IntakeStep; label: string; description: string }[] = [
  {
    id: 'client',
    label: 'Organization',
    description: 'Basic company information',
  },
  {
    id: 'contact',
    label: 'Primary Contact',
    description: 'Key stakeholder details',
  },
  {
    id: 'engagement',
    label: 'Engagement Context',
    description: 'Goals and initial project ideas',
  },
];

function ProgressIndicator({
  currentStep,
  completedSteps,
}: {
  currentStep: IntakeStep;
  completedSteps: Set<IntakeStep>;
}): JSX.Element {
  return (
    <div className="mb-8">
      <nav aria-label="Progress">
        <ol className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.has(step.id);
            const isCurrent = step.id === currentStep;

            return (
              <li
                key={step.id}
                className={`flex-1 ${index < steps.length - 1 ? 'pr-8' : ''}`}
              >
                <div className="flex flex-col">
                  <div className="flex items-center relative">
                    {index > 0 && (
                      <div
                        className={`absolute right-full w-full h-0.5 -mr-8 ${
                          isCompleted || isCurrent
                            ? 'bg-primary-600'
                            : 'bg-neutral-200'
                        }`}
                        aria-hidden="true"
                      />
                    )}
                    <div
                      className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                        isCompleted
                          ? 'bg-primary-600 border-primary-600'
                          : isCurrent
                            ? 'bg-white border-primary-600'
                            : 'bg-white border-neutral-300'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5 text-white" />
                      ) : (
                        <span
                          className={`text-sm font-semibold ${
                            isCurrent ? 'text-primary-600' : 'text-neutral-500'
                          }`}
                        >
                          {index + 1}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3">
                    <p
                      className={`text-sm font-medium ${
                        isCompleted || isCurrent
                          ? 'text-neutral-900'
                          : 'text-neutral-500'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-neutral-600 mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

function EngagementContextForm({
  values,
  onChange,
  onSubmit,
  onBack,
  isSubmitting,
  error,
}: {
  values: EngagementFormValues;
  onChange: (values: EngagementFormValues) => void;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
  error: string | null;
}): JSX.Element {
  const handleChange = (field: keyof EngagementFormValues, value: string) => {
    onChange({ ...values, [field]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="engagement-goals"
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          High-level goals
        </label>
        <textarea
          id="engagement-goals"
          value={values.goals}
          onChange={(e) => handleChange('goals', e.target.value)}
          placeholder="What are the main objectives for this engagement?"
          rows={4}
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary-600"
        />
      </div>

      <div>
        <label
          htmlFor="engagement-project-idea"
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          Initial project idea
        </label>
        <textarea
          id="engagement-project-idea"
          value={values.projectIdea}
          onChange={(e) => handleChange('projectIdea', e.target.value)}
          placeholder="Describe any initial project concepts or areas of interest"
          rows={4}
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary-600"
        />
      </div>

      <div>
        <label
          htmlFor="engagement-constraints"
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          Important constraints
        </label>
        <textarea
          id="engagement-constraints"
          value={values.constraints}
          onChange={(e) => handleChange('constraints', e.target.value)}
          placeholder="Any timeline, budget, or technical constraints to be aware of?"
          rows={4}
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-primary-600"
        />
      </div>

      {error && (
        <div
          className="p-4 rounded-lg bg-danger-50 border border-danger-200"
          role="alert"
        >
          <p className="text-sm text-danger-800">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-4">
        <Button type="button" variant="secondary" onClick={onBack}>
          <ChevronLeft size={16} />
          Back
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Save & finish
        </Button>
      </div>
    </form>
  );
}

function ClientIntakePage(): JSX.Element {
  const [step, setStep] = useState<IntakeStep>('client');
  const [completedSteps, setCompletedSteps] = useState<Set<IntakeStep>>(
    new Set(),
  );
  const [client, setClient] = useState<ClientSummary | null>(null);
  const [engagementContext, setEngagementContext] =
    useState<EngagementFormValues>({
      goals: '',
      projectIdea: '',
      constraints: '',
    });
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { setSelectedClient } = useClientProjectContext();
  const { showToast } = useToast();

  const createClientMutation = useCreateClient();
  const createContactMutation = useCreateContact();

  useRedirectOnUnauthorized(createClientMutation.error);
  useRedirectOnUnauthorized(createContactMutation.error);

  const isSubmitting =
    createClientMutation.isPending || createContactMutation.isPending;

  const handleClientSubmit = async (values: ClientFormValues) => {
    setError(null);

    try {
      const newClient = await createClientMutation.mutateAsync(
        mapClientFormToPayload(values),
      );
      setClient({
        id: newClient.id,
        name: newClient.name,
        industry: newClient.industry ?? undefined,
        companySize: newClient.companySize ?? undefined,
        aiMaturity: newClient.aiMaturity ?? undefined,
        timezone: newClient.timezone ?? undefined,
      });
      setSelectedClient(newClient);
      setCompletedSteps((prev) => new Set(prev).add('client'));
      setStep('contact');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to create client';
      setError(message);
    }
  };

  const handleContactSubmit = async (values: ContactFormValues) => {
    if (!client) {
      return;
    }

    setError(null);

    try {
      await createContactMutation.mutateAsync(
        mapContactFormToPayload(client.id, values),
      );
      setCompletedSteps((prev) => new Set(prev).add('contact'));
      setStep('engagement');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to add contact';
      setError(message);
    }
  };

  const handleSkipContact = () => {
    setCompletedSteps((prev) => new Set(prev).add('contact'));
    setStep('engagement');
  };

  const handleEngagementSubmit = () => {
    setCompletedSteps((prev) => new Set(prev).add('engagement'));

    // Optionally store engagement context in client notes or elsewhere
    // For now, we'll just complete the wizard

    showToast(`Client "${client?.name}" created successfully!`, 'success');
    navigate(`/clients/${client?.id}`);
  };

  const handleCancel = () => {
    navigate('/clients');
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <PageHeader
        title="Client Intake"
        description="Capture key information about your new client in a few simple steps."
      />

      <main className="container-padding py-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-lg border border-neutral-200 shadow-sm p-8">
            <ProgressIndicator
              currentStep={step}
              completedSteps={completedSteps}
            />

            {step === 'client' && (
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                  Step 1: Organization Basics
                </h2>
                <p className="text-sm text-neutral-600 mb-6">
                  Tell us about the organization you&apos;ll be working with.
                </p>
                <ClientForm
                  onSubmit={handleClientSubmit}
                  isSubmitting={isSubmitting}
                  submitLabel="Next: Add contact"
                  error={error}
                  onCancel={handleCancel}
                />
              </div>
            )}

            {step === 'contact' && client && (
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                  Step 2: Primary Contact
                </h2>
                <p className="text-sm text-neutral-600 mb-6">
                  Add the primary stakeholder for {client.name}. You can skip
                  this step if needed.
                </p>
                <ContactForm
                  onSubmit={handleContactSubmit}
                  isSubmitting={isSubmitting}
                  submitLabel="Next: Engagement context"
                  error={error}
                  onCancel={handleSkipContact}
                  onBack={() => setStep('client')}
                />
              </div>
            )}

            {step === 'engagement' && client && (
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                  Step 3: Engagement Context
                </h2>
                <p className="text-sm text-neutral-600 mb-6">
                  Provide high-level context about this engagement. This helps
                  inform future project planning.
                </p>
                <EngagementContextForm
                  values={engagementContext}
                  onChange={setEngagementContext}
                  onSubmit={handleEngagementSubmit}
                  onBack={() => setStep('contact')}
                  isSubmitting={false}
                  error={error}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default ClientIntakePage;
