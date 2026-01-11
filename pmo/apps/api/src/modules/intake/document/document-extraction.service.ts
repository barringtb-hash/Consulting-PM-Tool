/**
 * Document Extraction Service
 *
 * Extracts structured data from uploaded documents using OCR and AI.
 * Supports various document types including IDs, insurance cards, contracts, etc.
 */

import { prisma } from '../../../prisma/client';
import { env } from '../../../config/env';

// ============================================================================
// TYPES
// ============================================================================

export type DocumentType =
  | 'drivers_license'
  | 'passport'
  | 'insurance_card'
  | 'insurance_card_front'
  | 'insurance_card_back'
  | 'contract'
  | 'invoice'
  | 'receipt'
  | 'bank_statement'
  | 'tax_form'
  | 'medical_record'
  | 'legal_document'
  | 'certificate'
  | 'id_card'
  | 'utility_bill'
  | 'pay_stub'
  | 'unknown';

export interface ExtractionField {
  name: string;
  value: string | number | boolean | null;
  confidence: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface ExtractionResult {
  documentType: DocumentType;
  typeConfidence: number;
  fields: ExtractionField[];
  rawText?: string;
  metadata: {
    processingTime: number;
    method: 'ai' | 'rule-based' | 'ocr-only';
    warnings?: string[];
  };
}

export interface ExtractionTemplate {
  documentType: DocumentType;
  expectedFields: Array<{
    name: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'boolean';
    required: boolean;
    patterns?: RegExp[];
  }>;
}

// ============================================================================
// EXTRACTION TEMPLATES
// ============================================================================

const EXTRACTION_TEMPLATES: Record<DocumentType, ExtractionTemplate> = {
  drivers_license: {
    documentType: 'drivers_license',
    expectedFields: [
      { name: 'full_name', label: 'Full Name', type: 'text', required: true },
      {
        name: 'date_of_birth',
        label: 'Date of Birth',
        type: 'date',
        required: true,
      },
      {
        name: 'license_number',
        label: 'License Number',
        type: 'text',
        required: true,
      },
      {
        name: 'expiration_date',
        label: 'Expiration Date',
        type: 'date',
        required: true,
      },
      { name: 'address', label: 'Address', type: 'text', required: false },
      { name: 'state', label: 'State', type: 'text', required: false },
      { name: 'class', label: 'License Class', type: 'text', required: false },
    ],
  },
  passport: {
    documentType: 'passport',
    expectedFields: [
      { name: 'full_name', label: 'Full Name', type: 'text', required: true },
      {
        name: 'date_of_birth',
        label: 'Date of Birth',
        type: 'date',
        required: true,
      },
      {
        name: 'passport_number',
        label: 'Passport Number',
        type: 'text',
        required: true,
      },
      {
        name: 'expiration_date',
        label: 'Expiration Date',
        type: 'date',
        required: true,
      },
      {
        name: 'nationality',
        label: 'Nationality',
        type: 'text',
        required: true,
      },
      { name: 'sex', label: 'Sex', type: 'text', required: false },
      {
        name: 'place_of_birth',
        label: 'Place of Birth',
        type: 'text',
        required: false,
      },
    ],
  },
  insurance_card: {
    documentType: 'insurance_card',
    expectedFields: [
      {
        name: 'member_name',
        label: 'Member Name',
        type: 'text',
        required: true,
      },
      { name: 'member_id', label: 'Member ID', type: 'text', required: true },
      {
        name: 'group_number',
        label: 'Group Number',
        type: 'text',
        required: true,
      },
      {
        name: 'insurance_company',
        label: 'Insurance Company',
        type: 'text',
        required: true,
      },
      { name: 'plan_name', label: 'Plan Name', type: 'text', required: false },
      {
        name: 'effective_date',
        label: 'Effective Date',
        type: 'date',
        required: false,
      },
      { name: 'copay', label: 'Copay', type: 'text', required: false },
      { name: 'rx_bin', label: 'RX BIN', type: 'text', required: false },
      { name: 'rx_pcn', label: 'RX PCN', type: 'text', required: false },
    ],
  },
  insurance_card_front: {
    documentType: 'insurance_card_front',
    expectedFields: [
      {
        name: 'member_name',
        label: 'Member Name',
        type: 'text',
        required: true,
      },
      { name: 'member_id', label: 'Member ID', type: 'text', required: true },
      {
        name: 'group_number',
        label: 'Group Number',
        type: 'text',
        required: false,
      },
      {
        name: 'insurance_company',
        label: 'Insurance Company',
        type: 'text',
        required: true,
      },
    ],
  },
  insurance_card_back: {
    documentType: 'insurance_card_back',
    expectedFields: [
      {
        name: 'claims_address',
        label: 'Claims Address',
        type: 'text',
        required: false,
      },
      {
        name: 'phone_number',
        label: 'Phone Number',
        type: 'text',
        required: false,
      },
      { name: 'rx_bin', label: 'RX BIN', type: 'text', required: false },
      { name: 'rx_pcn', label: 'RX PCN', type: 'text', required: false },
      { name: 'rx_group', label: 'RX Group', type: 'text', required: false },
    ],
  },
  contract: {
    documentType: 'contract',
    expectedFields: [
      { name: 'parties', label: 'Parties', type: 'text', required: true },
      {
        name: 'effective_date',
        label: 'Effective Date',
        type: 'date',
        required: true,
      },
      {
        name: 'contract_value',
        label: 'Contract Value',
        type: 'number',
        required: false,
      },
      {
        name: 'term_length',
        label: 'Term Length',
        type: 'text',
        required: false,
      },
      {
        name: 'signatures',
        label: 'Signatures Present',
        type: 'boolean',
        required: false,
      },
    ],
  },
  invoice: {
    documentType: 'invoice',
    expectedFields: [
      {
        name: 'invoice_number',
        label: 'Invoice Number',
        type: 'text',
        required: true,
      },
      {
        name: 'invoice_date',
        label: 'Invoice Date',
        type: 'date',
        required: true,
      },
      { name: 'due_date', label: 'Due Date', type: 'date', required: false },
      {
        name: 'total_amount',
        label: 'Total Amount',
        type: 'number',
        required: true,
      },
      {
        name: 'vendor_name',
        label: 'Vendor Name',
        type: 'text',
        required: true,
      },
      {
        name: 'customer_name',
        label: 'Customer Name',
        type: 'text',
        required: false,
      },
    ],
  },
  receipt: {
    documentType: 'receipt',
    expectedFields: [
      {
        name: 'merchant_name',
        label: 'Merchant Name',
        type: 'text',
        required: true,
      },
      { name: 'date', label: 'Date', type: 'date', required: true },
      {
        name: 'total_amount',
        label: 'Total Amount',
        type: 'number',
        required: true,
      },
      {
        name: 'payment_method',
        label: 'Payment Method',
        type: 'text',
        required: false,
      },
    ],
  },
  bank_statement: {
    documentType: 'bank_statement',
    expectedFields: [
      {
        name: 'account_holder',
        label: 'Account Holder',
        type: 'text',
        required: true,
      },
      {
        name: 'account_number_last4',
        label: 'Account Number (last 4)',
        type: 'text',
        required: true,
      },
      {
        name: 'statement_period',
        label: 'Statement Period',
        type: 'text',
        required: true,
      },
      {
        name: 'ending_balance',
        label: 'Ending Balance',
        type: 'number',
        required: true,
      },
    ],
  },
  tax_form: {
    documentType: 'tax_form',
    expectedFields: [
      { name: 'form_type', label: 'Form Type', type: 'text', required: true },
      { name: 'tax_year', label: 'Tax Year', type: 'text', required: true },
      {
        name: 'taxpayer_name',
        label: 'Taxpayer Name',
        type: 'text',
        required: true,
      },
      {
        name: 'ssn_last4',
        label: 'SSN (last 4)',
        type: 'text',
        required: false,
      },
    ],
  },
  medical_record: {
    documentType: 'medical_record',
    expectedFields: [
      {
        name: 'patient_name',
        label: 'Patient Name',
        type: 'text',
        required: true,
      },
      {
        name: 'date_of_service',
        label: 'Date of Service',
        type: 'date',
        required: true,
      },
      {
        name: 'provider_name',
        label: 'Provider Name',
        type: 'text',
        required: false,
      },
      { name: 'diagnosis', label: 'Diagnosis', type: 'text', required: false },
    ],
  },
  legal_document: {
    documentType: 'legal_document',
    expectedFields: [
      {
        name: 'document_title',
        label: 'Document Title',
        type: 'text',
        required: true,
      },
      { name: 'date', label: 'Date', type: 'date', required: false },
      { name: 'parties', label: 'Parties', type: 'text', required: false },
      {
        name: 'case_number',
        label: 'Case Number',
        type: 'text',
        required: false,
      },
    ],
  },
  certificate: {
    documentType: 'certificate',
    expectedFields: [
      {
        name: 'certificate_type',
        label: 'Certificate Type',
        type: 'text',
        required: true,
      },
      { name: 'issued_to', label: 'Issued To', type: 'text', required: true },
      {
        name: 'issue_date',
        label: 'Issue Date',
        type: 'date',
        required: false,
      },
      {
        name: 'expiration_date',
        label: 'Expiration Date',
        type: 'date',
        required: false,
      },
      {
        name: 'issuing_authority',
        label: 'Issuing Authority',
        type: 'text',
        required: false,
      },
    ],
  },
  id_card: {
    documentType: 'id_card',
    expectedFields: [
      { name: 'full_name', label: 'Full Name', type: 'text', required: true },
      { name: 'id_number', label: 'ID Number', type: 'text', required: true },
      {
        name: 'expiration_date',
        label: 'Expiration Date',
        type: 'date',
        required: false,
      },
    ],
  },
  utility_bill: {
    documentType: 'utility_bill',
    expectedFields: [
      {
        name: 'account_holder',
        label: 'Account Holder',
        type: 'text',
        required: true,
      },
      {
        name: 'service_address',
        label: 'Service Address',
        type: 'text',
        required: true,
      },
      {
        name: 'billing_date',
        label: 'Billing Date',
        type: 'date',
        required: true,
      },
      {
        name: 'amount_due',
        label: 'Amount Due',
        type: 'number',
        required: true,
      },
      {
        name: 'utility_company',
        label: 'Utility Company',
        type: 'text',
        required: true,
      },
    ],
  },
  pay_stub: {
    documentType: 'pay_stub',
    expectedFields: [
      {
        name: 'employee_name',
        label: 'Employee Name',
        type: 'text',
        required: true,
      },
      {
        name: 'employer_name',
        label: 'Employer Name',
        type: 'text',
        required: true,
      },
      { name: 'pay_period', label: 'Pay Period', type: 'text', required: true },
      { name: 'gross_pay', label: 'Gross Pay', type: 'number', required: true },
      { name: 'net_pay', label: 'Net Pay', type: 'number', required: true },
    ],
  },
  unknown: {
    documentType: 'unknown',
    expectedFields: [],
  },
};

// ============================================================================
// DOCUMENT CLASSIFICATION
// ============================================================================

/**
 * Classify document type from text content
 */
export async function classifyDocument(
  text: string,
  filename?: string,
): Promise<{ type: DocumentType; confidence: number }> {
  // Try AI classification first if available
  if (env.openaiApiKey) {
    try {
      return await classifyWithAI(text, filename);
    } catch (error) {
      console.error('AI classification failed:', error);
    }
  }

  // Fall back to rule-based classification
  return classifyRuleBased(text, filename);
}

/**
 * AI-powered document classification
 */
async function classifyWithAI(
  text: string,
  filename?: string,
): Promise<{ type: DocumentType; confidence: number }> {
  const documentTypes = Object.keys(EXTRACTION_TEMPLATES).filter(
    (t) => t !== 'unknown',
  );

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 100,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a document classifier. Based on the text content, classify the document into one of these types: ${documentTypes.join(', ')}, unknown.

Return a JSON object with:
- type: the document type
- confidence: 0-1 confidence score`,
        },
        {
          role: 'user',
          content: `Filename: ${filename || 'unknown'}\n\nText content:\n${text.substring(0, 2000)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const parsed = JSON.parse(data.choices[0].message.content);

  const validType = Object.keys(EXTRACTION_TEMPLATES).includes(parsed.type)
    ? (parsed.type as DocumentType)
    : 'unknown';

  return {
    type: validType,
    confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
  };
}

/**
 * Rule-based document classification
 */
function classifyRuleBased(
  text: string,
  filename?: string,
): { type: DocumentType; confidence: number } {
  const lowerText = text.toLowerCase();
  const lowerFilename = (filename || '').toLowerCase();

  // Check for specific document types based on keywords
  const typeScores: Record<DocumentType, number> = {
    drivers_license: 0,
    passport: 0,
    insurance_card: 0,
    insurance_card_front: 0,
    insurance_card_back: 0,
    contract: 0,
    invoice: 0,
    receipt: 0,
    bank_statement: 0,
    tax_form: 0,
    medical_record: 0,
    legal_document: 0,
    certificate: 0,
    id_card: 0,
    utility_bill: 0,
    pay_stub: 0,
    unknown: 0,
  };

  // Driver's License patterns
  if (
    lowerText.includes('driver') ||
    lowerText.includes('license') ||
    lowerText.includes('dl')
  ) {
    typeScores.drivers_license += 3;
  }
  if (lowerText.includes('class') && lowerText.includes('expires')) {
    typeScores.drivers_license += 2;
  }

  // Passport patterns
  if (lowerText.includes('passport')) {
    typeScores.passport += 5;
  }
  if (
    lowerText.includes('nationality') ||
    lowerText.includes('place of birth')
  ) {
    typeScores.passport += 2;
  }

  // Insurance patterns
  if (lowerText.includes('member id') || lowerText.includes('group number')) {
    typeScores.insurance_card += 3;
  }
  if (lowerText.includes('copay') || lowerText.includes('rx bin')) {
    typeScores.insurance_card += 2;
  }
  if (lowerText.includes('claims') && lowerText.includes('address')) {
    typeScores.insurance_card_back += 2;
  }

  // Invoice patterns
  if (lowerText.includes('invoice') || lowerFilename.includes('invoice')) {
    typeScores.invoice += 4;
  }
  if (lowerText.includes('invoice number') || lowerText.includes('inv #')) {
    typeScores.invoice += 2;
  }

  // Receipt patterns
  if (lowerText.includes('receipt') || lowerFilename.includes('receipt')) {
    typeScores.receipt += 3;
  }
  if (lowerText.includes('total') && lowerText.includes('thank you')) {
    typeScores.receipt += 2;
  }

  // Bank statement patterns
  if (lowerText.includes('statement') && lowerText.includes('account')) {
    typeScores.bank_statement += 3;
  }
  if (lowerText.includes('balance') && lowerText.includes('deposit')) {
    typeScores.bank_statement += 2;
  }

  // Tax form patterns
  if (
    lowerText.includes('w-2') ||
    lowerText.includes('1099') ||
    lowerText.includes('tax return')
  ) {
    typeScores.tax_form += 4;
  }
  if (lowerText.includes('irs') || lowerText.includes('federal tax')) {
    typeScores.tax_form += 2;
  }

  // Medical record patterns
  if (lowerText.includes('patient') && lowerText.includes('diagnosis')) {
    typeScores.medical_record += 3;
  }
  if (lowerText.includes('medical') || lowerText.includes('health record')) {
    typeScores.medical_record += 2;
  }

  // Contract patterns
  if (lowerText.includes('agreement') || lowerText.includes('contract')) {
    typeScores.contract += 3;
  }
  if (lowerText.includes('party') && lowerText.includes('whereas')) {
    typeScores.contract += 2;
  }

  // Legal document patterns
  if (lowerText.includes('court') || lowerText.includes('case number')) {
    typeScores.legal_document += 3;
  }

  // Pay stub patterns
  if (
    lowerText.includes('pay stub') ||
    lowerText.includes('earnings statement')
  ) {
    typeScores.pay_stub += 4;
  }
  if (lowerText.includes('gross pay') && lowerText.includes('net pay')) {
    typeScores.pay_stub += 3;
  }

  // Utility bill patterns
  if (lowerText.includes('utility') || lowerText.includes('service address')) {
    typeScores.utility_bill += 2;
  }
  if (lowerText.includes('kwh') || lowerText.includes('meter reading')) {
    typeScores.utility_bill += 2;
  }

  // Find highest scoring type
  let bestType: DocumentType = 'unknown';
  let bestScore = 0;

  for (const [type, score] of Object.entries(typeScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestType = type as DocumentType;
    }
  }

  const confidence = bestScore > 0 ? Math.min(0.9, bestScore / 10) : 0.1;

  return { type: bestType, confidence };
}

// ============================================================================
// MAIN EXTRACTION FUNCTION
// ============================================================================

/**
 * Extract structured data from document text
 */
export async function extractFromDocument(
  documentId: number,
  text: string,
  options?: {
    documentType?: DocumentType;
    useAI?: boolean;
  },
): Promise<ExtractionResult> {
  const startTime = Date.now();
  const useAI = options?.useAI !== false && !!env.openaiApiKey;

  // Classify document if type not provided
  let documentType = options?.documentType;
  let typeConfidence = 1.0;

  if (!documentType) {
    const classification = await classifyDocument(text);
    documentType = classification.type;
    typeConfidence = classification.confidence;
  }

  // Get template for document type
  const template = EXTRACTION_TEMPLATES[documentType];

  // Extract fields
  let fields: ExtractionField[];
  let method: 'ai' | 'rule-based' | 'ocr-only';

  if (useAI && template.expectedFields.length > 0) {
    try {
      fields = await extractWithAI(text, template);
      method = 'ai';
    } catch (error) {
      console.error('AI extraction failed:', error);
      fields = extractRuleBased(text, template);
      method = 'rule-based';
    }
  } else if (template.expectedFields.length > 0) {
    fields = extractRuleBased(text, template);
    method = 'rule-based';
  } else {
    fields = [];
    method = 'ocr-only';
  }

  const processingTime = Date.now() - startTime;

  // Generate warnings
  const warnings: string[] = [];
  const requiredFields = template.expectedFields.filter((f) => f.required);
  const extractedFieldNames = fields.map((f) => f.name);

  for (const required of requiredFields) {
    if (!extractedFieldNames.includes(required.name)) {
      warnings.push(`Missing required field: ${required.label}`);
    }
  }

  // Low confidence warnings
  for (const field of fields) {
    if (field.confidence < 0.5) {
      warnings.push(`Low confidence for field: ${field.name}`);
    }
  }

  // Update document record with extraction results
  try {
    await prisma.intakeDocument.update({
      where: { id: documentId },
      data: {
        extractedData: {
          documentType,
          fields: fields.map((f) => ({
            name: f.name,
            value: f.value,
            confidence: f.confidence,
          })),
        },
        extractionConfidence:
          fields.length > 0
            ? fields.reduce((sum, f) => sum + f.confidence, 0) / fields.length
            : 0,
      },
    });
  } catch (error) {
    console.error('Failed to update document with extraction results:', error);
  }

  return {
    documentType,
    typeConfidence,
    fields,
    rawText: text,
    metadata: {
      processingTime,
      method,
      warnings: warnings.length > 0 ? warnings : undefined,
    },
  };
}

/**
 * AI-powered field extraction
 */
async function extractWithAI(
  text: string,
  template: ExtractionTemplate,
): Promise<ExtractionField[]> {
  const fieldsDescription = template.expectedFields
    .map(
      (f) =>
        `- ${f.name}: ${f.label} (${f.type}${f.required ? ', required' : ''})`,
    )
    .join('\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 1000,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a document data extraction assistant. Extract the following fields from the document text:

${fieldsDescription}

Return a JSON object with:
- fields: array of { name, value, confidence }
  - name: field name from the list above
  - value: extracted value (null if not found)
  - confidence: 0-1 confidence score

Only include fields you can extract. Be precise with dates (ISO format), numbers (numeric), and text.`,
        },
        {
          role: 'user',
          content: text.substring(0, 4000),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const parsed = JSON.parse(data.choices[0].message.content);

  if (!Array.isArray(parsed.fields)) {
    return [];
  }

  return parsed.fields.map(
    (f: { name: string; value: unknown; confidence: number }) => ({
      name: f.name,
      value: f.value ?? null,
      confidence: Math.min(1, Math.max(0, f.confidence || 0.7)),
    }),
  );
}

/**
 * Rule-based field extraction
 */
function extractRuleBased(
  text: string,
  template: ExtractionTemplate,
): ExtractionField[] {
  const fields: ExtractionField[] = [];

  for (const expectedField of template.expectedFields) {
    const extracted = extractFieldValue(text, expectedField);
    if (extracted !== null) {
      fields.push({
        name: expectedField.name,
        value: extracted.value,
        confidence: extracted.confidence,
      });
    }
  }

  return fields;
}

/**
 * Extract a single field value using patterns
 */
function extractFieldValue(
  text: string,
  field: ExtractionTemplate['expectedFields'][0],
): { value: string | number | boolean | null; confidence: number } | null {
  const _lowerText = text.toLowerCase();

  // Common patterns for different field types
  const patterns: Record<string, RegExp[]> = {
    full_name: [
      /name[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/i,
      /([A-Z][a-z]+ [A-Z][a-z]+)\s*$/m,
    ],
    date_of_birth: [
      /dob[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
      /date of birth[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
      /birth[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    ],
    expiration_date: [
      /exp[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
      /expires?[:\s]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    ],
    member_id: [/member\s*id[:\s]+([A-Z0-9]+)/i, /id[:\s]+([A-Z0-9]{6,})/i],
    group_number: [/group[:\s]+([A-Z0-9]+)/i, /grp[:\s]+([A-Z0-9]+)/i],
    total_amount: [
      /total[:\s]+\$?([\d,]+\.?\d*)/i,
      /amount[:\s]+\$?([\d,]+\.?\d*)/i,
    ],
  };

  // Try field-specific patterns first
  if (patterns[field.name]) {
    for (const pattern of patterns[field.name]) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let value: string | number = match[1].trim();
        if (field.type === 'number') {
          value = parseFloat(value.replace(/,/g, ''));
        }
        return { value, confidence: 0.7 };
      }
    }
  }

  // Try generic label-based extraction
  const labelPattern = new RegExp(`${field.label}[:\\s]+([^\\n]+)`, 'i');
  const labelMatch = text.match(labelPattern);
  if (labelMatch && labelMatch[1]) {
    let value: string | number = labelMatch[1].trim();
    if (field.type === 'number') {
      const numMatch = value.match(/[\d,]+\.?\d*/);
      if (numMatch) {
        value = parseFloat(numMatch[0].replace(/,/g, ''));
      }
    }
    return { value, confidence: 0.5 };
  }

  return null;
}

// ============================================================================
// PRE-FILL HELPERS
// ============================================================================

/**
 * Map extracted fields to form fields
 */
export function mapExtractedToFormFields(
  extractionResult: ExtractionResult,
  formFields: Array<{ name: string; type: string }>,
): Record<string, unknown> {
  const mappedData: Record<string, unknown> = {};

  // Field name mappings (extraction name -> form field name)
  const fieldMappings: Record<string, string[]> = {
    full_name: ['name', 'full_name', 'fullname', 'client_name'],
    date_of_birth: ['dob', 'date_of_birth', 'birthdate', 'birthday'],
    member_id: ['member_id', 'insurance_member_id', 'policy_number'],
    group_number: ['group_number', 'insurance_group', 'group_id'],
    address: ['address', 'street_address', 'home_address'],
    phone_number: ['phone', 'phone_number', 'contact_phone'],
    email: ['email', 'email_address'],
  };

  for (const field of extractionResult.fields) {
    if (field.value === null || field.confidence < 0.4) continue;

    // Check if there's a direct match
    const formField = formFields.find((f) => f.name === field.name);
    if (formField) {
      mappedData[formField.name] = field.value;
      continue;
    }

    // Check mappings
    const mappings = fieldMappings[field.name];
    if (mappings) {
      for (const mapping of mappings) {
        const matchingField = formFields.find((f) => f.name === mapping);
        if (matchingField) {
          mappedData[matchingField.name] = field.value;
          break;
        }
      }
    }
  }

  return mappedData;
}

/**
 * Get extraction template for a document type
 */
export function getExtractionTemplate(
  documentType: DocumentType,
): ExtractionTemplate {
  return EXTRACTION_TEMPLATES[documentType] || EXTRACTION_TEMPLATES.unknown;
}

/**
 * Get all available document types
 */
export function getAvailableDocumentTypes(): DocumentType[] {
  return Object.keys(EXTRACTION_TEMPLATES) as DocumentType[];
}
