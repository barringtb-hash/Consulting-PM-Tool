/**
 * Compliance Rule Engine Service
 *
 * P0 Priority - Critical for regulated industries
 *
 * Provides compliance checking for product descriptions across industries:
 * - Food: FDA regulations, allergen warnings
 * - Supplements: Structure/function claims, disease claims
 * - Cosmetics: Drug claims, ingredient safety
 * - Automotive: Safety claims, performance guarantees
 * - Medical: FDA compliance, clinical claims
 */

import { ComplianceMode, ComplianceStatus } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface ComplianceResult {
  status: ComplianceStatus;
  score: number;
  violations: ComplianceViolation[];
  warnings: ComplianceWarning[];
  requiredDisclaimers: string[];
  suggestions: string[];
}

export interface ComplianceViolation {
  severity: 'critical' | 'high' | 'medium';
  category: string;
  text: string;
  position: { start: number; end: number } | null;
  rule: string;
  recommendation: string;
}

export interface ComplianceWarning {
  category: string;
  text: string;
  position: { start: number; end: number } | null;
  rule: string;
  suggestion: string;
}

export interface ComplianceCheckInput {
  title: string;
  shortDescription: string;
  longDescription: string;
  bulletPoints: string[];
  category?: string;
  complianceMode: ComplianceMode;
}

// ============================================================================
// INDUSTRY-SPECIFIC RULE DEFINITIONS
// ============================================================================

interface ProhibitedClaim {
  pattern: RegExp;
  rule: string;
  severity: 'critical' | 'high' | 'medium';
  recommendation: string;
}

interface WarningPattern {
  pattern: RegExp;
  rule: string;
  suggestion: string;
}

const FOOD_PROHIBITED_CLAIMS: ProhibitedClaim[] = [
  {
    pattern:
      /\b(cure[sd]?|treat[sd]?|prevent[sd]?|heal[sd]?)\s+\w+\s*(disease|illness|condition|cancer|diabetes|heart\s+disease)/gi,
    rule: 'FDA Disease Claims Prohibition',
    severity: 'critical',
    recommendation:
      'Remove disease-related claims. Focus on general wellness or nutrient content.',
  },
  {
    pattern: /\bclinically\s+proven\b/gi,
    rule: 'FDA Clinical Claims',
    severity: 'high',
    recommendation:
      'Remove "clinically proven" unless backed by FDA-approved studies.',
  },
  {
    pattern: /\bFDA\s+approved\b/gi,
    rule: 'FDA Approval Claims',
    severity: 'critical',
    recommendation:
      'Remove FDA approval claims for food products (FDA does not approve foods).',
  },
  {
    pattern: /\b(weight\s+loss|lose\s+weight|fat\s+burn(er|ing)?|slimming)\b/gi,
    rule: 'FDA Weight Loss Claims',
    severity: 'high',
    recommendation:
      'Weight loss claims require FTC substantiation. Rephrase or remove.',
  },
  {
    pattern: /\bguaranteed\s+(results|to\s+work)\b/gi,
    rule: 'FTC Guarantee Claims',
    severity: 'high',
    recommendation:
      'Remove absolute guarantees. Use softer language like "may help" or "supports".',
  },
];

const FOOD_WARNINGS: WarningPattern[] = [
  {
    pattern: /\b(healthy|nutritious|wholesome)\b/gi,
    rule: 'FDA Health Claims',
    suggestion:
      'Ensure "healthy" claims meet FDA criteria for nutrient content.',
  },
  {
    pattern: /\b(natural|organic|non-gmo)\b/gi,
    rule: 'USDA Organic/Natural Claims',
    suggestion:
      'Verify organic/natural claims meet USDA certification requirements.',
  },
  {
    pattern: /\b(allergen[- ]free|gluten[- ]free|dairy[- ]free)\b/gi,
    rule: 'FDA Allergen Claims',
    suggestion:
      'Include allergen warning if product is made in a facility that processes allergens.',
  },
];

const SUPPLEMENT_PROHIBITED_CLAIMS: ProhibitedClaim[] = [
  {
    pattern:
      /\b(cure[sd]?|treat[sd]?|diagnose[sd]?|prevent[sd]?)\s+\w+\s*(disease|illness|condition|cancer|diabetes|alzheimer|parkinson)/gi,
    rule: 'DSHEA Disease Claims Prohibition',
    severity: 'critical',
    recommendation:
      'Supplements cannot claim to cure, treat, diagnose, or prevent disease. Use structure/function claims instead.',
  },
  {
    pattern: /\bFDA\s+approved\b/gi,
    rule: 'FDA Approval Claims',
    severity: 'critical',
    recommendation:
      'Dietary supplements are not FDA approved. Remove this claim.',
  },
  {
    pattern: /\breplaces?\s+(medication|drug|prescription)/gi,
    rule: 'Drug Replacement Claims',
    severity: 'critical',
    recommendation:
      'Remove any suggestion that supplement replaces medication.',
  },
  {
    pattern:
      /\b(clinically\s+proven|scientifically\s+proven|doctor\s+recommended)\b/gi,
    rule: 'FTC Substantiation',
    severity: 'high',
    recommendation:
      'Remove or substantiate with legitimate studies. FTC requires competent and reliable scientific evidence.',
  },
  {
    pattern: /\bmiracl(e|ous)\b/gi,
    rule: 'FTC Miracle Claims',
    severity: 'high',
    recommendation:
      'Remove miraculous or extraordinary claims. They are considered red flags by regulators.',
  },
];

const SUPPLEMENT_WARNINGS: WarningPattern[] = [
  {
    pattern:
      /\b(boost[sd]?|enhance[sd]?|support[sd]?|maintain[sd]?)\s+(immune|immunity|energy|mood|sleep)/gi,
    rule: 'DSHEA Structure/Function Claims',
    suggestion:
      'Structure/function claims are allowed but must have substantiation. Consider adding disclaimer.',
  },
  {
    pattern: /\b(antioxidant|probiotic|vitamin|mineral)\b/gi,
    rule: 'Nutrient Content Claims',
    suggestion:
      'Ensure nutrient claims are accurate and product meets RDI thresholds.',
  },
];

const COSMETICS_PROHIBITED_CLAIMS: ProhibitedClaim[] = [
  {
    pattern:
      /\b(cure[sd]?|treat[sd]?|heal[sd]?|repair[sd]?)\s+(acne|eczema|psoriasis|rosacea|dermatitis)/gi,
    rule: 'FDA Drug Claims',
    severity: 'critical',
    recommendation:
      'Treating skin conditions makes it a drug, not a cosmetic. Rephrase to cosmetic benefits only.',
  },
  {
    pattern: /\b(anti-aging|age-reversing|eliminates?\s+wrinkles)\b/gi,
    rule: 'FDA Drug/Cosmetic Line',
    severity: 'high',
    recommendation:
      'Strong anti-aging claims may cross into drug territory. Use "appearance of" language.',
  },
  {
    pattern: /\b(permanent|forever|lasting\s+results)\b/gi,
    rule: 'FDA Permanent Results Claims',
    severity: 'high',
    recommendation:
      'Cosmetics cannot claim permanent changes to skin structure.',
  },
  {
    pattern: /\bFDA\s+approved\b/gi,
    rule: 'FDA Approval Claims',
    severity: 'critical',
    recommendation:
      'Cosmetics are not FDA approved (only color additives are).',
  },
  {
    pattern: /\b(stem\s+cell|DNA|genetic)\s+(repair|rejuven|regenerat)/gi,
    rule: 'Biological Claims',
    severity: 'critical',
    recommendation: 'Remove claims about cellular/genetic modification.',
  },
];

const COSMETICS_WARNINGS: WarningPattern[] = [
  {
    pattern:
      /\b(hypoallergenic|dermatologist\s+tested|clinically\s+tested)\b/gi,
    rule: 'FTC Testing Claims',
    suggestion:
      'Ensure testing claims are substantiated with actual test data.',
  },
  {
    pattern: /\b(natural|organic|vegan|cruelty[- ]free)\b/gi,
    rule: 'Marketing Claims',
    suggestion:
      'Verify natural/organic claims meet industry standards or certifications.',
  },
];

const AUTOMOTIVE_PROHIBITED_CLAIMS: ProhibitedClaim[] = [
  {
    pattern:
      /\b(100%|completely|totally)\s+(safe|crash[- ]proof|accident[- ]proof)/gi,
    rule: 'NHTSA Safety Claims',
    severity: 'critical',
    recommendation:
      'Absolute safety claims are prohibited. Use comparative or qualified language.',
  },
  {
    pattern:
      /\bguarantee[sd]?\s+(performance|speed|power|mpg|fuel\s+economy)/gi,
    rule: 'FTC Performance Guarantees',
    severity: 'high',
    recommendation:
      'Performance guarantees require substantiation. Add conditions or remove.',
  },
  {
    pattern: /\b(EPA|DOT|NHTSA)\s+certified\b/gi,
    rule: 'Government Certification Claims',
    severity: 'high',
    recommendation:
      'Verify government certifications are accurate and current.',
  },
  {
    pattern: /\b(never|won't|cannot)\s+(break|fail|wear\s+out)/gi,
    rule: 'Durability Claims',
    severity: 'high',
    recommendation:
      'Remove absolute durability claims. Use warranty terms instead.',
  },
];

const AUTOMOTIVE_WARNINGS: WarningPattern[] = [
  {
    pattern:
      /\b(improves?|increases?|boosts?)\s+(horsepower|hp|torque|mpg|fuel\s+economy)/gi,
    rule: 'FTC Performance Claims',
    suggestion: 'Quantify performance improvements with testing data.',
  },
  {
    pattern: /\b(OEM|original\s+equipment|factory)\s+(quality|spec|standard)/gi,
    rule: 'OEM Comparison Claims',
    suggestion: 'Ensure OEM comparisons are accurate and not misleading.',
  },
];

const MEDICAL_PROHIBITED_CLAIMS: ProhibitedClaim[] = [
  {
    pattern: /\b(cure[sd]?|treat[sd]?|diagnose[sd]?|prevent[sd]?)\b/gi,
    rule: 'FDA Medical Device Claims',
    severity: 'critical',
    recommendation:
      'Medical claims require FDA clearance/approval. Verify device classification and clearance status.',
  },
  {
    pattern: /\b(clinically\s+proven|scientifically\s+proven)\b/gi,
    rule: 'FDA Clinical Evidence',
    severity: 'high',
    recommendation:
      'Clinical claims must be supported by evidence in FDA clearance/approval.',
  },
  {
    pattern: /\b(no\s+side\s+effects|completely\s+safe|risk[- ]free)\b/gi,
    rule: 'FDA Safety Claims',
    severity: 'critical',
    recommendation:
      'All medical devices have some risk. Include appropriate warnings.',
  },
  {
    pattern: /\b(doctor|physician|surgeon)\s+recommended\b/gi,
    rule: 'Endorsement Claims',
    severity: 'high',
    recommendation:
      'Physician endorsements require disclosure and substantiation.',
  },
];

const MEDICAL_WARNINGS: WarningPattern[] = [
  {
    pattern: /\b(Class\s+[I1]{1,3}|510\(k\)|PMA)\b/gi,
    rule: 'FDA Classification',
    suggestion: 'Verify device classification claims match FDA registration.',
  },
  {
    pattern: /\b(intended\s+use|indication[sd]?)\b/gi,
    rule: 'Intended Use Claims',
    suggestion: 'Ensure intended use matches FDA cleared indications.',
  },
];

// ============================================================================
// REQUIRED DISCLAIMERS
// ============================================================================

const REQUIRED_DISCLAIMERS: Record<string, string[]> = {
  SUPPLEMENTS: [
    '*These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.',
  ],
  FOOD: [
    'Allergen information: [list applicable allergens]',
    'Consult a healthcare professional before use if you have any medical conditions.',
  ],
  COSMETICS: [
    'Perform a patch test before first use.',
    'Discontinue use if irritation occurs.',
  ],
  AUTOMOTIVE: [
    'Professional installation recommended.',
    'Check local regulations before modification.',
  ],
  MEDICAL: [
    'Consult a healthcare professional before use.',
    'Read all instructions and warnings before use.',
  ],
};

// ============================================================================
// COMPLIANCE CHECK FUNCTIONS
// ============================================================================

/**
 * Check content for compliance violations and warnings
 */
export function checkCompliance(input: ComplianceCheckInput): ComplianceResult {
  const violations: ComplianceViolation[] = [];
  const warnings: ComplianceWarning[] = [];
  const suggestions: string[] = [];
  let requiredDisclaimers: string[] = [];

  // Skip compliance check if mode is NONE
  if (input.complianceMode === 'NONE') {
    return {
      status: 'APPROVED',
      score: 100,
      violations: [],
      warnings: [],
      requiredDisclaimers: [],
      suggestions: [],
    };
  }

  // Combine all text for checking
  const allText = [
    input.title,
    input.shortDescription,
    input.longDescription,
    ...input.bulletPoints,
  ].join(' ');

  // Get industry-specific rules
  const { prohibitedClaims, warningPatterns, disclaimers } = getIndustryRules(
    input.complianceMode,
  );

  requiredDisclaimers = disclaimers;

  // Check for prohibited claims
  for (const claim of prohibitedClaims) {
    const matches = findMatches(allText, claim.pattern);
    for (const match of matches) {
      violations.push({
        severity: claim.severity,
        category: input.complianceMode,
        text: match.text,
        position: match.position,
        rule: claim.rule,
        recommendation: claim.recommendation,
      });
    }
  }

  // Check for warning patterns
  for (const warning of warningPatterns) {
    const matches = findMatches(allText, warning.pattern);
    for (const match of matches) {
      warnings.push({
        category: input.complianceMode,
        text: match.text,
        position: match.position,
        rule: warning.rule,
        suggestion: warning.suggestion,
      });
    }
  }

  // Check for required disclaimers
  const hasDisclaimers = checkForDisclaimers(allText, input.complianceMode);
  if (!hasDisclaimers && requiredDisclaimers.length > 0) {
    suggestions.push(
      `Consider adding required disclaimer for ${input.complianceMode} products`,
    );
  }

  // Calculate compliance score
  const score = calculateComplianceScore(violations, warnings);

  // Determine compliance status
  const status = determineStatus(violations, warnings);

  return {
    status,
    score,
    violations,
    warnings,
    requiredDisclaimers,
    suggestions,
  };
}

/**
 * Get industry-specific rules
 */
function getIndustryRules(mode: ComplianceMode): {
  prohibitedClaims: ProhibitedClaim[];
  warningPatterns: WarningPattern[];
  disclaimers: string[];
} {
  switch (mode) {
    case 'FOOD':
      return {
        prohibitedClaims: FOOD_PROHIBITED_CLAIMS,
        warningPatterns: FOOD_WARNINGS,
        disclaimers: REQUIRED_DISCLAIMERS.FOOD,
      };
    case 'SUPPLEMENTS':
      return {
        prohibitedClaims: SUPPLEMENT_PROHIBITED_CLAIMS,
        warningPatterns: SUPPLEMENT_WARNINGS,
        disclaimers: REQUIRED_DISCLAIMERS.SUPPLEMENTS,
      };
    case 'COSMETICS':
      return {
        prohibitedClaims: COSMETICS_PROHIBITED_CLAIMS,
        warningPatterns: COSMETICS_WARNINGS,
        disclaimers: REQUIRED_DISCLAIMERS.COSMETICS,
      };
    case 'AUTOMOTIVE':
      return {
        prohibitedClaims: AUTOMOTIVE_PROHIBITED_CLAIMS,
        warningPatterns: AUTOMOTIVE_WARNINGS,
        disclaimers: REQUIRED_DISCLAIMERS.AUTOMOTIVE,
      };
    case 'MEDICAL':
      return {
        prohibitedClaims: MEDICAL_PROHIBITED_CLAIMS,
        warningPatterns: MEDICAL_WARNINGS,
        disclaimers: REQUIRED_DISCLAIMERS.MEDICAL,
      };
    default:
      return {
        prohibitedClaims: [],
        warningPatterns: [],
        disclaimers: [],
      };
  }
}

/**
 * Find all matches of a pattern in text
 */
function findMatches(
  text: string,
  pattern: RegExp,
): Array<{ text: string; position: { start: number; end: number } }> {
  const matches: Array<{
    text: string;
    position: { start: number; end: number };
  }> = [];
  let match;

  // Reset regex state
  pattern.lastIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    matches.push({
      text: match[0],
      position: {
        start: match.index,
        end: match.index + match[0].length,
      },
    });

    // Prevent infinite loop for zero-length matches
    if (match.index === pattern.lastIndex) {
      pattern.lastIndex++;
    }
  }

  return matches;
}

/**
 * Check if text contains required disclaimers
 */
function checkForDisclaimers(text: string, mode: ComplianceMode): boolean {
  const disclaimerPatterns: Record<string, RegExp[]> = {
    SUPPLEMENTS: [
      /statements?\s+(have\s+)?not\s+been\s+evaluated\s+by\s+(the\s+)?f(ood\s+and\s+)?d(rug\s+)?a(dministration)?/i,
      /not\s+intended\s+to\s+diagnose,?\s*treat,?\s*cure/i,
    ],
    FOOD: [
      /allergen/i,
      /contains?:?\s*(milk|eggs?|fish|shellfish|tree\s+nuts?|peanuts?|wheat|soy)/i,
    ],
    COSMETICS: [/patch\s+test/i, /discontinue\s+if\s+irritation/i],
    AUTOMOTIVE: [
      /professional\s+installation/i,
      /check\s+local\s+regulations?/i,
    ],
    MEDICAL: [
      /consult\s+(a\s+)?(healthcare|medical)\s+professional/i,
      /read\s+(all\s+)?instructions/i,
    ],
  };

  const patterns = disclaimerPatterns[mode] || [];
  return patterns.some((pattern) => pattern.test(text));
}

/**
 * Calculate compliance score based on violations and warnings
 */
function calculateComplianceScore(
  violations: ComplianceViolation[],
  warnings: ComplianceWarning[],
): number {
  let score = 100;

  // Deduct points for violations
  for (const violation of violations) {
    switch (violation.severity) {
      case 'critical':
        score -= 30;
        break;
      case 'high':
        score -= 20;
        break;
      case 'medium':
        score -= 10;
        break;
    }
  }

  // Deduct points for warnings (less severe)
  score -= warnings.length * 3;

  return Math.max(0, score);
}

/**
 * Determine compliance status based on violations
 */
function determineStatus(
  violations: ComplianceViolation[],
  warnings: ComplianceWarning[],
): ComplianceStatus {
  const criticalCount = violations.filter(
    (v) => v.severity === 'critical',
  ).length;
  const highCount = violations.filter((v) => v.severity === 'high').length;

  if (criticalCount > 0) {
    return 'FLAGGED';
  }

  if (highCount > 0 || violations.length >= 3) {
    return 'REQUIRES_REVIEW';
  }

  if (warnings.length > 0 || violations.length > 0) {
    return 'PENDING';
  }

  return 'APPROVED';
}

// ============================================================================
// CLAIM DETECTION HELPERS
// ============================================================================

/**
 * Detect specific claim types in text
 */
export function detectClaimTypes(text: string): {
  healthClaims: string[];
  performanceClaims: string[];
  safetyClaims: string[];
  comparativeClaims: string[];
} {
  const healthClaims: string[] = [];
  const performanceClaims: string[] = [];
  const safetyClaims: string[] = [];
  const comparativeClaims: string[] = [];

  // Health claim patterns
  const healthPatterns = [
    /\b(boost[sd]?|enhance[sd]?|improve[sd]?|support[sd]?)\s+(immune|health|wellness|energy|mood)/gi,
    /\b(cure[sd]?|treat[sd]?|heal[sd]?|prevent[sd]?)\b/gi,
    /\b(anti-aging|weight\s+loss|fat\s+burn)/gi,
  ];

  // Performance claim patterns
  const performancePatterns = [
    /\b(increase[sd]?|boost[sd]?|improve[sd]?)\s+(performance|speed|power|efficiency)/gi,
    /\b(\d+%?\s+)(faster|better|stronger|more\s+effective)/gi,
    /\b(clinically|scientifically)\s+(proven|tested|verified)/gi,
  ];

  // Safety claim patterns
  const safetyPatterns = [
    /\b(100%|completely|totally)\s+safe\b/gi,
    /\bno\s+side\s+effects\b/gi,
    /\brisk[- ]free\b/gi,
    /\bguaranteed\s+safe\b/gi,
  ];

  // Comparative claim patterns
  const comparativePatterns = [
    /\b(better|best|superior|leading|#1|number\s+one)\b/gi,
    /\bcompared\s+to\b/gi,
    /\bunlike\s+(other|competitor)/gi,
  ];

  for (const pattern of healthPatterns) {
    const matches = text.match(pattern) || [];
    healthClaims.push(...matches);
  }

  for (const pattern of performancePatterns) {
    const matches = text.match(pattern) || [];
    performanceClaims.push(...matches);
  }

  for (const pattern of safetyPatterns) {
    const matches = text.match(pattern) || [];
    safetyClaims.push(...matches);
  }

  for (const pattern of comparativePatterns) {
    const matches = text.match(pattern) || [];
    comparativeClaims.push(...matches);
  }

  return {
    healthClaims: [...new Set(healthClaims)],
    performanceClaims: [...new Set(performanceClaims)],
    safetyClaims: [...new Set(safetyClaims)],
    comparativeClaims: [...new Set(comparativeClaims)],
  };
}

/**
 * Get compliance mode label for display
 */
export function getComplianceModeLabel(mode: ComplianceMode): string {
  const labels: Record<ComplianceMode, string> = {
    NONE: 'None',
    FOOD: 'Food & Beverage',
    SUPPLEMENTS: 'Dietary Supplements',
    COSMETICS: 'Cosmetics & Skincare',
    AUTOMOTIVE: 'Automotive',
    MEDICAL: 'Medical Devices',
  };

  return labels[mode] || mode;
}

/**
 * Get severity color for UI display
 */
export function getSeverityColor(
  severity: 'critical' | 'high' | 'medium',
): 'red' | 'orange' | 'yellow' {
  switch (severity) {
    case 'critical':
      return 'red';
    case 'high':
      return 'orange';
    case 'medium':
      return 'yellow';
    default:
      return 'yellow';
  }
}

/**
 * Get status color for UI display
 */
export function getStatusColor(
  status: ComplianceStatus,
): 'green' | 'yellow' | 'orange' | 'red' {
  switch (status) {
    case 'APPROVED':
      return 'green';
    case 'PENDING':
      return 'yellow';
    case 'REQUIRES_REVIEW':
      return 'orange';
    case 'FLAGGED':
      return 'red';
    default:
      return 'yellow';
  }
}
