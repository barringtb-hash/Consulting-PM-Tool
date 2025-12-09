/**
 * Built-in Extraction Templates for Document Analyzer
 *
 * This file contains pre-configured templates for common document types
 * across various industries. These templates provide high-accuracy
 * extraction rules for universal and industry-specific documents.
 */

import { DocumentCategory, IndustryType } from '@prisma/client';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FieldDefinition {
  name: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'boolean' | 'array' | 'object';
  required: boolean;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    format?: string;
  };
  helpText?: string;
  extractionHints?: string[];
}

export interface ExtractionRule {
  fieldName: string;
  type: string;
  pattern?: string;
  location?: string;
  required: boolean;
  validation?: Record<string, unknown>;
  aiPrompt?: string;
}

export interface ComplianceRule {
  ruleId: string;
  name: string;
  description: string;
  pattern?: string;
  requiredFields?: string[];
  severity: 'PASS' | 'WARNING' | 'FAIL';
}

export interface BuiltInTemplate {
  name: string;
  description: string;
  category: DocumentCategory;
  industryType?: IndustryType;
  documentType: string;
  version: string;
  fieldDefinitions: FieldDefinition[];
  extractionRules: ExtractionRule[];
  complianceRules?: ComplianceRule[];
  confidenceThreshold: number;
}

// ============================================================================
// UNIVERSAL TEMPLATES - INVOICES
// ============================================================================

export const INVOICE_AP_TEMPLATE: BuiltInTemplate = {
  name: 'Accounts Payable Invoice',
  description: 'Standard accounts payable invoice extraction for vendor bills, purchase invoices, and supplier statements',
  category: 'INVOICE',
  documentType: 'INVOICE_AP',
  version: '1.0.0',
  confidenceThreshold: 0.85,
  fieldDefinitions: [
    {
      name: 'vendorName',
      label: 'Vendor Name',
      type: 'string',
      required: true,
      helpText: 'The name of the company or individual issuing the invoice',
      extractionHints: ['From:', 'Bill From:', 'Vendor:', 'Seller:'],
    },
    {
      name: 'vendorAddress',
      label: 'Vendor Address',
      type: 'string',
      required: false,
      helpText: 'Full mailing address of the vendor',
    },
    {
      name: 'vendorTaxId',
      label: 'Vendor Tax ID',
      type: 'string',
      required: false,
      validation: { pattern: '^[0-9]{2}-[0-9]{7}$|^[0-9]{9}$' },
      helpText: 'EIN, VAT number, or tax identification number',
    },
    {
      name: 'invoiceNumber',
      label: 'Invoice Number',
      type: 'string',
      required: true,
      helpText: 'Unique identifier for this invoice',
      extractionHints: ['Invoice #:', 'Invoice No:', 'Inv:', 'Bill #:'],
    },
    {
      name: 'invoiceDate',
      label: 'Invoice Date',
      type: 'date',
      required: true,
      helpText: 'Date the invoice was issued',
      extractionHints: ['Date:', 'Invoice Date:', 'Issued:'],
    },
    {
      name: 'dueDate',
      label: 'Due Date',
      type: 'date',
      required: false,
      helpText: 'Payment due date',
      extractionHints: ['Due:', 'Due Date:', 'Payment Due:', 'Due By:'],
    },
    {
      name: 'poNumber',
      label: 'Purchase Order Number',
      type: 'string',
      required: false,
      helpText: 'Associated purchase order reference',
      extractionHints: ['PO:', 'PO #:', 'Purchase Order:', 'Order #:'],
    },
    {
      name: 'lineItems',
      label: 'Line Items',
      type: 'array',
      required: true,
      helpText: 'Individual items or services billed',
    },
    {
      name: 'subtotal',
      label: 'Subtotal',
      type: 'currency',
      required: false,
      helpText: 'Sum before tax and discounts',
      extractionHints: ['Subtotal:', 'Sub-total:', 'Net:'],
    },
    {
      name: 'taxAmount',
      label: 'Tax Amount',
      type: 'currency',
      required: false,
      helpText: 'Total tax charged',
      extractionHints: ['Tax:', 'Sales Tax:', 'VAT:', 'GST:'],
    },
    {
      name: 'taxRate',
      label: 'Tax Rate',
      type: 'number',
      required: false,
      validation: { min: 0, max: 100 },
      helpText: 'Tax percentage applied',
    },
    {
      name: 'discountAmount',
      label: 'Discount',
      type: 'currency',
      required: false,
      helpText: 'Any discounts applied',
    },
    {
      name: 'shippingAmount',
      label: 'Shipping/Freight',
      type: 'currency',
      required: false,
      helpText: 'Shipping or freight charges',
    },
    {
      name: 'totalAmount',
      label: 'Total Amount',
      type: 'currency',
      required: true,
      helpText: 'Final amount due',
      extractionHints: ['Total:', 'Amount Due:', 'Total Due:', 'Balance Due:', 'Grand Total:'],
    },
    {
      name: 'currency',
      label: 'Currency',
      type: 'string',
      required: false,
      helpText: 'Currency code (USD, EUR, GBP, etc.)',
    },
    {
      name: 'paymentTerms',
      label: 'Payment Terms',
      type: 'string',
      required: false,
      helpText: 'Payment terms (Net 30, Due on Receipt, etc.)',
      extractionHints: ['Terms:', 'Payment Terms:', 'Net'],
    },
    {
      name: 'bankDetails',
      label: 'Bank Details',
      type: 'object',
      required: false,
      helpText: 'Bank account information for payment',
    },
  ],
  extractionRules: [
    { fieldName: 'vendorName', type: 'string', required: true, aiPrompt: 'Extract the vendor/seller company name from the invoice header' },
    { fieldName: 'invoiceNumber', type: 'string', required: true, pattern: '(INV|Invoice|Bill|#)[\\s#:-]*([A-Z0-9-]+)', aiPrompt: 'Find the unique invoice number or identifier' },
    { fieldName: 'invoiceDate', type: 'date', required: true, aiPrompt: 'Extract the invoice issue date' },
    { fieldName: 'dueDate', type: 'date', required: false, aiPrompt: 'Extract the payment due date if present' },
    { fieldName: 'poNumber', type: 'string', required: false, pattern: '(PO|P\\.O\\.|Purchase Order)[\\s#:-]*([A-Z0-9-]+)', aiPrompt: 'Extract the purchase order reference if present' },
    { fieldName: 'lineItems', type: 'array', required: true, aiPrompt: 'Extract all line items with description, quantity, unit price, and total' },
    { fieldName: 'subtotal', type: 'currency', required: false, aiPrompt: 'Extract the subtotal before tax' },
    { fieldName: 'taxAmount', type: 'currency', required: false, aiPrompt: 'Extract the total tax amount' },
    { fieldName: 'totalAmount', type: 'currency', required: true, aiPrompt: 'Extract the final total amount due' },
    { fieldName: 'paymentTerms', type: 'string', required: false, pattern: '(Net\\s*\\d+|Due\\s+on\\s+Receipt|COD)', aiPrompt: 'Extract payment terms' },
  ],
  complianceRules: [
    {
      ruleId: 'INV_001',
      name: 'Invoice Number Required',
      description: 'Every invoice must have a unique identifier',
      requiredFields: ['invoiceNumber'],
      severity: 'FAIL',
    },
    {
      ruleId: 'INV_002',
      name: 'Total Amount Required',
      description: 'Invoice must specify the total amount due',
      requiredFields: ['totalAmount'],
      severity: 'FAIL',
    },
    {
      ruleId: 'INV_003',
      name: 'Vendor Identification',
      description: 'Vendor name should be clearly identified',
      requiredFields: ['vendorName'],
      severity: 'WARNING',
    },
    {
      ruleId: 'INV_004',
      name: 'Date Validation',
      description: 'Invoice date should be present',
      requiredFields: ['invoiceDate'],
      severity: 'WARNING',
    },
  ],
};

export const INVOICE_AR_TEMPLATE: BuiltInTemplate = {
  name: 'Accounts Receivable Invoice',
  description: 'Customer invoice extraction for billing, sales invoices, and receivables',
  category: 'INVOICE',
  documentType: 'INVOICE_AR',
  version: '1.0.0',
  confidenceThreshold: 0.85,
  fieldDefinitions: [
    {
      name: 'customerName',
      label: 'Customer Name',
      type: 'string',
      required: true,
      helpText: 'The name of the customer being billed',
      extractionHints: ['Bill To:', 'Customer:', 'Client:', 'Sold To:'],
    },
    {
      name: 'customerAddress',
      label: 'Customer Address',
      type: 'string',
      required: false,
      helpText: 'Billing address of the customer',
    },
    {
      name: 'customerEmail',
      label: 'Customer Email',
      type: 'string',
      required: false,
      validation: { pattern: '^[^@]+@[^@]+\\.[^@]+$' },
      helpText: 'Customer email address',
    },
    {
      name: 'invoiceNumber',
      label: 'Invoice Number',
      type: 'string',
      required: true,
      helpText: 'Unique invoice identifier',
    },
    {
      name: 'invoiceDate',
      label: 'Invoice Date',
      type: 'date',
      required: true,
      helpText: 'Date the invoice was created',
    },
    {
      name: 'dueDate',
      label: 'Due Date',
      type: 'date',
      required: false,
      helpText: 'Payment due date',
    },
    {
      name: 'lineItems',
      label: 'Line Items',
      type: 'array',
      required: true,
      helpText: 'Products or services billed',
    },
    {
      name: 'subtotal',
      label: 'Subtotal',
      type: 'currency',
      required: false,
      helpText: 'Sum before tax',
    },
    {
      name: 'taxAmount',
      label: 'Tax',
      type: 'currency',
      required: false,
      helpText: 'Tax amount',
    },
    {
      name: 'totalAmount',
      label: 'Total',
      type: 'currency',
      required: true,
      helpText: 'Total amount due',
    },
    {
      name: 'amountPaid',
      label: 'Amount Paid',
      type: 'currency',
      required: false,
      helpText: 'Any payments already received',
    },
    {
      name: 'balanceDue',
      label: 'Balance Due',
      type: 'currency',
      required: false,
      helpText: 'Remaining balance after payments',
    },
  ],
  extractionRules: [
    { fieldName: 'customerName', type: 'string', required: true, aiPrompt: 'Extract the customer/client name from the Bill To section' },
    { fieldName: 'invoiceNumber', type: 'string', required: true, aiPrompt: 'Extract the invoice number' },
    { fieldName: 'invoiceDate', type: 'date', required: true, aiPrompt: 'Extract the invoice date' },
    { fieldName: 'lineItems', type: 'array', required: true, aiPrompt: 'Extract all billable items with details' },
    { fieldName: 'totalAmount', type: 'currency', required: true, aiPrompt: 'Extract the total amount' },
  ],
  complianceRules: [
    {
      ruleId: 'AR_001',
      name: 'Customer Identification',
      description: 'Customer must be clearly identified',
      requiredFields: ['customerName'],
      severity: 'FAIL',
    },
  ],
};

// ============================================================================
// UNIVERSAL TEMPLATES - CONTRACTS
// ============================================================================

export const CONTRACT_NDA_TEMPLATE: BuiltInTemplate = {
  name: 'Non-Disclosure Agreement',
  description: 'NDA/Confidentiality agreement extraction',
  category: 'CONTRACT',
  documentType: 'CONTRACT_NDA',
  version: '1.0.0',
  confidenceThreshold: 0.80,
  fieldDefinitions: [
    {
      name: 'disclosingParty',
      label: 'Disclosing Party',
      type: 'string',
      required: true,
      helpText: 'The party disclosing confidential information',
    },
    {
      name: 'receivingParty',
      label: 'Receiving Party',
      type: 'string',
      required: true,
      helpText: 'The party receiving confidential information',
    },
    {
      name: 'effectiveDate',
      label: 'Effective Date',
      type: 'date',
      required: true,
      helpText: 'When the agreement becomes effective',
    },
    {
      name: 'expirationDate',
      label: 'Expiration Date',
      type: 'date',
      required: false,
      helpText: 'When the agreement expires (if applicable)',
    },
    {
      name: 'confidentialityPeriod',
      label: 'Confidentiality Period',
      type: 'string',
      required: false,
      helpText: 'Duration of confidentiality obligations',
    },
    {
      name: 'ndaType',
      label: 'NDA Type',
      type: 'string',
      required: false,
      helpText: 'Unilateral, Bilateral, or Multilateral',
    },
    {
      name: 'governingLaw',
      label: 'Governing Law',
      type: 'string',
      required: false,
      helpText: 'Jurisdiction governing the agreement',
    },
    {
      name: 'permittedDisclosures',
      label: 'Permitted Disclosures',
      type: 'array',
      required: false,
      helpText: 'Exceptions to confidentiality',
    },
    {
      name: 'returnOfMaterials',
      label: 'Return of Materials',
      type: 'boolean',
      required: false,
      helpText: 'Whether materials must be returned upon termination',
    },
  ],
  extractionRules: [
    { fieldName: 'disclosingParty', type: 'string', required: true, aiPrompt: 'Identify the disclosing party in the NDA' },
    { fieldName: 'receivingParty', type: 'string', required: true, aiPrompt: 'Identify the receiving party in the NDA' },
    { fieldName: 'effectiveDate', type: 'date', required: true, aiPrompt: 'Extract the effective date of the agreement' },
    { fieldName: 'confidentialityPeriod', type: 'string', required: false, aiPrompt: 'Extract the duration of confidentiality obligations' },
    { fieldName: 'governingLaw', type: 'string', required: false, aiPrompt: 'Identify the governing law jurisdiction' },
  ],
  complianceRules: [
    {
      ruleId: 'NDA_001',
      name: 'Party Identification',
      description: 'Both parties must be clearly identified',
      requiredFields: ['disclosingParty', 'receivingParty'],
      severity: 'FAIL',
    },
    {
      ruleId: 'NDA_002',
      name: 'Effective Date',
      description: 'Agreement must have an effective date',
      requiredFields: ['effectiveDate'],
      severity: 'WARNING',
    },
  ],
};

export const CONTRACT_SERVICE_TEMPLATE: BuiltInTemplate = {
  name: 'Service Agreement',
  description: 'Master service agreement, consulting agreement, or professional services contract',
  category: 'CONTRACT',
  documentType: 'CONTRACT_SERVICE',
  version: '1.0.0',
  confidenceThreshold: 0.80,
  fieldDefinitions: [
    {
      name: 'clientName',
      label: 'Client Name',
      type: 'string',
      required: true,
      helpText: 'The client receiving services',
    },
    {
      name: 'providerName',
      label: 'Service Provider',
      type: 'string',
      required: true,
      helpText: 'The company providing services',
    },
    {
      name: 'effectiveDate',
      label: 'Effective Date',
      type: 'date',
      required: true,
      helpText: 'Contract start date',
    },
    {
      name: 'termEndDate',
      label: 'Term End Date',
      type: 'date',
      required: false,
      helpText: 'Contract end date',
    },
    {
      name: 'contractValue',
      label: 'Contract Value',
      type: 'currency',
      required: false,
      helpText: 'Total contract value or rate',
    },
    {
      name: 'billingRate',
      label: 'Billing Rate',
      type: 'string',
      required: false,
      helpText: 'Hourly, daily, or project rate',
    },
    {
      name: 'paymentTerms',
      label: 'Payment Terms',
      type: 'string',
      required: false,
      helpText: 'Payment schedule and terms',
    },
    {
      name: 'scopeOfWork',
      label: 'Scope of Work',
      type: 'string',
      required: false,
      helpText: 'Description of services to be provided',
    },
    {
      name: 'deliverables',
      label: 'Deliverables',
      type: 'array',
      required: false,
      helpText: 'List of expected deliverables',
    },
    {
      name: 'terminationClause',
      label: 'Termination Clause',
      type: 'string',
      required: false,
      helpText: 'Conditions for contract termination',
    },
    {
      name: 'terminationNoticePeriod',
      label: 'Notice Period',
      type: 'string',
      required: false,
      helpText: 'Required notice for termination',
    },
    {
      name: 'autoRenewal',
      label: 'Auto-Renewal',
      type: 'boolean',
      required: false,
      helpText: 'Whether contract auto-renews',
    },
    {
      name: 'renewalTerms',
      label: 'Renewal Terms',
      type: 'string',
      required: false,
      helpText: 'Terms for renewal',
    },
    {
      name: 'liabilityLimit',
      label: 'Liability Limit',
      type: 'currency',
      required: false,
      helpText: 'Cap on liability',
    },
    {
      name: 'indemnification',
      label: 'Indemnification',
      type: 'string',
      required: false,
      helpText: 'Indemnification provisions',
    },
    {
      name: 'governingLaw',
      label: 'Governing Law',
      type: 'string',
      required: false,
      helpText: 'Jurisdiction',
    },
  ],
  extractionRules: [
    { fieldName: 'clientName', type: 'string', required: true, aiPrompt: 'Extract the client/customer name from the contract' },
    { fieldName: 'providerName', type: 'string', required: true, aiPrompt: 'Extract the service provider/vendor name' },
    { fieldName: 'effectiveDate', type: 'date', required: true, aiPrompt: 'Extract the contract effective/start date' },
    { fieldName: 'termEndDate', type: 'date', required: false, aiPrompt: 'Extract the contract end date or term' },
    { fieldName: 'contractValue', type: 'currency', required: false, aiPrompt: 'Extract the total contract value or pricing' },
    { fieldName: 'paymentTerms', type: 'string', required: false, aiPrompt: 'Extract payment terms and schedule' },
    { fieldName: 'terminationClause', type: 'string', required: false, aiPrompt: 'Extract termination conditions and notice requirements' },
    { fieldName: 'autoRenewal', type: 'boolean', required: false, aiPrompt: 'Determine if contract has auto-renewal provisions' },
    { fieldName: 'liabilityLimit', type: 'currency', required: false, aiPrompt: 'Extract any liability cap or limitation' },
  ],
  complianceRules: [
    {
      ruleId: 'SVC_001',
      name: 'Party Identification',
      description: 'Both parties must be identified',
      requiredFields: ['clientName', 'providerName'],
      severity: 'FAIL',
    },
    {
      ruleId: 'SVC_002',
      name: 'Effective Date Required',
      description: 'Contract must have an effective date',
      requiredFields: ['effectiveDate'],
      severity: 'FAIL',
    },
    {
      ruleId: 'SVC_003',
      name: 'Auto-Renewal Warning',
      description: 'Flag contracts with auto-renewal for review',
      pattern: 'auto.?renew|automatic.?renewal|evergreen',
      severity: 'WARNING',
    },
  ],
};

export const CONTRACT_EMPLOYMENT_TEMPLATE: BuiltInTemplate = {
  name: 'Employment Contract',
  description: 'Employment agreement, offer letter, or contractor agreement',
  category: 'CONTRACT',
  documentType: 'CONTRACT_EMPLOYMENT',
  version: '1.0.0',
  confidenceThreshold: 0.80,
  fieldDefinitions: [
    {
      name: 'employeeName',
      label: 'Employee Name',
      type: 'string',
      required: true,
      helpText: 'Name of the employee',
    },
    {
      name: 'employerName',
      label: 'Employer Name',
      type: 'string',
      required: true,
      helpText: 'Name of the employing company',
    },
    {
      name: 'jobTitle',
      label: 'Job Title',
      type: 'string',
      required: true,
      helpText: 'Position or role',
    },
    {
      name: 'startDate',
      label: 'Start Date',
      type: 'date',
      required: true,
      helpText: 'Employment start date',
    },
    {
      name: 'salary',
      label: 'Salary',
      type: 'currency',
      required: false,
      helpText: 'Base compensation',
    },
    {
      name: 'salaryFrequency',
      label: 'Pay Frequency',
      type: 'string',
      required: false,
      helpText: 'Annual, monthly, hourly, etc.',
    },
    {
      name: 'bonus',
      label: 'Bonus',
      type: 'string',
      required: false,
      helpText: 'Bonus structure',
    },
    {
      name: 'benefits',
      label: 'Benefits',
      type: 'array',
      required: false,
      helpText: 'List of benefits',
    },
    {
      name: 'probationPeriod',
      label: 'Probation Period',
      type: 'string',
      required: false,
      helpText: 'Length of probationary period',
    },
    {
      name: 'noticePeriod',
      label: 'Notice Period',
      type: 'string',
      required: false,
      helpText: 'Required notice for resignation/termination',
    },
    {
      name: 'nonCompete',
      label: 'Non-Compete',
      type: 'boolean',
      required: false,
      helpText: 'Whether non-compete clause exists',
    },
    {
      name: 'nonCompeteDuration',
      label: 'Non-Compete Duration',
      type: 'string',
      required: false,
      helpText: 'Duration of non-compete',
    },
  ],
  extractionRules: [
    { fieldName: 'employeeName', type: 'string', required: true, aiPrompt: 'Extract the employee name' },
    { fieldName: 'employerName', type: 'string', required: true, aiPrompt: 'Extract the employer company name' },
    { fieldName: 'jobTitle', type: 'string', required: true, aiPrompt: 'Extract the job title or position' },
    { fieldName: 'startDate', type: 'date', required: true, aiPrompt: 'Extract the employment start date' },
    { fieldName: 'salary', type: 'currency', required: false, aiPrompt: 'Extract the salary or compensation amount' },
    { fieldName: 'nonCompete', type: 'boolean', required: false, aiPrompt: 'Determine if there is a non-compete clause' },
  ],
  complianceRules: [
    {
      ruleId: 'EMP_001',
      name: 'Party Identification',
      description: 'Employee and employer must be identified',
      requiredFields: ['employeeName', 'employerName'],
      severity: 'FAIL',
    },
    {
      ruleId: 'EMP_002',
      name: 'Non-Compete Review',
      description: 'Flag contracts with non-compete clauses',
      pattern: 'non.?compete|non.?competition|restrictive.?covenant',
      severity: 'WARNING',
    },
  ],
};

// ============================================================================
// UNIVERSAL TEMPLATES - COMPLIANCE
// ============================================================================

export const COMPLIANCE_W9_TEMPLATE: BuiltInTemplate = {
  name: 'W-9 Tax Form',
  description: 'IRS Form W-9 Request for Taxpayer Identification Number',
  category: 'COMPLIANCE',
  documentType: 'FORM_W9',
  version: '1.0.0',
  confidenceThreshold: 0.90,
  fieldDefinitions: [
    {
      name: 'name',
      label: 'Name',
      type: 'string',
      required: true,
      helpText: 'Name as shown on tax return',
    },
    {
      name: 'businessName',
      label: 'Business Name',
      type: 'string',
      required: false,
      helpText: 'Business/DBA name if different',
    },
    {
      name: 'taxClassification',
      label: 'Tax Classification',
      type: 'string',
      required: true,
      helpText: 'Individual, C-Corp, S-Corp, Partnership, LLC, etc.',
    },
    {
      name: 'address',
      label: 'Address',
      type: 'string',
      required: true,
      helpText: 'Street address',
    },
    {
      name: 'city',
      label: 'City',
      type: 'string',
      required: true,
      helpText: 'City',
    },
    {
      name: 'state',
      label: 'State',
      type: 'string',
      required: true,
      helpText: 'State',
    },
    {
      name: 'zipCode',
      label: 'ZIP Code',
      type: 'string',
      required: true,
      helpText: 'ZIP code',
    },
    {
      name: 'ssn',
      label: 'SSN',
      type: 'string',
      required: false,
      validation: { pattern: '^[0-9]{3}-[0-9]{2}-[0-9]{4}$' },
      helpText: 'Social Security Number',
    },
    {
      name: 'ein',
      label: 'EIN',
      type: 'string',
      required: false,
      validation: { pattern: '^[0-9]{2}-[0-9]{7}$' },
      helpText: 'Employer Identification Number',
    },
    {
      name: 'signatureDate',
      label: 'Signature Date',
      type: 'date',
      required: false,
      helpText: 'Date form was signed',
    },
  ],
  extractionRules: [
    { fieldName: 'name', type: 'string', required: true, aiPrompt: 'Extract the name from line 1' },
    { fieldName: 'businessName', type: 'string', required: false, aiPrompt: 'Extract business name from line 2 if present' },
    { fieldName: 'taxClassification', type: 'string', required: true, aiPrompt: 'Identify the checked tax classification' },
    { fieldName: 'address', type: 'string', required: true, aiPrompt: 'Extract the street address' },
    { fieldName: 'ssn', type: 'string', required: false, aiPrompt: 'Extract SSN from Part I (mask all but last 4 digits)' },
    { fieldName: 'ein', type: 'string', required: false, aiPrompt: 'Extract EIN from Part I' },
  ],
  complianceRules: [
    {
      ruleId: 'W9_001',
      name: 'Tax ID Required',
      description: 'Either SSN or EIN must be provided',
      severity: 'FAIL',
    },
    {
      ruleId: 'W9_002',
      name: 'Name Required',
      description: 'Name must be provided',
      requiredFields: ['name'],
      severity: 'FAIL',
    },
  ],
};

// ============================================================================
// HEALTHCARE TEMPLATES
// ============================================================================

export const HEALTHCARE_CMS1500_TEMPLATE: BuiltInTemplate = {
  name: 'CMS-1500 Health Insurance Claim',
  description: 'Standard health insurance claim form used by physicians and suppliers',
  category: 'HEALTHCARE',
  industryType: 'HEALTHCARE',
  documentType: 'FORM_CMS1500',
  version: '1.0.0',
  confidenceThreshold: 0.85,
  fieldDefinitions: [
    {
      name: 'insuranceType',
      label: 'Insurance Type',
      type: 'string',
      required: true,
      helpText: 'Medicare, Medicaid, TRICARE, etc.',
    },
    {
      name: 'patientName',
      label: 'Patient Name',
      type: 'string',
      required: true,
      helpText: 'Patient full name',
    },
    {
      name: 'patientDOB',
      label: 'Patient DOB',
      type: 'date',
      required: true,
      helpText: 'Patient date of birth',
    },
    {
      name: 'patientAddress',
      label: 'Patient Address',
      type: 'string',
      required: true,
      helpText: 'Patient address',
    },
    {
      name: 'insuredName',
      label: 'Insured Name',
      type: 'string',
      required: false,
      helpText: 'Name of insured if different from patient',
    },
    {
      name: 'insuredIDNumber',
      label: 'Insured ID',
      type: 'string',
      required: true,
      helpText: 'Insurance ID number',
    },
    {
      name: 'groupNumber',
      label: 'Group Number',
      type: 'string',
      required: false,
      helpText: 'Group or policy number',
    },
    {
      name: 'diagnosisCodes',
      label: 'Diagnosis Codes',
      type: 'array',
      required: true,
      helpText: 'ICD-10 diagnosis codes',
    },
    {
      name: 'procedureCodes',
      label: 'Procedure Codes',
      type: 'array',
      required: true,
      helpText: 'CPT/HCPCS procedure codes',
    },
    {
      name: 'serviceDate',
      label: 'Service Date',
      type: 'date',
      required: true,
      helpText: 'Date of service',
    },
    {
      name: 'placeOfService',
      label: 'Place of Service',
      type: 'string',
      required: true,
      helpText: 'Place of service code',
    },
    {
      name: 'charges',
      label: 'Charges',
      type: 'currency',
      required: true,
      helpText: 'Total charges',
    },
    {
      name: 'providerNPI',
      label: 'Provider NPI',
      type: 'string',
      required: true,
      validation: { pattern: '^[0-9]{10}$' },
      helpText: 'Billing provider NPI',
    },
    {
      name: 'providerName',
      label: 'Provider Name',
      type: 'string',
      required: true,
      helpText: 'Billing provider name',
    },
    {
      name: 'providerTaxID',
      label: 'Provider Tax ID',
      type: 'string',
      required: true,
      helpText: 'Provider tax identification number',
    },
  ],
  extractionRules: [
    { fieldName: 'patientName', type: 'string', required: true, aiPrompt: 'Extract patient name from box 2' },
    { fieldName: 'patientDOB', type: 'date', required: true, aiPrompt: 'Extract patient date of birth from box 3' },
    { fieldName: 'insuredIDNumber', type: 'string', required: true, aiPrompt: 'Extract insured ID from box 1a' },
    { fieldName: 'diagnosisCodes', type: 'array', required: true, aiPrompt: 'Extract all ICD-10 codes from box 21' },
    { fieldName: 'procedureCodes', type: 'array', required: true, aiPrompt: 'Extract all CPT codes from box 24' },
    { fieldName: 'charges', type: 'currency', required: true, aiPrompt: 'Extract total charges from box 28' },
    { fieldName: 'providerNPI', type: 'string', required: true, aiPrompt: 'Extract NPI from box 33a' },
  ],
  complianceRules: [
    {
      ruleId: 'CMS_001',
      name: 'Patient Identification',
      description: 'Patient name and DOB required',
      requiredFields: ['patientName', 'patientDOB'],
      severity: 'FAIL',
    },
    {
      ruleId: 'CMS_002',
      name: 'Insurance ID Required',
      description: 'Insurance ID number must be present',
      requiredFields: ['insuredIDNumber'],
      severity: 'FAIL',
    },
    {
      ruleId: 'CMS_003',
      name: 'Diagnosis Codes Required',
      description: 'At least one diagnosis code required',
      requiredFields: ['diagnosisCodes'],
      severity: 'FAIL',
    },
    {
      ruleId: 'CMS_004',
      name: 'NPI Validation',
      description: 'Provider NPI must be 10 digits',
      requiredFields: ['providerNPI'],
      severity: 'FAIL',
    },
    {
      ruleId: 'HIPAA_001',
      name: 'PHI Detection',
      description: 'Document contains Protected Health Information',
      pattern: '(SSN|Social Security|Date of Birth|DOB|Patient ID)',
      severity: 'WARNING',
    },
  ],
};

export const HEALTHCARE_EOB_TEMPLATE: BuiltInTemplate = {
  name: 'Explanation of Benefits (EOB)',
  description: 'Insurance EOB statement showing claim processing details',
  category: 'HEALTHCARE',
  industryType: 'HEALTHCARE',
  documentType: 'EOB',
  version: '1.0.0',
  confidenceThreshold: 0.85,
  fieldDefinitions: [
    {
      name: 'patientName',
      label: 'Patient Name',
      type: 'string',
      required: true,
      helpText: 'Name of patient',
    },
    {
      name: 'memberID',
      label: 'Member ID',
      type: 'string',
      required: true,
      helpText: 'Insurance member ID',
    },
    {
      name: 'claimNumber',
      label: 'Claim Number',
      type: 'string',
      required: true,
      helpText: 'Insurance claim reference number',
    },
    {
      name: 'serviceDate',
      label: 'Service Date',
      type: 'date',
      required: true,
      helpText: 'Date of service',
    },
    {
      name: 'providerName',
      label: 'Provider Name',
      type: 'string',
      required: true,
      helpText: 'Healthcare provider name',
    },
    {
      name: 'billedAmount',
      label: 'Billed Amount',
      type: 'currency',
      required: true,
      helpText: 'Amount billed by provider',
    },
    {
      name: 'allowedAmount',
      label: 'Allowed Amount',
      type: 'currency',
      required: false,
      helpText: 'Amount allowed by insurance',
    },
    {
      name: 'paidAmount',
      label: 'Paid Amount',
      type: 'currency',
      required: true,
      helpText: 'Amount paid by insurance',
    },
    {
      name: 'patientResponsibility',
      label: 'Patient Responsibility',
      type: 'currency',
      required: true,
      helpText: 'Amount patient owes',
    },
    {
      name: 'deductible',
      label: 'Deductible',
      type: 'currency',
      required: false,
      helpText: 'Deductible applied',
    },
    {
      name: 'copay',
      label: 'Copay',
      type: 'currency',
      required: false,
      helpText: 'Copay amount',
    },
    {
      name: 'coinsurance',
      label: 'Coinsurance',
      type: 'currency',
      required: false,
      helpText: 'Coinsurance amount',
    },
    {
      name: 'denialReason',
      label: 'Denial Reason',
      type: 'string',
      required: false,
      helpText: 'Reason for denial if applicable',
    },
  ],
  extractionRules: [
    { fieldName: 'patientName', type: 'string', required: true, aiPrompt: 'Extract the patient name' },
    { fieldName: 'claimNumber', type: 'string', required: true, aiPrompt: 'Extract the claim reference number' },
    { fieldName: 'billedAmount', type: 'currency', required: true, aiPrompt: 'Extract the billed/charged amount' },
    { fieldName: 'paidAmount', type: 'currency', required: true, aiPrompt: 'Extract the amount paid by insurance' },
    { fieldName: 'patientResponsibility', type: 'currency', required: true, aiPrompt: 'Extract what the patient owes' },
  ],
  complianceRules: [
    {
      ruleId: 'EOB_001',
      name: 'Claim Reference',
      description: 'Claim number must be present',
      requiredFields: ['claimNumber'],
      severity: 'FAIL',
    },
    {
      ruleId: 'HIPAA_001',
      name: 'PHI Detection',
      description: 'Document contains Protected Health Information',
      severity: 'WARNING',
    },
  ],
};

// ============================================================================
// LEGAL TEMPLATES
// ============================================================================

export const LEGAL_COURT_FILING_TEMPLATE: BuiltInTemplate = {
  name: 'Court Filing',
  description: 'Legal court document including complaints, motions, and orders',
  category: 'LEGAL',
  industryType: 'LEGAL',
  documentType: 'COURT_FILING',
  version: '1.0.0',
  confidenceThreshold: 0.80,
  fieldDefinitions: [
    {
      name: 'caseNumber',
      label: 'Case Number',
      type: 'string',
      required: true,
      helpText: 'Court case number',
    },
    {
      name: 'court',
      label: 'Court',
      type: 'string',
      required: true,
      helpText: 'Court name and jurisdiction',
    },
    {
      name: 'filingType',
      label: 'Filing Type',
      type: 'string',
      required: true,
      helpText: 'Type of filing (Complaint, Motion, Order, etc.)',
    },
    {
      name: 'filingDate',
      label: 'Filing Date',
      type: 'date',
      required: true,
      helpText: 'Date filed with court',
    },
    {
      name: 'plaintiff',
      label: 'Plaintiff',
      type: 'string',
      required: true,
      helpText: 'Plaintiff name(s)',
    },
    {
      name: 'defendant',
      label: 'Defendant',
      type: 'string',
      required: true,
      helpText: 'Defendant name(s)',
    },
    {
      name: 'judge',
      label: 'Judge',
      type: 'string',
      required: false,
      helpText: 'Assigned judge',
    },
    {
      name: 'attorney',
      label: 'Attorney',
      type: 'string',
      required: false,
      helpText: 'Attorney of record',
    },
    {
      name: 'hearingDate',
      label: 'Hearing Date',
      type: 'date',
      required: false,
      helpText: 'Scheduled hearing date',
    },
    {
      name: 'deadlines',
      label: 'Deadlines',
      type: 'array',
      required: false,
      helpText: 'Important deadlines',
    },
  ],
  extractionRules: [
    { fieldName: 'caseNumber', type: 'string', required: true, aiPrompt: 'Extract the case/docket number' },
    { fieldName: 'court', type: 'string', required: true, aiPrompt: 'Identify the court and jurisdiction' },
    { fieldName: 'filingType', type: 'string', required: true, aiPrompt: 'Determine the type of filing' },
    { fieldName: 'plaintiff', type: 'string', required: true, aiPrompt: 'Extract plaintiff name(s)' },
    { fieldName: 'defendant', type: 'string', required: true, aiPrompt: 'Extract defendant name(s)' },
    { fieldName: 'deadlines', type: 'array', required: false, aiPrompt: 'Extract any deadlines or important dates' },
  ],
  complianceRules: [
    {
      ruleId: 'LEGAL_001',
      name: 'Case Identification',
      description: 'Case number must be present',
      requiredFields: ['caseNumber'],
      severity: 'FAIL',
    },
    {
      ruleId: 'LEGAL_002',
      name: 'Deadline Tracking',
      description: 'Flag documents with upcoming deadlines',
      severity: 'WARNING',
    },
  ],
};

// ============================================================================
// FINANCIAL SERVICES TEMPLATES
// ============================================================================

export const FINANCIAL_LOAN_APP_TEMPLATE: BuiltInTemplate = {
  name: 'Loan Application',
  description: 'Personal or business loan application form',
  category: 'FINANCIAL',
  industryType: 'FINANCIAL_SERVICES',
  documentType: 'LOAN_APPLICATION',
  version: '1.0.0',
  confidenceThreshold: 0.85,
  fieldDefinitions: [
    {
      name: 'applicantName',
      label: 'Applicant Name',
      type: 'string',
      required: true,
      helpText: 'Name of loan applicant',
    },
    {
      name: 'applicantSSN',
      label: 'SSN',
      type: 'string',
      required: true,
      helpText: 'Social Security Number',
    },
    {
      name: 'applicantDOB',
      label: 'Date of Birth',
      type: 'date',
      required: true,
      helpText: 'Applicant date of birth',
    },
    {
      name: 'address',
      label: 'Address',
      type: 'string',
      required: true,
      helpText: 'Current address',
    },
    {
      name: 'employerName',
      label: 'Employer',
      type: 'string',
      required: false,
      helpText: 'Current employer',
    },
    {
      name: 'annualIncome',
      label: 'Annual Income',
      type: 'currency',
      required: true,
      helpText: 'Annual gross income',
    },
    {
      name: 'loanAmount',
      label: 'Loan Amount',
      type: 'currency',
      required: true,
      helpText: 'Requested loan amount',
    },
    {
      name: 'loanPurpose',
      label: 'Loan Purpose',
      type: 'string',
      required: true,
      helpText: 'Purpose of loan',
    },
    {
      name: 'loanTerm',
      label: 'Loan Term',
      type: 'string',
      required: false,
      helpText: 'Requested loan term',
    },
    {
      name: 'collateral',
      label: 'Collateral',
      type: 'string',
      required: false,
      helpText: 'Collateral offered',
    },
  ],
  extractionRules: [
    { fieldName: 'applicantName', type: 'string', required: true, aiPrompt: 'Extract the applicant name' },
    { fieldName: 'annualIncome', type: 'currency', required: true, aiPrompt: 'Extract annual income' },
    { fieldName: 'loanAmount', type: 'currency', required: true, aiPrompt: 'Extract requested loan amount' },
    { fieldName: 'loanPurpose', type: 'string', required: true, aiPrompt: 'Extract the purpose of the loan' },
  ],
  complianceRules: [
    {
      ruleId: 'KYC_001',
      name: 'Identity Verification',
      description: 'Applicant identity must be verifiable',
      requiredFields: ['applicantName', 'applicantSSN', 'applicantDOB'],
      severity: 'FAIL',
    },
    {
      ruleId: 'AML_001',
      name: 'Income Verification',
      description: 'Income must be documented',
      requiredFields: ['annualIncome'],
      severity: 'WARNING',
    },
  ],
};

export const FINANCIAL_BANK_STATEMENT_TEMPLATE: BuiltInTemplate = {
  name: 'Bank Statement',
  description: 'Monthly bank account statement',
  category: 'FINANCIAL',
  industryType: 'FINANCIAL_SERVICES',
  documentType: 'BANK_STATEMENT',
  version: '1.0.0',
  confidenceThreshold: 0.85,
  fieldDefinitions: [
    {
      name: 'accountHolder',
      label: 'Account Holder',
      type: 'string',
      required: true,
      helpText: 'Name on account',
    },
    {
      name: 'accountNumber',
      label: 'Account Number',
      type: 'string',
      required: true,
      helpText: 'Bank account number',
    },
    {
      name: 'bankName',
      label: 'Bank Name',
      type: 'string',
      required: true,
      helpText: 'Name of financial institution',
    },
    {
      name: 'statementPeriod',
      label: 'Statement Period',
      type: 'string',
      required: true,
      helpText: 'Date range for statement',
    },
    {
      name: 'openingBalance',
      label: 'Opening Balance',
      type: 'currency',
      required: true,
      helpText: 'Balance at start of period',
    },
    {
      name: 'closingBalance',
      label: 'Closing Balance',
      type: 'currency',
      required: true,
      helpText: 'Balance at end of period',
    },
    {
      name: 'totalDeposits',
      label: 'Total Deposits',
      type: 'currency',
      required: false,
      helpText: 'Sum of all deposits',
    },
    {
      name: 'totalWithdrawals',
      label: 'Total Withdrawals',
      type: 'currency',
      required: false,
      helpText: 'Sum of all withdrawals',
    },
    {
      name: 'transactions',
      label: 'Transactions',
      type: 'array',
      required: false,
      helpText: 'List of transactions',
    },
  ],
  extractionRules: [
    { fieldName: 'accountHolder', type: 'string', required: true, aiPrompt: 'Extract the account holder name' },
    { fieldName: 'accountNumber', type: 'string', required: true, aiPrompt: 'Extract account number (mask if full)' },
    { fieldName: 'bankName', type: 'string', required: true, aiPrompt: 'Extract the bank name' },
    { fieldName: 'openingBalance', type: 'currency', required: true, aiPrompt: 'Extract opening/beginning balance' },
    { fieldName: 'closingBalance', type: 'currency', required: true, aiPrompt: 'Extract closing/ending balance' },
  ],
  complianceRules: [
    {
      ruleId: 'FIN_001',
      name: 'Account Identification',
      description: 'Account must be identifiable',
      requiredFields: ['accountNumber', 'bankName'],
      severity: 'FAIL',
    },
  ],
};

// ============================================================================
// REAL ESTATE TEMPLATES
// ============================================================================

export const REAL_ESTATE_LEASE_TEMPLATE: BuiltInTemplate = {
  name: 'Lease Agreement',
  description: 'Residential or commercial lease agreement',
  category: 'REAL_ESTATE',
  industryType: 'REAL_ESTATE',
  documentType: 'LEASE_AGREEMENT',
  version: '1.0.0',
  confidenceThreshold: 0.85,
  fieldDefinitions: [
    {
      name: 'landlordName',
      label: 'Landlord',
      type: 'string',
      required: true,
      helpText: 'Property owner/landlord name',
    },
    {
      name: 'tenantName',
      label: 'Tenant',
      type: 'string',
      required: true,
      helpText: 'Tenant name(s)',
    },
    {
      name: 'propertyAddress',
      label: 'Property Address',
      type: 'string',
      required: true,
      helpText: 'Address of leased property',
    },
    {
      name: 'leaseStartDate',
      label: 'Lease Start',
      type: 'date',
      required: true,
      helpText: 'Lease commencement date',
    },
    {
      name: 'leaseEndDate',
      label: 'Lease End',
      type: 'date',
      required: true,
      helpText: 'Lease termination date',
    },
    {
      name: 'monthlyRent',
      label: 'Monthly Rent',
      type: 'currency',
      required: true,
      helpText: 'Monthly rent amount',
    },
    {
      name: 'securityDeposit',
      label: 'Security Deposit',
      type: 'currency',
      required: true,
      helpText: 'Security deposit amount',
    },
    {
      name: 'rentDueDay',
      label: 'Rent Due Day',
      type: 'number',
      required: false,
      helpText: 'Day of month rent is due',
    },
    {
      name: 'lateFee',
      label: 'Late Fee',
      type: 'currency',
      required: false,
      helpText: 'Late payment fee',
    },
    {
      name: 'utilities',
      label: 'Utilities',
      type: 'string',
      required: false,
      helpText: 'Utilities included/excluded',
    },
    {
      name: 'petsAllowed',
      label: 'Pets Allowed',
      type: 'boolean',
      required: false,
      helpText: 'Whether pets are permitted',
    },
    {
      name: 'petDeposit',
      label: 'Pet Deposit',
      type: 'currency',
      required: false,
      helpText: 'Pet deposit if applicable',
    },
  ],
  extractionRules: [
    { fieldName: 'landlordName', type: 'string', required: true, aiPrompt: 'Extract landlord/lessor name' },
    { fieldName: 'tenantName', type: 'string', required: true, aiPrompt: 'Extract tenant/lessee name(s)' },
    { fieldName: 'propertyAddress', type: 'string', required: true, aiPrompt: 'Extract the property address' },
    { fieldName: 'leaseStartDate', type: 'date', required: true, aiPrompt: 'Extract lease start/commencement date' },
    { fieldName: 'leaseEndDate', type: 'date', required: true, aiPrompt: 'Extract lease end/termination date' },
    { fieldName: 'monthlyRent', type: 'currency', required: true, aiPrompt: 'Extract monthly rent amount' },
    { fieldName: 'securityDeposit', type: 'currency', required: true, aiPrompt: 'Extract security deposit amount' },
  ],
  complianceRules: [
    {
      ruleId: 'LEASE_001',
      name: 'Party Identification',
      description: 'Landlord and tenant must be identified',
      requiredFields: ['landlordName', 'tenantName'],
      severity: 'FAIL',
    },
    {
      ruleId: 'LEASE_002',
      name: 'Lease Term',
      description: 'Lease dates must be specified',
      requiredFields: ['leaseStartDate', 'leaseEndDate'],
      severity: 'FAIL',
    },
  ],
};

// ============================================================================
// MANUFACTURING TEMPLATES
// ============================================================================

export const MANUFACTURING_WORK_ORDER_TEMPLATE: BuiltInTemplate = {
  name: 'Work Order',
  description: 'Manufacturing work order or job ticket',
  category: 'MANUFACTURING',
  industryType: 'MANUFACTURING',
  documentType: 'WORK_ORDER',
  version: '1.0.0',
  confidenceThreshold: 0.85,
  fieldDefinitions: [
    {
      name: 'workOrderNumber',
      label: 'Work Order #',
      type: 'string',
      required: true,
      helpText: 'Work order identifier',
    },
    {
      name: 'customerName',
      label: 'Customer',
      type: 'string',
      required: true,
      helpText: 'Customer name',
    },
    {
      name: 'orderDate',
      label: 'Order Date',
      type: 'date',
      required: true,
      helpText: 'Date order was placed',
    },
    {
      name: 'dueDate',
      label: 'Due Date',
      type: 'date',
      required: true,
      helpText: 'Required completion date',
    },
    {
      name: 'productName',
      label: 'Product',
      type: 'string',
      required: true,
      helpText: 'Product being manufactured',
    },
    {
      name: 'productSKU',
      label: 'SKU',
      type: 'string',
      required: false,
      helpText: 'Product SKU/part number',
    },
    {
      name: 'quantity',
      label: 'Quantity',
      type: 'number',
      required: true,
      helpText: 'Quantity to produce',
    },
    {
      name: 'materials',
      label: 'Materials',
      type: 'array',
      required: false,
      helpText: 'Required materials/BOM',
    },
    {
      name: 'operations',
      label: 'Operations',
      type: 'array',
      required: false,
      helpText: 'Manufacturing operations/steps',
    },
    {
      name: 'priority',
      label: 'Priority',
      type: 'string',
      required: false,
      helpText: 'Order priority level',
    },
  ],
  extractionRules: [
    { fieldName: 'workOrderNumber', type: 'string', required: true, aiPrompt: 'Extract work order number' },
    { fieldName: 'customerName', type: 'string', required: true, aiPrompt: 'Extract customer name' },
    { fieldName: 'dueDate', type: 'date', required: true, aiPrompt: 'Extract due/completion date' },
    { fieldName: 'productName', type: 'string', required: true, aiPrompt: 'Extract product name' },
    { fieldName: 'quantity', type: 'number', required: true, aiPrompt: 'Extract quantity to produce' },
  ],
  complianceRules: [
    {
      ruleId: 'WO_001',
      name: 'Order Identification',
      description: 'Work order number required',
      requiredFields: ['workOrderNumber'],
      severity: 'FAIL',
    },
  ],
};

export const MANUFACTURING_QUALITY_INSPECTION_TEMPLATE: BuiltInTemplate = {
  name: 'Quality Inspection Report',
  description: 'Quality control inspection form',
  category: 'MANUFACTURING',
  industryType: 'MANUFACTURING',
  documentType: 'QUALITY_INSPECTION',
  version: '1.0.0',
  confidenceThreshold: 0.85,
  fieldDefinitions: [
    {
      name: 'inspectionNumber',
      label: 'Inspection #',
      type: 'string',
      required: true,
      helpText: 'Inspection report number',
    },
    {
      name: 'inspectionDate',
      label: 'Inspection Date',
      type: 'date',
      required: true,
      helpText: 'Date of inspection',
    },
    {
      name: 'inspector',
      label: 'Inspector',
      type: 'string',
      required: true,
      helpText: 'Inspector name',
    },
    {
      name: 'productName',
      label: 'Product',
      type: 'string',
      required: true,
      helpText: 'Product inspected',
    },
    {
      name: 'lotNumber',
      label: 'Lot Number',
      type: 'string',
      required: false,
      helpText: 'Lot/batch number',
    },
    {
      name: 'sampleSize',
      label: 'Sample Size',
      type: 'number',
      required: false,
      helpText: 'Number of items inspected',
    },
    {
      name: 'passCount',
      label: 'Pass Count',
      type: 'number',
      required: false,
      helpText: 'Items that passed inspection',
    },
    {
      name: 'failCount',
      label: 'Fail Count',
      type: 'number',
      required: false,
      helpText: 'Items that failed inspection',
    },
    {
      name: 'overallResult',
      label: 'Result',
      type: 'string',
      required: true,
      helpText: 'Pass/Fail overall result',
    },
    {
      name: 'defects',
      label: 'Defects',
      type: 'array',
      required: false,
      helpText: 'List of defects found',
    },
    {
      name: 'correctiveActions',
      label: 'Corrective Actions',
      type: 'string',
      required: false,
      helpText: 'Required corrective actions',
    },
  ],
  extractionRules: [
    { fieldName: 'inspectionNumber', type: 'string', required: true, aiPrompt: 'Extract inspection report number' },
    { fieldName: 'inspectionDate', type: 'date', required: true, aiPrompt: 'Extract inspection date' },
    { fieldName: 'inspector', type: 'string', required: true, aiPrompt: 'Extract inspector name' },
    { fieldName: 'overallResult', type: 'string', required: true, aiPrompt: 'Extract overall pass/fail result' },
    { fieldName: 'defects', type: 'array', required: false, aiPrompt: 'Extract list of defects found' },
  ],
  complianceRules: [
    {
      ruleId: 'QC_001',
      name: 'Inspection Documentation',
      description: 'Inspection must be documented with date and inspector',
      requiredFields: ['inspectionDate', 'inspector'],
      severity: 'FAIL',
    },
    {
      ruleId: 'QC_002',
      name: 'Result Required',
      description: 'Overall result must be recorded',
      requiredFields: ['overallResult'],
      severity: 'FAIL',
    },
  ],
};

// ============================================================================
// EXPORT ALL TEMPLATES
// ============================================================================

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  // Universal - Invoices
  INVOICE_AP_TEMPLATE,
  INVOICE_AR_TEMPLATE,
  // Universal - Contracts
  CONTRACT_NDA_TEMPLATE,
  CONTRACT_SERVICE_TEMPLATE,
  CONTRACT_EMPLOYMENT_TEMPLATE,
  // Universal - Compliance
  COMPLIANCE_W9_TEMPLATE,
  // Healthcare
  HEALTHCARE_CMS1500_TEMPLATE,
  HEALTHCARE_EOB_TEMPLATE,
  // Legal
  LEGAL_COURT_FILING_TEMPLATE,
  // Financial Services
  FINANCIAL_LOAN_APP_TEMPLATE,
  FINANCIAL_BANK_STATEMENT_TEMPLATE,
  // Real Estate
  REAL_ESTATE_LEASE_TEMPLATE,
  // Manufacturing
  MANUFACTURING_WORK_ORDER_TEMPLATE,
  MANUFACTURING_QUALITY_INSPECTION_TEMPLATE,
];

// Helper function to get templates by category
export function getTemplatesByCategory(category: DocumentCategory): BuiltInTemplate[] {
  return BUILT_IN_TEMPLATES.filter(t => t.category === category);
}

// Helper function to get templates by industry
export function getTemplatesByIndustry(industry: IndustryType): BuiltInTemplate[] {
  return BUILT_IN_TEMPLATES.filter(t => t.industryType === industry);
}

// Helper function to get a specific template by document type
export function getTemplateByDocumentType(documentType: string): BuiltInTemplate | undefined {
  return BUILT_IN_TEMPLATES.find(t => t.documentType === documentType);
}
