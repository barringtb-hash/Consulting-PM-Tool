/**
 * Content Ideas Service
 *
 * Generates AI-powered content ideas based on industry, trends, and past performance.
 * Manages the content idea lifecycle from suggestion to acceptance/rejection.
 *
 * @module content-ml/services
 */

import { prisma } from '../../../prisma/client';
import { llmService } from '../../../services/llm.service';
import type { ContentType, SocialPlatform, ContentIdea } from '../types';

// ============================================================================
// Types
// ============================================================================

/**
 * Request for generating content ideas
 */
export interface ContentIdeaRequest {
  /** Industry context for ideas */
  industry?: string;
  /** Specific topics to generate ideas for */
  topics?: string[];
  /** Types of content to suggest */
  contentTypes?: ContentType[];
  /** Number of ideas to generate (default: 5) */
  count?: number;
  /** Target audience description */
  targetAudience?: string;
  /** Tone preference */
  tonePreference?: string;
  /** Source of idea generation */
  ideaSource?: IdeaSource;
}

/**
 * Source of content idea
 */
export type IdeaSource =
  | 'trending'
  | 'performance'
  | 'calendar'
  | 'competitor'
  | 'ai_suggestion';

/**
 * Status of a content idea
 */
export type IdeaStatus = 'suggested' | 'accepted' | 'rejected' | 'generated';

/**
 * Filters for listing content ideas
 */
export interface ContentIdeaFilters {
  /** Filter by status */
  status?: IdeaStatus;
  /** Filter by content type */
  contentType?: ContentType;
  /** Filter by idea source */
  ideaSource?: IdeaSource;
  /** Limit number of results */
  limit?: number;
  /** Skip first N results */
  offset?: number;
  /** Include expired ideas */
  includeExpired?: boolean;
}

/**
 * Saved content idea with database metadata
 */
export interface SavedContentIdea {
  id: number;
  configId: number;
  tenantId: string | null;
  title: string;
  description: string | null;
  contentType: ContentType;
  suggestedPlatforms: SocialPlatform[];
  keywords: string[];
  ideaSource: IdeaSource;
  sourceData: Record<string, unknown> | null;
  relevanceScore: number | null;
  reasoning: string | null;
  status: IdeaStatus;
  generatedContentId: number | null;
  createdAt: Date;
  expiresAt: Date | null;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MODEL = 'gpt-4o-mini';
const IDEA_GENERATION_MAX_TOKENS = 2000;
const DEFAULT_TEMPERATURE = 0.7; // More creative for idea generation
const DEFAULT_IDEA_COUNT = 5;
const DEFAULT_EXPIRATION_DAYS = 30;

// ============================================================================
// System Prompts
// ============================================================================

const IDEA_GENERATION_SYSTEM_PROMPT = `You are a creative content strategist specializing in generating engaging content ideas. You create innovative, relevant content suggestions based on industry trends, target audience, and business goals.

Your ideas should be:
- Relevant: Aligned with the industry and audience
- Actionable: Clear enough to be developed into content
- Diverse: Mix of content types and platforms
- Strategic: Tied to business objectives
- Timely: Consider seasonal and trending topics

Always respond with valid JSON matching the requested schema.`;

// ============================================================================
// Content Idea Generation
// ============================================================================

/**
 * Generate content ideas based on industry, topics, and preferences.
 *
 * @param configId - The ContentGeneratorConfig ID
 * @param request - Parameters for idea generation
 * @returns Array of generated content ideas
 *
 * @example
 * ```typescript
 * const ideas = await generateIdeas(123, {
 *   industry: 'technology',
 *   topics: ['AI', 'machine learning'],
 *   contentTypes: ['blog_post', 'social_post'],
 *   count: 5
 * });
 * ideas.forEach(idea => console.log(`${idea.title}: ${idea.description}`));
 * ```
 */
export async function generateIdeas(
  configId: number,
  request: ContentIdeaRequest,
): Promise<ContentIdea[]> {
  // Verify config exists
  const config = await prisma.contentGeneratorConfig.findUnique({
    where: { id: configId },
    select: {
      id: true,
      tenantId: true,
      targetKeywords: true,
      brandVoiceDescription: true,
      client: {
        select: {
          name: true,
          industry: true,
        },
      },
    },
  });

  if (!config) {
    throw new Error(`ContentGeneratorConfig not found: ${configId}`);
  }

  // Build context from config if not provided
  const industry = request.industry || config.client?.industry || 'general';
  const topics =
    request.topics && request.topics.length > 0
      ? request.topics
      : config.targetKeywords || [];
  const count = request.count || DEFAULT_IDEA_COUNT;

  // Check LLM availability
  if (!llmService.isAvailable()) {
    return generateRuleBasedIdeas(
      industry,
      topics,
      request.contentTypes,
      count,
    );
  }

  const prompt = buildIdeaGenerationPrompt(
    industry,
    topics,
    request.contentTypes,
    request.targetAudience,
    request.tonePreference,
    count,
  );

  try {
    const result = await llmService.completeWithSystem(
      IDEA_GENERATION_SYSTEM_PROMPT,
      prompt,
      {
        model: DEFAULT_MODEL,
        maxTokens: IDEA_GENERATION_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
      },
    );

    return parseIdeaGenerationResult(result.content, request.ideaSource);
  } catch (error) {
    console.error('Idea generation failed, using rule-based fallback:', error);
    return generateRuleBasedIdeas(
      industry,
      topics,
      request.contentTypes,
      count,
    );
  }
}

/**
 * Build prompt for idea generation
 */
function buildIdeaGenerationPrompt(
  industry: string,
  topics: string[],
  contentTypes?: ContentType[],
  targetAudience?: string,
  tonePreference?: string,
  count: number = 5,
): string {
  const contentTypeList = contentTypes?.length
    ? contentTypes.join(', ')
    : 'blog_post, social_post, video_script, newsletter, case_study';

  return `Generate ${count} creative content ideas for the following context.

## INDUSTRY
${industry}

## TOPICS TO COVER
${topics.length > 0 ? topics.map((t) => `- ${t}`).join('\n') : '- General industry topics'}

## CONTENT TYPES TO CONSIDER
${contentTypeList}

${targetAudience ? `## TARGET AUDIENCE\n${targetAudience}\n` : ''}
${tonePreference ? `## PREFERRED TONE\n${tonePreference}\n` : ''}

## TASK
Generate ${count} unique, engaging content ideas. For each idea, provide:
1. A compelling title
2. A brief description of what the content would cover
3. The best content type for this idea
4. Platforms where it would perform well
5. Relevant keywords to target
6. A relevance score (0-100)
7. Brief reasoning for why this idea is valuable

Respond with a JSON object matching this exact schema:
{
  "ideas": [
    {
      "title": "<compelling title>",
      "description": "<what the content would cover, 2-3 sentences>",
      "contentType": "<blog_post | social_post | email | newsletter | video_script | podcast_outline | infographic | whitepaper | case_study | landing_page | ad_copy | press_release>",
      "suggestedPlatforms": ["<platform1>", "<platform2>"],
      "keywords": ["<keyword1>", "<keyword2>", "<keyword3>"],
      "relevanceScore": <number 0-100>,
      "reasoning": "<why this idea is valuable for the audience>"
    }
  ]
}

## IDEA GUIDELINES
- Mix evergreen and timely topics
- Consider different stages of the buyer journey
- Include ideas that can be repurposed across formats
- Prioritize ideas with clear value propositions
- Balance educational, entertaining, and promotional content`;
}

/**
 * Parse idea generation result from LLM response
 */
function parseIdeaGenerationResult(
  response: string,
  _ideaSource: IdeaSource = 'ai_suggestion',
): ContentIdea[] {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return (parsed.ideas || []).map((idea: Record<string, unknown>) => ({
      title: String(idea.title || 'Untitled'),
      description: String(idea.description || ''),
      contentType: validateContentType(String(idea.contentType || 'blog_post')),
      suggestedPlatforms: Array.isArray(idea.suggestedPlatforms)
        ? idea.suggestedPlatforms.map((p: unknown) =>
            validatePlatform(String(p)),
          )
        : ['linkedin'],
      keywords: Array.isArray(idea.keywords)
        ? idea.keywords.map((k: unknown) => String(k))
        : [],
      relevanceScore: clampScore(Number(idea.relevanceScore) || 70),
      reasoning: String(idea.reasoning || ''),
    }));
  } catch (error) {
    throw new Error(
      `Failed to parse idea generation result: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

// ============================================================================
// Content Idea Management
// ============================================================================

/**
 * Save a content idea to the database.
 *
 * @param configId - The ContentGeneratorConfig ID
 * @param idea - The content idea to save
 * @returns The saved content idea with database metadata
 *
 * @example
 * ```typescript
 * const savedIdea = await saveIdea(123, {
 *   title: 'AI in Healthcare',
 *   description: 'An overview of AI applications in healthcare...',
 *   contentType: 'blog_post',
 *   suggestedPlatforms: ['linkedin', 'twitter'],
 *   keywords: ['AI', 'healthcare', 'technology'],
 *   relevanceScore: 85,
 *   reasoning: 'Trending topic with high engagement potential'
 * });
 * ```
 */
export async function saveIdea(
  configId: number,
  idea: ContentIdea & {
    ideaSource?: IdeaSource;
    sourceData?: Record<string, unknown>;
  },
): Promise<SavedContentIdea> {
  // Verify config exists
  const config = await prisma.contentGeneratorConfig.findUnique({
    where: { id: configId },
    select: { id: true, tenantId: true },
  });

  if (!config) {
    throw new Error(`ContentGeneratorConfig not found: ${configId}`);
  }

  // Calculate expiration date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + DEFAULT_EXPIRATION_DAYS);

  // Create the idea
  const savedIdea = await prisma.contentIdea.create({
    data: {
      configId,
      tenantId: config.tenantId,
      title: idea.title,
      description: idea.description || null,
      contentType: idea.contentType,
      suggestedPlatforms: idea.suggestedPlatforms as string[],
      keywords: idea.keywords,
      ideaSource: idea.ideaSource || 'ai_suggestion',
      sourceData: idea.sourceData || undefined,
      relevanceScore: idea.relevanceScore || null,
      reasoning: idea.reasoning || null,
      status: 'suggested',
      expiresAt,
    },
  });

  return mapDatabaseIdea(savedIdea);
}

/**
 * Get content ideas with optional filtering.
 *
 * @param configId - The ContentGeneratorConfig ID
 * @param filters - Optional filters for the query
 * @returns Array of saved content ideas
 *
 * @example
 * ```typescript
 * const ideas = await getIdeas(123, {
 *   status: 'suggested',
 *   contentType: 'blog_post',
 *   limit: 10
 * });
 * ```
 */
export async function getIdeas(
  configId: number,
  filters?: ContentIdeaFilters,
): Promise<SavedContentIdea[]> {
  const where: Record<string, unknown> = {
    configId,
  };

  if (filters?.status) {
    where.status = filters.status;
  }

  if (filters?.contentType) {
    where.contentType = filters.contentType;
  }

  if (filters?.ideaSource) {
    where.ideaSource = filters.ideaSource;
  }

  if (!filters?.includeExpired) {
    where.OR = [{ expiresAt: null }, { expiresAt: { gte: new Date() } }];
  }

  const ideas = await prisma.contentIdea.findMany({
    where,
    orderBy: [{ relevanceScore: 'desc' }, { createdAt: 'desc' }],
    skip: filters?.offset || 0,
    take: filters?.limit || 50,
  });

  return ideas.map(mapDatabaseIdea);
}

/**
 * Update the status of a content idea.
 *
 * @param ideaId - The ContentIdea ID
 * @param status - New status for the idea
 * @param generatedContentId - Optional ID of generated content (when status is 'generated')
 * @returns The updated content idea
 *
 * @example
 * ```typescript
 * // Accept an idea
 * const accepted = await updateIdeaStatus(456, 'accepted');
 *
 * // Mark as generated with content reference
 * const generated = await updateIdeaStatus(456, 'generated', 789);
 * ```
 */
export async function updateIdeaStatus(
  ideaId: number,
  status: IdeaStatus,
  generatedContentId?: number,
): Promise<SavedContentIdea> {
  // Verify idea exists
  const existing = await prisma.contentIdea.findUnique({
    where: { id: ideaId },
  });

  if (!existing) {
    throw new Error(`ContentIdea not found: ${ideaId}`);
  }

  // Validate status transition
  if (!isValidStatusTransition(existing.status as IdeaStatus, status)) {
    throw new Error(
      `Invalid status transition: ${existing.status} -> ${status}`,
    );
  }

  // Update the idea
  const updated = await prisma.contentIdea.update({
    where: { id: ideaId },
    data: {
      status,
      generatedContentId:
        status === 'generated'
          ? generatedContentId
          : existing.generatedContentId,
    },
  });

  return mapDatabaseIdea(updated);
}

/**
 * Delete a content idea.
 *
 * @param ideaId - The ContentIdea ID to delete
 */
export async function deleteIdea(ideaId: number): Promise<void> {
  await prisma.contentIdea.delete({
    where: { id: ideaId },
  });
}

/**
 * Get a single content idea by ID.
 *
 * @param ideaId - The ContentIdea ID
 * @returns The content idea or null if not found
 */
export async function getIdeaById(
  ideaId: number,
): Promise<SavedContentIdea | null> {
  const idea = await prisma.contentIdea.findUnique({
    where: { id: ideaId },
  });

  return idea ? mapDatabaseIdea(idea) : null;
}

/**
 * Get idea statistics for a config.
 *
 * @param configId - The ContentGeneratorConfig ID
 * @returns Statistics about content ideas
 */
export async function getIdeaStats(configId: number): Promise<IdeaStats> {
  const [total, byStatus, byType] = await Promise.all([
    prisma.contentIdea.count({ where: { configId } }),
    prisma.contentIdea.groupBy({
      by: ['status'],
      where: { configId },
      _count: true,
    }),
    prisma.contentIdea.groupBy({
      by: ['contentType'],
      where: { configId },
      _count: true,
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  byStatus.forEach((s) => {
    statusCounts[s.status] = s._count;
  });

  const typeCounts: Record<string, number> = {};
  byType.forEach((t) => {
    typeCounts[t.contentType] = t._count;
  });

  return {
    total,
    byStatus: statusCounts,
    byType: typeCounts,
    acceptanceRate:
      total > 0
        ? ((statusCounts['accepted'] || 0) + (statusCounts['generated'] || 0)) /
          total
        : 0,
  };
}

/**
 * Idea statistics
 */
export interface IdeaStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  acceptanceRate: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map database content idea to service type
 */
function mapDatabaseIdea(dbIdea: {
  id: number;
  configId: number;
  tenantId: string | null;
  title: string;
  description: string | null;
  contentType: string;
  suggestedPlatforms: string[];
  keywords: string[];
  ideaSource: string;
  sourceData: unknown;
  relevanceScore: number | null;
  reasoning: string | null;
  status: string;
  generatedContentId: number | null;
  createdAt: Date;
  expiresAt: Date | null;
}): SavedContentIdea {
  return {
    id: dbIdea.id,
    configId: dbIdea.configId,
    tenantId: dbIdea.tenantId,
    title: dbIdea.title,
    description: dbIdea.description,
    contentType: dbIdea.contentType as ContentType,
    suggestedPlatforms: dbIdea.suggestedPlatforms as SocialPlatform[],
    keywords: dbIdea.keywords,
    ideaSource: dbIdea.ideaSource as IdeaSource,
    sourceData: dbIdea.sourceData as Record<string, unknown> | null,
    relevanceScore: dbIdea.relevanceScore,
    reasoning: dbIdea.reasoning,
    status: dbIdea.status as IdeaStatus,
    generatedContentId: dbIdea.generatedContentId,
    createdAt: dbIdea.createdAt,
    expiresAt: dbIdea.expiresAt,
  };
}

/**
 * Check if a status transition is valid
 */
function isValidStatusTransition(
  currentStatus: IdeaStatus,
  newStatus: IdeaStatus,
): boolean {
  const validTransitions: Record<IdeaStatus, IdeaStatus[]> = {
    suggested: ['accepted', 'rejected'],
    accepted: ['generated', 'rejected'],
    rejected: ['suggested'], // Allow re-suggesting
    generated: [], // Terminal state
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
}

/**
 * Generate rule-based content ideas
 */
function generateRuleBasedIdeas(
  industry: string,
  topics: string[],
  contentTypes?: ContentType[],
  count: number = 5,
): ContentIdea[] {
  const types = contentTypes?.length
    ? contentTypes
    : (['blog_post', 'social_post', 'newsletter'] as ContentType[]);

  const ideas: ContentIdea[] = [];
  const templates = [
    {
      titleTemplate: 'Ultimate Guide to {topic}',
      descriptionTemplate:
        'A comprehensive guide covering everything you need to know about {topic} in the {industry} industry.',
      platforms: ['linkedin', 'twitter'] as SocialPlatform[],
    },
    {
      titleTemplate: '{topic} Trends in {year}',
      descriptionTemplate:
        'Explore the latest trends and developments in {topic} that are shaping the {industry} landscape.',
      platforms: ['linkedin', 'twitter', 'instagram'] as SocialPlatform[],
    },
    {
      titleTemplate: 'How to Leverage {topic} for Business Growth',
      descriptionTemplate:
        'Practical strategies for using {topic} to drive growth in your {industry} business.',
      platforms: ['linkedin'] as SocialPlatform[],
    },
    {
      titleTemplate: '{topic}: Common Mistakes to Avoid',
      descriptionTemplate:
        'Learn about the most common pitfalls when implementing {topic} and how to avoid them.',
      platforms: ['linkedin', 'twitter'] as SocialPlatform[],
    },
    {
      titleTemplate: 'The Future of {topic} in {industry}',
      descriptionTemplate:
        'A forward-looking analysis of where {topic} is headed and what it means for {industry} professionals.',
      platforms: ['linkedin', 'youtube'] as SocialPlatform[],
    },
  ];

  const year = new Date().getFullYear();

  for (let i = 0; i < count && i < templates.length; i++) {
    const template = templates[i];
    const topic = topics[i % topics.length] || industry;
    const contentType = types[i % types.length];

    ideas.push({
      title: template.titleTemplate
        .replace('{topic}', topic)
        .replace('{year}', String(year)),
      description: template.descriptionTemplate
        .replace('{topic}', topic)
        .replace('{industry}', industry),
      contentType,
      suggestedPlatforms: template.platforms,
      keywords: [topic, industry, contentType],
      relevanceScore: 70 - i * 5,
      reasoning: `This is a proven content format that performs well in the ${industry} industry.`,
    });
  }

  return ideas;
}

/**
 * Validate and return a valid content type
 */
function validateContentType(type: string): ContentType {
  const validTypes: ContentType[] = [
    'blog_post',
    'social_post',
    'email',
    'newsletter',
    'video_script',
    'podcast_outline',
    'infographic',
    'whitepaper',
    'case_study',
    'landing_page',
    'ad_copy',
    'press_release',
  ];
  return validTypes.includes(type as ContentType)
    ? (type as ContentType)
    : 'blog_post';
}

/**
 * Validate and return a valid platform
 */
function validatePlatform(platform: string): SocialPlatform {
  const validPlatforms: SocialPlatform[] = [
    'twitter',
    'linkedin',
    'facebook',
    'instagram',
    'tiktok',
    'youtube',
    'pinterest',
    'threads',
  ];
  return validPlatforms.includes(platform as SocialPlatform)
    ? (platform as SocialPlatform)
    : 'linkedin';
}

/**
 * Clamp a score to 0-100 range
 */
function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}
