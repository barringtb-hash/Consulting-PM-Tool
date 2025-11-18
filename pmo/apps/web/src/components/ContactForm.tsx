import { useEffect, useState } from 'react';

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
  error,
}: ContactFormProps): JSX.Element {
  const [values, setValues] = useState<ContactFormValues>({
    ...defaultValues,
    ...initialValues,
  });

  useEffect(() => {
    setValues({ ...defaultValues, ...initialValues });
  }, [initialValues]);

  const handleChange = (field: keyof ContactFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit} aria-label="contact-form">
      <div>
        <label htmlFor="contact-name">Name</label>
        <input
          id="contact-name"
          name="name"
          value={values.name}
          onChange={(event) => handleChange('name', event.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="contact-email">Email</label>
        <input
          id="contact-email"
          name="email"
          type="email"
          value={values.email}
          onChange={(event) => handleChange('email', event.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="contact-role">Role</label>
        <input
          id="contact-role"
          name="role"
          value={values.role}
          onChange={(event) => handleChange('role', event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="contact-phone">Phone</label>
        <input
          id="contact-phone"
          name="phone"
          value={values.phone}
          onChange={(event) => handleChange('phone', event.target.value)}
        />
      </div>
      <div>
        <label htmlFor="contact-notes">Notes</label>
        <textarea
          id="contact-notes"
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

export default ContactForm;
