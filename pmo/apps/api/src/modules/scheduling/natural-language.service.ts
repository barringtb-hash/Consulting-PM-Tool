/**
 * Natural Language Booking Service
 *
 * NLU-powered booking interface including:
 * - Intent recognition for booking requests
 * - Entity extraction for dates, times, providers, appointment types
 * - Conversation flow management
 * - Multi-turn dialogue handling
 * - Chatbot integration
 */

import { prisma } from '../../prisma/client';
import * as bookingService from './booking.service';
import * as smartSchedulingService from './smart-scheduling.service';

// ============================================================================
// TYPES
// ============================================================================

export type BookingIntent =
  | 'book_appointment'
  | 'reschedule_appointment'
  | 'cancel_appointment'
  | 'check_availability'
  | 'get_appointment_info'
  | 'list_providers'
  | 'list_appointment_types'
  | 'confirm_booking'
  | 'decline_booking'
  | 'greeting'
  | 'help'
  | 'unknown';

export interface ExtractedEntities {
  date?: Date;
  time?: string;
  dateRange?: { start: Date; end: Date };
  providerId?: number;
  providerName?: string;
  appointmentTypeId?: number;
  appointmentTypeName?: string;
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
  confirmationCode?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
  dayOfWeek?: number;
  duration?: number;
}

export interface IntentClassification {
  intent: BookingIntent;
  confidence: number;
  entities: ExtractedEntities;
  suggestedAction?: string;
}

export interface ConversationState {
  id: string;
  configId: number;
  currentIntent?: BookingIntent;
  collectedEntities: ExtractedEntities;
  missingEntities: string[];
  pendingConfirmation?: {
    slot: Date;
    providerId: number;
    appointmentTypeId?: number;
  };
  history: { role: 'user' | 'assistant'; message: string; timestamp: Date }[];
  createdAt: Date;
  lastUpdatedAt: Date;
}

export interface NLUResponse {
  message: string;
  intent: BookingIntent;
  confidence: number;
  entities: ExtractedEntities;
  suggestedSlots?: {
    slot: Date;
    providerId: number;
    providerName: string;
    score: number;
  }[];
  action?:
    | 'show_slots'
    | 'confirm_booking'
    | 'request_info'
    | 'complete'
    | 'error';
  nextPrompt?: string;
  bookingResult?: {
    success: boolean;
    confirmationCode?: string;
    appointmentId?: number;
    error?: string;
  };
}

// ============================================================================
// INTENT PATTERNS
// ============================================================================

const INTENT_PATTERNS: Record<BookingIntent, RegExp[]> = {
  book_appointment: [
    /\b(book|schedule|make|set up|arrange|reserve)\b.*\b(appointment|visit|session|consultation|meeting)\b/i,
    /\b(i('d| would)? like|i want|can i|could i|need)\b.*\b(book|schedule|appointment)\b/i,
    /\b(available|availability|open)\b.*\b(slots?|times?|appointments?)\b/i,
    /\b(see|visit|meet)\b.*\b(doctor|provider|specialist)\b/i,
  ],
  reschedule_appointment: [
    /\b(reschedule|move|change|postpone|push back|bring forward)\b.*\b(appointment|visit|booking)\b/i,
    /\b(different|another|new)\b.*\b(time|date|slot)\b/i,
    /\bcan('t| not)\b.*\bmake it\b/i,
  ],
  cancel_appointment: [
    /\b(cancel|delete|remove)\b.*\b(appointment|visit|booking)\b/i,
    /\b(don't|do not)\b.*\b(need|want)\b.*\b(appointment)\b/i,
    /\bcall off\b/i,
  ],
  check_availability: [
    /\b(what|when|which)\b.*\b(times?|slots?|availab|open)\b/i,
    /\b(are you|is there|do you have)\b.*\b(open|available|free)\b/i,
    /\bshow\b.*\b(availability|schedule|calendar)\b/i,
  ],
  get_appointment_info: [
    /\b(my|the)\b.*\b(appointment|booking|visit)\b.*\b(details?|info|when|what)\b/i,
    /\b(when|what time)\b.*\b(is|are)\b.*\b(my|the)\b.*\b(appointment)\b/i,
    /\blook up\b.*\b(appointment|booking)\b/i,
    /\bconfirmation\b.*\b(code|number)\b/i,
  ],
  list_providers: [
    /\b(who|which|what)\b.*\b(doctors?|providers?|specialists?|practitioners?)\b/i,
    /\b(list|show|see)\b.*\b(doctors?|providers?|specialists?)\b/i,
    /\bavailable\b.*\b(doctors?|providers?)\b/i,
  ],
  list_appointment_types: [
    /\b(what|which)\b.*\b(types?|kinds?|services?)\b.*\b(appointments?|visits?)\b/i,
    /\b(list|show|see)\b.*\b(services?|appointment types?)\b/i,
    /\bwhat can i book\b/i,
  ],
  confirm_booking: [
    /\b(yes|yeah|yep|sure|ok|okay|confirm|that works|sounds good|perfect)\b/i,
    /\bbook (it|that|this)\b/i,
    /\b(go ahead|proceed)\b/i,
  ],
  decline_booking: [
    /\b(no|nope|nah|cancel|never ?mind|different)\b/i,
    /\b(don't|do not)\b.*\b(book|want)\b/i,
    /\bthat doesn't work\b/i,
  ],
  greeting: [
    /^(hi|hello|hey|good (morning|afternoon|evening)|greetings)\b/i,
    /\b(how are you|how's it going)\b/i,
  ],
  help: [
    /\b(help|assist|support|how do i|what can you do)\b/i,
    /\b(instructions?|guide|tutorial)\b/i,
  ],
  unknown: [],
};

// ============================================================================
// ENTITY EXTRACTION PATTERNS
// ============================================================================

const DATE_PATTERNS = {
  today: /\b(today)\b/i,
  tomorrow: /\b(tomorrow)\b/i,
  dayAfterTomorrow: /\b(day after tomorrow)\b/i,
  nextWeek: /\b(next week)\b/i,
  thisWeek: /\b(this week)\b/i,
  specificDate: /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/,
  monthDay:
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i,
  dayOfWeek:
    /\b(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
};

const TIME_PATTERNS = {
  time12h: /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i,
  time24h: /\b(\d{1,2}):(\d{2})\b/,
  timeOfDay: /\b(morning|afternoon|evening|noon|midday)\b/i,
  approximate:
    /\b(around|about|approximately)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i,
};

// ============================================================================
// CONVERSATION STORE (in-memory for now, could be Redis)
// ============================================================================

const conversationStore = new Map<string, ConversationState>();

function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function getOrCreateConversation(
  conversationId: string | undefined,
  configId: number,
): ConversationState {
  if (conversationId && conversationStore.has(conversationId)) {
    const state = conversationStore.get(conversationId)!;
    state.lastUpdatedAt = new Date();
    return state;
  }

  const newState: ConversationState = {
    id: conversationId || generateConversationId(),
    configId,
    collectedEntities: {},
    missingEntities: [],
    history: [],
    createdAt: new Date(),
    lastUpdatedAt: new Date(),
  };

  conversationStore.set(newState.id, newState);
  return newState;
}

export function clearConversation(conversationId: string): void {
  conversationStore.delete(conversationId);
}

// Cleanup old conversations (run periodically)
export function cleanupOldConversations(maxAgeMinutes: number = 30): number {
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
  let cleaned = 0;

  for (const [id, state] of conversationStore.entries()) {
    if (state.lastUpdatedAt < cutoff) {
      conversationStore.delete(id);
      cleaned++;
    }
  }

  return cleaned;
}

// ============================================================================
// INTENT CLASSIFICATION
// ============================================================================

export function classifyIntent(message: string): IntentClassification {
  let bestIntent: BookingIntent = 'unknown';
  let bestConfidence = 0;

  // Check each intent pattern
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        // Simple confidence based on pattern specificity
        const confidence = 0.7 + Math.min(0.3, pattern.source.length / 100);
        if (confidence > bestConfidence) {
          bestIntent = intent as BookingIntent;
          bestConfidence = confidence;
        }
      }
    }
  }

  // Extract entities
  const entities = extractEntities(message);

  // Boost confidence if relevant entities are found
  if (
    bestIntent === 'book_appointment' &&
    (entities.date || entities.time || entities.providerName)
  ) {
    bestConfidence = Math.min(1, bestConfidence + 0.1);
  }

  return {
    intent: bestIntent,
    confidence: bestConfidence,
    entities,
  };
}

// ============================================================================
// ENTITY EXTRACTION
// ============================================================================

export function extractEntities(message: string): ExtractedEntities {
  const entities: ExtractedEntities = {};

  // Extract dates
  const dateEntity = extractDate(message);
  if (dateEntity) {
    entities.date = dateEntity;
  }

  // Extract times
  const timeEntity = extractTime(message);
  if (timeEntity.time) {
    entities.time = timeEntity.time;
  }
  if (timeEntity.timeOfDay) {
    entities.timeOfDay = timeEntity.timeOfDay;
  }

  // Extract confirmation code
  const confirmationMatch = message.match(/\b([A-Z0-9]{6,10})\b/);
  if (confirmationMatch && /^[A-Z0-9]+$/.test(confirmationMatch[1])) {
    entities.confirmationCode = confirmationMatch[1];
  }

  // Extract email
  const emailMatch = message.match(
    /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/,
  );
  if (emailMatch) {
    entities.patientEmail = emailMatch[1];
  }

  // Extract phone
  const phoneMatch = message.match(
    /\b(\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})\b/,
  );
  if (phoneMatch) {
    entities.patientPhone = phoneMatch[1].replace(/[^\d+]/g, '');
  }

  // Extract duration
  const durationMatch = message.match(/\b(\d+)\s*(min(?:utes?)?|hours?|hr)\b/i);
  if (durationMatch) {
    let duration = parseInt(durationMatch[1]);
    if (/hours?|hr/i.test(durationMatch[2])) {
      duration *= 60;
    }
    entities.duration = duration;
  }

  return entities;
}

function extractDate(message: string): Date | undefined {
  const now = new Date();

  // Today
  if (DATE_PATTERNS.today.test(message)) {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  // Tomorrow
  if (DATE_PATTERNS.tomorrow.test(message)) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return new Date(
      tomorrow.getFullYear(),
      tomorrow.getMonth(),
      tomorrow.getDate(),
    );
  }

  // Day after tomorrow
  if (DATE_PATTERNS.dayAfterTomorrow.test(message)) {
    const dayAfter = new Date(now);
    dayAfter.setDate(dayAfter.getDate() + 2);
    return new Date(
      dayAfter.getFullYear(),
      dayAfter.getMonth(),
      dayAfter.getDate(),
    );
  }

  // Day of week
  const dowMatch = message.match(DATE_PATTERNS.dayOfWeek);
  if (dowMatch) {
    const isNext = !!dowMatch[1];
    const dayName = dowMatch[2].toLowerCase();
    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };
    const targetDay = dayMap[dayName];
    const currentDay = now.getDay();
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0 || isNext) {
      daysToAdd += 7;
    }
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysToAdd);
    return new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
    );
  }

  // Specific date (MM/DD or MM/DD/YYYY)
  const specificMatch = message.match(DATE_PATTERNS.specificDate);
  if (specificMatch) {
    const month = parseInt(specificMatch[1]) - 1;
    const day = parseInt(specificMatch[2]);
    const year = specificMatch[3]
      ? parseInt(specificMatch[3]) < 100
        ? 2000 + parseInt(specificMatch[3])
        : parseInt(specificMatch[3])
      : now.getFullYear();
    return new Date(year, month, day);
  }

  // Month and day (January 15)
  const monthDayMatch = message.match(DATE_PATTERNS.monthDay);
  if (monthDayMatch) {
    const monthNames: Record<string, number> = {
      jan: 0,
      january: 0,
      feb: 1,
      february: 1,
      mar: 2,
      march: 2,
      apr: 3,
      april: 3,
      may: 4,
      jun: 5,
      june: 5,
      jul: 6,
      july: 6,
      aug: 7,
      august: 7,
      sep: 8,
      september: 8,
      oct: 9,
      october: 9,
      nov: 10,
      november: 10,
      dec: 11,
      december: 11,
    };
    const month = monthNames[monthDayMatch[1].toLowerCase()];
    const day = parseInt(monthDayMatch[2]);
    let year = now.getFullYear();
    const tentativeDate = new Date(year, month, day);
    if (tentativeDate < now) {
      year++;
    }
    return new Date(year, month, day);
  }

  return undefined;
}

function extractTime(message: string): {
  time?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
} {
  const result: {
    time?: string;
    timeOfDay?: 'morning' | 'afternoon' | 'evening';
  } = {};

  // 12-hour time
  const time12Match = message.match(TIME_PATTERNS.time12h);
  if (time12Match) {
    let hours = parseInt(time12Match[1]);
    const minutes = time12Match[2] ? parseInt(time12Match[2]) : 0;
    const isPM = time12Match[3].toLowerCase() === 'pm';
    if (isPM && hours !== 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    result.time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  // 24-hour time
  if (!result.time) {
    const time24Match = message.match(TIME_PATTERNS.time24h);
    if (time24Match) {
      const hours = parseInt(time24Match[1]);
      const minutes = parseInt(time24Match[2]);
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        result.time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }
  }

  // Time of day
  const todMatch = message.match(TIME_PATTERNS.timeOfDay);
  if (todMatch) {
    const tod = todMatch[1].toLowerCase();
    if (tod === 'morning') result.timeOfDay = 'morning';
    else if (tod === 'afternoon' || tod === 'noon' || tod === 'midday')
      result.timeOfDay = 'afternoon';
    else if (tod === 'evening') result.timeOfDay = 'evening';
  }

  return result;
}

// ============================================================================
// ENTITY MATCHING (to database records)
// ============================================================================

async function matchProvider(
  configId: number,
  providerName?: string,
): Promise<{ id: number; name: string } | undefined> {
  if (!providerName) return undefined;

  const config = await prisma.schedulingConfig.findUnique({
    where: { id: configId },
    include: { providers: true },
  });

  if (!config) return undefined;

  const normalizedName = providerName.toLowerCase();
  const provider = config.providers.find(
    (p) =>
      p.name.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(p.name.toLowerCase()),
  );

  return provider ? { id: provider.id, name: provider.name } : undefined;
}

async function matchAppointmentType(
  configId: number,
  typeName?: string,
): Promise<{ id: number; name: string; durationMinutes: number } | undefined> {
  if (!typeName) return undefined;

  const config = await prisma.schedulingConfig.findUnique({
    where: { id: configId },
    include: { appointmentTypes: true },
  });

  if (!config) return undefined;

  const normalizedName = typeName.toLowerCase();
  const aptType = config.appointmentTypes.find(
    (t) =>
      t.name.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(t.name.toLowerCase()),
  );

  return aptType
    ? {
        id: aptType.id,
        name: aptType.name,
        durationMinutes: aptType.durationMinutes,
      }
    : undefined;
}

// ============================================================================
// RESPONSE GENERATION
// ============================================================================

function generateGreetingResponse(): string {
  const greetings = [
    "Hello! I'm here to help you book an appointment. What type of appointment are you looking for?",
    'Hi there! I can help you schedule an appointment. Would you like to see available times or do you have a specific date in mind?',
    "Welcome! I'd be happy to help you book an appointment. What can I assist you with today?",
  ];
  return greetings[Math.floor(Math.random() * greetings.length)];
}

function generateHelpResponse(): string {
  return `I can help you with the following:
• Book a new appointment
• Reschedule an existing appointment
• Cancel an appointment
• Check available times
• View your appointment details

Just tell me what you'd like to do, for example: "I'd like to book an appointment for tomorrow at 2pm"`;
}

function generateSlotSuggestionMessage(
  slots: { slot: Date; providerName: string; score: number }[],
): string {
  if (slots.length === 0) {
    return "I couldn't find any available slots matching your criteria. Would you like me to check a different date or time?";
  }

  const slotList = slots
    .slice(0, 5)
    .map((s, i) => {
      const date = s.slot.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
      const time = s.slot.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${i + 1}. ${date} at ${time} with ${s.providerName}`;
    })
    .join('\n');

  return `Here are some available times:\n\n${slotList}\n\nWould you like to book one of these? Just say "book option 1" or tell me if you'd prefer a different time.`;
}

function generateMissingInfoPrompt(missingEntities: string[]): string {
  if (missingEntities.includes('date') && missingEntities.includes('time')) {
    return "When would you like to schedule your appointment? You can say something like 'tomorrow at 2pm' or 'next Monday morning'.";
  }
  if (missingEntities.includes('date')) {
    return 'What date would you like to book? For example, "tomorrow", "next Friday", or "January 15th".';
  }
  if (missingEntities.includes('time')) {
    return 'What time works best for you? You can say a specific time like "2pm" or a preference like "morning" or "afternoon".';
  }
  if (missingEntities.includes('patientName')) {
    return 'May I have your name for the appointment?';
  }
  if (missingEntities.includes('patientEmail')) {
    return "What's the best email address to send your confirmation to?";
  }
  return 'I need a bit more information to complete your booking. What else can you tell me?';
}

// ============================================================================
// MAIN CONVERSATION HANDLER
// ============================================================================

export async function processMessage(
  configId: number,
  message: string,
  conversationId?: string,
): Promise<NLUResponse> {
  // Get or create conversation state
  const state = getOrCreateConversation(conversationId, configId);

  // Add user message to history
  state.history.push({
    role: 'user',
    message,
    timestamp: new Date(),
  });

  // Classify intent and extract entities
  const classification = classifyIntent(message);

  // Merge newly extracted entities with previously collected ones
  state.collectedEntities = {
    ...state.collectedEntities,
    ...classification.entities,
  };

  // Handle different intents
  let response: NLUResponse;

  switch (classification.intent) {
    case 'greeting':
      response = {
        message: generateGreetingResponse(),
        intent: classification.intent,
        confidence: classification.confidence,
        entities: state.collectedEntities,
        action: 'request_info',
      };
      break;

    case 'help':
      response = {
        message: generateHelpResponse(),
        intent: classification.intent,
        confidence: classification.confidence,
        entities: state.collectedEntities,
        action: 'request_info',
      };
      break;

    case 'list_providers':
      response = await handleListProviders(configId, classification);
      break;

    case 'list_appointment_types':
      response = await handleListAppointmentTypes(configId, classification);
      break;

    case 'check_availability':
    case 'book_appointment':
      response = await handleBookingRequest(state, classification);
      break;

    case 'confirm_booking':
      response = await handleConfirmBooking(state);
      break;

    case 'decline_booking':
      state.pendingConfirmation = undefined;
      response = {
        message:
          'No problem. Would you like me to show you different times, or is there anything else I can help you with?',
        intent: classification.intent,
        confidence: classification.confidence,
        entities: state.collectedEntities,
        action: 'request_info',
      };
      break;

    case 'get_appointment_info':
      response = await handleGetAppointmentInfo(
        configId,
        state.collectedEntities,
      );
      break;

    case 'reschedule_appointment':
      response = await handleRescheduleRequest(state, classification);
      break;

    case 'cancel_appointment':
      response = await handleCancelRequest(configId, state.collectedEntities);
      break;

    default:
      // Check if we're in the middle of a booking flow
      if (
        state.currentIntent === 'book_appointment' ||
        state.pendingConfirmation
      ) {
        response = await handleBookingRequest(state, classification);
      } else {
        response = {
          message:
            "I'm not quite sure what you're looking for. Would you like to book an appointment, check availability, or get help with an existing booking?",
          intent: 'unknown',
          confidence: classification.confidence,
          entities: state.collectedEntities,
          action: 'request_info',
        };
      }
  }

  // Add assistant response to history
  state.history.push({
    role: 'assistant',
    message: response.message,
    timestamp: new Date(),
  });

  // Include conversation ID for continuity
  return {
    ...response,
    // Include conversation ID in response for client to maintain state
  };
}

// ============================================================================
// INTENT HANDLERS
// ============================================================================

async function handleListProviders(
  configId: number,
  classification: IntentClassification,
): Promise<NLUResponse> {
  const config = await prisma.schedulingConfig.findUnique({
    where: { id: configId },
    include: { providers: { where: { isActive: true } } },
  });

  if (!config || config.providers.length === 0) {
    return {
      message: "I don't have any providers available to show at the moment.",
      intent: classification.intent,
      confidence: classification.confidence,
      entities: classification.entities,
      action: 'error',
    };
  }

  const providerList = config.providers
    .map((p) => `• ${p.name}${p.title ? ` - ${p.title}` : ''}`)
    .join('\n');

  return {
    message: `Here are our available providers:\n\n${providerList}\n\nWould you like to book with any of them?`,
    intent: classification.intent,
    confidence: classification.confidence,
    entities: classification.entities,
    action: 'request_info',
  };
}

async function handleListAppointmentTypes(
  configId: number,
  classification: IntentClassification,
): Promise<NLUResponse> {
  const config = await prisma.schedulingConfig.findUnique({
    where: { id: configId },
    include: { appointmentTypes: { where: { isActive: true } } },
  });

  if (!config || config.appointmentTypes.length === 0) {
    return {
      message:
        "I don't have any appointment types available to show at the moment.",
      intent: classification.intent,
      confidence: classification.confidence,
      entities: classification.entities,
      action: 'error',
    };
  }

  const typeList = config.appointmentTypes
    .map((t) => `• ${t.name} (${t.durationMinutes} minutes)`)
    .join('\n');

  return {
    message: `Here are the types of appointments we offer:\n\n${typeList}\n\nWhich type would you like to book?`,
    intent: classification.intent,
    confidence: classification.confidence,
    entities: classification.entities,
    action: 'request_info',
  };
}

async function handleBookingRequest(
  state: ConversationState,
  classification: IntentClassification,
): Promise<NLUResponse> {
  state.currentIntent = 'book_appointment';
  const entities = state.collectedEntities;

  // Check what information we still need
  const missingEntities: string[] = [];

  if (!entities.date) {
    missingEntities.push('date');
  }
  if (!entities.time && !entities.timeOfDay) {
    missingEntities.push('time');
  }

  state.missingEntities = missingEntities;

  // If we have date/time, get optimal slots
  if (entities.date || entities.timeOfDay) {
    try {
      const startDate = entities.date || new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + (entities.date ? 1 : 7));

      const optimalSlots = await smartSchedulingService.getOptimalSlots({
        configId: state.configId,
        startDate,
        endDate,
        providerId: entities.providerId,
        appointmentTypeId: entities.appointmentTypeId,
        patientEmail: entities.patientEmail,
        preferences: {
          preferredTimeOfDay: entities.timeOfDay,
        },
        limit: 5,
      });

      if (optimalSlots.length === 0) {
        return {
          message:
            "I couldn't find any available slots for that time. Would you like to try a different date or time?",
          intent: classification.intent,
          confidence: classification.confidence,
          entities,
          action: 'request_info',
          nextPrompt:
            "Try saying something like 'next week' or 'any day in the afternoon'.",
        };
      }

      // Get provider names
      const config = await prisma.schedulingConfig.findUnique({
        where: { id: state.configId },
        include: { providers: true },
      });

      const suggestedSlots = optimalSlots.map((s) => ({
        slot: s.slot,
        providerId: s.providerId,
        providerName:
          config?.providers.find((p) => p.id === s.providerId)?.name ||
          'Provider',
        score: s.score,
      }));

      // Store the first slot as pending confirmation
      state.pendingConfirmation = {
        slot: suggestedSlots[0].slot,
        providerId: suggestedSlots[0].providerId,
        appointmentTypeId: entities.appointmentTypeId,
      };

      return {
        message: generateSlotSuggestionMessage(suggestedSlots),
        intent: classification.intent,
        confidence: classification.confidence,
        entities,
        suggestedSlots,
        action: 'show_slots',
        nextPrompt:
          'Say "yes" or "book option 1" to confirm, or tell me if you prefer a different time.',
      };
    } catch (error) {
      console.error('Error getting optimal slots:', error);
      return {
        message:
          "I'm having trouble checking availability right now. Can you please try again in a moment?",
        intent: classification.intent,
        confidence: classification.confidence,
        entities,
        action: 'error',
      };
    }
  }

  // Need more information
  return {
    message: generateMissingInfoPrompt(missingEntities),
    intent: classification.intent,
    confidence: classification.confidence,
    entities,
    action: 'request_info',
  };
}

async function handleConfirmBooking(
  state: ConversationState,
): Promise<NLUResponse> {
  if (!state.pendingConfirmation) {
    return {
      message:
        "I don't have a slot selected for confirmation. Would you like me to show you available times?",
      intent: 'confirm_booking',
      confidence: 0.5,
      entities: state.collectedEntities,
      action: 'request_info',
    };
  }

  const entities = state.collectedEntities;

  // Check if we have required patient info
  if (!entities.patientName) {
    state.missingEntities = ['patientName'];
    return {
      message:
        "Great! I just need a few details to complete your booking. What's your name?",
      intent: 'confirm_booking',
      confidence: 0.9,
      entities,
      action: 'request_info',
    };
  }

  if (!entities.patientEmail && !entities.patientPhone) {
    state.missingEntities = ['patientEmail'];
    return {
      message:
        "Thanks! What's the best email address or phone number to send your confirmation to?",
      intent: 'confirm_booking',
      confidence: 0.9,
      entities,
      action: 'request_info',
    };
  }

  // Get booking page for this config
  const bookingPage = await prisma.bookingPage.findFirst({
    where: {
      configId: state.configId,
      isActive: true,
    },
  });

  if (!bookingPage) {
    return {
      message:
        "I'm sorry, I can't complete the booking right now. Please try again later or contact us directly.",
      intent: 'confirm_booking',
      confidence: 0.9,
      entities,
      action: 'error',
    };
  }

  try {
    const result = await bookingService.createPublicBooking(bookingPage.slug, {
      scheduledAt: state.pendingConfirmation.slot,
      providerId: state.pendingConfirmation.providerId,
      appointmentTypeId: state.pendingConfirmation.appointmentTypeId,
      patientName: entities.patientName!,
      patientEmail: entities.patientEmail,
      patientPhone: entities.patientPhone,
    });

    // Clear the conversation state
    state.pendingConfirmation = undefined;
    state.currentIntent = undefined;
    state.collectedEntities = {};

    const date = result.appointment.scheduledAt.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const time = result.appointment.scheduledAt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return {
      message: `Your appointment is confirmed!

📅 ${date} at ${time}
📋 Confirmation code: ${result.confirmationCode}

You'll receive a confirmation ${entities.patientEmail ? 'email' : 'text'} shortly. Is there anything else I can help you with?`,
      intent: 'confirm_booking',
      confidence: 1.0,
      entities,
      action: 'complete',
      bookingResult: {
        success: true,
        confirmationCode: result.confirmationCode,
        appointmentId: result.appointment.id,
      },
    };
  } catch (error) {
    console.error('Failed to create booking:', error);
    return {
      message:
        "I'm sorry, I couldn't complete your booking. The slot may no longer be available. Would you like me to show you other available times?",
      intent: 'confirm_booking',
      confidence: 0.9,
      entities,
      action: 'error',
      bookingResult: {
        success: false,
        error: error instanceof Error ? error.message : 'Booking failed',
      },
    };
  }
}

async function handleGetAppointmentInfo(
  configId: number,
  entities: ExtractedEntities,
): Promise<NLUResponse> {
  if (!entities.confirmationCode) {
    return {
      message:
        "I can look up your appointment for you. What's your confirmation code? It should be in your confirmation email or text.",
      intent: 'get_appointment_info',
      confidence: 0.9,
      entities,
      action: 'request_info',
    };
  }

  try {
    const appointment = await bookingService.getAppointmentByConfirmationCode(
      entities.confirmationCode,
    );

    if (!appointment) {
      return {
        message: `I couldn't find an appointment with confirmation code ${entities.confirmationCode}. Please double-check the code and try again.`,
        intent: 'get_appointment_info',
        confidence: 0.9,
        entities,
        action: 'error',
      };
    }

    const date = appointment.scheduledAt.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const time = appointment.scheduledAt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return {
      message: `Here are your appointment details:

📅 ${date} at ${time}
👤 ${appointment.provider?.name || 'Provider TBD'}
⏱️ ${appointment.durationMinutes} minutes
📋 Status: ${appointment.status}

Would you like to reschedule or cancel this appointment?`,
      intent: 'get_appointment_info',
      confidence: 1.0,
      entities,
      action: 'complete',
    };
  } catch (error) {
    console.error('Error getting appointment:', error);
    return {
      message:
        "I'm having trouble looking up your appointment right now. Please try again in a moment.",
      intent: 'get_appointment_info',
      confidence: 0.9,
      entities,
      action: 'error',
    };
  }
}

async function handleRescheduleRequest(
  state: ConversationState,
  classification: IntentClassification,
): Promise<NLUResponse> {
  const entities = state.collectedEntities;

  if (!entities.confirmationCode) {
    return {
      message:
        "I can help you reschedule. What's your confirmation code? You can find it in your confirmation email or text.",
      intent: classification.intent,
      confidence: classification.confidence,
      entities,
      action: 'request_info',
    };
  }

  // If we have a new date/time, proceed with reschedule
  if (entities.date) {
    try {
      const appointment = await bookingService.rescheduleByConfirmationCode(
        entities.confirmationCode,
        entities.date,
      );

      const date = appointment.scheduledAt.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      });
      const time = appointment.scheduledAt.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      return {
        message: `Your appointment has been rescheduled to ${date} at ${time}. You'll receive an updated confirmation shortly. Is there anything else I can help you with?`,
        intent: classification.intent,
        confidence: 1.0,
        entities,
        action: 'complete',
      };
    } catch (error) {
      return {
        message: `I couldn't reschedule your appointment: ${error instanceof Error ? error.message : 'Unknown error'}. Would you like to try a different time?`,
        intent: classification.intent,
        confidence: 0.9,
        entities,
        action: 'error',
      };
    }
  }

  return {
    message:
      'When would you like to reschedule to? You can say a date like "next Tuesday" or "January 20th".',
    intent: classification.intent,
    confidence: classification.confidence,
    entities,
    action: 'request_info',
  };
}

async function handleCancelRequest(
  configId: number,
  entities: ExtractedEntities,
): Promise<NLUResponse> {
  if (!entities.confirmationCode) {
    return {
      message:
        "I can help you cancel your appointment. What's your confirmation code?",
      intent: 'cancel_appointment',
      confidence: 0.9,
      entities,
      action: 'request_info',
    };
  }

  try {
    await bookingService.cancelByConfirmationCode(entities.confirmationCode);

    return {
      message:
        "Your appointment has been cancelled. If you'd like to book a new appointment, just let me know!",
      intent: 'cancel_appointment',
      confidence: 1.0,
      entities,
      action: 'complete',
    };
  } catch (error) {
    return {
      message: `I couldn't cancel your appointment: ${error instanceof Error ? error.message : 'Unknown error'}. Please contact us directly for assistance.`,
      intent: 'cancel_appointment',
      confidence: 0.9,
      entities,
      action: 'error',
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { matchProvider, matchAppointmentType, generateConversationId };
