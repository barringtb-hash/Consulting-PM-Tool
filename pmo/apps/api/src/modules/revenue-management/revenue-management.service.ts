import {
  PricingStrategy,
  DemandForecast,
  PriceRecommendation,
  RateCategory,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../prisma/client';

// ============ Internal Types ============

interface ConfigWithRelations {
  id: number;
  pricingStrategy: PricingStrategy;
  minPriceFloor: number | null;
  maxPriceCeiling: number | null;
  seasonalFactors?: Prisma.JsonValue;
  rateCategories?: RateCategory[];
  demandForecasts?: DemandForecastData[];
  competitors?: CompetitorWithRates[];
  bookings?: BookingData[];
}

interface DemandForecastData {
  forecastDate: Date;
  predictedDemand: number;
}

interface CompetitorWithRates {
  rates?: RateData[];
}

interface RateData {
  date: Date;
  rate: number | Prisma.Decimal;
}

interface BookingData {
  stayDate: Date;
  occupancy?: number;
}

interface DemandFactors {
  dayOfWeek?: { impact: string; reason: string };
  seasonal?: { impact: string; multiplier: number };
  historical?: { impact: string; basedOn: number };
  [key: string]: unknown;
}

// ============ Configuration Management ============

export async function getRevenueConfig(clientId: number) {
  return prisma.revenueManagementConfig.findUnique({
    where: { clientId },
    include: {
      rateCategories: true,
      _count: {
        select: {
          competitors: true,
          demandForecasts: true,
          priceRecommendations: true,
          promotions: true,
        },
      },
    },
  });
}

export async function createRevenueConfig(data: {
  clientId: number;
  businessName?: string;
  businessType?: string;
  currency?: string;
  pricingStrategy?: PricingStrategy;
  minPriceFloor?: number;
  maxPriceCeiling?: number;
  priceChangeFrequency?: string;
  forecastHorizonDays?: number;
  competitorMonitoring?: boolean;
  autoApproveChanges?: boolean;
  maxAutoChangePercent?: number;
}) {
  return prisma.revenueManagementConfig.create({
    data: {
      clientId: data.clientId,
      businessName: data.businessName,
      businessType: data.businessType,
      currency: data.currency ?? 'USD',
      pricingStrategy: data.pricingStrategy ?? PricingStrategy.DYNAMIC,
      minPriceFloor: data.minPriceFloor,
      maxPriceCeiling: data.maxPriceCeiling,
      priceChangeFrequency: data.priceChangeFrequency ?? 'daily',
      forecastHorizonDays: data.forecastHorizonDays ?? 90,
      competitorMonitoring: data.competitorMonitoring ?? true,
      autoApproveChanges: data.autoApproveChanges ?? false,
      maxAutoChangePercent: data.maxAutoChangePercent ?? 10,
    },
  });
}

export async function updateRevenueConfig(
  configId: number,
  data: {
    businessName?: string;
    businessType?: string;
    pricingStrategy?: PricingStrategy;
    minPriceFloor?: number;
    maxPriceCeiling?: number;
    priceChangeFrequency?: string;
    forecastHorizonDays?: number;
    competitorMonitoring?: boolean;
    autoApproveChanges?: boolean;
    maxAutoChangePercent?: number;
  },
) {
  return prisma.revenueManagementConfig.update({
    where: { id: configId },
    data,
  });
}

// ============ Rate Categories Management ============

export async function getRateCategories(configId: number) {
  return prisma.rateCategory.findMany({
    where: { configId },
    orderBy: { baseRate: 'asc' },
  });
}

export async function createRateCategory(data: {
  configId: number;
  code: string;
  name: string;
  description?: string;
  categoryType: string;
  baseRate: number;
  minRate?: number;
  maxRate?: number;
  totalInventory?: number;
  maxOccupancy?: number;
  pricingEnabled?: boolean;
  demandMultiplier?: number;
}) {
  return prisma.rateCategory.create({
    data: {
      configId: data.configId,
      code: data.code,
      name: data.name,
      description: data.description,
      categoryType: data.categoryType,
      baseRate: data.baseRate,
      minRate: data.minRate,
      maxRate: data.maxRate,
      totalInventory: data.totalInventory,
      maxOccupancy: data.maxOccupancy,
      pricingEnabled: data.pricingEnabled ?? true,
      demandMultiplier: data.demandMultiplier ?? 1.0,
      isActive: true,
    },
  });
}

export async function updateRateCategory(
  categoryId: number,
  data: {
    name?: string;
    description?: string;
    baseRate?: number;
    minRate?: number;
    maxRate?: number;
    totalInventory?: number;
    maxOccupancy?: number;
    pricingEnabled?: boolean;
    demandMultiplier?: number;
    isActive?: boolean;
  },
) {
  return prisma.rateCategory.update({
    where: { id: categoryId },
    data,
  });
}

export async function deleteRateCategory(categoryId: number) {
  return prisma.rateCategory.delete({
    where: { id: categoryId },
  });
}

// ============ Competitor Management ============

export async function getCompetitors(configId: number) {
  return prisma.competitor.findMany({
    where: { configId },
    include: {
      rates: {
        take: 10,
        orderBy: { scrapedAt: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function createCompetitor(data: {
  configId: number;
  name: string;
  website?: string;
  starRating?: number;
  location?: string;
  trackingEnabled?: boolean;
  scrapeUrl?: string;
  apiEndpoint?: string;
  categoryMapping?: Record<string, unknown>;
}) {
  return prisma.competitor.create({
    data: {
      configId: data.configId,
      name: data.name,
      website: data.website,
      starRating: data.starRating,
      location: data.location,
      trackingEnabled: data.trackingEnabled ?? true,
      scrapeUrl: data.scrapeUrl,
      apiEndpoint: data.apiEndpoint,
      categoryMapping: data.categoryMapping as Prisma.InputJsonValue,
      isActive: true,
    },
  });
}

export async function updateCompetitor(
  competitorId: number,
  data: {
    name?: string;
    website?: string;
    starRating?: number;
    location?: string;
    trackingEnabled?: boolean;
    scrapeUrl?: string;
    apiEndpoint?: string;
    categoryMapping?: Record<string, unknown>;
    isActive?: boolean;
  },
) {
  return prisma.competitor.update({
    where: { id: competitorId },
    data: {
      ...data,
      categoryMapping: data.categoryMapping as Prisma.InputJsonValue,
    },
  });
}

export async function recordCompetitorRate(data: {
  competitorId: number;
  date: Date;
  categoryCode?: string;
  rate: number;
  availability?: boolean;
  restrictions?: Record<string, unknown>;
}) {
  const rate = await prisma.competitorRate.create({
    data: {
      competitorId: data.competitorId,
      date: data.date,
      categoryCode: data.categoryCode,
      rate: data.rate,
      availability: data.availability ?? true,
      restrictions: data.restrictions as Prisma.InputJsonValue,
      scrapedAt: new Date(),
    },
  });

  // Update competitor's last scraped timestamp
  await prisma.competitor.update({
    where: { id: data.competitorId },
    data: {
      lastScrapedAt: new Date(),
    },
  });

  return rate;
}

export async function getCompetitorRates(
  competitorId: number,
  filters?: {
    startDate?: Date;
    endDate?: Date;
    categoryCode?: string;
  },
) {
  return prisma.competitorRate.findMany({
    where: {
      competitorId,
      ...(filters?.categoryCode && { categoryCode: filters.categoryCode }),
      ...(filters?.startDate &&
        filters?.endDate && {
          date: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        }),
    },
    orderBy: { date: 'desc' },
  });
}

// ============ Demand Forecasting ============

export async function getDemandForecasts(
  configId: number,
  filters?: {
    startDate?: Date;
    endDate?: Date;
    categoryId?: number;
  },
) {
  return prisma.demandForecast.findMany({
    where: {
      configId,
      ...(filters?.categoryId && { categoryId: filters.categoryId }),
      ...(filters?.startDate &&
        filters?.endDate && {
          forecastDate: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        }),
    },
    orderBy: { forecastDate: 'asc' },
  });
}

export async function generateDemandForecasts(
  configId: number,
  options?: {
    startDate?: Date;
    daysAhead?: number;
  },
) {
  const config = await prisma.revenueManagementConfig.findUnique({
    where: { id: configId },
    include: {
      rateCategories: true,
      bookings: {
        orderBy: { bookingDate: 'desc' },
        take: 365,
      },
    },
  });

  if (!config) {
    throw new Error('Revenue configuration not found');
  }

  const startDate = options?.startDate || new Date();
  const daysAhead = options?.daysAhead || 90;
  const forecasts: DemandForecast[] = [];

  for (let i = 0; i < daysAhead; i++) {
    const forecastDate = new Date(startDate);
    forecastDate.setDate(forecastDate.getDate() + i);
    forecastDate.setHours(0, 0, 0, 0);

    const forecast = await generateDailyForecast(
      config as unknown as ConfigWithRelations,
      forecastDate,
    );
    const factors = forecast.factors as DemandFactors;
    const isWeekend = factors.dayOfWeek?.reason === 'Weekend';

    const savedForecast = await prisma.demandForecast.upsert({
      where: {
        configId_categoryId_forecastDate: {
          configId,
          categoryId: null as unknown as number,
          forecastDate: forecastDate,
        },
      },
      update: {
        predictedDemand: forecast.demand,
        predictedBookings: Math.round(forecast.demand),
        confidenceLevel: forecast.confidence,
        demandDrivers: forecast.factors as Prisma.InputJsonValue,
        isWeekend,
      },
      create: {
        configId,
        forecastDate: forecastDate,
        predictedDemand: forecast.demand,
        predictedBookings: Math.round(forecast.demand),
        confidenceLevel: forecast.confidence,
        demandDrivers: forecast.factors as Prisma.InputJsonValue,
        isWeekend,
      },
    });

    forecasts.push(savedForecast);
  }

  return forecasts;
}

async function generateDailyForecast(
  config: ConfigWithRelations,
  date: Date,
): Promise<{
  demand: number;
  occupancy: number;
  revenue: number;
  confidence: number;
  factors: Record<string, unknown>;
}> {
  const factors: Record<string, unknown> = {};
  let baseDemand = 50; // Base demand percentage

  // Day of week factor
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
  if (isWeekend) {
    baseDemand += 20;
    factors.dayOfWeek = { impact: '+20%', reason: 'Weekend' };
  } else {
    factors.dayOfWeek = { impact: '0%', reason: 'Weekday' };
  }

  // Seasonal factor
  const month = date.getMonth();
  const seasonalFactors = (config.seasonalFactors || {}) as Record<
    string,
    number
  >;
  const monthNames = [
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec',
  ];
  const seasonalMultiplier = seasonalFactors[monthNames[month]] || 1.0;
  const seasonalImpact = Math.round((seasonalMultiplier - 1) * 100);
  baseDemand *= seasonalMultiplier;
  factors.seasonal = {
    impact: `${seasonalImpact >= 0 ? '+' : ''}${seasonalImpact}%`,
    multiplier: seasonalMultiplier,
  };

  // Historical pattern (simplified)
  const historicalBookings =
    config.bookings?.filter((b: BookingData) => {
      const bookingDate = new Date(b.stayDate);
      return bookingDate.getDay() === dayOfWeek;
    }) || [];

  if (historicalBookings.length > 0) {
    const avgOccupancy =
      historicalBookings.reduce(
        (sum: number, b: BookingData) => sum + (b.occupancy || 50),
        0,
      ) / historicalBookings.length;
    const historicalImpact = Math.round((avgOccupancy - 50) / 5) * 5;
    baseDemand += historicalImpact;
    factors.historical = {
      impact: `${historicalImpact >= 0 ? '+' : ''}${historicalImpact}%`,
      basedOn: historicalBookings.length,
    };
  }

  // Random variation for realism
  const variation = (Math.random() - 0.5) * 10;
  baseDemand += variation;

  // Cap demand between 10 and 100
  const demand = Math.min(100, Math.max(10, Math.round(baseDemand)));

  // Calculate occupancy and revenue
  const occupancy = Math.round(demand * 0.9); // Slight conversion loss
  const avgRate = config.minPriceFloor || 150; // Use min price floor as baseline
  const revenue = Math.round(occupancy * avgRate);

  // Confidence based on data availability
  const confidence = Math.min(0.85, 0.5 + historicalBookings.length * 0.02);

  return {
    demand,
    occupancy,
    revenue,
    confidence,
    factors,
  };
}

// ============ Price Recommendations ============

export async function getPriceRecommendations(
  configId: number,
  filters?: {
    startDate?: Date;
    endDate?: Date;
    categoryId?: number;
    status?: string;
  },
) {
  return prisma.priceRecommendation.findMany({
    where: {
      configId,
      ...(filters?.categoryId && {
        categoryId: filters.categoryId,
      }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.startDate &&
        filters?.endDate && {
          date: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        }),
    },
    include: {
      category: true,
    },
    orderBy: { date: 'asc' },
  });
}

export async function generatePriceRecommendations(
  configId: number,
  options?: {
    startDate?: Date;
    daysAhead?: number;
  },
) {
  const config = await prisma.revenueManagementConfig.findUnique({
    where: { id: configId },
    include: {
      rateCategories: { where: { isActive: true } },
      competitors: {
        where: { isActive: true },
        include: {
          rates: {
            take: 30,
            orderBy: { scrapedAt: 'desc' },
          },
        },
      },
      demandForecasts: {
        orderBy: { forecastDate: 'asc' },
        take: 90,
      },
    },
  });

  if (!config) {
    throw new Error('Revenue configuration not found');
  }

  // Transform config to match ConfigWithRelations interface
  const configWithRelations: ConfigWithRelations = {
    id: config.id,
    pricingStrategy: config.pricingStrategy,
    minPriceFloor: config.minPriceFloor,
    maxPriceCeiling: config.maxPriceCeiling,
    seasonalFactors: config.pmsCredentials,
    rateCategories: config.rateCategories,
    demandForecasts: config.demandForecasts.map((f) => ({
      forecastDate: f.forecastDate,
      predictedDemand: f.predictedDemand,
    })),
    competitors: config.competitors.map((c) => ({
      rates: c.rates.map((r) => ({
        date: r.date,
        rate: Number(r.rate),
      })),
    })),
  };

  const startDate = options?.startDate || new Date();
  const daysAhead = options?.daysAhead || 30;
  const recommendations: PriceRecommendation[] = [];

  const rateCategories = config.rateCategories || [];
  for (const category of rateCategories) {
    for (let i = 0; i < daysAhead; i++) {
      const recommendationDate = new Date(startDate);
      recommendationDate.setDate(recommendationDate.getDate() + i);
      recommendationDate.setHours(0, 0, 0, 0);

      const recommendation = await generateRecommendation(
        configWithRelations,
        category,
        recommendationDate,
      );

      // Check if recommendation exists for this config, category, and date
      const existing = await prisma.priceRecommendation.findFirst({
        where: {
          configId,
          categoryId: category.id,
          date: recommendationDate,
        },
      });

      const changePercent =
        ((recommendation.recommendedRate - recommendation.currentRate) /
          recommendation.currentRate) *
        100;

      let savedRecommendation: PriceRecommendation;
      if (existing) {
        savedRecommendation = await prisma.priceRecommendation.update({
          where: { id: existing.id },
          data: {
            currentRate: recommendation.currentRate,
            recommendedRate: recommendation.recommendedRate,
            changePercent,
            confidence: recommendation.confidence,
            status: 'pending',
          },
        });
      } else {
        savedRecommendation = await prisma.priceRecommendation.create({
          data: {
            configId,
            categoryId: category.id,
            date: recommendationDate,
            currentRate: recommendation.currentRate,
            recommendedRate: recommendation.recommendedRate,
            changePercent,
            confidence: recommendation.confidence,
            status: 'pending',
          },
        });
      }

      recommendations.push(savedRecommendation);
    }
  }

  return recommendations;
}

async function generateRecommendation(
  config: ConfigWithRelations,
  category: RateCategory,
  date: Date,
): Promise<{
  currentRate: number;
  recommendedRate: number;
  minRate: number;
  maxRate: number;
  confidence: number;
  factors: Record<string, unknown>;
  expectedRevenue: number;
  expectedOccupancy: number;
}> {
  const factors: Record<string, unknown> = {};
  const baseRateNum = Number(category.baseRate);
  let recommendedRate = baseRateNum;

  // Get demand forecast for this date
  const forecast = config.demandForecasts?.find((f: DemandForecastData) => {
    const fDate = new Date(f.forecastDate);
    return fDate.toDateString() === date.toDateString();
  });

  if (forecast) {
    // Adjust based on demand
    const demandMultiplier = forecast.predictedDemand / 50; // 50 is baseline
    const demandWeight = 0.5; // Default demand weight
    const demandAdjustment =
      (demandMultiplier - 1) * demandWeight * baseRateNum;
    recommendedRate += demandAdjustment;
    factors.demand = {
      predictedDemand: forecast.predictedDemand,
      multiplier: demandMultiplier,
      adjustment: Math.round(demandAdjustment),
    };
  }

  // Get competitor average for similar dates
  const competitorRates =
    config.competitors?.flatMap(
      (c: CompetitorWithRates) =>
        c.rates?.filter((r: RateData) => {
          const rDate = new Date(r.date);
          return (
            Math.abs(rDate.getTime() - date.getTime()) < 7 * 24 * 60 * 60 * 1000
          );
        }) || [],
    ) || [];

  if (competitorRates.length > 0) {
    const avgCompetitorRate =
      competitorRates.reduce((sum: number, r: RateData) => sum + Number(r.rate), 0) /
      competitorRates.length;
    const competitorWeight = 0.3; // Default competitor weight
    const competitorAdjustment =
      (avgCompetitorRate - baseRateNum) * competitorWeight;
    recommendedRate += competitorAdjustment;
    factors.competitors = {
      avgRate: Math.round(avgCompetitorRate),
      count: competitorRates.length,
      adjustment: Math.round(competitorAdjustment),
    };
  }

  // Apply pricing strategy adjustments
  switch (config.pricingStrategy) {
    case PricingStrategy.COMPETITIVE:
      recommendedRate *= 1.1;
      factors.strategy = { type: 'competitive', adjustment: '+10%' };
      break;
    case PricingStrategy.STATIC:
      recommendedRate *= 0.95;
      factors.strategy = { type: 'static', adjustment: '-5%' };
      break;
    case PricingStrategy.DYNAMIC:
      // Already dynamic through demand adjustment
      factors.strategy = { type: 'dynamic', adjustment: 'demand-based' };
      break;
    case PricingStrategy.DEMAND_BASED:
      // Demand-based pricing already applied through forecast
      factors.strategy = {
        type: 'demand-based',
        adjustment: 'forecast-driven',
      };
      break;
    case PricingStrategy.TIME_BASED:
      factors.strategy = { type: 'time-based', adjustment: 'schedule-driven' };
      break;
    default:
      factors.strategy = { type: 'balanced', adjustment: '0%' };
  }

  // Apply min/max constraints
  const minRate =
    Number(category.minRate) || config.minPriceFloor || baseRateNum * 0.7;
  const maxRate =
    Number(category.maxRate) || config.maxPriceCeiling || baseRateNum * 1.5;
  recommendedRate = Math.min(maxRate, Math.max(minRate, recommendedRate));

  // Round to nearest 5
  recommendedRate = Math.round(recommendedRate / 5) * 5;

  // Calculate expected metrics
  const expectedOccupancy = forecast?.predictedDemand || 70;
  const expectedRevenue = recommendedRate * (expectedOccupancy / 100) * 100; // Assuming 100 units

  // Confidence based on data quality
  const confidence = Math.min(
    0.9,
    0.5 + competitorRates.length * 0.03 + (forecast ? 0.2 : 0),
  );

  return {
    currentRate: baseRateNum,
    recommendedRate,
    minRate,
    maxRate,
    confidence,
    factors,
    expectedRevenue: Math.round(expectedRevenue),
    expectedOccupancy,
  };
}

export async function applyRecommendation(
  recommendationId: number,
  _appliedBy: string,
) {
  const recommendation = await prisma.priceRecommendation.findUnique({
    where: { id: recommendationId },
    include: { category: true },
  });

  if (!recommendation) {
    throw new Error('Recommendation not found');
  }

  // Update the rate category's base rate
  await prisma.rateCategory.update({
    where: { id: recommendation.categoryId },
    data: { baseRate: recommendation.recommendedRate },
  });

  // Mark recommendation as applied
  return prisma.priceRecommendation.update({
    where: { id: recommendationId },
    data: {
      status: 'applied',
      appliedAt: new Date(),
    },
  });
}

// ============ Promotions Management ============

export async function getPromotions(
  configId: number,
  filters?: {
    isActive?: boolean;
    startDate?: Date;
    endDate?: Date;
  },
) {
  return prisma.revenuePromotion.findMany({
    where: {
      configId,
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters?.startDate && {
        startDate: { lte: filters.endDate || new Date() },
        endDate: { gte: filters.startDate },
      }),
    },
    orderBy: { startDate: 'asc' },
  });
}

export async function createPromotion(data: {
  configId: number;
  name: string;
  description?: string;
  discountType: string;
  discountValue: number;
  startDate: Date;
  endDate: Date;
  applicableCategories?: string[];
  maxUsage?: number;
  code?: string;
}) {
  return prisma.revenuePromotion.create({
    data: {
      configId: data.configId,
      name: data.name,
      description: data.description,
      discountType: data.discountType,
      discountValue: data.discountValue,
      startDate: data.startDate,
      endDate: data.endDate,
      applicableCategories: data.applicableCategories ?? [],
      maxUsage: data.maxUsage,
      usageCount: 0,
      code: data.code,
      isActive: true,
    },
  });
}

export async function updatePromotion(
  promotionId: number,
  data: {
    name?: string;
    description?: string;
    discountType?: string;
    discountValue?: number;
    startDate?: Date;
    endDate?: Date;
    applicableCategories?: string[];
    maxUsage?: number;
    isActive?: boolean;
  },
) {
  return prisma.revenuePromotion.update({
    where: { id: promotionId },
    data,
  });
}

// ============ Booking Data Management ============

export async function recordBooking(data: {
  configId: number;
  bookingDate: Date;
  stayDate: Date;
  checkoutDate?: Date;
  categoryId?: number;
  rate: number;
  nights?: number;
  totalRevenue: number;
  channel?: string;
  leadTimeDays?: number;
  promotionCode?: string;
}) {
  return prisma.bookingData.create({
    data: {
      configId: data.configId,
      bookingDate: data.bookingDate,
      stayDate: data.stayDate,
      checkoutDate: data.checkoutDate,
      categoryId: data.categoryId,
      rate: data.rate,
      nights: data.nights ?? 1,
      totalRevenue: data.totalRevenue,
      channel: data.channel,
      leadTimeDays: data.leadTimeDays,
      promotionCode: data.promotionCode,
    },
  });
}

export async function getBookings(
  configId: number,
  filters?: {
    startDate?: Date;
    endDate?: Date;
    channel?: string;
  },
) {
  return prisma.bookingData.findMany({
    where: {
      configId,
      ...(filters?.channel && { channel: filters.channel }),
      ...(filters?.startDate &&
        filters?.endDate && {
          stayDate: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        }),
    },
    orderBy: { stayDate: 'desc' },
  });
}

// ============ Analytics ============

export async function getRevenueAnalytics(
  configId: number,
  filters?: {
    startDate?: Date;
    endDate?: Date;
  },
) {
  const startDate =
    filters?.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const endDate = filters?.endDate || new Date();

  const [bookings, recommendations, promotions, analytics] = await Promise.all([
    prisma.bookingData.findMany({
      where: {
        configId,
        stayDate: { gte: startDate, lte: endDate },
      },
    }),
    prisma.priceRecommendation.findMany({
      where: {
        configId,
        date: { gte: startDate, lte: endDate },
      },
    }),
    prisma.revenuePromotion.findMany({
      where: {
        configId,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    }),
    prisma.revenueManagementAnalytics.findMany({
      where: {
        configId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    }),
  ]);

  // Calculate key metrics
  const totalRevenue = bookings.reduce(
    (sum, b) => sum + Number(b.totalRevenue),
    0,
  );
  const totalRoomNights = bookings.reduce((sum, b) => sum + b.nights, 0);
  const avgDailyRate = totalRoomNights > 0 ? totalRevenue / totalRoomNights : 0;

  // Calculate RevPAR (assuming 100 available rooms)
  const availableRoomNights =
    100 *
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000),
    );
  const revPAR =
    availableRoomNights > 0 ? totalRevenue / availableRoomNights : 0;
  const occupancy = (totalRoomNights / availableRoomNights) * 100;

  // Revenue by channel
  const revenueByChannel: Record<string, number> = {};
  for (const booking of bookings) {
    const channel = booking.channel || 'direct';
    revenueByChannel[channel] =
      (revenueByChannel[channel] || 0) + Number(booking.totalRevenue);
  }

  // Revenue by rate type (instead of segment which doesn't exist)
  const revenueByRateType: Record<string, number> = {};
  for (const booking of bookings) {
    const rateType = booking.rateType || 'STANDARD';
    revenueByRateType[rateType] =
      (revenueByRateType[rateType] || 0) + Number(booking.totalRevenue);
  }

  // Recommendation performance
  const appliedRecommendations = recommendations.filter(
    (r) => r.status === 'applied',
  );
  const pendingRecommendations = recommendations.filter(
    (r) => r.status === 'pending',
  );
  const avgConfidence =
    recommendations.length > 0
      ? recommendations.reduce((sum, r) => sum + (r.confidence ?? 0), 0) /
        recommendations.length
      : 0;

  return {
    historicalData: analytics,
    currentMetrics: {
      totalRevenue: Math.round(totalRevenue),
      totalRoomNights,
      avgDailyRate: Math.round(avgDailyRate * 100) / 100,
      revPAR: Math.round(revPAR * 100) / 100,
      occupancy: Math.round(occupancy * 100) / 100,
      totalBookings: bookings.length,
      activePromotions: promotions.filter((p) => p.isActive).length,
      pendingRecommendations: pendingRecommendations.length,
      appliedRecommendations: appliedRecommendations.length,
      avgRecommendationConfidence: Math.round(avgConfidence * 100) / 100,
    },
    revenueByChannel,
    revenueByRateType,
    promotionPerformance: promotions.map((p) => ({
      name: p.name,
      usageCount: p.usageCount,
      discountType: p.discountType,
      discountValue: p.discountValue,
      isActive: p.isActive,
    })),
  };
}

export async function recordDailyAnalytics(configId: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bookings = await prisma.bookingData.findMany({
    where: {
      configId,
      stayDate: today,
    },
  });

  const totalRevenue = bookings.reduce(
    (sum, b) => sum + Number(b.totalRevenue),
    0,
  );
  const totalRoomNights = bookings.reduce((sum, b) => sum + b.nights, 0);
  const avgRate = totalRoomNights > 0 ? totalRevenue / totalRoomNights : 0;

  // Assuming 100 available rooms
  const availableRooms = 100;
  const occupancyRate = (totalRoomNights / availableRooms) * 100;
  const revPar = totalRevenue / availableRooms;

  return prisma.revenueManagementAnalytics.upsert({
    where: {
      configId_date: {
        configId,
        date: today,
      },
    },
    update: {
      totalRevenue,
      soldInventory: totalRoomNights,
      adr: avgRate,
      occupancyRate,
      revPar,
    },
    create: {
      configId,
      date: today,
      totalRevenue,
      soldInventory: totalRoomNights,
      adr: avgRate,
      occupancyRate,
      revPar,
    },
  });
}

// ============ Authorization Helpers ============

export async function getClientIdFromRevenueConfig(
  configId: number,
): Promise<number | null> {
  const config = await prisma.revenueManagementConfig.findUnique({
    where: { id: configId },
    select: { clientId: true },
  });
  return config?.clientId ?? null;
}

export async function getClientIdFromRateCategory(
  categoryId: number,
): Promise<number | null> {
  const category = await prisma.rateCategory.findUnique({
    where: { id: categoryId },
    include: { config: { select: { clientId: true } } },
  });
  return category?.config?.clientId ?? null;
}

export async function getClientIdFromCompetitor(
  competitorId: number,
): Promise<number | null> {
  const competitor = await prisma.competitor.findUnique({
    where: { id: competitorId },
    include: { config: { select: { clientId: true } } },
  });
  return competitor?.config?.clientId ?? null;
}

export async function getClientIdFromPromotion(
  promotionId: number,
): Promise<number | null> {
  const promotion = await prisma.revenuePromotion.findUnique({
    where: { id: promotionId },
    include: { config: { select: { clientId: true } } },
  });
  return promotion?.config?.clientId ?? null;
}

export async function getClientIdFromRecommendation(
  recommendationId: number,
): Promise<number | null> {
  const recommendation = await prisma.priceRecommendation.findUnique({
    where: { id: recommendationId },
    include: { config: { select: { clientId: true } } },
  });
  return recommendation?.config?.clientId ?? null;
}
