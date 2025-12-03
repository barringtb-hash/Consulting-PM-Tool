import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Client } from '../api/clients';
import {
  useArchiveClient,
  useClient,
  useContacts,
  useCreateContact,
  useDeleteContact,
  useUpdateClient,
  useUpdateContact,
} from '../api/queries';
import ContactForm, { ContactFormValues } from '../components/ContactForm';
import ClientForm, { ClientFormValues } from '../components/ClientForm';
import useRedirectOnUnauthorized from '../auth/useRedirectOnUnauthorized';
import { isApiError } from '../api/http';
import { EMPTY_STATES } from '../utils/typography';
import { Card, CardBody, CardHeader, CardTitle } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

function mapClientFormToPayload(values: ClientFormValues) {
  return {
    name: values.name,
    industry: values.industry || undefined,
    companySize: values.companySize || undefined,
    timezone: values.timezone || undefined,
    aiMaturity: values.aiMaturity || undefined,
    notes: values.notes || undefined,
  };
}

function mapContactFormToPayload(clientId: number, values: ContactFormValues) {
  return {
    clientId,
    name: values.name,
    email: values.email,
    role: values.role || undefined,
    phone: values.phone || undefined,
    notes: values.notes || undefined,
  };
}

function ContactList({ clientId }: { clientId: number }): JSX.Element {
  const contactsQuery = useContacts(clientId);
  const createContactMutation = useCreateContact();
  const [editingContact, setEditingContact] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [initialValues, setInitialValues] = useState<ContactFormValues>();
  const updateContactMutation = useUpdateContact(clientId);
  const deleteContactMutation = useDeleteContact(clientId);
  const deletingContactId = deleteContactMutation.variables;

  useRedirectOnUnauthorized(contactsQuery.error);
  useRedirectOnUnauthorized(createContactMutation.error);
  useRedirectOnUnauthorized(updateContactMutation.error);
  useRedirectOnUnauthorized(deleteContactMutation.error);

  const handleSubmit = async (values: ContactFormValues) => {
    setFormError(null);

    const payload = mapContactFormToPayload(clientId, values);

    try {
      if (editingContact) {
        await updateContactMutation.mutateAsync({
          contactId: editingContact,
          payload,
        });
        setEditingContact(null);
        setInitialValues(undefined);
      } else {
        await createContactMutation.mutateAsync(payload);
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Save failed');
    }
  };

  const handleEdit = (contactId: number) => {
    setEditingContact(contactId);
    const contact = contactsQuery.data?.find((entry) => entry.id === contactId);
    if (contact) {
      setInitialValues({
        name: contact.name,
        email: contact.email,
        role: contact.role ?? '',
        phone: contact.phone ?? '',
        notes: contact.notes ?? '',
      });
    }
  };

  const handleDelete = async (contactId: number) => {
    setFormError(null);

    try {
      await deleteContactMutation.mutateAsync(contactId);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to delete');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contacts</CardTitle>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Manage points of contact for this client.
        </p>
      </CardHeader>
      <CardBody>
        {contactsQuery.isLoading && (
          <p className="text-neutral-600 dark:text-neutral-400">
            Loading contacts…
          </p>
        )}
        {contactsQuery.error && (
          <p role="alert" className="text-danger-600">
            {contactsQuery.error instanceof Error
              ? contactsQuery.error.message
              : 'Unable to load contacts'}
          </p>
        )}

        {!contactsQuery.isLoading && !contactsQuery.error && (
          <>
            {contactsQuery.data && contactsQuery.data.length === 0 ? (
              <p className="text-neutral-600 dark:text-neutral-400">
                {EMPTY_STATES.noContacts}
              </p>
            ) : (
              <div className="space-y-4">
                {contactsQuery.data?.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {contact.name}
                        </h4>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          {contact.email}
                        </p>
                        {contact.role && (
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                            <span className="font-medium">Role:</span>{' '}
                            {contact.role}
                          </p>
                        )}
                        {contact.phone && (
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">
                            <span className="font-medium">Phone:</span>{' '}
                            {contact.phone}
                          </p>
                        )}
                        {contact.notes && (
                          <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-2">
                            {contact.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEdit(contact.id)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(contact.id)}
                          disabled={
                            deleteContactMutation.isPending &&
                            deletingContactId === contact.id
                          }
                        >
                          {deleteContactMutation.isPending &&
                          deletingContactId === contact.id
                            ? 'Deleting…'
                            : 'Delete'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            {editingContact ? 'Edit Contact' : 'Add Contact'}
          </h3>
          <ContactForm
            initialValues={initialValues}
            onSubmit={handleSubmit}
            submitLabel={editingContact ? 'Update contact' : 'Create contact'}
            isSubmitting={
              createContactMutation.isPending || updateContactMutation.isPending
            }
            onCancel={
              editingContact
                ? () => {
                    setEditingContact(null);
                    setInitialValues(undefined);
                  }
                : undefined
            }
            error={formError}
          />
        </div>
      </CardBody>
    </Card>
  );
}

function ClientDetailsPage(): JSX.Element {
  const { clientId: clientIdParam } = useParams<{ clientId: string }>();
  const clientId = useMemo(
    () => (clientIdParam ? Number(clientIdParam) : undefined),
    [clientIdParam],
  );
  const navigate = useNavigate();
  const clientQuery = useClient(clientId);
  const updateClientMutation = useUpdateClient(clientId ?? 0);
  const archiveClientMutation = useArchiveClient();
  const [formError, setFormError] = useState<string | null>(null);

  useRedirectOnUnauthorized(clientQuery.error);
  useRedirectOnUnauthorized(updateClientMutation.error);
  useRedirectOnUnauthorized(archiveClientMutation.error);

  const handleClientSave = async (values: ClientFormValues) => {
    setFormError(null);
    if (!clientId) return;

    const payload = mapClientFormToPayload(values);

    try {
      await updateClientMutation.mutateAsync(payload);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Save failed');
    }
  };

  const handleArchive = async () => {
    setFormError(null);
    if (!clientId) return;
    try {
      await archiveClientMutation.mutateAsync(clientId);
      navigate('/clients');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Archive failed');
    }
  };

  if (!clientId || Number.isNaN(clientId)) {
    return (
      <main>
        <p>Invalid client id.</p>
        <Link to="/clients">Back to clients</Link>
      </main>
    );
  }

  if (clientQuery.isLoading) {
    return (
      <main>
        <p>Loading client…</p>
      </main>
    );
  }

  if (clientQuery.error) {
    const message =
      clientQuery.error instanceof Error
        ? clientQuery.error.message
        : 'Unable to load client';

    if (isApiError(clientQuery.error) && clientQuery.error.status === 404) {
      return (
        <main>
          <p>Client not found.</p>
          <Link to="/clients">Back to clients</Link>
        </main>
      );
    }

    return (
      <main>
        <p role="alert">{message}</p>
        <Link to="/clients">Back to clients</Link>
      </main>
    );
  }

  const client = clientQuery.data as Client;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <PageHeader
        title={client.name}
        description={client.industry || EMPTY_STATES.notProvided}
        action={
          <Link to="/clients">
            <Button variant="secondary">Back to Clients</Button>
          </Link>
        }
      >
        {client.archived && (
          <Badge variant="warning" className="mt-2">
            Archived
          </Badge>
        )}
      </PageHeader>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Client Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Client Details</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <dt className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Company Size
                </dt>
                <dd className="text-sm text-neutral-900 dark:text-neutral-100">
                  {client.companySize || EMPTY_STATES.notProvided}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Timezone
                </dt>
                <dd className="text-sm text-neutral-900 dark:text-neutral-100">
                  {client.timezone || EMPTY_STATES.notProvided}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  AI Maturity
                </dt>
                <dd className="text-sm text-neutral-900 dark:text-neutral-100">
                  {client.aiMaturity || EMPTY_STATES.notProvided}
                </dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Notes
                </dt>
                <dd className="text-sm text-neutral-900 dark:text-neutral-100">
                  {client.notes || EMPTY_STATES.notProvided}
                </dd>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Update Client Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Update Client</CardTitle>
          </CardHeader>
          <CardBody>
            <ClientForm
              initialValues={{
                name: client.name,
                industry: client.industry ?? '',
                companySize: client.companySize ?? '',
                timezone: client.timezone ?? '',
                aiMaturity: client.aiMaturity ?? '',
                notes: client.notes ?? '',
              }}
              onSubmit={handleClientSave}
              submitLabel="Save changes"
              isSubmitting={updateClientMutation.isPending}
              error={formError}
            />
            {!client.archived && (
              <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <Button variant="danger" onClick={handleArchive}>
                  Archive Client
                </Button>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Contacts Card */}
        <ContactList clientId={clientId} />

        {/* Projects Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Projects</CardTitle>
              <Button
                onClick={() =>
                  navigate(
                    `/projects/new?clientId=${clientId}&step=details&templateId=custom`,
                  )
                }
              >
                New Project
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Project tracking for this client is coming soon.
            </p>
          </CardBody>
        </Card>

        {/* Meetings Card */}
        <Card>
          <CardHeader>
            <CardTitle>Meetings</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Meeting notes and actions will appear here when available.
            </p>
          </CardBody>
        </Card>
      </main>
    </div>
  );
}

export default ClientDetailsPage;
