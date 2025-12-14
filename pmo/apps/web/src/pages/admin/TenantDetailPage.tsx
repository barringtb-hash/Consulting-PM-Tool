import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Mail,
  Calendar,
  Edit2,
  UserPlus,
  Trash2,
  Ban,
  CheckCircle,
  XCircle,
  AlertTriangle,
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
  Badge,
  Input,
  Modal,
} from '../../ui';
import {
  useTenant,
  useSuspendTenant,
  useActivateTenant,
  useCancelTenant,
  useAddTenantUser,
  useRemoveTenantUser,
  useUpdateTenantUserRole,
} from '../../api/hooks';
import type {
  TenantPlan,
  TenantStatus,
  TenantRole,
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

export function TenantDetailPage(): JSX.Element {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();

  const { data: tenant, isLoading, error } = useTenant(tenantId);
  const suspendMutation = useSuspendTenant();
  const activateMutation = useActivateTenant();
  const cancelMutation = useCancelTenant();
  const addUserMutation = useAddTenantUser();
  const removeUserMutation = useRemoveTenantUser();
  const updateRoleMutation = useUpdateTenantUserRole();

  // Modal states
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState<{
    action: 'suspend' | 'activate' | 'cancel' | 'removeUser';
    userId?: number;
    userName?: string;
  } | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<TenantRole>('MEMBER');
  const [tempPasswordResult, setTempPasswordResult] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const handleBack = () => {
    navigate('/admin/tenants');
  };

  const handleEdit = () => {
    navigate(`/admin/tenants/${tenantId}/edit`);
  };

  const handleStatusAction = async () => {
    if (!tenantId || !showConfirmModal) return;

    try {
      switch (showConfirmModal.action) {
        case 'suspend':
          await suspendMutation.mutateAsync(tenantId);
          break;
        case 'activate':
          await activateMutation.mutateAsync(tenantId);
          break;
        case 'cancel':
          await cancelMutation.mutateAsync(tenantId);
          break;
        case 'removeUser':
          if (showConfirmModal.userId) {
            await removeUserMutation.mutateAsync({
              tenantId,
              userId: showConfirmModal.userId,
            });
          }
          break;
      }
      setShowConfirmModal(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !newUserEmail) return;

    try {
      const result = await addUserMutation.mutateAsync({
        tenantId,
        input: {
          email: newUserEmail,
          name: newUserName || undefined,
          role: newUserRole,
        },
      });

      if (result.isNewUser && result.tempPassword) {
        setTempPasswordResult({
          email: newUserEmail,
          password: result.tempPassword,
        });
      }

      setShowAddUserModal(false);
      setNewUserEmail('');
      setNewUserName('');
      setNewUserRole('MEMBER');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add user');
    }
  };

  const handleRoleChange = async (userId: number, newRole: TenantRole) => {
    if (!tenantId) return;
    try {
      await updateRoleMutation.mutateAsync({
        tenantId,
        userId,
        role: newRole,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-neutral-500 dark:text-neutral-400">
          Loading tenant details...
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <PageHeader title="Tenant Not Found" />
        <Section>
          <Container>
            <div className="text-center py-8">
              <p className="text-neutral-500 dark:text-neutral-400 mb-4">
                {error instanceof Error ? error.message : 'Tenant not found'}
              </p>
              <Button onClick={handleBack}>Back to Tenants</Button>
            </div>
          </Container>
        </Section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader title={tenant.name} description={`Slug: ${tenant.slug}`} />

      <Section>
        <Container>
          {/* Back and Actions */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="secondary" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tenants
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleEdit}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit
              </Button>
              {tenant.status === 'ACTIVE' && (
                <Button
                  variant="destructive"
                  onClick={() => setShowConfirmModal({ action: 'suspend' })}
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Suspend
                </Button>
              )}
              {tenant.status === 'SUSPENDED' && (
                <Button
                  onClick={() => setShowConfirmModal({ action: 'activate' })}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Activate
                </Button>
              )}
              {tenant.status !== 'CANCELLED' && (
                <Button
                  variant="destructive"
                  onClick={() => setShowConfirmModal({ action: 'cancel' })}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Card>
              <CardBody>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                    <Building2 className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className={PLAN_COLORS[tenant.plan]}>
                        {tenant.plan}
                      </Badge>
                      <Badge className={STATUS_COLORS[tenant.status]}>
                        {tenant.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                      Plan & Status
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Mail className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {tenant.billingEmail || 'Not set'}
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Billing Email
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                    <Calendar className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Created Date
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Stats */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Usage Statistics</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {tenant._count.users}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Users
                  </p>
                </div>
                <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {tenant._count.accounts}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Accounts
                  </p>
                </div>
                <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {tenant._count.crmContacts}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Contacts
                  </p>
                </div>
                <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {tenant._count.opportunities}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Opportunities
                  </p>
                </div>
                <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {tenant._count.activities}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Activities
                  </p>
                </div>
                <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {tenant._count.clients}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Clients
                  </p>
                </div>
                <div className="text-center p-4 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
                  <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {tenant._count.projects}
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Projects
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Users */}
          <Card className="mb-6">
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Users ({tenant.users.length})</CardTitle>
              <Button size="sm" onClick={() => setShowAddUserModal(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-700">
                  <thead className="bg-neutral-50 dark:bg-neutral-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Tenant Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Global Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-700">
                    {tenant.users.map((tenantUser) => (
                      <tr
                        key={tenantUser.userId}
                        className="hover:bg-neutral-50 dark:hover:bg-neutral-700"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                              {tenantUser.user.name}
                            </div>
                            <div className="text-sm text-neutral-500 dark:text-neutral-400">
                              {tenantUser.user.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={tenantUser.role}
                            onChange={(e) =>
                              handleRoleChange(
                                tenantUser.userId,
                                e.target.value as TenantRole,
                              )
                            }
                            className="px-2 py-1 border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 text-sm"
                            disabled={updateRoleMutation.isPending}
                          >
                            <option value="OWNER">Owner</option>
                            <option value="ADMIN">Admin</option>
                            <option value="MEMBER">Member</option>
                            <option value="VIEWER">Viewer</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            className={
                              tenantUser.user.role === 'ADMIN'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300'
                            }
                          >
                            {tenantUser.user.role}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                          {tenantUser.acceptedAt
                            ? new Date(
                                tenantUser.acceptedAt,
                              ).toLocaleDateString()
                            : 'Pending'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              setShowConfirmModal({
                                action: 'removeUser',
                                userId: tenantUser.userId,
                                userName: tenantUser.user.name,
                              })
                            }
                            disabled={tenantUser.role === 'OWNER'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>

          {/* Modules */}
          <Card>
            <CardHeader>
              <CardTitle>Enabled Modules ({tenant.modules.length})</CardTitle>
            </CardHeader>
            <CardBody>
              {tenant.modules.length === 0 ? (
                <p className="text-neutral-500 dark:text-neutral-400 text-center py-4">
                  No modules configured for this tenant.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tenant.modules.map((mod) => (
                    <div
                      key={mod.id}
                      className={`p-4 rounded-lg border ${
                        mod.enabled
                          ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                          : 'border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-neutral-900 dark:text-neutral-100">
                          {mod.moduleId}
                        </span>
                        <Badge
                          className={
                            mod.enabled
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                              : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300'
                          }
                        >
                          {mod.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="text-sm text-neutral-500 dark:text-neutral-400">
                        Tier: {mod.tier}
                        {mod.trialEndsAt && (
                          <span className="ml-2">
                            (Trial ends:{' '}
                            {new Date(mod.trialEndsAt).toLocaleDateString()})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </Container>
      </Section>

      {/* Add User Modal */}
      <Modal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        title="Add User to Tenant"
      >
        <form onSubmit={handleAddUser}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Email *
              </label>
              <Input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="user@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Name (optional, for new users)
              </label>
              <Input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Role
              </label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as TenantRole)}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800"
              >
                <option value="ADMIN">Admin</option>
                <option value="MEMBER">Member</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAddUserModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={addUserMutation.isPending}>
              Add User
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Action Modal */}
      <Modal
        isOpen={!!showConfirmModal}
        onClose={() => setShowConfirmModal(null)}
        title={
          showConfirmModal?.action === 'suspend'
            ? 'Suspend Tenant'
            : showConfirmModal?.action === 'activate'
              ? 'Activate Tenant'
              : showConfirmModal?.action === 'cancel'
                ? 'Cancel Tenant'
                : 'Remove User'
        }
      >
        <div className="flex items-start gap-4">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full">
            <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            {showConfirmModal?.action === 'suspend' && (
              <p className="text-neutral-700 dark:text-neutral-300">
                Are you sure you want to suspend <strong>{tenant.name}</strong>?
                Users will not be able to access the platform until it is
                reactivated.
              </p>
            )}
            {showConfirmModal?.action === 'activate' && (
              <p className="text-neutral-700 dark:text-neutral-300">
                Are you sure you want to activate <strong>{tenant.name}</strong>
                ? Users will be able to access the platform again.
              </p>
            )}
            {showConfirmModal?.action === 'cancel' && (
              <p className="text-neutral-700 dark:text-neutral-300">
                Are you sure you want to cancel <strong>{tenant.name}</strong>?
                This will mark the tenant as cancelled. Data will be retained
                but users will not be able to access the platform.
              </p>
            )}
            {showConfirmModal?.action === 'removeUser' && (
              <p className="text-neutral-700 dark:text-neutral-300">
                Are you sure you want to remove{' '}
                <strong>{showConfirmModal.userName}</strong> from this tenant?
              </p>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={() => setShowConfirmModal(null)}>
            Cancel
          </Button>
          <Button
            variant={
              showConfirmModal?.action === 'activate'
                ? 'primary'
                : 'destructive'
            }
            onClick={handleStatusAction}
            isLoading={
              suspendMutation.isPending ||
              activateMutation.isPending ||
              cancelMutation.isPending ||
              removeUserMutation.isPending
            }
          >
            Confirm
          </Button>
        </div>
      </Modal>

      {/* Temp Password Modal */}
      <Modal
        isOpen={!!tempPasswordResult}
        onClose={() => setTempPasswordResult(null)}
        title="New User Created"
      >
        <div className="space-y-4">
          <p className="text-neutral-700 dark:text-neutral-300">
            A new user account has been created. Please share these credentials
            securely:
          </p>
          <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg font-mono text-sm">
            <div className="mb-2">
              <span className="text-neutral-500 dark:text-neutral-400">
                Email:
              </span>{' '}
              <span className="text-neutral-900 dark:text-neutral-100">
                {tempPasswordResult?.email}
              </span>
            </div>
            <div>
              <span className="text-neutral-500 dark:text-neutral-400">
                Password:
              </span>{' '}
              <span className="text-neutral-900 dark:text-neutral-100">
                {tempPasswordResult?.password}
              </span>
            </div>
          </div>
          <p className="text-sm text-amber-600 dark:text-amber-400">
            The user should change this password after their first login.
          </p>
        </div>
        <div className="flex justify-end mt-6">
          <Button onClick={() => setTempPasswordResult(null)}>Close</Button>
        </div>
      </Modal>
    </div>
  );
}

export default TenantDetailPage;
