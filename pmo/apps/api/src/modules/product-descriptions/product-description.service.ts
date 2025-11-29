/**
 * Tool 1.2: Product Description Generator Service
 *
 * AI-powered product description generation with:
 * - SEO-optimized content generation
 * - Multi-marketplace formatting
 * - Brand voice matching
 * - Bulk processing capabilities
 * - A/B testing variants
 */

import { prisma } from '../../prisma/client';
import { env } from '../../config/env';
import { Marketplace, GenerationJobStatus, Prisma } from '@prisma/client';

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
}) {
  return prisma.productDescriptionConfig.findMany({
    where: filters?.clientId ? { clientId: filters.clientId } : undefined,
    include: {
      client: { select: { id: true, name: true, industry: true } },
      _count: { select: { products: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createProductDescriptionConfig(
  clientId: number,
  data: ProductDescriptionConfigInput,
) {
  return prisma.productDescriptionConfig.create({
    data: {
      clientId,
      ...data,
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
  } = options;

  // Get marketplace constraints
  const constraints = getMarketplaceConstraints(marketplace);

  // Generate main description
  const generated = await generateDescriptionContent(
    product,
    options,
    constraints,
  );

  // Save main description
  const description = await prisma.productDescription.create({
    data: {
      productId,
      ...generated,
      marketplace,
      isControl: true,
    },
  });

  // Generate variants if requested
  const variants: unknown[] = [];
  if (generateVariants) {
    for (let i = 0; i < variantCount; i++) {
      const variantContent = await generateDescriptionContent(
        product,
        { ...options, tone: i === 0 ? 'casual' : 'enthusiastic' },
        constraints,
      );

      const variant = await prisma.productDescription.create({
        data: {
          productId,
          ...variantContent,
          marketplace,
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
): Promise<GeneratedDescription> {
  const tone = options.tone || product.config.defaultTone || 'professional';
  const length = options.length || 'medium';
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
      );

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

${product.config.brandVoiceProfile ? `Brand Voice Guidelines: ${JSON.stringify(product.config.brandVoiceProfile)}` : ''}`,
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
  return generateTemplateDescription(product, tone, constraints);
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
): string {
  return `Generate a product description for the following product:

Product Name: ${product.name}
Category: ${product.category || 'General'}${product.subcategory ? ` > ${product.subcategory}` : ''}
Attributes: ${JSON.stringify(product.attributes || {})}
${product.sourceDescription ? `Source/Reference Description: ${product.sourceDescription}` : ''}

Requirements:
- Tone: ${tone}
- Length: ${length}
- Target Keywords: ${keywords.join(', ') || 'None specified'}

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
): GeneratedDescription {
  const attrs = (product.attributes || {}) as Record<string, string>;
  const attrList = Object.entries(attrs)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');

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

[This is placeholder content. Configure OPENAI_API_KEY for AI-generated descriptions.]`.substring(
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

export async function getDescriptionPerformance(productId: number) {
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
