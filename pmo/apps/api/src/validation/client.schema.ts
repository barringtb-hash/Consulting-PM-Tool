import { AiMaturity, CompanySize } from '@prisma/client';
import { z } from 'zod';

// Input length limits for security (prevents resource exhaustion)
const MAX_NAME_LENGTH = 200;
const MAX_INDUSTRY_LENGTH = 100;
const MAX_TIMEZONE_LENGTH = 100;
const MAX_NOTES_LENGTH = 5000;

export const clientCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(MAX_NAME_LENGTH),
  industry: z.string().max(MAX_INDUSTRY_LENGTH).optional(),
  companySize: z.nativeEnum(CompanySize).optional(),
  timezone: z.string().max(MAX_TIMEZONE_LENGTH).optional(),
  aiMaturity: z.nativeEnum(AiMaturity).optional(),
  notes: z.string().max(MAX_NOTES_LENGTH).optional(),
});

export const clientUpdateSchema = clientCreateSchema
  .partial()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    'At least one field must be provided',
  );

export type ClientCreateInput = z.infer<typeof clientCreateSchema>;
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;
