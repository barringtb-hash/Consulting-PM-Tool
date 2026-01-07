/**
 * Health Prediction Service
 *
 * Uses machine learning and rule-based analysis to predict project health
 * and identify risks before they become critical issues.
 */

import { prisma } from '../../../prisma/client';
import { llmService } from '../../../services/llm.service';

export interface HealthPrediction {
  projectId: number;
  currentHealth: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
  predictedHealth: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
  confidence: number;
  predictionWindow: string; // e.g., "2 weeks", "1 month"
  riskFactors: RiskFactor[];
  recommendations: PredictionRecommendation[];
  historicalAccuracy?: number;
  predictedAt: Date;
  validUntil: Date;
}

export interface RiskFactor {
  factor: string;
  weight: number; // 0-1
  currentValue: number;
  threshold: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  trend: 'improving' | 'stable' | 'worsening';
  description: string;
}

export interface PredictionRecommendation {
  priority: 'urgent' | 'high' | 'medium' | 'low';
  action: string;
  expectedImpact: string;
  effort: 'low' | 'medium' | 'high';
  deadline?: Date;
}

interface ProjectMetrics {
  taskCompletionRate: number;
  overdueRate: number;
  blockedRate: number;
  velocityTrend: number; // -1 to 1
  milestoneOnTimeRate: number;
  teamEngagement: number;
  budgetUtilization?: number;
  scopeChangeRate: number;
  daysSinceLastUpdate: number;
}

class HealthPredictionService {
  // Risk factor weights (sum to 1)
  private readonly riskWeights: Record<string, number> = {
    taskCompletionRate: 0.2,
    overdueRate: 0.2,
    blockedRate: 0.1,
    velocityTrend: 0.15,
    milestoneOnTimeRate: 0.15,
    teamEngagement: 0.1,
    scopeChangeRate: 0.05,
    daysSinceLastUpdate: 0.05,
  };

  /**
   * Predict project health for a given time window
   */
  async predictHealth(
    projectId: number,
    tenantId: string,
    predictionWindowDays: number = 14,
  ): Promise<HealthPrediction> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId },
      select: {
        id: true,
        name: true,
        healthStatus: true,
        startDate: true,
        targetEndDate: true,
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Gather current metrics
    const metrics = await this.gatherMetrics(projectId, tenantId);

    // Calculate risk factors
    const riskFactors = this.calculateRiskFactors(metrics);

    // Calculate predicted health score
    const healthScore = this.calculateHealthScore(riskFactors);
    const predictedHealth = this.determineHealthStatus(healthScore);

    // Get historical accuracy
    const historicalAccuracy = await this.getHistoricalAccuracy(tenantId);

    // Generate AI recommendations
    const recommendations = await this.generateRecommendations(
      project,
      riskFactors,
      metrics,
    );

    const prediction: HealthPrediction = {
      projectId,
      currentHealth: project.healthStatus as
        | 'ON_TRACK'
        | 'AT_RISK'
        | 'OFF_TRACK',
      predictedHealth,
      confidence: this.calculateConfidence(riskFactors, historicalAccuracy),
      predictionWindow: `${predictionWindowDays} days`,
      riskFactors,
      recommendations,
      historicalAccuracy,
      predictedAt: new Date(),
      validUntil: new Date(
        Date.now() + predictionWindowDays * 24 * 60 * 60 * 1000,
      ),
    };

    // Store prediction for tracking
    await this.storePrediction(prediction, tenantId);

    return prediction;
  }

  /**
   * Get predictions for all active projects in a tenant
   */
  async getPredictionsForTenant(
    tenantId: string,
    predictionWindowDays: number = 14,
  ): Promise<HealthPrediction[]> {
    const projects = await prisma.project.findMany({
      where: {
        tenantId,
        status: { in: ['PLANNING', 'IN_PROGRESS'] },
      },
      select: { id: true },
    });

    const predictions: HealthPrediction[] = [];

    for (const project of projects) {
      try {
        const prediction = await this.predictHealth(
          project.id,
          tenantId,
          predictionWindowDays,
        );
        predictions.push(prediction);
      } catch (error) {
        console.error(
          `Failed to predict health for project ${project.id}:`,
          error,
        );
      }
    }

    return predictions.sort((a, b) => {
      // Sort by health status (worst first) then confidence
      const healthOrder = { OFF_TRACK: 0, AT_RISK: 1, ON_TRACK: 2 };
      const aOrder = healthOrder[a.predictedHealth];
      const bOrder = healthOrder[b.predictedHealth];
      if (aOrder !== bOrder) return aOrder - bOrder;
      return b.confidence - a.confidence;
    });
  }

  /**
   * Validate past predictions against actual outcomes
   */
  async validatePredictions(tenantId: string): Promise<{
    totalPredictions: number;
    accuratePredictions: number;
    accuracy: number;
    byCategory: Record<string, { total: number; accurate: number }>;
  }> {
    const expiredPredictions = await prisma.projectHealthPrediction.findMany({
      where: {
        tenantId,
        validUntil: { lt: new Date() },
        validated: false,
      },
      include: {
        project: {
          select: { healthStatus: true },
        },
      },
    });

    let totalPredictions = 0;
    let accuratePredictions = 0;
    const byCategory: Record<string, { total: number; accurate: number }> = {
      ON_TRACK: { total: 0, accurate: 0 },
      AT_RISK: { total: 0, accurate: 0 },
      OFF_TRACK: { total: 0, accurate: 0 },
    };

    for (const prediction of expiredPredictions) {
      totalPredictions++;
      const actualHealth = prediction.project.healthStatus;
      const wasAccurate = prediction.predictedHealth === actualHealth;

      if (wasAccurate) {
        accuratePredictions++;
      }

      byCategory[prediction.predictedHealth].total++;
      if (wasAccurate) {
        byCategory[prediction.predictedHealth].accurate++;
      }

      // Mark as validated
      await prisma.projectHealthPrediction.update({
        where: { id: prediction.id },
        data: {
          validated: true,
          actualHealth: actualHealth,
        },
      });
    }

    return {
      totalPredictions,
      accuratePredictions,
      accuracy:
        totalPredictions > 0 ? accuratePredictions / totalPredictions : 0,
      byCategory,
    };
  }

  // Private helper methods

  private async gatherMetrics(
    projectId: number,
    tenantId: string,
  ): Promise<ProjectMetrics> {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Task metrics
    const [
      totalTasks,
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
      prisma.task.count({ where: { projectId, tenantId, status: 'BLOCKED' } }),
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

    // Milestone metrics
    const [totalMilestones, completedMilestones, overdueMilestones] =
      await Promise.all([
        prisma.milestone.count({ where: { projectId, tenantId } }),
        prisma.milestone.count({
          where: { projectId, tenantId, status: 'COMPLETED' },
        }),
        prisma.milestone.count({
          where: {
            projectId,
            tenantId,
            dueDate: { lt: now },
            status: { notIn: ['COMPLETED'] },
          },
        }),
      ]);

    // Team engagement (active members in past week)
    const [totalMembers, activeMembers] = await Promise.all([
      prisma.projectMember.count({ where: { projectId } }),
      prisma.task.groupBy({
        by: ['assigneeId'],
        where: {
          projectId,
          tenantId,
          updatedAt: { gte: oneWeekAgo },
          assigneeId: { not: null },
        },
      }),
    ]);

    // Scope changes (new tasks added in past month)
    const recentTasksAdded = await prisma.task.count({
      where: {
        projectId,
        tenantId,
        createdAt: { gte: oneMonthAgo },
      },
    });

    // Last update
    const lastUpdate = await prisma.task.findFirst({
      where: { projectId, tenantId },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    // Calculate metrics
    const taskCompletionRate = totalTasks > 0 ? completedTasks / totalTasks : 1;
    const overdueRate = totalTasks > 0 ? overdueTasks / totalTasks : 0;
    const blockedRate = totalTasks > 0 ? blockedTasks / totalTasks : 0;

    // Velocity trend: -1 (declining), 0 (stable), 1 (improving)
    let velocityTrend = 0;
    if (thisWeekCompletions > lastWeekCompletions * 1.2) {
      velocityTrend = Math.min(
        1,
        ((thisWeekCompletions - lastWeekCompletions) /
          Math.max(lastWeekCompletions, 1)) *
          0.5,
      );
    } else if (thisWeekCompletions < lastWeekCompletions * 0.8) {
      velocityTrend = Math.max(
        -1,
        ((thisWeekCompletions - lastWeekCompletions) /
          Math.max(lastWeekCompletions, 1)) *
          0.5,
      );
    }

    const milestoneOnTimeRate =
      totalMilestones > 0
        ? (completedMilestones - overdueMilestones) / totalMilestones
        : 1;

    const teamEngagement =
      totalMembers > 0 ? activeMembers.length / (totalMembers + 1) : 1; // +1 for owner

    const scopeChangeRate = totalTasks > 0 ? recentTasksAdded / totalTasks : 0;

    const daysSinceLastUpdate = lastUpdate
      ? Math.floor(
          (now.getTime() - lastUpdate.updatedAt.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

    return {
      taskCompletionRate,
      overdueRate,
      blockedRate,
      velocityTrend,
      milestoneOnTimeRate,
      teamEngagement,
      scopeChangeRate,
      daysSinceLastUpdate,
    };
  }

  private calculateRiskFactors(metrics: ProjectMetrics): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Task completion rate
    factors.push({
      factor: 'Task Completion Rate',
      weight: this.riskWeights.taskCompletionRate,
      currentValue: metrics.taskCompletionRate,
      threshold: 0.6,
      severity: this.getSeverity(metrics.taskCompletionRate, 0.6, true),
      trend: 'stable',
      description: `${Math.round(metrics.taskCompletionRate * 100)}% of tasks completed`,
    });

    // Overdue rate
    factors.push({
      factor: 'Overdue Tasks',
      weight: this.riskWeights.overdueRate,
      currentValue: metrics.overdueRate,
      threshold: 0.15,
      severity: this.getSeverity(metrics.overdueRate, 0.15, false),
      trend: 'stable',
      description: `${Math.round(metrics.overdueRate * 100)}% of tasks overdue`,
    });

    // Blocked rate
    factors.push({
      factor: 'Blocked Tasks',
      weight: this.riskWeights.blockedRate,
      currentValue: metrics.blockedRate,
      threshold: 0.1,
      severity: this.getSeverity(metrics.blockedRate, 0.1, false),
      trend: 'stable',
      description: `${Math.round(metrics.blockedRate * 100)}% of tasks blocked`,
    });

    // Velocity trend
    factors.push({
      factor: 'Team Velocity',
      weight: this.riskWeights.velocityTrend,
      currentValue: metrics.velocityTrend,
      threshold: 0,
      severity:
        metrics.velocityTrend < -0.3
          ? 'high'
          : metrics.velocityTrend < 0
            ? 'medium'
            : 'low',
      trend:
        metrics.velocityTrend > 0.2
          ? 'improving'
          : metrics.velocityTrend < -0.2
            ? 'worsening'
            : 'stable',
      description: `Velocity ${metrics.velocityTrend > 0 ? 'improving' : metrics.velocityTrend < 0 ? 'declining' : 'stable'}`,
    });

    // Milestone on-time rate
    factors.push({
      factor: 'Milestone Progress',
      weight: this.riskWeights.milestoneOnTimeRate,
      currentValue: metrics.milestoneOnTimeRate,
      threshold: 0.7,
      severity: this.getSeverity(metrics.milestoneOnTimeRate, 0.7, true),
      trend: 'stable',
      description: `${Math.round(metrics.milestoneOnTimeRate * 100)}% milestones on track`,
    });

    // Team engagement
    factors.push({
      factor: 'Team Engagement',
      weight: this.riskWeights.teamEngagement,
      currentValue: metrics.teamEngagement,
      threshold: 0.5,
      severity: this.getSeverity(metrics.teamEngagement, 0.5, true),
      trend: 'stable',
      description: `${Math.round(metrics.teamEngagement * 100)}% team active this week`,
    });

    // Scope change rate
    factors.push({
      factor: 'Scope Stability',
      weight: this.riskWeights.scopeChangeRate,
      currentValue: 1 - metrics.scopeChangeRate,
      threshold: 0.7,
      severity: this.getSeverity(1 - metrics.scopeChangeRate, 0.7, true),
      trend: 'stable',
      description: `${Math.round(metrics.scopeChangeRate * 100)}% scope growth this month`,
    });

    // Activity recency
    factors.push({
      factor: 'Recent Activity',
      weight: this.riskWeights.daysSinceLastUpdate,
      currentValue: Math.max(0, 1 - metrics.daysSinceLastUpdate / 7),
      threshold: 0.7,
      severity:
        metrics.daysSinceLastUpdate > 5
          ? 'high'
          : metrics.daysSinceLastUpdate > 2
            ? 'medium'
            : 'low',
      trend: 'stable',
      description: `${metrics.daysSinceLastUpdate} days since last update`,
    });

    return factors;
  }

  private getSeverity(
    value: number,
    threshold: number,
    higherIsBetter: boolean,
  ): 'critical' | 'high' | 'medium' | 'low' {
    const deviation = higherIsBetter ? threshold - value : value - threshold;

    if (deviation <= 0) return 'low';
    if (deviation <= 0.1) return 'medium';
    if (deviation <= 0.25) return 'high';
    return 'critical';
  }

  private calculateHealthScore(factors: RiskFactor[]): number {
    let score = 0;

    for (const factor of factors) {
      // Normalize current value to 0-1 scale where 1 is best
      const normalizedValue = Math.max(0, Math.min(1, factor.currentValue));
      score += normalizedValue * factor.weight;
    }

    return Math.round(score * 100);
  }

  private determineHealthStatus(
    score: number,
  ): 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK' {
    if (score >= 70) return 'ON_TRACK';
    if (score >= 40) return 'AT_RISK';
    return 'OFF_TRACK';
  }

  private calculateConfidence(
    factors: RiskFactor[],
    historicalAccuracy?: number,
  ): number {
    // Base confidence from data quality
    let dataConfidence = 0.7;

    // Reduce confidence if many factors are at extremes
    const extremeFactors = factors.filter(
      (f) => f.severity === 'critical' || f.severity === 'low',
    ).length;
    const extremeRatio = extremeFactors / factors.length;
    dataConfidence *= 1 - extremeRatio * 0.2;

    // Factor in historical accuracy
    if (historicalAccuracy !== undefined) {
      return dataConfidence * 0.5 + historicalAccuracy * 0.5;
    }

    return Math.round(dataConfidence * 100) / 100;
  }

  private async getHistoricalAccuracy(
    tenantId: string,
  ): Promise<number | undefined> {
    const validatedPredictions = await prisma.projectHealthPrediction.findMany({
      where: {
        tenantId,
        validated: true,
      },
      take: 50,
      orderBy: { predictionDate: 'desc' },
    });

    if (validatedPredictions.length < 5) return undefined;

    const accurate = validatedPredictions.filter(
      (p) => p.predictedHealth === p.actualHealth,
    ).length;

    return Math.round((accurate / validatedPredictions.length) * 100) / 100;
  }

  private async generateRecommendations(
    project: { id: number; name: string },
    riskFactors: RiskFactor[],
    metrics: ProjectMetrics,
  ): Promise<PredictionRecommendation[]> {
    // Sort risk factors by severity and weight
    const prioritizedRisks = riskFactors
      .filter((f) => f.severity !== 'low')
      .sort((a, b) => {
        const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const aDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (aDiff !== 0) return aDiff;
        return b.weight - a.weight;
      });

    try {
      const prompt = `Generate actionable recommendations for this project:

PROJECT: ${project.name}

HIGH-RISK FACTORS:
${prioritizedRisks.map((f) => `- ${f.factor}: ${f.description} (${f.severity})`).join('\n')}

METRICS:
- Task completion: ${Math.round(metrics.taskCompletionRate * 100)}%
- Overdue rate: ${Math.round(metrics.overdueRate * 100)}%
- Team engagement: ${Math.round(metrics.teamEngagement * 100)}%

Return JSON array (max 5 recommendations):
[
  {
    "priority": "urgent|high|medium|low",
    "action": "specific actionable recommendation",
    "expectedImpact": "what will improve",
    "effort": "low|medium|high"
  }
]`;

      const response = await llmService.complete(prompt, {
        maxTokens: 500,
        temperature: 0.3,
      });

      return JSON.parse(response.content);
    } catch {
      // Fallback to rule-based recommendations
      return this.generateRuleBasedRecommendations(prioritizedRisks);
    }
  }

  private generateRuleBasedRecommendations(
    risks: RiskFactor[],
  ): PredictionRecommendation[] {
    const recommendations: PredictionRecommendation[] = [];

    for (const risk of risks.slice(0, 5)) {
      const rec = this.getRecommendationForRisk(risk);
      if (rec) recommendations.push(rec);
    }

    return recommendations;
  }

  private getRecommendationForRisk(
    risk: RiskFactor,
  ): PredictionRecommendation | null {
    const priorityMap: Record<string, 'urgent' | 'high' | 'medium' | 'low'> = {
      critical: 'urgent',
      high: 'high',
      medium: 'medium',
      low: 'low',
    };

    switch (risk.factor) {
      case 'Task Completion Rate':
        return {
          priority: priorityMap[risk.severity],
          action:
            'Review task backlog and identify blockers preventing completion',
          expectedImpact: 'Improve task completion velocity',
          effort: 'medium',
        };
      case 'Overdue Tasks':
        return {
          priority: priorityMap[risk.severity],
          action:
            'Triage overdue tasks: reprioritize, reassign, or adjust deadlines',
          expectedImpact: 'Reduce overdue rate and improve schedule accuracy',
          effort: 'low',
        };
      case 'Blocked Tasks':
        return {
          priority: priorityMap[risk.severity],
          action: 'Schedule a blockers review meeting to address dependencies',
          expectedImpact: 'Unblock tasks and restore team velocity',
          effort: 'medium',
        };
      case 'Team Velocity':
        return {
          priority: priorityMap[risk.severity],
          action:
            'Conduct team retrospective to identify velocity improvement areas',
          expectedImpact: 'Increase weekly throughput',
          effort: 'medium',
        };
      case 'Milestone Progress':
        return {
          priority: priorityMap[risk.severity],
          action: 'Review milestone scope and adjust timeline or resources',
          expectedImpact: 'Get milestones back on track',
          effort: 'high',
        };
      case 'Team Engagement':
        return {
          priority: priorityMap[risk.severity],
          action:
            'Check in with inactive team members and redistribute workload',
          expectedImpact: 'Improve team participation and morale',
          effort: 'low',
        };
      case 'Scope Stability':
        return {
          priority: priorityMap[risk.severity],
          action: 'Implement change control process to manage scope additions',
          expectedImpact: 'Stabilize project scope and timeline',
          effort: 'medium',
        };
      case 'Recent Activity':
        return {
          priority: priorityMap[risk.severity],
          action: 'Schedule project check-in to ensure active progress',
          expectedImpact: 'Maintain project momentum',
          effort: 'low',
        };
      default:
        return null;
    }
  }

  private async storePrediction(
    prediction: HealthPrediction,
    tenantId: string,
  ): Promise<void> {
    await prisma.projectHealthPrediction.create({
      data: {
        projectId: prediction.projectId,
        tenantId,
        predictedHealth: prediction.predictedHealth,
        confidence: prediction.confidence,
        riskFactors: prediction.riskFactors,
        recommendations: prediction.recommendations.map((r) => r.action),
        predictionDate: prediction.predictedAt,
        validUntil: prediction.validUntil,
      },
    });
  }
}

export const healthPredictionService = new HealthPredictionService();
