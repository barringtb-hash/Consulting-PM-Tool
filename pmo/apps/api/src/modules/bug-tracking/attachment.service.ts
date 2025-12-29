/**
 * Attachment Service
 *
 * Handles file uploads for bug tracking issues.
 * Stores file metadata and base64 data URLs for simplicity.
 */

import { prisma } from '../../prisma/client';
import { getTenantId, hasTenantContext } from '../../tenant/tenant.context';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateAttachmentInput {
  issueId: number;
  filename: string;
  mimeType: string;
  size: number;
  data: Buffer;
}

export interface AttachmentWithDataUrl {
  id: number;
  issueId: number;
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  createdAt: Date;
  dataUrl?: string;
}

// Allowed MIME types for uploads
// Note: SVG is intentionally excluded due to XSS risk (can contain embedded JavaScript)
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
];

/**
 * Sanitize filename to prevent path traversal and other security issues
 * Removes dangerous characters and path components
 */
function sanitizeFilename(filename: string): string {
  // Remove path components (prevent path traversal)
  let sanitized = filename.replace(/^.*[\\/]/, '');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove or replace dangerous characters
  sanitized = sanitized.replace(/[<>:"/\\|?*]/g, '_');

  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');

  // Limit length to 255 characters
  if (sanitized.length > 255) {
    const ext = sanitized.slice(sanitized.lastIndexOf('.'));
    const name = sanitized.slice(0, sanitized.lastIndexOf('.'));
    sanitized = name.slice(0, 255 - ext.length) + ext;
  }

  // Fallback if filename is empty after sanitization
  if (!sanitized || sanitized.length === 0) {
    sanitized = 'attachment';
  }

  return sanitized;
}

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// ============================================================================
// ATTACHMENT OPERATIONS
// ============================================================================

/**
 * Create an attachment for an issue
 */
export async function createAttachment(
  input: CreateAttachmentInput,
): Promise<AttachmentWithDataUrl> {
  const tenantId = hasTenantContext() ? getTenantId() : null;

  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(input.mimeType)) {
    throw new Error(
      `Invalid file type: ${input.mimeType}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    );
  }

  // Validate file size
  if (input.size > MAX_FILE_SIZE) {
    throw new Error(
      `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    );
  }

  // Verify issue exists and belongs to tenant
  const issue = await prisma.issue.findFirst({
    where: tenantId ? { id: input.issueId, tenantId } : { id: input.issueId },
    select: { id: true },
  });

  if (!issue) {
    throw new Error('Issue not found');
  }

  // Sanitize filename to prevent security issues
  const sanitizedFilename = sanitizeFilename(input.filename);

  // Convert buffer to base64 data URL
  const base64Data = input.data.toString('base64');
  const dataUrl = `data:${input.mimeType};base64,${base64Data}`;

  // Store as a reference URL (in production, you'd upload to S3/GCS)
  // For now, we store a placeholder URL and the actual data is in the dataUrl field
  const attachment = await prisma.issueAttachment.create({
    data: {
      issueId: input.issueId,
      filename: sanitizedFilename,
      url: dataUrl, // Store data URL directly for simplicity
      mimeType: input.mimeType,
      size: input.size,
    },
  });

  return {
    ...attachment,
    dataUrl,
  };
}

/**
 * Get attachments for an issue
 */
export async function getAttachments(
  issueId: number,
): Promise<AttachmentWithDataUrl[]> {
  const tenantId = hasTenantContext() ? getTenantId() : null;

  // Verify issue exists and belongs to tenant
  const issue = await prisma.issue.findFirst({
    where: tenantId ? { id: issueId, tenantId } : { id: issueId },
    select: { id: true },
  });

  if (!issue) {
    throw new Error('Issue not found');
  }

  const attachments = await prisma.issueAttachment.findMany({
    where: { issueId },
    orderBy: { createdAt: 'desc' },
  });

  return attachments.map((attachment) => ({
    ...attachment,
    dataUrl: attachment.url,
  }));
}

/**
 * Get a single attachment by ID
 */
export async function getAttachment(
  id: number,
): Promise<AttachmentWithDataUrl> {
  const attachment = await prisma.issueAttachment.findUnique({
    where: { id },
    include: {
      issue: { select: { id: true, tenantId: true } },
    },
  });

  if (!attachment) {
    throw new Error('Attachment not found');
  }

  // Tenant check
  const tenantId = hasTenantContext() ? getTenantId() : null;
  if (tenantId && attachment.issue.tenantId !== tenantId) {
    throw new Error('Attachment not found');
  }

  return {
    id: attachment.id,
    issueId: attachment.issueId,
    filename: attachment.filename,
    url: attachment.url,
    mimeType: attachment.mimeType,
    size: attachment.size,
    createdAt: attachment.createdAt,
    dataUrl: attachment.url,
  };
}

/**
 * Delete an attachment
 */
export async function deleteAttachment(id: number): Promise<void> {
  const tenantId = hasTenantContext() ? getTenantId() : null;

  const attachment = await prisma.issueAttachment.findUnique({
    where: { id },
    include: {
      issue: { select: { id: true, tenantId: true } },
    },
  });

  if (!attachment) {
    throw new Error('Attachment not found');
  }

  // Tenant check
  if (tenantId && attachment.issue.tenantId !== tenantId) {
    throw new Error('Attachment not found');
  }

  await prisma.issueAttachment.delete({ where: { id } });
}

/**
 * Get attachment descriptions for AI prompt generation
 * Returns a text description of each attachment that can be included in prompts
 */
export async function getAttachmentDescriptions(
  issueId: number,
): Promise<string[]> {
  const attachments = await getAttachments(issueId);

  return attachments.map((attachment) => {
    const sizeKB = Math.round(attachment.size / 1024);
    const isImage = attachment.mimeType.startsWith('image/');

    if (isImage) {
      return `[Screenshot: ${attachment.filename} (${sizeKB}KB) - Visual reference attached]`;
    } else {
      return `[File: ${attachment.filename} (${attachment.mimeType}, ${sizeKB}KB)]`;
    }
  });
}

/**
 * Get image attachments with their data URLs for multimodal AI processing
 */
export async function getImageAttachmentsForAI(
  issueId: number,
): Promise<Array<{ filename: string; mimeType: string; dataUrl: string }>> {
  const attachments = await getAttachments(issueId);

  return attachments
    .filter((a) => a.mimeType.startsWith('image/'))
    .map((a) => ({
      filename: a.filename,
      mimeType: a.mimeType,
      dataUrl: a.dataUrl || a.url,
    }));
}
