import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Edit,
  FileText,
  Loader2,
  MessageSquare,
  Trash2,
  Users,
  Sparkles,
  CheckSquare,
  FolderKanban,
} from 'lucide-react';

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
import { RAIDExtractionModal } from '../raid';
import {
  useExtractRAID,
  useAcceptExtractedItems,
} from '../raid/hooks/useRAIDData';
import type { ExtractedRAIDItem } from '../raid/types';
import { Button } from '../../ui/Button';
import { Textarea } from '../../ui/Textarea';
import { Input } from '../../ui/Input';
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Badge } from '../../ui/Badge';
import { Modal } from '../../ui/Modal';
import { Select } from '../../ui/Select';

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

  // RAID extraction state
  const [showRAIDModal, setShowRAIDModal] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedRAIDItem[]>([]);
  const extractRAIDMutation = useExtractRAID();
  const acceptExtractedItemsMutation = useAcceptExtractedItems();

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

  /**
   * Extract RAID items from meeting notes using AI
   */
  const handleExtractRAID = async () => {
    if (!meeting) {
      return;
    }

    try {
      const result = await extractRAIDMutation.mutateAsync({
        meetingId: meeting.id,
      });
      if (result.extractedItems && result.extractedItems.length > 0) {
        setExtractedItems(result.extractedItems);
        setShowRAIDModal(true);
      } else {
        setToast('No RAID items found in meeting notes');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to extract RAID items';
      setDetailError(message);
    }
  };

  /**
   * Accept extracted RAID items and add them to the project RAID log
   */
  const handleAcceptRAIDItems = async (items: ExtractedRAIDItem[]) => {
    if (!meeting) {
      return;
    }

    try {
      const result = await acceptExtractedItemsMutation.mutateAsync({
        projectId: meeting.projectId,
        items,
      });
      setShowRAIDModal(false);
      setExtractedItems([]);

      const successCount = result.created.length;
      const failCount = result.failed.length;

      if (failCount > 0) {
        setToast(
          `Added ${successCount} RAID item${successCount !== 1 ? 's' : ''}, ${failCount} failed`,
        );
      } else {
        setToast(
          `Added ${successCount} RAID item${successCount !== 1 ? 's' : ''} to project`,
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to save RAID items';
      setDetailError(message);
    }
  };

  if (Number.isNaN(meetingId)) {
    return (
      <div className="page-content">
        <Card className="border-danger-200 dark:border-danger-800">
          <CardBody>
            <p className="text-danger-600 dark:text-danger-400">
              Invalid meeting ID
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (meetingQuery.isLoading) {
    return (
      <div className="page-content flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-neutral-600 dark:text-neutral-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading meeting...</span>
        </div>
      </div>
    );
  }

  if (meetingQuery.error) {
    return (
      <div className="page-content">
        <Card className="border-danger-200 dark:border-danger-800">
          <CardBody>
            <p role="alert" className="text-danger-600 dark:text-danger-400">
              Unable to load meeting: {meetingQuery.error.message}
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="page-content">
        <Card>
          <CardBody>
            <p className="text-neutral-600 dark:text-neutral-400">
              Meeting not found
            </p>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-content" onMouseUp={handleSelectionChange}>
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-success-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in-right">
          <CheckSquare className="w-5 h-5" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <Link
          to={`/projects/${meeting.projectId}`}
          className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to project
        </Link>

        <Card>
          <CardBody>
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/50">
                    <MessageSquare className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                      {meeting.title}
                    </h1>
                    {projectQuery.data && (
                      <Link
                        to={`/projects/${meeting.projectId}`}
                        className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400"
                      >
                        <span className="flex items-center gap-1">
                          <FolderKanban className="w-3.5 h-3.5" />
                          {projectQuery.data.name}
                        </span>
                      </Link>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                    <Calendar className="w-4 h-4" />
                    <span>{meeting.date.toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                    <Clock className="w-4 h-4" />
                    <span>{meeting.time}</span>
                  </div>
                  {meeting.attendees.length > 0 && (
                    <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400">
                      <Users className="w-4 h-4" />
                      <span>
                        {meeting.attendees.length} attendee
                        {meeting.attendees.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>

                {meeting.attendees.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {meeting.attendees.map((attendee, idx) => (
                      <Badge key={idx} variant="secondary">
                        {attendee}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditModal(true)}
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="text-danger-600 hover:text-danger-700 hover:border-danger-300 dark:text-danger-400 dark:hover:text-danger-300"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
                {projectQuery.data && (
                  <GenerateFromMeetingButton
                    meetingId={meeting.id}
                    meetingTitle={meeting.title}
                    projectId={meeting.projectId}
                    clientId={projectQuery.data.clientId}
                  />
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Meeting Notes Form */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50">
              <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Meeting Content
            </h2>
          </div>
        </CardHeader>
        <CardBody>
          <form onSubmit={handleSaveDetails} className="space-y-6">
            <Textarea
              label="Notes"
              id="meeting-notes"
              value={detailValues.notes}
              onChange={(event) =>
                setDetailValues((prev) => ({
                  ...prev,
                  notes: event.target.value,
                }))
              }
              rows={8}
              placeholder="Enter meeting notes, discussion points, and key takeaways..."
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Textarea
                label="Decisions"
                id="meeting-decisions"
                value={detailValues.decisions}
                onChange={(event) =>
                  setDetailValues((prev) => ({
                    ...prev,
                    decisions: event.target.value,
                  }))
                }
                rows={5}
                placeholder="List key decisions made during the meeting..."
              />

              <Textarea
                label="Risks"
                id="meeting-risks"
                value={detailValues.risks}
                onChange={(event) =>
                  setDetailValues((prev) => ({
                    ...prev,
                    risks: event.target.value,
                  }))
                }
                rows={5}
                placeholder="Document any identified risks or concerns..."
              />
            </div>

            {detailError && (
              <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
                <p
                  role="alert"
                  className="text-sm text-danger-600 dark:text-danger-400"
                >
                  {detailError}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
              <Button type="submit" disabled={updateMeetingMutation.isPending}>
                {updateMeetingMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Notes'
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleExtractRAID}
                disabled={
                  extractRAIDMutation.isPending ||
                  (!detailValues.notes.trim() &&
                    !detailValues.decisions.trim() &&
                    !detailValues.risks.trim())
                }
              >
                {extractRAIDMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Extract RAID Items
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Create Task from Selection */}
      <Card className="border-emerald-200 dark:border-emerald-800">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
              <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                Create Task from Selection
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Highlight text in the notes above and convert it to a task
              </p>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700">
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">
                Selected text:
              </p>
              <p className="text-neutral-900 dark:text-neutral-100 min-h-[40px]">
                {selectionText || (
                  <span className="text-neutral-400 dark:text-neutral-500 italic">
                    Select text from the meeting content to enable task creation
                  </span>
                )}
              </p>
            </div>
            <Button
              onClick={() => {
                setShowTaskModal(true);
                setTaskFormValues((prev) => ({
                  ...prev,
                  title: selectionText,
                  description: selectionText,
                }));
              }}
              disabled={!selectionText}
              variant="outline"
            >
              <CheckSquare className="w-4 h-4" />
              Create Task from Selection
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Edit Meeting Modal */}
      <MeetingFormModal
        isOpen={showEditModal}
        heading="Edit meeting"
        initialValues={editValues}
        onSubmit={handleEditMeeting}
        onCancel={() => setShowEditModal(false)}
        isSubmitting={updateMeetingMutation.isPending}
        error={detailError}
      />

      {/* Create Task Modal */}
      <Modal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title="Create Task from Selection"
        size="medium"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <Input
            label="Title"
            id="task-title"
            value={taskFormValues.title}
            onChange={(event) =>
              setTaskFormValues((prev) => ({
                ...prev,
                title: event.target.value,
              }))
            }
            required
            placeholder="Enter task title"
          />

          <Textarea
            label="Description"
            id="task-description"
            value={taskFormValues.description}
            onChange={(event) =>
              setTaskFormValues((prev) => ({
                ...prev,
                description: event.target.value,
              }))
            }
            rows={3}
            placeholder="Enter task description"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              id="task-status"
              value={taskFormValues.status}
              onChange={(event) =>
                setTaskFormValues((prev) => ({
                  ...prev,
                  status: event.target.value as (typeof TASK_STATUSES)[number],
                }))
              }
            >
              {TASK_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replace('_', ' ')}
                </option>
              ))}
            </Select>

            <Select
              label="Priority"
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
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Due Date"
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

            <Select
              label="Milestone"
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
            </Select>
          </div>

          {taskError && (
            <div className="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
              <p
                role="alert"
                className="text-sm text-danger-600 dark:text-danger-400"
              >
                {taskError}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowTaskModal(false)}
              disabled={createTaskFromSelectionMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createTaskFromSelectionMutation.isPending}
            >
              {createTaskFromSelectionMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Task'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      <RAIDExtractionModal
        isOpen={showRAIDModal}
        onClose={() => setShowRAIDModal(false)}
        extractedItems={extractedItems}
        onAccept={handleAcceptRAIDItems}
        isAccepting={acceptExtractedItemsMutation.isPending}
        meetingTitle={meeting?.title}
      />
    </div>
  );
}

export default MeetingDetailPage;
