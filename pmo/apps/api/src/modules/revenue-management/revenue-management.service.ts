import { PrismaClient, PricingStrategy, RateType } from '@prisma/client';

const prisma = new PrismaClient();

// ============ Configuration Management ============

export async function getRevenueConfig(clientId: string) {
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
  clientId: string;
  businessType: string;
  currency: string;
  pricingStrategy: PricingStrategy;
  minPrice?: number;
  maxPrice?: number;
  targetOccupancy?: number;
  targetRevPAR?: number;
  seasonalFactors?: Record<string, any>;
  competitorWeight?: number;
  demandWeight?: number;
  autoAdjustEnabled?: boolean;
  adjustmentFrequency?: string;
}) {
  return prisma.revenueManagementConfig.create({
    data: {
      clientId: data.clientId,
      businessType: data.businessType,
      currency: data.currency,
      pricingStrategy: data.pricingStrategy,
      minPrice: data.minPrice,
      maxPrice: data.maxPrice,
      targetOccupancy: data.targetOccupancy,
      targetRevPAR: data.targetRevPAR,
      seasonalFactors: data.seasonalFactors ?? {},
      competitorWeight: data.competitorWeight ?? 0.3,
      demandWeight: data.demandWeight ?? 0.5,
      autoAdjustEnabled: data.autoAdjustEnabled ?? false,
      adjustmentFrequency: data.adjustmentFrequency ?? 'daily',
    },
  });
}

export async function updateRevenueConfig(
  configId: string,
  data: {
    businessType?: string;
    pricingStrategy?: PricingStrategy;
    minPrice?: number;
    maxPrice?: number;
    targetOccupancy?: number;
    targetRevPAR?: number;
    seasonalFactors?: Record<string, any>;
    competitorWeight?: number;
    demandWeight?: number;
    autoAdjustEnabled?: boolean;
    adjustmentFrequency?: string;
  }
) {
  return prisma.revenueManagementConfig.update({
    where: { id: configId },
    data,
  });
}

// ============ Rate Categories Management ============

export async function getRateCategories(configId: string) {
  return prisma.rateCategory.findMany({
    where: { configId },
    orderBy: { baseRate: 'asc' },
  });
}

export async function createRateCategory(data: {
  configId: string;
  name: string;
  description?: string;
  rateType: RateType;
  baseRate: number;
  minRate?: number;
  maxRate?: number;
  restrictions?: Record<string, any>;
  amenities?: string[];
  cancellationPolicy?: string;
}) {
  return prisma.rateCategory.create({
    data: {
      configId: data.configId,
      name: data.name,
      description: data.description,
      rateType: data.rateType,
      baseRate: data.baseRate,
      minRate: data.minRate,
      maxRate: data.maxRate,
      restrictions: data.restrictions ?? {},
      amenities: data.amenities ?? [],
      cancellationPolicy: data.cancellationPolicy,
      isActive: true,
    },
  });
}

export async function updateRateCategory(
  categoryId: string,
  data: {
    name?: string;
    description?: string;
    baseRate?: number;
    minRate?: number;
    maxRate?: number;
    restrictions?: Record<string, any>;
    amenities?: string[];
    cancellationPolicy?: string;
    isActive?: boolean;
  }
) {
  return prisma.rateCategory.update({
    where: { id: categoryId },
    data,
  });
}

export async function deleteRateCategory(categoryId: string) {
  return prisma.rateCategory.delete({
    where: { id: categoryId },
  });
}

// ============ Competitor Management ============

export async function getCompetitors(configId: string) {
  return prisma.competitor.findMany({
    where: { configId },
    include: {
      rates: {
        take: 10,
        orderBy: { capturedAt: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function createCompetitor(data: {
  configId: string;
  name: string;
  website?: string;
  starRating?: number;
  location?: string;
  amenities?: string[];
  targetSegments?: string[];
  notes?: string;
}) {
  return prisma.competitor.create({
    data: {
      configId: data.configId,
      name: data.name,
      website: data.website,
      starRating: data.starRating,
      location: data.location,
      amenities: data.amenities ?? [],
      targetSegments: data.targetSegments ?? [],
      notes: data.notes,
      isActive: true,
    },
  });
}

export async function updateCompetitor(
  competitorId: string,
  data: {
    name?: string;
    website?: string;
    starRating?: number;
    location?: string;
    amenities?: string[];
    targetSegments?: string[];
    notes?: string;
    isActive?: boolean;
  }
) {
  return prisma.competitor.update({
    where: { id: competitorId },
    data,
  });
}

export async function recordCompetitorRate(data: {
  competitorId: string;
  rateType: string;
  rate: number;
  roomType?: string;
  date: Date;
  source?: string;
  notes?: string;
}) {
  const rate = await prisma.competitorRate.create({
    data: {
      competitorId: data.competitorId,
      rateType: data.rateType,
      rate: data.rate,
      roomType: data.roomType,
      date: data.date,
      source: data.source,
      notes: data.notes,
      capturedAt: new Date(),
    },
  });

  // Update competitor's last rate info
  await prisma.competitor.update({
    where: { id: data.competitorId },
    data: {
      lastRateCheck: new Date(),
    },
  });

  return rate;
}

export async function getCompetitorRates(competitorId: string, filters?: {
  startDate?: Date;
  endDate?: Date;
  rateType?: string;
}) {
  return prisma.competitorRate.findMany({
    where: {
      competitorId,
      ...(filters?.rateType && { rateType: filters.rateType }),
      ...(filters?.startDate && filters?.endDate && {
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

export async function getDemandForecasts(configId: string, filters?: {
  startDate?: Date;
  endDate?: Date;
  segment?: string;
}) {
  return prisma.demandForecast.findMany({
    where: {
      configId,
      ...(filters?.segment && { segment: filters.segment }),
      ...(filters?.startDate && filters?.endDate && {
        date: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      }),
    },
    orderBy: { date: 'asc' },
  });
}

export async function generateDemandForecasts(configId: string, options?: {
  startDate?: Date;
  daysAhead?: number;
}) {
  const config = await prisma.revenueManagementConfig.findUnique({
    where: { id: configId },
    include: {
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
  const forecasts: any[] = [];

  for (let i = 0; i < daysAhead; i++) {
    const forecastDate = new Date(startDate);
    forecastDate.setDate(forecastDate.getDate() + i);
    forecastDate.setHours(0, 0, 0, 0);

    const forecast = await generateDailyForecast(config, forecastDate);

    const savedForecast = await prisma.demandForecast.upsert({
      where: {
        configId_date_segment: {
          configId,
          date: forecastDate,
          segment: 'all',
        },
      },
      update: {
        predictedDemand: forecast.demand,
        predictedOccupancy: forecast.occupancy,
        predictedRevenue: forecast.revenue,
        confidence: forecast.confidence,
        factors: forecast.factors,
      },
      create: {
        configId,
        date: forecastDate,
        segment: 'all',
        predictedDemand: forecast.demand,
        predictedOccupancy: forecast.occupancy,
        predictedRevenue: forecast.revenue,
        confidence: forecast.confidence,
        factors: forecast.factors,
      },
    });

    forecasts.push(savedForecast);
  }

  return forecasts;
}

async function generateDailyForecast(config: any, date: Date): Promise<{
  demand: number;
  occupancy: number;
  revenue: number;
  confidence: number;
  factors: Record<string, any>;
}> {
  const factors: Record<string, any> = {};
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
  const seasonalFactors = config.seasonalFactors || {};
  const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const seasonalMultiplier = seasonalFactors[monthNames[month]] || 1.0;
  const seasonalImpact = Math.round((seasonalMultiplier - 1) * 100);
  baseDemand *= seasonalMultiplier;
  factors.seasonal = { impact: `${seasonalImpact >= 0 ? '+' : ''}${seasonalImpact}%`, multiplier: seasonalMultiplier };

  // Historical pattern (simplified)
  const historicalBookings = config.bookings?.filter((b: any) => {
    const bookingDate = new Date(b.stayDate);
    return bookingDate.getDay() === dayOfWeek;
  }) || [];

  if (historicalBookings.length > 0) {
    const avgOccupancy = historicalBookings.reduce((sum: number, b: any) => sum + (b.occupancy || 50), 0) / historicalBookings.length;
    const historicalImpact = Math.round((avgOccupancy - 50) / 5) * 5;
    baseDemand += historicalImpact;
    factors.historical = { impact: `${historicalImpact >= 0 ? '+' : ''}${historicalImpact}%`, basedOn: historicalBookings.length };
  }

  // Random variation for realism
  const variation = (Math.random() - 0.5) * 10;
  baseDemand += variation;

  // Cap demand between 10 and 100
  const demand = Math.min(100, Math.max(10, Math.round(baseDemand)));

  // Calculate occupancy and revenue
  const occupancy = Math.round(demand * 0.9); // Slight conversion loss
  const avgRate = config.targetRevPAR || 150;
  const revenue = Math.round(occupancy * avgRate);

  // Confidence based on data availability
  const confidence = Math.min(0.85, 0.5 + (historicalBookings.length * 0.02));

  return {
    demand,
    occupancy,
    revenue,
    confidence,
    factors,
  };
}

// ============ Price Recommendations ============

export async function getPriceRecommendations(configId: string, filters?: {
  startDate?: Date;
  endDate?: Date;
  rateCategoryId?: string;
  status?: string;
}) {
  return prisma.priceRecommendation.findMany({
    where: {
      configId,
      ...(filters?.rateCategoryId && { rateCategoryId: filters.rateCategoryId }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.startDate && filters?.endDate && {
        date: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      }),
    },
    include: {
      rateCategory: true,
    },
    orderBy: { date: 'asc' },
  });
}

export async function generatePriceRecommendations(configId: string, options?: {
  startDate?: Date;
  daysAhead?: number;
}) {
  const config = await prisma.revenueManagementConfig.findUnique({
    where: { id: configId },
    include: {
      rateCategories: { where: { isActive: true } },
      competitors: {
        where: { isActive: true },
        include: {
          rates: {
            take: 30,
            orderBy: { capturedAt: 'desc' },
          },
        },
      },
      demandForecasts: {
        orderBy: { date: 'asc' },
        take: 90,
      },
    },
  });

  if (!config) {
    throw new Error('Revenue configuration not found');
  }

  const startDate = options?.startDate || new Date();
  const daysAhead = options?.daysAhead || 30;
  const recommendations: any[] = [];

  for (const category of config.rateCategories) {
    for (let i = 0; i < daysAhead; i++) {
      const recommendationDate = new Date(startDate);
      recommendationDate.setDate(recommendationDate.getDate() + i);
      recommendationDate.setHours(0, 0, 0, 0);

      const recommendation = await generateRecommendation(config, category, recommendationDate);

      const savedRecommendation = await prisma.priceRecommendation.upsert({
        where: {
          configId_rateCategoryId_date: {
            configId,
            rateCategoryId: category.id,
            date: recommendationDate,
          },
        },
        update: {
          currentRate: recommendation.currentRate,
          recommendedRate: recommendation.recommendedRate,
          minRate: recommendation.minRate,
          maxRate: recommendation.maxRate,
          confidence: recommendation.confidence,
          factors: recommendation.factors,
          expectedRevenue: recommendation.expectedRevenue,
          expectedOccupancy: recommendation.expectedOccupancy,
          status: 'pending',
        },
        create: {
          configId,
          rateCategoryId: category.id,
          date: recommendationDate,
          currentRate: recommendation.currentRate,
          recommendedRate: recommendation.recommendedRate,
          minRate: recommendation.minRate,
          maxRate: recommendation.maxRate,
          confidence: recommendation.confidence,
          factors: recommendation.factors,
          expectedRevenue: recommendation.expectedRevenue,
          expectedOccupancy: recommendation.expectedOccupancy,
          status: 'pending',
        },
      });

      recommendations.push(savedRecommendation);
    }
  }

  return recommendations;
}

async function generateRecommendation(
  config: any,
  category: any,
  date: Date
): Promise<{
  currentRate: number;
  recommendedRate: number;
  minRate: number;
  maxRate: number;
  confidence: number;
  factors: Record<string, any>;
  expectedRevenue: number;
  expectedOccupancy: number;
}> {
  const factors: Record<string, any> = {};
  let recommendedRate = category.baseRate;

  // Get demand forecast for this date
  const forecast = config.demandForecasts?.find((f: any) => {
    const fDate = new Date(f.date);
    return fDate.toDateString() === date.toDateString();
  });

  if (forecast) {
    // Adjust based on demand
    const demandMultiplier = forecast.predictedDemand / 50; // 50 is baseline
    const demandAdjustment = (demandMultiplier - 1) * config.demandWeight * category.baseRate;
    recommendedRate += demandAdjustment;
    factors.demand = {
      predictedDemand: forecast.predictedDemand,
      multiplier: demandMultiplier,
      adjustment: Math.round(demandAdjustment),
    };
  }

  // Get competitor average for similar dates
  const competitorRates = config.competitors?.flatMap((c: any) =>
    c.rates?.filter((r: any) => {
      const rDate = new Date(r.date);
      return Math.abs(rDate.getTime() - date.getTime()) < 7 * 24 * 60 * 60 * 1000;
    }) || []
  ) || [];

  if (competitorRates.length > 0) {
    const avgCompetitorRate = competitorRates.reduce((sum: number, r: any) => sum + r.rate, 0) / competitorRates.length;
    const competitorAdjustment = (avgCompetitorRate - category.baseRate) * config.competitorWeight;
    recommendedRate += competitorAdjustment;
    factors.competitors = {
      avgRate: Math.round(avgCompetitorRate),
      count: competitorRates.length,
      adjustment: Math.round(competitorAdjustment),
    };
  }

  // Apply pricing strategy adjustments
  switch (config.pricingStrategy) {
    case PricingStrategy.AGGRESSIVE:
      recommendedRate *= 1.1;
      factors.strategy = { type: 'aggressive', adjustment: '+10%' };
      break;
    case PricingStrategy.CONSERVATIVE:
      recommendedRate *= 0.95;
      factors.strategy = { type: 'conservative', adjustment: '-5%' };
      break;
    case PricingStrategy.DYNAMIC:
      // Already dynamic through demand adjustment
      factors.strategy = { type: 'dynamic', adjustment: 'demand-based' };
      break;
    default:
      factors.strategy = { type: 'balanced', adjustment: '0%' };
  }

  // Apply min/max constraints
  const minRate = category.minRate || config.minPrice || category.baseRate * 0.7;
  const maxRate = category.maxRate || config.maxPrice || category.baseRate * 1.5;
  recommendedRate = Math.min(maxRate, Math.max(minRate, recommendedRate));

  // Round to nearest 5
  recommendedRate = Math.round(recommendedRate / 5) * 5;

  // Calculate expected metrics
  const expectedOccupancy = forecast?.predictedOccupancy || 70;
  const expectedRevenue = recommendedRate * (expectedOccupancy / 100) * 100; // Assuming 100 units

  // Confidence based on data quality
  const confidence = Math.min(0.9, 0.5 + (competitorRates.length * 0.03) + (forecast ? 0.2 : 0));

  return {
    currentRate: category.baseRate,
    recommendedRate,
    minRate,
    maxRate,
    confidence,
    factors,
    expectedRevenue: Math.round(expectedRevenue),
    expectedOccupancy,
  };
}

export async function applyRecommendation(recommendationId: string, appliedBy: string) {
  const recommendation = await prisma.priceRecommendation.findUnique({
    where: { id: recommendationId },
    include: { rateCategory: true },
  });

  if (!recommendation) {
    throw new Error('Recommendation not found');
  }

  // Update the rate category's base rate
  await prisma.rateCategory.update({
    where: { id: recommendation.rateCategoryId },
    data: { baseRate: recommendation.recommendedRate },
  });

  // Mark recommendation as applied
  return prisma.priceRecommendation.update({
    where: { id: recommendationId },
    data: {
      status: 'applied',
      appliedAt: new Date(),
      appliedBy,
    },
  });
}

// ============ Promotions Management ============

export async function getPromotions(configId: string, filters?: {
  isActive?: boolean;
  startDate?: Date;
  endDate?: Date;
}) {
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
  configId: string;
  name: string;
  description?: string;
  discountType: string;
  discountValue: number;
  startDate: Date;
  endDate: Date;
  applicableRateCategories?: string[];
  conditions?: Record<string, any>;
  bookingWindow?: Record<string, any>;
  usageLimit?: number;
  promoCode?: string;
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
      applicableRateCategories: data.applicableRateCategories ?? [],
      conditions: data.conditions ?? {},
      bookingWindow: data.bookingWindow ?? {},
      usageLimit: data.usageLimit,
      usageCount: 0,
      promoCode: data.promoCode,
      isActive: true,
    },
  });
}

export async function updatePromotion(
  promotionId: string,
  data: {
    name?: string;
    description?: string;
    discountType?: string;
    discountValue?: number;
    startDate?: Date;
    endDate?: Date;
    applicableRateCategories?: string[];
    conditions?: Record<string, any>;
    usageLimit?: number;
    isActive?: boolean;
  }
) {
  return prisma.revenuePromotion.update({
    where: { id: promotionId },
    data,
  });
}

// ============ Booking Data Management ============

export async function recordBooking(data: {
  configId: string;
  bookingReference: string;
  bookingDate: Date;
  stayDate: Date;
  checkoutDate: Date;
  rateCategory?: string;
  roomNights: number;
  revenue: number;
  channel?: string;
  segment?: string;
  leadTime?: number;
  guestCount?: number;
  promotionUsed?: string;
}) {
  return prisma.bookingData.create({
    data: {
      configId: data.configId,
      bookingReference: data.bookingReference,
      bookingDate: data.bookingDate,
      stayDate: data.stayDate,
      checkoutDate: data.checkoutDate,
      rateCategory: data.rateCategory,
      roomNights: data.roomNights,
      revenue: data.revenue,
      channel: data.channel,
      segment: data.segment,
      leadTime: data.leadTime,
      guestCount: data.guestCount,
      promotionUsed: data.promotionUsed,
    },
  });
}

export async function getBookings(configId: string, filters?: {
  startDate?: Date;
  endDate?: Date;
  channel?: string;
  segment?: string;
}) {
  return prisma.bookingData.findMany({
    where: {
      configId,
      ...(filters?.channel && { channel: filters.channel }),
      ...(filters?.segment && { segment: filters.segment }),
      ...(filters?.startDate && filters?.endDate && {
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

export async function getRevenueAnalytics(configId: string, filters?: {
  startDate?: Date;
  endDate?: Date;
}) {
  const startDate = filters?.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
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
    prisma.revenueAnalytics.findMany({
      where: {
        configId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    }),
  ]);

  // Calculate key metrics
  const totalRevenue = bookings.reduce((sum, b) => sum + b.revenue, 0);
  const totalRoomNights = bookings.reduce((sum, b) => sum + b.roomNights, 0);
  const avgDailyRate = totalRoomNights > 0 ? totalRevenue / totalRoomNights : 0;

  // Calculate RevPAR (assuming 100 available rooms)
  const availableRoomNights = 100 * Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
  const revPAR = availableRoomNights > 0 ? totalRevenue / availableRoomNights : 0;
  const occupancy = (totalRoomNights / availableRoomNights) * 100;

  // Revenue by channel
  const revenueByChannel: Record<string, number> = {};
  for (const booking of bookings) {
    const channel = booking.channel || 'direct';
    revenueByChannel[channel] = (revenueByChannel[channel] || 0) + booking.revenue;
  }

  // Revenue by segment
  const revenueBySegment: Record<string, number> = {};
  for (const booking of bookings) {
    const segment = booking.segment || 'leisure';
    revenueBySegment[segment] = (revenueBySegment[segment] || 0) + booking.revenue;
  }

  // Recommendation performance
  const appliedRecommendations = recommendations.filter(r => r.status === 'applied');
  const pendingRecommendations = recommendations.filter(r => r.status === 'pending');
  const avgConfidence = recommendations.length > 0
    ? recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length
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
      activePromotions: promotions.filter(p => p.isActive).length,
      pendingRecommendations: pendingRecommendations.length,
      appliedRecommendations: appliedRecommendations.length,
      avgRecommendationConfidence: Math.round(avgConfidence * 100) / 100,
    },
    revenueByChannel,
    revenueBySegment,
    promotionPerformance: promotions.map(p => ({
      name: p.name,
      usageCount: p.usageCount,
      discountType: p.discountType,
      discountValue: p.discountValue,
      isActive: p.isActive,
    })),
  };
}

export async function recordDailyAnalytics(configId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bookings = await prisma.bookingData.findMany({
    where: {
      configId,
      stayDate: today,
    },
  });

  const totalRevenue = bookings.reduce((sum, b) => sum + b.revenue, 0);
  const totalRoomNights = bookings.reduce((sum, b) => sum + b.roomNights, 0);
  const avgRate = totalRoomNights > 0 ? totalRevenue / totalRoomNights : 0;

  // Assuming 100 available rooms
  const availableRooms = 100;
  const occupancy = (totalRoomNights / availableRooms) * 100;
  const revPAR = totalRevenue / availableRooms;

  return prisma.revenueAnalytics.upsert({
    where: {
      configId_date: {
        configId,
        date: today,
      },
    },
    update: {
      totalRevenue,
      roomNightsSold: totalRoomNights,
      averageRate: avgRate,
      occupancy,
      revPAR,
      bookingsCount: bookings.length,
    },
    create: {
      configId,
      date: today,
      totalRevenue,
      roomNightsSold: totalRoomNights,
      averageRate: avgRate,
      occupancy,
      revPAR,
      bookingsCount: bookings.length,
    },
  });
}

// ============ Authorization Helpers ============

export async function getClientIdFromRevenueConfig(configId: string): Promise<string | null> {
  const config = await prisma.revenueManagementConfig.findUnique({
    where: { id: configId },
    select: { clientId: true },
  });
  return config?.clientId ?? null;
}

export async function getClientIdFromRateCategory(categoryId: string): Promise<string | null> {
  const category = await prisma.rateCategory.findUnique({
    where: { id: categoryId },
    include: { config: { select: { clientId: true } } },
  });
  return category?.config?.clientId ?? null;
}

export async function getClientIdFromCompetitor(competitorId: string): Promise<string | null> {
  const competitor = await prisma.competitor.findUnique({
    where: { id: competitorId },
    include: { config: { select: { clientId: true } } },
  });
  return competitor?.config?.clientId ?? null;
}

export async function getClientIdFromPromotion(promotionId: string): Promise<string | null> {
  const promotion = await prisma.revenuePromotion.findUnique({
    where: { id: promotionId },
    include: { config: { select: { clientId: true } } },
  });
  return promotion?.config?.clientId ?? null;
}

export async function getClientIdFromRecommendation(recommendationId: string): Promise<string | null> {
  const recommendation = await prisma.priceRecommendation.findUnique({
    where: { id: recommendationId },
    include: { config: { select: { clientId: true } } },
  });
  return recommendation?.config?.clientId ?? null;
}
