import { z } from 'zod';

export const contactCreateSchema = z.object({
  clientId: z.number().int().positive(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email(),
  role: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export const contactUpdateSchema = contactCreateSchema
  .omit({ clientId: true })
  .extend({ clientId: z.number().int().positive().optional() })
  .partial()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    'At least one field must be provided',
  );

export type ContactCreateInput = z.infer<typeof contactCreateSchema>;
export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;
