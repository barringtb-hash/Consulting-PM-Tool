/**
 * Tenant Switcher Component
 *
 * Allows users who belong to multiple tenants to switch between them.
 * Displays in the sidebar header with a dropdown for selecting workspaces.
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Building2, Check, Loader2 } from 'lucide-react';
import { buildApiUrl } from '../api/config';
import { buildOptions, handleResponse } from '../api/http';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  role: string;
  logoUrl?: string;
  primaryColor?: string;
}

interface TenantSwitcherProps {
  currentTenantId?: string;
}

export function TenantSwitcher({ currentTenantId }: TenantSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch user's tenants
  const {
    data: tenants = [],
    isLoading,
    error,
  } = useQuery<Tenant[]>({
    queryKey: ['my-tenants'],
    queryFn: async () => {
      const res = await fetch(buildApiUrl('/tenants/my'), buildOptions());
      const data = await handleResponse<{ data: Tenant[] }>(res);
      return data.data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Switch tenant mutation
  const switchMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      const res = await fetch(
        buildApiUrl(`/tenants/switch/${tenantId}`),
        buildOptions({ method: 'POST' }),
      );
      const data = await handleResponse<{
        data: { tenant: Tenant; role: string };
      }>(res);
      return data.data;
    },
    onSuccess: (data) => {
      // Store the new tenant context
      const newSlug = data.tenant.slug;

      // Check if we're using subdomains
      const currentHost = window.location.host;
      const hostParts = currentHost.split('.');

      if (hostParts.length > 2 && !currentHost.includes('localhost')) {
        // Using subdomains - redirect to new tenant subdomain
        const baseDomain = hostParts.slice(-2).join('.');
        window.location.href = `${window.location.protocol}//${newSlug}.${baseDomain}`;
      } else {
        // Single-domain mode - store tenant and refresh
        localStorage.setItem('currentTenantId', data.tenant.id);
        localStorage.setItem('currentTenantSlug', data.tenant.slug);

        // Clear all cached data and reload
        queryClient.clear();
        window.location.reload();
      }
    },
    onError: (error: Error) => {
      console.error('Failed to switch tenant:', error);
      // Could show a toast notification here
    },
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentTenant =
    tenants.find((t) => t.id === currentTenantId) || tenants[0];

  // Error state
  if (error) {
    return null; // Silently fail - don't break the UI
  }

  // Loading state - show current tenant name if available
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  // Don't show switcher if user only has one tenant
  if (tenants.length <= 1) {
    return currentTenant ? (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700">
        {currentTenant.logoUrl ? (
          <img
            src={currentTenant.logoUrl}
            alt=""
            className="h-5 w-5 rounded object-cover"
          />
        ) : (
          <Building2 className="h-4 w-4" />
        )}
        <span className="max-w-[150px] truncate font-medium">
          {currentTenant.name}
        </span>
      </div>
    ) : null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switchMutation.isPending}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-50"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {currentTenant?.logoUrl ? (
          <img
            src={currentTenant.logoUrl}
            alt=""
            className="h-5 w-5 rounded object-cover"
          />
        ) : (
          <div
            className="flex h-5 w-5 items-center justify-center rounded text-xs font-medium text-white"
            style={{
              backgroundColor: currentTenant?.primaryColor || '#3B82F6',
            }}
          >
            {currentTenant?.name.charAt(0).toUpperCase() || 'W'}
          </div>
        )}
        <span className="max-w-[130px] flex-1 truncate text-left font-medium">
          {currentTenant?.name || 'Select Workspace'}
        </span>
        {switchMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-1 w-64 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 py-1 shadow-lg">
          <div className="border-b border-neutral-100 dark:border-neutral-700 px-3 py-2 text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Your Workspaces
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {tenants.map((tenant) => {
              const isActive =
                tenant.id === currentTenantId ||
                tenant.id === currentTenant?.id;
              return (
                <button
                  key={tenant.id}
                  onClick={() => {
                    if (!isActive) {
                      switchMutation.mutate(tenant.id);
                    }
                    setIsOpen(false);
                  }}
                  disabled={switchMutation.isPending}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-700 disabled:opacity-50 ${
                    isActive ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                  }`}
                  role="option"
                  aria-selected={isActive}
                >
                  {tenant.logoUrl ? (
                    <img
                      src={tenant.logoUrl}
                      alt=""
                      className="h-8 w-8 rounded object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded font-medium text-white"
                      style={{
                        backgroundColor: tenant.primaryColor || '#3B82F6',
                      }}
                    >
                      {tenant.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 text-left">
                    <div className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                      {tenant.name}
                    </div>
                    <div className="text-xs capitalize text-neutral-500 dark:text-neutral-400">
                      {tenant.role.toLowerCase()} &middot;{' '}
                      {tenant.plan.toLowerCase()}
                    </div>
                  </div>
                  {isActive && (
                    <Check className="h-4 w-4 flex-shrink-0 text-blue-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default TenantSwitcher;
