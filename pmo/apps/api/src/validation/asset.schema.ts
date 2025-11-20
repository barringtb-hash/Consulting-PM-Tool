import { AssetType } from '@prisma/client';
import { z } from 'zod';

export const assetCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.nativeEnum(AssetType),
  clientId: z.number().int().positive().nullable().optional(),
  description: z.string().optional(),
  content: z.unknown().optional(),
  tags: z.array(z.string()).optional(),
  isTemplate: z.boolean().optional(),
});

export const assetUpdateSchema = assetCreateSchema.partial();

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

export type AssetCreateInput = z.infer<typeof assetCreateSchema>;
export type AssetUpdateInput = z.infer<typeof assetUpdateSchema>;
export type AssetCloneInput = z.infer<typeof assetCloneSchema>;
export type AssetProjectLinkInput = z.infer<typeof assetProjectLinkSchema>;
