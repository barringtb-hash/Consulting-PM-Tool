/**
 * AI Form Generator Service
 *
 * Generates intake forms from natural language descriptions using AI.
 * Supports industry-specific templates and intelligent field suggestions.
 */

import { env } from '../../../config/env';
import { FieldType } from '@prisma/client';
import { detectIndustry, IndustryType } from './industry-detector';
import { mapAIFieldsToSchema, AIGeneratedField } from './field-mapper';
import { getIndustryPrompt } from './prompts';

// ============================================================================
// TYPES
// ============================================================================

export interface FormGenerationRequest {
  description: string;
  industry?: IndustryType;
  formName?: string;
  includeCompliance?: boolean;
  maxFields?: number;
}

export interface GeneratedForm {
  name: string;
  description: string;
  slug: string;
  isMultiPage: boolean;
  fields: GeneratedField[];
  suggestedCompliance?: string[];
  confidence: number;
  detectedIndustry: IndustryType;
}

export interface GeneratedField {
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

export interface FieldSuggestion {
  name: string;
  label: string;
  type: FieldType;
  reason: string;
  confidence: number;
}

// ============================================================================
// MAIN SERVICE FUNCTIONS
// ============================================================================

/**
 * Generate a complete intake form from a natural language description
 */
export async function generateForm(
  request: FormGenerationRequest
): Promise<GeneratedForm> {
  const { description, formName, includeCompliance = true, maxFields = 20 } = request;

  // Detect industry if not provided
  const industry = request.industry || (await detectIndustry(description));

  // If no API key, use rule-based generation
  if (!env.openaiApiKey) {
    return generateFormRuleBased(description, industry, formName, maxFields);
  }

  try {
    const systemPrompt = buildFormGenerationSystemPrompt(industry, includeCompliance);
    const userPrompt = buildFormGenerationUserPrompt(description, formName, maxFields);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 4000,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return generateFormRuleBased(description, industry, formName, maxFields);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;
    const parsed = JSON.parse(generatedContent);

    // Map AI-generated fields to our schema
    const mappedFields = mapAIFieldsToSchema(parsed.fields || []);

    return {
      name: parsed.name || formName || 'Generated Intake Form',
      description: parsed.description || description,
      slug: generateSlug(parsed.name || formName || 'intake-form'),
      isMultiPage: mappedFields.length > 10,
      fields: mappedFields,
      suggestedCompliance: parsed.suggestedCompliance || [],
      confidence: parsed.confidence || 0.8,
      detectedIndustry: industry,
    };
  } catch (error) {
    console.error('Error generating form with AI:', error);
    return generateFormRuleBased(description, industry, formName, maxFields);
  }
}

/**
 * Suggest additional fields based on existing form context
 */
export async function suggestFields(
  formContext: {
    existingFields: string[];
    formName: string;
    industry?: IndustryType;
    description?: string;
  }
): Promise<FieldSuggestion[]> {
  const industry = formContext.industry || 'general';

  // If no API key, use rule-based suggestions
  if (!env.openaiApiKey) {
    return suggestFieldsRuleBased(formContext.existingFields, industry);
  }

  try {
    const systemPrompt = `You are an expert at designing intake forms. Given the context of an existing form, suggest additional fields that would be valuable.

Return a JSON object with a "suggestions" array, where each suggestion has:
- name: field name (camelCase)
- label: display label
- type: one of TEXT, TEXTAREA, EMAIL, PHONE, NUMBER, DATE, TIME, DATETIME, SELECT, MULTISELECT, CHECKBOX, RADIO, FILE_UPLOAD, SIGNATURE, ADDRESS, SSN_LAST4, INSURANCE_INFO
- reason: why this field would be valuable
- confidence: 0-1 score for how confident you are in this suggestion`;

    const userPrompt = `Form Name: ${formContext.formName}
Industry: ${industry}
${formContext.description ? `Description: ${formContext.description}` : ''}

Existing Fields: ${formContext.existingFields.join(', ')}

Suggest 3-5 additional fields that would enhance this form.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1500,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      return suggestFieldsRuleBased(formContext.existingFields, industry);
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);

    return (parsed.suggestions || []).map((s: FieldSuggestion) => ({
      name: s.name,
      label: s.label,
      type: validateFieldType(s.type),
      reason: s.reason,
      confidence: s.confidence || 0.7,
    }));
  } catch (error) {
    console.error('Error suggesting fields with AI:', error);
    return suggestFieldsRuleBased(formContext.existingFields, industry);
  }
}

// ============================================================================
// PROMPT BUILDERS
// ============================================================================

function buildFormGenerationSystemPrompt(
  industry: IndustryType,
  includeCompliance: boolean
): string {
  const industryPrompt = getIndustryPrompt(industry);

  return `You are an expert intake form designer. Your task is to generate a comprehensive intake form based on a natural language description.

${industryPrompt}

IMPORTANT GUIDELINES:
1. Generate practical, relevant fields that collect necessary information
2. Use appropriate field types for each data point
3. Group related fields logically
4. Include validation rules where appropriate
5. Consider mobile-friendly layouts (use 'half' width for short fields like name, phone)
6. Mark essential fields as required
7. Add helpful placeholder text and help text
${includeCompliance ? '8. Suggest relevant compliance requirements based on the industry' : ''}

FIELD TYPES AVAILABLE:
- TEXT: Short text input
- TEXTAREA: Multi-line text
- EMAIL: Email address with validation
- PHONE: Phone number
- NUMBER: Numeric input
- DATE: Date picker
- TIME: Time picker
- DATETIME: Combined date and time
- SELECT: Single selection dropdown
- MULTISELECT: Multiple selection
- CHECKBOX: Single checkbox or checkbox group
- RADIO: Radio button group
- FILE_UPLOAD: File attachment
- SIGNATURE: Electronic signature
- ADDRESS: Full address with components
- SSN_LAST4: Last 4 digits of SSN (masked)
- INSURANCE_INFO: Insurance information block

Return a JSON object with this structure:
{
  "name": "Form name",
  "description": "Form description",
  "fields": [
    {
      "name": "fieldName",
      "label": "Field Label",
      "type": "FIELD_TYPE",
      "placeholder": "Optional placeholder",
      "helpText": "Optional help text",
      "isRequired": true/false,
      "validationRules": { "minLength": 2, "maxLength": 100 },
      "options": [{ "value": "val", "label": "Label" }],
      "pageNumber": 1,
      "sortOrder": 0,
      "width": "full" | "half" | "third"
    }
  ],
  "suggestedCompliance": ["HIPAA", "GDPR"],
  "confidence": 0.85
}`;
}

function buildFormGenerationUserPrompt(
  description: string,
  formName?: string,
  maxFields?: number
): string {
  let prompt = `Generate an intake form based on this description:\n\n"${description}"`;

  if (formName) {
    prompt += `\n\nForm Name: ${formName}`;
  }

  if (maxFields) {
    prompt += `\n\nMaximum number of fields: ${maxFields}`;
  }

  return prompt;
}

// ============================================================================
// RULE-BASED FALLBACK FUNCTIONS
// ============================================================================

function generateFormRuleBased(
  description: string,
  industry: IndustryType,
  formName?: string,
  maxFields?: number
): GeneratedForm {
  const lowerDesc = description.toLowerCase();
  const fields: GeneratedField[] = [];
  let sortOrder = 0;

  // Always include basic contact fields
  fields.push(
    createField('firstName', 'First Name', 'TEXT', true, sortOrder++, 'half'),
    createField('lastName', 'Last Name', 'TEXT', true, sortOrder++, 'half'),
    createField('email', 'Email Address', 'EMAIL', true, sortOrder++, 'half'),
    createField('phone', 'Phone Number', 'PHONE', true, sortOrder++, 'half')
  );

  // Industry-specific fields
  const industryFields = getIndustrySpecificFields(industry, sortOrder);
  fields.push(...industryFields);
  sortOrder += industryFields.length;

  // Context-based fields from description
  if (lowerDesc.includes('company') || lowerDesc.includes('business') || lowerDesc.includes('organization')) {
    fields.push(createField('companyName', 'Company/Organization Name', 'TEXT', false, sortOrder++, 'full'));
    fields.push(createField('jobTitle', 'Job Title', 'TEXT', false, sortOrder++, 'half'));
  }

  if (lowerDesc.includes('address') || lowerDesc.includes('location')) {
    fields.push(createField('address', 'Address', 'ADDRESS', false, sortOrder++, 'full'));
  }

  if (lowerDesc.includes('budget') || lowerDesc.includes('price') || lowerDesc.includes('cost')) {
    fields.push(createField('budget', 'Budget Range', 'SELECT', false, sortOrder++, 'half', {
      options: [
        { value: 'under_5k', label: 'Under $5,000' },
        { value: '5k_15k', label: '$5,000 - $15,000' },
        { value: '15k_50k', label: '$15,000 - $50,000' },
        { value: '50k_100k', label: '$50,000 - $100,000' },
        { value: 'over_100k', label: 'Over $100,000' },
      ],
    }));
  }

  if (lowerDesc.includes('timeline') || lowerDesc.includes('deadline') || lowerDesc.includes('start date')) {
    fields.push(createField('preferredStartDate', 'Preferred Start Date', 'DATE', false, sortOrder++, 'half'));
  }

  if (lowerDesc.includes('document') || lowerDesc.includes('file') || lowerDesc.includes('upload')) {
    fields.push(createField('documents', 'Upload Documents', 'FILE_UPLOAD', false, sortOrder++, 'full'));
  }

  if (lowerDesc.includes('sign') || lowerDesc.includes('agreement') || lowerDesc.includes('consent')) {
    fields.push(createField('signature', 'Electronic Signature', 'SIGNATURE', true, sortOrder++, 'full'));
  }

  // Always add a notes/comments field
  fields.push(createField('additionalNotes', 'Additional Notes or Comments', 'TEXTAREA', false, sortOrder++, 'full'));

  // Limit fields if specified
  const limitedFields = maxFields ? fields.slice(0, maxFields) : fields;

  return {
    name: formName || 'Client Intake Form',
    description: description,
    slug: generateSlug(formName || 'client-intake'),
    isMultiPage: limitedFields.length > 10,
    fields: limitedFields.map((f, i) => ({ ...f, sortOrder: i })),
    suggestedCompliance: getComplianceSuggestions(industry),
    confidence: 0.6,
    detectedIndustry: industry,
  };
}

function getIndustrySpecificFields(industry: IndustryType, startSortOrder: number): GeneratedField[] {
  const fields: GeneratedField[] = [];
  let sortOrder = startSortOrder;

  switch (industry) {
    case 'legal':
      fields.push(
        createField('caseType', 'Type of Legal Matter', 'SELECT', true, sortOrder++, 'full', {
          options: [
            { value: 'personal_injury', label: 'Personal Injury' },
            { value: 'family_law', label: 'Family Law' },
            { value: 'criminal_defense', label: 'Criminal Defense' },
            { value: 'business_law', label: 'Business Law' },
            { value: 'real_estate', label: 'Real Estate' },
            { value: 'estate_planning', label: 'Estate Planning' },
            { value: 'immigration', label: 'Immigration' },
            { value: 'other', label: 'Other' },
          ],
        }),
        createField('caseDescription', 'Brief Description of Your Legal Matter', 'TEXTAREA', true, sortOrder++, 'full'),
        createField('incidentDate', 'Date of Incident (if applicable)', 'DATE', false, sortOrder++, 'half'),
        createField('opposingParty', 'Opposing Party (if known)', 'TEXT', false, sortOrder++, 'half'),
        createField('priorAttorney', 'Have you consulted with another attorney?', 'RADIO', false, sortOrder++, 'full', {
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ],
        })
      );
      break;

    case 'healthcare':
      fields.push(
        createField('dateOfBirth', 'Date of Birth', 'DATE', true, sortOrder++, 'half'),
        createField('insuranceInfo', 'Insurance Information', 'INSURANCE_INFO', false, sortOrder++, 'full'),
        createField('primaryConcern', 'Primary Health Concern', 'TEXTAREA', true, sortOrder++, 'full'),
        createField('currentMedications', 'Current Medications', 'TEXTAREA', false, sortOrder++, 'full'),
        createField('allergies', 'Known Allergies', 'TEXTAREA', false, sortOrder++, 'full'),
        createField('emergencyContact', 'Emergency Contact Name', 'TEXT', true, sortOrder++, 'half'),
        createField('emergencyPhone', 'Emergency Contact Phone', 'PHONE', true, sortOrder++, 'half')
      );
      break;

    case 'financial':
      fields.push(
        createField('serviceType', 'Type of Financial Service Needed', 'SELECT', true, sortOrder++, 'full', {
          options: [
            { value: 'tax_preparation', label: 'Tax Preparation' },
            { value: 'bookkeeping', label: 'Bookkeeping' },
            { value: 'financial_planning', label: 'Financial Planning' },
            { value: 'investment_advisory', label: 'Investment Advisory' },
            { value: 'audit', label: 'Audit Services' },
            { value: 'business_consulting', label: 'Business Consulting' },
            { value: 'other', label: 'Other' },
          ],
        }),
        createField('annualRevenue', 'Annual Revenue (if business)', 'SELECT', false, sortOrder++, 'half', {
          options: [
            { value: 'under_100k', label: 'Under $100,000' },
            { value: '100k_500k', label: '$100,000 - $500,000' },
            { value: '500k_1m', label: '$500,000 - $1 Million' },
            { value: '1m_5m', label: '$1 Million - $5 Million' },
            { value: 'over_5m', label: 'Over $5 Million' },
          ],
        }),
        createField('entityType', 'Business Entity Type', 'SELECT', false, sortOrder++, 'half', {
          options: [
            { value: 'individual', label: 'Individual' },
            { value: 'sole_proprietor', label: 'Sole Proprietor' },
            { value: 'llc', label: 'LLC' },
            { value: 'corporation', label: 'Corporation' },
            { value: 'partnership', label: 'Partnership' },
            { value: 'nonprofit', label: 'Non-Profit' },
          ],
        }),
        createField('ssnLast4', 'Last 4 Digits of SSN', 'SSN_LAST4', false, sortOrder++, 'half')
      );
      break;

    case 'consulting':
      fields.push(
        createField('projectType', 'Type of Consulting Needed', 'SELECT', true, sortOrder++, 'full', {
          options: [
            { value: 'strategy', label: 'Strategy Consulting' },
            { value: 'operations', label: 'Operations Improvement' },
            { value: 'technology', label: 'Technology Consulting' },
            { value: 'marketing', label: 'Marketing Strategy' },
            { value: 'hr', label: 'HR & Organizational' },
            { value: 'change_management', label: 'Change Management' },
            { value: 'other', label: 'Other' },
          ],
        }),
        createField('currentChallenges', 'Describe Your Current Challenges', 'TEXTAREA', true, sortOrder++, 'full'),
        createField('desiredOutcome', 'What Outcome Are You Hoping to Achieve?', 'TEXTAREA', true, sortOrder++, 'full'),
        createField('teamSize', 'Team Size', 'SELECT', false, sortOrder++, 'half', {
          options: [
            { value: '1_10', label: '1-10 employees' },
            { value: '11_50', label: '11-50 employees' },
            { value: '51_200', label: '51-200 employees' },
            { value: '201_500', label: '201-500 employees' },
            { value: 'over_500', label: 'Over 500 employees' },
          ],
        })
      );
      break;

    case 'real_estate':
      fields.push(
        createField('transactionType', 'Transaction Type', 'SELECT', true, sortOrder++, 'full', {
          options: [
            { value: 'buying', label: 'Buying' },
            { value: 'selling', label: 'Selling' },
            { value: 'renting', label: 'Renting' },
            { value: 'leasing', label: 'Leasing' },
            { value: 'investment', label: 'Investment Property' },
          ],
        }),
        createField('propertyType', 'Property Type', 'SELECT', true, sortOrder++, 'half', {
          options: [
            { value: 'residential', label: 'Residential' },
            { value: 'commercial', label: 'Commercial' },
            { value: 'industrial', label: 'Industrial' },
            { value: 'land', label: 'Land' },
            { value: 'multi_family', label: 'Multi-Family' },
          ],
        }),
        createField('priceRange', 'Price Range', 'SELECT', false, sortOrder++, 'half', {
          options: [
            { value: 'under_200k', label: 'Under $200,000' },
            { value: '200k_500k', label: '$200,000 - $500,000' },
            { value: '500k_1m', label: '$500,000 - $1 Million' },
            { value: '1m_5m', label: '$1 Million - $5 Million' },
            { value: 'over_5m', label: 'Over $5 Million' },
          ],
        }),
        createField('preferredLocation', 'Preferred Location/Area', 'TEXT', false, sortOrder++, 'full')
      );
      break;

    default:
      // General business fields
      fields.push(
        createField('serviceInterest', 'What Service Are You Interested In?', 'TEXTAREA', true, sortOrder++, 'full'),
        createField('howDidYouHear', 'How Did You Hear About Us?', 'SELECT', false, sortOrder++, 'full', {
          options: [
            { value: 'search', label: 'Search Engine' },
            { value: 'referral', label: 'Referral' },
            { value: 'social_media', label: 'Social Media' },
            { value: 'advertisement', label: 'Advertisement' },
            { value: 'event', label: 'Event/Conference' },
            { value: 'other', label: 'Other' },
          ],
        })
      );
  }

  return fields;
}

function getComplianceSuggestions(industry: IndustryType): string[] {
  switch (industry) {
    case 'healthcare':
      return ['HIPAA', 'PHI Protection'];
    case 'financial':
      return ['SOX', 'PCI-DSS', 'AML/KYC'];
    case 'legal':
      return ['Attorney-Client Privilege', 'Conflict of Interest Check', 'State Bar Rules'];
    case 'real_estate':
      return ['Fair Housing', 'RESPA'];
    default:
      return ['GDPR', 'CCPA'];
  }
}

function suggestFieldsRuleBased(
  existingFields: string[],
  industry: IndustryType
): FieldSuggestion[] {
  const suggestions: FieldSuggestion[] = [];
  const existingLower = existingFields.map(f => f.toLowerCase());

  // Common suggestions based on what's missing
  if (!existingLower.some(f => f.includes('email'))) {
    suggestions.push({
      name: 'email',
      label: 'Email Address',
      type: 'EMAIL',
      reason: 'Essential for follow-up communication',
      confidence: 0.95,
    });
  }

  if (!existingLower.some(f => f.includes('phone'))) {
    suggestions.push({
      name: 'phone',
      label: 'Phone Number',
      type: 'PHONE',
      reason: 'Important for direct contact',
      confidence: 0.9,
    });
  }

  if (!existingLower.some(f => f.includes('consent') || f.includes('agree'))) {
    suggestions.push({
      name: 'termsConsent',
      label: 'I agree to the terms and conditions',
      type: 'CHECKBOX',
      reason: 'Required for legal compliance',
      confidence: 0.85,
    });
  }

  // Industry-specific suggestions
  if (industry === 'healthcare' && !existingLower.some(f => f.includes('birth') || f.includes('dob'))) {
    suggestions.push({
      name: 'dateOfBirth',
      label: 'Date of Birth',
      type: 'DATE',
      reason: 'Essential for patient identification in healthcare',
      confidence: 0.95,
    });
  }

  if (industry === 'legal' && !existingLower.some(f => f.includes('case') || f.includes('matter'))) {
    suggestions.push({
      name: 'caseType',
      label: 'Type of Legal Matter',
      type: 'SELECT',
      reason: 'Helps route to appropriate practice area',
      confidence: 0.9,
    });
  }

  return suggestions.slice(0, 5);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createField(
  name: string,
  label: string,
  type: FieldType,
  isRequired: boolean,
  sortOrder: number,
  width: 'full' | 'half' | 'third' = 'full',
  extra?: { options?: Array<{ value: string; label: string }>; validationRules?: Record<string, unknown> }
): GeneratedField {
  return {
    name,
    label,
    type,
    isRequired,
    sortOrder,
    pageNumber: 1,
    width,
    placeholder: getPlaceholder(type, label),
    helpText: undefined,
    options: extra?.options,
    validationRules: extra?.validationRules,
    conditionalLogic: undefined,
  };
}

function getPlaceholder(type: FieldType, label: string): string | undefined {
  switch (type) {
    case 'EMAIL':
      return 'email@example.com';
    case 'PHONE':
      return '(555) 123-4567';
    case 'TEXT':
      return `Enter ${label.toLowerCase()}`;
    case 'TEXTAREA':
      return `Enter ${label.toLowerCase()}...`;
    default:
      return undefined;
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

function validateFieldType(type: string): FieldType {
  const validTypes: FieldType[] = [
    'TEXT', 'TEXTAREA', 'EMAIL', 'PHONE', 'NUMBER',
    'DATE', 'TIME', 'DATETIME', 'SELECT', 'MULTISELECT',
    'CHECKBOX', 'RADIO', 'FILE_UPLOAD', 'SIGNATURE',
    'ADDRESS', 'SSN_LAST4', 'INSURANCE_INFO'
  ];

  if (validTypes.includes(type as FieldType)) {
    return type as FieldType;
  }

  return 'TEXT'; // Default fallback
}
