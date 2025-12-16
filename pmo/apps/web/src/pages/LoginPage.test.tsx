import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { vi } from 'vitest';

import LoginPage from './LoginPage';

const mockLogin = vi.fn();
const mockNavigate = vi.fn();
let mockAuthError: string | null = null;
let mockAuthStatus: 'loading' | 'authenticated' | 'unauthenticated' =
  'unauthenticated';
let mockUser: { id: string; email: string; name: string } | null = null;

vi.mock('../auth/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    status: mockAuthStatus,
    user: mockUser,
    error: mockAuthError,
    isLoading: false,
    logout: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom',
    );

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockNavigate.mockReset();
    mockAuthError = null;
    mockAuthStatus = 'unauthenticated';
    mockUser = null;
  });

  it('submits credentials and navigates after a successful login', async () => {
    mockLogin.mockImplementation(async () => {
      mockAuthStatus = 'authenticated';
      mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      };
      return mockUser;
    });

    const { rerender } = render(
      <MemoryRouter initialEntries={[{ pathname: '/login' }]}>
        <LoginPage />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'password123');

    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    // Force a rerender to trigger useEffect with updated status
    rerender(
      <MemoryRouter initialEntries={[{ pathname: '/login' }]}>
        <LoginPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', {
        replace: true,
      });
    });
  });

  it('shows an error when login fails', async () => {
    mockLogin.mockImplementation(async () => {
      mockAuthError = 'Invalid credentials';
      throw new Error('Invalid credentials');
    });

    const { rerender } = render(
      <MemoryRouter initialEntries={[{ pathname: '/login' }]}>
        <LoginPage />
      </MemoryRouter>,
    );

    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    // Force a rerender to pick up the error state change
    rerender(
      <MemoryRouter initialEntries={[{ pathname: '/login' }]}>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid credentials',
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
