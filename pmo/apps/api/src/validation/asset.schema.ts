import { z } from 'zod';

// Asset type constants and schemas (inlined from @pmo/types for runtime compatibility)
export const AssetType = {
  PROMPT_TEMPLATE: 'PROMPT_TEMPLATE',
  WORKFLOW: 'WORKFLOW',
  DATASET: 'DATASET',
  EVALUATION: 'EVALUATION',
  GUARDRAIL: 'GUARDRAIL',
} as const;

export const AssetTypeSchema = z.nativeEnum(AssetType);
export type AssetType = z.infer<typeof AssetTypeSchema>;

const AIAssetBaseSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be at most 255 characters'),
  type: AssetTypeSchema,
  /** @deprecated Use accountId instead */
  clientId: z.number().int().positive().nullable().optional(),
  accountId: z.number().int().positive().nullable().optional(),
  description: z
    .string()
    .max(10000, 'Description must be at most 10000 characters')
    .optional(),
  content: z.unknown().optional(),
  tags: z
    .array(z.string().max(100, 'Each tag must be at most 100 characters'))
    .max(50, 'At most 50 tags allowed')
    .optional(),
  isTemplate: z.boolean().optional(),
});

export const CreateAIAssetSchema = AIAssetBaseSchema;
export type CreateAIAssetInput = z.infer<typeof CreateAIAssetSchema>;

export const UpdateAIAssetSchema = AIAssetBaseSchema.partial();
export type UpdateAIAssetInput = z.infer<typeof UpdateAIAssetSchema>;

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
