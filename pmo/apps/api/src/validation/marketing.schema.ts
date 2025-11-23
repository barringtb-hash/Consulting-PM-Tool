import { z } from 'zod';

import {
  CreateMarketingContentSchema,
  UpdateMarketingContentSchema,
  GenerateContentSchema,
  RepurposeContentSchema,
  type CreateMarketingContentInput,
  type UpdateMarketingContentInput,
  type GenerateContentInput,
  type RepurposeContentInput,
} from '../types/marketing';

export const marketingContentCreateSchema = CreateMarketingContentSchema;
export const marketingContentUpdateSchema = UpdateMarketingContentSchema;
export const generateContentSchema = GenerateContentSchema;
export const repurposeContentSchema = RepurposeContentSchema;

export const marketingContentListQuerySchema = z.object({
  clientId: z.coerce.number().int().positive().optional(),
  projectId: z.coerce.number().int().positive().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  archived: z.coerce.boolean().optional(),
});

export type MarketingContentCreateInput = CreateMarketingContentInput;
export type MarketingContentUpdateInput = UpdateMarketingContentInput;
export type MarketingContentListQuery = z.infer<
  typeof marketingContentListQuerySchema
>;
export type GenerateContentParams = GenerateContentInput;
export type RepurposeContentParams = RepurposeContentInput;
