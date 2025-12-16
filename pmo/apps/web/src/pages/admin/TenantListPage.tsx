import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Plus,
  Search,
  Building2,
  Users,
  Target,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Container,
  PageHeader,
  Section,
  Input,
  Badge,
} from '../../ui';
import { useTenants, useTenantStats } from '../../api/hooks';
import type {
  TenantPlan,
  TenantStatus,
  ListTenantsQuery,
} from '../../api/tenant-admin';

const PLAN_COLORS: Record<TenantPlan, string> = {
  TRIAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  STARTER: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  PROFESSIONAL:
    'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  ENTERPRISE:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const STATUS_COLORS: Record<TenantStatus, string> = {
  PENDING:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  ACTIVE:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  SUSPENDED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  CANCELLED:
    'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300',
};

export function TenantListPage(): JSX.Element {
  const navigate = useNavigate();
  const [query, setQuery] = useState<ListTenantsQuery>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [searchInput, setSearchInput] = useState('');

  const { data: tenantsData, isLoading, error } = useTenants(query);
  const { data: stats } = useTenantStats();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery((prev) => ({ ...prev, search: searchInput, page: 1 }));
  };

  const handleFilterChange = (
    key: keyof ListTenantsQuery,
    value: string | undefined,
  ) => {
    setQuery((prev) => ({
      ...prev,
      [key]: value || undefined,
      page: 1,
    }));
  };

  const handlePageChange = (newPage: number) => {
    setQuery((prev) => ({ ...prev, page: newPage }));
  };

  const handleCreateTenant = () => {
    navigate('/admin/tenants/new');
  };

  const handleViewTenant = (tenantId: string) => {
    navigate(`/admin/tenants/${tenantId}`);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="Tenant Management"
        description="Create and manage customer tenants across the platform."
      />

      <Section>
        <Container>
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardBody className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                      <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {stats.total}
                      </p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Total Tenants
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {stats.byStatus?.ACTIVE || 0}
                      </p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Active
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                      <Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {stats.byPlan?.TRIAL || 0}
                      </p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        On Trial
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardBody className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                        {stats.byPlan?.ENTERPRISE || 0}
                      </p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Enterprise
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}

          {/* Filters and Actions */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  type="text"
                  placeholder="Search by name, slug, or owner email..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>

            <div className="flex gap-2">
              <select
                value={query.plan || ''}
                onChange={(e) => handleFilterChange('plan', e.target.value)}
                className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              >
                <option value="">All Plans</option>
                <option value="TRIAL">Trial</option>
                <option value="STARTER">Starter</option>
                <option value="PROFESSIONAL">Professional</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>

              <select
                value={query.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <Button onClick={handleCreateTenant}>
                <Plus className="w-4 h-4 mr-2" />
                Create Tenant
              </Button>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div
              className="mb-6 p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg text-danger-800 dark:text-danger-200"
              role="alert"
            >
              <strong className="font-medium">Error:</strong>{' '}
              {error instanceof Error
                ? error.message
                : 'Failed to load tenants'}
            </div>
          )}

          {/* Tenants Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Tenants</CardTitle>
            </CardHeader>
            <CardBody>
              {isLoading ? (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                  Loading tenants...
                </div>
              ) : !tenantsData?.tenants.length ? (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                  No tenants found.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                      <thead className="bg-neutral-50 dark:bg-neutral-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Tenant
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Plan
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Owner
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Users
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Created
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                        {tenantsData.tenants.map((tenant) => (
                          <tr
                            key={tenant.id}
                            className="hover:bg-neutral-50 dark:hover:bg-neutral-700 cursor-pointer"
                            onClick={() => handleViewTenant(tenant.id)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                  {tenant.name}
                                </div>
                                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                                  {tenant.slug}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className={PLAN_COLORS[tenant.plan]}>
                                {tenant.plan}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className={STATUS_COLORS[tenant.status]}>
                                {tenant.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                              {tenant.owner?.email || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                              {tenant._count.users}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                              {new Date(tenant.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewTenant(tenant.id);
                                }}
                              >
                                View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {tenantsData.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 dark:border-neutral-700">
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        Showing{' '}
                        {(tenantsData.pagination.page - 1) *
                          tenantsData.pagination.limit +
                          1}{' '}
                        to{' '}
                        {Math.min(
                          tenantsData.pagination.page *
                            tenantsData.pagination.limit,
                          tenantsData.pagination.total,
                        )}{' '}
                        of {tenantsData.pagination.total} tenants
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            handlePageChange(tenantsData.pagination.page - 1)
                          }
                          disabled={tenantsData.pagination.page === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="px-3 py-1 text-sm text-neutral-700 dark:text-neutral-300">
                          Page {tenantsData.pagination.page} of{' '}
                          {tenantsData.pagination.totalPages}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            handlePageChange(tenantsData.pagination.page + 1)
                          }
                          disabled={
                            tenantsData.pagination.page ===
                            tenantsData.pagination.totalPages
                          }
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        </Container>
      </Section>
    </div>
  );
}

export default TenantListPage;
