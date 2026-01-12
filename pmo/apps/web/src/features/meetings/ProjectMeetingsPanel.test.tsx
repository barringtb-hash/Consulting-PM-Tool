import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
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
    // Loading state now shows skeleton loader, verify the header is present
    loading.getByText('Meetings');

    const noData: unknown[] = [];
    mockUseProjectMeetings.mockReturnValue({
      isLoading: false,
      data: noData,
      error: null,
    });

    const empty = renderWithProviders(<ProjectMeetingsPanel projectId={1} />);
    empty.getByText('No meetings yet');
  });

  it('opens the modal and submits create meeting requests', async () => {
    mockUseProjectMeetings.mockReturnValue({
      isLoading: false,
      data: [],
      error: null,
    });

    const user = userEvent.setup();
    const view = renderWithProviders(<ProjectMeetingsPanel projectId={42} />);

    await user.click(
      view.getByRole('button', { name: /schedule first meeting/i }),
    );

    // Wait for the modal dialog to appear (check for modal title)
    expect(
      await screen.findByRole('heading', { name: /new meeting/i }),
    ).toBeInTheDocument();

    // Fill in the form (using regex for labels that include required asterisk)
    await user.type(
      screen.getByRole('textbox', { name: /title/i }),
      'Sprint planning',
    );
    await user.type(screen.getByLabelText(/date/i), '2024-12-01');
    await user.type(screen.getByLabelText(/time/i), '09:00');
    await user.type(
      screen.getByRole('textbox', { name: /attendees/i }),
      'Alice, Bob',
    );

    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(mockUseCreateMeeting).toHaveBeenCalledWith({
      projectId: 42,
      title: 'Sprint planning',
      date: new Date('2024-12-01'),
      time: '09:00',
      attendees: ['Alice', 'Bob'],
      notes: undefined,
      decisions: undefined,
      risks: undefined,
    });
  });
});
