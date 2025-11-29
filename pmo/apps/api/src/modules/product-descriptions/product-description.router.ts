/**
 * Tool 1.2: Product Description Generator Router
 *
 * API endpoints for product management and description generation
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import * as productDescService from './product-description.service';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const configSchema = z.object({
  defaultTone: z.string().max(50).optional(),
  defaultLength: z.enum(['short', 'medium', 'long']).optional(),
  brandVoiceProfile: z.record(z.unknown()).optional(),
  enableSEO: z.boolean().optional(),
  targetKeywords: z.array(z.string()).optional(),
});

const productSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
  subcategory: z.string().max(100).optional(),
  attributes: z.record(z.unknown()).optional(),
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
  settings: z.record(z.unknown()).optional(),
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
        parsed.data,
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
      parsed.data,
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

    const product = await productDescService.createProduct(
      configId,
      parsed.data,
    );
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

    const product = await productDescService.updateProduct(id, parsed.data);
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
      | 'PROCESSING'
      | 'COMPLETED'
      | 'FAILED'
      | 'CANCELLED'
      | undefined;
    const limit = Number(req.query.limit) || 20;

    const jobs = await productDescService.getBulkJobs(configId, {
      status,
      limit,
    });
    res.json({ jobs });
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

    const job = await productDescService.getBulkJob(id);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    res.json({ job });
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

    const job = await productDescService.cancelBulkJob(id);
    res.json({ job });
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
