import React, { useEffect, useState } from 'react';

export interface MeetingFormValues {
  title: string;
  date: string;
  time: string;
  attendees: string;
  notes: string;
  decisions: string;
  risks: string;
}

interface MeetingFormModalProps {
  isOpen: boolean;
  heading: string;
  initialValues: MeetingFormValues;
  onSubmit: (values: MeetingFormValues) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: string | null;
}

function MeetingFormModal({
  isOpen,
  heading,
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
}: MeetingFormModalProps): JSX.Element | null {
  const [values, setValues] = useState<MeetingFormValues>(initialValues);

  useEffect(() => {
    if (isOpen) {
      setValues(initialValues);
    }
  }, [initialValues, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(values);
  };

  return (
    <section aria-label="meeting-modal" className="task-modal">
      <h3>{heading}</h3>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="meeting-title">Title</label>
          <input
            id="meeting-title"
            value={values.title}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, title: event.target.value }))
            }
            required
          />
        </div>
        <div>
          <label htmlFor="meeting-date">Date</label>
          <input
            id="meeting-date"
            type="date"
            value={values.date}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, date: event.target.value }))
            }
            required
          />
        </div>
        <div>
          <label htmlFor="meeting-time">Time</label>
          <input
            id="meeting-time"
            type="time"
            value={values.time}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, time: event.target.value }))
            }
            required
          />
        </div>
        <div>
          <label htmlFor="meeting-attendees">Attendees</label>
          <input
            id="meeting-attendees"
            placeholder="Comma-separated"
            value={values.attendees}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, attendees: event.target.value }))
            }
          />
        </div>
        <div>
          <label htmlFor="meeting-notes">Notes</label>
          <textarea
            id="meeting-notes"
            value={values.notes}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, notes: event.target.value }))
            }
          />
        </div>
        <div>
          <label htmlFor="meeting-decisions">Decisions</label>
          <textarea
            id="meeting-decisions"
            value={values.decisions}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, decisions: event.target.value }))
            }
          />
        </div>
        <div>
          <label htmlFor="meeting-risks">Risks</label>
          <textarea
            id="meeting-risks"
            value={values.risks}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, risks: event.target.value }))
            }
          />
        </div>
        {error && <p role="alert">{error}</p>}
        <div>
          <button type="submit" disabled={isSubmitting}>
            Save
          </button>
          <button type="button" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}

export default MeetingFormModal;
