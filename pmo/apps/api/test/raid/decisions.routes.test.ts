/**
 * Decisions Router Tests
 *
 * Tests for the RAID module's Decisions REST API endpoints.
 * Tests cover CRUD operations, authentication, validation, authorization,
 * and the supersede feature.
 *
 * @module test/raid/decisions.routes
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

describe('RAID Decisions Routes', () => {
  let testEnv: TestEnvironment;

  beforeAll(async () => {
    testEnv = await createTestEnvironment(
      `decisions-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
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
    it('blocks unauthenticated access to list decisions', async () => {
      const response = await request(app).get(
        '/api/raid/decisions/projects/1/decisions',
      );
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('blocks unauthenticated access to create decision', async () => {
      const response = await request(app)
        .post('/api/raid/decisions/projects/1/decisions')
        .send({ title: 'Test Decision' });
      expect(response.status).toBe(401);
    });

    it('blocks unauthenticated access to get decision by id', async () => {
      const response = await request(app).get('/api/raid/decisions/1');
      expect(response.status).toBe(401);
    });

    it('blocks unauthenticated access to update decision', async () => {
      const response = await request(app)
        .put('/api/raid/decisions/1')
        .send({ title: 'Updated' });
      expect(response.status).toBe(401);
    });

    it('blocks unauthenticated access to delete decision', async () => {
      const response = await request(app).delete('/api/raid/decisions/1');
      expect(response.status).toBe(401);
    });

    it('blocks unauthenticated access to supersede', async () => {
      const response = await request(app)
        .post('/api/raid/decisions/1/supersede')
        .send({ newDecisionId: 2 });
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
        '/api/raid/decisions/projects/not-a-number/decisions',
      );

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid project id');
    });

    it('validates decision id - invalid format', async () => {
      const agent = getAgent();

      const response = await agent.get('/api/raid/decisions/invalid');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid decision id');
    });

    it('validates decision payload - missing title', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/decisions/projects/${project.id}/decisions`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid decision data');
    });

    it('validates decision payload - title too long', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/decisions/projects/${project.id}/decisions`)
        .send({ title: 'a'.repeat(256) });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid decision data');
    });

    it('validates decision payload - invalid impact', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/decisions/projects/${project.id}/decisions`)
        .send({ title: 'Test Decision', impact: 'INVALID' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid decision data');
    });

    it('validates decision payload - invalid status', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/decisions/projects/${project.id}/decisions`)
        .send({ title: 'Test Decision', status: 'INVALID' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid decision data');
    });

    it('validates supersede payload - missing newDecisionId', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const decision = await rawPrisma.decision.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Original Decision',
          description: 'Test description',
          impact: 'MEDIUM',
          category: 'PROJECT',
          status: 'ACTIVE',
        },
      });

      const response = await agent
        .post(`/api/raid/decisions/${decision.id}/supersede`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid supersede data');
    });
  });

  // ==========================================================================
  // CRUD Operations Tests
  // ==========================================================================

  describe('CRUD operations', () => {
    it('creates a decision with minimal data', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/decisions/projects/${project.id}/decisions`)
        .send({ title: 'New Decision' });

      expect(response.status).toBe(201);
      expect(response.body.decision).toMatchObject({
        title: 'New Decision',
        projectId: project.id,
        impact: 'MEDIUM',
        category: 'PROJECT',
        status: 'PENDING',
      });
      expect(response.body.decision.id).toBeDefined();
    });

    it('creates a decision with full data', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const decisionData = {
        title: 'Use React for Frontend',
        description: 'Decided to use React instead of Vue for the frontend',
        rationale: 'Team has more React experience',
        impact: 'HIGH',
        category: 'TECHNICAL',
        status: 'ACTIVE',
        stakeholders: ['Engineering', 'Product'],
        madeByName: 'Tech Lead',
      };

      const response = await agent
        .post(`/api/raid/decisions/projects/${project.id}/decisions`)
        .send(decisionData);

      expect(response.status).toBe(201);
      expect(response.body.decision).toMatchObject({
        title: decisionData.title,
        description: decisionData.description,
        rationale: decisionData.rationale,
        impact: decisionData.impact,
        category: decisionData.category,
        status: decisionData.status,
        madeByName: decisionData.madeByName,
      });
    });

    it('lists decisions for a project', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      await rawPrisma.decision.createMany({
        data: [
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Decision 1',
            description: 'Description 1',
            impact: 'HIGH',
            category: 'TECHNICAL',
            status: 'ACTIVE',
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Decision 2',
            description: 'Description 2',
            impact: 'LOW',
            category: 'SCOPE',
            status: 'PENDING',
          },
        ],
      });

      const response = await agent.get(
        `/api/raid/decisions/projects/${project.id}/decisions`,
      );

      expect(response.status).toBe(200);
      expect(response.body.decisions.length).toBeGreaterThanOrEqual(2);
      expect(response.body.total).toBeGreaterThanOrEqual(2);
    });

    it('lists decisions with status filter', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      await rawPrisma.decision.createMany({
        data: [
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Active Decision',
            description: 'Active',
            impact: 'MEDIUM',
            category: 'PROJECT',
            status: 'ACTIVE',
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Pending Decision',
            description: 'Pending',
            impact: 'MEDIUM',
            category: 'PROJECT',
            status: 'PENDING',
          },
        ],
      });

      const response = await agent
        .get(`/api/raid/decisions/projects/${project.id}/decisions`)
        .query({ status: 'ACTIVE' });

      expect(response.status).toBe(200);
      expect(
        response.body.decisions.every(
          (d: { status: string }) => d.status === 'ACTIVE',
        ),
      ).toBe(true);
    });

    it('lists decisions with impact filter', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      await rawPrisma.decision.createMany({
        data: [
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'High Impact',
            description: 'High impact decision',
            impact: 'HIGH',
            category: 'PROJECT',
            status: 'ACTIVE',
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Low Impact',
            description: 'Low impact decision',
            impact: 'LOW',
            category: 'PROJECT',
            status: 'ACTIVE',
          },
        ],
      });

      const response = await agent
        .get(`/api/raid/decisions/projects/${project.id}/decisions`)
        .query({ impact: 'HIGH' });

      expect(response.status).toBe(200);
      expect(
        response.body.decisions.every(
          (d: { impact: string }) => d.impact === 'HIGH',
        ),
      ).toBe(true);
    });

    it('gets a single decision by id', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const decision = await rawPrisma.decision.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Specific Decision',
          description: 'Detailed rationale',
          impact: 'CRITICAL',
          category: 'BUDGET',
          status: 'ACTIVE',
        },
      });

      const response = await agent.get(`/api/raid/decisions/${decision.id}`);

      expect(response.status).toBe(200);
      expect(response.body.decision).toMatchObject({
        id: decision.id,
        title: 'Specific Decision',
        description: 'Detailed rationale',
        impact: 'CRITICAL',
        category: 'BUDGET',
        status: 'ACTIVE',
      });
    });

    it('updates a decision with PUT', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const decision = await rawPrisma.decision.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Original Title',
          description: 'Original description',
          impact: 'MEDIUM',
          category: 'PROJECT',
          status: 'PENDING',
        },
      });

      const response = await agent
        .put(`/api/raid/decisions/${decision.id}`)
        .send({
          title: 'Updated Title',
          status: 'ACTIVE',
          rationale: 'Approved by stakeholders',
        });

      expect(response.status).toBe(200);
      expect(response.body.decision).toMatchObject({
        id: decision.id,
        title: 'Updated Title',
        status: 'ACTIVE',
        rationale: 'Approved by stakeholders',
      });
    });

    it('updates a decision with PATCH', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const decision = await rawPrisma.decision.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Original Title',
          description: 'Original description',
          impact: 'LOW',
          category: 'SCOPE',
          status: 'PENDING',
        },
      });

      const response = await agent
        .patch(`/api/raid/decisions/${decision.id}`)
        .send({
          status: 'ACTIVE',
        });

      expect(response.status).toBe(200);
      expect(response.body.decision).toMatchObject({
        id: decision.id,
        title: 'Original Title', // Unchanged
        status: 'ACTIVE', // Updated
      });
    });

    it('deletes a decision', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const decision = await rawPrisma.decision.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'To Delete',
          description: 'Will be deleted',
          impact: 'LOW',
          category: 'PROJECT',
          status: 'PENDING',
        },
      });

      const deleteResponse = await agent.delete(
        `/api/raid/decisions/${decision.id}`,
      );
      expect(deleteResponse.status).toBe(204);

      // Verify deletion
      const getResponse = await agent.get(`/api/raid/decisions/${decision.id}`);
      expect(getResponse.status).toBe(404);
    });
  });

  // ==========================================================================
  // Supersede Tests
  // ==========================================================================

  describe('supersede', () => {
    it('supersedes a decision with a new one', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const oldDecision = await rawPrisma.decision.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Original Decision',
          description: 'Original decision description',
          impact: 'MEDIUM',
          category: 'TECHNICAL',
          status: 'ACTIVE',
        },
      });

      const newDecision = await rawPrisma.decision.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Replacement Decision',
          description: 'Replacement decision description',
          impact: 'HIGH',
          category: 'TECHNICAL',
          status: 'ACTIVE',
        },
      });

      const response = await agent
        .post(`/api/raid/decisions/${oldDecision.id}/supersede`)
        .send({
          newDecisionId: newDecision.id,
          reason: 'Requirements changed',
        });

      expect(response.status).toBe(200);
      expect(response.body.decision.status).toBe('SUPERSEDED');
      expect(response.body.decision.supersededById).toBe(newDecision.id);
    });

    it('rejects supersede with decision from different project', async () => {
      const { project: project1 } = await createProjectForTest('Project 1');
      const { project: project2 } = await createProjectForTest('Project 2');
      const agent = getAgent();

      const decision1 = await rawPrisma.decision.create({
        data: {
          projectId: project1.id,
          tenantId: testEnv.tenant.id,
          title: 'Decision in Project 1',
          description: 'Project 1 decision',
          impact: 'MEDIUM',
          category: 'PROJECT',
          status: 'ACTIVE',
        },
      });

      const decision2 = await rawPrisma.decision.create({
        data: {
          projectId: project2.id,
          tenantId: testEnv.tenant.id,
          title: 'Decision in Project 2',
          description: 'Project 2 decision',
          impact: 'MEDIUM',
          category: 'PROJECT',
          status: 'ACTIVE',
        },
      });

      const response = await agent
        .post(`/api/raid/decisions/${decision1.id}/supersede`)
        .send({
          newDecisionId: decision2.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'Invalid new decision - must exist and be in same project',
      );
    });
  });

  // ==========================================================================
  // Status Counts and Pending Reviews Tests
  // ==========================================================================

  describe('counts and pending reviews', () => {
    it('returns status counts for a project', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      await rawPrisma.decision.createMany({
        data: [
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Pending 1',
            description: 'Pending 1 description',
            impact: 'MEDIUM',
            category: 'PROJECT',
            status: 'PENDING',
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Pending 2',
            description: 'Pending 2 description',
            impact: 'MEDIUM',
            category: 'PROJECT',
            status: 'PENDING',
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Active',
            description: 'Active description',
            impact: 'HIGH',
            category: 'TECHNICAL',
            status: 'ACTIVE',
          },
        ],
      });

      const response = await agent.get(
        `/api/raid/decisions/projects/${project.id}/decisions/counts`,
      );

      expect(response.status).toBe(200);
      expect(response.body.counts).toBeDefined();
      expect(response.body.counts.PENDING).toBeGreaterThanOrEqual(2);
      expect(response.body.counts.ACTIVE).toBeGreaterThanOrEqual(1);
    });

    it('returns pending reviews for a project', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);

      await rawPrisma.decision.createMany({
        data: [
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Pending Review',
            description: 'Needs review',
            impact: 'HIGH',
            category: 'PROJECT',
            status: 'PENDING',
            reviewDate: lastWeek, // Past review date
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Future Review',
            description: 'Future review',
            impact: 'MEDIUM',
            category: 'PROJECT',
            status: 'ACTIVE',
            reviewDate: nextWeek,
          },
        ],
      });

      const response = await agent.get(
        `/api/raid/decisions/projects/${project.id}/decisions/pending-reviews`,
      );

      expect(response.status).toBe(200);
      expect(response.body.decisions).toBeDefined();
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    it('returns 404 for non-existent project', async () => {
      const agent = getAgent();

      const response = await agent.get(
        '/api/raid/decisions/projects/99999/decisions',
      );

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project not found');
    });

    it('returns 404 for non-existent decision', async () => {
      const agent = getAgent();

      const response = await agent.get('/api/raid/decisions/99999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Decision not found');
    });

    it('returns 404 when updating non-existent decision', async () => {
      const agent = getAgent();

      const response = await agent
        .put('/api/raid/decisions/99999')
        .send({ title: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Decision not found');
    });

    it('returns 404 when deleting non-existent decision', async () => {
      const agent = getAgent();

      const response = await agent.delete('/api/raid/decisions/99999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Decision not found');
    });
  });

  // ==========================================================================
  // Authorization Tests
  // ==========================================================================

  describe('authorization', () => {
    let testEnv2: TestEnvironment;

    beforeAll(async () => {
      testEnv2 = await createTestEnvironment(
        `decisions-auth-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      );
    });

    afterAll(async () => {
      await cleanupTestEnvironment(testEnv2.tenant.id);
    });

    it('prevents access to other tenant decisions', async () => {
      const { project } = await createProjectForTest();

      await rawPrisma.decision.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Tenant 1 Decision',
          description: 'Decision belonging to tenant 1',
          impact: 'MEDIUM',
          category: 'PROJECT',
          status: 'ACTIVE',
        },
      });

      const agent2 = createTenantAgent(app, testEnv2.token, testEnv2.tenant.id);
      const response = await agent2.get(
        `/api/raid/decisions/projects/${project.id}/decisions`,
      );

      expect(response.status).toBe(404);
    });

    it('prevents creating decisions in other tenant projects', async () => {
      const { project } = await createProjectForTest();

      const agent2 = createTenantAgent(app, testEnv2.token, testEnv2.tenant.id);
      const response = await agent2
        .post(`/api/raid/decisions/projects/${project.id}/decisions`)
        .send({ title: 'Malicious Decision' });

      expect(response.status).toBe(404);
    });

    it('prevents updating decisions in other tenant projects', async () => {
      const { project } = await createProjectForTest();

      const decision = await rawPrisma.decision.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Protected Decision',
          description: 'Decision protected from unauthorized updates',
          impact: 'HIGH',
          category: 'PROJECT',
          status: 'ACTIVE',
        },
      });

      const agent2 = createTenantAgent(app, testEnv2.token, testEnv2.tenant.id);
      const response = await agent2
        .put(`/api/raid/decisions/${decision.id}`)
        .send({ title: 'Hacked' });

      expect(response.status).toBe(404);
    });

    it('prevents deleting decisions in other tenant projects', async () => {
      const { project } = await createProjectForTest();

      const decision = await rawPrisma.decision.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Protected Decision',
          description: 'Decision protected from unauthorized deletion',
          impact: 'CRITICAL',
          category: 'BUDGET',
          status: 'ACTIVE',
        },
      });

      const agent2 = createTenantAgent(app, testEnv2.token, testEnv2.tenant.id);
      const response = await agent2.delete(
        `/api/raid/decisions/${decision.id}`,
      );

      expect(response.status).toBe(404);

      // Verify decision still exists
      const verify = await rawPrisma.decision.findUnique({
        where: { id: decision.id },
      });
      expect(verify).not.toBeNull();
    });
  });
});
