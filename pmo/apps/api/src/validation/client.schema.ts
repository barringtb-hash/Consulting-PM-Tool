import { AiMaturity, CompanySize } from '@prisma/client';
import { z } from 'zod';

export const clientCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  industry: z.string().optional(),
  companySize: z.nativeEnum(CompanySize).optional(),
  timezone: z.string().optional(),
  aiMaturity: z.nativeEnum(AiMaturity).optional(),
  notes: z.string().optional(),
});

export const clientUpdateSchema = clientCreateSchema
  .partial()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    'At least one field must be provided',
  );

export type ClientCreateInput = z.infer<typeof clientCreateSchema>;
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;
