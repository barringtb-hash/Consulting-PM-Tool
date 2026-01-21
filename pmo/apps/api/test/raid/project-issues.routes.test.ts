/**
 * Project Issues Router Tests
 *
 * Tests for the RAID module's Project Issues REST API endpoints.
 * Tests cover CRUD operations, authentication, validation, authorization,
 * and the escalate feature.
 *
 * @module test/raid/project-issues.routes
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

describe('RAID Project Issues Routes', () => {
  let testEnv: TestEnvironment;

  beforeAll(async () => {
    testEnv = await createTestEnvironment(
      `issues-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
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
    it('blocks unauthenticated access to list issues', async () => {
      const response = await request(app).get(
        '/api/raid/issues/projects/1/issues',
      );
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('blocks unauthenticated access to create issue', async () => {
      const response = await request(app)
        .post('/api/raid/issues/projects/1/issues')
        .send({ title: 'Test Issue', description: 'Test' });
      expect(response.status).toBe(401);
    });

    it('blocks unauthenticated access to get issue by id', async () => {
      const response = await request(app).get('/api/raid/issues/1');
      expect(response.status).toBe(401);
    });

    it('blocks unauthenticated access to update issue', async () => {
      const response = await request(app)
        .put('/api/raid/issues/1')
        .send({ title: 'Updated' });
      expect(response.status).toBe(401);
    });

    it('blocks unauthenticated access to delete issue', async () => {
      const response = await request(app).delete('/api/raid/issues/1');
      expect(response.status).toBe(401);
    });

    it('blocks unauthenticated access to escalate', async () => {
      const response = await request(app)
        .post('/api/raid/issues/1/escalate')
        .send({ reason: 'Urgent' });
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
        '/api/raid/issues/projects/not-a-number/issues',
      );

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid project id');
    });

    it('validates issue id - invalid format', async () => {
      const agent = getAgent();

      const response = await agent.get('/api/raid/issues/invalid');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid issue id');
    });

    it('validates issue payload - missing title', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/issues/projects/${project.id}/issues`)
        .send({ description: 'Test description' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid issue data');
    });

    it('validates issue payload - missing description', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/issues/projects/${project.id}/issues`)
        .send({ title: 'Test Issue' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid issue data');
    });

    it('validates issue payload - title too long', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/issues/projects/${project.id}/issues`)
        .send({ title: 'a'.repeat(256), description: 'Test' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid issue data');
    });

    it('validates issue payload - invalid severity', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/issues/projects/${project.id}/issues`)
        .send({
          title: 'Test Issue',
          description: 'Test',
          severity: 'INVALID',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid issue data');
    });

    it('validates issue payload - invalid status', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/issues/projects/${project.id}/issues`)
        .send({
          title: 'Test Issue',
          description: 'Test',
          status: 'INVALID',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid issue data');
    });
  });

  // ==========================================================================
  // CRUD Operations Tests
  // ==========================================================================

  describe('CRUD operations', () => {
    it('creates an issue with minimal data', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/issues/projects/${project.id}/issues`)
        .send({
          title: 'New Issue',
          description: 'Issue description',
        });

      expect(response.status).toBe(201);
      expect(response.body.issue).toMatchObject({
        title: 'New Issue',
        description: 'Issue description',
        projectId: project.id,
        severity: 'MEDIUM',
        status: 'OPEN',
        escalationLevel: 0,
      });
      expect(response.body.issue.id).toBeDefined();
    });

    it('creates an issue with full data', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const issueData = {
        title: 'Critical Production Bug',
        description: 'Users cannot log in after password reset',
        severity: 'CRITICAL',
        status: 'INVESTIGATING',
        impact: 'All users affected',
        affectedAreas: ['Authentication', 'User Management'],
        reportedByName: 'Support Team',
        sourceType: 'MANUAL',
      };

      const response = await agent
        .post(`/api/raid/issues/projects/${project.id}/issues`)
        .send(issueData);

      expect(response.status).toBe(201);
      expect(response.body.issue).toMatchObject({
        title: issueData.title,
        description: issueData.description,
        severity: issueData.severity,
        status: issueData.status,
        impact: issueData.impact,
        reportedByName: issueData.reportedByName,
      });
    });

    it('lists issues for a project', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      await rawPrisma.projectIssue.createMany({
        data: [
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Issue 1',
            description: 'Description 1',
            severity: 'HIGH',
            status: 'OPEN',
            escalationLevel: 0,
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Issue 2',
            description: 'Description 2',
            severity: 'LOW',
            status: 'RESOLVED',
            escalationLevel: 0,
          },
        ],
      });

      const response = await agent.get(
        `/api/raid/issues/projects/${project.id}/issues`,
      );

      expect(response.status).toBe(200);
      expect(response.body.issues.length).toBeGreaterThanOrEqual(2);
      expect(response.body.total).toBeGreaterThanOrEqual(2);
    });

    it('lists issues with status filter', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      await rawPrisma.projectIssue.createMany({
        data: [
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Open Issue',
            description: 'Open',
            severity: 'MEDIUM',
            status: 'OPEN',
            escalationLevel: 0,
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Resolved Issue',
            description: 'Resolved',
            severity: 'MEDIUM',
            status: 'RESOLVED',
            escalationLevel: 0,
          },
        ],
      });

      const response = await agent
        .get(`/api/raid/issues/projects/${project.id}/issues`)
        .query({ status: 'OPEN' });

      expect(response.status).toBe(200);
      expect(
        response.body.issues.every(
          (i: { status: string }) => i.status === 'OPEN',
        ),
      ).toBe(true);
    });

    it('lists issues with severity filter', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      await rawPrisma.projectIssue.createMany({
        data: [
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Critical Issue',
            description: 'Critical',
            severity: 'CRITICAL',
            status: 'OPEN',
            escalationLevel: 0,
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Low Issue',
            description: 'Low',
            severity: 'LOW',
            status: 'OPEN',
            escalationLevel: 0,
          },
        ],
      });

      const response = await agent
        .get(`/api/raid/issues/projects/${project.id}/issues`)
        .query({ severity: 'CRITICAL' });

      expect(response.status).toBe(200);
      expect(
        response.body.issues.every(
          (i: { severity: string }) => i.severity === 'CRITICAL',
        ),
      ).toBe(true);
    });

    it('gets a single issue by id', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const issue = await rawPrisma.projectIssue.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Specific Issue',
          description: 'Detailed description',
          severity: 'HIGH',
          status: 'IN_PROGRESS',
          escalationLevel: 1,
        },
      });

      const response = await agent.get(`/api/raid/issues/${issue.id}`);

      expect(response.status).toBe(200);
      expect(response.body.issue).toMatchObject({
        id: issue.id,
        title: 'Specific Issue',
        description: 'Detailed description',
        severity: 'HIGH',
        status: 'IN_PROGRESS',
        escalationLevel: 1,
      });
    });

    it('updates an issue with PUT', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const issue = await rawPrisma.projectIssue.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Original Title',
          description: 'Original description',
          severity: 'MEDIUM',
          status: 'OPEN',
          escalationLevel: 0,
        },
      });

      const response = await agent.put(`/api/raid/issues/${issue.id}`).send({
        title: 'Updated Title',
        status: 'IN_PROGRESS',
        resolution: 'Working on fix',
      });

      expect(response.status).toBe(200);
      expect(response.body.issue).toMatchObject({
        id: issue.id,
        title: 'Updated Title',
        status: 'IN_PROGRESS',
        resolution: 'Working on fix',
      });
    });

    it('updates an issue with PATCH', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const issue = await rawPrisma.projectIssue.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Original Title',
          description: 'Original description',
          severity: 'LOW',
          status: 'OPEN',
          escalationLevel: 0,
        },
      });

      const response = await agent.patch(`/api/raid/issues/${issue.id}`).send({
        status: 'RESOLVED',
        resolution: 'Fixed in v1.2.3',
      });

      expect(response.status).toBe(200);
      expect(response.body.issue).toMatchObject({
        id: issue.id,
        title: 'Original Title', // Unchanged
        status: 'RESOLVED', // Updated
        resolution: 'Fixed in v1.2.3',
      });
    });

    it('deletes an issue', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const issue = await rawPrisma.projectIssue.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'To Delete',
          description: 'Will be deleted',
          severity: 'LOW',
          status: 'OPEN',
          escalationLevel: 0,
        },
      });

      const deleteResponse = await agent.delete(`/api/raid/issues/${issue.id}`);
      expect(deleteResponse.status).toBe(204);

      // Verify deletion
      const getResponse = await agent.get(`/api/raid/issues/${issue.id}`);
      expect(getResponse.status).toBe(404);
    });
  });

  // ==========================================================================
  // Escalate Tests
  // ==========================================================================

  describe('escalate', () => {
    it('escalates an issue', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const issue = await rawPrisma.projectIssue.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Issue to Escalate',
          description: 'Needs escalation',
          severity: 'HIGH',
          status: 'OPEN',
          escalationLevel: 0,
        },
      });

      const response = await agent
        .post(`/api/raid/issues/${issue.id}/escalate`)
        .send({
          reason: 'No response from team',
          escalateTo: 'Engineering Manager',
        });

      expect(response.status).toBe(200);
      expect(response.body.issue.escalationLevel).toBe(1);
    });

    it('escalates multiple times', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const issue = await rawPrisma.projectIssue.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Multi-escalate Issue',
          description: 'Needs multiple escalations',
          severity: 'CRITICAL',
          status: 'OPEN',
          escalationLevel: 0,
        },
      });

      // First escalation
      const response1 = await agent
        .post(`/api/raid/issues/${issue.id}/escalate`)
        .send({ reason: 'First escalation' });
      expect(response1.status).toBe(200);
      expect(response1.body.issue.escalationLevel).toBe(1);

      // Second escalation
      const response2 = await agent
        .post(`/api/raid/issues/${issue.id}/escalate`)
        .send({ reason: 'Second escalation' });
      expect(response2.status).toBe(200);
      expect(response2.body.issue.escalationLevel).toBe(2);
    });

    it('prevents escalation beyond maximum level', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const issue = await rawPrisma.projectIssue.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Max Escalated Issue',
          description: 'At max escalation',
          severity: 'CRITICAL',
          status: 'OPEN',
          escalationLevel: 5, // Maximum level
        },
      });

      const response = await agent
        .post(`/api/raid/issues/${issue.id}/escalate`)
        .send({ reason: 'Beyond max' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'Issue has reached maximum escalation level',
      );
    });
  });

  // ==========================================================================
  // Status and Severity Counts Tests
  // ==========================================================================

  describe('counts', () => {
    it('returns status counts for a project', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      await rawPrisma.projectIssue.createMany({
        data: [
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Open 1',
            description: 'Open',
            severity: 'MEDIUM',
            status: 'OPEN',
            escalationLevel: 0,
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Open 2',
            description: 'Open',
            severity: 'HIGH',
            status: 'OPEN',
            escalationLevel: 0,
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Resolved',
            description: 'Resolved',
            severity: 'LOW',
            status: 'RESOLVED',
            escalationLevel: 0,
          },
        ],
      });

      const response = await agent.get(
        `/api/raid/issues/projects/${project.id}/issues/counts`,
      );

      expect(response.status).toBe(200);
      expect(response.body.counts).toBeDefined();
      expect(response.body.counts.OPEN).toBeGreaterThanOrEqual(2);
      expect(response.body.counts.RESOLVED).toBeGreaterThanOrEqual(1);
    });

    it('returns severity counts for a project', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      await rawPrisma.projectIssue.createMany({
        data: [
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Critical 1',
            description: 'Critical',
            severity: 'CRITICAL',
            status: 'OPEN',
            escalationLevel: 0,
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Critical 2',
            description: 'Critical',
            severity: 'CRITICAL',
            status: 'OPEN',
            escalationLevel: 0,
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Low',
            description: 'Low',
            severity: 'LOW',
            status: 'OPEN',
            escalationLevel: 0,
          },
        ],
      });

      const response = await agent.get(
        `/api/raid/issues/projects/${project.id}/issues/severity-counts`,
      );

      expect(response.status).toBe(200);
      expect(response.body.counts).toBeDefined();
      expect(response.body.counts.CRITICAL).toBeGreaterThanOrEqual(2);
      expect(response.body.counts.LOW).toBeGreaterThanOrEqual(1);
    });

    it('returns critical issues for a project', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      await rawPrisma.projectIssue.createMany({
        data: [
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Critical Issue',
            description: 'Critical',
            severity: 'CRITICAL',
            status: 'OPEN',
            escalationLevel: 0,
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Low Issue',
            description: 'Low',
            severity: 'LOW',
            status: 'OPEN',
            escalationLevel: 0,
          },
        ],
      });

      const response = await agent.get(
        `/api/raid/issues/projects/${project.id}/issues/critical`,
      );

      expect(response.status).toBe(200);
      expect(response.body.issues).toBeDefined();
      expect(
        response.body.issues.every(
          (i: { severity: string }) => i.severity === 'CRITICAL',
        ),
      ).toBe(true);
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    it('returns 404 for non-existent project', async () => {
      const agent = getAgent();

      const response = await agent.get(
        '/api/raid/issues/projects/99999/issues',
      );

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project not found');
    });

    it('returns 404 for non-existent issue', async () => {
      const agent = getAgent();

      const response = await agent.get('/api/raid/issues/99999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Issue not found');
    });

    it('returns 404 when updating non-existent issue', async () => {
      const agent = getAgent();

      const response = await agent
        .put('/api/raid/issues/99999')
        .send({ title: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Issue not found');
    });

    it('returns 404 when deleting non-existent issue', async () => {
      const agent = getAgent();

      const response = await agent.delete('/api/raid/issues/99999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Issue not found');
    });

    it('returns 404 when escalating non-existent issue', async () => {
      const agent = getAgent();

      const response = await agent
        .post('/api/raid/issues/99999/escalate')
        .send({ reason: 'Test' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Issue not found');
    });
  });

  // ==========================================================================
  // Authorization Tests
  // ==========================================================================

  describe('authorization', () => {
    let testEnv2: TestEnvironment;

    beforeAll(async () => {
      testEnv2 = await createTestEnvironment(
        `issues-auth-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      );
    });

    afterAll(async () => {
      await cleanupTestEnvironment(testEnv2.tenant.id);
    });

    it('prevents access to other tenant issues', async () => {
      const { project } = await createProjectForTest();

      await rawPrisma.projectIssue.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Tenant 1 Issue',
          description: 'Issue',
          severity: 'MEDIUM',
          status: 'OPEN',
          escalationLevel: 0,
        },
      });

      const agent2 = createTenantAgent(app, testEnv2.token, testEnv2.tenant.id);
      const response = await agent2.get(
        `/api/raid/issues/projects/${project.id}/issues`,
      );

      expect(response.status).toBe(404);
    });

    it('prevents creating issues in other tenant projects', async () => {
      const { project } = await createProjectForTest();

      const agent2 = createTenantAgent(app, testEnv2.token, testEnv2.tenant.id);
      const response = await agent2
        .post(`/api/raid/issues/projects/${project.id}/issues`)
        .send({ title: 'Malicious Issue', description: 'Attack' });

      expect(response.status).toBe(404);
    });

    it('prevents updating issues in other tenant projects', async () => {
      const { project } = await createProjectForTest();

      const issue = await rawPrisma.projectIssue.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Protected Issue',
          description: 'Protected',
          severity: 'HIGH',
          status: 'OPEN',
          escalationLevel: 0,
        },
      });

      const agent2 = createTenantAgent(app, testEnv2.token, testEnv2.tenant.id);
      const response = await agent2
        .put(`/api/raid/issues/${issue.id}`)
        .send({ title: 'Hacked' });

      expect(response.status).toBe(404);
    });

    it('prevents deleting issues in other tenant projects', async () => {
      const { project } = await createProjectForTest();

      const issue = await rawPrisma.projectIssue.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Protected Issue',
          description: 'Protected',
          severity: 'CRITICAL',
          status: 'OPEN',
          escalationLevel: 0,
        },
      });

      const agent2 = createTenantAgent(app, testEnv2.token, testEnv2.tenant.id);
      const response = await agent2.delete(`/api/raid/issues/${issue.id}`);

      expect(response.status).toBe(404);

      // Verify issue still exists
      const verify = await rawPrisma.projectIssue.findUnique({
        where: { id: issue.id },
      });
      expect(verify).not.toBeNull();
    });

    it('prevents escalating issues in other tenant projects', async () => {
      const { project } = await createProjectForTest();

      const issue = await rawPrisma.projectIssue.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Protected Issue',
          description: 'Protected',
          severity: 'HIGH',
          status: 'OPEN',
          escalationLevel: 0,
        },
      });

      const agent2 = createTenantAgent(app, testEnv2.token, testEnv2.tenant.id);
      const response = await agent2
        .post(`/api/raid/issues/${issue.id}/escalate`)
        .send({ reason: 'Malicious escalation' });

      expect(response.status).toBe(404);

      // Verify escalation level unchanged
      const verify = await rawPrisma.projectIssue.findUnique({
        where: { id: issue.id },
      });
      expect(verify?.escalationLevel).toBe(0);
    });
  });
});
