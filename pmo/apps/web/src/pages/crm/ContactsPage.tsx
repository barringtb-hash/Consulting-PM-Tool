/**
 * CRM Contacts Page
 *
 * Displays a list of CRM contacts with filtering and basic CRUD operations.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, User, Search, Mail, Phone, Building2 } from 'lucide-react';

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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function ContactsPage(): JSX.Element {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<Filters>({
    search: '',
    lifecycle: '',
    accountId: '',
  });

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

      <div className="container-padding py-6 space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="text-sm text-gray-500">Total Contacts</div>
              <div className="text-2xl font-semibold">{stats.total}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-500">New This Month</div>
              <div className="text-2xl font-semibold">
                {stats.recentContacts}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-500">Customers</div>
              <div className="text-2xl font-semibold">
                {stats.byLifecycle.find((l) => l.lifecycle === 'CUSTOMER')
                  ?.count ?? 0}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-gray-500">Leads</div>
              <div className="text-2xl font-semibold">
                {stats.byLifecycle.find((l) => l.lifecycle === 'LEAD')?.count ??
                  0}
              </div>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search contacts..."
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
              className="w-full md:w-40"
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

        {/* Contacts List */}
        {contactsQuery.isLoading ? (
          <div className="text-center py-8 text-gray-500">
            Loading contacts...
          </div>
        ) : contacts.length === 0 ? (
          <Card className="p-8 text-center">
            <User className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No contacts found
            </h3>
            <p className="text-gray-500 mb-4">{EMPTY_STATES.noContacts}</p>
            <Button onClick={() => navigate('/crm/contacts/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <Card
                key={contact.id}
                className="p-4 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                onClick={() => navigate(`/crm/contacts/${contact.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                      <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {contact.firstName} {contact.lastName}
                        </span>
                        <Badge variant={getLifecycleVariant(contact.lifecycle)}>
                          {formatLifecycle(contact.lifecycle)}
                        </Badge>
                        {contact.isPrimary && (
                          <Badge variant="warning">Primary</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        {contact.jobTitle && <span>{contact.jobTitle}</span>}
                        {contact.account && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {contact.account.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {contact.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {contact.email}
                      </span>
                    )}
                    {contact.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {contact.phone}
                      </span>
                    )}
                    <span className="text-xs">
                      {formatDate(contact.createdAt)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteContact(contact.id);
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ContactsPage;
