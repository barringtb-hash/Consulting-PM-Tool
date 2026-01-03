/**
 * CRM Contact Detail Page
 *
 * Displays detailed information about a single contact.
 */

import { useState, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import {
  User,
  Building2,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  Calendar,
  Edit2,
  ArrowLeft,
  ExternalLink,
  Archive,
  RefreshCw,
  Linkedin,
  Twitter,
} from 'lucide-react';

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Badge,
  useToast,
  Modal,
  Input,
} from '../../ui';
import {
  useCRMContact,
  useUpdateCRMContact,
  useDeleteCRMContact,
  useRestoreCRMContact,
} from '../../api/hooks/crm';
import type {
  ContactUpdatePayload,
  ContactLifecycle,
} from '../../api/contacts';

// Lifecycle stage colors
const LIFECYCLE_COLORS: Record<ContactLifecycle, string> = {
  LEAD: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  MQL: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  SQL: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  OPPORTUNITY:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  CUSTOMER:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  EVANGELIST:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  CHURNED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const LIFECYCLE_LABELS: Record<ContactLifecycle, string> = {
  LEAD: 'Lead',
  MQL: 'Marketing Qualified',
  SQL: 'Sales Qualified',
  OPPORTUNITY: 'Opportunity',
  CUSTOMER: 'Customer',
  EVANGELIST: 'Evangelist',
  CHURNED: 'Churned',
};

export function ContactDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const contactId = useMemo(() => (id ? parseInt(id, 10) : undefined), [id]);

  const contactQuery = useCRMContact(contactId);
  const updateContact = useUpdateCRMContact(contactId ?? 0);
  const deleteContact = useDeleteCRMContact();
  const restoreContact = useRestoreCRMContact();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ContactUpdatePayload>>({});

  const contact = contactQuery.data;

  const handleStartEdit = () => {
    if (contact) {
      setEditForm({
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email ?? '',
        phone: contact.phone ?? '',
        mobile: contact.mobile ?? '',
        jobTitle: contact.jobTitle ?? '',
        department: contact.department ?? '',
        lifecycle: contact.lifecycle,
        linkedinUrl: contact.linkedinUrl ?? '',
        twitterUrl: contact.twitterUrl ?? '',
      });
      setIsEditing(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!contactId) return;
    try {
      await updateContact.mutateAsync(editForm);
      setIsEditing(false);
      showToast('Contact updated successfully', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to update contact',
        'error',
      );
    }
  };

  const handleArchive = async () => {
    if (!contactId) return;
    try {
      await deleteContact.mutateAsync(contactId);
      showToast('Contact archived successfully', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to archive contact',
        'error',
      );
    }
  };

  const handleRestore = async () => {
    if (!contactId) return;
    try {
      await restoreContact.mutateAsync(contactId);
      showToast('Contact restored successfully', 'success');
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Failed to restore contact',
        'error',
      );
    }
  };

  // Loading state
  if (contactQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-neutral-500 dark:text-neutral-400">
            Loading contact...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (contactQuery.error || !contact) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto text-center py-12">
          <CardBody>
            <User className="h-12 w-12 mx-auto text-neutral-400 mb-4" />
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
              Contact Not Found
            </h2>
            <p className="text-neutral-500 mb-4">
              {contactQuery.error?.message ||
                'The requested contact could not be found.'}
            </p>
            <Button
              variant="secondary"
              onClick={() => navigate('/crm/contacts')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contacts
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  const fullName = `${contact.firstName} ${contact.lastName}`;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={() => navigate('/crm/contacts')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
              <User className="h-6 w-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                {fullName}
              </h1>
              <div className="flex items-center gap-2 text-neutral-500">
                {contact.jobTitle && <span>{contact.jobTitle}</span>}
                {contact.account && (
                  <>
                    {contact.jobTitle && <span>at</span>}
                    <Link
                      to={`/crm/accounts/${contact.account.id}`}
                      className="text-primary-600 hover:underline flex items-center gap-1"
                    >
                      {contact.account.name}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {contact.archived ? (
            <Button
              variant="secondary"
              onClick={handleRestore}
              disabled={restoreContact.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Restore
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={handleStartEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={handleArchive}
                disabled={deleteContact.isPending}
              >
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-2">
        <Badge className={LIFECYCLE_COLORS[contact.lifecycle]}>
          {LIFECYCLE_LABELS[contact.lifecycle]}
        </Badge>
        {contact.isPrimary && <Badge variant="warning">Primary Contact</Badge>}
        {contact.doNotContact && <Badge variant="danger">Do Not Contact</Badge>}
        {contact.archived && <Badge variant="secondary">Archived</Badge>}
        {contact.leadScore != null && (
          <Badge variant="info">Lead Score: {contact.leadScore}</Badge>
        )}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contact.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-500">Email</p>
                      <a
                        href={`mailto:${contact.email}`}
                        className="text-primary-600 hover:underline"
                      >
                        {contact.email}
                      </a>
                    </div>
                  </div>
                )}

                {contact.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-500">Phone</p>
                      <a
                        href={`tel:${contact.phone}`}
                        className="text-primary-600 hover:underline"
                      >
                        {contact.phone}
                      </a>
                    </div>
                  </div>
                )}

                {contact.mobile && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-500">Mobile</p>
                      <a
                        href={`tel:${contact.mobile}`}
                        className="text-primary-600 hover:underline"
                      >
                        {contact.mobile}
                      </a>
                    </div>
                  </div>
                )}

                {contact.jobTitle && (
                  <div className="flex items-center gap-3">
                    <Briefcase className="h-5 w-5 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-500">Job Title</p>
                      <p className="text-neutral-900 dark:text-white">
                        {contact.jobTitle}
                      </p>
                    </div>
                  </div>
                )}

                {contact.department && (
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-500">Department</p>
                      <p className="text-neutral-900 dark:text-white">
                        {contact.department}
                      </p>
                    </div>
                  </div>
                )}

                {contact.address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-neutral-400" />
                    <div>
                      <p className="text-sm text-neutral-500">Address</p>
                      <p className="text-neutral-900 dark:text-white">
                        {[
                          contact.address.street,
                          contact.address.city,
                          contact.address.state,
                          contact.address.postalCode,
                          contact.address.country,
                        ]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Social Links */}
              {(contact.linkedinUrl || contact.twitterUrl) && (
                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Social Profiles
                  </p>
                  <div className="flex items-center gap-4">
                    {contact.linkedinUrl && (
                      <a
                        href={contact.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:underline"
                      >
                        <Linkedin className="h-4 w-4" />
                        LinkedIn
                      </a>
                    )}
                    {contact.twitterUrl && (
                      <a
                        href={contact.twitterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sky-500 hover:underline"
                      >
                        <Twitter className="h-4 w-4" />
                        Twitter
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {contact.tags && contact.tags.length > 0 && (
                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {contact.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account */}
          {contact.account && (
            <Card>
              <CardHeader>
                <CardTitle>Account</CardTitle>
              </CardHeader>
              <CardBody>
                <Link
                  to={`/crm/accounts/${contact.account.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                >
                  <Building2 className="h-5 w-5 text-neutral-400" />
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">
                      {contact.account.name}
                    </p>
                    {contact.account.type && (
                      <p className="text-sm text-neutral-500">
                        {contact.account.type}
                      </p>
                    )}
                  </div>
                  <ExternalLink className="h-4 w-4 text-neutral-400 ml-auto" />
                </Link>
              </CardBody>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3">
              {contact.owner && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Owner</span>
                  <span className="text-neutral-900 dark:text-white">
                    {contact.owner.name}
                  </span>
                </div>
              )}
              {contact.leadSource && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Lead Source</span>
                  <span className="text-neutral-900 dark:text-white">
                    {contact.leadSource.replace('_', ' ')}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Created</span>
                <span className="text-neutral-900 dark:text-white flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(contact.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Updated</span>
                <span className="text-neutral-900 dark:text-white">
                  {new Date(contact.updatedAt).toLocaleDateString()}
                </span>
              </div>
              {contact._count && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">Opportunities</span>
                    <span className="text-neutral-900 dark:text-white">
                      {contact._count.opportunityContacts}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">Activities</span>
                    <span className="text-neutral-900 dark:text-white">
                      {contact._count.activities}
                    </span>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title="Edit Contact"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                First Name
              </label>
              <Input
                value={editForm.firstName ?? ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, firstName: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Last Name
              </label>
              <Input
                value={editForm.lastName ?? ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, lastName: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Email
            </label>
            <Input
              type="email"
              value={editForm.email ?? ''}
              onChange={(e) =>
                setEditForm({ ...editForm, email: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Phone
              </label>
              <Input
                value={editForm.phone ?? ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, phone: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Mobile
              </label>
              <Input
                value={editForm.mobile ?? ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, mobile: e.target.value })
                }
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Job Title
              </label>
              <Input
                value={editForm.jobTitle ?? ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, jobTitle: e.target.value })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Department
              </label>
              <Input
                value={editForm.department ?? ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, department: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Lifecycle Stage
            </label>
            <select
              value={editForm.lifecycle ?? 'LEAD'}
              onChange={(e) =>
                setEditForm({
                  ...editForm,
                  lifecycle: e.target.value as ContactLifecycle,
                })
              }
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800"
            >
              {Object.entries(LIFECYCLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              isLoading={updateContact.isPending}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ContactDetailPage;
