/**
 * Multi-Language Generation Service for Product Descriptions
 *
 * Provides:
 * - Description translation to multiple languages
 * - Language-specific SEO optimization
 * - Cultural adaptation for target markets
 * - Batch translation for bulk operations
 * - Language detection and validation
 */

import { env } from '../../../config/env';
import { prisma } from '../../../prisma/client';
import { Marketplace } from '@prisma/client';

// ============================================================================
// TYPES
// ============================================================================

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  marketplace?: Marketplace[];
}

export interface TranslationResult {
  success: boolean;
  error?: string;
  translations?: {
    title: string;
    shortDescription: string;
    longDescription: string;
    bulletPoints: string[];
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
  culturalAdaptations?: string[];
  qualityScore?: number;
}

export interface BatchTranslationResult {
  successful: number;
  failed: number;
  results: Array<{
    descriptionId: number;
    language: string;
    success: boolean;
    error?: string;
    newDescriptionId?: number;
  }>;
}

export interface LanguageDetectionResult {
  detectedLanguage: string;
  confidence: number;
  alternativeLanguages?: Array<{
    code: string;
    confidence: number;
  }>;
}

// ============================================================================
// SUPPORTED LANGUAGES
// ============================================================================

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    direction: 'ltr',
    marketplace: [
      'AMAZON',
      'EBAY',
      'SHOPIFY',
      'ETSY',
      'WALMART',
      'WOOCOMMERCE',
    ],
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    direction: 'ltr',
    marketplace: ['AMAZON', 'EBAY', 'SHOPIFY', 'ETSY', 'WOOCOMMERCE'],
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    direction: 'ltr',
    marketplace: ['AMAZON', 'EBAY', 'SHOPIFY', 'ETSY', 'WOOCOMMERCE'],
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    direction: 'ltr',
    marketplace: ['AMAZON', 'EBAY', 'SHOPIFY', 'ETSY', 'WOOCOMMERCE'],
  },
  {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    direction: 'ltr',
    marketplace: ['AMAZON', 'EBAY', 'SHOPIFY', 'ETSY', 'WOOCOMMERCE'],
  },
  {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    direction: 'ltr',
    marketplace: ['AMAZON', 'SHOPIFY', 'WOOCOMMERCE'],
  },
  {
    code: 'nl',
    name: 'Dutch',
    nativeName: 'Nederlands',
    direction: 'ltr',
    marketplace: ['AMAZON', 'EBAY', 'SHOPIFY', 'WOOCOMMERCE'],
  },
  {
    code: 'pl',
    name: 'Polish',
    nativeName: 'Polski',
    direction: 'ltr',
    marketplace: ['AMAZON', 'SHOPIFY', 'WOOCOMMERCE'],
  },
  {
    code: 'sv',
    name: 'Swedish',
    nativeName: 'Svenska',
    direction: 'ltr',
    marketplace: ['AMAZON', 'SHOPIFY', 'WOOCOMMERCE'],
  },
  {
    code: 'da',
    name: 'Danish',
    nativeName: 'Dansk',
    direction: 'ltr',
    marketplace: ['AMAZON', 'SHOPIFY', 'WOOCOMMERCE'],
  },
  {
    code: 'no',
    name: 'Norwegian',
    nativeName: 'Norsk',
    direction: 'ltr',
    marketplace: ['SHOPIFY', 'WOOCOMMERCE'],
  },
  {
    code: 'fi',
    name: 'Finnish',
    nativeName: 'Suomi',
    direction: 'ltr',
    marketplace: ['SHOPIFY', 'WOOCOMMERCE'],
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    direction: 'ltr',
    marketplace: ['AMAZON', 'SHOPIFY', 'WOOCOMMERCE'],
  },
  {
    code: 'zh',
    name: 'Chinese (Simplified)',
    nativeName: '简体中文',
    direction: 'ltr',
    marketplace: ['AMAZON', 'SHOPIFY', 'WOOCOMMERCE'],
  },
  {
    code: 'zh-TW',
    name: 'Chinese (Traditional)',
    nativeName: '繁體中文',
    direction: 'ltr',
    marketplace: ['SHOPIFY', 'WOOCOMMERCE'],
  },
  {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    direction: 'ltr',
    marketplace: ['AMAZON', 'SHOPIFY', 'WOOCOMMERCE'],
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    direction: 'rtl',
    marketplace: ['AMAZON', 'SHOPIFY', 'WOOCOMMERCE'],
  },
  {
    code: 'he',
    name: 'Hebrew',
    nativeName: 'עברית',
    direction: 'rtl',
    marketplace: ['SHOPIFY', 'WOOCOMMERCE'],
  },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    direction: 'ltr',
    marketplace: ['SHOPIFY', 'WOOCOMMERCE'],
  },
  {
    code: 'tr',
    name: 'Turkish',
    nativeName: 'Türkçe',
    direction: 'ltr',
    marketplace: ['AMAZON', 'SHOPIFY', 'WOOCOMMERCE'],
  },
];

// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

/**
 * Get list of supported languages
 */
export function getSupportedLanguages(
  marketplace?: Marketplace,
): SupportedLanguage[] {
  if (!marketplace) {
    return SUPPORTED_LANGUAGES;
  }
  return SUPPORTED_LANGUAGES.filter(
    (lang) => !lang.marketplace || lang.marketplace.includes(marketplace),
  );
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(
  code: string,
  marketplace?: Marketplace,
): boolean {
  const languages = getSupportedLanguages(marketplace);
  return languages.some(
    (lang) => lang.code === code || lang.code.startsWith(code),
  );
}

/**
 * Get language info by code
 */
export function getLanguageInfo(code: string): SupportedLanguage | undefined {
  return SUPPORTED_LANGUAGES.find(
    (lang) => lang.code === code || lang.code.startsWith(code),
  );
}

/**
 * Translate a product description to a target language
 */
export async function translateDescription(
  descriptionId: number,
  targetLanguage: string,
  options: {
    culturalAdaptation?: boolean;
    preserveKeywords?: boolean;
    marketplace?: Marketplace;
  } = {},
): Promise<TranslationResult> {
  const {
    culturalAdaptation = true,
    preserveKeywords = false,
    marketplace,
  } = options;

  // Validate language
  if (!isLanguageSupported(targetLanguage, marketplace)) {
    return {
      success: false,
      error: `Language '${targetLanguage}' is not supported${marketplace ? ` for ${marketplace}` : ''}`,
    };
  }

  // Get source description
  const description = await prisma.productDescription.findUnique({
    where: { id: descriptionId },
    include: { product: { select: { name: true, category: true } } },
  });

  if (!description) {
    return {
      success: false,
      error: 'Description not found',
    };
  }

  // Check if already in target language
  if (description.language === targetLanguage) {
    return {
      success: false,
      error: 'Description is already in the target language',
    };
  }

  if (!env.openaiApiKey) {
    return {
      success: false,
      error:
        'OpenAI API key not configured. Translation requires OPENAI_API_KEY.',
    };
  }

  const languageInfo = getLanguageInfo(targetLanguage);
  const languageName = languageInfo?.name || targetLanguage;

  try {
    const prompt = buildTranslationPrompt(
      description,
      languageName,
      targetLanguage,
      culturalAdaptation,
      preserveKeywords,
    );

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 2500,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content: `You are an expert e-commerce translator and localization specialist. Your task is to translate product descriptions while maintaining:
1. SEO effectiveness in the target language
2. Cultural appropriateness for the target market
3. Proper product terminology and measurements
4. Natural, native-sounding language

IMPORTANT: Never translate brand names unless they have official translations.`,
          },
          {
            role: 'user',
            content: prompt,
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
        error: 'No response from translation service',
      };
    }

    // Parse response
    const result = parseTranslationResponse(content);
    return result;
  } catch (error) {
    console.error('Translation error:', error);
    return {
      success: false,
      error: `Translation failed: ${(error as Error).message}`,
    };
  }
}

/**
 * Create a translated copy of a description
 */
export async function createTranslatedDescription(
  descriptionId: number,
  targetLanguage: string,
  options: {
    culturalAdaptation?: boolean;
    preserveKeywords?: boolean;
    marketplace?: Marketplace;
  } = {},
): Promise<{
  success: boolean;
  error?: string;
  descriptionId?: number;
}> {
  const translationResult = await translateDescription(
    descriptionId,
    targetLanguage,
    options,
  );

  if (!translationResult.success || !translationResult.translations) {
    return {
      success: false,
      error: translationResult.error || 'Translation failed',
    };
  }

  // Get source description to copy metadata
  const source = await prisma.productDescription.findUnique({
    where: { id: descriptionId },
  });

  if (!source) {
    return {
      success: false,
      error: 'Source description not found',
    };
  }

  // Create translated description
  const translated = await prisma.productDescription.create({
    data: {
      productId: source.productId,
      title: translationResult.translations.title,
      shortDescription: translationResult.translations.shortDescription,
      longDescription: translationResult.translations.longDescription,
      bulletPoints: translationResult.translations.bulletPoints,
      metaTitle: translationResult.translations.metaTitle,
      metaDescription: translationResult.translations.metaDescription,
      keywords: translationResult.translations.keywords,
      marketplace: source.marketplace,
      language: targetLanguage,
      variant: source.variant,
      isControl: false,
      templateId: source.templateId,
    },
  });

  return {
    success: true,
    descriptionId: translated.id,
  };
}

/**
 * Batch translate descriptions to multiple languages
 */
export async function batchTranslateDescriptions(
  descriptionIds: number[],
  targetLanguages: string[],
  options: {
    culturalAdaptation?: boolean;
    preserveKeywords?: boolean;
  } = {},
): Promise<BatchTranslationResult> {
  const results: BatchTranslationResult['results'] = [];
  let successful = 0;
  let failed = 0;

  for (const descriptionId of descriptionIds) {
    for (const language of targetLanguages) {
      const result = await createTranslatedDescription(
        descriptionId,
        language,
        options,
      );

      if (result.success) {
        successful++;
        results.push({
          descriptionId,
          language,
          success: true,
          newDescriptionId: result.descriptionId,
        });
      } else {
        failed++;
        results.push({
          descriptionId,
          language,
          success: false,
          error: result.error,
        });
      }
    }
  }

  return { successful, failed, results };
}

/**
 * Detect the language of a text
 */
export async function detectLanguage(
  text: string,
): Promise<LanguageDetectionResult> {
  if (!env.openaiApiKey) {
    // Simple fallback detection based on character patterns
    return detectLanguageSimple(text);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 100,
        temperature: 0,
        messages: [
          {
            role: 'system',
            content:
              'You are a language detection system. Respond only with JSON.',
          },
          {
            role: 'user',
            content: `Detect the language of this text and return JSON:
{"language": "ISO 639-1 code", "confidence": 0-100, "alternatives": [{"code": "...", "confidence": ...}]}

Text: "${text.substring(0, 500)}"`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return detectLanguageSimple(text);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    const parsed = JSON.parse(content);

    return {
      detectedLanguage: parsed.language || 'en',
      confidence: parsed.confidence || 50,
      alternativeLanguages: parsed.alternatives,
    };
  } catch (error) {
    console.error('Language detection error:', error);
    return detectLanguageSimple(text);
  }
}

/**
 * Get language statistics for a config's descriptions
 */
export async function getLanguageStats(configId: number): Promise<
  Array<{
    language: string;
    languageName: string;
    count: number;
    percentage: number;
  }>
> {
  const stats = await prisma.productDescription.groupBy({
    by: ['language'],
    where: { product: { configId } },
    _count: true,
  });

  const total = stats.reduce((sum, s) => sum + s._count, 0);

  return stats
    .map((s) => ({
      language: s.language,
      languageName: getLanguageInfo(s.language)?.name || s.language,
      count: s._count,
      percentage: total > 0 ? (s._count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function buildTranslationPrompt(
  description: {
    title: string;
    shortDescription: string;
    longDescription: string;
    bulletPoints: string[];
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    language: string;
    product: { name: string; category: string | null };
  },
  targetLanguageName: string,
  targetLanguageCode: string,
  culturalAdaptation: boolean,
  preserveKeywords: boolean,
): string {
  const sourceLanguage =
    getLanguageInfo(description.language)?.name || description.language;

  let prompt = `Translate this ${sourceLanguage} product description to ${targetLanguageName} (${targetLanguageCode}).

PRODUCT: ${description.product.name}
CATEGORY: ${description.product.category || 'General'}

SOURCE CONTENT:
Title: ${description.title}
Short Description: ${description.shortDescription}
Long Description: ${description.longDescription}
Bullet Points:
${description.bulletPoints.map((bp, i) => `${i + 1}. ${bp}`).join('\n')}
Meta Title: ${description.metaTitle}
Meta Description: ${description.metaDescription}
Keywords: ${description.keywords.join(', ')}`;

  if (culturalAdaptation) {
    prompt += `

CULTURAL ADAPTATION REQUIRED:
- Adapt measurements to local standards (metric/imperial)
- Adjust color names if they have different cultural associations
- Modify idioms to local equivalents
- Consider local shopping preferences
- List any cultural adaptations made`;
  }

  if (preserveKeywords) {
    prompt += `

KEYWORD PRESERVATION:
- Keep brand names unchanged
- Preserve technical terms if commonly used in ${targetLanguageName}`;
  }

  prompt += `

Respond with JSON:
{
  "title": "translated title",
  "shortDescription": "translated short description",
  "longDescription": "translated long description",
  "bulletPoints": ["bullet 1", "bullet 2", ...],
  "metaTitle": "translated meta title (max 60 chars)",
  "metaDescription": "translated meta description (max 155 chars)",
  "keywords": ["keyword1", "keyword2", ...],
  "culturalAdaptations": ["list of adaptations made"],
  "qualityScore": 0-100
}`;

  return prompt;
}

function parseTranslationResponse(content: string): TranslationResult {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        translations: {
          title: parsed.title || '',
          shortDescription: parsed.shortDescription || '',
          longDescription: parsed.longDescription || '',
          bulletPoints: parsed.bulletPoints || [],
          metaTitle: (parsed.metaTitle || parsed.title || '').substring(0, 60),
          metaDescription: (
            parsed.metaDescription ||
            parsed.shortDescription ||
            ''
          ).substring(0, 155),
          keywords: parsed.keywords || [],
        },
        culturalAdaptations: parsed.culturalAdaptations || [],
        qualityScore: parsed.qualityScore || 80,
      };
    }
  } catch (error) {
    console.error('Error parsing translation response:', error);
  }

  return {
    success: false,
    error: 'Failed to parse translation response',
  };
}

function detectLanguageSimple(text: string): LanguageDetectionResult {
  // Simple character-based detection
  const sample = text.substring(0, 200);

  // Check for specific character sets
  if (/[\u4e00-\u9fff]/.test(sample)) {
    return {
      detectedLanguage: 'zh',
      confidence: 80,
      alternativeLanguages: [{ code: 'ja', confidence: 20 }],
    };
  }
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(sample)) {
    return { detectedLanguage: 'ja', confidence: 90 };
  }
  if (/[\uac00-\ud7af]/.test(sample)) {
    return { detectedLanguage: 'ko', confidence: 90 };
  }
  if (/[\u0600-\u06ff]/.test(sample)) {
    return {
      detectedLanguage: 'ar',
      confidence: 85,
      alternativeLanguages: [{ code: 'fa', confidence: 10 }],
    };
  }
  if (/[\u0590-\u05ff]/.test(sample)) {
    return { detectedLanguage: 'he', confidence: 90 };
  }
  if (/[\u0400-\u04ff]/.test(sample)) {
    return {
      detectedLanguage: 'ru',
      confidence: 80,
      alternativeLanguages: [{ code: 'uk', confidence: 15 }],
    };
  }

  // Default to English for Latin scripts
  return {
    detectedLanguage: 'en',
    confidence: 60,
    alternativeLanguages: [
      { code: 'es', confidence: 15 },
      { code: 'fr', confidence: 10 },
      { code: 'de', confidence: 10 },
    ],
  };
}
