import { z } from 'zod';

// Validation for GET /projects/:id/status query params
export const projectStatusQuerySchema = z.object({
  rangeDays: z.coerce.number().int().min(1).max(60).optional().default(7),
});

// Validation for PATCH /projects/:id/status body
export const updateProjectHealthStatusSchema = z.object({
  healthStatus: z.enum(['ON_TRACK', 'AT_RISK', 'OFF_TRACK']),
  statusSummary: z.string().max(1000).optional(),
});

// Validation for POST /projects/:id/status-summary body
export const statusSummaryRequestSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  rangeDays: z.coerce.number().int().min(1).max(60).optional(),
});

export type ProjectStatusQuery = z.infer<typeof projectStatusQuerySchema>;
export type UpdateProjectHealthStatus = z.infer<
  typeof updateProjectHealthStatusSchema
>;
export type StatusSummaryRequest = z.infer<typeof statusSummaryRequestSchema>;
