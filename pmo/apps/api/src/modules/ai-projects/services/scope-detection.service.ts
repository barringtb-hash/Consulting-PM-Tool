/**
 * Scope Change Detection Service
 *
 * Monitors project scope changes and alerts when significant deviations occur.
 * Tracks baselines, compares current state, and identifies scope creep.
 */

import { prisma } from '../../../prisma/client';
import { llmService } from '../../../services/llm.service';

export interface ScopeBaseline {
  projectId: number;
  baselineDate: Date;
  taskCount: number;
  milestoneCount: number;
  estimatedHours: number;
  taskTitles: string[];
  milestoneTitles: string[];
}

export interface ScopeChange {
  id?: number;
  projectId: number;
  changeType:
    | 'TASK_ADDITION'
    | 'TASK_REMOVAL'
    | 'MILESTONE_ADDITION'
    | 'MILESTONE_CHANGE'
    | 'TIMELINE_EXTENSION'
    | 'REQUIREMENT_CHANGE';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  description: string;
  affectedItems: {
    tasks?: { id: number; title: string }[];
    milestones?: { id: number; title: string }[];
  };
  impactAnalysis?: string;
  recommendation?: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';
  acknowledgedBy?: number;
  acknowledgedAt?: Date;
  createdAt: Date;
}

export interface ScopeAnalysis {
  projectId: number;
  currentScope: {
    taskCount: number;
    milestoneCount: number;
    estimatedHours: number;
  };
  baselineScope?: {
    taskCount: number;
    milestoneCount: number;
    estimatedHours: number;
    baselineDate: Date;
  };
  deviation: {
    taskCountChange: number;
    taskCountPercent: number;
    milestoneCountChange: number;
    hoursChange: number;
    hoursPercent: number;
  };
  scopeCreepScore: number; // 0-100
  recentChanges: ScopeChange[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recommendations: string[];
  analysisDate: Date;
}

class ScopeDetectionService {
  /**
   * Create a scope baseline for a project
   */
  async createBaseline(
    projectId: number,
    tenantId: string,
    _description?: string,
  ): Promise<ScopeBaseline> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId },
      include: {
        tasks: {
          select: { id: true, title: true, estimatedHours: true },
        },
        milestones: {
          select: { id: true, name: true },
        },
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const totalEstimatedHours = project.tasks.reduce(
      (sum: number, t: { estimatedHours: number | null }) =>
        sum + (t.estimatedHours || 0),
      0,
    );

    // Store baseline with schema-aligned fields
    const baseline = await prisma.projectScopeBaseline.create({
      data: {
        projectId,
        tenantId,
        originalTaskCount: project.tasks.length,
        originalMilestoneCount: project.milestones.length,
        originalScope: {
          goals: [],
          deliverables: [],
          exclusions: [],
          // Store snapshot data for comparison
          tasks: project.tasks.map((t) => ({
            id: t.id,
            title: t.title,
            estimatedHours: t.estimatedHours,
          })),
          milestones: project.milestones.map((m) => ({
            id: m.id,
            name: m.name,
          })),
          totalEstimatedHours,
        },
        baselineDate: new Date(),
      },
    });

    return {
      projectId,
      baselineDate: baseline.baselineDate,
      taskCount: baseline.originalTaskCount,
      milestoneCount: baseline.originalMilestoneCount,
      estimatedHours: totalEstimatedHours,
      taskTitles: project.tasks.map((t) => t.title),
      milestoneTitles: project.milestones.map((m) => m.name),
    };
  }

  /**
   * Get the most recent baseline for a project
   */
  async getLatestBaseline(
    projectId: number,
    tenantId: string,
  ): Promise<ScopeBaseline | null> {
    const baseline = await prisma.projectScopeBaseline.findFirst({
      where: { projectId, tenantId, isActive: true },
      orderBy: { baselineDate: 'desc' },
    });

    if (!baseline) return null;

    const originalScope = baseline.originalScope as {
      tasks?: { id: number; title: string; estimatedHours?: number }[];
      milestones?: { id: number; name: string }[];
      totalEstimatedHours?: number;
    };

    return {
      projectId,
      baselineDate: baseline.baselineDate,
      taskCount: baseline.originalTaskCount,
      milestoneCount: baseline.originalMilestoneCount,
      estimatedHours: originalScope.totalEstimatedHours || 0,
      taskTitles: originalScope.tasks?.map((t) => t.title) || [],
      milestoneTitles: originalScope.milestones?.map((m) => m.name) || [],
    };
  }

  /**
   * Analyze scope changes since baseline
   */
  async analyzeScope(
    projectId: number,
    tenantId: string,
  ): Promise<ScopeAnalysis> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            estimatedHours: true,
            createdAt: true,
          },
        },
        milestones: {
          select: { id: true, name: true, createdAt: true },
        },
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Current scope
    const currentScope = {
      taskCount: project.tasks.length,
      milestoneCount: project.milestones.length,
      estimatedHours: project.tasks.reduce(
        (sum: number, t: { estimatedHours: number | null }) =>
          sum + (t.estimatedHours || 0),
        0,
      ),
    };

    // Get baseline
    const baseline = await this.getLatestBaseline(projectId, tenantId);

    // Calculate deviation
    let deviation = {
      taskCountChange: 0,
      taskCountPercent: 0,
      milestoneCountChange: 0,
      hoursChange: 0,
      hoursPercent: 0,
    };

    let baselineScope;

    if (baseline) {
      deviation = {
        taskCountChange: currentScope.taskCount - baseline.taskCount,
        taskCountPercent:
          baseline.taskCount > 0
            ? ((currentScope.taskCount - baseline.taskCount) /
                baseline.taskCount) *
              100
            : 0,
        milestoneCountChange:
          currentScope.milestoneCount - baseline.milestoneCount,
        hoursChange: currentScope.estimatedHours - baseline.estimatedHours,
        hoursPercent:
          baseline.estimatedHours > 0
            ? ((currentScope.estimatedHours - baseline.estimatedHours) /
                baseline.estimatedHours) *
              100
            : 0,
      };

      baselineScope = {
        taskCount: baseline.taskCount,
        milestoneCount: baseline.milestoneCount,
        estimatedHours: baseline.estimatedHours,
        baselineDate: baseline.baselineDate,
      };
    }

    // Get recent unacknowledged changes
    const recentChanges = await this.getRecentChanges(projectId, tenantId, 30);

    // Calculate scope creep score
    const scopeCreepScore = this.calculateScopeCreepScore(
      deviation,
      recentChanges,
    );

    // Determine risk level
    const riskLevel = this.determineRiskLevel(scopeCreepScore);

    // Generate recommendations
    const recommendations = await this.generateRecommendations(
      deviation,
      recentChanges,
      riskLevel,
    );

    return {
      projectId,
      currentScope,
      baselineScope,
      deviation,
      scopeCreepScore,
      recentChanges,
      riskLevel,
      recommendations,
      analysisDate: new Date(),
    };
  }

  /**
   * Detect and record scope changes since last check
   */
  async detectChanges(
    projectId: number,
    tenantId: string,
  ): Promise<ScopeChange[]> {
    const baseline = await this.getLatestBaseline(projectId, tenantId);

    if (!baseline) {
      // No baseline - create one
      await this.createBaseline(
        projectId,
        tenantId,
        'Auto-generated initial baseline',
      );
      return [];
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId },
      include: {
        tasks: {
          select: {
            id: true,
            title: true,
            estimatedHours: true,
            createdAt: true,
          },
        },
        milestones: {
          select: { id: true, name: true, createdAt: true },
        },
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const changes: ScopeChange[] = [];

    // Check for new tasks since baseline
    const newTasks = project.tasks.filter(
      (t) => t.createdAt > baseline.baselineDate,
    );

    if (newTasks.length > 0) {
      // Check for existing alert for task additions
      const existingAlert = await prisma.scopeChangeAlert.findFirst({
        where: {
          projectId,
          tenantId,
          changeType: 'TASK_ADDITION',
          status: 'ACTIVE',
          createdAt: { gte: baseline.baselineDate },
        },
      });

      if (!existingAlert) {
        const change = await this.recordChange(
          {
            projectId,
            changeType: 'TASK_ADDITION',
            severity: this.assessSeverity(newTasks.length, 'task'),
            description: `${newTasks.length} new task(s) added since baseline`,
            affectedItems: {
              tasks: newTasks.map((t) => ({ id: t.id, title: t.title })),
            },
            status: 'ACTIVE',
            createdAt: new Date(),
          },
          tenantId,
        );
        changes.push(change);
      }
    }

    // Check for new milestones since baseline
    const newMilestones = project.milestones.filter(
      (m) => m.createdAt > baseline.baselineDate,
    );

    if (newMilestones.length > 0) {
      const existingAlert = await prisma.scopeChangeAlert.findFirst({
        where: {
          projectId,
          tenantId,
          changeType: 'MILESTONE_ADDITION',
          status: 'ACTIVE',
          createdAt: { gte: baseline.baselineDate },
        },
      });

      if (!existingAlert) {
        const change = await this.recordChange(
          {
            projectId,
            changeType: 'MILESTONE_ADDITION',
            severity: 'WARNING', // Milestones are always significant
            description: `${newMilestones.length} new milestone(s) added since baseline`,
            affectedItems: {
              milestones: newMilestones.map((m) => ({
                id: m.id,
                title: m.name,
              })),
            },
            status: 'ACTIVE',
            createdAt: new Date(),
          },
          tenantId,
        );
        changes.push(change);
      }
    }

    // Check for removed items using baseline data
    const baselineData = await prisma.projectScopeBaseline.findFirst({
      where: { projectId, tenantId, isActive: true },
      orderBy: { baselineDate: 'desc' },
      select: { originalScope: true },
    });

    if (baselineData?.originalScope) {
      const originalScope = baselineData.originalScope as {
        tasks?: { id: number; title: string }[];
        milestones?: { id: number; name: string }[];
      };

      // Check for removed tasks
      const currentTaskIds = new Set(project.tasks.map((t) => t.id));
      const removedTasks = (originalScope.tasks || []).filter(
        (t) => !currentTaskIds.has(t.id),
      );

      if (removedTasks.length > 0) {
        const existingAlert = await prisma.scopeChangeAlert.findFirst({
          where: {
            projectId,
            tenantId,
            changeType: 'TASK_REMOVAL',
            status: 'ACTIVE',
          },
        });

        if (!existingAlert) {
          const change = await this.recordChange(
            {
              projectId,
              changeType: 'TASK_REMOVAL',
              severity: this.assessSeverity(removedTasks.length, 'task'),
              description: `${removedTasks.length} task(s) removed since baseline`,
              affectedItems: {
                tasks: removedTasks.map((t) => ({ id: t.id, title: t.title })),
              },
              status: 'ACTIVE',
              createdAt: new Date(),
            },
            tenantId,
          );
          changes.push(change);
        }
      }
    }

    return changes;
  }

  /**
   * Acknowledge a scope change
   */
  async acknowledgeChange(
    changeId: number,
    userId: number,
    _tenantId: string,
  ): Promise<void> {
    await prisma.scopeChangeAlert.update({
      where: { id: changeId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
      },
    });
  }

  /**
   * Get scope change history for a project
   */
  async getChangeHistory(
    projectId: number,
    tenantId: string,
    limit: number = 50,
  ): Promise<ScopeChange[]> {
    const alerts = await prisma.scopeChangeAlert.findMany({
      where: { projectId, tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return alerts.map((a) => ({
      id: a.id,
      projectId: a.projectId,
      changeType: a.changeType as ScopeChange['changeType'],
      severity: a.severity as ScopeChange['severity'],
      description: a.description,
      affectedItems: a.affectedItems as ScopeChange['affectedItems'],
      impactAnalysis: a.impactAnalysis || undefined,
      recommendation: a.recommendation || undefined,
      status: a.status as ScopeChange['status'],
      acknowledgedBy: a.acknowledgedBy || undefined,
      acknowledgedAt: a.acknowledgedAt || undefined,
      createdAt: a.createdAt,
    }));
  }

  // Private helper methods

  private async recordChange(
    change: ScopeChange,
    tenantId: string,
  ): Promise<ScopeChange> {
    const alert = await prisma.scopeChangeAlert.create({
      data: {
        projectId: change.projectId,
        tenantId,
        changeType: change.changeType,
        severity: change.severity,
        description: change.description,
        affectedItems: change.affectedItems,
        impactAnalysis: change.impactAnalysis,
        recommendation: change.recommendation,
        status: 'ACTIVE',
      },
    });

    return { ...change, id: alert.id, createdAt: alert.createdAt };
  }

  private async getRecentChanges(
    projectId: number,
    tenantId: string,
    days: number,
  ): Promise<ScopeChange[]> {
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const alerts = await prisma.scopeChangeAlert.findMany({
      where: {
        projectId,
        tenantId,
        createdAt: { gte: sinceDate },
      },
      orderBy: { createdAt: 'desc' },
    });

    return alerts.map((a) => ({
      id: a.id,
      projectId: a.projectId,
      changeType: a.changeType as ScopeChange['changeType'],
      severity: a.severity as ScopeChange['severity'],
      description: a.description,
      affectedItems: a.affectedItems as ScopeChange['affectedItems'],
      impactAnalysis: a.impactAnalysis || undefined,
      recommendation: a.recommendation || undefined,
      status: a.status as ScopeChange['status'],
      acknowledgedBy: a.acknowledgedBy || undefined,
      acknowledgedAt: a.acknowledgedAt || undefined,
      createdAt: a.createdAt,
    }));
  }

  private assessSeverity(
    count: number,
    type: 'task' | 'milestone',
  ): 'INFO' | 'WARNING' | 'CRITICAL' {
    if (type === 'milestone') {
      return count >= 2 ? 'CRITICAL' : 'WARNING';
    }
    if (count >= 5) return 'CRITICAL';
    if (count >= 2) return 'WARNING';
    return 'INFO';
  }

  private calculateScopeCreepScore(
    deviation: ScopeAnalysis['deviation'],
    recentChanges: ScopeChange[],
  ): number {
    let score = 0;

    // Task count increase contributes to score
    if (deviation.taskCountPercent > 0) {
      score += Math.min(40, deviation.taskCountPercent);
    }

    // Hours increase contributes to score
    if (deviation.hoursPercent > 0) {
      score += Math.min(30, deviation.hoursPercent);
    }

    // Recent unacknowledged changes contribute to score
    const unacknowledged = recentChanges.filter((c) => c.status === 'ACTIVE');
    score += Math.min(30, unacknowledged.length * 5);

    return Math.min(100, Math.round(score));
  }

  private determineRiskLevel(
    scopeCreepScore: number,
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (scopeCreepScore >= 75) return 'CRITICAL';
    if (scopeCreepScore >= 50) return 'HIGH';
    if (scopeCreepScore >= 25) return 'MEDIUM';
    return 'LOW';
  }

  private async generateRecommendations(
    deviation: ScopeAnalysis['deviation'],
    recentChanges: ScopeChange[],
    riskLevel: string,
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Rule-based recommendations
    if (deviation.taskCountPercent > 20) {
      recommendations.push(
        'Consider creating a new baseline to reset scope expectations with stakeholders.',
      );
    }

    if (deviation.hoursPercent > 15) {
      recommendations.push(
        'Review project timeline and budget allocation to account for increased scope.',
      );
    }

    const unacknowledged = recentChanges.filter((c) => c.status === 'ACTIVE');
    if (unacknowledged.length > 5) {
      recommendations.push(
        `Review and acknowledge ${unacknowledged.length} pending scope changes.`,
      );
    }

    const criticalChanges = recentChanges.filter(
      (c) => c.severity === 'CRITICAL',
    );
    if (criticalChanges.length > 0) {
      recommendations.push(
        'Schedule a scope review meeting to discuss critical changes with stakeholders.',
      );
    }

    if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
      recommendations.push(
        'Implement stricter change control processes to prevent further scope creep.',
      );
    }

    // Try AI-generated recommendations if LLM available
    try {
      const aiRecs = await this.getAIRecommendations(
        deviation,
        recentChanges,
        riskLevel,
      );
      recommendations.push(...aiRecs);
    } catch {
      // Use only rule-based recommendations
    }

    return [...new Set(recommendations)].slice(0, 5);
  }

  private async getAIRecommendations(
    deviation: ScopeAnalysis['deviation'],
    recentChanges: ScopeChange[],
    riskLevel: string,
  ): Promise<string[]> {
    const prompt = `Provide 2-3 specific recommendations for managing scope in this project:

SCOPE STATUS:
- Risk Level: ${riskLevel}
- Task count change: ${deviation.taskCountChange > 0 ? '+' : ''}${deviation.taskCountChange} (${Math.round(deviation.taskCountPercent)}%)
- Hours change: ${deviation.hoursChange > 0 ? '+' : ''}${Math.round(deviation.hoursChange)} (${Math.round(deviation.hoursPercent)}%)

RECENT CHANGES (${recentChanges.length} total):
${recentChanges
  .slice(0, 5)
  .map((c) => `- ${c.changeType}: ${c.description} (${c.severity})`)
  .join('\n')}

Return JSON array of recommendation strings only:
["recommendation 1", "recommendation 2"]`;

    const response = await llmService.complete(prompt, {
      maxTokens: 200,
      temperature: 0.3,
    });

    return JSON.parse(response.content);
  }
}

export const scopeDetectionService = new ScopeDetectionService();
