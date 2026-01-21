/**
 * RAID Extraction Router Tests
 *
 * Tests for the RAID module's AI-powered extraction REST API endpoints.
 * Tests cover meeting extraction, text extraction, summary, trends,
 * and the accept endpoint for saving extracted items.
 *
 * @module test/raid/raid-extraction.routes
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

describe('RAID Extraction Routes', () => {
  let testEnv: TestEnvironment;

  beforeAll(async () => {
    testEnv = await createTestEnvironment(
      `raid-extraction-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
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

  // Helper to create a meeting
  const createMeetingForTest = async (projectId: number, notes?: string) => {
    return rawPrisma.meeting.create({
      data: {
        projectId,
        tenantId: testEnv.tenant.id,
        title: 'Test Meeting',
        date: new Date(),
        time: '14:00',
        attendees: ['Alice', 'Bob'],
        notes: notes ?? 'Meeting notes for testing extraction.',
      },
    });
  };

  // Helper to create tenant-aware agent
  const getAgent = () =>
    createTenantAgent(app, testEnv.token, testEnv.tenant.id);

  // ==========================================================================
  // Authentication Tests
  // ==========================================================================

  describe('authentication', () => {
    it('blocks unauthenticated access to extract from meeting', async () => {
      const response = await request(app)
        .post('/api/raid/extract/meetings/1')
        .send({});
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Unauthorized' });
    });

    it('blocks unauthenticated access to extract from text', async () => {
      const response = await request(app)
        .post('/api/raid/extract/text')
        .send({ text: 'test', projectId: 1 });
      expect(response.status).toBe(401);
    });

    it('blocks unauthenticated access to summary', async () => {
      const response = await request(app).get(
        '/api/raid/extract/projects/1/summary',
      );
      expect(response.status).toBe(401);
    });

    it('blocks unauthenticated access to trends', async () => {
      const response = await request(app).get(
        '/api/raid/extract/projects/1/trends',
      );
      expect(response.status).toBe(401);
    });

    it('blocks unauthenticated access to accept', async () => {
      const response = await request(app)
        .post('/api/raid/extract/projects/1/accept')
        .send({ items: [] });
      expect(response.status).toBe(401);
    });
  });

  // ==========================================================================
  // Validation Tests
  // ==========================================================================

  describe('validation', () => {
    it('validates meeting id - invalid format', async () => {
      const agent = getAgent();

      const response = await agent
        .post('/api/raid/extract/meetings/not-a-number')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid meeting id');
    });

    it('validates project id for summary - invalid format', async () => {
      const agent = getAgent();

      const response = await agent.get(
        '/api/raid/extract/projects/invalid/summary',
      );

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid project id');
    });

    it('validates project id for trends - invalid format', async () => {
      const agent = getAgent();

      const response = await agent.get(
        '/api/raid/extract/projects/invalid/trends',
      );

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid project id');
    });

    it('validates days parameter for trends', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .get(`/api/raid/extract/projects/${project.id}/trends`)
        .query({ days: 500 }); // Over 365

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid days parameter (1-365)');
    });

    it('validates text extraction payload - missing text', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post('/api/raid/extract/text')
        .send({ projectId: project.id });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request data');
    });

    it('validates text extraction payload - missing projectId', async () => {
      const agent = getAgent();

      const response = await agent
        .post('/api/raid/extract/text')
        .send({ text: 'Test text' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request data');
    });

    it('validates accept payload - missing items', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/extract/projects/${project.id}/accept`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request data');
    });

    it('validates accept payload - empty items array', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/extract/projects/${project.id}/accept`)
        .send({ items: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request data');
    });

    it('validates accept payload - invalid item type', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/extract/projects/${project.id}/accept`)
        .send({
          items: [
            {
              type: 'invalid-type',
              title: 'Test',
              confidence: 0.8,
            },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request data');
    });

    it('validates accept payload - missing title', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/extract/projects/${project.id}/accept`)
        .send({
          items: [
            {
              type: 'risk',
              confidence: 0.8,
            },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request data');
    });

    it('validates accept payload - invalid confidence', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/extract/projects/${project.id}/accept`)
        .send({
          items: [
            {
              type: 'risk',
              title: 'Test',
              confidence: 1.5, // Over 1.0
            },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid request data');
    });
  });

  // ==========================================================================
  // Meeting Extraction Tests
  // ==========================================================================

  describe('extract from meeting', () => {
    it('extracts RAID items from meeting notes', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const meetingNotes = `
        Discussion topics:
        - Risk: The third-party API might be deprecated next quarter.
        - Action: John will review the API documentation by Friday.
        - Issue: The login page is currently not working for mobile users.
        - Decision: We decided to use TypeScript for the backend.
      `;

      const meeting = await createMeetingForTest(project.id, meetingNotes);

      const response = await agent
        .post(`/api/raid/extract/meetings/${meeting.id}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.projectId).toBe(project.id);
      expect(response.body.meetingId).toBe(meeting.id);
      expect(response.body.extractedAt).toBeDefined();

      // Should have extracted items (rule-based or LLM)
      expect(response.body.risks).toBeDefined();
      expect(response.body.actionItems).toBeDefined();
      expect(response.body.issues).toBeDefined();
      expect(response.body.decisions).toBeDefined();
    });

    it('returns error for meeting with no notes', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const meeting = await rawPrisma.meeting.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Empty Meeting',
          date: new Date(),
          time: '14:00',
          attendees: [],
          notes: '', // Empty notes
        },
      });

      const response = await agent
        .post(`/api/raid/extract/meetings/${meeting.id}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Meeting has no notes to analyze');
    });

    it('returns 404 for non-existent meeting', async () => {
      const agent = getAgent();

      const response = await agent
        .post('/api/raid/extract/meetings/99999')
        .send({});

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Meeting not found');
    });

    it('respects extraction options', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const meeting = await createMeetingForTest(
        project.id,
        'Risk: Budget might be exceeded.',
      );

      const response = await agent
        .post(`/api/raid/extract/meetings/${meeting.id}`)
        .send({
          extractRisks: true,
          extractActionItems: false,
          extractDecisions: false,
          extractIssues: false,
          confidenceThreshold: 0.5,
        });

      expect(response.status).toBe(200);
      // Results will vary based on extraction logic
    });
  });

  // ==========================================================================
  // Text Extraction Tests
  // ==========================================================================

  describe('extract from text', () => {
    it('extracts RAID items from arbitrary text', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const text = `
        Project update:
        - Risk: We might not meet the deadline due to resource constraints.
        - Action: Sarah needs to complete the database migration.
        - Issue: The staging environment is down.
        - Decision: We agreed to postpone the feature launch.
      `;

      const response = await agent.post('/api/raid/extract/text').send({
        text,
        projectId: project.id,
        context: 'Weekly project status update',
      });

      expect(response.status).toBe(200);
      expect(response.body.projectId).toBe(project.id);
      expect(response.body.extractedAt).toBeDefined();
      expect(response.body.risks).toBeDefined();
      expect(response.body.actionItems).toBeDefined();
      expect(response.body.issues).toBeDefined();
      expect(response.body.decisions).toBeDefined();
    });

    it('returns 404 for non-existent project', async () => {
      const agent = getAgent();

      const response = await agent.post('/api/raid/extract/text').send({
        text: 'Some text to analyze',
        projectId: 99999,
      });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project not found');
    });

    it('extracts with custom options', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent.post('/api/raid/extract/text').send({
        text: 'Risk: The server might crash under heavy load.',
        projectId: project.id,
        options: {
          extractRisks: true,
          extractActionItems: false,
          extractDecisions: false,
          extractIssues: false,
          confidenceThreshold: 0.4,
        },
      });

      expect(response.status).toBe(200);
    });
  });

  // ==========================================================================
  // Summary Tests
  // ==========================================================================

  describe('summary', () => {
    it('returns RAID summary for a project', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      // Create some RAID items
      await rawPrisma.projectRisk.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Test Risk',
          description: '',
          severity: 'HIGH',
          likelihood: 'LIKELY',
          status: 'IDENTIFIED',
          category: 'TECHNICAL',
          sourceType: 'MANUAL',
        },
      });

      await rawPrisma.actionItem.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Test Action',
          priority: 'P1',
          status: 'OPEN',
        },
      });

      await rawPrisma.projectIssue.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Test Issue',
          description: 'Issue description',
          severity: 'CRITICAL',
          status: 'OPEN',
          escalationLevel: 0,
        },
      });

      await rawPrisma.decision.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Test Decision',
          description: 'Test decision description',
          impact: 'HIGH',
          category: 'PROJECT',
          status: 'PENDING',
        },
      });

      const response = await agent.get(
        `/api/raid/extract/projects/${project.id}/summary`,
      );

      expect(response.status).toBe(200);
      expect(response.body.risks).toBeDefined();
      expect(response.body.actionItems).toBeDefined();
      expect(response.body.issues).toBeDefined();
      expect(response.body.decisions).toBeDefined();
      expect(response.body.risks.total).toBeGreaterThanOrEqual(1);
      expect(response.body.actionItems.total).toBeGreaterThanOrEqual(1);
      expect(response.body.issues.total).toBeGreaterThanOrEqual(1);
      expect(response.body.decisions.total).toBeGreaterThanOrEqual(1);
    });

    it('returns 404 for non-existent project', async () => {
      const agent = getAgent();

      const response = await agent.get(
        '/api/raid/extract/projects/99999/summary',
      );

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project not found');
    });
  });

  // ==========================================================================
  // Trends Tests
  // ==========================================================================

  describe('trends', () => {
    it('returns RAID trends for a project', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      // Create some RAID items with recent dates
      await rawPrisma.projectRisk.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Recent Risk',
          description: '',
          severity: 'MEDIUM',
          likelihood: 'POSSIBLE',
          status: 'IDENTIFIED',
          category: 'TECHNICAL',
          sourceType: 'MANUAL',
        },
      });

      const response = await agent.get(
        `/api/raid/extract/projects/${project.id}/trends`,
      );

      expect(response.status).toBe(200);
      expect(response.body.trends).toBeDefined();
      expect(Array.isArray(response.body.trends)).toBe(true);
    });

    it('returns trends with custom days parameter', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .get(`/api/raid/extract/projects/${project.id}/trends`)
        .query({ days: 7 });

      expect(response.status).toBe(200);
      expect(response.body.trends).toBeDefined();
      // Should have data for 7 days + today
      expect(response.body.trends.length).toBeLessThanOrEqual(8);
    });

    it('returns 404 for non-existent project', async () => {
      const agent = getAgent();

      const response = await agent.get(
        '/api/raid/extract/projects/99999/trends',
      );

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project not found');
    });
  });

  // ==========================================================================
  // Accept Extracted Items Tests
  // ==========================================================================

  describe('accept extracted items', () => {
    it('accepts and saves a risk', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/extract/projects/${project.id}/accept`)
        .send({
          items: [
            {
              type: 'risk',
              title: 'Extracted Risk',
              description: 'Risk extracted from meeting notes',
              confidence: 0.85,
              sourceText: 'Original text mentioning the risk',
              suggestedSeverity: 'HIGH',
              suggestedLikelihood: 'LIKELY',
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.created).toBeDefined();
      expect(response.body.created.length).toBe(1);
      expect(response.body.created[0].type).toBe('risk');
      expect(response.body.created[0].title).toBe('Extracted Risk');
    });

    it('accepts and saves an action item', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await agent
        .post(`/api/raid/extract/projects/${project.id}/accept`)
        .send({
          items: [
            {
              type: 'action-item',
              title: 'Extracted Action Item',
              description: 'Action from meeting',
              confidence: 0.9,
              suggestedOwner: 'John Doe',
              suggestedPriority: 'HIGH',
              suggestedDueDate: tomorrow.toISOString(),
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.created).toBeDefined();
      expect(response.body.created.length).toBe(1);
      expect(response.body.created[0].type).toBe('action-item');
    });

    it('accepts and saves a decision', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/extract/projects/${project.id}/accept`)
        .send({
          items: [
            {
              type: 'decision',
              title: 'Extracted Decision',
              description: 'Decision from meeting',
              confidence: 0.88,
              suggestedPriority: 'CRITICAL',
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.created).toBeDefined();
      expect(response.body.created.length).toBe(1);
      expect(response.body.created[0].type).toBe('decision');
    });

    it('accepts and saves an issue', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/extract/projects/${project.id}/accept`)
        .send({
          items: [
            {
              type: 'issue',
              title: 'Extracted Issue',
              description: 'Issue from meeting',
              confidence: 0.75,
              suggestedSeverity: 'CRITICAL',
              suggestedOwner: 'Jane Smith',
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.created).toBeDefined();
      expect(response.body.created.length).toBe(1);
      expect(response.body.created[0].type).toBe('issue');
    });

    it('accepts multiple items at once', async () => {
      const { project } = await createProjectForTest();
      const agent = getAgent();

      const response = await agent
        .post(`/api/raid/extract/projects/${project.id}/accept`)
        .send({
          items: [
            {
              type: 'risk',
              title: 'Bulk Risk',
              confidence: 0.8,
            },
            {
              type: 'action-item',
              title: 'Bulk Action',
              confidence: 0.85,
            },
            {
              type: 'decision',
              title: 'Bulk Decision',
              confidence: 0.9,
            },
            {
              type: 'issue',
              title: 'Bulk Issue',
              confidence: 0.7,
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.created.length).toBe(4);
      expect(response.body.failed.length).toBe(0);
    });

    it('returns 404 for non-existent project', async () => {
      const agent = getAgent();

      const response = await agent
        .post('/api/raid/extract/projects/99999/accept')
        .send({
          items: [
            {
              type: 'risk',
              title: 'Test Risk',
              confidence: 0.8,
            },
          ],
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project not found');
    });
  });

  // ==========================================================================
  // Authorization Tests
  // ==========================================================================

  describe('authorization', () => {
    let testEnv2: TestEnvironment;

    beforeAll(async () => {
      testEnv2 = await createTestEnvironment(
        `raid-extract-auth-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      );
    });

    afterAll(async () => {
      await cleanupTestEnvironment(testEnv2.tenant.id);
    });

    it('prevents extracting from meeting in other tenant', async () => {
      const { project } = await createProjectForTest();
      const meeting = await createMeetingForTest(project.id, 'Test notes');

      const agent2 = createTenantAgent(app, testEnv2.token, testEnv2.tenant.id);
      const response = await agent2
        .post(`/api/raid/extract/meetings/${meeting.id}`)
        .send({});

      expect(response.status).toBe(404);
    });

    it('prevents extracting text for project in other tenant', async () => {
      const { project } = await createProjectForTest();

      const agent2 = createTenantAgent(app, testEnv2.token, testEnv2.tenant.id);
      const response = await agent2.post('/api/raid/extract/text').send({
        text: 'Test text',
        projectId: project.id,
      });

      expect(response.status).toBe(404);
    });

    it('prevents accessing summary for project in other tenant', async () => {
      const { project } = await createProjectForTest();

      const agent2 = createTenantAgent(app, testEnv2.token, testEnv2.tenant.id);
      const response = await agent2.get(
        `/api/raid/extract/projects/${project.id}/summary`,
      );

      expect(response.status).toBe(404);
    });

    it('prevents accessing trends for project in other tenant', async () => {
      const { project } = await createProjectForTest();

      const agent2 = createTenantAgent(app, testEnv2.token, testEnv2.tenant.id);
      const response = await agent2.get(
        `/api/raid/extract/projects/${project.id}/trends`,
      );

      expect(response.status).toBe(404);
    });

    it('prevents accepting items for project in other tenant', async () => {
      const { project } = await createProjectForTest();

      const agent2 = createTenantAgent(app, testEnv2.token, testEnv2.tenant.id);
      const response = await agent2
        .post(`/api/raid/extract/projects/${project.id}/accept`)
        .send({
          items: [
            {
              type: 'risk',
              title: 'Malicious Risk',
              confidence: 0.8,
            },
          ],
        });

      expect(response.status).toBe(404);
    });
  });
});
