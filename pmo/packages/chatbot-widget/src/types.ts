/**
 * PMO Chatbot Widget Types
 */

export interface ChatbotConfig {
  /** The base URL of your PMO API */
  apiUrl: string;
  /** Your chatbot configuration ID */
  configId: number;
}

export interface WidgetConfig extends ChatbotConfig {
  /** Widget position on the page */
  position?: 'bottom-right' | 'bottom-left';
  /** Primary brand color (hex) */
  primaryColor?: string;
  /** Text color on primary elements (hex) */
  textColor?: string;
  /** Widget title displayed in header */
  title?: string;
  /** Subtitle displayed below title */
  subtitle?: string;
  /** Custom avatar image URL */
  avatarUrl?: string;
  /** Theme mode */
  theme?: 'light' | 'dark';
  /** Initial open state */
  defaultOpen?: boolean;
  /** Callback when widget opens */
  onOpen?: () => void;
  /** Callback when widget closes */
  onClose?: () => void;
  /** Callback when a message is sent */
  onMessageSent?: (message: string) => void;
  /** Callback when a message is received */
  onMessageReceived?: (message: ChatMessage) => void;
  /** Custom CSS class name */
  className?: string;
  /** Z-index for the widget */
  zIndex?: number;
}

export interface ChatWindowConfig extends ChatbotConfig {
  /** Window width */
  width?: string | number;
  /** Window height */
  height?: string | number;
  /** Theme mode */
  theme?: 'light' | 'dark';
  /** Custom CSS class name */
  className?: string;
  /** Callback when a message is sent */
  onMessageSent?: (message: string) => void;
  /** Callback when a message is received */
  onMessageReceived?: (message: ChatMessage) => void;
}

export interface ChatMessage {
  id: number;
  sender: 'CUSTOMER' | 'BOT' | 'AGENT';
  content: string;
  createdAt: string;
  detectedIntent?: string;
  intentConfidence?: number;
  sentiment?: number;
  suggestedActions?: SuggestedAction[];
}

export interface SuggestedAction {
  label: string;
  action: string;
  payload?: unknown;
}

export interface Conversation {
  id: number;
  sessionId: string;
  status: ConversationStatus;
  messages: ChatMessage[];
}

export type ConversationStatus =
  | 'ACTIVE'
  | 'WAITING_CUSTOMER'
  | 'WAITING_AGENT'
  | 'ESCALATED'
  | 'RESOLVED'
  | 'CLOSED';

export interface UseChatbotOptions extends ChatbotConfig {
  /** Auto-start conversation when hook mounts */
  autoStart?: boolean;
  /** Customer information to attach to conversation */
  customerInfo?: {
    email?: string;
    name?: string;
    phone?: string;
  };
}

export interface UseChatbotReturn {
  /** Current conversation session ID */
  sessionId: string | null;
  /** All messages in the conversation */
  messages: ChatMessage[];
  /** Whether a message is being sent/received */
  isLoading: boolean;
  /** Error if any */
  error: Error | null;
  /** Send a message */
  sendMessage: (content: string) => Promise<void>;
  /** Start a new conversation */
  startConversation: () => Promise<void>;
  /** End the current conversation */
  endConversation: () => Promise<void>;
  /** Suggested actions from the last bot response */
  suggestedActions: SuggestedAction[];
}
