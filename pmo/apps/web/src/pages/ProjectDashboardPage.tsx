import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  useClient,
  useDocuments,
  useGenerateDocument,
  useProject,
  useUpdateProject,
} from '../api/queries';
import { type Project, type ProjectStatus } from '../api/projects';
import { type DocumentType } from '../api/documents';
import useRedirectOnUnauthorized from '../auth/useRedirectOnUnauthorized';
import { useClientProjectContext } from './ClientProjectContext';

const statusOptions: ProjectStatus[] = [
  'PLANNING',
  'IN_PROGRESS',
  'ON_HOLD',
  'COMPLETED',
  'CANCELLED',
];

const documentTypeOptions: DocumentType[] = [
  'REQUIREMENTS',
  'PROPOSAL',
  'CONTRACT',
  'REPORT',
  'OTHER',
];

function formatDate(value?: string | null) {
  if (!value) {
    return 'Not set';
  }

  return new Date(value).toLocaleDateString();
}

interface DocumentFormValues {
  filename: string;
  type: DocumentType;
  url: string;
}

interface ProjectUpdateFormValues {
  status: ProjectStatus;
  startDate: string;
  endDate: string;
}

function ProjectDashboardPage(): JSX.Element {
  const { id } = useParams();
  const projectId = useMemo(() => Number(id), [id]);

  const projectQuery = useProject(
    Number.isNaN(projectId) ? undefined : projectId,
  );
  const project = projectQuery.data as Project | undefined;
  const clientQuery = useClient(project?.clientId);
  const updateProjectMutation = useUpdateProject(projectId || 0);
  const documentsQuery = useDocuments(
    project ? { clientId: project.clientId, projectId: project.id } : undefined,
  );
  const generateDocumentMutation = useGenerateDocument();
  const { setSelectedClient, setSelectedProject } = useClientProjectContext();

  const [updateValues, setUpdateValues] = useState<ProjectUpdateFormValues>({
    status: 'PLANNING',
    startDate: '',
    endDate: '',
  });
  const [documentValues, setDocumentValues] = useState<DocumentFormValues>({
    filename: '',
    type: 'OTHER',
    url: '',
  });
  const [showGenerator, setShowGenerator] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useRedirectOnUnauthorized(projectQuery.error);
  useRedirectOnUnauthorized(clientQuery.error);
  useRedirectOnUnauthorized(updateProjectMutation.error);
  useRedirectOnUnauthorized(generateDocumentMutation.error);
  useRedirectOnUnauthorized(documentsQuery.error);

  useEffect(() => {
    if (project) {
      setSelectedProject(project);
      setUpdateValues({
        status: project.status,
        startDate: project.startDate?.slice(0, 10) ?? '',
        endDate: project.endDate?.slice(0, 10) ?? '',
      });
    }
  }, [project, setSelectedProject]);

  useEffect(() => {
    if (clientQuery.data) {
      setSelectedClient(clientQuery.data);
    }
  }, [clientQuery.data, setSelectedClient]);

  const handleUpdateProject = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!project) {
      return;
    }

    setFormError(null);

    try {
      await updateProjectMutation.mutateAsync({
        status: updateValues.status,
        startDate: updateValues.startDate || undefined,
        endDate: updateValues.endDate || undefined,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to update project';
      setFormError(message);
    }
  };

  const handleGenerateDocument = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!project) {
      return;
    }

    setFormError(null);

    try {
      await generateDocumentMutation.mutateAsync({
        clientId: project.clientId,
        projectId: project.id,
        filename: documentValues.filename,
        type: documentValues.type,
        url: documentValues.url || undefined,
      });
      setShowGenerator(false);
      setDocumentValues({ filename: '', type: 'OTHER', url: '' });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to generate document';
      setFormError(message);
    }
  };

  if (projectQuery.isLoading) {
    return (
      <main>
        <p>Loading project…</p>
      </main>
    );
  }

  if (projectQuery.error && !project) {
    return (
      <main>
        <p role="alert">Unable to load project.</p>
        <Link to="/dashboard">Back to dashboard</Link>
      </main>
    );
  }

  if (!project) {
    return (
      <main>
        <p role="alert">Project not found.</p>
        <Link to="/dashboard">Back to dashboard</Link>
      </main>
    );
  }

  return (
    <main>
      <header>
        <h1>{project.name}</h1>
        <p>Project dashboard and documentation.</p>
        <Link to="/dashboard">Back to dashboard</Link>
      </header>

      <section aria-label="project-overview">
        <h2>Overview</h2>
        <dl>
          <div>
            <dt>Status</dt>
            <dd>{project.status}</dd>
          </div>
          <div>
            <dt>Client</dt>
            <dd>
              {clientQuery.isLoading && 'Loading client…'}
              {clientQuery.data && (
                <Link to={`/clients/${clientQuery.data.id}`}>
                  {clientQuery.data.name}
                </Link>
              )}
              {clientQuery.error && 'Unable to load client'}
            </dd>
          </div>
          <div>
            <dt>Start date</dt>
            <dd>{formatDate(project.startDate)}</dd>
          </div>
          <div>
            <dt>End date</dt>
            <dd>{formatDate(project.endDate)}</dd>
          </div>
        </dl>
      </section>

      <section aria-label="project-settings">
        <h2>Update project</h2>
        <p>Change status or key dates as the engagement progresses.</p>
        <form onSubmit={handleUpdateProject}>
          <div>
            <label htmlFor="project-status">Status</label>
            <select
              id="project-status"
              value={updateValues.status}
              onChange={(event) =>
                setUpdateValues((prev) => ({
                  ...prev,
                  status: event.target.value as ProjectStatus,
                }))
              }
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="project-start-date">Start date</label>
            <input
              id="project-start-date"
              type="date"
              value={updateValues.startDate}
              onChange={(event) =>
                setUpdateValues((prev) => ({
                  ...prev,
                  startDate: event.target.value,
                }))
              }
            />
          </div>
          <div>
            <label htmlFor="project-end-date">End date</label>
            <input
              id="project-end-date"
              type="date"
              value={updateValues.endDate}
              onChange={(event) =>
                setUpdateValues((prev) => ({
                  ...prev,
                  endDate: event.target.value,
                }))
              }
            />
          </div>
          {formError && <p role="alert">{formError}</p>}
          <button type="submit" disabled={updateProjectMutation.isPending}>
            {updateProjectMutation.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      </section>

      <section aria-label="documents">
        <h2>Documents</h2>
        <p>Generate and access project deliverables.</p>
        <button type="button" onClick={() => setShowGenerator(true)}>
          Generate document
        </button>
        {documentsQuery.isLoading && <p>Loading documents…</p>}
        {documentsQuery.error && (
          <p role="alert">Unable to load documents for this project.</p>
        )}
        {documentsQuery.data && documentsQuery.data.length === 0 && (
          <p>No documents generated yet.</p>
        )}
        {documentsQuery.data && documentsQuery.data.length > 0 && (
          <ul>
            {documentsQuery.data.map((document) => (
              <li key={document.id}>
                <div>
                  <strong>{document.filename}</strong> ({document.type})
                </div>
                <div>Created: {formatDate(document.createdAt)}</div>
                <div>
                  <a href={document.url} target="_blank" rel="noreferrer">
                    Download
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showGenerator && (
        <section aria-label="document-generator">
          <h3>Generate document</h3>
          <form onSubmit={handleGenerateDocument}>
            <div>
              <label htmlFor="document-filename">Filename</label>
              <input
                id="document-filename"
                value={documentValues.filename}
                onChange={(event) =>
                  setDocumentValues((prev) => ({
                    ...prev,
                    filename: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div>
              <label htmlFor="document-type">Type</label>
              <select
                id="document-type"
                value={documentValues.type}
                onChange={(event) =>
                  setDocumentValues((prev) => ({
                    ...prev,
                    type: event.target.value as DocumentType,
                  }))
                }
              >
                {documentTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="document-url">Document URL (optional)</label>
              <input
                id="document-url"
                value={documentValues.url}
                onChange={(event) =>
                  setDocumentValues((prev) => ({
                    ...prev,
                    url: event.target.value,
                  }))
                }
              />
            </div>
            {formError && <p role="alert">{formError}</p>}
            <div>
              <button
                type="submit"
                disabled={generateDocumentMutation.isPending}
              >
                {generateDocumentMutation.isPending
                  ? 'Generating…'
                  : 'Create document'}
              </button>
              <button
                type="button"
                onClick={() => setShowGenerator(false)}
                disabled={generateDocumentMutation.isPending}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}

export default ProjectDashboardPage;
