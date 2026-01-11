/**
 * Matter Pre-Screening Service
 *
 * Performs pre-screening of potential clients based on case type,
 * practice area fit, statute of limitations, and jurisdiction.
 */

import { prisma } from '../../../prisma/client';
import { env } from '../../../config/env';

// ============================================================================
// TYPES
// ============================================================================

export type ScreeningStatus =
  | 'qualified'
  | 'needs_review'
  | 'declined'
  | 'referred';

export interface ScreeningResult {
  status: ScreeningStatus;
  overallScore: number;
  practiceAreaCheck: PracticeAreaCheckResult;
  caseTypeCheck: CaseTypeCheckResult;
  statuteOfLimitationsCheck: StatuteCheckResult;
  jurisdictionCheck: JurisdictionCheckResult;
  recommendations: string[];
  referralSuggestions?: ReferralSuggestion[];
}

export interface PracticeAreaCheckResult {
  matched: boolean;
  practiceArea?: string;
  confidence: number;
  notes?: string;
}

export interface CaseTypeCheckResult {
  matched: boolean;
  caseType?: string;
  isAccepted: boolean;
  notes?: string;
}

export interface StatuteCheckResult {
  applicable: boolean;
  deadlineDate?: Date;
  daysRemaining?: number;
  isUrgent: boolean;
  isBeyondDeadline: boolean;
  notes?: string;
}

export interface JurisdictionCheckResult {
  applicable: boolean;
  jurisdiction?: string;
  isLicensed: boolean;
  notes?: string;
}

export interface ReferralSuggestion {
  firmName?: string;
  practiceArea: string;
  reason: string;
}

export interface ScreeningConfiguration {
  practiceAreas: PracticeAreaConfig[];
  caseTypes: CaseTypeConfig[];
  jurisdictions: string[];
  statuteOfLimitations: StatuteLimitsConfig;
  autoDeclineReasons: string[];
  referralPartners?: ReferralPartner[];
}

export interface PracticeAreaConfig {
  name: string;
  aliases: string[];
  acceptNew: boolean;
  minimumValue?: number;
  requiredFields?: string[];
}

export interface CaseTypeConfig {
  name: string;
  practiceArea: string;
  accepted: boolean;
  declineReason?: string;
}

export interface StatuteLimitsConfig {
  defaultYears: number;
  byState: Record<string, Record<string, number>>;
  urgentThresholdDays: number;
}

export interface ReferralPartner {
  name: string;
  practiceAreas: string[];
  jurisdictions: string[];
  contactEmail?: string;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: ScreeningConfiguration = {
  practiceAreas: [
    {
      name: 'personal_injury',
      aliases: [
        'PI',
        'injury',
        'accident',
        'slip and fall',
        'car accident',
        'malpractice',
      ],
      acceptNew: true,
    },
    {
      name: 'family_law',
      aliases: ['divorce', 'custody', 'child support', 'family', 'matrimonial'],
      acceptNew: true,
    },
    {
      name: 'criminal_defense',
      aliases: ['criminal', 'DUI', 'DWI', 'felony', 'misdemeanor'],
      acceptNew: true,
    },
    {
      name: 'estate_planning',
      aliases: ['estate', 'wills', 'trusts', 'probate', 'succession'],
      acceptNew: true,
    },
    {
      name: 'business_law',
      aliases: ['business', 'corporate', 'contracts', 'LLC', 'formation'],
      acceptNew: true,
    },
    {
      name: 'real_estate',
      aliases: ['real estate', 'property', 'closing', 'title'],
      acceptNew: true,
    },
    {
      name: 'employment_law',
      aliases: [
        'employment',
        'wrongful termination',
        'discrimination',
        'harassment',
      ],
      acceptNew: true,
    },
    {
      name: 'bankruptcy',
      aliases: ['bankruptcy', 'chapter 7', 'chapter 13', 'debt'],
      acceptNew: true,
    },
    {
      name: 'immigration',
      aliases: ['immigration', 'visa', 'green card', 'citizenship', 'asylum'],
      acceptNew: false,
    },
  ],
  caseTypes: [
    { name: 'auto_accident', practiceArea: 'personal_injury', accepted: true },
    {
      name: 'medical_malpractice',
      practiceArea: 'personal_injury',
      accepted: true,
    },
    { name: 'slip_and_fall', practiceArea: 'personal_injury', accepted: true },
    {
      name: 'product_liability',
      practiceArea: 'personal_injury',
      accepted: false,
      declineReason: 'Case type not currently accepted',
    },
    { name: 'divorce', practiceArea: 'family_law', accepted: true },
    { name: 'child_custody', practiceArea: 'family_law', accepted: true },
    {
      name: 'adoption',
      practiceArea: 'family_law',
      accepted: false,
      declineReason: 'No adoption attorneys available',
    },
  ],
  jurisdictions: ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'],
  statuteOfLimitations: {
    defaultYears: 2,
    byState: {
      CA: { personal_injury: 2, medical_malpractice: 3, wrongful_death: 2 },
      NY: { personal_injury: 3, medical_malpractice: 2.5, wrongful_death: 2 },
      TX: { personal_injury: 2, medical_malpractice: 2, wrongful_death: 2 },
      FL: { personal_injury: 4, medical_malpractice: 2, wrongful_death: 2 },
    },
    urgentThresholdDays: 60,
  },
  autoDeclineReasons: [
    'Case type not handled',
    'Statute of limitations expired',
    'Outside licensed jurisdictions',
    'Conflict of interest',
  ],
  referralPartners: [
    {
      name: 'Immigration Law Partners',
      practiceAreas: ['immigration'],
      jurisdictions: ['CA', 'NY', 'TX'],
    },
    {
      name: 'Product Liability Specialists',
      practiceAreas: ['personal_injury'],
      jurisdictions: ['CA', 'NY'],
    },
  ],
};

// ============================================================================
// MAIN SCREENING FUNCTIONS
// ============================================================================

/**
 * Perform comprehensive pre-screening on an intake submission
 */
export async function screenSubmission(
  submissionId: number,
  customConfig?: Partial<ScreeningConfiguration>,
): Promise<ScreeningResult> {
  const config = { ...DEFAULT_CONFIG, ...customConfig };

  // Get submission data
  const submission = await prisma.intakeSubmission.findUnique({
    where: { id: submissionId },
    include: {
      form: true,
      config: {
        include: {
          client: true,
        },
      },
    },
  });

  if (!submission) {
    throw new Error('Submission not found');
  }

  const formData = (submission.formData as Record<string, unknown>) || {};

  // Run all screening checks
  const practiceAreaCheck = await checkPracticeArea(formData, config);
  const caseTypeCheck = checkCaseType(
    formData,
    practiceAreaCheck.practiceArea,
    config,
  );
  const statuteCheck = checkStatuteOfLimitations(
    formData,
    practiceAreaCheck.practiceArea,
    config,
  );
  const jurisdictionCheck = checkJurisdiction(formData, config);

  // Calculate overall score and determine status
  const { status, overallScore, recommendations, referralSuggestions } =
    determineStatus(
      practiceAreaCheck,
      caseTypeCheck,
      statuteCheck,
      jurisdictionCheck,
      config,
    );

  const result: ScreeningResult = {
    status,
    overallScore,
    practiceAreaCheck,
    caseTypeCheck,
    statuteOfLimitationsCheck: statuteCheck,
    jurisdictionCheck,
    recommendations,
    referralSuggestions,
  };

  // Save screening result to submission
  await saveScreeningResult(submissionId, result);

  return result;
}

/**
 * Quick screening without saving
 */
export async function quickScreen(
  formData: Record<string, unknown>,
  config?: Partial<ScreeningConfiguration>,
): Promise<ScreeningResult> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  const practiceAreaCheck = await checkPracticeArea(formData, fullConfig);
  const caseTypeCheck = checkCaseType(
    formData,
    practiceAreaCheck.practiceArea,
    fullConfig,
  );
  const statuteCheck = checkStatuteOfLimitations(
    formData,
    practiceAreaCheck.practiceArea,
    fullConfig,
  );
  const jurisdictionCheck = checkJurisdiction(formData, fullConfig);

  const { status, overallScore, recommendations, referralSuggestions } =
    determineStatus(
      practiceAreaCheck,
      caseTypeCheck,
      statuteCheck,
      jurisdictionCheck,
      fullConfig,
    );

  return {
    status,
    overallScore,
    practiceAreaCheck,
    caseTypeCheck,
    statuteOfLimitationsCheck: statuteCheck,
    jurisdictionCheck,
    recommendations,
    referralSuggestions,
  };
}

// ============================================================================
// SCREENING CHECK FUNCTIONS
// ============================================================================

/**
 * Check if the matter matches a practice area
 */
async function checkPracticeArea(
  formData: Record<string, unknown>,
  config: ScreeningConfiguration,
): Promise<PracticeAreaCheckResult> {
  // Extract relevant fields
  const description = extractText(formData, [
    'matter_description',
    'case_description',
    'description',
    'issue_type',
    'legal_issue',
    'case_type',
    'service_needed',
  ]);

  const specifiedArea = extractText(formData, [
    'practice_area',
    'area_of_law',
    'legal_area',
    'service_type',
  ]);

  // First check if practice area is explicitly specified
  if (specifiedArea) {
    const normalized = specifiedArea.toLowerCase();
    for (const area of config.practiceAreas) {
      if (
        area.name === normalized ||
        area.aliases.some((a: string) => normalized.includes(a.toLowerCase()))
      ) {
        return {
          matched: true,
          practiceArea: area.name,
          confidence: 0.95,
          notes: `Explicitly specified practice area: ${area.name}`,
        };
      }
    }
  }

  // Use AI or rule-based detection
  if (description) {
    // Rule-based matching first
    const ruleBasedMatch = matchPracticeAreaByRules(description, config);
    if (ruleBasedMatch.confidence >= 0.7) {
      return ruleBasedMatch;
    }

    // Try AI detection if available
    if (env.openaiApiKey) {
      try {
        const aiMatch = await detectPracticeAreaWithAI(description, config);
        if (aiMatch.confidence > ruleBasedMatch.confidence) {
          return aiMatch;
        }
      } catch {
        // Fall back to rule-based
      }
    }

    return ruleBasedMatch;
  }

  return {
    matched: false,
    confidence: 0,
    notes: 'Unable to determine practice area from submission',
  };
}

/**
 * Rule-based practice area matching
 */
function matchPracticeAreaByRules(
  description: string,
  config: ScreeningConfiguration,
): PracticeAreaCheckResult {
  const lowered = description.toLowerCase();
  let bestMatch: { area: string; score: number } | null = null;

  for (const area of config.practiceAreas) {
    let score = 0;
    const matches: string[] = [];

    for (const alias of area.aliases) {
      if (lowered.includes(alias.toLowerCase())) {
        score += 1;
        matches.push(alias);
      }
    }

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { area: area.name, score };
    }
  }

  if (bestMatch) {
    const confidence = Math.min(0.9, 0.5 + bestMatch.score * 0.15);
    return {
      matched: true,
      practiceArea: bestMatch.area,
      confidence,
      notes: `Matched based on keywords`,
    };
  }

  return {
    matched: false,
    confidence: 0.3,
    notes: 'No practice area keywords detected',
  };
}

/**
 * AI-powered practice area detection
 */
async function detectPracticeAreaWithAI(
  description: string,
  config: ScreeningConfiguration,
): Promise<PracticeAreaCheckResult> {
  const practiceAreaList = config.practiceAreas.map((a) => a.name).join(', ');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 150,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a legal intake specialist. Classify the legal matter into one of these practice areas: ${practiceAreaList}, or "unknown" if unclear.
Return JSON: { "practiceArea": string, "confidence": number (0-1), "reason": string }`,
        },
        {
          role: 'user',
          content: description.substring(0, 500),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const parsed = JSON.parse(data.choices[0].message.content);

  const matchedArea = config.practiceAreas.find(
    (a) => a.name === parsed.practiceArea,
  );

  return {
    matched: !!matchedArea,
    practiceArea: matchedArea?.name,
    confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
    notes: parsed.reason,
  };
}

/**
 * Check if the case type is accepted
 */
function checkCaseType(
  formData: Record<string, unknown>,
  practiceArea: string | undefined,
  config: ScreeningConfiguration,
): CaseTypeCheckResult {
  const specifiedType = extractText(formData, [
    'case_type',
    'matter_type',
    'claim_type',
    'incident_type',
  ]);

  if (!specifiedType && !practiceArea) {
    return {
      matched: false,
      isAccepted: false,
      notes: 'Unable to determine case type',
    };
  }

  // Check if case type is explicitly configured
  if (specifiedType) {
    const normalized = specifiedType.toLowerCase().replace(/[^a-z]/g, '_');
    const caseTypeConfig = config.caseTypes.find(
      (ct) =>
        ct.name === normalized ||
        ct.name.includes(normalized) ||
        normalized.includes(ct.name),
    );

    if (caseTypeConfig) {
      return {
        matched: true,
        caseType: caseTypeConfig.name,
        isAccepted: caseTypeConfig.accepted,
        notes: caseTypeConfig.accepted
          ? 'Case type accepted'
          : caseTypeConfig.declineReason,
      };
    }
  }

  // If practice area is known and accepting new cases, assume accepted
  if (practiceArea) {
    const practiceAreaConfig = config.practiceAreas.find(
      (pa) => pa.name === practiceArea,
    );
    if (practiceAreaConfig?.acceptNew) {
      return {
        matched: true,
        caseType: practiceArea,
        isAccepted: true,
        notes: `Practice area ${practiceArea} accepting new cases`,
      };
    }
  }

  return {
    matched: false,
    isAccepted: false,
    notes: 'Case type not in accepted list',
  };
}

/**
 * Check statute of limitations
 */
function checkStatuteOfLimitations(
  formData: Record<string, unknown>,
  practiceArea: string | undefined,
  config: ScreeningConfiguration,
): StatuteCheckResult {
  // Extract incident date
  const incidentDateStr = extractText(formData, [
    'incident_date',
    'date_of_incident',
    'accident_date',
    'injury_date',
    'event_date',
    'occurrence_date',
  ]);

  if (!incidentDateStr) {
    return {
      applicable: false,
      isUrgent: false,
      isBeyondDeadline: false,
      notes: 'No incident date provided',
    };
  }

  const incidentDate = new Date(incidentDateStr);
  if (isNaN(incidentDate.getTime())) {
    return {
      applicable: false,
      isUrgent: false,
      isBeyondDeadline: false,
      notes: 'Invalid incident date format',
    };
  }

  // Get jurisdiction
  const state = extractText(formData, [
    'state',
    'jurisdiction',
    'incident_state',
    'location_state',
  ])?.toUpperCase();

  // Calculate deadline
  let limitYears = config.statuteOfLimitations.defaultYears;

  if (state && practiceArea) {
    const stateLimits = config.statuteOfLimitations.byState[state];
    if (stateLimits && stateLimits[practiceArea]) {
      limitYears = stateLimits[practiceArea];
    }
  }

  const deadlineDate = new Date(incidentDate);
  deadlineDate.setFullYear(deadlineDate.getFullYear() + limitYears);

  const today = new Date();
  const daysRemaining = Math.ceil(
    (deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  const isUrgent =
    daysRemaining > 0 &&
    daysRemaining <= config.statuteOfLimitations.urgentThresholdDays;
  const isBeyondDeadline = daysRemaining <= 0;

  return {
    applicable: true,
    deadlineDate,
    daysRemaining,
    isUrgent,
    isBeyondDeadline,
    notes: isBeyondDeadline
      ? `DEADLINE PASSED: Statute of limitations expired ${Math.abs(daysRemaining)} days ago`
      : isUrgent
        ? `URGENT: Only ${daysRemaining} days until deadline`
        : `${daysRemaining} days remaining until deadline`,
  };
}

/**
 * Check jurisdiction licensing
 */
function checkJurisdiction(
  formData: Record<string, unknown>,
  config: ScreeningConfiguration,
): JurisdictionCheckResult {
  const jurisdiction = extractText(formData, [
    'state',
    'jurisdiction',
    'incident_state',
    'location_state',
    'court',
    'venue',
  ]);

  if (!jurisdiction) {
    return {
      applicable: false,
      isLicensed: true, // Assume OK if not specified
      notes: 'No jurisdiction specified',
    };
  }

  const normalizedJurisdiction = jurisdiction.toUpperCase().trim();
  const stateCode =
    normalizedJurisdiction.length === 2
      ? normalizedJurisdiction
      : STATE_CODES[normalizedJurisdiction.toLowerCase()] ||
        normalizedJurisdiction;

  const isLicensed = config.jurisdictions.includes(stateCode);

  return {
    applicable: true,
    jurisdiction: stateCode,
    isLicensed,
    notes: isLicensed
      ? `Licensed in ${stateCode}`
      : `Not licensed in ${stateCode} - referral may be needed`,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract text from form data using multiple field names
 */
function extractText(
  formData: Record<string, unknown>,
  fieldNames: string[],
): string | undefined {
  for (const field of fieldNames) {
    const value = formData[field];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

/**
 * Determine overall screening status
 */
function determineStatus(
  practiceAreaCheck: PracticeAreaCheckResult,
  caseTypeCheck: CaseTypeCheckResult,
  statuteCheck: StatuteCheckResult,
  jurisdictionCheck: JurisdictionCheckResult,
  config: ScreeningConfiguration,
): {
  status: ScreeningStatus;
  overallScore: number;
  recommendations: string[];
  referralSuggestions?: ReferralSuggestion[];
} {
  const recommendations: string[] = [];
  const referralSuggestions: ReferralSuggestion[] = [];
  let score = 100;

  // Check for automatic declines
  if (statuteCheck.isBeyondDeadline) {
    return {
      status: 'declined',
      overallScore: 0,
      recommendations: [
        'Case cannot be accepted - statute of limitations has expired',
      ],
    };
  }

  // Practice area check
  if (!practiceAreaCheck.matched) {
    score -= 30;
    recommendations.push(
      'Practice area could not be determined - manual review needed',
    );
  } else if (
    !config.practiceAreas.find(
      (pa) => pa.name === practiceAreaCheck.practiceArea,
    )?.acceptNew
  ) {
    score -= 50;
    recommendations.push(
      `Practice area ${practiceAreaCheck.practiceArea} not currently accepting new cases`,
    );

    // Add referral suggestion
    const referral = config.referralPartners?.find((rp) =>
      rp.practiceAreas.includes(practiceAreaCheck.practiceArea!),
    );
    if (referral) {
      referralSuggestions.push({
        firmName: referral.name,
        practiceArea: practiceAreaCheck.practiceArea!,
        reason: 'Practice area not accepted',
      });
    }
  }

  // Case type check
  if (!caseTypeCheck.isAccepted) {
    score -= 40;
    recommendations.push(
      caseTypeCheck.notes || 'Case type not in accepted list',
    );
  }

  // Jurisdiction check
  if (jurisdictionCheck.applicable && !jurisdictionCheck.isLicensed) {
    score -= 50;
    recommendations.push(
      `Not licensed in ${jurisdictionCheck.jurisdiction} - referral needed`,
    );

    const referral = config.referralPartners?.find((rp) =>
      rp.jurisdictions.includes(jurisdictionCheck.jurisdiction!),
    );
    if (referral) {
      referralSuggestions.push({
        firmName: referral.name,
        practiceArea: practiceAreaCheck.practiceArea || 'general',
        reason: 'Jurisdiction not covered',
      });
    }
  }

  // Statute urgency
  if (statuteCheck.isUrgent) {
    recommendations.push(
      `URGENT: Only ${statuteCheck.daysRemaining} days until statute of limitations expires`,
    );
  }

  // Determine final status
  let status: ScreeningStatus;
  if (score >= 80) {
    status = 'qualified';
    if (recommendations.length === 0) {
      recommendations.push('Case appears qualified for intake');
    }
  } else if (score >= 50) {
    status = 'needs_review';
    recommendations.unshift('Manual review recommended before proceeding');
  } else if (referralSuggestions.length > 0) {
    status = 'referred';
  } else {
    status = 'declined';
  }

  return {
    status,
    overallScore: Math.max(0, score),
    recommendations,
    referralSuggestions:
      referralSuggestions.length > 0 ? referralSuggestions : undefined,
  };
}

/**
 * Save screening result to submission
 */
async function saveScreeningResult(
  submissionId: number,
  result: ScreeningResult,
): Promise<void> {
  const submission = await prisma.intakeSubmission.findUnique({
    where: { id: submissionId },
  });

  if (!submission) return;

  const formData = (submission.formData as Record<string, unknown>) || {};

  await prisma.intakeSubmission.update({
    where: { id: submissionId },
    data: {
      formData: {
        ...formData,
        _matterScreening: {
          status: result.status,
          score: result.overallScore,
          practiceArea: result.practiceAreaCheck.practiceArea,
          caseType: result.caseTypeCheck.caseType,
          statuteUrgent: result.statuteOfLimitationsCheck.isUrgent,
          daysRemaining: result.statuteOfLimitationsCheck.daysRemaining,
          jurisdiction: result.jurisdictionCheck.jurisdiction,
          isLicensed: result.jurisdictionCheck.isLicensed,
          recommendations: result.recommendations,
          screenedAt: new Date().toISOString(),
        },
      },
    },
  });
}

/**
 * Get screening configuration for a client
 */
export async function getScreeningConfig(
  configId: number,
): Promise<ScreeningConfiguration | null> {
  const config = await prisma.intakeConfig.findUnique({
    where: { id: configId },
  });

  if (!config) return null;

  // Check for custom screening configuration in client settings
  // For now, return default config
  return DEFAULT_CONFIG;
}

/**
 * Update screening configuration
 */
export async function updateScreeningConfig(
  configId: number,
  updates: Partial<ScreeningConfiguration>,
): Promise<ScreeningConfiguration> {
  // In a production system, this would save to database
  return { ...DEFAULT_CONFIG, ...updates };
}

// ============================================================================
// STATE CODE MAPPING
// ============================================================================

const STATE_CODES: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
  'district of columbia': 'DC',
};
