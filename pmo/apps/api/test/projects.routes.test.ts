/// <reference types="vitest" />
import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { ProjectStatus } from '@prisma/client';

import { createApp } from '../src/app';
import {
  createTestEnvironment,
  createTenantAgent,
  cleanupTestEnvironment,
  createTestClient,
  createTestAccount,
  getRawPrisma,
  type TestEnvironment,
} from './utils/test-fixtures';

const app = createApp();
const rawPrisma = getRawPrisma();

describe('projects routes', () => {
  let testEnv: TestEnvironment;

  beforeAll(async () => {
    testEnv = await createTestEnvironment(
      `projects-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    );
  });

  afterAll(async () => {
    await cleanupTestEnvironment(testEnv.tenant.id);
  });

  // Helper to create client and account within the test tenant
  const createClientAndAccount = async () => {
    const client = await createTestClient(testEnv.tenant.id, 'Test Client');
    const account = await createTestAccount(
      testEnv.tenant.id,
      testEnv.user.id,
      'Test Account',
    );
    return { client, account };
  };

  // Helper to create tenant-aware agent
  const getAgent = () =>
    createTenantAgent(app, testEnv.token, testEnv.tenant.id);

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
      const { client } = await createClientAndAccount();
      const agent = getAgent();

      const response = await agent
        .post('/api/projects')
        .send({ clientId: client.id });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid project data');
    });

    it('validates project payloads - missing clientId', async () => {
      const agent = getAgent();

      const response = await agent
        .post('/api/projects')
        .send({ name: 'Test Project' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid project data');
    });

    it('validates project payloads - invalid status', async () => {
      const { client } = await createClientAndAccount();
      const agent = getAgent();

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
      const { client, account } = await createClientAndAccount();
      const agent = getAgent();

      const response = await agent.post('/api/projects').send({
        name: 'New Project',
        clientId: client.id,
        accountId: account.id,
        status: ProjectStatus.PLANNING,
      });

      expect(response.status).toBe(201);
      expect(response.body.project).toMatchObject({
        name: 'New Project',
        clientId: client.id,
        accountId: account.id,
        status: ProjectStatus.PLANNING,
      });
    });

    it('lists projects with pagination', async () => {
      const { client, account } = await createClientAndAccount();
      const agent = getAgent();

      // Create multiple projects with explicit tenantId
      await rawPrisma.project.createMany({
        data: [
          {
            name: 'Project 1',
            clientId: client.id,
            accountId: account.id,
            ownerId: testEnv.user.id,
            tenantId: testEnv.tenant.id,
          },
          {
            name: 'Project 2',
            clientId: client.id,
            accountId: account.id,
            ownerId: testEnv.user.id,
            tenantId: testEnv.tenant.id,
          },
          {
            name: 'Project 3',
            clientId: client.id,
            accountId: account.id,
            ownerId: testEnv.user.id,
            tenantId: testEnv.tenant.id,
          },
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
      });
      // Total might vary due to other projects created in this test suite
      expect(response.body.meta.total).toBeGreaterThanOrEqual(3);
    });

    it('filters projects by status', async () => {
      const { client, account } = await createClientAndAccount();
      const agent = getAgent();

      await rawPrisma.project.createMany({
        data: [
          {
            name: 'Active Project',
            clientId: client.id,
            accountId: account.id,
            ownerId: testEnv.user.id,
            tenantId: testEnv.tenant.id,
            status: ProjectStatus.IN_PROGRESS,
          },
          {
            name: 'Completed Project',
            clientId: client.id,
            accountId: account.id,
            ownerId: testEnv.user.id,
            tenantId: testEnv.tenant.id,
            status: ProjectStatus.COMPLETED,
          },
        ],
      });

      const response = await agent
        .get('/api/projects')
        .query({ status: ProjectStatus.IN_PROGRESS });

      expect(response.status).toBe(200);
      // All returned projects should have IN_PROGRESS status
      expect(
        response.body.projects.every(
          (p: { status: string }) => p.status === ProjectStatus.IN_PROGRESS,
        ),
      ).toBe(true);
    });

    it('gets a single project by id', async () => {
      const { client, account } = await createClientAndAccount();
      const agent = getAgent();

      const project = await rawPrisma.project.create({
        data: {
          name: 'Test Project',
          clientId: client.id,
          accountId: account.id,
          ownerId: testEnv.user.id,
          tenantId: testEnv.tenant.id,
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
      const { client, account } = await createClientAndAccount();
      const agent = getAgent();

      const project = await rawPrisma.project.create({
        data: {
          name: 'Original Name',
          clientId: client.id,
          accountId: account.id,
          ownerId: testEnv.user.id,
          tenantId: testEnv.tenant.id,
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
      const { client, account } = await createClientAndAccount();
      const agent = getAgent();

      const project = await rawPrisma.project.create({
        data: {
          name: 'To Delete',
          clientId: client.id,
          accountId: account.id,
          ownerId: testEnv.user.id,
          tenantId: testEnv.tenant.id,
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
    // Shared secondary test environment for authorization tests
    let testEnv2: TestEnvironment;

    beforeAll(async () => {
      testEnv2 = await createTestEnvironment(
        `projects-auth-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      );
    });

    afterAll(async () => {
      await cleanupTestEnvironment(testEnv2.tenant.id);
    });

    it('prevents access to other users projects', async () => {
      const { client, account } = await createClientAndAccount();

      // Create project owned by first user in first tenant
      const project = await rawPrisma.project.create({
        data: {
          name: 'User 1 Project',
          clientId: client.id,
          accountId: account.id,
          ownerId: testEnv.user.id,
          tenantId: testEnv.tenant.id,
        },
      });

      // User 2 in different tenant tries to access User 1's project
      const agent2 = createTenantAgent(app, testEnv2.token, testEnv2.tenant.id);
      const response = await agent2.get(`/api/projects/${project.id}`);

      // Should be 404 (not found in their tenant) or 403 (forbidden)
      expect([403, 404]).toContain(response.status);
    });

    it('prevents updating other users projects', async () => {
      const { client, account } = await createClientAndAccount();

      const project = await rawPrisma.project.create({
        data: {
          name: 'User 1 Project',
          clientId: client.id,
          accountId: account.id,
          ownerId: testEnv.user.id,
          tenantId: testEnv.tenant.id,
        },
      });

      const agent2 = createTenantAgent(app, testEnv2.token, testEnv2.tenant.id);
      const response = await agent2.put(`/api/projects/${project.id}`).send({
        name: 'Hacked Name',
      });

      expect([403, 404]).toContain(response.status);
    });

    it('prevents deleting other users projects', async () => {
      const { client, account } = await createClientAndAccount();

      const project = await rawPrisma.project.create({
        data: {
          name: 'User 1 Project',
          clientId: client.id,
          accountId: account.id,
          ownerId: testEnv.user.id,
          tenantId: testEnv.tenant.id,
        },
      });

      const agent2 = createTenantAgent(app, testEnv2.token, testEnv2.tenant.id);
      const response = await agent2.delete(`/api/projects/${project.id}`);

      expect([403, 404]).toContain(response.status);
    });
  });

  describe('error handling', () => {
    it('returns 404 for non-existent project', async () => {
      const agent = getAgent();

      const response = await agent.get('/api/projects/99999');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project not found');
    });

    it('returns 404 for non-existent account on create', async () => {
      const agent = getAgent();

      const response = await agent.post('/api/projects').send({
        name: 'Test Project',
        clientId: 99999,
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Account not found');
    });

    it('returns 400 for invalid project id', async () => {
      const agent = getAgent();

      const response = await agent.get('/api/projects/invalid');
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid project id');
    });
  });
});
