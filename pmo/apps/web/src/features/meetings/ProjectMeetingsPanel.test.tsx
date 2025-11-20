import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/utils';
import ProjectMeetingsPanel from './ProjectMeetingsPanel';

const mockUseProjectMeetings = vi.fn();
const mockUseCreateMeeting = vi.fn();
const mockUseUpdateMeeting = vi.fn();
const mockUseDeleteMeeting = vi.fn();

vi.mock('../../auth/useRedirectOnUnauthorized', () => ({
  default: () => undefined,
}));

vi.mock('../../api/meetings', () => ({
  useProjectMeetings: (...args: unknown[]) => mockUseProjectMeetings(...args),
  useCreateMeeting: () => ({
    mutateAsync: mockUseCreateMeeting,
    isPending: false,
    error: null,
  }),
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
}));

describe('ProjectMeetingsPanel', () => {
  beforeEach(() => {
    mockUseProjectMeetings.mockReset();
    mockUseCreateMeeting.mockReset();
    mockUseUpdateMeeting.mockReset();
    mockUseDeleteMeeting.mockReset();
  });

  it('shows loading and empty states', () => {
    mockUseProjectMeetings.mockReturnValue({
      isLoading: true,
      data: undefined,
    });
    const loading = renderWithProviders(<ProjectMeetingsPanel projectId={1} />);
    loading.getByText('Loading meetings...');

    const noData: unknown[] = [];
    mockUseProjectMeetings.mockReturnValue({
      isLoading: false,
      data: noData,
      error: null,
    });

    const empty = renderWithProviders(<ProjectMeetingsPanel projectId={1} />);
    empty.getByText(
      'No meetings yet. Create the first one to capture decisions.',
    );
  });

  it('opens the modal and submits create meeting requests', async () => {
    mockUseProjectMeetings.mockReturnValue({
      isLoading: false,
      data: [],
      error: null,
    });

    const user = userEvent.setup();
    const view = renderWithProviders(<ProjectMeetingsPanel projectId={42} />);

    await user.click(view.getByRole('button', { name: /schedule meeting/i }));

    await user.type(view.getByLabelText('Title'), 'Sprint planning');
    await user.type(view.getByLabelText('Date'), '2024-12-01');
    await user.type(view.getByLabelText('Time'), '09:00');
    await user.type(view.getByLabelText('Attendees'), 'Alice, Bob');

    await user.click(view.getByRole('button', { name: /save/i }));

    expect(mockUseCreateMeeting).toHaveBeenCalledWith({
      projectId: 42,
      title: 'Sprint planning',
      date: new Date('2024-12-01'),
      time: '09:00',
      attendees: ['Alice', 'Bob'],
      notes: '',
      decisions: '',
      risks: '',
    });
  });
});
