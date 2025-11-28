import React, { useMemo } from 'react';
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
} from 'lucide-react';
import { cn } from '../ui/utils';
import { useFeatures, type FeatureFlags } from '../features';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: 'overview' | 'clients' | 'projects' | 'marketing' | 'sales' | 'admin';
  /** Feature flag that must be enabled for this item to show */
  feature?: keyof FeatureFlags;
}

/**
 * All navigation items with their feature flag requirements.
 * Items without a 'feature' property are always shown (core features).
 */
const allNavItems: NavItem[] = [
  // Core features (always enabled)
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    group: 'overview',
  },
  {
    label: 'My Tasks',
    path: '/tasks',
    icon: CheckSquare,
    group: 'overview',
  },
  {
    label: 'Clients',
    path: '/clients',
    icon: Users,
    group: 'clients',
  },
  {
    label: 'Projects',
    path: '/projects',
    icon: FolderKanban,
    group: 'projects',
  },

  // Feature-gated items
  {
    label: 'Assets',
    path: '/assets',
    icon: FileText,
    group: 'projects',
    feature: 'aiAssets',
  },
  {
    label: 'Marketing',
    path: '/marketing',
    icon: Megaphone,
    group: 'marketing',
    feature: 'marketing',
  },
  {
    label: 'Leads',
    path: '/sales/leads',
    icon: UserCheck,
    group: 'sales',
    feature: 'sales',
  },
  {
    label: 'Pipeline',
    path: '/sales/pipeline',
    icon: TrendingUp,
    group: 'sales',
    feature: 'sales',
  },
  {
    label: 'Users',
    path: '/admin/users',
    icon: UserCog,
    group: 'admin',
    feature: 'admin',
  },
];

export function Sidebar(): JSX.Element {
  const location = useLocation();
  const { isFeatureEnabled } = useFeatures();

  // Filter nav items based on enabled features
  const navItems = useMemo(() => {
    return allNavItems.filter((item) => {
      // Items without a feature requirement are always shown
      if (!item.feature) return true;
      // Check if the required feature is enabled
      return isFeatureEnabled(item.feature);
    });
  }, [isFeatureEnabled]);

  const isActive = (path: string): boolean => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const overviewNavItems = navItems.filter((item) => item.group === 'overview');
  const clientsNavItems = navItems.filter((item) => item.group === 'clients');
  const projectsNavItems = navItems.filter((item) => item.group === 'projects');
  const marketingNavItems = navItems.filter(
    (item) => item.group === 'marketing',
  );
  const salesNavItems = navItems.filter((item) => item.group === 'sales');
  const adminNavItems = navItems.filter((item) => item.group === 'admin');

  const renderNavSection = (
    items: NavItem[],
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
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
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
              <span>{item.label}</span>
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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {renderNavSection(overviewNavItems, undefined, true)}
        {renderNavSection(clientsNavItems, 'Clients')}
        {renderNavSection(projectsNavItems, 'Projects')}
        {renderNavSection(marketingNavItems, 'Marketing')}
        {renderNavSection(salesNavItems, 'Sales')}
        {renderNavSection(adminNavItems, 'Admin')}
      </nav>
    </div>
  );
}

export default Sidebar;
