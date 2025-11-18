import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ClientDetailsPage from './ClientDetailsPage';
import { renderWithProviders } from '../test/utils';
import type { Client } from '../api/clients';
import type { Contact } from '../api/contacts';

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

describe('ClientDetailsPage', () => {
  const clients: Client[] = [
    {
      id: 1,
      name: 'Acme Corp',
      industry: 'Tech',
      companySize: 'SMALL',
      timezone: 'UTC',
      aiMaturity: 'LOW',
      notes: 'Key account',
      archived: false,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  ];
  const contacts: Contact[] = [];
  let fetchMock: ReturnType<typeof vi.fn>;
  let failContacts = false;

  beforeEach(() => {
    failContacts = false;
    fetchMock = vi.fn((url: RequestInfo | URL, options?: RequestInit) => {
      const method = (options?.method || 'GET').toString().toUpperCase();
      const urlString = url.toString();

      if (urlString.startsWith('/api/clients') && method === 'GET') {
        return Promise.resolve(jsonResponse({ clients }));
      }

      if (urlString.startsWith('/api/contacts') && method === 'GET') {
        if (failContacts) {
          failContacts = false;
          return Promise.resolve(jsonResponse({ error: 'fail' }, 500));
        }

        return Promise.resolve(jsonResponse({ contacts }));
      }

      if (urlString.startsWith('/api/contacts') && method === 'POST') {
        const body = JSON.parse((options?.body as string) || '{}');
        const newContact = {
          id: contacts.length + 1,
          archived: false,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          ...body,
        };
        contacts.unshift(newContact);
        return Promise.resolve(jsonResponse({ contact: newContact }, 201));
      }

      if (urlString.match(/\/api\/contacts\/(\d+)/) && method === 'PUT') {
        const body = JSON.parse((options?.body as string) || '{}');
        const contactId = Number(urlString.split('/').pop());
        const existingIndex = contacts.findIndex((c) => c.id === contactId);

        if (existingIndex >= 0) {
          contacts[existingIndex] = { ...contacts[existingIndex], ...body };
          return Promise.resolve(
            jsonResponse({ contact: contacts[existingIndex] }),
          );
        }

        return Promise.resolve(jsonResponse({ error: 'Not found' }, 404));
      }

      if (urlString.match(/\/api\/contacts\/(\d+)/) && method === 'DELETE') {
        const contactId = Number(urlString.split('/').pop());
        const existingIndex = contacts.findIndex((c) => c.id === contactId);
        if (existingIndex >= 0) {
          contacts.splice(existingIndex, 1);
        }
        return Promise.resolve(jsonResponse({}, 204));
      }

      if (urlString.match(/\/api\/clients\/(\d+)/) && method === 'PUT') {
        const body = JSON.parse((options?.body as string) || '{}');
        Object.assign(clients[0], body);
        return Promise.resolve(jsonResponse({ client: clients[0] }));
      }

      return Promise.reject(
        new Error(`Unexpected request: ${method} ${urlString}`),
      );
    });

    // @ts-expect-error jsdom Response typing does not include fetch override
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    contacts.splice(0, contacts.length);
    clients[0] = {
      ...clients[0],
      name: 'Acme Corp',
      industry: 'Tech',
      companySize: 'SMALL',
      timezone: 'UTC',
      aiMaturity: 'LOW',
      notes: 'Key account',
    };
  });

  it('renders client details and supports adding and editing contacts', async () => {
    renderWithProviders(<ClientDetailsPage />, {
      route: '/clients/1',
      path: '/clients/:clientId',
    });

    expect(await screen.findByText('Acme Corp')).toBeInTheDocument();
    expect(await screen.findByText(/no contacts yet/i)).toBeInTheDocument();

    const contactForm = screen.getByLabelText('contact-form');
    await userEvent.type(
      within(contactForm).getByLabelText(/name/i),
      'Jane Doe',
    );
    await userEvent.type(
      within(contactForm).getByLabelText(/email/i),
      'jane@example.com',
    );
    await userEvent.click(
      within(contactForm).getByRole('button', { name: /create contact/i }),
    );

    await waitFor(() => {
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByRole('button', { name: /edit/i }));
    const roleField = within(contactForm).getByLabelText(/role/i);
    await userEvent.clear(roleField);
    await userEvent.type(roleField, 'CTO');
    await userEvent.click(
      within(contactForm).getByRole('button', { name: /update contact/i }),
    );

    await waitFor(() => {
      expect(screen.getByText('CTO')).toBeInTheDocument();
    });
  });

  it('shows an error when contacts cannot be loaded', async () => {
    failContacts = true;

    renderWithProviders(<ClientDetailsPage />, {
      route: '/clients/1',
      path: '/clients/:clientId',
    });

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
