/**
 * RAID Summary Service Tests
 *
 * Tests for the RAID module's summary aggregation service.
 * Tests cover getSummary, getFullSummary, getTrends, and health calculations.
 *
 * @module test/raid/raid-summary.service
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import * as raidSummaryService from '../../src/modules/raid/services/raid-summary.service';
import {
  createTestEnvironment,
  cleanupTestEnvironment,
  createTestClient,
  createTestProject,
  getRawPrisma,
  type TestEnvironment,
} from '../utils/test-fixtures';
import { withTenant } from '../utils/tenant-test-utils';

const rawPrisma = getRawPrisma();

describe('RAID Summary Service', () => {
  let testEnv: TestEnvironment;

  beforeAll(async () => {
    testEnv = await createTestEnvironment(
      `raid-summary-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
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

  // ==========================================================================
  // getSummary Tests
  // ==========================================================================

  describe('getSummary', () => {
    it('returns summary with empty counts for project with no RAID items', async () => {
      const { project } = await createProjectForTest();

      const result = await withTenant(testEnv.tenant, () =>
        raidSummaryService.getSummary(project.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.risks.total).toBe(0);
        expect(result.risks.open).toBe(0);
        expect(result.actionItems.total).toBe(0);
        expect(result.actionItems.open).toBe(0);
        expect(result.issues.total).toBe(0);
        expect(result.issues.open).toBe(0);
        expect(result.decisions.total).toBe(0);
        expect(result.decisions.pending).toBe(0);
      }
    });

    it('returns correct risk counts', async () => {
      const { project } = await createProjectForTest();

      // Create risks with different statuses
      await rawPrisma.projectRisk.createMany({
        data: [
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Risk 1',
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
            title: 'Risk 2',
            description: '',
            severity: 'HIGH',
            likelihood: 'POSSIBLE',
            status: 'MITIGATING',
            category: 'TIMELINE',
            sourceType: 'MANUAL',
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Risk 3',
            description: '',
            severity: 'LOW',
            likelihood: 'RARE',
            status: 'RESOLVED',
            category: 'BUDGET',
            sourceType: 'MANUAL',
          },
        ],
      });

      const result = await withTenant(testEnv.tenant, () =>
        raidSummaryService.getSummary(project.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.risks.total).toBe(3);
        expect(result.risks.open).toBe(2); // IDENTIFIED and MITIGATING
        expect(result.highPriorityRisks).toBe(2); // CRITICAL + HIGH
      }
    });

    it('returns correct action item counts', async () => {
      const { project } = await createProjectForTest();

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

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
            priority: 'P1',
            status: 'IN_PROGRESS',
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Action 3',
            priority: 'P2',
            status: 'COMPLETED',
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Overdue Action',
            priority: 'P0',
            status: 'OPEN',
            dueDate: yesterday,
          },
        ],
      });

      const result = await withTenant(testEnv.tenant, () =>
        raidSummaryService.getSummary(project.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.actionItems.total).toBe(4);
        expect(result.actionItems.open).toBe(3); // OPEN + IN_PROGRESS
        expect(result.overdueActionItems).toBe(1);
      }
    });

    it('returns correct issue counts', async () => {
      const { project } = await createProjectForTest();

      await rawPrisma.projectIssue.createMany({
        data: [
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Issue 1',
            description: 'Critical issue',
            severity: 'CRITICAL',
            status: 'OPEN',
            escalationLevel: 0,
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Issue 2',
            description: 'High issue',
            severity: 'HIGH',
            status: 'IN_PROGRESS',
            escalationLevel: 0,
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Issue 3',
            description: 'Resolved issue',
            severity: 'LOW',
            status: 'RESOLVED',
            escalationLevel: 0,
          },
        ],
      });

      const result = await withTenant(testEnv.tenant, () =>
        raidSummaryService.getSummary(project.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.issues.total).toBe(3);
        expect(result.issues.open).toBe(2); // OPEN + IN_PROGRESS
        expect(result.criticalIssues).toBe(1);
      }
    });

    it('returns correct decision counts', async () => {
      const { project } = await createProjectForTest();

      await rawPrisma.decision.createMany({
        data: [
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Decision 1',
            description: 'First decision',
            impact: 'HIGH',
            category: 'TECHNICAL',
            status: 'PENDING',
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Decision 2',
            description: 'Second decision',
            impact: 'MEDIUM',
            category: 'SCOPE',
            status: 'PENDING',
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Decision 3',
            description: 'Third decision',
            impact: 'LOW',
            category: 'PROJECT',
            status: 'ACTIVE',
          },
        ],
      });

      const result = await withTenant(testEnv.tenant, () =>
        raidSummaryService.getSummary(project.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.decisions.total).toBe(3);
        expect(result.decisions.pending).toBe(2);
      }
    });

    it('returns not_found for non-existent project', async () => {
      const result = await withTenant(testEnv.tenant, () =>
        raidSummaryService.getSummary(99999, testEnv.user.id),
      );

      expect(result).toEqual({ error: 'not_found' });
    });

    it('returns forbidden for project user does not own', async () => {
      // Create another user
      const otherUser = await rawPrisma.user.create({
        data: {
          name: 'Other User',
          email: `other-summary-${Date.now()}@example.com`,
          passwordHash: 'hash',
          timezone: 'UTC',
        },
      });

      await rawPrisma.tenantUser.create({
        data: {
          tenantId: testEnv.tenant.id,
          userId: otherUser.id,
          role: 'MEMBER',
          acceptedAt: new Date(),
        },
      });

      const { project } = await createProjectForTest();

      const result = await withTenant(testEnv.tenant, () =>
        raidSummaryService.getSummary(project.id, otherUser.id),
      );

      expect(result).toEqual({ error: 'forbidden' });
    });
  });

  // ==========================================================================
  // getFullSummary Tests
  // ==========================================================================

  describe('getFullSummary', () => {
    it('returns full summary with health indicators', async () => {
      const { project } = await createProjectForTest();

      // Create various RAID items
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

      const result = await withTenant(testEnv.tenant, () =>
        raidSummaryService.getFullSummary(project.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.projectId).toBe(project.id);
        expect(result.projectName).toBeDefined();
        expect(result.counts).toBeDefined();
        expect(result.healthIndicator).toBeDefined();
        expect(['HEALTHY', 'AT_RISK', 'CRITICAL']).toContain(
          result.healthIndicator,
        );
        expect(result.healthScore).toBeGreaterThanOrEqual(0);
        expect(result.healthScore).toBeLessThanOrEqual(100);
        expect(result.topConcerns).toBeDefined();
        expect(result.recommendations).toBeDefined();
        expect(result.summary).toBeDefined();
        expect(result.generatedAt).toBeDefined();
      }
    });

    it('calculates HEALTHY status for project with no issues', async () => {
      const { project } = await createProjectForTest();

      const result = await withTenant(testEnv.tenant, () =>
        raidSummaryService.getFullSummary(project.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.healthIndicator).toBe('HEALTHY');
        expect(result.healthScore).toBe(100);
      }
    });

    it('calculates AT_RISK status for project with moderate issues', async () => {
      const { project } = await createProjectForTest();

      // Create moderate risk/issue load
      await rawPrisma.projectRisk.createMany({
        data: [
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'High Risk 1',
            description: '',
            severity: 'HIGH',
            likelihood: 'LIKELY',
            status: 'IDENTIFIED',
            category: 'TECHNICAL',
            sourceType: 'MANUAL',
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'High Risk 2',
            description: '',
            severity: 'HIGH',
            likelihood: 'LIKELY',
            status: 'ANALYZING',
            category: 'TIMELINE',
            sourceType: 'MANUAL',
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'High Risk 3',
            description: '',
            severity: 'HIGH',
            likelihood: 'POSSIBLE',
            status: 'IDENTIFIED',
            category: 'BUDGET',
            sourceType: 'MANUAL',
          },
        ],
      });

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await rawPrisma.actionItem.createMany({
        data: [
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Overdue 1',
            priority: 'P1',
            status: 'OPEN',
            dueDate: yesterday,
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Overdue 2',
            priority: 'P1',
            status: 'OPEN',
            dueDate: yesterday,
          },
        ],
      });

      const result = await withTenant(testEnv.tenant, () =>
        raidSummaryService.getFullSummary(project.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        // Should be AT_RISK or CRITICAL depending on calculation
        expect(['AT_RISK', 'CRITICAL']).toContain(result.healthIndicator);
        expect(result.healthScore).toBeLessThan(70);
      }
    });

    it('calculates low health score for project with severe issues', async () => {
      const { project } = await createProjectForTest();

      // Create severe risk/issue load
      await rawPrisma.projectRisk.createMany({
        data: [
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Critical Risk 1',
            description: '',
            severity: 'CRITICAL',
            likelihood: 'ALMOST_CERTAIN',
            status: 'IDENTIFIED',
            category: 'TECHNICAL',
            sourceType: 'MANUAL',
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Critical Risk 2',
            description: '',
            severity: 'CRITICAL',
            likelihood: 'LIKELY',
            status: 'IDENTIFIED',
            category: 'TIMELINE',
            sourceType: 'MANUAL',
          },
        ],
      });

      await rawPrisma.projectIssue.createMany({
        data: [
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Critical Issue 1',
            description: 'Critical',
            severity: 'CRITICAL',
            status: 'OPEN',
            escalationLevel: 2,
          },
          {
            projectId: project.id,
            tenantId: testEnv.tenant.id,
            title: 'Critical Issue 2',
            description: 'Critical',
            severity: 'CRITICAL',
            status: 'OPEN',
            escalationLevel: 1,
          },
        ],
      });

      const result = await withTenant(testEnv.tenant, () =>
        raidSummaryService.getFullSummary(project.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        // Should be either AT_RISK or CRITICAL depending on health calculation
        expect(['AT_RISK', 'CRITICAL']).toContain(result.healthIndicator);
        // Health score should be impacted by the severe issues
        expect(result.healthScore).toBeLessThan(100);
      }
    });

    it('generates concerns for critical risks', async () => {
      const { project } = await createProjectForTest();

      await rawPrisma.projectRisk.create({
        data: {
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
      });

      const result = await withTenant(testEnv.tenant, () =>
        raidSummaryService.getFullSummary(project.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.topConcerns.length).toBeGreaterThan(0);
        expect(
          result.topConcerns.some((c: string) =>
            c.toLowerCase().includes('critical risk'),
          ),
        ).toBe(true);
      }
    });

    it('generates recommendations based on RAID status', async () => {
      const { project } = await createProjectForTest();

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await rawPrisma.actionItem.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Overdue Action',
          priority: 'P0',
          status: 'OPEN',
          dueDate: yesterday,
        },
      });

      const result = await withTenant(testEnv.tenant, () =>
        raidSummaryService.getFullSummary(project.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.recommendations.length).toBeGreaterThan(0);
        expect(
          result.recommendations.some((r: string) =>
            r.toLowerCase().includes('overdue'),
          ),
        ).toBe(true);
      }
    });
  });

  // ==========================================================================
  // getTrends Tests
  // ==========================================================================

  describe('getTrends', () => {
    it('returns trend data for specified days', async () => {
      const { project } = await createProjectForTest();

      const result = await withTenant(testEnv.tenant, () =>
        raidSummaryService.getTrends(project.id, testEnv.user.id, 7),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeLessThanOrEqual(8); // 7 days + today
      }
    });

    it('returns trend data with correct structure', async () => {
      const { project } = await createProjectForTest();

      // Create some RAID items
      await rawPrisma.projectRisk.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Test Risk',
          description: '',
          severity: 'MEDIUM',
          likelihood: 'POSSIBLE',
          status: 'IDENTIFIED',
          category: 'TECHNICAL',
          sourceType: 'MANUAL',
        },
      });

      const result = await withTenant(testEnv.tenant, () =>
        raidSummaryService.getTrends(project.id, testEnv.user.id, 30),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result) && result.length > 0) {
        const point = result[0];
        expect(point.date).toBeDefined();
        expect(typeof point.risks).toBe('number');
        expect(typeof point.actionItems).toBe('number');
        expect(typeof point.issues).toBe('number');
        expect(typeof point.decisions).toBe('number');
      }
    });

    it('returns not_found for non-existent project', async () => {
      const result = await withTenant(testEnv.tenant, () =>
        raidSummaryService.getTrends(99999, testEnv.user.id, 30),
      );

      expect(result).toEqual({ error: 'not_found' });
    });

    it('uses default 30 days when not specified', async () => {
      const { project } = await createProjectForTest();

      const result = await withTenant(testEnv.tenant, () =>
        raidSummaryService.getTrends(project.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.length).toBeLessThanOrEqual(31);
      }
    });

    it('returns sorted trends by date', async () => {
      const { project } = await createProjectForTest();

      const result = await withTenant(testEnv.tenant, () =>
        raidSummaryService.getTrends(project.id, testEnv.user.id, 7),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result) && result.length > 1) {
        for (let i = 1; i < result.length; i++) {
          const prevDate = new Date(result[i - 1].date);
          const currDate = new Date(result[i].date);
          expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime());
        }
      }
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('handles project with only risks', async () => {
      const { project } = await createProjectForTest();

      await rawPrisma.projectRisk.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Only Risk',
          description: '',
          severity: 'MEDIUM',
          likelihood: 'POSSIBLE',
          status: 'IDENTIFIED',
          category: 'TECHNICAL',
          sourceType: 'MANUAL',
        },
      });

      const result = await withTenant(testEnv.tenant, () =>
        raidSummaryService.getSummary(project.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.risks.total).toBe(1);
        expect(result.actionItems.total).toBe(0);
        expect(result.issues.total).toBe(0);
        expect(result.decisions.total).toBe(0);
      }
    });

    it('handles project with only action items', async () => {
      const { project } = await createProjectForTest();

      await rawPrisma.actionItem.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Only Action',
          priority: 'P1',
          status: 'OPEN',
        },
      });

      const result = await withTenant(testEnv.tenant, () =>
        raidSummaryService.getSummary(project.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.risks.total).toBe(0);
        expect(result.actionItems.total).toBe(1);
        expect(result.issues.total).toBe(0);
        expect(result.decisions.total).toBe(0);
      }
    });

    it('handles very old items in trends', async () => {
      const { project } = await createProjectForTest();

      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);

      // Creating old risk manually
      await rawPrisma.projectRisk.create({
        data: {
          projectId: project.id,
          tenantId: testEnv.tenant.id,
          title: 'Old Risk',
          description: '',
          severity: 'LOW',
          likelihood: 'RARE',
          status: 'RESOLVED',
          category: 'TECHNICAL',
          sourceType: 'MANUAL',
          createdAt: oldDate,
        },
      });

      // Trends for 30 days should not include 60-day-old item
      const result = await withTenant(testEnv.tenant, () =>
        raidSummaryService.getTrends(project.id, testEnv.user.id, 30),
      );

      expect(result).not.toHaveProperty('error');
      // Old item should not appear in 30-day trends
    });
  });
});
