import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import ProtectedRoute from './ProtectedRoute';

const mockUseAuth = vi.fn();

vi.mock('./AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('shows a loading indicator when authentication is in progress', () => {
    mockUseAuth.mockReturnValue({
      status: 'loading',
      isLoading: true,
      user: null,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/dashboard' }]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Dashboard Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Screen</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByText('Loading authentication status...'),
    ).toBeInTheDocument();
  });

  it('redirects unauthenticated users to the login page', () => {
    mockUseAuth.mockReturnValue({
      status: 'unauthenticated',
      isLoading: false,
      user: null,
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/dashboard' }]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Dashboard Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Screen</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Login Screen')).toBeInTheDocument();
  });

  it('renders child routes for authenticated users', () => {
    mockUseAuth.mockReturnValue({
      status: 'authenticated',
      isLoading: false,
      user: {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        timezone: 'UTC',
      },
      error: null,
      login: vi.fn(),
      logout: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/dashboard' }]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>Dashboard Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Screen</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });
});
