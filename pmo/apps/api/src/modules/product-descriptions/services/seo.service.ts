/**
 * SEO Service
 *
 * Provides SEO scoring and keyword suggestions for product descriptions.
 * Scores are based on marketplace-specific best practices.
 */

import { Marketplace } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface SEOScore {
  overall: number;
  breakdown: {
    titleScore: number;
    descriptionScore: number;
    bulletPointsScore: number;
    keywordScore: number;
    metaTagsScore: number;
  };
  issues: SEOIssue[];
  suggestions: string[];
}

export interface SEOIssue {
  severity: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  recommendation: string;
}

export interface KeywordSuggestion {
  keyword: string;
  relevance: number;
  searchVolume?: 'high' | 'medium' | 'low';
  competition?: 'high' | 'medium' | 'low';
  source: 'category' | 'product' | 'competitor' | 'trend';
}

export interface SEOAnalysisInput {
  title: string;
  shortDescription: string;
  longDescription: string;
  bulletPoints: string[];
  keywords: string[];
  metaTitle?: string;
  metaDescription?: string;
  marketplace: Marketplace;
  category?: string;
  productName: string;
}

// ============================================================================
// MARKETPLACE-SPECIFIC GUIDELINES
// ============================================================================

interface MarketplaceGuidelines {
  title: {
    minLength: number;
    maxLength: number;
    idealLength: number;
  };
  shortDescription: {
    minLength: number;
    maxLength: number;
    idealLength: number;
  };
  longDescription: {
    minLength: number;
    maxLength: number;
    idealLength: number;
  };
  bulletPoints: {
    minCount: number;
    maxCount: number;
    idealCount: number;
    minLength: number;
    maxLength: number;
  };
  keywords: {
    minCount: number;
    maxCount: number;
    idealCount: number;
  };
  metaTitle: {
    maxLength: number;
  };
  metaDescription: {
    maxLength: number;
  };
}

const MARKETPLACE_GUIDELINES: Record<string, MarketplaceGuidelines> = {
  AMAZON: {
    title: { minLength: 80, maxLength: 200, idealLength: 150 },
    shortDescription: { minLength: 100, maxLength: 500, idealLength: 250 },
    longDescription: { minLength: 500, maxLength: 2000, idealLength: 1000 },
    bulletPoints: {
      minCount: 3,
      maxCount: 5,
      idealCount: 5,
      minLength: 50,
      maxLength: 200,
    },
    keywords: { minCount: 3, maxCount: 10, idealCount: 7 },
    metaTitle: { maxLength: 60 },
    metaDescription: { maxLength: 155 },
  },
  EBAY: {
    title: { minLength: 40, maxLength: 80, idealLength: 60 },
    shortDescription: { minLength: 100, maxLength: 500, idealLength: 200 },
    longDescription: { minLength: 300, maxLength: 1500, idealLength: 800 },
    bulletPoints: {
      minCount: 3,
      maxCount: 8,
      idealCount: 5,
      minLength: 30,
      maxLength: 150,
    },
    keywords: { minCount: 3, maxCount: 15, idealCount: 8 },
    metaTitle: { maxLength: 70 },
    metaDescription: { maxLength: 160 },
  },
  SHOPIFY: {
    title: { minLength: 30, maxLength: 70, idealLength: 55 },
    shortDescription: { minLength: 50, maxLength: 300, idealLength: 150 },
    longDescription: { minLength: 200, maxLength: 1500, idealLength: 600 },
    bulletPoints: {
      minCount: 3,
      maxCount: 6,
      idealCount: 4,
      minLength: 30,
      maxLength: 120,
    },
    keywords: { minCount: 2, maxCount: 8, idealCount: 5 },
    metaTitle: { maxLength: 60 },
    metaDescription: { maxLength: 155 },
  },
  ETSY: {
    title: { minLength: 40, maxLength: 140, idealLength: 100 },
    shortDescription: { minLength: 50, maxLength: 300, idealLength: 150 },
    longDescription: { minLength: 200, maxLength: 1500, idealLength: 500 },
    bulletPoints: {
      minCount: 2,
      maxCount: 5,
      idealCount: 4,
      minLength: 30,
      maxLength: 100,
    },
    keywords: { minCount: 5, maxCount: 13, idealCount: 10 },
    metaTitle: { maxLength: 60 },
    metaDescription: { maxLength: 155 },
  },
  WALMART: {
    title: { minLength: 50, maxLength: 120, idealLength: 80 },
    shortDescription: { minLength: 100, maxLength: 500, idealLength: 250 },
    longDescription: { minLength: 300, maxLength: 2000, idealLength: 800 },
    bulletPoints: {
      minCount: 3,
      maxCount: 6,
      idealCount: 5,
      minLength: 40,
      maxLength: 150,
    },
    keywords: { minCount: 3, maxCount: 10, idealCount: 6 },
    metaTitle: { maxLength: 60 },
    metaDescription: { maxLength: 155 },
  },
  GENERIC: {
    title: { minLength: 30, maxLength: 100, idealLength: 60 },
    shortDescription: { minLength: 50, maxLength: 500, idealLength: 200 },
    longDescription: { minLength: 200, maxLength: 2000, idealLength: 600 },
    bulletPoints: {
      minCount: 3,
      maxCount: 6,
      idealCount: 5,
      minLength: 30,
      maxLength: 150,
    },
    keywords: { minCount: 3, maxCount: 10, idealCount: 5 },
    metaTitle: { maxLength: 60 },
    metaDescription: { maxLength: 155 },
  },
};

// ============================================================================
// SEO SCORING
// ============================================================================

/**
 * Calculate comprehensive SEO score for a product description
 */
export function calculateSEOScore(input: SEOAnalysisInput): SEOScore {
  const guidelines =
    MARKETPLACE_GUIDELINES[input.marketplace] || MARKETPLACE_GUIDELINES.GENERIC;
  const issues: SEOIssue[] = [];
  const suggestions: string[] = [];

  // Calculate individual scores
  const titleScore = scoreTitleSEO(input, guidelines, issues, suggestions);
  const descriptionScore = scoreDescriptionSEO(
    input,
    guidelines,
    issues,
    suggestions,
  );
  const bulletPointsScore = scoreBulletPointsSEO(
    input,
    guidelines,
    issues,
    suggestions,
  );
  const keywordScore = scoreKeywordSEO(input, guidelines, issues, suggestions);
  const metaTagsScore = scoreMetaTagsSEO(
    input,
    guidelines,
    issues,
    suggestions,
  );

  // Calculate weighted overall score
  const overall = Math.round(
    titleScore * 0.2 +
      descriptionScore * 0.25 +
      bulletPointsScore * 0.2 +
      keywordScore * 0.2 +
      metaTagsScore * 0.15,
  );

  return {
    overall,
    breakdown: {
      titleScore,
      descriptionScore,
      bulletPointsScore,
      keywordScore,
      metaTagsScore,
    },
    issues,
    suggestions,
  };
}

/**
 * Score title SEO
 */
function scoreTitleSEO(
  input: SEOAnalysisInput,
  guidelines: MarketplaceGuidelines,
  issues: SEOIssue[],
  suggestions: string[],
): number {
  let score = 100;
  const title = input.title;
  const titleLength = title.length;
  const { minLength, maxLength, idealLength } = guidelines.title;

  // Length checks
  if (titleLength < minLength) {
    score -= 30;
    issues.push({
      severity: 'error',
      category: 'Title',
      message: `Title is too short (${titleLength} chars)`,
      recommendation: `Increase title length to at least ${minLength} characters`,
    });
  } else if (titleLength > maxLength) {
    score -= 20;
    issues.push({
      severity: 'warning',
      category: 'Title',
      message: `Title is too long (${titleLength} chars)`,
      recommendation: `Shorten title to under ${maxLength} characters`,
    });
  } else if (
    titleLength >= idealLength - 20 &&
    titleLength <= idealLength + 20
  ) {
    // Optimal length bonus
    score = Math.min(100, score + 5);
  }

  // Keyword presence in title
  const titleLower = title.toLowerCase();
  const keywordsInTitle = input.keywords.filter((k) =>
    titleLower.includes(k.toLowerCase()),
  );
  if (keywordsInTitle.length === 0 && input.keywords.length > 0) {
    score -= 15;
    issues.push({
      severity: 'warning',
      category: 'Title',
      message: 'No keywords found in title',
      recommendation: 'Include at least one primary keyword in the title',
    });
    suggestions.push(
      `Add keyword "${input.keywords[0]}" to the title for better SEO`,
    );
  }

  // Check for keyword at beginning
  if (
    input.keywords.length > 0 &&
    !titleLower.startsWith(input.keywords[0].toLowerCase())
  ) {
    const firstWord = title.split(' ')[0].toLowerCase();
    const keywordAtStart = input.keywords.some(
      (k) => k.toLowerCase() === firstWord,
    );
    if (!keywordAtStart) {
      score -= 5;
      suggestions.push(
        'Consider placing primary keyword at the start of title',
      );
    }
  }

  // Check for brand name
  if (
    !titleLower.includes('brand') &&
    input.productName &&
    !titleLower.includes(input.productName.toLowerCase())
  ) {
    issues.push({
      severity: 'info',
      category: 'Title',
      message: 'Product name not found in title',
      recommendation:
        'Consider including the product name for brand recognition',
    });
  }

  // Check for stop words at beginning (less impactful)
  const stopWordsStart = ['the', 'a', 'an', 'this', 'these'];
  const firstWord = title.split(' ')[0].toLowerCase();
  if (stopWordsStart.includes(firstWord)) {
    score -= 3;
    suggestions.push('Avoid starting title with articles (the, a, an)');
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Score description SEO
 */
function scoreDescriptionSEO(
  input: SEOAnalysisInput,
  guidelines: MarketplaceGuidelines,
  issues: SEOIssue[],
  suggestions: string[],
): number {
  let score = 100;
  const shortDesc = input.shortDescription;
  const longDesc = input.longDescription;

  // Short description length
  if (shortDesc.length < guidelines.shortDescription.minLength) {
    score -= 15;
    issues.push({
      severity: 'warning',
      category: 'Short Description',
      message: 'Short description is too brief',
      recommendation: `Expand to at least ${guidelines.shortDescription.minLength} characters`,
    });
  }

  // Long description length
  if (longDesc.length < guidelines.longDescription.minLength) {
    score -= 20;
    issues.push({
      severity: 'error',
      category: 'Long Description',
      message: `Long description is too short (${longDesc.length} chars)`,
      recommendation: `Expand to at least ${guidelines.longDescription.minLength} characters`,
    });
  } else if (longDesc.length > guidelines.longDescription.maxLength) {
    score -= 10;
    issues.push({
      severity: 'warning',
      category: 'Long Description',
      message: 'Long description may be too long',
      recommendation: `Consider shortening to under ${guidelines.longDescription.maxLength} characters`,
    });
  }

  // Keyword density
  const keywordDensity = calculateKeywordDensity(longDesc, input.keywords);
  if (keywordDensity < 1) {
    score -= 15;
    issues.push({
      severity: 'warning',
      category: 'Keywords',
      message: 'Low keyword density in description',
      recommendation:
        'Include keywords more naturally throughout the description',
    });
  } else if (keywordDensity > 5) {
    score -= 20;
    issues.push({
      severity: 'error',
      category: 'Keywords',
      message: 'Keyword stuffing detected',
      recommendation:
        'Reduce keyword usage to avoid appearing spammy (target 1-3% density)',
    });
  }

  // Check for structured content (paragraphs, formatting)
  const paragraphs = longDesc.split(/\n\n|\r\n\r\n/).filter((p) => p.trim());
  if (paragraphs.length < 2) {
    score -= 5;
    suggestions.push(
      'Break description into multiple paragraphs for better readability',
    );
  }

  // Check for call-to-action
  const ctaPhrases = [
    'order now',
    'buy now',
    'add to cart',
    'shop now',
    'get yours',
    'try it',
  ];
  const hasCTA = ctaPhrases.some((cta) => longDesc.toLowerCase().includes(cta));
  if (!hasCTA) {
    score -= 5;
    suggestions.push('Consider adding a call-to-action at the end');
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Score bullet points SEO
 */
function scoreBulletPointsSEO(
  input: SEOAnalysisInput,
  guidelines: MarketplaceGuidelines,
  issues: SEOIssue[],
  suggestions: string[],
): number {
  let score = 100;
  const bullets = input.bulletPoints;
  const { minCount, maxCount, idealCount, minLength, maxLength } =
    guidelines.bulletPoints;

  // Count check
  if (bullets.length < minCount) {
    score -= 25;
    issues.push({
      severity: 'error',
      category: 'Bullet Points',
      message: `Too few bullet points (${bullets.length})`,
      recommendation: `Add at least ${minCount} bullet points`,
    });
  } else if (bullets.length > maxCount) {
    score -= 10;
    issues.push({
      severity: 'warning',
      category: 'Bullet Points',
      message: 'Too many bullet points',
      recommendation: `Keep to ${maxCount} or fewer bullet points`,
    });
  } else if (bullets.length === idealCount) {
    score = Math.min(100, score + 5);
  }

  // Length checks for each bullet
  const shortBullets = bullets.filter((b) => b.length < minLength);
  const longBullets = bullets.filter((b) => b.length > maxLength);

  if (shortBullets.length > 0) {
    score -= shortBullets.length * 5;
    issues.push({
      severity: 'warning',
      category: 'Bullet Points',
      message: `${shortBullets.length} bullet(s) are too short`,
      recommendation: `Expand bullet points to at least ${minLength} characters`,
    });
  }

  if (longBullets.length > 0) {
    score -= longBullets.length * 3;
    issues.push({
      severity: 'info',
      category: 'Bullet Points',
      message: `${longBullets.length} bullet(s) are quite long`,
      recommendation: 'Keep bullets concise for better scannability',
    });
  }

  // Keyword presence in bullets
  const bulletsText = bullets.join(' ').toLowerCase();
  const keywordsInBullets = input.keywords.filter((k) =>
    bulletsText.includes(k.toLowerCase()),
  );

  if (keywordsInBullets.length < Math.min(2, input.keywords.length)) {
    score -= 10;
    suggestions.push('Include more keywords in bullet points naturally');
  }

  // Check for benefit-focused language
  const benefitWords = [
    'provides',
    'delivers',
    'ensures',
    'features',
    'includes',
    'offers',
    'helps',
    'enables',
    'perfect for',
    'ideal for',
  ];
  const hasBenefitLanguage = benefitWords.some((word) =>
    bulletsText.includes(word),
  );
  if (!hasBenefitLanguage) {
    score -= 5;
    suggestions.push(
      'Use benefit-focused language in bullets (e.g., "provides", "ensures", "perfect for")',
    );
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Score keyword SEO
 */
function scoreKeywordSEO(
  input: SEOAnalysisInput,
  guidelines: MarketplaceGuidelines,
  issues: SEOIssue[],
  suggestions: string[],
): number {
  let score = 100;
  const keywords = input.keywords;
  const { minCount, maxCount, idealCount } = guidelines.keywords;

  // Count check
  if (keywords.length < minCount) {
    score -= 30;
    issues.push({
      severity: 'error',
      category: 'Keywords',
      message: `Too few keywords (${keywords.length})`,
      recommendation: `Add at least ${minCount} keywords`,
    });
  } else if (keywords.length > maxCount) {
    score -= 10;
    issues.push({
      severity: 'warning',
      category: 'Keywords',
      message: 'Too many keywords',
      recommendation: `Focus on ${maxCount} or fewer keywords`,
    });
  } else if (
    keywords.length >= idealCount - 1 &&
    keywords.length <= idealCount + 1
  ) {
    score = Math.min(100, score + 5);
  }

  // Check for duplicate keywords
  const uniqueKeywords = new Set(keywords.map((k) => k.toLowerCase()));
  if (uniqueKeywords.size < keywords.length) {
    const duplicates = keywords.length - uniqueKeywords.size;
    score -= duplicates * 10;
    issues.push({
      severity: 'warning',
      category: 'Keywords',
      message: `${duplicates} duplicate keyword(s) found`,
      recommendation: 'Remove duplicate keywords',
    });
  }

  // Check keyword relevance (basic heuristic)
  const allContent =
    `${input.title} ${input.shortDescription} ${input.longDescription}`.toLowerCase();
  const unusedKeywords = keywords.filter(
    (k) => !allContent.includes(k.toLowerCase()),
  );

  if (unusedKeywords.length > 0) {
    score -= unusedKeywords.length * 5;
    issues.push({
      severity: 'warning',
      category: 'Keywords',
      message: `${unusedKeywords.length} keyword(s) not found in content`,
      recommendation: 'Include all keywords naturally in title or description',
    });
  }

  // Check for long-tail keywords
  const longTailKeywords = keywords.filter((k) => k.split(' ').length >= 3);
  if (longTailKeywords.length === 0 && keywords.length > 0) {
    score -= 5;
    suggestions.push(
      'Consider adding long-tail keywords (3+ words) for better targeting',
    );
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Score meta tags SEO
 */
function scoreMetaTagsSEO(
  input: SEOAnalysisInput,
  guidelines: MarketplaceGuidelines,
  issues: SEOIssue[],
  suggestions: string[],
): number {
  let score = 100;

  // Meta title
  if (!input.metaTitle) {
    score -= 20;
    issues.push({
      severity: 'warning',
      category: 'Meta Tags',
      message: 'Missing meta title',
      recommendation: 'Add a meta title for better search visibility',
    });
  } else {
    if (input.metaTitle.length > guidelines.metaTitle.maxLength) {
      score -= 10;
      issues.push({
        severity: 'warning',
        category: 'Meta Tags',
        message: `Meta title too long (${input.metaTitle.length} chars)`,
        recommendation: `Keep under ${guidelines.metaTitle.maxLength} characters`,
      });
    }

    // Check for keyword in meta title
    const metaTitleLower = input.metaTitle.toLowerCase();
    const hasKeywordInMetaTitle = input.keywords.some((k) =>
      metaTitleLower.includes(k.toLowerCase()),
    );
    if (!hasKeywordInMetaTitle && input.keywords.length > 0) {
      score -= 10;
      suggestions.push('Include primary keyword in meta title');
    }
  }

  // Meta description
  if (!input.metaDescription) {
    score -= 20;
    issues.push({
      severity: 'warning',
      category: 'Meta Tags',
      message: 'Missing meta description',
      recommendation: 'Add a meta description for better search visibility',
    });
  } else {
    if (input.metaDescription.length > guidelines.metaDescription.maxLength) {
      score -= 10;
      issues.push({
        severity: 'warning',
        category: 'Meta Tags',
        message: `Meta description too long (${input.metaDescription.length} chars)`,
        recommendation: `Keep under ${guidelines.metaDescription.maxLength} characters`,
      });
    }

    // Check for keyword in meta description
    const metaDescLower = input.metaDescription.toLowerCase();
    const hasKeywordInMetaDesc = input.keywords.some((k) =>
      metaDescLower.includes(k.toLowerCase()),
    );
    if (!hasKeywordInMetaDesc && input.keywords.length > 0) {
      score -= 5;
      suggestions.push('Include primary keyword in meta description');
    }
  }

  return Math.max(0, Math.min(100, score));
}

// ============================================================================
// KEYWORD SUGGESTIONS
// ============================================================================

/**
 * Generate keyword suggestions based on product data
 */
export function generateKeywordSuggestions(
  productName: string,
  category: string | undefined,
  attributes: Record<string, string> | undefined,
  existingKeywords: string[],
  marketplace: Marketplace,
): KeywordSuggestion[] {
  const suggestions: KeywordSuggestion[] = [];
  const existingLower = new Set(existingKeywords.map((k) => k.toLowerCase()));

  // Extract words from product name
  const nameWords = productName
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);

  // Product name as a keyword
  if (!existingLower.has(productName.toLowerCase())) {
    suggestions.push({
      keyword: productName,
      relevance: 100,
      searchVolume: 'medium',
      source: 'product',
    });
  }

  // Category-based keywords
  if (category && !existingLower.has(category.toLowerCase())) {
    suggestions.push({
      keyword: category,
      relevance: 90,
      searchVolume: 'high',
      source: 'category',
    });

    // Category + product type combinations
    const categoryPlusBrand = `${category} ${nameWords[0] || ''}`.trim();
    if (
      categoryPlusBrand &&
      !existingLower.has(categoryPlusBrand.toLowerCase())
    ) {
      suggestions.push({
        keyword: categoryPlusBrand,
        relevance: 85,
        searchVolume: 'medium',
        source: 'category',
      });
    }
  }

  // Attribute-based keywords
  if (attributes) {
    const keyAttributes = ['brand', 'color', 'material', 'size', 'style'];
    for (const attr of keyAttributes) {
      const value = attributes[attr] || attributes[attr.toLowerCase()];
      if (value && !existingLower.has(value.toLowerCase())) {
        suggestions.push({
          keyword: value,
          relevance: 70,
          searchVolume: 'medium',
          source: 'product',
        });

        // Combination with product name
        const combo = `${value} ${nameWords.slice(0, 2).join(' ')}`.trim();
        if (combo && !existingLower.has(combo.toLowerCase())) {
          suggestions.push({
            keyword: combo,
            relevance: 75,
            searchVolume: 'low',
            source: 'product',
          });
        }
      }
    }
  }

  // Marketplace-specific keyword patterns
  const marketplacePatterns = getMarketplaceKeywordPatterns(marketplace);
  for (const pattern of marketplacePatterns) {
    const keyword = pattern.replace('{product}', nameWords.join(' '));
    if (!existingLower.has(keyword.toLowerCase())) {
      suggestions.push({
        keyword,
        relevance: 65,
        searchVolume: 'medium',
        source: 'trend',
      });
    }
  }

  // Long-tail variations
  const longTailPhrases = [
    `best ${productName}`,
    `${productName} for sale`,
    `buy ${productName}`,
    `${productName} online`,
    `premium ${productName}`,
  ];

  for (const phrase of longTailPhrases) {
    if (!existingLower.has(phrase.toLowerCase())) {
      suggestions.push({
        keyword: phrase,
        relevance: 60,
        searchVolume: 'low',
        competition: 'low',
        source: 'trend',
      });
    }
  }

  // Sort by relevance and remove duplicates
  const seen = new Set<string>();
  return suggestions
    .filter((s) => {
      const lower = s.keyword.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      return true;
    })
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 20);
}

/**
 * Get marketplace-specific keyword patterns
 */
function getMarketplaceKeywordPatterns(marketplace: Marketplace): string[] {
  const patterns: Record<string, string[]> = {
    AMAZON: [
      '{product} prime',
      '{product} with free shipping',
      'top rated {product}',
      '{product} bestseller',
    ],
    EBAY: [
      '{product} new',
      '{product} fast shipping',
      '{product} free returns',
      'best {product} deals',
    ],
    SHOPIFY: [
      'shop {product}',
      '{product} store',
      'handmade {product}',
      'custom {product}',
    ],
    ETSY: [
      'handcrafted {product}',
      'unique {product}',
      'artisan {product}',
      'custom made {product}',
    ],
    WALMART: [
      '{product} low price',
      'value {product}',
      '{product} everyday',
      'affordable {product}',
    ],
    GENERIC: [
      'best {product}',
      '{product} online',
      'quality {product}',
      'professional {product}',
    ],
  };

  return patterns[marketplace] || patterns.GENERIC;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate keyword density as percentage
 */
function calculateKeywordDensity(text: string, keywords: string[]): number {
  if (!text || keywords.length === 0) return 0;

  const words = text.toLowerCase().split(/\s+/);
  const totalWords = words.length;
  if (totalWords === 0) return 0;

  let keywordCount = 0;
  const textLower = text.toLowerCase();

  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();
    const regex = new RegExp(`\\b${escapeRegex(keywordLower)}\\b`, 'gi');
    const matches = textLower.match(regex);
    keywordCount += matches ? matches.length : 0;
  }

  return totalWords > 0 ? (keywordCount / totalWords) * 100 : 0;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Get SEO score label based on score value
 */
export function getSEOScoreLabel(
  score: number,
): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'fair';
  return 'poor';
}

/**
 * Get SEO score color for UI display
 */
export function getSEOScoreColor(
  score: number,
): 'green' | 'yellow' | 'orange' | 'red' {
  if (score >= 80) return 'green';
  if (score >= 60) return 'yellow';
  if (score >= 40) return 'orange';
  return 'red';
}
