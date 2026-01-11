import React, { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
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
  Settings,
  Power,
  Plus,
  Palette,
  Save,
} from 'lucide-react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  PageHeader,
  Badge,
  Input,
  Modal,
  useToast,
} from '../../ui';
import {
  useTenant,
  useSuspendTenant,
  useActivateTenant,
  useCancelTenant,
  useAddTenantUser,
  useRemoveTenantUser,
  useUpdateTenantUserRole,
  useConfigureTenantModule,
  useUpdateTenantBranding,
  useForceDeleteTenant,
} from '../../api/hooks';
import { useAuth } from '../../auth/AuthContext';
import type {
  TenantPlan,
  TenantStatus,
  TenantRole,
  ModuleTier,
  UserRole,
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

// Available modules that can be configured per tenant (defined outside component for stable reference)
const AVAILABLE_MODULES = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Main dashboard with overview metrics',
  },
  {
    id: 'tasks',
    label: 'Tasks',
    description: 'Personal task management and tracking',
  },
  {
    id: 'clients',
    label: 'Clients',
    description: 'Client management, contacts, and documents',
  },
  {
    id: 'projects',
    label: 'Projects',
    description: 'Project management, milestones, and meetings',
  },
  {
    id: 'assets',
    label: 'Assets',
    description: 'AI-generated assets and content library',
  },
  {
    id: 'marketing',
    label: 'Marketing',
    description: 'Marketing content creation and campaigns',
  },
  { id: 'leads', label: 'Leads', description: 'Lead capture and management' },
  {
    id: 'pipeline',
    label: 'Pipeline',
    description: 'Sales pipeline visualization and tracking',
  },
  {
    id: 'crmAccounts',
    label: 'CRM Accounts',
    description: 'CRM account management with hierarchy support',
  },
  {
    id: 'crmOpportunities',
    label: 'CRM Opportunities',
    description: 'Sales pipeline with customizable stages',
  },
  {
    id: 'customerSuccess',
    label: 'Customer Success',
    description: 'Customer Success Platform with health scoring',
  },
  {
    id: 'chatbot',
    label: 'AI Chatbot',
    description: 'AI-powered customer service chatbot',
  },
  {
    id: 'documentAnalyzer',
    label: 'Document Analyzer',
    description: 'Smart document analysis with OCR',
  },
  {
    id: 'contentGenerator',
    label: 'Content Generator',
    description: 'AI-powered content generation',
  },
  {
    id: 'leadScoring',
    label: 'Lead Scoring',
    description: 'ML-based lead scoring with predictive analytics',
  },
];

/**
 * Skeleton loader for detail page loading state
 */
function DetailPageSkeleton(): JSX.Element {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <div className="border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
        <div className="container-padding py-6">
          <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
          <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>
      </div>
      <div className="page-content">
        <div className="flex items-center justify-between mb-6">
          <div className="h-10 w-36 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-10 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            <div className="h-10 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardBody>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-neutral-200 dark:bg-neutral-700 rounded-lg animate-pulse">
                    <div className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="h-5 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
                    <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
        <Card className="mb-6">
          <CardHeader>
            <div className="h-6 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div
                  key={i}
                  className="text-center p-4 bg-neutral-100 dark:bg-neutral-700 rounded-lg"
                >
                  <div className="h-8 w-12 bg-neutral-200 dark:bg-neutral-600 rounded animate-pulse mx-auto mb-2" />
                  <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-600 rounded animate-pulse mx-auto" />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export function TenantDetailPage(): JSX.Element {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();

  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const { showToast } = useToast();

  const { data: tenant, isLoading, error } = useTenant(tenantId);
  const suspendMutation = useSuspendTenant();
  const activateMutation = useActivateTenant();
  const cancelMutation = useCancelTenant();
  const addUserMutation = useAddTenantUser();
  const removeUserMutation = useRemoveTenantUser();
  const updateRoleMutation = useUpdateTenantUserRole();
  const configureModuleMutation = useConfigureTenantModule();
  const updateBrandingMutation = useUpdateTenantBranding();
  const forceDeleteMutation = useForceDeleteTenant();

  // Modal states
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState<{
    action: 'suspend' | 'activate' | 'cancel' | 'removeUser';
    userId?: number;
    userName?: string;
  } | null>(null);
  const [showForceDeleteModal, setShowForceDeleteModal] = useState(false);
  const [forceDeleteConfirmText, setForceDeleteConfirmText] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<TenantRole>('MEMBER');
  const [newUserGlobalRole, setNewUserGlobalRole] = useState<UserRole>('USER');
  const [tempPasswordResult, setTempPasswordResult] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [showModuleConfigModal, setShowModuleConfigModal] = useState(false);
  const [selectedModuleConfig, setSelectedModuleConfig] = useState<{
    moduleId: string;
    enabled: boolean;
    tier: ModuleTier;
    trialEndsAt: string;
  }>({
    moduleId: '',
    enabled: true,
    tier: 'BASIC',
    trialEndsAt: '',
  });
  const [brandingForm, setBrandingForm] = useState({
    primaryColor: '',
    secondaryColor: '',
    logoUrl: '',
    faviconUrl: '',
    customCss: '',
  });
  const [brandingDirty, setBrandingDirty] = useState(false);

  // Initialize branding form when tenant loads
  // Use tenantId as primary dependency, then check if tenant data is available
  React.useEffect(() => {
    // Reset branding form when tenantId changes
    if (!tenant) {
      setBrandingForm({
        primaryColor: '',
        secondaryColor: '',
        logoUrl: '',
        faviconUrl: '',
        customCss: '',
      });
      setBrandingDirty(false);
      return;
    }

    // Populate branding form when tenant data is available
    setBrandingForm({
      primaryColor: tenant.branding?.primaryColor || '',
      secondaryColor: tenant.branding?.secondaryColor || '',
      logoUrl: tenant.branding?.logoUrl || '',
      faviconUrl: tenant.branding?.faviconUrl || '',
      customCss: tenant.branding?.customCss || '',
    });
    setBrandingDirty(false);
  }, [tenantId, tenant]);

  // PERF FIX: Memoized navigation handlers
  const handleBack = useCallback(() => {
    navigate('/admin/tenants');
  }, [navigate]);

  const handleEdit = useCallback(() => {
    navigate(`/admin/tenants/${tenantId}/edit`);
  }, [navigate, tenantId]);

  const handleStatusAction = useCallback(async () => {
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
  }, [
    tenantId,
    showConfirmModal,
    suspendMutation,
    activateMutation,
    cancelMutation,
    removeUserMutation,
  ]);

  const handleAddUser = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!tenantId || !newUserEmail) return;

      try {
        const result = await addUserMutation.mutateAsync({
          tenantId,
          input: {
            email: newUserEmail,
            name: newUserName || undefined,
            role: newUserRole,
            userRole: newUserGlobalRole,
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
        setNewUserGlobalRole('USER');
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to add user');
      }
    },
    [
      tenantId,
      newUserEmail,
      newUserName,
      newUserRole,
      newUserGlobalRole,
      addUserMutation,
    ],
  );

  const handleRoleChange = useCallback(
    async (userId: number, newRole: TenantRole) => {
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
    },
    [tenantId, updateRoleMutation],
  );

  const handleOpenModuleConfig = useCallback(
    (
      moduleId: string,
      existingModule?: {
        enabled: boolean;
        tier: ModuleTier;
        trialEndsAt?: string | null;
      },
    ) => {
      setSelectedModuleConfig({
        moduleId,
        enabled: existingModule?.enabled ?? true,
        tier: existingModule?.tier ?? 'BASIC',
        trialEndsAt: existingModule?.trialEndsAt
          ? new Date(existingModule.trialEndsAt).toISOString().split('T')[0]
          : '',
      });
      setShowModuleConfigModal(true);
    },
    [],
  );

  const handleToggleModule = useCallback(
    async (moduleId: string, currentlyEnabled: boolean) => {
      if (!tenantId) return;
      try {
        await configureModuleMutation.mutateAsync({
          tenantId,
          input: {
            moduleId,
            enabled: !currentlyEnabled,
          },
        });
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to toggle module');
      }
    },
    [tenantId, configureModuleMutation],
  );

  const handleSaveModuleConfig = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!tenantId || !selectedModuleConfig.moduleId) return;

      // Convert trialEndsAt date string to trialDays (number of days from today)
      let trialDays: number | undefined;
      if (selectedModuleConfig.trialEndsAt) {
        const trialEndDate = new Date(selectedModuleConfig.trialEndsAt);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        trialEndDate.setHours(0, 0, 0, 0);
        const diffTime = trialEndDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays > 0) {
          trialDays = diffDays;
        }
      }

      try {
        await configureModuleMutation.mutateAsync({
          tenantId,
          input: {
            moduleId: selectedModuleConfig.moduleId,
            enabled: selectedModuleConfig.enabled,
            tier: selectedModuleConfig.tier,
            trialDays,
          },
        });
        setShowModuleConfigModal(false);
      } catch (err) {
        alert(
          err instanceof Error ? err.message : 'Failed to configure module',
        );
      }
    },
    [tenantId, selectedModuleConfig, configureModuleMutation],
  );

  const handleBrandingChange = useCallback(
    (field: keyof typeof brandingForm, value: string) => {
      setBrandingForm((prev) => ({ ...prev, [field]: value }));
      setBrandingDirty(true);
    },
    [],
  );

  const handleSaveBranding = useCallback(async () => {
    if (!tenantId) return;

    try {
      await updateBrandingMutation.mutateAsync({
        tenantId,
        input: {
          primaryColor: brandingForm.primaryColor || null,
          secondaryColor: brandingForm.secondaryColor || null,
          logoUrl: brandingForm.logoUrl || null,
          faviconUrl: brandingForm.faviconUrl || null,
          customCss: brandingForm.customCss || null,
        },
      });
      setBrandingDirty(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save branding');
    }
  }, [tenantId, brandingForm, updateBrandingMutation]);

  // PERF FIX: Memoize filtered module lists to avoid recalculation on every render
  const enabledModuleCount = useMemo(() => {
    return tenant?.modules.filter((m) => m.enabled).length ?? 0;
  }, [tenant?.modules]);

  const availableModulesToAdd = useMemo(() => {
    if (!tenant) return AVAILABLE_MODULES;
    const configuredIds = new Set(tenant.modules.map((tm) => tm.moduleId));
    return AVAILABLE_MODULES.filter((m) => !configuredIds.has(m.id));
  }, [tenant]);

  if (isLoading) {
    return <DetailPageSkeleton />;
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
        <PageHeader title="Tenant Not Found" icon={Building2} />
        <div className="page-content">
          <div className="text-center py-8">
            <p className="text-neutral-500 dark:text-neutral-400 mb-4">
              {error instanceof Error ? error.message : 'Tenant not found'}
            </p>
            <Button onClick={handleBack}>Back to Tenants</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title={tenant.name}
        description={`Slug: ${tenant.slug}`}
        icon={Building2}
        actions={
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
            {/* Super Admin Only: Force Delete */}
            {isSuperAdmin && (
              <Button
                variant="destructive"
                onClick={() => setShowForceDeleteModal(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Force Delete
              </Button>
            )}
          </div>
        }
      />

      <div className="page-content">
        {/* Back Button */}
        <div className="mb-6">
          <Button variant="secondary" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tenants
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardBody>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
                <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
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
                <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
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
                          className="px-2 py-1 border border-neutral-300 dark:border-neutral-600 rounded bg-white dark:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-100"
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
                            tenantUser.user.role === 'SUPER_ADMIN'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              : tenantUser.user.role === 'ADMIN'
                                ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300'
                          }
                        >
                          {tenantUser.user.role === 'SUPER_ADMIN'
                            ? 'Super Admin'
                            : tenantUser.user.role}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-neutral-500 dark:text-neutral-400">
                        {tenantUser.acceptedAt
                          ? new Date(tenantUser.acceptedAt).toLocaleDateString()
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
        <Card className="mb-6">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Modules ({enabledModuleCount} enabled)</CardTitle>
            <Button size="sm" onClick={() => handleOpenModuleConfig('')}>
              <Plus className="w-4 h-4 mr-2" />
              Add Module
            </Button>
          </CardHeader>
          <CardBody>
            {/* Currently configured modules */}
            {tenant.modules.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                  Configured Modules
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tenant.modules.map((mod) => {
                    const moduleInfo = AVAILABLE_MODULES.find(
                      (m) => m.id === mod.moduleId,
                    );
                    return (
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
                            {moduleInfo?.label || mod.moduleId}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                handleToggleModule(mod.moduleId, mod.enabled)
                              }
                              disabled={configureModuleMutation.isPending}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                                mod.enabled
                                  ? 'bg-green-600'
                                  : 'bg-neutral-300 dark:bg-neutral-600'
                              }`}
                              role="switch"
                              aria-checked={mod.enabled}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                  mod.enabled
                                    ? 'translate-x-6'
                                    : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                        <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
                          {moduleInfo?.description || 'No description'}
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-neutral-400 dark:text-neutral-500">
                            <Badge
                              className={
                                mod.tier === 'ENTERPRISE'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                  : mod.tier === 'PREMIUM'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                    : mod.tier === 'TRIAL'
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                      : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-300'
                              }
                            >
                              {mod.tier}
                            </Badge>
                            {mod.trialEndsAt && (
                              <span className="ml-2 text-amber-600 dark:text-amber-400">
                                Trial ends:{' '}
                                {new Date(mod.trialEndsAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              handleOpenModuleConfig(mod.moduleId, mod)
                            }
                          >
                            <Settings className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available modules to add */}
            <div>
              <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
                Available Modules
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableModulesToAdd.map((mod) => (
                  <div
                    key={mod.id}
                    className="p-3 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-600 bg-neutral-50/50 dark:bg-neutral-800/50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-neutral-700 dark:text-neutral-300 text-sm">
                          {mod.label}
                        </span>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          {mod.description}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenModuleConfig(mod.id)}
                      >
                        <Power className="w-3 h-3 mr-1" />
                        Enable
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {availableModulesToAdd.length === 0 && (
                <p className="text-neutral-500 dark:text-neutral-400 text-center py-4 text-sm">
                  All available modules have been configured.
                </p>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Branding
            </CardTitle>
            {brandingDirty && (
              <Button
                size="sm"
                onClick={handleSaveBranding}
                isLoading={updateBrandingMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            )}
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Colors */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Colors
                </h4>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                      Primary Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brandingForm.primaryColor || '#3b82f6'}
                        onChange={(e) =>
                          handleBrandingChange('primaryColor', e.target.value)
                        }
                        className="w-10 h-10 rounded border border-neutral-300 dark:border-neutral-600 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={brandingForm.primaryColor}
                        onChange={(e) =>
                          handleBrandingChange('primaryColor', e.target.value)
                        }
                        placeholder="#3b82f6"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                      Secondary Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brandingForm.secondaryColor || '#64748b'}
                        onChange={(e) =>
                          handleBrandingChange('secondaryColor', e.target.value)
                        }
                        className="w-10 h-10 rounded border border-neutral-300 dark:border-neutral-600 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={brandingForm.secondaryColor}
                        onChange={(e) =>
                          handleBrandingChange('secondaryColor', e.target.value)
                        }
                        placeholder="#64748b"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Logo & Favicon */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Logo & Favicon
                </h4>
                <div>
                  <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                    Logo URL
                  </label>
                  <Input
                    type="url"
                    value={brandingForm.logoUrl}
                    onChange={(e) =>
                      handleBrandingChange('logoUrl', e.target.value)
                    }
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                    Favicon URL
                  </label>
                  <Input
                    type="url"
                    value={brandingForm.faviconUrl}
                    onChange={(e) =>
                      handleBrandingChange('faviconUrl', e.target.value)
                    }
                    placeholder="https://example.com/favicon.ico"
                  />
                </div>
              </div>

              {/* Custom CSS */}
              <div className="md:col-span-2 space-y-2">
                <h4 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Custom CSS
                </h4>
                <textarea
                  value={brandingForm.customCss}
                  onChange={(e) =>
                    handleBrandingChange('customCss', e.target.value)
                  }
                  placeholder="/* Add custom CSS styles here */"
                  rows={5}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 font-mono text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400"
                />
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Custom CSS will be applied to the tenant&apos;s interface. Use
                  with caution.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

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
                Tenant Role
              </label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as TenantRole)}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              >
                <option value="ADMIN">Admin</option>
                <option value="MEMBER">Member</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                User&apos;s role within this tenant
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Global Role
              </label>
              <select
                value={newUserGlobalRole}
                onChange={(e) =>
                  setNewUserGlobalRole(e.target.value as UserRole)
                }
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              >
                <option value="USER">User</option>
                <option value="ADMIN">Admin</option>
                {isSuperAdmin && (
                  <option value="SUPER_ADMIN">Super Admin</option>
                )}
              </select>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                User&apos;s system-wide role (Admin can access admin panel)
              </p>
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

      {/* Module Configuration Modal */}
      <Modal
        isOpen={showModuleConfigModal}
        onClose={() => setShowModuleConfigModal(false)}
        title={
          selectedModuleConfig.moduleId
            ? `Configure ${AVAILABLE_MODULES.find((m) => m.id === selectedModuleConfig.moduleId)?.label || selectedModuleConfig.moduleId}`
            : 'Add Module'
        }
      >
        <form onSubmit={handleSaveModuleConfig}>
          <div className="space-y-4">
            {/* Module selector (only shown when adding new) */}
            {!selectedModuleConfig.moduleId && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Select Module *
                </label>
                <select
                  value={selectedModuleConfig.moduleId}
                  onChange={(e) =>
                    setSelectedModuleConfig((prev) => ({
                      ...prev,
                      moduleId: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  required
                >
                  <option value="">Select a module...</option>
                  {AVAILABLE_MODULES.filter(
                    (m) => !tenant.modules.find((tm) => tm.moduleId === m.id),
                  ).map((mod) => (
                    <option key={mod.id} value={mod.id}>
                      {mod.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Enabled toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Enabled
                </label>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Enable or disable this module for the tenant
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSelectedModuleConfig((prev) => ({
                    ...prev,
                    enabled: !prev.enabled,
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  selectedModuleConfig.enabled
                    ? 'bg-green-600'
                    : 'bg-neutral-300 dark:bg-neutral-600'
                }`}
                role="switch"
                aria-checked={selectedModuleConfig.enabled}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    selectedModuleConfig.enabled
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Tier selection */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Tier
              </label>
              <select
                value={selectedModuleConfig.tier}
                onChange={(e) =>
                  setSelectedModuleConfig((prev) => ({
                    ...prev,
                    tier: e.target.value as ModuleTier,
                  }))
                }
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              >
                <option value="TRIAL">Trial</option>
                <option value="BASIC">Basic</option>
                <option value="PREMIUM">Premium</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Determines feature access level for this module
              </p>
            </div>

            {/* Trial end date */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Trial End Date (optional)
              </label>
              <Input
                type="date"
                value={selectedModuleConfig.trialEndsAt}
                onChange={(e) =>
                  setSelectedModuleConfig((prev) => ({
                    ...prev,
                    trialEndsAt: e.target.value,
                  }))
                }
              />
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                If set, the module will automatically expire after this date
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowModuleConfigModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={configureModuleMutation.isPending}
              disabled={!selectedModuleConfig.moduleId}
            >
              Save Configuration
            </Button>
          </div>
        </form>
      </Modal>

      {/* Force Delete Modal - Super Admin Only */}
      <Modal
        isOpen={showForceDeleteModal}
        onClose={() => {
          setShowForceDeleteModal(false);
          setForceDeleteConfirmText('');
        }}
        title="Permanently Delete Tenant"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-neutral-700 dark:text-neutral-300 font-medium">
                This action cannot be undone.
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Permanently deleting <strong>{tenant.name}</strong> will
                immediately remove all associated data including users,
                accounts, opportunities, activities, and all other records. This
                bypasses the standard 30-day retention period.
              </p>
            </div>
          </div>

          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">
              Type <strong>{tenant.slug}</strong> to confirm permanent deletion:
            </p>
            <Input
              type="text"
              value={forceDeleteConfirmText}
              onChange={(e) => setForceDeleteConfirmText(e.target.value)}
              placeholder={tenant.slug}
              className="mt-2"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="secondary"
            onClick={() => {
              setShowForceDeleteModal(false);
              setForceDeleteConfirmText('');
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={forceDeleteConfirmText !== tenant.slug}
            isLoading={forceDeleteMutation.isPending}
            onClick={async () => {
              if (!tenantId || forceDeleteConfirmText !== tenant.slug) return;
              try {
                await forceDeleteMutation.mutateAsync({
                  tenantId,
                  confirmSlug: tenant.slug,
                });
                showToast('Tenant permanently deleted', 'success');
                navigate('/admin/tenants');
              } catch (err) {
                showToast(
                  err instanceof Error
                    ? err.message
                    : 'Failed to delete tenant',
                  'error',
                );
              }
            }}
          >
            Permanently Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default TenantDetailPage;
