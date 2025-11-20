import React, { useEffect, useMemo, useState } from 'react';
import { type Asset, type AssetType } from '../api/assets';
import {
  useArchiveAsset,
  useAssets,
  useClients,
  useCreateAsset,
  useUpdateAsset,
} from '../api/queries';
import { type Client } from '../api/clients';
import AssetForm, {
  assetFormValuesToPayload,
  type AssetFormValues,
} from '../components/AssetForm';
import useRedirectOnUnauthorized from '../auth/useRedirectOnUnauthorized';

interface AssetFilterProps {
  search: string;
  type: AssetType | '';
  template: '' | 'true' | 'false';
  clientId: string;
  includeArchived: boolean;
  clients?: Client[];
  onChange: (filters: {
    search: string;
    type: AssetType | '';
    template: '' | 'true' | 'false';
    clientId: string;
    includeArchived: boolean;
  }) => void;
}

function AssetFilters({
  search,
  type,
  template,
  clientId,
  includeArchived,
  clients,
  onChange,
}: AssetFilterProps) {
  const handleChange = (
    key: keyof Omit<AssetFilterProps, 'clients' | 'onChange'>,
    value: string | boolean,
  ) => {
    onChange({
      search,
      type,
      template,
      clientId,
      includeArchived,
      [key]: value,
    } as AssetFilterProps);
  };

  return (
    <fieldset>
      <legend>Filters</legend>
      <div>
        <label htmlFor="asset-search">Search</label>
        <input
          id="asset-search"
          value={search}
          onChange={(event) => handleChange('search', event.target.value)}
          placeholder="Search by name, description, or tag"
        />
      </div>
      <div>
        <label htmlFor="asset-type-filter">Type</label>
        <select
          id="asset-type-filter"
          value={type}
          onChange={(event) => handleChange('type', event.target.value)}
        >
          <option value="">Any</option>
          <option value="PROMPT_TEMPLATE">Prompt template</option>
          <option value="WORKFLOW">Workflow</option>
          <option value="DATASET">Dataset</option>
          <option value="EVALUATION">Evaluation</option>
          <option value="GUARDRAIL">Guardrail</option>
        </select>
      </div>
      <div>
        <label htmlFor="asset-template-filter">Template</label>
        <select
          id="asset-template-filter"
          value={template}
          onChange={(event) =>
            handleChange(
              'template',
              event.target.value as '' | 'true' | 'false',
            )
          }
        >
          <option value="">Any</option>
          <option value="true">Templates only</option>
          <option value="false">Non-templates</option>
        </select>
      </div>
      <div>
        <label htmlFor="asset-client-filter">Client</label>
        <select
          id="asset-client-filter"
          value={clientId}
          onChange={(event) => handleChange('clientId', event.target.value)}
        >
          <option value="">Any client</option>
          {clients?.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
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

function AssetsPage(): JSX.Element {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<AssetType | ''>('');
  const [template, setTemplate] = useState<'' | 'true' | 'false'>('');
  const [clientId, setClientId] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filterParams = useMemo(
    () => ({
      search: search || undefined,
      assetType: (type || undefined) as AssetType | undefined,
      isTemplate:
        template === '' ? undefined : template === 'true' ? true : false,
      clientId: clientId ? Number(clientId) : undefined,
      includeArchived,
    }),
    [clientId, includeArchived, search, template, type],
  );

  const assetsQuery = useAssets(filterParams);
  const clientsQuery = useClients({ includeArchived: true });
  const createAssetMutation = useCreateAsset();
  const updateAssetMutation = useUpdateAsset(editingAsset?.id ?? 0);
  const archiveAssetMutation = useArchiveAsset();

  useRedirectOnUnauthorized(assetsQuery.error);
  useRedirectOnUnauthorized(clientsQuery.error);
  useRedirectOnUnauthorized(createAssetMutation.error);
  useRedirectOnUnauthorized(updateAssetMutation.error);
  useRedirectOnUnauthorized(archiveAssetMutation.error);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [toast]);

  const handleSave = async (values: AssetFormValues) => {
    setFormError(null);

    if (!values.name.trim()) {
      setFormError('Name is required');
      return;
    }

    if (!values.type) {
      setFormError('Asset type is required');
      return;
    }

    const payload = assetFormValuesToPayload(values);

    try {
      if (editingAsset) {
        await updateAssetMutation.mutateAsync(payload);
        setEditingAsset(null);
        setToast('Asset updated successfully');
      } else {
        await createAssetMutation.mutateAsync(payload);
        setToast('Asset created successfully');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to save asset';
      setFormError(message);
    }
  };

  const handleEdit = (asset: Asset) => {
    setEditingAsset(asset);
  };

  const handleArchive = async (assetId: number) => {
    setFormError(null);

    try {
      await archiveAssetMutation.mutateAsync(assetId);
      if (editingAsset?.id === assetId) {
        setEditingAsset(null);
      }
      setToast('Asset archived');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to archive asset';
      setFormError(message);
    }
  };

  const assets = assetsQuery.data ?? [];

  return (
    <main>
      <header>
        <h1>Assets</h1>
        <p>Manage AI prompts, workflows, datasets, and reusable templates.</p>
      </header>

      {toast && <div className="toast">{toast}</div>}

      <AssetFilters
        search={search}
        type={type}
        template={template}
        clientId={clientId}
        includeArchived={includeArchived}
        clients={clientsQuery.data}
        onChange={({ search, type, template, clientId, includeArchived }) => {
          setSearch(search);
          setType(type);
          setTemplate(template);
          setClientId(clientId);
          setIncludeArchived(includeArchived);
        }}
      />

      <section aria-label="asset-list">
        <h2>Asset library</h2>
        {assetsQuery.isLoading && <p>Loading assets…</p>}
        {assetsQuery.error && (
          <p role="alert">Unable to load assets. Please try again.</p>
        )}
        {!assetsQuery.isLoading &&
          !assetsQuery.error &&
          assets.length === 0 && (
            <p>No assets found. Try adjusting your filters.</p>
          )}
        {assets.length > 0 && (
          <>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Client</th>
                  <th>Template</th>
                  <th>Tags</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id}>
                    <td>{asset.name}</td>
                    <td>{asset.type}</td>
                    <td>
                      {asset.clientId
                        ? clientsQuery.data?.find(
                            (client) => client.id === asset.clientId,
                          )?.name || '—'
                        : 'Unassigned'}
                    </td>
                    <td>{asset.isTemplate ? 'Yes' : 'No'}</td>
                    <td>{asset.tags.join(', ') || '—'}</td>
                    <td>
                      <button type="button" onClick={() => handleEdit(asset)}>
                        Edit
                      </button>
                      {!asset.archived && (
                        <button
                          type="button"
                          onClick={() => handleArchive(asset.id)}
                          disabled={archiveAssetMutation.isPending}
                        >
                          Archive
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="card-grid">
              {assets.map((asset) => (
                <article key={asset.id} className="card">
                  <header className="card__header">
                    <div>
                      <strong>{asset.name}</strong>
                      {asset.archived && <span> (Archived)</span>}
                    </div>
                    <span>{asset.type}</span>
                  </header>
                  <p>{asset.description || 'No description provided.'}</p>
                  <p>
                    <strong>Client:</strong>{' '}
                    {asset.clientId
                      ? clientsQuery.data?.find(
                          (client) => client.id === asset.clientId,
                        )?.name || '—'
                      : 'Unassigned'}
                  </p>
                  <p>
                    <strong>Tags:</strong> {asset.tags.join(', ') || 'None'}
                  </p>
                  <p>
                    <strong>Template:</strong> {asset.isTemplate ? 'Yes' : 'No'}
                  </p>
                  <div className="card__actions">
                    <button type="button" onClick={() => handleEdit(asset)}>
                      Edit
                    </button>
                    {!asset.archived && (
                      <button
                        type="button"
                        onClick={() => handleArchive(asset.id)}
                        disabled={archiveAssetMutation.isPending}
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section aria-label="asset-form-section">
        <h2>{editingAsset ? 'Edit asset' : 'Create a new asset'}</h2>
        <AssetForm
          initialValues={
            editingAsset
              ? {
                  name: editingAsset.name,
                  type: editingAsset.type,
                  description: editingAsset.description ?? '',
                  clientId: editingAsset.clientId
                    ? String(editingAsset.clientId)
                    : '',
                  tags: editingAsset.tags.join(', '),
                  isTemplate: editingAsset.isTemplate,
                }
              : undefined
          }
          onSubmit={handleSave}
          submitLabel={editingAsset ? 'Update asset' : 'Create asset'}
          isSubmitting={
            createAssetMutation.isPending || updateAssetMutation.isPending
          }
          onCancel={editingAsset ? () => setEditingAsset(null) : undefined}
          error={formError}
          clients={clientsQuery.data}
        />
      </section>
    </main>
  );
}

export default AssetsPage;
