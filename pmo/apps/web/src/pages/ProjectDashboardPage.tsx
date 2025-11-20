import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  useClient,
  useDocuments,
  useGenerateDocument,
  useAssets,
  useProject,
  useProjectAssets,
  useUpdateProject,
  useCreateAsset,
  useLinkAssetToProject,
  useUnlinkAssetFromProject,
} from '../api/queries';
import { type Project, type ProjectStatus } from '../api/projects';
import { type DocumentType } from '../api/documents';
import AssetForm, {
  assetFormValuesToPayload,
  type AssetFormValues,
} from '../components/AssetForm';
import { type Milestone } from '../api/milestones';
import {
  type Task,
  type TaskPriority,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '../api/tasks';
import {
  MILESTONE_STATUSES,
  useCreateMilestone,
  useDeleteMilestone,
  useProjectMilestones,
  useUpdateMilestone,
} from '../hooks/milestones';
import {
  useCreateTask,
  useDeleteTask,
  useMoveTask,
  useProjectTasks,
  useUpdateTask,
} from '../hooks/tasks';
import useRedirectOnUnauthorized from '../auth/useRedirectOnUnauthorized';
import { useClientProjectContext } from './ClientProjectContext';
import ProjectMeetingsPanel from '../features/meetings/ProjectMeetingsPanel';

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

interface TaskFormValues {
  title: string;
  description: string;
  status: Task['status'];
  priority: TaskPriority | '';
  dueDate: string;
  milestoneId: string;
}

interface MilestoneFormValues {
  name: string;
  description: string;
  status: Milestone['status'];
  dueDate: string;
}

function ProjectDashboardPage(): JSX.Element {
  const { id } = useParams();
  const projectId = useMemo(() => Number(id), [id]);
  const [assetSearch, setAssetSearch] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [assetNotes, setAssetNotes] = useState('');
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [assetFormError, setAssetFormError] = useState<string | null>(null);
  const [assetToast, setAssetToast] = useState<string | null>(null);
  const [showArchivedAssets, setShowArchivedAssets] = useState(false);

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
  const tasksQuery = useProjectTasks(projectId);
  const milestonesQuery = useProjectMilestones(projectId);
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask(projectId);
  const moveTaskMutation = useMoveTask(projectId);
  const deleteTaskMutation = useDeleteTask(projectId);
  const createMilestoneMutation = useCreateMilestone();
  const updateMilestoneMutation = useUpdateMilestone(projectId);
  const deleteMilestoneMutation = useDeleteMilestone(projectId);
  const projectAssetsQuery = useProjectAssets(projectId, showArchivedAssets);
  const linkAssetMutation = useLinkAssetToProject(projectId || 0);
  const unlinkAssetMutation = useUnlinkAssetFromProject(projectId || 0);
  const availableAssetsQuery = useAssets(
    project
      ? { clientId: project.clientId, search: assetSearch || undefined }
      : undefined,
  );
  const createAssetForProjectMutation = useCreateAsset();
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
  const [taskFormValues, setTaskFormValues] = useState<TaskFormValues>({
    title: '',
    description: '',
    status: 'BACKLOG',
    priority: 'P1',
    dueDate: '',
    milestoneId: '',
  });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [milestoneFormValues, setMilestoneFormValues] =
    useState<MilestoneFormValues>({
      name: '',
      description: '',
      status: 'NOT_STARTED',
      dueDate: '',
    });
  const [editingMilestoneId, setEditingMilestoneId] = useState<number | null>(
    null,
  );
  const [milestoneError, setMilestoneError] = useState<string | null>(null);

  useRedirectOnUnauthorized(projectQuery.error);
  useRedirectOnUnauthorized(clientQuery.error);
  useRedirectOnUnauthorized(updateProjectMutation.error);
  useRedirectOnUnauthorized(generateDocumentMutation.error);
  useRedirectOnUnauthorized(documentsQuery.error);
  useRedirectOnUnauthorized(tasksQuery.error);
  useRedirectOnUnauthorized(milestonesQuery.error);
  useRedirectOnUnauthorized(createTaskMutation.error);
  useRedirectOnUnauthorized(updateTaskMutation.error);
  useRedirectOnUnauthorized(moveTaskMutation.error);
  useRedirectOnUnauthorized(deleteTaskMutation.error);
  useRedirectOnUnauthorized(createMilestoneMutation.error);
  useRedirectOnUnauthorized(updateMilestoneMutation.error);
  useRedirectOnUnauthorized(deleteMilestoneMutation.error);
  useRedirectOnUnauthorized(projectAssetsQuery.error);
  useRedirectOnUnauthorized(linkAssetMutation.error);
  useRedirectOnUnauthorized(unlinkAssetMutation.error);
  useRedirectOnUnauthorized(availableAssetsQuery.error);
  useRedirectOnUnauthorized(createAssetForProjectMutation.error);

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

  useEffect(() => {
    if (assetToast) {
      const timer = setTimeout(() => setAssetToast(null), 4000);
      return () => clearTimeout(timer);
    }

    return undefined;
  }, [assetToast]);

  const milestones = useMemo(
    () => milestonesQuery.data ?? [],
    [milestonesQuery.data],
  );
  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);

  const milestoneLookup = useMemo(() => {
    const lookup = new Map<number, Milestone>();
    milestones.forEach((milestone) => lookup.set(milestone.id, milestone));
    return lookup;
  }, [milestones]);

  const groupedTasks = useMemo(
    () =>
      TASK_STATUSES.map((status) => ({
        status,
        tasks: tasks.filter((task) => task.status === status),
      })),
    [tasks],
  );
  const projectAssets = useMemo(
    () => projectAssetsQuery.data ?? [],
    [projectAssetsQuery.data],
  );
  const availableAssets = useMemo(() => {
    const linkedIds = new Set(projectAssets.map((entry) => entry.assetId));
    const list = availableAssetsQuery.data ?? [];
    const filtered = list.filter((asset) => !linkedIds.has(asset.id));

    if (!assetSearch) {
      return filtered;
    }

    const term = assetSearch.toLowerCase();

    return filtered.filter((asset) =>
      [
        asset.name.toLowerCase(),
        asset.description?.toLowerCase() ?? '',
        asset.tags.join(' ').toLowerCase(),
      ].some((value) => value.includes(term)),
    );
  }, [assetSearch, availableAssetsQuery.data, projectAssets]);

  const milestoneLabel = (milestoneId?: number | null) => {
    if (!milestoneId) {
      return 'Unassigned';
    }

    return milestoneLookup.get(milestoneId)?.name ?? 'Unassigned';
  };

  const handleLinkAsset = async (event: React.FormEvent) => {
    event.preventDefault();
    setAssetError(null);

    if (!selectedAssetId) {
      setAssetError('Select an asset to link');
      return;
    }

    try {
      await linkAssetMutation.mutateAsync({
        assetId: Number(selectedAssetId),
        notes: assetNotes || undefined,
      });
      setSelectedAssetId('');
      setAssetNotes('');
      setAssetToast('Asset linked to project');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to link asset to project';
      setAssetError(message);
    }
  };

  const handleUnlinkAsset = async (assetId: number) => {
    setAssetError(null);

    try {
      await unlinkAssetMutation.mutateAsync(assetId);
      setAssetToast('Asset removed from project');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to unlink asset';
      setAssetError(message);
    }
  };

  const handleCreateProjectAsset = async (values: AssetFormValues) => {
    setAssetFormError(null);

    if (!project) {
      setAssetFormError('Project context missing');
      return;
    }

    if (!values.name.trim()) {
      setAssetFormError('Name is required');
      return;
    }

    if (!values.type) {
      setAssetFormError('Asset type is required');
      return;
    }

    const payload = assetFormValuesToPayload({
      ...values,
      clientId:
        values.clientId || (project?.clientId ? String(project.clientId) : ''),
    });

    try {
      const asset = await createAssetForProjectMutation.mutateAsync(payload);
      await linkAssetMutation.mutateAsync({
        assetId: asset.id,
        notes: undefined,
      });
      setShowAssetForm(false);
      setAssetToast('Asset created and linked');
      setAssetNotes('');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to create asset';
      setAssetFormError(message);
    }
  };

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

  const resetTaskForm = () => {
    setTaskFormValues({
      title: '',
      description: '',
      status: 'BACKLOG',
      priority: 'P1',
      dueDate: '',
      milestoneId: '',
    });
    setEditingTask(null);
  };

  const handleOpenTask = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setTaskFormValues({
        title: task.title,
        description: task.description ?? '',
        status: task.status,
        priority: task.priority ?? '',
        dueDate: task.dueDate?.slice(0, 10) ?? '',
        milestoneId: task.milestoneId ? String(task.milestoneId) : '',
      });
    } else {
      resetTaskForm();
    }

    setTaskError(null);
    setShowTaskModal(true);
  };

  const handleSaveTask = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!project) {
      return;
    }

    setTaskError(null);

    const payload = {
      projectId: project.id,
      title: taskFormValues.title,
      description: taskFormValues.description || undefined,
      status: taskFormValues.status,
      priority: (taskFormValues.priority || undefined) as
        | TaskPriority
        | undefined,
      dueDate: taskFormValues.dueDate || undefined,
      milestoneId: taskFormValues.milestoneId
        ? Number(taskFormValues.milestoneId)
        : undefined,
    };

    try {
      if (editingTask) {
        await updateTaskMutation.mutateAsync({
          taskId: editingTask.id,
          payload: {
            ...payload,
            dueDate: taskFormValues.dueDate || null,
            milestoneId: taskFormValues.milestoneId
              ? Number(taskFormValues.milestoneId)
              : null,
          },
        });
      } else {
        await createTaskMutation.mutateAsync(payload);
      }

      setShowTaskModal(false);
      resetTaskForm();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to save task';
      setTaskError(message);
    }
  };

  const handleTaskStatusChange = async (
    taskId: number,
    status: Task['status'],
  ) => {
    setTaskError(null);
    try {
      await moveTaskMutation.mutateAsync({ taskId, payload: { status } });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to move task';
      setTaskError(message);
    }
  };

  const handleTaskMilestoneChange = async (
    taskId: number,
    milestoneId: string,
  ) => {
    setTaskError(null);
    try {
      await moveTaskMutation.mutateAsync({
        taskId,
        payload: { milestoneId: milestoneId ? Number(milestoneId) : null },
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to move task';
      setTaskError(message);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    setTaskError(null);
    try {
      await deleteTaskMutation.mutateAsync(taskId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to delete task';
      setTaskError(message);
    }
  };

  const resetMilestoneForm = () => {
    setMilestoneFormValues({
      name: '',
      description: '',
      status: 'NOT_STARTED',
      dueDate: '',
    });
    setEditingMilestoneId(null);
  };

  const handleSaveMilestone = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!project) {
      return;
    }

    setMilestoneError(null);

    const payload = {
      projectId: project.id,
      name: milestoneFormValues.name,
      description: milestoneFormValues.description || undefined,
      status: milestoneFormValues.status,
      dueDate: milestoneFormValues.dueDate || undefined,
    };

    try {
      if (editingMilestoneId) {
        await updateMilestoneMutation.mutateAsync({
          milestoneId: editingMilestoneId,
          payload: { ...payload, dueDate: milestoneFormValues.dueDate || null },
        });
      } else {
        await createMilestoneMutation.mutateAsync(payload);
      }

      resetMilestoneForm();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to save milestone';
      setMilestoneError(message);
    }
  };

  const handleEditMilestone = (milestone: Milestone) => {
    setEditingMilestoneId(milestone.id);
    setMilestoneFormValues({
      name: milestone.name,
      description: milestone.description ?? '',
      status: milestone.status,
      dueDate: milestone.dueDate?.slice(0, 10) ?? '',
    });
  };

  const handleDeleteMilestone = async (milestoneId: number) => {
    setMilestoneError(null);
    try {
      await deleteMilestoneMutation.mutateAsync(milestoneId);
      if (editingMilestoneId === milestoneId) {
        resetMilestoneForm();
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to delete milestone';
      setMilestoneError(message);
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

      <section aria-label="milestones">
        <h2>Milestones</h2>
        <p>Track delivery checkpoints and connect tasks to them.</p>
        <form onSubmit={handleSaveMilestone} className="milestone-form">
          <div>
            <label htmlFor="milestone-name">Name</label>
            <input
              id="milestone-name"
              value={milestoneFormValues.name}
              onChange={(event) =>
                setMilestoneFormValues((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              required
            />
          </div>
          <div>
            <label htmlFor="milestone-status">Status</label>
            <select
              id="milestone-status"
              value={milestoneFormValues.status}
              onChange={(event) =>
                setMilestoneFormValues((prev) => ({
                  ...prev,
                  status: event.target.value as Milestone['status'],
                }))
              }
            >
              {MILESTONE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="milestone-due-date">Due date</label>
            <input
              id="milestone-due-date"
              type="date"
              value={milestoneFormValues.dueDate}
              onChange={(event) =>
                setMilestoneFormValues((prev) => ({
                  ...prev,
                  dueDate: event.target.value,
                }))
              }
            />
          </div>
          <div>
            <label htmlFor="milestone-description">Description</label>
            <textarea
              id="milestone-description"
              value={milestoneFormValues.description}
              onChange={(event) =>
                setMilestoneFormValues((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
            />
          </div>
          {milestoneError && <p role="alert">{milestoneError}</p>}
          <div>
            <button
              type="submit"
              disabled={
                createMilestoneMutation.isPending ||
                updateMilestoneMutation.isPending
              }
            >
              {editingMilestoneId ? 'Update milestone' : 'Add milestone'}
            </button>
            {editingMilestoneId && (
              <button type="button" onClick={resetMilestoneForm}>
                Cancel edit
              </button>
            )}
          </div>
        </form>
        {milestonesQuery.isLoading && <p>Loading milestones…</p>}
        {milestonesQuery.error && (
          <p role="alert">Unable to load milestones for this project.</p>
        )}
        {milestones.length === 0 && !milestonesQuery.isLoading && (
          <p>No milestones created yet.</p>
        )}
        {milestones.length > 0 && (
          <ul className="milestone-list">
            {milestones.map((milestone) => (
              <li key={milestone.id} className="milestone-card">
                <div>
                  <strong>{milestone.name}</strong>
                  <div className="milestone-meta">
                    <span>Status: {milestone.status}</span>
                    <span>Due: {formatDate(milestone.dueDate)}</span>
                  </div>
                </div>
                {milestone.description && <p>{milestone.description}</p>}
                <div>
                  <button
                    type="button"
                    onClick={() => handleEditMilestone(milestone)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteMilestone(milestone.id)}
                    disabled={deleteMilestoneMutation.isPending}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="project-assets">
        <h2>Assets</h2>
        <p>Attach reusable prompts, workflows, and datasets to this project.</p>
        {assetToast && <div className="toast">{assetToast}</div>}
        <label>
          <input
            type="checkbox"
            checked={showArchivedAssets}
            onChange={(event) => setShowArchivedAssets(event.target.checked)}
          />
          Show archived links
        </label>
        {projectAssetsQuery.isLoading && <p>Loading assets…</p>}
        {projectAssetsQuery.error && (
          <p role="alert">Unable to load project assets.</p>
        )}
        {!projectAssetsQuery.isLoading && projectAssets.length === 0 && (
          <p>
            No assets linked yet. Link an existing asset or create one below.
          </p>
        )}
        {projectAssets.length > 0 && (
          <ul className="asset-list">
            {projectAssets.map((entry) => (
              <li key={entry.id} className="asset-card">
                <div className="card__header">
                  <div>
                    <strong>{entry.asset.name}</strong> ({entry.asset.type}){' '}
                    {entry.asset.archived && <span>(Archived)</span>}
                  </div>
                  <div>{entry.asset.isTemplate ? 'Template' : 'Custom'}</div>
                </div>
                <p>{entry.asset.description || 'No description provided.'}</p>
                <p>
                  <strong>Tags:</strong> {entry.asset.tags.join(', ') || 'None'}
                </p>
                {entry.notes && (
                  <p>
                    <strong>Notes:</strong> {entry.notes}
                  </p>
                )}
                <div className="card__actions">
                  <button
                    type="button"
                    onClick={() => handleUnlinkAsset(entry.assetId)}
                    disabled={unlinkAssetMutation.isPending}
                  >
                    Unlink
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {assetError && <p role="alert">{assetError}</p>}

        <div className="stack">
          <h3>Link existing asset</h3>
          {availableAssetsQuery.isLoading && <p>Loading asset library…</p>}
          <form onSubmit={handleLinkAsset}>
            <div>
              <label htmlFor="asset-search-input">Search library</label>
              <input
                id="asset-search-input"
                value={assetSearch}
                onChange={(event) => setAssetSearch(event.target.value)}
                placeholder="Filter by name, description, or tags"
              />
            </div>
            <div>
              <label htmlFor="asset-select">Asset</label>
              <select
                id="asset-select"
                value={selectedAssetId}
                onChange={(event) => setSelectedAssetId(event.target.value)}
              >
                <option value="">Select an asset</option>
                {availableAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} ({asset.type})
                    {asset.isTemplate ? ' • Template' : ''}
                  </option>
                ))}
              </select>
            </div>
            {!availableAssetsQuery.isLoading &&
              availableAssetsQuery.data &&
              availableAssets.length === 0 && (
                <p>No matching assets for this project/client context.</p>
              )}
            <div>
              <label htmlFor="asset-notes">Notes (optional)</label>
              <input
                id="asset-notes"
                value={assetNotes}
                onChange={(event) => setAssetNotes(event.target.value)}
                placeholder="Context for this project"
              />
            </div>
            <div>
              <button type="submit" disabled={linkAssetMutation.isPending}>
                Link asset
              </button>
              <button
                type="button"
                onClick={() => availableAssetsQuery.refetch()}
                disabled={availableAssetsQuery.isFetching}
              >
                Refresh library
              </button>
            </div>
          </form>
        </div>

        <div className="stack">
          <h3>Create new asset for this project</h3>
          {showAssetForm ? (
            <AssetForm
              initialValues={{
                name: '',
                type: '',
                description: '',
                clientId: project ? String(project.clientId) : '',
                tags: '',
                isTemplate: false,
              }}
              onSubmit={handleCreateProjectAsset}
              submitLabel="Create and link"
              isSubmitting={
                createAssetForProjectMutation.isPending ||
                linkAssetMutation.isPending
              }
              onCancel={() => {
                setShowAssetForm(false);
                setAssetFormError(null);
              }}
              error={assetFormError}
              clients={clientQuery.data ? [clientQuery.data] : []}
              disableClientSelection
            />
          ) : (
            <button type="button" onClick={() => setShowAssetForm(true)}>
              New asset
            </button>
          )}
        </div>
      </section>

      <ProjectMeetingsPanel projectId={projectId} />

      <section aria-label="project-tasks">
        <h2>Tasks</h2>
        <p>Break work down into actionable items for the team.</p>
        <div>
          <button type="button" onClick={() => handleOpenTask()}>
            Add task
          </button>
          <button
            type="button"
            onClick={() => tasksQuery.refetch()}
            disabled={tasksQuery.isFetching}
          >
            Refresh
          </button>
        </div>
        {taskError && <p role="alert">{taskError}</p>}
        {tasksQuery.isLoading && <p>Loading tasks…</p>}
        {tasksQuery.error && (
          <p role="alert">Unable to load tasks for this project.</p>
        )}
        {tasks.length === 0 && !tasksQuery.isLoading && (
          <p>No tasks created yet.</p>
        )}
        {tasks.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Due date</th>
                <th>Milestone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.title}</td>
                  <td>{task.status}</td>
                  <td>{task.priority ?? 'Unassigned'}</td>
                  <td>{formatDate(task.dueDate)}</td>
                  <td>{milestoneLabel(task.milestoneId)}</td>
                  <td>
                    <button type="button" onClick={() => handleOpenTask(task)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id)}
                      disabled={deleteTaskMutation.isPending}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section aria-label="project-kanban">
        <h3>Kanban</h3>
        <p>Move tasks between stages and milestone groupings.</p>
        <div className="kanban-grid">
          {groupedTasks.map((column) => (
            <div key={column.status} className="kanban-column">
              <h4>{column.status}</h4>
              {column.tasks.length === 0 && <p>No tasks</p>}
              {column.tasks.map((task) => (
                <div key={task.id} className="kanban-card">
                  <div className="kanban-card__header">
                    <strong>{task.title}</strong>
                    <span>Priority: {task.priority ?? 'Unassigned'}</span>
                  </div>
                  <div className="kanban-card__meta">
                    <span>Milestone: {milestoneLabel(task.milestoneId)}</span>
                    <span>Due: {formatDate(task.dueDate)}</span>
                  </div>
                  <div className="kanban-card__actions">
                    <label>
                      Status
                      <select
                        value={task.status}
                        onChange={(event) =>
                          handleTaskStatusChange(
                            task.id,
                            event.target.value as Task['status'],
                          )
                        }
                      >
                        {TASK_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Milestone
                      <select
                        value={task.milestoneId ?? ''}
                        onChange={(event) =>
                          handleTaskMilestoneChange(task.id, event.target.value)
                        }
                      >
                        <option value="">Unassigned</option>
                        {milestones.map((milestone) => (
                          <option key={milestone.id} value={milestone.id}>
                            {milestone.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {showTaskModal && (
        <section aria-label="task-modal" className="task-modal">
          <h3>{editingTask ? 'Edit task' : 'New task'}</h3>
          <form onSubmit={handleSaveTask}>
            <div>
              <label htmlFor="task-title">Title</label>
              <input
                id="task-title"
                value={taskFormValues.title}
                onChange={(event) =>
                  setTaskFormValues((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div>
              <label htmlFor="task-description">Description</label>
              <textarea
                id="task-description"
                value={taskFormValues.description}
                onChange={(event) =>
                  setTaskFormValues((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label htmlFor="task-status">Status</label>
              <select
                id="task-status"
                value={taskFormValues.status}
                onChange={(event) =>
                  setTaskFormValues((prev) => ({
                    ...prev,
                    status: event.target.value as Task['status'],
                  }))
                }
              >
                {TASK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-priority">Priority</label>
              <select
                id="task-priority"
                value={taskFormValues.priority}
                onChange={(event) =>
                  setTaskFormValues((prev) => ({
                    ...prev,
                    priority: event.target.value as TaskPriority,
                  }))
                }
              >
                <option value="">Unassigned</option>
                {TASK_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-due-date">Due date</label>
              <input
                id="task-due-date"
                type="date"
                value={taskFormValues.dueDate}
                onChange={(event) =>
                  setTaskFormValues((prev) => ({
                    ...prev,
                    dueDate: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label htmlFor="task-milestone">Milestone</label>
              <select
                id="task-milestone"
                value={taskFormValues.milestoneId}
                onChange={(event) =>
                  setTaskFormValues((prev) => ({
                    ...prev,
                    milestoneId: event.target.value,
                  }))
                }
              >
                <option value="">Unassigned</option>
                {milestones.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone.name}
                  </option>
                ))}
              </select>
            </div>
            {taskError && <p role="alert">{taskError}</p>}
            <div>
              <button
                type="submit"
                disabled={
                  createTaskMutation.isPending || updateTaskMutation.isPending
                }
              >
                {editingTask ? 'Update task' : 'Create task'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowTaskModal(false);
                  resetTaskForm();
                }}
                disabled={
                  createTaskMutation.isPending || updateTaskMutation.isPending
                }
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

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
