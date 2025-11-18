import { ProjectStatus } from '@prisma/client';
import { z } from 'zod';

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
    clientId: z.number().int().positive(),
    name: z.string().min(1, 'Name is required'),
    status: z.nativeEnum(ProjectStatus).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  })
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
