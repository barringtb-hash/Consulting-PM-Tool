/**
 * Image Analysis Service for Product Descriptions
 *
 * Uses GPT-4 Vision to analyze product images and extract:
 * - Product attributes and features
 * - Colors, materials, dimensions
 * - Quality indicators
 * - Suggested categories
 * - Description suggestions based on visual analysis
 */

import { env } from '../../../config/env';

// ============================================================================
// TYPES
// ============================================================================

export interface ImageAnalysisResult {
  success: boolean;
  error?: string;
  analysis?: ProductImageAnalysis;
}

export interface ProductImageAnalysis {
  /** Primary product type detected */
  productType: string;
  /** Suggested category based on image */
  suggestedCategory: string;
  /** Suggested subcategory */
  suggestedSubcategory?: string;
  /** Detected colors */
  colors: ColorInfo[];
  /** Detected materials */
  materials: string[];
  /** Estimated dimensions/size indicators */
  sizeIndicators: string[];
  /** Key visual features */
  features: FeatureInfo[];
  /** Quality indicators (premium, standard, budget) */
  qualityLevel: 'premium' | 'standard' | 'budget' | 'unknown';
  /** Style descriptors */
  style: string[];
  /** Target audience suggestions */
  targetAudience: string[];
  /** Condition assessment (new, used, refurbished) */
  condition: 'new' | 'like_new' | 'good' | 'fair' | 'unknown';
  /** Brand detection if visible */
  detectedBrand?: string;
  /** Text/labels visible in image */
  visibleText: string[];
  /** Overall confidence score (0-100) */
  confidence: number;
  /** Generated title suggestion */
  suggestedTitle: string;
  /** Generated short description */
  suggestedShortDescription: string;
  /** Generated bullet points */
  suggestedBulletPoints: string[];
  /** Suggested keywords based on image */
  suggestedKeywords: string[];
  /** Raw extracted attributes for product creation */
  extractedAttributes: Record<string, string>;
}

export interface ColorInfo {
  name: string;
  hex?: string;
  dominance: 'primary' | 'secondary' | 'accent';
}

export interface FeatureInfo {
  name: string;
  description: string;
  confidence: number;
}

export interface BatchImageAnalysisResult {
  results: Array<{
    imageUrl: string;
    analysis: ImageAnalysisResult;
  }>;
  aggregatedAnalysis?: ProductImageAnalysis;
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * Analyze a single product image using GPT-4 Vision
 */
export async function analyzeProductImage(
  imageUrl: string,
  options: {
    productName?: string;
    category?: string;
    additionalContext?: string;
  } = {},
): Promise<ImageAnalysisResult> {
  if (!env.openaiApiKey) {
    return {
      success: false,
      error:
        'OpenAI API key not configured. Image analysis requires OPENAI_API_KEY.',
    };
  }

  try {
    // Validate image URL
    if (!isValidImageUrl(imageUrl)) {
      return {
        success: false,
        error: 'Invalid image URL. Must be a valid HTTP(S) URL to an image.',
      };
    }

    const prompt = buildAnalysisPrompt(options);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 2000,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `You are an expert e-commerce product analyst specializing in visual product assessment. Your task is to analyze product images and extract detailed information for creating compelling product listings.

IMPORTANT GUIDELINES:
1. Be accurate and specific - don't guess if uncertain
2. Identify key selling points visible in the image
3. Note quality indicators and craftsmanship details
4. Consider target market and positioning
5. Extract all visible text, labels, and branding
6. Provide confidence levels for each assessment`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high',
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`,
      };
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: 'No response from image analysis',
      };
    }

    const analysis = parseAnalysisResponse(content);
    return {
      success: true,
      analysis,
    };
  } catch (error) {
    console.error('Image analysis error:', error);
    return {
      success: false,
      error: `Image analysis failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Analyze multiple product images and aggregate results
 */
export async function analyzeMultipleImages(
  imageUrls: string[],
  options: {
    productName?: string;
    category?: string;
    additionalContext?: string;
  } = {},
): Promise<BatchImageAnalysisResult> {
  const results: BatchImageAnalysisResult['results'] = [];

  // Analyze images in parallel (max 5 concurrent)
  const batchSize = 5;
  for (let i = 0; i < imageUrls.length; i += batchSize) {
    const batch = imageUrls.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (url) => ({
        imageUrl: url,
        analysis: await analyzeProductImage(url, options),
      })),
    );
    results.push(...batchResults);
  }

  // Aggregate successful analyses
  const successfulAnalyses = results
    .filter((r) => r.analysis.success && r.analysis.analysis)
    .map((r) => r.analysis.analysis!);

  if (successfulAnalyses.length > 0) {
    const aggregated = aggregateAnalyses(successfulAnalyses);
    return { results, aggregatedAnalysis: aggregated };
  }

  return { results };
}

/**
 * Generate product description directly from image
 */
export async function generateDescriptionFromImage(
  imageUrl: string,
  options: {
    marketplace?:
      | 'GENERIC'
      | 'AMAZON'
      | 'EBAY'
      | 'SHOPIFY'
      | 'ETSY'
      | 'WALMART';
    tone?: string;
    keywords?: string[];
    language?: string;
  } = {},
): Promise<{
  success: boolean;
  error?: string;
  description?: {
    title: string;
    shortDescription: string;
    longDescription: string;
    bulletPoints: string[];
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    extractedAttributes: Record<string, string>;
  };
}> {
  if (!env.openaiApiKey) {
    return {
      success: false,
      error:
        'OpenAI API key not configured. Image-to-description requires OPENAI_API_KEY.',
    };
  }

  try {
    const {
      marketplace = 'GENERIC',
      tone = 'professional',
      keywords = [],
      language = 'en',
    } = options;
    const constraints = getMarketplaceConstraints(marketplace);
    const languageInstruction =
      language !== 'en'
        ? `Generate all content in ${getLanguageName(language)}.`
        : '';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 2500,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `You are an expert e-commerce copywriter. Analyze the product image and generate a complete, SEO-optimized product listing.

WRITING GUIDELINES:
1. Be accurate - only describe what you can see
2. Focus on benefits, not just features
3. Use the specified tone: ${tone}
4. Include target keywords naturally: ${keywords.join(', ') || 'None specified'}
5. Follow marketplace character limits strictly
${languageInstruction}

MARKETPLACE: ${marketplace}
CHARACTER LIMITS:
- Title: max ${constraints.titleMaxLength} characters
- Short Description: max ${constraints.shortDescMaxLength} characters
- Long Description: max ${constraints.longDescMaxLength} characters
- Bullet Points: ${constraints.bulletPointCount} points, max ${constraints.bulletPointMaxLength} characters each

Respond with valid JSON only.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this product image and generate a complete product listing. Include:

1. Product title (SEO-optimized)
2. Short description (compelling summary)
3. Long description (detailed with features and benefits)
4. Bullet points (key selling points)
5. Meta title and description (for SEO)
6. Keywords
7. Extracted product attributes (color, material, size, etc.)

Response format:
{
  "title": "...",
  "shortDescription": "...",
  "longDescription": "...",
  "bulletPoints": ["...", "..."],
  "metaTitle": "...",
  "metaDescription": "...",
  "keywords": ["...", "..."],
  "extractedAttributes": {
    "color": "...",
    "material": "...",
    ...
  }
}`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high',
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`,
      };
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        error: 'No response from image analysis',
      };
    }

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: false,
        error: 'Failed to parse response as JSON',
      };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      success: true,
      description: {
        title: (parsed.title || '').substring(0, constraints.titleMaxLength),
        shortDescription: (parsed.shortDescription || '').substring(
          0,
          constraints.shortDescMaxLength,
        ),
        longDescription: (parsed.longDescription || '').substring(
          0,
          constraints.longDescMaxLength,
        ),
        bulletPoints: (parsed.bulletPoints || [])
          .slice(0, constraints.bulletPointCount)
          .map((bp: string) =>
            bp.substring(0, constraints.bulletPointMaxLength),
          ),
        metaTitle: (parsed.metaTitle || parsed.title || '').substring(0, 60),
        metaDescription: (
          parsed.metaDescription ||
          parsed.shortDescription ||
          ''
        ).substring(0, 155),
        keywords: parsed.keywords || [],
        extractedAttributes: parsed.extractedAttributes || {},
      },
    };
  } catch (error) {
    console.error('Image-to-description error:', error);
    return {
      success: false,
      error: `Failed to generate description: ${(error as Error).message}`,
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function buildAnalysisPrompt(options: {
  productName?: string;
  category?: string;
  additionalContext?: string;
}): string {
  let prompt = `Analyze this product image in detail. Extract all relevant information for creating a product listing.`;

  if (options.productName) {
    prompt += `\n\nKnown product name: ${options.productName}`;
  }
  if (options.category) {
    prompt += `\nKnown category: ${options.category}`;
  }
  if (options.additionalContext) {
    prompt += `\nAdditional context: ${options.additionalContext}`;
  }

  prompt += `

Respond with a JSON object containing:
{
  "productType": "primary product type",
  "suggestedCategory": "main category",
  "suggestedSubcategory": "subcategory if applicable",
  "colors": [
    {"name": "color name", "hex": "#XXXXXX", "dominance": "primary|secondary|accent"}
  ],
  "materials": ["material1", "material2"],
  "sizeIndicators": ["small", "medium", etc or specific dimensions if visible],
  "features": [
    {"name": "feature name", "description": "brief description", "confidence": 0-100}
  ],
  "qualityLevel": "premium|standard|budget|unknown",
  "style": ["modern", "classic", etc],
  "targetAudience": ["demographic1", "demographic2"],
  "condition": "new|like_new|good|fair|unknown",
  "detectedBrand": "brand name if visible",
  "visibleText": ["text1", "text2"],
  "confidence": 0-100,
  "suggestedTitle": "SEO-optimized product title",
  "suggestedShortDescription": "compelling 1-2 sentence description",
  "suggestedBulletPoints": ["bullet1", "bullet2", "bullet3", "bullet4", "bullet5"],
  "suggestedKeywords": ["keyword1", "keyword2"],
  "extractedAttributes": {
    "key": "value"
  }
}`;

  return prompt;
}

function parseAnalysisResponse(content: string): ProductImageAnalysis {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        productType: parsed.productType || 'Unknown',
        suggestedCategory: parsed.suggestedCategory || 'General',
        suggestedSubcategory: parsed.suggestedSubcategory,
        colors: parsed.colors || [],
        materials: parsed.materials || [],
        sizeIndicators: parsed.sizeIndicators || [],
        features: parsed.features || [],
        qualityLevel: parsed.qualityLevel || 'unknown',
        style: parsed.style || [],
        targetAudience: parsed.targetAudience || [],
        condition: parsed.condition || 'unknown',
        detectedBrand: parsed.detectedBrand,
        visibleText: parsed.visibleText || [],
        confidence: parsed.confidence || 50,
        suggestedTitle: parsed.suggestedTitle || '',
        suggestedShortDescription: parsed.suggestedShortDescription || '',
        suggestedBulletPoints: parsed.suggestedBulletPoints || [],
        suggestedKeywords: parsed.suggestedKeywords || [],
        extractedAttributes: parsed.extractedAttributes || {},
      };
    }
  } catch (error) {
    console.error('Error parsing analysis response:', error);
  }

  // Return default structure if parsing fails
  return {
    productType: 'Unknown',
    suggestedCategory: 'General',
    colors: [],
    materials: [],
    sizeIndicators: [],
    features: [],
    qualityLevel: 'unknown',
    style: [],
    targetAudience: [],
    condition: 'unknown',
    visibleText: [],
    confidence: 0,
    suggestedTitle: '',
    suggestedShortDescription: '',
    suggestedBulletPoints: [],
    suggestedKeywords: [],
    extractedAttributes: {},
  };
}

function aggregateAnalyses(
  analyses: ProductImageAnalysis[],
): ProductImageAnalysis {
  if (analyses.length === 0) {
    return {
      productType: 'Unknown',
      suggestedCategory: 'General',
      colors: [],
      materials: [],
      sizeIndicators: [],
      features: [],
      qualityLevel: 'unknown',
      style: [],
      targetAudience: [],
      condition: 'unknown',
      visibleText: [],
      confidence: 0,
      suggestedTitle: '',
      suggestedShortDescription: '',
      suggestedBulletPoints: [],
      suggestedKeywords: [],
      extractedAttributes: {},
    };
  }

  // Use the highest confidence analysis as base
  const sorted = [...analyses].sort((a, b) => b.confidence - a.confidence);
  const base = sorted[0];

  // Aggregate colors (deduplicate by name)
  const colorMap = new Map<string, ColorInfo>();
  for (const analysis of analyses) {
    for (const color of analysis.colors) {
      if (!colorMap.has(color.name.toLowerCase())) {
        colorMap.set(color.name.toLowerCase(), color);
      }
    }
  }

  // Aggregate materials (deduplicate)
  const materials = [...new Set(analyses.flatMap((a) => a.materials))];

  // Aggregate features (deduplicate by name, keep highest confidence)
  const featureMap = new Map<string, FeatureInfo>();
  for (const analysis of analyses) {
    for (const feature of analysis.features) {
      const existing = featureMap.get(feature.name.toLowerCase());
      if (!existing || feature.confidence > existing.confidence) {
        featureMap.set(feature.name.toLowerCase(), feature);
      }
    }
  }

  // Aggregate keywords
  const keywords = [
    ...new Set(analyses.flatMap((a) => a.suggestedKeywords)),
  ].slice(0, 20);

  // Aggregate bullet points (deduplicate)
  const bulletPoints = [
    ...new Set(analyses.flatMap((a) => a.suggestedBulletPoints)),
  ].slice(0, 10);

  // Aggregate attributes
  const attributes: Record<string, string> = {};
  for (const analysis of analyses) {
    Object.assign(attributes, analysis.extractedAttributes);
  }

  // Average confidence
  const avgConfidence =
    analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length;

  return {
    ...base,
    colors: [...colorMap.values()],
    materials,
    features: [...featureMap.values()],
    suggestedKeywords: keywords,
    suggestedBulletPoints: bulletPoints,
    extractedAttributes: attributes,
    confidence: Math.round(avgConfidence),
  };
}

// Marketplace constraints for description generation
interface MarketplaceConstraints {
  titleMaxLength: number;
  shortDescMaxLength: number;
  longDescMaxLength: number;
  bulletPointCount: number;
  bulletPointMaxLength: number;
}

function getMarketplaceConstraints(
  marketplace: string,
): MarketplaceConstraints {
  const constraints: Record<string, MarketplaceConstraints> = {
    GENERIC: {
      titleMaxLength: 200,
      shortDescMaxLength: 500,
      longDescMaxLength: 5000,
      bulletPointCount: 5,
      bulletPointMaxLength: 500,
    },
    AMAZON: {
      titleMaxLength: 200,
      shortDescMaxLength: 2000,
      longDescMaxLength: 2000,
      bulletPointCount: 5,
      bulletPointMaxLength: 500,
    },
    EBAY: {
      titleMaxLength: 80,
      shortDescMaxLength: 500,
      longDescMaxLength: 4000,
      bulletPointCount: 5,
      bulletPointMaxLength: 300,
    },
    SHOPIFY: {
      titleMaxLength: 255,
      shortDescMaxLength: 500,
      longDescMaxLength: 10000,
      bulletPointCount: 8,
      bulletPointMaxLength: 500,
    },
    ETSY: {
      titleMaxLength: 140,
      shortDescMaxLength: 255,
      longDescMaxLength: 2000,
      bulletPointCount: 5,
      bulletPointMaxLength: 200,
    },
    WALMART: {
      titleMaxLength: 200,
      shortDescMaxLength: 500,
      longDescMaxLength: 4000,
      bulletPointCount: 5,
      bulletPointMaxLength: 500,
    },
  };

  return constraints[marketplace] || constraints.GENERIC;
}

function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    ja: 'Japanese',
    zh: 'Chinese',
    ko: 'Korean',
    ar: 'Arabic',
    nl: 'Dutch',
    ru: 'Russian',
  };
  return languages[code] || code;
}
