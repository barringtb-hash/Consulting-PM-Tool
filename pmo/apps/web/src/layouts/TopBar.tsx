import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, LogOut, User } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { cn } from '../ui/utils';

export interface TopBarProps {
  onMenuClick: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps): JSX.Element {
  const { user, logout, isLoading } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    setError(null);
    try {
      await logout();
      setIsUserMenuOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to logout';
      setError(message);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  return (
    <header className="flex items-center h-16 px-4 bg-white border-b border-neutral-200 flex-shrink-0">
      {/* Mobile menu button */}
      <button
        type="button"
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-neutral-600 hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Mobile logo - Launchpad Consulting Partners */}
      <div className="lg:hidden flex-1 flex items-center justify-center">
        <Link to="/dashboard" className="flex items-center gap-2 no-underline">
          <img
            src="/favicon.svg"
            alt="Launchpad"
            className="w-8 h-8 flex-shrink-0"
          />
          <div className="flex flex-col">
            <span className="font-bold text-rose-800 text-sm tracking-tight leading-tight">
              Launchpad
            </span>
            <span className="text-xs text-slate-500 tracking-wide leading-tight">
              Consulting Partners
            </span>
          </div>
        </Link>
      </div>

      {/* Spacer for desktop */}
      <div className="hidden lg:block flex-1" />

      {/* User Menu */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsUserMenuOpen((prev) => !prev)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            'hover:bg-neutral-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600',
            isUserMenuOpen && 'bg-neutral-100',
          )}
          aria-expanded={isUserMenuOpen}
          aria-haspopup="true"
        >
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary-700" />
          </div>
          <span className="hidden sm:inline text-neutral-900">
            {user?.name || user?.email || 'Admin'}
          </span>
        </button>

        {/* Dropdown Menu */}
        {isUserMenuOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-50">
            {/* User info */}
            <div className="px-4 py-3 border-b border-neutral-200">
              <p className="text-sm font-medium text-neutral-900">
                {user?.name || 'Admin'}
              </p>
              <p className="text-xs text-neutral-600 mt-1 truncate">
                {user?.email}
              </p>
            </div>

            {/* Logout button */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoading}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-700',
                'hover:bg-neutral-100 transition-colors text-left',
                'disabled:opacity-60 disabled:cursor-not-allowed',
              )}
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>

            {error && (
              <div className="px-4 py-2 text-xs text-danger-600" role="alert">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export default TopBar;
