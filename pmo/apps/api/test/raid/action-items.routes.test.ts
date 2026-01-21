/**
 * Action Items Router Tests
 *
 * Tests for the RAID module's Action Items REST API endpoints.
 * Tests cover CRUD operations, authentication, validation, authorization,
 * and the convert-to-task feature.
 *
 * @module test/raid/action-items.routes
 */

import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import { createApp } from '../../src/app';
import {
  createTestEnvironment,
  createTenantAgent,
  cleanupTestEnvironment,
  createTestClient,
  createTestProject,
  getRawPrisma,
  type TestEnvironment,
} from '../utils/test-fixtures';

const app = createApp();
const rawPrisma = getRawPrisma();

describe('RAID Action Items Routes', () => {
  let testEnv: TestEnvironment;

  beforeAll(async () => {
    testEnv = await createTestEnvironment(
      `action-items-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    );
  });

  afterAll(async () => {
    await cleanupTestEnvironment(testEnv.tenant.id);
  });

  // Helper to create project within test tenant
  const createProjectForTest = async (name = 'Test Project') => {
    const client = await createTestClient(testEnv.tenant.id, 'Test Client');
    const project = await createTestProject(
      testEnv.tenant.id,
      client.id,
      testEnv.user.id,
      { name, status: 'IN_PROGRESS' },
    );
    return { client, project };
  };

  // Helper to create tenant-aware agent
  const getAgent = () =>
    createTenantAgent(app, testEnv.token, testEnv.tenant.id);

  // ==========================================================================
  // Authentication Tests
  // ==========================================================================

  describe('authentication', () => {
    it('blocks unauthenticated access to list action items', async () => {
      const response = await request(app).get(
        '/api/raid/action-items/projects/1/action-items',
      );
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('blocks unauthenticated access to create action item', async () => {
      const response = await request(app)
        .post('/api/raid/action-items/projects/1/action-items')
        .send({ title: 'Test Action' });
      expect(response.status).toBe(401);
    });

    it('blocks unauthenticated access to get action item by id', async () => {
      const response = await request(app).get('/api/raid/action-items/1');
      expect(response.status).toBe(401);
    });

    it('blocks unauthenticated access to update action item', async () => {
      const response = await request(app)
        .put('/api/raid/action-items/1')
        .send({ title: 'Updated' });
      expect(response.status).toBe(401);
    });

    it('blocks unauthenticated access to delete action item', async () => {
      const response = await request(app).delete('/api/raid/action-items/1');
      expect(response.status).toBe(401);
    });

    it('blocks unauthenticated access to convert to task', async () => {
      const response = await request(app)
        .post('/api/raid/action-items/1/convert-to-task')
        .send({});
      expect(response.status).toBe(401);
    });
  });

  // ==========================================================================
  // Validation Tests
  // ==========================================================================

  describe('validation', () => {
    it('validates project id - invalid format', async () => {
      const agent = getAgent();

      const response = await agent.get(
        '/api/raid/action-items/projects/not-a-number/action-items',
      );

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid project id');
    });

    it('validates action item id - invalid format', async () => {
      const agent = getAgent();

      const response = await agent.get('/api/raid/action-items/invalid');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid action item id');
    });

    it('validates action item payload - missing title', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/action-items/projects/${project.id}/action-items`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid action item data');
    });

    it('validates action item payload - title too long', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/action-items/projects/${project.id}/action-items`)
        .send({ title: 'a'.repeat(256) });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid action item data');
    });

    it('validates action item payload - invalid priority', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/action-items/projects/${project.id}/action-items`)
        .send({ title: 'Test Action', priority: 'INVALID' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid action item data');
    });

    it('validates action item payload - invalid status', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/action-items/projects/${project.id}/action-items`)
        .send({ title: 'Test Action', status: 'INVALID' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid action item data');
    });
  });

  // ==========================================================================
  // CRUD Operations Tests
  // ==========================================================================

  describe('CRUD operations', () => {
    it('creates an action item with minimal data', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/action-items/projects/${project.id}/action-items`)
        .send({ title: 'New Action Item' });

      expect(response.status).toBe(201);
      expect(response.body.actionItem).toMatchObject({
        title: 'New Action Item',
        projectId: project.id,
        priority: 'P2',
        status: 'OPEN',
      });
      expect(response.body.actionItem.id).toBeDefined();
    });

    it('creates an action item with full data', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const actionData = {
        title: 'Complete API Integration',
        description: 'Finish integrating with third-party payment API',
        assigneeName: 'John Doe',
        dueDate: tomorrow.toISOString(),
        priority: 'P0',
        status: 'IN_PROGRESS',
      };

      const response = await agent
        .post(`/api/raid/action-items/projects/${project.id}/action-items`)
        .send(actionData);

      expect(response.status).toBe(201);
      expect(response.body.actionItem).toMatchObject({
        title: actionData.title,
        description: actionData.description,
        assigneeName: actionData.assigneeName,
        priority: actionData.priority,
        status: actionData.status,
      });
    });

    it('lists action items for a project', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      // Create multiple action items
      await rawPrisma.actionItem.createMany({
        data: [
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Action 1',
            priority: 'P0',
            status: 'OPEN',
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Action 2',
            priority: 'P2',
            status: 'COMPLETED',
          },
        ],
      });

      const response = await agent.get(
        `/api/raid/action-items/projects/${project.id}/action-items`,
      );

      expect(response.status).toBe(200);
      expect(response.body.actionItems.length).toBeGreaterThanOrEqual(2);
      expect(response.body.total).toBeGreaterThanOrEqual(2);
    });

    it('lists action items with status filter', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      await rawPrisma.actionItem.createMany({
        data: [
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Open Action',
            priority: 'P1',
            status: 'OPEN',
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Completed Action',
            priority: 'P1',
            status: 'COMPLETED',
          },
        ],
      });

      const response = await agent
        .get(`/api/raid/action-items/projects/${project.id}/action-items`)
        .query({ status: 'OPEN' });

      expect(response.status).toBe(200);
      expect(
        response.body.actionItems.every(
          (a: { status: string }) => a.status === 'OPEN',
        ),
      ).toBe(true);
    });

    it('lists action items with priority filter', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      await rawPrisma.actionItem.createMany({
        data: [
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'High Priority',
            priority: 'P0',
            status: 'OPEN',
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Low Priority',
            priority: 'P2',
            status: 'OPEN',
          },
        ],
      });

      const response = await agent
        .get(`/api/raid/action-items/projects/${project.id}/action-items`)
        .query({ priority: 'P0' });

      expect(response.status).toBe(200);
      expect(
        response.body.actionItems.every(
          (a: { priority: string }) => a.priority === 'P0',
        ),
      ).toBe(true);
    });

    it('lists overdue action items', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await rawPrisma.actionItem.createMany({
        data: [
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Overdue Action',
            priority: 'P1',
            status: 'OPEN',
            dueDate: yesterday,
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Future Action',
            priority: 'P1',
            status: 'OPEN',
            dueDate: tomorrow,
          },
        ],
      });

      const response = await agent
        .get(`/api/raid/action-items/projects/${project.id}/action-items`)
        .query({ overdue: 'true' });

      expect(response.status).toBe(200);
      // All returned items should have a dueDate in the past
      for (const item of response.body.actionItems) {
        if (item.dueDate) {
          expect(new Date(item.dueDate).getTime()).toBeLessThan(Date.now());
        }
      }
    });

    it('gets a single action item by id', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const actionItem = await rawPrisma.actionItem.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Specific Action',
          description: 'Detailed description',
          priority: 'P1',
          status: 'IN_PROGRESS',
        },
      });

      const response = await agent.get(
        `/api/raid/action-items/${actionItem.id}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.actionItem).toMatchObject({
        id: actionItem.id,
        title: 'Specific Action',
        description: 'Detailed description',
        priority: 'P1',
        status: 'IN_PROGRESS',
      });
    });

    it('updates an action item with PUT', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const actionItem = await rawPrisma.actionItem.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Original Title',
          priority: 'P2',
          status: 'OPEN',
        },
      });

      const response = await agent
        .put(`/api/raid/action-items/${actionItem.id}`)
        .send({
          title: 'Updated Title',
          priority: 'P0',
          status: 'IN_PROGRESS',
          description: 'Updated description',
        });

      expect(response.status).toBe(200);
      expect(response.body.actionItem).toMatchObject({
        id: actionItem.id,
        title: 'Updated Title',
        priority: 'P0',
        status: 'IN_PROGRESS',
        description: 'Updated description',
      });
    });

    it('updates an action item with PATCH', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const actionItem = await rawPrisma.actionItem.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Original Title',
          description: 'Original description',
          priority: 'P1',
          status: 'OPEN',
        },
      });

      const response = await agent
        .patch(`/api/raid/action-items/${actionItem.id}`)
        .send({
          status: 'COMPLETED',
        });

      expect(response.status).toBe(200);
      expect(response.body.actionItem).toMatchObject({
        id: actionItem.id,
        title: 'Original Title', // Unchanged
        status: 'COMPLETED', // Updated
      });
    });

    it('deletes an action item', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const actionItem = await rawPrisma.actionItem.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'To Delete',
          priority: 'P2',
          status: 'OPEN',
        },
      });

      const deleteResponse = await agent.delete(
        `/api/raid/action-items/${actionItem.id}`,
      );
      expect(deleteResponse.status).toBe(204);

      // Verify deletion
      const getResponse = await agent.get(
        `/api/raid/action-items/${actionItem.id}`,
      );
      expect(getResponse.status).toBe(404);
    });
  });

  // ==========================================================================
  // Convert to Task Tests
  // ==========================================================================

  describe('convert to task', () => {
    it('converts an action item to a task', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      // Create milestone for the task
      const milestone = await rawPrisma.milestone.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          name: 'Sprint 1',
        },
      });

      const actionItem = await rawPrisma.actionItem.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Action to Convert',
          description: 'Should become a task',
          priority: 'P1',
          status: 'OPEN',
        },
      });

      const response = await agent
        .post(`/api/raid/action-items/${actionItem.id}/convert-to-task`)
        .send({
          milestoneId: milestone.id,
          status: 'BACKLOG',
        });

      expect(response.status).toBe(201);
      expect(response.body.task).toBeDefined();
      expect(response.body.task.title).toBe('Action to Convert');

      // Verify action item status changed
      const updated = await rawPrisma.actionItem.findUnique({
        where: { id: actionItem.id },
      });
      expect(updated?.status).toBe('CONVERTED_TO_TASK');
    });

    it('converts with custom title and description', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const actionItem = await rawPrisma.actionItem.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Original Action Title',
          description: 'Original description',
          priority: 'P0',
          status: 'OPEN',
        },
      });

      const response = await agent
        .post(`/api/raid/action-items/${actionItem.id}/convert-to-task`)
        .send({
          title: 'Custom Task Title',
          description: 'Custom task description',
        });

      expect(response.status).toBe(201);
      expect(response.body.task.title).toBe('Custom Task Title');
      expect(response.body.task.description).toBe('Custom task description');
    });
  });

  // ==========================================================================
  // Status Counts Tests
  // ==========================================================================

  describe('status counts', () => {
    it('returns status counts for a project', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      await rawPrisma.actionItem.createMany({
        data: [
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Open 1',
            priority: 'P1',
            status: 'OPEN',
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Open 2',
            priority: 'P1',
            status: 'OPEN',
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'In Progress',
            priority: 'P1',
            status: 'IN_PROGRESS',
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Completed',
            priority: 'P2',
            status: 'COMPLETED',
          },
        ],
      });

      const response = await agent.get(
        `/api/raid/action-items/projects/${project.id}/action-items/counts`,
      );

      expect(response.status).toBe(200);
      expect(response.body.counts).toBeDefined();
      expect(response.body.counts.OPEN).toBeGreaterThanOrEqual(2);
      expect(response.body.counts.IN_PROGRESS).toBeGreaterThanOrEqual(1);
      expect(response.body.counts.COMPLETED).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    it('returns 404 for non-existent project', async () => {
      const agent = getAgent();

      const response = await agent.get(
        '/api/raid/action-items/projects/99999/action-items',
      );

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project not found');
    });

    it('returns 404 for non-existent action item', async () => {
      const agent = getAgent();

      const response = await agent.get('/api/raid/action-items/99999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Action item not found');
    });

    it('returns 404 when updating non-existent action item', async () => {
      const agent = getAgent();

      const response = await agent
        .put('/api/raid/action-items/99999')
        .send({ title: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Action item not found');
    });

    it('returns 404 when deleting non-existent action item', async () => {
      const agent = getAgent();

      const response = await agent.delete('/api/raid/action-items/99999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Action item not found');
    });

    it('returns 404 when converting non-existent action item', async () => {
      const agent = getAgent();

      const response = await agent
        .post('/api/raid/action-items/99999/convert-to-task')
        .send({});

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Action item not found');
    });
  });

  // ==========================================================================
  // Authorization Tests
  // ==========================================================================

  describe('authorization', () => {
    let testEnv2: TestEnvironment;

    beforeAll(async () => {
      testEnv2 = await createTestEnvironment(
        `action-items-auth-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      );
    });

    afterAll(async () => {
      await cleanupTestEnvironment(testEnv2.tenant.id);
    });

    it('prevents access to other tenant action items', async () => {
      const { project } = await createProjectForTest();

      await rawPrisma.actionItem.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Tenant 1 Action',
          priority: 'P1',
          status: 'OPEN',
        },
      });

      const agent2 = createTenantAgent(app, testEnv2.token, testEnv2.tenant.id);
      const response = await agent2.get(
        `/api/raid/action-items/projects/${project.id}/action-items`,
      );

      expect(response.status).toBe(404);
    });

    it('prevents creating action items in other tenant projects', async () => {
      const { project } = await createProjectForTest();

      const agent2 = createTenantAgent(app, testEnv2.token, testEnv2.tenant.id);
      const response = await agent2
        .post(`/api/raid/action-items/projects/${project.id}/action-items`)
        .send({ title: 'Malicious Action' });

      expect(response.status).toBe(404);
    });

    it('prevents updating action items in other tenant projects', async () => {
      const { project } = await createProjectForTest();

      const actionItem = await rawPrisma.actionItem.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Protected Action',
          priority: 'P1',
          status: 'OPEN',
        },
      });

      const agent2 = createTenantAgent(app, testEnv2.token, testEnv2.tenant.id);
      const response = await agent2
        .put(`/api/raid/action-items/${actionItem.id}`)
        .send({ title: 'Hacked' });

      expect(response.status).toBe(404);
    });

    it('prevents deleting action items in other tenant projects', async () => {
      const { project } = await createProjectForTest();

      const actionItem = await rawPrisma.actionItem.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Protected Action',
          priority: 'P0',
          status: 'OPEN',
        },
      });

      const agent2 = createTenantAgent(app, testEnv2.token, testEnv2.tenant.id);
      const response = await agent2.delete(
        `/api/raid/action-items/${actionItem.id}`,
      );

      expect(response.status).toBe(404);

      // Verify action item still exists
      const verify = await rawPrisma.actionItem.findUnique({
        where: { id: actionItem.id },
      });
      expect(verify).not.toBeNull();
    });
  });
});
