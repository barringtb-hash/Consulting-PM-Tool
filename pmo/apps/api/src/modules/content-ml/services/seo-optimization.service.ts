/**
 * SEO Optimization Service
 *
 * Provides AI-powered SEO analysis and optimization for content.
 * Includes keyword analysis, content optimization, and SEO suggestions.
 *
 * @module content-ml/services
 */

import { llmService } from '../../../services/llm.service';
import type {
  SEOAnalysis,
  SEOSuggestion,
  SEOPriority,
  SEOSuggestionType,
  ContentType,
} from '../types';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MODEL = 'gpt-4o-mini';
const SEO_ANALYSIS_MAX_TOKENS = 2000;
const KEYWORD_SUGGESTION_MAX_TOKENS = 1000;
const CONTENT_OPTIMIZATION_MAX_TOKENS = 3000;
const DEFAULT_TEMPERATURE = 0.3;

/**
 * Platform-specific optimal keyword densities
 */
const OPTIMAL_KEYWORD_DENSITY = {
  min: 1.0,
  max: 3.0,
};

// ============================================================================
// System Prompts
// ============================================================================

const SEO_ANALYSIS_SYSTEM_PROMPT = `You are an expert SEO analyst with deep knowledge of search engine optimization best practices. You analyze content for SEO effectiveness and provide actionable recommendations.

Your analysis should be:
- Data-driven: Calculate actual metrics from the content
- Specific: Identify exact issues and locations
- Actionable: Provide clear, implementable suggestions
- Prioritized: Rank suggestions by impact

Always respond with valid JSON matching the requested schema.`;

const KEYWORD_SUGGESTION_SYSTEM_PROMPT = `You are an SEO keyword research expert. You suggest relevant, high-value keywords based on topics and industry context.

Your suggestions should be:
- Relevant: Closely related to the topic and industry
- Varied: Mix of head terms and long-tail keywords
- Strategic: Consider search intent and competition
- Practical: Realistically targetable keywords

Always respond with valid JSON matching the requested schema.`;

const CONTENT_OPTIMIZATION_SYSTEM_PROMPT = `You are an SEO content optimization expert. You improve content to rank better in search engines while maintaining readability and user value.

Your optimizations should:
- Preserve meaning: Keep the original message intact
- Natural integration: Keywords should flow naturally
- User-focused: Maintain readability and engagement
- Strategic placement: Optimize keyword positioning

Always respond with valid JSON matching the requested schema.`;

// ============================================================================
// SEO Analysis
// ============================================================================

/**
 * Analyze content for SEO effectiveness.
 * Provides comprehensive SEO scoring and improvement suggestions.
 *
 * @param content - The content to analyze
 * @param targetKeywords - Keywords to check for optimization
 * @param contentType - Type of content being analyzed
 * @returns Detailed SEO analysis with scores and suggestions
 *
 * @example
 * ```typescript
 * const analysis = await analyzeSEO(
 *   'This is my blog post about machine learning...',
 *   ['machine learning', 'AI', 'deep learning'],
 *   'blog_post'
 * );
 * console.log('SEO Score:', analysis.seoScore);
 * analysis.suggestions.forEach(s => console.log(s.suggestion));
 * ```
 */
export async function analyzeSEO(
  content: string,
  targetKeywords: string[],
  contentType: ContentType,
): Promise<SEOAnalysis> {
  // Validate inputs
  if (!content || content.trim().length === 0) {
    throw new Error('Content is required for SEO analysis');
  }

  // Calculate basic metrics
  const basicMetrics = calculateBasicMetrics(content);
  const keywordDensities = calculateKeywordDensity(content, targetKeywords);

  // Check LLM availability for advanced analysis
  if (!llmService.isAvailable()) {
    return generateRuleBasedSEOAnalysis(
      content,
      targetKeywords,
      contentType,
      basicMetrics,
      keywordDensities,
    );
  }

  const prompt = buildSEOAnalysisPrompt(
    content,
    targetKeywords,
    contentType,
    basicMetrics,
  );

  try {
    const result = await llmService.completeWithSystem(
      SEO_ANALYSIS_SYSTEM_PROMPT,
      prompt,
      {
        model: DEFAULT_MODEL,
        maxTokens: SEO_ANALYSIS_MAX_TOKENS,
        temperature: DEFAULT_TEMPERATURE,
      },
    );

    return parseSEOAnalysisResult(result.content, keywordDensities);
  } catch (error) {
    console.error('SEO analysis failed, using rule-based fallback:', error);
    return generateRuleBasedSEOAnalysis(
      content,
      targetKeywords,
      contentType,
      basicMetrics,
      keywordDensities,
    );
  }
}

/**
 * Build prompt for SEO analysis
 */
function buildSEOAnalysisPrompt(
  content: string,
  targetKeywords: string[],
  contentType: ContentType,
  metrics: BasicMetrics,
): string {
  return `Analyze the following content for SEO effectiveness.

## CONTENT TYPE
${contentType}

## TARGET KEYWORDS
${targetKeywords.map((k) => `- ${k}`).join('\n')}

## CONTENT METRICS
- Word count: ${metrics.wordCount}
- Sentence count: ${metrics.sentenceCount}
- Average sentence length: ${metrics.avgSentenceLength.toFixed(1)} words
- Paragraph count: ${metrics.paragraphCount}

## CONTENT TO ANALYZE
${content}

## TASK
Provide a comprehensive SEO analysis including:
1. Overall SEO score (0-100)
2. Readability assessment
3. Keyword usage evaluation
4. Structure analysis
5. Specific improvement suggestions

Respond with a JSON object matching this exact schema:
{
  "seoScore": <number 0-100>,
  "readabilityScore": <number 0-100>,
  "readabilityMetrics": {
    "avgSentenceLength": <number>,
    "avgWordLength": <number>,
    "fleschReadingEase": <number 0-100>,
    "gradeLevel": "<string describing grade level>"
  },
  "suggestions": [
    {
      "type": "<keyword_usage | meta_optimization | heading_structure | readability | internal_linking | image_optimization | content_length | keyword_placement | semantic_keywords>",
      "priority": "<critical | high | medium | low>",
      "issue": "<description of the issue>",
      "suggestion": "<how to fix it>",
      "location": "<where in content, or null if general>"
    }
  ],
  "metaTitle": "<suggested meta title, max 60 chars>",
  "metaDescription": "<suggested meta description, max 160 chars>"
}

## SCORING GUIDELINES
- seoScore: Consider keyword usage, structure, readability, and best practices
- readabilityScore: Based on Flesch-Kincaid or similar metrics
- Provide 3-7 specific, actionable suggestions
- Prioritize suggestions by potential SEO impact`;
}

/**
 * Parse LLM response into SEOAnalysis
 */
function parseSEOAnalysisResult(
  response: string,
  keywordDensities: SEOAnalysis['keywordDensity'],
): SEOAnalysis {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const suggestions: SEOSuggestion[] = (parsed.suggestions || []).map(
      (s: Record<string, unknown>) => ({
        type: validateSuggestionType(String(s.type || 'keyword_usage')),
        priority: validatePriority(String(s.priority || 'medium')),
        issue: String(s.issue || ''),
        suggestion: String(s.suggestion || ''),
        location: s.location ? String(s.location) : null,
      }),
    );

    return {
      seoScore: clampScore(parsed.seoScore ?? 50),
      keywordDensity: keywordDensities,
      readabilityScore: clampScore(parsed.readabilityScore ?? 50),
      readabilityMetrics: {
        avgSentenceLength: parsed.readabilityMetrics?.avgSentenceLength ?? 15,
        avgWordLength: parsed.readabilityMetrics?.avgWordLength ?? 5,
        fleschReadingEase: parsed.readabilityMetrics?.fleschReadingEase ?? 60,
        gradeLevel: String(
          parsed.readabilityMetrics?.gradeLevel || 'Grade 8-10',
        ),
      },
      suggestions,
      metaTitle: String(parsed.metaTitle || ''),
      metaDescription: String(parsed.metaDescription || ''),
    };
  } catch (error) {
    throw new Error(
      `Failed to parse SEO analysis result: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

// ============================================================================
// Keyword Suggestions
// ============================================================================

/**
 * Suggest relevant keywords for a topic and industry.
 *
 * @param topic - The topic to generate keywords for
 * @param industry - The industry context
 * @returns Array of suggested keywords with metadata
 *
 * @example
 * ```typescript
 * const keywords = await suggestKeywords('content marketing', 'technology');
 * keywords.forEach(k => console.log(`${k.keyword} (${k.searchIntent})`));
 * ```
 */
export async function suggestKeywords(
  topic: string,
  industry: string,
): Promise<KeywordSuggestion[]> {
  // Validate inputs
  if (!topic || topic.trim().length === 0) {
    throw new Error('Topic is required for keyword suggestions');
  }

  // Check LLM availability
  if (!llmService.isAvailable()) {
    return generateRuleBasedKeywords(topic, industry);
  }

  const prompt = buildKeywordSuggestionPrompt(topic, industry);

  try {
    const result = await llmService.completeWithSystem(
      KEYWORD_SUGGESTION_SYSTEM_PROMPT,
      prompt,
      {
        model: DEFAULT_MODEL,
        maxTokens: KEYWORD_SUGGESTION_MAX_TOKENS,
        temperature: 0.5, // Slightly more creative for keyword suggestions
      },
    );

    return parseKeywordSuggestions(result.content);
  } catch (error) {
    console.error(
      'Keyword suggestion failed, using rule-based fallback:',
      error,
    );
    return generateRuleBasedKeywords(topic, industry);
  }
}

/**
 * Keyword suggestion with metadata
 */
export interface KeywordSuggestion {
  /** The suggested keyword */
  keyword: string;
  /** Type of keyword */
  type: 'head' | 'long_tail' | 'question' | 'branded';
  /** Search intent */
  searchIntent:
    | 'informational'
    | 'navigational'
    | 'transactional'
    | 'commercial';
  /** Estimated competition level */
  competition: 'low' | 'medium' | 'high';
  /** Relevance to the topic (0-100) */
  relevance: number;
  /** Suggested usage context */
  usageContext: string;
}

/**
 * Build prompt for keyword suggestions
 */
function buildKeywordSuggestionPrompt(topic: string, industry: string): string {
  return `Generate SEO keyword suggestions for the following topic and industry.

## TOPIC
${topic}

## INDUSTRY
${industry || 'General'}

## TASK
Suggest 10-15 relevant keywords including:
- 3-4 head terms (1-2 words, high search volume)
- 5-7 long-tail keywords (3-5 words, specific intent)
- 2-3 question-based keywords
- 1-2 branded/niche keywords

Respond with a JSON object matching this exact schema:
{
  "keywords": [
    {
      "keyword": "<the keyword phrase>",
      "type": "<head | long_tail | question | branded>",
      "searchIntent": "<informational | navigational | transactional | commercial>",
      "competition": "<low | medium | high>",
      "relevance": <number 0-100>,
      "usageContext": "<brief description of how/where to use this keyword>"
    }
  ]
}

## GUIDELINES
- Focus on realistic, searchable terms
- Consider user search behavior
- Include a mix of competition levels
- Ensure high relevance to the topic`;
}

/**
 * Parse keyword suggestions from LLM response
 */
function parseKeywordSuggestions(response: string): KeywordSuggestion[] {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return (parsed.keywords || []).map((k: Record<string, unknown>) => ({
      keyword: String(k.keyword || ''),
      type: validateKeywordType(String(k.type || 'long_tail')),
      searchIntent: validateSearchIntent(
        String(k.searchIntent || 'informational'),
      ),
      competition: validateCompetition(String(k.competition || 'medium')),
      relevance: clampScore(Number(k.relevance) || 70),
      usageContext: String(k.usageContext || ''),
    }));
  } catch (error) {
    throw new Error(
      `Failed to parse keyword suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

// ============================================================================
// Content Optimization
// ============================================================================

/**
 * Optimize content for SEO based on target keywords.
 *
 * @param content - The content to optimize
 * @param keywords - Keywords to optimize for
 * @returns Optimized content with changes made
 *
 * @example
 * ```typescript
 * const result = await optimizeContent(
 *   'This is my original blog post...',
 *   ['machine learning', 'AI']
 * );
 * console.log('Optimized:', result.optimizedContent);
 * console.log('Changes:', result.changes);
 * ```
 */
export async function optimizeContent(
  content: string,
  keywords: string[],
): Promise<ContentOptimizationResult> {
  // Validate inputs
  if (!content || content.trim().length === 0) {
    throw new Error('Content is required for optimization');
  }

  if (!keywords || keywords.length === 0) {
    throw new Error('At least one keyword is required for optimization');
  }

  // Check LLM availability
  if (!llmService.isAvailable()) {
    throw new Error(
      'LLM service is not available. Please configure OpenAI API key.',
    );
  }

  const prompt = buildContentOptimizationPrompt(content, keywords);

  const result = await llmService.completeWithSystem(
    CONTENT_OPTIMIZATION_SYSTEM_PROMPT,
    prompt,
    {
      model: DEFAULT_MODEL,
      maxTokens: CONTENT_OPTIMIZATION_MAX_TOKENS,
      temperature: 0.4, // Slightly creative for natural integration
    },
  );

  return parseOptimizationResult(result.content);
}

/**
 * Result of content optimization
 */
export interface ContentOptimizationResult {
  /** The optimized content */
  optimizedContent: string;
  /** List of changes made */
  changes: OptimizationChange[];
  /** New SEO score estimate */
  estimatedSeoScore: number;
  /** Keywords successfully integrated */
  integratedKeywords: string[];
}

/**
 * Individual optimization change
 */
export interface OptimizationChange {
  /** Type of change */
  type:
    | 'keyword_added'
    | 'structure_improved'
    | 'meta_added'
    | 'readability_improved';
  /** Description of the change */
  description: string;
  /** Location in content */
  location: string | null;
}

/**
 * Build prompt for content optimization
 */
function buildContentOptimizationPrompt(
  content: string,
  keywords: string[],
): string {
  return `Optimize the following content for SEO based on the target keywords.

## TARGET KEYWORDS
Primary keyword: ${keywords[0]}
Secondary keywords: ${keywords.slice(1).join(', ') || 'None'}

## CONTENT TO OPTIMIZE
${content}

## TASK
Optimize this content for the target keywords while:
1. Maintaining natural readability
2. Preserving the original message and meaning
3. Strategically placing keywords in important positions (title, headings, first paragraph)
4. Achieving optimal keyword density (1-3%)
5. Improving structure if needed

Respond with a JSON object matching this exact schema:
{
  "optimizedContent": "<the fully optimized content>",
  "changes": [
    {
      "type": "<keyword_added | structure_improved | meta_added | readability_improved>",
      "description": "<what was changed>",
      "location": "<where in the content, or null if general>"
    }
  ],
  "estimatedSeoScore": <number 0-100>,
  "integratedKeywords": ["<list of keywords successfully integrated>"]
}

## GUIDELINES
- Do NOT over-optimize or keyword stuff
- Maintain a natural, readable flow
- Focus on user value first, SEO second
- Make minimal changes for maximum impact`;
}

/**
 * Parse optimization result from LLM response
 */
function parseOptimizationResult(response: string): ContentOptimizationResult {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const changes: OptimizationChange[] = (parsed.changes || []).map(
      (c: Record<string, unknown>) => ({
        type: validateChangeType(String(c.type || 'keyword_added')),
        description: String(c.description || ''),
        location: c.location ? String(c.location) : null,
      }),
    );

    return {
      optimizedContent: String(parsed.optimizedContent || ''),
      changes,
      estimatedSeoScore: clampScore(parsed.estimatedSeoScore ?? 70),
      integratedKeywords: Array.isArray(parsed.integratedKeywords)
        ? parsed.integratedKeywords.map((k: unknown) => String(k))
        : [],
    };
  } catch (error) {
    throw new Error(
      `Failed to parse optimization result: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Basic content metrics
 */
interface BasicMetrics {
  wordCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  paragraphCount: number;
  characterCount: number;
}

/**
 * Calculate basic content metrics
 */
function calculateBasicMetrics(content: string): BasicMetrics {
  const words = content.split(/\s+/).filter((w) => w.length > 0);
  const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 0);

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    avgSentenceLength:
      sentences.length > 0 ? words.length / sentences.length : 0,
    paragraphCount: paragraphs.length,
    characterCount: content.length,
  };
}

/**
 * Calculate keyword density for each target keyword
 */
function calculateKeywordDensity(
  content: string,
  keywords: string[],
): SEOAnalysis['keywordDensity'] {
  const contentLower = content.toLowerCase();
  const words = contentLower.split(/\s+/).filter((w) => w.length > 0);
  const totalWords = words.length;

  return keywords.map((keyword) => {
    const keywordLower = keyword.toLowerCase();
    const keywordWords = keywordLower.split(/\s+/).length;

    // Count occurrences
    let count = 0;
    let index = 0;
    while ((index = contentLower.indexOf(keywordLower, index)) !== -1) {
      count++;
      index += keywordLower.length;
    }

    // Calculate density
    const density =
      totalWords > 0 ? (count * keywordWords * 100) / totalWords : 0;

    return {
      keyword,
      density: Math.round(density * 100) / 100,
      optimalRange: OPTIMAL_KEYWORD_DENSITY,
      isOptimal:
        density >= OPTIMAL_KEYWORD_DENSITY.min &&
        density <= OPTIMAL_KEYWORD_DENSITY.max,
    };
  });
}

/**
 * Generate rule-based SEO analysis when LLM is unavailable
 */
function generateRuleBasedSEOAnalysis(
  content: string,
  targetKeywords: string[],
  contentType: ContentType,
  metrics: BasicMetrics,
  keywordDensities: SEOAnalysis['keywordDensity'],
): SEOAnalysis {
  const suggestions: SEOSuggestion[] = [];

  // Check content length
  const idealLength =
    contentType === 'blog_post'
      ? 1500
      : contentType === 'landing_page'
        ? 800
        : 500;
  if (metrics.wordCount < idealLength * 0.7) {
    suggestions.push({
      type: 'content_length',
      priority: 'high',
      issue: `Content is shorter than recommended (${metrics.wordCount} words)`,
      suggestion: `Consider expanding content to at least ${idealLength} words for better SEO performance`,
      location: null,
    });
  }

  // Check keyword density
  keywordDensities.forEach((kd) => {
    if (kd.density < OPTIMAL_KEYWORD_DENSITY.min) {
      suggestions.push({
        type: 'keyword_usage',
        priority: 'high',
        issue: `Keyword "${kd.keyword}" has low density (${kd.density}%)`,
        suggestion: `Increase usage of "${kd.keyword}" to reach optimal density of 1-3%`,
        location: null,
      });
    } else if (kd.density > OPTIMAL_KEYWORD_DENSITY.max) {
      suggestions.push({
        type: 'keyword_usage',
        priority: 'medium',
        issue: `Keyword "${kd.keyword}" may be over-optimized (${kd.density}%)`,
        suggestion: `Reduce usage of "${kd.keyword}" to avoid keyword stuffing`,
        location: null,
      });
    }
  });

  // Check sentence length
  if (metrics.avgSentenceLength > 25) {
    suggestions.push({
      type: 'readability',
      priority: 'medium',
      issue: 'Sentences are too long on average',
      suggestion: 'Break up longer sentences for better readability',
      location: null,
    });
  }

  // Calculate base score
  let seoScore = 50;
  const optimalKeywords = keywordDensities.filter((kd) => kd.isOptimal).length;
  seoScore += (optimalKeywords / targetKeywords.length) * 20;
  if (metrics.wordCount >= idealLength * 0.7) seoScore += 15;
  if (metrics.avgSentenceLength <= 20) seoScore += 10;

  // Readability score
  const readabilityScore = Math.max(
    30,
    100 -
      metrics.avgSentenceLength * 2 -
      Math.max(0, metrics.wordCount - 2000) * 0.01,
  );

  return {
    seoScore: clampScore(seoScore),
    keywordDensity: keywordDensities,
    readabilityScore: clampScore(readabilityScore),
    readabilityMetrics: {
      avgSentenceLength: metrics.avgSentenceLength,
      avgWordLength: 5, // Approximate
      fleschReadingEase: Math.max(30, 100 - metrics.avgSentenceLength * 3),
      gradeLevel:
        metrics.avgSentenceLength > 20
          ? 'College'
          : metrics.avgSentenceLength > 15
            ? 'Grade 10-12'
            : 'Grade 8-10',
    },
    suggestions,
    metaTitle: targetKeywords[0]
      ? `${targetKeywords[0].charAt(0).toUpperCase() + targetKeywords[0].slice(1)} - Your Guide`
      : 'Untitled',
    metaDescription: `Learn about ${targetKeywords.slice(0, 2).join(' and ')}. Discover expert insights and best practices.`,
  };
}

/**
 * Generate rule-based keyword suggestions
 */
function generateRuleBasedKeywords(
  topic: string,
  industry: string,
): KeywordSuggestion[] {
  const baseKeywords: KeywordSuggestion[] = [
    {
      keyword: topic,
      type: 'head',
      searchIntent: 'informational',
      competition: 'high',
      relevance: 100,
      usageContext: 'Use as primary keyword in title and first paragraph',
    },
    {
      keyword: `${topic} guide`,
      type: 'long_tail',
      searchIntent: 'informational',
      competition: 'medium',
      relevance: 90,
      usageContext: 'Use in headings and meta description',
    },
    {
      keyword: `what is ${topic}`,
      type: 'question',
      searchIntent: 'informational',
      competition: 'low',
      relevance: 85,
      usageContext: 'Use as a subheading or FAQ question',
    },
    {
      keyword: `best ${topic}`,
      type: 'long_tail',
      searchIntent: 'commercial',
      competition: 'high',
      relevance: 80,
      usageContext: 'Use in comparison or recommendation sections',
    },
    {
      keyword: `how to ${topic}`,
      type: 'question',
      searchIntent: 'informational',
      competition: 'medium',
      relevance: 85,
      usageContext: 'Use as a tutorial-style heading',
    },
  ];

  if (industry) {
    baseKeywords.push({
      keyword: `${topic} for ${industry}`,
      type: 'long_tail',
      searchIntent: 'commercial',
      competition: 'low',
      relevance: 95,
      usageContext: 'Use to target industry-specific audience',
    });
  }

  return baseKeywords;
}

/**
 * Clamp a score to 0-100 range
 */
function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Validate and return a valid suggestion type
 */
function validateSuggestionType(type: string): SEOSuggestionType {
  const validTypes: SEOSuggestionType[] = [
    'keyword_usage',
    'meta_optimization',
    'heading_structure',
    'readability',
    'internal_linking',
    'image_optimization',
    'content_length',
    'keyword_placement',
    'semantic_keywords',
  ];
  return validTypes.includes(type as SEOSuggestionType)
    ? (type as SEOSuggestionType)
    : 'keyword_usage';
}

/**
 * Validate and return a valid priority
 */
function validatePriority(priority: string): SEOPriority {
  const validPriorities: SEOPriority[] = ['critical', 'high', 'medium', 'low'];
  return validPriorities.includes(priority as SEOPriority)
    ? (priority as SEOPriority)
    : 'medium';
}

/**
 * Validate keyword type
 */
function validateKeywordType(
  type: string,
): 'head' | 'long_tail' | 'question' | 'branded' {
  const validTypes = ['head', 'long_tail', 'question', 'branded'] as const;
  return validTypes.includes(type as (typeof validTypes)[number])
    ? (type as (typeof validTypes)[number])
    : 'long_tail';
}

/**
 * Validate search intent
 */
function validateSearchIntent(
  intent: string,
): 'informational' | 'navigational' | 'transactional' | 'commercial' {
  const validIntents = [
    'informational',
    'navigational',
    'transactional',
    'commercial',
  ] as const;
  return validIntents.includes(intent as (typeof validIntents)[number])
    ? (intent as (typeof validIntents)[number])
    : 'informational';
}

/**
 * Validate competition level
 */
function validateCompetition(level: string): 'low' | 'medium' | 'high' {
  const validLevels = ['low', 'medium', 'high'] as const;
  return validLevels.includes(level as (typeof validLevels)[number])
    ? (level as (typeof validLevels)[number])
    : 'medium';
}

/**
 * Validate change type
 */
function validateChangeType(
  type: string,
):
  | 'keyword_added'
  | 'structure_improved'
  | 'meta_added'
  | 'readability_improved' {
  const validTypes = [
    'keyword_added',
    'structure_improved',
    'meta_added',
    'readability_improved',
  ] as const;
  return validTypes.includes(type as (typeof validTypes)[number])
    ? (type as (typeof validTypes)[number])
    : 'keyword_added';
}
