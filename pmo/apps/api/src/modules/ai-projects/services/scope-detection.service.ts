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
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  acknowledgedBy?: number;
  acknowledgedAt?: Date;
  createdAt: Date;
  // Legacy fields for backward compatibility
  itemType?: 'TASK' | 'MILESTONE' | 'REQUIREMENT';
  itemId?: number;
  itemTitle?: string;
  impact?: 'HIGH' | 'MEDIUM' | 'LOW';
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
    description?: string,
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
      (sum, t) => sum + (t.estimatedHours || 0),
      0,
    );

    const baseline = await prisma.projectScopeBaseline.create({
      data: {
        projectId,
        tenantId,
        description,
        taskCount: project.tasks.length,
        milestoneCount: project.milestones.length,
        estimatedHours: totalEstimatedHours,
        snapshot: {
          tasks: project.tasks.map((t) => ({
            id: t.id,
            title: t.title,
            estimatedHours: t.estimatedHours,
          })),
          milestones: project.milestones.map((m) => ({
            id: m.id,
            name: m.name,
          })),
        },
        baselineDate: new Date(),
      },
    });

    return {
      projectId,
      baselineDate: baseline.baselineDate,
      taskCount: baseline.taskCount,
      milestoneCount: baseline.milestoneCount,
      estimatedHours: baseline.estimatedHours,
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
      where: { projectId, tenantId },
      orderBy: { baselineDate: 'desc' },
    });

    if (!baseline) return null;

    const snapshot = baseline.snapshot as {
      tasks: { id: number; title: string; estimatedHours?: number }[];
      milestones: { id: number; name: string }[];
    };

    return {
      projectId,
      baselineDate: baseline.baselineDate,
      taskCount: baseline.taskCount,
      milestoneCount: baseline.milestoneCount,
      estimatedHours: baseline.estimatedHours,
      taskTitles: snapshot.tasks.map((t) => t.title),
      milestoneTitles: snapshot.milestones.map((m) => m.name),
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
        (sum, t) => sum + (t.estimatedHours || 0),
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
      projectId,
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

    for (const task of newTasks) {
      const existingAlert = await prisma.scopeChangeAlert.findFirst({
        where: {
          projectId,
          itemType: 'TASK',
          itemId: task.id,
        },
      });

      if (!existingAlert) {
        const change = await this.recordChange(
          {
            projectId,
            changeType: 'ADDITION',
            itemType: 'TASK',
            itemId: task.id,
            itemTitle: task.title,
            description: `New task added: "${task.title}"`,
            impact: this.assessTaskImpact(task.estimatedHours),
            estimatedHoursImpact: task.estimatedHours,
            detectedAt: new Date(),
            acknowledged: false,
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

    for (const milestone of newMilestones) {
      const existingAlert = await prisma.scopeChangeAlert.findFirst({
        where: {
          projectId,
          itemType: 'MILESTONE',
          itemId: milestone.id,
        },
      });

      if (!existingAlert) {
        const change = await this.recordChange(
          {
            projectId,
            changeType: 'ADDITION',
            itemType: 'MILESTONE',
            itemId: milestone.id,
            itemTitle: milestone.name,
            description: `New milestone added: "${milestone.name}"`,
            impact: 'HIGH', // Milestones are always high impact
            detectedAt: new Date(),
            acknowledged: false,
          },
          tenantId,
        );
        changes.push(change);
      }
    }

    // Check for removed items (compare with baseline snapshot)
    const baselineSnapshot = await prisma.projectScopeBaseline.findFirst({
      where: { projectId, tenantId },
      orderBy: { baselineDate: 'desc' },
      select: { snapshot: true },
    });

    if (baselineSnapshot?.snapshot) {
      const snapshot = baselineSnapshot.snapshot as {
        tasks: { id: number; title: string }[];
        milestones: { id: number; name: string }[];
      };

      // Check for removed tasks
      const currentTaskIds = new Set(project.tasks.map((t) => t.id));
      for (const baselineTask of snapshot.tasks) {
        if (!currentTaskIds.has(baselineTask.id)) {
          const existingAlert = await prisma.scopeChangeAlert.findFirst({
            where: {
              projectId,
              changeType: 'REMOVAL',
              itemType: 'TASK',
              itemId: baselineTask.id,
            },
          });

          if (!existingAlert) {
            const change = await this.recordChange(
              {
                projectId,
                changeType: 'REMOVAL',
                itemType: 'TASK',
                itemId: baselineTask.id,
                itemTitle: baselineTask.title,
                description: `Task removed: "${baselineTask.title}"`,
                impact: 'MEDIUM',
                detectedAt: new Date(),
                acknowledged: false,
              },
              tenantId,
            );
            changes.push(change);
          }
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
        acknowledged: true,
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
      orderBy: { detectedAt: 'desc' },
      take: limit,
    });

    return alerts.map((a) => ({
      id: a.id,
      projectId: a.projectId,
      changeType: a.changeType as 'ADDITION' | 'REMOVAL' | 'MODIFICATION',
      itemType: a.itemType as 'TASK' | 'MILESTONE' | 'REQUIREMENT',
      itemId: a.itemId || undefined,
      itemTitle: a.itemTitle,
      description: a.description,
      impact: a.impact as 'HIGH' | 'MEDIUM' | 'LOW',
      estimatedHoursImpact: a.estimatedHoursImpact || undefined,
      detectedAt: a.detectedAt,
      acknowledged: a.acknowledged,
      acknowledgedBy: a.acknowledgedBy || undefined,
      acknowledgedAt: a.acknowledgedAt || undefined,
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

  private assessTaskImpact(
    estimatedHours?: number | null,
  ): 'HIGH' | 'MEDIUM' | 'LOW' {
    if (!estimatedHours) return 'LOW';
    if (estimatedHours >= 16) return 'HIGH';
    if (estimatedHours >= 4) return 'MEDIUM';
    return 'LOW';
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
    const unacknowledged = recentChanges.filter((c) => !c.acknowledged);
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
    projectId: number,
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

    const unacknowledged = recentChanges.filter((c) => !c.acknowledged);
    if (unacknowledged.length > 5) {
      recommendations.push(
        `Review and acknowledge ${unacknowledged.length} pending scope changes.`,
      );
    }

    const highImpactChanges = recentChanges.filter((c) => c.impact === 'HIGH');
    if (highImpactChanges.length > 0) {
      recommendations.push(
        'Schedule a scope review meeting to discuss high-impact changes with stakeholders.',
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
  .map((c) => `- ${c.changeType}: ${c.itemTitle} (${c.impact} impact)`)
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
