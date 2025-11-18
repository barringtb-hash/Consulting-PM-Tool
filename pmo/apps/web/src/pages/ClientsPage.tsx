import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AiMaturity, Client, CompanySize } from '../api/clients';
import {
  useArchiveClient,
  useClients,
  useCreateClient,
  useUpdateClient,
} from '../api/queries';
import ClientForm, { ClientFormValues } from '../components/ClientForm';
import useRedirectOnUnauthorized from '../auth/useRedirectOnUnauthorized';

function mapFormValuesToPayload(values: ClientFormValues) {
  return {
    name: values.name,
    industry: values.industry || undefined,
    companySize: values.companySize || undefined,
    timezone: values.timezone || undefined,
    aiMaturity: values.aiMaturity || undefined,
    notes: values.notes || undefined,
  };
}

function Filters({
  search,
  companySize,
  aiMaturity,
  includeArchived,
  onChange,
}: {
  search: string;
  companySize: CompanySize | '';
  aiMaturity: AiMaturity | '';
  includeArchived: boolean;
  onChange: (filters: {
    search: string;
    companySize: CompanySize | '';
    aiMaturity: AiMaturity | '';
    includeArchived: boolean;
  }) => void;
}) {
  const handleChange = (
    key: 'search' | 'companySize' | 'aiMaturity' | 'includeArchived',
    value: string | boolean,
  ) => {
    onChange({
      search,
      companySize,
      aiMaturity,
      includeArchived,
      [key]: value,
    } as {
      search: string;
      companySize: CompanySize | '';
      aiMaturity: AiMaturity | '';
      includeArchived: boolean;
    });
  };

  return (
    <fieldset>
      <legend>Filters</legend>
      <div>
        <label htmlFor="client-search">Search</label>
        <input
          id="client-search"
          value={search}
          onChange={(event) => handleChange('search', event.target.value)}
          placeholder="Search by name, industry, or notes"
        />
      </div>
      <div>
        <label htmlFor="filter-company-size">Company size</label>
        <select
          id="filter-company-size"
          value={companySize}
          onChange={(event) =>
            handleChange('companySize', event.target.value as CompanySize | '')
          }
        >
          <option value="">Any</option>
          <option value="MICRO">Micro</option>
          <option value="SMALL">Small</option>
          <option value="MEDIUM">Medium</option>
        </select>
      </div>
      <div>
        <label htmlFor="filter-ai-maturity">AI maturity</label>
        <select
          id="filter-ai-maturity"
          value={aiMaturity}
          onChange={(event) =>
            handleChange('aiMaturity', event.target.value as AiMaturity | '')
          }
        >
          <option value="">Any</option>
          <option value="NONE">None</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
      </div>
      <label>
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(event) =>
            handleChange('includeArchived', event.target.checked)
          }
        />
        Show archived
      </label>
    </fieldset>
  );
}

function ClientsPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [companySize, setCompanySize] = useState<CompanySize | ''>('');
  const [aiMaturity, setAiMaturity] = useState<AiMaturity | ''>('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const filterParams = useMemo(
    () => ({
      search: search || undefined,
      companySize: companySize || undefined,
      aiMaturity: aiMaturity || undefined,
      includeArchived,
    }),
    [aiMaturity, companySize, includeArchived, search],
  );

  const clientsQuery = useClients(filterParams);
  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient(editingClient?.id ?? 0);
  const archiveClientMutation = useArchiveClient();

  useRedirectOnUnauthorized(clientsQuery.error);
  useRedirectOnUnauthorized(createClientMutation.error);
  useRedirectOnUnauthorized(updateClientMutation.error);
  useRedirectOnUnauthorized(archiveClientMutation.error);

  const handleCreateOrUpdate = async (values: ClientFormValues) => {
    setFormError(null);
    const payload = mapFormValuesToPayload(values);

    try {
      if (editingClient) {
        await updateClientMutation.mutateAsync(payload);
        setEditingClient(null);
      } else {
        await createClientMutation.mutateAsync(payload);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to save client';
      setFormError(message);
    }
  };

  const handleArchive = async (client: Client) => {
    setFormError(null);

    try {
      await archiveClientMutation.mutateAsync(client.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to archive client';
      setFormError(message);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
  };

  const isSubmitting =
    createClientMutation.isPending || updateClientMutation.isPending;

  return (
    <main>
      <header>
        <h1>Clients</h1>
        <p>Manage client records, contacts, and details.</p>
      </header>

      <Filters
        search={search}
        companySize={companySize}
        aiMaturity={aiMaturity}
        includeArchived={includeArchived}
        onChange={({ search, companySize, aiMaturity, includeArchived }) => {
          setSearch(search);
          setCompanySize(companySize);
          setAiMaturity(aiMaturity);
          setIncludeArchived(includeArchived);
        }}
      />

      <section aria-label="client-list">
        <h2>Client list</h2>
        {clientsQuery.isLoading && <p>Loading clients…</p>}
        {clientsQuery.error && (
          <p role="alert">
            {clientsQuery.error instanceof Error
              ? clientsQuery.error.message
              : 'Unable to load clients'}
          </p>
        )}
        {!clientsQuery.isLoading && !clientsQuery.error && (
          <>
            {clientsQuery.data && clientsQuery.data.length === 0 ? (
              <p>No clients found. Try adjusting your filters.</p>
            ) : (
              <ul>
                {clientsQuery.data?.map((client) => (
                  <li key={client.id}>
                    <div>
                      <strong>{client.name}</strong>{' '}
                      {client.archived && <span>(Archived)</span>}
                    </div>
                    <div>
                      <span>{client.industry || 'Industry not set'}</span>
                      {client.companySize && (
                        <span> • {client.companySize}</span>
                      )}
                      {client.aiMaturity && <span> • {client.aiMaturity}</span>}
                    </div>
                    <div>
                      <Link to={`/clients/${client.id}`}>View details</Link>
                      <button type="button" onClick={() => handleEdit(client)}>
                        Edit
                      </button>
                      {!client.archived && (
                        <button
                          type="button"
                          onClick={() => handleArchive(client)}
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <section aria-label="client-form-section">
        <h2>{editingClient ? 'Edit client' : 'Add a new client'}</h2>
        <ClientForm
          initialValues={
            editingClient
              ? {
                  name: editingClient.name,
                  industry: editingClient.industry ?? '',
                  companySize: editingClient.companySize ?? '',
                  timezone: editingClient.timezone ?? '',
                  aiMaturity: editingClient.aiMaturity ?? '',
                  notes: editingClient.notes ?? '',
                }
              : undefined
          }
          onSubmit={handleCreateOrUpdate}
          submitLabel={editingClient ? 'Update client' : 'Create client'}
          isSubmitting={isSubmitting}
          onCancel={editingClient ? () => setEditingClient(null) : undefined}
          error={formError}
        />
      </section>
    </main>
  );
}

export default ClientsPage;
