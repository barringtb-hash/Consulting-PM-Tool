import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { AiMaturity, CompanySize } from '../api/clients';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Textarea } from '../ui/Textarea';

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
  onBack?: () => void;
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
  onBack,
  error,
}: ClientFormProps): JSX.Element {
  const [values, setValues] = useState<ClientFormValues>({
    ...defaultValues,
    ...initialValues,
  });
  const [validationErrors, setValidationErrors] = useState<
    Partial<Record<keyof ClientFormValues, string>>
  >({});

  useEffect(() => {
    setValues({ ...defaultValues, ...initialValues });
  }, [initialValues]);

  const handleChange = (
    field: keyof ClientFormValues,
    value: string | CompanySize | AiMaturity | '',
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const errors: Partial<Record<keyof ClientFormValues, string>> = {};

    if (!values.name.trim()) {
      errors.name = 'Client name is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (validate()) {
      onSubmit(values);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="client-form"
      className="space-y-6"
    >
      <Input
        id="client-name"
        label="Name"
        value={values.name}
        onChange={(event) => handleChange('name', event.target.value)}
        required
        error={validationErrors.name}
        placeholder="e.g., Acme Corporation"
      />

      <Input
        id="client-industry"
        label="Industry"
        value={values.industry}
        onChange={(event) => handleChange('industry', event.target.value)}
        placeholder="e.g., Healthcare, Finance, Retail"
      />

      <Select
        id="client-company-size"
        label="Company Size"
        value={values.companySize}
        onChange={(event) =>
          handleChange('companySize', event.target.value as CompanySize | '')
        }
      >
        <option value="">Select a size</option>
        {companySizeOptions.map((option) => (
          <option key={option} value={option}>
            {option.charAt(0) + option.slice(1).toLowerCase()}
          </option>
        ))}
      </Select>

      <Input
        id="client-timezone"
        label="Timezone"
        value={values.timezone}
        onChange={(event) => handleChange('timezone', event.target.value)}
        placeholder="e.g., America/New_York, Europe/London"
        helperText="Helps coordinate meetings and deadlines"
      />

      <Select
        id="client-ai-maturity"
        label="AI Maturity"
        value={values.aiMaturity}
        onChange={(event) =>
          handleChange('aiMaturity', event.target.value as AiMaturity | '')
        }
        helperText="Current level of AI adoption and capability"
      >
        <option value="">Select maturity level</option>
        {aiMaturityOptions.map((option) => (
          <option key={option} value={option}>
            {option.charAt(0) + option.slice(1).toLowerCase()}
          </option>
        ))}
      </Select>

      <Textarea
        id="client-notes"
        label="Notes"
        value={values.notes}
        onChange={(event) => handleChange('notes', event.target.value)}
        placeholder="Any additional context or important details"
        className="min-h-[120px]"
      />

      {error && (
        <div
          className="p-4 rounded-lg bg-danger-50 border border-danger-200"
          role="alert"
        >
          <p className="text-sm text-danger-800">{error}</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-4">
        {onBack ? (
          <Button type="button" variant="secondary" onClick={onBack}>
            <ChevronLeft size={16} />
            Back
          </Button>
        ) : (
          <div />
        )}
        <div className="flex items-center gap-3">
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" isLoading={isSubmitting}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}

export default ClientForm;
