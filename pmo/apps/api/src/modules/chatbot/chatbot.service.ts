/**
 * Tool 1.1: Customer Service Chatbot Service
 *
 * Provides AI-powered customer service capabilities including:
 * - Conversational AI with GPT integration
 * - Intent recognition and routing
 * - Knowledge base management
 * - Order tracking and returns processing
 * - Human handoff escalation
 * - Analytics and reporting
 */

import { prisma } from '../../prisma/client';
import { env } from '../../config/env';
import {
  ChatChannel,
  ConversationStatus,
  IntentType,
  Prisma,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

// Timeout for OpenAI API calls (10 seconds)
const OPENAI_TIMEOUT_MS = 10000;

/**
 * Fetch with timeout support.
 * Prevents hanging requests when OpenAI API is slow or unresponsive.
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = OPENAI_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface ChatbotConfigInput {
  name: string;
  welcomeMessage?: string;
  fallbackMessage?: string;
  enableOrderTracking?: boolean;
  enableReturns?: boolean;
  enableFAQ?: boolean;
  enableHumanHandoff?: boolean;
  channelSettings?: Prisma.InputJsonValue;
  businessHours?: Prisma.InputJsonValue;
}

interface MessageInput {
  content: string;
  customerEmail?: string;
  customerName?: string;
  channel?: ChatChannel;
}

interface IntentResult {
  intent: IntentType;
  confidence: number;
  entities?: Record<string, string>;
}

interface BotResponse {
  content: string;
  suggestedActions?: Array<{
    label: string;
    action: string;
    payload?: unknown;
  }>;
  shouldEscalate?: boolean;
  escalationReason?: string;
}

// ============================================================================
// CHATBOT CONFIG MANAGEMENT
// ============================================================================

export async function getChatbotConfig(clientId: number) {
  return prisma.chatbotConfig.findUnique({
    where: { clientId },
    include: {
      client: { select: { id: true, name: true, industry: true } },
    },
  });
}

export async function listChatbotConfigs(filters?: { clientId?: number }) {
  return prisma.chatbotConfig.findMany({
    where: filters?.clientId ? { clientId: filters.clientId } : undefined,
    include: {
      client: { select: { id: true, name: true, industry: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createChatbotConfig(
  clientId: number,
  data: ChatbotConfigInput,
) {
  return prisma.chatbotConfig.create({
    data: {
      clientId,
      ...data,
    },
  });
}

export async function updateChatbotConfig(
  clientId: number,
  data: Partial<ChatbotConfigInput>,
) {
  return prisma.chatbotConfig.update({
    where: { clientId },
    data,
  });
}

// ============================================================================
// CONVERSATION MANAGEMENT
// ============================================================================

export async function createConversation(
  chatbotConfigId: number,
  data: {
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
    channel?: ChatChannel;
  },
) {
  const sessionId = uuidv4();

  const conversation = await prisma.chatConversation.create({
    data: {
      chatbotConfigId,
      sessionId,
      channel: data.channel || 'WEB',
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      status: 'ACTIVE',
    },
  });

  // Add welcome message from bot
  const config = await prisma.chatbotConfig.findUnique({
    where: { id: chatbotConfigId },
  });

  if (config?.welcomeMessage) {
    await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        sender: 'BOT',
        content: config.welcomeMessage,
      },
    });
  }

  return conversation;
}

export async function getConversation(sessionId: string) {
  return prisma.chatConversation.findUnique({
    where: { sessionId },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
      chatbotConfig: true,
    },
  });
}

export async function getConversationsByConfig(
  chatbotConfigId: number,
  options: {
    status?: ConversationStatus;
    limit?: number;
    offset?: number;
  } = {},
) {
  const { status, limit = 50, offset = 0 } = options;

  return prisma.chatConversation.findMany({
    where: {
      chatbotConfigId,
      ...(status && { status }),
    },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

export async function updateConversationStatus(
  sessionId: string,
  status: ConversationStatus,
  additionalData?: {
    escalatedToAgentId?: number;
    escalationReason?: string;
    satisfactionRating?: number;
    satisfactionFeedback?: string;
  },
) {
  return prisma.chatConversation.update({
    where: { sessionId },
    data: {
      status,
      ...(status === 'ESCALATED' && { escalatedAt: new Date() }),
      ...(status === 'CLOSED' && { endedAt: new Date() }),
      ...additionalData,
    },
  });
}

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

export async function processCustomerMessage(
  sessionId: string,
  input: MessageInput,
): Promise<{ message: unknown; response: BotResponse }> {
  // Get conversation and config
  const conversation = await prisma.chatConversation.findUnique({
    where: { sessionId },
    include: { chatbotConfig: true },
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Analyze intent
  const intentResult = await analyzeIntent(
    input.content,
    conversation.chatbotConfigId,
  );

  // Analyze sentiment
  const sentiment = await analyzeSentiment(input.content);

  // Save customer message
  const customerMessage = await prisma.chatMessage.create({
    data: {
      conversationId: conversation.id,
      sender: 'CUSTOMER',
      content: input.content,
      detectedIntent: intentResult.intent,
      intentConfidence: intentResult.confidence,
      sentiment,
    },
  });

  // Generate bot response
  const botResponse = await generateBotResponse(
    conversation,
    input.content,
    intentResult,
  );

  // Save bot response
  await prisma.chatMessage.create({
    data: {
      conversationId: conversation.id,
      sender: 'BOT',
      content: botResponse.content,
      suggestedActions: botResponse.suggestedActions as Prisma.InputJsonValue,
    },
  });

  // Handle escalation if needed
  if (botResponse.shouldEscalate) {
    await updateConversationStatus(sessionId, 'ESCALATED', {
      escalationReason: botResponse.escalationReason,
    });
  }

  // Update conversation status based on context
  await prisma.chatConversation.update({
    where: { id: conversation.id },
    data: {
      updatedAt: new Date(),
      ...(input.customerEmail && { customerEmail: input.customerEmail }),
      ...(input.customerName && { customerName: input.customerName }),
    },
  });

  return { message: customerMessage, response: botResponse };
}

// ============================================================================
// AI INTEGRATION
// ============================================================================

async function analyzeIntent(
  message: string,
  chatbotConfigId: number,
): Promise<IntentResult> {
  // Check knowledge base first for FAQ matches
  const kbMatch = await findKnowledgeBaseMatch(message, chatbotConfigId);
  if (kbMatch) {
    return { intent: 'FAQ', confidence: kbMatch.confidence };
  }

  // Use AI for intent classification if API key is available
  if (env.openaiApiKey) {
    try {
      const response = await fetchWithTimeout(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.openaiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 100,
            temperature: 0.1,
            messages: [
              {
                role: 'system',
                content: `You are an intent classifier for a customer service chatbot. Classify the customer message into one of these intents:
- ORDER_STATUS: Customer wants to check order status or tracking
- RETURN_REQUEST: Customer wants to return an item or process a refund
- PRODUCT_INQUIRY: Customer has questions about products
- FAQ: General frequently asked question
- COMPLAINT: Customer is expressing dissatisfaction
- ESCALATION: Customer explicitly requests human agent
- GENERAL: Other general inquiries

Respond with JSON: {"intent": "INTENT_NAME", "confidence": 0.0-1.0, "entities": {}}`,
              },
              {
                role: 'user',
                content: message,
              },
            ],
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        const result = JSON.parse(data.choices[0].message.content);
        return {
          intent: result.intent as IntentType,
          confidence: result.confidence,
          entities: result.entities,
        };
      } else {
        console.error('OpenAI intent API error:', response.status, response.statusText);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Intent analysis error:', errorMessage);
    }
  }

  // Fallback to rule-based classification
  return classifyIntentRuleBased(message);
}

function classifyIntentRuleBased(message: string): IntentResult {
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes('order') &&
    (lowerMessage.includes('status') ||
      lowerMessage.includes('track') ||
      lowerMessage.includes('where'))
  ) {
    return { intent: 'ORDER_STATUS', confidence: 0.8 };
  }

  if (
    lowerMessage.includes('return') ||
    lowerMessage.includes('refund') ||
    lowerMessage.includes('exchange')
  ) {
    return { intent: 'RETURN_REQUEST', confidence: 0.8 };
  }

  if (
    lowerMessage.includes('speak') ||
    lowerMessage.includes('agent') ||
    lowerMessage.includes('human') ||
    lowerMessage.includes('representative')
  ) {
    return { intent: 'ESCALATION', confidence: 0.9 };
  }

  if (
    lowerMessage.includes('complaint') ||
    lowerMessage.includes('unhappy') ||
    lowerMessage.includes('terrible') ||
    lowerMessage.includes('worst')
  ) {
    return { intent: 'COMPLAINT', confidence: 0.7 };
  }

  if (
    lowerMessage.includes('product') ||
    lowerMessage.includes('item') ||
    lowerMessage.includes('price') ||
    lowerMessage.includes('available')
  ) {
    return { intent: 'PRODUCT_INQUIRY', confidence: 0.6 };
  }

  return { intent: 'GENERAL', confidence: 0.5 };
}

async function analyzeSentiment(message: string): Promise<number> {
  if (env.openaiApiKey) {
    try {
      const response = await fetchWithTimeout(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.openaiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 50,
            temperature: 0.1,
            messages: [
              {
                role: 'system',
                content:
                  'Analyze the sentiment of the following message. Respond with a single number between -1 (very negative) and 1 (very positive).',
              },
              {
                role: 'user',
                content: message,
              },
            ],
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        return parseFloat(data.choices[0].message.content) || 0;
      } else {
        console.error('OpenAI sentiment API error:', response.status, response.statusText);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Sentiment analysis error:', errorMessage);
    }
  }

  // Simple rule-based sentiment
  const lowerMessage = message.toLowerCase();
  if (
    lowerMessage.includes('thank') ||
    lowerMessage.includes('great') ||
    lowerMessage.includes('love')
  ) {
    return 0.5;
  }
  if (
    lowerMessage.includes('hate') ||
    lowerMessage.includes('terrible') ||
    lowerMessage.includes('awful')
  ) {
    return -0.5;
  }
  return 0;
}

async function generateBotResponse(
  conversation: {
    id: number;
    chatbotConfig: {
      name: string;
      enableOrderTracking: boolean;
      enableReturns: boolean;
      enableFAQ: boolean;
      enableHumanHandoff: boolean;
      fallbackMessage: string | null;
    };
  },
  customerMessage: string,
  intentResult: IntentResult,
): Promise<BotResponse> {
  const config = conversation.chatbotConfig;

  // Handle escalation request
  if (intentResult.intent === 'ESCALATION') {
    if (config.enableHumanHandoff) {
      return {
        content:
          "I understand you'd like to speak with a human agent. I'm connecting you now. Please wait while I transfer your conversation.",
        shouldEscalate: true,
        escalationReason: 'Customer requested human agent',
      };
    }
    return {
      content:
        "I apologize, but live agent support is not currently available. Please provide your email and we'll have someone contact you shortly.",
    };
  }

  // Handle FAQ intent - check knowledge base
  if (intentResult.intent === 'FAQ' || intentResult.intent === 'GENERAL') {
    const kbMatch = await findKnowledgeBaseMatch(
      customerMessage,
      conversation.chatbotConfig as unknown as number,
    );
    if (kbMatch) {
      // Increment view count
      await prisma.knowledgeBaseItem.update({
        where: { id: kbMatch.item.id },
        data: { viewCount: { increment: 1 } },
      });
      return {
        content: kbMatch.item.answer,
        suggestedActions: [
          {
            label: 'Was this helpful?',
            action: 'feedback',
            payload: { helpful: true },
          },
          {
            label: 'Not helpful',
            action: 'feedback',
            payload: { helpful: false },
          },
        ],
      };
    }
  }

  // Handle order status
  if (intentResult.intent === 'ORDER_STATUS' && config.enableOrderTracking) {
    return {
      content:
        "I'd be happy to help you track your order! Please provide your order number or the email address used for the order.",
      suggestedActions: [
        {
          label: 'Enter order number',
          action: 'input',
          payload: { field: 'orderNumber' },
        },
      ],
    };
  }

  // Handle return request
  if (intentResult.intent === 'RETURN_REQUEST' && config.enableReturns) {
    return {
      content:
        "I can help you with your return. To get started, please provide your order number and the item(s) you'd like to return.",
      suggestedActions: [
        { label: 'Start return', action: 'startReturn' },
        { label: 'Check return policy', action: 'returnPolicy' },
      ],
    };
  }

  // Handle complaint - potentially escalate
  if (intentResult.intent === 'COMPLAINT') {
    return {
      content:
        "I'm sorry to hear you're having a difficult experience. I want to make sure we address your concerns properly. Would you like me to connect you with a customer service specialist?",
      suggestedActions: [
        { label: 'Yes, connect me', action: 'escalate' },
        { label: "No, I'll continue here", action: 'continue' },
      ],
    };
  }

  // Use AI for complex responses if available
  if (env.openaiApiKey) {
    try {
      const response = await fetchWithTimeout(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.openaiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 300,
            temperature: 0.7,
            messages: [
              {
                role: 'system',
                content: `You are a helpful customer service chatbot for ${config.name}. Be friendly, professional, and concise. If you cannot help with something, offer to connect the customer with a human agent.`,
              },
              {
                role: 'user',
                content: customerMessage,
              },
            ],
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        return {
          content: data.choices[0].message.content,
        };
      } else {
        console.error('OpenAI response API error:', response.status, response.statusText);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Bot response generation error:', errorMessage);
    }
  }

  // Fallback response
  return {
    content:
      config.fallbackMessage ||
      "I'm not quite sure how to help with that. Would you like me to connect you with a team member who can assist you better?",
    suggestedActions: [
      { label: 'Talk to agent', action: 'escalate' },
      { label: 'Ask another question', action: 'continue' },
    ],
  };
}

// ============================================================================
// KNOWLEDGE BASE
// ============================================================================

export async function createKnowledgeBaseItem(
  chatbotConfigId: number,
  data: {
    question: string;
    answer: string;
    keywords?: string[];
    category?: string;
    priority?: number;
  },
) {
  return prisma.knowledgeBaseItem.create({
    data: {
      chatbotConfigId,
      ...data,
    },
  });
}

export async function getKnowledgeBaseItems(
  chatbotConfigId: number,
  options: {
    category?: string;
    isPublished?: boolean;
    search?: string;
  } = {},
) {
  const { category, isPublished, search } = options;

  return prisma.knowledgeBaseItem.findMany({
    where: {
      chatbotConfigId,
      ...(category && { category }),
      ...(isPublished !== undefined && { isPublished }),
      ...(search && {
        OR: [
          { question: { contains: search, mode: 'insensitive' } },
          { answer: { contains: search, mode: 'insensitive' } },
          { keywords: { has: search } },
        ],
      }),
    },
    orderBy: [{ priority: 'desc' }, { viewCount: 'desc' }],
  });
}

export async function updateKnowledgeBaseItem(
  id: number,
  data: {
    question?: string;
    answer?: string;
    keywords?: string[];
    category?: string;
    priority?: number;
    isPublished?: boolean;
  },
) {
  return prisma.knowledgeBaseItem.update({
    where: { id },
    data,
  });
}

export async function deleteKnowledgeBaseItem(id: number) {
  return prisma.knowledgeBaseItem.delete({
    where: { id },
  });
}

async function findKnowledgeBaseMatch(
  message: string,
  chatbotConfigId: number,
): Promise<{
  item: { id: number; answer: string };
  confidence: number;
} | null> {
  const lowerMessage = message.toLowerCase();

  // Get all published knowledge base items
  const items = await prisma.knowledgeBaseItem.findMany({
    where: {
      chatbotConfigId,
      isPublished: true,
    },
  });

  let bestMatch: {
    item: { id: number; answer: string };
    confidence: number;
  } | null = null;
  let bestScore = 0;

  for (const item of items) {
    let score = 0;

    // Check keywords
    for (const keyword of item.keywords) {
      if (lowerMessage.includes(keyword.toLowerCase())) {
        score += 0.3;
      }
    }

    // Check question similarity (simple word overlap)
    const questionWords = item.question.toLowerCase().split(/\s+/);
    const messageWords = lowerMessage.split(/\s+/);
    const overlap = questionWords.filter((w) =>
      messageWords.includes(w),
    ).length;
    score += (overlap / questionWords.length) * 0.7;

    if (score > bestScore && score > 0.3) {
      bestScore = score;
      bestMatch = {
        item: { id: item.id, answer: item.answer },
        confidence: Math.min(score, 1),
      };
    }
  }

  return bestMatch;
}

export async function recordKnowledgeBaseFeedback(
  id: number,
  helpful: boolean,
) {
  return prisma.knowledgeBaseItem.update({
    where: { id },
    data: helpful
      ? { helpfulCount: { increment: 1 } }
      : { notHelpfulCount: { increment: 1 } },
  });
}

// ============================================================================
// ANALYTICS
// ============================================================================

export async function getChatAnalytics(
  chatbotConfigId: number,
  dateRange: { start: Date; end: Date },
) {
  const analytics = await prisma.chatAnalytics.findMany({
    where: {
      chatbotConfigId,
      date: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    },
    orderBy: { date: 'asc' },
  });

  // Calculate summary
  const summary = {
    totalConversations: analytics.reduce(
      (sum, a) => sum + a.totalConversations,
      0,
    ),
    totalMessages: analytics.reduce((sum, a) => sum + a.totalMessages, 0),
    uniqueCustomers: analytics.reduce((sum, a) => sum + a.uniqueCustomers, 0),
    resolvedByBot: analytics.reduce((sum, a) => sum + a.resolvedByBot, 0),
    escalatedToAgent: analytics.reduce((sum, a) => sum + a.escalatedToAgent, 0),
    avgSatisfactionRating:
      analytics.filter((a) => a.avgSatisfactionRating !== null).length > 0
        ? analytics.reduce(
            (sum, a) => sum + (a.avgSatisfactionRating || 0),
            0,
          ) / analytics.filter((a) => a.avgSatisfactionRating !== null).length
        : null,
  };

  return { daily: analytics, summary };
}

export async function updateDailyAnalytics(
  chatbotConfigId: number,
  date: Date,
) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  // Aggregate conversation data
  const conversations = await prisma.chatConversation.findMany({
    where: {
      chatbotConfigId,
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    include: {
      messages: true,
    },
  });

  const totalConversations = conversations.length;
  const totalMessages = conversations.reduce(
    (sum, c) => sum + c.messages.length,
    0,
  );
  const uniqueCustomers = new Set(
    conversations.map((c) => c.customerEmail).filter(Boolean),
  ).size;
  const resolvedByBot = conversations.filter(
    (c) => c.status === 'RESOLVED',
  ).length;
  const escalatedToAgent = conversations.filter(
    (c) => c.status === 'ESCALATED',
  ).length;
  const abandonedByCustomer = conversations.filter(
    (c) => c.status === 'CLOSED',
  ).length;

  const ratings = conversations
    .filter((c) => c.satisfactionRating !== null)
    .map((c) => c.satisfactionRating!);
  const avgSatisfactionRating =
    ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : null;

  // Intent breakdown
  const intentBreakdown: Record<string, number> = {};
  for (const conv of conversations) {
    for (const msg of conv.messages) {
      if (msg.detectedIntent) {
        intentBreakdown[msg.detectedIntent] =
          (intentBreakdown[msg.detectedIntent] || 0) + 1;
      }
    }
  }

  // Channel breakdown
  const channelBreakdown: Record<string, number> = {};
  for (const conv of conversations) {
    channelBreakdown[conv.channel] = (channelBreakdown[conv.channel] || 0) + 1;
  }

  // Upsert analytics record
  return prisma.chatAnalytics.upsert({
    where: {
      chatbotConfigId_date: {
        chatbotConfigId,
        date: startOfDay,
      },
    },
    update: {
      totalConversations,
      totalMessages,
      uniqueCustomers,
      resolvedByBot,
      escalatedToAgent,
      abandonedByCustomer,
      avgSatisfactionRating,
      totalRatings: ratings.length,
      intentBreakdown,
      channelBreakdown,
    },
    create: {
      chatbotConfigId,
      date: startOfDay,
      totalConversations,
      totalMessages,
      uniqueCustomers,
      resolvedByBot,
      escalatedToAgent,
      abandonedByCustomer,
      avgSatisfactionRating,
      totalRatings: ratings.length,
      intentBreakdown,
      channelBreakdown,
    },
  });
}
