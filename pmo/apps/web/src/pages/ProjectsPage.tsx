import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';

import { ProjectStatus } from '../api/projects';
import { useProjects, useDeleteProject } from '../api/queries';
import { useAccounts } from '../api/hooks/crm';
import useRedirectOnUnauthorized from '../auth/useRedirectOnUnauthorized';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PageHeader } from '../ui/PageHeader';
import { Select } from '../ui/Select';
import { useToast } from '../ui/Toast';
import { EMPTY_STATES } from '../utils/typography';

interface Filters {
  search: string;
  status: ProjectStatus | '';
  clientId: number | '';
}

function formatStatus(status: ProjectStatus): string {
  return status
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getStatusVariant(
  status: ProjectStatus,
): 'success' | 'warning' | 'danger' | 'neutral' | 'primary' {
  switch (status) {
    case 'COMPLETED':
      return 'success';
    case 'IN_PROGRESS':
      return 'primary';
    case 'ON_HOLD':
      return 'warning';
    case 'CANCELLED':
      return 'danger';
    case 'PLANNING':
    default:
      return 'neutral';
  }
}

function ProjectsPage(): JSX.Element {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: '',
    clientId: '',
  });

  const deleteProject = useDeleteProject();

  const filterParams = useMemo(
    () => ({
      status: filters.status || undefined,
      clientId: filters.clientId || undefined,
    }),
    [filters.status, filters.clientId],
  );

  const projectsQuery = useProjects(filterParams);
  const accountsQuery = useAccounts();

  useRedirectOnUnauthorized(projectsQuery.error);
  useRedirectOnUnauthorized(accountsQuery.error);

  const projects = useMemo(
    () => projectsQuery.data ?? [],
    [projectsQuery.data],
  );
  const accounts = useMemo(
    () => accountsQuery.data?.data ?? [],
    [accountsQuery.data?.data],
  );

  // Create a map of client IDs to names for display
  const clientMap = useMemo(() => {
    const map: Record<number, string> = {};
    accounts.forEach((account) => {
      map[account.id] = account.name;
    });
    return map;
  }, [accounts]);

  // Apply search filter client-side
  const filteredProjects = useMemo(() => {
    if (!filters.search) {
      return projects;
    }
    const searchLower = filters.search.toLowerCase();
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(searchLower) ||
        clientMap[project.clientId]?.toLowerCase().includes(searchLower),
    );
  }, [projects, filters.search, clientMap]);

  const activeFilterCount = [
    filters.search,
    filters.status,
    filters.clientId,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      clientId: '',
    });
  };

  const handleProjectClick = (projectId: number) => {
    navigate(`/projects/${projectId}`);
  };

  const handleDeleteProject = async (
    e: React.MouseEvent,
    projectId: number,
    projectName: string,
  ) => {
    e.stopPropagation();

    if (
      !window.confirm(
        `Are you sure you want to delete "${projectName}"? This will also delete all associated tasks, milestones, and meetings. This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      await deleteProject.mutateAsync(projectId);
      showToast('Project deleted successfully', 'success');
    } catch {
      showToast('Failed to delete project', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="Projects"
        description="Manage your projects and track progress across all client engagements."
        actions={
          <Button onClick={() => navigate('/projects/new')}>
            <Plus size={16} />
            New project
          </Button>
        }
      />

      <main className="container-padding py-6 space-y-6">
        {/* Filters Section */}
        <section className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Filters
            </h2>
            {activeFilterCount > 0 && (
              <Button variant="subtle" size="sm" onClick={clearFilters}>
                Clear filters ({activeFilterCount})
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Search"
              type="search"
              placeholder="Search by name or client"
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
            />

            <Select
              label="Status"
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value as ProjectStatus | '',
                }))
              }
            >
              <option value="">All statuses</option>
              <option value="PLANNING">Planning</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>

            <Select
              label="Client"
              value={filters.clientId}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  clientId: e.target.value ? Number(e.target.value) : '',
                }))
              }
            >
              <option value="">All clients</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </div>

          {/* Active Filters Display */}
          {activeFilterCount > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-neutral-600 dark:text-neutral-400">
                Active filters:
              </span>
              {filters.search && (
                <Badge variant="primary">
                  Search: &quot;{filters.search}&quot;
                </Badge>
              )}
              {filters.status && (
                <Badge variant="primary">
                  Status: {formatStatus(filters.status)}
                </Badge>
              )}
              {filters.clientId && (
                <Badge variant="primary">
                  Client: {clientMap[filters.clientId]}
                </Badge>
              )}
            </div>
          )}
        </section>

        {/* Projects List */}
        <section className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm">
          <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Project List
              {filteredProjects.length > 0 && (
                <span className="ml-2 text-sm font-normal text-neutral-600 dark:text-neutral-400">
                  ({filteredProjects.length}{' '}
                  {filteredProjects.length === 1 ? 'project' : 'projects'})
                </span>
              )}
            </h2>
          </div>

          {/* Loading State */}
          {projectsQuery.isLoading && (
            <div className="px-6 py-4">
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-neutral-100 dark:bg-neutral-700 animate-pulse rounded"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Error State */}
          {projectsQuery.error && (
            <div className="px-6 py-12">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-danger-100 mb-4">
                  <svg
                    className="w-6 h-6 text-danger-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <p className="text-danger-600 font-medium" role="alert">
                  Unable to load projects
                </p>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1">
                  Please try refreshing the page or contact support if the
                  problem persists.
                </p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!projectsQuery.isLoading &&
            !projectsQuery.error &&
            filteredProjects.length === 0 && (
              <div className="px-6 py-12">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-700 mb-4">
                    <svg
                      className="w-6 h-6 text-neutral-400 dark:text-neutral-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  {activeFilterCount > 0 ? (
                    <>
                      <p className="text-neutral-900 dark:text-neutral-100 font-medium">
                        No projects match your filters
                      </p>
                      <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1">
                        Try adjusting or clearing your filters to see more
                        projects.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-neutral-900 dark:text-neutral-100 font-medium">
                        {EMPTY_STATES.noProjects}
                      </p>
                      <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1 mb-4">
                        Get started by creating your first project.
                      </p>
                      <Button onClick={() => navigate('/projects/new')}>
                        <Plus size={16} />
                        Create your first project
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

          {/* Projects Table */}
          {!projectsQuery.isLoading &&
            !projectsQuery.error &&
            filteredProjects.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                        Start Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                        End Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                        Last Updated
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                    {filteredProjects.map((project) => (
                      <tr
                        key={project.id}
                        data-testid={`project-row-${project.id}`}
                        onClick={() => handleProjectClick(project.id)}
                        className="hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            data-testid={`project-name-${project.id}`}
                            className="text-sm font-medium text-neutral-900 dark:text-neutral-100"
                          >
                            {project.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                          {clientMap[project.clientId] || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant={getStatusVariant(project.status)}>
                            {formatStatus(project.status)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                          {formatDate(project.startDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                          {formatDate(project.endDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600 dark:text-neutral-400">
                          {formatDate(project.updatedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={(e) =>
                              handleDeleteProject(e, project.id, project.name)
                            }
                            disabled={deleteProject.isPending}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </section>
      </main>
    </div>
  );
}

export default ProjectsPage;
