/**
 * Field Mapper Service
 *
 * Maps AI-generated field definitions to the intake form schema.
 * Handles validation, normalization, and type conversion.
 */

import { FieldType } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface AIGeneratedField {
  name?: string;
  label?: string;
  type?: string;
  placeholder?: string;
  helpText?: string;
  isRequired?: boolean;
  required?: boolean; // Alternative key AI might use
  validationRules?: Record<string, unknown>;
  validation?: Record<string, unknown>; // Alternative key
  options?: Array<{ value: string; label: string } | string>;
  choices?: Array<{ value: string; label: string } | string>; // Alternative key
  conditionalLogic?: Record<string, unknown>;
  showIf?: Record<string, unknown>; // Alternative key
  pageNumber?: number;
  page?: number; // Alternative key
  sortOrder?: number;
  order?: number; // Alternative key
  width?: string;
  size?: string; // Alternative key
}

export interface MappedField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  helpText?: string;
  isRequired: boolean;
  validationRules?: Record<string, unknown>;
  options?: Array<{ value: string; label: string }>;
  conditionalLogic?: Record<string, unknown>;
  pageNumber: number;
  sortOrder: number;
  width: 'full' | 'half' | 'third';
}

// ============================================================================
// FIELD TYPE MAPPING
// ============================================================================

const TYPE_ALIASES: Record<string, FieldType> = {
  // Standard types
  text: 'TEXT',
  string: 'TEXT',
  input: 'TEXT',
  textfield: 'TEXT',
  short_text: 'TEXT',

  textarea: 'TEXTAREA',
  longtext: 'TEXTAREA',
  long_text: 'TEXTAREA',
  multiline: 'TEXTAREA',
  paragraph: 'TEXTAREA',
  description: 'TEXTAREA',

  email: 'EMAIL',
  mail: 'EMAIL',
  emailaddress: 'EMAIL',
  email_address: 'EMAIL',

  phone: 'PHONE',
  telephone: 'PHONE',
  tel: 'PHONE',
  phonenumber: 'PHONE',
  phone_number: 'PHONE',
  mobile: 'PHONE',

  number: 'NUMBER',
  numeric: 'NUMBER',
  integer: 'NUMBER',
  decimal: 'NUMBER',
  float: 'NUMBER',
  currency: 'NUMBER',
  money: 'NUMBER',

  date: 'DATE',
  datepicker: 'DATE',
  date_picker: 'DATE',
  birthday: 'DATE',
  dob: 'DATE',

  time: 'TIME',
  timepicker: 'TIME',
  time_picker: 'TIME',

  datetime: 'DATETIME',
  date_time: 'DATETIME',
  datetimepicker: 'DATETIME',
  timestamp: 'DATETIME',

  select: 'SELECT',
  dropdown: 'SELECT',
  single_select: 'SELECT',
  singleselect: 'SELECT',
  choice: 'SELECT',
  picker: 'SELECT',

  multiselect: 'MULTISELECT',
  multi_select: 'MULTISELECT',
  multiple: 'MULTISELECT',
  multiple_select: 'MULTISELECT',
  tags: 'MULTISELECT',

  checkbox: 'CHECKBOX',
  check: 'CHECKBOX',
  boolean: 'CHECKBOX',
  toggle: 'CHECKBOX',
  checkboxgroup: 'CHECKBOX',
  checkbox_group: 'CHECKBOX',

  radio: 'RADIO',
  radiogroup: 'RADIO',
  radio_group: 'RADIO',
  radiobutton: 'RADIO',
  radio_button: 'RADIO',
  single_choice: 'RADIO',

  file: 'FILE_UPLOAD',
  file_upload: 'FILE_UPLOAD',
  fileupload: 'FILE_UPLOAD',
  upload: 'FILE_UPLOAD',
  attachment: 'FILE_UPLOAD',
  document: 'FILE_UPLOAD',

  signature: 'SIGNATURE',
  sign: 'SIGNATURE',
  esignature: 'SIGNATURE',
  e_signature: 'SIGNATURE',
  digital_signature: 'SIGNATURE',

  address: 'ADDRESS',
  location: 'ADDRESS',
  full_address: 'ADDRESS',
  mailing_address: 'ADDRESS',

  ssn: 'SSN_LAST4',
  ssn_last4: 'SSN_LAST4',
  social_security: 'SSN_LAST4',
  ssn4: 'SSN_LAST4',

  insurance: 'INSURANCE_INFO',
  insurance_info: 'INSURANCE_INFO',
  insuranceinfo: 'INSURANCE_INFO',
  health_insurance: 'INSURANCE_INFO',
};

// ============================================================================
// MAIN MAPPING FUNCTION
// ============================================================================

/**
 * Map an array of AI-generated fields to the intake form schema
 */
export function mapAIFieldsToSchema(
  aiFields: AIGeneratedField[],
): MappedField[] {
  if (!Array.isArray(aiFields)) {
    console.warn(
      'mapAIFieldsToSchema received non-array input:',
      typeof aiFields,
    );
    return [];
  }

  const mappedFields: MappedField[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < aiFields.length; i++) {
    const aiField = aiFields[i];

    if (!aiField || typeof aiField !== 'object') {
      continue;
    }

    try {
      const mapped = mapSingleField(aiField, i, usedNames);
      if (mapped) {
        mappedFields.push(mapped);
        usedNames.add(mapped.name);
      }
    } catch (error) {
      console.warn(`Failed to map field at index ${i}:`, error);
    }
  }

  return mappedFields;
}

/**
 * Map a single AI-generated field to the schema
 */
function mapSingleField(
  aiField: AIGeneratedField,
  index: number,
  usedNames: Set<string>,
): MappedField | null {
  // Extract and normalize field name
  let name = normalizeFieldName(
    aiField.name || aiField.label || `field_${index}`,
  );

  // Ensure unique name
  if (usedNames.has(name)) {
    name = `${name}_${index}`;
  }

  // Extract label
  const label = aiField.label || humanizeFieldName(name);

  // Map field type
  const type = mapFieldType(aiField.type);

  // Extract isRequired (handle multiple possible keys)
  const isRequired = Boolean(aiField.isRequired ?? aiField.required ?? false);

  // Extract options and normalize
  const rawOptions = aiField.options || aiField.choices;
  const options = rawOptions ? normalizeOptions(rawOptions, type) : undefined;

  // Extract validation rules
  const validationRules = normalizeValidationRules(
    aiField.validationRules || aiField.validation,
  );

  // Extract conditional logic
  const conditionalLogic = normalizeConditionalLogic(
    aiField.conditionalLogic || aiField.showIf,
  );

  // Extract layout properties
  const pageNumber = aiField.pageNumber || aiField.page || 1;
  const sortOrder = aiField.sortOrder ?? aiField.order ?? index;
  const width = normalizeWidth(aiField.width || aiField.size);

  return {
    name,
    label,
    type,
    placeholder: aiField.placeholder,
    helpText: aiField.helpText,
    isRequired,
    validationRules,
    options,
    conditionalLogic,
    pageNumber,
    sortOrder,
    width,
  };
}

// ============================================================================
// NORMALIZATION FUNCTIONS
// ============================================================================

/**
 * Normalize field name to valid format
 */
function normalizeFieldName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .replace(/^([0-9])/, '_$1') // Don't start with number
    .toLowerCase()
    .substring(0, 50);
}

/**
 * Convert field name to human-readable label
 */
function humanizeFieldName(name: string): string {
  return name
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Map AI type string to valid FieldType
 */
function mapFieldType(typeStr?: string): FieldType {
  if (!typeStr) return 'TEXT';

  const normalized = typeStr.toLowerCase().replace(/[^a-z0-9_]/g, '');

  // Check direct match first
  if (isValidFieldType(typeStr.toUpperCase())) {
    return typeStr.toUpperCase() as FieldType;
  }

  // Check aliases
  if (TYPE_ALIASES[normalized]) {
    return TYPE_ALIASES[normalized];
  }

  // Default to TEXT for unknown types
  console.warn(`Unknown field type "${typeStr}", defaulting to TEXT`);
  return 'TEXT';
}

/**
 * Check if a string is a valid FieldType
 */
function isValidFieldType(type: string): boolean {
  const validTypes: FieldType[] = [
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
  ];
  return validTypes.includes(type as FieldType);
}

/**
 * Normalize options array to standard format
 */
function normalizeOptions(
  options: Array<{ value: string; label: string } | string>,
  _fieldType: FieldType,
): Array<{ value: string; label: string }> | undefined {
  if (!Array.isArray(options) || options.length === 0) {
    return undefined;
  }

  return options.map((opt, index) => {
    if (typeof opt === 'string') {
      // Convert string to value/label object
      const value = opt.toLowerCase().replace(/[^a-z0-9]/g, '_');
      return { value: value || `option_${index}`, label: opt };
    }

    if (typeof opt === 'object' && opt !== null) {
      return {
        value: String(opt.value || opt.label || `option_${index}`)
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '_'),
        label: String(opt.label || opt.value || `Option ${index + 1}`),
      };
    }

    return { value: `option_${index}`, label: `Option ${index + 1}` };
  });
}

/**
 * Normalize validation rules
 */
function normalizeValidationRules(
  rules?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!rules || typeof rules !== 'object') {
    return undefined;
  }

  const normalized: Record<string, unknown> = {};

  // Common validation rule mappings
  const ruleMap: Record<string, string> = {
    min: 'minLength',
    max: 'maxLength',
    minlength: 'minLength',
    maxlength: 'maxLength',
    min_length: 'minLength',
    max_length: 'maxLength',
    minvalue: 'min',
    maxvalue: 'max',
    min_value: 'min',
    max_value: 'max',
    regex: 'pattern',
    regexp: 'pattern',
    format: 'pattern',
  };

  for (const [key, value] of Object.entries(rules)) {
    const normalizedKey = ruleMap[key.toLowerCase()] || key;
    normalized[normalizedKey] = value;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

/**
 * Normalize conditional logic
 */
function normalizeConditionalLogic(
  logic?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!logic || typeof logic !== 'object') {
    return undefined;
  }

  // Expected format: { field: "fieldName", operator: "equals", value: "someValue", action: "show" }
  const normalized: Record<string, unknown> = {};

  if (logic.field || logic.dependsOn || logic.when) {
    normalized.field = logic.field || logic.dependsOn || logic.when;
  }

  if (logic.operator || logic.condition || logic.op) {
    normalized.operator = logic.operator || logic.condition || logic.op;
  }

  if ('value' in logic || 'equals' in logic || 'is' in logic) {
    normalized.value = logic.value ?? logic.equals ?? logic.is;
  }

  if (logic.action || logic.then) {
    normalized.action = logic.action || logic.then;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

/**
 * Normalize width value
 */
function normalizeWidth(width?: string): 'full' | 'half' | 'third' {
  if (!width) return 'full';

  const normalized = width.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (
    normalized.includes('half') ||
    normalized === '50' ||
    normalized === '2'
  ) {
    return 'half';
  }

  if (
    normalized.includes('third') ||
    normalized === '33' ||
    normalized === '3'
  ) {
    return 'third';
  }

  return 'full';
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate a mapped field
 */
export function validateMappedField(field: MappedField): string[] {
  const errors: string[] = [];

  if (!field.name || field.name.length < 1) {
    errors.push('Field name is required');
  }

  if (!field.label || field.label.length < 1) {
    errors.push('Field label is required');
  }

  if (field.name && field.name.length > 50) {
    errors.push('Field name must be 50 characters or less');
  }

  if (field.label && field.label.length > 200) {
    errors.push('Field label must be 200 characters or less');
  }

  // Validate options for select/radio/checkbox types
  const typesRequiringOptions: FieldType[] = ['SELECT', 'MULTISELECT', 'RADIO'];
  if (
    typesRequiringOptions.includes(field.type) &&
    (!field.options || field.options.length === 0)
  ) {
    errors.push(`Field type ${field.type} requires at least one option`);
  }

  return errors;
}

/**
 * Validate all mapped fields
 */
export function validateMappedFields(fields: MappedField[]): {
  valid: boolean;
  errors: Record<string, string[]>;
} {
  const errors: Record<string, string[]> = {};
  let valid = true;

  for (const field of fields) {
    const fieldErrors = validateMappedField(field);
    if (fieldErrors.length > 0) {
      errors[field.name] = fieldErrors;
      valid = false;
    }
  }

  return { valid, errors };
}
