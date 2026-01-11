/**
 * Finance AI Services Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as tenantContext from '../src/tenant/tenant.context';

// Mock the tenant context
vi.mock('../src/tenant/tenant.context', () => ({
  getTenantId: vi.fn(() => 'test-tenant-id'),
}));

// Mock the prisma client - must be inline because vi.mock is hoisted
vi.mock('../src/prisma/client', () => {
  const mockPrisma = {
    expenseCategory: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    expense: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      groupBy: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
      updateMany: vi.fn(),
    },
    recurringCost: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
    budget: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    $disconnect: vi.fn().mockResolvedValue(undefined),
  };
  return {
    prisma: mockPrisma,
    default: mockPrisma,
  };
});

// Import after mocks
import { prisma } from '../src/prisma/client';
import * as categorizationService from '../src/modules/finance-tracking/ai/categorization.service';
import * as anomalyService from '../src/modules/finance-tracking/ai/anomaly-detection.service';
import * as forecastingService from '../src/modules/finance-tracking/ai/forecasting.service';

describe('Finance AI Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (tenantContext.getTenantId as ReturnType<typeof vi.fn>).mockReturnValue(
      'test-tenant-id',
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Categorization Service', () => {
    describe('suggestCategory', () => {
      it('should return empty suggestions when no categories exist', async () => {
        (
          prisma.expenseCategory.findMany as ReturnType<typeof vi.fn>
        ).mockResolvedValue([]);

        const result =
          await categorizationService.suggestCategory('Test expense');

        expect(result).toEqual({ suggestions: [], usedAI: false });
      });

      it('should return rule-based suggestions for known keywords', async () => {
        const mockCategories = [
          {
            id: 1,
            name: 'Cloud Infrastructure',
            description: 'AWS, GCP, Azure',
          },
          {
            id: 2,
            name: 'SaaS Subscriptions',
            description: 'Software subscriptions',
          },
        ];

        (
          prisma.expenseCategory.findMany as ReturnType<typeof vi.fn>
        ).mockResolvedValue(mockCategories);
        (prisma.expense.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue(
          [],
        );
        (prisma.expense.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
          [],
        );

        const result =
          await categorizationService.suggestCategory('AWS monthly bill');

        expect(result.usedAI).toBe(false);
        expect(result.suggestions.length).toBeGreaterThan(0);
        expect(result.suggestions[0].categoryName).toBe('Cloud Infrastructure');
      });

      it('should use historical data for vendor matching', async () => {
        const mockCategories = [
          { id: 1, name: 'SaaS Subscriptions', description: 'Software' },
        ];

        (
          prisma.expenseCategory.findMany as ReturnType<typeof vi.fn>
        ).mockResolvedValue(mockCategories);
        (prisma.expense.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue([
          { categoryId: 1, _count: 5 },
        ]);
        (
          prisma.expenseCategory.findUnique as ReturnType<typeof vi.fn>
        ).mockResolvedValue({ id: 1, name: 'SaaS Subscriptions' });
        (prisma.expense.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
          [],
        );

        const result = await categorizationService.suggestCategory(
          'Monthly subscription',
          'Slack Technologies',
        );

        expect(result.suggestions.length).toBeGreaterThan(0);
        expect(result.suggestions[0].categoryId).toBe(1);
        expect(result.suggestions[0].reason).toContain('Slack Technologies');
      });
    });

    describe('recordCategorizationFeedback', () => {
      it('should log feedback without throwing', async () => {
        const consoleSpy = vi
          .spyOn(console, 'log')
          .mockImplementation(() => {});

        await expect(
          categorizationService.recordCategorizationFeedback({
            expenseId: 1,
            suggestedCategoryId: 2,
            actualCategoryId: 3,
            wasAccepted: false,
          }),
        ).resolves.toBeUndefined();

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
      });
    });
  });

  describe('Anomaly Detection Service', () => {
    describe('detectExpenseAnomalies', () => {
      it('should detect high amount anomaly', async () => {
        const mockExpense = {
          id: 1,
          amount: 10000,
          description: 'Large purchase',
          date: new Date(),
          vendorName: 'Test Vendor',
          ownerId: 1,
          createdAt: new Date(),
          categoryId: 1,
          category: { id: 1, name: 'Test Category' },
        };

        (
          prisma.expense.findFirst as ReturnType<typeof vi.fn>
        ).mockResolvedValue(mockExpense);
        // Mock baseline data showing normal amounts around $100
        (prisma.expense.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
          Array(10)
            .fill(null)
            .map(() => ({ amount: 100 })),
        );
        (
          prisma.expenseCategory.findUnique as ReturnType<typeof vi.fn>
        ).mockResolvedValue({ name: 'Test Category' });
        (prisma.expense.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

        const anomalies = await anomalyService.detectExpenseAnomalies(1);

        expect(anomalies).toBeInstanceOf(Array);
        // Should detect anomaly since 10000 is way above average of 100
        const highAmountAnomaly = anomalies.find(
          (a) => a.type === 'UNUSUALLY_HIGH_AMOUNT',
        );
        expect(highAmountAnomaly).toBeDefined();
        expect(highAmountAnomaly?.severity).toBe('HIGH');
      });

      it('should detect duplicate expense', async () => {
        const mockExpense = {
          id: 2,
          amount: 500,
          description: 'Office supplies',
          date: new Date(),
          vendorName: 'Staples',
          ownerId: 1,
          createdAt: new Date(),
          categoryId: 1,
          category: { id: 1, name: 'Office Supplies' },
        };

        (
          prisma.expense.findFirst as ReturnType<typeof vi.fn>
        ).mockResolvedValue(mockExpense);
        // Mock finding similar expenses (duplicates)
        // Order matters: checkAmountAnomaly (baseline) runs first, then checkDuplicateExpense
        (prisma.expense.findMany as ReturnType<typeof vi.fn>)
          .mockResolvedValueOnce([]) // baseline check (returns empty, so no amount anomaly)
          .mockResolvedValueOnce([
            {
              id: 1,
              description: 'Office supplies',
              amount: 500,
              date: new Date(),
              vendorName: 'Staples',
            },
          ]); // duplicates check - should find similar expense
        (prisma.expense.count as ReturnType<typeof vi.fn>)
          .mockResolvedValueOnce(0) // vendor check
          .mockResolvedValueOnce(1); // rapid spending check
        (
          prisma.expenseCategory.findUnique as ReturnType<typeof vi.fn>
        ).mockResolvedValue({ name: 'Office Supplies' });

        const anomalies = await anomalyService.detectExpenseAnomalies(2);

        const duplicateAnomaly = anomalies.find(
          (a) => a.type === 'DUPLICATE_EXPENSE',
        );
        expect(duplicateAnomaly).toBeDefined();
        expect(duplicateAnomaly?.severity).toBe('MEDIUM');
      });

      it('should detect round number expense', async () => {
        const mockExpense = {
          id: 3,
          amount: 1000,
          description: 'Consulting fee',
          date: new Date(),
          vendorName: null,
          ownerId: 1,
          createdAt: new Date(),
          categoryId: 1,
          category: { id: 1, name: 'Professional Services' },
        };

        (
          prisma.expense.findFirst as ReturnType<typeof vi.fn>
        ).mockResolvedValue(mockExpense);
        (prisma.expense.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
          [],
        );
        (prisma.expense.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

        const anomalies = await anomalyService.detectExpenseAnomalies(3);

        const roundAnomaly = anomalies.find((a) => a.type === 'ROUND_NUMBER');
        expect(roundAnomaly).toBeDefined();
        expect(roundAnomaly?.severity).toBe('LOW');
      });
    });

    describe('scanPendingExpenses', () => {
      it('should scan and flag pending expenses', async () => {
        (prisma.expense.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
          [{ id: 1 }, { id: 2 }],
        );
        (
          prisma.expense.findFirst as ReturnType<typeof vi.fn>
        ).mockResolvedValue({
          id: 1,
          amount: 100,
          description: 'Test',
          date: new Date(),
          vendorName: null,
          ownerId: 1,
          createdAt: new Date(),
          categoryId: 1,
          category: { id: 1, name: 'Test' },
        });
        (
          prisma.expense.updateMany as ReturnType<typeof vi.fn>
        ).mockResolvedValue({
          count: 1,
        });
        (prisma.expense.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);

        const result = await anomalyService.scanPendingExpenses();

        expect(result).toHaveProperty('scanned');
        expect(result).toHaveProperty('flagged');
        expect(result.scanned).toBe(2);
      });
    });
  });

  describe('Forecasting Service', () => {
    describe('generateSpendingForecast', () => {
      it('should return empty forecast when insufficient data', async () => {
        (prisma.expense.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
          [],
        );

        const result = await forecastingService.generateSpendingForecast({});

        expect(result.forecasts).toEqual([]);
        expect(result.summary.totalPredicted).toBe(0);
        expect(result.summary.trend).toBe('STABLE');
        expect(result.summary.trendPercentage).toBe(0);
        expect(result.summary.confidence).toBe(0);
        expect(result.byCategory).toEqual([]);
      });

      it('should generate forecast with enough data', async () => {
        // Mock 6 months of historical data
        const historicalData = [
          { amount: 1000, date: new Date('2024-06-15') },
          { amount: 1100, date: new Date('2024-07-15') },
          { amount: 1050, date: new Date('2024-08-15') },
          { amount: 1200, date: new Date('2024-09-15') },
          { amount: 1150, date: new Date('2024-10-15') },
          { amount: 1300, date: new Date('2024-11-15') },
        ];

        (prisma.expense.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
          historicalData,
        );
        (prisma.expense.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue(
          [],
        );

        const forecast = await forecastingService.generateSpendingForecast({
          periods: 3,
          periodType: 'MONTH',
        });

        expect(forecast.forecasts).toHaveLength(3);
        expect(forecast.summary).toHaveProperty('totalPredicted');
        expect(forecast.summary).toHaveProperty('trend');
        expect(forecast.summary).toHaveProperty('confidence');
        expect(['INCREASING', 'DECREASING', 'STABLE']).toContain(
          forecast.summary.trend,
        );
      });
    });

    describe('generateBudgetRecommendations', () => {
      it('should generate recommendations based on spending patterns', async () => {
        const mockCategorySpending = [
          { categoryId: 1, _avg: { amount: 500 }, _count: 10 },
        ];

        (prisma.expense.groupBy as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockCategorySpending,
        );
        (
          prisma.expenseCategory.findUnique as ReturnType<typeof vi.fn>
        ).mockResolvedValue({ id: 1, name: 'Cloud Infrastructure' });
        (prisma.expense.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
          [
            { amount: 400, date: new Date('2024-06-15') },
            { amount: 500, date: new Date('2024-07-15') },
            { amount: 600, date: new Date('2024-08-15') },
          ],
        );
        (prisma.budget.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
          {
            amount: 1000,
          },
        );

        const recommendations =
          await forecastingService.generateBudgetRecommendations();

        expect(recommendations).toBeInstanceOf(Array);
        expect(recommendations.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe('getFinancialInsights', () => {
      it('should return insights with key metrics', async () => {
        (prisma.expense.aggregate as ReturnType<typeof vi.fn>)
          .mockResolvedValueOnce({ _sum: { amount: 5000 }, _count: 20 })
          .mockResolvedValueOnce({ _sum: { amount: 4500 }, _count: 18 });
        (prisma.budget.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
          { amount: 10000, spent: 5000 },
        ]);
        (
          prisma.recurringCost.aggregate as ReturnType<typeof vi.fn>
        ).mockResolvedValue({
          _sum: { amount: 2000 },
        });

        const insights = await forecastingService.getFinancialInsights();

        expect(insights).toHaveProperty('summary');
        expect(insights).toHaveProperty('keyMetrics');
        expect(insights).toHaveProperty('recommendations');
        expect(insights.keyMetrics).toBeInstanceOf(Array);
        expect(insights.keyMetrics.length).toBe(3);
      });
    });
  });
});
