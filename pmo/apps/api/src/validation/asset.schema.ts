import { z } from 'zod';

import {
  CreateAIAssetSchema,
  UpdateAIAssetSchema,
  type CreateAIAssetInput,
  type UpdateAIAssetInput,
} from '../types/assets';

export const assetCreateSchema = CreateAIAssetSchema;

export const assetUpdateSchema = UpdateAIAssetSchema;

export const assetCloneSchema = z.object({
  name: z.string().min(1).optional(),
  clientId: z.number().int().positive().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isTemplate: z.boolean().optional(),
});

export const assetProjectLinkSchema = z.object({
  notes: z.string().optional(),
});

export type AssetCreateInput = CreateAIAssetInput;
export type AssetUpdateInput = UpdateAIAssetInput;
export type AssetCloneInput = z.infer<typeof assetCloneSchema>;
export type AssetProjectLinkInput = z.infer<typeof assetProjectLinkSchema>;
