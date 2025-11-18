import { renderWithProviders } from '../test/utils';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ClientsPage from './ClientsPage';
import type { Client } from '../api/clients';

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('ClientsPage', () => {
  const clients: Client[] = [];
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn((url: RequestInfo | URL, options?: RequestInit) => {
      const method = (options?.method || 'GET').toString().toUpperCase();

      if (url.toString().startsWith('/api/clients') && method === 'GET') {
        return Promise.resolve(jsonResponse({ clients }));
      }

      if (url.toString().startsWith('/api/clients') && method === 'POST') {
        const body = JSON.parse((options?.body as string) || '{}');
        const newClient = {
          id: clients.length + 1,
          archived: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          ...body,
        };
        clients.unshift(newClient);
        return Promise.resolve(jsonResponse({ client: newClient }, 201));
      }

      return Promise.reject(new Error(`Unexpected request: ${method} ${url}`));
    });

    // @ts-expect-error - jsdom Response typing
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clients.splice(0, clients.length);
  });

  it('shows loading, empty state, and allows creating a client', async () => {
    renderWithProviders(<ClientsPage />, {
      route: '/clients',
      path: '/clients',
    });

    expect(screen.getByText(/loading clients/i)).toBeInTheDocument();

    expect(await screen.findByText(/no clients found/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/name/i), 'Acme Corp');
    await userEvent.click(
      screen.getByRole('button', { name: /create client/i }),
    );

    expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
  });

  it('renders an error when the client list fails to load', async () => {
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve(jsonResponse({ error: 'Server error' }, 500)),
    );

    renderWithProviders(<ClientsPage />, {
      route: '/clients',
      path: '/clients',
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();
  });
});
