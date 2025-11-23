import { z } from 'zod';
import { LeadSource, LeadStatus, ServiceInterest } from '@prisma/client';

export const leadCreateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email('Invalid email address'),
  company: z.string().optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  source: z.nativeEnum(LeadSource).default(LeadSource.OTHER),
  serviceInterest: z
    .nativeEnum(ServiceInterest)
    .default(ServiceInterest.NOT_SURE),
  message: z.string().optional(),
  ownerUserId: z.number().int().positive().optional(),
});

export const leadUpdateSchema = z.object({
  name: z.string().optional(),
  email: z.string().email('Invalid email address').optional(),
  company: z.string().optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  source: z.nativeEnum(LeadSource).optional(),
  serviceInterest: z.nativeEnum(ServiceInterest).optional(),
  message: z.string().optional(),
  status: z.nativeEnum(LeadStatus).optional(),
  ownerUserId: z.number().int().positive().optional().nullable(),
  clientId: z.number().int().positive().optional().nullable(),
  primaryContactId: z.number().int().positive().optional().nullable(),
  firstResponseAt: z.string().datetime().optional().nullable(),
});

export const leadConvertSchema = z.object({
  createClient: z.boolean().default(true),
  clientId: z.number().int().positive().optional(),
  createContact: z.boolean().default(true),
  contactRole: z.string().optional(),
  createProject: z.boolean().default(true),
  projectName: z.string().optional(),
  pipelineStage: z.string().optional(),
  pipelineValue: z.number().optional(),
});

export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;
export type LeadConvertInput = z.infer<typeof leadConvertSchema>;
