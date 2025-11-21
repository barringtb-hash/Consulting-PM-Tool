import { z } from 'zod';

export const AssetType = {
  PROMPT_TEMPLATE: 'PROMPT_TEMPLATE',
  WORKFLOW: 'WORKFLOW',
  DATASET: 'DATASET',
  EVALUATION: 'EVALUATION',
  GUARDRAIL: 'GUARDRAIL',
} as const;

export const AssetTypeSchema = z.nativeEnum(AssetType);
export type AssetType = z.infer<typeof AssetTypeSchema>;

/**
 * Conventions for the `content` payload across asset types to support future AI execution:
 * - Prompt templates should include the rendered prompt string, placeholders for variables,
 *   and any output formatting or guardrail hints the model should follow.
 * - Workflows should describe the ordered AI/tool steps (e.g., orchestration graph, tool calls),
 *   including integration metadata for downstream systems the workflow needs to call.
 * - Integration assets should capture connection metadata (API surface, auth strategy, sample
 *   payloads) so orchestration engines can translate AI output directly into executable calls.
 * - Dataset assets should reference the dataset location, schema, and curation notes rather than
 *   embedding large binaries directly in the `content` field.
 * - Training material should summarize playbooks, FAQs, or domain primers that can seed prompt
 *   engineering or retrieval workflows without duplicating proprietary data verbatim.
 */
const AIAssetBaseSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: AssetTypeSchema,
  clientId: z.number().int().positive().nullable().optional(),
  description: z.string().optional(),
  content: z.unknown().optional(),
  tags: z.array(z.string()).optional(),
  isTemplate: z.boolean().optional(),
});

export const CreateAIAssetSchema = AIAssetBaseSchema;
export type CreateAIAssetInput = z.infer<typeof CreateAIAssetSchema>;

export const UpdateAIAssetSchema = AIAssetBaseSchema.partial();
export type UpdateAIAssetInput = z.infer<typeof UpdateAIAssetSchema>;

export const AIAssetDTOSchema = AIAssetBaseSchema.extend({
  id: z.number().int().positive(),
  archived: z.boolean(),
  createdById: z.number().int().positive().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type AIAssetDTO = z.infer<typeof AIAssetDTOSchema>;
