/**
 * Content Compliance Service
 *
 * Provides basic compliance checking for generated content including:
 * - Legal industry compliance (attorney advertising rules)
 * - Healthcare content compliance (HIPAA-aware language)
 * - Financial services compliance (disclosure requirements)
 * - General truth in advertising checks
 *
 * Note: This is a basic warning system. For production use,
 * consider integrating with specialized compliance APIs.
 */

import { prisma } from '../../../prisma/client';
import { env } from '../../../config/env';
import { ContentGenerationType } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export type IndustryType =
  | 'legal'
  | 'healthcare'
  | 'financial'
  | 'general'
  | 'real_estate'
  | 'insurance';

export type ViolationSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ComplianceViolation {
  severity: ViolationSeverity;
  rule: string;
  ruleCode: string;
  location: string; // The problematic text
  context: string; // Surrounding text for context
  recommendation: string;
}

export interface ComplianceWarning {
  type: string;
  message: string;
  suggestion: string;
}

export interface ComplianceCheckResult {
  isCompliant: boolean;
  score: number; // 0-100, where 100 is fully compliant
  industry: IndustryType;
  violations: ComplianceViolation[];
  warnings: ComplianceWarning[];
  suggestions: string[];
  checkedAt: Date;
}

export interface ComplianceCheckInput {
  industry: IndustryType;
  content: string;
  contentType?: ContentGenerationType;
  strictMode?: boolean; // If true, treat warnings as violations
}

// ============================================================================
// COMPLIANCE RULES
// ============================================================================

interface ComplianceRule {
  code: string;
  name: string;
  description: string;
  industry: IndustryType[];
  severity: ViolationSeverity;
  patterns: RegExp[];
  recommendation: string;
}

const COMPLIANCE_RULES: ComplianceRule[] = [
  // LEGAL INDUSTRY RULES
  {
    code: 'LEGAL-001',
    name: 'Outcome Guarantee',
    description: 'Legal content cannot guarantee specific case outcomes',
    industry: ['legal'],
    severity: 'critical',
    patterns: [
      /\bguarantee(?:d|s)?\s+(?:win|victory|success|outcome|result)/gi,
      /\bwill\s+(?:definitely|certainly|absolutely)\s+win/gi,
      /\b100%\s+(?:success|win)\s+rate/gi,
      /\bnever\s+lose/gi,
    ],
    recommendation:
      'Remove outcome guarantees. Use language like "we will work diligently" or "we strive for the best possible outcome".',
  },
  {
    code: 'LEGAL-002',
    name: 'Missing Disclaimer',
    description: 'Legal advertising should include appropriate disclaimers',
    industry: ['legal'],
    severity: 'medium',
    patterns: [
      /\bfree\s+consultation/gi,
      /\bno\s+(?:fee|cost)\s+(?:unless|until)/gi,
    ],
    recommendation:
      'Add disclaimer: "Results may vary. Free consultation does not guarantee representation."',
  },
  {
    code: 'LEGAL-003',
    name: 'Specialization Claims',
    description:
      'Cannot claim specialization without proper certification in most jurisdictions',
    industry: ['legal'],
    severity: 'high',
    patterns: [
      /\b(?:specialist|specialize[ds]?)\s+in/gi,
      /\bexpert\s+(?:in|at)\b/gi,
      /\bboard\s+certified\b/gi,
    ],
    recommendation:
      'Replace with "focus on" or "practice concentrates on" unless certified as specialist by state bar.',
  },

  // HEALTHCARE INDUSTRY RULES
  {
    code: 'HEALTH-001',
    name: 'Medical Diagnosis Claims',
    description: 'Content cannot make diagnostic claims without proper context',
    industry: ['healthcare'],
    severity: 'critical',
    patterns: [
      /\bwill\s+(?:cure|heal|treat)\b/gi,
      /\bguaranteed\s+(?:cure|treatment|healing)/gi,
      /\bdiagnose[sd]?\s+(?:your|the)\s+(?:condition|illness|disease)/gi,
    ],
    recommendation:
      'Add medical disclaimer: "Consult with a qualified healthcare provider for diagnosis and treatment."',
  },
  {
    code: 'HEALTH-002',
    name: 'HIPAA Awareness',
    description:
      'Content should not request or expose protected health information',
    industry: ['healthcare'],
    severity: 'high',
    patterns: [
      /\bsocial\s+security\s+number/gi,
      /\bmedical\s+record\s+number/gi,
      /\bhealth\s+insurance\s+(?:id|number|policy)/gi,
    ],
    recommendation:
      'Do not request PHI in public content. Use secure channels for health data collection.',
  },
  {
    code: 'HEALTH-003',
    name: 'Unsubstantiated Health Claims',
    description: 'Health claims must be substantiated',
    industry: ['healthcare'],
    severity: 'medium',
    patterns: [
      /\b(?:clinically|scientifically)\s+proven\b/gi,
      /\bFDA\s+approved\b/gi,
      /\b(?:miracle|breakthrough)\s+(?:cure|treatment)/gi,
    ],
    recommendation:
      'Ensure claims are backed by valid studies. Add "results may vary" disclaimer.',
  },

  // FINANCIAL SERVICES RULES
  {
    code: 'FIN-001',
    name: 'Guaranteed Returns',
    description: 'Financial content cannot guarantee investment returns',
    industry: ['financial'],
    severity: 'critical',
    patterns: [
      /\bguaranteed\s+(?:returns?|profits?|gains?|income)/gi,
      /\brisk[- ]free\s+(?:investment|returns)/gi,
      /\b(?:will|can)\s+(?:double|triple)\s+your\s+money/gi,
    ],
    recommendation:
      'Add disclosure: "Past performance does not guarantee future results. Investments carry risk."',
  },
  {
    code: 'FIN-002',
    name: 'Missing Risk Disclosure',
    description: 'Investment content should include risk disclosures',
    industry: ['financial'],
    severity: 'high',
    patterns: [
      /\bhigh\s+returns\b/gi,
      /\bearn\s+\d+%/gi,
      /\binvestment\s+opportunity\b/gi,
    ],
    recommendation:
      'Include risk disclosure: "Investment involves risk, including possible loss of principal."',
  },
  {
    code: 'FIN-003',
    name: 'Fiduciary Language',
    description: 'Non-fiduciaries should not imply fiduciary duty',
    industry: ['financial'],
    severity: 'medium',
    patterns: [
      /\bact(?:ing)?\s+in\s+your\s+best\s+interest/gi,
      /\bfiduciary\s+(?:duty|responsibility|standard)/gi,
    ],
    recommendation:
      'Only use fiduciary language if registered as a fiduciary. Otherwise, clarify relationship.',
  },

  // REAL ESTATE RULES
  {
    code: 'RE-001',
    name: 'Fair Housing Violations',
    description: 'Real estate content must comply with Fair Housing Act',
    industry: ['real_estate'],
    severity: 'critical',
    patterns: [
      /\b(?:no|not?)\s+(?:children|kids|families)/gi,
      /\b(?:adults?|seniors?)\s+only\b/gi,
      /\breligious\s+community\b/gi,
      /\b(?:christian|muslim|jewish|hindu)\s+(?:neighborhood|area|community)/gi,
    ],
    recommendation:
      'Remove discriminatory language. Focus on property features, not prospective occupant characteristics.',
  },

  // INSURANCE RULES
  {
    code: 'INS-001',
    name: 'Coverage Guarantees',
    description: 'Insurance content cannot guarantee coverage',
    industry: ['insurance'],
    severity: 'high',
    patterns: [
      /\bguaranteed\s+(?:coverage|approval|acceptance)/gi,
      /\beveryone\s+(?:qualifies|is\s+approved)/gi,
      /\bno\s+(?:medical\s+)?questions?\s+asked\b/gi,
    ],
    recommendation:
      'Add disclosure: "Coverage subject to underwriting approval. Terms and conditions apply."',
  },

  // GENERAL RULES (All Industries)
  {
    code: 'GEN-001',
    name: 'Deceptive Pricing',
    description: 'Pricing claims must be accurate and not misleading',
    industry: [
      'general',
      'legal',
      'healthcare',
      'financial',
      'real_estate',
      'insurance',
    ],
    severity: 'high',
    patterns: [
      /\b(?:free|no\s+cost)\b.*\b(?:hidden|additional)\s+fees?\b/gi,
      /\blowest\s+(?:price|cost)\s+(?:guaranteed|promise)/gi,
    ],
    recommendation:
      'Clearly disclose all fees and conditions. Avoid absolute pricing claims unless verifiable.',
  },
  {
    code: 'GEN-002',
    name: 'Testimonial Issues',
    description: 'Testimonials should include appropriate disclosures',
    industry: [
      'general',
      'legal',
      'healthcare',
      'financial',
      'real_estate',
      'insurance',
    ],
    severity: 'medium',
    patterns: [
      /\b(?:client|customer|patient)\s+(?:testimonial|review|story)\b/gi,
      /\b["'][^"']{50,}["']\s*[-–]\s*[A-Z][a-z]+/g, // Long quoted text with attribution
    ],
    recommendation:
      'Add disclosure: "Results may vary. Testimonials reflect individual experiences."',
  },
  {
    code: 'GEN-003',
    name: 'Urgency Manipulation',
    description: 'Avoid false urgency or scarcity claims',
    industry: [
      'general',
      'legal',
      'healthcare',
      'financial',
      'real_estate',
      'insurance',
    ],
    severity: 'low',
    patterns: [
      /\b(?:act|call|order)\s+now\s+(?:before|or)\b/gi,
      /\blimited\s+time\s+(?:only|offer)\b/gi,
      /\b(?:hurry|rush|urgent)\b/gi,
    ],
    recommendation:
      'If using urgency, ensure it is genuine. Consider softer calls-to-action.',
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function findPatternMatches(
  content: string,
  pattern: RegExp,
): Array<{ match: string; index: number }> {
  const matches: Array<{ match: string; index: number }> = [];
  let match;

  // Reset lastIndex for global patterns
  const regex = new RegExp(pattern.source, pattern.flags);

  while ((match = regex.exec(content)) !== null) {
    matches.push({
      match: match[0],
      index: match.index,
    });
  }

  return matches;
}

function getContext(
  content: string,
  index: number,
  matchLength: number,
): string {
  const contextLength = 50;
  const start = Math.max(0, index - contextLength);
  const end = Math.min(content.length, index + matchLength + contextLength);

  let context = content.slice(start, end);
  if (start > 0) context = '...' + context;
  if (end < content.length) context = context + '...';

  return context;
}

function calculateComplianceScore(violations: ComplianceViolation[]): number {
  if (violations.length === 0) return 100;

  // Deduct points based on severity
  const deductions: Record<ViolationSeverity, number> = {
    critical: 30,
    high: 20,
    medium: 10,
    low: 5,
  };

  let score = 100;
  for (const violation of violations) {
    score -= deductions[violation.severity];
  }

  return Math.max(0, score);
}

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Check content for compliance issues
 */
export function checkContentCompliance(
  input: ComplianceCheckInput,
): ComplianceCheckResult {
  const { industry, content, strictMode = false } = input;

  const violations: ComplianceViolation[] = [];
  const warnings: ComplianceWarning[] = [];
  const suggestions: string[] = [];

  // Get applicable rules for this industry
  const applicableRules = COMPLIANCE_RULES.filter(
    (rule) =>
      rule.industry.includes(industry) || rule.industry.includes('general'),
  );

  // Check each rule
  for (const rule of applicableRules) {
    for (const pattern of rule.patterns) {
      const matches = findPatternMatches(content, pattern);

      for (const match of matches) {
        const violation: ComplianceViolation = {
          severity: rule.severity,
          rule: rule.name,
          ruleCode: rule.code,
          location: match.match,
          context: getContext(content, match.index, match.match.length),
          recommendation: rule.recommendation,
        };

        // In strict mode, all issues are violations
        // Otherwise, low severity items are warnings
        if (strictMode || rule.severity !== 'low') {
          violations.push(violation);
        } else {
          warnings.push({
            type: rule.code,
            message: `${rule.name}: "${match.match}"`,
            suggestion: rule.recommendation,
          });
        }
      }
    }
  }

  // Add industry-specific suggestions
  if (industry === 'legal') {
    suggestions.push(
      'Consider adding "Attorney Advertising" disclaimer where required.',
    );
    suggestions.push(
      'Include state bar number if required by your jurisdiction.',
    );
  } else if (industry === 'healthcare') {
    suggestions.push(
      'Add "This is not medical advice" disclaimer for informational content.',
    );
    suggestions.push('Consider HIPAA privacy notice for intake forms.');
  } else if (industry === 'financial') {
    suggestions.push('Include SEC/FINRA disclosures where applicable.');
    suggestions.push('Add "Not FDIC insured" for investment products.');
  }

  const score = calculateComplianceScore(violations);

  return {
    isCompliant: violations.length === 0,
    score,
    industry,
    violations,
    warnings,
    suggestions,
    checkedAt: new Date(),
  };
}

/**
 * Check compliance for a stored content piece
 */
export async function checkStoredContentCompliance(
  configId: number,
  contentId: number,
  industry: IndustryType,
  strictMode?: boolean,
): Promise<ComplianceCheckResult | null> {
  const content = await prisma.generatedContent.findFirst({
    where: { id: contentId, configId },
  });

  if (!content) {
    return null;
  }

  return checkContentCompliance({
    industry,
    content: content.content,
    contentType: content.type,
    strictMode,
  });
}

/**
 * Get compliance summary for multiple contents
 */
export async function getComplianceSummary(
  configId: number,
  contentIds: number[],
  industry: IndustryType,
): Promise<{
  total: number;
  compliant: number;
  nonCompliant: number;
  averageScore: number;
  criticalViolations: number;
}> {
  let compliant = 0;
  let nonCompliant = 0;
  let totalScore = 0;
  let criticalViolations = 0;
  let checked = 0;

  for (const contentId of contentIds) {
    const result = await checkStoredContentCompliance(
      configId,
      contentId,
      industry,
    );
    if (result) {
      checked++;
      totalScore += result.score;
      if (result.isCompliant) {
        compliant++;
      } else {
        nonCompliant++;
      }
      criticalViolations += result.violations.filter(
        (v) => v.severity === 'critical',
      ).length;
    }
  }

  return {
    total: checked,
    compliant,
    nonCompliant,
    averageScore: checked > 0 ? Math.round(totalScore / checked) : 100,
    criticalViolations,
  };
}

/**
 * AI-enhanced compliance check (uses OpenAI for more nuanced analysis)
 */
export async function enhancedComplianceCheck(
  content: string,
  industry: IndustryType,
): Promise<ComplianceCheckResult> {
  // First, run rule-based check
  const ruleBasedResult = checkContentCompliance({ industry, content });

  const openAIKey = env.OPENAI_API_KEY;

  // If no API key, return rule-based results only
  if (!openAIKey) {
    return ruleBasedResult;
  }

  // Use AI for additional analysis
  const industryGuidelines: Record<IndustryType, string> = {
    legal:
      'Attorney advertising rules, bar restrictions, no outcome guarantees, proper disclaimers',
    healthcare:
      'HIPAA awareness, no diagnosis claims, medical disclaimers, no unsubstantiated health claims',
    financial:
      'No guaranteed returns, risk disclosures, fiduciary language restrictions, SEC/FINRA compliance',
    real_estate:
      'Fair Housing Act compliance, no discriminatory language, accurate property descriptions',
    insurance:
      'Coverage limitations disclosure, no guarantee of approval, proper licensing references',
    general:
      'Truth in advertising, no deceptive claims, proper testimonial disclosures',
  };

  const systemPrompt = `You are a compliance analyst reviewing marketing/business content for ${industry} industry regulations.

Key compliance areas for ${industry}:
${industryGuidelines[industry]}

Analyze the content and identify any additional compliance concerns not covered by these existing violations:
${ruleBasedResult.violations.map((v) => `- ${v.rule}: ${v.location}`).join('\n')}

Return a JSON object with:
{
  "additionalViolations": [
    {
      "severity": "critical|high|medium|low",
      "rule": "Rule name",
      "ruleCode": "AI-XXX",
      "location": "problematic text",
      "recommendation": "how to fix"
    }
  ],
  "additionalWarnings": [
    {
      "type": "warning type",
      "message": "warning message",
      "suggestion": "suggestion"
    }
  ],
  "overallAssessment": "Brief assessment of content compliance"
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Please analyze this ${industry} content for compliance:\n\n${content}`,
          },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error for compliance check');
      return ruleBasedResult;
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const aiAnalysis = JSON.parse(data.choices[0].message.content) as {
      additionalViolations?: Array<{
        severity: ViolationSeverity;
        rule: string;
        ruleCode: string;
        location: string;
        recommendation: string;
      }>;
      additionalWarnings?: Array<{
        type: string;
        message: string;
        suggestion: string;
      }>;
      overallAssessment?: string;
    };

    // Merge AI findings with rule-based results
    const allViolations = [
      ...ruleBasedResult.violations,
      ...(aiAnalysis.additionalViolations || []).map((v) => ({
        ...v,
        context: v.location,
      })),
    ];

    const allWarnings = [
      ...ruleBasedResult.warnings,
      ...(aiAnalysis.additionalWarnings || []),
    ];

    if (aiAnalysis.overallAssessment) {
      ruleBasedResult.suggestions.unshift(aiAnalysis.overallAssessment);
    }

    return {
      isCompliant: allViolations.length === 0,
      score: calculateComplianceScore(allViolations),
      industry,
      violations: allViolations,
      warnings: allWarnings,
      suggestions: ruleBasedResult.suggestions,
      checkedAt: new Date(),
    };
  } catch (_error) {
    console.error('Error in AI compliance analysis');
    return ruleBasedResult;
  }
}

/**
 * Get supported industries for compliance checking
 */
export function getSupportedIndustries(): Array<{
  code: IndustryType;
  name: string;
  ruleCount: number;
}> {
  const industries: IndustryType[] = [
    'legal',
    'healthcare',
    'financial',
    'real_estate',
    'insurance',
    'general',
  ];

  return industries.map((code) => ({
    code,
    name: code.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    ruleCount: COMPLIANCE_RULES.filter(
      (r) => r.industry.includes(code) || r.industry.includes('general'),
    ).length,
  }));
}

/**
 * Get all compliance rules for an industry
 */
export function getIndustryRules(industry: IndustryType): Array<{
  code: string;
  name: string;
  description: string;
  severity: ViolationSeverity;
}> {
  return COMPLIANCE_RULES.filter(
    (r) => r.industry.includes(industry) || r.industry.includes('general'),
  ).map((r) => ({
    code: r.code,
    name: r.name,
    description: r.description,
    severity: r.severity,
  }));
}
