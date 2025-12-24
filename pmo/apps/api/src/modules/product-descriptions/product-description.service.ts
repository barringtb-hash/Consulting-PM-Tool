/**
 * Tool 1.2: Product Description Generator Service
 *
 * AI-powered product description generation with:
 * - SEO-optimized content generation
 * - Multi-marketplace formatting
 * - Brand voice matching (enhanced)
 * - Template-driven generation
 * - Bulk processing capabilities
 * - A/B testing variants
 * - Multi-language support
 * - Compliance checking
 */

import { prisma } from '../../prisma/client';
import { env } from '../../config/env';
import {
  Marketplace,
  GenerationJobStatus,
  Prisma,
  ComplianceMode as _ComplianceMode,
} from '@prisma/client';

// Re-export for future use
export { _ComplianceMode as ComplianceMode };

// Import brand voice and template services
import {
  getBrandVoiceProfile,
  buildBrandVoicePrompt,
  BrandVoiceProfile,
} from './services/brand-voice.service';
import {
  getMatchingTemplate,
  getTemplateById,
  buildTemplatePrompt,
  ensureBuiltInTemplates,
  AppliedTemplate,
} from './services/template.service';

// Re-export services for router access
export * from './services/brand-voice.service';
export * from './services/template.service';
export * from './services/bulk-import.service';
export * from './services/bulk-job.service';
export * from './services/seo.service';
export * from './services/compliance.service';
export * from './services/image-analysis.service';
export * from './services/analytics.service';
export * from './services/multilang.service';
export * from './services/crm-integration.service';

// ============================================================================
// TYPES
// ============================================================================

interface ProductDescriptionConfigInput {
  defaultTone?: string;
  defaultLength?: string;
  brandVoiceProfile?: Prisma.InputJsonValue;
  enableSEO?: boolean;
  targetKeywords?: string[];
}

interface ProductInput {
  name: string;
  sku?: string;
  category?: string;
  subcategory?: string;
  attributes?: Prisma.InputJsonValue;
  imageUrls?: string[];
  sourceDescription?: string;
}

interface GenerationOptions {
  marketplace?: Marketplace;
  tone?: string;
  length?: string;
  keywords?: string[];
  generateVariants?: boolean;
  variantCount?: number;
  templateId?: number;
  language?: string;
}

interface GeneratedDescription {
  title: string;
  shortDescription: string;
  longDescription: string;
  bulletPoints: string[];
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
}

// ============================================================================
// CONFIG MANAGEMENT
// ============================================================================

export async function getProductDescriptionConfig(clientId: number) {
  return prisma.productDescriptionConfig.findUnique({
    where: { clientId },
    include: {
      client: { select: { id: true, name: true, industry: true } },
      products: {
        where: { isActive: true },
        take: 10,
        orderBy: { updatedAt: 'desc' },
      },
    },
  });
}

export async function listProductDescriptionConfigs(filters?: {
  clientId?: number;
  tenantId?: string;
}) {
  // Build where clause with tenant filtering for multi-tenant isolation
  const where: Prisma.ProductDescriptionConfigWhereInput = {};

  // Security: In production with multi-tenant enabled, require tenant filtering
  // to prevent cross-tenant data leakage
  const isProduction = env.nodeEnv === 'production';
  const isMultiTenant = env.multiTenantEnabled !== false;

  if (isProduction && isMultiTenant && !filters?.tenantId) {
    // Return empty result set to prevent exposing all tenant data
    return [];
  }

  if (filters?.tenantId) {
    where.tenantId = filters.tenantId;
  }

  if (filters?.clientId) {
    where.clientId = filters.clientId;
  }

  return prisma.productDescriptionConfig.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    include: {
      client: { select: { id: true, name: true, industry: true } },
      _count: { select: { products: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createProductDescriptionConfig(
  accountId: number,
  data: ProductDescriptionConfigInput & { tenantId: string; clientId?: number },
) {
  const { tenantId, clientId, ...configData } = data;
  return prisma.productDescriptionConfig.create({
    data: {
      tenantId,
      accountId,
      clientId,
      ...configData,
    },
  });
}

export async function updateProductDescriptionConfig(
  clientId: number,
  data: Partial<ProductDescriptionConfigInput>,
) {
  return prisma.productDescriptionConfig.update({
    where: { clientId },
    data,
  });
}

/**
 * Find or create an Account for a legacy Client.
 * This bridges the gap between the legacy Client-based API and the new Account-based schema.
 * Uses a transaction to prevent race conditions when multiple requests arrive simultaneously.
 */
export async function findOrCreateAccountForClient(
  clientId: number,
  tenantId: string,
  userId: number,
): Promise<number | null> {
  return prisma.$transaction(async (tx) => {
    // First, get the Client details with tenant isolation
    const client = await tx.client.findFirst({
      where: {
        id: clientId,
        OR: [{ tenantId }, { tenantId: null }],
      },
      select: {
        id: true,
        name: true,
        industry: true,
        website: true,
        phone: true,
      },
    });

    if (!client) {
      return null;
    }

    // Try to find an existing Account linked to this Client via customFields
    const existingAccountByLegacyId = await tx.account.findFirst({
      where: {
        tenantId,
        customFields: {
          path: ['legacyClientId'],
          equals: clientId,
        },
      },
      select: { id: true },
    });

    if (existingAccountByLegacyId) {
      return existingAccountByLegacyId.id;
    }

    // Try to find an Account with the same name (case-insensitive)
    const existingAccountByName = await tx.account.findFirst({
      where: {
        tenantId,
        name: {
          equals: client.name,
          mode: 'insensitive',
        },
      },
      select: { id: true, customFields: true },
    });

    if (existingAccountByName) {
      // Update the Account to link to this Client, preserving existing customFields
      const existingCustomFields =
        (existingAccountByName.customFields as Record<string, unknown>) || {};
      await tx.account.update({
        where: { id: existingAccountByName.id },
        data: {
          customFields: {
            ...existingCustomFields,
            legacyClientId: clientId,
          },
        },
      });
      return existingAccountByName.id;
    }

    // Create a new Account from the Client data
    const newAccount = await tx.account.create({
      data: {
        tenantId,
        name: client.name,
        industry: client.industry,
        website: client.website,
        phone: client.phone,
        ownerId: userId,
        type: 'CUSTOMER',
        customFields: {
          legacyClientId: clientId,
        },
      },
    });

    return newAccount.id;
  });
}

// ============================================================================
// PRODUCT MANAGEMENT
// ============================================================================

export async function createProduct(configId: number, data: ProductInput) {
  return prisma.product.create({
    data: {
      configId,
      ...data,
    },
  });
}

export async function getProducts(
  configId: number,
  options: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  const { category, search, limit = 50, offset = 0 } = options;

  return prisma.product.findMany({
    where: {
      configId,
      isActive: true,
      ...(category && { category }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    include: {
      descriptions: {
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

export async function getProduct(id: number) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      descriptions: {
        orderBy: { createdAt: 'desc' },
      },
      config: true,
    },
  });
}

export async function updateProduct(id: number, data: Partial<ProductInput>) {
  return prisma.product.update({
    where: { id },
    data,
  });
}

export async function deleteProduct(id: number) {
  return prisma.product.update({
    where: { id },
    data: { isActive: false },
  });
}

export async function getDescription(id: number) {
  return prisma.productDescription.findUnique({
    where: { id },
  });
}

export async function updateDescriptionSEOScore(id: number, seoScore: number) {
  return prisma.productDescription.update({
    where: { id },
    data: { seoScore },
  });
}

export async function updateDescriptionComplianceStatus(
  id: number,
  complianceStatus: 'PENDING' | 'APPROVED' | 'FLAGGED' | 'REQUIRES_REVIEW',
) {
  return prisma.productDescription.update({
    where: { id },
    data: { complianceStatus },
  });
}

// ============================================================================
// DESCRIPTION GENERATION
// ============================================================================

export async function generateDescription(
  productId: number,
  options: GenerationOptions = {},
): Promise<{ description: unknown; variants?: unknown[] }> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      config: true,
    },
  });

  if (!product) {
    throw new Error('Product not found');
  }

  const {
    marketplace = 'GENERIC',
    generateVariants = false,
    variantCount = 2,
    templateId,
    language = 'en',
  } = options;

  // Get marketplace constraints
  const constraints = getMarketplaceConstraints(marketplace);

  // Ensure built-in templates exist for this config
  await ensureBuiltInTemplates(product.configId);

  // Get brand voice profile
  const brandVoiceProfile = await getBrandVoiceProfile(product.configId);

  // Get template (from templateId or matching template)
  let template: AppliedTemplate | null = null;
  if (templateId) {
    template = await getTemplateById(templateId);
  }
  if (!template) {
    template = await getMatchingTemplate(
      product.configId,
      marketplace,
      product.category || undefined,
    );
  }

  // Generate main description with brand voice and template
  const generated = await generateDescriptionContent(
    product,
    options,
    constraints,
    brandVoiceProfile,
    template,
  );

  // Save main description
  const description = await prisma.productDescription.create({
    data: {
      productId,
      ...generated,
      marketplace,
      language,
      templateId: templateId || undefined,
      isControl: true,
    },
  });

  // Generate variants if requested
  const variants: unknown[] = [];
  if (generateVariants) {
    const variantTones = ['casual', 'enthusiastic', 'professional', 'playful'];
    for (let i = 0; i < variantCount; i++) {
      const variantContent = await generateDescriptionContent(
        product,
        { ...options, tone: variantTones[i % variantTones.length] },
        constraints,
        brandVoiceProfile,
        template,
      );

      const variant = await prisma.productDescription.create({
        data: {
          productId,
          ...variantContent,
          marketplace,
          language,
          templateId: templateId || undefined,
          variant: String.fromCharCode(65 + i + 1), // B, C, D, etc.
          isControl: false,
        },
      });
      variants.push(variant);
    }
  }

  return { description, variants };
}

async function generateDescriptionContent(
  product: {
    name: string;
    category: string | null;
    subcategory: string | null;
    attributes: unknown;
    sourceDescription: string | null;
    config: {
      defaultTone: string | null;
      brandVoiceProfile: unknown;
      enableSEO: boolean;
      targetKeywords: string[];
    };
  },
  options: GenerationOptions,
  constraints: MarketplaceConstraints,
  brandVoiceProfile: BrandVoiceProfile | null = null,
  template: AppliedTemplate | null = null,
): Promise<GeneratedDescription> {
  const tone = options.tone || product.config.defaultTone || 'professional';
  const length = options.length || 'medium';
  const language = options.language || 'en';
  const keywords = [
    ...(options.keywords || []),
    ...product.config.targetKeywords,
  ];

  if (env.openaiApiKey) {
    try {
      const prompt = buildGenerationPrompt(
        product,
        tone,
        length,
        keywords,
        constraints,
        template,
        language,
      );

      // Build brand voice instructions
      const brandVoiceInstructions = brandVoiceProfile
        ? buildBrandVoicePrompt(brandVoiceProfile)
        : '';

      // Build template instructions
      const templateInstructions = template
        ? buildTemplatePrompt(template)
        : '';

      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.openaiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 2000,
            temperature: 0.7,
            messages: [
              {
                role: 'system',
                content: `You are an expert e-commerce copywriter specializing in SEO-optimized product descriptions. Write compelling, accurate descriptions that convert browsers into buyers.

IMPORTANT GUIDELINES:
1. Never make false claims or exaggerate product features
2. Focus on benefits, not just features
3. Use natural language that includes target keywords
4. Follow marketplace-specific character limits strictly
5. Write unique content - don't copy source descriptions verbatim
6. Generate content in the specified language
${brandVoiceInstructions}
${templateInstructions}`,
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        const content = data.choices[0].message.content;
        return parseGeneratedContent(content, constraints);
      }
    } catch (error) {
      console.error('Description generation error:', error);
    }
  }

  // Fallback to template-based generation
  return generateTemplateDescription(product, tone, constraints, template);
}

function buildGenerationPrompt(
  product: {
    name: string;
    category: string | null;
    subcategory: string | null;
    attributes: unknown;
    sourceDescription: string | null;
  },
  tone: string,
  length: string,
  keywords: string[],
  constraints: MarketplaceConstraints,
  template: AppliedTemplate | null = null,
  language: string = 'en',
): string {
  const languageInstruction =
    language !== 'en'
      ? `\nIMPORTANT: Generate all content in ${getLanguageName(language)} (language code: ${language}). Ensure proper grammar, idioms, and cultural appropriateness for ${language} speakers.`
      : '';

  const templateInstruction = template
    ? `\nTemplate Structure to Follow:
- Title Format: ${template.titleTemplate || 'Standard format'}
- Short Description Format: ${template.shortDescTemplate || 'Standard format'}
- Long Description Format: ${template.longDescTemplate || 'Standard format'}
- Bullet Format: ${template.bulletTemplate || 'Standard format'}

Replace {{variable}} placeholders with appropriate product information.`
    : '';

  return `Generate a product description for the following product:

Product Name: ${product.name}
Category: ${product.category || 'General'}${product.subcategory ? ` > ${product.subcategory}` : ''}
Attributes: ${JSON.stringify(product.attributes || {})}
${product.sourceDescription ? `Source/Reference Description: ${product.sourceDescription}` : ''}

Requirements:
- Tone: ${tone}
- Length: ${length}
- Target Keywords: ${keywords.join(', ') || 'None specified'}
${languageInstruction}
${templateInstruction}

Marketplace Constraints:
- Title: max ${constraints.titleMaxLength} characters
- Short Description: max ${constraints.shortDescMaxLength} characters
- Long Description: max ${constraints.longDescMaxLength} characters
- Bullet Points: ${constraints.bulletPointCount} points, max ${constraints.bulletPointMaxLength} characters each

Response Format (JSON):
{
  "title": "SEO-optimized product title",
  "shortDescription": "Brief compelling description",
  "longDescription": "Detailed product description with features and benefits",
  "bulletPoints": ["Benefit 1", "Benefit 2", ...],
  "metaTitle": "SEO meta title (max 60 chars)",
  "metaDescription": "SEO meta description (max 155 chars)",
  "keywords": ["keyword1", "keyword2", ...]
}`;
}

// Language name mapping
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
    pl: 'Polish',
    sv: 'Swedish',
    da: 'Danish',
    no: 'Norwegian',
    fi: 'Finnish',
  };
  return languages[code] || code;
}

function parseGeneratedContent(
  content: string,
  constraints: MarketplaceConstraints,
): GeneratedDescription {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
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
      };
    }
  } catch (error) {
    console.error('Error parsing generated content:', error);
  }

  // Return empty structure if parsing fails
  return {
    title: '',
    shortDescription: '',
    longDescription: content.substring(0, constraints.longDescMaxLength),
    bulletPoints: [],
    metaTitle: '',
    metaDescription: '',
    keywords: [],
  };
}

function generateTemplateDescription(
  product: {
    name: string;
    category: string | null;
    attributes: unknown;
    sourceDescription: string | null;
  },
  tone: string,
  constraints: MarketplaceConstraints,
  template: AppliedTemplate | null = null,
): GeneratedDescription {
  const attrs = (product.attributes || {}) as Record<string, string>;
  const attrList = Object.entries(attrs)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');

  // Extract features and benefits from attributes
  const features = Object.entries(attrs)
    .slice(0, 5)
    .map(([key, value]) => `${key}: ${value}`);
  const benefits = [
    attrs.benefit1 || `Quality ${product.category || 'product'}`,
    attrs.benefit2 || 'Exceptional value',
    attrs.benefit3 || 'Built to last',
  ];

  // If template is provided, use template variables
  if (template && template.titleTemplate) {
    const variables: Record<string, string> = {
      product_name: product.name,
      category: product.category || 'Product',
      subcategory: '',
      brand: attrs.brand || attrs.Brand || 'Brand',
      feature_1: features[0] || '',
      feature_2: features[1] || '',
      feature_3: features[2] || '',
      feature_4: features[3] || '',
      feature_5: features[4] || '',
      benefit_1: benefits[0] || '',
      benefit_2: benefits[1] || '',
      benefit_3: benefits[2] || '',
      bullet_points: features.map((f) => `• ${f}`).join('\n'),
    };

    // Add all attributes as variables
    for (const [key, value] of Object.entries(attrs)) {
      const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
      if (typeof value === 'string') {
        variables[normalizedKey] = value;
      }
    }

    const applyVars = (templateStr: string): string => {
      return templateStr.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
        return variables[varName] || match;
      });
    };

    const title = applyVars(template.titleTemplate).substring(
      0,
      constraints.titleMaxLength,
    );
    const shortDesc = applyVars(template.shortDescTemplate).substring(
      0,
      constraints.shortDescMaxLength,
    );
    const longDesc = applyVars(template.longDescTemplate).substring(
      0,
      constraints.longDescMaxLength,
    );

    // Generate bullet points using template
    const bulletPoints = features
      .slice(0, constraints.bulletPointCount)
      .map((feature) => {
        const bulletVars = {
          ...variables,
          feature,
          benefit: `Provides ${feature.split(':')[0]}`,
        };
        return template.bulletTemplate
          ? template.bulletTemplate
              .replace(/\{\{feature\}\}/g, feature)
              .replace(/\{\{benefit\}\}/g, bulletVars.benefit)
              .replace(
                /\{\{feature_label\}\}/g,
                feature.split(':')[0]?.toUpperCase() || 'FEATURE',
              )
              .substring(0, constraints.bulletPointMaxLength)
          : feature.substring(0, constraints.bulletPointMaxLength);
      });

    return {
      title,
      shortDescription: shortDesc,
      longDescription: longDesc,
      bulletPoints,
      metaTitle: title.substring(0, 60),
      metaDescription: shortDesc.substring(0, 155),
      keywords: [product.name, product.category || ''].filter(Boolean),
    };
  }

  // Fallback to basic template generation (no template provided)
  const title = product.name.substring(0, constraints.titleMaxLength);

  const shortDesc = product.sourceDescription
    ? product.sourceDescription.substring(0, constraints.shortDescMaxLength)
    : `Discover the ${product.name}${product.category ? ` - perfect for ${product.category}` : ''}`.substring(
        0,
        constraints.shortDescMaxLength,
      );

  const longDesc = `${product.name}

${product.sourceDescription || `This ${product.category || 'product'} offers exceptional quality and value.`}

${attrList ? `Features: ${attrList}` : ''}

[Template-based content. Configure OPENAI_API_KEY for AI-generated descriptions.]`.substring(
    0,
    constraints.longDescMaxLength,
  );

  const bulletPoints = Object.entries(attrs)
    .slice(0, constraints.bulletPointCount)
    .map(([key, value]) =>
      `${key}: ${value}`.substring(0, constraints.bulletPointMaxLength),
    );

  return {
    title,
    shortDescription: shortDesc,
    longDescription: longDesc,
    bulletPoints,
    metaTitle: title.substring(0, 60),
    metaDescription: shortDesc.substring(0, 155),
    keywords: [product.name, product.category || ''].filter(Boolean),
  };
}

// ============================================================================
// MARKETPLACE CONSTRAINTS
// ============================================================================

interface MarketplaceConstraints {
  titleMaxLength: number;
  shortDescMaxLength: number;
  longDescMaxLength: number;
  bulletPointCount: number;
  bulletPointMaxLength: number;
}

function getMarketplaceConstraints(
  marketplace: Marketplace,
): MarketplaceConstraints {
  const constraints: Record<Marketplace, MarketplaceConstraints> = {
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
    WOOCOMMERCE: {
      titleMaxLength: 200,
      shortDescMaxLength: 500,
      longDescMaxLength: 10000,
      bulletPointCount: 8,
      bulletPointMaxLength: 500,
    },
  };

  return constraints[marketplace] || constraints.GENERIC;
}

// ============================================================================
// BULK GENERATION
// ============================================================================

export async function createBulkJob(
  configId: number,
  data: {
    productIds?: number[];
    marketplace?: Marketplace;
    settings?: Record<string, unknown>;
  },
) {
  const { productIds, marketplace = 'GENERIC', settings } = data;

  const totalItems = productIds?.length || 0;

  const job = await prisma.bulkGenerationJob.create({
    data: {
      configId,
      status: 'PENDING',
      totalItems,
      marketplace,
      settings: settings as Prisma.InputJsonValue,
    },
  });

  // Start processing in background
  processBulkJob(job.id, productIds || []).catch(console.error);

  return job;
}

async function processBulkJob(jobId: number, productIds: number[]) {
  // Update status to processing
  await prisma.bulkGenerationJob.update({
    where: { id: jobId },
    data: { status: 'PROCESSING', startedAt: new Date() },
  });

  let processedItems = 0;
  let successfulItems = 0;
  let failedItems = 0;
  const errors: Array<{ productId: number; error: string }> = [];

  for (const productId of productIds) {
    try {
      const job = await prisma.bulkGenerationJob.findUnique({
        where: { id: jobId },
      });
      if (job?.status === 'CANCELLED') break;

      await generateDescription(productId, {
        marketplace: job?.marketplace || 'GENERIC',
      });

      successfulItems++;
    } catch (error) {
      failedItems++;
      errors.push({ productId, error: (error as Error).message });
    }

    processedItems++;

    // Update progress
    await prisma.bulkGenerationJob.update({
      where: { id: jobId },
      data: { processedItems, successfulItems, failedItems },
    });
  }

  // Mark as completed
  await prisma.bulkGenerationJob.update({
    where: { id: jobId },
    data: {
      status: failedItems === productIds.length ? 'FAILED' : 'COMPLETED',
      completedAt: new Date(),
      errorLog: errors.length > 0 ? errors : undefined,
    },
  });
}

export async function getBulkJob(id: number) {
  return prisma.bulkGenerationJob.findUnique({
    where: { id },
  });
}

export async function getBulkJobs(
  configId: number,
  options: { status?: GenerationJobStatus; limit?: number } = {},
) {
  const { status, limit = 20 } = options;

  return prisma.bulkGenerationJob.findMany({
    where: {
      configId,
      ...(status && { status }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function cancelBulkJob(id: number) {
  return prisma.bulkGenerationJob.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });
}

// ============================================================================
// TEMPLATES
// ============================================================================

export async function getTemplates(
  configId: number,
  options: { marketplace?: Marketplace; category?: string } = {},
) {
  const { marketplace, category } = options;

  return prisma.descriptionTemplate.findMany({
    where: {
      configId,
      isActive: true,
      ...(marketplace && { marketplace }),
      ...(category && { category }),
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });
}

export async function createTemplate(
  configId: number,
  data: {
    name: string;
    description?: string;
    titleTemplate?: string;
    shortDescTemplate?: string;
    longDescTemplate?: string;
    bulletTemplate?: string;
    marketplace?: Marketplace;
    category?: string;
    isDefault?: boolean;
  },
) {
  return prisma.descriptionTemplate.create({
    data: {
      configId,
      ...data,
    },
  });
}

export async function updateTemplate(
  id: number,
  data: Partial<{
    name: string;
    description: string;
    titleTemplate: string;
    shortDescTemplate: string;
    longDescTemplate: string;
    bulletTemplate: string;
    marketplace: Marketplace;
    category: string;
    isDefault: boolean;
    isActive: boolean;
  }>,
) {
  return prisma.descriptionTemplate.update({
    where: { id },
    data,
  });
}

export async function deleteTemplate(id: number) {
  return prisma.descriptionTemplate.update({
    where: { id },
    data: { isActive: false },
  });
}

// ============================================================================
// PERFORMANCE TRACKING
// ============================================================================

export async function updateDescriptionPerformance(
  id: number,
  data: {
    impressions?: number;
    clicks?: number;
    conversions?: number;
  },
) {
  return prisma.productDescription.update({
    where: { id },
    data: {
      ...(data.impressions !== undefined && {
        impressions: { increment: data.impressions },
      }),
      ...(data.clicks !== undefined && { clicks: { increment: data.clicks } }),
      ...(data.conversions !== undefined && {
        conversions: { increment: data.conversions },
      }),
    },
  });
}

// Renamed to avoid collision with getDescriptionPerformance from analytics.service.ts
export async function getProductVariantPerformance(productId: number) {
  const descriptions = await prisma.productDescription.findMany({
    where: { productId },
    select: {
      id: true,
      variant: true,
      isControl: true,
      impressions: true,
      clicks: true,
      conversions: true,
      marketplace: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return descriptions.map((d) => ({
    ...d,
    ctr: d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0,
    conversionRate: d.clicks > 0 ? (d.conversions / d.clicks) * 100 : 0,
  }));
}
