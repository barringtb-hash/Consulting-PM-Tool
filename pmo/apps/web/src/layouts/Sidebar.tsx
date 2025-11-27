import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  FolderKanban,
  FileText,
  Megaphone,
  TrendingUp,
  UserCheck,
  UserCog,
  LucideIcon,
} from 'lucide-react';
import { cn } from '../ui/utils';
import { useModules, type ModuleDefinition } from '../modules';

/**
 * Icon map - maps icon names from module definitions to Lucide components
 */
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  CheckSquare,
  Users,
  FolderKanban,
  FileText,
  Megaphone,
  TrendingUp,
  UserCheck,
  UserCog,
};

/**
 * Get the icon component for a module
 */
function getIcon(iconName: string): LucideIcon {
  return ICON_MAP[iconName] || FileText;
}

export function Sidebar(): JSX.Element {
  const location = useLocation();
  const { navigationItems } = useModules();

  const isActive = (module: ModuleDefinition): boolean => {
    // Check primary path
    if (module.path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }

    if (location.pathname.startsWith(module.path)) {
      return true;
    }

    // Check additional paths
    if (module.additionalPaths) {
      for (const additionalPath of module.additionalPaths) {
        const pattern = additionalPath.replace(/:[\w]+/g, '[^/]+');
        const regex = new RegExp(`^${pattern}`);
        if (regex.test(location.pathname)) {
          return true;
        }
      }
    }

    return false;
  };

  const renderNavSection = (
    items: ModuleDefinition[],
    title?: string,
    isFirst = false,
  ) => {
    if (items.length === 0) return null;

    return (
      <div className={`px-3 space-y-1 ${!isFirst ? 'mt-8' : ''}`}>
        {title && (
          <div className="px-3 mb-2">
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              {title}
            </h3>
          </div>
        )}
        {items.map((module) => {
          const Icon = getIcon(module.icon);
          const active = isActive(module);

          return (
            <Link
              key={module.path}
              to={module.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors no-underline',
                active
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className={cn(
                  'w-5 h-5 flex-shrink-0',
                  active ? 'text-primary-600' : 'text-neutral-500',
                )}
              />
              <span>{module.label}</span>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col w-60 bg-white border-r border-neutral-200 h-full">
      {/* Logo/Brand */}
      <div className="flex items-center h-16 px-6 border-b border-neutral-200">
        <Link to="/dashboard" className="flex items-center gap-2 no-underline">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">AI</span>
          </div>
          <span className="font-semibold text-neutral-900 text-sm">
            Consulting PMO
          </span>
        </Link>
      </div>

      {/* Navigation - dynamically rendered based on enabled modules */}
      <nav className="flex-1 overflow-y-auto py-4">
        {navigationItems.map((group, index) => (
          <React.Fragment key={group.group}>
            {renderNavSection(group.items, group.label, index === 0)}
          </React.Fragment>
        ))}
      </nav>
    </div>
  );
}

export default Sidebar;
