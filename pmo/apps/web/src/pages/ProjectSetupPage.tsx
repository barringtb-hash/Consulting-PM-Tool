import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useClients, useCreateProject } from '../api/queries';
import { type ProjectStatus } from '../api/projects';
import useRedirectOnUnauthorized from '../auth/useRedirectOnUnauthorized';
import { useClientProjectContext } from './ClientProjectContext';

interface ProjectDetailsForm {
  name: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
}

type ProjectSetupStep = 'client' | 'details' | 'review';

const statusOptions: ProjectStatus[] = [
  'PLANNING',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
];

function ProjectSetupPage(): JSX.Element {
  const navigate = useNavigate();
  const { selectedClient, setSelectedClient, setSelectedProject } =
    useClientProjectContext();

  const clientsQuery = useClients({ includeArchived: false });
  const createProjectMutation = useCreateProject();

  const [step, setStep] = useState<ProjectSetupStep>('client');
  const [clientId, setClientId] = useState<number | ''>(
    selectedClient?.id ?? '',
  );
  const [formValues, setFormValues] = useState<ProjectDetailsForm>({
    name: '',
    status: 'PLANNING',
    startDate: '',
    endDate: '',
  });
  const [error, setError] = useState<string | null>(null);

  useRedirectOnUnauthorized(clientsQuery.error);
  useRedirectOnUnauthorized(createProjectMutation.error);

  useEffect(() => {
    if (selectedClient && !clientId) {
      setClientId(selectedClient.id);
    }
  }, [clientId, selectedClient]);

  const isSubmitting = useMemo(
    () => createProjectMutation.isPending,
    [createProjectMutation.isPending],
  );

  const selectedClientName = useMemo(() => {
    const match = clientsQuery.data?.find((entry) => entry.id === clientId);
    return match?.name || selectedClient?.name || '';
  }, [clientId, clientsQuery.data, selectedClient]);

  const handleClientStepSubmit = () => {
    if (!clientId) {
      setError('Please select a client to continue');
      return;
    }

    const found = clientsQuery.data?.find((entry) => entry.id === clientId);
    if (found) {
      setSelectedClient(found);
    }

    setError(null);
    setStep('details');
  };

  const handleDetailsSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!clientId) {
      setError('Select a client before creating a project');
      setStep('client');
      return;
    }

    if (!formValues.name.trim()) {
      setError('Project name is required');
      return;
    }

    setStep('review');
  };

  const handleCreateProject = async () => {
    if (!clientId) {
      return;
    }

    setError(null);

    try {
      const project = await createProjectMutation.mutateAsync({
        clientId,
        name: formValues.name,
        status: formValues.status,
        startDate: formValues.startDate || undefined,
        endDate: formValues.endDate || undefined,
      });

      setSelectedProject(project);
      const client = clientsQuery.data?.find((entry) => entry.id === clientId);
      if (client) {
        setSelectedClient(client);
      }

      navigate(`/projects/${project.id}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to create project';
      setError(message);
    }
  };

  return (
    <main>
      <header>
        <h1>Project setup</h1>
        <p>Create a new project and configure the initial timeline.</p>
        <Link to="/dashboard">Back to dashboard</Link>
      </header>

      {step === 'client' && (
        <section aria-label="select-client-step">
          <h2>Step 1: Choose client</h2>
          <p>Select which client this project belongs to.</p>
          {clientsQuery.isLoading && <p>Loading clients…</p>}
          {clientsQuery.error && <p role="alert">Unable to load clients.</p>}
          {clientsQuery.data && (
            <div>
              <label htmlFor="project-client">Client</label>
              <select
                id="project-client"
                value={clientId}
                onChange={(event) =>
                  setClientId(Number(event.target.value) || '')
                }
              >
                <option value="">Select a client</option>
                {clientsQuery.data.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {error && <p role="alert">{error}</p>}
          <div>
            <button type="button" onClick={handleClientStepSubmit}>
              Continue
            </button>
            <Link to="/client-intake">Create a new client</Link>
          </div>
        </section>
      )}

      {step === 'details' && (
        <section aria-label="project-details-step">
          <h2>Step 2: Project details</h2>
          <p>Define the project scope, status, and expected dates.</p>
          <form onSubmit={handleDetailsSubmit}>
            <div>
              <label htmlFor="project-name">Name</label>
              <input
                id="project-name"
                value={formValues.name}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    name: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div>
              <label htmlFor="project-status">Status</label>
              <select
                id="project-status"
                value={formValues.status}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    status: event.target.value as ProjectStatus,
                  }))
                }
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="project-start">Start date</label>
              <input
                id="project-start"
                type="date"
                value={formValues.startDate}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    startDate: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label htmlFor="project-end">End date</label>
              <input
                id="project-end"
                type="date"
                value={formValues.endDate}
                onChange={(event) =>
                  setFormValues((prev) => ({
                    ...prev,
                    endDate: event.target.value,
                  }))
                }
              />
            </div>
            {error && <p role="alert">{error}</p>}
            <div>
              <button type="submit">Review project</button>
              <button type="button" onClick={() => setStep('client')}>
                Back
              </button>
            </div>
          </form>
        </section>
      )}

      {step === 'review' && (
        <section aria-label="project-review-step">
          <h2>Step 3: Confirm project</h2>
          <p>Verify the details before creating the project.</p>
          <dl>
            <div>
              <dt>Client</dt>
              <dd>{selectedClientName || 'Not selected'}</dd>
            </div>
            <div>
              <dt>Name</dt>
              <dd>{formValues.name}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{formValues.status}</dd>
            </div>
            <div>
              <dt>Start date</dt>
              <dd>{formValues.startDate || 'Not set'}</dd>
            </div>
            <div>
              <dt>End date</dt>
              <dd>{formValues.endDate || 'Not set'}</dd>
            </div>
          </dl>
          {error && <p role="alert">{error}</p>}
          <div>
            <button
              type="button"
              onClick={handleCreateProject}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating…' : 'Create project'}
            </button>
            <button
              type="button"
              onClick={() => setStep('details')}
              disabled={isSubmitting}
            >
              Back
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

export default ProjectSetupPage;
