/**
 * Intake Content Service for Content Generator
 *
 * Generates intake-related content including:
 * - Intake form questions by industry
 * - Chatbot conversation flows
 * - FAQ content from intake submissions
 * - Qualification questions for lead scoring
 *
 * Integrates with the Intake module's engagement letter service
 * for a unified document generation experience.
 */

import { prisma } from '../../../prisma/client';
import { env } from '../../../config/env';
import * as engagementLetterService from '../../intake/compliance/engagement-letter.service';

// ============================================================================
// TYPES
// ============================================================================

export interface IntakeQuestionGenerationInput {
  industry: string;
  questionType: 'qualification' | 'discovery' | 'screening' | 'onboarding';
  targetCount: number;
  existingQuestions?: string[];
  customContext?: string;
  includeFollowUps?: boolean;
}

export interface GeneratedIntakeQuestion {
  question: string;
  type: 'text' | 'select' | 'multiselect' | 'number' | 'date' | 'boolean';
  required: boolean;
  options?: string[];
  followUpQuestions?: GeneratedIntakeQuestion[];
  helpText?: string;
  category?: string;
}

export interface ChatbotFlowGenerationInput {
  industry: string;
  flowType: 'greeting' | 'qualification' | 'faq' | 'scheduling' | 'support';
  intents: string[];
  personality: 'professional' | 'friendly' | 'casual' | 'formal';
  maxTurns?: number;
}

export interface GeneratedChatbotFlow {
  flowId: string;
  name: string;
  description: string;
  nodes: ChatbotFlowNode[];
  fallbackResponse: string;
}

export interface ChatbotFlowNode {
  nodeId: string;
  type: 'message' | 'question' | 'action' | 'condition' | 'handoff';
  content: string;
  options?: { label: string; nextNodeId: string }[];
  nextNodeId?: string;
  intent?: string;
}

export interface FAQGenerationInput {
  submissionIds?: number[];
  industry?: string;
  categories?: string[];
  maxItems?: number;
}

export interface GeneratedFAQ {
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  relatedQuestions?: string[];
}

// ============================================================================
// INDUSTRY-SPECIFIC QUESTION TEMPLATES
// ============================================================================

const INDUSTRY_QUESTION_TEMPLATES: Record<
  string,
  Record<string, GeneratedIntakeQuestion[]>
> = {
  legal: {
    qualification: [
      {
        question: 'What type of legal matter do you need assistance with?',
        type: 'select',
        required: true,
        options: [
          'Business/Corporate',
          'Real Estate',
          'Employment',
          'Litigation',
          'Family Law',
          'Estate Planning',
          'Intellectual Property',
          'Other',
        ],
        category: 'Matter Type',
      },
      {
        question: 'Is there a deadline or court date we should be aware of?',
        type: 'date',
        required: false,
        helpText: 'Leave blank if not applicable',
        category: 'Timeline',
      },
      {
        question: 'Have you worked with an attorney on this matter before?',
        type: 'boolean',
        required: true,
        category: 'History',
      },
    ],
    discovery: [
      {
        question: 'Please describe your legal situation in detail.',
        type: 'text',
        required: true,
        helpText: 'Include relevant dates, parties involved, and key events',
        category: 'Background',
      },
      {
        question: 'What outcome are you hoping to achieve?',
        type: 'text',
        required: true,
        category: 'Goals',
      },
      {
        question: 'What is your estimated budget for legal services?',
        type: 'select',
        required: false,
        options: [
          'Under $5,000',
          '$5,000 - $15,000',
          '$15,000 - $50,000',
          'Over $50,000',
          'Not sure',
        ],
        category: 'Budget',
      },
    ],
  },
  consulting: {
    qualification: [
      {
        question: 'What is the primary challenge you are looking to address?',
        type: 'text',
        required: true,
        category: 'Challenge',
      },
      {
        question: 'What is the size of your organization?',
        type: 'select',
        required: true,
        options: [
          '1-10 employees',
          '11-50 employees',
          '51-200 employees',
          '201-1000 employees',
          '1000+ employees',
        ],
        category: 'Company Size',
      },
      {
        question: 'When are you looking to start this project?',
        type: 'select',
        required: true,
        options: [
          'Immediately',
          'Within 1 month',
          'Within 3 months',
          'Within 6 months',
          'Just exploring options',
        ],
        category: 'Timeline',
      },
    ],
    discovery: [
      {
        question: 'What specific outcomes would you consider a success?',
        type: 'text',
        required: true,
        category: 'Goals',
      },
      {
        question: 'Who are the key stakeholders for this initiative?',
        type: 'text',
        required: false,
        category: 'Stakeholders',
      },
      {
        question: 'What is your allocated budget for this project?',
        type: 'select',
        required: false,
        options: [
          'Under $10,000',
          '$10,000 - $50,000',
          '$50,000 - $100,000',
          'Over $100,000',
          'Budget not yet defined',
        ],
        category: 'Budget',
      },
    ],
  },
  healthcare: {
    qualification: [
      {
        question: 'What type of healthcare service are you seeking?',
        type: 'select',
        required: true,
        options: [
          'Primary Care',
          'Specialist Consultation',
          'Mental Health',
          'Physical Therapy',
          'Wellness/Preventive',
          'Other',
        ],
        category: 'Service Type',
      },
      {
        question: 'Do you have health insurance?',
        type: 'boolean',
        required: true,
        category: 'Insurance',
      },
      {
        question: 'Is this your first visit to our practice?',
        type: 'boolean',
        required: true,
        category: 'Patient Status',
      },
    ],
    screening: [
      {
        question: 'What is your primary health concern today?',
        type: 'text',
        required: true,
        category: 'Chief Complaint',
      },
      {
        question: 'How long have you been experiencing these symptoms?',
        type: 'select',
        required: false,
        options: [
          'Less than 1 week',
          '1-4 weeks',
          '1-3 months',
          '3-6 months',
          'Over 6 months',
        ],
        category: 'Duration',
      },
    ],
  },
  financial: {
    qualification: [
      {
        question: 'What financial services are you interested in?',
        type: 'multiselect',
        required: true,
        options: [
          'Investment Management',
          'Retirement Planning',
          'Tax Planning',
          'Estate Planning',
          'Insurance Review',
          'General Financial Planning',
        ],
        category: 'Services',
      },
      {
        question: 'What is your approximate investable assets range?',
        type: 'select',
        required: true,
        options: [
          'Under $100,000',
          '$100,000 - $500,000',
          '$500,000 - $1,000,000',
          '$1,000,000 - $5,000,000',
          'Over $5,000,000',
        ],
        category: 'Assets',
      },
    ],
    discovery: [
      {
        question: 'What are your primary financial goals?',
        type: 'multiselect',
        required: true,
        options: [
          'Retirement',
          'Education Funding',
          'Wealth Growth',
          'Income Generation',
          'Tax Efficiency',
          'Legacy Planning',
        ],
        category: 'Goals',
      },
      {
        question: 'What is your risk tolerance?',
        type: 'select',
        required: true,
        options: [
          'Conservative',
          'Moderately Conservative',
          'Moderate',
          'Moderately Aggressive',
          'Aggressive',
        ],
        category: 'Risk Profile',
      },
    ],
  },
};

// ============================================================================
// CHATBOT FLOW TEMPLATES
// ============================================================================

const CHATBOT_FLOW_TEMPLATES: Record<string, Partial<GeneratedChatbotFlow>> = {
  greeting: {
    name: 'Welcome Flow',
    description: 'Initial greeting and intent detection',
    fallbackResponse:
      "I'm not sure I understood that. Could you please rephrase or select one of the options above?",
  },
  qualification: {
    name: 'Lead Qualification Flow',
    description: 'Qualify leads through structured questions',
    fallbackResponse:
      "I'd like to help you better. Could you tell me more about what you're looking for?",
  },
  faq: {
    name: 'FAQ Flow',
    description: 'Answer frequently asked questions',
    fallbackResponse:
      "I don't have an answer for that specific question. Would you like to speak with a team member?",
  },
  scheduling: {
    name: 'Appointment Scheduling Flow',
    description: 'Help users schedule appointments',
    fallbackResponse:
      "I'd be happy to help you schedule. What day works best for you?",
  },
};

// ============================================================================
// MAIN GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate intake form questions by industry
 */
export async function generateIntakeQuestions(
  input: IntakeQuestionGenerationInput,
): Promise<{ questions: GeneratedIntakeQuestion[] }> {
  const {
    industry,
    questionType,
    targetCount,
    existingQuestions,
    customContext,
  } = input;

  // Start with industry templates if available
  const templateQuestions =
    INDUSTRY_QUESTION_TEMPLATES[industry.toLowerCase()]?.[questionType] || [];

  // Filter out existing questions
  let questions = templateQuestions.filter(
    (q) => !existingQuestions?.includes(q.question),
  );

  // If we need more questions and have OpenAI, generate with AI
  if (questions.length < targetCount && env.openaiApiKey) {
    const aiQuestions = await generateQuestionsWithAI(
      industry,
      questionType,
      targetCount - questions.length,
      existingQuestions || [],
      customContext,
    );
    questions = [...questions, ...aiQuestions];
  }

  // Limit to target count
  questions = questions.slice(0, targetCount);

  // Generate follow-up questions if requested
  if (input.includeFollowUps) {
    questions = await addFollowUpQuestions(questions);
  }

  return { questions };
}

/**
 * Generate chatbot conversation flow
 */
export async function generateChatbotFlow(
  input: ChatbotFlowGenerationInput,
): Promise<GeneratedChatbotFlow> {
  const { industry, flowType, intents, personality, maxTurns = 5 } = input;

  const baseFlow =
    CHATBOT_FLOW_TEMPLATES[flowType] || CHATBOT_FLOW_TEMPLATES.greeting;

  const flowId = `flow-${Date.now()}`;

  // Build nodes based on flow type
  const nodes: ChatbotFlowNode[] = [];

  // Start node
  nodes.push({
    nodeId: 'start',
    type: 'message',
    content: getGreetingMessage(personality, industry),
    nextNodeId: 'intent-detect',
  });

  // Intent detection node
  const intentOptions = intents.map((intent, index) => ({
    label: formatIntentLabel(intent),
    nextNodeId: `intent-${index}`,
  }));

  nodes.push({
    nodeId: 'intent-detect',
    type: 'question',
    content: 'How can I help you today?',
    options: intentOptions,
  });

  // Intent handling nodes
  intents.forEach((intent, index) => {
    const responseNodes = generateIntentNodes(
      intent,
      personality,
      `intent-${index}`,
      maxTurns,
    );
    nodes.push(...responseNodes);
  });

  // Fallback/handoff node
  nodes.push({
    nodeId: 'handoff',
    type: 'handoff',
    content: 'Let me connect you with a team member who can better assist you.',
  });

  return {
    flowId,
    name: baseFlow.name || 'Custom Flow',
    description: baseFlow.description || `${flowType} flow for ${industry}`,
    nodes,
    fallbackResponse:
      baseFlow.fallbackResponse ||
      "I'm not sure I understood. Could you rephrase that?",
  };
}

/**
 * Generate FAQ content from intake submissions
 */
export async function generateFAQFromIntakeData(
  configId: number,
  input: FAQGenerationInput,
): Promise<{ faqs: GeneratedFAQ[] }> {
  const { submissionIds, industry, categories, maxItems = 10 } = input;

  // Get config to determine client
  const config = await prisma.contentGeneratorConfig.findUnique({
    where: { id: configId },
    include: { client: true },
  });

  if (!config) {
    throw new Error('Config not found');
  }

  const faqs: GeneratedFAQ[] = [];

  // Generate industry-specific FAQs
  if (industry) {
    const industryFAQs = getIndustryFAQs(industry, categories);
    faqs.push(...industryFAQs);
  }

  // If we have submission IDs, analyze them for common questions
  if (submissionIds && submissionIds.length > 0 && env.openaiApiKey) {
    const submissionFAQs = await generateFAQsFromSubmissions(submissionIds);
    faqs.push(...submissionFAQs);
  }

  // Limit and deduplicate
  const uniqueFAQs = deduplicateFAQs(faqs).slice(0, maxItems);

  return { faqs: uniqueFAQs };
}

/**
 * Get available engagement letter templates (delegates to intake module)
 */
export function getEngagementLetterTemplates(industry?: string) {
  return engagementLetterService.getAvailableTemplates(industry);
}

/**
 * Get a specific engagement letter template
 */
export function getEngagementLetterTemplate(templateId: string) {
  return engagementLetterService.getTemplate(templateId);
}

/**
 * Preview an engagement letter with sample data
 */
export function previewEngagementLetter(
  templateId: string,
  sampleData: Record<string, string>,
) {
  return engagementLetterService.previewTemplate(templateId, sampleData);
}

// ============================================================================
// AI GENERATION HELPERS
// ============================================================================

async function generateQuestionsWithAI(
  industry: string,
  questionType: string,
  count: number,
  existingQuestions: string[],
  customContext?: string,
): Promise<GeneratedIntakeQuestion[]> {
  if (!env.openaiApiKey) {
    return [];
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
        max_tokens: 1500,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `You are an expert at creating intake form questions for ${industry} businesses.
Generate ${count} ${questionType} questions that are clear, professional, and effective.
Return a JSON array of objects with: question, type (text/select/multiselect/number/date/boolean), required (boolean), options (array, if applicable), helpText, category.`,
          },
          {
            role: 'user',
            content: `Generate ${count} ${questionType} questions for a ${industry} intake form.
${existingQuestions.length > 0 ? `\nAvoid these existing questions:\n${existingQuestions.join('\n')}` : ''}
${customContext ? `\nAdditional context: ${customContext}` : ''}

Return only valid JSON array.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      return [];
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse JSON from response
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Error generating questions with AI:', error);
  }

  return [];
}

async function generateFAQsFromSubmissions(
  submissionIds: number[],
): Promise<GeneratedFAQ[]> {
  // Get submissions
  const submissions = await prisma.intakeSubmission.findMany({
    where: { id: { in: submissionIds } },
    select: { formData: true },
  });

  if (submissions.length === 0) {
    return [];
  }

  // Extract common patterns
  const formDataList = submissions
    .map((s) => JSON.stringify(s.formData))
    .join('\n---\n');

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1500,
        temperature: 0.5,
        messages: [
          {
            role: 'system',
            content: `You are an expert at creating FAQ content from intake form submissions.
Analyze the submission data and generate helpful FAQ entries.
Return a JSON array of objects with: question, answer, category, keywords (array).`,
          },
          {
            role: 'user',
            content: `Based on these intake form submissions, generate relevant FAQ entries:\n\n${formDataList.substring(0, 3000)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error('Error generating FAQs from submissions:', error);
  }

  return [];
}

async function addFollowUpQuestions(
  questions: GeneratedIntakeQuestion[],
): Promise<GeneratedIntakeQuestion[]> {
  // Add simple follow-ups for certain question types
  return questions.map((q) => {
    if (q.type === 'boolean') {
      q.followUpQuestions = [
        {
          question: 'Please provide more details.',
          type: 'text',
          required: false,
          category: q.category,
        },
      ];
    }
    return q;
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getGreetingMessage(personality: string, industry: string): string {
  const greetings: Record<string, string> = {
    professional: `Welcome! I'm here to help you with your ${industry} needs. How may I assist you today?`,
    friendly: `Hi there! 👋 I'm excited to help you today. What can I do for you?`,
    casual: `Hey! What's up? I'm here to help with anything you need.`,
    formal: `Good day. I am here to assist you with your inquiry. How may I be of service?`,
  };
  return greetings[personality] || greetings.professional;
}

function formatIntentLabel(intent: string): string {
  return intent.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function generateIntentNodes(
  intent: string,
  personality: string,
  baseNodeId: string,
  _maxTurns: number,
): ChatbotFlowNode[] {
  const nodes: ChatbotFlowNode[] = [];

  // Response node for this intent
  nodes.push({
    nodeId: baseNodeId,
    type: 'message',
    content: getIntentResponse(intent, personality),
    intent,
    nextNodeId: `${baseNodeId}-followup`,
  });

  // Follow-up node
  nodes.push({
    nodeId: `${baseNodeId}-followup`,
    type: 'question',
    content: 'Is there anything else I can help you with?',
    options: [
      { label: 'Yes, I have another question', nextNodeId: 'intent-detect' },
      { label: "No, that's all for now", nextNodeId: 'end' },
      { label: "I'd like to speak with someone", nextNodeId: 'handoff' },
    ],
  });

  return nodes;
}

function getIntentResponse(intent: string, personality: string): string {
  // Generate appropriate response based on intent and personality
  const responses: Record<string, Record<string, string>> = {
    pricing: {
      professional:
        "I'd be happy to discuss our pricing options. Our rates depend on the scope of services you need.",
      friendly: 'Great question! Let me tell you about our pricing options.',
    },
    services: {
      professional:
        'We offer a comprehensive range of services tailored to your needs.',
      friendly:
        "We've got lots of great services! Let me walk you through them.",
    },
    scheduling: {
      professional:
        'I can help you schedule an appointment. What date and time works best for you?',
      friendly: "Let's get you scheduled! When are you free?",
    },
  };

  return (
    responses[intent]?.[personality] ||
    responses[intent]?.professional ||
    'I can help you with that. Let me provide some information.'
  );
}

function getIndustryFAQs(
  industry: string,
  categories?: string[],
): GeneratedFAQ[] {
  const industryFAQs: Record<string, GeneratedFAQ[]> = {
    legal: [
      {
        question: 'How much does a consultation cost?',
        answer:
          'Initial consultations are typically complimentary or offered at a reduced rate. Specific fees depend on the type of matter and attorney.',
        category: 'Pricing',
        keywords: ['cost', 'consultation', 'fee', 'price'],
      },
      {
        question: 'How long does a typical case take?',
        answer:
          'Case duration varies significantly based on complexity, court schedules, and whether settlement is reached. We can provide estimates after reviewing your specific situation.',
        category: 'Timeline',
        keywords: ['duration', 'timeline', 'how long', 'case length'],
      },
    ],
    consulting: [
      {
        question: 'What industries do you serve?',
        answer:
          'We work with clients across various industries including technology, healthcare, finance, and manufacturing. Our methodologies are adaptable to any business context.',
        category: 'Services',
        keywords: ['industries', 'sectors', 'clients', 'experience'],
      },
      {
        question: 'How do you measure project success?',
        answer:
          'We establish clear KPIs and success metrics at project outset, aligned with your business objectives. Regular progress reviews ensure we stay on track.',
        category: 'Methodology',
        keywords: ['success', 'metrics', 'KPIs', 'measurement'],
      },
    ],
  };

  let faqs = industryFAQs[industry.toLowerCase()] || [];

  if (categories && categories.length > 0) {
    faqs = faqs.filter((faq) =>
      categories.some((c) => c.toLowerCase() === faq.category.toLowerCase()),
    );
  }

  return faqs;
}

function deduplicateFAQs(faqs: GeneratedFAQ[]): GeneratedFAQ[] {
  const seen = new Set<string>();
  return faqs.filter((faq) => {
    const key = faq.question.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
