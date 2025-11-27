/**
 * Module Definitions
 *
 * Defines all available modules in the PMO system with their
 * routes, dependencies, and metadata.
 */

import type { ModuleDefinition, ModuleName } from './types';

/**
 * Core module - Always required
 * Provides authentication, dashboard, and base functionality
 */
export const coreModule: ModuleDefinition = {
  name: 'core',
  displayName: 'Core',
  description: 'Authentication, dashboard, and base functionality',
  required: true,
  dependencies: [],
  routes: {
    frontend: ['/', '/dashboard', '/login'],
    backend: ['/api/auth/*', '/api/health'],
  },
  navItems: [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: 'LayoutDashboard',
    },
  ],
};

/**
 * Tasks module - Personal task management
 * Provides Kanban board and task tracking
 */
export const tasksModule: ModuleDefinition = {
  name: 'tasks',
  displayName: 'Task Management',
  description: 'Personal task management with Kanban board',
  required: false,
  dependencies: ['core'],
  routes: {
    frontend: ['/tasks'],
    backend: ['/api/tasks/*'],
  },
  sidebarGroup: 'overview',
  navItems: [
    {
      label: 'My Tasks',
      path: '/tasks',
      icon: 'CheckSquare',
    },
  ],
};

/**
 * Clients module - Client CRM functionality
 * Provides client management with contacts and intake forms
 */
export const clientsModule: ModuleDefinition = {
  name: 'clients',
  displayName: 'Client Management',
  description: 'Client CRM with contacts and intake forms',
  required: false,
  dependencies: ['core'],
  routes: {
    frontend: ['/clients', '/clients/:id', '/client-intake'],
    backend: ['/api/clients/*', '/api/contacts/*'],
  },
  sidebarGroup: 'clients',
  navItems: [
    {
      label: 'Clients',
      path: '/clients',
      icon: 'Users',
    },
  ],
};

/**
 * Projects module - Project management
 * Provides project tracking with milestones, meetings, and documents
 */
export const projectsModule: ModuleDefinition = {
  name: 'projects',
  displayName: 'Project Management',
  description: 'Project tracking with milestones and meetings',
  required: false,
  dependencies: ['core', 'clients'],
  routes: {
    frontend: ['/projects', '/projects/new', '/projects/:id', '/meetings/:id'],
    backend: [
      '/api/projects/*',
      '/api/milestones/*',
      '/api/meetings/*',
      '/api/documents/*',
    ],
  },
  sidebarGroup: 'projects',
  navItems: [
    {
      label: 'Projects',
      path: '/projects',
      icon: 'FolderKanban',
    },
  ],
};

/**
 * Assets module - AI asset library
 * Provides management for AI prompts, workflows, and datasets
 */
export const assetsModule: ModuleDefinition = {
  name: 'assets',
  displayName: 'AI Asset Library',
  description: 'Manage AI prompts, workflows, and datasets',
  required: false,
  dependencies: ['core'],
  routes: {
    frontend: ['/assets'],
    backend: ['/api/assets/*'],
  },
  sidebarGroup: 'projects',
  navItems: [
    {
      label: 'Assets',
      path: '/assets',
      icon: 'FileText',
    },
  ],
};

/**
 * Marketing module - Marketing content management
 * Provides content creation, campaigns, and social publishing
 */
export const marketingModule: ModuleDefinition = {
  name: 'marketing',
  displayName: 'Marketing Content',
  description: 'Content creation, campaigns, and social publishing',
  required: false,
  dependencies: ['core', 'clients'],
  routes: {
    frontend: ['/marketing'],
    backend: [
      '/api/marketing-contents/*',
      '/api/campaigns/*',
      '/api/brand-profiles/*',
      '/api/publishing/*',
    ],
  },
  sidebarGroup: 'marketing',
  navItems: [
    {
      label: 'Marketing',
      path: '/marketing',
      icon: 'Megaphone',
    },
  ],
};

/**
 * Sales module - Sales pipeline management
 * Provides lead management and sales pipeline tracking
 */
export const salesModule: ModuleDefinition = {
  name: 'sales',
  displayName: 'Sales Pipeline',
  description: 'Lead management and sales pipeline tracking',
  required: false,
  dependencies: ['core', 'clients'],
  routes: {
    frontend: ['/sales/leads', '/sales/pipeline'],
    backend: ['/api/leads/*', '/api/public/leads/*'],
  },
  sidebarGroup: 'sales',
  navItems: [
    {
      label: 'Leads',
      path: '/sales/leads',
      icon: 'UserCheck',
    },
    {
      label: 'Pipeline',
      path: '/sales/pipeline',
      icon: 'TrendingUp',
    },
  ],
};

/**
 * Admin module - User administration
 * Provides user management and system administration
 */
export const adminModule: ModuleDefinition = {
  name: 'admin',
  displayName: 'User Administration',
  description: 'User management and system administration',
  required: false,
  dependencies: ['core'],
  routes: {
    frontend: ['/admin/users', '/admin/users/new', '/admin/users/:id'],
    backend: ['/api/users/*'],
  },
  sidebarGroup: 'admin',
  roleRequired: 'ADMIN',
  navItems: [
    {
      label: 'Users',
      path: '/admin/users',
      icon: 'UserCog',
    },
  ],
};

/**
 * All module definitions indexed by name
 */
export const MODULE_DEFINITIONS: Record<ModuleName, ModuleDefinition> = {
  core: coreModule,
  tasks: tasksModule,
  clients: clientsModule,
  projects: projectsModule,
  assets: assetsModule,
  marketing: marketingModule,
  sales: salesModule,
  admin: adminModule,
};

/**
 * List of all module names
 */
export const ALL_MODULES: ModuleName[] = Object.keys(
  MODULE_DEFINITIONS,
) as ModuleName[];

/**
 * Get a module definition by name
 */
export function getModuleDefinition(name: ModuleName): ModuleDefinition {
  return MODULE_DEFINITIONS[name];
}

/**
 * Get all dependencies for a module (including transitive)
 */
export function getModuleDependencies(name: ModuleName): ModuleName[] {
  const visited = new Set<ModuleName>();
  const result: ModuleName[] = [];

  function collect(moduleName: ModuleName): void {
    if (visited.has(moduleName)) return;
    visited.add(moduleName);

    const module = MODULE_DEFINITIONS[moduleName];
    for (const dep of module.dependencies) {
      collect(dep);
      if (!result.includes(dep)) {
        result.push(dep);
      }
    }
  }

  collect(name);
  return result;
}

/**
 * Resolve a list of modules to include all dependencies
 */
export function resolveModulesWithDependencies(
  modules: ModuleName[],
): ModuleName[] {
  const result = new Set<ModuleName>();

  // Always include core
  result.add('core');

  for (const moduleName of modules) {
    // Add the module itself
    result.add(moduleName);

    // Add all its dependencies
    for (const dep of getModuleDependencies(moduleName)) {
      result.add(dep);
    }
  }

  return Array.from(result);
}

/**
 * Check if a module can be enabled given the current enabled modules
 */
export function canEnableModule(
  name: ModuleName,
  enabledModules: ModuleName[],
): { canEnable: boolean; missingDependencies: ModuleName[] } {
  const module = MODULE_DEFINITIONS[name];
  const missingDependencies = module.dependencies.filter(
    (dep) => !enabledModules.includes(dep),
  );

  return {
    canEnable: missingDependencies.length === 0,
    missingDependencies,
  };
}

/**
 * Get sidebar navigation items for enabled modules
 */
export function getEnabledNavItems(
  enabledModules: ModuleName[],
  userRole?: 'USER' | 'ADMIN',
): Array<{
  module: ModuleName;
  sidebarGroup?: string;
  items: Array<{ label: string; path: string; icon: string }>;
}> {
  const result: Array<{
    module: ModuleName;
    sidebarGroup?: string;
    items: Array<{ label: string; path: string; icon: string }>;
  }> = [];

  for (const moduleName of enabledModules) {
    const module = MODULE_DEFINITIONS[moduleName];

    // Skip if role required and user doesn't have it
    if (module.roleRequired && userRole !== module.roleRequired) {
      continue;
    }

    if (module.navItems && module.navItems.length > 0) {
      result.push({
        module: moduleName,
        sidebarGroup: module.sidebarGroup,
        items: module.navItems,
      });
    }
  }

  return result;
}
