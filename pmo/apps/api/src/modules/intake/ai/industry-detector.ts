/**
 * Industry Detector Service
 *
 * Detects the industry type from natural language descriptions
 * to enable industry-specific form generation.
 */

import { env } from '../../../config/env';

// ============================================================================
// TYPES
// ============================================================================

export type IndustryType =
  | 'legal'
  | 'healthcare'
  | 'financial'
  | 'consulting'
  | 'real_estate'
  | 'insurance'
  | 'education'
  | 'technology'
  | 'retail'
  | 'manufacturing'
  | 'hospitality'
  | 'nonprofit'
  | 'general';

export interface IndustryDetectionResult {
  industry: IndustryType;
  confidence: number;
  keywords: string[];
}

// ============================================================================
// KEYWORD MAPPINGS
// ============================================================================

const INDUSTRY_KEYWORDS: Record<IndustryType, string[]> = {
  legal: [
    'law', 'legal', 'attorney', 'lawyer', 'lawsuit', 'litigation',
    'case', 'court', 'contract', 'legal matter', 'personal injury',
    'criminal', 'divorce', 'custody', 'estate planning', 'will',
    'trust', 'immigration', 'bankruptcy', 'intellectual property',
    'patent', 'trademark', 'law firm', 'counsel', 'defendant',
    'plaintiff', 'settlement', 'deposition', 'retainer', 'bar',
  ],
  healthcare: [
    'health', 'medical', 'patient', 'doctor', 'physician', 'nurse',
    'hospital', 'clinic', 'therapy', 'treatment', 'diagnosis',
    'prescription', 'medication', 'insurance', 'healthcare',
    'wellness', 'dental', 'mental health', 'psychiatry', 'psychology',
    'physical therapy', 'chiropractic', 'optometry', 'pharmacy',
    'lab', 'radiology', 'surgery', 'oncology', 'pediatric', 'HIPAA',
  ],
  financial: [
    'finance', 'financial', 'accounting', 'tax', 'taxes', 'audit',
    'bookkeeping', 'investment', 'wealth', 'portfolio', 'advisory',
    'CPA', 'accountant', 'banking', 'loan', 'mortgage', 'credit',
    'retirement', '401k', 'IRA', 'budget', 'payroll', 'CFO',
    'financial planning', 'fiduciary', 'securities', 'trading',
  ],
  consulting: [
    'consulting', 'consultant', 'advisory', 'strategy', 'business consulting',
    'management consulting', 'operations', 'transformation', 'optimization',
    'implementation', 'project management', 'change management',
    'process improvement', 'efficiency', 'assessment', 'analysis',
    'recommendation', 'strategic planning', 'organizational',
  ],
  real_estate: [
    'real estate', 'property', 'home', 'house', 'apartment', 'condo',
    'land', 'commercial property', 'residential', 'realtor', 'agent',
    'broker', 'listing', 'buying', 'selling', 'mortgage', 'closing',
    'escrow', 'title', 'inspection', 'appraisal', 'lease', 'rent',
    'landlord', 'tenant', 'HOA', 'development', 'construction',
  ],
  insurance: [
    'insurance', 'policy', 'coverage', 'premium', 'claim', 'deductible',
    'underwriting', 'risk', 'liability', 'auto insurance', 'home insurance',
    'life insurance', 'health insurance', 'disability', 'workers comp',
    'commercial insurance', 'umbrella', 'broker', 'agent', 'beneficiary',
  ],
  education: [
    'education', 'school', 'university', 'college', 'student', 'teacher',
    'professor', 'academic', 'enrollment', 'admission', 'tutoring',
    'training', 'course', 'curriculum', 'degree', 'certificate',
    'learning', 'classroom', 'online learning', 'e-learning',
  ],
  technology: [
    'technology', 'software', 'IT', 'tech', 'digital', 'app', 'application',
    'website', 'development', 'programming', 'coding', 'cloud', 'SaaS',
    'cybersecurity', 'data', 'AI', 'machine learning', 'automation',
    'integration', 'API', 'infrastructure', 'DevOps', 'startup',
  ],
  retail: [
    'retail', 'store', 'shop', 'ecommerce', 'e-commerce', 'product',
    'merchandise', 'inventory', 'customer', 'sales', 'order',
    'shipping', 'fulfillment', 'returns', 'POS', 'checkout',
  ],
  manufacturing: [
    'manufacturing', 'factory', 'production', 'assembly', 'supply chain',
    'logistics', 'warehouse', 'inventory', 'quality control', 'equipment',
    'machinery', 'industrial', 'fabrication', 'automation',
  ],
  hospitality: [
    'hospitality', 'hotel', 'restaurant', 'catering', 'event', 'venue',
    'booking', 'reservation', 'guest', 'accommodation', 'tourism',
    'travel', 'food service', 'banquet', 'conference',
  ],
  nonprofit: [
    'nonprofit', 'non-profit', 'charity', 'foundation', 'donation',
    'donor', 'volunteer', 'grant', 'mission', 'fundraising', 'cause',
    '501c3', 'NGO', 'advocacy', 'community', 'outreach',
  ],
  general: [], // Fallback - no specific keywords
};

// ============================================================================
// DETECTION FUNCTIONS
// ============================================================================

/**
 * Detect industry from a text description using keyword matching
 * or AI when available.
 */
export async function detectIndustry(description: string): Promise<IndustryType> {
  // First try rule-based detection (faster, no API needed)
  const ruleBasedResult = detectIndustryRuleBased(description);

  // If confidence is high, use rule-based result
  if (ruleBasedResult.confidence >= 0.7) {
    return ruleBasedResult.industry;
  }

  // If API key available and confidence is low, try AI detection
  if (env.openaiApiKey && ruleBasedResult.confidence < 0.5) {
    try {
      const aiResult = await detectIndustryWithAI(description);
      if (aiResult.confidence > ruleBasedResult.confidence) {
        return aiResult.industry;
      }
    } catch (error) {
      console.error('AI industry detection failed:', error);
    }
  }

  return ruleBasedResult.industry;
}

/**
 * Detect industry with full result details
 */
export async function detectIndustryWithDetails(
  description: string
): Promise<IndustryDetectionResult> {
  const ruleBasedResult = detectIndustryRuleBased(description);

  if (ruleBasedResult.confidence >= 0.7 || !env.openaiApiKey) {
    return ruleBasedResult;
  }

  try {
    const aiResult = await detectIndustryWithAI(description);
    return aiResult.confidence > ruleBasedResult.confidence
      ? aiResult
      : ruleBasedResult;
  } catch {
    return ruleBasedResult;
  }
}

/**
 * Rule-based industry detection using keyword matching
 */
export function detectIndustryRuleBased(description: string): IndustryDetectionResult {
  const lowerDesc = description.toLowerCase();
  const scores: Record<IndustryType, { score: number; keywords: string[] }> = {
    legal: { score: 0, keywords: [] },
    healthcare: { score: 0, keywords: [] },
    financial: { score: 0, keywords: [] },
    consulting: { score: 0, keywords: [] },
    real_estate: { score: 0, keywords: [] },
    insurance: { score: 0, keywords: [] },
    education: { score: 0, keywords: [] },
    technology: { score: 0, keywords: [] },
    retail: { score: 0, keywords: [] },
    manufacturing: { score: 0, keywords: [] },
    hospitality: { score: 0, keywords: [] },
    nonprofit: { score: 0, keywords: [] },
    general: { score: 0, keywords: [] },
  };

  // Score each industry based on keyword matches
  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword.toLowerCase())) {
        scores[industry as IndustryType].score += getKeywordWeight(keyword);
        scores[industry as IndustryType].keywords.push(keyword);
      }
    }
  }

  // Find the industry with highest score
  let bestIndustry: IndustryType = 'general';
  let bestScore = 0;
  let bestKeywords: string[] = [];

  for (const [industry, data] of Object.entries(scores)) {
    if (data.score > bestScore) {
      bestScore = data.score;
      bestIndustry = industry as IndustryType;
      bestKeywords = data.keywords;
    }
  }

  // Calculate confidence based on score and keyword diversity
  const confidence = calculateConfidence(bestScore, bestKeywords.length);

  return {
    industry: bestIndustry,
    confidence,
    keywords: bestKeywords.slice(0, 5), // Return top 5 matching keywords
  };
}

/**
 * AI-based industry detection for ambiguous cases
 */
async function detectIndustryWithAI(description: string): Promise<IndustryDetectionResult> {
  const industries = Object.keys(INDUSTRY_KEYWORDS).filter(i => i !== 'general');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 200,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are an industry classifier. Given a description, identify the most relevant industry from this list: ${industries.join(', ')}.

Return a JSON object with:
- industry: the detected industry (use "general" if no clear match)
- confidence: 0-1 confidence score
- keywords: array of 3-5 keywords from the description that influenced your decision`,
        },
        {
          role: 'user',
          content: description,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const parsed = JSON.parse(data.choices[0].message.content);

  // Validate the industry
  const industry = validateIndustry(parsed.industry);

  return {
    industry,
    confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get weight for a keyword based on its specificity
 */
function getKeywordWeight(keyword: string): number {
  // Multi-word keywords are more specific
  const wordCount = keyword.split(' ').length;
  if (wordCount >= 3) return 3;
  if (wordCount === 2) return 2;
  return 1;
}

/**
 * Calculate confidence score based on match score and keyword diversity
 */
function calculateConfidence(score: number, keywordCount: number): number {
  if (score === 0) return 0;

  // Base confidence on score
  let confidence = Math.min(1, score / 10);

  // Boost for multiple matching keywords (shows stronger match)
  if (keywordCount >= 5) confidence = Math.min(1, confidence + 0.2);
  else if (keywordCount >= 3) confidence = Math.min(1, confidence + 0.1);

  return Math.round(confidence * 100) / 100;
}

/**
 * Validate and normalize industry string
 */
function validateIndustry(industry: string): IndustryType {
  const normalized = industry?.toLowerCase().replace(/[^a-z_]/g, '_');
  const validIndustries: IndustryType[] = [
    'legal', 'healthcare', 'financial', 'consulting', 'real_estate',
    'insurance', 'education', 'technology', 'retail', 'manufacturing',
    'hospitality', 'nonprofit', 'general'
  ];

  if (validIndustries.includes(normalized as IndustryType)) {
    return normalized as IndustryType;
  }

  return 'general';
}

/**
 * Get all available industry types
 */
export function getAvailableIndustries(): IndustryType[] {
  return Object.keys(INDUSTRY_KEYWORDS) as IndustryType[];
}

/**
 * Get human-readable industry name
 */
export function getIndustryDisplayName(industry: IndustryType): string {
  const displayNames: Record<IndustryType, string> = {
    legal: 'Legal Services',
    healthcare: 'Healthcare',
    financial: 'Financial Services',
    consulting: 'Business Consulting',
    real_estate: 'Real Estate',
    insurance: 'Insurance',
    education: 'Education',
    technology: 'Technology',
    retail: 'Retail',
    manufacturing: 'Manufacturing',
    hospitality: 'Hospitality',
    nonprofit: 'Non-Profit',
    general: 'General Business',
  };

  return displayNames[industry] || 'General Business';
}
