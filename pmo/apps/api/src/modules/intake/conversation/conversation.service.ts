/**
 * Conversation Service
 *
 * Manages conversational intake sessions with AI-powered chat interface.
 * Handles message processing, entity extraction, and field mapping.
 */

import {
  IntakeConversationStatus,
  IntakeFormStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../../prisma/client';
import { env } from '../../../config/env';

// ============================================================================
// TYPES
// ============================================================================

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  extractedData?: Record<string, unknown>;
  fieldId?: string;
}

export interface StartConversationRequest {
  formSlug: string;
  configId: number;
  submitterEmail?: string;
  submitterName?: string;
}

export interface StartConversationResult {
  conversationId: number;
  submissionId: number;
  accessToken: string;
  greeting: string;
}

export interface SendMessageResult {
  reply: string;
  extractedData?: Record<string, unknown>;
  nextQuestion?: string;
  progress: number;
  isComplete: boolean;
}

export interface ConversationSummary {
  collectedData: Record<string, unknown>;
  missingFields: string[];
  completedFields: string[];
  canSubmit: boolean;
  progress: number;
}

interface FormField {
  id: number;
  name: string;
  label: string;
  type: string;
  isRequired: boolean;
  placeholder?: string | null;
  helpText?: string | null;
  options?: Prisma.JsonValue;
  sortOrder: number;
}

interface FieldOption {
  value: string;
  label: string;
}

// ============================================================================
// CONVERSATION MANAGEMENT
// ============================================================================

/**
 * Start a new conversational intake session
 */
export async function startConversation(
  request: StartConversationRequest,
): Promise<StartConversationResult> {
  const { formSlug, configId, submitterEmail, submitterName } = request;

  // Find the form with fields
  const form = await prisma.intakeForm.findFirst({
    where: {
      configId,
      slug: formSlug,
      status: IntakeFormStatus.PUBLISHED,
    },
    include: {
      fields: {
        orderBy: { sortOrder: 'asc' },
      },
      config: true,
    },
  });

  if (!form) {
    throw new Error('Form not found or inactive');
  }

  // Cast form with fields for type safety
  const formWithFields = form as typeof form & { fields: FormField[] };

  // Generate access token
  const accessToken = generateAccessToken();

  // Create submission in IN_PROGRESS status
  const submission = await prisma.intakeSubmission.create({
    data: {
      configId,
      formId: form.id,
      submitterEmail: submitterEmail || 'pending@conversation.intake',
      submitterName,
      accessToken,
      status: 'IN_PROGRESS',
      formData: {},
    },
  });

  // Create conversation
  const conversation = await prisma.intakeConversation.create({
    data: {
      submissionId: submission.id,
      messages: [],
      completedFields: [],
      status: 'ACTIVE',
      currentFieldId: formWithFields.fields[0]?.name || null,
      aiModel: 'gpt-4o-mini',
    },
  });

  // Generate greeting
  const fields = formWithFields.fields;
  const greeting = await generateGreeting(form.name, fields);

  // Add greeting to conversation
  await addMessageToConversation(conversation.id, {
    role: 'assistant',
    content: greeting,
    timestamp: new Date().toISOString(),
  });

  return {
    conversationId: conversation.id,
    submissionId: submission.id,
    accessToken,
    greeting,
  };
}

/**
 * Process a user message in the conversation
 */
export async function processMessage(
  accessToken: string,
  userMessage: string,
): Promise<SendMessageResult> {
  // Find submission and conversation
  const submission = await prisma.intakeSubmission.findUnique({
    where: { accessToken },
    include: {
      conversation: true,
      form: {
        include: {
          fields: {
            orderBy: { sortOrder: 'asc' },
          },
          config: true,
        },
      },
    },
  });

  if (!submission || !submission.conversation) {
    throw new Error('Conversation not found');
  }

  if (submission.conversation.status !== 'ACTIVE') {
    throw new Error('Conversation is not active');
  }

  const conversation = submission.conversation;
  const fields = submission.form.fields as unknown as FormField[];
  const completedFields = (conversation.completedFields as string[]) || [];
  const currentFieldId = conversation.currentFieldId;

  // Add user message to history
  await addMessageToConversation(conversation.id, {
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString(),
  });

  // Extract data from user message
  const currentField = fields.find((f) => f.name === currentFieldId);
  const extractedData = await extractFieldData(
    userMessage,
    currentField,
    fields,
  );

  // Update form data if extraction successful
  const updatedCompletedFields = [...completedFields];
  if (extractedData && Object.keys(extractedData).length > 0) {
    const existingData = (submission.formData as Record<string, unknown>) || {};
    await prisma.intakeSubmission.update({
      where: { id: submission.id },
      data: {
        formData: { ...existingData, ...extractedData },
        lastSavedAt: new Date(),
      },
    });

    // Mark fields as completed
    for (const fieldName of Object.keys(extractedData)) {
      if (!updatedCompletedFields.includes(fieldName)) {
        updatedCompletedFields.push(fieldName);
      }
    }
  }

  // Find next field to collect
  const nextField = findNextField(fields, updatedCompletedFields);

  // Generate AI response
  const reply = await generateResponse(
    userMessage,
    currentField,
    nextField,
    extractedData,
    fields,
    updatedCompletedFields,
  );

  // Calculate progress
  const requiredFields = fields.filter((f) => f.isRequired);
  const completedRequired = requiredFields.filter((f) =>
    updatedCompletedFields.includes(f.name),
  );
  const progress =
    requiredFields.length > 0
      ? Math.round((completedRequired.length / requiredFields.length) * 100)
      : 100;

  // Check if all required fields are complete
  const isComplete = completedRequired.length === requiredFields.length;

  // Update conversation state
  const newStatus: IntakeConversationStatus = isComplete
    ? 'COMPLETED'
    : 'ACTIVE';
  await prisma.intakeConversation.update({
    where: { id: conversation.id },
    data: {
      currentFieldId: nextField?.name || null,
      completedFields: updatedCompletedFields,
      lastActivityAt: new Date(),
      messageCount: { increment: 2 }, // user + assistant
      status: newStatus,
    },
  });

  // Add assistant response to history
  await addMessageToConversation(conversation.id, {
    role: 'assistant',
    content: reply,
    timestamp: new Date().toISOString(),
    extractedData,
    fieldId: nextField?.name,
  });

  return {
    reply,
    extractedData,
    nextQuestion: nextField ? generateFieldQuestion(nextField) : undefined,
    progress,
    isComplete,
  };
}

/**
 * Get conversation summary
 */
export async function getConversationSummary(
  accessToken: string,
): Promise<ConversationSummary> {
  const submission = await prisma.intakeSubmission.findUnique({
    where: { accessToken },
    include: {
      conversation: true,
      form: {
        include: {
          fields: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  });

  if (!submission || !submission.conversation) {
    throw new Error('Conversation not found');
  }

  const fields = submission.form.fields as unknown as FormField[];
  const completedFields =
    (submission.conversation.completedFields as string[]) || [];
  const collectedData = (submission.formData as Record<string, unknown>) || {};

  const requiredFields = fields.filter((f) => f.isRequired);
  const missingFields = requiredFields
    .filter((f) => !completedFields.includes(f.name))
    .map((f) => f.label);

  const progress =
    requiredFields.length > 0
      ? Math.round(
          (requiredFields.filter((f) => completedFields.includes(f.name))
            .length /
            requiredFields.length) *
            100,
        )
      : 100;

  return {
    collectedData,
    missingFields,
    completedFields,
    canSubmit: missingFields.length === 0,
    progress,
  };
}

/**
 * Pause a conversation
 */
export async function pauseConversation(accessToken: string): Promise<void> {
  const submission = await prisma.intakeSubmission.findUnique({
    where: { accessToken },
    include: { conversation: true },
  });

  if (!submission?.conversation) {
    throw new Error('Conversation not found');
  }

  await prisma.intakeConversation.update({
    where: { id: submission.conversation.id },
    data: { status: 'PAUSED' },
  });
}

/**
 * Resume a paused conversation
 */
export async function resumeConversation(
  accessToken: string,
): Promise<{ greeting: string; progress: number }> {
  const submission = await prisma.intakeSubmission.findUnique({
    where: { accessToken },
    include: {
      conversation: true,
      form: {
        include: {
          fields: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  });

  if (!submission?.conversation) {
    throw new Error('Conversation not found');
  }

  if (submission.conversation.status !== 'PAUSED') {
    throw new Error('Conversation is not paused');
  }

  const fields = submission.form.fields as unknown as FormField[];
  const completedFields =
    (submission.conversation.completedFields as string[]) || [];
  const currentField = fields.find(
    (f) => f.name === submission.conversation!.currentFieldId,
  );

  // Calculate progress
  const requiredFields = fields.filter((f) => f.isRequired);
  const progress =
    requiredFields.length > 0
      ? Math.round(
          (requiredFields.filter((f) => completedFields.includes(f.name))
            .length /
            requiredFields.length) *
            100,
        )
      : 100;

  // Generate resume greeting
  const greeting = currentField
    ? `Welcome back! Let's continue where you left off. ${generateFieldQuestion(currentField)}`
    : "Welcome back! You were almost done. Is there anything else you'd like to add?";

  await prisma.intakeConversation.update({
    where: { id: submission.conversation.id },
    data: {
      status: 'ACTIVE',
      lastActivityAt: new Date(),
    },
  });

  await addMessageToConversation(submission.conversation.id, {
    role: 'assistant',
    content: greeting,
    timestamp: new Date().toISOString(),
  });

  return { greeting, progress };
}

/**
 * Abandon a conversation
 */
export async function abandonConversation(accessToken: string): Promise<void> {
  const submission = await prisma.intakeSubmission.findUnique({
    where: { accessToken },
    include: { conversation: true },
  });

  if (!submission?.conversation) {
    throw new Error('Conversation not found');
  }

  await prisma.intakeConversation.update({
    where: { id: submission.conversation.id },
    data: { status: 'ABANDONED' },
  });

  // Note: We don't have ABANDONED in SubmissionStatus, so we'll leave it as IN_PROGRESS
  // or you could add it to the enum if needed
}

/**
 * Get conversation history
 */
export async function getConversationHistory(
  accessToken: string,
): Promise<ConversationMessage[]> {
  const submission = await prisma.intakeSubmission.findUnique({
    where: { accessToken },
    include: { conversation: true },
  });

  if (!submission?.conversation) {
    throw new Error('Conversation not found');
  }

  const messages = submission.conversation.messages;
  if (!messages || !Array.isArray(messages)) {
    return [];
  }

  return messages as unknown as ConversationMessage[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a unique access token
 */
function generateAccessToken(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'conv_';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Add a message to conversation history
 */
async function addMessageToConversation(
  conversationId: number,
  message: ConversationMessage,
): Promise<void> {
  const conversation = await prisma.intakeConversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) return;

  const existingMessages = conversation.messages;
  const messages: ConversationMessage[] = Array.isArray(existingMessages)
    ? (existingMessages as unknown as ConversationMessage[])
    : [];
  messages.push(message);

  await prisma.intakeConversation.update({
    where: { id: conversationId },
    data: { messages: messages as unknown as Prisma.JsonArray },
  });
}

/**
 * Generate greeting message
 */
async function generateGreeting(
  formName: string,
  fields: FormField[],
): Promise<string> {
  const firstField = fields[0];
  const fieldCount = fields.length;

  let greeting = `Hi! I'm here to help you complete the ${formName}. `;
  greeting += `I'll guide you through ${fieldCount} questions in a conversational way. `;
  greeting += `You can type your answers naturally, and I'll make sure everything is captured correctly.\n\n`;

  if (firstField) {
    greeting += `Let's start! ${generateFieldQuestion(firstField)}`;
  }

  return greeting;
}

/**
 * Parse options from JSON field
 */
function parseOptions(
  options: Prisma.JsonValue | undefined | null,
): FieldOption[] {
  if (!options || !Array.isArray(options)) {
    return [];
  }
  const result: FieldOption[] = [];
  for (const opt of options) {
    if (
      typeof opt === 'object' &&
      opt !== null &&
      'value' in opt &&
      'label' in opt &&
      typeof (opt as Record<string, unknown>).value === 'string' &&
      typeof (opt as Record<string, unknown>).label === 'string'
    ) {
      result.push({
        value: (opt as Record<string, unknown>).value as string,
        label: (opt as Record<string, unknown>).label as string,
      });
    }
  }
  return result;
}

/**
 * Generate a natural question for a field
 */
function generateFieldQuestion(field: FormField): string {
  const isRequired = field.isRequired ? '' : ' (optional)';
  const options = parseOptions(field.options);

  switch (field.type) {
    case 'TEXT':
    case 'TEXTAREA':
      return `${field.label}${isRequired}?`;

    case 'EMAIL':
      return `What's your email address${isRequired}?`;

    case 'PHONE':
      return `What's the best phone number to reach you at${isRequired}?`;

    case 'NUMBER':
      return `${field.label}${isRequired}?`;

    case 'DATE':
      return `${field.label}${isRequired}? (Please provide a date)`;

    case 'SELECT':
    case 'RADIO':
      if (options.length > 0) {
        const optionList = options.map((o) => o.label).join(', ');
        return `${field.label}${isRequired}? Your options are: ${optionList}`;
      }
      return `${field.label}${isRequired}?`;

    case 'MULTISELECT':
    case 'CHECKBOX':
      if (options.length > 0) {
        const optionList = options.map((o) => o.label).join(', ');
        return `${field.label}${isRequired}? You can choose multiple: ${optionList}`;
      }
      return `${field.label}${isRequired}?`;

    case 'ADDRESS':
      return `What's your ${field.label.toLowerCase() || 'address'}${isRequired}?`;

    default:
      return `${field.label}${isRequired}?`;
  }
}

/**
 * Find the next field to collect
 */
function findNextField(
  fields: FormField[],
  completedFields: string[],
): FormField | undefined {
  // First, try required fields
  const nextRequired = fields.find(
    (f) => f.isRequired && !completedFields.includes(f.name),
  );
  if (nextRequired) return nextRequired;

  // Then, optional fields
  return fields.find((f) => !completedFields.includes(f.name));
}

/**
 * Extract field data from user message using AI or rule-based logic
 */
async function extractFieldData(
  message: string,
  currentField: FormField | undefined,
  allFields: FormField[],
): Promise<Record<string, unknown>> {
  // If we have an API key, use AI extraction
  if (env.openaiApiKey) {
    return extractWithAI(message, currentField, allFields);
  }

  // Otherwise, use rule-based extraction
  return extractRuleBased(message, currentField);
}

/**
 * AI-powered entity extraction
 */
async function extractWithAI(
  message: string,
  currentField: FormField | undefined,
  allFields: FormField[],
): Promise<Record<string, unknown>> {
  try {
    const fieldContext = currentField
      ? `Current field being collected: ${currentField.label} (type: ${currentField.type})`
      : 'No specific field is being targeted';

    const allFieldsContext = allFields
      .map((f) => `- ${f.name}: ${f.label} (${f.type})`)
      .join('\n');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 500,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are an entity extraction assistant for a form intake system.
Extract structured data from user messages and map them to form fields.

${fieldContext}

Available fields:
${allFieldsContext}

Return a JSON object with field names as keys and extracted values.
Only include fields where you confidently extracted data.
For dates, use ISO format (YYYY-MM-DD).
For phone numbers, include area code.
For email, validate format.
For multi-select fields, return an array.

Example output: { "full_name": "John Smith", "email": "john@example.com" }`,
          },
          {
            role: 'user',
            content: message,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);

    return parsed;
  } catch (error) {
    console.error('AI extraction error:', error);
    return extractRuleBased(message, currentField);
  }
}

/**
 * Rule-based entity extraction
 */
function extractRuleBased(
  message: string,
  currentField: FormField | undefined,
): Record<string, unknown> {
  if (!currentField) return {};

  const result: Record<string, unknown> = {};
  const trimmed = message.trim();
  const options = parseOptions(currentField.options);

  switch (currentField.type) {
    case 'EMAIL': {
      const emailMatch = trimmed.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) {
        result[currentField.name] = emailMatch[0];
      }
      break;
    }

    case 'PHONE': {
      const phoneMatch = trimmed.replace(/\D/g, '');
      if (phoneMatch.length >= 10) {
        result[currentField.name] = phoneMatch;
      }
      break;
    }

    case 'NUMBER': {
      const numMatch = trimmed.match(/-?\d+\.?\d*/);
      if (numMatch) {
        result[currentField.name] = parseFloat(numMatch[0]);
      }
      break;
    }

    case 'DATE': {
      // Try to parse various date formats
      const datePatterns = [
        /(\d{4})-(\d{2})-(\d{2})/, // ISO
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY
        /(\d{1,2})-(\d{1,2})-(\d{4})/, // MM-DD-YYYY
      ];
      for (const pattern of datePatterns) {
        const match = trimmed.match(pattern);
        if (match) {
          const date = new Date(trimmed);
          if (!isNaN(date.getTime())) {
            result[currentField.name] = date.toISOString().split('T')[0];
            break;
          }
        }
      }
      break;
    }

    case 'SELECT':
    case 'RADIO': {
      if (options.length > 0) {
        const lowerMessage = trimmed.toLowerCase();
        const matchedOption = options.find(
          (opt) =>
            opt.label.toLowerCase() === lowerMessage ||
            opt.value.toLowerCase() === lowerMessage,
        );
        if (matchedOption) {
          result[currentField.name] = matchedOption.value;
        }
      }
      break;
    }

    case 'CHECKBOX': {
      const lowerMessage = trimmed.toLowerCase();
      if (
        lowerMessage === 'yes' ||
        lowerMessage === 'true' ||
        lowerMessage === 'y'
      ) {
        result[currentField.name] = true;
      } else if (
        lowerMessage === 'no' ||
        lowerMessage === 'false' ||
        lowerMessage === 'n'
      ) {
        result[currentField.name] = false;
      }
      break;
    }

    case 'MULTISELECT': {
      if (options.length > 0) {
        const parts = trimmed.split(/[,;]/);
        const selected: string[] = [];
        for (const part of parts) {
          const lowerPart = part.trim().toLowerCase();
          const matched = options.find(
            (opt) =>
              opt.label.toLowerCase() === lowerPart ||
              opt.value.toLowerCase() === lowerPart,
          );
          if (matched) {
            selected.push(matched.value);
          }
        }
        if (selected.length > 0) {
          result[currentField.name] = selected;
        }
      }
      break;
    }

    default:
      // For TEXT and TEXTAREA, just use the message as-is
      if (trimmed.length > 0) {
        result[currentField.name] = trimmed;
      }
  }

  return result;
}

/**
 * Generate AI response based on context
 */
async function generateResponse(
  userMessage: string,
  currentField: FormField | undefined,
  nextField: FormField | undefined,
  extractedData: Record<string, unknown>,
  allFields: FormField[],
  completedFields: string[],
): Promise<string> {
  // If no API key, use template-based responses
  if (!env.openaiApiKey) {
    return generateTemplateResponse(
      currentField,
      nextField,
      extractedData,
      completedFields,
      allFields,
    );
  }

  try {
    const context = buildConversationContext(
      currentField,
      nextField,
      extractedData,
      completedFields,
      allFields,
    );

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 200,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `You are a friendly intake assistant helping someone fill out a form.
Keep responses brief (1-2 sentences) and conversational.
${context}

Guidelines:
- Acknowledge what they said briefly
- If data was extracted, confirm it
- If asking the next question, make it sound natural
- Be warm but professional
- Don't be overly enthusiastic
- If all fields are done, thank them and let them know they can submit`,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Response generation error:', error);
    return generateTemplateResponse(
      currentField,
      nextField,
      extractedData,
      completedFields,
      allFields,
    );
  }
}

/**
 * Build context for AI response generation
 */
function buildConversationContext(
  currentField: FormField | undefined,
  nextField: FormField | undefined,
  extractedData: Record<string, unknown>,
  completedFields: string[],
  allFields: FormField[],
): string {
  const parts: string[] = [];

  if (Object.keys(extractedData).length > 0) {
    const extracted = Object.entries(extractedData)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    parts.push(`Data extracted: ${extracted}`);
  } else if (currentField) {
    parts.push(`Couldn't extract data for: ${currentField.label}`);
  }

  const requiredFields = allFields.filter((f) => f.isRequired);
  const completed = requiredFields.filter((f) =>
    completedFields.includes(f.name),
  );
  parts.push(
    `Progress: ${completed.length}/${requiredFields.length} required fields complete`,
  );

  if (nextField) {
    parts.push(`Next field to ask: ${nextField.label} (${nextField.type})`);
  } else {
    parts.push('All fields have been collected. User can submit the form.');
  }

  return parts.join('\n');
}

/**
 * Generate template-based response (fallback when no AI)
 */
function generateTemplateResponse(
  currentField: FormField | undefined,
  nextField: FormField | undefined,
  extractedData: Record<string, unknown>,
  completedFields: string[],
  allFields: FormField[],
): string {
  const parts: string[] = [];

  // Acknowledge extracted data
  if (Object.keys(extractedData).length > 0) {
    parts.push('Got it, thanks!');
  } else if (currentField) {
    parts.push("I wasn't able to capture that. Could you try again?");
    return parts.join(' ') + ' ' + generateFieldQuestion(currentField);
  }

  // Check completion
  const requiredFields = allFields.filter((f) => f.isRequired);
  const missingRequired = requiredFields.filter(
    (f) => !completedFields.includes(f.name),
  );

  if (missingRequired.length === 0 && !nextField) {
    parts.push(
      "Great, I've got everything I need! You can review your information and submit when you're ready.",
    );
    return parts.join(' ');
  }

  // Ask next question
  if (nextField) {
    parts.push(generateFieldQuestion(nextField));
  }

  return parts.join(' ');
}
