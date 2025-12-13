/// <reference types="vitest" />
import request from 'supertest';
import { describe, expect, it, beforeEach } from 'vitest';
import { ProjectStatus } from '@prisma/client';

import { hashPassword } from '../src/auth/password';
import { createApp } from '../src/app';
import prisma from '../src/prisma/client';

const app = createApp();

const createAuthenticatedAgent = async () => {
  const password = 'password123';
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name: 'Project Owner',
      email: `project-owner-${Date.now()}@example.com`,
      passwordHash,
      timezone: 'UTC',
    },
  });

  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email: user.email, password });

  return { agent, user };
};

const createClient = async () => {
  return prisma.client.create({
    data: {
      name: 'Test Client',
    },
  });
};

describe('projects routes', () => {
  describe('authentication', () => {
    it('blocks unauthenticated access to list', async () => {
      const response = await request(app).get('/api/projects');
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('blocks unauthenticated access to create', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({ name: 'Test', clientId: 1 });
      expect(response.status).toBe(401);
    });
  });

  describe('validation', () => {
    it('validates project payloads - missing name', async () => {
      const { agent } = await createAuthenticatedAgent();
      const client = await createClient();

      const response = await agent
        .post('/api/projects')
        .send({ clientId: client.id });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid project data');
    });

    it('validates project payloads - missing clientId', async () => {
      const { agent } = await createAuthenticatedAgent();

      const response = await agent
        .post('/api/projects')
        .send({ name: 'Test Project' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid project data');
    });

    it('validates project payloads - invalid status', async () => {
      const { agent } = await createAuthenticatedAgent();
      const client = await createClient();

      const response = await agent.post('/api/projects').send({
        name: 'Test Project',
        clientId: client.id,
        status: 'INVALID_STATUS',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('CRUD operations', () => {
    it('creates a project successfully', async () => {
      const { agent } = await createAuthenticatedAgent();
      const client = await createClient();

      const response = await agent.post('/api/projects').send({
        name: 'New Project',
        clientId: client.id,
        status: ProjectStatus.PLANNING,
      });

      expect(response.status).toBe(201);
      expect(response.body.project).toMatchObject({
        name: 'New Project',
        clientId: client.id,
        status: ProjectStatus.PLANNING,
      });
    });

    it('lists projects with pagination', async () => {
      const { agent, user } = await createAuthenticatedAgent();
      const client = await createClient();

      // Create multiple projects
      await prisma.project.createMany({
        data: [
          { name: 'Project 1', clientId: client.id, ownerId: user.id },
          { name: 'Project 2', clientId: client.id, ownerId: user.id },
          { name: 'Project 3', clientId: client.id, ownerId: user.id },
        ],
      });

      const response = await agent
        .get('/api/projects')
        .query({ page: 1, limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body.projects).toHaveLength(2);
      expect(response.body.meta).toMatchObject({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
    });

    it('filters projects by status', async () => {
      const { agent, user } = await createAuthenticatedAgent();
      const client = await createClient();

      await prisma.project.createMany({
        data: [
          {
            name: 'Active Project',
            clientId: client.id,
            ownerId: user.id,
            status: ProjectStatus.IN_PROGRESS,
          },
          {
            name: 'Completed Project',
            clientId: client.id,
            ownerId: user.id,
            status: ProjectStatus.COMPLETED,
          },
        ],
      });

      const response = await agent
        .get('/api/projects')
        .query({ status: ProjectStatus.IN_PROGRESS });

      expect(response.status).toBe(200);
      expect(response.body.projects).toHaveLength(1);
      expect(response.body.projects[0].name).toBe('Active Project');
    });

    it('gets a single project by id', async () => {
      const { agent, user } = await createAuthenticatedAgent();
      const client = await createClient();

      const project = await prisma.project.create({
        data: {
          name: 'Test Project',
          clientId: client.id,
          ownerId: user.id,
        },
      });

      const response = await agent.get(`/api/projects/${project.id}`);

      expect(response.status).toBe(200);
      expect(response.body.project).toMatchObject({
        id: project.id,
        name: 'Test Project',
      });
    });

    it('updates a project', async () => {
      const { agent, user } = await createAuthenticatedAgent();
      const client = await createClient();

      const project = await prisma.project.create({
        data: {
          name: 'Original Name',
          clientId: client.id,
          ownerId: user.id,
        },
      });

      const response = await agent.put(`/api/projects/${project.id}`).send({
        name: 'Updated Name',
        status: ProjectStatus.IN_PROGRESS,
      });

      expect(response.status).toBe(200);
      expect(response.body.project).toMatchObject({
        id: project.id,
        name: 'Updated Name',
        status: ProjectStatus.IN_PROGRESS,
      });
    });

    it('deletes a project', async () => {
      const { agent, user } = await createAuthenticatedAgent();
      const client = await createClient();

      const project = await prisma.project.create({
        data: {
          name: 'To Delete',
          clientId: client.id,
          ownerId: user.id,
        },
      });

      const response = await agent.delete(`/api/projects/${project.id}`);
      expect(response.status).toBe(204);

      // Verify deletion
      const getResponse = await agent.get(`/api/projects/${project.id}`);
      expect(getResponse.status).toBe(404);
    });
  });

  describe('authorization', () => {
    it('prevents access to other users projects', async () => {
      const { agent: agent1, user: user1 } = await createAuthenticatedAgent();
      const { agent: agent2 } = await createAuthenticatedAgent();
      const client = await createClient();

      const project = await prisma.project.create({
        data: {
          name: 'User 1 Project',
          clientId: client.id,
          ownerId: user1.id,
        },
      });

      // User 2 tries to access User 1's project
      const response = await agent2.get(`/api/projects/${project.id}`);
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Forbidden');
    });

    it('prevents updating other users projects', async () => {
      const { user: user1 } = await createAuthenticatedAgent();
      const { agent: agent2 } = await createAuthenticatedAgent();
      const client = await createClient();

      const project = await prisma.project.create({
        data: {
          name: 'User 1 Project',
          clientId: client.id,
          ownerId: user1.id,
        },
      });

      const response = await agent2.put(`/api/projects/${project.id}`).send({
        name: 'Hacked Name',
      });

      expect(response.status).toBe(403);
    });

    it('prevents deleting other users projects', async () => {
      const { user: user1 } = await createAuthenticatedAgent();
      const { agent: agent2 } = await createAuthenticatedAgent();
      const client = await createClient();

      const project = await prisma.project.create({
        data: {
          name: 'User 1 Project',
          clientId: client.id,
          ownerId: user1.id,
        },
      });

      const response = await agent2.delete(`/api/projects/${project.id}`);
      expect(response.status).toBe(403);
    });
  });

  describe('error handling', () => {
    it('returns 404 for non-existent project', async () => {
      const { agent } = await createAuthenticatedAgent();

      const response = await agent.get('/api/projects/99999');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project not found');
    });

    it('returns 404 for non-existent client on create', async () => {
      const { agent } = await createAuthenticatedAgent();

      const response = await agent.post('/api/projects').send({
        name: 'Test Project',
        clientId: 99999,
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Client not found');
    });

    it('returns 400 for invalid project id', async () => {
      const { agent } = await createAuthenticatedAgent();

      const response = await agent.get('/api/projects/invalid');
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid project id');
    });
  });
});
