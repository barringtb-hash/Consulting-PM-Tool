import { ProjectStatus, ProjectVisibility, ProjectRole } from '@prisma/client';
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

// Base schema without refinements (for Zod v4 compatibility with .partial())
const projectBaseSchema = z.object({
  accountId: z.number().int().positive().optional(), // Preferred: link to CRM Account
  clientId: z.number().int().positive().optional(), // @deprecated - use accountId
  name: z.string().min(1, 'Name is required').max(MAX_NAME_LENGTH),
  status: z.nativeEnum(ProjectStatus).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  isSharedWithTenant: z.boolean().optional(), // @deprecated - use visibility
  visibility: z.nativeEnum(ProjectVisibility).optional().default('PRIVATE'),
});

export const projectCreateSchema = projectBaseSchema
  .refine(
    (data) => data.accountId !== undefined || data.clientId !== undefined,
    'Either accountId or clientId is required',
  )
  .superRefine(projectDatesRefinement);

export const projectUpdateSchema = projectBaseSchema
  .partial()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    'At least one field must be provided',
  )
  .superRefine(projectDatesRefinement);

export type ProjectCreateInput = z.infer<typeof projectCreateSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;

// Project Member Schemas
export const projectMemberAddSchema = z.object({
  userId: z.number().int().positive('User ID is required'),
  role: z.nativeEnum(ProjectRole).default('VIEW_ONLY'),
});

export const projectMemberUpdateSchema = z.object({
  role: z.nativeEnum(ProjectRole),
});

export const projectMemberBulkAddSchema = z.object({
  members: z
    .array(projectMemberAddSchema)
    .min(1, 'At least one member is required'),
});

export type ProjectMemberAddInput = z.infer<typeof projectMemberAddSchema>;
export type ProjectMemberUpdateInput = z.infer<
  typeof projectMemberUpdateSchema
>;
export type ProjectMemberBulkAddInput = z.infer<
  typeof projectMemberBulkAddSchema
>;
