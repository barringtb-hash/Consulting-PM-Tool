import { ProjectStatus } from '@prisma/client';
import { z } from 'zod';

// Input length limits for security (prevents resource exhaustion)
const MAX_NAME_LENGTH = 200;

const projectDatesRefinement = (
  data: { startDate?: Date; endDate?: Date },
  ctx: z.RefinementCtx,
) => {
  if (data.startDate && data.endDate && data.endDate < data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'End date cannot be before the start date',
      path: ['endDate'],
    });
  }
};

export const projectCreateSchema = z
  .object({
    accountId: z.number().int().positive().optional(), // Preferred: link to CRM Account
    clientId: z.number().int().positive().optional(), // @deprecated - use accountId
    name: z.string().min(1, 'Name is required').max(MAX_NAME_LENGTH),
    status: z.nativeEnum(ProjectStatus).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    isSharedWithTenant: z.boolean().optional(), // When true, all users in tenant can view
  })
  .refine(
    (data) => data.accountId !== undefined || data.clientId !== undefined,
    'Either accountId or clientId is required',
  )
  .superRefine(projectDatesRefinement);

export const projectUpdateSchema = projectCreateSchema
  .partial()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    'At least one field must be provided',
  )
  .superRefine(projectDatesRefinement);

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
