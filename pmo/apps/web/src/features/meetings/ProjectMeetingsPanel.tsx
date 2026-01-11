import React, { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Plus,
  Calendar,
  Users,
  Clock,
  Eye,
  Pencil,
  Trash2,
  MoreVertical,
  MessageSquare,
} from 'lucide-react';

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
import { Card, CardBody, CardHeader } from '../../ui/Card';
import { Button } from '../../ui/Button';

interface ProjectMeetingsPanelProps {
  projectId?: number;
}

// Style configuration for consistent theming
const STAT_STYLES = {
  blue: {
    iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  neutral: {
    iconBg: 'bg-neutral-100 dark:bg-neutral-800',
    iconColor: 'text-neutral-600 dark:text-neutral-400',
  },
} as const;

// Section header with icon in colored background
interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  variant?: keyof typeof STAT_STYLES;
  action?: React.ReactNode;
}

function SectionHeader({
  icon,
  title,
  description,
  variant = 'neutral',
  action,
}: SectionHeaderProps): JSX.Element {
  const styles = STAT_STYLES[variant];

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className={`flex items-center justify-center w-10 h-10 rounded-lg ${styles.iconBg}`}
        >
          <div className={styles.iconColor}>{icon}</div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// Empty state component
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-col items-center text-center py-12 px-4">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-800 mb-4">
        <div className="text-neutral-400 dark:text-neutral-500">{icon}</div>
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-neutral-500 dark:text-neutral-400 max-w-md mb-6">
        {description}
      </p>
      {action}
    </div>
  );
}

// Table skeleton loader
function TableSkeleton(): JSX.Element {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
          <tr>
            <th className="px-4 py-3 text-left">
              <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            </th>
            <th className="px-4 py-3 text-left hidden sm:table-cell">
              <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            </th>
            <th className="px-4 py-3 text-left hidden md:table-cell">
              <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            </th>
            <th className="px-4 py-3 text-right">
              <div className="h-4 w-8 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse ml-auto" />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
          {[...Array(3)].map((_, i) => (
            <tr key={i}>
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
                  <div>
                    <div className="h-5 w-48 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse mb-2" />
                    <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                  </div>
                </div>
              </td>
              <td className="px-4 py-4 hidden sm:table-cell">
                <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
              </td>
              <td className="px-4 py-4 hidden md:table-cell">
                <div className="h-4 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
              </td>
              <td className="px-4 py-4">
                <div className="h-8 w-8 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse ml-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Action menu for meeting items
interface ActionMenuProps {
  meetingId: number;
  onEdit: () => void;
  onDelete: () => void;
}

function ActionMenu({
  meetingId,
  onEdit,
  onDelete,
}: ActionMenuProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-2 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        aria-label="Open actions menu"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-1 z-20">
          <Link
            to={`/meetings/${meetingId}`}
            className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            <Eye className="h-4 w-4" />
            View Details
          </Link>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onEdit();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
              onDelete();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
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
      // Use || to convert empty strings to undefined (not sent in request)
      notes: values.notes || undefined,
      decisions: values.decisions || undefined,
      risks: values.risks || undefined,
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

  // Loading state with skeleton
  if (meetingsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <SectionHeader
              icon={<Calendar className="h-5 w-5" />}
              title="Meetings"
              description="Track meeting notes, decisions, and risks."
              variant="blue"
              action={
                <Button onClick={handleOpenCreate} disabled>
                  <Plus className="w-5 h-5" />
                  New Meeting
                </Button>
              }
            />
          </CardHeader>
          <CardBody>
            <TableSkeleton />
          </CardBody>
        </Card>
      </div>
    );
  }

  // Error state
  if (meetingsQuery.error) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <SectionHeader
              icon={<Calendar className="h-5 w-5" />}
              title="Meetings"
              description="Track meeting notes, decisions, and risks."
              variant="blue"
            />
          </CardHeader>
          <CardBody>
            <EmptyState
              icon={<Calendar className="h-8 w-8" />}
              title="Unable to load meetings"
              description={`Error: ${meetingsQuery.error.message}`}
              action={
                <Button
                  variant="secondary"
                  onClick={() => meetingsQuery.refetch()}
                >
                  Retry
                </Button>
              }
            />
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <SectionHeader
            icon={<Calendar className="h-5 w-5" />}
            title="Meetings"
            description="Track meeting notes, decisions, and risks."
            variant="blue"
            action={
              <Button onClick={handleOpenCreate}>
                <Plus className="w-5 h-5" />
                New Meeting
              </Button>
            }
          />
        </CardHeader>
        <CardBody>
          {meetings.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="h-8 w-8" />}
              title="No meetings yet"
              description={
                EMPTY_STATES.noMeetings +
                ' Schedule meetings to track discussions, decisions, and action items.'
              }
              action={
                <Button onClick={handleOpenCreate}>
                  <Plus className="w-5 h-5" />
                  Schedule First Meeting
                </Button>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Meeting
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden sm:table-cell">
                      Date & Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hidden md:table-cell">
                      Attendees
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                  {meetings.map((meeting) => (
                    <tr
                      key={meeting.id}
                      className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group"
                    >
                      <td className="px-4 py-4">
                        <Link to={`/meetings/${meeting.id}`} className="block">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex-shrink-0">
                              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-neutral-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                                {meeting.title}
                              </div>
                              {meeting.notes && (
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate max-w-xs">
                                  {meeting.notes.substring(0, 60)}
                                  {meeting.notes.length > 60 ? '...' : ''}
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-4 hidden sm:table-cell">
                        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                          <Clock className="h-4 w-4" />
                          <div>
                            <div>{meeting.date.toLocaleDateString()}</div>
                            <div className="text-xs">{meeting.time}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                          <Users className="h-4 w-4" />
                          <span className="truncate max-w-[150px]">
                            {meeting.attendees.length > 0
                              ? meeting.attendees.join(', ')
                              : EMPTY_STATES.notProvided}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <ActionMenu
                          meetingId={meeting.id}
                          onEdit={() => handleOpenEdit(meeting)}
                          onDelete={() => handleDelete(meeting.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
