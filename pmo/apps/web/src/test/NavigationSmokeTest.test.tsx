import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from './utils';
import DashboardPage from '../pages/DashboardPage';
import MyTasksPage from '../pages/MyTasksPage';
import AccountsPage from '../pages/crm/AccountsPage';
import AssetsPage from '../pages/AssetsPage';

// Mock API modules
vi.mock('../api/hooks/crm', () => ({
  useAccounts: vi.fn(() => ({
    data: { data: [], meta: { total: 0, page: 1, limit: 20 } },
    isLoading: false,
    error: null,
  })),
  useAccountStats: vi.fn(() => ({
    data: { total: 0, byIndustry: [] },
    isLoading: false,
    error: null,
  })),
  useCreateAccount: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useDeleteAccount: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('../api/queries', () => ({
  useProjects: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
  useAssets: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
  useCreateAsset: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useUpdateAsset: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useArchiveAsset: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('../hooks/tasks', () => ({
  useMyTasks: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
  useUpdateTask: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useDeleteTask: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  TASK_STATUSES: ['BACKLOG', 'IN_PROGRESS', 'BLOCKED', 'DONE'],
  TASK_PRIORITIES: ['P0', 'P1', 'P2'],
}));

vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: '1', email: 'test@example.com', role: 'CONSULTANT' },
    isLoading: false,
  })),
}));

vi.mock('../auth/useRedirectOnUnauthorized', () => ({
  default: vi.fn(),
}));

describe('Navigation Smoke Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Dashboard page without crashing', async () => {
    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });

    expect(screen.getByText('Active Accounts')).toBeInTheDocument();
    expect(screen.getByText('Active Projects')).toBeInTheDocument();
    expect(screen.getByText('My Open Tasks')).toBeInTheDocument();
  });

  it('renders Tasks page without crashing', async () => {
    renderWithProviders(<MyTasksPage />);

    await waitFor(() => {
      expect(screen.getByText('My Tasks')).toBeInTheDocument();
    });

    // Check for filter controls
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('renders Accounts page without crashing', async () => {
    renderWithProviders(<AccountsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Accounts' }),
      ).toBeInTheDocument();
    });
  });

  it('renders Assets page without crashing', async () => {
    renderWithProviders(<AssetsPage />);

    await waitFor(() => {
      expect(screen.getByText('Assets Library')).toBeInTheDocument();
    });

    // Check for filter controls and create button
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /create asset/i }),
    ).toBeInTheDocument();
  });

  it('shows empty state when no accounts exist', async () => {
    renderWithProviders(<AccountsPage />);

    await waitFor(() => {
      // AccountsPage shows empty state with "No accounts yet" heading
      expect(
        screen.getByRole('heading', { name: /no accounts/i }),
      ).toBeInTheDocument();
    });
  });

  it('shows empty state when no tasks exist', async () => {
    renderWithProviders(<MyTasksPage />);

    await waitFor(() => {
      expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    });
  });

  it('shows empty state when no assets exist', async () => {
    renderWithProviders(<AssetsPage />);

    await waitFor(() => {
      // Empty state text may be "No assets yet" or "No matching assets"
      const emptyStateMessages = screen.getAllByText(
        /No (assets yet|matching assets)/i,
      );
      expect(emptyStateMessages.length).toBeGreaterThan(0);
    });
  });
});
