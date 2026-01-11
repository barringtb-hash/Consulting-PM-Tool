import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { useProject } from '../../api/queries';
import {
  useCreateTaskFromSelection,
  useDeleteMeeting,
  useMeeting,
  useUpdateMeeting,
  type Meeting,
} from '../../api/meetings';
import { TASK_PRIORITIES, TASK_STATUSES } from '../../hooks/tasks';
import { useProjectMilestones } from '../../hooks/milestones';
import useRedirectOnUnauthorized from '../../auth/useRedirectOnUnauthorized';
import MeetingFormModal, { type MeetingFormValues } from './MeetingFormModal';
import { GenerateFromMeetingButton } from '../marketing';

interface DetailFormValues {
  notes: string;
  decisions: string;
  risks: string;
}

interface TaskFromSelectionFormValues {
  title: string;
  description: string;
  status: (typeof TASK_STATUSES)[number];
  priority: (typeof TASK_PRIORITIES)[number] | '';
  dueDate: string;
  milestoneId: string;
}

const defaultMeetingFormValues: MeetingFormValues = {
  title: '',
  date: '',
  time: '',
  attendees: '',
  notes: '',
  decisions: '',
  risks: '',
};

const defaultDetails: DetailFormValues = {
  notes: '',
  decisions: '',
  risks: '',
};

const defaultTaskForm: TaskFromSelectionFormValues = {
  title: '',
  description: '',
  status: 'BACKLOG',
  priority: '',
  dueDate: '',
  milestoneId: '',
};

const normalizeAttendees = (value: string) =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const toFormValues = (meeting: Meeting): MeetingFormValues => ({
  title: meeting.title,
  date: meeting.date ? meeting.date.toISOString().slice(0, 10) : '',
  time: meeting.time,
  attendees: meeting.attendees.join(', '),
  notes: meeting.notes ?? '',
  decisions: meeting.decisions ?? '',
  risks: meeting.risks ?? '',
});

function MeetingDetailPage(): JSX.Element {
  const { id } = useParams();
  const meetingId = useMemo(() => Number(id), [id]);
  const normalizedMeetingId = Number.isNaN(meetingId) ? 0 : meetingId;
  const navigate = useNavigate();

  const meetingQuery = useMeeting(
    Number.isNaN(meetingId) ? undefined : meetingId,
  );
  const meeting = meetingQuery.data;
  const projectQuery = useProject(meeting?.projectId);
  const milestonesQuery = useProjectMilestones(meeting?.projectId);
  const updateMeetingMutation = useUpdateMeeting(normalizedMeetingId);
  const deleteMeetingMutation = useDeleteMeeting(meeting?.projectId);
  const createTaskFromSelectionMutation = useCreateTaskFromSelection();

  const [detailValues, setDetailValues] =
    useState<DetailFormValues>(defaultDetails);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editValues, setEditValues] = useState<MeetingFormValues>(
    defaultMeetingFormValues,
  );
  const [selectionText, setSelectionText] = useState('');
  const [taskFormValues, setTaskFormValues] =
    useState<TaskFromSelectionFormValues>(defaultTaskForm);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useRedirectOnUnauthorized(meetingQuery.error);
  useRedirectOnUnauthorized(projectQuery.error);
  useRedirectOnUnauthorized(milestonesQuery.error);
  useRedirectOnUnauthorized(updateMeetingMutation.error);
  useRedirectOnUnauthorized(deleteMeetingMutation.error);
  useRedirectOnUnauthorized(createTaskFromSelectionMutation.error);

  useEffect(() => {
    if (meeting) {
      setDetailValues({
        notes: meeting.notes ?? '',
        decisions: meeting.decisions ?? '',
        risks: meeting.risks ?? '',
      });
      setEditValues(toFormValues(meeting));
    }
  }, [meeting]);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleSelectionChange = () => {
    const text = window.getSelection()?.toString().trim() ?? '';
    setSelectionText(text);
  };

  const handleSaveDetails = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!meeting) {
      return;
    }

    setDetailError(null);

    try {
      await updateMeetingMutation.mutateAsync({
        notes: detailValues.notes,
        decisions: detailValues.decisions,
        risks: detailValues.risks,
      });
      setToast('Meeting notes saved');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to update meeting';
      setDetailError(message);
    }
  };

  const handleDelete = async () => {
    if (!meeting) {
      return;
    }

    const confirmed = window.confirm('Delete this meeting?');
    if (!confirmed) {
      return;
    }

    try {
      await deleteMeetingMutation.mutateAsync(meeting.id);
      navigate(`/projects/${meeting.projectId}`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to delete meeting';
      setDetailError(message);
    }
  };

  const handleEditMeeting = async (values: MeetingFormValues) => {
    if (!meeting) {
      return;
    }

    setDetailError(null);

    try {
      await updateMeetingMutation.mutateAsync({
        projectId: meeting.projectId,
        title: values.title,
        date: values.date ? new Date(values.date) : undefined,
        time: values.time,
        attendees: normalizeAttendees(values.attendees),
        notes: values.notes ?? undefined,
        decisions: values.decisions ?? undefined,
        risks: values.risks ?? undefined,
      });
      setShowEditModal(false);
      setToast('Meeting updated');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to update meeting';
      setDetailError(message);
    }
  };

  const handleCreateTask = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!meeting) {
      return;
    }

    setTaskError(null);

    try {
      await createTaskFromSelectionMutation.mutateAsync({
        meetingId: meeting.id,
        projectId: meeting.projectId,
        selectionText,
        title: taskFormValues.title || selectionText,
        description: taskFormValues.description || selectionText,
        status: taskFormValues.status,
        priority: (taskFormValues.priority || undefined) as
          | (typeof TASK_PRIORITIES)[number]
          | undefined,
        dueDate: taskFormValues.dueDate || undefined,
        milestoneId: taskFormValues.milestoneId
          ? Number(taskFormValues.milestoneId)
          : undefined,
      });
      setShowTaskModal(false);
      setToast('Task created from selection');
      setTaskFormValues(defaultTaskForm);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to create task';
      setTaskError(message);
    }
  };

  if (Number.isNaN(meetingId)) {
    return <p>Invalid meeting id</p>;
  }

  if (meetingQuery.isLoading) {
    return <p>Loading meeting...</p>;
  }

  if (meetingQuery.error) {
    return (
      <p role="alert">Unable to load meeting: {meetingQuery.error.message}</p>
    );
  }

  if (!meeting) {
    return <p>Meeting not found</p>;
  }

  return (
    <section aria-label="meeting-detail" onMouseUp={handleSelectionChange}>
      <header className="section-header">
        <div>
          <p>
            <Link to={`/projects/${meeting.projectId}`}>
              &larr; Back to project
            </Link>
          </p>
          <h1>{meeting.title}</h1>
          <p>
            {meeting.date.toLocaleDateString()} at {meeting.time}
          </p>
          <p>
            <strong>Attendees:</strong>{' '}
            {meeting.attendees.length > 0
              ? meeting.attendees.join(', ')
              : 'Not specified'}
          </p>
          {projectQuery.data && (
            <p>
              <strong>Project:</strong> {projectQuery.data.name}
            </p>
          )}
        </div>
        <div className="card__actions">
          <button type="button" onClick={() => setShowEditModal(true)}>
            Edit meeting
          </button>
          <button type="button" onClick={handleDelete}>
            Delete meeting
          </button>
          {projectQuery.data && (
            <GenerateFromMeetingButton
              meetingId={meeting.id}
              meetingTitle={meeting.title}
              projectId={meeting.projectId}
              clientId={projectQuery.data.clientId}
            />
          )}
        </div>
      </header>

      {toast && <div className="toast">{toast}</div>}

      <form onSubmit={handleSaveDetails} className="stack">
        <div>
          <label htmlFor="meeting-notes">Notes</label>
          <textarea
            id="meeting-notes"
            value={detailValues.notes}
            onChange={(event) =>
              setDetailValues((prev) => ({
                ...prev,
                notes: event.target.value,
              }))
            }
          />
        </div>
        <div>
          <label htmlFor="meeting-decisions">Decisions</label>
          <textarea
            id="meeting-decisions"
            value={detailValues.decisions}
            onChange={(event) =>
              setDetailValues((prev) => ({
                ...prev,
                decisions: event.target.value,
              }))
            }
          />
        </div>
        <div>
          <label htmlFor="meeting-risks">Risks</label>
          <textarea
            id="meeting-risks"
            value={detailValues.risks}
            onChange={(event) =>
              setDetailValues((prev) => ({
                ...prev,
                risks: event.target.value,
              }))
            }
          />
        </div>
        {detailError && <p role="alert">{detailError}</p>}
        <div>
          <button type="submit" disabled={updateMeetingMutation.isPending}>
            Save notes
          </button>
        </div>
      </form>

      <section aria-label="selection-actions" className="stack">
        <h2>Create task from selection</h2>
        <p>
          Highlight text in the notes, decisions, or risks above and use the
          button below to convert it into a task.
        </p>
        <div className="card">
          <p>
            <strong>Selected text:</strong>{' '}
            {selectionText || 'Select text to enable task creation'}
          </p>
          <button
            type="button"
            onClick={() => {
              setShowTaskModal(true);
              setTaskFormValues((prev) => ({
                ...prev,
                title: selectionText,
                description: selectionText,
              }));
            }}
            disabled={!selectionText}
          >
            Create task from selection
          </button>
        </div>
      </section>

      <MeetingFormModal
        isOpen={showEditModal}
        heading="Edit meeting"
        initialValues={editValues}
        onSubmit={handleEditMeeting}
        onCancel={() => setShowEditModal(false)}
        isSubmitting={updateMeetingMutation.isPending}
        error={detailError}
      />

      {showTaskModal && (
        <section aria-label="task-from-selection" className="task-modal">
          <h3>Create task from selection</h3>
          <form onSubmit={handleCreateTask}>
            <div>
              <label htmlFor="task-title">Title</label>
              <input
                id="task-title"
                value={taskFormValues.title}
                onChange={(event) =>
                  setTaskFormValues((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))
                }
                required
              />
            </div>
            <div>
              <label htmlFor="task-description">Description</label>
              <textarea
                id="task-description"
                value={taskFormValues.description}
                onChange={(event) =>
                  setTaskFormValues((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label htmlFor="task-status">Status</label>
              <select
                id="task-status"
                value={taskFormValues.status}
                onChange={(event) =>
                  setTaskFormValues((prev) => ({
                    ...prev,
                    status: event.target
                      .value as (typeof TASK_STATUSES)[number],
                  }))
                }
              >
                {TASK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-priority">Priority</label>
              <select
                id="task-priority"
                value={taskFormValues.priority}
                onChange={(event) =>
                  setTaskFormValues((prev) => ({
                    ...prev,
                    priority: event.target
                      .value as TaskFromSelectionFormValues['priority'],
                  }))
                }
              >
                <option value="">Unassigned</option>
                {TASK_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-due-date">Due date</label>
              <input
                id="task-due-date"
                type="date"
                value={taskFormValues.dueDate}
                onChange={(event) =>
                  setTaskFormValues((prev) => ({
                    ...prev,
                    dueDate: event.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label htmlFor="task-milestone">Milestone</label>
              <select
                id="task-milestone"
                value={taskFormValues.milestoneId}
                onChange={(event) =>
                  setTaskFormValues((prev) => ({
                    ...prev,
                    milestoneId: event.target.value,
                  }))
                }
              >
                <option value="">Unassigned</option>
                {(milestonesQuery.data ?? []).map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>
                    {milestone.name}
                  </option>
                ))}
              </select>
            </div>
            {taskError && <p role="alert">{taskError}</p>}
            <div>
              <button
                type="submit"
                disabled={createTaskFromSelectionMutation.isPending}
              >
                Create task
              </button>
              <button
                type="button"
                onClick={() => setShowTaskModal(false)}
                disabled={createTaskFromSelectionMutation.isPending}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
    </section>
  );
}

export default MeetingDetailPage;
