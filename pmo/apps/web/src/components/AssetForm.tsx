import { useEffect, useState } from 'react';
import { type AssetPayload, type AssetType } from '../api/assets';
import { type Client } from '../api/clients';

export interface AssetFormValues {
  name: string;
  type: AssetType | '';
  description: string;
  clientId: string;
  tags: string;
  isTemplate: boolean;
}

interface AssetFormProps {
  initialValues?: Partial<AssetFormValues>;
  onSubmit: (values: AssetFormValues) => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  onCancel?: () => void;
  error?: string | null;
  clients?: Client[];
  disableClientSelection?: boolean;
}

const assetTypeOptions: AssetType[] = [
  'PROMPT_TEMPLATE',
  'WORKFLOW',
  'DATASET',
  'EVALUATION',
  'GUARDRAIL',
];

const defaultValues: AssetFormValues = {
  name: '',
  type: '',
  description: '',
  clientId: '',
  tags: '',
  isTemplate: false,
};

function AssetForm({
  initialValues,
  onSubmit,
  submitLabel = 'Save asset',
  isSubmitting,
  onCancel,
  error,
  clients,
  disableClientSelection,
}: AssetFormProps): JSX.Element {
  const [values, setValues] = useState<AssetFormValues>({
    ...defaultValues,
    ...initialValues,
  });

  useEffect(() => {
    setValues({ ...defaultValues, ...initialValues });
  }, [initialValues]);

  const handleChange = (
    field: keyof AssetFormValues,
    value: string | boolean,
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} aria-label="asset-form" className="stack">
      <div>
        <label htmlFor="asset-name">Name</label>
        <input
          id="asset-name"
          name="name"
          value={values.name}
          onChange={(event) => handleChange('name', event.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="asset-type">Type</label>
        <select
          id="asset-type"
          name="type"
          value={values.type}
          onChange={(event) => handleChange('type', event.target.value)}
          required
        >
          <option value="">Select a type</option>
          {assetTypeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="asset-client">Client (optional)</label>
        <select
          id="asset-client"
          name="clientId"
          value={values.clientId}
          onChange={(event) => handleChange('clientId', event.target.value)}
          disabled={disableClientSelection}
        >
          <option value="">Unassigned</option>
          {clients?.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="asset-description">Description</label>
        <textarea
          id="asset-description"
          name="description"
          value={values.description}
          onChange={(event) => handleChange('description', event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="asset-tags">Tags (comma separated)</label>
        <input
          id="asset-tags"
          name="tags"
          value={values.tags}
          onChange={(event) => handleChange('tags', event.target.value)}
          placeholder="e.g. onboarding, safety, api"
        />
      </div>
      <label>
        <input
          type="checkbox"
          checked={values.isTemplate}
          onChange={(event) => handleChange('isTemplate', event.target.checked)}
        />
        Save as reusable template
      </label>
      {error && (
        <p role="alert" aria-live="assertive">
          {error}
        </p>
      )}
      <div>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default AssetForm;

export function assetFormValuesToPayload(
  values: AssetFormValues,
): AssetPayload {
  const tags = values.tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  return {
    name: values.name.trim(),
    type: values.type as AssetType,
    description: values.description.trim() || undefined,
    clientId: values.clientId ? Number(values.clientId) : null,
    tags,
    isTemplate: values.isTemplate,
  };
}
