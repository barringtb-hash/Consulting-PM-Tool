/**
 * Scheduling - Templates API
 * API functions for industry templates management
 */

import { buildOptions, ApiError } from '../http';
import { buildApiUrl } from '../config';

// ============================================================================
// TYPES
// ============================================================================

export interface IndustryTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category:
    | 'healthcare'
    | 'professional'
    | 'home_services'
    | 'beauty'
    | 'restaurant';
  schedulingConfig: {
    defaultSlotDurationMin: number;
    bufferMinutes: number;
    minAdvanceBookingHours: number;
    maxAdvanceBookingDays: number;
    allowWalkIns: boolean;
    enableReminders: boolean;
    reminderHoursBefore: number[];
    requirePhone: boolean;
    autoConfirm: boolean;
  };
  bookingPageConfig: {
    showProviderSelection: boolean;
    showAppointmentTypes: boolean;
    requireIntakeForm: boolean;
    cancellationPolicy: string;
    customFields?: string[];
  };
  appointmentTypes: Array<{
    name: string;
    description?: string;
    durationMinutes: number;
    price?: number;
    color: string;
    requiresDeposit: boolean;
    depositPercent?: number;
  }>;
  providerRoles?: Array<{
    title: string;
    canBook: boolean;
    canManage: boolean;
  }>;
  intakeFormFields: Array<{
    name: string;
    type: string;
    label: string;
    required: boolean;
    options?: string[];
    placeholder?: string;
  }>;
  industrySettings: {
    hipaaCompliant?: boolean;
    supportsTelehealth?: boolean;
    supportsWalkIns?: boolean;
    supportsWaitlist?: boolean;
    enablesDispatch?: boolean;
    supportsTableManagement?: boolean;
    [key: string]: boolean | undefined;
  };
}

export interface TemplateSimplified {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  appointmentTypeCount: number;
  features: string[];
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface TemplatePreview {
  template: IndustryTemplate;
  estimatedSetupTime: string;
  features: string[];
  recommendedFor: string[];
}

/** Input for applying template to an Account (preferred) */
export interface ApplyTemplateToAccountInput {
  accountId: number;
  templateId: string;
  customizations?: Partial<IndustryTemplate['schedulingConfig']>;
}

/** Input for applying template to a Client (legacy) */
export interface ApplyTemplateInput {
  clientId: number;
  templateId: string;
  accountId?: number;
  customizations?: Partial<IndustryTemplate['schedulingConfig']>;
}

export interface ApplyTemplateResult {
  success: boolean;
  configId: number;
  template: IndustryTemplate;
  appointmentTypesCreated: number;
  intakeFieldsConfigured: number;
}

export interface TemplateComparison {
  differences: Array<{
    field: string;
    currentValue: unknown;
    templateValue: unknown;
  }>;
  appointmentTypeDiff: {
    current: number;
    template: number;
  };
  intakeFieldDiff: {
    current: number;
    template: number;
  };
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get all available industry templates
 */
export async function listTemplates(): Promise<TemplateSimplified[]> {
  const res = await fetch(buildApiUrl('/scheduling/templates'), buildOptions());
  if (!res.ok) {
    const error = new Error('Failed to fetch templates') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

/**
 * Get template categories
 */
export async function getTemplateCategories(): Promise<TemplateCategory[]> {
  const res = await fetch(
    buildApiUrl('/scheduling/templates/categories'),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch template categories') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

/**
 * Get a specific template by ID
 */
export async function getTemplate(
  templateId: string,
): Promise<IndustryTemplate> {
  const res = await fetch(
    buildApiUrl(`/scheduling/templates/${templateId}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch template') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

/**
 * Preview a template before applying
 */
export async function previewTemplate(
  templateId: string,
): Promise<TemplatePreview> {
  const res = await fetch(
    buildApiUrl(`/scheduling/templates/${templateId}/preview`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to preview template') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

/**
 * Get templates by category
 */
export async function getTemplatesByCategory(
  category: string,
): Promise<IndustryTemplate[]> {
  const res = await fetch(
    buildApiUrl(`/scheduling/templates/by-category/${category}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error(
      'Failed to fetch templates by category',
    ) as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

// ============================================================================
// ACCOUNT-BASED API FUNCTIONS (Preferred)
// ============================================================================

/**
 * Apply a template to an Account (preferred)
 */
export async function applyTemplateToAccount(
  input: ApplyTemplateToAccountInput,
): Promise<ApplyTemplateResult> {
  const res = await fetch(
    buildApiUrl('/scheduling/templates/apply-to-account'),
    {
      ...buildOptions(),
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  if (!res.ok) {
    const error = new Error('Failed to apply template') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

/**
 * Reset account config to template defaults (preferred)
 */
export async function resetAccountToTemplate(
  accountId: number,
  templateId: string,
): Promise<ApplyTemplateResult> {
  const res = await fetch(buildApiUrl('/scheduling/templates/reset-account'), {
    ...buildOptions(),
    method: 'POST',
    body: JSON.stringify({ accountId, templateId }),
  });
  if (!res.ok) {
    const error = new Error('Failed to reset to template') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

/**
 * Get the template applied to an account's config (preferred)
 */
export async function getAppliedTemplateByAccount(
  accountId: number,
): Promise<IndustryTemplate | null> {
  const res = await fetch(
    buildApiUrl(`/scheduling/templates/applied-account/${accountId}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch applied template') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

// ============================================================================
// LEGACY CLIENT-BASED API FUNCTIONS (Deprecated)
// ============================================================================

/**
 * Apply a template to create/update scheduling config
 * @deprecated Use applyTemplateToAccount instead
 */
export async function applyTemplate(
  input: ApplyTemplateInput,
): Promise<ApplyTemplateResult> {
  const res = await fetch(buildApiUrl('/scheduling/templates/apply'), {
    ...buildOptions(),
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const error = new Error('Failed to apply template') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

/**
 * Reset config to template defaults
 * @deprecated Use resetAccountToTemplate instead
 */
export async function resetToTemplate(
  clientId: number,
  templateId: string,
): Promise<ApplyTemplateResult> {
  const res = await fetch(buildApiUrl('/scheduling/templates/reset'), {
    ...buildOptions(),
    method: 'POST',
    body: JSON.stringify({ clientId, templateId }),
  });
  if (!res.ok) {
    const error = new Error('Failed to reset to template') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

/**
 * Compare current config with template defaults
 */
export async function compareWithTemplate(
  clientId: number,
  templateId: string,
): Promise<TemplateComparison> {
  const res = await fetch(buildApiUrl('/scheduling/templates/compare'), {
    ...buildOptions(),
    method: 'POST',
    body: JSON.stringify({ clientId, templateId }),
  });
  if (!res.ok) {
    const error = new Error('Failed to compare with template') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}

/**
 * Get the template applied to a client's config
 * @deprecated Use getAppliedTemplateByAccount instead
 */
export async function getAppliedTemplate(
  clientId: number,
): Promise<IndustryTemplate | null> {
  const res = await fetch(
    buildApiUrl(`/scheduling/templates/applied/${clientId}`),
    buildOptions(),
  );
  if (!res.ok) {
    const error = new Error('Failed to fetch applied template') as ApiError;
    error.status = res.status;
    throw error;
  }
  const data = await res.json();
  return data.data;
}
