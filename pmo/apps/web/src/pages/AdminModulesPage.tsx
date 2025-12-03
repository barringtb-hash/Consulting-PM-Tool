/**
 * Admin Modules Page
 *
 * Admin interface for managing module configuration per tenant.
 * Allows enabling/disabling modules for different customer deployments.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Settings,
  Check,
  X,
  Plus,
  RefreshCw,
  AlertCircle,
  Lock,
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
} from '../ui';
import {
  getAllTenants,
  getTenantModuleConfig,
  bulkSetTenantModules,
  getModules,
  type ModuleInfo,
  type TenantModuleConfigResponse,
} from '../api/modules';

interface TenantConfig {
  tenantId: string;
  config: TenantModuleConfigResponse | null;
  loading: boolean;
  error: string | null;
}

export function AdminModulesPage() {
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [tenants, setTenants] = useState<string[]>([]);
  const [tenantConfigs, setTenantConfigs] = useState<
    Record<string, TenantConfig>
  >({});
  const [selectedTenant, setSelectedTenant] = useState<string>('default');
  const [newTenantId, setNewTenantId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [modulesData, tenantsData] = await Promise.all([
        getModules(),
        getAllTenants(),
      ]);

      setModules(modulesData.modules);

      // Ensure 'default' is always in the list
      const allTenants = tenantsData.tenants.includes('default')
        ? tenantsData.tenants
        : ['default', ...tenantsData.tenants];
      setTenants(allTenants);

      // Load config for default tenant
      const defaultConfig = await getTenantModuleConfig('default');
      setTenantConfigs({
        default: {
          tenantId: 'default',
          config: defaultConfig,
          loading: false,
          error: null,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load tenant config when selected
  const loadTenantConfig = async (tenantId: string) => {
    if (tenantConfigs[tenantId]?.config) {
      return; // Already loaded
    }

    setTenantConfigs((prev) => ({
      ...prev,
      [tenantId]: {
        tenantId,
        config: null,
        loading: true,
        error: null,
      },
    }));

    try {
      const config = await getTenantModuleConfig(tenantId);
      setTenantConfigs((prev) => ({
        ...prev,
        [tenantId]: {
          tenantId,
          config,
          loading: false,
          error: null,
        },
      }));
    } catch (err) {
      setTenantConfigs((prev) => ({
        ...prev,
        [tenantId]: {
          tenantId,
          config: null,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load config',
        },
      }));
    }
  };

  // Handle tenant selection
  const handleTenantSelect = async (tenantId: string) => {
    setSelectedTenant(tenantId);
    setSuccessMessage(null);
    await loadTenantConfig(tenantId);
  };

  // Add new tenant
  const handleAddTenant = async () => {
    if (!newTenantId.trim()) {
      return;
    }

    const tenantId = newTenantId.trim().toLowerCase().replace(/\s+/g, '-');

    if (tenants.includes(tenantId)) {
      setError(`Tenant "${tenantId}" already exists`);
      return;
    }

    setTenants((prev) => [...prev, tenantId]);
    setNewTenantId('');
    await handleTenantSelect(tenantId);
  };

  // Toggle module for selected tenant
  const handleToggleModule = async (moduleId: string) => {
    const currentConfig = tenantConfigs[selectedTenant]?.config;
    if (!currentConfig) return;

    const currentModules = currentConfig.modules;
    const moduleConfig = currentModules.find((m) => m.moduleId === moduleId);

    if (moduleConfig?.isCore) {
      return; // Cannot toggle core modules
    }

    const newEnabledModules = currentModules
      .filter((m) => {
        if (m.moduleId === moduleId) {
          return !m.enabled;
        }
        return m.enabled;
      })
      .map((m) => m.moduleId);

    try {
      setSaving(true);
      setError(null);

      await bulkSetTenantModules({
        tenantId: selectedTenant,
        enabledModules: newEnabledModules,
      });

      // Reload the config
      const updatedConfig = await getTenantModuleConfig(selectedTenant);
      setTenantConfigs((prev) => ({
        ...prev,
        [selectedTenant]: {
          ...prev[selectedTenant],
          config: updatedConfig,
        },
      }));

      setSuccessMessage('Module configuration updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update module');
    } finally {
      setSaving(false);
    }
  };

  // Get current module config for display
  const currentConfig = tenantConfigs[selectedTenant]?.config;
  const currentModules = currentConfig?.modules || [];

  // Group modules by nav group
  const groupedModules = modules.reduce(
    (acc, module) => {
      const group = module.navGroup;
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(module);
      return acc;
    },
    {} as Record<string, ModuleInfo[]>,
  );

  const getModuleEnabled = (moduleId: string): boolean => {
    const moduleConfig = currentModules.find((m) => m.moduleId === moduleId);
    return moduleConfig?.enabled ?? true;
  };

  const isModuleCore = (moduleId: string): boolean => {
    const module = modules.find((m) => m.id === moduleId);
    return module?.isCore ?? false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Module Management"
        description="Configure which modules are enabled for each tenant/deployment."
      />

      <Section>
        <Container>
          {error && (
            <div
              className="mb-6 p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg text-danger-800 dark:text-danger-200 flex items-center gap-2"
              role="alert"
            >
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg text-success-800 dark:text-success-200 flex items-center gap-2">
              <Check className="w-5 h-5" />
              {successMessage}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Tenant Selector */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Tenants
                </CardTitle>
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  {tenants.map((tenantId) => (
                    <button
                      key={tenantId}
                      onClick={() => handleTenantSelect(tenantId)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedTenant === tenantId
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200 font-medium'
                          : 'hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      {tenantId === 'default' ? 'Default (All)' : tenantId}
                    </button>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTenantId}
                      onChange={(e) => setNewTenantId(e.target.value)}
                      placeholder="New tenant ID"
                      className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900/50 text-neutral-900 dark:text-neutral-100 rounded-lg text-sm placeholder:text-neutral-500 dark:placeholder:text-neutral-400"
                    />
                    <Button
                      size="sm"
                      onClick={handleAddTenant}
                      disabled={!newTenantId.trim()}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Module Configuration */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>
                  Modules for:{' '}
                  {selectedTenant === 'default'
                    ? 'Default Configuration'
                    : selectedTenant}
                </CardTitle>
                {currentConfig && (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    Configuration source:{' '}
                    <span className="font-medium">{currentConfig.source}</span>
                  </p>
                )}
              </CardHeader>
              <CardBody>
                {tenantConfigs[selectedTenant]?.loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 animate-spin text-primary-600" />
                  </div>
                ) : tenantConfigs[selectedTenant]?.error ? (
                  <div className="text-danger-600 dark:text-danger-400 py-4">
                    {tenantConfigs[selectedTenant].error}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedModules).map(
                      ([group, groupModules]) => (
                        <div key={group}>
                          <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
                            {group || 'Overview'}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {groupModules.map((module) => {
                              const isEnabled = getModuleEnabled(module.id);
                              const isCore = isModuleCore(module.id);

                              return (
                                <div
                                  key={module.id}
                                  className={`flex items-center justify-between p-4 rounded-lg border ${
                                    isEnabled
                                      ? 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800'
                                      : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
                                  }`}
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-neutral-800 dark:text-neutral-200">
                                        {module.label}
                                      </span>
                                      {isCore && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded">
                                          <Lock className="w-3 h-3" />
                                          Core
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                                      {module.description}
                                    </p>
                                    {module.dependencies.length > 0 && (
                                      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                                        Requires:{' '}
                                        {module.dependencies.join(', ')}
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    onClick={() =>
                                      handleToggleModule(module.id)
                                    }
                                    disabled={isCore || saving}
                                    className={`ml-4 p-2 rounded-lg transition-colors ${
                                      isCore
                                        ? 'text-neutral-400 dark:text-neutral-600 cursor-not-allowed'
                                        : isEnabled
                                          ? 'bg-success-600 text-white hover:bg-success-700'
                                          : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-400 dark:hover:bg-neutral-600'
                                    }`}
                                    title={
                                      isCore
                                        ? 'Core modules cannot be disabled'
                                        : isEnabled
                                          ? 'Click to disable'
                                          : 'Click to enable'
                                    }
                                  >
                                    {isEnabled ? (
                                      <Check className="w-5 h-5" />
                                    ) : (
                                      <X className="w-5 h-5" />
                                    )}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Instructions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>How Module Configuration Works</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="prose prose-sm max-w-none">
                <ul className="space-y-2 text-neutral-600 dark:text-neutral-400">
                  <li>
                    <strong className="text-neutral-900 dark:text-neutral-100">
                      Default Configuration:
                    </strong>{' '}
                    Used when no tenant-specific configuration exists. Set via{' '}
                    <code className="bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 rounded">
                      ENABLED_MODULES
                    </code>{' '}
                    environment variable.
                  </li>
                  <li>
                    <strong className="text-neutral-900 dark:text-neutral-100">
                      Tenant-Specific:
                    </strong>{' '}
                    Override modules for specific customers/deployments. Changes
                    are saved to the database and take effect immediately.
                  </li>
                  <li>
                    <strong className="text-neutral-900 dark:text-neutral-100">
                      Core Modules:
                    </strong>{' '}
                    Dashboard, Tasks, Clients, and Projects cannot be disabled.
                    They are required for the platform to function.
                  </li>
                  <li>
                    <strong className="text-neutral-900 dark:text-neutral-100">
                      Dependencies:
                    </strong>{' '}
                    Some modules require others. When you enable a module, its
                    dependencies are automatically enabled.
                  </li>
                </ul>
              </div>
            </CardBody>
          </Card>
        </Container>
      </Section>
    </div>
  );
}

export default AdminModulesPage;
