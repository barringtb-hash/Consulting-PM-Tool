/**
 * Tool 3.4: Revenue Management AI Router
 *
 * API endpoints for revenue management, pricing, forecasting, and promotions
 */

import { Router } from 'express';
import { z } from 'zod';
import { PricingStrategy } from '@prisma/client';
import { AuthenticatedRequest, requireAuth } from '../../auth/auth.middleware';
import * as revenueService from './revenue-management.service';
import { hasClientAccess } from '../../auth/client-auth.helper';

const router = Router();

// ============ Validation Schemas ============

const createConfigSchema = z.object({
  clientId: z.number().int().positive(),
  businessName: z.string().optional(),
  businessType: z.string().optional(),
  currency: z.string().min(3).max(3).optional(),
  pricingStrategy: z.nativeEnum(PricingStrategy).optional(),
  minPriceFloor: z.number().positive().optional(),
  maxPriceCeiling: z.number().positive().optional(),
  priceChangeFrequency: z.string().optional(),
  forecastHorizonDays: z.number().int().positive().optional(),
  competitorMonitoring: z.boolean().optional(),
  autoApproveChanges: z.boolean().optional(),
  maxAutoChangePercent: z.number().positive().optional(),
});

const updateConfigSchema = z.object({
  businessName: z.string().optional(),
  businessType: z.string().optional(),
  pricingStrategy: z.nativeEnum(PricingStrategy).optional(),
  minPriceFloor: z.number().positive().optional(),
  maxPriceCeiling: z.number().positive().optional(),
  priceChangeFrequency: z.string().optional(),
  forecastHorizonDays: z.number().int().positive().optional(),
  competitorMonitoring: z.boolean().optional(),
  autoApproveChanges: z.boolean().optional(),
  maxAutoChangePercent: z.number().positive().optional(),
});

const createRateCategorySchema = z.object({
  configId: z.number().int().positive(),
  code: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  categoryType: z.string().min(1),
  baseRate: z.number().positive(),
  minRate: z.number().positive().optional(),
  maxRate: z.number().positive().optional(),
  totalInventory: z.number().int().positive().optional(),
  maxOccupancy: z.number().int().positive().optional(),
  pricingEnabled: z.boolean().optional(),
  demandMultiplier: z.number().positive().optional(),
});

const updateRateCategorySchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  baseRate: z.number().positive().optional(),
  minRate: z.number().positive().optional(),
  maxRate: z.number().positive().optional(),
  totalInventory: z.number().int().positive().optional(),
  maxOccupancy: z.number().int().positive().optional(),
  pricingEnabled: z.boolean().optional(),
  demandMultiplier: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

const createCompetitorSchema = z.object({
  configId: z.number().int().positive(),
  name: z.string().min(1),
  website: z.string().url().optional(),
  starRating: z.number().min(1).max(5).optional(),
  location: z.string().optional(),
  trackingEnabled: z.boolean().optional(),
  scrapeUrl: z.string().url().optional(),
  apiEndpoint: z.string().url().optional(),
  categoryMapping: z.record(z.any()).optional(),
});

const updateCompetitorSchema = z.object({
  name: z.string().optional(),
  website: z.string().url().optional(),
  starRating: z.number().min(1).max(5).optional(),
  location: z.string().optional(),
  trackingEnabled: z.boolean().optional(),
  scrapeUrl: z.string().url().optional(),
  apiEndpoint: z.string().url().optional(),
  categoryMapping: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

const recordCompetitorRateSchema = z.object({
  competitorId: z.number().int().positive(),
  date: z.string().datetime(),
  categoryCode: z.string().optional(),
  rate: z.number().positive(),
  availability: z.boolean().optional(),
  restrictions: z.record(z.any()).optional(),
});

const createPromotionSchema = z.object({
  configId: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().optional(),
  discountType: z.string().min(1),
  discountValue: z.number().positive(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  applicableCategories: z.array(z.string()).optional(),
  maxUsage: z.number().positive().optional(),
  code: z.string().optional(),
});

const updatePromotionSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  discountType: z.string().optional(),
  discountValue: z.number().positive().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  applicableCategories: z.array(z.string()).optional(),
  maxUsage: z.number().positive().optional(),
  isActive: z.boolean().optional(),
});

const recordBookingSchema = z.object({
  configId: z.number().int().positive(),
  bookingDate: z.string().datetime(),
  stayDate: z.string().datetime(),
  checkoutDate: z.string().datetime().optional(),
  categoryId: z.number().int().positive().optional(),
  rate: z.number().positive(),
  nights: z.number().positive().optional(),
  totalRevenue: z.number().positive(),
  channel: z.string().optional(),
  leadTimeDays: z.number().optional(),
  promotionCode: z.string().optional(),
});

const generateForecastsSchema = z.object({
  startDate: z.string().datetime().optional(),
  daysAhead: z.number().positive().max(365).optional(),
});

const generateRecommendationsSchema = z.object({
  startDate: z.string().datetime().optional(),
  daysAhead: z.number().positive().max(90).optional(),
});

// ============ Configuration Routes ============

router.get('/config/:clientId', async (req, res) => {
  try {
    const clientId = Number(req.params.clientId);
    if (Number.isNaN(clientId)) {
      return res.status(400).json({ error: 'Invalid client ID' });
    }

    if (
      !(await hasClientAccess((req as AuthenticatedRequest).userId!, clientId))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const config = await revenueService.getRevenueConfig(clientId);
    res.json(config);
  } catch (error) {
    console.error('Error fetching revenue config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/config', async (req, res) => {
  try {
    const data = createConfigSchema.parse(req.body);

    if (
      !(await hasClientAccess(
        (req as AuthenticatedRequest).userId!,
        data.clientId,
      ))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const config = await revenueService.createRevenueConfig(data);
    res.status(201).json(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error creating revenue config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/config/:configId', async (req, res) => {
  try {
    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      return res.status(400).json({ error: 'Invalid config ID' });
    }
    const data = updateConfigSchema.parse(req.body);

    const clientId =
      await revenueService.getClientIdFromRevenueConfig(configId);
    if (
      !clientId ||
      !(await hasClientAccess((req as AuthenticatedRequest).userId!, clientId))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const config = await revenueService.updateRevenueConfig(configId, data);
    res.json(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error updating revenue config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Rate Categories Routes ============

router.get('/rate-categories/:configId', async (req, res) => {
  try {
    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      return res.status(400).json({ error: 'Invalid config ID' });
    }

    const clientId =
      await revenueService.getClientIdFromRevenueConfig(configId);
    if (
      !clientId ||
      !(await hasClientAccess((req as AuthenticatedRequest).userId!, clientId))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const categories = await revenueService.getRateCategories(configId);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching rate categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/rate-categories', async (req, res) => {
  try {
    const data = createRateCategorySchema.parse(req.body);

    const clientId = await revenueService.getClientIdFromRevenueConfig(
      data.configId,
    );
    if (
      !clientId ||
      !(await hasClientAccess((req as AuthenticatedRequest).userId!, clientId))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const category = await revenueService.createRateCategory(data);
    res.status(201).json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error creating rate category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/rate-categories/:categoryId', async (req, res) => {
  try {
    const categoryId = Number(req.params.categoryId);
    if (Number.isNaN(categoryId)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }
    const data = updateRateCategorySchema.parse(req.body);

    const clientId =
      await revenueService.getClientIdFromRateCategory(categoryId);
    if (
      !clientId ||
      !(await hasClientAccess((req as AuthenticatedRequest).userId!, clientId))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const category = await revenueService.updateRateCategory(categoryId, data);
    res.json(category);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error updating rate category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/rate-categories/:categoryId', async (req, res) => {
  try {
    const categoryId = Number(req.params.categoryId);
    if (Number.isNaN(categoryId)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const clientId =
      await revenueService.getClientIdFromRateCategory(categoryId);
    if (
      !clientId ||
      !(await hasClientAccess((req as AuthenticatedRequest).userId!, clientId))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await revenueService.deleteRateCategory(categoryId);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting rate category:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Competitors Routes ============

router.get('/competitors/:configId', async (req, res) => {
  try {
    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      return res.status(400).json({ error: 'Invalid config ID' });
    }

    const clientId =
      await revenueService.getClientIdFromRevenueConfig(configId);
    if (
      !clientId ||
      !(await hasClientAccess((req as AuthenticatedRequest).userId!, clientId))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const competitors = await revenueService.getCompetitors(configId);
    res.json(competitors);
  } catch (error) {
    console.error('Error fetching competitors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/competitors', async (req, res) => {
  try {
    const data = createCompetitorSchema.parse(req.body);

    const clientId = await revenueService.getClientIdFromRevenueConfig(
      data.configId,
    );
    if (
      !clientId ||
      !(await hasClientAccess((req as AuthenticatedRequest).userId!, clientId))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const competitor = await revenueService.createCompetitor(data);
    res.status(201).json(competitor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error creating competitor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/competitors/:competitorId', async (req, res) => {
  try {
    const competitorId = Number(req.params.competitorId);
    if (Number.isNaN(competitorId)) {
      return res.status(400).json({ error: 'Invalid competitor ID' });
    }
    const data = updateCompetitorSchema.parse(req.body);

    const clientId =
      await revenueService.getClientIdFromCompetitor(competitorId);
    if (
      !clientId ||
      !(await hasClientAccess((req as AuthenticatedRequest).userId!, clientId))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const competitor = await revenueService.updateCompetitor(
      competitorId,
      data,
    );
    res.json(competitor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error updating competitor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Competitor Rates Routes ============

router.post('/competitor-rates', async (req, res) => {
  try {
    const data = recordCompetitorRateSchema.parse(req.body);

    const clientId = await revenueService.getClientIdFromCompetitor(
      data.competitorId,
    );
    if (
      !clientId ||
      !(await hasClientAccess((req as AuthenticatedRequest).userId!, clientId))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const rate = await revenueService.recordCompetitorRate({
      ...data,
      date: new Date(data.date),
    });
    res.status(201).json(rate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error recording competitor rate:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/competitor-rates/:competitorId', async (req, res) => {
  try {
    const competitorId = Number(req.params.competitorId);
    if (Number.isNaN(competitorId)) {
      return res.status(400).json({ error: 'Invalid competitor ID' });
    }
    const { startDate, endDate, categoryCode } = req.query;

    const clientId =
      await revenueService.getClientIdFromCompetitor(competitorId);
    if (
      !clientId ||
      !(await hasClientAccess((req as AuthenticatedRequest).userId!, clientId))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const rates = await revenueService.getCompetitorRates(competitorId, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      categoryCode: categoryCode as string,
    });
    res.json(rates);
  } catch (error) {
    console.error('Error fetching competitor rates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Demand Forecasts Routes ============

router.get('/forecasts/:configId', async (req, res) => {
  try {
    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      return res.status(400).json({ error: 'Invalid config ID' });
    }
    const { startDate, endDate, categoryId } = req.query;

    const clientId =
      await revenueService.getClientIdFromRevenueConfig(configId);
    if (
      !clientId ||
      !(await hasClientAccess((req as AuthenticatedRequest).userId!, clientId))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const forecasts = await revenueService.getDemandForecasts(configId, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      categoryId: categoryId ? Number(categoryId as string) : undefined,
    });
    res.json(forecasts);
  } catch (error) {
    console.error('Error fetching demand forecasts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/forecasts/:configId/generate', async (req, res) => {
  try {
    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      return res.status(400).json({ error: 'Invalid config ID' });
    }
    const options = generateForecastsSchema.parse(req.body);

    const clientId =
      await revenueService.getClientIdFromRevenueConfig(configId);
    if (
      !clientId ||
      !(await hasClientAccess((req as AuthenticatedRequest).userId!, clientId))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const forecasts = await revenueService.generateDemandForecasts(configId, {
      startDate: options.startDate ? new Date(options.startDate) : undefined,
      daysAhead: options.daysAhead,
    });
    res.json({
      generated: forecasts.length,
      forecasts,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error generating forecasts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Price Recommendations Routes ============

router.get('/recommendations/:configId', async (req, res) => {
  try {
    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      return res.status(400).json({ error: 'Invalid config ID' });
    }
    const { startDate, endDate, categoryId, status } = req.query;

    const clientId =
      await revenueService.getClientIdFromRevenueConfig(configId);
    if (
      !clientId ||
      !(await hasClientAccess((req as AuthenticatedRequest).userId!, clientId))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const recommendations = await revenueService.getPriceRecommendations(
      configId,
      {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        categoryId: categoryId ? Number(categoryId as string) : undefined,
        status: status as string,
      },
    );
    res.json(recommendations);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/recommendations/:configId/generate', async (req, res) => {
  try {
    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      return res.status(400).json({ error: 'Invalid config ID' });
    }
    const options = generateRecommendationsSchema.parse(req.body);

    const clientId =
      await revenueService.getClientIdFromRevenueConfig(configId);
    if (
      !clientId ||
      !(await hasClientAccess((req as AuthenticatedRequest).userId!, clientId))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const recommendations = await revenueService.generatePriceRecommendations(
      configId,
      {
        startDate: options.startDate ? new Date(options.startDate) : undefined,
        daysAhead: options.daysAhead,
      },
    );
    res.json({
      generated: recommendations.length,
      recommendations,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/recommendations/:recommendationId/apply', async (req, res) => {
  try {
    const recommendationId = Number(req.params.recommendationId);
    if (Number.isNaN(recommendationId)) {
      return res.status(400).json({ error: 'Invalid recommendation ID' });
    }
    const { appliedBy } = req.body;

    const clientId =
      await revenueService.getClientIdFromRecommendation(recommendationId);
    if (
      !clientId ||
      !(await hasClientAccess((req as AuthenticatedRequest).userId!, clientId))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const recommendation = await revenueService.applyRecommendation(
      recommendationId,
      appliedBy,
    );
    res.json(recommendation);
  } catch (error) {
    console.error('Error applying recommendation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Promotions Routes ============

router.get('/promotions/:configId', async (req, res) => {
  try {
    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      return res.status(400).json({ error: 'Invalid config ID' });
    }
    const { isActive, startDate, endDate } = req.query;

    const clientId =
      await revenueService.getClientIdFromRevenueConfig(configId);
    if (
      !clientId ||
      !(await hasClientAccess((req as AuthenticatedRequest).userId!, clientId))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const promotions = await revenueService.getPromotions(configId, {
      isActive:
        isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });
    res.json(promotions);
  } catch (error) {
    console.error('Error fetching promotions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/promotions', async (req, res) => {
  try {
    const data = createPromotionSchema.parse(req.body);

    const clientId = await revenueService.getClientIdFromRevenueConfig(
      data.configId,
    );
    if (
      !clientId ||
      !(await hasClientAccess((req as AuthenticatedRequest).userId!, clientId))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const promotion = await revenueService.createPromotion({
      ...data,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
    });
    res.status(201).json(promotion);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error creating promotion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/promotions/:promotionId', async (req, res) => {
  try {
    const promotionId = Number(req.params.promotionId);
    if (Number.isNaN(promotionId)) {
      return res.status(400).json({ error: 'Invalid promotion ID' });
    }
    const data = updatePromotionSchema.parse(req.body);

    const clientId = await revenueService.getClientIdFromPromotion(promotionId);
    if (
      !clientId ||
      !(await hasClientAccess((req as AuthenticatedRequest).userId!, clientId))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const promotion = await revenueService.updatePromotion(promotionId, {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    });
    res.json(promotion);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error updating promotion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Bookings Routes ============

router.get('/bookings/:configId', async (req, res) => {
  try {
    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      return res.status(400).json({ error: 'Invalid config ID' });
    }
    const { startDate, endDate, channel } = req.query;

    const clientId =
      await revenueService.getClientIdFromRevenueConfig(configId);
    if (
      !clientId ||
      !(await hasClientAccess((req as AuthenticatedRequest).userId!, clientId))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const bookings = await revenueService.getBookings(configId, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      channel: channel as string,
    });
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/bookings', async (req, res) => {
  try {
    const data = recordBookingSchema.parse(req.body);

    const clientId = await revenueService.getClientIdFromRevenueConfig(
      data.configId,
    );
    if (
      !clientId ||
      !(await hasClientAccess((req as AuthenticatedRequest).userId!, clientId))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const booking = await revenueService.recordBooking({
      ...data,
      bookingDate: new Date(data.bookingDate),
      stayDate: new Date(data.stayDate),
      checkoutDate: data.checkoutDate ? new Date(data.checkoutDate) : undefined,
    });
    res.status(201).json(booking);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'Validation error', details: error.issues });
    }
    console.error('Error recording booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ Analytics Routes ============

router.get('/analytics/:configId', async (req, res) => {
  try {
    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      return res.status(400).json({ error: 'Invalid config ID' });
    }
    const { startDate, endDate } = req.query;

    const clientId =
      await revenueService.getClientIdFromRevenueConfig(configId);
    if (
      !clientId ||
      !(await hasClientAccess((req as AuthenticatedRequest).userId!, clientId))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const analytics = await revenueService.getRevenueAnalytics(configId, {
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/analytics/:configId/record', async (req, res) => {
  try {
    const configId = Number(req.params.configId);
    if (Number.isNaN(configId)) {
      return res.status(400).json({ error: 'Invalid config ID' });
    }

    const clientId =
      await revenueService.getClientIdFromRevenueConfig(configId);
    if (
      !clientId ||
      !(await hasClientAccess((req as AuthenticatedRequest).userId!, clientId))
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const analytics = await revenueService.recordDailyAnalytics(configId);
    res.json(analytics);
  } catch (error) {
    console.error('Error recording analytics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
