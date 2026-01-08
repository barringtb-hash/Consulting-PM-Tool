/**
 * Task Enrichment Service
 *
 * Provides AI-powered task enhancement including:
 * - Smart description generation
 * - Acceptance criteria suggestions
 * - Duration estimation
 * - Subtask decomposition
 * - Similar task recommendations
 */

import { prisma } from '../../../prisma/client';
import { llmService } from '../../../services/llm.service';

export interface TaskEnrichmentSuggestion {
  enhancedDescription?: string;
  acceptanceCriteria?: string[];
  estimatedHours?: number;
  suggestedPriority?: string;
  suggestedSubtasks?: SubtaskSuggestion[];
  dependencies?: DependencySuggestion[];
  relatedTasks?: RelatedTask[];
  tags?: string[];
}

export interface SubtaskSuggestion {
  title: string;
  description?: string;
  estimatedHours?: number;
  order: number;
}

export interface DependencySuggestion {
  taskId?: number;
  taskTitle: string;
  dependencyType: 'FINISH_TO_START' | 'START_TO_START' | 'FINISH_TO_FINISH';
  reason: string;
}

export interface RelatedTask {
  taskId: number;
  title: string;
  similarity: number;
  relationship: 'similar' | 'prerequisite' | 'related';
}

class TaskEnrichmentService {
  /**
   * Generate enrichment suggestions for a task
   */
  async enrichTask(
    taskId: number,
    tenantId: string,
  ): Promise<TaskEnrichmentSuggestion> {
    const task = await prisma.task.findFirst({
      where: { id: taskId, tenantId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true,
            template: { select: { name: true } },
          },
        },
        assignee: { select: { name: true } },
      },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    // Gather context from similar tasks
    const similarTasks = await this.findSimilarTasks(
      task.title,
      task.projectId,
      tenantId,
    );
    const projectTasks = await this.getProjectTaskContext(
      task.projectId,
      tenantId,
    );

    // Generate AI enrichment
    const enrichment = await this.generateAIEnrichment(
      task,
      similarTasks,
      projectTasks,
    );

    return enrichment;
  }

  /**
   * Generate smart description for a task title
   */
  async generateDescription(
    title: string,
    projectContext?: {
      projectName?: string;
      projectDescription?: string;
      templateName?: string;
    },
  ): Promise<string> {
    try {
      const contextStr = projectContext
        ? `Project: ${projectContext.projectName}
${projectContext.projectDescription ? `Description: ${projectContext.projectDescription}` : ''}
${projectContext.templateName ? `Template: ${projectContext.templateName}` : ''}`
        : '';

      const response = await llmService.complete(
        `Generate a clear, actionable task description for this task title:

Title: "${title}"
${contextStr}

Requirements:
- Start with a verb (e.g., "Create", "Implement", "Review")
- Be specific about deliverables
- Keep it concise (2-4 sentences)
- Include success criteria if applicable

Return only the description text, no JSON or formatting.`,
        { maxTokens: 200, temperature: 0.4 },
      );

      return response.content.trim();
    } catch {
      // Fallback to template-based description
      return this.generateTemplateDescription(title);
    }
  }

  /**
   * Generate acceptance criteria for a task
   */
  async generateAcceptanceCriteria(
    title: string,
    description?: string,
  ): Promise<string[]> {
    try {
      const response = await llmService.complete(
        `Generate acceptance criteria for this task:

Title: "${title}"
${description ? `Description: ${description}` : ''}

Requirements:
- 3-5 specific, testable criteria
- Use "Given/When/Then" format where appropriate
- Focus on verifiable outcomes

Return JSON array of strings only:
["criteria 1", "criteria 2", ...]`,
        { maxTokens: 300, temperature: 0.3 },
      );

      return JSON.parse(response.content);
    } catch {
      return this.generateDefaultAcceptanceCriteria(title);
    }
  }

  /**
   * Estimate task duration based on historical data and AI
   */
  async estimateDuration(
    title: string,
    description: string | null,
    projectId: number,
    tenantId: string,
  ): Promise<{
    estimatedHours: number;
    confidence: number;
    basedOn: 'historical' | 'ai' | 'default';
    similarTasksUsed?: number;
  }> {
    // Try historical estimation first
    const historicalEstimate = await this.getHistoricalEstimate(
      title,
      projectId,
      tenantId,
    );

    if (historicalEstimate && historicalEstimate.confidence >= 0.7) {
      return {
        estimatedHours: historicalEstimate.hours,
        confidence: historicalEstimate.confidence,
        basedOn: 'historical',
        similarTasksUsed: historicalEstimate.sampleSize,
      };
    }

    // Fall back to AI estimation
    try {
      const response = await llmService.complete(
        `Estimate hours needed for this task:

Title: "${title}"
${description ? `Description: ${description}` : ''}

Consider:
- Typical software development tasks
- Time for implementation, testing, and review
- Buffer for unexpected issues

Return JSON only:
{
  "estimatedHours": number (between 0.5 and 80),
  "confidence": number (0-1),
  "reasoning": "brief explanation"
}`,
        { maxTokens: 150, temperature: 0.2 },
      );

      const result = JSON.parse(response.content);
      return {
        estimatedHours: result.estimatedHours,
        confidence: result.confidence * 0.8, // Reduce AI confidence slightly
        basedOn: 'ai',
      };
    } catch {
      // Default estimation based on common patterns
      return {
        estimatedHours: this.getDefaultEstimate(title),
        confidence: 0.3,
        basedOn: 'default',
      };
    }
  }

  /**
   * Suggest subtasks for breaking down a complex task
   */
  async suggestSubtasks(
    title: string,
    description: string | null,
  ): Promise<SubtaskSuggestion[]> {
    try {
      const response = await llmService.complete(
        `Break down this task into subtasks:

Title: "${title}"
${description ? `Description: ${description}` : ''}

Requirements:
- 3-7 logical subtasks
- Each should be completable in under 4 hours
- Order them logically (dependencies considered)
- Include brief descriptions

Return JSON array:
[
  {
    "title": "subtask title",
    "description": "brief description",
    "estimatedHours": number,
    "order": number
  }
]`,
        { maxTokens: 500, temperature: 0.4 },
      );

      return JSON.parse(response.content);
    } catch {
      return [];
    }
  }

  /**
   * Find similar tasks for reference
   */
  async findSimilarTasks(
    title: string,
    projectId: number,
    tenantId: string,
  ): Promise<RelatedTask[]> {
    // Get completed tasks from same project and tenant
    const completedTasks = await prisma.task.findMany({
      where: {
        tenantId,
        status: 'DONE',
        NOT: { projectId }, // Exclude current project for variety
      },
      select: {
        id: true,
        title: true,
        description: true,
        actualHours: true,
      },
      take: 100,
    });

    // Simple keyword-based similarity
    const titleWords = this.extractKeywords(title);
    const similar: RelatedTask[] = [];

    for (const task of completedTasks) {
      const taskWords = this.extractKeywords(task.title);
      const overlap = titleWords.filter((w) => taskWords.includes(w));
      const similarity = overlap.length / Math.max(titleWords.length, 1);

      if (similarity >= 0.3) {
        similar.push({
          taskId: task.id,
          title: task.title,
          similarity: Math.round(similarity * 100) / 100,
          relationship: 'similar',
        });
      }
    }

    return similar.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  }

  /**
   * Apply enrichment suggestions to a task
   */
  async applyEnrichment(
    taskId: number,
    tenantId: string,
    enrichment: Partial<TaskEnrichmentSuggestion>,
    acceptedFields: string[],
  ): Promise<void> {
    const updateData: Record<string, unknown> = {};

    if (
      acceptedFields.includes('description') &&
      enrichment.enhancedDescription
    ) {
      updateData.description = enrichment.enhancedDescription;
    }

    if (
      acceptedFields.includes('estimatedHours') &&
      enrichment.estimatedHours
    ) {
      updateData.aiEstimatedHours = enrichment.estimatedHours;
      updateData.aiEstimateAccepted = true;
    }

    if (acceptedFields.includes('priority') && enrichment.suggestedPriority) {
      updateData.priority = enrichment.suggestedPriority;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.task.update({
        where: { id: taskId },
        data: updateData,
      });
    }

    // Create subtasks if accepted
    if (
      acceptedFields.includes('subtasks') &&
      enrichment.suggestedSubtasks?.length
    ) {
      const task = await prisma.task.findFirst({
        where: { id: taskId, tenantId },
        select: { projectId: true },
      });

      if (task) {
        for (const subtask of enrichment.suggestedSubtasks) {
          await prisma.task.create({
            data: {
              tenantId,
              projectId: task.projectId,
              title: subtask.title,
              description: subtask.description || null,
              aiEstimatedHours: subtask.estimatedHours,
              status: 'TODO',
              priority: 'P3',
              parentTaskId: taskId,
            },
          });
        }
      }
    }
  }

  /**
   * Record actual task duration for learning
   */
  async recordTaskCompletion(
    taskId: number,
    tenantId: string,
    actualHours: number,
  ): Promise<void> {
    const task = await prisma.task.findFirst({
      where: { id: taskId, tenantId },
      select: {
        title: true,
        projectId: true,
        aiEstimatedHours: true,
        estimatedHours: true,
      },
    });

    if (!task) return;

    // Update task with actual hours
    await prisma.task.update({
      where: { id: taskId },
      data: { actualHours },
    });

    // Store duration learning data - derive task characteristics
    const keywords = this.extractKeywords(task.title);
    const taskType = keywords[0] || null; // Use primary keyword as type
    const complexity = this.deriveComplexity(task);

    await prisma.taskDurationLearning.create({
      data: {
        tenantId,
        taskType,
        complexity,
        hasSubtasks: false, // TODO: Check for subtasks when implemented
        teamSize: 1, // TODO: Get actual team size from assignees
        estimatedHours: task.estimatedHours || task.aiEstimatedHours || 0,
        actualHours,
        accuracy:
          task.estimatedHours || task.aiEstimatedHours
            ? Math.abs(
                1 -
                  Math.abs(
                    actualHours -
                      (task.estimatedHours || task.aiEstimatedHours || 0),
                  ) /
                    actualHours,
              )
            : 0,
      },
    });
  }

  private deriveComplexity(task: {
    title: string;
    description: string | null;
  }): string {
    // Simple heuristic based on description length
    const descLength = task.description?.length || 0;
    if (descLength > 500) return 'high';
    if (descLength > 100) return 'medium';
    return 'low';
  }

  // Private helper methods

  private async generateAIEnrichment(
    task: {
      title: string;
      description: string | null;
      project: {
        name: string;
        description: string | null;
        template: { name: string } | null;
      };
    },
    similarTasks: RelatedTask[],
    projectTasks: { title: string; status: string }[],
  ): Promise<TaskEnrichmentSuggestion> {
    try {
      const prompt = `Analyze this task and provide enrichment suggestions:

TASK:
Title: "${task.title}"
Description: ${task.description || 'None provided'}

PROJECT CONTEXT:
Name: ${task.project.name}
Description: ${task.project.description || 'None'}
Template: ${task.project.template?.name || 'Custom'}

SIMILAR COMPLETED TASKS:
${similarTasks.map((t) => `- ${t.title} (${t.similarity * 100}% similar)`).join('\n') || 'None found'}

OTHER PROJECT TASKS:
${projectTasks
  .slice(0, 5)
  .map((t) => `- ${t.title} [${t.status}]`)
  .join('\n')}

Provide JSON response:
{
  "enhancedDescription": "improved description if current is lacking",
  "acceptanceCriteria": ["criterion 1", "criterion 2"],
  "estimatedHours": number,
  "suggestedPriority": "P1|P2|P3|P4",
  "suggestedSubtasks": [
    {"title": "subtask", "description": "desc", "estimatedHours": 1, "order": 1}
  ],
  "tags": ["tag1", "tag2"]
}`;

      const response = await llmService.complete(prompt, {
        maxTokens: 800,
        temperature: 0.3,
      });

      const result = JSON.parse(response.content);
      return {
        ...result,
        relatedTasks: similarTasks,
      };
    } catch {
      // Fallback to basic enrichment
      return {
        relatedTasks: similarTasks,
        tags: this.extractKeywords(task.title),
      };
    }
  }

  private async getProjectTaskContext(
    projectId: number,
    tenantId: string,
  ): Promise<{ title: string; status: string }[]> {
    return prisma.task.findMany({
      where: { projectId, tenantId },
      select: { title: true, status: true },
      take: 20,
    });
  }

  private async getHistoricalEstimate(
    title: string,
    _projectId: number,
    tenantId: string,
  ): Promise<{ hours: number; confidence: number; sampleSize: number } | null> {
    const keywords = this.extractKeywords(title);

    if (keywords.length === 0) return null;

    // Find similar completed tasks by task type (derived from primary keyword)
    const taskType = keywords[0];
    const learnings = await prisma.taskDurationLearning.findMany({
      where: {
        tenantId,
        actualHours: { gt: 0 },
        taskType: taskType, // Match by derived task type
      },
      select: {
        actualHours: true,
        taskType: true,
        complexity: true,
      },
      take: 50,
    });

    if (learnings.length < 3) return null;

    // Calculate average duration for similar tasks
    const hours = learnings.map((l) => l.actualHours);
    const avgHours = hours.reduce((a, b) => a + b, 0) / hours.length;

    // Calculate confidence based on sample size and variance
    const variance =
      hours.reduce((sum, h) => sum + Math.pow(h - avgHours, 2), 0) /
      hours.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = stdDev / avgHours;

    // Higher sample size and lower variance = higher confidence
    const sampleConfidence = Math.min(learnings.length / 10, 1);
    const varianceConfidence = Math.max(0, 1 - coefficientOfVariation);
    const confidence = (sampleConfidence + varianceConfidence) / 2;

    return {
      hours: Math.round(avgHours * 10) / 10,
      confidence: Math.round(confidence * 100) / 100,
      sampleSize: learnings.length,
    };
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
    ]);

    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word));
  }

  private generateTemplateDescription(title: string): string {
    const lowerTitle = title.toLowerCase();

    if (lowerTitle.includes('create') || lowerTitle.includes('implement')) {
      return `Implement the ${title.replace(/^(create|implement)\s*/i, '')} feature according to specifications. Include unit tests and documentation.`;
    }

    if (lowerTitle.includes('fix') || lowerTitle.includes('bug')) {
      return `Investigate and resolve the reported issue. Include regression tests to prevent recurrence.`;
    }

    if (lowerTitle.includes('review') || lowerTitle.includes('audit')) {
      return `Conduct a thorough review and document findings with recommendations.`;
    }

    if (lowerTitle.includes('update') || lowerTitle.includes('modify')) {
      return `Make the necessary updates and verify functionality is preserved. Update related documentation.`;
    }

    return `Complete the task as specified, ensuring quality standards are met.`;
  }

  private generateDefaultAcceptanceCriteria(title: string): string[] {
    const criteria = ['Task completion is verified by the assignee'];

    const lowerTitle = title.toLowerCase();

    if (
      lowerTitle.includes('create') ||
      lowerTitle.includes('implement') ||
      lowerTitle.includes('build')
    ) {
      criteria.push('Feature is implemented and working as expected');
      criteria.push('Unit tests are added with adequate coverage');
      criteria.push('Code review is completed');
    } else if (lowerTitle.includes('fix') || lowerTitle.includes('bug')) {
      criteria.push('Issue is resolved and verified');
      criteria.push('Regression test is added');
      criteria.push('No new issues introduced');
    } else if (lowerTitle.includes('review') || lowerTitle.includes('audit')) {
      criteria.push('Review is documented with findings');
      criteria.push('Recommendations are provided');
    }

    return criteria;
  }

  private getDefaultEstimate(title: string): number {
    const lowerTitle = title.toLowerCase();

    if (
      lowerTitle.includes('create') ||
      lowerTitle.includes('implement') ||
      lowerTitle.includes('build')
    ) {
      return 8; // Full day for implementation
    }

    if (lowerTitle.includes('fix') || lowerTitle.includes('bug')) {
      return 4; // Half day for bug fixes
    }

    if (lowerTitle.includes('review') || lowerTitle.includes('audit')) {
      return 2; // Quick review
    }

    if (lowerTitle.includes('update') || lowerTitle.includes('modify')) {
      return 4; // Moderate for updates
    }

    return 4; // Default to half day
  }
}

export const taskEnrichmentService = new TaskEnrichmentService();
