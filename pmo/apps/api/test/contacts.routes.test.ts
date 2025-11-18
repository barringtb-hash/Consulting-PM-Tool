/// <reference types="vitest" />
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { hashPassword } from '../src/auth/password';
import { createApp } from '../src/app';
import prisma from '../src/prisma/client';

const app = createApp();

const createAuthenticatedAgent = async () => {
  const password = 'password123';
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name: 'Contact Owner',
      email: 'contact-owner@example.com',
      passwordHash,
      timezone: 'UTC',
    },
  });

  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: user.email, password });

  return agent;
};

describe('contacts routes', () => {
  it('requires authentication', async () => {
    const response = await request(app).get('/api/contacts');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: 'Unauthorized' });
  });

  it('validates contact payloads and client existence', async () => {
    const agent = await createAuthenticatedAgent();
    const response = await agent
      .post('/api/contacts')
      .send({ name: 'No Email' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid contact data');

    const missingClientResponse = await agent.post('/api/contacts').send({
      clientId: 9999,
      name: 'Ghost Contact',
      email: 'ghost@example.com',
    });

    expect(missingClientResponse.status).toBe(404);
    expect(missingClientResponse.body.error).toBe('Client not found');
  });

  it('handles contact CRUD with filters and archiving', async () => {
    const agent = await createAuthenticatedAgent();

    const client = await prisma.client.create({
      data: { name: 'Contact Client' },
    });

    const secondClient = await prisma.client.create({
      data: { name: 'Second Client' },
    });

    const createResponse = await agent.post('/api/contacts').send({
      clientId: client.id,
      name: 'Alice Smith',
      email: 'alice@example.com',
      role: 'CTO',
    });

    expect(createResponse.status).toBe(201);
    const contactId = createResponse.body.contact.id;

    await agent.post('/api/contacts').send({
      clientId: secondClient.id,
      name: 'Bob Jones',
      email: 'bob@example.com',
      role: 'CEO',
    });

    const searchResponse = await agent
      .get('/api/contacts')
      .query({ search: 'alice' });
    expect(searchResponse.status).toBe(200);
    expect(searchResponse.body.contacts).toHaveLength(1);
    expect(searchResponse.body.contacts[0]).toMatchObject({
      name: 'Alice Smith',
    });

    const filteredResponse = await agent
      .get('/api/contacts')
      .query({ clientId: secondClient.id.toString() });
    expect(filteredResponse.status).toBe(200);
    expect(filteredResponse.body.contacts).toHaveLength(1);
    expect(filteredResponse.body.contacts[0]).toMatchObject({
      name: 'Bob Jones',
    });

    const updateResponse = await agent
      .put(`/api/contacts/${contactId}`)
      .send({ role: 'Lead Engineer', phone: '123-456' });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.contact).toMatchObject({
      id: contactId,
      role: 'Lead Engineer',
      phone: '123-456',
    });

    const archiveResponse = await agent.patch(
      `/api/contacts/${contactId}/archive`,
    );
    expect(archiveResponse.status).toBe(200);
    expect(archiveResponse.body.contact.archived).toBe(true);

    const defaultList = await agent.get('/api/contacts');
    expect(
      defaultList.body.contacts.some(
        (contact: { id: number }) => contact.id === contactId,
      ),
    ).toBe(false);

    const archivedList = await agent
      .get('/api/contacts')
      .query({ archived: 'true' });
    expect(
      archivedList.body.contacts.some(
        (contact: { id: number }) => contact.id === contactId,
      ),
    ).toBe(true);

    const deleteResponse = await agent.delete(`/api/contacts/${contactId}`);
    expect(deleteResponse.status).toBe(204);

    const stored = await prisma.contact.findUnique({
      where: { id: contactId },
    });
    expect(stored).toBeNull();
  });
});
