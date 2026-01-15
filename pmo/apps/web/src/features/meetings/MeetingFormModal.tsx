import React, { useEffect, useState } from 'react';
import { Modal } from '../../ui/Modal';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/Textarea';
import { Button } from '../../ui/Button';

export interface MeetingFormValues {
  title: string;
  date: string;
  time: string;
  attendees: string;
  notes: string;
  decisions: string;
  risks: string;
  autoExtractRAID?: boolean;
}

interface MeetingFormModalProps {
  isOpen: boolean;
  heading: string;
  initialValues: MeetingFormValues;
  onSubmit: (values: MeetingFormValues) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: string | null;
  /** Show the auto-extract RAID items option (default: false) */
  showAutoExtractOption?: boolean;
}

function MeetingFormModal({
  isOpen,
  heading,
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
  showAutoExtractOption = false,
}: MeetingFormModalProps): JSX.Element | null {
  const [values, setValues] = useState<MeetingFormValues>(initialValues);

  useEffect(() => {
    if (isOpen) {
      setValues(initialValues);
    }
  }, [initialValues, isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSubmit(values);
  };

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={heading} size="large">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Title"
          id="meeting-title"
          value={values.title}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, title: event.target.value }))
          }
          required
          placeholder="Enter meeting title"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Date"
            id="meeting-date"
            type="date"
            value={values.date}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, date: event.target.value }))
            }
            required
          />

          <Input
            label="Time"
            id="meeting-time"
            type="time"
            value={values.time}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, time: event.target.value }))
            }
            required
          />
        </div>

        <Input
          label="Attendees"
          id="meeting-attendees"
          placeholder="Enter names separated by commas"
          value={values.attendees}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, attendees: event.target.value }))
          }
        />

        <Textarea
          label="Notes"
          id="meeting-notes"
          value={values.notes}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, notes: event.target.value }))
          }
          rows={3}
          placeholder="Meeting notes and discussion points..."
        />

        <Textarea
          label="Decisions"
          id="meeting-decisions"
          value={values.decisions}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, decisions: event.target.value }))
          }
          rows={3}
          placeholder="Key decisions made during the meeting..."
        />

        <Textarea
          label="Risks"
          id="meeting-risks"
          value={values.risks}
          onChange={(event) =>
            setValues((prev) => ({ ...prev, risks: event.target.value }))
          }
          rows={3}
          placeholder="Identified risks or concerns..."
        />

        {showAutoExtractOption && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={values.autoExtractRAID ?? false}
              onChange={(event) =>
                setValues((prev) => ({
                  ...prev,
                  autoExtractRAID: event.target.checked,
                }))
              }
              className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-700 dark:focus:ring-primary-400"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">
              Auto-extract RAID items after saving
            </span>
          </label>
        )}

        {error && (
          <p
            role="alert"
            className="text-sm text-danger-600 dark:text-danger-400"
          >
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Meeting'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default MeetingFormModal;
