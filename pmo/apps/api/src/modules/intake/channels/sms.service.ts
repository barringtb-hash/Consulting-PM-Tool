/**
 * SMS Intake Service
 *
 * Handles intake form completion via SMS/text messaging.
 * Integrates with conversational intake and form field collection.
 */

import { prisma } from '../../../prisma/client';
import {
  IntakeChannel,
  IncomingIntakeMessage,
  OutgoingIntakeMessage,
  ChannelSession,
  ChannelSessionState,
  IntakeChannelConfig,
  ChannelDeliveryResult,
} from './channel.types';
import { sendSms } from './channel-adapter.service';
import * as conversationService from '../conversation';

// In-memory session store (should be replaced with Redis in production)
const sessions = new Map<string, ChannelSession>();

/**
 * Get or create a session for an SMS sender
 */
export async function getOrCreateSession(
  senderIdentifier: string,
  configId: number,
): Promise<ChannelSession> {
  const sessionKey = `sms:${senderIdentifier}:${configId}`;

  let session = sessions.get(sessionKey);

  if (session && !isSessionExpired(session)) {
    session.lastActivity = new Date();
    return session;
  }

  // Create new session
  session = {
    id: `sms-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    channel: 'SMS',
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
 * Process an incoming SMS message
 */
export async function processIncomingSms(
  message: IncomingIntakeMessage,
  channelConfig: IntakeChannelConfig,
): Promise<OutgoingIntakeMessage> {
  const session = await getOrCreateSession(
    message.senderIdentifier,
    channelConfig.configId,
  );

  try {
    // Handle based on session state
    switch (session.state) {
      case 'AWAITING_START':
        return handleStartState(session, message, channelConfig);

      case 'COLLECTING_EMAIL':
        return handleEmailCollection(session, message, channelConfig);

      case 'COLLECTING_PHONE':
        return handlePhoneCollection(session, message, channelConfig);

      case 'ACTIVE':
        return handleActiveState(session, message, channelConfig);

      case 'COMPLETED':
        return createResponse(
          message.senderIdentifier,
          channelConfig.completionMessage ||
            'Your intake form has been submitted. Thank you!',
        );

      case 'ERROR':
      case 'ABANDONED':
        // Allow restart
        session.state = 'AWAITING_START';
        return handleStartState(session, message, channelConfig);

      default:
        return createResponse(
          message.senderIdentifier,
          channelConfig.errorMessage ||
            'Something went wrong. Please try again.',
        );
    }
  } catch (error) {
    console.error('Error processing SMS:', error);
    session.state = 'ERROR';
    return createResponse(
      message.senderIdentifier,
      channelConfig.errorMessage ||
        'An error occurred. Please try again or visit our website.',
    );
  }
}

/**
 * Handle the initial start state
 */
async function handleStartState(
  session: ChannelSession,
  message: IncomingIntakeMessage,
  channelConfig: IntakeChannelConfig,
): Promise<OutgoingIntakeMessage> {
  // Check for start keywords
  const content = message.content.toLowerCase().trim();
  const startKeywords = ['start', 'begin', 'help', 'intake', 'hi', 'hello', 'hey'];

  if (!startKeywords.some((kw) => content.includes(kw))) {
    return createResponse(
      message.senderIdentifier,
      'Welcome! Reply START to begin the intake process, or HELP for assistance.',
    );
  }

  // Get the first published form for this config
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
      'No intake form is currently available. Please visit our website.',
    );
  }

  session.formId = form.id;

  // Check if we need to collect email first
  if (channelConfig.settings.collectEmailFirst) {
    session.state = 'COLLECTING_EMAIL';
    return createResponse(
      message.senderIdentifier,
      channelConfig.welcomeMessage ||
        "Welcome! Let's get started with your intake form.\n\nPlease enter your email address:",
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
      'That doesn\'t look like a valid email. Please enter a valid email address:',
    );
  }

  session.collectedData.email = email;

  // Get the form
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
      'Form not found. Please try again later.',
    );
  }

  return startConversationalIntake(session, message, channelConfig, form, email);
}

/**
 * Handle phone collection (if separate from SMS sender)
 */
async function handlePhoneCollection(
  session: ChannelSession,
  message: IncomingIntakeMessage,
  channelConfig: IntakeChannelConfig,
): Promise<OutgoingIntakeMessage> {
  const phone = message.content.trim().replace(/\D/g, '');

  if (phone.length < 10) {
    return createResponse(
      message.senderIdentifier,
      'Please enter a valid phone number (at least 10 digits):',
    );
  }

  session.collectedData.phone = phone;
  session.state = 'ACTIVE';

  // Continue with conversation
  return continueConversation(session, 'Phone confirmed', channelConfig);
}

/**
 * Handle active conversation state
 */
async function handleActiveState(
  session: ChannelSession,
  message: IncomingIntakeMessage,
  channelConfig: IntakeChannelConfig,
): Promise<OutgoingIntakeMessage> {
  // Check for special commands
  const content = message.content.toLowerCase().trim();

  if (content === 'stop' || content === 'cancel' || content === 'quit') {
    session.state = 'ABANDONED';
    return createResponse(
      message.senderIdentifier,
      'Intake cancelled. Reply START to begin again.',
    );
  }

  if (content === 'back' || content === 'previous') {
    // Go back to previous field
    if (session.currentFieldIndex > 0) {
      session.currentFieldIndex--;
    }
    return getNextQuestion(session, channelConfig);
  }

  if (content === 'help' || content === '?') {
    return createResponse(
      message.senderIdentifier,
      'Commands:\n' +
        'STOP - Cancel intake\n' +
        'BACK - Previous question\n' +
        'SKIP - Skip optional field\n' +
        'STATUS - Check progress',
    );
  }

  if (content === 'status') {
    const progress = await getProgress(session);
    return createResponse(
      message.senderIdentifier,
      `Progress: ${progress.completed}/${progress.total} fields completed (${progress.percent}%)`,
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
    // Start a new conversation
    const result = await conversationService.startConversation({
      formSlug: form.slug || 'default',
      configId: channelConfig.configId,
      submitterEmail: email,
      submitterName: undefined,
    });

    session.conversationToken = result.accessToken;
    session.submissionId = result.submissionId;
    session.state = 'ACTIVE';

    // Format greeting for SMS (shorter)
    const greeting = formatForSms(result.greeting);

    return createResponse(session.senderIdentifier, greeting);
  } catch (error) {
    console.error('Error starting conversational intake:', error);
    session.state = 'ERROR';
    return createResponse(
      session.senderIdentifier,
      'Unable to start intake. Please try again.',
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
    return createResponse(
      session.senderIdentifier,
      'Session expired. Reply START to begin again.',
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
      return createResponse(
        session.senderIdentifier,
        channelConfig.completionMessage ||
          'Thank you! Your intake form has been submitted. We will be in touch soon.',
      );
    }

    // Format response for SMS
    const response = formatForSms(result.reply);
    const progressText = `(${Math.round(result.progress)}% complete)`;

    return createResponse(
      session.senderIdentifier,
      `${response}\n\n${progressText}`,
    );
  } catch (error) {
    console.error('Error processing conversation:', error);
    return createResponse(
      session.senderIdentifier,
      'I didn\'t understand that. Could you rephrase your answer?',
    );
  }
}

/**
 * Get the next question in the form
 */
async function getNextQuestion(
  session: ChannelSession,
  channelConfig: IntakeChannelConfig,
): Promise<OutgoingIntakeMessage> {
  return continueConversation(session, '[REPEAT LAST QUESTION]', channelConfig);
}

/**
 * Get progress for a session
 */
async function getProgress(
  session: ChannelSession,
): Promise<{ completed: number; total: number; percent: number }> {
  if (!session.conversationToken) {
    return { completed: 0, total: 1, percent: 0 };
  }

  try {
    const summary = await conversationService.getConversationSummary(
      session.conversationToken,
    );
    const total =
      Object.keys(summary.collectedData).length + summary.missingFields.length;
    const completed = Object.keys(summary.collectedData).length;
    return {
      completed,
      total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  } catch {
    return { completed: 0, total: 1, percent: 0 };
  }
}

/**
 * Send an SMS response
 */
export async function sendSmsResponse(
  message: OutgoingIntakeMessage,
  channelConfig: IntakeChannelConfig,
): Promise<ChannelDeliveryResult> {
  if (!channelConfig.credentials) {
    return {
      success: false,
      error: 'No SMS credentials configured',
      timestamp: new Date(),
    };
  }

  return sendSms(message, channelConfig.credentials);
}

/**
 * Handle document received via MMS
 */
export async function handleMmsDocument(
  session: ChannelSession,
  attachment: { url: string; mimeType: string },
  _channelConfig: IntakeChannelConfig,
): Promise<string> {
  // Store the document attachment in the submission
  if (session.submissionId) {
    await prisma.intakeDocument.create({
      data: {
        submissionId: session.submissionId,
        filename: `mms-${Date.now()}`,
        mimeType: attachment.mimeType,
        sizeBytes: 0, // Unknown for MMS
        storageUrl: attachment.url,
        documentType: 'MMS_UPLOAD',
        verificationStatus: 'PENDING',
      },
    });
    return 'Document received and attached to your intake form.';
  }
  return 'Please start the intake process first before sending documents.';
}

/**
 * Cleanup expired sessions
 */
export function cleanupExpiredSessions(): void {
  const now = new Date();
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
    channel: 'SMS',
    recipientIdentifier,
    content,
  };
}

function isSessionExpired(session: ChannelSession): boolean {
  const expiryMs = 30 * 60 * 1000; // 30 minutes
  return Date.now() - session.lastActivity.getTime() > expiryMs;
}

function formatForSms(content: string): string {
  // Remove markdown formatting
  let formatted = content
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/`(.*?)`/g, '$1') // Remove code
    .replace(/\n{3,}/g, '\n\n'); // Reduce multiple newlines

  // Truncate if too long
  if (formatted.length > 1500) {
    formatted = formatted.substring(0, 1497) + '...';
  }

  return formatted;
}

// Start cleanup interval
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);
