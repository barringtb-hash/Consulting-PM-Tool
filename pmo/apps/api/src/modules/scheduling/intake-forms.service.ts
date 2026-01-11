/**
 * Scheduling Intake Forms Service
 *
 * Enhanced intake forms system for appointment booking:
 * - Form builder with conditional logic
 * - Multi-page forms
 * - Validation rules
 * - Form templates
 * - Response processing
 */

import { prisma } from '../../prisma/client';
import { Prisma } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface IntakeFormField {
  id?: string;
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  validationRules?: ValidationRules;
  options?: FieldOption[];
  conditionalLogic?: ConditionalLogic;
  pageNumber?: number;
  sortOrder?: number;
  width?: 'full' | 'half' | 'third';
  prefillSource?: string;
}

export type FieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'number'
  | 'date'
  | 'datetime'
  | 'time'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'signature'
  | 'address'
  | 'heading'
  | 'paragraph'
  | 'divider';

export interface ValidationRules {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  min?: number;
  max?: number;
  fileTypes?: string[];
  maxFileSize?: number; // in bytes
}

export interface FieldOption {
  value: string;
  label: string;
  isDefault?: boolean;
}

export interface ConditionalLogic {
  action: 'show' | 'hide' | 'require';
  rules: ConditionalRule[];
  logicType: 'all' | 'any';
}

export interface ConditionalRule {
  fieldId: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_contains'
    | 'greater_than'
    | 'less_than'
    | 'is_empty'
    | 'is_not_empty';
  value?: string | number | boolean;
}

export interface IntakeFormInput {
  name: string;
  description?: string;
  fields: IntakeFormField[];
  isRequired?: boolean;
  isMultiPage?: boolean;
  allowSaveProgress?: boolean;
  displayOrder?: number;
}

export interface FormResponse {
  [fieldId: string]: unknown;
}

export interface ValidationError {
  fieldId: string;
  fieldName: string;
  message: string;
}

// ============================================================================
// FORM MANAGEMENT
// ============================================================================

/**
 * Create an intake form for a booking page
 */
export async function createIntakeForm(
  bookingPageId: number,
  input: IntakeFormInput,
) {
  // Process and validate fields
  const processedFields = processFields(input.fields);

  return prisma.bookingIntakeForm.create({
    data: {
      bookingPageId,
      name: input.name,
      description: input.description || null,
      fields: processedFields as unknown as Prisma.InputJsonValue,
      isRequired: input.isRequired ?? false,
      displayOrder: input.displayOrder ?? 0,
    },
  });
}

/**
 * Update an intake form
 */
export async function updateIntakeForm(
  id: number,
  input: Partial<IntakeFormInput>,
) {
  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) {
    updateData.name = input.name;
  }

  if (input.description !== undefined) {
    updateData.description = input.description;
  }

  if (input.fields !== undefined) {
    updateData.fields = processFields(
      input.fields,
    ) as unknown as Prisma.InputJsonValue;
  }

  if (input.isRequired !== undefined) {
    updateData.isRequired = input.isRequired;
  }

  if (input.displayOrder !== undefined) {
    updateData.displayOrder = input.displayOrder;
  }

  return prisma.bookingIntakeForm.update({
    where: { id },
    data: updateData,
  });
}

/**
 * Get intake form by ID
 */
export async function getIntakeForm(id: number) {
  return prisma.bookingIntakeForm.findUnique({
    where: { id },
    include: {
      bookingPage: {
        select: { id: true, title: true, slug: true },
      },
    },
  });
}

/**
 * Get intake forms for a booking page
 */
export async function getIntakeForms(bookingPageId: number) {
  return prisma.bookingIntakeForm.findMany({
    where: { bookingPageId },
    orderBy: { displayOrder: 'asc' },
  });
}

/**
 * Delete an intake form
 */
export async function deleteIntakeForm(id: number) {
  // First delete all responses
  await prisma.bookingIntakeFormResponse.deleteMany({
    where: { formId: id },
  });

  return prisma.bookingIntakeForm.delete({
    where: { id },
  });
}

/**
 * Duplicate an intake form
 */
export async function duplicateIntakeForm(id: number, newName?: string) {
  const original = await getIntakeForm(id);
  if (!original) {
    throw new Error('Intake form not found');
  }

  return prisma.bookingIntakeForm.create({
    data: {
      bookingPageId: original.bookingPageId,
      name: newName || `${original.name} (Copy)`,
      description: original.description,
      fields: original.fields as Prisma.InputJsonValue,
      isRequired: original.isRequired,
      displayOrder: original.displayOrder + 1,
    },
  });
}

// ============================================================================
// FORM TEMPLATES
// ============================================================================

/**
 * Built-in form templates for common use cases
 */
export const FORM_TEMPLATES: Record<
  string,
  { name: string; description: string; fields: IntakeFormField[] }
> = {
  patient_basic: {
    name: 'Basic Patient Information',
    description: 'Standard patient intake form for appointments',
    fields: [
      {
        id: 'dob',
        name: 'dob',
        label: 'Date of Birth',
        type: 'date',
        required: true,
        sortOrder: 0,
        width: 'half',
      },
      {
        id: 'gender',
        name: 'gender',
        label: 'Gender',
        type: 'select',
        options: [
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
          { value: 'other', label: 'Other' },
          { value: 'prefer_not_to_say', label: 'Prefer not to say' },
        ],
        sortOrder: 1,
        width: 'half',
      },
      {
        id: 'address',
        name: 'address',
        label: 'Address',
        type: 'address',
        required: true,
        sortOrder: 2,
        width: 'full',
      },
      {
        id: 'emergency_contact_name',
        name: 'emergency_contact_name',
        label: 'Emergency Contact Name',
        type: 'text',
        sortOrder: 3,
        width: 'half',
      },
      {
        id: 'emergency_contact_phone',
        name: 'emergency_contact_phone',
        label: 'Emergency Contact Phone',
        type: 'phone',
        sortOrder: 4,
        width: 'half',
      },
    ],
  },
  medical_history: {
    name: 'Medical History',
    description: 'Collect patient medical history and current medications',
    fields: [
      {
        id: 'current_medications',
        name: 'current_medications',
        label: 'Current Medications',
        type: 'textarea',
        placeholder: 'List all current medications and dosages',
        sortOrder: 0,
        width: 'full',
      },
      {
        id: 'allergies',
        name: 'allergies',
        label: 'Allergies',
        type: 'textarea',
        placeholder: 'List any known allergies',
        sortOrder: 1,
        width: 'full',
      },
      {
        id: 'medical_conditions',
        name: 'medical_conditions',
        label: 'Current Medical Conditions',
        type: 'multiselect',
        options: [
          { value: 'diabetes', label: 'Diabetes' },
          { value: 'hypertension', label: 'High Blood Pressure' },
          { value: 'heart_disease', label: 'Heart Disease' },
          { value: 'asthma', label: 'Asthma' },
          { value: 'cancer', label: 'Cancer' },
          { value: 'thyroid', label: 'Thyroid Disorder' },
          { value: 'none', label: 'None of the above' },
        ],
        sortOrder: 2,
        width: 'full',
      },
      {
        id: 'past_surgeries',
        name: 'past_surgeries',
        label: 'Past Surgeries',
        type: 'textarea',
        placeholder: 'List any past surgeries and dates',
        sortOrder: 3,
        width: 'full',
      },
    ],
  },
  insurance: {
    name: 'Insurance Information',
    description: 'Collect insurance details for billing',
    fields: [
      {
        id: 'has_insurance',
        name: 'has_insurance',
        label: 'Do you have health insurance?',
        type: 'radio',
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ],
        required: true,
        sortOrder: 0,
        width: 'full',
      },
      {
        id: 'insurance_provider',
        name: 'insurance_provider',
        label: 'Insurance Provider',
        type: 'text',
        sortOrder: 1,
        width: 'half',
        conditionalLogic: {
          action: 'show',
          rules: [
            { fieldId: 'has_insurance', operator: 'equals', value: 'yes' },
          ],
          logicType: 'all',
        },
      },
      {
        id: 'policy_number',
        name: 'policy_number',
        label: 'Policy Number',
        type: 'text',
        sortOrder: 2,
        width: 'half',
        conditionalLogic: {
          action: 'show',
          rules: [
            { fieldId: 'has_insurance', operator: 'equals', value: 'yes' },
          ],
          logicType: 'all',
        },
      },
      {
        id: 'group_number',
        name: 'group_number',
        label: 'Group Number',
        type: 'text',
        sortOrder: 3,
        width: 'half',
        conditionalLogic: {
          action: 'show',
          rules: [
            { fieldId: 'has_insurance', operator: 'equals', value: 'yes' },
          ],
          logicType: 'all',
        },
      },
      {
        id: 'subscriber_name',
        name: 'subscriber_name',
        label: 'Subscriber Name (if different)',
        type: 'text',
        sortOrder: 4,
        width: 'half',
        conditionalLogic: {
          action: 'show',
          rules: [
            { fieldId: 'has_insurance', operator: 'equals', value: 'yes' },
          ],
          logicType: 'all',
        },
      },
      {
        id: 'insurance_card_front',
        name: 'insurance_card_front',
        label: 'Insurance Card (Front)',
        type: 'file',
        sortOrder: 5,
        width: 'half',
        validationRules: {
          fileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
          maxFileSize: 5 * 1024 * 1024, // 5MB
        },
        conditionalLogic: {
          action: 'show',
          rules: [
            { fieldId: 'has_insurance', operator: 'equals', value: 'yes' },
          ],
          logicType: 'all',
        },
      },
      {
        id: 'insurance_card_back',
        name: 'insurance_card_back',
        label: 'Insurance Card (Back)',
        type: 'file',
        sortOrder: 6,
        width: 'half',
        validationRules: {
          fileTypes: ['image/jpeg', 'image/png', 'application/pdf'],
          maxFileSize: 5 * 1024 * 1024,
        },
        conditionalLogic: {
          action: 'show',
          rules: [
            { fieldId: 'has_insurance', operator: 'equals', value: 'yes' },
          ],
          logicType: 'all',
        },
      },
    ],
  },
  consent: {
    name: 'Consent Forms',
    description: 'Collect patient consent and signatures',
    fields: [
      {
        id: 'consent_heading',
        name: 'consent_heading',
        label: 'Consent to Treatment',
        type: 'heading',
        sortOrder: 0,
        width: 'full',
      },
      {
        id: 'consent_text',
        name: 'consent_text',
        label:
          'I consent to receive medical treatment and understand that I am responsible for payment of services.',
        type: 'paragraph',
        sortOrder: 1,
        width: 'full',
      },
      {
        id: 'treatment_consent',
        name: 'treatment_consent',
        label: 'I agree to the terms above',
        type: 'checkbox',
        required: true,
        sortOrder: 2,
        width: 'full',
      },
      {
        id: 'hipaa_heading',
        name: 'hipaa_heading',
        label: 'HIPAA Acknowledgment',
        type: 'heading',
        sortOrder: 3,
        width: 'full',
      },
      {
        id: 'hipaa_consent',
        name: 'hipaa_consent',
        label:
          'I acknowledge that I have received the HIPAA Notice of Privacy Practices',
        type: 'checkbox',
        required: true,
        sortOrder: 4,
        width: 'full',
      },
      {
        id: 'signature',
        name: 'signature',
        label: 'Patient Signature',
        type: 'signature',
        required: true,
        sortOrder: 5,
        width: 'full',
      },
    ],
  },
  covid_screening: {
    name: 'COVID-19 Screening',
    description: 'Pre-visit COVID-19 screening questionnaire',
    fields: [
      {
        id: 'symptoms',
        name: 'symptoms',
        label:
          'Have you experienced any of the following symptoms in the past 14 days?',
        type: 'multiselect',
        options: [
          { value: 'fever', label: 'Fever or chills' },
          { value: 'cough', label: 'Cough' },
          { value: 'breathing', label: 'Shortness of breath' },
          { value: 'fatigue', label: 'Fatigue' },
          { value: 'body_aches', label: 'Body or muscle aches' },
          { value: 'taste_smell', label: 'New loss of taste or smell' },
          { value: 'sore_throat', label: 'Sore throat' },
          { value: 'none', label: 'None of the above' },
        ],
        required: true,
        sortOrder: 0,
        width: 'full',
      },
      {
        id: 'exposure',
        name: 'exposure',
        label:
          'Have you been in close contact with anyone who has tested positive for COVID-19?',
        type: 'radio',
        options: [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
          { value: 'unsure', label: 'Not sure' },
        ],
        required: true,
        sortOrder: 1,
        width: 'full',
      },
      {
        id: 'recent_test',
        name: 'recent_test',
        label: 'Have you taken a COVID-19 test in the last 7 days?',
        type: 'radio',
        options: [
          { value: 'yes_positive', label: 'Yes - Positive' },
          { value: 'yes_negative', label: 'Yes - Negative' },
          { value: 'no', label: 'No' },
        ],
        required: true,
        sortOrder: 2,
        width: 'full',
      },
    ],
  },
  reason_for_visit: {
    name: 'Reason for Visit',
    description: 'Collect information about the purpose of the appointment',
    fields: [
      {
        id: 'chief_complaint',
        name: 'chief_complaint',
        label: 'What is the main reason for your visit today?',
        type: 'textarea',
        required: true,
        placeholder: 'Please describe your symptoms or concerns',
        sortOrder: 0,
        width: 'full',
        validationRules: {
          minLength: 10,
          maxLength: 1000,
        },
      },
      {
        id: 'symptom_duration',
        name: 'symptom_duration',
        label: 'How long have you been experiencing these symptoms?',
        type: 'select',
        options: [
          { value: 'today', label: 'Started today' },
          { value: 'days', label: 'A few days' },
          { value: 'week', label: 'About a week' },
          { value: 'weeks', label: 'Several weeks' },
          { value: 'months', label: 'A month or more' },
          { value: 'chronic', label: 'This is an ongoing condition' },
        ],
        sortOrder: 1,
        width: 'half',
      },
      {
        id: 'pain_level',
        name: 'pain_level',
        label: 'Rate your pain level (0 = no pain, 10 = severe pain)',
        type: 'number',
        sortOrder: 2,
        width: 'half',
        validationRules: {
          min: 0,
          max: 10,
        },
      },
      {
        id: 'prior_treatment',
        name: 'prior_treatment',
        label: 'Have you tried any treatments for this condition?',
        type: 'textarea',
        placeholder:
          'Describe any medications, home remedies, or other treatments',
        sortOrder: 3,
        width: 'full',
      },
    ],
  },
};

/**
 * Get available form templates
 */
export function getFormTemplates() {
  return Object.entries(FORM_TEMPLATES).map(([key, template]) => ({
    id: key,
    name: template.name,
    description: template.description,
    fieldCount: template.fields.length,
  }));
}

/**
 * Create a form from a template
 */
export async function createFormFromTemplate(
  bookingPageId: number,
  templateId: string,
  customName?: string,
) {
  const template = FORM_TEMPLATES[templateId];
  if (!template) {
    throw new Error('Template not found');
  }

  return createIntakeForm(bookingPageId, {
    name: customName || template.name,
    description: template.description,
    fields: template.fields,
    isRequired: false,
  });
}

// ============================================================================
// FORM VALIDATION
// ============================================================================

/**
 * Validate form responses
 */
export async function validateFormResponses(
  formId: number,
  responses: FormResponse,
): Promise<{ valid: boolean; errors: ValidationError[] }> {
  const form = await getIntakeForm(formId);
  if (!form) {
    throw new Error('Form not found');
  }

  const fields = form.fields as unknown as IntakeFormField[];
  const errors: ValidationError[] = [];

  for (const field of fields) {
    // Skip non-input fields
    if (['heading', 'paragraph', 'divider'].includes(field.type)) {
      continue;
    }

    const fieldKey = field.id || field.name;
    const value = responses[fieldKey];
    const isVisible = evaluateConditionalLogic(field, responses, fields);

    // Skip validation if field is hidden
    if (!isVisible) {
      continue;
    }

    // Check conditional requirement
    const isRequired = evaluateConditionalRequirement(field, responses, fields);

    // Required validation
    if (isRequired && isEmpty(value)) {
      errors.push({
        fieldId: fieldKey,
        fieldName: field.name,
        message: `${field.label} is required`,
      });
      continue;
    }

    // Skip further validation if value is empty and not required
    if (isEmpty(value)) {
      continue;
    }

    // Type-specific validation
    const typeError = validateFieldType(field, value);
    if (typeError) {
      errors.push({
        fieldId: fieldKey,
        fieldName: field.name,
        message: typeError,
      });
    }

    // Custom validation rules
    if (field.validationRules) {
      const ruleError = validateFieldRules(field, value);
      if (ruleError) {
        errors.push({
          fieldId: fieldKey,
          fieldName: field.name,
          message: ruleError,
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function validateFieldType(
  field: IntakeFormField,
  value: unknown,
): string | null {
  switch (field.type) {
    case 'email':
      if (
        typeof value === 'string' &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ) {
        return 'Please enter a valid email address';
      }
      break;

    case 'phone':
      if (typeof value === 'string' && !/^[\d\s\-+()]{10,}$/.test(value)) {
        return 'Please enter a valid phone number';
      }
      break;

    case 'number':
      if (typeof value !== 'number' && isNaN(Number(value))) {
        return 'Please enter a valid number';
      }
      break;

    case 'date':
      if (typeof value === 'string') {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return 'Please enter a valid date';
        }
      }
      break;
  }

  return null;
}

function validateFieldRules(
  field: IntakeFormField,
  value: unknown,
): string | null {
  const rules = field.validationRules;
  if (!rules) return null;

  if (typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      return `Must be at least ${rules.minLength} characters`;
    }
    if (rules.maxLength && value.length > rules.maxLength) {
      return `Must be no more than ${rules.maxLength} characters`;
    }
    if (rules.pattern) {
      const regex = new RegExp(rules.pattern);
      if (!regex.test(value)) {
        return rules.patternMessage || 'Invalid format';
      }
    }
  }

  if (typeof value === 'number') {
    if (rules.min !== undefined && value < rules.min) {
      return `Must be at least ${rules.min}`;
    }
    if (rules.max !== undefined && value > rules.max) {
      return `Must be no more than ${rules.max}`;
    }
  }

  return null;
}

// ============================================================================
// CONDITIONAL LOGIC
// ============================================================================

/**
 * Evaluate if a field should be visible based on conditional logic
 */
function evaluateConditionalLogic(
  field: IntakeFormField,
  responses: FormResponse,
  _allFields: IntakeFormField[],
): boolean {
  const logic = field.conditionalLogic;
  if (!logic || logic.action !== 'show') {
    // If action is 'hide', invert the logic
    if (logic?.action === 'hide') {
      return !evaluateRules(logic.rules, logic.logicType, responses);
    }
    return true; // No conditional logic means always visible
  }

  return evaluateRules(logic.rules, logic.logicType, responses);
}

/**
 * Evaluate if a field should be required based on conditional logic
 */
function evaluateConditionalRequirement(
  field: IntakeFormField,
  responses: FormResponse,
  _allFields: IntakeFormField[],
): boolean {
  // Base requirement
  if (field.required) return true;

  // Check for conditional requirement
  const logic = field.conditionalLogic;
  if (!logic || logic.action !== 'require') {
    return false;
  }

  return evaluateRules(logic.rules, logic.logicType, responses);
}

function evaluateRules(
  rules: ConditionalRule[],
  logicType: 'all' | 'any',
  responses: FormResponse,
): boolean {
  if (logicType === 'all') {
    return rules.every((rule) => evaluateRule(rule, responses));
  }
  return rules.some((rule) => evaluateRule(rule, responses));
}

function evaluateRule(rule: ConditionalRule, responses: FormResponse): boolean {
  const fieldValue = responses[rule.fieldId];

  switch (rule.operator) {
    case 'equals':
      return fieldValue === rule.value;

    case 'not_equals':
      return fieldValue !== rule.value;

    case 'contains':
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(rule.value);
      }
      if (typeof fieldValue === 'string' && typeof rule.value === 'string') {
        return fieldValue.toLowerCase().includes(rule.value.toLowerCase());
      }
      return false;

    case 'not_contains':
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(rule.value);
      }
      if (typeof fieldValue === 'string' && typeof rule.value === 'string') {
        return !fieldValue.toLowerCase().includes(rule.value.toLowerCase());
      }
      return true;

    case 'greater_than':
      return Number(fieldValue) > Number(rule.value);

    case 'less_than':
      return Number(fieldValue) < Number(rule.value);

    case 'is_empty':
      return isEmpty(fieldValue);

    case 'is_not_empty':
      return !isEmpty(fieldValue);

    default:
      return true;
  }
}

// ============================================================================
// RESPONSE MANAGEMENT
// ============================================================================

/**
 * Save form response
 */
export async function saveFormResponse(
  formId: number,
  appointmentId: number,
  responses: FormResponse,
) {
  // Validate responses first
  const validation = await validateFormResponses(formId, responses);
  if (!validation.valid) {
    throw new Error(
      `Validation failed: ${validation.errors.map((e) => e.message).join(', ')}`,
    );
  }

  // Check if response already exists
  const existing = await prisma.bookingIntakeFormResponse.findFirst({
    where: { formId, appointmentId },
  });

  if (existing) {
    return prisma.bookingIntakeFormResponse.update({
      where: { id: existing.id },
      data: {
        responses: responses as Prisma.InputJsonValue,
        submittedAt: new Date(),
      },
    });
  }

  return prisma.bookingIntakeFormResponse.create({
    data: {
      formId,
      appointmentId,
      responses: responses as Prisma.InputJsonValue,
    },
  });
}

/**
 * Get form response for an appointment
 */
export async function getFormResponse(formId: number, appointmentId: number) {
  return prisma.bookingIntakeFormResponse.findFirst({
    where: { formId, appointmentId },
    include: {
      form: true,
    },
  });
}

/**
 * Get all responses for an appointment
 */
export async function getAppointmentResponses(appointmentId: number) {
  return prisma.bookingIntakeFormResponse.findMany({
    where: { appointmentId },
    include: {
      form: true,
    },
    orderBy: { form: { displayOrder: 'asc' } },
  });
}

/**
 * Get all responses for a form
 */
export async function getFormResponses(
  formId: number,
  options: { limit?: number; offset?: number } = {},
) {
  const { limit = 50, offset = 0 } = options;

  return prisma.bookingIntakeFormResponse.findMany({
    where: { formId },
    include: {
      appointment: {
        select: {
          id: true,
          patientName: true,
          patientEmail: true,
          scheduledAt: true,
        },
      },
    },
    orderBy: { submittedAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Process and validate fields before saving
 */
function processFields(fields: IntakeFormField[]): IntakeFormField[] {
  return fields.map((field, index) => ({
    ...field,
    id: field.id || generateFieldId(field.name),
    sortOrder: field.sortOrder ?? index,
    pageNumber: field.pageNumber ?? 1,
  }));
}

/**
 * Generate a unique field ID from field name
 */
function generateFieldId(name: string): string {
  return `${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now().toString(36)}`;
}

/**
 * Get fields visibility state based on responses
 */
export function getFieldsVisibility(
  fields: IntakeFormField[],
  responses: FormResponse,
): Record<string, boolean> {
  const visibility: Record<string, boolean> = {};

  for (const field of fields) {
    const fieldKey = field.id || field.name;
    visibility[fieldKey] = evaluateConditionalLogic(field, responses, fields);
  }

  return visibility;
}

/**
 * Get required fields based on responses
 */
export function getRequiredFields(
  fields: IntakeFormField[],
  responses: FormResponse,
): string[] {
  const required: string[] = [];

  for (const field of fields) {
    if (evaluateConditionalRequirement(field, responses, fields)) {
      required.push(field.id || field.name);
    }
  }

  return required;
}
