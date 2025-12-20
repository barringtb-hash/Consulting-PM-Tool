/**
 * WhatsApp Intake Service
 *
 * Handles intake form completion via WhatsApp messaging.
 * Supports rich messaging features like buttons and quick replies.
 */

import { prisma } from '../../../prisma/client';
import {
  IncomingIntakeMessage,
  OutgoingIntakeMessage,
  ChannelSession,
  IntakeChannelConfig,
  ChannelDeliveryResult,
  IntakeButton,
} from './channel.types';
import { sendWhatsApp } from './channel-adapter.service';
import * as conversationService from '../conversation';

// In-memory session store (should be replaced with Redis in production)
const sessions = new Map<string, ChannelSession>();

// WhatsApp-specific message templates
const WHATSAPP_TEMPLATES = {
  welcome: {
    id: 'intake_welcome',
    components: [
      {
        type: 'body',
        text: "Hello! I'm here to help you complete our intake form. This should only take a few minutes.",
      },
      {
        type: 'buttons',
        buttons: [
          { type: 'reply', id: 'start', title: 'Start Intake' },
          { type: 'reply', id: 'help', title: 'Need Help' },
        ],
      },
    ],
  },
  progress: {
    id: 'intake_progress',
    text: 'Progress: {{1}}% complete\n\nNext: {{2}}',
  },
  completion: {
    id: 'intake_complete',
    text: '✅ Your intake form has been submitted successfully!\n\nReference: {{1}}\n\nWe will be in touch within {{2}} business days.',
  },
};

/**
 * Get or create a session for a WhatsApp sender
 */
export async function getOrCreateSession(
  senderIdentifier: string,
  configId: number,
): Promise<ChannelSession> {
  const sessionKey = `whatsapp:${senderIdentifier}:${configId}`;

  let session = sessions.get(sessionKey);

  if (session && !isSessionExpired(session)) {
    session.lastActivity = new Date();
    return session;
  }

  // Create new session
  session = {
    id: `wa-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    channel: 'WHATSAPP',
    senderIdentifier,
    configId,
    state: 'AWAITING_START',
    collectedData: {},
    currentFieldIndex: 0,
    lastActivity: new Date(),
    createdAt: new Date(),
  };

  sessions.set(sessionKey, session);
  return session;
}

/**
 * Process an incoming WhatsApp message
 */
export async function processIncomingWhatsApp(
  message: IncomingIntakeMessage,
  channelConfig: IntakeChannelConfig,
): Promise<OutgoingIntakeMessage> {
  const session = await getOrCreateSession(
    message.senderIdentifier,
    channelConfig.configId,
  );

  try {
    // Check for button/quick reply responses
    const buttonResponse = parseButtonResponse(message);

    // Handle based on session state
    switch (session.state) {
      case 'AWAITING_START':
        return handleStartState(session, message, channelConfig, buttonResponse);

      case 'COLLECTING_EMAIL':
        return handleEmailCollection(session, message, channelConfig);

      case 'ACTIVE':
        return handleActiveState(session, message, channelConfig, buttonResponse);

      case 'COMPLETED':
        return createResponse(
          message.senderIdentifier,
          channelConfig.completionMessage ||
            '✅ Your intake form has already been submitted. Thank you!',
        );

      case 'ERROR':
      case 'ABANDONED':
        session.state = 'AWAITING_START';
        return handleStartState(session, message, channelConfig, buttonResponse);

      default:
        return createResponse(
          message.senderIdentifier,
          channelConfig.errorMessage ||
            'Something went wrong. Please try again.',
        );
    }
  } catch (error) {
    console.error('Error processing WhatsApp message:', error);
    session.state = 'ERROR';
    return createResponse(
      message.senderIdentifier,
      channelConfig.errorMessage ||
        'An error occurred. Please try again or visit our website.',
    );
  }
}

/**
 * Parse button/quick reply response from message
 */
function parseButtonResponse(message: IncomingIntakeMessage): string | null {
  const metadata = message.metadata as Record<string, unknown> | undefined;

  // Check for button callback
  if (metadata?.button_payload) {
    return metadata.button_payload as string;
  }

  // Check for quick reply
  if (metadata?.quick_reply_payload) {
    return metadata.quick_reply_payload as string;
  }

  return null;
}

/**
 * Handle the initial start state
 */
async function handleStartState(
  session: ChannelSession,
  message: IncomingIntakeMessage,
  channelConfig: IntakeChannelConfig,
  buttonResponse: string | null,
): Promise<OutgoingIntakeMessage> {
  const content = (buttonResponse || message.content).toLowerCase().trim();

  // Check for start keywords
  const startKeywords = ['start', 'begin', 'intake', 'start intake', 'hi', 'hello', 'hey'];
  const helpKeywords = ['help', 'info', 'need help', '?'];

  if (helpKeywords.some((kw) => content.includes(kw))) {
    return createResponseWithButtons(
      message.senderIdentifier,
      '📋 *Intake Form Help*\n\n' +
        "I'll guide you through our intake form step by step. You can:\n\n" +
        "• Reply with your answers\n" +
        "• Send documents/images when asked\n" +
        "• Type 'back' to go to previous question\n" +
        "• Type 'stop' to cancel\n\n" +
        'Ready to start?',
      [
        { type: 'reply', text: 'Start Now', payload: 'start' },
        { type: 'reply', text: 'Contact Us', payload: 'contact' },
      ],
    );
  }

  if (!startKeywords.some((kw) => content.includes(kw))) {
    return createResponseWithButtons(
      message.senderIdentifier,
      channelConfig.welcomeMessage ||
        "👋 Welcome! I'm here to help you complete our intake form.\n\nThis should only take a few minutes.",
      [
        { type: 'reply', text: 'Start Intake', payload: 'start' },
        { type: 'reply', text: 'Need Help', payload: 'help' },
      ],
    );
  }

  // Get the first published form
  const form = await prisma.intakeForm.findFirst({
    where: {
      configId: channelConfig.configId,
      status: 'PUBLISHED',
    },
    include: {
      fields: {
        orderBy: [{ pageNumber: 'asc' }, { sortOrder: 'asc' }],
      },
    },
  });

  if (!form || form.fields.length === 0) {
    return createResponse(
      message.senderIdentifier,
      '❌ No intake form is currently available. Please visit our website or contact us directly.',
    );
  }

  session.formId = form.id;

  // Check if we need to collect email first
  if (channelConfig.settings.collectEmailFirst) {
    session.state = 'COLLECTING_EMAIL';
    return createResponse(
      message.senderIdentifier,
      "Great! Let's get started. 📝\n\nFirst, please enter your email address:",
    );
  }

  // Start the conversational intake
  return startConversationalIntake(session, message, channelConfig, form);
}

/**
 * Handle email collection
 */
async function handleEmailCollection(
  session: ChannelSession,
  message: IncomingIntakeMessage,
  channelConfig: IntakeChannelConfig,
): Promise<OutgoingIntakeMessage> {
  const email = message.content.trim().toLowerCase();

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return createResponse(
      message.senderIdentifier,
      "❌ That doesn't look like a valid email.\n\nPlease enter a valid email address:",
    );
  }

  session.collectedData.email = email;

  const form = await prisma.intakeForm.findUnique({
    where: { id: session.formId },
    include: {
      fields: {
        orderBy: [{ pageNumber: 'asc' }, { sortOrder: 'asc' }],
      },
    },
  });

  if (!form) {
    session.state = 'ERROR';
    return createResponse(
      message.senderIdentifier,
      '❌ Form not found. Please try again later.',
    );
  }

  return startConversationalIntake(session, message, channelConfig, form, email);
}

/**
 * Handle active conversation state
 */
async function handleActiveState(
  session: ChannelSession,
  message: IncomingIntakeMessage,
  channelConfig: IntakeChannelConfig,
  buttonResponse: string | null,
): Promise<OutgoingIntakeMessage> {
  const content = (buttonResponse || message.content).toLowerCase().trim();

  // Handle special commands
  if (content === 'stop' || content === 'cancel' || content === 'quit') {
    session.state = 'ABANDONED';
    return createResponseWithButtons(
      message.senderIdentifier,
      '❌ Intake cancelled.\n\nYour progress has been saved. Would you like to continue later?',
      [
        { type: 'reply', text: 'Start Again', payload: 'start' },
        { type: 'reply', text: 'Contact Us', payload: 'contact' },
      ],
    );
  }

  if (content === 'back' || content === 'previous') {
    if (session.currentFieldIndex > 0) {
      session.currentFieldIndex--;
    }
    return continueConversation(session, '[GO BACK]', channelConfig);
  }

  if (content === 'help' || content === '?') {
    return createResponseWithQuickReplies(
      message.senderIdentifier,
      '📋 *Quick Commands*\n\n' +
        '• *stop* - Cancel intake\n' +
        '• *back* - Previous question\n' +
        '• *skip* - Skip optional field\n\n' +
        'Just continue answering to proceed.',
      ['Continue', 'Cancel', 'Help'],
    );
  }

  // Handle document attachments
  if (message.attachments && message.attachments.length > 0) {
    const attachment = message.attachments[0];
    const documentMessage = await handleDocument(session, attachment);

    // Continue conversation after document handling
    const continueResponse = await continueConversation(
      session,
      `[DOCUMENT UPLOADED: ${attachment.type}]`,
      channelConfig,
    );

    return createResponse(
      message.senderIdentifier,
      `${documentMessage}\n\n${continueResponse.content}`,
    );
  }

  // Process through conversational intake
  return continueConversation(session, message.content, channelConfig);
}

/**
 * Start conversational intake
 */
async function startConversationalIntake(
  session: ChannelSession,
  _message: IncomingIntakeMessage,
  channelConfig: IntakeChannelConfig,
  form: { id: number; slug: string | null },
  email?: string,
): Promise<OutgoingIntakeMessage> {
  try {
    const result = await conversationService.startConversation({
      formSlug: form.slug || 'default',
      configId: channelConfig.configId,
      submitterEmail: email,
      submitterName: undefined,
    });

    session.conversationToken = result.accessToken;
    session.submissionId = result.submissionId;
    session.state = 'ACTIVE';

    // Format greeting for WhatsApp (can be longer than SMS)
    const greeting = formatForWhatsApp(result.greeting);

    return createResponse(session.senderIdentifier, greeting);
  } catch (error) {
    console.error('Error starting WhatsApp intake:', error);
    session.state = 'ERROR';
    return createResponse(
      session.senderIdentifier,
      '❌ Unable to start intake. Please try again.',
    );
  }
}

/**
 * Continue an active conversation
 */
async function continueConversation(
  session: ChannelSession,
  userMessage: string,
  channelConfig: IntakeChannelConfig,
): Promise<OutgoingIntakeMessage> {
  if (!session.conversationToken) {
    session.state = 'ERROR';
    return createResponseWithButtons(
      session.senderIdentifier,
      '⏰ Session expired. Would you like to start again?',
      [
        { type: 'reply', text: 'Start Again', payload: 'start' },
        { type: 'reply', text: 'Contact Us', payload: 'contact' },
      ],
    );
  }

  try {
    const result = await conversationService.processMessage(
      session.conversationToken,
      userMessage,
    );

    // Check if completed
    if (result.isComplete) {
      session.state = 'COMPLETED';

      // Get submission reference
      const submission = session.submissionId
        ? await prisma.intakeSubmission.findUnique({
            where: { id: session.submissionId },
            select: { accessToken: true },
          })
        : null;

      const reference = submission?.accessToken?.substring(0, 8) || 'N/A';

      return createResponse(
        session.senderIdentifier,
        channelConfig.completionMessage ||
          `✅ *Intake Form Submitted*\n\n` +
            `Reference: ${reference}\n\n` +
            `Thank you for completing our intake form! We will review your information and be in touch soon.`,
      );
    }

    // Format response for WhatsApp
    const response = formatForWhatsApp(result.reply);
    const progress = Math.round(result.progress);

    // Add progress indicator
    const progressBar = getProgressBar(progress);

    return createResponse(
      session.senderIdentifier,
      `${response}\n\n${progressBar} ${progress}%`,
    );
  } catch (error) {
    console.error('Error processing WhatsApp conversation:', error);
    return createResponse(
      session.senderIdentifier,
      "🤔 I didn't quite understand that. Could you rephrase your answer?",
    );
  }
}

/**
 * Handle document attachment
 */
async function handleDocument(
  session: ChannelSession,
  attachment: { url: string; mimeType?: string; type: string },
): Promise<string> {
  if (!session.submissionId) {
    return '📎 Please start the intake first before sending documents.';
  }

  try {
    await prisma.intakeDocument.create({
      data: {
        submissionId: session.submissionId,
        filename: `whatsapp-${Date.now()}.${getExtension(attachment.mimeType || '')}`,
        mimeType: attachment.mimeType || 'application/octet-stream',
        sizeBytes: 0,
        storageUrl: attachment.url,
        documentType: 'WHATSAPP_UPLOAD',
        verificationStatus: 'PENDING',
      },
    });

    return '📎 Document received and attached to your intake form.';
  } catch (error) {
    console.error('Error saving WhatsApp document:', error);
    return '⚠️ Could not save document. Please try again.';
  }
}

/**
 * Send a WhatsApp response
 */
export async function sendWhatsAppResponse(
  message: OutgoingIntakeMessage,
  channelConfig: IntakeChannelConfig,
): Promise<ChannelDeliveryResult> {
  if (!channelConfig.credentials) {
    return {
      success: false,
      error: 'No WhatsApp credentials configured',
      timestamp: new Date(),
    };
  }

  return sendWhatsApp(message, channelConfig.credentials);
}

/**
 * Cleanup expired sessions
 */
export function cleanupExpiredSessions(): void {
  for (const [key, session] of sessions) {
    if (isSessionExpired(session)) {
      sessions.delete(key);
    }
  }
}

// Helper functions

function createResponse(
  recipientIdentifier: string,
  content: string,
): OutgoingIntakeMessage {
  return {
    channel: 'WHATSAPP',
    recipientIdentifier,
    content,
  };
}

function createResponseWithButtons(
  recipientIdentifier: string,
  content: string,
  buttons: IntakeButton[],
): OutgoingIntakeMessage {
  return {
    channel: 'WHATSAPP',
    recipientIdentifier,
    content,
    buttons,
  };
}

function createResponseWithQuickReplies(
  recipientIdentifier: string,
  content: string,
  quickReplies: string[],
): OutgoingIntakeMessage {
  return {
    channel: 'WHATSAPP',
    recipientIdentifier,
    content,
    quickReplies,
  };
}

function isSessionExpired(session: ChannelSession): boolean {
  const expiryMs = 60 * 60 * 1000; // 1 hour for WhatsApp (longer than SMS)
  return Date.now() - session.lastActivity.getTime() > expiryMs;
}

function formatForWhatsApp(content: string): string {
  // WhatsApp supports some markdown-like formatting
  // Bold: *text*, Italic: _text_, Strikethrough: ~text~
  let formatted = content
    .replace(/\*\*(.*?)\*\*/g, '*$1*') // Convert markdown bold to WhatsApp bold
    .replace(/\n{3,}/g, '\n\n');

  // WhatsApp has 4096 char limit
  if (formatted.length > 4000) {
    formatted = formatted.substring(0, 3997) + '...';
  }

  return formatted;
}

function getProgressBar(percent: number): string {
  const filled = Math.round(percent / 10);
  const empty = 10 - filled;
  return '▓'.repeat(filled) + '░'.repeat(empty);
}

function getExtension(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  };
  return mimeToExt[mimeType] || 'bin';
}

// Start cleanup interval
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);
