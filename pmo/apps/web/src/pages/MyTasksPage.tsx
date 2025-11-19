import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { useProjects } from '../api/queries';
import useRedirectOnUnauthorized from '../auth/useRedirectOnUnauthorized';
import { TASK_PRIORITIES, TASK_STATUSES, useMyTasks } from '../hooks/tasks';

interface Filters {
  projectId: string;
  status: string;
  priority: string;
  search: string;
}

function formatDate(value?: string | null) {
  if (!value) {
    return 'No due date';
  }

  return new Date(value).toLocaleDateString();
}

function MyTasksPage(): JSX.Element {
  const [filters, setFilters] = useState<Filters>({
    projectId: '',
    status: 'ALL',
    priority: 'ALL',
    search: '',
  });

  const tasksQuery = useMyTasks();
  const projectsQuery = useProjects();

  useRedirectOnUnauthorized(tasksQuery.error);
  useRedirectOnUnauthorized(projectsQuery.error);

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const projects = projectsQuery.data ?? [];

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filters.projectId && Number(filters.projectId) !== task.projectId) {
        return false;
      }

      if (filters.status !== 'ALL' && task.status !== filters.status) {
        return false;
      }

      if (filters.priority !== 'ALL' && task.priority !== filters.priority) {
        return false;
      }

      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        return (
          task.title.toLowerCase().includes(searchTerm) ||
          (task.description ?? '').toLowerCase().includes(searchTerm)
        );
      }

      return true;
    });
  }, [
    filters.priority,
    filters.projectId,
    filters.search,
    filters.status,
    tasks,
  ]);

  return (
    <main>
      <header>
        <h1>My tasks</h1>
        <p>Track tasks across every project you own.</p>
      </header>

      <section aria-label="task-filters">
        <h2>Filters</h2>
        <div className="filters-grid">
          <label>
            Project
            <select
              value={filters.projectId}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  projectId: event.target.value,
                }))
              }
            >
              <option value="">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select
              value={filters.status}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  status: event.target.value,
                }))
              }
            >
              <option value="ALL">All statuses</option>
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select
              value={filters.priority}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  priority: event.target.value,
                }))
              }
            >
              <option value="ALL">All priorities</option>
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <label>
            Search
            <input
              type="search"
              placeholder="Title or description"
              value={filters.search}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, search: event.target.value }))
              }
            />
          </label>
        </div>
      </section>

      <section aria-label="tasks">
        <h2>Tasks</h2>
        {tasksQuery.isLoading && <p>Loading tasks…</p>}
        {tasksQuery.error && <p role="alert">Unable to load tasks.</p>}
        {!tasksQuery.isLoading && filteredTasks.length === 0 && (
          <p>No tasks match the selected filters.</p>
        )}

        <ul className="task-list">
          {filteredTasks.map((task) => (
            <li key={task.id} className="task-card">
              <div className="task-card__header">
                <div>
                  <strong>{task.title}</strong>
                  <div className="task-card__meta">
                    <span>Status: {task.status}</span>
                    <span>Priority: {task.priority ?? 'Unassigned'}</span>
                    <span>Due: {formatDate(task.dueDate)}</span>
                  </div>
                </div>
                <div>
                  <Link to={`/projects/${task.projectId}`}>Go to project</Link>
                </div>
              </div>
              {task.projectName && <div>Project: {task.projectName}</div>}
              {task.description && <p>{task.description}</p>}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default MyTasksPage;
