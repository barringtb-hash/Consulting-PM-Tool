import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './utils';
import ClientIntakePage from '../pages/ClientIntakePage';

const mockMutateAsync = vi.fn();
const mockNavigate = vi.fn();

vi.mock('../api/queries', () => ({
  useCreateClient: vi.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
    error: null,
  })),
  useCreateContact: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
    error: null,
  })),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../auth/useRedirectOnUnauthorized', () => ({
  default: vi.fn(),
}));

vi.mock('../pages/ClientProjectContext', () => ({
  useClientProjectContext: vi.fn(() => ({
    selectedClient: null,
    setSelectedClient: vi.fn(),
  })),
}));

describe('Client Intake Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the client intake wizard', async () => {
    renderWithProviders(<ClientIntakePage />);

    await waitFor(() => {
      expect(screen.getByText('Client Intake')).toBeInTheDocument();
    });

    expect(screen.getByText('Step 1: Organization Basics')).toBeInTheDocument();
    expect(screen.getByText('Organization')).toBeInTheDocument();
    expect(screen.getByText('Primary Contact')).toBeInTheDocument();
    expect(screen.getByText('Engagement Context')).toBeInTheDocument();
  });

  it('validates required client name field', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ClientIntakePage />);

    await waitFor(() => {
      expect(
        screen.getByText('Step 1: Organization Basics'),
      ).toBeInTheDocument();
    });

    // Try to submit without filling the name
    const submitButton = screen.getByRole('button', {
      name: /Next: Add contact/i,
    });
    await user.click(submitButton);

    // Should not proceed due to validation
    expect(
      await screen.findByText('Client name is required'),
    ).toBeInTheDocument();
  });

  it('completes Step 1: Organization with valid data', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({
      id: 1,
      name: 'Acme Corp',
      industry: 'Technology',
      companySize: 'MEDIUM',
      aiMaturity: 'LOW',
      timezone: 'America/New_York',
      notes: 'Test client',
    });

    renderWithProviders(<ClientIntakePage />);

    await waitFor(() => {
      expect(
        screen.getByText('Step 1: Organization Basics'),
      ).toBeInTheDocument();
    });

    // Fill in the form
    const nameInput = screen.getByLabelText(/Name/i);
    await user.type(nameInput, 'Acme Corp');

    const industryInput = screen.getByLabelText(/Industry/i);
    await user.type(industryInput, 'Technology');

    // Submit the form
    const submitButton = screen.getByRole('button', {
      name: /Next: Add contact/i,
    });
    await user.click(submitButton);

    // Wait for mutation to be called
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Acme Corp',
          industry: 'Technology',
        }),
      );
    });

    // Should proceed to Step 2
    await waitFor(() => {
      expect(screen.getByText('Step 2: Primary Contact')).toBeInTheDocument();
    });
  });

  it('allows skipping contact step', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({
      id: 1,
      name: 'Acme Corp',
    });

    renderWithProviders(<ClientIntakePage />);

    // Complete Step 1
    await waitFor(() => {
      expect(
        screen.getByText('Step 1: Organization Basics'),
      ).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Name/i);
    await user.type(nameInput, 'Acme Corp');

    const submitButton = screen.getByRole('button', {
      name: /Next: Add contact/i,
    });
    await user.click(submitButton);

    // Wait for Step 2
    await waitFor(() => {
      expect(screen.getByText('Step 2: Primary Contact')).toBeInTheDocument();
    });

    // Skip contact
    const skipButton = screen.getByRole('button', { name: /Skip/i });
    await user.click(skipButton);

    // Should proceed to Step 3
    await waitFor(() => {
      expect(
        screen.getByText('Step 3: Engagement Context'),
      ).toBeInTheDocument();
    });
  });

  it('completes the full wizard flow', async () => {
    const user = userEvent.setup();
    const mockShowToast = vi.fn();

    mockMutateAsync.mockResolvedValue({
      id: 1,
      name: 'Acme Corp',
    });

    // Mock useToast
    vi.doMock('../ui/Toast', () => ({
      useToast: () => ({ showToast: mockShowToast }),
      ToastProvider: ({ children }: { children: React.ReactNode }) => children,
    }));

    renderWithProviders(<ClientIntakePage />);

    // Step 1: Organization
    await waitFor(() => {
      expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/Name/i), 'Acme Corp');
    await user.click(
      screen.getByRole('button', { name: /Next: Add contact/i }),
    );

    // Step 2: Contact (skip)
    await waitFor(() => {
      expect(screen.getByText('Step 2: Primary Contact')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /Skip/i }));

    // Step 3: Engagement Context
    await waitFor(() => {
      expect(
        screen.getByText('Step 3: Engagement Context'),
      ).toBeInTheDocument();
    });

    const saveButton = screen.getByRole('button', { name: /Save & finish/i });
    await user.click(saveButton);

    // Should navigate after completion
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalled();
    });
  });
});
