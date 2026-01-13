/**
 * Tool 3.1: Inventory Forecasting Engine Router
 *
 * API endpoints for inventory forecasting and management
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import {
  Prisma,
  ForecastStatus,
  AlertSeverity,
  AlertStatus,
} from '@prisma/client';
import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import { tenantMiddleware } from '../../tenant/tenant.middleware';
import * as inventoryService from './inventory-forecasting.service';
import { prisma } from '../../prisma/client';
import {
  hasClientAccess,
  getAccessibleClientIds,
  getClientIdFromInventoryForecastConfig,
} from '../../auth/client-auth.helper';
import { parseDateSafe } from '../../utils/date-utils';

const router = Router();

// Apply tenant middleware to all routes
router.use(requireAuth, tenantMiddleware);

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const configSchema = z.object({
  businessName: z.string().max(200).optional(),
  timezone: z.string().optional(),
  currency: z.string().length(3).optional(),
  forecastHorizonDays: z.number().int().min(7).max(365).optional(),
  historicalDataMonths: z.number().int().min(3).max(60).optional(),
  confidenceLevel: z.number().min(0.5).max(0.99).optional(),
  enableSeasonality: z.boolean().optional(),
  enableTrendDetection: z.boolean().optional(),
  enableHolidayImpact: z.boolean().optional(),
  modelType: z.enum(['prophet', 'lstm', 'arima']).optional(),
  lowStockThreshold: z.number().min(0).max(1).optional(),
  overstockThreshold: z.number().min(1).max(10).optional(),
  erpSystem: z.string().optional(),
  erpCredentials: z.record(z.string(), z.unknown()).optional(),
  posSystem: z.string().optional(),
  posCredentials: z.record(z.string(), z.unknown()).optional(),
});

const locationSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().max(50).optional(),
  address: z.record(z.string(), z.unknown()).optional(),
  timezone: z.string().optional(),
  leadTimeDays: z.number().int().min(0).optional(),
  safetyStockDays: z.number().int().min(0).optional(),
});

const productSchema = z.object({
  sku: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  category: z.string().max(100).optional(),
  subcategory: z.string().max(100).optional(),
  supplierId: z.string().max(100).optional(),
  supplierName: z.string().max(200).optional(),
  supplierLeadTimeDays: z.number().int().min(0).optional(),
  unitCost: z.number().min(0).optional(),
  sellingPrice: z.number().min(0).optional(),
  reorderPoint: z.number().int().min(0).optional(),
  reorderQuantity: z.number().int().min(0).optional(),
  minOrderQuantity: z.number().int().min(0).optional(),
  abcClass: z.enum(['A', 'B', 'C']).optional(),
});

const scenarioSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  demandMultiplier: z.number().min(0.1).max(10).optional(),
  leadTimeChange: z.number().int().min(-30).max(60).optional(),
  priceChange: z.number().min(-100).max(100).optional(),
  promotionImpact: z.number().min(-100).max(200).optional(),
});

// ============================================================================
// CONFIG ROUTES
// ============================================================================

router.get(
  '/inventory-forecasting/configs',
  requireAuth,
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

    if (clientId) {
      const canAccess = await hasClientAccess(req.userId, clientId);
      if (!canAccess) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      const configs = await inventoryService.listInventoryForecastConfigs({
        clientId,
      });
      res.json({ configs });
      return;
    }

    const accessibleClientIds = await getAccessibleClientIds(req.userId);
    if (accessibleClientIds === null) {
      const configs = await inventoryService.listInventoryForecastConfigs({});
      res.json({ configs });
      return;
    }

    const configs = await inventoryService.listInventoryForecastConfigs({
      clientIds: accessibleClientIds,
    });
    res.json({ configs });
  },
);

router.get(
  '/clients/:clientId/inventory-forecasting',
  requireAuth,
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

    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const config = await inventoryService.getInventoryForecastConfig(clientId);
    res.json({ config });
  },
);

router.post(
  '/clients/:clientId/inventory-forecasting',
  requireAuth,
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

    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
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
      const config = await inventoryService.createInventoryForecastConfig(
        clientId,
        {
          ...parsed.data,
          erpCredentials: parsed.data.erpCredentials as Prisma.InputJsonValue,
          posCredentials: parsed.data.posCredentials as Prisma.InputJsonValue,
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

router.patch(
  '/clients/:clientId/inventory-forecasting',
  requireAuth,
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

    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const parsed = configSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const config = await inventoryService.updateInventoryForecastConfig(
      clientId,
      {
        ...parsed.data,
        erpCredentials: parsed.data.erpCredentials as Prisma.InputJsonValue,
        posCredentials: parsed.data.posCredentials as Prisma.InputJsonValue,
      },
    );
    res.json({ config });
  },
);

// ============================================================================
// LOCATION ROUTES
// ============================================================================

router.post(
  '/inventory-forecasting/:configId/locations',
  requireAuth,
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

    const clientId = await getClientIdFromInventoryForecastConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const parsed = locationSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const location = await inventoryService.createLocation(configId, {
      ...parsed.data,
      address: parsed.data.address as Prisma.InputJsonValue,
    });
    res.status(201).json({ location });
  },
);

router.get(
  '/inventory-forecasting/:configId/locations',
  requireAuth,
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

    const clientId = await getClientIdFromInventoryForecastConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const isActive =
      req.query.active === 'true'
        ? true
        : req.query.active === 'false'
          ? false
          : undefined;
    const locations = await inventoryService.getLocations(configId, {
      isActive,
    });
    res.json({ locations });
  },
);

// ============================================================================
// PRODUCT ROUTES
// ============================================================================

router.post(
  '/inventory-forecasting/:configId/products',
  requireAuth,
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

    const clientId = await getClientIdFromInventoryForecastConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    try {
      const product = await inventoryService.createProduct(
        configId,
        parsed.data,
      );
      res.status(201).json({ product });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        res.status(409).json({ error: 'Product with this SKU already exists' });
        return;
      }
      throw error;
    }
  },
);

router.get(
  '/inventory-forecasting/:configId/products',
  requireAuth,
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

    const clientId = await getClientIdFromInventoryForecastConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const products = await inventoryService.getProducts(configId, {
      category: req.query.category as string | undefined,
      abcClass: req.query.abcClass as string | undefined,
      isActive:
        req.query.active === 'true'
          ? true
          : req.query.active === 'false'
            ? false
            : undefined,
      limit: Number(req.query.limit) || 100,
      offset: Number(req.query.offset) || 0,
    });
    res.json({ products });
  },
);

router.get(
  '/inventory-forecasting/products/:id',
  requireAuth,
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

    const product = await inventoryService.getProduct(id);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    // Authorization check via product's config
    const clientId = await getClientIdFromInventoryForecastConfig(
      product.configId,
    );
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    res.json({ product });
  },
);

// ============================================================================
// FORECAST ROUTES
// ============================================================================

router.post(
  '/inventory-forecasting/:configId/forecasts',
  requireAuth,
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

    const clientId = await getClientIdFromInventoryForecastConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const body = req.body as {
      productId?: number | string;
      locationId?: number | string;
      startDate?: string;
      endDate?: string;
    };
    const { productId, locationId, startDate, endDate } = body;
    if (!productId) {
      res.status(400).json({ error: 'productId is required' });
      return;
    }

    try {
      const result = await inventoryService.generateForecast(
        configId,
        Number(productId),
        {
          locationId: locationId ? Number(locationId) : undefined,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        },
      );
      res.status(201).json(result);
    } catch (error) {
      if ((error as Error).message === 'Product not found') {
        res.status(404).json({ error: 'Product not found' });
        return;
      }
      throw error;
    }
  },
);

router.get(
  '/inventory-forecasting/:configId/forecasts',
  requireAuth,
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

    const clientId = await getClientIdFromInventoryForecastConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const forecasts = await inventoryService.getForecasts(configId, {
      productId: req.query.productId ? Number(req.query.productId) : undefined,
      locationId: req.query.locationId
        ? Number(req.query.locationId)
        : undefined,
      status: req.query.status as ForecastStatus | undefined,
      limit: Number(req.query.limit) || 50,
    });
    res.json({ forecasts });
  },
);

// ============================================================================
// ALERT ROUTES
// ============================================================================

router.get(
  '/inventory-forecasting/:configId/alerts',
  requireAuth,
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

    const clientId = await getClientIdFromInventoryForecastConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const alerts = await inventoryService.getAlerts(configId, {
      status: req.query.status as AlertStatus | undefined,
      severity: req.query.severity as AlertSeverity | undefined,
      productId: req.query.productId ? Number(req.query.productId) : undefined,
      limit: Number(req.query.limit) || 100,
    });
    res.json({ alerts });
  },
);

router.post(
  '/inventory-forecasting/alerts/:id/acknowledge',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid alert ID' });
      return;
    }

    // Authorization check via alert's config
    const alertData = await prisma.inventoryAlert.findUnique({
      where: { id },
      select: { configId: true },
    });
    if (!alertData) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }
    const clientId = await getClientIdFromInventoryForecastConfig(
      alertData.configId,
    );
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const alert = await inventoryService.acknowledgeAlert(id, req.userId);
    res.json({ alert });
  },
);

router.post(
  '/inventory-forecasting/alerts/:id/resolve',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid alert ID' });
      return;
    }

    // Authorization check via alert's config
    const alertData = await prisma.inventoryAlert.findUnique({
      where: { id },
      select: { configId: true },
    });
    if (!alertData) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }
    const clientId = await getClientIdFromInventoryForecastConfig(
      alertData.configId,
    );
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const alert = await inventoryService.resolveAlert(id, req.userId);
    res.json({ alert });
  },
);

// ============================================================================
// SCENARIO ROUTES
// ============================================================================

router.post(
  '/inventory-forecasting/:configId/scenarios',
  requireAuth,
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

    const clientId = await getClientIdFromInventoryForecastConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const parsed = scenarioSchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json({ error: 'Invalid data', details: parsed.error.format() });
      return;
    }

    const scenario = await inventoryService.createScenario(
      configId,
      parsed.data,
    );
    res.status(201).json({ scenario });
  },
);

router.get(
  '/inventory-forecasting/:configId/scenarios',
  requireAuth,
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

    const clientId = await getClientIdFromInventoryForecastConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const scenarios = await inventoryService.getScenarios(configId);
    res.json({ scenarios });
  },
);

router.post(
  '/inventory-forecasting/scenarios/:id/run',
  requireAuth,
  async (req: AuthenticatedRequest<{ id: string }>, res: Response) => {
    if (!req.userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid scenario ID' });
      return;
    }

    // Authorization check via scenario's config
    const scenario = await prisma.forecastScenario.findUnique({
      where: { id },
      select: { configId: true },
    });
    if (!scenario) {
      res.status(404).json({ error: 'Scenario not found' });
      return;
    }
    const clientId = await getClientIdFromInventoryForecastConfig(
      scenario.configId,
    );
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    try {
      const result = await inventoryService.runScenario(id);
      res.json({ result });
    } catch (error) {
      if ((error as Error).message === 'Scenario not found') {
        res.status(404).json({ error: 'Scenario not found' });
        return;
      }
      throw error;
    }
  },
);

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

router.get(
  '/inventory-forecasting/:configId/analytics',
  requireAuth,
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

    const clientId = await getClientIdFromInventoryForecastConfig(configId);
    if (!clientId) {
      res.status(404).json({ error: 'Config not found' });
      return;
    }
    const canAccess = await hasClientAccess(req.userId, clientId);
    if (!canAccess) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const parsedStart = parseDateSafe(req.query.start as string);
    const parsedEnd = parseDateSafe(req.query.end as string);
    const startDate =
      parsedStart ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = parsedEnd ?? new Date();

    const analytics = await inventoryService.getInventoryAnalytics(configId, {
      start: startDate,
      end: endDate,
    });
    res.json(analytics);
  },
);

export default router;
