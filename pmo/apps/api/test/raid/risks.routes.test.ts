/**
 * Risks Router Tests
 *
 * Tests for the RAID module's Risks REST API endpoints.
 * Tests cover CRUD operations, authentication, validation, and authorization.
 *
 * @module test/raid/risks.routes
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

describe('RAID Risks Routes', () => {
  let testEnv: TestEnvironment;

  beforeAll(async () => {
    testEnv = await createTestEnvironment(
      `risks-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
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
    it('blocks unauthenticated access to list risks', async () => {
      const response = await request(app).get(
        '/api/raid/risks/projects/1/risks',
      );
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('blocks unauthenticated access to create risk', async () => {
      const response = await request(app)
        .post('/api/raid/risks/projects/1/risks')
        .send({ title: 'Test Risk' });
      expect(response.status).toBe(401);
    });

    it('blocks unauthenticated access to get risk by id', async () => {
      const response = await request(app).get('/api/raid/risks/1');
      expect(response.status).toBe(401);
    });

    it('blocks unauthenticated access to update risk', async () => {
      const response = await request(app)
        .put('/api/raid/risks/1')
        .send({ title: 'Updated' });
      expect(response.status).toBe(401);
    });

    it('blocks unauthenticated access to delete risk', async () => {
      const response = await request(app).delete('/api/raid/risks/1');
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
        '/api/raid/risks/projects/not-a-number/risks',
      );

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid project id');
    });

    it('validates risk id - invalid format', async () => {
      const agent = getAgent();

      const response = await agent.get('/api/raid/risks/invalid');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid risk id');
    });

    it('validates risk payload - missing title', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/risks/projects/${project.id}/risks`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid risk data');
    });

    it('validates risk payload - title too long', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/risks/projects/${project.id}/risks`)
        .send({ title: 'a'.repeat(501) });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid risk data');
    });

    it('validates risk payload - invalid severity', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/risks/projects/${project.id}/risks`)
        .send({ title: 'Test Risk', severity: 'INVALID' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid risk data');
    });

    it('validates risk payload - invalid likelihood', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/risks/projects/${project.id}/risks`)
        .send({ title: 'Test Risk', likelihood: 'INVALID' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid risk data');
    });

    it('validates risk payload - invalid status', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/risks/projects/${project.id}/risks`)
        .send({ title: 'Test Risk', status: 'INVALID' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid risk data');
    });
  });

  // ==========================================================================
  // CRUD Operations Tests
  // ==========================================================================

  describe('CRUD operations', () => {
    it('creates a risk with minimal data', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/risks/projects/${project.id}/risks`)
        .send({ title: 'New Risk' });

      expect(response.status).toBe(201);
      expect(response.body.risk).toMatchObject({
        title: 'New Risk',
        projectId: project.id,
        severity: 'MEDIUM',
        likelihood: 'POSSIBLE',
        status: 'IDENTIFIED',
        category: 'TECHNICAL',
      });
      expect(response.body.risk.id).toBeDefined();
    });

    it('creates a risk with full data', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const riskData = {
        title: 'Critical API Dependency Risk',
        description: 'Third-party API may be deprecated',
        severity: 'HIGH',
        likelihood: 'LIKELY',
        status: 'ANALYZING',
        category: 'EXTERNAL',
        suggestedMitigation: 'Develop fallback API integration',
        sourceType: 'MANUAL',
        confidence: 0.9,
      };

      const response = await agent
        .post(`/api/raid/risks/projects/${project.id}/risks`)
        .send(riskData);

      expect(response.status).toBe(201);
      expect(response.body.risk).toMatchObject({
        title: riskData.title,
        description: riskData.description,
        severity: riskData.severity,
        likelihood: riskData.likelihood,
        status: riskData.status,
        category: riskData.category,
        suggestedMitigation: riskData.suggestedMitigation,
        confidence: riskData.confidence,
      });
    });

    it('lists risks for a project', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      // Create multiple risks
      await rawPrisma.projectRisk.createMany({
        data: [
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Risk 1',
            description: 'Description 1',
            severity: 'CRITICAL',
            likelihood: 'LIKELY',
            status: 'IDENTIFIED',
            category: 'TIMELINE',
            sourceType: 'MANUAL',
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Risk 2',
            description: 'Description 2',
            severity: 'LOW',
            likelihood: 'RARE',
            status: 'RESOLVED',
            category: 'BUDGET',
            sourceType: 'MANUAL',
          },
        ],
      });

      const response = await agent.get(
        `/api/raid/risks/projects/${project.id}/risks`,
      );

      expect(response.status).toBe(200);
      expect(response.body.risks.length).toBeGreaterThanOrEqual(2);
      expect(response.body.total).toBeGreaterThanOrEqual(2);
    });

    it('lists risks with status filter', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      await rawPrisma.projectRisk.createMany({
        data: [
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Active Risk',
            description: '',
            severity: 'MEDIUM',
            likelihood: 'POSSIBLE',
            status: 'MITIGATING',
            category: 'TECHNICAL',
            sourceType: 'MANUAL',
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Closed Risk',
            description: '',
            severity: 'LOW',
            likelihood: 'RARE',
            status: 'RESOLVED',
            category: 'TECHNICAL',
            sourceType: 'MANUAL',
          },
        ],
      });

      const response = await agent
        .get(`/api/raid/risks/projects/${project.id}/risks`)
        .query({ status: 'MITIGATING' });

      expect(response.status).toBe(200);
      expect(
        response.body.risks.every(
          (r: { status: string }) => r.status === 'MITIGATING',
        ),
      ).toBe(true);
    });

    it('lists risks with severity filter', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      await rawPrisma.projectRisk.createMany({
        data: [
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Critical Risk',
            description: '',
            severity: 'CRITICAL',
            likelihood: 'LIKELY',
            status: 'IDENTIFIED',
            category: 'TECHNICAL',
            sourceType: 'MANUAL',
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Low Risk',
            description: '',
            severity: 'LOW',
            likelihood: 'RARE',
            status: 'IDENTIFIED',
            category: 'TECHNICAL',
            sourceType: 'MANUAL',
          },
        ],
      });

      const response = await agent
        .get(`/api/raid/risks/projects/${project.id}/risks`)
        .query({ severity: 'CRITICAL' });

      expect(response.status).toBe(200);
      expect(
        response.body.risks.every(
          (r: { severity: string }) => r.severity === 'CRITICAL',
        ),
      ).toBe(true);
    });

    it('gets a single risk by id', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const risk = await rawPrisma.projectRisk.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Specific Risk',
          description: 'Detailed description',
          severity: 'HIGH',
          likelihood: 'POSSIBLE',
          status: 'MONITORING',
          category: 'RESOURCE',
          sourceType: 'MANUAL',
        },
      });

      const response = await agent.get(`/api/raid/risks/${risk.id}`);

      expect(response.status).toBe(200);
      expect(response.body.risk).toMatchObject({
        id: risk.id,
        title: 'Specific Risk',
        description: 'Detailed description',
        severity: 'HIGH',
        likelihood: 'POSSIBLE',
        status: 'MONITORING',
        category: 'RESOURCE',
      });
    });

    it('updates a risk with PUT', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const risk = await rawPrisma.projectRisk.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Original Title',
          description: '',
          severity: 'MEDIUM',
          likelihood: 'POSSIBLE',
          status: 'IDENTIFIED',
          category: 'TECHNICAL',
          sourceType: 'MANUAL',
        },
      });

      const response = await agent.put(`/api/raid/risks/${risk.id}`).send({
        title: 'Updated Title',
        severity: 'HIGH',
        status: 'MITIGATING',
        suggestedMitigation: 'New mitigation plan',
      });

      expect(response.status).toBe(200);
      expect(response.body.risk).toMatchObject({
        id: risk.id,
        title: 'Updated Title',
        severity: 'HIGH',
        status: 'MITIGATING',
        suggestedMitigation: 'New mitigation plan',
      });
    });

    it('updates a risk with PATCH', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const risk = await rawPrisma.projectRisk.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Original Title',
          description: 'Original description',
          severity: 'LOW',
          likelihood: 'UNLIKELY',
          status: 'IDENTIFIED',
          category: 'SCOPE',
          sourceType: 'MANUAL',
        },
      });

      const response = await agent.patch(`/api/raid/risks/${risk.id}`).send({
        status: 'RESOLVED',
      });

      expect(response.status).toBe(200);
      expect(response.body.risk).toMatchObject({
        id: risk.id,
        title: 'Original Title', // Unchanged
        status: 'RESOLVED', // Updated
      });
    });

    it('deletes a risk', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const risk = await rawPrisma.projectRisk.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Risk to Delete',
          description: '',
          severity: 'LOW',
          likelihood: 'RARE',
          status: 'IDENTIFIED',
          category: 'TECHNICAL',
          sourceType: 'MANUAL',
        },
      });

      const deleteResponse = await agent.delete(`/api/raid/risks/${risk.id}`);
      expect(deleteResponse.status).toBe(204);

      // Verify deletion
      const getResponse = await agent.get(`/api/raid/risks/${risk.id}`);
      expect(getResponse.status).toBe(404);
    });
  });

  // ==========================================================================
  // Error Handling Tests
  // ==========================================================================

  describe('error handling', () => {
    it('returns 404 for non-existent project', async () => {
      const agent = getAgent();

      const response = await agent.get('/api/raid/risks/projects/99999/risks');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project not found');
    });

    it('returns 404 for non-existent risk', async () => {
      const agent = getAgent();

      const response = await agent.get('/api/raid/risks/99999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Risk not found');
    });

    it('returns 404 when updating non-existent risk', async () => {
      const agent = getAgent();

      const response = await agent
        .put('/api/raid/risks/99999')
        .send({ title: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Risk not found');
    });

    it('returns 404 when deleting non-existent risk', async () => {
      const agent = getAgent();

      const response = await agent.delete('/api/raid/risks/99999');

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Risk not found');
    });
  });

  // ==========================================================================
  // Authorization Tests
  // ==========================================================================

  describe('authorization', () => {
    let testEnv2: TestEnvironment;

    beforeAll(async () => {
      testEnv2 = await createTestEnvironment(
        `risks-auth-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      );
    });

    afterAll(async () => {
      await cleanupTestEnvironment(testEnv2.tenant.id);
    });

    it('prevents access to other tenant project risks', async () => {
      const { project } = await createProjectForTest();

      // Create risk in tenant 1
      await rawPrisma.projectRisk.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Tenant 1 Risk',
          description: '',
          severity: 'MEDIUM',
          likelihood: 'POSSIBLE',
          status: 'IDENTIFIED',
          category: 'TECHNICAL',
          sourceType: 'MANUAL',
        },
      });

      // User in tenant 2 tries to access
      const agent2 = createTenantAgent(app, testEnv2.token, testEnv2.tenant.id);
      const response = await agent2.get(
        `/api/raid/risks/projects/${project.id}/risks`,
      );

      // Should be 404 (project not found in their tenant)
      expect(response.status).toBe(404);
    });

    it('prevents creating risks in other tenant projects', async () => {
      const { project } = await createProjectForTest();

      const agent2 = createTenantAgent(app, testEnv2.token, testEnv2.tenant.id);
      const response = await agent2
        .post(`/api/raid/risks/projects/${project.id}/risks`)
        .send({ title: 'Malicious Risk' });

      expect(response.status).toBe(404);
    });

    it('prevents updating risks in other tenant projects', async () => {
      const { project } = await createProjectForTest();

      const risk = await rawPrisma.projectRisk.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Original Risk',
          description: '',
          severity: 'MEDIUM',
          likelihood: 'POSSIBLE',
          status: 'IDENTIFIED',
          category: 'TECHNICAL',
          sourceType: 'MANUAL',
        },
      });

      const agent2 = createTenantAgent(app, testEnv2.token, testEnv2.tenant.id);
      const response = await agent2
        .put(`/api/raid/risks/${risk.id}`)
        .send({ title: 'Hacked' });

      expect(response.status).toBe(404);
    });

    it('prevents deleting risks in other tenant projects', async () => {
      const { project } = await createProjectForTest();

      const risk = await rawPrisma.projectRisk.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Protected Risk',
          description: '',
          severity: 'HIGH',
          likelihood: 'LIKELY',
          status: 'IDENTIFIED',
          category: 'TECHNICAL',
          sourceType: 'MANUAL',
        },
      });

      const agent2 = createTenantAgent(app, testEnv2.token, testEnv2.tenant.id);
      const response = await agent2.delete(`/api/raid/risks/${risk.id}`);

      expect(response.status).toBe(404);

      // Verify risk still exists
      const verify = await rawPrisma.projectRisk.findUnique({
        where: { id: risk.id },
      });
      expect(verify).not.toBeNull();
    });
  });

  // ==========================================================================
  // Pagination Tests
  // ==========================================================================

  describe('pagination', () => {
    it('supports pagination with limit and offset', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      // Create 5 risks
      for (let i = 0; i < 5; i++) {
        await rawPrisma.projectRisk.create({
          data: {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: `Risk ${i + 1}`,
            description: '',
            severity: 'MEDIUM',
            likelihood: 'POSSIBLE',
            status: 'IDENTIFIED',
            category: 'TECHNICAL',
            sourceType: 'MANUAL',
          },
        });
      }

      const response = await agent
        .get(`/api/raid/risks/projects/${project.id}/risks`)
        .query({ limit: 2, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body.risks.length).toBe(2);
      expect(response.body.total).toBeGreaterThanOrEqual(5);
    });

    it('returns correct offset results', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      // Create 3 risks
      for (let i = 0; i < 3; i++) {
        await rawPrisma.projectRisk.create({
          data: {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: `Risk ${i + 1}`,
            description: '',
            severity: 'MEDIUM',
            likelihood: 'POSSIBLE',
            status: 'IDENTIFIED',
            category: 'TECHNICAL',
            sourceType: 'MANUAL',
          },
        });
      }

      const response = await agent
        .get(`/api/raid/risks/projects/${project.id}/risks`)
        .query({ limit: 2, offset: 2 });

      expect(response.status).toBe(200);
      expect(response.body.risks.length).toBeGreaterThanOrEqual(1);
    });
  });
});
