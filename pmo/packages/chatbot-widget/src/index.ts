/**
 * @pmo/chatbot-widget
 *
 * React components and hooks for embedding PMO Chatbot.
 *
 * @example
 * ```tsx
 * import { ChatWidget, ChatWindow, useChatbot } from '@pmo/chatbot-widget';
 *
 * // Floating widget
 * <ChatWidget apiUrl="https://api.example.com" configId={123} />
 *
 * // Embedded window
 * <ChatWindow apiUrl="https://api.example.com" configId={123} />
 *
 * // Custom implementation with hook
 * const { messages, sendMessage } = useChatbot({
 *   apiUrl: "https://api.example.com",
 *   configId: 123,
 *   autoStart: true,
 * });
 * ```
 */

// Components
export { ChatWidget } from './ChatWidget';
export type { ChatWidgetProps } from './ChatWidget';

export { ChatWindow } from './ChatWindow';
export type { ChatWindowProps } from './ChatWindow';

// Hooks
export { useChatbot } from './useChatbot';

// Types
export type {
  ChatbotConfig,
  WidgetConfig,
  ChatWindowConfig,
  ChatMessage,
  SuggestedAction,
  Conversation,
  ConversationStatus,
  UseChatbotOptions,
  UseChatbotReturn,
} from './types';
