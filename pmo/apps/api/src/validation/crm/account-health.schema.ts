/**
 * Validation schemas for Account Health Score API endpoints
 */

import { z } from 'zod';

export const calculateHealthScoreSchema = z.object({
  usageScore: z.number().min(0).max(100).optional(),
  supportScore: z.number().min(0).max(100).optional(),
  engagementScore: z.number().min(0).max(100).optional(),
  sentimentScore: z.number().min(0).max(100).optional(),
  financialScore: z.number().min(0).max(100).optional(),
  usageWeight: z.number().min(0).max(100).optional(),
  supportWeight: z.number().min(0).max(100).optional(),
  engagementWeight: z.number().min(0).max(100).optional(),
  sentimentWeight: z.number().min(0).max(100).optional(),
  financialWeight: z.number().min(0).max(100).optional(),
  calculationNotes: z.string().max(1000).optional(),
});

export const listAccountsByHealthSchema = z.object({
  category: z.enum(['HEALTHY', 'AT_RISK', 'CRITICAL']).optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
  maxScore: z.coerce.number().min(0).max(100).optional(),
  minChurnRisk: z.coerce.number().min(0).max(1).optional(),
  sortBy: z.enum(['healthScore', 'churnRisk', 'name']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
  offset: z.coerce.number().min(0).optional(),
});

export const getHealthHistorySchema = z.object({
  days: z.coerce.number().min(1).max(365).optional().default(30),
});

export type CalculateHealthScoreInput = z.infer<
  typeof calculateHealthScoreSchema
>;
export type ListAccountsByHealthInput = z.infer<
  typeof listAccountsByHealthSchema
>;
export type GetHealthHistoryInput = z.infer<typeof getHealthHistorySchema>;
