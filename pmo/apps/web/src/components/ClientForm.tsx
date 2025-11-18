import { useEffect, useState } from 'react';
import { AiMaturity, CompanySize } from '../api/clients';

export interface ClientFormValues {
  name: string;
  industry: string;
  companySize: CompanySize | '';
  timezone: string;
  aiMaturity: AiMaturity | '';
  notes: string;
}

interface ClientFormProps {
  initialValues?: Partial<ClientFormValues>;
  onSubmit: (values: ClientFormValues) => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  onCancel?: () => void;
  error?: string | null;
}

const defaultValues: ClientFormValues = {
  name: '',
  industry: '',
  companySize: '',
  timezone: '',
  aiMaturity: '',
  notes: '',
};

const companySizeOptions: CompanySize[] = ['MICRO', 'SMALL', 'MEDIUM'];
const aiMaturityOptions: AiMaturity[] = ['NONE', 'LOW', 'MEDIUM', 'HIGH'];

function ClientForm({
  initialValues,
  onSubmit,
  submitLabel = 'Save client',
  isSubmitting,
  onCancel,
  error,
}: ClientFormProps): JSX.Element {
  const [values, setValues] = useState<ClientFormValues>({
    ...defaultValues,
    ...initialValues,
  });

  useEffect(() => {
    setValues({ ...defaultValues, ...initialValues });
  }, [initialValues]);

  const handleChange = (
    field: keyof ClientFormValues,
    value: string | CompanySize | AiMaturity | '',
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} aria-label="client-form">
      <div>
        <label htmlFor="client-name">Name</label>
        <input
          id="client-name"
          name="name"
          value={values.name}
          onChange={(event) => handleChange('name', event.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="client-industry">Industry</label>
        <input
          id="client-industry"
          name="industry"
          value={values.industry}
          onChange={(event) => handleChange('industry', event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="client-company-size">Company size</label>
        <select
          id="client-company-size"
          name="companySize"
          value={values.companySize}
          onChange={(event) =>
            handleChange('companySize', event.target.value as CompanySize | '')
          }
        >
          <option value="">Select a size</option>
          {companySizeOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="client-timezone">Timezone</label>
        <input
          id="client-timezone"
          name="timezone"
          value={values.timezone}
          onChange={(event) => handleChange('timezone', event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="client-ai-maturity">AI maturity</label>
        <select
          id="client-ai-maturity"
          name="aiMaturity"
          value={values.aiMaturity}
          onChange={(event) =>
            handleChange('aiMaturity', event.target.value as AiMaturity | '')
          }
        >
          <option value="">Select maturity</option>
          {aiMaturityOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="client-notes">Notes</label>
        <textarea
          id="client-notes"
          name="notes"
          value={values.notes}
          onChange={(event) => handleChange('notes', event.target.value)}
        />
      </div>
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

export default ClientForm;
