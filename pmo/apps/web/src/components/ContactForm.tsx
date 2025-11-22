import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';

export interface ContactFormValues {
  name: string;
  email: string;
  role: string;
  phone: string;
  notes: string;
}

interface ContactFormProps {
  initialValues?: Partial<ContactFormValues>;
  onSubmit: (values: ContactFormValues) => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  onCancel?: () => void;
  onBack?: () => void;
  error?: string | null;
}

const defaultValues: ContactFormValues = {
  name: '',
  email: '',
  role: '',
  phone: '',
  notes: '',
};

function ContactForm({
  initialValues,
  onSubmit,
  submitLabel = 'Save contact',
  isSubmitting,
  onCancel,
  onBack,
  error,
}: ContactFormProps): JSX.Element {
  const [values, setValues] = useState<ContactFormValues>({
    ...defaultValues,
    ...initialValues,
  });
  const [validationErrors, setValidationErrors] = useState<
    Partial<Record<keyof ContactFormValues, string>>
  >({});

  useEffect(() => {
    setValues({ ...defaultValues, ...initialValues });
  }, [initialValues]);

  const handleChange = (field: keyof ContactFormValues, value: string) => {
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
    const errors: Partial<Record<keyof ContactFormValues, string>> = {};

    if (!values.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!values.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      errors.email = 'Please enter a valid email address';
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
      aria-label="contact-form"
      className="space-y-6"
    >
      <Input
        id="contact-name"
        label="Name"
        value={values.name}
        onChange={(event) => handleChange('name', event.target.value)}
        required
        error={validationErrors.name}
        placeholder="e.g., John Smith"
      />

      <Input
        id="contact-email"
        label="Email"
        type="email"
        value={values.email}
        onChange={(event) => handleChange('email', event.target.value)}
        required
        error={validationErrors.email}
        placeholder="e.g., john.smith@company.com"
      />

      <Input
        id="contact-role"
        label="Role"
        value={values.role}
        onChange={(event) => handleChange('role', event.target.value)}
        placeholder="e.g., CTO, VP of Product"
      />

      <Input
        id="contact-phone"
        label="Phone"
        type="tel"
        value={values.phone}
        onChange={(event) => handleChange('phone', event.target.value)}
        placeholder="e.g., +1 (555) 123-4567"
      />

      <Textarea
        id="contact-notes"
        label="Notes"
        value={values.notes}
        onChange={(event) => handleChange('notes', event.target.value)}
        placeholder="Any additional context about this contact"
        className="min-h-[100px]"
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
              {onBack ? 'Skip' : 'Cancel'}
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

export default ContactForm;
