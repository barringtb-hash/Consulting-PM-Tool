/**
 * Client Authorization Helper
 *
 * Provides utilities for checking if a user has access to a specific client's data.
 * A user has access to a client if:
 * 1. They are an admin, OR
 * 2. They own at least one project for that client
 */

import { prisma } from '../prisma/client';

/**
 * Check if a user has access to a client
 * @param userId - The authenticated user's ID
 * @param clientId - The client ID to check access for
 * @returns true if user has access, false otherwise
 */
export async function hasClientAccess(
  userId: number,
  clientId: number,
): Promise<boolean> {
  // First check if user is an admin
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role === 'ADMIN') {
    return true;
  }

  // Check if user owns any project for this client
  const projectCount = await prisma.project.count({
    where: {
      clientId,
      ownerId: userId,
    },
  });

  return projectCount > 0;
}

/**
 * Get all client IDs a user has access to
 * @param userId - The authenticated user's ID
 * @returns Array of client IDs the user can access, or null if user is admin (meaning all)
 */
export async function getAccessibleClientIds(
  userId: number,
): Promise<number[] | null> {
  // First check if user is an admin - they have access to all clients
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  if (user?.role === 'ADMIN') {
    // Return null to indicate "all clients" - caller should not filter
    return null;
  }

  // Get all unique client IDs from projects owned by this user
  const projects = await prisma.project.findMany({
    where: { ownerId: userId },
    select: { clientId: true },
    distinct: ['clientId'],
  });

  return projects.map((p) => p.clientId);
}

/**
 * Get the client ID from a document analyzer config
 */
export async function getClientIdFromDocumentAnalyzerConfig(
  configId: number,
): Promise<number | null> {
  const config = await prisma.documentAnalyzerConfig.findUnique({
    where: { id: configId },
    select: { clientId: true },
  });
  return config?.clientId ?? null;
}

/**
 * Get the client ID from a content generator config
 */
export async function getClientIdFromContentGeneratorConfig(
  configId: number,
): Promise<number | null> {
  const config = await prisma.contentGeneratorConfig.findUnique({
    where: { id: configId },
    select: { clientId: true },
  });
  return config?.clientId ?? null;
}

/**
 * Get the client ID from a lead scoring config
 */
export async function getClientIdFromLeadScoringConfig(
  configId: number,
): Promise<number | null> {
  const config = await prisma.leadScoringConfig.findUnique({
    where: { id: configId },
    select: { clientId: true },
  });
  return config?.clientId ?? null;
}

/**
 * Get the client ID from a prior auth config
 */
export async function getClientIdFromPriorAuthConfig(
  configId: number,
): Promise<number | null> {
  const config = await prisma.priorAuthConfig.findUnique({
    where: { id: configId },
    select: { clientId: true },
  });
  return config?.clientId ?? null;
}

/**
 * Get the client ID from an analyzed document
 */
export async function getClientIdFromAnalyzedDocument(
  documentId: number,
): Promise<number | null> {
  const document = await prisma.analyzedDocument.findUnique({
    where: { id: documentId },
    select: { config: { select: { clientId: true } } },
  });
  return document?.config?.clientId ?? null;
}

/**
 * Get the client ID from an extraction template
 */
export async function getClientIdFromExtractionTemplate(
  templateId: number,
): Promise<number | null> {
  const template = await prisma.extractionTemplate.findUnique({
    where: { id: templateId },
    select: { config: { select: { clientId: true } } },
  });
  return template?.config?.clientId ?? null;
}

/**
 * Get the client ID from a batch job
 */
export async function getClientIdFromBatchJob(
  jobId: number,
): Promise<number | null> {
  const job = await prisma.documentBatchJob.findUnique({
    where: { id: jobId },
    select: { config: { select: { clientId: true } } },
  });
  return job?.config?.clientId ?? null;
}

/**
 * Get the client ID from generated content
 */
export async function getClientIdFromGeneratedContent(
  contentId: number,
): Promise<number | null> {
  const content = await prisma.generatedContent.findUnique({
    where: { id: contentId },
    select: { config: { select: { clientId: true } } },
  });
  return content?.config?.clientId ?? null;
}

/**
 * Get the client ID from a content template
 */
export async function getClientIdFromContentTemplate(
  templateId: number,
): Promise<number | null> {
  const template = await prisma.contentTemplate.findUnique({
    where: { id: templateId },
    select: { config: { select: { clientId: true } } },
  });
  return template?.config?.clientId ?? null;
}

/**
 * Get the client ID from a content approval workflow
 */
export async function getClientIdFromContentApprovalWorkflow(
  workflowId: number,
): Promise<number | null> {
  const workflow = await prisma.contentApprovalWorkflow.findUnique({
    where: { id: workflowId },
    select: { config: { select: { clientId: true } } },
  });
  return workflow?.config?.clientId ?? null;
}

/**
 * Get the client ID from a scored lead
 */
export async function getClientIdFromScoredLead(
  leadId: number,
): Promise<number | null> {
  const lead = await prisma.scoredLead.findUnique({
    where: { id: leadId },
    select: { config: { select: { clientId: true } } },
  });
  return lead?.config?.clientId ?? null;
}

/**
 * Get the client ID from a nurture sequence
 */
export async function getClientIdFromNurtureSequence(
  sequenceId: number,
): Promise<number | null> {
  const sequence = await prisma.nurtureSequence.findUnique({
    where: { id: sequenceId },
    select: { config: { select: { clientId: true } } },
  });
  return sequence?.config?.clientId ?? null;
}

/**
 * Get the client ID from a PA request
 */
export async function getClientIdFromPARequest(
  requestId: number,
): Promise<number | null> {
  const request = await prisma.pARequest.findUnique({
    where: { id: requestId },
    select: { config: { select: { clientId: true } } },
  });
  return request?.config?.clientId ?? null;
}

/**
 * Get the client ID from a PA appeal
 */
export async function getClientIdFromPAAppeal(
  appealId: number,
): Promise<number | null> {
  const appeal = await prisma.pAAppeal.findUnique({
    where: { id: appealId },
    select: { request: { select: { config: { select: { clientId: true } } } } },
  });
  return appeal?.request?.config?.clientId ?? null;
}

/**
 * Get the client ID from a payer rule
 */
export async function getClientIdFromPayerRule(
  ruleId: number,
): Promise<number | null> {
  const rule = await prisma.payerRule.findUnique({
    where: { id: ruleId },
    select: { config: { select: { clientId: true } } },
  });
  return rule?.config?.clientId ?? null;
}

/**
 * Get the client ID from a PA template
 */
export async function getClientIdFromPATemplate(
  templateId: number,
): Promise<number | null> {
  const template = await prisma.pATemplate.findUnique({
    where: { id: templateId },
    select: { config: { select: { clientId: true } } },
  });
  return template?.config?.clientId ?? null;
}
