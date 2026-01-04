import React, { memo, useCallback, useMemo, useState } from 'react';
import { Plus, Mail, Building2, User } from 'lucide-react';

import {
  LeadSource,
  LeadStatus,
  ServiceInterest,
  InboundLead,
} from '../api/leads';
import {
  useLeads,
  useCreateLead,
  useUpdateLead,
  useConvertLead,
  useDeleteLead,
} from '../api/queries';
import useRedirectOnUnauthorized from '../auth/useRedirectOnUnauthorized';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PageHeader } from '../ui/PageHeader';
import { Select } from '../ui/Select';
import { useToast } from '../ui/Toast';

interface Filters {
  search: string;
  source: LeadSource | '';
  status: LeadStatus | '';
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatLeadSource(source: LeadSource): string {
  return source
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

function formatServiceInterest(interest: ServiceInterest): string {
  return interest
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');
}

function getStatusColor(status: LeadStatus): string {
  switch (status) {
    case 'NEW':
      return 'bg-blue-100 text-blue-800';
    case 'CONTACTED':
      return 'bg-yellow-100 text-yellow-800';
    case 'QUALIFIED':
      return 'bg-green-100 text-green-800';
    case 'DISQUALIFIED':
      return 'bg-red-100 text-red-800';
    case 'CONVERTED':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-neutral-100 text-neutral-800';
  }
}

interface LeadDetailPanelProps {
  lead: InboundLead;
  onClose: () => void;
  onUpdate: (leadId: number, updates: Partial<InboundLead>) => Promise<void>;
  onConvert: (leadId: number) => Promise<void>;
  onDelete: (leadId: number) => Promise<void>;
}

// OPTIMIZED: Memoize LeadDetailPanel to prevent unnecessary re-renders
const LeadDetailPanel = memo(function LeadDetailPanel({
  lead,
  onClose,
  onUpdate,
  onConvert,
  onDelete,
}: LeadDetailPanelProps) {
  const [status, setStatus] = useState(lead.status);

  const handleStatusChange = useCallback(
    async (newStatus: LeadStatus) => {
      setStatus(newStatus);
      await onUpdate(lead.id, { status: newStatus });
    },
    [lead.id, onUpdate],
  );

  const handleConvert = useCallback(async () => {
    if (
      confirm(
        'Convert this lead to an Account and Opportunity in the sales pipeline?',
      )
    ) {
      await onConvert(lead.id);
      onClose();
    }
  }, [lead.id, onConvert, onClose]);

  const handleDelete = useCallback(async () => {
    if (confirm('Are you sure you want to delete this lead?')) {
      await onDelete(lead.id);
      onClose();
    }
  }, [lead.id, onDelete, onClose]);

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-neutral-800 shadow-xl border-l border-neutral-200 dark:border-neutral-700 overflow-y-auto z-50">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Lead Details
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Status
            </label>
            <Select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
            >
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="DISQUALIFIED">Disqualified</option>
              <option value="CONVERTED">Converted</option>
            </Select>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Contact Information
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User
                  size={16}
                  className="text-neutral-400 dark:text-neutral-500"
                />
                <span>{lead.name || 'No name'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail
                  size={16}
                  className="text-neutral-400 dark:text-neutral-500"
                />
                <a
                  href={`mailto:${lead.email}`}
                  className="text-primary-600 hover:underline"
                >
                  {lead.email}
                </a>
              </div>
              {lead.company && (
                <div className="flex items-center gap-2">
                  <Building2
                    size={16}
                    className="text-neutral-400 dark:text-neutral-500"
                  />
                  <span>{lead.company}</span>
                </div>
              )}
            </div>
          </div>

          {/* Lead Details */}
          <div>
            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Lead Details
            </h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-neutral-500 dark:text-neutral-400">
                  Source:{' '}
                </span>
                <span className="font-medium">
                  {formatLeadSource(lead.source)}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 dark:text-neutral-400">
                  Interest:{' '}
                </span>
                <span className="font-medium">
                  {formatServiceInterest(lead.serviceInterest)}
                </span>
              </div>
              <div>
                <span className="text-neutral-500 dark:text-neutral-400">
                  Created:{' '}
                </span>
                <span>{formatDate(lead.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Message */}
          {lead.message && (
            <div>
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Message
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800 p-3 rounded-lg">
                {lead.message}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            {lead.status !== 'CONVERTED' && lead.status !== 'DISQUALIFIED' && (
              <Button onClick={handleConvert} className="w-full">
                Convert to Opportunity
              </Button>
            )}
            <Button
              onClick={handleDelete}
              variant="subtle"
              className="w-full text-red-600 hover:bg-red-50"
            >
              Delete Lead
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

LeadDetailPanel.displayName = 'LeadDetailPanel';

export function LeadsPage(): JSX.Element {
  const { showToast } = useToast();
  const [selectedLead, setSelectedLead] = useState<InboundLead | null>(null);
  const [showNewLeadForm, setShowNewLeadForm] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    source: '',
    status: '',
  });

  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    company: '',
    source: 'OTHER' as LeadSource,
    serviceInterest: 'NOT_SURE' as ServiceInterest,
    message: '',
  });

  const filterParams = useMemo(
    () => ({
      search: filters.search || undefined,
      source: filters.source || undefined,
      status: filters.status || undefined,
    }),
    [filters],
  );

  const leadsQuery = useLeads(filterParams);
  const createLead = useCreateLead();
  const updateLead = useUpdateLead(selectedLead?.id || 0);
  const convertLead = useConvertLead(selectedLead?.id || 0);
  const deleteLead = useDeleteLead();

  useRedirectOnUnauthorized(leadsQuery.error);

  const leads = useMemo(() => leadsQuery.data ?? [], [leadsQuery.data]);

  const stats = useMemo(() => {
    const newLeads = leads.filter((l) => l.status === 'NEW').length;
    const contacted = leads.filter((l) => l.status === 'CONTACTED').length;
    const qualified = leads.filter((l) => l.status === 'QUALIFIED').length;
    return { newLeads, contacted, qualified, total: leads.length };
  }, [leads]);

  // OPTIMIZED: Wrap handlers with useCallback to prevent unnecessary re-renders
  const handleCreateLead = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newLead.email.trim()) return;

      try {
        await createLead.mutateAsync(newLead);
        setNewLead({
          name: '',
          email: '',
          company: '',
          source: 'OTHER',
          serviceInterest: 'NOT_SURE',
          message: '',
        });
        setShowNewLeadForm(false);
        showToast('Lead created successfully', 'success');
      } catch {
        showToast('Failed to create lead', 'error');
      }
    },
    [newLead, createLead, showToast],
  );

  const handleUpdateLead = useCallback(
    async (_leadId: number, updates: Partial<InboundLead>) => {
      try {
        await updateLead.mutateAsync(updates);
        showToast('Lead updated successfully', 'success');
      } catch {
        showToast('Failed to update lead', 'error');
      }
    },
    [updateLead, showToast],
  );

  const handleConvertLead = useCallback(async () => {
    try {
      const result = await convertLead.mutateAsync({
        createOpportunity: true,
      });
      showToast(
        `Lead converted successfully! Created Account${result.opportunityId ? ' and Opportunity' : ''}.`,
        'success',
      );
    } catch {
      showToast('Failed to convert lead', 'error');
    }
  }, [convertLead, showToast]);

  const handleDeleteLead = useCallback(
    async (leadId: number) => {
      try {
        await deleteLead.mutateAsync(leadId);
        showToast('Lead deleted successfully', 'success');
      } catch {
        showToast('Failed to delete lead', 'error');
      }
    },
    [deleteLead, showToast],
  );

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      source: '',
      status: '',
    });
  }, []);

  const activeFilterCount = [
    filters.search,
    filters.source,
    filters.status,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title="Inbound Leads"
        description="Capture and qualify inbound leads, then convert them to Accounts and Opportunities."
        actions={
          <Button onClick={() => setShowNewLeadForm(!showNewLeadForm)}>
            <Plus size={16} />
            New Lead
          </Button>
        }
      />

      <main className="page-content space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm p-4">
            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              Total Leads
            </div>
            <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {stats.total}
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm p-4">
            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              New
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {stats.newLeads}
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm p-4">
            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              Contacted
            </div>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.contacted}
            </div>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm p-4">
            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              Qualified
            </div>
            <div className="text-2xl font-bold text-green-600">
              {stats.qualified}
            </div>
          </div>
        </div>

        {/* New Lead Form */}
        {showNewLeadForm && (
          <section className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
              New Lead
            </h2>
            <form onSubmit={handleCreateLead} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Name"
                  type="text"
                  placeholder="Lead's name"
                  value={newLead.name}
                  onChange={(e) =>
                    setNewLead((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
                <Input
                  label="Email *"
                  type="email"
                  placeholder="email@example.com"
                  value={newLead.email}
                  onChange={(e) =>
                    setNewLead((prev) => ({ ...prev, email: e.target.value }))
                  }
                  required
                />
                <Input
                  label="Company"
                  type="text"
                  placeholder="Company name"
                  value={newLead.company}
                  onChange={(e) =>
                    setNewLead((prev) => ({ ...prev, company: e.target.value }))
                  }
                />
                <Select
                  label="Source"
                  value={newLead.source}
                  onChange={(e) =>
                    setNewLead((prev) => ({
                      ...prev,
                      source: e.target.value as LeadSource,
                    }))
                  }
                >
                  <option value="WEBSITE_CONTACT">Website Contact</option>
                  <option value="WEBSITE_DOWNLOAD">Website Download</option>
                  <option value="REFERRAL">Referral</option>
                  <option value="LINKEDIN">LinkedIn</option>
                  <option value="OUTBOUND">Outbound</option>
                  <option value="EVENT">Event</option>
                  <option value="OTHER">Other</option>
                </Select>
                <Select
                  label="Service Interest"
                  value={newLead.serviceInterest}
                  onChange={(e) =>
                    setNewLead((prev) => ({
                      ...prev,
                      serviceInterest: e.target.value as ServiceInterest,
                    }))
                  }
                  className="md:col-span-2"
                >
                  <option value="STRATEGY">Strategy</option>
                  <option value="POC">POC</option>
                  <option value="IMPLEMENTATION">Implementation</option>
                  <option value="TRAINING">Training</option>
                  <option value="PMO_ADVISORY">PMO Advisory</option>
                  <option value="NOT_SURE">Not Sure</option>
                </Select>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Message
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-neutral-800 dark:text-neutral-100"
                    rows={3}
                    placeholder="Any additional information..."
                    value={newLead.message}
                    onChange={(e) =>
                      setNewLead((prev) => ({
                        ...prev,
                        message: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button type="submit" disabled={createLead.isPending}>
                  {createLead.isPending ? 'Creating...' : 'Create Lead'}
                </Button>
                <Button
                  type="button"
                  variant="subtle"
                  onClick={() => setShowNewLeadForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </section>
        )}

        {/* Filters */}
        <section className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Filters
            </h2>
            {activeFilterCount > 0 && (
              <Button variant="subtle" size="sm" onClick={clearFilters}>
                Clear filters ({activeFilterCount})
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Search"
              type="search"
              placeholder="Search by name, email, or company"
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
            />

            <Select
              label="Source"
              value={filters.source}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  source: e.target.value as LeadSource | '',
                }))
              }
            >
              <option value="">All sources</option>
              <option value="WEBSITE_CONTACT">Website Contact</option>
              <option value="WEBSITE_DOWNLOAD">Website Download</option>
              <option value="REFERRAL">Referral</option>
              <option value="LINKEDIN">LinkedIn</option>
              <option value="OUTBOUND">Outbound</option>
              <option value="EVENT">Event</option>
              <option value="OTHER">Other</option>
            </Select>

            <Select
              label="Status"
              value={filters.status}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value as LeadStatus | '',
                }))
              }
            >
              <option value="">All statuses</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="DISQUALIFIED">Disqualified</option>
              <option value="CONVERTED">Converted</option>
            </Select>
          </div>
        </section>

        {/* Leads List */}
        <section className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50 dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Source
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Interest
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                {leads.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-8 text-center text-neutral-500 dark:text-neutral-400"
                    >
                      No leads found. Create your first lead to get started.
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {lead.name || 'No name'}
                          </div>
                          <div className="text-sm text-neutral-500 dark:text-neutral-400">
                            {lead.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-900 dark:text-neutral-100">
                        {lead.company || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                        {formatLeadSource(lead.source)}
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                        {formatServiceInterest(lead.serviceInterest)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={getStatusColor(lead.status)}>
                          {lead.status.charAt(0) +
                            lead.status.slice(1).toLowerCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                        {formatDate(lead.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Lead Detail Panel */}
      {selectedLead && (
        <LeadDetailPanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={handleUpdateLead}
          onConvert={handleConvertLead}
          onDelete={handleDeleteLead}
        />
      )}
    </div>
  );
}

export default LeadsPage;
