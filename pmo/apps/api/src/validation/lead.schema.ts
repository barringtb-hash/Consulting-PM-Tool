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
  // Project creation (for delivery tracking - no pipeline fields)
  createProject: z.boolean().default(false),
  projectName: z.string().optional(),
  // Opportunity creation (for sales pipeline tracking)
  createOpportunity: z.boolean().default(true),
  opportunityName: z.string().optional(),
  opportunityAmount: z.number().optional(),
  opportunityProbability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().datetime().optional(),
  // Legacy fields - kept for backward compatibility but deprecated
  /** @deprecated Use createOpportunity and opportunityAmount instead */
  pipelineStage: z.string().optional(),
  /** @deprecated Use createOpportunity and opportunityAmount instead */
  pipelineValue: z.number().optional(),
  ownerId: z.number().int().positive().optional(),
});

export const publicLeadCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  company: z.string().optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  serviceInterest: z
    .nativeEnum(ServiceInterest)
    .default(ServiceInterest.NOT_SURE),
  message: z.string().optional(),
  source: z.nativeEnum(LeadSource).default(LeadSource.WEBSITE_CONTACT),
  // Tracking fields
  page: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmContent: z.string().optional(),
  utmTerm: z.string().optional(),
});

export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;
export type LeadConvertInput = z.infer<typeof leadConvertSchema>;
export type PublicLeadCreateInput = z.infer<typeof publicLeadCreateSchema>;
