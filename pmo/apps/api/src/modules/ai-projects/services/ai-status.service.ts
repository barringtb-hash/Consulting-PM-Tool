/**
 * AI Status Summary Service
 *
 * Generates AI-powered status summaries for projects, including health analysis,
 * risk identification, and actionable recommendations.
 */

import { prisma } from '../../../prisma/client';
import { llmService } from '../../../services/llm.service';
import { getProjectStatus } from '../../../services/projectStatus.service';

export interface AIStatusSummary {
  executiveSummary: string;
  healthAnalysis: {
    overallHealth: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
    healthScore: number; // 0-100
    factors: HealthFactor[];
  };
  keyHighlights: string[];
  concerns: Concern[];
  recommendations: Recommendation[];
  metrics: ProjectMetrics;
  generatedAt: Date;
}

export interface HealthFactor {
  name: string;
  status: 'positive' | 'neutral' | 'negative';
  impact: 'high' | 'medium' | 'low';
  description: string;
}

export interface Concern {
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestedAction?: string;
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImpact: string;
}

export interface ProjectMetrics {
  taskCompletion: {
    completed: number;
    total: number;
    percentage: number;
  };
  milestoneProgress: {
    completed: number;
    total: number;
    percentage: number;
  };
  overdueItems: {
    tasks: number;
    milestones: number;
  };
  velocity: {
    tasksCompletedThisWeek: number;
    tasksCompletedLastWeek: number;
    trend: 'improving' | 'stable' | 'declining';
  };
  teamUtilization: {
    activeMembers: number;
    totalMembers: number;
  };
}

class AIStatusService {
  /**
   * Generate a comprehensive AI status summary for a project
   */
  async generateStatusSummary(
    projectId: number,
    tenantId: string,
  ): Promise<AIStatusSummary> {
    // Gather all project data
    const [project, tasks, milestones, members, recentActivity] =
      await Promise.all([
        this.getProjectDetails(projectId, tenantId),
        this.getTaskMetrics(projectId, tenantId),
        this.getMilestoneMetrics(projectId, tenantId),
        this.getTeamMetrics(projectId, tenantId),
        this.getRecentActivity(projectId, tenantId),
      ]);

    if (!project) {
      throw new Error('Project not found');
    }

    // Calculate health factors
    const healthFactors = this.calculateHealthFactors(
      project,
      tasks,
      milestones,
      members,
    );

    // Calculate overall health score
    const healthScore = this.calculateHealthScore(healthFactors);
    const overallHealth = this.determineHealthStatus(healthScore);

    // Build metrics
    const metrics: ProjectMetrics = {
      taskCompletion: {
        completed: tasks.completed,
        total: tasks.total,
        percentage:
          tasks.total > 0
            ? Math.round((tasks.completed / tasks.total) * 100)
            : 0,
      },
      milestoneProgress: {
        completed: milestones.completed,
        total: milestones.total,
        percentage:
          milestones.total > 0
            ? Math.round((milestones.completed / milestones.total) * 100)
            : 0,
      },
      overdueItems: {
        tasks: tasks.overdue,
        milestones: milestones.overdue,
      },
      velocity: tasks.velocity,
      teamUtilization: {
        activeMembers: members.activeCount,
        totalMembers: members.totalCount,
      },
    };

    // Generate AI-powered analysis
    const aiAnalysis = await this.generateAIAnalysis(
      project,
      metrics,
      healthFactors,
      recentActivity,
    );

    return {
      executiveSummary: aiAnalysis.executiveSummary,
      healthAnalysis: {
        overallHealth,
        healthScore,
        factors: healthFactors,
      },
      keyHighlights: aiAnalysis.highlights,
      concerns: aiAnalysis.concerns,
      recommendations: aiAnalysis.recommendations,
      metrics,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate a quick status update (less comprehensive, faster)
   */
  async generateQuickStatus(
    projectId: number,
    _tenantId: string,
  ): Promise<string> {
    const status = await getProjectStatus(projectId);

    const totalTasks = Object.values(status.taskCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
    const doneTasks = status.taskCounts['DONE'] || 0;
    const completionRate =
      totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const overdueTasks = status.overdueTasks.length;

    const healthEmoji: Record<string, string> = {
      ON_TRACK: '🟢',
      AT_RISK: '🟡',
      OFF_TRACK: '🔴',
    };

    return `${healthEmoji[status.healthStatus] || '⚪'} **${completionRate}% complete** - ${doneTasks}/${totalTasks} tasks done, ${overdueTasks} overdue`;
  }

  /**
   * Get project details
   */
  private async getProjectDetails(projectId: number, tenantId: string) {
    return prisma.project.findFirst({
      where: { id: projectId, tenantId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        account: { select: { id: true, name: true } },
        template: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Get task metrics for health calculation
   */
  private async getTaskMetrics(projectId: number, tenantId: string) {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [
      allTasks,
      completedTasks,
      overdueTasks,
      blockedTasks,
      thisWeekCompletions,
      lastWeekCompletions,
    ] = await Promise.all([
      prisma.task.count({ where: { projectId, tenantId } }),
      prisma.task.count({ where: { projectId, tenantId, status: 'DONE' } }),
      prisma.task.count({
        where: {
          projectId,
          tenantId,
          dueDate: { lt: now },
          status: { notIn: ['DONE'] },
        },
      }),
      prisma.task.count({
        where: { projectId, tenantId, status: 'BLOCKED' },
      }),
      prisma.task.count({
        where: {
          projectId,
          tenantId,
          status: 'DONE',
          updatedAt: { gte: oneWeekAgo },
        },
      }),
      prisma.task.count({
        where: {
          projectId,
          tenantId,
          status: 'DONE',
          updatedAt: { gte: twoWeeksAgo, lt: oneWeekAgo },
        },
      }),
    ]);

    const velocityTrend =
      thisWeekCompletions > lastWeekCompletions
        ? 'improving'
        : thisWeekCompletions < lastWeekCompletions
          ? 'declining'
          : 'stable';

    return {
      total: allTasks,
      completed: completedTasks,
      overdue: overdueTasks,
      blocked: blockedTasks,
      inProgress: allTasks - completedTasks - blockedTasks,
      velocity: {
        tasksCompletedThisWeek: thisWeekCompletions,
        tasksCompletedLastWeek: lastWeekCompletions,
        trend: velocityTrend as 'improving' | 'stable' | 'declining',
      },
    };
  }

  /**
   * Get milestone metrics
   */
  private async getMilestoneMetrics(projectId: number, tenantId: string) {
    const now = new Date();

    const [allMilestones, completedMilestones, overdueMilestones] =
      await Promise.all([
        prisma.milestone.count({ where: { projectId, tenantId } }),
        prisma.milestone.count({
          where: { projectId, tenantId, status: 'DONE' },
        }),
        prisma.milestone.count({
          where: {
            projectId,
            tenantId,
            dueDate: { lt: now },
            status: { notIn: ['DONE'] },
          },
        }),
      ]);

    return {
      total: allMilestones,
      completed: completedMilestones,
      overdue: overdueMilestones,
      upcoming: allMilestones - completedMilestones - overdueMilestones,
    };
  }

  /**
   * Get team metrics
   */
  private async getTeamMetrics(projectId: number, tenantId: string) {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalMembers, activeTasks] = await Promise.all([
      prisma.projectMember.count({ where: { projectId } }),
      prisma.task.findMany({
        where: {
          projectId,
          tenantId,
          updatedAt: { gte: oneWeekAgo },
          assignees: { some: {} },
        },
        select: {
          assignees: {
            select: { userId: true },
          },
        },
      }),
    ]);

    // Count unique active members
    const activeUserIds = new Set<number>();
    for (const task of activeTasks) {
      for (const assignee of task.assignees) {
        activeUserIds.add(assignee.userId);
      }
    }

    return {
      totalCount: totalMembers + 1, // +1 for owner
      activeCount: activeUserIds.size,
    };
  }

  /**
   * Get recent activity for context
   */
  private async getRecentActivity(projectId: number, tenantId: string) {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [recentTasks, recentMilestones] = await Promise.all([
      prisma.task.findMany({
        where: {
          projectId,
          tenantId,
          updatedAt: { gte: oneWeekAgo },
        },
        select: {
          title: true,
          status: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
      prisma.milestone.findMany({
        where: {
          projectId,
          tenantId,
          updatedAt: { gte: oneWeekAgo },
        },
        select: {
          name: true,
          status: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

    return { recentTasks, recentMilestones };
  }

  /**
   * Calculate health factors based on project data
   */
  private calculateHealthFactors(
    project: NonNullable<Awaited<ReturnType<typeof this.getProjectDetails>>>,
    tasks: Awaited<ReturnType<typeof this.getTaskMetrics>>,
    milestones: Awaited<ReturnType<typeof this.getMilestoneMetrics>>,
    members: Awaited<ReturnType<typeof this.getTeamMetrics>>,
  ): HealthFactor[] {
    const factors: HealthFactor[] = [];

    // Task completion rate factor
    const taskCompletionRate =
      tasks.total > 0 ? (tasks.completed / tasks.total) * 100 : 100;
    factors.push({
      name: 'Task Completion',
      status:
        taskCompletionRate >= 70
          ? 'positive'
          : taskCompletionRate >= 40
            ? 'neutral'
            : 'negative',
      impact: 'high',
      description: `${Math.round(taskCompletionRate)}% of tasks completed`,
    });

    // Overdue tasks factor
    const overdueRate =
      tasks.total > 0 ? (tasks.overdue / tasks.total) * 100 : 0;
    factors.push({
      name: 'Overdue Tasks',
      status:
        overdueRate <= 5
          ? 'positive'
          : overdueRate <= 15
            ? 'neutral'
            : 'negative',
      impact: 'high',
      description:
        tasks.overdue === 0
          ? 'No overdue tasks'
          : `${tasks.overdue} tasks overdue (${Math.round(overdueRate)}%)`,
    });

    // Blocked tasks factor
    factors.push({
      name: 'Blocked Items',
      status:
        tasks.blocked === 0
          ? 'positive'
          : tasks.blocked <= 2
            ? 'neutral'
            : 'negative',
      impact: 'medium',
      description:
        tasks.blocked === 0
          ? 'No blocked tasks'
          : `${tasks.blocked} tasks blocked`,
    });

    // Velocity trend factor
    factors.push({
      name: 'Team Velocity',
      status:
        tasks.velocity.trend === 'improving'
          ? 'positive'
          : tasks.velocity.trend === 'stable'
            ? 'neutral'
            : 'negative',
      impact: 'medium',
      description: `Velocity is ${tasks.velocity.trend} (${tasks.velocity.tasksCompletedThisWeek} tasks this week vs ${tasks.velocity.tasksCompletedLastWeek} last week)`,
    });

    // Milestone progress factor
    if (milestones.total > 0) {
      const milestoneRate = (milestones.completed / milestones.total) * 100;
      factors.push({
        name: 'Milestone Progress',
        status:
          milestones.overdue > 0
            ? 'negative'
            : milestoneRate >= 50
              ? 'positive'
              : 'neutral',
        impact: 'high',
        description:
          milestones.overdue > 0
            ? `${milestones.overdue} milestones overdue`
            : `${milestones.completed}/${milestones.total} milestones completed`,
      });
    }

    // Team engagement factor
    const engagementRate =
      members.totalCount > 0
        ? (members.activeCount / members.totalCount) * 100
        : 100;
    factors.push({
      name: 'Team Engagement',
      status:
        engagementRate >= 70
          ? 'positive'
          : engagementRate >= 40
            ? 'neutral'
            : 'negative',
      impact: 'low',
      description: `${members.activeCount}/${members.totalCount} team members active this week`,
    });

    return factors;
  }

  /**
   * Calculate overall health score from factors
   */
  private calculateHealthScore(factors: HealthFactor[]): number {
    let totalWeight = 0;
    let weightedScore = 0;

    const impactWeights = { high: 3, medium: 2, low: 1 };
    const statusScores = { positive: 100, neutral: 60, negative: 20 };

    for (const factor of factors) {
      const weight = impactWeights[factor.impact];
      const score = statusScores[factor.status];
      totalWeight += weight;
      weightedScore += score * weight;
    }

    return totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 50;
  }

  /**
   * Determine health status from score
   */
  private determineHealthStatus(
    score: number,
  ): 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK' {
    if (score >= 70) return 'ON_TRACK';
    if (score >= 40) return 'AT_RISK';
    return 'OFF_TRACK';
  }

  /**
   * Generate AI-powered analysis using LLM
   */
  private async generateAIAnalysis(
    project: NonNullable<Awaited<ReturnType<typeof this.getProjectDetails>>>,
    metrics: ProjectMetrics,
    healthFactors: HealthFactor[],
    recentActivity: Awaited<ReturnType<typeof this.getRecentActivity>>,
  ): Promise<{
    executiveSummary: string;
    highlights: string[];
    concerns: Concern[];
    recommendations: Recommendation[];
  }> {
    try {
      const prompt = `Analyze this project status and provide insights:

PROJECT: ${project.name}
STATUS: ${project.status}
HEALTH: ${project.healthStatus}

METRICS:
- Tasks: ${metrics.taskCompletion.completed}/${metrics.taskCompletion.total} completed (${metrics.taskCompletion.percentage}%)
- Milestones: ${metrics.milestoneProgress.completed}/${metrics.milestoneProgress.total} completed
- Overdue: ${metrics.overdueItems.tasks} tasks, ${metrics.overdueItems.milestones} milestones
- Velocity Trend: ${metrics.velocity.trend} (${metrics.velocity.tasksCompletedThisWeek} vs ${metrics.velocity.tasksCompletedLastWeek} tasks/week)
- Team: ${metrics.teamUtilization.activeMembers}/${metrics.teamUtilization.totalMembers} active

HEALTH FACTORS:
${healthFactors.map((f) => `- ${f.name}: ${f.status} (${f.description})`).join('\n')}

RECENT ACTIVITY:
${recentActivity.recentTasks
  .slice(0, 5)
  .map((t) => `- Task "${t.title}" is ${t.status}`)
  .join('\n')}

Provide JSON response with:
{
  "executiveSummary": "2-3 sentence summary for stakeholders",
  "highlights": ["array of 2-3 key positive highlights"],
  "concerns": [
    {
      "severity": "critical|high|medium|low",
      "title": "brief title",
      "description": "explanation",
      "suggestedAction": "what to do"
    }
  ],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "title": "recommendation title",
      "description": "what to do",
      "expectedImpact": "what will improve"
    }
  ]
}`;

      const response = await llmService.complete(prompt, {
        maxTokens: 1000,
        temperature: 0.3,
      });

      return JSON.parse(response.content);
    } catch (_error) {
      // Fallback to rule-based analysis
      return this.generateRuleBasedAnalysis(metrics, healthFactors);
    }
  }

  /**
   * Fallback rule-based analysis when LLM is unavailable
   */
  private generateRuleBasedAnalysis(
    metrics: ProjectMetrics,
    healthFactors: HealthFactor[],
  ): {
    executiveSummary: string;
    highlights: string[];
    concerns: Concern[];
    recommendations: Recommendation[];
  } {
    const highlights: string[] = [];
    const concerns: Concern[] = [];
    const recommendations: Recommendation[] = [];

    // Generate highlights from positive factors
    for (const factor of healthFactors.filter((f) => f.status === 'positive')) {
      highlights.push(factor.description);
    }

    // Generate concerns from negative factors
    for (const factor of healthFactors.filter((f) => f.status === 'negative')) {
      concerns.push({
        severity: factor.impact === 'high' ? 'high' : 'medium',
        title: factor.name,
        description: factor.description,
        suggestedAction: this.getSuggestedAction(factor.name),
      });
    }

    // Generate recommendations
    if (metrics.overdueItems.tasks > 0) {
      recommendations.push({
        priority: 'high',
        title: 'Address overdue tasks',
        description: `Review and reprioritize ${metrics.overdueItems.tasks} overdue tasks`,
        expectedImpact: 'Improve project health score and reduce risk',
      });
    }

    if (metrics.velocity.trend === 'declining') {
      recommendations.push({
        priority: 'medium',
        title: 'Investigate velocity decline',
        description: 'Team velocity has decreased - consider a retrospective',
        expectedImpact: 'Identify blockers and improve team productivity',
      });
    }

    // Executive summary
    const healthScore = this.calculateHealthScore(healthFactors);
    const executiveSummary =
      healthScore >= 70
        ? `Project is progressing well with ${metrics.taskCompletion.percentage}% of tasks completed. Team velocity is ${metrics.velocity.trend}.`
        : healthScore >= 40
          ? `Project needs attention with ${metrics.overdueItems.tasks} overdue tasks. Completion rate is ${metrics.taskCompletion.percentage}%.`
          : `Project is at risk with multiple issues requiring immediate attention. ${metrics.overdueItems.tasks} tasks and ${metrics.overdueItems.milestones} milestones are overdue.`;

    return {
      executiveSummary,
      highlights: highlights.slice(0, 3),
      concerns,
      recommendations,
    };
  }

  /**
   * Get suggested action for a health factor
   */
  private getSuggestedAction(factorName: string): string {
    const actions: Record<string, string> = {
      'Task Completion': 'Review task priorities and resource allocation',
      'Overdue Tasks': 'Triage overdue items and update due dates or reassign',
      'Blocked Items': 'Schedule a blockers review meeting with the team',
      'Team Velocity': 'Hold a retrospective to identify improvement areas',
      'Milestone Progress': 'Review milestone scope and adjust timelines',
      'Team Engagement': 'Check in with inactive team members',
    };
    return actions[factorName] || 'Review and take appropriate action';
  }

  /**
   * Store a generated summary for historical tracking
   */
  async storeSummary(
    projectId: number,
    tenantId: string,
    summary: AIStatusSummary,
  ): Promise<void> {
    await prisma.projectHealthPrediction.create({
      data: {
        projectId,
        tenantId,
        predictedHealth: summary.healthAnalysis.overallHealth,
        confidence: summary.healthAnalysis.healthScore / 100,
        factors: {
          riskFactors: summary.concerns.map((c) => ({
            factor: c.title,
            severity: c.severity,
            description: c.description,
          })),
          recommendations: summary.recommendations.map((r) => r.description),
        },
        predictedDate: new Date(
          summary.generatedAt.getTime() + 7 * 24 * 60 * 60 * 1000,
        ), // Prediction valid for 1 week
      },
    });
  }
}

export const aiStatusService = new AIStatusService();
