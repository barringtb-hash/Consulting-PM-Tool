/**
 * Compliance Rule Engine Service
 *
 * Provides comprehensive compliance checking for documents across
 * multiple industries and regulatory frameworks.
 */

import {
  DocumentCategory,
  IndustryType,
  ComplianceLevel,
} from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface ComplianceRule {
  ruleId: string;
  name: string;
  description: string;
  category:
    | 'required_field'
    | 'pattern_match'
    | 'value_validation'
    | 'pii_detection'
    | 'risk_indicator';
  severity: ComplianceLevel;
  // For required field checks
  requiredFields?: string[];
  // For pattern matching
  pattern?: string;
  patternFlags?: string;
  // For value validation
  fieldName?: string;
  validation?: {
    type: 'min' | 'max' | 'range' | 'format' | 'enum';
    value?: number | string | number[];
    values?: string[];
  };
  // Remediation
  remediationHint?: string;
}

export interface ComplianceRuleSet {
  code: string;
  name: string;
  description: string;
  version: string;
  industries: IndustryType[];
  categories: DocumentCategory[];
  rules: ComplianceRule[];
}

export interface ComplianceCheckResult {
  status: ComplianceLevel;
  score: number; // 0-100
  flags: ComplianceFlag[];
  passedRules: number;
  totalRules: number;
  riskIndicators: string[];
  recommendations: string[];
}

export interface ComplianceFlag {
  ruleId: string;
  ruleName: string;
  status: ComplianceLevel;
  message: string;
  location?: string;
  fieldName?: string;
  remediationHint?: string;
}

// ============================================================================
// BUILT-IN COMPLIANCE RULE SETS
// ============================================================================

export const HIPAA_RULESET: ComplianceRuleSet = {
  code: 'HIPAA',
  name: 'HIPAA Compliance',
  description:
    'Health Insurance Portability and Accountability Act compliance rules for healthcare documents',
  version: '1.0.0',
  industries: ['HEALTHCARE'],
  categories: ['HEALTHCARE', 'COMPLIANCE'],
  rules: [
    {
      ruleId: 'HIPAA_001',
      name: 'PHI Detection - SSN',
      description: 'Detect Social Security Numbers in document',
      category: 'pii_detection',
      severity: 'WARNING',
      pattern: '\\b\\d{3}[-\\s]?\\d{2}[-\\s]?\\d{4}\\b',
      remediationHint:
        'Ensure SSN is properly protected or redacted if not necessary',
    },
    {
      ruleId: 'HIPAA_002',
      name: 'PHI Detection - DOB',
      description: 'Detect dates of birth in document',
      category: 'pii_detection',
      severity: 'WARNING',
      pattern: '(date\\s*of\\s*birth|dob|born\\s*on)',
      patternFlags: 'i',
      remediationHint: 'Verify DOB is necessary for the document purpose',
    },
    {
      ruleId: 'HIPAA_003',
      name: 'PHI Detection - Medical Record Number',
      description: 'Detect medical record numbers',
      category: 'pii_detection',
      severity: 'WARNING',
      pattern: '(medical\\s*record|mrn|patient\\s*id)',
      patternFlags: 'i',
      remediationHint: 'Ensure MRN is properly secured',
    },
    {
      ruleId: 'HIPAA_004',
      name: 'PHI Detection - Health Insurance ID',
      description: 'Detect health insurance identifiers',
      category: 'pii_detection',
      severity: 'WARNING',
      pattern: '(member\\s*id|subscriber\\s*id|policy\\s*number)',
      patternFlags: 'i',
      remediationHint: 'Verify insurance information handling',
    },
    {
      ruleId: 'HIPAA_005',
      name: 'Diagnosis Information',
      description: 'Document contains diagnosis information',
      category: 'pii_detection',
      severity: 'WARNING',
      pattern: '(diagnosis|icd-?10|condition|treatment)',
      patternFlags: 'i',
      remediationHint: 'Handle diagnosis information per HIPAA guidelines',
    },
    {
      ruleId: 'HIPAA_006',
      name: 'Authorization Required',
      description: 'Check for patient authorization',
      category: 'pattern_match',
      severity: 'WARNING',
      pattern: '(patient\\s*signature|authorization|consent)',
      patternFlags: 'i',
      remediationHint: 'Ensure proper patient authorization is documented',
    },
  ],
};

export const SOC2_RULESET: ComplianceRuleSet = {
  code: 'SOC2',
  name: 'SOC 2 Compliance',
  description: 'Service Organization Control 2 compliance rules',
  version: '1.0.0',
  industries: ['TECHNOLOGY', 'FINANCIAL_SERVICES', 'PROFESSIONAL_SERVICES'],
  categories: ['COMPLIANCE', 'CONTRACT'],
  rules: [
    {
      ruleId: 'SOC2_001',
      name: 'Data Classification',
      description: 'Check for data classification labels',
      category: 'pattern_match',
      severity: 'WARNING',
      pattern: '(confidential|internal|public|restricted|sensitive)',
      patternFlags: 'i',
      remediationHint: 'Add appropriate data classification label',
    },
    {
      ruleId: 'SOC2_002',
      name: 'Security Controls Reference',
      description: 'Document references security controls',
      category: 'pattern_match',
      severity: 'WARNING',
      pattern: '(security\\s*control|access\\s*control|encryption)',
      patternFlags: 'i',
    },
    {
      ruleId: 'SOC2_003',
      name: 'Audit Trail',
      description: 'Document includes audit information',
      category: 'pattern_match',
      severity: 'WARNING',
      pattern: '(audit\\s*trail|change\\s*log|version\\s*history)',
      patternFlags: 'i',
    },
  ],
};

export const GDPR_RULESET: ComplianceRuleSet = {
  code: 'GDPR',
  name: 'GDPR Compliance',
  description:
    'General Data Protection Regulation compliance rules for EU data',
  version: '1.0.0',
  industries: ['TECHNOLOGY', 'FINANCIAL_SERVICES', 'RETAIL', 'HEALTHCARE'],
  categories: ['COMPLIANCE', 'CONTRACT'],
  rules: [
    {
      ruleId: 'GDPR_001',
      name: 'Personal Data Detection',
      description: 'Detect personal data elements',
      category: 'pii_detection',
      severity: 'WARNING',
      pattern: '(personal\\s*data|data\\s*subject|natural\\s*person)',
      patternFlags: 'i',
      remediationHint: 'Ensure GDPR-compliant handling of personal data',
    },
    {
      ruleId: 'GDPR_002',
      name: 'Consent Documentation',
      description: 'Check for consent documentation',
      category: 'pattern_match',
      severity: 'WARNING',
      pattern: '(consent|opt-?in|data\\s*processing\\s*agreement)',
      patternFlags: 'i',
      remediationHint: 'Document consent per GDPR requirements',
    },
    {
      ruleId: 'GDPR_003',
      name: 'Data Retention Period',
      description: 'Document mentions data retention',
      category: 'pattern_match',
      severity: 'WARNING',
      pattern: '(retention\\s*period|data\\s*retention|delete\\s*after)',
      patternFlags: 'i',
    },
    {
      ruleId: 'GDPR_004',
      name: 'EU Residency Indicator',
      description: 'Document involves EU residents',
      category: 'pattern_match',
      severity: 'WARNING',
      pattern: '(european\\s*union|eu\\s*resident|gdpr)',
      patternFlags: 'i',
    },
  ],
};

export const AML_RULESET: ComplianceRuleSet = {
  code: 'AML',
  name: 'Anti-Money Laundering',
  description: 'AML compliance rules for financial documents',
  version: '1.0.0',
  industries: ['FINANCIAL_SERVICES'],
  categories: ['FINANCIAL', 'COMPLIANCE'],
  rules: [
    {
      ruleId: 'AML_001',
      name: 'Large Transaction Detection',
      description: 'Flag transactions over reporting threshold',
      category: 'value_validation',
      severity: 'WARNING',
      fieldName: 'totalAmount',
      validation: { type: 'min', value: 10000 },
      remediationHint: 'Transactions over $10,000 may require CTR filing',
    },
    {
      ruleId: 'AML_002',
      name: 'Structuring Pattern',
      description: 'Detect potential structuring patterns',
      category: 'pattern_match',
      severity: 'WARNING',
      pattern: '(multiple\\s*transactions|split\\s*payment|structured)',
      patternFlags: 'i',
      remediationHint: 'Review for potential structuring activity',
    },
    {
      ruleId: 'AML_003',
      name: 'High-Risk Country',
      description: 'Detect high-risk jurisdiction mentions',
      category: 'pattern_match',
      severity: 'WARNING',
      pattern: '(offshore|tax\\s*haven|shell\\s*company)',
      patternFlags: 'i',
      remediationHint: 'Enhanced due diligence may be required',
    },
    {
      ruleId: 'AML_004',
      name: 'PEP Indicator',
      description: 'Politically Exposed Person indicator',
      category: 'pattern_match',
      severity: 'WARNING',
      pattern: '(politically\\s*exposed|pep|government\\s*official)',
      patternFlags: 'i',
      remediationHint: 'PEP status requires enhanced monitoring',
    },
  ],
};

export const KYC_RULESET: ComplianceRuleSet = {
  code: 'KYC',
  name: 'Know Your Customer',
  description: 'KYC compliance rules for customer identification',
  version: '1.0.0',
  industries: ['FINANCIAL_SERVICES'],
  categories: ['FINANCIAL', 'COMPLIANCE'],
  rules: [
    {
      ruleId: 'KYC_001',
      name: 'Identity Verification',
      description: 'Customer identity must be verified',
      category: 'required_field',
      severity: 'FAIL',
      requiredFields: ['applicantName'],
      remediationHint: 'Collect and verify customer identification',
    },
    {
      ruleId: 'KYC_002',
      name: 'Address Verification',
      description: 'Customer address should be verified',
      category: 'required_field',
      severity: 'WARNING',
      requiredFields: ['address'],
      remediationHint: 'Verify customer address with supporting documentation',
    },
    {
      ruleId: 'KYC_003',
      name: 'Tax ID Verification',
      description: 'Tax identification should be collected',
      category: 'pattern_match',
      severity: 'WARNING',
      pattern: '(ssn|ein|tax\\s*id|taxpayer)',
      patternFlags: 'i',
      remediationHint: 'Collect and verify tax identification',
    },
  ],
};

export const CONTRACT_COMPLIANCE_RULESET: ComplianceRuleSet = {
  code: 'CONTRACT_REVIEW',
  name: 'Contract Review Compliance',
  description: 'Standard contract review compliance checks',
  version: '1.0.0',
  industries: ['LEGAL', 'PROFESSIONAL_SERVICES'],
  categories: ['CONTRACT'],
  rules: [
    {
      ruleId: 'CTR_001',
      name: 'Party Identification',
      description: 'All parties must be clearly identified',
      category: 'required_field',
      severity: 'FAIL',
      remediationHint: 'Ensure all contract parties are clearly named',
    },
    {
      ruleId: 'CTR_002',
      name: 'Auto-Renewal Clause',
      description: 'Flag contracts with auto-renewal',
      category: 'pattern_match',
      severity: 'WARNING',
      pattern: '(auto.?renew|automatic\\s*renewal|evergreen)',
      patternFlags: 'i',
      remediationHint:
        'Review auto-renewal terms and cancellation requirements',
    },
    {
      ruleId: 'CTR_003',
      name: 'Unlimited Liability',
      description: 'Flag contracts without liability caps',
      category: 'pattern_match',
      severity: 'WARNING',
      pattern: '(unlimited\\s*liability|no\\s*cap|without\\s*limitation)',
      patternFlags: 'i',
      remediationHint: 'Consider negotiating a liability cap',
    },
    {
      ruleId: 'CTR_004',
      name: 'Non-Compete Clause',
      description: 'Flag non-compete provisions',
      category: 'pattern_match',
      severity: 'WARNING',
      pattern: '(non.?compete|non.?competition|restrictive\\s*covenant)',
      patternFlags: 'i',
      remediationHint: 'Review non-compete scope and duration',
    },
    {
      ruleId: 'CTR_005',
      name: 'Indemnification',
      description: 'Flag indemnification clauses',
      category: 'pattern_match',
      severity: 'WARNING',
      pattern: '(indemnif|hold\\s*harmless|defend\\s*and\\s*protect)',
      patternFlags: 'i',
      remediationHint: 'Review indemnification obligations',
    },
    {
      ruleId: 'CTR_006',
      name: 'Termination Rights',
      description: 'Check for termination provisions',
      category: 'pattern_match',
      severity: 'WARNING',
      pattern: '(terminat|cancel|end\\s*of\\s*agreement)',
      patternFlags: 'i',
    },
  ],
};

export const INVOICE_COMPLIANCE_RULESET: ComplianceRuleSet = {
  code: 'INVOICE_REVIEW',
  name: 'Invoice Review Compliance',
  description: 'Invoice validation and compliance checks',
  version: '1.0.0',
  industries: ['RETAIL', 'MANUFACTURING', 'PROFESSIONAL_SERVICES'],
  categories: ['INVOICE'],
  rules: [
    {
      ruleId: 'INV_001',
      name: 'Invoice Number Required',
      description: 'Invoice must have unique identifier',
      category: 'required_field',
      severity: 'FAIL',
      requiredFields: ['invoiceNumber'],
      remediationHint: 'Request invoice number from vendor',
    },
    {
      ruleId: 'INV_002',
      name: 'Vendor Identification',
      description: 'Vendor must be clearly identified',
      category: 'required_field',
      severity: 'FAIL',
      requiredFields: ['vendorName'],
      remediationHint: 'Verify vendor information',
    },
    {
      ruleId: 'INV_003',
      name: 'Amount Due Required',
      description: 'Total amount must be specified',
      category: 'required_field',
      severity: 'FAIL',
      requiredFields: ['totalAmount'],
      remediationHint: 'Clarify total amount due',
    },
    {
      ruleId: 'INV_004',
      name: 'Date Required',
      description: 'Invoice date must be present',
      category: 'required_field',
      severity: 'WARNING',
      requiredFields: ['invoiceDate'],
      remediationHint: 'Add invoice date',
    },
    {
      ruleId: 'INV_005',
      name: 'Duplicate Detection',
      description: 'Check for potential duplicate invoices',
      category: 'risk_indicator',
      severity: 'WARNING',
      remediationHint: 'Verify this is not a duplicate payment',
    },
    {
      ruleId: 'INV_006',
      name: 'Large Invoice Flag',
      description: 'Flag invoices over approval threshold',
      category: 'value_validation',
      severity: 'WARNING',
      fieldName: 'totalAmount',
      validation: { type: 'min', value: 50000 },
      remediationHint: 'Invoice may require additional approval',
    },
  ],
};

// All built-in rule sets
export const BUILT_IN_RULESETS: ComplianceRuleSet[] = [
  HIPAA_RULESET,
  SOC2_RULESET,
  GDPR_RULESET,
  AML_RULESET,
  KYC_RULESET,
  CONTRACT_COMPLIANCE_RULESET,
  INVOICE_COMPLIANCE_RULESET,
];

// ============================================================================
// COMPLIANCE CHECK SERVICE
// ============================================================================

/**
 * Run compliance checks on a document
 */
export function runComplianceCheck(
  text: string,
  extractedFields: Record<
    string,
    { value: string | number; confidence: number }
  >,
  ruleSets: ComplianceRuleSet[],
): ComplianceCheckResult {
  const flags: ComplianceFlag[] = [];
  const riskIndicators: string[] = [];
  const recommendations: string[] = [];
  let passedRules = 0;
  let totalRules = 0;

  for (const ruleSet of ruleSets) {
    for (const rule of ruleSet.rules) {
      totalRules++;
      const result = evaluateRule(rule, text, extractedFields);

      if (result.passed) {
        passedRules++;
      } else {
        flags.push({
          ruleId: rule.ruleId,
          ruleName: rule.name,
          status: rule.severity,
          message: result.message,
          location: result.location,
          fieldName: result.fieldName,
          remediationHint: rule.remediationHint,
        });

        if (rule.category === 'risk_indicator') {
          riskIndicators.push(rule.name);
        }

        if (rule.remediationHint) {
          recommendations.push(rule.remediationHint);
        }
      }
    }
  }

  // Calculate overall status
  let status: ComplianceLevel = 'PASS';
  if (flags.some((f) => f.status === 'FAIL')) {
    status = 'FAIL';
  } else if (flags.some((f) => f.status === 'WARNING')) {
    status = 'WARNING';
  }

  // Calculate score (0-100)
  const score =
    totalRules > 0 ? Math.round((passedRules / totalRules) * 100) : 100;

  return {
    status,
    score,
    flags,
    passedRules,
    totalRules,
    riskIndicators: [...new Set(riskIndicators)],
    recommendations: [...new Set(recommendations)],
  };
}

/**
 * Evaluate a single compliance rule
 */
function evaluateRule(
  rule: ComplianceRule,
  text: string,
  extractedFields: Record<
    string,
    { value: string | number; confidence: number }
  >,
): { passed: boolean; message: string; location?: string; fieldName?: string } {
  switch (rule.category) {
    case 'required_field':
      return evaluateRequiredField(rule, extractedFields);

    case 'pattern_match':
      return evaluatePatternMatch(rule, text);

    case 'value_validation':
      return evaluateValueValidation(rule, extractedFields);

    case 'pii_detection':
      return evaluatePIIDetection(rule, text);

    case 'risk_indicator':
      return evaluateRiskIndicator(rule, text, extractedFields);

    default:
      return { passed: true, message: 'Rule type not implemented' };
  }
}

function evaluateRequiredField(
  rule: ComplianceRule,
  extractedFields: Record<
    string,
    { value: string | number; confidence: number }
  >,
): { passed: boolean; message: string; fieldName?: string } {
  if (!rule.requiredFields) {
    return { passed: true, message: 'No required fields specified' };
  }

  const missingFields: string[] = [];
  for (const field of rule.requiredFields) {
    if (!extractedFields[field] || !extractedFields[field].value) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    return {
      passed: false,
      message: `Missing required field(s): ${missingFields.join(', ')}`,
      fieldName: missingFields[0],
    };
  }

  return { passed: true, message: 'All required fields present' };
}

function evaluatePatternMatch(
  rule: ComplianceRule,
  text: string,
): { passed: boolean; message: string; location?: string } {
  if (!rule.pattern) {
    return { passed: true, message: 'No pattern specified' };
  }

  try {
    const regex = new RegExp(rule.pattern, rule.patternFlags || 'i');
    const match = text.match(regex);

    if (match) {
      // For compliance, finding the pattern is often a flag, not a pass
      // Depends on rule context - some patterns are required, some are warnings
      return {
        passed: false,
        message: `${rule.name}: Pattern detected - "${match[0]}"`,
        location: `Position ${match.index}`,
      };
    }

    return { passed: true, message: 'Pattern not found' };
  } catch (_e) {
    return { passed: true, message: 'Invalid pattern' };
  }
}

function evaluateValueValidation(
  rule: ComplianceRule,
  extractedFields: Record<
    string,
    { value: string | number; confidence: number }
  >,
): { passed: boolean; message: string; fieldName?: string } {
  if (!rule.fieldName || !rule.validation) {
    return { passed: true, message: 'No validation specified' };
  }

  const field = extractedFields[rule.fieldName];
  if (!field) {
    return { passed: true, message: 'Field not present' };
  }

  const value =
    typeof field.value === 'number'
      ? field.value
      : parseFloat(String(field.value).replace(/[^0-9.-]/g, ''));

  if (isNaN(value)) {
    return { passed: true, message: 'Value not numeric' };
  }

  switch (rule.validation.type) {
    case 'min':
      if (value >= (rule.validation.value as number)) {
        return {
          passed: false,
          message: `${rule.name}: Value ${value} exceeds threshold ${rule.validation.value}`,
          fieldName: rule.fieldName,
        };
      }
      break;

    case 'max':
      if (value <= (rule.validation.value as number)) {
        return {
          passed: false,
          message: `${rule.name}: Value ${value} below minimum ${rule.validation.value}`,
          fieldName: rule.fieldName,
        };
      }
      break;

    case 'range': {
      const [min, max] = rule.validation.value as number[];
      if (value < min || value > max) {
        return {
          passed: false,
          message: `${rule.name}: Value ${value} outside range ${min}-${max}`,
          fieldName: rule.fieldName,
        };
      }
      break;
    }
  }

  return { passed: true, message: 'Validation passed' };
}

function evaluatePIIDetection(
  rule: ComplianceRule,
  text: string,
): { passed: boolean; message: string; location?: string } {
  if (!rule.pattern) {
    return { passed: true, message: 'No pattern specified' };
  }

  try {
    const regex = new RegExp(rule.pattern, rule.patternFlags || 'gi');
    const matches = text.match(regex);

    if (matches && matches.length > 0) {
      return {
        passed: false,
        message: `${rule.name}: PII detected (${matches.length} occurrence(s))`,
      };
    }

    return { passed: true, message: 'No PII detected' };
  } catch (_e) {
    return { passed: true, message: 'Invalid pattern' };
  }
}

function evaluateRiskIndicator(
  rule: ComplianceRule,
  _text: string,
  _extractedFields: Record<
    string,
    { value: string | number; confidence: number }
  >,
): { passed: boolean; message: string } {
  // Risk indicators are contextual and typically flagged for human review
  // This is a placeholder for more sophisticated risk analysis
  return {
    passed: false,
    message: `${rule.name}: Risk indicator flagged for review`,
  };
}

/**
 * Get applicable rule sets for a document
 */
export function getApplicableRuleSets(
  category: DocumentCategory,
  industryType?: IndustryType,
): ComplianceRuleSet[] {
  return BUILT_IN_RULESETS.filter((ruleSet) => {
    const categoryMatch = ruleSet.categories.includes(category);
    const industryMatch =
      !industryType || ruleSet.industries.includes(industryType);
    return categoryMatch || industryMatch;
  });
}

/**
 * Calculate risk score based on compliance results
 */
export function calculateRiskScore(result: ComplianceCheckResult): number {
  let score = 100;

  // Deduct points for each flag based on severity
  for (const flag of result.flags) {
    switch (flag.status) {
      case 'FAIL':
        score -= 15;
        break;
      case 'WARNING':
        score -= 5;
        break;
    }
  }

  // Add risk indicator penalty
  score -= result.riskIndicators.length * 5;

  return Math.max(0, Math.min(100, score));
}
