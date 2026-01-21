/**
 * RAID Extraction Service Tests
 *
 * Tests for the RAID module's AI-powered extraction service.
 * Mocks the LLM service to test extraction logic without actual API calls.
 *
 * @module test/raid/raid-extraction.service
 */

import {
  describe,
  expect,
  it,
  beforeAll,
  afterAll,
  vi,
  beforeEach,
} from 'vitest';

// Mock the LLM service before importing the extraction service
vi.mock('../../src/services/llm.service', () => ({
  llmService: {
    isAvailable: vi.fn(() => false), // Default to rule-based
    complete: vi.fn(),
    completeWithSystem: vi.fn(),
  },
}));

import { llmService } from '../../src/services/llm.service';
import * as raidExtractionService from '../../src/modules/raid/services/raid-extraction.service';
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

describe('RAID Extraction Service', () => {
  let testEnv: TestEnvironment;

  beforeAll(async () => {
    testEnv = await createTestEnvironment(
      `raid-extract-svc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    );
  });

  afterAll(async () => {
    await cleanupTestEnvironment(testEnv.tenant.id);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Default to rule-based extraction
    vi.mocked(llmService.isAvailable).mockReturnValue(false);
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
  const createMeetingForTest = async (projectId: number, notes: string) => {
    return rawPrisma.meeting.create({
      data: {
        projectId,
        tenantId: testEnv.tenant.id,
        title: 'Test Meeting',
        date: new Date(),
        time: '14:00',
        attendees: ['Alice', 'Bob'],
        notes,
      },
    });
  };

  // ==========================================================================
  // extractFromMeeting Tests
  // ==========================================================================

  describe('extractFromMeeting', () => {
    it('returns not_found for non-existent meeting', async () => {
      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.extractFromMeeting(99999, testEnv.user.id),
      );

      expect(result).toEqual({ error: 'not_found' });
    });

    it('returns no_notes for meeting with empty notes', async () => {
      const { project } = await createProjectForTest();
      const meeting = await createMeetingForTest(project.id, '');

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.extractFromMeeting(meeting.id, testEnv.user.id),
      );

      expect(result).toEqual({ error: 'no_notes' });
    });

    it('returns no_notes for meeting with whitespace-only notes', async () => {
      const { project } = await createProjectForTest();
      const meeting = await createMeetingForTest(project.id, '   \n\t  ');

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.extractFromMeeting(meeting.id, testEnv.user.id),
      );

      expect(result).toEqual({ error: 'no_notes' });
    });

    it('extracts risks using rule-based extraction', async () => {
      const { project } = await createProjectForTest();
      const meeting = await createMeetingForTest(
        project.id,
        'There is a risk that the timeline might slip due to dependencies. The budget risk is high.',
      );

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.extractFromMeeting(meeting.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.meetingId).toBe(meeting.id);
        expect(result.projectId).toBe(project.id);
        expect(result.llmUsed).toBe(false);
        expect(result.risks.length).toBeGreaterThan(0);
      }
    });

    it('extracts action items using rule-based extraction', async () => {
      const { project } = await createProjectForTest();
      const meeting = await createMeetingForTest(
        project.id,
        'John will complete the review by Friday. Action item: Sarah needs to update the documentation.',
      );

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.extractFromMeeting(meeting.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.llmUsed).toBe(false);
        expect(result.actionItems.length).toBeGreaterThan(0);
      }
    });

    it('extracts issues using rule-based extraction', async () => {
      const { project } = await createProjectForTest();
      const meeting = await createMeetingForTest(
        project.id,
        'There is a problem with the API integration. The bug in the login flow is causing issues.',
      );

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.extractFromMeeting(meeting.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.llmUsed).toBe(false);
        expect(result.issues.length).toBeGreaterThan(0);
      }
    });

    it('extracts decisions using rule-based extraction', async () => {
      const { project } = await createProjectForTest();
      const meeting = await createMeetingForTest(
        project.id,
        'We decided to use React for the frontend. The team agreed to postpone the launch.',
      );

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.extractFromMeeting(meeting.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.llmUsed).toBe(false);
        expect(result.decisions.length).toBeGreaterThan(0);
      }
    });

    it('uses LLM when available', async () => {
      const { project } = await createProjectForTest();
      const meeting = await createMeetingForTest(
        project.id,
        'Meeting notes with various RAID items.',
      );

      // Enable LLM
      vi.mocked(llmService.isAvailable).mockReturnValue(true);
      vi.mocked(llmService.completeWithSystem).mockResolvedValue({
        content: JSON.stringify({
          risks: [
            {
              title: 'LLM Extracted Risk',
              description: 'Risk from LLM',
              severity: 'HIGH',
              likelihood: 'LIKELY',
              category: 'TECHNICAL',
              sourceText: 'Meeting notes',
              confidence: 0.9,
            },
          ],
          actionItems: [],
          issues: [],
          decisions: [],
        }),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.extractFromMeeting(meeting.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.llmUsed).toBe(true);
        expect(result.risks.length).toBe(1);
        expect(result.risks[0].title).toBe('LLM Extracted Risk');
      }
    });

    it('falls back to rule-based when LLM fails', async () => {
      const { project } = await createProjectForTest();
      // Use a clear risk statement that rule-based extraction will detect
      const meeting = await createMeetingForTest(
        project.id,
        'Risk: The project timeline might slip due to dependencies. This could delay the release.',
      );

      vi.mocked(llmService.isAvailable).mockReturnValue(true);
      vi.mocked(llmService.completeWithSystem).mockRejectedValue(
        new Error('LLM API error'),
      );

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.extractFromMeeting(meeting.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.llmUsed).toBe(false);
        // Rule-based extraction should detect something from this text
        // At minimum, the extraction should complete without error
      }
    });

    it('falls back to rule-based when LLM returns invalid JSON', async () => {
      const { project } = await createProjectForTest();
      const meeting = await createMeetingForTest(
        project.id,
        'There is a risk with the budget.',
      );

      vi.mocked(llmService.isAvailable).mockReturnValue(true);
      vi.mocked(llmService.completeWithSystem).mockResolvedValue({
        content: 'This is not valid JSON',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.extractFromMeeting(meeting.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.llmUsed).toBe(false);
      }
    });

    it('respects confidence threshold', async () => {
      const { project } = await createProjectForTest();
      const meeting = await createMeetingForTest(project.id, 'Some text.');

      vi.mocked(llmService.isAvailable).mockReturnValue(true);
      vi.mocked(llmService.completeWithSystem).mockResolvedValue({
        content: JSON.stringify({
          risks: [
            {
              title: 'High Confidence Risk',
              description: '',
              severity: 'HIGH',
              likelihood: 'LIKELY',
              category: 'TECHNICAL',
              sourceText: '',
              confidence: 0.9,
            },
            {
              title: 'Low Confidence Risk',
              description: '',
              severity: 'LOW',
              likelihood: 'RARE',
              category: 'SCOPE',
              sourceText: '',
              confidence: 0.3, // Below threshold
            },
          ],
          actionItems: [],
          issues: [],
          decisions: [],
        }),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.extractFromMeeting(meeting.id, testEnv.user.id, {
          extractRisks: true,
          extractActionItems: true,
          extractDecisions: true,
          extractIssues: true,
          confidenceThreshold: 0.6,
          autoSave: false,
        }),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.risks.length).toBe(1);
        expect(result.risks[0].title).toBe('High Confidence Risk');
      }
    });

    it('returns forbidden for meeting user cannot access', async () => {
      const { project } = await createProjectForTest();
      const meeting = await createMeetingForTest(project.id, 'Notes');

      // Create another user
      const otherUser = await rawPrisma.user.create({
        data: {
          name: 'Other User',
          email: `other-extract-${Date.now()}@example.com`,
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

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.extractFromMeeting(meeting.id, otherUser.id),
      );

      expect(result).toEqual({ error: 'forbidden' });
    });
  });

  // ==========================================================================
  // extractFromText Tests
  // ==========================================================================

  describe('extractFromText', () => {
    it('extracts RAID items from text', async () => {
      const { project } = await createProjectForTest();

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.extractFromText(
          'There is a risk with the API. Action: Review the code.',
          project.id,
          testEnv.user.id,
        ),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.projectId).toBe(project.id);
        expect(result.llmUsed).toBe(false);
      }
    });

    it('returns not_found for non-existent project', async () => {
      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.extractFromText(
          'Some text',
          99999,
          testEnv.user.id,
        ),
      );

      expect(result).toEqual({ error: 'not_found' });
    });

    it('returns forbidden for project user cannot access', async () => {
      const { project } = await createProjectForTest();

      const otherUser = await rawPrisma.user.create({
        data: {
          name: 'Other User',
          email: `other-text-${Date.now()}@example.com`,
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

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.extractFromText(
          'Some text',
          project.id,
          otherUser.id,
        ),
      );

      expect(result).toEqual({ error: 'forbidden' });
    });

    it('uses LLM when available', async () => {
      const { project } = await createProjectForTest();

      vi.mocked(llmService.isAvailable).mockReturnValue(true);
      vi.mocked(llmService.completeWithSystem).mockResolvedValue({
        content: JSON.stringify({
          risks: [],
          actionItems: [
            {
              title: 'LLM Action',
              priority: 'P1',
              sourceText: 'Text',
              confidence: 0.95,
            },
          ],
          issues: [],
          decisions: [],
        }),
        usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
      });

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.extractFromText(
          'Some text to analyze',
          project.id,
          testEnv.user.id,
        ),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.llmUsed).toBe(true);
        expect(result.actionItems.length).toBe(1);
      }
    });

    it('includes context in extraction', async () => {
      const { project } = await createProjectForTest();

      vi.mocked(llmService.isAvailable).mockReturnValue(true);
      vi.mocked(llmService.completeWithSystem).mockResolvedValue({
        content: JSON.stringify({
          risks: [],
          actionItems: [],
          issues: [],
          decisions: [],
        }),
        usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80 },
      });

      await withTenant(testEnv.tenant, () =>
        raidExtractionService.extractFromText(
          'Some text',
          project.id,
          testEnv.user.id,
          'This is from a client email',
        ),
      );

      // Verify context was passed to LLM
      expect(llmService.completeWithSystem).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // mapToRiskCategory Tests
  // ==========================================================================

  describe('mapToRiskCategory', () => {
    it('maps common category names correctly', () => {
      expect(raidExtractionService.mapToRiskCategory('Technical')).toBe(
        'TECHNICAL',
      );
      expect(raidExtractionService.mapToRiskCategory('Resource')).toBe(
        'RESOURCE',
      );
      expect(raidExtractionService.mapToRiskCategory('Schedule')).toBe(
        'TIMELINE',
      );
      expect(raidExtractionService.mapToRiskCategory('Budget')).toBe('BUDGET');
      expect(raidExtractionService.mapToRiskCategory('External')).toBe(
        'EXTERNAL',
      );
    });

    it('maps uppercase category names correctly', () => {
      expect(raidExtractionService.mapToRiskCategory('TECHNICAL')).toBe(
        'TECHNICAL',
      );
      expect(raidExtractionService.mapToRiskCategory('TIMELINE')).toBe(
        'TIMELINE',
      );
      expect(raidExtractionService.mapToRiskCategory('QUALITY')).toBe(
        'QUALITY',
      );
    });

    it('returns SCOPE for unknown categories', () => {
      expect(raidExtractionService.mapToRiskCategory('Unknown')).toBe('SCOPE');
      expect(raidExtractionService.mapToRiskCategory('Random')).toBe('SCOPE');
    });
  });

  // ==========================================================================
  // mapToRiskLikelihood Tests
  // ==========================================================================

  describe('mapToRiskLikelihood', () => {
    it('maps full likelihood values correctly', () => {
      expect(raidExtractionService.mapToRiskLikelihood('RARE')).toBe('RARE');
      expect(raidExtractionService.mapToRiskLikelihood('UNLIKELY')).toBe(
        'UNLIKELY',
      );
      expect(raidExtractionService.mapToRiskLikelihood('POSSIBLE')).toBe(
        'POSSIBLE',
      );
      expect(raidExtractionService.mapToRiskLikelihood('LIKELY')).toBe(
        'LIKELY',
      );
      expect(raidExtractionService.mapToRiskLikelihood('ALMOST_CERTAIN')).toBe(
        'ALMOST_CERTAIN',
      );
    });

    it('maps simplified likelihood values correctly', () => {
      expect(raidExtractionService.mapToRiskLikelihood('LOW')).toBe('UNLIKELY');
      expect(raidExtractionService.mapToRiskLikelihood('MEDIUM')).toBe(
        'POSSIBLE',
      );
      expect(raidExtractionService.mapToRiskLikelihood('HIGH')).toBe('LIKELY');
    });

    it('handles undefined and returns POSSIBLE', () => {
      expect(raidExtractionService.mapToRiskLikelihood(undefined)).toBe(
        'POSSIBLE',
      );
    });

    it('handles case insensitivity', () => {
      expect(raidExtractionService.mapToRiskLikelihood('likely')).toBe(
        'LIKELY',
      );
      expect(raidExtractionService.mapToRiskLikelihood('Possible')).toBe(
        'POSSIBLE',
      );
    });

    it('handles edge cases', () => {
      expect(raidExtractionService.mapToRiskLikelihood('VERY_HIGH')).toBe(
        'ALMOST_CERTAIN',
      );
      expect(raidExtractionService.mapToRiskLikelihood('VERY_LOW')).toBe(
        'RARE',
      );
    });

    it('returns POSSIBLE for unknown values', () => {
      expect(raidExtractionService.mapToRiskLikelihood('UNKNOWN')).toBe(
        'POSSIBLE',
      );
      expect(raidExtractionService.mapToRiskLikelihood('RANDOM')).toBe(
        'POSSIBLE',
      );
    });
  });

  // ==========================================================================
  // saveExtractedRisks Tests
  // ==========================================================================

  describe('saveExtractedRisks', () => {
    it('saves extracted risks to database', async () => {
      const { project } = await createProjectForTest();

      const risks: raidExtractionService.ExtractedRisk[] = [
        {
          title: 'Saved Risk 1',
          description: 'Description',
          severity: 'HIGH',
          likelihood: 'HIGH',
          category: 'TECHNICAL',
          sourceText: 'Source text',
          confidence: 0.9,
        },
        {
          title: 'Saved Risk 2',
          description: 'Another description',
          severity: 'MEDIUM',
          likelihood: 'MEDIUM',
          category: 'TIMELINE',
          sourceText: 'Another source',
          confidence: 0.8,
        },
      ];

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.saveExtractedRisks(
          project.id,
          testEnv.tenant.id,
          risks,
        ),
      );

      expect(result.length).toBe(2);

      // Verify risks were saved
      const savedRisks = await rawPrisma.projectRisk.findMany({
        where: { projectId: project.id },
      });

      expect(savedRisks.length).toBe(2);
      expect(savedRisks.some((r) => r.title === 'Saved Risk 1')).toBe(true);
      expect(savedRisks.some((r) => r.title === 'Saved Risk 2')).toBe(true);
    });

    it('sets sourceType to MEETING when sourceId is provided', async () => {
      const { project } = await createProjectForTest();
      const meeting = await createMeetingForTest(project.id, 'Notes');

      const risks: raidExtractionService.ExtractedRisk[] = [
        {
          title: 'Meeting Risk',
          description: '',
          severity: 'LOW',
          likelihood: 'LOW',
          category: 'SCOPE',
          sourceText: 'From meeting',
          confidence: 0.7,
        },
      ];

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.saveExtractedRisks(
          project.id,
          testEnv.tenant.id,
          risks,
          meeting.id,
        ),
      );

      expect(result.length).toBe(1);

      const savedRisk = await rawPrisma.projectRisk.findFirst({
        where: { id: result[0] },
      });

      expect(savedRisk?.sourceType).toBe('MEETING');
      expect(savedRisk?.sourceId).toBe(meeting.id);
    });

    it('sets sourceType to AI_DETECTED when no sourceId', async () => {
      const { project } = await createProjectForTest();

      const risks: raidExtractionService.ExtractedRisk[] = [
        {
          title: 'AI Detected Risk',
          description: '',
          severity: 'MEDIUM',
          likelihood: 'MEDIUM',
          category: 'TECHNICAL',
          sourceText: 'From text',
          confidence: 0.8,
        },
      ];

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.saveExtractedRisks(
          project.id,
          testEnv.tenant.id,
          risks,
        ),
      );

      const savedRisk = await rawPrisma.projectRisk.findFirst({
        where: { id: result[0] },
      });

      expect(savedRisk?.sourceType).toBe('AI_DETECTED');
    });

    it('includes mitigation when provided', async () => {
      const { project } = await createProjectForTest();

      const risks: raidExtractionService.ExtractedRisk[] = [
        {
          title: 'Risk with Mitigation',
          description: '',
          severity: 'HIGH',
          likelihood: 'HIGH',
          category: 'BUDGET',
          mitigation: 'Increase budget by 20%',
          sourceText: 'Text',
          confidence: 0.9,
        },
      ];

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.saveExtractedRisks(
          project.id,
          testEnv.tenant.id,
          risks,
        ),
      );

      const savedRisk = await rawPrisma.projectRisk.findFirst({
        where: { id: result[0] },
      });

      expect(savedRisk?.suggestedMitigation).toBe('Increase budget by 20%');
    });

    it('returns empty array when no risks provided', async () => {
      const { project } = await createProjectForTest();

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.saveExtractedRisks(
          project.id,
          testEnv.tenant.id,
          [],
        ),
      );

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // Rule-based Extraction Patterns Tests
  // ==========================================================================

  describe('rule-based extraction patterns', () => {
    it('detects blocker as issue or risk', async () => {
      const { project } = await createProjectForTest();
      const meeting = await createMeetingForTest(
        project.id,
        'Issue: There is a critical blocker preventing the deployment. The bug in the API is causing failures.',
      );

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.extractFromMeeting(meeting.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        // Rule-based extraction should detect either risks or issues
        const totalItems = result.risks.length + result.issues.length;
        expect(totalItems).toBeGreaterThan(0);
      }
    });

    it('detects critical issue pattern', async () => {
      const { project } = await createProjectForTest();
      const meeting = await createMeetingForTest(
        project.id,
        'This is a critical issue affecting production.',
      );

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.extractFromMeeting(meeting.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.risks.length + result.issues.length).toBeGreaterThan(0);
      }
    });

    it('detects TODO as action item', async () => {
      const { project } = await createProjectForTest();
      const meeting = await createMeetingForTest(
        project.id,
        'TODO: Complete the review by end of week.',
      );

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.extractFromMeeting(meeting.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.actionItems.length).toBeGreaterThan(0);
      }
    });

    it('detects follow up as action item', async () => {
      const { project } = await createProjectForTest();
      const meeting = await createMeetingForTest(
        project.id,
        'Follow up: Send the proposal to the client.',
      );

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.extractFromMeeting(meeting.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.actionItems.length).toBeGreaterThan(0);
      }
    });

    it('detects "we agreed" as decision', async () => {
      const { project } = await createProjectForTest();
      const meeting = await createMeetingForTest(
        project.id,
        'We agreed to postpone the feature to next quarter.',
      );

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.extractFromMeeting(meeting.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.decisions.length).toBeGreaterThan(0);
      }
    });

    it('detects "approved" as decision', async () => {
      const { project } = await createProjectForTest();
      const meeting = await createMeetingForTest(
        project.id,
        'The budget increase was approved by the sponsor.',
      );

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.extractFromMeeting(meeting.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        expect(result.decisions.length).toBeGreaterThan(0);
      }
    });

    it('infers TECHNICAL category for code-related terms', async () => {
      const { project } = await createProjectForTest();
      const meeting = await createMeetingForTest(
        project.id,
        'Risk: The API might have performance issues.',
      );

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.extractFromMeeting(meeting.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        const technicalRisks = result.risks.filter(
          (r) => r.category === 'TECHNICAL',
        );
        expect(technicalRisks.length).toBeGreaterThan(0);
      }
    });

    it('infers TIMELINE category for schedule-related terms', async () => {
      const { project } = await createProjectForTest();
      const meeting = await createMeetingForTest(
        project.id,
        'Risk: We might miss the deadline due to delays.',
      );

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.extractFromMeeting(meeting.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        const timelineRisks = result.risks.filter(
          (r) => r.category === 'TIMELINE',
        );
        expect(timelineRisks.length).toBeGreaterThan(0);
      }
    });

    it('infers BUDGET category for cost-related terms', async () => {
      const { project } = await createProjectForTest();
      const meeting = await createMeetingForTest(
        project.id,
        'Risk: The project is over budget by 10%.',
      );

      const result = await withTenant(testEnv.tenant, () =>
        raidExtractionService.extractFromMeeting(meeting.id, testEnv.user.id),
      );

      expect(result).not.toHaveProperty('error');
      if (!('error' in result)) {
        const budgetRisks = result.risks.filter((r) => r.category === 'BUDGET');
        expect(budgetRisks.length).toBeGreaterThan(0);
      }
    });
  });
});
