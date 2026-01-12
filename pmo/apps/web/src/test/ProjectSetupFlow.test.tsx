import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from './utils';
import ProjectSetupPage from '../pages/ProjectSetupPage';

const mockMutateAsync = vi.fn();
const mockNavigate = vi.fn();
const mockShowToast = vi.fn();

// Mock CRM hooks for accounts
vi.mock('../api/hooks/crm', () => ({
  useAccounts: vi.fn(() => ({
    data: {
      data: [
        {
          id: 1,
          name: 'Verdant Horizon Solutions',
          industry: 'Technology',
          archived: false,
        },
        { id: 2, name: 'Beta Inc', industry: 'Finance', archived: false },
      ],
      meta: { total: 2, page: 1, limit: 20 },
    },
    isLoading: false,
    error: null,
  })),
}));

vi.mock('../api/queries', () => ({
  useCreateProject: vi.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
    error: null,
  })),
}));

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
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
    setSelectedProject: vi.fn(),
  })),
  useAccountProjectContext: vi.fn(() => ({
    selectedAccount: null,
    setSelectedAccount: vi.fn(),
    setSelectedProject: vi.fn(),
  })),
}));

vi.mock('../ui/Toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('Project Setup Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the project setup wizard', async () => {
    renderWithProviders(<ProjectSetupPage />);

    await waitFor(() => {
      expect(screen.getByText('New Project Setup')).toBeInTheDocument();
    });

    // Check for step labels (may be "Choose Client" or "Choose Account")
    expect(screen.getByText(/Choose (Client|Account)/i)).toBeInTheDocument();
    expect(screen.getByText('Choose Template')).toBeInTheDocument();
    expect(screen.getByText('Project Details')).toBeInTheDocument();
    expect(screen.getByText('Review & Create')).toBeInTheDocument();
  });

  it('shows validation error when trying to proceed without selecting account', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProjectSetupPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Select an? (Client|Account)/i),
      ).toBeInTheDocument();
    });

    // Try to proceed without selecting
    const nextButton = screen.getByRole('button', { name: /Next/i });
    await user.click(nextButton);

    // Should show validation error
    await waitFor(() => {
      expect(
        screen.getByText(/Please select an? (client|account) to continue/i),
      ).toBeInTheDocument();
    });
  });

  it('allows selecting an account', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProjectSetupPage />);

    await waitFor(() => {
      expect(screen.getByText('Verdant Horizon Solutions')).toBeInTheDocument();
    });

    // Select an account
    const accountButton = screen.getByRole('button', {
      name: /Verdant Horizon Solutions/i,
    });
    await user.click(accountButton);

    // Verify account is selected (check icon should appear)
    expect(accountButton).toHaveClass('border-primary-600');

    // Proceed to next step
    const nextButton = screen.getByRole('button', { name: /Next/i });
    await user.click(nextButton);

    // Should proceed to template selection
    await waitFor(() => {
      expect(screen.getByText('Choose a Project Template')).toBeInTheDocument();
    });
  });

  it('allows selecting a project template', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProjectSetupPage />);

    // Select account
    await waitFor(() => {
      expect(screen.getByText('Verdant Horizon Solutions')).toBeInTheDocument();
    });
    await user.click(
      screen.getByRole('button', { name: /Verdant Horizon Solutions/i }),
    );
    await user.click(screen.getByRole('button', { name: /Next/i }));

    // Select template
    await waitFor(() => {
      expect(screen.getByText('AI Discovery & Roadmap')).toBeInTheDocument();
    });

    const templateButton = screen.getByRole('button', {
      name: /AI Discovery & Roadmap/i,
    });
    await user.click(templateButton);

    // Verify template is selected
    expect(templateButton).toHaveClass('border-primary-600');

    // Proceed to details
    await user.click(screen.getByRole('button', { name: /Next/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Project Details' }),
      ).toBeInTheDocument();
    });
  });

  it('validates project name is required', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProjectSetupPage />);

    // Navigate to Step 3
    await waitFor(() => {
      expect(screen.getByText('Verdant Horizon Solutions')).toBeInTheDocument();
    });
    await user.click(
      screen.getByRole('button', { name: /Verdant Horizon Solutions/i }),
    );
    await user.click(screen.getByRole('button', { name: /Next/i }));

    await waitFor(() => {
      expect(screen.getByText('AI Discovery & Roadmap')).toBeInTheDocument();
    });
    await user.click(
      screen.getByRole('button', { name: /AI Discovery & Roadmap/i }),
    );
    await user.click(screen.getByRole('button', { name: /Next/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Project Name/i)).toBeInTheDocument();
    });

    // Clear the auto-filled name
    const nameInput = screen.getByLabelText(
      /Project Name/i,
    ) as HTMLInputElement;
    await user.clear(nameInput);

    // Try to proceed
    await user.click(screen.getByRole('button', { name: /Next/i }));

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText('Project name is required')).toBeInTheDocument();
    });
  });

  it('completes the full wizard and creates project', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValue({
      id: 1,
      name: 'Verdant Horizon Solutions - AI Discovery',
      accountId: 1,
      status: 'PLANNING',
    });

    renderWithProviders(<ProjectSetupPage />);

    // Step 1: Select Account
    await waitFor(() => {
      expect(screen.getByText('Verdant Horizon Solutions')).toBeInTheDocument();
    });
    await user.click(
      screen.getByRole('button', { name: /Verdant Horizon Solutions/i }),
    );
    await user.click(screen.getByRole('button', { name: /Next/i }));

    // Step 2: Select Template
    await waitFor(() => {
      expect(screen.getByText('AI Discovery & Roadmap')).toBeInTheDocument();
    });
    await user.click(
      screen.getByRole('button', { name: /AI Discovery & Roadmap/i }),
    );
    await user.click(screen.getByRole('button', { name: /Next/i }));

    // Step 3: Fill Details
    await waitFor(() => {
      expect(screen.getByLabelText(/Project Name/i)).toBeInTheDocument();
    });
    // Name should be auto-filled
    await user.click(screen.getByRole('button', { name: /Next/i }));

    // Step 4: Review & Create
    await waitFor(() => {
      expect(screen.getByText('Review Project Details')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', {
      name: /Create Project/i,
    });
    await user.click(createButton);

    // Should call the mutation with accountId (or clientId for backwards compat)
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.any(String),
          status: 'PLANNING',
        }),
      );
    });

    // Should show success toast
    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('created successfully'),
        'success',
      );
    });

    // Should navigate to the project
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/projects/1');
    });
  });

  it('allows navigating back through steps', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProjectSetupPage />);

    // Step 1
    await waitFor(() => {
      expect(screen.getByText('Verdant Horizon Solutions')).toBeInTheDocument();
    });
    await user.click(
      screen.getByRole('button', { name: /Verdant Horizon Solutions/i }),
    );
    await user.click(screen.getByRole('button', { name: /Next/i }));

    // Step 2
    await waitFor(() => {
      expect(screen.getByText('Choose a Project Template')).toBeInTheDocument();
    });

    // Go back
    const backButton = screen.getByRole('button', { name: /Back/i });
    await user.click(backButton);

    // Should be back at Step 1
    await waitFor(() => {
      expect(
        screen.getByText(/Select an? (Client|Account)/i),
      ).toBeInTheDocument();
    });
  });
});
