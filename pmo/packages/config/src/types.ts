/**
 * Module Configuration Types
 *
 * Defines the types for the modular feature system that allows
 * customers to enable/disable specific features of the PMO tool.
 */

/**
 * Available module names in the system
 */
export type ModuleName =
  | 'core'
  | 'tasks'
  | 'clients'
  | 'projects'
  | 'assets'
  | 'marketing'
  | 'sales'
  | 'admin';

/**
 * Sidebar navigation groups
 */
export type SidebarGroup =
  | 'overview'
  | 'clients'
  | 'projects'
  | 'marketing'
  | 'sales'
  | 'admin';

/**
 * User roles that may be required for module access
 */
export type UserRole = 'USER' | 'ADMIN';

/**
 * Configuration preset names
 */
export type PresetName =
  | 'full'
  | 'project-management'
  | 'marketing-focus'
  | 'sales-focus'
  | 'minimal'
  | 'custom';

/**
 * Route configuration for a module
 */
export interface ModuleRoutes {
  /** Frontend routes (React Router paths) */
  frontend: string[];
  /** Backend API routes (Express paths) */
  backend: string[];
}

/**
 * Navigation item for sidebar
 */
export interface NavItem {
  /** Display label */
  label: string;
  /** Route path */
  path: string;
  /** Lucide icon name */
  icon: string;
}

/**
 * Module definition with all metadata
 */
export interface ModuleDefinition {
  /** Unique module identifier */
  name: ModuleName;
  /** Human-readable display name */
  displayName: string;
  /** Description of module functionality */
  description: string;
  /** Whether this module cannot be disabled */
  required: boolean;
  /** Other modules this depends on */
  dependencies: ModuleName[];
  /** Routes this module provides */
  routes: ModuleRoutes;
  /** Sidebar group this module belongs to */
  sidebarGroup?: SidebarGroup;
  /** Navigation items for the sidebar */
  navItems?: NavItem[];
  /** Required user role to access this module */
  roleRequired?: UserRole;
}

/**
 * Customer branding configuration
 */
export interface BrandingConfig {
  /** Custom application name */
  appName?: string;
  /** URL to custom logo */
  logoUrl?: string;
  /** Primary brand color (hex) */
  primaryColor?: string;
}

/**
 * Customer-specific configuration
 */
export interface CustomerConfig {
  /** Unique customer identifier */
  customerId?: string;
  /** Customer display name */
  customerName?: string;
  /** List of enabled modules */
  enabledModules: ModuleName[];
  /** Configuration preset used */
  preset?: PresetName;
  /** Custom branding options */
  branding?: BrandingConfig;
}

/**
 * Configuration preset definition
 */
export interface PresetDefinition {
  /** Preset identifier */
  name: PresetName;
  /** Human-readable display name */
  displayName: string;
  /** Description of what this preset includes */
  description: string;
  /** Modules included in this preset */
  modules: ModuleName[];
}

/**
 * Full application configuration
 */
export interface AppConfig {
  /** Customer-specific settings */
  customer: CustomerConfig;
  /** All available module definitions */
  modules: Record<ModuleName, ModuleDefinition>;
  /** Resolved list of enabled modules (including dependencies) */
  enabledModules: ModuleName[];
}

/**
 * Configuration loader options
 */
export interface ConfigLoaderOptions {
  /** Customer ID to load config for */
  customerId?: string;
  /** Preset to use if no customer config */
  preset?: PresetName;
  /** Explicit list of modules to enable */
  enabledModules?: ModuleName[];
  /** Environment variables override */
  env?: {
    ENABLED_MODULES?: string;
    MODULE_PRESET?: string;
    CUSTOMER_ID?: string;
  };
}

/**
 * Result of checking if a module is enabled
 */
export interface ModuleCheckResult {
  /** Whether the module is enabled */
  enabled: boolean;
  /** Reason if disabled */
  reason?: 'not_configured' | 'missing_dependency' | 'role_required';
  /** Missing dependencies if any */
  missingDependencies?: ModuleName[];
}
