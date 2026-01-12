/**
 * Project ML Services Unit Tests
 *
 * Tests for ML-powered project success prediction, risk forecasting,
 * timeline prediction, and resource optimization.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as tenantContext from '../src/tenant/tenant.context';

// Mock the tenant context
vi.mock('../src/tenant/tenant.context', () => ({
  getTenantId: vi.fn(() => 'test-tenant-ml'),
  hasTenantContext: vi.fn(() => true),
}));

// Mock the AI client to avoid actual LLM calls
vi.mock('../src/modules/ai-monitoring/ai-client', () => ({
  isAIAvailable: vi.fn(() => true),
  jsonPrompt: vi.fn(),
  trackAIUsage: vi.fn(),
}));

// Mock the Prisma client
vi.mock('../src/prisma/client', () => {
  const mockPrisma = {
    project: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    task: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    milestone: {
      findMany: vi.fn(),
    },
    meeting: {
      findMany: vi.fn(),
    },
    projectMember: {
      findMany: vi.fn(),
    },
    projectMLPrediction: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $disconnect: vi.fn().mockResolvedValue(undefined),
  };
  return {
    prisma: mockPrisma,
    default: mockPrisma,
  };
});

// Import after mocks
import { prisma } from '../src/prisma/client';
import * as aiClient from '../src/modules/ai-monitoring/ai-client';
import {
  gatherProjectContext,
  formatContextForLLM,
} from '../src/modules/project-ml/services/project-ml-context.service';
import {
  storePrediction,
  getLatestPrediction,
  listProjectPredictions,
  validateExpiredPredictions,
  getPredictionAccuracy,
  isMLAvailable,
  getMLConfig,
  getHighRiskProjects,
} from '../src/modules/project-ml/services/project-ml-prediction.service';
import { predictProjectSuccessRuleBased } from '../src/modules/project-ml/services/success-prediction.service';
import { forecastProjectRisksRuleBased } from '../src/modules/project-ml/services/risk-forecast.service';
import { predictProjectTimelineRuleBased } from '../src/modules/project-ml/services/timeline-prediction.service';
import { optimizeProjectResourcesRuleBased } from '../src/modules/project-ml/services/resource-optimization.service';
import type {
  ProjectMLContext,
  RiskFactor,
} from '../src/modules/project-ml/types';

describe('Project ML Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (tenantContext.getTenantId as ReturnType<typeof vi.fn>).mockReturnValue(
      'test-tenant-ml',
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ==========================================================================
  // Context Gathering Tests
  // ==========================================================================

  describe('gatherProjectContext', () => {
    it('should gather complete project context', async () => {
      const mockProject = {
        id: 1,
        name: 'Test Project',
        status: 'IN_PROGRESS',
        healthStatus: 'ON_TRACK',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
        budget: 100000,
        ownerId: 1,
        owner: { id: 1, name: 'John Doe' },
      };

      const mockTasks = [
        {
          id: 1,
          status: 'DONE',
          priority: 'HIGH',
          dueDate: new Date(),
          assigneeId: 1,
          assignee: { id: 1, name: 'John Doe' },
        },
        {
          id: 2,
          status: 'IN_PROGRESS',
          priority: 'MEDIUM',
          dueDate: new Date(),
          assigneeId: 2,
          assignee: { id: 2, name: 'Jane Doe' },
        },
        {
          id: 3,
          status: 'BACKLOG',
          priority: 'LOW',
          dueDate: null,
          assigneeId: null,
          assignee: null,
        },
      ];

      const mockMilestones = [
        {
          id: 1,
          title: 'Phase 1',
          dueDate: new Date('2024-03-01'),
          status: 'COMPLETED',
          completedAt: new Date('2024-02-28'),
        },
        {
          id: 2,
          title: 'Phase 2',
          dueDate: new Date('2024-05-01'),
          status: 'IN_PROGRESS',
          completedAt: null,
        },
      ];

      const mockMembers = [
        {
          userId: 1,
          role: 'ADMIN',
          user: { id: 1, name: 'John Doe' },
        },
        {
          userId: 2,
          role: 'MEMBER',
          user: { id: 2, name: 'Jane Doe' },
        },
      ];

      const mockMeetings = [
        {
          id: 1,
          title: 'Sprint Planning',
          meetingDate: new Date(),
          status: 'COMPLETED',
        },
      ];

      (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockProject,
      );
      (prisma.task.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockTasks,
      );
      (prisma.milestone.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockMilestones,
      );
      (
        prisma.projectMember.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockMembers);
      (prisma.meeting.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockMeetings,
      );

      const context = await gatherProjectContext(1, 'test-tenant-ml');

      expect(context.project.id).toBe(1);
      expect(context.project.name).toBe('Test Project');
      expect(context.taskMetrics.totalTasks).toBe(3);
      expect(context.taskMetrics.completedTasks).toBe(1);
      expect(context.milestoneMetrics.totalMilestones).toBe(2);
      expect(context.teamMetrics.totalMembers).toBe(2);
    });

    it('should throw error when project not found', async () => {
      (prisma.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );
      (prisma.task.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.milestone.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        [],
      );
      (
        prisma.projectMember.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);
      (prisma.meeting.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
        [],
      );

      await expect(gatherProjectContext(999, 'test-tenant-ml')).rejects.toThrow(
        'Project 999 not found',
      );
    });
  });

  describe('formatContextForLLM', () => {
    it('should format context for LLM consumption', () => {
      const context: ProjectMLContext = {
        project: {
          id: 1,
          name: 'Test Project',
          status: 'IN_PROGRESS',
          healthStatus: 'ON_TRACK',
          startDate: '2024-01-01',
          endDate: '2024-06-30',
          daysElapsed: 90,
          daysRemaining: 90,
          percentComplete: 50,
          budget: 100000,
          ownerId: 1,
          ownerName: 'John Doe',
        },
        taskMetrics: {
          totalTasks: 20,
          completedTasks: 10,
          inProgressTasks: 5,
          blockedTasks: 2,
          backlogTasks: 3,
          overdueTasks: 1,
          completionRate: 50,
          averageTaskDuration: 5,
          tasksByPriority: { HIGH: 5, MEDIUM: 10, LOW: 5 },
        },
        milestoneMetrics: {
          totalMilestones: 4,
          completedMilestones: 2,
          upcomingMilestones: 2,
          overdueMilestones: 0,
          onTimeCompletionRate: 100,
          nextMilestone: {
            title: 'Phase 2',
            dueDate: '2024-05-01',
            daysUntilDue: 30,
          },
        },
        teamMetrics: {
          totalMembers: 4,
          memberWorkload: [
            { userId: 1, name: 'John', taskCount: 5, overdueCount: 0 },
            { userId: 2, name: 'Jane', taskCount: 8, overdueCount: 1 },
          ],
          averageTasksPerMember: 5,
          workloadBalance: 0.8,
        },
        velocityMetrics: {
          currentVelocity: 10,
          averageVelocity: 8,
          velocityTrend: 'improving',
          estimatedCompletionWeeks: 12,
        },
        recentMeetings: [],
        historicalPredictions: [],
      };

      const formatted = formatContextForLLM(context);

      expect(formatted).toContain('Test Project');
      expect(formatted).toContain('50%');
      expect(formatted).toContain('IN_PROGRESS');
    });
  });

  // ==========================================================================
  // Prediction Storage Tests
  // ==========================================================================

  describe('storePrediction', () => {
    it('should store a prediction and return its ID', async () => {
      const riskFactors: RiskFactor[] = [
        {
          factor: 'Task Delays',
          impact: 'high',
          currentValue: 45,
          trend: 'worsening',
          description: 'Test',
        },
      ];

      const mockPrediction = {
        predictionType: 'SUCCESS_PREDICTION' as const,
        probability: 0.72,
        confidence: 0.85,
        predictionWindowDays: 90,
        riskFactors,
        explanation: 'Test explanation',
        recommendations: [
          {
            action: 'Test action',
            priority: 'high' as const,
            timeframe: '1 week',
            expectedImpact: 'Improve success rate',
            rationale: 'Test rationale',
            effort: 'medium' as const,
          },
        ],
        llmMetadata: {
          model: 'gpt-4',
          tokensUsed: 1000,
          latencyMs: 2000,
          estimatedCost: 0.02,
        },
      };

      (
        prisma.projectMLPrediction.create as ReturnType<typeof vi.fn>
      ).mockResolvedValue({ id: 42 });

      const result = await storePrediction(1, 'test-tenant-ml', mockPrediction);

      expect(result.id).toBe(42);
      expect(prisma.projectMLPrediction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'test-tenant-ml',
            projectId: 1,
            predictionType: 'SUCCESS_PREDICTION',
            probability: 0.72,
            confidence: 0.85,
          }),
        }),
      );
    });
  });

  describe('getLatestPrediction', () => {
    it('should return the most recent valid prediction', async () => {
      const mockPrediction = {
        id: 42,
        probability: 0.72,
        confidence: 0.85,
        riskFactors: {},
        explanation: 'Test',
        recommendations: null,
        predictedAt: new Date(),
        validUntil: new Date(Date.now() + 86400000),
        status: 'ACTIVE',
      };

      (
        prisma.projectMLPrediction.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockPrediction);

      const result = await getLatestPrediction(1, 'SUCCESS_PREDICTION');

      expect(result?.id).toBe(42);
      expect(result?.probability).toBe(0.72);
    });

    it('should return null when no prediction exists', async () => {
      (
        prisma.projectMLPrediction.findFirst as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);

      const result = await getLatestPrediction(1, 'SUCCESS_PREDICTION');

      expect(result).toBeNull();
    });
  });

  describe('listProjectPredictions', () => {
    it('should return all predictions for a project', async () => {
      const mockPredictions = [
        {
          id: 1,
          predictionType: 'SUCCESS_PREDICTION',
          probability: 0.72,
          confidence: 0.85,
          predictedAt: new Date(),
          validUntil: new Date(Date.now() + 86400000),
          status: 'ACTIVE',
        },
        {
          id: 2,
          predictionType: 'RISK_FORECAST',
          probability: 0.45,
          confidence: 0.8,
          predictedAt: new Date(),
          validUntil: new Date(Date.now() + 86400000),
          status: 'ACTIVE',
        },
      ];

      (
        prisma.projectMLPrediction.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockPredictions);

      const result = await listProjectPredictions(1);

      expect(result).toHaveLength(2);
      expect(result[0].predictionType).toBe('SUCCESS_PREDICTION');
      expect(result[1].predictionType).toBe('RISK_FORECAST');
    });
  });

  // ==========================================================================
  // Success Prediction Tests
  // ==========================================================================

  describe('predictProjectSuccessRuleBased', () => {
    it('should calculate success probability based on metrics', () => {
      const context: ProjectMLContext = {
        project: {
          id: 1,
          name: 'Test Project',
          status: 'IN_PROGRESS',
          healthStatus: 'AT_RISK',
          startDate: '2024-01-01',
          endDate: '2024-06-30',
          daysElapsed: 90,
          daysRemaining: 90,
          percentComplete: 40, // Behind schedule
          budget: 100000,
          ownerId: 1,
          ownerName: 'John Doe',
        },
        taskMetrics: {
          totalTasks: 20,
          completedTasks: 8,
          inProgressTasks: 5,
          blockedTasks: 3, // High blocked count
          backlogTasks: 4,
          overdueTasks: 4, // High overdue count
          completionRate: 40,
          averageTaskDuration: 7,
          tasksByPriority: { HIGH: 10, MEDIUM: 8, LOW: 2 },
        },
        milestoneMetrics: {
          totalMilestones: 4,
          completedMilestones: 1,
          upcomingMilestones: 2,
          overdueMilestones: 1, // Overdue milestone
          onTimeCompletionRate: 50,
          nextMilestone: null,
        },
        teamMetrics: {
          totalMembers: 4,
          memberWorkload: [],
          averageTasksPerMember: 5,
          workloadBalance: 0.6, // Imbalanced workload
        },
        velocityMetrics: {
          currentVelocity: 5,
          averageVelocity: 8,
          velocityTrend: 'declining', // Declining velocity
          estimatedCompletionWeeks: 16,
        },
        recentMeetings: [],
        historicalPredictions: [],
      };

      const result = predictProjectSuccessRuleBased(context, 90);

      expect(result.predictionType).toBe('SUCCESS_PREDICTION');
      expect(result.overallSuccessProbability).toBeLessThan(0.6);
      expect(result.riskFactors.length).toBeGreaterThan(0);
      expect(result.llmMetadata.model).toBe('rule-based-fallback');
    });

    it('should return high success probability for healthy projects', () => {
      const context: ProjectMLContext = {
        project: {
          id: 1,
          name: 'Healthy Project',
          status: 'IN_PROGRESS',
          healthStatus: 'ON_TRACK',
          startDate: '2024-01-01',
          endDate: '2024-06-30',
          daysElapsed: 90,
          daysRemaining: 90,
          percentComplete: 55, // Ahead of schedule
          budget: 100000,
          ownerId: 1,
          ownerName: 'John Doe',
        },
        taskMetrics: {
          totalTasks: 20,
          completedTasks: 12,
          inProgressTasks: 5,
          blockedTasks: 0, // No blocked tasks
          backlogTasks: 3,
          overdueTasks: 0, // No overdue tasks
          completionRate: 60,
          averageTaskDuration: 4,
          tasksByPriority: { HIGH: 5, MEDIUM: 10, LOW: 5 },
        },
        milestoneMetrics: {
          totalMilestones: 4,
          completedMilestones: 2,
          upcomingMilestones: 2,
          overdueMilestones: 0, // No overdue milestones
          onTimeCompletionRate: 100,
          nextMilestone: {
            title: 'Phase 3',
            dueDate: '2024-05-01',
            daysUntilDue: 30,
          },
        },
        teamMetrics: {
          totalMembers: 4,
          memberWorkload: [],
          averageTasksPerMember: 5,
          workloadBalance: 0.9, // Balanced workload
        },
        velocityMetrics: {
          currentVelocity: 10,
          averageVelocity: 8,
          velocityTrend: 'improving',
          estimatedCompletionWeeks: 10,
        },
        recentMeetings: [],
        historicalPredictions: [],
      };

      const result = predictProjectSuccessRuleBased(context, 90);

      expect(result.overallSuccessProbability).toBeGreaterThan(0.7);
      expect(result.onTimeProbability).toBeGreaterThan(0.7);
    });
  });

  // ==========================================================================
  // Risk Forecast Tests
  // ==========================================================================

  describe('forecastProjectRisksRuleBased', () => {
    it('should identify project risks', () => {
      const context: ProjectMLContext = {
        project: {
          id: 1,
          name: 'Risky Project',
          status: 'IN_PROGRESS',
          healthStatus: 'AT_RISK',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-03-30'),
          createdAt: new Date('2023-12-01'),
          visibility: 'private',
        },
        taskMetrics: {
          total: 30,
          notStarted: 0,
          backlog: 5,
          inProgress: 8,
          blocked: 5, // Many blocked tasks
          completed: 12,
          overdue: 6, // Many overdue tasks
          completionRate: 0.4,
          avgCompletionDays: 6,
          completedLast7Days: 2,
          completedLast30Days: 8,
          byPriority: { P0: 15, P1: 10, P2: 5 },
        },
        milestoneMetrics: {
          total: 3,
          completed: 1,
          inProgress: 1,
          notStarted: 0,
          overdue: 1,
          upcoming: 1,
          onTimeRate: 0.5,
        },
        teamMetrics: {
          totalMembers: 3,
          activeMembers: 3,
          workloadDistribution: [
            {
              userId: 1,
              name: 'John',
              taskCount: 15,
              inProgressCount: 5,
              estimatedHours: 60,
              overdueCount: 4,
            },
            {
              userId: 2,
              name: 'Jane',
              taskCount: 10,
              inProgressCount: 3,
              estimatedHours: 40,
              overdueCount: 2,
            },
            {
              userId: 3,
              name: 'Bob',
              taskCount: 5,
              inProgressCount: 2,
              estimatedHours: 20,
              overdueCount: 0,
            },
          ],
          workloadImbalance: 0.5, // High imbalance
        },
        activityMetrics: {
          tasksCompletedLast7Days: 2,
          tasksCompletedLast30Days: 8,
          tasksCreatedLast7Days: 5,
          meetingsLast30Days: 4,
          risksIdentified: 3,
          decisionsRecorded: 2,
        },
        historicalPerformance: {
          velocityTrend: 'declining',
          avgVelocity: 8,
          avgTaskDelay: 3,
          budgetUtilization: 0.6,
          daysSinceStart: 60,
          daysRemaining: 30,
        },
      };

      const result = forecastProjectRisksRuleBased(context, 90);

      expect(result.predictionType).toBe('RISK_FORECAST');
      expect(result.overallRiskLevel).toBe('high');
      expect(result.delayProbability).toBeGreaterThan(0.5);
      expect(result.identifiedRisks.length).toBeGreaterThan(0);
      expect(result.earlyWarningIndicators.length).toBeGreaterThan(0);
    });

    it('should return low risk for healthy projects', () => {
      const context: ProjectMLContext = {
        project: {
          id: 1,
          name: 'Healthy Project',
          status: 'IN_PROGRESS',
          healthStatus: 'ON_TRACK',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-06-30'),
          createdAt: new Date('2023-12-01'),
          visibility: 'private',
        },
        taskMetrics: {
          total: 20,
          notStarted: 0,
          backlog: 8,
          inProgress: 5,
          blocked: 0,
          completed: 7,
          overdue: 0,
          completionRate: 0.35,
          avgCompletionDays: 4,
          completedLast7Days: 3,
          completedLast30Days: 7,
          byPriority: { P0: 5, P1: 10, P2: 5 },
        },
        milestoneMetrics: {
          total: 4,
          completed: 1,
          inProgress: 1,
          notStarted: 2,
          overdue: 0,
          upcoming: 3,
          onTimeRate: 1.0,
        },
        teamMetrics: {
          totalMembers: 4,
          activeMembers: 4,
          workloadDistribution: [
            {
              userId: 1,
              name: 'Alice',
              taskCount: 5,
              inProgressCount: 1,
              estimatedHours: 20,
              overdueCount: 0,
            },
            {
              userId: 2,
              name: 'Bob',
              taskCount: 5,
              inProgressCount: 2,
              estimatedHours: 20,
              overdueCount: 0,
            },
            {
              userId: 3,
              name: 'Carol',
              taskCount: 5,
              inProgressCount: 1,
              estimatedHours: 20,
              overdueCount: 0,
            },
            {
              userId: 4,
              name: 'Dave',
              taskCount: 5,
              inProgressCount: 1,
              estimatedHours: 20,
              overdueCount: 0,
            },
          ],
          workloadImbalance: 0.15, // Low imbalance = well balanced
        },
        activityMetrics: {
          tasksCompletedLast7Days: 3,
          tasksCompletedLast30Days: 7,
          tasksCreatedLast7Days: 2,
          meetingsLast30Days: 4,
          risksIdentified: 0,
          decisionsRecorded: 3,
        },
        historicalPerformance: {
          velocityTrend: 'improving',
          avgVelocity: 7,
          avgTaskDelay: 0,
          budgetUtilization: 0.3,
          daysSinceStart: 60,
          daysRemaining: 120,
        },
      };

      const result = forecastProjectRisksRuleBased(context, 90);

      expect(result.overallRiskLevel).toBe('low');
      expect(result.delayProbability).toBeLessThan(0.3);
    });
  });

  // ==========================================================================
  // Timeline Prediction Tests
  // ==========================================================================

  describe('predictProjectTimelineRuleBased', () => {
    it('should predict project delay', () => {
      const context: ProjectMLContext = {
        project: {
          id: 1,
          name: 'Delayed Project',
          status: 'IN_PROGRESS',
          healthStatus: 'AT_RISK',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-04-30'),
          createdAt: new Date('2023-12-01'),
          visibility: 'private',
        },
        taskMetrics: {
          total: 40,
          notStarted: 0,
          backlog: 7,
          inProgress: 10,
          blocked: 3,
          completed: 20,
          overdue: 5,
          completionRate: 0.5,
          avgCompletionDays: 5,
          completedLast7Days: 3,
          completedLast30Days: 12,
          byPriority: { P0: 15, P1: 15, P2: 10 },
        },
        milestoneMetrics: {
          total: 4,
          completed: 2,
          inProgress: 1,
          notStarted: 0,
          overdue: 1,
          upcoming: 1,
          onTimeRate: 0.66,
        },
        teamMetrics: {
          totalMembers: 5,
          activeMembers: 5,
          workloadDistribution: [
            {
              userId: 1,
              name: 'Alice',
              taskCount: 8,
              inProgressCount: 2,
              estimatedHours: 32,
              overdueCount: 1,
            },
            {
              userId: 2,
              name: 'Bob',
              taskCount: 8,
              inProgressCount: 2,
              estimatedHours: 32,
              overdueCount: 1,
            },
            {
              userId: 3,
              name: 'Carol',
              taskCount: 8,
              inProgressCount: 2,
              estimatedHours: 32,
              overdueCount: 1,
            },
            {
              userId: 4,
              name: 'Dave',
              taskCount: 8,
              inProgressCount: 2,
              estimatedHours: 32,
              overdueCount: 1,
            },
            {
              userId: 5,
              name: 'Eve',
              taskCount: 8,
              inProgressCount: 2,
              estimatedHours: 32,
              overdueCount: 1,
            },
          ],
          workloadImbalance: 0.3,
        },
        activityMetrics: {
          tasksCompletedLast7Days: 3,
          tasksCompletedLast30Days: 12,
          tasksCreatedLast7Days: 5,
          meetingsLast30Days: 4,
          risksIdentified: 2,
          decisionsRecorded: 3,
        },
        historicalPerformance: {
          velocityTrend: 'stable',
          avgVelocity: 7,
          avgTaskDelay: 2,
          budgetUtilization: 0.5,
          daysSinceStart: 90,
          daysRemaining: 30,
        },
      };

      const result = predictProjectTimelineRuleBased(context, 90);

      expect(result.predictionType).toBe('TIMELINE_PREDICTION');
      expect(result.daysVariance).toBeGreaterThan(0); // Predicting delay
      expect(result.delayFactors.length).toBeGreaterThan(0);
    });

    it('should predict on-time completion for healthy projects', () => {
      const context: ProjectMLContext = {
        project: {
          id: 1,
          name: 'On Track Project',
          status: 'IN_PROGRESS',
          healthStatus: 'ON_TRACK',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-06-30'),
          createdAt: new Date('2023-12-01'),
          visibility: 'private',
        },
        taskMetrics: {
          total: 30,
          notStarted: 0,
          backlog: 6,
          inProgress: 6,
          blocked: 0,
          completed: 18,
          overdue: 0,
          completionRate: 0.6,
          avgCompletionDays: 4,
          completedLast7Days: 5,
          completedLast30Days: 15,
          byPriority: { P0: 8, P1: 15, P2: 7 },
        },
        milestoneMetrics: {
          total: 4,
          completed: 2,
          inProgress: 1,
          notStarted: 1,
          overdue: 0,
          upcoming: 2,
          onTimeRate: 1.0,
        },
        teamMetrics: {
          totalMembers: 4,
          activeMembers: 4,
          workloadDistribution: [
            {
              userId: 1,
              name: 'Alice',
              taskCount: 7,
              inProgressCount: 1,
              estimatedHours: 28,
              overdueCount: 0,
            },
            {
              userId: 2,
              name: 'Bob',
              taskCount: 8,
              inProgressCount: 2,
              estimatedHours: 32,
              overdueCount: 0,
            },
            {
              userId: 3,
              name: 'Carol',
              taskCount: 7,
              inProgressCount: 2,
              estimatedHours: 28,
              overdueCount: 0,
            },
            {
              userId: 4,
              name: 'Dave',
              taskCount: 8,
              inProgressCount: 1,
              estimatedHours: 32,
              overdueCount: 0,
            },
          ],
          workloadImbalance: 0.1,
        },
        activityMetrics: {
          tasksCompletedLast7Days: 5,
          tasksCompletedLast30Days: 15,
          tasksCreatedLast7Days: 3,
          meetingsLast30Days: 4,
          risksIdentified: 0,
          decisionsRecorded: 4,
        },
        historicalPerformance: {
          velocityTrend: 'improving',
          avgVelocity: 8,
          avgTaskDelay: 0,
          budgetUtilization: 0.45,
          daysSinceStart: 90,
          daysRemaining: 90,
        },
      };

      const result = predictProjectTimelineRuleBased(context, 90);

      expect(result.daysVariance).toBeLessThanOrEqual(0); // On time or early
      expect(result.accelerationOpportunities.length).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // Resource Optimization Tests
  // ==========================================================================

  describe('optimizeProjectResourcesRuleBased', () => {
    it('should identify workload imbalances', () => {
      const context: ProjectMLContext = {
        project: {
          id: 1,
          name: 'Imbalanced Project',
          status: 'IN_PROGRESS',
          healthStatus: 'NEEDS_ATTENTION',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-06-30'),
          createdAt: new Date('2023-12-01'),
          visibility: 'private',
        },
        taskMetrics: {
          total: 30,
          notStarted: 0,
          backlog: 5,
          inProgress: 12,
          blocked: 4,
          completed: 9,
          overdue: 3,
          completionRate: 0.3,
          avgCompletionDays: 5,
          completedLast7Days: 2,
          completedLast30Days: 6,
          byPriority: { P0: 10, P1: 15, P2: 5 },
        },
        milestoneMetrics: {
          total: 4,
          completed: 1,
          inProgress: 1,
          notStarted: 2,
          overdue: 0,
          upcoming: 3,
          onTimeRate: 1.0,
        },
        teamMetrics: {
          totalMembers: 3,
          activeMembers: 3,
          workloadDistribution: [
            {
              userId: 1,
              name: 'John',
              taskCount: 15,
              inProgressCount: 6,
              estimatedHours: 60,
              overdueCount: 3,
            }, // Overloaded
            {
              userId: 2,
              name: 'Jane',
              taskCount: 3,
              inProgressCount: 2,
              estimatedHours: 12,
              overdueCount: 0,
            }, // Underloaded
            {
              userId: 3,
              name: 'Bob',
              taskCount: 12,
              inProgressCount: 4,
              estimatedHours: 48,
              overdueCount: 0,
            },
          ],
          workloadImbalance: 0.6, // High imbalance (0.4 balance = 0.6 imbalance)
        },
        activityMetrics: {
          tasksCompletedLast7Days: 2,
          tasksCompletedLast30Days: 6,
          tasksCreatedLast7Days: 4,
          meetingsLast30Days: 3,
          risksIdentified: 2,
          decisionsRecorded: 2,
        },
        historicalPerformance: {
          velocityTrend: 'declining',
          avgVelocity: 7,
          avgTaskDelay: 2,
          budgetUtilization: 0.4,
          daysSinceStart: 60,
          daysRemaining: 120,
        },
      };

      const result = optimizeProjectResourcesRuleBased(context, 90);

      expect(result.predictionType).toBe('RESOURCE_OPTIMIZATION');
      expect(result.workloadBalance.interpretation).toBe('poor');
      expect(result.workloadBalance.mostOverloaded?.name).toBe('John');
      expect(result.workloadBalance.mostUnderloaded?.name).toBe('Jane');
      expect(result.bottlenecks.length).toBeGreaterThan(0);
    });

    it('should return good workload balance for balanced teams', () => {
      const context: ProjectMLContext = {
        project: {
          id: 1,
          name: 'Balanced Project',
          status: 'IN_PROGRESS',
          healthStatus: 'ON_TRACK',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-06-30'),
          createdAt: new Date('2023-12-01'),
          visibility: 'private',
        },
        taskMetrics: {
          total: 20,
          notStarted: 0,
          backlog: 5,
          inProgress: 8,
          blocked: 0,
          completed: 7,
          overdue: 0,
          completionRate: 0.35,
          avgCompletionDays: 4,
          completedLast7Days: 3,
          completedLast30Days: 7,
          byPriority: { P0: 5, P1: 10, P2: 5 },
        },
        milestoneMetrics: {
          total: 4,
          completed: 1,
          inProgress: 1,
          notStarted: 2,
          overdue: 0,
          upcoming: 3,
          onTimeRate: 1.0,
        },
        teamMetrics: {
          totalMembers: 4,
          activeMembers: 4,
          workloadDistribution: [
            {
              userId: 1,
              name: 'John',
              taskCount: 5,
              inProgressCount: 2,
              estimatedHours: 20,
              overdueCount: 0,
            },
            {
              userId: 2,
              name: 'Jane',
              taskCount: 5,
              inProgressCount: 2,
              estimatedHours: 20,
              overdueCount: 0,
            },
            {
              userId: 3,
              name: 'Bob',
              taskCount: 5,
              inProgressCount: 2,
              estimatedHours: 20,
              overdueCount: 0,
            },
            {
              userId: 4,
              name: 'Alice',
              taskCount: 5,
              inProgressCount: 2,
              estimatedHours: 20,
              overdueCount: 0,
            },
          ],
          workloadImbalance: 0.0, // Perfectly balanced (0 imbalance = 1.0 balance score)
        },
        activityMetrics: {
          tasksCompletedLast7Days: 3,
          tasksCompletedLast30Days: 7,
          tasksCreatedLast7Days: 2,
          meetingsLast30Days: 4,
          risksIdentified: 0,
          decisionsRecorded: 3,
        },
        historicalPerformance: {
          velocityTrend: 'improving',
          avgVelocity: 7,
          avgTaskDelay: 0,
          budgetUtilization: 0.35,
          daysSinceStart: 60,
          daysRemaining: 120,
        },
      };

      const result = optimizeProjectResourcesRuleBased(context, 90);

      expect(result.workloadBalance.interpretation).toBe('excellent');
      expect(result.bottlenecks.length).toBe(0);
    });
  });

  // ==========================================================================
  // Validation and Accuracy Tests
  // ==========================================================================

  describe('validateExpiredPredictions', () => {
    it('should validate expired predictions', async () => {
      const mockExpiredPredictions = [
        {
          id: 1,
          predictionType: 'SUCCESS_PREDICTION',
          probability: 0.75,
          project: {
            status: 'COMPLETED',
            healthStatus: 'ON_TRACK',
          },
        },
        {
          id: 2,
          predictionType: 'SUCCESS_PREDICTION',
          probability: 0.3,
          project: {
            status: 'CANCELLED',
            healthStatus: 'CRITICAL',
          },
        },
      ];

      (
        prisma.projectMLPrediction.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockExpiredPredictions);
      (
        prisma.projectMLPrediction.update as ReturnType<typeof vi.fn>
      ).mockResolvedValue({});

      const result = await validateExpiredPredictions('test-tenant-ml');

      expect(result.validated).toBe(2);
      expect(prisma.projectMLPrediction.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('getPredictionAccuracy', () => {
    it('should calculate prediction accuracy metrics', async () => {
      (
        prisma.projectMLPrediction.count as ReturnType<typeof vi.fn>
      ).mockResolvedValue(100);
      (
        prisma.projectMLPrediction.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue([
        { predictionType: 'SUCCESS_PREDICTION', wasAccurate: true },
        { predictionType: 'SUCCESS_PREDICTION', wasAccurate: true },
        { predictionType: 'SUCCESS_PREDICTION', wasAccurate: false },
        { predictionType: 'RISK_FORECAST', wasAccurate: true },
      ]);

      const accuracy = await getPredictionAccuracy('test-tenant-ml');

      expect(accuracy.totalPredictions).toBe(100);
      expect(accuracy.validatedCount).toBe(4);
      expect(accuracy.accurateCount).toBe(3);
      expect(accuracy.accuracy).toBe(0.75);
      expect(accuracy.byType['SUCCESS_PREDICTION'].accurate).toBe(2);
    });
  });

  // ==========================================================================
  // Utility Function Tests
  // ==========================================================================

  describe('isMLAvailable', () => {
    it('should return AI availability status', () => {
      (aiClient.isAIAvailable as ReturnType<typeof vi.fn>).mockReturnValue(
        true,
      );
      expect(isMLAvailable()).toBe(true);

      (aiClient.isAIAvailable as ReturnType<typeof vi.fn>).mockReturnValue(
        false,
      );
      expect(isMLAvailable()).toBe(false);
    });
  });

  describe('getMLConfig', () => {
    it('should return ML configuration', () => {
      const config = getMLConfig();

      expect(config.defaultPredictionWindowDays).toBe(30);
      expect(config.predictionValidityDays).toBe(7);
    });
  });

  describe('getHighRiskProjects', () => {
    it('should return high-risk projects', async () => {
      const mockPredictions = [
        {
          id: 1,
          predictionType: 'RISK_FORECAST',
          probability: 0.85,
          confidence: 0.9,
          explanation: 'Critical risk',
          predictedAt: new Date(),
          project: {
            id: 100,
            name: 'High Risk Project',
            status: 'IN_PROGRESS',
            healthStatus: 'CRITICAL',
          },
        },
        {
          id: 2,
          predictionType: 'RISK_FORECAST',
          probability: 0.72,
          confidence: 0.82,
          explanation: 'High risk',
          predictedAt: new Date(),
          project: {
            id: 101,
            name: 'At Risk Project',
            status: 'IN_PROGRESS',
            healthStatus: 'AT_RISK',
          },
        },
      ];

      (
        prisma.projectMLPrediction.findMany as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockPredictions);

      const projects = await getHighRiskProjects('test-tenant-ml', 0.6, 10);

      expect(projects).toHaveLength(2);
      expect(projects[0].project.name).toBe('High Risk Project');
      expect(projects[0].prediction.probability).toBe(0.85);
    });
  });
});
