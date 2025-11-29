import React, { useEffect, useRef } from 'react';
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
  X,
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

export interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps): JSX.Element {
  const location = useLocation();
  const { navigationItems } = useModules();
  const menuRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const prevPathnameRef = useRef<string>(location.pathname);

  const isActive = (module: ModuleDefinition): boolean => {
    if (module.path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }

    if (location.pathname.startsWith(module.path)) {
      return true;
    }

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

  // Close menu on route change (only when pathname actually changes)
  useEffect(() => {
    if (prevPathnameRef.current !== location.pathname) {
      prevPathnameRef.current = location.pathname;
      onClose();
    }
  }, [location.pathname, onClose]);

  // Focus trap and ESC key handler
  useEffect(() => {
    if (!isOpen) return;

    // Focus the close button when menu opens
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }

      // Simple focus trap
      if (e.key === 'Tab' && menuRef.current) {
        const focusableElements = menuRef.current.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Lock body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return <></>;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-neutral-900/50 z-40 lg:hidden transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={menuRef}
        className={cn(
          'fixed inset-y-0 left-0 w-64 bg-white z-50 lg:hidden',
          'transform transition-transform duration-300 ease-in-out',
          'flex flex-col border-r border-neutral-200',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
      >
        {/* Header - Launchpad Consulting Partners */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-neutral-200">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 no-underline"
          >
            {/* Sunrise Icon */}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-b from-brand-red via-brand-orange to-brand-amber relative overflow-hidden">
              {/* Sun rays */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3.5 h-3.5 bg-brand-yellow rounded-full opacity-90" />
              </div>
              {/* Horizon line */}
              <div className="absolute bottom-1 left-1 right-1 h-0.5 bg-brand-rose rounded" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-primary-600 text-sm leading-tight tracking-tight">
                LAUNCHPAD
              </span>
              <span className="text-[9px] text-neutral-500 tracking-widest">
                CONSULTING
              </span>
            </div>
          </Link>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
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
    </>
  );
}

export default MobileMenu;
