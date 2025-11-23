import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';

import { AiMaturity, CompanySize } from '../api/clients';
import {
  useClients,
  useCreateClient,
  useDeleteClient,
  useProjects,
} from '../api/queries';
import useRedirectOnUnauthorized from '../auth/useRedirectOnUnauthorized';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PageHeader } from '../ui/PageHeader';
import { Select } from '../ui/Select';
import { useToast } from '../ui/Toast';

interface Filters {
  search: string;
  industry: string;
  companySize: CompanySize | '';
  aiMaturity: AiMaturity | '';
  includeArchived: boolean;
}

function formatCompanySize(size: CompanySize | null | undefined): string {
  if (!size) return '';
  return size.charAt(0) + size.slice(1).toLowerCase();
}

function formatAiMaturity(maturity: AiMaturity | null | undefined): string {
  if (!maturity) return '';
  return maturity.charAt(0) + maturity.slice(1).toLowerCase();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function ClientsPage(): JSX.Element {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [newClientName, setNewClientName] = useState('');
  const [filters, setFilters] = useState<Filters>({
    search: '',
    industry: '',
    companySize: '',
    aiMaturity: '',
    includeArchived: false,
  });

  const createClient = useCreateClient();
  const deleteClient = useDeleteClient();

  const filterParams = useMemo(
    () => ({
      search: filters.search || undefined,
      companySize: filters.companySize || undefined,
      aiMaturity: filters.aiMaturity || undefined,
      includeArchived: filters.includeArchived,
    }),
    [
      filters.aiMaturity,
      filters.companySize,
      filters.includeArchived,
      filters.search,
    ],
  );

  const clientsQuery = useClients(filterParams);
  const projectsQuery = useProjects();

  useRedirectOnUnauthorized(clientsQuery.error);
  useRedirectOnUnauthorized(projectsQuery.error);

  const clients = useMemo(() => clientsQuery.data ?? [], [clientsQuery.data]);
  const projects = useMemo(
    () => projectsQuery.data ?? [],
    [projectsQuery.data],
  );

  // Compute project counts per client
  const projectCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    projects.forEach((project) => {
      counts[project.clientId] = (counts[project.clientId] || 0) + 1;
    });
    return counts;
  }, [projects]);

  // Get unique industries for filter
  const industries = useMemo(() => {
    const unique = new Set<string>();
    clients.forEach((client) => {
      if (client.industry) {
        unique.add(client.industry);
      }
    });
    return Array.from(unique).sort();
  }, [clients]);

  // Apply industry filter client-side since API doesn't support it
  const filteredClients = useMemo(() => {
    if (!filters.industry) {
      return clients;
    }
    return clients.filter((client) => client.industry === filters.industry);
  }, [clients, filters.industry]);

  const activeFilterCount = [
    filters.search,
    filters.industry,
    filters.companySize,
    filters.aiMaturity,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setFilters({
      search: '',
      industry: '',
      companySize: '',
      aiMaturity: '',
      includeArchived: false,
    });
  };

  const handleClientClick = (clientId: number) => {
    navigate(`/clients/${clientId}`);
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    try {
      await createClient.mutateAsync({
        name: newClientName.trim(),
      });
      setNewClientName('');
      showToast('Client created successfully', 'success');
      // Don't navigate away - let user see the created client in the list
      // They can click on it if they want to view details
    } catch {
      showToast('Failed to create client', 'error');
    }
  };

  const handleDeleteClient = async (
    e: React.MouseEvent,
    clientId: number,
    clientName: string,
  ) => {
    e.stopPropagation(); // Prevent row click navigation

    if (
      !window.confirm(
        `Are you sure you want to delete "${clientName}"? This will also delete all associated projects, tasks, and other data. This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      await deleteClient.mutateAsync(clientId);
      showToast('Client deleted successfully', 'success');
    } catch {
      showToast('Failed to delete client', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <PageHeader
        title="Clients"
        description="Manage your client relationships and view all active engagements."
        actions={
          <Button onClick={() => navigate('/client-intake')}>
            <Plus size={16} />
            New client
          </Button>
        }
      />

      <main className="container-padding py-6 space-y-6">
        {/* Quick Create Client Form */}
        <section className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">
            Quick Create Client
          </h2>
          <form onSubmit={handleCreateClient} className="flex gap-3">
            <div className="flex-1">
              <Input
                label="Name"
                type="text"
                placeholder="Enter client name"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                required
              />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                disabled={!newClientName.trim() || createClient.isPending}
              >
                {createClient.isPending ? 'Creating...' : 'Create Client'}
              </Button>
            </div>
          </form>
        </section>
        {/* Filters Section */}
        <section className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900">Filters</h2>
            {activeFilterCount > 0 && (
              <Button variant="subtle" size="sm" onClick={clearFilters}>
                Clear filters ({activeFilterCount})
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              label="Search"
              type="search"
              placeholder="Search by name or notes"
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
            />

            <Select
              label="Industry"
              value={filters.industry}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, industry: e.target.value }))
              }
            >
              <option value="">All industries</option>
              {industries.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </Select>

            <Select
              label="Company Size"
              value={filters.companySize}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  companySize: e.target.value as CompanySize | '',
                }))
              }
            >
              <option value="">All sizes</option>
              <option value="MICRO">Micro</option>
              <option value="SMALL">Small</option>
              <option value="MEDIUM">Medium</option>
            </Select>

            <Select
              label="AI Maturity"
              value={filters.aiMaturity}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  aiMaturity: e.target.value as AiMaturity | '',
                }))
              }
            >
              <option value="">All maturity levels</option>
              <option value="NONE">None</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </Select>
          </div>

          {/* Show archived toggle */}
          <div className="mt-4">
            <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.includeArchived}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    includeArchived: e.target.checked,
                  }))
                }
                className="rounded border-neutral-300 text-primary-600 focus:ring-primary-600"
              />
              Show archived clients
            </label>
          </div>

          {/* Active Filters Display */}
          {activeFilterCount > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-neutral-600">Active filters:</span>
              {filters.search && (
                <Badge variant="primary">
                  Search: &quot;{filters.search}&quot;
                </Badge>
              )}
              {filters.industry && (
                <Badge variant="primary">Industry: {filters.industry}</Badge>
              )}
              {filters.companySize && (
                <Badge variant="primary">
                  Size: {formatCompanySize(filters.companySize)}
                </Badge>
              )}
              {filters.aiMaturity && (
                <Badge variant="primary">
                  AI Maturity: {formatAiMaturity(filters.aiMaturity)}
                </Badge>
              )}
            </div>
          )}
        </section>

        {/* Clients List */}
        <section className="bg-white rounded-lg border border-neutral-200 shadow-sm">
          <div className="px-6 py-4 border-b border-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900">
              Client List
              {filteredClients.length > 0 && (
                <span className="ml-2 text-sm font-normal text-neutral-600">
                  ({filteredClients.length}{' '}
                  {filteredClients.length === 1 ? 'client' : 'clients'})
                </span>
              )}
            </h2>
          </div>

          {/* Loading State */}
          {clientsQuery.isLoading && (
            <div className="px-6 py-4">
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-neutral-100 animate-pulse rounded"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Error State */}
          {clientsQuery.error && (
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
                  Unable to load clients
                </p>
                <p className="text-neutral-600 text-sm mt-1">
                  Please try refreshing the page or contact support if the
                  problem persists.
                </p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!clientsQuery.isLoading &&
            !clientsQuery.error &&
            filteredClients.length === 0 && (
              <div className="px-6 py-12">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-neutral-100 mb-4">
                    <svg
                      className="w-6 h-6 text-neutral-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  {activeFilterCount > 0 ? (
                    <>
                      <p className="text-neutral-900 font-medium">
                        No clients match your filters
                      </p>
                      <p className="text-neutral-600 text-sm mt-1">
                        Try adjusting or clearing your filters to see more
                        clients.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-neutral-900 font-medium">
                        No clients yet
                      </p>
                      <p className="text-neutral-600 text-sm mt-1 mb-4">
                        Get started by adding your first client.
                      </p>
                      <Button onClick={() => navigate('/client-intake')}>
                        <Plus size={16} />
                        Add your first client
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

          {/* Clients Table */}
          {!clientsQuery.isLoading &&
            !clientsQuery.error &&
            filteredClients.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                        Industry
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                        Company Size
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                        AI Maturity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                        Projects
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                        Last Updated
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-neutral-200">
                    {filteredClients.map((client) => (
                      <tr
                        key={client.id}
                        data-testid={`client-row-${client.id}`}
                        onClick={() => handleClientClick(client.id)}
                        className="hover:bg-neutral-50 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span
                              data-testid={`client-name-${client.id}`}
                              className="text-sm font-medium text-neutral-900"
                            >
                              {client.name}
                            </span>
                            {client.archived && (
                              <Badge variant="neutral">Archived</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                          {client.industry || '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                          {client.companySize
                            ? formatCompanySize(client.companySize)
                            : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {client.aiMaturity ? (
                            <Badge
                              variant={
                                client.aiMaturity === 'HIGH'
                                  ? 'success'
                                  : client.aiMaturity === 'MEDIUM'
                                    ? 'warning'
                                    : 'neutral'
                              }
                            >
                              {formatAiMaturity(client.aiMaturity)}
                            </Badge>
                          ) : (
                            <span className="text-sm text-neutral-600">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                          {projectCounts[client.id] || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-600">
                          {formatDate(client.updatedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={(e) =>
                              handleDeleteClient(e, client.id, client.name)
                            }
                            disabled={deleteClient.isPending}
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

export default ClientsPage;
