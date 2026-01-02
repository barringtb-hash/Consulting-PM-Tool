/**
 * Project Document Validation Schemas
 * Zod schemas for project document API validation
 */

import { z } from 'zod';
import {
  ProjectDocumentType,
  ProjectDocumentStatus,
  ProjectDocumentCategory,
} from '@prisma/client';

// ============================================================================
// Enums as Zod schemas
// ============================================================================

export const projectDocumentTypeSchema = z.nativeEnum(ProjectDocumentType);
export const projectDocumentStatusSchema = z.nativeEnum(ProjectDocumentStatus);
export const projectDocumentCategorySchema = z.nativeEnum(
  ProjectDocumentCategory,
);

// ============================================================================
// Create Document Schema
// ============================================================================

export const createProjectDocumentSchema = z.object({
  templateType: projectDocumentTypeSchema,
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  content: z.record(z.string(), z.unknown()).optional(), // Optional: use template default if not provided
});

export type CreateProjectDocumentInput = z.infer<
  typeof createProjectDocumentSchema
>;

// ============================================================================
// Update Document Schema
// ============================================================================

export const updateProjectDocumentSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name too long')
    .optional(),
  description: z
    .string()
    .max(1000, 'Description too long')
    .nullish()
    .transform((val) => val ?? undefined),
  content: z.record(z.string(), z.unknown()).optional(),
  status: projectDocumentStatusSchema.optional(),
});

export type UpdateProjectDocumentInput = z.infer<
  typeof updateProjectDocumentSchema
>;

// ============================================================================
// Update Status Schema
// ============================================================================

export const updateDocumentStatusSchema = z.object({
  status: projectDocumentStatusSchema,
});

export type UpdateDocumentStatusInput = z.infer<
  typeof updateDocumentStatusSchema
>;

// ============================================================================
// Query Parameters Schema
// ============================================================================

export const listProjectDocumentsQuerySchema = z.object({
  templateType: projectDocumentTypeSchema.optional(),
  category: projectDocumentCategorySchema.optional(),
  status: projectDocumentStatusSchema.optional(),
  search: z.string().optional(),
});

export type ListProjectDocumentsQuery = z.infer<
  typeof listProjectDocumentsQuerySchema
>;

// ============================================================================
// Clone Document Schema
// ============================================================================

export const cloneProjectDocumentSchema = z.object({
  newName: z.string().min(1, 'Name is required').max(255, 'Name too long'),
});

export type CloneProjectDocumentInput = z.infer<
  typeof cloneProjectDocumentSchema
>;

// ============================================================================
// Restore Version Schema
// ============================================================================

export const restoreVersionSchema = z.object({
  version: z.number().int().positive('Version must be a positive integer'),
});

export type RestoreVersionInput = z.infer<typeof restoreVersionSchema>;

// ============================================================================
// ID Parameter Schema
// ============================================================================

export const idParamSchema = z.object({
  id: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
});

export const projectIdParamSchema = z.object({
  projectId: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
});

export const documentIdParamSchema = z.object({
  documentId: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
});

export const versionParamSchema = z.object({
  version: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
});
