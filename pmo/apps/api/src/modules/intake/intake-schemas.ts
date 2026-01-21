/**
 * Shared validation schemas for the Intake module
 *
 * Contains Zod schemas used across multiple intake sub-routers
 */

import { z } from 'zod';

// ============================================================================
// CONFIG SCHEMAS
// ============================================================================

export const configSchema = z.object({
  portalName: z.string().max(200).optional(),
  logoUrl: z.string().url().optional(),
  primaryColor: z.string().max(20).optional(),
  customDomain: z.string().max(200).optional(),
  requireIdentityVerification: z.boolean().optional(),
  requireDocumentVerification: z.boolean().optional(),
  retentionDays: z.number().int().min(30).max(3650).optional(),
  notifyOnSubmission: z.boolean().optional(),
  notifyOnCompletion: z.boolean().optional(),
  notificationEmails: z.array(z.string().email()).optional(),
  storageProvider: z.string().max(50).optional(),
});

// ============================================================================
// FORM SCHEMAS
// ============================================================================

export const formSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  slug: z.string().max(100).optional(),
  isMultiPage: z.boolean().optional(),
  allowSaveProgress: z.boolean().optional(),
  requireSignature: z.boolean().optional(),
  expiresAfterDays: z.number().int().min(1).max(365).optional(),
});

export const fieldSchema = z.object({
  name: z.string().min(1).max(100),
  label: z.string().min(1).max(200),
  type: z.enum([
    'TEXT',
    'TEXTAREA',
    'EMAIL',
    'PHONE',
    'NUMBER',
    'DATE',
    'TIME',
    'DATETIME',
    'SELECT',
    'MULTISELECT',
    'CHECKBOX',
    'RADIO',
    'FILE_UPLOAD',
    'SIGNATURE',
    'ADDRESS',
    'SSN_LAST4',
    'INSURANCE_INFO',
  ]),
  placeholder: z.string().max(200).optional(),
  helpText: z.string().max(500).optional(),
  isRequired: z.boolean().optional(),
  validationRules: z.record(z.string(), z.unknown()).optional(),
  options: z
    .array(
      z.object({
        value: z.string(),
        label: z.string(),
      }),
    )
    .optional(),
  conditionalLogic: z.record(z.string(), z.unknown()).optional(),
  pageNumber: z.number().int().min(1).optional(),
  sortOrder: z.number().int().min(0).optional(),
  width: z.enum(['full', 'half', 'third']).optional(),
  prefillSource: z.string().max(100).optional(),
});

export const fieldReorderSchema = z.array(
  z.object({
    id: z.number().int(),
    pageNumber: z.number().int().min(1),
    sortOrder: z.number().int().min(0),
  }),
);

// ============================================================================
// SUBMISSION SCHEMAS
// ============================================================================

export const submissionSchema = z.object({
  formId: z.number().int(),
  submitterEmail: z.string().email(),
  submitterName: z.string().max(200).optional(),
  submitterPhone: z.string().max(20).optional(),
  expiresAt: z.string().datetime().optional(),
});

export const reviewSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'NEEDS_RESUBMISSION']),
  reviewNotes: z.string().max(2000).optional(),
  rejectionReason: z.string().max(500).optional(),
});

// ============================================================================
// DOCUMENT SCHEMAS
// ============================================================================

export const documentSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  sizeBytes: z.number().int().min(1),
  storageUrl: z.string().url(),
  documentType: z.string().min(1).max(50),
});

export const documentVerifySchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED', 'NEEDS_REVIEW']),
  verificationNotes: z.string().max(1000).optional(),
});

// ============================================================================
// COMPLIANCE SCHEMAS
// ============================================================================

export const complianceTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  industry: z.string().max(100).optional(),
  useCase: z.string().max(100).optional(),
  requirements: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
      isRequired: z.boolean(),
      documentTypes: z.array(z.string()).optional(),
    }),
  ),
});

export const conflictCheckSchema = z.object({
  checkAccounts: z.boolean().optional(),
  checkContacts: z.boolean().optional(),
  checkOpportunities: z.boolean().optional(),
  checkAdverseParties: z.boolean().optional(),
  minimumSimilarity: z.number().min(0).max(1).optional(),
  includeArchived: z.boolean().optional(),
});

export const quickConflictCheckSchema = z.object({
  tenantId: z.string(),
  names: z.array(z.string().min(1)).min(1).max(20),
});

export const engagementLetterSchema = z.object({
  templateId: z.string().optional(),
  industry: z.string().optional(),
  customContent: z.string().max(5000).optional(),
  signatureType: z.enum(['none', 'docusign', 'hellosign', 'manual']).optional(),
});

// ============================================================================
// WORKFLOW SCHEMAS
// ============================================================================

export const workflowSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  steps: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      config: z.record(z.string(), z.unknown()).optional(),
      order: z.number().int(),
    }),
  ),
  triggerFormIds: z.array(z.number().int()).optional(),
  autoStart: z.boolean().optional(),
});

// ============================================================================
// AI FORM GENERATION SCHEMAS
// ============================================================================

export const industryEnum = z.enum([
  'legal',
  'healthcare',
  'financial',
  'consulting',
  'real_estate',
  'insurance',
  'education',
  'technology',
  'retail',
  'manufacturing',
  'hospitality',
  'nonprofit',
  'general',
]);

export const aiGenerateFormSchema = z.object({
  description: z.string().min(10).max(2000),
  industry: industryEnum.optional(),
  formName: z.string().max(200).optional(),
  includeCompliance: z.boolean().optional(),
  maxFields: z.number().int().min(1).max(50).optional(),
});

export const aiSuggestFieldsSchema = z.object({
  existingFields: z.array(z.string()),
  formName: z.string().min(1).max(200),
  industry: industryEnum.optional(),
  description: z.string().max(1000).optional(),
});

// ============================================================================
// CONVERSATION SCHEMAS
// ============================================================================

export const startConversationSchema = z.object({
  formSlug: z.string().min(1),
  configId: z.number().int().positive(),
  submitterEmail: z.string().email().optional(),
  submitterName: z.string().max(200).optional(),
});

export const sendMessageSchema = z.object({
  message: z.string().min(1).max(5000),
});

// ============================================================================
// CRM INTEGRATION SCHEMAS
// ============================================================================

export const crmIntegrationSchema = z.object({
  createAccount: z.boolean().optional(),
  createContact: z.boolean().optional(),
  createOpportunity: z.boolean().optional(),
  defaultPipelineId: z.number().int().optional(),
  defaultStageId: z.number().int().optional(),
  assignToUserId: z.number().int().optional(),
  fieldMappings: z.record(z.string(), z.string()).optional(),
});

// ============================================================================
// SCREENING SCHEMAS
// ============================================================================

export const screeningConfigSchema = z.object({
  practiceAreas: z
    .array(
      z.object({
        name: z.string(),
        aliases: z.array(z.string()),
        acceptNew: z.boolean(),
        minimumValue: z.number().optional(),
      }),
    )
    .optional(),
  jurisdictions: z.array(z.string()).optional(),
  autoDeclineReasons: z.array(z.string()).optional(),
});

export const quickScreenSchema = z.object({
  formData: z.record(z.string(), z.unknown()),
  config: screeningConfigSchema.optional(),
});

// ============================================================================
// CHANNEL SCHEMAS
// ============================================================================

export const channelConfigUpdateSchema = z.object({
  channel: z.enum(['SMS', 'WHATSAPP', 'WIDGET']),
  isEnabled: z.boolean().optional(),
  credentials: z
    .object({
      type: z.enum(['twilio', 'whatsapp_business']),
      accountSid: z.string().optional(),
      authToken: z.string().optional(),
      phoneNumber: z.string().optional(),
      messagingServiceSid: z.string().optional(),
    })
    .optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  welcomeMessage: z.string().max(1000).optional(),
  completionMessage: z.string().max(1000).optional(),
  errorMessage: z.string().max(500).optional(),
});

export const widgetConfigUpdateSchema = z.object({
  position: z
    .enum(['bottom-right', 'bottom-left', 'top-right', 'top-left'])
    .optional(),
  primaryColor: z.string().max(20).optional(),
  textColor: z.string().max(20).optional(),
  buttonText: z.string().max(50).optional(),
  title: z.string().max(100).optional(),
  subtitle: z.string().max(200).optional(),
  logoUrl: z.string().url().optional(),
  mode: z.enum(['form', 'chat', 'both']).optional(),
  defaultMode: z.enum(['form', 'chat']).optional(),
  autoOpen: z.boolean().optional(),
  openDelay: z.number().int().min(0).max(60000).optional(),
  triggers: z
    .array(
      z.object({
        type: z.enum(['time', 'scroll', 'exit_intent', 'page_view']),
        delay: z.number().optional(),
        scrollPercent: z.number().optional(),
        pagePattern: z.string().optional(),
      }),
    )
    .optional(),
  preFillFromUrl: z.boolean().optional(),
  trackAnalytics: z.boolean().optional(),
  googleAnalyticsId: z.string().max(50).optional(),
  customCss: z.string().max(10000).optional(),
  zIndex: z.number().int().optional(),
  hideOnMobile: z.boolean().optional(),
  allowMinimize: z.boolean().optional(),
});
