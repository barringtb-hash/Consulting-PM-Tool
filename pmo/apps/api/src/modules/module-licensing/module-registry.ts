/**
 * Module Registry
 *
 * Defines all available modules in the CRM platform with their
 * licensing tiers, default limits, and feature sets.
 */

import type { LicensedModuleDefinition } from './licensing.types';

/**
 * Complete registry of all licensable modules
 */
export const MODULE_REGISTRY: Record<string, LicensedModuleDefinition> = {
  // ============================================================================
  // CORE MODULES (always enabled, no licensing required)
  // ============================================================================
  'crm-core': {
    id: 'crm-core',
    name: 'CRM Core',
    description: 'Accounts, Contacts, Opportunities, Activities',
    category: 'core',
    tier: 'core',
    defaultLimits: {
      accounts: -1, // -1 = unlimited
      contacts: -1,
      opportunities: -1,
      activities: -1,
    },
    features: [
      'account_management',
      'contact_management',
      'opportunity_pipeline',
      'activity_tracking',
      'basic_reporting',
    ],
  },

  // ============================================================================
  // PREMIUM AI MODULES
  // ============================================================================
  'ai-chatbot': {
    id: 'ai-chatbot',
    name: 'AI Chatbot',
    description:
      'Customer-facing chatbot with intent detection and knowledge base',
    category: 'ai',
    tier: 'premium',
    defaultLimits: {
      conversations: 1000,
      messagesPerConversation: 50,
      knowledgeBaseItems: 500,
      activeWidgets: 5,
    },
    features: [
      'multi_channel_support',
      'intent_detection',
      'sentiment_analysis',
      'knowledge_base',
      'webhook_integration',
      'analytics_dashboard',
    ],
    pricing: {
      monthly: 99,
      yearly: 990,
      currency: 'USD',
    },
  },
  'ai-document-analyzer': {
    id: 'ai-document-analyzer',
    name: 'Document Analyzer',
    description: 'Extract data from documents using AI with OCR and NER',
    category: 'ai',
    tier: 'premium',
    defaultLimits: {
      documentsPerMonth: 100,
      pagesPerDocument: 50,
      customTemplates: 10,
      batchJobs: 20,
    },
    features: [
      'ocr_extraction',
      'ner_detection',
      'custom_templates',
      'batch_processing',
      'compliance_checking',
      'integrations',
    ],
    pricing: {
      monthly: 149,
      yearly: 1490,
      currency: 'USD',
    },
  },
  'ai-lead-scoring': {
    id: 'ai-lead-scoring',
    name: 'AI Lead Scoring',
    description: 'ML-based lead prioritization with predictive analytics',
    category: 'ai',
    tier: 'premium',
    defaultLimits: {
      scoredLeadsPerMonth: 1000,
      customModels: 3,
      nurturSequences: 10,
    },
    features: [
      'ml_scoring',
      'predictive_analytics',
      'custom_models',
      'nurture_sequences',
      'crm_sync',
    ],
    pricing: {
      monthly: 79,
      yearly: 790,
      currency: 'USD',
    },
  },
  'ai-content-generator': {
    id: 'ai-content-generator',
    name: 'Content Generator',
    description: 'AI-powered content generation with brand voice training',
    category: 'ai',
    tier: 'premium',
    defaultLimits: {
      contentPiecesPerMonth: 200,
      brandVoiceProfiles: 5,
      templates: 20,
    },
    features: [
      'multi_format_content',
      'brand_voice_training',
      'template_library',
      'approval_workflows',
      'publishing_integration',
    ],
    pricing: {
      monthly: 89,
      yearly: 890,
      currency: 'USD',
    },
  },
  'ai-email-assistant': {
    id: 'ai-email-assistant',
    name: 'Email AI',
    description: 'Smart compose and email insights for sales teams',
    category: 'ai',
    tier: 'premium',
    defaultLimits: {
      emailsPerMonth: 500,
      emailTemplates: 50,
      sequenceSteps: 10,
    },
    features: [
      'smart_compose',
      'email_insights',
      'template_library',
      'sequence_automation',
      'ab_testing',
    ],
    pricing: {
      monthly: 59,
      yearly: 590,
      currency: 'USD',
    },
  },
  'ai-scheduling': {
    id: 'ai-scheduling',
    name: 'AI Scheduling',
    description: 'Intelligent scheduling with no-show prediction',
    category: 'ai',
    tier: 'premium',
    defaultLimits: {
      appointmentsPerMonth: 500,
      calendarsIntegrated: 5,
      reminderChannels: 3,
    },
    features: [
      'smart_scheduling',
      'no_show_prediction',
      'calendar_integration',
      'automated_reminders',
      'buffer_management',
    ],
    pricing: {
      monthly: 49,
      yearly: 490,
      currency: 'USD',
    },
  },

  // ============================================================================
  // ENTERPRISE AI MODULES
  // ============================================================================
  'ai-forecasting': {
    id: 'ai-forecasting',
    name: 'Revenue Forecasting',
    description: 'Predictive analytics for revenue and pipeline forecasting',
    category: 'ai',
    tier: 'enterprise',
    defaultLimits: {
      forecastModels: -1,
      historicalDataYears: 5,
      customMetrics: 20,
    },
    features: [
      'ml_forecasting',
      'scenario_modeling',
      'custom_metrics',
      'board_reporting',
      'integration_api',
    ],
    pricing: {
      monthly: 299,
      yearly: 2990,
      currency: 'USD',
    },
  },
  'ai-predictive-maintenance': {
    id: 'ai-predictive-maintenance',
    name: 'Predictive Maintenance',
    description: 'IoT-integrated failure prediction and maintenance scheduling',
    category: 'ai',
    tier: 'enterprise',
    defaultLimits: {
      equipment: 100,
      sensors: 500,
      alertsPerDay: -1,
    },
    features: [
      'iot_integration',
      'anomaly_detection',
      'failure_prediction',
      'work_order_management',
      'spare_parts_optimization',
    ],
    pricing: {
      monthly: 399,
      yearly: 3990,
      currency: 'USD',
    },
  },

  // ============================================================================
  // PMO MODULE (Optional Add-on)
  // ============================================================================
  pmo: {
    id: 'pmo',
    name: 'Project Management',
    description: 'Projects, Tasks, Milestones, Meetings with AI insights',
    category: 'pmo',
    tier: 'premium',
    defaultLimits: {
      projects: 50,
      tasksPerProject: 500,
      milestones: 200,
      teamMembers: 25,
    },
    features: [
      'project_management',
      'task_kanban',
      'milestone_tracking',
      'meeting_notes',
      'action_item_extraction',
      'resource_planning',
    ],
    pricing: {
      monthly: 69,
      yearly: 690,
      currency: 'USD',
    },
  },

  // ============================================================================
  // INTEGRATION MODULES
  // ============================================================================
  'integration-salesforce': {
    id: 'integration-salesforce',
    name: 'Salesforce Sync',
    description: 'Bidirectional Salesforce integration with field mapping',
    category: 'integration',
    tier: 'enterprise',
    defaultLimits: {
      syncRecordsPerDay: 10000,
      customMappings: 50,
      webhookEvents: -1,
    },
    features: [
      'bidirectional_sync',
      'field_mapping',
      'conflict_resolution',
      'real_time_webhooks',
      'bulk_operations',
    ],
    pricing: {
      monthly: 199,
      yearly: 1990,
      currency: 'USD',
    },
  },
  'integration-hubspot': {
    id: 'integration-hubspot',
    name: 'HubSpot Sync',
    description: 'Bidirectional HubSpot CRM integration',
    category: 'integration',
    tier: 'premium',
    defaultLimits: {
      syncRecordsPerDay: 5000,
      customMappings: 30,
      webhookEvents: -1,
    },
    features: [
      'bidirectional_sync',
      'field_mapping',
      'contact_sync',
      'deal_sync',
      'activity_sync',
    ],
    pricing: {
      monthly: 99,
      yearly: 990,
      currency: 'USD',
    },
  },
  'integration-gmail': {
    id: 'integration-gmail',
    name: 'Gmail Integration',
    description: 'Gmail email tracking and sync',
    category: 'integration',
    tier: 'premium',
    defaultLimits: {
      emailsPerDay: 1000,
      trackingEvents: -1,
    },
    features: [
      'email_sync',
      'email_tracking',
      'template_insertion',
      'calendar_sync',
    ],
    pricing: {
      monthly: 29,
      yearly: 290,
      currency: 'USD',
    },
  },
  'integration-slack': {
    id: 'integration-slack',
    name: 'Slack Integration',
    description: 'Slack notifications and commands',
    category: 'integration',
    tier: 'premium',
    defaultLimits: {
      notificationsPerDay: -1,
      channels: 10,
    },
    features: [
      'notifications',
      'slash_commands',
      'deal_alerts',
      'activity_updates',
    ],
    pricing: {
      monthly: 19,
      yearly: 190,
      currency: 'USD',
    },
  },
  'integration-zapier': {
    id: 'integration-zapier',
    name: 'Zapier Integration',
    description: 'Connect with 5000+ apps via Zapier',
    category: 'integration',
    tier: 'premium',
    defaultLimits: {
      triggersPerDay: 1000,
      actionsPerDay: 1000,
    },
    features: ['triggers', 'actions', 'multi_step_zaps', 'custom_webhooks'],
    pricing: {
      monthly: 39,
      yearly: 390,
      currency: 'USD',
    },
  },

  // ============================================================================
  // ANALYTICS MODULES
  // ============================================================================
  'analytics-advanced': {
    id: 'analytics-advanced',
    name: 'Advanced Analytics',
    description: 'Custom dashboards and advanced reporting',
    category: 'analytics',
    tier: 'premium',
    defaultLimits: {
      customDashboards: 20,
      savedReports: 50,
      scheduledReports: 20,
      dataExportsPerMonth: 100,
    },
    features: [
      'custom_dashboards',
      'report_builder',
      'scheduled_reports',
      'data_export',
      'team_leaderboards',
    ],
    pricing: {
      monthly: 79,
      yearly: 790,
      currency: 'USD',
    },
  },
};

/**
 * Get module definition by ID
 */
export function getModuleDefinition(
  moduleId: string,
): LicensedModuleDefinition | undefined {
  return MODULE_REGISTRY[moduleId];
}

/**
 * Get all modules in a category
 */
export function getModulesByCategory(
  category: string,
): LicensedModuleDefinition[] {
  return Object.values(MODULE_REGISTRY).filter((m) => m.category === category);
}

/**
 * Get all modules by tier
 */
export function getModulesByTier(
  tier: 'core' | 'premium' | 'enterprise',
): LicensedModuleDefinition[] {
  return Object.values(MODULE_REGISTRY).filter((m) => m.tier === tier);
}

/**
 * Get default limits for a module
 */
export function getDefaultLimits(
  moduleId: string,
  tier: 'TRIAL' | 'BASIC' | 'PREMIUM' | 'ENTERPRISE',
): Record<string, number> {
  const module = MODULE_REGISTRY[moduleId];
  if (!module) return {};

  // Apply tier multipliers to default limits
  const multipliers: Record<string, number> = {
    TRIAL: 0.1,
    BASIC: 1,
    PREMIUM: 3,
    ENTERPRISE: -1, // -1 signals unlimited
  };

  const multiplier = multipliers[tier];
  const limits: Record<string, number> = {};

  for (const [key, value] of Object.entries(module.defaultLimits)) {
    if (value === -1 || multiplier === -1) {
      limits[key] = -1; // Unlimited
    } else {
      limits[key] = Math.floor(value * multiplier);
    }
  }

  return limits;
}

/**
 * Check if a module requires enterprise tier
 */
export function isEnterpriseModule(moduleId: string): boolean {
  const module = MODULE_REGISTRY[moduleId];
  return module?.tier === 'enterprise';
}

/**
 * Get all available module IDs
 */
export function getAllModuleIds(): string[] {
  return Object.keys(MODULE_REGISTRY);
}
