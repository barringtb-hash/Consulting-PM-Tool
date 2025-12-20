/**
 * Engagement Letter Generation Service
 *
 * Generates customized engagement letters and fee agreements
 * based on intake submission data and predefined templates.
 */

import { prisma } from '../../../prisma/client';
import { env } from '../../../config/env';

// ============================================================================
// TYPES
// ============================================================================

export interface EngagementLetterTemplate {
  id: string;
  name: string;
  industry: string;
  type: 'engagement' | 'fee_agreement' | 'retainer' | 'scope_of_work';
  content: string;
  placeholders: string[];
  requiredFields: string[];
}

export interface GeneratedLetter {
  id: string;
  templateId: string;
  submissionId: number;
  content: string;
  placeholderValues: Record<string, string>;
  missingFields: string[];
  generatedAt: Date;
  status: 'draft' | 'ready' | 'sent' | 'signed';
}

export interface LetterGenerationOptions {
  templateId?: string;
  industry?: string;
  customContent?: string;
  signatureType?: 'none' | 'docusign' | 'hellosign' | 'manual';
}

// ============================================================================
// TEMPLATE CONTENT
// ============================================================================

const ENGAGEMENT_TEMPLATES: Record<string, EngagementLetterTemplate> = {
  'legal-general': {
    id: 'legal-general',
    name: 'General Legal Engagement Letter',
    industry: 'legal',
    type: 'engagement',
    content: `
[FIRM_NAME]
[FIRM_ADDRESS]

[DATE]

[CLIENT_NAME]
[CLIENT_ADDRESS]

Re: Engagement Letter - [MATTER_DESCRIPTION]

Dear [CLIENT_SALUTATION],

Thank you for selecting [FIRM_NAME] to represent you in connection with the above-referenced matter. This letter will confirm the terms of our engagement.

SCOPE OF REPRESENTATION

We have been retained to represent you in connection with [MATTER_DESCRIPTION]. Our representation will be limited to this specific matter unless we agree in writing to expand the scope of our services.

FEES AND BILLING

Our fees will be based on [FEE_ARRANGEMENT]. [FEE_DETAILS]

[RETAINER_CLAUSE]

COMMUNICATION

We will keep you informed about significant developments in your matter. You agree to keep us informed of your current address, telephone number, and email address.

TERMINATION

Either party may terminate this engagement at any time by written notice to the other. Upon termination, you will be responsible for fees and costs incurred up to that point.

CONSENT AND ACKNOWLEDGMENT

By signing below, you acknowledge that you have read and understand this engagement letter and agree to its terms.

Please sign and return a copy of this letter to confirm your agreement. We look forward to working with you.

Sincerely,

[ATTORNEY_NAME]
[FIRM_NAME]

AGREED AND ACCEPTED:

_________________________
[CLIENT_NAME]
Date: _________________
`,
    placeholders: [
      'FIRM_NAME',
      'FIRM_ADDRESS',
      'DATE',
      'CLIENT_NAME',
      'CLIENT_ADDRESS',
      'CLIENT_SALUTATION',
      'MATTER_DESCRIPTION',
      'FEE_ARRANGEMENT',
      'FEE_DETAILS',
      'RETAINER_CLAUSE',
      'ATTORNEY_NAME',
    ],
    requiredFields: ['client_name', 'matter_description'],
  },

  'consulting-sow': {
    id: 'consulting-sow',
    name: 'Consulting Scope of Work',
    industry: 'consulting',
    type: 'scope_of_work',
    content: `
SCOPE OF WORK AGREEMENT

[CONSULTANT_NAME]
[CONSULTANT_ADDRESS]

Date: [DATE]

Client: [CLIENT_NAME]
Project: [PROJECT_NAME]

1. PROJECT OVERVIEW

[PROJECT_DESCRIPTION]

2. SCOPE OF SERVICES

[CONSULTANT_NAME] will provide the following services:

[DELIVERABLES]

3. TIMELINE

The project is expected to commence on [START_DATE] and be completed by [END_DATE].

Key Milestones:
[MILESTONES]

4. FEES AND PAYMENT

Project Fee: [PROJECT_FEE]
Payment Terms: [PAYMENT_TERMS]

[EXPENSE_CLAUSE]

5. CLIENT RESPONSIBILITIES

The Client agrees to:
- Provide timely access to information and personnel
- Review and approve deliverables within [REVIEW_PERIOD] days
- Designate a primary point of contact

6. CONFIDENTIALITY

Both parties agree to maintain confidentiality of proprietary information shared during this engagement.

7. ACCEPTANCE

By signing below, both parties agree to the terms outlined in this Scope of Work.

CONSULTANT:
_________________________
[CONSULTANT_NAME]
Date: _________________

CLIENT:
_________________________
[CLIENT_NAME]
Date: _________________
`,
    placeholders: [
      'CONSULTANT_NAME',
      'CONSULTANT_ADDRESS',
      'DATE',
      'CLIENT_NAME',
      'PROJECT_NAME',
      'PROJECT_DESCRIPTION',
      'DELIVERABLES',
      'START_DATE',
      'END_DATE',
      'MILESTONES',
      'PROJECT_FEE',
      'PAYMENT_TERMS',
      'EXPENSE_CLAUSE',
      'REVIEW_PERIOD',
    ],
    requiredFields: ['client_name', 'project_name', 'project_description'],
  },

  'healthcare-consent': {
    id: 'healthcare-consent',
    name: 'Healthcare Services Agreement',
    industry: 'healthcare',
    type: 'engagement',
    content: `
PATIENT SERVICES AGREEMENT

[PRACTICE_NAME]
[PRACTICE_ADDRESS]
[PRACTICE_PHONE]

Patient Name: [PATIENT_NAME]
Date of Birth: [DATE_OF_BIRTH]
Date: [DATE]

CONSENT FOR TREATMENT

I, [PATIENT_NAME], hereby consent to receive healthcare services from [PRACTICE_NAME] and its authorized healthcare providers.

FINANCIAL RESPONSIBILITY

I understand that I am financially responsible for all charges not covered by my insurance. I agree to:
- Pay any co-payments, deductibles, and coinsurance amounts
- Pay for services not covered by my insurance plan
- Provide current insurance information

[PAYMENT_POLICY]

PRIVACY PRACTICES

I acknowledge that I have received or been offered a copy of the Notice of Privacy Practices, which describes how my health information may be used and disclosed.

COMMUNICATION

I authorize [PRACTICE_NAME] to contact me at the following:
Phone: [PATIENT_PHONE]
Email: [PATIENT_EMAIL]

[COMMUNICATION_PREFERENCES]

ACKNOWLEDGMENT

By signing below, I acknowledge that I have read, understand, and agree to the terms of this agreement.

Patient Signature: _________________________
Date: _________________

Print Name: [PATIENT_NAME]

If signed by someone other than the patient:
Relationship to Patient: _________________
`,
    placeholders: [
      'PRACTICE_NAME',
      'PRACTICE_ADDRESS',
      'PRACTICE_PHONE',
      'PATIENT_NAME',
      'DATE_OF_BIRTH',
      'DATE',
      'PAYMENT_POLICY',
      'PATIENT_PHONE',
      'PATIENT_EMAIL',
      'COMMUNICATION_PREFERENCES',
    ],
    requiredFields: ['patient_name', 'date_of_birth'],
  },

  'financial-advisory': {
    id: 'financial-advisory',
    name: 'Financial Advisory Agreement',
    industry: 'financial',
    type: 'engagement',
    content: `
INVESTMENT ADVISORY AGREEMENT

[FIRM_NAME]
[FIRM_ADDRESS]
[FIRM_REGISTRATION]

Client: [CLIENT_NAME]
Date: [DATE]

1. APPOINTMENT OF ADVISOR

[CLIENT_NAME] ("Client") hereby appoints [FIRM_NAME] ("Advisor") to provide investment advisory services as described in this Agreement.

2. SERVICES PROVIDED

The Advisor will provide the following services:
- Investment portfolio management
- Financial planning advice
- Periodic portfolio reviews
- Investment recommendations

[ADDITIONAL_SERVICES]

3. CLIENT PROFILE

Risk Tolerance: [RISK_TOLERANCE]
Investment Objectives: [INVESTMENT_OBJECTIVES]
Time Horizon: [TIME_HORIZON]
Investment Restrictions: [RESTRICTIONS]

4. FEES

Advisory Fee: [ADVISORY_FEE]
Fee Schedule: [FEE_SCHEDULE]

Fees are calculated and billed [BILLING_FREQUENCY].

5. FIDUCIARY DUTY

The Advisor is a fiduciary and will act in the Client's best interests at all times.

6. IMPORTANT DISCLOSURES

- Past performance is not indicative of future results
- Investments involve risk, including loss of principal
- Client has received and reviewed Form ADV Part 2

ACCEPTANCE

Client:
_________________________
[CLIENT_NAME]
Date: _________________

Advisor:
_________________________
[ADVISOR_NAME]
[FIRM_NAME]
Date: _________________
`,
    placeholders: [
      'FIRM_NAME',
      'FIRM_ADDRESS',
      'FIRM_REGISTRATION',
      'CLIENT_NAME',
      'DATE',
      'ADDITIONAL_SERVICES',
      'RISK_TOLERANCE',
      'INVESTMENT_OBJECTIVES',
      'TIME_HORIZON',
      'RESTRICTIONS',
      'ADVISORY_FEE',
      'FEE_SCHEDULE',
      'BILLING_FREQUENCY',
      'ADVISOR_NAME',
    ],
    requiredFields: ['client_name', 'risk_tolerance', 'investment_objectives'],
  },
};

// ============================================================================
// MAIN GENERATION FUNCTIONS
// ============================================================================

/**
 * Generate an engagement letter from an intake submission
 */
export async function generateEngagementLetter(
  submissionId: number,
  options?: LetterGenerationOptions,
): Promise<GeneratedLetter> {
  // Get submission data
  const submission = await prisma.intakeSubmission.findUnique({
    where: { id: submissionId },
    include: {
      config: true,
      form: true,
    },
  });

  if (!submission) {
    throw new Error('Submission not found');
  }

  const formData = (submission.formData as Record<string, unknown>) || {};

  // Determine template to use
  let template: EngagementLetterTemplate;
  if (options?.templateId && ENGAGEMENT_TEMPLATES[options.templateId]) {
    template = ENGAGEMENT_TEMPLATES[options.templateId];
  } else if (options?.industry) {
    template = findTemplateByIndustry(options.industry);
  } else {
    template = findTemplateByIndustry('general');
  }

  // Map form data to placeholder values
  const placeholderValues = mapFormDataToPlaceholders(formData, template);

  // Check for missing required fields
  const missingFields = template.requiredFields.filter(
    (field) => !placeholderValues[field.toUpperCase().replace(/_/g, '_')],
  );

  // Generate letter content
  let content = template.content;

  // Replace placeholders
  for (const [placeholder, value] of Object.entries(placeholderValues)) {
    const regex = new RegExp(`\\[${placeholder}\\]`, 'g');
    content = content.replace(regex, value);
  }

  // Handle remaining placeholders
  content = content.replace(/\[([A-Z_]+)\]/g, '_______________');

  // Add current date if not provided
  content = content.replace('[DATE]', new Date().toLocaleDateString());

  // Use AI to enhance content if available
  if (env.openaiApiKey && options?.customContent) {
    content = await enhanceWithAI(content, options.customContent, formData);
  }

  const letter: GeneratedLetter = {
    id: `letter-${Date.now()}`,
    templateId: template.id,
    submissionId,
    content,
    placeholderValues,
    missingFields,
    generatedAt: new Date(),
    status: missingFields.length > 0 ? 'draft' : 'ready',
  };

  // Store letter reference in submission
  await prisma.intakeSubmission.update({
    where: { id: submissionId },
    data: {
      formData: {
        ...formData,
        _engagementLetter: {
          letterId: letter.id,
          templateId: template.id,
          generatedAt: letter.generatedAt.toISOString(),
          status: letter.status,
        },
      },
    },
  });

  return letter;
}

/**
 * Get available templates
 */
export function getAvailableTemplates(
  industry?: string,
): EngagementLetterTemplate[] {
  const templates = Object.values(ENGAGEMENT_TEMPLATES);

  if (industry) {
    return templates.filter(
      (t) => t.industry === industry || t.industry === 'general',
    );
  }

  return templates;
}

/**
 * Get template by ID
 */
export function getTemplate(
  templateId: string,
): EngagementLetterTemplate | undefined {
  return ENGAGEMENT_TEMPLATES[templateId];
}

/**
 * Preview a letter with sample data
 */
export function previewTemplate(
  templateId: string,
  sampleData: Record<string, string>,
): string {
  const template = ENGAGEMENT_TEMPLATES[templateId];
  if (!template) {
    throw new Error('Template not found');
  }

  let content = template.content;

  for (const [placeholder, value] of Object.entries(sampleData)) {
    const regex = new RegExp(`\\[${placeholder}\\]`, 'g');
    content = content.replace(regex, value);
  }

  return content;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Find template by industry
 */
function findTemplateByIndustry(industry: string): EngagementLetterTemplate {
  const industryTemplate = Object.values(ENGAGEMENT_TEMPLATES).find(
    (t) => t.industry === industry,
  );

  if (industryTemplate) return industryTemplate;

  // Return first available template as fallback
  return ENGAGEMENT_TEMPLATES['legal-general'];
}

/**
 * Map form data to placeholder values
 */
function mapFormDataToPlaceholders(
  formData: Record<string, unknown>,
  template: EngagementLetterTemplate,
): Record<string, string> {
  const values: Record<string, string> = {};

  // Common field mappings
  const fieldMappings: Record<string, string[]> = {
    CLIENT_NAME: ['client_name', 'full_name', 'name', 'company_name'],
    CLIENT_ADDRESS: ['client_address', 'address', 'mailing_address'],
    CLIENT_SALUTATION: ['salutation', 'title', 'first_name'],
    MATTER_DESCRIPTION: [
      'matter_description',
      'case_description',
      'project_description',
      'description',
    ],
    PROJECT_NAME: ['project_name', 'matter_name', 'engagement_name'],
    PROJECT_DESCRIPTION: ['project_description', 'scope', 'description'],
    FEE_ARRANGEMENT: ['fee_arrangement', 'billing_type', 'fee_type'],
    FEE_DETAILS: ['fee_details', 'fee_amount', 'hourly_rate'],
    PROJECT_FEE: ['project_fee', 'fee', 'budget', 'estimated_cost'],
    START_DATE: ['start_date', 'commencement_date', 'begin_date'],
    END_DATE: ['end_date', 'completion_date', 'target_date'],
    PATIENT_NAME: ['patient_name', 'full_name', 'name'],
    DATE_OF_BIRTH: ['date_of_birth', 'dob', 'birthdate'],
    PATIENT_PHONE: ['phone', 'phone_number', 'contact_phone'],
    PATIENT_EMAIL: ['email', 'email_address'],
    RISK_TOLERANCE: ['risk_tolerance', 'risk_level'],
    INVESTMENT_OBJECTIVES: ['investment_objectives', 'goals', 'objectives'],
    TIME_HORIZON: ['time_horizon', 'investment_timeline', 'timeline'],
  };

  for (const placeholder of template.placeholders) {
    const possibleFields = fieldMappings[placeholder] || [
      placeholder.toLowerCase(),
    ];

    for (const field of possibleFields) {
      const value = formData[field];
      if (value !== undefined && value !== null && value !== '') {
        values[placeholder] = String(value);
        break;
      }
    }
  }

  return values;
}

/**
 * Enhance content with AI (fill in generic sections)
 */
async function enhanceWithAI(
  content: string,
  customInstructions: string,
  formData: Record<string, unknown>,
): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 2000,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `You are a legal document assistant. Enhance the provided engagement letter template by:
1. Filling in any remaining blank sections appropriately
2. Adjusting language based on the context provided
3. Maintaining professional and legally sound language
4. DO NOT change any specific client information or placeholders
5. Only enhance generic sections

Return only the enhanced document text, no explanations.`,
          },
          {
            role: 'user',
            content: `Custom instructions: ${customInstructions}

Context from intake form:
${JSON.stringify(formData, null, 2).substring(0, 1000)}

Current document:
${content}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('AI enhancement failed:', error);
    return content; // Return original content on error
  }
}

/**
 * Validate letter is complete
 */
export function validateLetter(letter: GeneratedLetter): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (letter.missingFields.length > 0) {
    errors.push(`Missing required fields: ${letter.missingFields.join(', ')}`);
  }

  // Check for remaining unfilled placeholders
  const unfilledMatches = letter.content.match(/\[([A-Z_]+)\]/g);
  if (unfilledMatches && unfilledMatches.length > 0) {
    errors.push(`Unfilled placeholders: ${unfilledMatches.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
