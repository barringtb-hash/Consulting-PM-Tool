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
    <section aria-label="contacts">
      <header>
        <h2>Contacts</h2>
        <p className="text-sm text-neutral-600">
          Manage points of contact for this client.
        </p>
      </header>

      {contactsQuery.isLoading && <p>Loading contacts…</p>}
      {contactsQuery.error && (
        <p role="alert">
          {contactsQuery.error instanceof Error
            ? contactsQuery.error.message
            : 'Unable to load contacts'}
        </p>
      )}

      {!contactsQuery.isLoading && !contactsQuery.error && (
        <>
          {contactsQuery.data && contactsQuery.data.length === 0 ? (
            <p className="text-neutral-600">{EMPTY_STATES.noContacts}</p>
          ) : (
            <ul>
              {contactsQuery.data?.map((contact) => (
                <li key={contact.id}>
                  <div>
                    <strong>{contact.name}</strong>
                    <div>{contact.email}</div>
                    {contact.role && <div>{contact.role}</div>}
                    {contact.phone && <div>{contact.phone}</div>}
                    {contact.notes && <div>{contact.notes}</div>}
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => handleEdit(contact.id)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
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
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <section aria-label="contact-form-section">
        <h3>{editingContact ? 'Edit Contact' : 'Add Contact'}</h3>
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
      </section>
    </section>
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
    <main>
      <header>
        <h1>{client.name}</h1>
        {client.archived && <p>This client is archived.</p>}
        <p className="text-neutral-600">
          {client.industry || EMPTY_STATES.notProvided}
        </p>
        <Link to="/clients">Back to clients</Link>
      </header>

      <section aria-label="client-details">
        <h2>Client Details</h2>
        <dl>
          <div>
            <dt>Company size</dt>
            <dd>{client.companySize || EMPTY_STATES.notProvided}</dd>
          </div>
          <div>
            <dt>Timezone</dt>
            <dd>{client.timezone || EMPTY_STATES.notProvided}</dd>
          </div>
          <div>
            <dt>AI maturity</dt>
            <dd>{client.aiMaturity || EMPTY_STATES.notProvided}</dd>
          </div>
          <div>
            <dt>Notes</dt>
            <dd>{client.notes || EMPTY_STATES.notProvided}</dd>
          </div>
        </dl>
      </section>

      <section aria-label="client-form">
        <h2>Update Client</h2>
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
          <button type="button" onClick={handleArchive}>
            Archive client
          </button>
        )}
      </section>

      <ContactList clientId={clientId} />

      <section aria-label="projects">
        <header>
          <h2>Projects</h2>
          <button
            type="button"
            onClick={() =>
              navigate(
                `/projects/new?clientId=${clientId}&step=details&templateId=custom`,
              )
            }
            aria-label="Create new project"
          >
            New Project
          </button>
        </header>
        <p className="text-sm text-neutral-600">
          Project tracking for this client is coming soon.
        </p>
      </section>

      <section aria-label="meetings">
        <h2>Meetings</h2>
        <p className="text-sm text-neutral-600">
          Meeting notes and actions will appear here when available.
        </p>
      </section>
    </main>
  );
}

export default ClientDetailsPage;
