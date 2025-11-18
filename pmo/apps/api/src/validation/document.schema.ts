import { DocumentType } from '@prisma/client';
import { z } from 'zod';

export const documentCreateSchema = z.object({
  clientId: z.number().int().positive(),
  projectId: z.number().int().positive().optional(),
  type: z.nativeEnum(DocumentType).optional(),
  filename: z.string().min(1, 'Filename is required'),
  url: z.string().url('A valid URL is required'),
});

export const documentGenerateSchema = documentCreateSchema
  .omit({ url: true })
  .extend({
    url: z.string().url('A valid URL is required').optional(),
  });

export type DocumentCreateInput = z.infer<typeof documentCreateSchema>;
export type DocumentGenerateInput = z.infer<typeof documentGenerateSchema>;
