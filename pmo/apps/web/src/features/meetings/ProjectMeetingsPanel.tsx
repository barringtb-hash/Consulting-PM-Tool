import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';

import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
import {
  useCreateMeeting,
  useDeleteMeeting,
  useProjectMeetings,
  useUpdateMeeting,
  type Meeting,
} from '../../api/meetings';
import MeetingFormModal, { type MeetingFormValues } from './MeetingFormModal';
import { EMPTY_STATES } from '../../utils/typography';
import { Card, CardBody, CardHeader, CardTitle } from '../../ui/Card';
import { Button } from '../../ui/Button';

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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Meetings</CardTitle>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                Track meeting notes, decisions, and risks.
              </p>
            </div>
            <Button onClick={handleOpenCreate}>Schedule meeting</Button>
          </div>
        </CardHeader>
        <CardBody>
          {meetingsQuery.isLoading && (
            <p className="text-neutral-600 dark:text-neutral-400">
              Loading meetings...
            </p>
          )}

          {meetingsQuery.error && (
            <p role="alert" className="text-danger-600 dark:text-danger-400">
              Unable to load meetings: {meetingsQuery.error.message}
            </p>
          )}

          {!meetingsQuery.isLoading && meetings.length === 0 && (
            <p className="text-neutral-600 dark:text-neutral-400">
              {EMPTY_STATES.noMeetings}
            </p>
          )}

          {meetings.length > 0 && (
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">
                          {meeting.title}
                        </h3>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                          {meeting.date.toLocaleDateString()} at {meeting.time}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Link to={`/meetings/${meeting.id}`}>
                          <Button variant="secondary" size="sm">
                            View
                          </Button>
                        </Link>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEdit(meeting)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(meeting.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <p>
                        <strong className="text-neutral-900 dark:text-neutral-100">
                          Attendees:
                        </strong>{' '}
                        <span className="text-neutral-700 dark:text-neutral-300">
                          {meeting.attendees.length > 0
                            ? meeting.attendees.join(', ')
                            : EMPTY_STATES.notProvided}
                        </span>
                      </p>
                      <p>
                        <strong className="text-neutral-900 dark:text-neutral-100">
                          Notes:
                        </strong>{' '}
                        <span className="text-neutral-700 dark:text-neutral-300">
                          {meeting.notes || EMPTY_STATES.noNotes}
                        </span>
                      </p>
                      <p>
                        <strong className="text-neutral-900 dark:text-neutral-100">
                          Decisions:
                        </strong>{' '}
                        <span className="text-neutral-700 dark:text-neutral-300">
                          {meeting.decisions || EMPTY_STATES.noDecisions}
                        </span>
                      </p>
                      <p>
                        <strong className="text-neutral-900 dark:text-neutral-100">
                          Risks:
                        </strong>{' '}
                        <span className="text-neutral-700 dark:text-neutral-300">
                          {meeting.risks || EMPTY_STATES.noRisks}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <MeetingFormModal
        isOpen={showModal}
        heading={editingMeeting ? 'Edit Meeting' : 'New Meeting'}
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
    </div>
  );
}

export default ProjectMeetingsPanel;
