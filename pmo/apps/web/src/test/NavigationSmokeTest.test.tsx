import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from './utils';
import DashboardPage from '../pages/DashboardPage';
import MyTasksPage from '../pages/MyTasksPage';
import ClientsPage from '../pages/ClientsPage';
import AssetsPage from '../pages/AssetsPage';

// Mock API modules
vi.mock('../api/queries', () => ({
  useClients: vi.fn(() => ({
    data: [],
    isLoading: false,
    error: null,
  })),
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
  useCreateClient: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useCreateContact: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
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

    expect(screen.getByText('Active Clients')).toBeInTheDocument();
    expect(screen.getByText('Active Projects')).toBeInTheDocument();
    expect(screen.getByText('My Open Tasks')).toBeInTheDocument();
  });

  it('renders Tasks page without crashing', async () => {
    renderWithProviders(<MyTasksPage />);

    await waitFor(() => {
      expect(screen.getByText('My Tasks')).toBeInTheDocument();
    });

    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('renders Clients page without crashing', async () => {
    renderWithProviders(<ClientsPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: 'Clients' }),
      ).toBeInTheDocument();
    });

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('New client')).toBeInTheDocument();
  });

  it('renders Assets page without crashing', async () => {
    renderWithProviders(<AssetsPage />);

    await waitFor(() => {
      expect(screen.getByText('Assets Library')).toBeInTheDocument();
    });

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Create Asset')).toBeInTheDocument();
  });

  it('shows empty state when no clients exist', async () => {
    renderWithProviders(<ClientsPage />);

    await waitFor(() => {
      expect(screen.getByText('No clients yet')).toBeInTheDocument();
    });

    expect(screen.getByText('Add your first client')).toBeInTheDocument();
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
      const emptyStateMessages = screen.getAllByText('No assets found');
      expect(emptyStateMessages.length).toBeGreaterThan(0);
    });
  });
});
