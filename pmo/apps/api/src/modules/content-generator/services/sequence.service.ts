/**
 * Content Sequence Service
 *
 * Manages multi-piece content sequences including:
 * - Email drip campaigns
 * - Client onboarding sequences
 * - Lead nurturing sequences
 * - Follow-up sequences
 * - Re-engagement campaigns
 */

import { prisma } from '../../../prisma/client';
import { env } from '../../../config/env';
import {
  ContentSequenceType,
  ContentSequenceStatus,
  ContentGenerationType,
} from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateSequenceInput {
  name: string;
  description?: string;
  type: ContentSequenceType;
  triggerEvent?: string;
  pieces: CreateSequencePieceInput[];
}

export interface CreateSequencePieceInput {
  order: number;
  delayDays: number;
  purpose: string;
  subject?: string;
  contentType?: ContentGenerationType;
  promptHints?: string;
  keywords?: string[];
}

export interface GenerateSequenceInput {
  type: ContentSequenceType;
  industry?: string;
  pieceCount: number;
  totalDurationDays?: number;
  tone?: string;
  brandContext?: string;
}

export interface GeneratedSequenceTemplate {
  name: string;
  description: string;
  type: ContentSequenceType;
  pieces: {
    order: number;
    delayDays: number;
    purpose: string;
    subject: string;
    contentType: ContentGenerationType;
    promptHints: string;
  }[];
}

// ============================================================================
// SEQUENCE TEMPLATES BY TYPE
// ============================================================================

const SEQUENCE_TEMPLATES: Record<
  ContentSequenceType,
  GeneratedSequenceTemplate
> = {
  ONBOARDING: {
    name: 'Client Onboarding Sequence',
    description: 'Welcome new clients and set expectations for the engagement',
    type: 'ONBOARDING',
    pieces: [
      {
        order: 1,
        delayDays: 0,
        purpose: 'welcome',
        subject: 'Welcome to {{company_name}} - Getting Started',
        contentType: 'EMAIL',
        promptHints:
          'Warm welcome email, express excitement about working together, outline what to expect',
      },
      {
        order: 2,
        delayDays: 1,
        purpose: 'introduction',
        subject: 'Meet Your Team & Key Contacts',
        contentType: 'EMAIL',
        promptHints:
          'Introduce team members, provide contact information, set communication expectations',
      },
      {
        order: 3,
        delayDays: 3,
        purpose: 'resources',
        subject: 'Resources to Help You Get Started',
        contentType: 'EMAIL',
        promptHints:
          'Share helpful resources, documentation, FAQs, and self-service options',
      },
      {
        order: 4,
        delayDays: 7,
        purpose: 'check_in',
        subject: "How's Everything Going? Quick Check-in",
        contentType: 'EMAIL',
        promptHints: 'Check in on progress, ask for feedback, offer assistance',
      },
      {
        order: 5,
        delayDays: 14,
        purpose: 'value_reinforcement',
        subject: 'Making the Most of Our Partnership',
        contentType: 'EMAIL',
        promptHints:
          'Reinforce value proposition, share success tips, highlight underutilized features',
      },
    ],
  },
  NURTURE: {
    name: 'Lead Nurturing Sequence',
    description: 'Educate and nurture leads towards becoming customers',
    type: 'NURTURE',
    pieces: [
      {
        order: 1,
        delayDays: 0,
        purpose: 'value_intro',
        subject: "Thanks for Your Interest - Here's What We Do",
        contentType: 'EMAIL',
        promptHints:
          'Thank them for interest, introduce core value proposition, set expectation for helpful content',
      },
      {
        order: 2,
        delayDays: 3,
        purpose: 'education',
        subject: 'Common Challenges We Help Solve',
        contentType: 'EMAIL',
        promptHints:
          'Educational content about industry challenges, position as thought leader',
      },
      {
        order: 3,
        delayDays: 7,
        purpose: 'case_study',
        subject: 'How [Client] Achieved [Result]',
        contentType: 'EMAIL',
        promptHints:
          'Share a relevant case study or success story with specific results',
      },
      {
        order: 4,
        delayDays: 10,
        purpose: 'social_proof',
        subject: 'What Our Clients Are Saying',
        contentType: 'EMAIL',
        promptHints:
          'Share testimonials, reviews, or client feedback to build trust',
      },
      {
        order: 5,
        delayDays: 14,
        purpose: 'cta',
        subject: 'Ready to Take the Next Step?',
        contentType: 'EMAIL',
        promptHints:
          'Clear call-to-action, offer consultation or demo, create urgency without pressure',
      },
    ],
  },
  FOLLOW_UP: {
    name: 'Meeting Follow-Up Sequence',
    description: 'Follow up after meetings or consultations',
    type: 'FOLLOW_UP',
    pieces: [
      {
        order: 1,
        delayDays: 0,
        purpose: 'thank_you',
        subject: 'Great Speaking with You Today',
        contentType: 'EMAIL',
        promptHints:
          'Thank them for their time, recap key discussion points, confirm next steps',
      },
      {
        order: 2,
        delayDays: 2,
        purpose: 'resources',
        subject: 'Resources We Discussed',
        contentType: 'EMAIL',
        promptHints:
          'Share promised resources, additional information, relevant materials',
      },
      {
        order: 3,
        delayDays: 5,
        purpose: 'check_in',
        subject: 'Any Questions After Our Discussion?',
        contentType: 'EMAIL',
        promptHints:
          'Check if they have questions, offer clarification, reinforce value',
      },
      {
        order: 4,
        delayDays: 10,
        purpose: 'next_steps',
        subject: 'Moving Forward Together',
        contentType: 'EMAIL',
        promptHints:
          'Propose next steps, schedule follow-up, maintain momentum',
      },
    ],
  },
  DRIP: {
    name: 'Educational Drip Campaign',
    description: 'Deliver educational content over time to build expertise',
    type: 'DRIP',
    pieces: [
      {
        order: 1,
        delayDays: 0,
        purpose: 'intro',
        subject: 'Your Learning Journey Begins',
        contentType: 'EMAIL',
        promptHints:
          'Welcome to the series, outline what they will learn, set expectations',
      },
      {
        order: 2,
        delayDays: 3,
        purpose: 'lesson_1',
        subject: 'Lesson 1: The Fundamentals',
        contentType: 'EMAIL',
        promptHints:
          'First educational lesson, foundational concepts, actionable takeaways',
      },
      {
        order: 3,
        delayDays: 6,
        purpose: 'lesson_2',
        subject: 'Lesson 2: Going Deeper',
        contentType: 'EMAIL',
        promptHints:
          'Build on previous lesson, intermediate concepts, practical examples',
      },
      {
        order: 4,
        delayDays: 9,
        purpose: 'lesson_3',
        subject: 'Lesson 3: Advanced Strategies',
        contentType: 'EMAIL',
        promptHints: 'Advanced concepts, expert tips, real-world applications',
      },
      {
        order: 5,
        delayDays: 12,
        purpose: 'summary',
        subject: 'Putting It All Together',
        contentType: 'EMAIL',
        promptHints:
          'Summarize key learnings, provide action plan, CTA for next steps',
      },
    ],
  },
  REENGAGEMENT: {
    name: 'Re-engagement Campaign',
    description: 'Win back inactive leads or clients',
    type: 'REENGAGEMENT',
    pieces: [
      {
        order: 1,
        delayDays: 0,
        purpose: 'reconnect',
        subject: 'We Miss You!',
        contentType: 'EMAIL',
        promptHints:
          'Friendly reconnection, acknowledge time passed, express interest in reconnecting',
      },
      {
        order: 2,
        delayDays: 4,
        purpose: 'whats_new',
        subject: "Here's What's New Since We Last Connected",
        contentType: 'EMAIL',
        promptHints:
          'Share updates, new features, improvements, reasons to re-engage',
      },
      {
        order: 3,
        delayDays: 8,
        purpose: 'special_offer',
        subject: 'A Special Offer Just for You',
        contentType: 'EMAIL',
        promptHints:
          'Exclusive offer or incentive to re-engage, limited time element',
      },
      {
        order: 4,
        delayDays: 14,
        purpose: 'last_chance',
        subject: 'Last Chance to [Benefit]',
        contentType: 'EMAIL',
        promptHints:
          'Final outreach, create urgency, clear CTA, respect if they prefer no contact',
      },
    ],
  },
};

// ============================================================================
// SEQUENCE MANAGEMENT
// ============================================================================

/**
 * Create a new content sequence
 */
export async function createSequence(
  configId: number,
  input: CreateSequenceInput,
) {
  const sequence = await prisma.contentSequence.create({
    data: {
      configId,
      name: input.name,
      description: input.description,
      type: input.type,
      triggerEvent: input.triggerEvent,
      totalPieces: input.pieces.length,
      totalDurationDays: input.pieces.reduce(
        (max, p) => Math.max(max, p.delayDays),
        0,
      ),
      pieces: {
        create: input.pieces.map((piece) => ({
          order: piece.order,
          delayDays: piece.delayDays,
          purpose: piece.purpose,
          subject: piece.subject,
          contentType: piece.contentType || 'EMAIL',
          promptHints: piece.promptHints,
          keywords: piece.keywords || [],
        })),
      },
    },
    include: {
      pieces: {
        orderBy: { order: 'asc' },
      },
    },
  });

  return sequence;
}

/**
 * Get sequence by ID
 */
export async function getSequence(sequenceId: number) {
  return prisma.contentSequence.findUnique({
    where: { id: sequenceId },
    include: {
      pieces: {
        orderBy: { order: 'asc' },
        include: {
          content: true,
        },
      },
      config: {
        include: {
          client: { select: { id: true, name: true, industry: true } },
        },
      },
    },
  });
}

/**
 * List sequences for a config
 */
export async function listSequences(
  configId: number,
  filters?: {
    type?: ContentSequenceType;
    status?: ContentSequenceStatus;
  },
) {
  return prisma.contentSequence.findMany({
    where: {
      configId,
      ...(filters?.type && { type: filters.type }),
      ...(filters?.status && { status: filters.status }),
    },
    include: {
      pieces: {
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Update a sequence
 */
export async function updateSequence(
  sequenceId: number,
  data: {
    name?: string;
    description?: string;
    triggerEvent?: string;
    status?: ContentSequenceStatus;
    isActive?: boolean;
  },
) {
  return prisma.contentSequence.update({
    where: { id: sequenceId },
    data,
    include: {
      pieces: {
        orderBy: { order: 'asc' },
      },
    },
  });
}

/**
 * Delete a sequence
 */
export async function deleteSequence(sequenceId: number) {
  return prisma.contentSequence.delete({
    where: { id: sequenceId },
  });
}

/**
 * Add a piece to a sequence
 */
export async function addPieceToSequence(
  sequenceId: number,
  piece: CreateSequencePieceInput,
) {
  const newPiece = await prisma.contentSequencePiece.create({
    data: {
      sequenceId,
      order: piece.order,
      delayDays: piece.delayDays,
      purpose: piece.purpose,
      subject: piece.subject,
      contentType: piece.contentType || 'EMAIL',
      promptHints: piece.promptHints,
      keywords: piece.keywords || [],
    },
  });

  // Update sequence metadata
  await updateSequenceMetadata(sequenceId);

  return newPiece;
}

/**
 * Update sequence metadata (piece count, duration)
 */
async function updateSequenceMetadata(sequenceId: number) {
  const pieces = await prisma.contentSequencePiece.findMany({
    where: { sequenceId },
  });

  await prisma.contentSequence.update({
    where: { id: sequenceId },
    data: {
      totalPieces: pieces.length,
      totalDurationDays: pieces.reduce(
        (max, p) => Math.max(max, p.delayDays),
        0,
      ),
    },
  });
}

// ============================================================================
// SEQUENCE GENERATION
// ============================================================================

/**
 * Generate a sequence from a template
 */
export async function generateSequenceFromTemplate(
  configId: number,
  type: ContentSequenceType,
  customizations?: {
    name?: string;
    description?: string;
    triggerEvent?: string;
  },
) {
  const template = SEQUENCE_TEMPLATES[type];

  return createSequence(configId, {
    name: customizations?.name || template.name,
    description: customizations?.description || template.description,
    type,
    triggerEvent: customizations?.triggerEvent,
    pieces: template.pieces,
  });
}

/**
 * Generate a custom sequence with AI
 */
export async function generateCustomSequence(
  configId: number,
  input: GenerateSequenceInput,
): Promise<CreateSequenceInput> {
  // Start with template if available
  const baseTemplate = SEQUENCE_TEMPLATES[input.type];

  if (!env.openaiApiKey) {
    // Return template-based sequence without AI customization
    return {
      name: baseTemplate.name,
      description: baseTemplate.description,
      type: input.type,
      pieces: baseTemplate.pieces.slice(0, input.pieceCount),
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
        max_tokens: 2000,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `You are an expert email marketing strategist. Create a ${input.pieceCount}-piece ${input.type.toLowerCase()} email sequence.
${input.industry ? `Industry: ${input.industry}` : ''}
${input.tone ? `Tone: ${input.tone}` : ''}
${input.brandContext ? `Brand context: ${input.brandContext}` : ''}
${input.totalDurationDays ? `Total duration: ${input.totalDurationDays} days` : ''}

Return a JSON object with:
{
  "name": "Sequence name",
  "description": "Brief description",
  "pieces": [
    {
      "order": 1,
      "delayDays": 0,
      "purpose": "welcome|education|value_prop|case_study|cta|etc",
      "subject": "Email subject line",
      "promptHints": "Content generation hints"
    }
  ]
}`,
          },
          {
            role: 'user',
            content: `Create a ${input.pieceCount}-piece ${input.type.toLowerCase()} email sequence${input.industry ? ` for the ${input.industry} industry` : ''}.`,
          },
        ],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          name: parsed.name,
          description: parsed.description,
          type: input.type,
          pieces: parsed.pieces.map(
            (p: {
              order: number;
              delayDays: number;
              purpose: string;
              subject: string;
              promptHints: string;
            }) => ({
              ...p,
              contentType: 'EMAIL' as ContentGenerationType,
            }),
          ),
        };
      }
    }
  } catch (error) {
    console.error('Error generating custom sequence:', error);
  }

  // Fallback to template
  return {
    name: baseTemplate.name,
    description: baseTemplate.description,
    type: input.type,
    pieces: baseTemplate.pieces.slice(0, input.pieceCount),
  };
}

/**
 * Generate content for all pieces in a sequence
 */
export async function generateSequenceContent(
  sequenceId: number,
  options?: {
    tone?: string;
    brandContext?: string;
  },
) {
  const sequence = await getSequence(sequenceId);
  if (!sequence) {
    throw new Error('Sequence not found');
  }

  const generatedPieces = [];

  for (const piece of sequence.pieces) {
    if (piece.isGenerated && piece.content) {
      generatedPieces.push(piece);
      continue;
    }

    // Generate content for this piece
    const content = await generatePieceContent(
      sequence.configId,
      piece,
      sequence,
      options,
    );

    // Update piece with content reference
    const updatedPiece = await prisma.contentSequencePiece.update({
      where: { id: piece.id },
      data: {
        contentId: content.id,
        isGenerated: true,
      },
      include: { content: true },
    });

    generatedPieces.push(updatedPiece);
  }

  return { sequence, pieces: generatedPieces };
}

/**
 * Generate content for a single piece
 */
async function generatePieceContent(
  configId: number,
  piece: {
    purpose: string;
    subject: string | null;
    contentType: ContentGenerationType;
    promptHints: string | null;
    keywords: string[];
    order: number;
  },
  sequence: { name: string; type: ContentSequenceType; pieces: unknown[] },
  options?: { tone?: string; brandContext?: string },
) {
  const prompt = buildPiecePrompt(piece, sequence, options);

  // Create generated content
  const content = await prisma.generatedContent.create({
    data: {
      configId,
      title: piece.subject || `${sequence.name} - Part ${piece.order}`,
      type: piece.contentType,
      content: '', // Will be filled by AI
      prompt,
      modelUsed: 'gpt-4o-mini',
      keywords: piece.keywords,
      approvalStatus: 'DRAFT',
    },
  });

  // Generate actual content with AI if available
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
            max_tokens: 1000,
            temperature: 0.7,
            messages: [
              {
                role: 'system',
                content: `You are an expert email copywriter. Write compelling email content.
${options?.tone ? `Tone: ${options.tone}` : 'Tone: Professional but warm'}
${options?.brandContext ? `Brand context: ${options.brandContext}` : ''}`,
              },
              { role: 'user', content: prompt },
            ],
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        const generatedText = data.choices[0].message.content;

        await prisma.generatedContent.update({
          where: { id: content.id },
          data: { content: generatedText },
        });
      }
    } catch (error) {
      console.error('Error generating piece content:', error);
    }
  }

  return content;
}

/**
 * Build prompt for piece content generation
 */
function buildPiecePrompt(
  piece: {
    purpose: string;
    subject: string | null;
    promptHints: string | null;
    order: number;
  },
  sequence: { name: string; type: ContentSequenceType; pieces: unknown[] },
  options?: { tone?: string; brandContext?: string },
): string {
  const parts = [
    `Write an email for a ${sequence.type.toLowerCase().replace('_', ' ')} sequence.`,
    `This is email ${piece.order} of ${sequence.pieces.length} in the "${sequence.name}" sequence.`,
    `Purpose: ${piece.purpose}`,
  ];

  if (piece.subject) {
    parts.push(`Subject line: ${piece.subject}`);
  }

  if (piece.promptHints) {
    parts.push(`Content guidance: ${piece.promptHints}`);
  }

  if (options?.brandContext) {
    parts.push(`Brand context: ${options.brandContext}`);
  }

  parts.push(
    '',
    'Write the email body only (no subject line). Make it engaging, clear, and action-oriented.',
  );

  return parts.join('\n');
}

// ============================================================================
// SEQUENCE ACTIVATION
// ============================================================================

/**
 * Activate a sequence
 */
export async function activateSequence(sequenceId: number) {
  const sequence = await getSequence(sequenceId);
  if (!sequence) {
    throw new Error('Sequence not found');
  }

  // Check all pieces are generated
  const ungeneratedPieces = sequence.pieces.filter((p) => !p.isGenerated);
  if (ungeneratedPieces.length > 0) {
    throw new Error(
      `Cannot activate: ${ungeneratedPieces.length} pieces not yet generated`,
    );
  }

  return prisma.contentSequence.update({
    where: { id: sequenceId },
    data: {
      status: 'ACTIVE',
      isActive: true,
    },
  });
}

/**
 * Pause a sequence
 */
export async function pauseSequence(sequenceId: number) {
  return prisma.contentSequence.update({
    where: { id: sequenceId },
    data: {
      status: 'PAUSED',
      isActive: false,
    },
  });
}

/**
 * Get available sequence templates
 */
export function getSequenceTemplates() {
  return Object.entries(SEQUENCE_TEMPLATES).map(([type, template]) => ({
    type,
    name: template.name,
    description: template.description,
    pieceCount: template.pieces.length,
    totalDurationDays: Math.max(...template.pieces.map((p) => p.delayDays)),
  }));
}
