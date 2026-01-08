/**
 * Template Matching Service
 *
 * Provides AI-powered template recommendations based on project descriptions
 * and automatic template application during project creation.
 */

import { prisma } from '../../../prisma/client';
import { llmService } from '../../../services/llm.service';

export interface TemplateMatch {
  templateId: number;
  templateName: string;
  confidence: number;
  matchReason: string;
  taskCount: number;
  milestoneCount: number;
}

export interface TemplateApplication {
  projectId: number;
  templateId: number;
  tasksCreated: number;
  milestonesCreated: number;
}

class TemplateMatchingService {
  /**
   * Suggest templates based on project name and description
   * Note: Templates are Projects with isTemplate=true
   */
  async suggestTemplates(
    projectName: string,
    projectDescription: string | null,
    tenantId: string,
    limit: number = 5,
  ): Promise<TemplateMatch[]> {
    // Get all available template projects
    const templateProjects = await prisma.project.findMany({
      where: {
        tenantId,
        isTemplate: true,
      },
      select: {
        id: true,
        name: true,
        description: true,
        _count: {
          select: {
            tasks: true,
            milestones: true,
          },
        },
      },
    });

    if (templateProjects.length === 0) {
      return [];
    }

    // Map to template format expected by matching functions
    const templates = templateProjects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: this.inferCategory(p.name),
      _count: p._count,
    }));

    // Try AI-based matching
    const aiMatches = await this.getAITemplateMatches(
      projectName,
      projectDescription,
      templates,
    );

    if (aiMatches.length > 0) {
      return aiMatches.slice(0, limit);
    }

    // Fallback to keyword-based matching
    return this.getKeywordMatches(
      projectName,
      projectDescription,
      templates,
    ).slice(0, limit);
  }

  /**
   * Get the best matching template
   */
  async getBestTemplate(
    projectName: string,
    projectDescription: string | null,
    tenantId: string,
  ): Promise<TemplateMatch | null> {
    const suggestions = await this.suggestTemplates(
      projectName,
      projectDescription,
      tenantId,
      1,
    );

    return suggestions.length > 0 && suggestions[0].confidence >= 0.6
      ? suggestions[0]
      : null;
  }

  /**
   * Apply a template to a project
   * Note: Templates are Projects with isTemplate=true
   */
  async applyTemplate(
    projectId: number,
    templateId: number,
    tenantId: string,
    options: {
      adjustDates?: boolean;
      assignOwnerToTasks?: boolean;
      baselineStartDate?: Date;
    } = {},
  ): Promise<TemplateApplication> {
    // Templates are projects with isTemplate=true
    const template = await prisma.project.findFirst({
      where: { id: templateId, tenantId, isTemplate: true },
      include: {
        tasks: {
          select: {
            title: true,
            description: true,
            priority: true,
            estimatedHours: true,
            dueDate: true,
          },
        },
        milestones: {
          select: {
            name: true,
            description: true,
            dueDate: true,
          },
        },
      },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId },
      select: { ownerId: true, startDate: true },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const baseDate =
      options.baselineStartDate || project.startDate || new Date();
    const templateBaseDate = template.startDate || template.createdAt;

    // Create tasks from template
    let tasksCreated = 0;
    for (const templateTask of template.tasks) {
      // Calculate days from start based on template task's due date
      const daysFromStart = templateTask.dueDate
        ? Math.round(
            (templateTask.dueDate.getTime() - templateBaseDate.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : null;

      let dueDate: Date | null = null;
      if (options.adjustDates && daysFromStart !== null) {
        dueDate = new Date(baseDate);
        dueDate.setDate(dueDate.getDate() + daysFromStart);
      }

      await prisma.task.create({
        data: {
          tenantId,
          projectId,
          ownerId: project.ownerId,
          title: templateTask.title,
          description: templateTask.description,
          priority: templateTask.priority || 'P3',
          status: 'TODO',
          estimatedHours: templateTask.estimatedHours,
          dueDate,
        },
      });
      tasksCreated++;
    }

    // Create milestones from template
    let milestonesCreated = 0;
    for (const templateMilestone of template.milestones) {
      // Calculate days from start based on template milestone's due date
      const daysFromStart = templateMilestone.dueDate
        ? Math.round(
            (templateMilestone.dueDate.getTime() - templateBaseDate.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : null;

      let dueDate: Date | null = null;
      if (options.adjustDates && daysFromStart !== null) {
        dueDate = new Date(baseDate);
        dueDate.setDate(dueDate.getDate() + daysFromStart);
      }

      await prisma.milestone.create({
        data: {
          tenantId,
          projectId,
          name: templateMilestone.name,
          description: templateMilestone.description,
          status: 'NOT_STARTED',
          dueDate,
        },
      });
      milestonesCreated++;
    }

    return {
      projectId,
      templateId,
      tasksCreated,
      milestonesCreated,
    };
  }

  /**
   * Create a template from an existing project
   * Note: Templates are Projects with isTemplate=true
   */
  async createTemplateFromProject(
    projectId: number,
    tenantId: string,
    templateName: string,
    templateDescription?: string,
  ): Promise<number> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, tenantId },
      include: {
        tasks: {
          select: {
            title: true,
            description: true,
            priority: true,
            estimatedHours: true,
            dueDate: true,
            ownerId: true,
          },
        },
        milestones: {
          select: {
            name: true,
            description: true,
            dueDate: true,
          },
        },
      },
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Use project start date as baseline for calculating offsets
    const baseDate = project.startDate || project.createdAt;

    // Create template as a new project with isTemplate=true
    const template = await prisma.project.create({
      data: {
        tenantId,
        ownerId: project.ownerId,
        name: templateName,
        description: templateDescription || project.description,
        isTemplate: true,
        status: 'PLANNING',
        startDate: new Date(), // Template start date is creation date
        tasks: {
          create: project.tasks.map((task) => ({
            tenantId,
            ownerId: task.ownerId,
            title: task.title,
            description: task.description,
            priority: task.priority,
            status: 'TODO',
            estimatedHours: task.estimatedHours,
            dueDate: task.dueDate
              ? new Date(
                  new Date().getTime() +
                    (task.dueDate.getTime() - baseDate.getTime()),
                )
              : null,
          })),
        },
        milestones: {
          create: project.milestones.map((milestone) => ({
            tenantId,
            name: milestone.name,
            description: milestone.description,
            status: 'NOT_STARTED',
            dueDate: milestone.dueDate
              ? new Date(
                  new Date().getTime() +
                    (milestone.dueDate.getTime() - baseDate.getTime()),
                )
              : null,
          })),
        },
      },
    });

    return template.id;
  }

  // Private helper methods

  private async getAITemplateMatches(
    projectName: string,
    projectDescription: string | null,
    templates: {
      id: number;
      name: string;
      description: string | null;
      category: string | null;
      _count: { tasks: number; milestones: number };
    }[],
  ): Promise<TemplateMatch[]> {
    try {
      const templateList = templates
        .map(
          (t) =>
            `ID:${t.id} - ${t.name}${t.category ? ` [${t.category}]` : ''}${t.description ? `: ${t.description}` : ''}`,
        )
        .join('\n');

      const response = await llmService.complete(
        `Match this project to the best templates:

PROJECT:
Name: "${projectName}"
Description: ${projectDescription || 'None provided'}

AVAILABLE TEMPLATES:
${templateList}

Return JSON array (most relevant first):
[
  {
    "templateId": number,
    "confidence": 0.0-1.0,
    "matchReason": "brief explanation of why this template fits"
  }
]

Only include templates with confidence >= 0.3. Return empty array if no good matches.`,
        { maxTokens: 400, temperature: 0.2 },
      );

      const matches = JSON.parse(response.content);

      return matches.map(
        (match: {
          templateId: number;
          confidence: number;
          matchReason: string;
        }) => {
          const template = templates.find((t) => t.id === match.templateId);
          return {
            templateId: match.templateId,
            templateName: template?.name || 'Unknown',
            confidence: match.confidence,
            matchReason: match.matchReason,
            taskCount: template?._count.tasks || 0,
            milestoneCount: template?._count.milestones || 0,
          };
        },
      );
    } catch {
      return [];
    }
  }

  private getKeywordMatches(
    projectName: string,
    projectDescription: string | null,
    templates: {
      id: number;
      name: string;
      description: string | null;
      category: string | null;
      _count: { tasks: number; milestones: number };
    }[],
  ): TemplateMatch[] {
    const projectKeywords = this.extractKeywords(
      `${projectName} ${projectDescription || ''}`,
    );

    const matches: TemplateMatch[] = [];

    for (const template of templates) {
      const templateKeywords = this.extractKeywords(
        `${template.name} ${template.description || ''} ${template.category || ''}`,
      );

      const overlap = projectKeywords.filter((k) =>
        templateKeywords.includes(k),
      );
      const confidence =
        (overlap.length / Math.max(projectKeywords.length, 1)) * 0.8;

      if (confidence >= 0.2) {
        matches.push({
          templateId: template.id,
          templateName: template.name,
          confidence: Math.round(confidence * 100) / 100,
          matchReason: `Keyword match: ${overlap.join(', ')}`,
          taskCount: template._count.tasks,
          milestoneCount: template._count.milestones,
        });
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'as',
      'is',
      'was',
      'are',
      'were',
      'been',
      'be',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'shall',
      'can',
      'need',
      'this',
      'that',
      'these',
      'those',
      'project',
      'new',
      'template',
    ]);

    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));
  }

  private inferCategory(projectName: string): string {
    const lowerName = projectName.toLowerCase();

    const categoryPatterns: Record<string, string[]> = {
      'Software Development': [
        'app',
        'software',
        'platform',
        'system',
        'api',
        'web',
        'mobile',
        'development',
      ],
      Website: ['website', 'site', 'landing', 'web', 'page'],
      Marketing: ['campaign', 'marketing', 'launch', 'brand', 'content', 'seo'],
      Infrastructure: [
        'infrastructure',
        'devops',
        'cloud',
        'migration',
        'deploy',
      ],
      Integration: [
        'integration',
        'api',
        'connect',
        'sync',
        'import',
        'export',
      ],
      Consulting: ['consulting', 'assessment', 'audit', 'analysis', 'strategy'],
      Design: ['design', 'ui', 'ux', 'redesign', 'mockup', 'prototype'],
    };

    for (const [category, keywords] of Object.entries(categoryPatterns)) {
      if (keywords.some((keyword) => lowerName.includes(keyword))) {
        return category;
      }
    }

    return 'General';
  }
}

export const templateMatchingService = new TemplateMatchingService();
