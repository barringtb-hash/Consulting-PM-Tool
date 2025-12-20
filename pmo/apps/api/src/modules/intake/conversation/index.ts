/**
 * Conversation Module Exports
 *
 * Central export point for conversational intake features.
 */

// Conversation Service
export {
  startConversation,
  processMessage,
  getConversationSummary,
  pauseConversation,
  resumeConversation,
  abandonConversation,
  getConversationHistory,
  type ConversationMessage,
  type StartConversationRequest,
  type StartConversationResult,
  type SendMessageResult,
  type ConversationSummary,
} from './conversation.service';

// Intent Detection
export {
  detectIntent,
  detectIntentRuleBased,
  isNavigationIntent,
  isAssistanceIntent,
  isConfirmationIntent,
  type IntentType,
  type IntentDetectionResult,
} from './intent-detector';

// Conversation Templates
export {
  getConversationTemplate,
  getAllTemplates,
  hasSpecializedTemplate,
  getTerminology,
  getSensitiveTopics,
  getComplianceReminders,
  type ConversationTemplate,
} from './templates';
