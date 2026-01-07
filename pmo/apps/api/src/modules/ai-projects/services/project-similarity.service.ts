/**
 * Project Similarity Service
 *
 * Finds similar projects and extracts lessons learned using AI-powered
 * semantic matching and analysis of historical project data.
 */

import { prisma } from '../../../prisma/client';
import { llmService } from '../../../services/llm.service';

export interface SimilarProject {
  projectId: number;
  projectName: string;
  similarityScore: number; // 0-100
  matchReasons: string[];
  status: string;
  healthStatus: string;
  completedAt?: Date;
  duration?: number; // days
  teamSize?: number;
  lessonsAvailable: boolean;
}

export interface LessonLearned {
  id: number;
  projectId: number;
  projectName: string;
  category: 'SUCCESS' | 'CHALLENGE' | 'IMPROVEMENT' | 'WARNING';
  title: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  applicability: number; // 0-100 relevance score
  tags: string[];
  createdAt: Date;
}

export interface ProjectProfile {
  projectId: number;
  industry?: string;
  projectType?: string;
  size: 'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE';
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  technologies?: string[];
  methodology?: string;
  teamSize: number;
  duration?: number;
  features: string[];
}

export interface SimilaritySearchResult {
  query: {
    projectId?: number;
    description?: string;
  };
  similarProjects: SimilarProject[];
  relevantLessons: LessonLearned[];
  searchedAt: Date;
}

class ProjectSimilarityService {
  /**
   * Find similar projects based on a project or description
   */
  async findSimilarProjects(
    input: { projectId?: number; description?: string },
    tenantId: string,
    options?: { limit?: number; minSimilarity?: number },
  ): Promise<SimilaritySearchResult> {
    const limit = options?.limit || 10;
    const minSimilarity = options?.minSimilarity || 40;

    let sourceProfile: ProjectProfile | null = null;
    let searchText = '';

    // Get source project profile if projectId provided
    if (input.projectId) {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, tenantId },
        include: {
          tasks: { select: { title: true } },
          milestones: { select: { name: true } },
          members: true,
        },
      });

      if (project) {
        sourceProfile = await this.buildProjectProfile(project);
        searchText = `${project.name} ${project.description || ''} ${project.tasks.map((t) => t.title).join(' ')}`;
      }
    } else if (input.description) {
      searchText = input.description;
      sourceProfile = await this.inferProfileFromDescription(input.description);
    }

    if (!searchText) {
      return {
        query: input,
        similarProjects: [],
        relevantLessons: [],
        searchedAt: new Date(),
      };
    }

    // Get candidate projects
    const candidates = await prisma.project.findMany({
      where: {
        tenantId,
        id: input.projectId ? { not: input.projectId } : undefined,
        status: { in: ['COMPLETED', 'IN_PROGRESS', 'ON_HOLD'] },
      },
      include: {
        tasks: { select: { title: true, status: true } },
        milestones: { select: { name: true, status: true } },
        members: true,
        account: { select: { name: true, industry: true } },
      },
      take: 50, // Get a pool for comparison
    });

    // Score similarity for each candidate
    const scoredProjects: SimilarProject[] = [];

    for (const candidate of candidates) {
      const candidateProfile = await this.buildProjectProfile(candidate);
      const similarity = await this.calculateSimilarity(
        sourceProfile || {
          features: [],
          teamSize: 0,
          size: 'MEDIUM',
          complexity: 'MEDIUM',
          projectId: 0,
        },
        candidateProfile,
        searchText,
        candidate,
      );

      if (similarity.score >= minSimilarity) {
        scoredProjects.push({
          projectId: candidate.id,
          projectName: candidate.name,
          similarityScore: similarity.score,
          matchReasons: similarity.reasons,
          status: candidate.status,
          healthStatus: candidate.healthStatus || 'UNKNOWN',
          completedAt:
            candidate.status === 'COMPLETED' ? candidate.updatedAt : undefined,
          duration: candidate.startDate
            ? Math.ceil(
                ((candidate.status === 'COMPLETED'
                  ? candidate.updatedAt
                  : new Date()
                ).getTime() -
                  candidate.startDate.getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : undefined,
          teamSize: candidate.members.length,
          lessonsAvailable: await this.hasLessonsLearned(
            candidate.id,
            tenantId,
          ),
        });
      }
    }

    // Sort by similarity and limit
    scoredProjects.sort((a, b) => b.similarityScore - a.similarityScore);
    const similarProjects = scoredProjects.slice(0, limit);

    // Get relevant lessons from similar projects
    const projectIds = similarProjects.map((p) => p.projectId);
    const relevantLessons = await this.getLessonsFromProjects(
      projectIds,
      tenantId,
      searchText,
    );

    return {
      query: input,
      similarProjects,
      relevantLessons,
      searchedAt: new Date(),
    };
  }

  /**
   * Add a lesson learned to a project
   */
  async addLessonLearned(
    projectId: number,
    tenantId: string,
    lesson: {
      category: 'SUCCESS' | 'CHALLENGE' | 'IMPROVEMENT' | 'WARNING';
      title: string;
      description: string;
      impact: 'HIGH' | 'MEDIUM' | 'LOW';
      tags?: string[];
    },
  ): Promise<LessonLearned> {
    // Verify project exists
    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId },
      select: { id: true, name: true },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const created = await prisma.projectLesson.create({
      data: {
        projectId,
        tenantId,
        category: lesson.category,
        title: lesson.title,
        description: lesson.description,
        impact: lesson.impact,
        tags: lesson.tags || [],
      },
    });

    return {
      id: created.id,
      projectId: created.projectId,
      projectName: project.name,
      category: created.category as LessonLearned['category'],
      title: created.title,
      description: created.description,
      impact: created.impact as LessonLearned['impact'],
      applicability: 100,
      tags: created.tags as string[],
      createdAt: created.createdAt,
    };
  }

  /**
   * Get lessons learned for a project
   */
  async getProjectLessons(
    projectId: number,
    tenantId: string,
  ): Promise<LessonLearned[]> {
    const lessons = await prisma.projectLesson.findMany({
      where: { projectId, tenantId },
      include: {
        project: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return lessons.map((l) => ({
      id: l.id,
      projectId: l.projectId,
      projectName: l.project.name,
      category: l.category as LessonLearned['category'],
      title: l.title,
      description: l.description,
      impact: l.impact as LessonLearned['impact'],
      applicability: 100,
      tags: l.tags as string[],
      createdAt: l.createdAt,
    }));
  }

  /**
   * AI-extract lessons from a completed project
   */
  async extractLessonsFromProject(
    projectId: number,
    tenantId: string,
  ): Promise<LessonLearned[]> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId },
      include: {
        tasks: {
          select: {
            title: true,
            status: true,
            dueDate: true,
            completedAt: true,
          },
        },
        milestones: {
          select: {
            name: true,
            status: true,
            dueDate: true,
          },
        },
        statusUpdates: {
          select: { summary: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        risks: {
          where: { tenantId },
          select: {
            title: true,
            severity: true,
            status: true,
            mitigation: true,
          },
        },
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    try {
      const prompt = `Analyze this project data and extract lessons learned:

PROJECT: ${project.name}
DESCRIPTION: ${project.description || 'N/A'}
STATUS: ${project.status}
HEALTH: ${project.healthStatus || 'UNKNOWN'}

TASKS (${project.tasks.length} total):
- Completed: ${project.tasks.filter((t) => t.status === 'DONE').length}
- Overdue: ${project.tasks.filter((t) => t.dueDate && t.status !== 'DONE' && new Date(t.dueDate) < new Date()).length}

MILESTONES:
${project.milestones.map((m) => `- ${m.name}: ${m.status}`).join('\n')}

RISKS IDENTIFIED:
${project.risks.map((r) => `- ${r.title} (${r.severity}): ${r.status}`).join('\n') || 'None'}

STATUS UPDATES:
${project.statusUpdates.map((s) => s.summary).join('\n\n') || 'None'}

Extract 3-5 lessons learned. Return JSON array:
[
  {
    "category": "SUCCESS|CHALLENGE|IMPROVEMENT|WARNING",
    "title": "Brief title",
    "description": "Detailed lesson description",
    "impact": "HIGH|MEDIUM|LOW",
    "tags": ["relevant", "tags"]
  }
]

Focus on:
- What went well (SUCCESS)
- What challenges were faced (CHALLENGE)
- What could be done better (IMPROVEMENT)
- What to avoid (WARNING)`;

      const response = await llmService.complete(prompt, {
        maxTokens: 1000,
        temperature: 0.3,
      });

      const extractedLessons = JSON.parse(response.content);
      const savedLessons: LessonLearned[] = [];

      // Save each lesson
      for (const lesson of extractedLessons) {
        const saved = await this.addLessonLearned(projectId, tenantId, {
          category: lesson.category,
          title: lesson.title,
          description: lesson.description,
          impact: lesson.impact,
          tags: lesson.tags,
        });
        savedLessons.push(saved);
      }

      return savedLessons;
    } catch (error) {
      console.error('Failed to extract lessons:', error);
      // Return basic lessons based on metrics
      return this.generateBasicLessons(project, tenantId);
    }
  }

  /**
   * Search lessons across all projects
   */
  async searchLessons(
    tenantId: string,
    query: string,
    options?: {
      categories?: string[];
      impacts?: string[];
      limit?: number;
    },
  ): Promise<LessonLearned[]> {
    const whereClause: Record<string, unknown> = { tenantId };

    if (options?.categories?.length) {
      whereClause.category = { in: options.categories };
    }
    if (options?.impacts?.length) {
      whereClause.impact = { in: options.impacts };
    }

    // Text search using contains (simple implementation)
    const lessons = await prisma.projectLesson.findMany({
      where: {
        ...whereClause,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        project: { select: { name: true } },
      },
      take: options?.limit || 20,
      orderBy: { createdAt: 'desc' },
    });

    return lessons.map((l) => ({
      id: l.id,
      projectId: l.projectId,
      projectName: l.project.name,
      category: l.category as LessonLearned['category'],
      title: l.title,
      description: l.description,
      impact: l.impact as LessonLearned['impact'],
      applicability: this.calculateTextRelevance(
        query,
        `${l.title} ${l.description}`,
      ),
      tags: l.tags as string[],
      createdAt: l.createdAt,
    }));
  }

  // Private helper methods

  private async buildProjectProfile(project: {
    id: number;
    name: string;
    description?: string | null;
    tasks: { title: string }[];
    milestones: { name: string }[];
    members: unknown[];
    account?: { industry?: string | null } | null;
  }): Promise<ProjectProfile> {
    const taskCount = project.tasks.length;
    const milestoneCount = project.milestones.length;
    const teamSize = project.members.length;

    // Determine size based on metrics
    const size: ProjectProfile['size'] =
      taskCount > 100 || teamSize > 20
        ? 'ENTERPRISE'
        : taskCount > 50 || teamSize > 10
          ? 'LARGE'
          : taskCount > 20 || teamSize > 5
            ? 'MEDIUM'
            : 'SMALL';

    // Determine complexity based on milestones and structure
    const complexity: ProjectProfile['complexity'] =
      milestoneCount > 10 || taskCount > 75
        ? 'HIGH'
        : milestoneCount > 5 || taskCount > 30
          ? 'MEDIUM'
          : 'LOW';

    // Extract features from task/milestone names
    const allText = [
      project.name,
      project.description || '',
      ...project.tasks.map((t) => t.title),
      ...project.milestones.map((m) => m.name),
    ].join(' ');

    const features = this.extractFeatures(allText);

    return {
      projectId: project.id,
      industry: project.account?.industry || undefined,
      size,
      complexity,
      teamSize,
      features,
    };
  }

  private async inferProfileFromDescription(
    description: string,
  ): Promise<ProjectProfile> {
    const features = this.extractFeatures(description);

    // Use simple heuristics
    const isLarge = description.length > 500 || features.length > 10;
    const isComplex =
      features.length > 5 ||
      description.includes('complex') ||
      description.includes('enterprise');

    return {
      projectId: 0,
      size: isLarge ? 'LARGE' : 'MEDIUM',
      complexity: isComplex ? 'HIGH' : 'MEDIUM',
      teamSize: 0,
      features,
    };
  }

  private extractFeatures(text: string): string[] {
    const features: string[] = [];
    const lower = text.toLowerCase();

    // Common project features/technologies
    const featureKeywords: Record<string, string[]> = {
      'web application': ['web', 'webapp', 'frontend', 'ui', 'dashboard'],
      'mobile app': ['mobile', 'ios', 'android', 'app'],
      'api development': ['api', 'rest', 'graphql', 'endpoints'],
      database: ['database', 'db', 'sql', 'postgres', 'mysql', 'mongodb'],
      authentication: ['auth', 'login', 'sso', 'oauth', 'security'],
      reporting: ['report', 'analytics', 'dashboard', 'metrics'],
      integration: ['integration', 'sync', 'import', 'export', 'webhook'],
      automation: ['automation', 'automated', 'workflow', 'pipeline'],
      migration: ['migration', 'migrate', 'upgrade', 'transition'],
      testing: ['test', 'qa', 'quality'],
    };

    for (const [feature, keywords] of Object.entries(featureKeywords)) {
      if (keywords.some((k) => lower.includes(k))) {
        features.push(feature);
      }
    }

    return features;
  }

  private async calculateSimilarity(
    source: ProjectProfile,
    candidate: ProjectProfile,
    searchText: string,
    candidateProject: { name: string; description?: string | null },
  ): Promise<{ score: number; reasons: string[] }> {
    let score = 0;
    const reasons: string[] = [];

    // Size match (20 points)
    if (source.size === candidate.size) {
      score += 20;
      reasons.push(`Same project size (${source.size})`);
    } else if (
      (source.size === 'SMALL' && candidate.size === 'MEDIUM') ||
      (source.size === 'MEDIUM' && candidate.size === 'SMALL') ||
      (source.size === 'LARGE' && candidate.size === 'MEDIUM') ||
      (source.size === 'MEDIUM' && candidate.size === 'LARGE')
    ) {
      score += 10;
      reasons.push('Similar project size');
    }

    // Complexity match (15 points)
    if (source.complexity === candidate.complexity) {
      score += 15;
      reasons.push(`Same complexity level (${source.complexity})`);
    }

    // Industry match (15 points)
    if (source.industry && source.industry === candidate.industry) {
      score += 15;
      reasons.push(`Same industry (${source.industry})`);
    }

    // Feature overlap (30 points)
    const commonFeatures = source.features.filter((f) =>
      candidate.features.includes(f),
    );
    const featureScore = Math.min(
      30,
      (commonFeatures.length / Math.max(source.features.length, 1)) * 30,
    );
    score += featureScore;
    if (commonFeatures.length > 0) {
      reasons.push(`Shared features: ${commonFeatures.slice(0, 3).join(', ')}`);
    }

    // Text similarity (20 points)
    const candidateText = `${candidateProject.name} ${candidateProject.description || ''}`;
    const textSimilarity = this.calculateTextRelevance(
      searchText,
      candidateText,
    );
    score += textSimilarity * 0.2;
    if (textSimilarity > 50) {
      reasons.push('Similar project description');
    }

    return { score: Math.round(score), reasons };
  }

  private calculateTextRelevance(query: string, text: string): number {
    const queryWords = query
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2);
    const textWords = new Set(text.toLowerCase().split(/\W+/));

    if (queryWords.length === 0) return 0;

    const matches = queryWords.filter((w) => textWords.has(w)).length;
    return Math.round((matches / queryWords.length) * 100);
  }

  private async hasLessonsLearned(
    projectId: number,
    tenantId: string,
  ): Promise<boolean> {
    const count = await prisma.projectLesson.count({
      where: { projectId, tenantId },
    });
    return count > 0;
  }

  private async getLessonsFromProjects(
    projectIds: number[],
    tenantId: string,
    searchText: string,
  ): Promise<LessonLearned[]> {
    if (projectIds.length === 0) return [];

    const lessons = await prisma.projectLesson.findMany({
      where: {
        projectId: { in: projectIds },
        tenantId,
      },
      include: {
        project: { select: { name: true } },
      },
      orderBy: [{ impact: 'asc' }, { createdAt: 'desc' }],
      take: 20,
    });

    return lessons.map((l) => ({
      id: l.id,
      projectId: l.projectId,
      projectName: l.project.name,
      category: l.category as LessonLearned['category'],
      title: l.title,
      description: l.description,
      impact: l.impact as LessonLearned['impact'],
      applicability: this.calculateTextRelevance(
        searchText,
        `${l.title} ${l.description}`,
      ),
      tags: l.tags as string[],
      createdAt: l.createdAt,
    }));
  }

  private async generateBasicLessons(
    project: {
      id: number;
      name: string;
      status: string;
      healthStatus: string | null;
      tasks: {
        status: string;
        dueDate: Date | null;
        completedAt: Date | null;
      }[];
      milestones: { status: string; dueDate: Date | null }[];
      risks: { title: string; severity: string; status: string }[];
    },
    tenantId: string,
  ): Promise<LessonLearned[]> {
    const lessons: LessonLearned[] = [];

    // Analyze task completion
    const completedTasks = project.tasks.filter(
      (t) => t.status === 'DONE',
    ).length;
    const totalTasks = project.tasks.length;
    const completionRate =
      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    if (completionRate >= 90) {
      const saved = await this.addLessonLearned(project.id, tenantId, {
        category: 'SUCCESS',
        title: 'High task completion rate',
        description: `Project achieved ${Math.round(completionRate)}% task completion rate, indicating effective planning and execution.`,
        impact: 'MEDIUM',
        tags: ['execution', 'completion'],
      });
      lessons.push(saved);
    } else if (completionRate < 70 && totalTasks > 5) {
      const saved = await this.addLessonLearned(project.id, tenantId, {
        category: 'IMPROVEMENT',
        title: 'Scope management needs improvement',
        description: `Only ${Math.round(completionRate)}% of tasks were completed. Consider breaking down tasks more granularly or improving estimation.`,
        impact: 'HIGH',
        tags: ['scope', 'planning'],
      });
      lessons.push(saved);
    }

    // Analyze risks
    const criticalRisks = project.risks.filter(
      (r) => r.severity === 'CRITICAL' || r.severity === 'HIGH',
    );
    if (criticalRisks.length > 3) {
      const saved = await this.addLessonLearned(project.id, tenantId, {
        category: 'WARNING',
        title: 'High risk project',
        description: `Project had ${criticalRisks.length} critical/high risks. Future similar projects should include additional risk mitigation planning.`,
        impact: 'HIGH',
        tags: ['risk', 'planning'],
      });
      lessons.push(saved);
    }

    return lessons;
  }
}

export const projectSimilarityService = new ProjectSimilarityService();
