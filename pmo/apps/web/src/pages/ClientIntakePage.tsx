import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ClientForm, { ClientFormValues } from '../components/ClientForm';
import ContactForm, { ContactFormValues } from '../components/ContactForm';
import { useCreateClient, useCreateContact } from '../api/queries';
import { type Client } from '../api/clients';
import useRedirectOnUnauthorized from '../auth/useRedirectOnUnauthorized';
import { useClientProjectContext } from './ClientProjectContext';

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

type IntakeStep = 'client' | 'contact' | 'summary';

type ClientSummary = Pick<
  Client,
  'id' | 'name' | 'industry' | 'companySize' | 'aiMaturity' | 'timezone'
>;

function ClientIntakePage(): JSX.Element {
  const [step, setStep] = useState<IntakeStep>('client');
  const [client, setClient] = useState<ClientSummary | null>(null);
  const [contactCreated, setContactCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const { setSelectedClient } = useClientProjectContext();

  const createClientMutation = useCreateClient();
  const createContactMutation = useCreateContact();

  useRedirectOnUnauthorized(createClientMutation.error);
  useRedirectOnUnauthorized(createContactMutation.error);

  const isSubmitting = useMemo(
    () => createClientMutation.isPending || createContactMutation.isPending,
    [createClientMutation.isPending, createContactMutation.isPending],
  );

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
      setContactCreated(true);
      setStep('summary');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to add contact';
      setError(message);
    }
  };

  const handleSkipContact = () => {
    setStep('summary');
  };

  const handleStartProject = () => {
    navigate('/projects/new');
  };

  return (
    <main>
      <header>
        <h1>Client intake</h1>
        <p>Capture the basics about a new client and their primary contact.</p>
        <Link to="/clients">Back to clients</Link>
      </header>

      {step === 'client' && (
        <section aria-label="client-intake-step">
          <h2>Step 1: Client profile</h2>
          <p>Collect the organization details to start the engagement.</p>
          <ClientForm
            onSubmit={handleClientSubmit}
            isSubmitting={isSubmitting}
            submitLabel="Create client"
            error={error}
          />
        </section>
      )}

      {step === 'contact' && client && (
        <section aria-label="contact-intake-step">
          <h2>Step 2: Primary contact</h2>
          <p>
            Add the primary stakeholder for {client.name}. You can skip this
            step if you want to add contacts later.
          </p>
          <ContactForm
            onSubmit={handleContactSubmit}
            isSubmitting={isSubmitting}
            submitLabel="Save contact"
            error={error}
            onCancel={handleSkipContact}
          />
        </section>
      )}

      {step === 'summary' && client && (
        <section aria-label="intake-summary">
          <h2>Step 3: Summary</h2>
          <p>The client record is ready. Next, set up the initial project.</p>
          <dl>
            <div>
              <dt>Client</dt>
              <dd>{client.name}</dd>
            </div>
            <div>
              <dt>Industry</dt>
              <dd>{client.industry || 'Not provided'}</dd>
            </div>
            <div>
              <dt>Company size</dt>
              <dd>{client.companySize || 'Not provided'}</dd>
            </div>
            <div>
              <dt>AI maturity</dt>
              <dd>{client.aiMaturity || 'Not provided'}</dd>
            </div>
            <div>
              <dt>Timezone</dt>
              <dd>{client.timezone || 'Not provided'}</dd>
            </div>
            <div>
              <dt>Contact</dt>
              <dd>
                {contactCreated
                  ? 'Primary contact saved'
                  : 'No contacts added yet'}
              </dd>
            </div>
          </dl>
          <div>
            <button type="button" onClick={handleStartProject}>
              Continue to project setup
            </button>
            <Link to={`/clients/${client.id}`}>View client record</Link>
          </div>
        </section>
      )}
    </main>
  );
}

export default ClientIntakePage;
