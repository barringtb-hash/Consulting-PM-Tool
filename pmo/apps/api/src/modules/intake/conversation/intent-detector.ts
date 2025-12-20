/**
 * Intent Detector Service
 *
 * Detects user intents from natural language messages in conversational intake.
 * Supports both AI-powered and rule-based detection.
 */

import { env } from '../../../config/env';

// ============================================================================
// TYPES
// ============================================================================

export type IntentType =
  | 'provide_information' // User is providing requested information
  | 'ask_question' // User is asking a question
  | 'request_clarification' // User wants clarification on what to provide
  | 'skip_field' // User wants to skip current field
  | 'go_back' // User wants to go back to previous field
  | 'request_help' // User needs help
  | 'confirm' // User is confirming something
  | 'deny' // User is denying/rejecting something
  | 'correction' // User wants to correct a previous answer
  | 'complete' // User wants to complete/submit
  | 'pause' // User wants to pause and come back later
  | 'unknown'; // Unable to determine intent

export interface IntentDetectionResult {
  intent: IntentType;
  confidence: number;
  entities?: Record<string, unknown>;
  suggestedAction?: string;
}

// ============================================================================
// INTENT PATTERNS (Rule-based)
// ============================================================================

const INTENT_PATTERNS: Record<IntentType, RegExp[]> = {
  ask_question: [
    /^(what|how|why|when|where|who|which|can|could|would|is|are|do|does)\b/i,
    /\?$/,
  ],
  request_clarification: [
    /what do you mean/i,
    /i don't understand/i,
    /can you (explain|clarify)/i,
    /what (kind|type) of/i,
    /what should i/i,
    /i'm (confused|not sure)/i,
    /what information/i,
  ],
  skip_field: [
    /skip/i,
    /next question/i,
    /move on/i,
    /i'll (come back|do this) later/i,
    /not (applicable|relevant)/i,
    /n\/a/i,
    /^-$/,
  ],
  go_back: [
    /go back/i,
    /previous question/i,
    /i want to change/i,
    /wait,? (let me|i need to)/i,
    /can i edit/i,
    /wrong answer/i,
  ],
  request_help: [
    /help/i,
    /i need (help|assistance)/i,
    /can you help/i,
    /what (options|choices)/i,
    /show me/i,
    /examples?/i,
  ],
  confirm: [
    /^(yes|yeah|yep|yup|correct|right|exactly|sure|ok|okay|confirm|agreed|absolutely)$/i,
    /^y$/i,
    /that's (right|correct)/i,
    /sounds good/i,
  ],
  deny: [
    /^(no|nope|nah|wrong|incorrect|not right)$/i,
    /^n$/i,
    /that's (wrong|incorrect|not right)/i,
    /i (didn't mean|don't want)/i,
  ],
  correction: [
    /actually/i,
    /i meant/i,
    /let me correct/i,
    /sorry,? (it's|that's)/i,
    /no,? (it's|that's|i meant)/i,
    /wait,? (it's|that's)/i,
  ],
  complete: [
    /i'm done/i,
    /that's (all|everything)/i,
    /finish/i,
    /submit/i,
    /complete/i,
    /ready to (submit|finish)/i,
  ],
  pause: [
    /pause/i,
    /save (and|for) later/i,
    /i'll (come back|finish) later/i,
    /stop (for now|here)/i,
    /need a break/i,
    /resume later/i,
  ],
  provide_information: [], // Default - if no other intent matches
  unknown: [],
};

// ============================================================================
// MAIN DETECTION FUNCTIONS
// ============================================================================

/**
 * Detect intent from a user message
 */
export async function detectIntent(
  message: string,
  context?: {
    currentField?: string;
    previousIntents?: IntentType[];
  },
): Promise<IntentDetectionResult> {
  // First try rule-based detection (faster, no API needed)
  const ruleBasedResult = detectIntentRuleBased(message);

  // If confidence is high, use rule-based result
  if (ruleBasedResult.confidence >= 0.8) {
    return ruleBasedResult;
  }

  // If API key available and confidence is low, try AI detection
  if (env.openaiApiKey && ruleBasedResult.confidence < 0.5) {
    try {
      const aiResult = await detectIntentWithAI(message, context);
      if (aiResult.confidence > ruleBasedResult.confidence) {
        return aiResult;
      }
    } catch (error) {
      console.error('AI intent detection failed:', error);
    }
  }

  return ruleBasedResult;
}

/**
 * Rule-based intent detection
 */
export function detectIntentRuleBased(message: string): IntentDetectionResult {
  const trimmed = message.trim();

  // Check each intent pattern
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    if (intent === 'provide_information' || intent === 'unknown') continue;

    for (const pattern of patterns) {
      if (pattern.test(trimmed)) {
        return {
          intent: intent as IntentType,
          confidence: 0.85,
          suggestedAction: getSuggestedAction(intent as IntentType),
        };
      }
    }
  }

  // Default to provide_information if message has content
  if (trimmed.length > 0) {
    return {
      intent: 'provide_information',
      confidence: 0.7,
      suggestedAction: 'Extract data from message and validate',
    };
  }

  return {
    intent: 'unknown',
    confidence: 0.3,
    suggestedAction: 'Ask user to rephrase or provide more information',
  };
}

/**
 * AI-powered intent detection
 */
async function detectIntentWithAI(
  message: string,
  context?: {
    currentField?: string;
    previousIntents?: IntentType[];
  },
): Promise<IntentDetectionResult> {
  const intentList = Object.keys(INTENT_PATTERNS).filter(
    (i) => i !== 'unknown',
  );
  const contextInfo = context?.currentField
    ? `Current field being asked: ${context.currentField}`
    : 'No specific field context';

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 150,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an intent classifier for a form intake system.
Classify the user's message into one of these intents: ${intentList.join(', ')}

${contextInfo}

Return a JSON object with:
- intent: the detected intent
- confidence: 0-1 confidence score
- entities: any extracted entities (optional)
- suggestedAction: recommended action (optional)

If the user is simply providing information (answering a question), use "provide_information".`,
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

  // Validate intent
  const validIntent = validateIntent(parsed.intent);

  return {
    intent: validIntent,
    confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
    entities: parsed.entities,
    suggestedAction: parsed.suggestedAction || getSuggestedAction(validIntent),
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate and normalize intent string
 */
function validateIntent(intent: string): IntentType {
  const normalized = intent?.toLowerCase().replace(/[^a-z_]/g, '_');
  const validIntents = Object.keys(INTENT_PATTERNS) as IntentType[];

  if (validIntents.includes(normalized as IntentType)) {
    return normalized as IntentType;
  }

  return 'unknown';
}

/**
 * Get suggested action for an intent
 */
function getSuggestedAction(intent: IntentType): string {
  const actions: Record<IntentType, string> = {
    provide_information: 'Extract data from message and proceed',
    ask_question: 'Answer the question and repeat the current field prompt',
    request_clarification: 'Provide clarification and rephrase the question',
    skip_field: 'Mark field as skipped if optional, or explain why required',
    go_back: 'Return to previous field and allow correction',
    request_help: 'Provide help text or examples for current field',
    confirm: 'Proceed with confirmation',
    deny: 'Ask for correct information',
    correction: 'Allow user to provide corrected answer',
    complete: 'Check if all required fields are filled, then complete',
    pause: 'Save progress and pause conversation',
    unknown: 'Ask user to rephrase or provide more information',
  };

  return actions[intent] || 'Process message normally';
}

/**
 * Check if intent indicates user wants to navigate
 */
export function isNavigationIntent(intent: IntentType): boolean {
  return ['skip_field', 'go_back', 'complete', 'pause'].includes(intent);
}

/**
 * Check if intent indicates user needs assistance
 */
export function isAssistanceIntent(intent: IntentType): boolean {
  return ['ask_question', 'request_clarification', 'request_help'].includes(
    intent,
  );
}

/**
 * Check if intent is a confirmation/denial response
 */
export function isConfirmationIntent(intent: IntentType): boolean {
  return ['confirm', 'deny'].includes(intent);
}
