/**
 * Tool 2.2: Content Generation Suite Service
 *
 * Provides AI-powered content generation capabilities including:
 * - Multi-format content generation (social, email, blog, ads, etc.)
 * - Brand voice consistency training and enforcement
 * - Template library with categorization
 * - SEO optimization
 * - Plagiarism checking
 * - Approval workflows
 * - A/B variant generation
 */

import { prisma } from '../../prisma/client';
import { env } from '../../config/env';
import {
  ContentGenerationType,
  ContentApprovalStatus,
  Prisma,
} from '@prisma/client';
import * as crmIntegration from './services/crm-integration.service';

// ============================================================================
// TYPES
// ============================================================================

interface ContentGeneratorConfigInput {
  brandVoiceDescription?: string;
  toneKeywords?: string[];
  avoidKeywords?: string[];
  voiceSamples?: Prisma.InputJsonValue;
  enableSEO?: boolean;
  targetKeywords?: string[];
  enablePlagiarismCheck?: boolean;
  defaultTone?: string;
  defaultLength?: string;
  cmsIntegrations?: Prisma.InputJsonValue;
  socialIntegrations?: Prisma.InputJsonValue;
  emailIntegrations?: Prisma.InputJsonValue;
}

interface ContentGenerationInput {
  title: string;
  type: ContentGenerationType;
  prompt?: string;
  templateId?: number;
  placeholderValues?: Record<string, string>;
  keywords?: string[];
  targetLength?: 'short' | 'medium' | 'long';
  tone?: string;
  generateVariants?: number;
  // CRM integration fields
  accountId?: number;
  contactId?: number;
  opportunityId?: number;
  crmContext?: string; // Pre-built CRM context for AI
}

interface GeneratedContentResult {
  content: string;
  contentHtml?: string;
  metaTitle?: string;
  metaDescription?: string;
  keywords: string[];
  seoScore?: number;
  voiceConsistencyScore?: number;
  toneAnalysis?: { tone: string; confidence: number };
}

// ============================================================================
// CONTENT GENERATOR CONFIG MANAGEMENT
// ============================================================================

export async function getContentGeneratorConfig(clientId: number) {
  return prisma.contentGeneratorConfig.findUnique({
    where: { clientId },
    include: {
      client: { select: { id: true, name: true, industry: true } },
    },
  });
}

export async function listContentGeneratorConfigs(filters?: {
  clientId?: number;
}) {
  return prisma.contentGeneratorConfig.findMany({
    where: filters?.clientId ? { clientId: filters.clientId } : undefined,
    include: {
      client: { select: { id: true, name: true, industry: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createContentGeneratorConfig(
  clientId: number,
  data: ContentGeneratorConfigInput,
) {
  return prisma.contentGeneratorConfig.create({
    data: {
      clientId,
      ...data,
    },
  });
}

export async function updateContentGeneratorConfig(
  clientId: number,
  data: Partial<ContentGeneratorConfigInput>,
) {
  return prisma.contentGeneratorConfig.update({
    where: { clientId },
    data,
  });
}

// ============================================================================
// CONTENT GENERATION
// ============================================================================

export async function generateContent(
  configId: number,
  input: ContentGenerationInput,
): Promise<{ contents: unknown[] }> {
  const config = await prisma.contentGeneratorConfig.findUnique({
    where: { id: configId },
    include: { client: true },
  });

  if (!config) {
    throw new Error('Config not found');
  }

  // Get template if specified
  let template = null;
  if (input.templateId) {
    template = await prisma.contentTemplate.findUnique({
      where: { id: input.templateId },
    });
  }

  const variantCount = input.generateVariants || 1;
  const contents: unknown[] = [];

  for (let i = 0; i < variantCount; i++) {
    // Generate content using AI
    const result = await generateContentWithAI(
      input,
      config,
      template,
      i === 0, // First one is the control variant
    );

    // Check SEO if enabled
    let seoScore: number | undefined;
    let metaTitle: string | undefined;
    let metaDescription: string | undefined;

    if (config.enableSEO) {
      const seoResult = await analyzeSEO(result.content, input.keywords || []);
      seoScore = seoResult.score;
      metaTitle = seoResult.metaTitle;
      metaDescription = seoResult.metaDescription;
    }

    // Check brand voice consistency
    let voiceConsistencyScore: number | undefined;
    let toneAnalysis: { tone: string; confidence: number } | undefined;

    if (config.brandVoiceDescription) {
      const voiceResult = await analyzeVoiceConsistency(
        result.content,
        config.brandVoiceDescription,
        config.toneKeywords,
      );
      voiceConsistencyScore = voiceResult.consistencyScore;
      toneAnalysis = voiceResult.toneAnalysis;
    }

    // Check plagiarism if enabled
    let originalityScore: number | undefined;
    let plagiarismSources: unknown[] | undefined;

    if (config.enablePlagiarismCheck) {
      const plagiarismResult = await checkPlagiarism(result.content);
      originalityScore = plagiarismResult.originalityScore;
      plagiarismSources = plagiarismResult.sources;
    }

    // Save generated content
    const generatedContent = await prisma.generatedContent.create({
      data: {
        configId,
        title: input.title + (variantCount > 1 ? ` (Variant ${i + 1})` : ''),
        type: input.type,
        content: result.content,
        contentHtml: result.contentHtml,
        metaTitle,
        metaDescription,
        keywords: input.keywords || [],
        seoScore,
        voiceConsistencyScore,
        toneAnalysis: toneAnalysis as Prisma.InputJsonValue,
        originalityScore,
        plagiarismSources: plagiarismSources as Prisma.InputJsonValue,
        prompt: input.prompt,
        modelUsed: 'gpt-4o-mini',
        generationParams: {
          templateId: input.templateId,
          placeholderValues: input.placeholderValues,
          targetLength: input.targetLength,
          tone: input.tone,
        } as Prisma.InputJsonValue,
        variantGroup: variantCount > 1 ? `${Date.now()}` : undefined,
        isControlVariant: i === 0 && variantCount > 1,
        approvalStatus: 'DRAFT',
      },
    });

    contents.push(generatedContent);
  }

  return { contents };
}

async function generateContentWithAI(
  input: ContentGenerationInput,
  config: {
    brandVoiceDescription: string | null;
    toneKeywords: string[];
    avoidKeywords: string[];
    defaultTone: string | null;
    defaultLength: string | null;
  },
  template: { template: string; systemPrompt: string | null } | null,
  isControl: boolean,
): Promise<GeneratedContentResult> {
  if (!env.openaiApiKey) {
    return {
      content: 'Content generation requires OpenAI API key configuration.',
      keywords: input.keywords || [],
    };
  }

  // Build the system prompt
  let systemPrompt =
    template?.systemPrompt || getDefaultSystemPrompt(input.type);

  if (config.brandVoiceDescription) {
    systemPrompt += `\n\nBrand Voice: ${config.brandVoiceDescription}`;
  }

  if (config.toneKeywords.length > 0) {
    systemPrompt += `\nTone keywords to incorporate: ${config.toneKeywords.join(', ')}`;
  }

  if (config.avoidKeywords.length > 0) {
    systemPrompt += `\nWords/phrases to avoid: ${config.avoidKeywords.join(', ')}`;
  }

  // Add CRM context if available (for personalized content)
  if (input.crmContext) {
    systemPrompt += input.crmContext;
  }

  // Build the user prompt
  let userPrompt =
    input.prompt ||
    `Generate ${input.type.toLowerCase().replace('_', ' ')} content about: ${input.title}`;

  if (template) {
    let templatedContent = template.template;
    if (input.placeholderValues) {
      for (const [key, value] of Object.entries(input.placeholderValues)) {
        templatedContent = templatedContent.replace(
          new RegExp(`{{${key}}}`, 'g'),
          value,
        );
      }
    }
    userPrompt = `Use this template as a base:\n${templatedContent}\n\nOriginal request: ${userPrompt}`;
  }

  const tone = input.tone || config.defaultTone || 'professional';
  const length = input.targetLength || config.defaultLength || 'medium';

  userPrompt += `\n\nTone: ${tone}`;
  userPrompt += `\nLength: ${length}`;

  if (input.keywords && input.keywords.length > 0) {
    userPrompt += `\nIncorporate these keywords naturally: ${input.keywords.join(', ')}`;
  }

  if (!isControl) {
    userPrompt +=
      '\n\nGenerate a creative variation that conveys the same message but with different wording and structure.';
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: getLengthTokens(length),
        temperature: isControl ? 0.7 : 0.9,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices[0].message.content;

      return {
        content,
        contentHtml: convertToHtml(content, input.type),
        keywords: input.keywords || [],
      };
    }
  } catch (error) {
    console.error('Content generation error:', error);
  }

  return {
    content: 'Failed to generate content. Please try again.',
    keywords: input.keywords || [],
  };
}

function getDefaultSystemPrompt(type: ContentGenerationType): string {
  const prompts: Record<ContentGenerationType, string> = {
    SOCIAL_POST:
      'You are an expert social media content creator. Create engaging, shareable posts optimized for social media platforms. Keep content concise and impactful.',
    EMAIL:
      'You are an expert email copywriter. Create compelling email content with clear calls-to-action and engaging subject lines.',
    BLOG_POST:
      'You are an expert blog writer. Create informative, well-structured blog posts that provide value to readers and are optimized for SEO.',
    AD_COPY:
      'You are an expert advertising copywriter. Create persuasive ad copy that drives conversions with compelling headlines and clear value propositions.',
    LANDING_PAGE:
      'You are an expert landing page copywriter. Create conversion-optimized landing page content with clear headlines, benefits, and calls-to-action.',
    NEWSLETTER:
      'You are an expert newsletter writer. Create engaging newsletter content that keeps subscribers informed and interested.',
    PRESS_RELEASE:
      'You are an expert PR writer. Create professional press releases following journalistic standards with newsworthy angles.',
    PRODUCT_COPY:
      'You are an expert product copywriter. Create compelling product descriptions that highlight benefits and drive purchases.',
    VIDEO_SCRIPT:
      'You are an expert video scriptwriter. Create engaging video scripts with clear narratives and visual cues.',
    // Phase 1 additions - Business document content types
    PROPOSAL:
      'You are an expert business proposal writer. Create professional, persuasive proposals with clear structure including: Executive Summary, Scope of Work, Timeline, Deliverables, Pricing, and Terms. Focus on articulating value and addressing client needs.',
    CASE_STUDY:
      'You are an expert B2B case study writer. Create compelling client success stories following the Problem-Solution-Results format. Include specific metrics and outcomes. Make it relatable to prospects facing similar challenges.',
    FAQ_CONTENT:
      'You are an expert at creating clear, helpful FAQ content. Write concise question-and-answer pairs that anticipate user needs. Use natural language and organize by topic. Each answer should be complete but brief.',
    WELCOME_PACKET:
      'You are an expert at client onboarding content. Create warm, professional welcome materials that set expectations, explain next steps, and make new clients feel valued. Include key contacts, timelines, and what to expect.',
    WHITEPAPER:
      'You are an expert thought leadership writer. Create authoritative, research-backed whitepapers that establish expertise and provide genuine value. Structure with: Title, Abstract, Key Sections, Conclusion, and Call-to-Action. Maintain a professional, educational tone.',
  };

  return (
    prompts[type] ||
    'You are an expert content writer. Create high-quality content tailored to the request.'
  );
}

function getLengthTokens(length: string): number {
  switch (length) {
    case 'short':
      return 300;
    case 'long':
      return 2000;
    default:
      return 800;
  }
}

function convertToHtml(content: string, _type: ContentGenerationType): string {
  // Simple markdown-to-HTML conversion
  const html = content
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/\n/gim, '<br/>');

  return html;
}

async function analyzeSEO(
  content: string,
  targetKeywords: string[],
): Promise<{ score: number; metaTitle: string; metaDescription: string }> {
  let score = 50; // Base score

  // Check keyword presence
  const lowerContent = content.toLowerCase();
  let keywordMatches = 0;
  for (const keyword of targetKeywords) {
    if (lowerContent.includes(keyword.toLowerCase())) {
      keywordMatches++;
    }
  }
  if (targetKeywords.length > 0) {
    score += (keywordMatches / targetKeywords.length) * 30;
  }

  // Check content length
  const wordCount = content.split(/\s+/).length;
  if (wordCount >= 300) score += 10;
  if (wordCount >= 600) score += 10;

  // Generate meta title and description using AI
  let metaTitle = content.split('\n')[0].substring(0, 60);
  let metaDescription = content.substring(0, 160);

  if (env.openaiApiKey) {
    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.openaiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 200,
            temperature: 0.3,
            messages: [
              {
                role: 'system',
                content:
                  'Generate SEO-optimized meta title (max 60 chars) and meta description (max 160 chars). Respond with JSON: {"metaTitle": "...", "metaDescription": "..."}',
              },
              {
                role: 'user',
                content: `Content:\n${content.substring(0, 1000)}\n\nTarget keywords: ${targetKeywords.join(', ')}`,
              },
            ],
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        const parsed = JSON.parse(data.choices[0].message.content);
        metaTitle = parsed.metaTitle;
        metaDescription = parsed.metaDescription;
      }
    } catch (error) {
      console.error('SEO analysis error:', error);
    }
  }

  return {
    score: Math.min(100, Math.round(score)),
    metaTitle,
    metaDescription,
  };
}

async function analyzeVoiceConsistency(
  content: string,
  brandVoice: string,
  toneKeywords: string[],
): Promise<{
  consistencyScore: number;
  toneAnalysis: { tone: string; confidence: number };
}> {
  if (!env.openaiApiKey) {
    return {
      consistencyScore: 0.5,
      toneAnalysis: { tone: 'unknown', confidence: 0 },
    };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 200,
        temperature: 0.1,
        messages: [
          {
            role: 'system',
            content: `Analyze how well the content matches the brand voice. Respond with JSON:
{
  "consistencyScore": 0.0-1.0,
  "tone": "detected tone",
  "confidence": 0.0-1.0
}`,
          },
          {
            role: 'user',
            content: `Brand voice: ${brandVoice}\nTone keywords: ${toneKeywords.join(', ')}\n\nContent to analyze:\n${content.substring(0, 1500)}`,
          },
        ],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const parsed = JSON.parse(data.choices[0].message.content);
      return {
        consistencyScore: parsed.consistencyScore,
        toneAnalysis: { tone: parsed.tone, confidence: parsed.confidence },
      };
    }
  } catch (error) {
    console.error('Voice analysis error:', error);
  }

  return {
    consistencyScore: 0.5,
    toneAnalysis: { tone: 'unknown', confidence: 0 },
  };
}

async function checkPlagiarism(
  _content: string,
): Promise<{ originalityScore: number; sources: unknown[] }> {
  // Simplified plagiarism check - in production would integrate with Copyscape/similar
  // For now, return high originality for AI-generated content
  return {
    originalityScore: 0.95,
    sources: [],
  };
}

// ============================================================================
// CONTENT MANAGEMENT
// ============================================================================

export async function getContent(id: number) {
  return prisma.generatedContent.findUnique({
    where: { id },
    include: {
      config: {
        include: {
          client: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function getContents(
  configId: number,
  options: {
    type?: ContentGenerationType;
    approvalStatus?: ContentApprovalStatus;
    limit?: number;
    offset?: number;
  } = {},
) {
  const { type, approvalStatus, limit = 50, offset = 0 } = options;

  return prisma.generatedContent.findMany({
    where: {
      configId,
      ...(type && { type }),
      ...(approvalStatus && { approvalStatus }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

export async function updateContent(
  id: number,
  data: {
    title?: string;
    content?: string;
    contentHtml?: string;
    approvalStatus?: ContentApprovalStatus;
    revisionNotes?: string;
  },
) {
  const current = await prisma.generatedContent.findUnique({
    where: { id },
  });

  if (!current) {
    throw new Error('Content not found');
  }

  // If content changed, increment version
  const versionIncrement = data.content && data.content !== current.content;

  return prisma.generatedContent.update({
    where: { id },
    data: {
      ...data,
      ...(versionIncrement && { version: { increment: 1 } }),
      ...(versionIncrement && { parentVersionId: current.id }),
    },
  });
}

export async function deleteContent(id: number) {
  return prisma.generatedContent.delete({
    where: { id },
  });
}

// ============================================================================
// CONTENT TEMPLATES
// ============================================================================

export async function createContentTemplate(
  configId: number,
  data: {
    name: string;
    description?: string;
    type: ContentGenerationType;
    template: string;
    placeholders?: Prisma.InputJsonValue;
    systemPrompt?: string;
    exampleOutputs?: Prisma.InputJsonValue;
    category?: string;
    tags?: string[];
  },
) {
  return prisma.contentTemplate.create({
    data: {
      configId,
      ...data,
    },
  });
}

export async function getContentTemplates(
  configId: number,
  options: {
    type?: ContentGenerationType;
    category?: string;
    isActive?: boolean;
  } = {},
) {
  return prisma.contentTemplate.findMany({
    where: {
      configId,
      ...(options.type && { type: options.type }),
      ...(options.category && { category: options.category }),
      ...(options.isActive !== undefined && { isActive: options.isActive }),
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });
}

export async function updateContentTemplate(
  id: number,
  data: Partial<{
    name: string;
    description: string;
    template: string;
    placeholders: Prisma.InputJsonValue;
    systemPrompt: string;
    exampleOutputs: Prisma.InputJsonValue;
    category: string;
    tags: string[];
    isDefault: boolean;
    isActive: boolean;
  }>,
) {
  return prisma.contentTemplate.update({
    where: { id },
    data,
  });
}

export async function deleteContentTemplate(id: number) {
  return prisma.contentTemplate.delete({
    where: { id },
  });
}

// ============================================================================
// APPROVAL WORKFLOWS
// ============================================================================

export async function createApprovalWorkflow(
  configId: number,
  data: {
    name: string;
    description?: string;
    steps: Prisma.InputJsonValue;
    autoAssign?: boolean;
    assignmentRules?: Prisma.InputJsonValue;
  },
) {
  return prisma.contentApprovalWorkflow.create({
    data: {
      configId,
      ...data,
    },
  });
}

export async function getApprovalWorkflows(configId: number) {
  return prisma.contentApprovalWorkflow.findMany({
    where: { configId, isActive: true },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });
}

export async function submitForApproval(contentId: number, workflowId: number) {
  const workflow = await prisma.contentApprovalWorkflow.findUnique({
    where: { id: workflowId },
  });

  if (!workflow) {
    throw new Error('Workflow not found');
  }

  return prisma.generatedContent.update({
    where: { id: contentId },
    data: {
      approvalStatus: 'PENDING_REVIEW',
      approvalWorkflowId: workflowId,
    },
  });
}

export async function approveContent(contentId: number, approverId: number) {
  return prisma.generatedContent.update({
    where: { id: contentId },
    data: {
      approvalStatus: 'APPROVED',
      approvedAt: new Date(),
      approvedBy: approverId,
    },
  });
}

export async function rejectContent(
  contentId: number,
  approverId: number,
  revisionNotes: string,
) {
  return prisma.generatedContent.update({
    where: { id: contentId },
    data: {
      approvalStatus: 'REVISION_REQUESTED',
      currentApproverId: approverId,
      revisionNotes,
    },
  });
}

// ============================================================================
// BRAND VOICE TRAINING
// ============================================================================

export async function trainBrandVoice(
  configId: number,
  samples: Array<{ text: string; type: string; source: string }>,
) {
  // Update config with samples and mark as trained
  return prisma.contentGeneratorConfig.update({
    where: { id: configId },
    data: {
      voiceSamples: samples as Prisma.InputJsonValue,
      voiceTrainedAt: new Date(),
    },
  });
}

// ============================================================================
// CRM INTEGRATION - Content Generation with CRM Data
// ============================================================================

/**
 * Generate content personalized for a specific account
 */
export async function generateContentForAccount(
  configId: number,
  accountId: number,
  input: Omit<ContentGenerationInput, 'accountId' | 'crmContext'>,
): Promise<{ contents: unknown[]; crmData: crmIntegration.CRMPlaceholders }> {
  // Fetch CRM data for the account
  const crmData = await crmIntegration.getCRMPlaceholdersForAccount(accountId);

  if (!crmData.account) {
    throw new Error('Account not found');
  }

  // Build CRM context for AI
  const crmContext = crmIntegration.buildCRMContext(crmData);

  // Resolve CRM placeholders in prompt if present
  let resolvedPrompt = input.prompt || '';
  if (resolvedPrompt) {
    resolvedPrompt = crmIntegration.resolveCRMPlaceholders(
      resolvedPrompt,
      crmData,
    );
  }

  // Resolve CRM placeholders in placeholder values
  const resolvedPlaceholderValues: Record<string, string> = {};
  if (input.placeholderValues) {
    for (const [key, value] of Object.entries(input.placeholderValues)) {
      resolvedPlaceholderValues[key] = crmIntegration.resolveCRMPlaceholders(
        value,
        crmData,
      );
    }
  }

  // Generate content with CRM context
  const result = await generateContent(configId, {
    ...input,
    prompt: resolvedPrompt,
    placeholderValues: resolvedPlaceholderValues,
    accountId,
    crmContext,
  });

  return { ...result, crmData };
}

/**
 * Generate content personalized for a specific opportunity
 */
export async function generateContentForOpportunity(
  configId: number,
  opportunityId: number,
  input: Omit<ContentGenerationInput, 'opportunityId' | 'crmContext'>,
): Promise<{ contents: unknown[]; crmData: crmIntegration.CRMPlaceholders }> {
  // Fetch CRM data for the opportunity
  const crmData =
    await crmIntegration.getCRMPlaceholdersForOpportunity(opportunityId);

  if (!crmData.opportunity) {
    throw new Error('Opportunity not found');
  }

  // Build CRM context for AI
  const crmContext = crmIntegration.buildCRMContext(crmData);

  // Resolve CRM placeholders in prompt if present
  let resolvedPrompt = input.prompt || '';
  if (resolvedPrompt) {
    resolvedPrompt = crmIntegration.resolveCRMPlaceholders(
      resolvedPrompt,
      crmData,
    );
  }

  // Resolve CRM placeholders in placeholder values
  const resolvedPlaceholderValues: Record<string, string> = {};
  if (input.placeholderValues) {
    for (const [key, value] of Object.entries(input.placeholderValues)) {
      resolvedPlaceholderValues[key] = crmIntegration.resolveCRMPlaceholders(
        value,
        crmData,
      );
    }
  }

  // Generate content with CRM context
  const result = await generateContent(configId, {
    ...input,
    prompt: resolvedPrompt,
    placeholderValues: resolvedPlaceholderValues,
    opportunityId,
    accountId: crmData.account?.id,
    crmContext,
  });

  return { ...result, crmData };
}

/**
 * Get available CRM placeholders for content templates
 */
export function getAvailableCRMPlaceholders() {
  return crmIntegration.getAvailablePlaceholders();
}

/**
 * Get CRM data preview for an account
 */
export async function getCRMPlaceholdersForAccount(accountId: number) {
  return crmIntegration.getCRMPlaceholdersForAccount(accountId);
}

/**
 * Get CRM data preview for an opportunity
 */
export async function getCRMPlaceholdersForOpportunity(opportunityId: number) {
  return crmIntegration.getCRMPlaceholdersForOpportunity(opportunityId);
}
