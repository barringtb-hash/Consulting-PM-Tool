/**
 * Module Configuration System
 *
 * This package defines the available modules and their configuration.
 * Modules can be enabled/disabled per customer deployment via environment variables.
 *
 * Usage:
 * - Frontend: import { modules, isModuleEnabled } from '@pmo/modules'
 * - Backend: import { modules, isModuleEnabled } from '@pmo/modules'
 */

/**
 * Module identifiers - used as keys in configuration
 */
export type ModuleId =
  // Core modules (always enabled)
  | 'dashboard'
  | 'tasks'
  | 'clients'
  | 'projects'
  // Toggleable modules
  | 'assets'
  | 'marketing'
  | 'socialPublishing'
  | 'contentCalendar'
  | 'leads'
  | 'pipeline'
  | 'admin'
  | 'tenantAdmin'
  // CRM modules
  | 'crm'
  | 'crmAccounts'
  | 'crmOpportunities'
  | 'crmContacts'
  // Customer Success Platform
  | 'customerSuccess'
  // MCP Integration module
  | 'mcp'
  // Phase 1 AI Tool modules
  | 'chatbot'
  | 'productDescriptions'
  | 'scheduling'
  | 'intake'
  // Phase 2 AI Tool modules
  | 'documentAnalyzer'
  | 'contentGenerator'
  | 'leadScoring'
  | 'priorAuth'
  // Phase 3 AI Tool modules
  | 'inventoryForecasting'
  | 'complianceMonitor'
  | 'predictiveMaintenance'
  | 'revenueManagement'
  | 'safetyMonitor'
  // Infrastructure modules (INF.1, INF.2, INF.3)
  | 'coreInfrastructure'
  | 'aiMlInfrastructure'
  | 'iotInfrastructure'
  // Compliance modules (COMP.1, COMP.2, COMP.3)
  | 'healthcareCompliance'
  | 'financialCompliance'
  | 'generalCompliance'
  // Demo modules
  | 'demoAITools'
  | 'demoMarketing'
  // Finance Tracking module
  | 'financeTracking'
  | 'financeExpenses'
  | 'financeBudgets'
  | 'financeRecurringCosts'
  // Bug Tracking module
  | 'bugTracking'
  // AI Projects module
  | 'aiProjects'
  // Project ML module
  | 'projectML';

/**
 * Navigation group identifiers
 */
export type NavGroup =
  | 'overview'
  | 'crm'
  | 'projects'
  | 'customerSuccess'
  | 'marketing'
  | 'aiTools'
  | 'infrastructure'
  | 'compliance'
  | 'finance'
  | 'admin'
  | 'demo';

/**
 * Module definition with metadata
 */
export interface ModuleDefinition {
  /** Unique module identifier */
  id: ModuleId;
  /** Display name for the module */
  label: string;
  /** Navigation group this module belongs to */
  navGroup: NavGroup;
  /** Primary route path */
  path: string;
  /** Additional routes this module handles */
  additionalPaths?: string[];
  /** Icon name (from lucide-react) */
  icon: string;
  /** Whether this is a core module that cannot be disabled */
  isCore: boolean;
  /** Module dependencies - other modules that must be enabled */
  dependencies?: ModuleId[];
  /** API endpoint prefixes this module uses */
  apiPrefixes?: string[];
  /** Description of the module */
  description: string;
  /** Whether to show this module in navigation sidebar (defaults to true) */
  showInNavigation?: boolean;
}

/**
 * Complete module definitions
 * This is the source of truth for all modules in the system
 */
export const MODULE_DEFINITIONS: Record<ModuleId, ModuleDefinition> = {
  // ============ CORE MODULES (cannot be disabled) ============
  dashboard: {
    id: 'dashboard',
    label: 'Dashboard',
    navGroup: 'overview',
    path: '/dashboard',
    additionalPaths: ['/'],
    icon: 'LayoutDashboard',
    isCore: true,
    apiPrefixes: [],
    description: 'Main dashboard with overview metrics and quick actions',
  },
  tasks: {
    id: 'tasks',
    label: 'My Tasks',
    navGroup: 'overview',
    path: '/tasks',
    icon: 'CheckSquare',
    isCore: true,
    dependencies: ['projects'],
    apiPrefixes: ['/api/tasks'],
    description: 'Personal task management and tracking',
  },
  clients: {
    id: 'clients',
    label: 'Clients',
    navGroup: 'projects',
    path: '/clients',
    additionalPaths: ['/clients/:clientId', '/client-intake'],
    icon: 'Users',
    isCore: true,
    apiPrefixes: ['/api/clients', '/api/documents'],
    description: 'Legacy client management - redirects to CRM Accounts',
    showInNavigation: false, // Hidden - redirects to CRM Accounts
  },
  projects: {
    id: 'projects',
    label: 'Projects',
    navGroup: 'projects',
    path: '/projects',
    additionalPaths: ['/projects/new', '/projects/:id', '/meetings/:id'],
    icon: 'FolderKanban',
    isCore: true,
    dependencies: ['clients'],
    apiPrefixes: [
      '/api/projects',
      '/api/milestones',
      '/api/meetings',
      '/api/ai-projects', // AI features (absorbed from aiProjects module)
    ],
    description:
      'Project management with AI-powered insights, ML predictions, milestones, and meetings',
  },

  // ============ TOGGLEABLE MODULES ============
  assets: {
    id: 'assets',
    label: 'Assets',
    navGroup: 'projects',
    path: '/assets',
    icon: 'FileText',
    isCore: false,
    apiPrefixes: ['/api/assets'],
    description: 'AI-generated assets and content library',
  },
  marketing: {
    id: 'marketing',
    label: 'Marketing',
    navGroup: 'marketing',
    path: '/marketing',
    additionalPaths: ['/social-publishing', '/content-calendar'],
    icon: 'Megaphone',
    isCore: false,
    dependencies: ['clients', 'projects'],
    apiPrefixes: [
      '/api/marketing-contents',
      '/api/campaigns',
      '/api/brand-profiles',
      '/api/publishing-connections',
      '/api/social-publishing',
      '/api/content-ml',
    ],
    description:
      'Marketing content creation, campaigns, social publishing, and content calendar',
  },
  socialPublishing: {
    id: 'socialPublishing',
    label: 'Social Publishing',
    navGroup: 'marketing',
    path: '/social-publishing',
    icon: 'Share2',
    isCore: false,
    dependencies: ['marketing'],
    apiPrefixes: ['/api/social-publishing'],
    description:
      'Create, schedule, and publish content across social media platforms',
    showInNavigation: false, // Hidden - consolidated into Marketing module
  },
  contentCalendar: {
    id: 'contentCalendar',
    label: 'Content Calendar',
    navGroup: 'marketing',
    path: '/content-calendar',
    icon: 'Calendar',
    isCore: false,
    dependencies: ['marketing'],
    apiPrefixes: ['/api/marketing-contents'],
    description:
      'Visual calendar for scheduling and managing marketing content with drag-and-drop',
    showInNavigation: false, // Hidden - consolidated into Marketing module
  },
  leads: {
    id: 'leads',
    label: 'Inbound Leads',
    navGroup: 'crm',
    path: '/crm/leads',
    icon: 'UserCheck',
    isCore: false,
    dependencies: ['crm'],
    apiPrefixes: [
      '/api/leads',
      '/api/public/leads',
      '/api/public/inbound-leads',
    ],
    description:
      'Inbound lead capture, qualification, and conversion to opportunities',
  },
  pipeline: {
    id: 'pipeline',
    label: 'Pipeline',
    navGroup: 'crm',
    path: '/sales/pipeline',
    icon: 'TrendingUp',
    isCore: false,
    dependencies: ['leads'],
    apiPrefixes: [],
    description: 'Sales pipeline visualization (Legacy - use Opportunities)',
    showInNavigation: false, // Hidden - redirects to CRM Opportunities
  },
  admin: {
    id: 'admin',
    label: 'Admin',
    navGroup: 'admin',
    path: '/admin/users',
    additionalPaths: ['/admin/users/new', '/admin/users/:id', '/admin/modules'],
    icon: 'UserCog',
    isCore: false,
    apiPrefixes: ['/api/users', '/api/admin'],
    description:
      'User administration, module configuration, and access control',
  },
  tenantAdmin: {
    id: 'tenantAdmin',
    label: 'Tenants',
    navGroup: 'admin',
    path: '/admin/tenants',
    additionalPaths: [
      '/admin/tenants/new',
      '/admin/tenants/:tenantId',
      '/admin/tenants/:tenantId/edit',
    ],
    icon: 'Building2',
    isCore: false,
    dependencies: ['admin'],
    apiPrefixes: ['/api/admin/tenants'],
    description:
      'System admin tenant management - create and manage customer organizations',
  },

  // ============ CRM MODULES ============
  crm: {
    id: 'crm',
    label: 'CRM',
    navGroup: 'crm',
    path: '/crm',
    icon: 'Building2',
    isCore: true, // Core module - always enabled
    apiPrefixes: ['/api/crm'],
    description:
      'Customer Relationship Management - Accounts, Opportunities, Leads, and Activities',
    showInNavigation: false, // Parent module - children show in navigation
  },
  crmAccounts: {
    id: 'crmAccounts',
    label: 'Accounts',
    navGroup: 'crm',
    path: '/crm/accounts',
    additionalPaths: ['/crm/accounts/:id'],
    icon: 'Building2',
    isCore: true, // Core module - always enabled
    dependencies: ['crm'],
    apiPrefixes: ['/api/crm/accounts'],
    description:
      'CRM account management with hierarchy support and health scoring',
  },
  crmOpportunities: {
    id: 'crmOpportunities',
    label: 'Opportunities',
    navGroup: 'crm',
    path: '/crm/opportunities',
    additionalPaths: ['/crm/opportunities/:id', '/crm/opportunities/new'],
    icon: 'Target',
    isCore: true, // Core module - always enabled
    dependencies: ['crm', 'crmAccounts'],
    apiPrefixes: ['/api/crm/opportunities'],
    description:
      'Sales pipeline management with customizable stages and forecasting',
  },
  crmContacts: {
    id: 'crmContacts',
    label: 'Contacts',
    navGroup: 'crm',
    path: '/crm/contacts',
    additionalPaths: ['/crm/contacts/:id', '/crm/contacts/new'],
    icon: 'Users',
    isCore: true, // Core module - always enabled
    dependencies: ['crm', 'crmAccounts'],
    apiPrefixes: ['/api/crm/contacts'],
    description:
      'Contact management with lifecycle stages, lead scoring, and account linking',
  },

  // ============ CUSTOMER SUCCESS PLATFORM ============
  // NOTE: Customer Success features have been merged into the Account module (CRM).
  // CTAs, Success Plans, and Health Scores are now managed per-Account.
  // This module is kept for backward compatibility but hidden from navigation.
  customerSuccess: {
    id: 'customerSuccess',
    label: 'Customer Success',
    navGroup: 'customerSuccess',
    path: '/customer-success',
    additionalPaths: [
      '/customer-success/health',
      '/customer-success/ctas',
      '/customer-success/success-plans',
      '/customer-success/playbooks',
      '/customer-success/analytics',
      '/customer-success/client/:clientId',
    ],
    icon: 'HeartHandshake',
    isCore: false,
    dependencies: ['crm', 'crmAccounts'],
    apiPrefixes: [
      '/api/customer-success',
      '/api/crm/accounts/:accountId/health',
      '/api/crm/accounts/:accountId/ctas',
      '/api/crm/accounts/:accountId/success-plans',
      '/api/crm/playbooks',
    ],
    description:
      'Customer Success Platform - DEPRECATED: Features merged into Account module. CTAs, Success Plans, and Health Scores are now managed per-Account.',
    showInNavigation: false, // Hidden - features merged into Account detail page
  },

  // ============ MCP INTEGRATION MODULE ============
  mcp: {
    id: 'mcp',
    label: 'AI Assistant',
    navGroup: 'aiTools',
    path: '/ai-assistant',
    icon: 'Bot',
    isCore: false,
    apiPrefixes: ['/api/mcp'],
    description:
      'AI-powered assistant with MCP integration for natural language CRM queries, meeting briefs, and task automation',
    showInNavigation: false, // AI Assistant is accessed via floating button, not navigation
  },

  // ============ PHASE 1 AI TOOL MODULES ============
  chatbot: {
    id: 'chatbot',
    label: 'AI Chatbot',
    navGroup: 'aiTools',
    path: '/ai-tools/chatbot',
    additionalPaths: [
      '/ai-tools/chatbot/:configId',
      '/ai-tools/chatbot/:configId/conversations',
    ],
    icon: 'MessageCircle',
    isCore: false,
    dependencies: ['clients'],
    apiPrefixes: ['/api/clients/:clientId/chatbot', '/api/chatbot'],
    description:
      'AI-powered customer service chatbot with knowledge base and analytics',
  },
  productDescriptions: {
    id: 'productDescriptions',
    label: 'Product Descriptions',
    navGroup: 'aiTools',
    path: '/ai-tools/product-descriptions',
    additionalPaths: [
      '/ai-tools/product-descriptions/:configId',
      '/ai-tools/product-descriptions/:configId/products',
    ],
    icon: 'FileText',
    isCore: false,
    dependencies: ['clients'],
    apiPrefixes: [
      '/api/clients/:clientId/product-descriptions',
      '/api/product-descriptions',
    ],
    description:
      'AI-powered product description generator for multiple marketplaces',
  },
  scheduling: {
    id: 'scheduling',
    label: 'AI Scheduling',
    navGroup: 'aiTools',
    path: '/ai-tools/scheduling',
    additionalPaths: [
      '/ai-tools/scheduling/:configId',
      '/ai-tools/scheduling/:configId/appointments',
    ],
    icon: 'Calendar',
    isCore: false,
    dependencies: ['clients'],
    apiPrefixes: ['/api/clients/:clientId/scheduling', '/api/scheduling'],
    description:
      'AI scheduling assistant with no-show prediction and automated reminders',
  },
  intake: {
    id: 'intake',
    label: 'Client Intake',
    navGroup: 'aiTools',
    path: '/ai-tools/intake',
    additionalPaths: [
      '/ai-tools/intake/:configId',
      '/ai-tools/intake/:configId/forms',
      '/intake/:formId',
    ],
    icon: 'ClipboardList',
    isCore: false,
    dependencies: ['clients'],
    apiPrefixes: ['/api/clients/:clientId/intake', '/api/intake'],
    description:
      'Automated client intake with smart forms, document collection, and compliance',
  },

  // ============ PHASE 2 AI TOOL MODULES ============
  documentAnalyzer: {
    id: 'documentAnalyzer',
    label: 'Document Analyzer',
    navGroup: 'aiTools',
    path: '/ai-tools/document-analyzer',
    additionalPaths: [
      '/ai-tools/document-analyzer/:configId',
      '/ai-tools/document-analyzer/:configId/documents',
    ],
    icon: 'FileSearch',
    isCore: false,
    dependencies: ['clients'],
    apiPrefixes: [
      '/api/clients/:clientId/document-analyzer',
      '/api/document-analyzer',
    ],
    description:
      'Smart document analysis with OCR, NER, custom field extraction, and compliance flagging',
  },
  contentGenerator: {
    id: 'contentGenerator',
    label: 'Content Generator',
    navGroup: 'aiTools',
    path: '/ai-tools/content-generator',
    additionalPaths: [
      '/ai-tools/content-generator/:configId',
      '/ai-tools/content-generator/:configId/contents',
    ],
    icon: 'PenTool',
    isCore: false,
    dependencies: ['clients'],
    apiPrefixes: [
      '/api/clients/:clientId/content-generator',
      '/api/content-generator',
    ],
    description:
      'AI-powered content generation suite with brand voice training, templates, and approval workflows',
  },
  leadScoring: {
    id: 'leadScoring',
    label: 'Lead Scoring',
    navGroup: 'aiTools',
    path: '/ai-tools/lead-scoring',
    additionalPaths: [
      '/ai-tools/lead-scoring/:configId',
      '/ai-tools/lead-scoring/:configId/leads',
      '/ai-tools/lead-scoring/:configId/sequences',
    ],
    icon: 'Target',
    isCore: false,
    dependencies: ['clients'],
    apiPrefixes: ['/api/clients/:clientId/lead-scoring', '/api/lead-scoring'],
    description:
      'ML-based lead scoring with predictive analytics, nurture sequences, and CRM integration',
  },
  priorAuth: {
    id: 'priorAuth',
    label: 'Prior Authorization',
    navGroup: 'aiTools',
    path: '/ai-tools/prior-auth',
    additionalPaths: [
      '/ai-tools/prior-auth/:configId',
      '/ai-tools/prior-auth/:configId/requests',
      '/ai-tools/prior-auth/:configId/appeals',
    ],
    icon: 'ShieldCheck',
    isCore: false,
    dependencies: ['clients'],
    apiPrefixes: ['/api/clients/:clientId/prior-auth', '/api/prior-auth'],
    description:
      'Automated prior authorization submission, status tracking, denial management, and appeals',
  },

  // ============ PHASE 3 AI TOOL MODULES ============
  inventoryForecasting: {
    id: 'inventoryForecasting',
    label: 'Inventory Forecasting',
    navGroup: 'aiTools',
    path: '/ai-tools/inventory-forecasting',
    additionalPaths: [
      '/ai-tools/inventory-forecasting/:configId',
      '/ai-tools/inventory-forecasting/:configId/products',
      '/ai-tools/inventory-forecasting/:configId/forecasts',
      '/ai-tools/inventory-forecasting/:configId/alerts',
    ],
    icon: 'Package',
    isCore: false,
    dependencies: ['clients'],
    apiPrefixes: [
      '/api/clients/:clientId/inventory-forecasting',
      '/api/inventory-forecasting',
    ],
    description:
      'ML-powered inventory forecasting with seasonal trends, multi-location support, and automated alerts',
  },
  complianceMonitor: {
    id: 'complianceMonitor',
    label: 'Compliance Monitor',
    navGroup: 'aiTools',
    path: '/ai-tools/compliance-monitor',
    additionalPaths: [
      '/ai-tools/compliance-monitor/:configId',
      '/ai-tools/compliance-monitor/:configId/rules',
      '/ai-tools/compliance-monitor/:configId/violations',
      '/ai-tools/compliance-monitor/:configId/audits',
    ],
    icon: 'Scale',
    isCore: false,
    dependencies: ['clients'],
    apiPrefixes: [
      '/api/clients/:clientId/compliance-monitor',
      '/api/compliance-monitor',
    ],
    description:
      'Real-time compliance monitoring with rule engine, risk scoring, and regulatory reporting for HIPAA, SOX, GDPR, PCI',
  },
  predictiveMaintenance: {
    id: 'predictiveMaintenance',
    label: 'Predictive Maintenance',
    navGroup: 'aiTools',
    path: '/ai-tools/predictive-maintenance',
    additionalPaths: [
      '/ai-tools/predictive-maintenance/:configId',
      '/ai-tools/predictive-maintenance/:configId/equipment',
      '/ai-tools/predictive-maintenance/:configId/sensors',
      '/ai-tools/predictive-maintenance/:configId/work-orders',
    ],
    icon: 'Wrench',
    isCore: false,
    dependencies: ['clients'],
    apiPrefixes: [
      '/api/clients/:clientId/predictive-maintenance',
      '/api/predictive-maintenance',
    ],
    description:
      'IoT-integrated predictive maintenance with ML anomaly detection, failure prediction, and work order management',
  },
  revenueManagement: {
    id: 'revenueManagement',
    label: 'Revenue Management',
    navGroup: 'aiTools',
    path: '/ai-tools/revenue-management',
    additionalPaths: [
      '/ai-tools/revenue-management/:configId',
      '/ai-tools/revenue-management/:configId/pricing',
      '/ai-tools/revenue-management/:configId/competitors',
      '/ai-tools/revenue-management/:configId/forecasts',
    ],
    icon: 'DollarSign',
    isCore: false,
    dependencies: ['clients'],
    apiPrefixes: [
      '/api/clients/:clientId/revenue-management',
      '/api/revenue-management',
    ],
    description:
      'AI-powered dynamic pricing with demand forecasting, competitor monitoring, and revenue optimization',
  },
  safetyMonitor: {
    id: 'safetyMonitor',
    label: 'Safety Monitor',
    navGroup: 'aiTools',
    path: '/ai-tools/safety-monitor',
    additionalPaths: [
      '/ai-tools/safety-monitor/:configId',
      '/ai-tools/safety-monitor/:configId/checklists',
      '/ai-tools/safety-monitor/:configId/incidents',
      '/ai-tools/safety-monitor/:configId/training',
    ],
    icon: 'HardHat',
    isCore: false,
    dependencies: ['clients'],
    apiPrefixes: [
      '/api/clients/:clientId/safety-monitor',
      '/api/safety-monitor',
    ],
    description:
      'Digital safety checklists, incident reporting, OSHA 300 log management, and training compliance tracking',
  },

  // ============ INFRASTRUCTURE MODULES (INF.1, INF.2, INF.3) ============
  coreInfrastructure: {
    id: 'coreInfrastructure',
    label: 'Core Infrastructure',
    navGroup: 'infrastructure',
    path: '/infrastructure/core',
    icon: 'Server',
    isCore: false,
    dependencies: ['admin'],
    apiPrefixes: ['/api/infrastructure/core'],
    description:
      'INF.1 - Authentication, API gateway, audit logging, and billing infrastructure management',
  },
  aiMlInfrastructure: {
    id: 'aiMlInfrastructure',
    label: 'AI/ML Infrastructure',
    navGroup: 'infrastructure',
    path: '/infrastructure/ai-ml',
    icon: 'Brain',
    isCore: false,
    dependencies: ['admin', 'coreInfrastructure'],
    apiPrefixes: ['/api/infrastructure/ai-ml'],
    description:
      'INF.2 - NLP services, ML models, and integrations framework management',
  },
  iotInfrastructure: {
    id: 'iotInfrastructure',
    label: 'IoT Infrastructure',
    navGroup: 'infrastructure',
    path: '/infrastructure/iot',
    icon: 'Radio',
    isCore: false,
    dependencies: ['admin', 'aiMlInfrastructure'],
    apiPrefixes: ['/api/infrastructure/iot'],
    description:
      'INF.3 - Sensor pipeline, real-time processing, and IoT device management',
  },

  // ============ COMPLIANCE MODULES (COMP.1, COMP.2, COMP.3) ============
  healthcareCompliance: {
    id: 'healthcareCompliance',
    label: 'Healthcare Compliance',
    navGroup: 'compliance',
    path: '/compliance/healthcare',
    icon: 'Heart',
    isCore: false,
    dependencies: ['admin'],
    apiPrefixes: ['/api/compliance/healthcare'],
    description:
      'COMP.1 - HIPAA privacy and security rule implementation and monitoring',
  },
  financialCompliance: {
    id: 'financialCompliance',
    label: 'Financial Compliance',
    navGroup: 'compliance',
    path: '/compliance/financial',
    icon: 'DollarSign',
    isCore: false,
    dependencies: ['admin'],
    apiPrefixes: ['/api/compliance/financial'],
    description: 'COMP.2 - SOX, FINRA, and PCI DSS compliance management',
  },
  generalCompliance: {
    id: 'generalCompliance',
    label: 'General Compliance',
    navGroup: 'compliance',
    path: '/compliance/general',
    icon: 'Globe',
    isCore: false,
    dependencies: ['admin'],
    apiPrefixes: ['/api/compliance/general'],
    description: 'COMP.3 - GDPR and CCPA privacy compliance implementation',
  },

  // ============ DEMO MODULES ============
  demoAITools: {
    id: 'demoAITools',
    label: 'AI Tools Showcase',
    navGroup: 'demo',
    path: '/demo/ai-tools',
    icon: 'Sparkles',
    isCore: false,
    apiPrefixes: [],
    description:
      'Interactive showcase of all 13 AI tools with descriptions, features, and live demos',
  },
  demoMarketing: {
    id: 'demoMarketing',
    label: 'Marketing Demo',
    navGroup: 'demo',
    path: '/demo/marketing',
    icon: 'Presentation',
    isCore: false,
    apiPrefixes: [],
    description:
      'Interactive demo of AI-powered marketing content generation, scheduling, and analytics',
  },

  // ============ FINANCE TRACKING MODULE ============
  financeTracking: {
    id: 'financeTracking',
    label: 'Finance Dashboard',
    navGroup: 'finance',
    path: '/finance',
    icon: 'DollarSign',
    isCore: false,
    apiPrefixes: ['/api/finance'],
    description:
      'Admin-only finance tracking: expenses, budgets, recurring costs, and profitability analysis',
  },
  financeExpenses: {
    id: 'financeExpenses',
    label: 'Expenses',
    navGroup: 'finance',
    path: '/finance/expenses',
    additionalPaths: [
      '/finance/expenses/new',
      '/finance/expenses/:id',
      '/finance/expenses/:id/edit',
    ],
    icon: 'Receipt',
    isCore: false,
    dependencies: ['financeTracking'],
    apiPrefixes: ['/api/finance/expenses'],
    description:
      'Expense tracking with approval workflows and AI categorization',
  },
  financeBudgets: {
    id: 'financeBudgets',
    label: 'Budgets',
    navGroup: 'finance',
    path: '/finance/budgets',
    additionalPaths: ['/finance/budgets/new', '/finance/budgets/:id'],
    icon: 'PieChart',
    isCore: false,
    dependencies: ['financeTracking'],
    apiPrefixes: ['/api/finance/budgets'],
    description: 'Budget management by category, account, or project',
  },
  financeRecurringCosts: {
    id: 'financeRecurringCosts',
    label: 'Recurring Costs',
    navGroup: 'finance',
    path: '/finance/recurring-costs',
    additionalPaths: [
      '/finance/recurring-costs/new',
      '/finance/recurring-costs/:id',
    ],
    icon: 'RefreshCw',
    isCore: false,
    dependencies: ['financeTracking'],
    apiPrefixes: ['/api/finance/recurring-costs'],
    description:
      'Track subscriptions and recurring expenses with auto-generation',
  },

  // ============ BUG TRACKING MODULE ============
  bugTracking: {
    id: 'bugTracking',
    label: 'Bug Tracking',
    navGroup: 'projects',
    path: '/bug-tracking',
    additionalPaths: [
      '/bug-tracking/:id',
      '/bug-tracking/new',
      '/bug-tracking/labels',
      '/bug-tracking/errors',
    ],
    icon: 'Bug',
    isCore: false,
    apiPrefixes: ['/api/bug-tracking'],
    description:
      'Bug tracking, issue management, and error monitoring with AI assistant integration and external log collection',
  },

  // ============ AI PROJECTS MODULE (DEPRECATED) ============
  // DEPRECATED: Features merged into core Projects module.
  // Access AI features via Project Dashboard tabs (AI Assistant, AI Scheduling, AI Documents)
  aiProjects: {
    id: 'aiProjects',
    label: 'AI Project Assistant',
    navGroup: 'aiTools',
    path: '/ai-tools/project-assistant',
    additionalPaths: ['/projects/:id/ai-assistant'],
    icon: 'Sparkles',
    isCore: false,
    dependencies: ['projects'],
    apiPrefixes: ['/api/ai-projects'],
    description:
      'DEPRECATED: AI features merged into core Projects module. Access via Project Dashboard AI tabs.',
    showInNavigation: false, // Hidden - features accessible via Project Dashboard tabs
  },

  // ============ PROJECT ML MODULE (DEPRECATED) ============
  // DEPRECATED: Features merged into core Projects module.
  // Access ML predictions via Project Dashboard ML Insights tab
  projectML: {
    id: 'projectML',
    label: 'Project ML Insights',
    navGroup: 'aiTools',
    path: '/projects/:id', // Accessed via project dashboard ML tab
    icon: 'Brain',
    isCore: false,
    dependencies: ['projects'],
    apiPrefixes: ['/api/projects/:projectId/ml', '/api/projects/portfolio/ml'],
    description:
      'DEPRECATED: ML features merged into core Projects module. Access via Project Dashboard ML Insights tab.',
    showInNavigation: false, // Accessed via project dashboard, not standalone nav
  },
};

/**
 * Mapping from deprecated module IDs to their replacement module
 * Used for backwards compatibility when checking module enablement
 */
export const DEPRECATED_MODULE_MAPPINGS: Record<string, ModuleId> = {
  aiProjects: 'projects',
  projectML: 'projects',
  socialPublishing: 'marketing',
  contentCalendar: 'marketing',
};

/**
 * Normalize a module ID by mapping deprecated IDs to their replacements
 */
export function normalizeModuleId(moduleId: string): ModuleId {
  return (DEPRECATED_MODULE_MAPPINGS[moduleId] || moduleId) as ModuleId;
}

/**
 * Navigation group display configuration
 * CRM is positioned prominently as the primary business system
 */
export const NAV_GROUP_CONFIG: Record<
  NavGroup,
  { label: string; order: number }
> = {
  overview: { label: '', order: 1 }, // No header for overview (Dashboard, Tasks)
  crm: { label: 'CRM', order: 2 }, // CRM at top - primary business system
  projects: { label: 'Projects', order: 3 }, // Project delivery
  customerSuccess: { label: 'Customer Success', order: 4 },
  finance: { label: 'Finance', order: 5 }, // Finance tracking
  marketing: { label: 'Marketing', order: 6 },
  aiTools: { label: 'AI Tools', order: 7 },
  infrastructure: { label: 'Infrastructure', order: 8 },
  compliance: { label: 'Compliance', order: 9 },
  admin: { label: 'Admin', order: 10 },
  demo: { label: 'Demos', order: 11 }, // Demos at bottom
};

/**
 * Default enabled modules (all enabled by default)
 */
export const DEFAULT_ENABLED_MODULES: ModuleId[] = [
  'dashboard',
  'tasks',
  'clients',
  'projects',
  'assets',
  'marketing',
  'leads',
  'pipeline',
  'admin',
  'tenantAdmin',
  // CRM modules
  'crm',
  'crmAccounts',
  'crmOpportunities',
  'crmContacts',
  // Customer Success Platform
  'customerSuccess',
  // MCP Integration
  'mcp',
  // Phase 1 AI Tools
  'chatbot',
  'productDescriptions',
  'scheduling',
  'intake',
  // Phase 2 AI Tools
  'documentAnalyzer',
  'contentGenerator',
  'leadScoring',
  'priorAuth',
  // Phase 3 AI Tools
  'inventoryForecasting',
  'complianceMonitor',
  'predictiveMaintenance',
  'revenueManagement',
  'safetyMonitor',
  // Infrastructure (INF.1, INF.2, INF.3)
  'coreInfrastructure',
  'aiMlInfrastructure',
  'iotInfrastructure',
  // Compliance (COMP.1, COMP.2, COMP.3)
  'healthcareCompliance',
  'financialCompliance',
  'generalCompliance',
  // Demo modules
  'demoAITools',
  'demoMarketing',
  // Finance Tracking
  'financeTracking',
  'financeExpenses',
  'financeBudgets',
  'financeRecurringCosts',
  // Bug Tracking
  'bugTracking',
  // AI Projects
  'aiProjects',
  // Project ML
  'projectML',
];

/**
 * Parse enabled modules from environment variable or configuration
 *
 * @param enabledModulesString - Comma-separated list of module IDs, or undefined for defaults
 * @returns Array of enabled module IDs
 */
export function parseEnabledModules(
  enabledModulesString: string | undefined,
): ModuleId[] {
  if (!enabledModulesString) {
    return DEFAULT_ENABLED_MODULES;
  }

  const requestedModules = enabledModulesString
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0) as ModuleId[];

  // Handle deprecated module IDs - map to their replacements
  const normalizedModules = requestedModules.map((m) => {
    const normalized = DEPRECATED_MODULE_MAPPINGS[m];
    if (normalized) {
      console.warn(
        `Module "${m}" is deprecated and has been merged into "${normalized}". Please update your configuration.`,
      );
      return normalized;
    }
    return m;
  }) as ModuleId[];

  // Always include core modules
  const coreModules = Object.values(MODULE_DEFINITIONS)
    .filter((m) => m.isCore)
    .map((m) => m.id);

  // Combine core modules with normalized requested modules
  const enabledSet = new Set([...coreModules, ...normalizedModules]);

  // Validate that all requested modules exist
  for (const moduleId of normalizedModules) {
    if (!MODULE_DEFINITIONS[moduleId]) {
      console.warn(`Unknown module "${moduleId}" in configuration, ignoring.`);
      enabledSet.delete(moduleId);
    }
  }

  // Ensure dependencies are enabled
  for (const moduleId of enabledSet) {
    const module = MODULE_DEFINITIONS[moduleId];
    if (module?.dependencies) {
      for (const dep of module.dependencies) {
        if (!enabledSet.has(dep)) {
          console.warn(
            `Module "${moduleId}" requires "${dep}" - enabling automatically.`,
          );
          enabledSet.add(dep);
        }
      }
    }
  }

  return Array.from(enabledSet);
}

/**
 * Check if a module is enabled
 *
 * @param moduleId - The module to check
 * @param enabledModules - Array of enabled module IDs
 * @returns true if the module is enabled
 */
export function isModuleEnabled(
  moduleId: ModuleId,
  enabledModules: ModuleId[],
): boolean {
  return enabledModules.includes(moduleId);
}

/**
 * Get all enabled module definitions
 *
 * @param enabledModules - Array of enabled module IDs
 * @returns Array of enabled module definitions
 */
export function getEnabledModuleDefinitions(
  enabledModules: ModuleId[],
): ModuleDefinition[] {
  return enabledModules
    .map((id) => MODULE_DEFINITIONS[id])
    .filter((m): m is ModuleDefinition => m !== undefined);
}

/**
 * Get navigation items grouped by nav group, only for enabled modules
 *
 * @param enabledModules - Array of enabled module IDs
 * @returns Navigation items grouped by nav group, sorted by group order
 */
export function getNavigationItems(enabledModules: ModuleId[]): Array<{
  group: NavGroup;
  label: string;
  items: ModuleDefinition[];
}> {
  const enabledDefs = getEnabledModuleDefinitions(enabledModules);

  // Filter to only modules that should show in navigation (default true)
  const navigationDefs = enabledDefs.filter(
    (module) => module.showInNavigation !== false,
  );

  // Group by navGroup
  const grouped = new Map<NavGroup, ModuleDefinition[]>();

  for (const module of navigationDefs) {
    const existing = grouped.get(module.navGroup) || [];
    existing.push(module);
    grouped.set(module.navGroup, existing);
  }

  // Convert to array and sort by group order
  return Array.from(grouped.entries())
    .map(([group, items]) => ({
      group,
      label: NAV_GROUP_CONFIG[group].label,
      items,
    }))
    .sort(
      (a, b) =>
        NAV_GROUP_CONFIG[a.group].order - NAV_GROUP_CONFIG[b.group].order,
    );
}

/**
 * Check if a route path should be accessible based on enabled modules
 *
 * @param path - The route path to check
 * @param enabledModules - Array of enabled module IDs
 * @returns true if the route is accessible
 */
export function isRouteAccessible(
  path: string,
  enabledModules: ModuleId[],
): boolean {
  const enabledDefs = getEnabledModuleDefinitions(enabledModules);

  for (const module of enabledDefs) {
    // Check primary path
    if (pathMatches(path, module.path)) {
      return true;
    }

    // Check additional paths
    if (module.additionalPaths) {
      for (const additionalPath of module.additionalPaths) {
        if (pathMatches(path, additionalPath)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Simple path matching that handles route parameters
 */
function pathMatches(actualPath: string, pattern: string): boolean {
  // Convert pattern with :params to regex
  const regexPattern = pattern.replace(/:[\w]+/g, '[^/]+');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(actualPath);
}

/**
 * Check if an API endpoint should be accessible based on enabled modules
 *
 * @param endpoint - The API endpoint path
 * @param enabledModules - Array of enabled module IDs
 * @returns true if the endpoint is accessible
 */
export function isApiEndpointAccessible(
  endpoint: string,
  enabledModules: ModuleId[],
): boolean {
  const enabledDefs = getEnabledModuleDefinitions(enabledModules);

  // Collect all enabled API prefixes
  const enabledPrefixes = enabledDefs.flatMap((m) => m.apiPrefixes || []);

  // If no prefixes configured for enabled modules, allow all
  // (this handles auth endpoints, health checks, etc.)
  if (enabledPrefixes.length === 0) {
    return true;
  }

  // Check if endpoint starts with any enabled prefix
  for (const prefix of enabledPrefixes) {
    if (endpoint.startsWith(prefix)) {
      return true;
    }
  }

  // Also allow common endpoints that don't belong to specific modules
  const commonPrefixes = ['/api/auth', '/api/login', '/api/logout', '/health'];
  for (const prefix of commonPrefixes) {
    if (endpoint.startsWith(prefix)) {
      return true;
    }
  }

  return false;
}
