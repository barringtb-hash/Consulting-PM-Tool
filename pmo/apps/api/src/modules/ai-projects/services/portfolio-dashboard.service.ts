/**
 * Portfolio Dashboard Service
 *
 * Provides AI-powered portfolio-level analytics and insights including:
 * - Aggregate health metrics across projects
 * - Resource utilization analysis
 * - Risk heatmaps and trends
 * - Executive-level recommendations
 */

import { prisma } from '../../../prisma/client';
import { llmService } from '../../../services/llm.service';
import { healthPredictionService } from './health-prediction.service';

export interface PortfolioSummary {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  atRiskProjects: number;
  overallHealth: number; // 0-100
  healthDistribution: {
    onTrack: number;
    atRisk: number;
    offTrack: number;
    unknown: number;
  };
  resourceUtilization: number; // percentage
  budgetHealth: {
    onBudget: number;
    overBudget: number;
    underBudget: number;
  };
  generatedAt: Date;
}

export interface PortfolioProject {
  id: number;
  name: string;
  accountName?: string;
  status: string;
  healthStatus: string;
  healthScore: number;
  progress: number;
  taskCompletion: {
    completed: number;
    total: number;
  };
  milestoneProgress: {
    completed: number;
    total: number;
  };
  teamSize: number;
  daysRemaining?: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  predictedHealth?: {
    score: number;
    trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  };
}

export interface RiskHeatmap {
  categories: {
    name: string;
    count: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    projects: { id: number; name: string }[];
  }[];
  trends: {
    category: string;
    trend: 'INCREASING' | 'STABLE' | 'DECREASING';
    changePercent: number;
  }[];
  topRisks: {
    projectId: number;
    projectName: string;
    riskTitle: string;
    severity: string;
    status: string;
  }[];
}

export interface ResourceAnalysis {
  totalTeamMembers: number;
  assignedToProjects: number;
  overallocated: {
    userId: number;
    userName: string;
    projectCount: number;
    taskCount: number;
  }[];
  underutilized: {
    userId: number;
    userName: string;
    projectCount: number;
    availableCapacity: number;
  }[];
  projectStaffing: {
    projectId: number;
    projectName: string;
    currentSize: number;
    recommendedSize: number;
    staffingStatus: 'UNDERSTAFFED' | 'OPTIMAL' | 'OVERSTAFFED';
  }[];
}

export interface PortfolioInsights {
  summary: string;
  keyFindings: {
    type: 'POSITIVE' | 'WARNING' | 'CRITICAL' | 'OPPORTUNITY';
    title: string;
    description: string;
    affectedProjects: number[];
  }[];
  recommendations: {
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    action: string;
    rationale: string;
    impact: string;
  }[];
  trends: {
    metric: string;
    direction: 'UP' | 'DOWN' | 'STABLE';
    percentChange: number;
    insight: string;
  }[];
  generatedAt: Date;
}

class PortfolioDashboardService {
  /**
   * Get portfolio summary metrics
   */
  async getPortfolioSummary(tenantId: string): Promise<PortfolioSummary> {
    const projects = await prisma.project.findMany({
      where: { tenantId },
      select: {
        id: true,
        status: true,
        healthStatus: true,
        members: { select: { userId: true } },
      },
    });

    const activeProjects = projects.filter((p) =>
      ['NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD'].includes(p.status),
    );
    const completedProjects = projects.filter((p) => p.status === 'COMPLETED');

    // Health distribution
    const healthDistribution = {
      onTrack: projects.filter((p) => p.healthStatus === 'ON_TRACK').length,
      atRisk: projects.filter((p) => p.healthStatus === 'AT_RISK').length,
      offTrack: projects.filter((p) => p.healthStatus === 'OFF_TRACK').length,
      unknown: projects.filter((p) => !p.healthStatus).length,
    };

    // Calculate overall health score (weighted by status)
    const healthScores = {
      ON_TRACK: 100,
      AT_RISK: 50,
      OFF_TRACK: 20,
    };
    const projectsWithHealth = projects.filter((p) => p.healthStatus);
    const overallHealth =
      projectsWithHealth.length > 0
        ? Math.round(
            projectsWithHealth.reduce(
              (sum, p) =>
                sum +
                (healthScores[p.healthStatus as keyof typeof healthScores] ||
                  50),
              0,
            ) / projectsWithHealth.length,
          )
        : 50;

    // Resource utilization
    const uniqueMembers = new Set(
      projects.flatMap((p) => p.members.map((m) => m.userId)),
    );
    const totalUsers = await prisma.tenantUser.count({ where: { tenantId } });
    const resourceUtilization =
      totalUsers > 0 ? Math.round((uniqueMembers.size / totalUsers) * 100) : 0;

    return {
      totalProjects: projects.length,
      activeProjects: activeProjects.length,
      completedProjects: completedProjects.length,
      atRiskProjects: healthDistribution.atRisk + healthDistribution.offTrack,
      overallHealth,
      healthDistribution,
      resourceUtilization,
      budgetHealth: {
        onBudget: 0, // Would need budget tracking
        overBudget: 0,
        underBudget: 0,
      },
      generatedAt: new Date(),
    };
  }

  /**
   * Get detailed project list with health and metrics
   */
  async getPortfolioProjects(
    tenantId: string,
    options?: {
      status?: string[];
      healthStatus?: string[];
      sortBy?: 'health' | 'progress' | 'name' | 'risk';
      sortOrder?: 'asc' | 'desc';
      limit?: number;
    },
  ): Promise<PortfolioProject[]> {
    const whereClause: Record<string, unknown> = { tenantId };

    if (options?.status?.length) {
      whereClause.status = { in: options.status };
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        account: { select: { name: true } },
        tasks: { select: { status: true } },
        milestones: { select: { status: true } },
        members: true,
        projectRisks: {
          where: {
            status: {
              in: ['IDENTIFIED', 'ANALYZING', 'MITIGATING', 'MONITORING'],
            },
          },
          select: { severity: true },
        },
      },
    });

    const portfolioProjects: PortfolioProject[] = await Promise.all(
      projects.map(async (p) => {
        const taskCompletion = {
          completed: p.tasks.filter((t) => t.status === 'DONE').length,
          total: p.tasks.length,
        };

        const milestoneProgress = {
          completed: p.milestones.filter((m) => m.status === 'DONE').length,
          total: p.milestones.length,
        };

        const progress =
          taskCompletion.total > 0
            ? Math.round(
                (taskCompletion.completed / taskCompletion.total) * 100,
              )
            : 0;

        // Calculate risk level
        const criticalHighRisks = p.projectRisks.filter(
          (r) => r.severity === 'CRITICAL' || r.severity === 'HIGH',
        ).length;
        const riskLevel: PortfolioProject['riskLevel'] =
          criticalHighRisks >= 3
            ? 'CRITICAL'
            : criticalHighRisks >= 1
              ? 'HIGH'
              : p.projectRisks.length > 0
                ? 'MEDIUM'
                : 'LOW';

        // Get health prediction if available
        let predictedHealth: PortfolioProject['predictedHealth'];
        try {
          const prediction = await healthPredictionService.predictHealth(
            p.id,
            tenantId,
          );
          if (prediction) {
            // Convert health status to score
            const healthStatusScores: Record<string, number> = {
              ON_TRACK: 100,
              AT_RISK: 50,
              OFF_TRACK: 20,
            };
            const score = healthStatusScores[prediction.predictedHealth] || 50;

            // Determine trend from risk factors (if any are worsening)
            const worseningFactors = prediction.riskFactors.filter(
              (f) => f.trend === 'worsening',
            ).length;
            const improvingFactors = prediction.riskFactors.filter(
              (f) => f.trend === 'improving',
            ).length;
            const trend: 'IMPROVING' | 'STABLE' | 'DECLINING' =
              worseningFactors > improvingFactors
                ? 'DECLINING'
                : improvingFactors > worseningFactors
                  ? 'IMPROVING'
                  : 'STABLE';

            predictedHealth = { score, trend };
          }
        } catch {
          // Ignore prediction errors
        }

        // Days remaining
        const daysRemaining = p.endDate
          ? Math.ceil(
              (p.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
            )
          : undefined;

        return {
          id: p.id,
          name: p.name,
          accountName: p.account?.name,
          status: p.status,
          healthStatus: p.healthStatus || 'UNKNOWN',
          healthScore: this.healthStatusToScore(p.healthStatus),
          progress,
          taskCompletion,
          milestoneProgress,
          teamSize: p.members.length,
          daysRemaining,
          riskLevel,
          predictedHealth,
        };
      }),
    );

    // Apply filters and sorting
    let result = portfolioProjects;

    if (options?.healthStatus?.length) {
      result = result.filter((p) =>
        options.healthStatus!.includes(p.healthStatus),
      );
    }

    // Sort
    const sortBy = options?.sortBy || 'health';
    const sortOrder = options?.sortOrder || 'asc';
    const multiplier = sortOrder === 'asc' ? 1 : -1;

    result.sort((a, b) => {
      switch (sortBy) {
        case 'health':
          return (a.healthScore - b.healthScore) * multiplier;
        case 'progress':
          return (a.progress - b.progress) * multiplier;
        case 'name':
          return a.name.localeCompare(b.name) * multiplier;
        case 'risk': {
          const riskOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          return (riskOrder[a.riskLevel] - riskOrder[b.riskLevel]) * multiplier;
        }
        default:
          return 0;
      }
    });

    if (options?.limit) {
      result = result.slice(0, options.limit);
    }

    return result;
  }

  /**
   * Get risk heatmap and trends
   */
  async getRiskHeatmap(tenantId: string): Promise<RiskHeatmap> {
    const risks = await prisma.projectRisk.findMany({
      where: {
        tenantId,
        status: { in: ['IDENTIFIED', 'ANALYZING', 'MITIGATING', 'MONITORING'] },
      },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    // Group by category
    const byCategory: Record<
      string,
      { risks: typeof risks; projects: Set<number> }
    > = {};

    for (const risk of risks) {
      const category = risk.category || 'General';
      if (!byCategory[category]) {
        byCategory[category] = { risks: [], projects: new Set() };
      }
      byCategory[category].risks.push(risk);
      byCategory[category].projects.add(risk.project.id);
    }

    // Build category summary
    const categories = Object.entries(byCategory).map(([name, data]) => {
      // Determine overall severity for category
      const severityCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
      for (const risk of data.risks) {
        severityCounts[risk.severity as keyof typeof severityCounts]++;
      }

      const severity: RiskHeatmap['categories'][0]['severity'] =
        severityCounts.CRITICAL > 0
          ? 'CRITICAL'
          : severityCounts.HIGH > 0
            ? 'HIGH'
            : severityCounts.MEDIUM > 0
              ? 'MEDIUM'
              : 'LOW';

      return {
        name,
        count: data.risks.length,
        severity,
        projects: Array.from(data.projects).map((id) => {
          const risk = data.risks.find((r) => r.project.id === id);
          return { id, name: risk?.project.name || '' };
        }),
      };
    });

    // Sort by severity and count
    categories.sort((a, b) => {
      const severityOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return b.count - a.count;
    });

    // Top individual risks
    const topRisks = risks
      .filter((r) => r.severity === 'CRITICAL' || r.severity === 'HIGH')
      .slice(0, 10)
      .map((r) => ({
        projectId: r.project.id,
        projectName: r.project.name,
        riskTitle: r.title,
        severity: r.severity,
        status: r.status,
      }));

    // Calculate trends (would need historical data)
    const trends = categories.slice(0, 5).map((c) => ({
      category: c.name,
      trend: 'STABLE' as const,
      changePercent: 0,
    }));

    return { categories, trends, topRisks };
  }

  /**
   * Get resource utilization analysis
   */
  async getResourceAnalysis(tenantId: string): Promise<ResourceAnalysis> {
    // Get users who are members of the tenant
    const tenantUsers = await prisma.tenantUser.findMany({
      where: { tenantId },
      include: {
        user: {
          include: {
            projectMemberships: {
              include: {
                project: { select: { id: true, name: true, status: true } },
              },
            },
            taskAssignments: {
              where: { task: { status: { notIn: ['DONE'] } } },
              select: { taskId: true },
            },
          },
        },
      },
    });

    const users = tenantUsers.map((tu) => tu.user);
    const totalTeamMembers = users.length;
    const assignedToProjects = users.filter((u) =>
      u.projectMemberships.some(
        (pm: { project: { status: string } }) =>
          pm.project.status === 'IN_PROGRESS',
      ),
    ).length;

    // Find overallocated users (many active tasks or projects)
    const overallocated = users
      .filter(
        (u) => u.projectMemberships.length > 3 || u.taskAssignments.length > 10,
      )
      .map((u) => ({
        userId: u.id,
        userName: u.name,
        projectCount: u.projectMemberships.filter(
          (pm: { project: { status: string } }) =>
            pm.project.status === 'IN_PROGRESS',
        ).length,
        taskCount: u.taskAssignments.length,
      }))
      .sort((a, b) => b.taskCount - a.taskCount);

    // Find underutilized users
    const underutilized = users
      .filter(
        (u) =>
          u.projectMemberships.filter(
            (pm: { project: { status: string } }) =>
              pm.project.status === 'IN_PROGRESS',
          ).length === 0,
      )
      .map((u) => ({
        userId: u.id,
        userName: u.name,
        projectCount: 0,
        availableCapacity: 100,
      }));

    // Analyze project staffing
    const projects = await prisma.project.findMany({
      where: { tenantId, status: 'IN_PROGRESS' },
      include: {
        members: true,
        tasks: { where: { status: { notIn: ['DONE'] } } },
      },
    });

    const projectStaffing = projects.map((p) => {
      const currentSize = p.members.length;
      // Simple heuristic: recommend 1 person per 5-10 active tasks
      const recommendedSize = Math.max(1, Math.ceil(p.tasks.length / 7));

      const staffingStatus: ResourceAnalysis['projectStaffing'][0]['staffingStatus'] =
        currentSize < recommendedSize * 0.7
          ? 'UNDERSTAFFED'
          : currentSize > recommendedSize * 1.3
            ? 'OVERSTAFFED'
            : 'OPTIMAL';

      return {
        projectId: p.id,
        projectName: p.name,
        currentSize,
        recommendedSize,
        staffingStatus,
      };
    });

    return {
      totalTeamMembers,
      assignedToProjects,
      overallocated,
      underutilized,
      projectStaffing,
    };
  }

  /**
   * Generate AI-powered portfolio insights
   */
  async generateInsights(tenantId: string): Promise<PortfolioInsights> {
    // Gather data
    const [summary, projects, riskHeatmap, resources] = await Promise.all([
      this.getPortfolioSummary(tenantId),
      this.getPortfolioProjects(tenantId),
      this.getRiskHeatmap(tenantId),
      this.getResourceAnalysis(tenantId),
    ]);

    try {
      const prompt = `Analyze this portfolio data and provide executive insights:

PORTFOLIO SUMMARY:
- Total Projects: ${summary.totalProjects}
- Active: ${summary.activeProjects}
- At Risk: ${summary.atRiskProjects}
- Overall Health: ${summary.overallHealth}/100
- Resource Utilization: ${summary.resourceUtilization}%

PROJECT HEALTH DISTRIBUTION:
- On Track: ${summary.healthDistribution.onTrack}
- At Risk: ${summary.healthDistribution.atRisk}
- Off Track: ${summary.healthDistribution.offTrack}

TOP CONCERNS:
${projects
  .filter((p) => p.healthStatus === 'OFF_TRACK' || p.riskLevel === 'CRITICAL')
  .slice(0, 5)
  .map(
    (p) =>
      `- ${p.name}: ${p.healthStatus}, ${p.riskLevel} risk, ${p.progress}% complete`,
  )
  .join('\n')}

RISK CATEGORIES:
${riskHeatmap.categories
  .slice(0, 5)
  .map((c) => `- ${c.name}: ${c.count} risks (${c.severity})`)
  .join('\n')}

RESOURCE ISSUES:
- Overallocated: ${resources.overallocated.length} people
- Underutilized: ${resources.underutilized.length} people
- Understaffed projects: ${resources.projectStaffing.filter((p) => p.staffingStatus === 'UNDERSTAFFED').length}

Generate executive insights. Return JSON:
{
  "summary": "2-3 sentence executive summary",
  "keyFindings": [
    {
      "type": "POSITIVE|WARNING|CRITICAL|OPPORTUNITY",
      "title": "Brief title",
      "description": "Finding description",
      "affectedProjects": [project_ids]
    }
  ],
  "recommendations": [
    {
      "priority": "HIGH|MEDIUM|LOW",
      "action": "Specific action to take",
      "rationale": "Why this matters",
      "impact": "Expected outcome"
    }
  ],
  "trends": [
    {
      "metric": "Metric name",
      "direction": "UP|DOWN|STABLE",
      "percentChange": 0,
      "insight": "What this means"
    }
  ]
}

Focus on actionable insights for executives.`;

      const response = await llmService.complete(prompt, {
        maxTokens: 1500,
        temperature: 0.4,
      });

      const aiInsights = JSON.parse(response.content);

      return {
        ...aiInsights,
        generatedAt: new Date(),
      };
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
      // Return basic insights
      return this.generateBasicInsights(
        summary,
        projects,
        riskHeatmap,
        resources,
      );
    }
  }

  /**
   * Get projects needing attention
   */
  async getProjectsNeedingAttention(
    tenantId: string,
    limit: number = 10,
  ): Promise<{
    critical: PortfolioProject[];
    atRisk: PortfolioProject[];
    stale: PortfolioProject[];
  }> {
    const projects = await this.getPortfolioProjects(tenantId, {
      status: ['IN_PROGRESS', 'ON_HOLD'],
    });

    // Critical: Off track or critical risk
    const critical = projects
      .filter(
        (p) => p.healthStatus === 'OFF_TRACK' || p.riskLevel === 'CRITICAL',
      )
      .slice(0, limit);

    // At risk: At risk health or high risk
    const atRisk = projects
      .filter(
        (p) =>
          p.healthStatus === 'AT_RISK' ||
          (p.riskLevel === 'HIGH' && !critical.find((c) => c.id === p.id)),
      )
      .slice(0, limit);

    // Stale: No recent progress
    const stale = projects
      .filter(
        (p) =>
          p.progress === 0 ||
          (p.progress < 20 &&
            p.daysRemaining !== undefined &&
            p.daysRemaining < 30),
      )
      .filter(
        (p) =>
          !critical.find((c) => c.id === p.id) &&
          !atRisk.find((a) => a.id === p.id),
      )
      .slice(0, limit);

    return { critical, atRisk, stale };
  }

  // Private helper methods

  private healthStatusToScore(healthStatus: string | null): number {
    const scores: Record<string, number> = {
      ON_TRACK: 100,
      AT_RISK: 50,
      OFF_TRACK: 20,
    };
    return scores[healthStatus || ''] || 50;
  }

  private generateBasicInsights(
    summary: PortfolioSummary,
    projects: PortfolioProject[],
    riskHeatmap: RiskHeatmap,
    resources: ResourceAnalysis,
  ): PortfolioInsights {
    const keyFindings: PortfolioInsights['keyFindings'] = [];
    const recommendations: PortfolioInsights['recommendations'] = [];

    // Health-based findings
    if (summary.healthDistribution.offTrack > 0) {
      const offTrackIds = projects
        .filter((p) => p.healthStatus === 'OFF_TRACK')
        .map((p) => p.id);
      keyFindings.push({
        type: 'CRITICAL',
        title: `${summary.healthDistribution.offTrack} projects off track`,
        description:
          'These projects require immediate attention and intervention.',
        affectedProjects: offTrackIds,
      });
      recommendations.push({
        priority: 'HIGH',
        action: 'Review off-track projects with project managers',
        rationale: 'Projects need recovery plans to get back on track',
        impact: 'Prevent further delays and potential failures',
      });
    }

    if (summary.healthDistribution.atRisk > summary.totalProjects * 0.3) {
      keyFindings.push({
        type: 'WARNING',
        title: 'High percentage of at-risk projects',
        description: `${Math.round((summary.healthDistribution.atRisk / summary.totalProjects) * 100)}% of projects are at risk.`,
        affectedProjects: projects
          .filter((p) => p.healthStatus === 'AT_RISK')
          .map((p) => p.id),
      });
    }

    // Resource findings
    if (resources.overallocated.length > 0) {
      keyFindings.push({
        type: 'WARNING',
        title: 'Team members overallocated',
        description: `${resources.overallocated.length} team members are assigned to too many projects or tasks.`,
        affectedProjects: [],
      });
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Rebalance workload across team members',
        rationale: 'Overallocation leads to burnout and quality issues',
        impact: 'Improved productivity and team satisfaction',
      });
    }

    if (
      resources.projectStaffing.some((p) => p.staffingStatus === 'UNDERSTAFFED')
    ) {
      const understaffed = resources.projectStaffing.filter(
        (p) => p.staffingStatus === 'UNDERSTAFFED',
      );
      keyFindings.push({
        type: 'WARNING',
        title: 'Understaffed projects',
        description: `${understaffed.length} projects need additional team members.`,
        affectedProjects: understaffed.map((p) => p.projectId),
      });
    }

    // Risk findings
    if (riskHeatmap.topRisks.length > 0) {
      keyFindings.push({
        type: 'WARNING',
        title: `${riskHeatmap.topRisks.length} critical/high risks active`,
        description:
          'Multiple high-severity risks need monitoring and mitigation.',
        affectedProjects: [
          ...new Set(riskHeatmap.topRisks.map((r) => r.projectId)),
        ],
      });
    }

    // Positive findings
    if (summary.healthDistribution.onTrack > summary.totalProjects * 0.7) {
      keyFindings.push({
        type: 'POSITIVE',
        title: 'Majority of projects on track',
        description: `${Math.round((summary.healthDistribution.onTrack / summary.totalProjects) * 100)}% of projects are healthy.`,
        affectedProjects: [],
      });
    }

    return {
      summary: `Portfolio health is ${summary.overallHealth >= 70 ? 'good' : summary.overallHealth >= 50 ? 'moderate' : 'concerning'} with ${summary.activeProjects} active projects. ${summary.atRiskProjects} projects need attention.`,
      keyFindings,
      recommendations,
      trends: [
        {
          metric: 'Overall Health',
          direction: 'STABLE',
          percentChange: 0,
          insight: `Current portfolio health score is ${summary.overallHealth}/100`,
        },
        {
          metric: 'Resource Utilization',
          direction: 'STABLE',
          percentChange: 0,
          insight: `${summary.resourceUtilization}% of team members assigned to projects`,
        },
      ],
      generatedAt: new Date(),
    };
  }
}

export const portfolioDashboardService = new PortfolioDashboardService();
