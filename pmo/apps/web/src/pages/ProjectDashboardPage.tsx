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

  const milestoneLabel = (milestoneId?: number | null) => {
    if (!milestoneId) {
      return 'Unassigned';
    }

    return milestoneLookup.get(milestoneId)?.name ?? 'Unassigned';
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
