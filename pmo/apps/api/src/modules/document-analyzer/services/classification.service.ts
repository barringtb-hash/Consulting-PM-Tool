/**
 * Document Classification Service
 *
 * Provides intelligent document classification for "touchless processing"
 * using AI-powered analysis to categorize documents into universal and
 * industry-specific types.
 */

import { DocumentCategory, IndustryType } from '@prisma/client';
import { env } from '../../../config/env';
import {
  BUILT_IN_TEMPLATES,
  BuiltInTemplate,
  getTemplatesByCategory,
  getTemplatesByIndustry,
} from '../templates/built-in-templates';

// ============================================================================
// TYPES
// ============================================================================

export interface ClassificationResult {
  category: DocumentCategory;
  documentType: string;
  industryCategory?: string;
  confidence: number;
  suggestedTemplateId?: string;
  alternativeMatches: Array<{
    category: DocumentCategory;
    documentType: string;
    confidence: number;
  }>;
  extractedHints: {
    keywords: string[];
    patterns: string[];
    entities: string[];
  };
}

export interface ClassificationOptions {
  industryHint?: IndustryType;
  enabledCategories?: DocumentCategory[];
  minConfidence?: number;
  maxAlternatives?: number;
}

// ============================================================================
// CLASSIFICATION PATTERNS
// ============================================================================

const CATEGORY_PATTERNS: Record<DocumentCategory, RegExp[]> = {
  INVOICE: [
    /invoice\s*(number|#|no\.?)/i,
    /bill\s*to/i,
    /amount\s*due/i,
    /total\s*amount/i,
    /payment\s*terms/i,
    /purchase\s*order/i,
    /remit\s*to/i,
    /due\s*date/i,
    /subtotal/i,
    /tax\s*(amount|rate)/i,
  ],
  CONTRACT: [
    /agreement\s*(between|by\s*and)/i,
    /party\s*of\s*the\s*(first|second)/i,
    /hereby\s*agrees?/i,
    /terms\s*and\s*conditions/i,
    /effective\s*date/i,
    /termination\s*clause/i,
    /governing\s*law/i,
    /indemnif(y|ication)/i,
    /confidential(ity)?/i,
    /non.?compete/i,
    /whereas/i,
  ],
  COMPLIANCE: [
    /form\s*w.?9/i,
    /taxpayer\s*identification/i,
    /certification/i,
    /compliance\s*report/i,
    /audit\s*(report|findings)/i,
    /regulatory/i,
    /attestation/i,
    /declaration/i,
  ],
  HEALTHCARE: [
    /patient\s*(name|information)/i,
    /diagnosis\s*code/i,
    /icd.?10/i,
    /cpt\s*code/i,
    /npi\s*number/i,
    /insurance\s*claim/i,
    /explanation\s*of\s*benefits/i,
    /eob/i,
    /cms.?1500/i,
    /ub.?04/i,
    /hipaa/i,
    /protected\s*health/i,
    /medical\s*record/i,
  ],
  LEGAL: [
    /court\s*(of|filing)/i,
    /case\s*(number|#|no\.?)/i,
    /plaintiff/i,
    /defendant/i,
    /motion\s*(for|to)/i,
    /hereby\s*ordered/i,
    /judgment/i,
    /complaint/i,
    /subpoena/i,
    /deposition/i,
    /affidavit/i,
    /exhibit\s*[a-z0-9]/i,
  ],
  FINANCIAL: [
    /loan\s*application/i,
    /bank\s*statement/i,
    /account\s*number/i,
    /routing\s*number/i,
    /annual\s*income/i,
    /credit\s*(score|report)/i,
    /financial\s*statement/i,
    /balance\s*sheet/i,
    /income\s*statement/i,
    /kyc/i,
    /know\s*your\s*customer/i,
  ],
  REAL_ESTATE: [
    /lease\s*agreement/i,
    /landlord/i,
    /tenant/i,
    /property\s*address/i,
    /monthly\s*rent/i,
    /security\s*deposit/i,
    /real\s*estate/i,
    /purchase\s*agreement/i,
    /deed/i,
    /title\s*(insurance|search)/i,
    /closing\s*(costs|documents)/i,
  ],
  MANUFACTURING: [
    /work\s*order/i,
    /production\s*order/i,
    /quality\s*inspection/i,
    /bill\s*of\s*materials/i,
    /bom/i,
    /lot\s*number/i,
    /batch\s*number/i,
    /inspection\s*report/i,
    /packing\s*slip/i,
    /shipping\s*manifest/i,
  ],
  GENERAL: [],
  OTHER: [],
};

const DOCUMENT_TYPE_PATTERNS: Record<string, RegExp[]> = {
  // Invoices
  INVOICE_AP: [/vendor|supplier|bill\s*from/i, /accounts?\s*payable/i],
  INVOICE_AR: [/customer|client|bill\s*to|sold\s*to/i, /accounts?\s*receivable/i],
  // Contracts
  CONTRACT_NDA: [/non.?disclosure|confidentiality\s*agreement|nda/i],
  CONTRACT_SERVICE: [/service\s*agreement|msa|master\s*service|consulting\s*agreement/i],
  CONTRACT_EMPLOYMENT: [/employment\s*(agreement|contract)|offer\s*letter|job\s*offer/i],
  // Compliance
  FORM_W9: [/form\s*w.?9|request\s*for\s*taxpayer/i],
  // Healthcare
  FORM_CMS1500: [/cms.?1500|hcfa.?1500|health\s*insurance\s*claim/i],
  EOB: [/explanation\s*of\s*benefits|eob|claim\s*summary/i],
  // Legal
  COURT_FILING: [/court\s*filing|motion|complaint|order\s*of\s*court/i],
  // Financial
  LOAN_APPLICATION: [/loan\s*application|credit\s*application/i],
  BANK_STATEMENT: [/bank\s*statement|account\s*statement/i],
  // Real Estate
  LEASE_AGREEMENT: [/lease\s*agreement|rental\s*agreement|tenancy/i],
  // Manufacturing
  WORK_ORDER: [/work\s*order|job\s*order|production\s*order/i],
  QUALITY_INSPECTION: [/quality\s*inspection|qc\s*report|inspection\s*report/i],
};

// ============================================================================
// CLASSIFICATION SERVICE
// ============================================================================

/**
 * Classify a document based on its text content
 */
export async function classifyDocument(
  text: string,
  options: ClassificationOptions = {},
): Promise<ClassificationResult> {
  const {
    industryHint,
    enabledCategories,
    minConfidence = 0.5,
    maxAlternatives = 3,
  } = options;

  // Try pattern-based classification first (fast)
  const patternResult = classifyByPatterns(text, enabledCategories);

  // If confidence is high enough and we have a clear match, return it
  if (patternResult.confidence >= 0.8) {
    return {
      ...patternResult,
      alternativeMatches: patternResult.alternativeMatches.slice(0, maxAlternatives),
    };
  }

  // Use AI classification for better accuracy
  const aiResult = await classifyWithAI(text, industryHint, enabledCategories);

  // Combine results, preferring AI if available
  if (aiResult && aiResult.confidence > patternResult.confidence) {
    return {
      ...aiResult,
      alternativeMatches: [
        ...aiResult.alternativeMatches,
        ...patternResult.alternativeMatches,
      ]
        .filter(
          (alt, idx, arr) =>
            arr.findIndex(
              (a) =>
                a.category === alt.category && a.documentType === alt.documentType,
            ) === idx,
        )
        .slice(0, maxAlternatives),
    };
  }

  return {
    ...patternResult,
    alternativeMatches: patternResult.alternativeMatches.slice(0, maxAlternatives),
  };
}

/**
 * Pattern-based classification (fast, no API calls)
 */
function classifyByPatterns(
  text: string,
  enabledCategories?: DocumentCategory[],
): ClassificationResult {
  const scores: Map<DocumentCategory, number> = new Map();
  const typeScores: Map<string, number> = new Map();
  const matchedKeywords: string[] = [];
  const matchedPatterns: string[] = [];

  // Score each category
  for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
    if (
      enabledCategories &&
      !enabledCategories.includes(category as DocumentCategory)
    ) {
      continue;
    }

    let score = 0;
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        score += 1;
        matchedPatterns.push(pattern.source);
        matchedKeywords.push(matches[0]);
      }
    }

    if (score > 0) {
      scores.set(category as DocumentCategory, score / patterns.length);
    }
  }

  // Score specific document types
  for (const [docType, patterns] of Object.entries(DOCUMENT_TYPE_PATTERNS)) {
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        score += 1;
      }
    }

    if (score > 0) {
      typeScores.set(docType, score / patterns.length);
    }
  }

  // Get best category match
  let bestCategory: DocumentCategory = 'GENERAL';
  let bestCategoryScore = 0;

  for (const [category, score] of scores.entries()) {
    if (score > bestCategoryScore) {
      bestCategory = category;
      bestCategoryScore = score;
    }
  }

  // Get best document type match
  let bestDocType = '';
  let bestDocTypeScore = 0;

  for (const [docType, score] of typeScores.entries()) {
    // Make sure document type matches the category
    const template = BUILT_IN_TEMPLATES.find((t) => t.documentType === docType);
    if (template && template.category === bestCategory && score > bestDocTypeScore) {
      bestDocType = docType;
      bestDocTypeScore = score;
    }
  }

  // Find matching template
  let suggestedTemplateId: string | undefined;
  if (bestDocType) {
    const template = BUILT_IN_TEMPLATES.find((t) => t.documentType === bestDocType);
    if (template) {
      suggestedTemplateId = template.documentType;
    }
  }

  // Build alternative matches
  const alternatives: ClassificationResult['alternativeMatches'] = [];
  const sortedScores = Array.from(scores.entries()).sort((a, b) => b[1] - a[1]);

  for (const [category, score] of sortedScores.slice(1, 4)) {
    const categoryTemplates = getTemplatesByCategory(category);
    const defaultType = categoryTemplates.length > 0 ? categoryTemplates[0].documentType : 'UNKNOWN';

    alternatives.push({
      category,
      documentType: defaultType,
      confidence: Math.min(score * 0.9, 0.95),
    });
  }

  // Calculate final confidence
  const confidence = Math.min(
    bestCategoryScore * 0.8 + bestDocTypeScore * 0.2,
    0.95,
  );

  return {
    category: bestCategory,
    documentType: bestDocType || 'UNKNOWN',
    confidence,
    suggestedTemplateId,
    alternativeMatches: alternatives,
    extractedHints: {
      keywords: [...new Set(matchedKeywords)].slice(0, 10),
      patterns: [...new Set(matchedPatterns)].slice(0, 5),
      entities: [], // Would be populated by NER
    },
  };
}

/**
 * AI-powered classification using OpenAI
 */
async function classifyWithAI(
  text: string,
  industryHint?: IndustryType,
  enabledCategories?: DocumentCategory[],
): Promise<ClassificationResult | null> {
  if (!env.openaiApiKey) {
    return null;
  }

  const categories = enabledCategories || Object.values(DocumentCategory);
  const documentTypes = BUILT_IN_TEMPLATES.filter(
    (t) => !enabledCategories || enabledCategories.includes(t.category),
  ).map((t) => t.documentType);

  const systemPrompt = `You are a document classification expert. Analyze the provided document text and classify it.

Available categories: ${categories.join(', ')}

Available document types: ${documentTypes.join(', ')}

${industryHint ? `Industry context: ${industryHint}` : ''}

Respond with JSON only:
{
  "category": "CATEGORY_NAME",
  "documentType": "DOCUMENT_TYPE",
  "confidence": 0.0-1.0,
  "industryCategory": "optional sub-category",
  "alternativeMatches": [
    { "category": "...", "documentType": "...", "confidence": 0.0-1.0 }
  ],
  "keywords": ["key", "words", "found"],
  "entities": ["PERSON: Name", "ORG: Company", "DATE: date"]
}`;

  try {
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
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Classify this document:\n\n${text.substring(0, 4000)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('AI classification failed:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return null;
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Find suggested template
    const template = BUILT_IN_TEMPLATES.find(
      (t) => t.documentType === parsed.documentType,
    );

    return {
      category: parsed.category as DocumentCategory,
      documentType: parsed.documentType,
      industryCategory: parsed.industryCategory,
      confidence: parsed.confidence,
      suggestedTemplateId: template?.documentType,
      alternativeMatches: (parsed.alternativeMatches || []).map(
        (alt: { category: string; documentType: string; confidence: number }) => ({
          category: alt.category as DocumentCategory,
          documentType: alt.documentType,
          confidence: alt.confidence,
        }),
      ),
      extractedHints: {
        keywords: parsed.keywords || [],
        patterns: [],
        entities: parsed.entities || [],
      },
    };
  } catch (error) {
    console.error('AI classification error:', error);
    return null;
  }
}

/**
 * Get the best matching template for a classification result
 */
export function getBestTemplateForClassification(
  result: ClassificationResult,
  industryType?: IndustryType,
): BuiltInTemplate | null {
  // First try exact document type match
  if (result.suggestedTemplateId) {
    const template = BUILT_IN_TEMPLATES.find(
      (t) => t.documentType === result.suggestedTemplateId,
    );
    if (template) {
      return template;
    }
  }

  // Try matching by category and industry
  const categoryTemplates = getTemplatesByCategory(result.category);

  if (industryType) {
    const industryMatch = categoryTemplates.find(
      (t) => t.industryType === industryType,
    );
    if (industryMatch) {
      return industryMatch;
    }
  }

  // Return first category match
  return categoryTemplates[0] || null;
}

/**
 * Validate classification confidence against threshold
 */
export function isConfidentClassification(
  result: ClassificationResult,
  threshold: number = 0.85,
): boolean {
  return result.confidence >= threshold;
}

/**
 * Get classification statistics for a batch of results
 */
export function getClassificationStats(
  results: ClassificationResult[],
): {
  totalDocuments: number;
  byCategory: Record<string, number>;
  byDocumentType: Record<string, number>;
  avgConfidence: number;
  lowConfidenceCount: number;
} {
  const byCategory: Record<string, number> = {};
  const byDocumentType: Record<string, number> = {};
  let totalConfidence = 0;
  let lowConfidenceCount = 0;

  for (const result of results) {
    byCategory[result.category] = (byCategory[result.category] || 0) + 1;
    byDocumentType[result.documentType] =
      (byDocumentType[result.documentType] || 0) + 1;
    totalConfidence += result.confidence;

    if (result.confidence < 0.7) {
      lowConfidenceCount++;
    }
  }

  return {
    totalDocuments: results.length,
    byCategory,
    byDocumentType,
    avgConfidence: results.length > 0 ? totalConfidence / results.length : 0,
    lowConfidenceCount,
  };
}
