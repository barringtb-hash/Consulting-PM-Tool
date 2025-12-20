/**
 * Conversation Flow Templates
 *
 * Industry-specific conversation templates that guide the AI
 * in conducting intake conversations with appropriate tone,
 * terminology, and flow.
 */

import type { IndustryType } from '../../ai';

// ============================================================================
// TYPES
// ============================================================================

export interface ConversationTemplate {
  industry: IndustryType;
  greeting: string;
  tone: string;
  terminology: Record<string, string>;
  commonQuestions: string[];
  sensitiveTopics: string[];
  complianceReminders: string[];
  closingMessage: string;
}

// ============================================================================
// TEMPLATES
// ============================================================================

const legalTemplate: ConversationTemplate = {
  industry: 'legal',
  greeting: `Thank you for reaching out. I'm here to help gather some initial information about your legal matter. Everything you share is confidential and will only be used to help us understand how we can best assist you.`,
  tone: 'Professional, empathetic, and reassuring. Use formal language but remain approachable.',
  terminology: {
    customer: 'client',
    meeting: 'consultation',
    price: 'fee structure',
    contract: 'engagement letter',
    problem: 'legal matter',
    help: 'representation',
  },
  commonQuestions: [
    'What type of legal matter brings you to us today?',
    'When did this issue first arise?',
    'Have you consulted with another attorney about this matter?',
    'Are there any urgent deadlines we should be aware of?',
    'Do you have any relevant documents you can share?',
  ],
  sensitiveTopics: [
    'criminal charges',
    'family disputes',
    'financial difficulties',
    'personal injury details',
    'immigration status',
  ],
  complianceReminders: [
    'This conversation is protected by attorney-client privilege.',
    'We will need to perform a conflict check before proceeding.',
    'Please do not share privileged information from other attorneys.',
  ],
  closingMessage: `Thank you for providing this information. A member of our legal team will review your intake and reach out to schedule a consultation. If you have any urgent concerns, please don't hesitate to call our office directly.`,
};

const healthcareTemplate: ConversationTemplate = {
  industry: 'healthcare',
  greeting: `Welcome! I'm here to help you complete your patient intake. Your privacy and health information are protected, and all data is handled in accordance with HIPAA regulations.`,
  tone: 'Warm, caring, and professional. Use clear, non-technical language when possible.',
  terminology: {
    customer: 'patient',
    meeting: 'appointment',
    price: 'cost',
    issue: 'health concern',
    history: 'medical history',
  },
  commonQuestions: [
    'What is the primary reason for your visit today?',
    'Do you have any allergies to medications?',
    'Are you currently taking any medications?',
    'Do you have a primary care physician?',
    'Is there anything specific you want the provider to know?',
  ],
  sensitiveTopics: [
    'mental health concerns',
    'substance use',
    'reproductive health',
    'chronic conditions',
    'family medical history',
  ],
  complianceReminders: [
    'Your health information is protected under HIPAA.',
    'We will need your consent to share information with other providers.',
    'Emergency contact information is only used in case of emergency.',
  ],
  closingMessage: `Thank you for completing your intake. Please arrive 15 minutes before your scheduled appointment time. If you have any questions or need to reschedule, please contact our office.`,
};

const financialTemplate: ConversationTemplate = {
  industry: 'financial',
  greeting: `Thank you for choosing us for your financial needs. I'll help you provide some information so we can better understand your financial goals and how we can assist you.`,
  tone: 'Professional, trustworthy, and knowledgeable. Be precise with financial terms.',
  terminology: {
    customer: 'client',
    goal: 'financial objective',
    money: 'assets',
    spending: 'expenditure',
    saving: 'wealth accumulation',
  },
  commonQuestions: [
    'What are your primary financial goals?',
    'What is your current investment experience level?',
    'What is your risk tolerance?',
    'Do you have any existing retirement accounts?',
    'What is your expected timeline for achieving these goals?',
  ],
  sensitiveTopics: [
    'income details',
    'debt obligations',
    'tax situation',
    'estate planning',
    'insurance coverage',
  ],
  complianceReminders: [
    'We are required to verify your identity under KYC regulations.',
    'Investment advice requires understanding your complete financial picture.',
    'Past performance does not guarantee future results.',
  ],
  closingMessage: `Thank you for providing your financial information. One of our advisors will review your profile and contact you to discuss personalized recommendations. Please have any relevant financial documents ready for your consultation.`,
};

const consultingTemplate: ConversationTemplate = {
  industry: 'consulting',
  greeting: `Hello! Thank you for your interest in our consulting services. I'll help gather some information about your business needs so we can match you with the right expertise.`,
  tone: 'Professional, solution-oriented, and collaborative. Show understanding of business challenges.',
  terminology: {
    problem: 'challenge',
    fix: 'solution',
    goal: 'objective',
    help: 'partnership',
    meeting: 'discovery session',
  },
  commonQuestions: [
    'What business challenge are you looking to address?',
    'What is your timeline for this initiative?',
    'Have you worked with consultants before?',
    'Who are the key stakeholders involved?',
    'What does success look like for this engagement?',
  ],
  sensitiveTopics: [
    'organizational issues',
    'budget constraints',
    'competitive information',
    'personnel matters',
    'strategic decisions',
  ],
  complianceReminders: [
    'All discussions are confidential.',
    'We will provide an NDA upon request.',
    'Scope and deliverables will be clearly defined in our proposal.',
  ],
  closingMessage: `Thank you for sharing these details. Our team will review your requirements and prepare a customized proposal. We'll be in touch within 2 business days to schedule a discovery session.`,
};

const realEstateTemplate: ConversationTemplate = {
  industry: 'real_estate',
  greeting: `Welcome! I'm excited to help you on your real estate journey. Let me gather some information about what you're looking for so we can find the perfect match.`,
  tone: 'Enthusiastic, helpful, and knowledgeable about the local market.',
  terminology: {
    house: 'property',
    buy: 'purchase',
    sell: 'list',
    meeting: 'showing',
    price: 'listing price',
  },
  commonQuestions: [
    'Are you looking to buy, sell, or both?',
    'What areas are you most interested in?',
    'What is your ideal price range?',
    'How many bedrooms and bathrooms do you need?',
    'What features are most important to you?',
  ],
  sensitiveTopics: [
    'financial situation',
    'reason for moving',
    'pre-approval status',
    'current living situation',
  ],
  complianceReminders: [
    'All property information is subject to verification.',
    'Fair housing laws apply to all transactions.',
    'Please consult with a lender for financing options.',
  ],
  closingMessage: `Great! Based on your preferences, I'll prepare a list of properties for you to review. Our agent will reach out to schedule viewings at your convenience.`,
};

const insuranceTemplate: ConversationTemplate = {
  industry: 'insurance',
  greeting: `Thank you for reaching out about your insurance needs. I'll help gather some information to find the best coverage options for you.`,
  tone: 'Trustworthy, informative, and reassuring. Explain coverage options clearly.',
  terminology: {
    price: 'premium',
    coverage: 'policy',
    payment: 'premium payment',
    claim: 'claim',
  },
  commonQuestions: [
    'What type of insurance are you looking for?',
    'What is your current coverage situation?',
    'Have you filed any claims in the past 5 years?',
    'What is your desired coverage level?',
    'Are there any specific concerns you want addressed?',
  ],
  sensitiveTopics: [
    'health conditions',
    'driving history',
    'claims history',
    'property condition',
    'income verification',
  ],
  complianceReminders: [
    'Accurate information is required for proper coverage.',
    'Policy details will be provided in writing.',
    'Coverage is subject to underwriting approval.',
  ],
  closingMessage: `Thank you for the information. Our agent will prepare personalized quotes and reach out to discuss your options. Please have your current policy documents ready for comparison.`,
};

const generalTemplate: ConversationTemplate = {
  industry: 'general',
  greeting: `Hello! Thank you for your interest. I'll help gather some information so we can better understand how to assist you.`,
  tone: 'Friendly, professional, and helpful.',
  terminology: {},
  commonQuestions: [
    'What can we help you with today?',
    'What is the best way to reach you?',
    'What is your timeline for this project?',
    'Is there anything specific you want us to know?',
  ],
  sensitiveTopics: [],
  complianceReminders: [
    'Your information will be kept confidential.',
    'We will only contact you regarding your inquiry.',
  ],
  closingMessage: `Thank you for providing this information. A member of our team will be in touch shortly to discuss next steps.`,
};

// ============================================================================
// TEMPLATE REGISTRY
// ============================================================================

const TEMPLATES: Record<IndustryType, ConversationTemplate> = {
  legal: legalTemplate,
  healthcare: healthcareTemplate,
  financial: financialTemplate,
  consulting: consultingTemplate,
  real_estate: realEstateTemplate,
  insurance: insuranceTemplate,
  education: generalTemplate, // Use general for now
  technology: generalTemplate,
  retail: generalTemplate,
  manufacturing: generalTemplate,
  hospitality: generalTemplate,
  nonprofit: generalTemplate,
  general: generalTemplate,
};

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Get conversation template for an industry
 */
export function getConversationTemplate(
  industry: IndustryType,
): ConversationTemplate {
  return TEMPLATES[industry] || TEMPLATES.general;
}

/**
 * Get all available templates
 */
export function getAllTemplates(): ConversationTemplate[] {
  return Object.values(TEMPLATES);
}

/**
 * Check if industry has specialized template
 */
export function hasSpecializedTemplate(industry: IndustryType): boolean {
  return industry !== 'general' && TEMPLATES[industry] !== TEMPLATES.general;
}

/**
 * Get appropriate terminology for an industry
 */
export function getTerminology(industry: IndustryType, term: string): string {
  const template = TEMPLATES[industry];
  return template?.terminology[term.toLowerCase()] || term;
}

/**
 * Get sensitive topics for an industry (to handle with care)
 */
export function getSensitiveTopics(industry: IndustryType): string[] {
  return TEMPLATES[industry]?.sensitiveTopics || [];
}

/**
 * Get compliance reminders for an industry
 */
export function getComplianceReminders(industry: IndustryType): string[] {
  return TEMPLATES[industry]?.complianceReminders || [];
}
