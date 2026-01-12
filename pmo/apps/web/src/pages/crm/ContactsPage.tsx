/**
 * CRM Contacts Page
 *
 * Displays a list of CRM contacts with filtering and basic CRUD operations.
 * Features:
 * - Stats cards with icons and colored accents
 * - Professional table layout with hover states
 * - Initials-based colored avatars
 * - Dropdown action menu
 * - Skeleton loading states
 * - Responsive design
 */

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Plus,
  Search,
  Mail,
  Phone,
  Building2,
  Users,
  UserPlus,
  Crown,
  TrendingUp,
  MoreVertical,
  Pencil,
  Trash2,
  UserX,
} from 'lucide-react';

import {
  useCRMContacts,
  useCRMContactStats,
  useDeleteCRMContact,
  type ContactLifecycle,
} from '../../api/hooks/crm';
import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Input } from '../../ui/Input';
import { PageHeader } from '../../ui/PageHeader';
import { Select } from '../../ui/Select';
import { useToast } from '../../ui/Toast';
import { EMPTY_STATES } from '../../utils/typography';

interface Filters {
  search: string;
  lifecycle: ContactLifecycle | '';
  accountId: string;
}

// Avatar color palette based on initials
const AVATAR_COLORS = [
  {
    bg: 'bg-blue-100 dark:bg-blue-900/50',
    text: 'text-blue-700 dark:text-blue-300',
  },
  {
    bg: 'bg-emerald-100 dark:bg-emerald-900/50',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    bg: 'bg-violet-100 dark:bg-violet-900/50',
    text: 'text-violet-700 dark:text-violet-300',
  },
  {
    bg: 'bg-amber-100 dark:bg-amber-900/50',
    text: 'text-amber-700 dark:text-amber-300',
  },
  {
    bg: 'bg-rose-100 dark:bg-rose-900/50',
    text: 'text-rose-700 dark:text-rose-300',
  },
  {
    bg: 'bg-cyan-100 dark:bg-cyan-900/50',
    text: 'text-cyan-700 dark:text-cyan-300',
  },
  {
    bg: 'bg-orange-100 dark:bg-orange-900/50',
    text: 'text-orange-700 dark:text-orange-300',
  },
  {
    bg: 'bg-indigo-100 dark:bg-indigo-900/50',
    text: 'text-indigo-700 dark:text-indigo-300',
  },
];

function getAvatarColor(name: string): { bg: string; text: string } {
  // Generate a consistent color based on the name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitials(firstName: string, lastName: string): string {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return first + last || '?';
}

function getLifecycleVariant(
  lifecycle: ContactLifecycle,
): 'default' | 'success' | 'warning' | 'destructive' {
  switch (lifecycle) {
    case 'CUSTOMER':
    case 'EVANGELIST':
      return 'success';
    case 'LEAD':
    case 'MQL':
      return 'default';
    case 'SQL':
    case 'OPPORTUNITY':
      return 'warning';
    case 'CHURNED':
      return 'destructive';
    default:
      return 'default';
  }
}

function formatLifecycle(lifecycle: ContactLifecycle): string {
  switch (lifecycle) {
    case 'MQL':
      return 'MQL';
    case 'SQL':
      return 'SQL';
    default:
      return lifecycle.charAt(0) + lifecycle.slice(1).toLowerCase();
  }
}

// Skeleton loader for stats cards
function StatCardSkeleton(): JSX.Element {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
        <div className="flex-1">
          <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
          <div className="h-6 w-12 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>
      </div>
    </Card>
  );
}

// Skeleton loader for table rows
function TableRowSkeleton(): JSX.Element {
  return (
    <tr className="border-b border-neutral-200 dark:border-neutral-700">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
          <div>
            <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
            <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-4 py-4 hidden sm:table-cell">
        <div className="h-4 w-48 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
      <td className="px-4 py-4 hidden md:table-cell">
        <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
      <td className="px-4 py-4">
        <div className="h-8 w-8 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
      </td>
    </tr>
  );
}

// Dropdown menu component
interface ActionMenuProps {
  onEdit: () => void;
  onDelete: () => void;
}

function ActionMenu({ onEdit, onDelete }: ActionMenuProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        aria-label="Open actions menu"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onEdit();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onDelete();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// Contact avatar component
interface ContactAvatarProps {
  firstName: string;
  lastName: string;
  size?: 'sm' | 'md' | 'lg';
}

function ContactAvatar({
  firstName,
  lastName,
  size = 'md',
}: ContactAvatarProps): JSX.Element {
  const initials = getInitials(firstName, lastName);
  const colors = getAvatarColor(`${firstName}${lastName}`);

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  return (
    <div
      className={`flex items-center justify-center rounded-full font-semibold ${sizeClasses[size]} ${colors.bg} ${colors.text}`}
    >
      {initials}
    </div>
  );
}

// Stats card component with icon
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  iconBg: string;
  iconColor: string;
}

function StatCard({
  icon,
  label,
  value,
  iconBg,
  iconColor,
}: StatCardProps): JSX.Element {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-lg ${iconBg}`}
        >
          <div className={iconColor}>{icon}</div>
        </div>
        <div>
          <div className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
            {label}
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
            {value}
          </div>
        </div>
      </div>
    </Card>
  );
}

// Empty state component
function EmptyState({
  hasFilters,
  onAddContact,
}: {
  hasFilters: boolean;
  onAddContact: () => void;
}): JSX.Element {
  return (
    <Card className="p-12">
      <div className="flex flex-col items-center text-center max-w-md mx-auto">
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-4">
          {hasFilters ? (
            <Search className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
          ) : (
            <UserX className="h-8 w-8 text-neutral-400 dark:text-neutral-500" />
          )}
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
          {hasFilters ? 'No matching contacts' : 'No contacts yet'}
        </h3>
        <p className="text-neutral-500 dark:text-neutral-400 mb-6">
          {hasFilters
            ? 'Try adjusting your search or filter criteria to find what you are looking for.'
            : EMPTY_STATES.noContacts +
              ' Get started by adding your first contact to build your CRM.'}
        </p>
        {!hasFilters && (
          <Button onClick={onAddContact}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Contact
          </Button>
        )}
      </div>
    </Card>
  );
}

function ContactsPage(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  // Initialize accountId from URL query param
  const initialAccountId = searchParams.get('accountId') || '';

  const [filters, setFilters] = useState<Filters>({
    search: '',
    lifecycle: '',
    accountId: initialAccountId,
  });

  // Sync accountId filter when URL param changes
  useEffect(() => {
    const urlAccountId = searchParams.get('accountId') || '';
    if (urlAccountId !== filters.accountId) {
      setFilters((prev) => ({ ...prev, accountId: urlAccountId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const deleteContact = useDeleteCRMContact();

  const filterParams = useMemo(
    () => ({
      search: filters.search || undefined,
      lifecycle: filters.lifecycle || undefined,
      accountId: filters.accountId ? Number(filters.accountId) : undefined,
    }),
    [filters.search, filters.lifecycle, filters.accountId],
  );

  const contactsQuery = useCRMContacts(filterParams);
  const statsQuery = useCRMContactStats();

  useRedirectOnUnauthorized(contactsQuery.error);

  const contacts = useMemo(
    () => contactsQuery.data?.contacts ?? [],
    [contactsQuery.data],
  );
  const stats = statsQuery.data;

  const hasFilters = Boolean(filters.search || filters.lifecycle);

  const handleDeleteContact = async (id: number): Promise<void> => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      await deleteContact.mutateAsync(id);
      showToast({
        message: 'Contact deleted successfully',
        variant: 'success',
      });
    } catch (error) {
      showToast({
        message:
          error instanceof Error ? error.message : 'Failed to delete contact',
        variant: 'destructive',
      });
    }
  };

  const handleEditContact = (id: number): void => {
    navigate(`/crm/contacts/${id}/edit`);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="Contacts"
        description="Manage your CRM contacts"
        action={
          <Button onClick={() => navigate('/crm/contacts/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Contact
          </Button>
        }
      />

      <div className="page-content space-y-6">
        {/* Account Filter Banner */}
        {filters.accountId && (
          <Card className="p-3 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Building2 className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Showing contacts for a specific account
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilters((prev) => ({ ...prev, accountId: '' }));
                  navigate('/crm/contacts');
                }}
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                Clear filter
              </Button>
            </div>
          </Card>
        )}

        {/* Stats Cards */}
        {statsQuery.isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={<Users className="h-5 w-5" />}
              label="Total Contacts"
              value={stats.total}
              iconBg="bg-blue-100 dark:bg-blue-900/50"
              iconColor="text-blue-600 dark:text-blue-400"
            />
            <StatCard
              icon={<UserPlus className="h-5 w-5" />}
              label="New This Month"
              value={stats.recentContacts}
              iconBg="bg-emerald-100 dark:bg-emerald-900/50"
              iconColor="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              icon={<Crown className="h-5 w-5" />}
              label="Customers"
              value={
                stats.byLifecycle.find((l) => l.lifecycle === 'CUSTOMER')
                  ?.count ?? 0
              }
              iconBg="bg-amber-100 dark:bg-amber-900/50"
              iconColor="text-amber-600 dark:text-amber-400"
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Leads"
              value={
                stats.byLifecycle.find((l) => l.lifecycle === 'LEAD')?.count ??
                0
              }
              iconBg="bg-violet-100 dark:bg-violet-900/50"
              iconColor="text-violet-600 dark:text-violet-400"
            />
          </div>
        ) : null}

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 dark:text-neutral-500" />
              <Input
                type="text"
                placeholder="Search by name, email, or company..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="pl-10"
              />
            </div>
            <Select
              value={filters.lifecycle}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  lifecycle: e.target.value as ContactLifecycle | '',
                }))
              }
              className="w-full sm:w-44"
            >
              <option value="">All Stages</option>
              <option value="LEAD">Lead</option>
              <option value="MQL">MQL</option>
              <option value="SQL">SQL</option>
              <option value="OPPORTUNITY">Opportunity</option>
              <option value="CUSTOMER">Customer</option>
              <option value="EVANGELIST">Evangelist</option>
              <option value="CHURNED">Churned</option>
            </Select>
          </div>
        </Card>

        {/* Contacts Table */}
        {contactsQuery.isLoading ? (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(5)].map((_, i) => (
                    <TableRowSkeleton key={i} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : contacts.length === 0 ? (
          <EmptyState
            hasFilters={hasFilters}
            onAddContact={() => navigate('/crm/contacts/new')}
          />
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {contacts.map((contact) => (
                    <tr
                      key={contact.id}
                      onClick={() => navigate(`/crm/contacts/${contact.id}`)}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors group"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <ContactAvatar
                            firstName={contact.firstName}
                            lastName={contact.lastName}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                {contact.firstName} {contact.lastName}
                              </span>
                              {contact.isPrimary && (
                                <Badge variant="warning" size="sm">
                                  Primary
                                </Badge>
                              )}
                              <Badge
                                variant={getLifecycleVariant(contact.lifecycle)}
                                size="sm"
                              >
                                {formatLifecycle(contact.lifecycle)}
                              </Badge>
                            </div>
                            <div className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                              {contact.jobTitle && (
                                <span>{contact.jobTitle}</span>
                              )}
                              {contact.jobTitle && contact.account && (
                                <span className="mx-1">at</span>
                              )}
                              {contact.account && (
                                <span className="inline-flex items-center gap-1">
                                  <Building2 className="h-3 w-3 inline" />
                                  {contact.account.name}
                                </span>
                              )}
                              {!contact.jobTitle && !contact.account && (
                                <span className="text-neutral-400 dark:text-neutral-500">
                                  No company info
                                </span>
                              )}
                            </div>
                            {/* Show email on mobile */}
                            {contact.email && (
                              <div className="sm:hidden text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1 mt-1">
                                <Mail className="h-3 w-3" />
                                <span className="truncate">
                                  {contact.email}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        {contact.email ? (
                          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                            <Mail className="h-4 w-4 text-neutral-400" />
                            <span className="truncate max-w-[200px]">
                              {contact.email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-neutral-400 dark:text-neutral-500">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        {contact.phone ? (
                          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                            <Phone className="h-4 w-4 text-neutral-400" />
                            <span>{contact.phone}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-neutral-400 dark:text-neutral-500">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <ActionMenu
                          onEdit={() => handleEditContact(contact.id)}
                          onDelete={() => handleDeleteContact(contact.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Results count footer */}
            <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800/30 border-t border-neutral-200 dark:border-neutral-700">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Showing{' '}
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  {contacts.length}
                </span>{' '}
                contact{contacts.length !== 1 ? 's' : ''}
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

export default ContactsPage;
