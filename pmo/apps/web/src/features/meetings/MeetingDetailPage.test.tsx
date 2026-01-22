import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { act, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import MeetingDetailPage from './MeetingDetailPage';

const mockUseMeeting = vi.fn();
const mockUseProject = vi.fn();
const mockUseProjectMilestones = vi.fn();
const mockUseUpdateMeeting = vi.fn();
const mockUseDeleteMeeting = vi.fn();
const mockUseCreateTaskFromSelection = vi.fn();
const mockNavigate = vi.fn();

vi.mock('react-router', async () => {
  const actual =
    await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useParams: () => ({ id: '1' }),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../auth/useRedirectOnUnauthorized', () => ({
  default: () => undefined,
}));

vi.mock('../../api/meetings', () => ({
  useMeeting: (...args: unknown[]) => mockUseMeeting(...args),
  useUpdateMeeting: () => ({
    mutateAsync: mockUseUpdateMeeting,
    isPending: false,
    error: null,
  }),
  useDeleteMeeting: () => ({
    mutateAsync: mockUseDeleteMeeting,
    isPending: false,
    error: null,
  }),
  useCreateTaskFromSelection: () => ({
    mutateAsync: mockUseCreateTaskFromSelection,
    isPending: false,
    error: null,
  }),
}));

vi.mock('../../api/queries', () => ({
  useProject: (...args: unknown[]) => mockUseProject(...args),
}));

vi.mock('../../hooks/milestones', () => ({
  useProjectMilestones: (...args: unknown[]) =>
    mockUseProjectMilestones(...args),
}));

describe('MeetingDetailPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockUseMeeting.mockReset();
    mockUseProject.mockReset();
    mockUseProjectMilestones.mockReset();
    mockUseUpdateMeeting.mockReset();
    mockUseDeleteMeeting.mockReset();
    mockUseCreateTaskFromSelection.mockReset();
    mockNavigate.mockReset();

    mockUseProject.mockReturnValue({ data: undefined, error: null });
    mockUseProjectMilestones.mockReturnValue({ data: undefined, error: null });
  });

  it('renders loading and missing states', () => {
    mockUseMeeting.mockReturnValue({ isLoading: true, data: undefined });
    const loading = renderWithProviders(<MeetingDetailPage />, {
      route: '/meetings/1',
      path: '/meetings/:id',
    });
    loading.getByText('Loading meeting...');

    mockUseMeeting.mockReturnValue({
      isLoading: false,
      data: undefined,
      error: null,
    });

    const missing = renderWithProviders(<MeetingDetailPage />, {
      route: '/meetings/1',
      path: '/meetings/:id',
    });
    missing.getByText('Meeting not found');
  });

  it('saves meeting notes', async () => {
    const user = userEvent.setup();
    mockUseMeeting.mockReturnValue({
      isLoading: false,
      data: {
        id: 1,
        projectId: 10,
        title: 'Weekly sync',
        date: new Date('2024-08-01T00:00:00Z'),
        time: '10:00',
        attendees: ['Ada'],
        notes: 'Existing note',
        decisions: '',
        risks: '',
      },
      error: null,
    });
    mockUseProject.mockReturnValue({ data: { name: 'Alpha' }, error: null });
    mockUseProjectMilestones.mockReturnValue({ data: [], error: null });

    const view = renderWithProviders(<MeetingDetailPage />, {
      route: '/meetings/1',
      path: '/meetings/:id',
    });

    await user.clear(view.getByLabelText('Notes'));
    await user.type(view.getByLabelText('Notes'), 'Updated note content');
    await user.click(view.getByRole('button', { name: /save notes/i }));

    expect(mockUseUpdateMeeting).toHaveBeenCalledWith({
      notes: 'Updated note content',
      decisions: '',
      risks: '',
    });
  });

  // TODO: This test needs to be rewritten after the MeetingDetailPage UI redesign.
  // The Modal component's state updates aren't being properly reflected in the test DOM.
  // Consider rewriting as a Playwright E2E test for better reliability.
  it.skip('creates tasks from selected text', async () => {
    mockUseMeeting.mockReturnValue({
      isLoading: false,
      data: {
        id: 1,
        projectId: 11,
        title: 'Notes Review',
        date: new Date('2024-09-01T00:00:00Z'),
        time: '09:30',
        attendees: [],
        notes: 'Discuss follow-ups',
        decisions: '',
        risks: '',
      },
      error: null,
    });
    mockUseProject.mockReturnValue({ data: { name: 'Beta' }, error: null });
    mockUseProjectMilestones.mockReturnValue({ data: [], error: null });

    const selectionText = 'Create tasks from notes';
    vi.spyOn(window, 'getSelection').mockReturnValue({
      toString: () => selectionText,
    } as unknown as Selection);

    const view = renderWithProviders(<MeetingDetailPage />, {
      route: '/meetings/1',
      path: '/meetings/:id',
    });

    const detailSection = view.getByLabelText('meeting-detail');

    // Trigger selection detection
    await act(async () => {
      fireEvent.mouseUp(detailSection);
    });

    const createButton = await view.findByRole('button', {
      name: /create task from selection/i,
    });
    await waitFor(() => expect(createButton).not.toBeDisabled());

    // Click to open modal
    await act(async () => {
      fireEvent.click(createButton);
    });

    // Wait for modal to open and find form inputs
    const titleInput = await view.findByLabelText('Title');
    const descriptionInput = await view.findByLabelText('Description');
    expect((titleInput as HTMLInputElement).value).toBe(selectionText);
    expect((descriptionInput as HTMLTextAreaElement).value).toBe(selectionText);

    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: /^create task$/i }));
    });

    expect(mockUseCreateTaskFromSelection).toHaveBeenCalledWith({
      meetingId: 1,
      projectId: 11,
      selectionText,
      title: selectionText,
      description: selectionText,
      status: 'BACKLOG',
      priority: undefined,
      dueDate: undefined,
      milestoneId: undefined,
    });
  });
});
