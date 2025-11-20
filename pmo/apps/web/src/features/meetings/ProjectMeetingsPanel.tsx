import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
import {
  useCreateMeeting,
  useDeleteMeeting,
  useProjectMeetings,
  useUpdateMeeting,
  type Meeting,
} from '../../api/meetings';
import MeetingFormModal, { type MeetingFormValues } from './MeetingFormModal';

interface ProjectMeetingsPanelProps {
  projectId?: number;
}

const defaultFormValues: MeetingFormValues = {
  title: '',
  date: '',
  time: '',
  attendees: '',
  notes: '',
  decisions: '',
  risks: '',
};

const toFormValues = (meeting: Meeting): MeetingFormValues => ({
  title: meeting.title,
  date: meeting.date ? meeting.date.toISOString().slice(0, 10) : '',
  time: meeting.time,
  attendees: meeting.attendees.join(', '),
  notes: meeting.notes ?? '',
  decisions: meeting.decisions ?? '',
  risks: meeting.risks ?? '',
});

const normalizeAttendees = (value: string) =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

function ProjectMeetingsPanel({
  projectId,
}: ProjectMeetingsPanelProps): JSX.Element {
  const meetingsQuery = useProjectMeetings(projectId);
  const meetings = useMemo(
    () => meetingsQuery.data ?? [],
    [meetingsQuery.data],
  );
  const [showModal, setShowModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [modalValues, setModalValues] =
    useState<MeetingFormValues>(defaultFormValues);

  const createMeetingMutation = useCreateMeeting();
  const updateMeetingMutation = useUpdateMeeting(editingMeeting?.id ?? 0);
  const deleteMeetingMutation = useDeleteMeeting(projectId);

  useRedirectOnUnauthorized(meetingsQuery.error);
  useRedirectOnUnauthorized(createMeetingMutation.error);
  useRedirectOnUnauthorized(updateMeetingMutation.error);
  useRedirectOnUnauthorized(deleteMeetingMutation.error);

  const handleOpenCreate = () => {
    setEditingMeeting(null);
    setModalValues(defaultFormValues);
    setFormError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (meeting: Meeting) => {
    setEditingMeeting(meeting);
    setModalValues(toFormValues(meeting));
    setFormError(null);
    setShowModal(true);
  };

  const handleDelete = async (meetingId: number) => {
    const confirmed = window.confirm('Delete this meeting?');
    if (!confirmed) {
      return;
    }

    try {
      await deleteMeetingMutation.mutateAsync(meetingId);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to delete meeting';
      setFormError(message);
    }
  };

  const handleSubmit = async (values: MeetingFormValues) => {
    if (!projectId) {
      return;
    }

    setFormError(null);

    const payload = {
      projectId,
      title: values.title,
      date: new Date(values.date),
      time: values.time,
      attendees: normalizeAttendees(values.attendees),
      notes: values.notes ?? undefined,
      decisions: values.decisions ?? undefined,
      risks: values.risks ?? undefined,
    };

    try {
      if (editingMeeting) {
        await updateMeetingMutation.mutateAsync(payload);
      } else {
        await createMeetingMutation.mutateAsync(payload);
      }
      setShowModal(false);
      setEditingMeeting(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to save meeting';
      setFormError(message);
    }
  };

  return (
    <section aria-label="project-meetings">
      <header className="section-header">
        <div>
          <h2>Meetings</h2>
          <p>Track meeting notes, decisions, and risks.</p>
        </div>
        <button type="button" onClick={handleOpenCreate}>
          Schedule meeting
        </button>
      </header>

      {meetingsQuery.isLoading && <p>Loading meetings...</p>}
      {meetingsQuery.error && (
        <p role="alert">
          Unable to load meetings: {meetingsQuery.error.message}
        </p>
      )}

      {!meetingsQuery.isLoading && meetings.length === 0 && (
        <p>No meetings yet. Create the first one to capture decisions.</p>
      )}

      <div className="card-grid">
        {meetings.map((meeting) => (
          <article key={meeting.id} className="card">
            <header className="card__header">
              <div>
                <h3>{meeting.title}</h3>
                <p>
                  {meeting.date.toLocaleDateString()} at {meeting.time}
                </p>
              </div>
              <div className="card__actions">
                <Link to={`/meetings/${meeting.id}`}>View</Link>
                <button type="button" onClick={() => handleOpenEdit(meeting)}>
                  Edit
                </button>
                <button type="button" onClick={() => handleDelete(meeting.id)}>
                  Delete
                </button>
              </div>
            </header>
            <p>
              <strong>Attendees:</strong>{' '}
              {meeting.attendees.length > 0
                ? meeting.attendees.join(', ')
                : 'Not set'}
            </p>
            <p>
              <strong>Notes:</strong> {meeting.notes || 'No notes yet'}
            </p>
            <p>
              <strong>Decisions:</strong>{' '}
              {meeting.decisions || 'No decisions yet'}
            </p>
            <p>
              <strong>Risks:</strong> {meeting.risks || 'No risks yet'}
            </p>
          </article>
        ))}
      </div>

      <MeetingFormModal
        isOpen={showModal}
        heading={editingMeeting ? 'Edit meeting' : 'New meeting'}
        initialValues={modalValues}
        onSubmit={handleSubmit}
        onCancel={() => {
          setShowModal(false);
          setEditingMeeting(null);
        }}
        isSubmitting={
          createMeetingMutation.isPending || updateMeetingMutation.isPending
        }
        error={formError}
      />
    </section>
  );
}

export default ProjectMeetingsPanel;
