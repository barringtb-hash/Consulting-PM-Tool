/**
 * Monitoring Assistant Module
 *
 * AI-powered assistant for monitoring queries and diagnostics.
 */

// Types
export * from './monitoring-assistant.types';

// Context Builder
export {
  buildAssistantContext,
  detectIntent,
  getSuggestedQueries,
} from './assistant-context.builder';

// Service
export {
  chat,
  getSuggestions,
  getConversation,
  getUserConversations,
  clearConversation,
} from './monitoring-assistant.service';

// Router
export { default as monitoringAssistantRouter } from './monitoring-assistant.router';
