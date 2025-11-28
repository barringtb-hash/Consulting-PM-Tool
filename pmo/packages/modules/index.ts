/**
 * Module Configuration System
 *
 * This package defines the available modules and their configuration.
 * Modules can be enabled/disabled per customer deployment via environment variables.
 *
 * Usage:
 * - Frontend: import { modules, isModuleEnabled } from '@pmo/modules'
 * - Backend: import { modules, isModuleEnabled } from '@pmo/modules'
 */

/**
 * Module identifiers - used as keys in configuration
 */
export type ModuleId =
  // Core modules (always enabled)
  | 'dashboard'
  | 'tasks'
  | 'clients'
  | 'projects'
  // Toggleable modules
  | 'assets'
  | 'marketing'
  | 'leads'
  | 'pipeline'
  | 'admin';

/**
 * Navigation group identifiers
 */
export type NavGroup =
  | 'overview'
  | 'clients'
  | 'projects'
  | 'marketing'
  | 'sales'
  | 'admin';

/**
 * Module definition with metadata
 */
export interface ModuleDefinition {
  /** Unique module identifier */
  id: ModuleId;
  /** Display name for the module */
  label: string;
  /** Navigation group this module belongs to */
  navGroup: NavGroup;
  /** Primary route path */
  path: string;
  /** Additional routes this module handles */
  additionalPaths?: string[];
  /** Icon name (from lucide-react) */
  icon: string;
  /** Whether this is a core module that cannot be disabled */
  isCore: boolean;
  /** Module dependencies - other modules that must be enabled */
  dependencies?: ModuleId[];
  /** API endpoint prefixes this module uses */
  apiPrefixes?: string[];
  /** Description of the module */
  description: string;
}

/**
 * Complete module definitions
 * This is the source of truth for all modules in the system
 */
export const MODULE_DEFINITIONS: Record<ModuleId, ModuleDefinition> = {
  // ============ CORE MODULES (cannot be disabled) ============
  dashboard: {
    id: 'dashboard',
    label: 'Dashboard',
    navGroup: 'overview',
    path: '/dashboard',
    additionalPaths: ['/'],
    icon: 'LayoutDashboard',
    isCore: true,
    apiPrefixes: [],
    description: 'Main dashboard with overview metrics and quick actions',
  },
  tasks: {
    id: 'tasks',
    label: 'My Tasks',
    navGroup: 'overview',
    path: '/tasks',
    icon: 'CheckSquare',
    isCore: true,
    dependencies: ['projects'],
    apiPrefixes: ['/api/tasks'],
    description: 'Personal task management and tracking',
  },
  clients: {
    id: 'clients',
    label: 'Clients',
    navGroup: 'clients',
    path: '/clients',
    additionalPaths: ['/clients/:clientId', '/client-intake'],
    icon: 'Users',
    isCore: true,
    apiPrefixes: ['/api/clients', '/api/contacts', '/api/documents'],
    description: 'Client management, contacts, and documents',
  },
  projects: {
    id: 'projects',
    label: 'Projects',
    navGroup: 'projects',
    path: '/projects',
    additionalPaths: ['/projects/new', '/projects/:id', '/meetings/:id'],
    icon: 'FolderKanban',
    isCore: true,
    dependencies: ['clients'],
    apiPrefixes: ['/api/projects', '/api/milestones', '/api/meetings'],
    description: 'Project management, milestones, and meetings',
  },

  // ============ TOGGLEABLE MODULES ============
  assets: {
    id: 'assets',
    label: 'Assets',
    navGroup: 'projects',
    path: '/assets',
    icon: 'FileText',
    isCore: false,
    apiPrefixes: ['/api/assets'],
    description: 'AI-generated assets and content library',
  },
  marketing: {
    id: 'marketing',
    label: 'Marketing',
    navGroup: 'marketing',
    path: '/marketing',
    icon: 'Megaphone',
    isCore: false,
    dependencies: ['clients', 'projects'],
    apiPrefixes: [
      '/api/marketing-contents',
      '/api/campaigns',
      '/api/brand-profiles',
      '/api/publishing-connections',
    ],
    description:
      'Marketing content creation, campaigns, and publishing workflows',
  },
  leads: {
    id: 'leads',
    label: 'Leads',
    navGroup: 'sales',
    path: '/sales/leads',
    icon: 'UserCheck',
    isCore: false,
    apiPrefixes: ['/api/leads', '/api/public/leads'],
    description: 'Lead capture and management',
  },
  pipeline: {
    id: 'pipeline',
    label: 'Pipeline',
    navGroup: 'sales',
    path: '/sales/pipeline',
    icon: 'TrendingUp',
    isCore: false,
    dependencies: ['leads'],
    apiPrefixes: [],
    description: 'Sales pipeline visualization and tracking',
  },
  admin: {
    id: 'admin',
    label: 'Admin',
    navGroup: 'admin',
    path: '/admin/users',
    additionalPaths: ['/admin/users/new', '/admin/users/:id', '/admin/modules'],
    icon: 'UserCog',
    isCore: false,
    apiPrefixes: ['/api/users', '/api/admin'],
    description: 'User administration, module configuration, and access control',
  },
};

/**
 * Navigation group display configuration
 */
export const NAV_GROUP_CONFIG: Record<
  NavGroup,
  { label: string; order: number }
> = {
  overview: { label: '', order: 1 }, // No header for overview
  clients: { label: 'Clients', order: 2 },
  projects: { label: 'Projects', order: 3 },
  marketing: { label: 'Marketing', order: 4 },
  sales: { label: 'Sales', order: 5 },
  admin: { label: 'Admin', order: 6 },
};

/**
 * Default enabled modules (all enabled by default)
 */
export const DEFAULT_ENABLED_MODULES: ModuleId[] = [
  'dashboard',
  'tasks',
  'clients',
  'projects',
  'assets',
  'marketing',
  'leads',
  'pipeline',
  'admin',
];

/**
 * Parse enabled modules from environment variable or configuration
 *
 * @param enabledModulesString - Comma-separated list of module IDs, or undefined for defaults
 * @returns Array of enabled module IDs
 */
export function parseEnabledModules(
  enabledModulesString: string | undefined,
): ModuleId[] {
  if (!enabledModulesString) {
    return DEFAULT_ENABLED_MODULES;
  }

  const requestedModules = enabledModulesString
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0) as ModuleId[];

  // Always include core modules
  const coreModules = Object.values(MODULE_DEFINITIONS)
    .filter((m) => m.isCore)
    .map((m) => m.id);

  // Combine core modules with requested modules
  const enabledSet = new Set([...coreModules, ...requestedModules]);

  // Validate that all requested modules exist
  for (const moduleId of requestedModules) {
    if (!MODULE_DEFINITIONS[moduleId]) {
      console.warn(`Unknown module "${moduleId}" in configuration, ignoring.`);
      enabledSet.delete(moduleId);
    }
  }

  // Ensure dependencies are enabled
  for (const moduleId of enabledSet) {
    const module = MODULE_DEFINITIONS[moduleId];
    if (module?.dependencies) {
      for (const dep of module.dependencies) {
        if (!enabledSet.has(dep)) {
          console.warn(
            `Module "${moduleId}" requires "${dep}" - enabling automatically.`,
          );
          enabledSet.add(dep);
        }
      }
    }
  }

  return Array.from(enabledSet);
}

/**
 * Check if a module is enabled
 *
 * @param moduleId - The module to check
 * @param enabledModules - Array of enabled module IDs
 * @returns true if the module is enabled
 */
export function isModuleEnabled(
  moduleId: ModuleId,
  enabledModules: ModuleId[],
): boolean {
  return enabledModules.includes(moduleId);
}

/**
 * Get all enabled module definitions
 *
 * @param enabledModules - Array of enabled module IDs
 * @returns Array of enabled module definitions
 */
export function getEnabledModuleDefinitions(
  enabledModules: ModuleId[],
): ModuleDefinition[] {
  return enabledModules
    .map((id) => MODULE_DEFINITIONS[id])
    .filter((m): m is ModuleDefinition => m !== undefined);
}

/**
 * Get navigation items grouped by nav group, only for enabled modules
 *
 * @param enabledModules - Array of enabled module IDs
 * @returns Navigation items grouped by nav group, sorted by group order
 */
export function getNavigationItems(enabledModules: ModuleId[]): Array<{
  group: NavGroup;
  label: string;
  items: ModuleDefinition[];
}> {
  const enabledDefs = getEnabledModuleDefinitions(enabledModules);

  // Group by navGroup
  const grouped = new Map<NavGroup, ModuleDefinition[]>();

  for (const module of enabledDefs) {
    const existing = grouped.get(module.navGroup) || [];
    existing.push(module);
    grouped.set(module.navGroup, existing);
  }

  // Convert to array and sort by group order
  return Array.from(grouped.entries())
    .map(([group, items]) => ({
      group,
      label: NAV_GROUP_CONFIG[group].label,
      items,
    }))
    .sort(
      (a, b) =>
        NAV_GROUP_CONFIG[a.group].order - NAV_GROUP_CONFIG[b.group].order,
    );
}

/**
 * Check if a route path should be accessible based on enabled modules
 *
 * @param path - The route path to check
 * @param enabledModules - Array of enabled module IDs
 * @returns true if the route is accessible
 */
export function isRouteAccessible(
  path: string,
  enabledModules: ModuleId[],
): boolean {
  const enabledDefs = getEnabledModuleDefinitions(enabledModules);

  for (const module of enabledDefs) {
    // Check primary path
    if (pathMatches(path, module.path)) {
      return true;
    }

    // Check additional paths
    if (module.additionalPaths) {
      for (const additionalPath of module.additionalPaths) {
        if (pathMatches(path, additionalPath)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Simple path matching that handles route parameters
 */
function pathMatches(actualPath: string, pattern: string): boolean {
  // Convert pattern with :params to regex
  const regexPattern = pattern.replace(/:[\w]+/g, '[^/]+');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(actualPath);
}

/**
 * Check if an API endpoint should be accessible based on enabled modules
 *
 * @param endpoint - The API endpoint path
 * @param enabledModules - Array of enabled module IDs
 * @returns true if the endpoint is accessible
 */
export function isApiEndpointAccessible(
  endpoint: string,
  enabledModules: ModuleId[],
): boolean {
  const enabledDefs = getEnabledModuleDefinitions(enabledModules);

  // Collect all enabled API prefixes
  const enabledPrefixes = enabledDefs.flatMap((m) => m.apiPrefixes || []);

  // If no prefixes configured for enabled modules, allow all
  // (this handles auth endpoints, health checks, etc.)
  if (enabledPrefixes.length === 0) {
    return true;
  }

  // Check if endpoint starts with any enabled prefix
  for (const prefix of enabledPrefixes) {
    if (endpoint.startsWith(prefix)) {
      return true;
    }
  }

  // Also allow common endpoints that don't belong to specific modules
  const commonPrefixes = ['/api/auth', '/api/login', '/api/logout', '/health'];
  for (const prefix of commonPrefixes) {
    if (endpoint.startsWith(prefix)) {
      return true;
    }
  }

  return false;
}
