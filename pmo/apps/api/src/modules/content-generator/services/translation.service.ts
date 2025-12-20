/**
 * Translation Service
 *
 * Provides multi-language support for generated content including:
 * - AI-powered content translation
 * - Translation relationship management
 * - Batch translation capabilities
 * - Language support listing
 */

import { prisma } from '../../../prisma/client';
import { env } from '../../../config/env';

// ============================================================================
// SUPPORTED LANGUAGES
// ============================================================================

export interface SupportedLanguage {
  code: string; // ISO 639-1
  name: string;
  nativeName: string;
  rtl?: boolean; // Right-to-left
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', rtl: true },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', rtl: true },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi' },
];

// ============================================================================
// TYPES
// ============================================================================

export interface TranslateContentInput {
  targetLanguage: string;
  preserveFormatting?: boolean;
  preservePlaceholders?: boolean;
  customInstructions?: string;
}

export interface BatchTranslateInput {
  contentIds: number[];
  targetLanguages: string[];
  preserveFormatting?: boolean;
  preservePlaceholders?: boolean;
}

export interface TranslationResult {
  success: boolean;
  translatedContentId?: number;
  error?: string;
}

export interface BatchTranslationResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    originalId: number;
    targetLanguage: string;
    result: TranslationResult;
  }>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getLanguageName(code: string): string {
  const language = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return language?.name || code;
}

function isValidLanguageCode(code: string): boolean {
  return SUPPORTED_LANGUAGES.some((l) => l.code === code);
}

// ============================================================================
// SERVICE FUNCTIONS
// ============================================================================

/**
 * Get list of supported languages
 */
export function getSupportedLanguages(): SupportedLanguage[] {
  return SUPPORTED_LANGUAGES;
}

/**
 * Translate content to a target language
 */
export async function translateContent(
  configId: number,
  contentId: number,
  input: TranslateContentInput,
): Promise<TranslationResult> {
  try {
    // Validate target language
    if (!isValidLanguageCode(input.targetLanguage)) {
      return {
        success: false,
        error: `Unsupported language: ${input.targetLanguage}. Use GET /languages for supported languages.`,
      };
    }

    // Get the original content
    const content = await prisma.generatedContent.findFirst({
      where: { id: contentId, configId },
      include: { config: true },
    });

    if (!content) {
      return {
        success: false,
        error: 'Content not found',
      };
    }

    // Check if translation already exists
    const existingTranslation = await prisma.generatedContent.findFirst({
      where: {
        OR: [
          { parentTranslationId: contentId, language: input.targetLanguage },
          {
            parentTranslationId: content.parentTranslationId || contentId,
            language: input.targetLanguage,
          },
        ],
      },
    });

    if (existingTranslation) {
      return {
        success: true,
        translatedContentId: existingTranslation.id,
      };
    }

    // Check if same language
    if (content.language === input.targetLanguage) {
      return {
        success: false,
        error: 'Content is already in the target language',
      };
    }

    // Generate translation using AI
    const translatedContent = await generateTranslation(content, input);

    // Create translated content record
    const translatedRecord = await prisma.generatedContent.create({
      data: {
        configId,
        title: translatedContent.title,
        type: content.type,
        content: translatedContent.content,
        contentHtml: translatedContent.contentHtml,
        metaTitle: translatedContent.metaTitle,
        metaDescription: translatedContent.metaDescription,
        keywords: content.keywords, // Keep same keywords
        language: input.targetLanguage,
        parentTranslationId: content.parentTranslationId || contentId, // Link to original or root
        prompt: `Translation from ${content.language} to ${input.targetLanguage}`,
        modelUsed: 'gpt-4o-mini',
        generationParams: {
          originalContentId: contentId,
          sourceLanguage: content.language,
          targetLanguage: input.targetLanguage,
          preserveFormatting: input.preserveFormatting ?? true,
          preservePlaceholders: input.preservePlaceholders ?? true,
        },
      },
    });

    return {
      success: true,
      translatedContentId: translatedRecord.id,
    };
  } catch (error) {
    console.error('Translation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Translation failed',
    };
  }
}

/**
 * Batch translate multiple contents to multiple languages
 */
export async function batchTranslate(
  configId: number,
  input: BatchTranslateInput,
): Promise<BatchTranslationResult> {
  const results: BatchTranslationResult['results'] = [];
  let successful = 0;
  let failed = 0;

  for (const contentId of input.contentIds) {
    for (const targetLanguage of input.targetLanguages) {
      const result = await translateContent(configId, contentId, {
        targetLanguage,
        preserveFormatting: input.preserveFormatting,
        preservePlaceholders: input.preservePlaceholders,
      });

      results.push({
        originalId: contentId,
        targetLanguage,
        result,
      });

      if (result.success) {
        successful++;
      } else {
        failed++;
      }
    }
  }

  return {
    total: input.contentIds.length * input.targetLanguages.length,
    successful,
    failed,
    results,
  };
}

/**
 * Get all translations of a content piece
 */
export async function getContentTranslations(
  configId: number,
  contentId: number,
): Promise<
  Array<{
    id: number;
    language: string;
    languageName: string;
    title: string;
    createdAt: Date;
  }>
> {
  // Get the content to find root
  const content = await prisma.generatedContent.findFirst({
    where: { id: contentId, configId },
  });

  if (!content) {
    return [];
  }

  const rootId = content.parentTranslationId || contentId;

  // Get all translations including the root
  const translations = await prisma.generatedContent.findMany({
    where: {
      configId,
      OR: [{ id: rootId }, { parentTranslationId: rootId }],
    },
    select: {
      id: true,
      language: true,
      title: true,
      createdAt: true,
    },
    orderBy: { language: 'asc' },
  });

  return translations.map((t) => ({
    ...t,
    languageName: getLanguageName(t.language),
  }));
}

/**
 * Delete a translation (but not the original)
 */
export async function deleteTranslation(
  configId: number,
  translationId: number,
): Promise<{ success: boolean; error?: string }> {
  const content = await prisma.generatedContent.findFirst({
    where: { id: translationId, configId },
  });

  if (!content) {
    return { success: false, error: 'Translation not found' };
  }

  if (!content.parentTranslationId) {
    return {
      success: false,
      error: 'Cannot delete original content. Use delete endpoint instead.',
    };
  }

  await prisma.generatedContent.delete({
    where: { id: translationId },
  });

  return { success: true };
}

// ============================================================================
// AI TRANSLATION HELPER
// ============================================================================

interface TranslatedContentParts {
  title: string;
  content: string;
  contentHtml?: string;
  metaTitle?: string;
  metaDescription?: string;
}

async function generateTranslation(
  content: {
    title: string;
    content: string;
    contentHtml: string | null;
    metaTitle: string | null;
    metaDescription: string | null;
    language: string;
    type: string;
  },
  input: TranslateContentInput,
): Promise<TranslatedContentParts> {
  const openAIKey = env.OPENAI_API_KEY;

  // If no API key, return placeholder translations
  if (!openAIKey) {
    console.log(
      'No OpenAI API key configured. Returning placeholder translations.',
    );
    const targetLang = getLanguageName(input.targetLanguage);
    return {
      title: `[${targetLang}] ${content.title}`,
      content: `[Translated to ${targetLang}]\n\n${content.content}`,
      contentHtml: content.contentHtml
        ? `<p><em>[Translated to ${targetLang}]</em></p>${content.contentHtml}`
        : undefined,
      metaTitle: content.metaTitle
        ? `[${targetLang}] ${content.metaTitle}`
        : undefined,
      metaDescription: content.metaDescription
        ? `[${targetLang}] ${content.metaDescription}`
        : undefined,
    };
  }

  const sourceLang = getLanguageName(content.language);
  const targetLang = getLanguageName(input.targetLanguage);

  const systemPrompt = `You are a professional translator specializing in marketing and business content.
Your task is to translate content from ${sourceLang} to ${targetLang}.

Guidelines:
- Maintain the original tone, style, and brand voice
- ${input.preserveFormatting !== false ? 'Preserve all formatting, including headers, lists, paragraphs' : 'Adapt formatting for target language'}
- ${input.preservePlaceholders !== false ? 'Keep all placeholders (e.g., {{variable_name}}) unchanged' : 'Translate placeholders if culturally appropriate'}
- Adapt idioms and cultural references for the target audience
- Maintain SEO keywords in naturally translated form
- Keep URLs, email addresses, and technical terms unchanged unless they should be localized
${input.customInstructions ? `\nAdditional instructions: ${input.customInstructions}` : ''}

Content type: ${content.type}`;

  const userPrompt = `Translate the following content to ${targetLang}:

TITLE:
${content.title}

MAIN CONTENT:
${content.content}

${content.metaTitle ? `META TITLE:\n${content.metaTitle}\n` : ''}
${content.metaDescription ? `META DESCRIPTION:\n${content.metaDescription}` : ''}

Return the translation in this exact JSON format:
{
  "title": "translated title",
  "content": "translated main content",
  "metaTitle": "translated meta title or null",
  "metaDescription": "translated meta description or null"
}`;

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
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3, // Lower temperature for more consistent translations
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const translated = JSON.parse(data.choices[0].message.content) as {
    title: string;
    content: string;
    metaTitle?: string;
    metaDescription?: string;
  };

  // Generate HTML version if original had one
  let contentHtml: string | undefined;
  if (content.contentHtml) {
    contentHtml = translateHtmlContent(content.contentHtml, translated.content);
  }

  return {
    title: translated.title,
    content: translated.content,
    contentHtml,
    metaTitle: translated.metaTitle || undefined,
    metaDescription: translated.metaDescription || undefined,
  };
}

/**
 * Simple HTML content translation - replaces text content while preserving structure
 * For complex HTML, a more sophisticated approach would be needed
 */
function translateHtmlContent(
  _originalHtml: string,
  translatedPlainText: string,
): string {
  // Simple conversion of translated plain text to HTML
  // A more sophisticated implementation would parse and translate HTML nodes
  return translatedPlainText
    .split('\n\n')
    .map((paragraph) => {
      if (paragraph.startsWith('# ')) {
        return `<h1>${paragraph.slice(2)}</h1>`;
      }
      if (paragraph.startsWith('## ')) {
        return `<h2>${paragraph.slice(3)}</h2>`;
      }
      if (paragraph.startsWith('### ')) {
        return `<h3>${paragraph.slice(4)}</h3>`;
      }
      if (paragraph.startsWith('- ') || paragraph.startsWith('* ')) {
        const items = paragraph
          .split('\n')
          .map((line) => `<li>${line.replace(/^[-*]\s/, '')}</li>`)
          .join('');
        return `<ul>${items}</ul>`;
      }
      return `<p>${paragraph}</p>`;
    })
    .join('\n');
}
