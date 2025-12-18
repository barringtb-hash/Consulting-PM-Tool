/**
 * Tool 1.2: Product Description Generator Router
 *
 * API endpoints for product management and description generation
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import * as productDescService from './product-description.service';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const configSchema = z.object({
  defaultTone: z.string().max(50).optional(),
  defaultLength: z.enum(['short', 'medium', 'long']).optional(),
  brandVoiceProfile: z.record(z.string(), z.unknown()).optional(),
  enableSEO: z.boolean().optional(),
  targetKeywords: z.array(z.string()).optional(),
});

const productSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
  subcategory: z.string().max(100).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  imageUrls: z.array(z.string().url()).optional(),
  sourceDescription: z.string().max(5000).optional(),
});

const generateOptionsSchema = z.object({
  marketplace: z
    .enum([
      'GENERIC',
      'AMAZON',
      'EBAY',
      'SHOPIFY',
      'ETSY',
      'WALMART',
      'WOOCOMMERCE',
    ])
    .optional(),
  tone: z.string().max(50).optional(),
  length: z.enum(['short', 'medium', 'long']).optional(),
  keywords: z.array(z.string()).optional(),
  generateVariants: z.boolean().optional(),
  variantCount: z.number().int().min(1).max(5).optional(),
  templateId: z.number().int().optional(),
  language: z.string().max(10).optional(),
});

const trainVoiceSchema = z.object({
  sampleDescriptions: z.array(z.string().min(10).max(5000)).min(2).max(20),
  manualGuidelines: z
    .object({
      tone: z.string().max(100).optional(),
      prohibitedWords: z.array(z.string()).optional(),
      preferredPhrases: z.array(z.string()).optional(),
      formalityLevel: z
        .enum(['casual', 'neutral', 'formal', 'professional'])
        .optional(),
      additionalInstructions: z.string().max(1000).optional(),
    })
    .optional(),
});

const updateVoiceSchema = z.object({
  toneMarkers: z.array(z.string()).optional(),
  preferredPhrases: z.array(z.string()).optional(),
  prohibitedWords: z.array(z.string()).optional(),
  styleRules: z
    .object({
      sentenceLength: z.enum(['short', 'medium', 'long', 'varied']).optional(),
      usePunctuation: z.enum(['minimal', 'standard', 'expressive']).optional(),
      useEmoji: z.boolean().optional(),
      formalityLevel: z
        .enum(['casual', 'neutral', 'formal', 'professional'])
        .optional(),
      useFirstPerson: z.boolean().optional(),
      useSecondPerson: z.boolean().optional(),
      technicalLevel: z.enum(['simple', 'moderate', 'technical']).optional(),
    })
    .optional(),
  vocabulary: z
    .object({
      powerWords: z.array(z.string()).optional(),
      avoidWords: z.array(z.string()).optional(),
      industryTerms: z.array(z.string()).optional(),
      callToActionStyle: z.string().optional(),
    })
    .optional(),
});

const bulkJobSchema = z.object({
  productIds: z.array(z.number().int()).optional(),
  marketplace: z
    .enum([
      'GENERIC',
      'AMAZON',
      'EBAY',
      'SHOPIFY',
      'ETSY',
      'WALMART',
      'WOOCOMMERCE',
    ])
    .optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

const templateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  titleTemplate: z.string().max(500).optional(),
  shortDescTemplate: z.string().max(2000).optional(),
  longDescTemplate: z.string().max(10000).optional(),
  bulletTemplate: z.string().max(2000).optional(),
  marketplace: z
    .enum([
      'GENERIC',
      'AMAZON',
      'EBAY',
      'SHOPIFY',
      'ETSY',
      'WALMART',
      'WOOCOMMERCE',
    ])
    .optional(),
  category: z.string().max(100).optional(),
  isDefault: z.boolean().optional(),
});

const performanceSchema = z.object({
  impressions: z.number().int().min(0).optional(),
  clicks: z.number().int().min(0).optional(),
  conversions: z.number().int().min(0).optional(),
});

// ============================================================================
// CONFIG ROUTES
// ============================================================================

router.use(requireAuth);

/**
 * GET /api/product-descriptions/configs
 * List all product description configurations (with optional filtering)
 */
router.get(
  '/product-descriptions/configs',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const clientId = req.query.clientId
      ? Number(req.query.clientId)
      : undefined;
    if (req.query.clientId && Number.isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client ID' });
      return;
    }

    const configs = await productDescService.listProductDescriptionConfigs({
      clientId,
    });
    res.json({ configs });
  },
);

/**
 * GET /api/clients/:clientId/product-descriptions
 * Get product description config for a client
 */
router.get(
  '/clients/:clientId/product-descriptions',
  async (req: AuthenticatedRequest<{ clientId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const clientId = Number(req.params.clientId);
    if (Number.isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client ID' });
      return;
    }

    const config =
      await productDescService.getProductDescriptionConfig(clientId);
    res.json({ config });
  },
);

/**
 * POST /api/clients/:clientId/product-descriptions
 * Create product description config
 */
router.post(
  '/clients/:clientId/product-descriptions',
  async (req: AuthenticatedRequest<{ clientId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const clientId = Number(req.params.clientId);
    if (Number.isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client ID' });
      return;
    }

    const parsed = configSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const config = await productDescService.createProductDescriptionConfig(
        clientId,
        {
          ...parsed.data,
          brandVoiceProfile: parsed.data
            .brandVoiceProfile as Prisma.InputJsonValue,
        },
      );
      res.status(201).json({ config });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        res
          .status(409)
          .json({ error: 'Config already exists for this client' });
        return;
      }
      throw error;
    }
  },
);

/**
 * PATCH /api/clients/:clientId/product-descriptions
 * Update product description config
 */
router.patch(
  '/clients/:clientId/product-descriptions',
  async (req: AuthenticatedRequest<{ clientId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const clientId = Number(req.params.clientId);
    if (Number.isNaN(clientId)) {
      res.status(400).json({ error: 'Invalid client ID' });
      return;
    }

    const parsed = configSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const config = await productDescService.updateProductDescriptionConfig(
      clientId,
      {
        ...parsed.data,
        brandVoiceProfile: parsed.data
          .brandVoiceProfile as Prisma.InputJsonValue,
      },
    );
    res.json({ config });
  },
);

// ============================================================================
// PRODUCT ROUTES
// ============================================================================

/**
 * GET /api/product-descriptions/:configId/products
 * List products
 */
router.get(
  '/product-descriptions/:configId/products',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;

    const products = await productDescService.getProducts(configId, {
      category,
      search,
      limit,
      offset,
    });

    res.json({ products });
  },
);

/**
 * POST /api/product-descriptions/:configId/products
 * Create a product
 */
router.post(
  '/product-descriptions/:configId/products',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const product = await productDescService.createProduct(configId, {
      ...parsed.data,
      attributes: parsed.data.attributes as Prisma.InputJsonValue,
    });
    res.status(201).json({ product });
  },
);

/**
 * GET /api/product-descriptions/products/:id
 * Get a product with descriptions
 */
router.get(
  '/product-descriptions/products/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid product ID' });
      return;
    }

    const product = await productDescService.getProduct(id);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json({ product });
  },
);

/**
 * PATCH /api/product-descriptions/products/:id
 * Update a product
 */
router.patch(
  '/product-descriptions/products/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid product ID' });
      return;
    }

    const parsed = productSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const product = await productDescService.updateProduct(id, {
      ...parsed.data,
      attributes: parsed.data.attributes as Prisma.InputJsonValue,
    });
    res.json({ product });
  },
);

/**
 * DELETE /api/product-descriptions/products/:id
 * Delete a product
 */
router.delete(
  '/product-descriptions/products/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid product ID' });
      return;
    }

    await productDescService.deleteProduct(id);
    res.status(204).send();
  },
);

// ============================================================================
// GENERATION ROUTES
// ============================================================================

/**
 * POST /api/product-descriptions/products/:id/generate
 * Generate description for a product
 */
router.post(
  '/product-descriptions/products/:id/generate',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid product ID' });
      return;
    }

    const parsed = generateOptionsSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const result = await productDescService.generateDescription(
        id,
        parsed.data,
      );
      res.json(result);
    } catch (error) {
      if ((error as Error).message === 'Product not found') {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      throw error;
    }
  },
);

/**
 * GET /api/product-descriptions/products/:id/performance
 * Get A/B testing performance for product descriptions
 */
router.get(
  '/product-descriptions/products/:id/performance',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid product ID' });
      return;
    }

    const performance = await productDescService.getDescriptionPerformance(id);
    res.json({ performance });
  },
);

/**
 * POST /api/product-descriptions/descriptions/:id/performance
 * Update performance metrics for a description
 */
router.post(
  '/product-descriptions/descriptions/:id/performance',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid description ID' });
      return;
    }

    const parsed = performanceSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    await productDescService.updateDescriptionPerformance(id, parsed.data);
    res.json({ success: true });
  },
);

// ============================================================================
// BRAND VOICE ROUTES
// ============================================================================

/**
 * POST /api/product-descriptions/:configId/brand-voice/train
 * Train brand voice from sample descriptions
 */
router.post(
  '/product-descriptions/:configId/brand-voice/train',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const parsed = trainVoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const result = await productDescService.trainBrandVoice(
        configId,
        parsed.data,
      );
      res.json(result);
    } catch (error) {
      if ((error as Error).message === 'Configuration not found') {
        res.status(404).json({ error: 'Configuration not found' });
        return;
      }
      throw error;
    }
  },
);

/**
 * GET /api/product-descriptions/:configId/brand-voice
 * Get brand voice profile for a config
 */
router.get(
  '/product-descriptions/:configId/brand-voice',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const profile = await productDescService.getBrandVoiceProfile(configId);
    res.json({ profile });
  },
);

/**
 * PATCH /api/product-descriptions/:configId/brand-voice
 * Manually update brand voice profile
 */
router.patch(
  '/product-descriptions/:configId/brand-voice',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const parsed = updateVoiceSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const profile = await productDescService.updateBrandVoiceProfile(
      configId,
      parsed.data as Partial<productDescService.BrandVoiceProfile>,
    );
    res.json({ profile });
  },
);

/**
 * POST /api/product-descriptions/:configId/brand-voice/analyze
 * Analyze content for brand voice match
 */
router.post(
  '/product-descriptions/:configId/brand-voice/analyze',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const { content } = req.body as { content?: string };
    if (!content || typeof content !== 'string') {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    const analysis = await productDescService.analyzeVoiceMatch(
      configId,
      content,
    );
    res.json(analysis);
  },
);

// ============================================================================
// CSV IMPORT/EXPORT ROUTES
// ============================================================================

/**
 * GET /api/product-descriptions/csv-template
 * Download CSV template for import
 */
router.get(
  '/product-descriptions/csv-template',
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const template = productDescService.generateCSVTemplate();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="product-import-template.csv"',
    );
    res.send(template);
  },
);

/**
 * POST /api/product-descriptions/:configId/import
 * Import products from CSV
 */
router.post(
  '/product-descriptions/:configId/import',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const { csvContent, skipDuplicates, updateExisting } = req.body as {
      csvContent?: string;
      skipDuplicates?: boolean;
      updateExisting?: boolean;
    };

    if (!csvContent || typeof csvContent !== 'string') {
      res.status(400).json({ error: 'CSV content is required' });
      return;
    }

    try {
      const result = await productDescService.importProductsFromCSV(
        configId,
        csvContent,
        { skipDuplicates, updateExisting },
      );
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  },
);

/**
 * POST /api/product-descriptions/:configId/validate-csv
 * Validate CSV without importing
 */
router.post(
  '/product-descriptions/:configId/validate-csv',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { csvContent } = req.body as { csvContent?: string };

    if (!csvContent || typeof csvContent !== 'string') {
      res.status(400).json({ error: 'CSV content is required' });
      return;
    }

    const validation = productDescService.validateCSV(csvContent);
    res.json(validation);
  },
);

/**
 * GET /api/product-descriptions/:configId/export
 * Export products and descriptions to CSV
 */
router.get(
  '/product-descriptions/:configId/export',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const marketplace = req.query.marketplace as
      | 'GENERIC'
      | 'AMAZON'
      | 'EBAY'
      | 'SHOPIFY'
      | 'ETSY'
      | 'WALMART'
      | 'WOOCOMMERCE'
      | undefined;
    const includeMetrics = req.query.includeMetrics !== 'false';
    const includeSEO = req.query.includeSEO !== 'false';

    const result = await productDescService.exportProductsToCSV(configId, {
      marketplace,
      includeMetrics,
      includeSEO,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="products-export-${configId}-${new Date().toISOString().split('T')[0]}.csv"`,
    );
    res.send(result.csv);
  },
);

/**
 * POST /api/product-descriptions/:configId/import-and-generate
 * Import products from CSV and create bulk generation job
 */
router.post(
  '/product-descriptions/:configId/import-and-generate',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const { csvContent, marketplace, templateId, targetLanguages } =
      req.body as {
        csvContent?: string;
        marketplace?:
          | 'GENERIC'
          | 'AMAZON'
          | 'EBAY'
          | 'SHOPIFY'
          | 'ETSY'
          | 'WALMART'
          | 'WOOCOMMERCE';
        templateId?: number;
        targetLanguages?: string[];
      };

    if (!csvContent || typeof csvContent !== 'string') {
      res.status(400).json({ error: 'CSV content is required' });
      return;
    }

    try {
      const result = await productDescService.createBulkJobFromCSV(
        configId,
        csvContent,
        { marketplace, templateId, targetLanguages },
      );
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  },
);

// ============================================================================
// BULK JOB ROUTES
// ============================================================================

/**
 * POST /api/product-descriptions/:configId/bulk-jobs
 * Create a bulk generation job
 */
router.post(
  '/product-descriptions/:configId/bulk-jobs',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const parsed = bulkJobSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const job = await productDescService.createBulkJob(configId, parsed.data);
    res.status(201).json({ job });
  },
);

/**
 * GET /api/product-descriptions/:configId/bulk-jobs
 * List bulk generation jobs
 */
router.get(
  '/product-descriptions/:configId/bulk-jobs',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const status = req.query.status as
      | 'PENDING'
      | 'IN_PROGRESS'
      | 'COMPLETED'
      | 'COMPLETED_WITH_ERRORS'
      | 'FAILED'
      | 'CANCELLED'
      | undefined;
    const limit = Number(req.query.limit) || 20;
    const offset = Number(req.query.offset) || 0;

    const result = await productDescService.getJobsForConfig(configId, {
      status,
      limit,
      offset,
    });
    res.json(result);
  },
);

/**
 * GET /api/product-descriptions/bulk-jobs/:id
 * Get a bulk job
 */
router.get(
  '/product-descriptions/bulk-jobs/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid job ID' });
      return;
    }

    const job = await productDescService.getJobStatus(id);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    res.json(job);
  },
);

/**
 * POST /api/product-descriptions/bulk-jobs/:id/cancel
 * Cancel a bulk job
 */
router.post(
  '/product-descriptions/bulk-jobs/:id/cancel',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid job ID' });
      return;
    }

    const success = await productDescService.cancelJob(id);
    if (!success) {
      res.status(400).json({
        error: 'Cannot cancel job (may already be completed or cancelled)',
      });
      return;
    }
    res.json({ success: true });
  },
);

/**
 * POST /api/product-descriptions/bulk-jobs/:id/start
 * Start processing a bulk job
 */
router.post(
  '/product-descriptions/bulk-jobs/:id/start',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid job ID' });
      return;
    }

    try {
      // Start processing in background and return immediately
      productDescService.startJobProcessing(id).catch((error) => {
        console.error(`Job ${id} failed:`, error);
      });

      res.json({ message: 'Job processing started', jobId: id });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  },
);

/**
 * POST /api/product-descriptions/bulk-jobs/:id/retry
 * Retry failed items in a bulk job
 */
router.post(
  '/product-descriptions/bulk-jobs/:id/retry',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid job ID' });
      return;
    }

    try {
      // Start retry processing in background
      productDescService.retryFailedItems(id).catch((error) => {
        console.error(`Job ${id} retry failed:`, error);
      });

      res.json({ message: 'Retry started', jobId: id });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  },
);

/**
 * GET /api/product-descriptions/bulk-jobs/:id/progress/stream
 * Get real-time progress updates via Server-Sent Events
 */
router.get(
  '/product-descriptions/bulk-jobs/:id/progress/stream',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid job ID' });
      return;
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Send initial status
    const initialStatus = await productDescService.getJobStatus(id);
    if (initialStatus) {
      res.write(`data: ${JSON.stringify(initialStatus)}\n\n`);
    }

    // Listen for progress updates
    const onProgress = (progress: productDescService.JobProgress) => {
      if (progress.jobId === id) {
        res.write(`data: ${JSON.stringify(progress)}\n\n`);
      }
    };

    const onComplete = (result: productDescService.JobResult) => {
      if (result.jobId === id) {
        res.write(`event: complete\ndata: ${JSON.stringify(result)}\n\n`);
        cleanup();
        res.end();
      }
    };

    const onError = (errorData: {
      jobId: number;
      error: productDescService.JobError;
    }) => {
      if (errorData.jobId === id) {
        res.write(`event: error\ndata: ${JSON.stringify(errorData.error)}\n\n`);
      }
    };

    const cleanup = () => {
      productDescService.jobProgressEmitter.off(
        `job:${id}:progress`,
        onProgress,
      );
      productDescService.jobProgressEmitter.off(
        `job:${id}:complete`,
        onComplete,
      );
      productDescService.jobProgressEmitter.off(`job:${id}:error`, onError);
    };

    productDescService.jobProgressEmitter.on(`job:${id}:progress`, onProgress);
    productDescService.jobProgressEmitter.on(`job:${id}:complete`, onComplete);
    productDescService.jobProgressEmitter.on(`job:${id}:error`, onError);

    // Handle client disconnect
    req.on('close', () => {
      cleanup();
    });
  },
);

// ============================================================================
// TEMPLATE ROUTES
// ============================================================================

/**
 * GET /api/product-descriptions/:configId/templates
 * List templates
 */
router.get(
  '/product-descriptions/:configId/templates',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const marketplace = req.query.marketplace as
      | 'GENERIC'
      | 'AMAZON'
      | 'EBAY'
      | 'SHOPIFY'
      | 'ETSY'
      | 'WALMART'
      | 'WOOCOMMERCE'
      | undefined;
    const category = req.query.category as string | undefined;

    const templates = await productDescService.getTemplates(configId, {
      marketplace,
      category,
    });
    res.json({ templates });
  },
);

/**
 * POST /api/product-descriptions/:configId/templates
 * Create a template
 */
router.post(
  '/product-descriptions/:configId/templates',
  async (req: AuthenticatedRequest<{ configId: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      res.status(400).json({ error: 'Invalid config ID' });
      return;
    }

    const parsed = templateSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const template = await productDescService.createTemplate(
      configId,
      parsed.data,
    );
    res.status(201).json({ template });
  },
);

/**
 * PATCH /api/product-descriptions/templates/:id
 * Update a template
 */
router.patch(
  '/product-descriptions/templates/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid template ID' });
      return;
    }

    const parsed = templateSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const template = await productDescService.updateTemplate(id, parsed.data);
    res.json({ template });
  },
);

/**
 * DELETE /api/product-descriptions/templates/:id
 * Delete a template
 */
router.delete(
  '/product-descriptions/templates/:id',
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid template ID' });
      return;
    }

    await productDescService.deleteTemplate(id);
    res.status(204).send();
  },
);

export default router;
