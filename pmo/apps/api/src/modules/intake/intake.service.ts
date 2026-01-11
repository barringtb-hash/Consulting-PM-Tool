/**
 * Tool 1.4: Client Intake Automator Service
 *
 * Automated client intake with:
 * - Digital form builder
 * - Document upload and verification
 * - E-signature integration
 * - Compliance checklist automation
 * - White-label client portal
 * - Progress tracking dashboard
 */

import { prisma } from '../../prisma/client';
import { env } from '../../config/env';
import {
  IntakeFormStatus,
  FieldType,
  SubmissionStatus,
  DocumentVerificationStatus,
  Prisma,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { getTenantId, hasTenantContext } from '../../tenant/tenant.context';

// ============================================================================
// TYPES
// ============================================================================

interface IntakeConfigInput {
  portalName?: string;
  logoUrl?: string;
  primaryColor?: string;
  customDomain?: string;
  requireIdentityVerification?: boolean;
  requireDocumentVerification?: boolean;
  retentionDays?: number;
  notifyOnSubmission?: boolean;
  notifyOnCompletion?: boolean;
  notificationEmails?: string[];
  storageProvider?: string;
}

interface FormInput {
  name: string;
  description?: string;
  slug?: string;
  isMultiPage?: boolean;
  allowSaveProgress?: boolean;
  requireSignature?: boolean;
  expiresAfterDays?: number;
}

interface FieldInput {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  helpText?: string;
  isRequired?: boolean;
  validationRules?: Prisma.InputJsonValue;
  options?: Array<{ value: string; label: string }>;
  conditionalLogic?: Prisma.InputJsonValue;
  pageNumber?: number;
  sortOrder?: number;
  width?: string;
  prefillSource?: string;
}

interface SubmissionInput {
  formId: number;
  submitterEmail: string;
  submitterName?: string;
  submitterPhone?: string;
  expiresAt?: Date;
}

interface DocumentInput {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageUrl: string;
  documentType: string;
}

// ============================================================================
// CONFIG MANAGEMENT
// ============================================================================

export async function getIntakeConfig(clientId: number) {
  return prisma.intakeConfig.findUnique({
    where: { clientId },
    include: {
      client: { select: { id: true, name: true, industry: true } },
      forms: {
        where: { status: { not: 'ARCHIVED' } },
        orderBy: { sortOrder: 'asc' },
      },
      complianceTemplates: {
        where: { isActive: true },
      },
    },
  });
}

export async function listIntakeConfigs(filters?: {
  clientId?: number;
  clientIds?: number[];
}) {
  const whereClause: Prisma.IntakeConfigWhereInput = {};

  // Always filter by tenant if context is available
  if (hasTenantContext()) {
    whereClause.tenantId = getTenantId();
  }

  if (filters?.clientId) {
    whereClause.clientId = filters.clientId;
  } else if (filters?.clientIds && filters.clientIds.length > 0) {
    whereClause.clientId = { in: filters.clientIds };
  }

  return prisma.intakeConfig.findMany({
    where: whereClause,
    include: {
      client: { select: { id: true, name: true, industry: true } },
      _count: { select: { forms: true, submissions: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createIntakeConfig(
  clientId: number,
  data: IntakeConfigInput,
) {
  return prisma.intakeConfig.create({
    data: {
      ...(hasTenantContext() && { tenantId: getTenantId() }),
      clientId,
      ...data,
    },
  });
}

export async function updateIntakeConfig(
  clientId: number,
  data: Partial<IntakeConfigInput>,
) {
  return prisma.intakeConfig.update({
    where: { clientId },
    data,
  });
}

// ============================================================================
// FORM MANAGEMENT
// ============================================================================

export async function createForm(configId: number, data: FormInput) {
  // Generate slug if not provided
  const slug =
    data.slug ||
    data.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

  return prisma.intakeForm.create({
    data: {
      configId,
      ...data,
      slug,
    },
  });
}

export async function getForms(
  configId: number,
  options: { status?: IntakeFormStatus } = {},
) {
  return prisma.intakeForm.findMany({
    where: {
      configId,
      ...(options.status && { status: options.status }),
    },
    include: {
      fields: {
        orderBy: [{ pageNumber: 'asc' }, { sortOrder: 'asc' }],
      },
      _count: {
        select: { submissions: true },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function getForm(id: number) {
  return prisma.intakeForm.findUnique({
    where: { id },
    include: {
      fields: {
        orderBy: [{ pageNumber: 'asc' }, { sortOrder: 'asc' }],
      },
      config: true,
    },
  });
}

export async function getFormBySlug(configId: number, slug: string) {
  return prisma.intakeForm.findUnique({
    where: {
      configId_slug: { configId, slug },
    },
    include: {
      fields: {
        orderBy: [{ pageNumber: 'asc' }, { sortOrder: 'asc' }],
      },
      config: {
        select: {
          portalName: true,
          logoUrl: true,
          primaryColor: true,
        },
      },
    },
  });
}

export async function updateForm(id: number, data: Partial<FormInput>) {
  return prisma.intakeForm.update({
    where: { id },
    data,
  });
}

export async function publishForm(id: number) {
  return prisma.intakeForm.update({
    where: { id },
    data: {
      status: 'PUBLISHED',
      version: { increment: 1 },
    },
  });
}

export async function archiveForm(id: number) {
  return prisma.intakeForm.update({
    where: { id },
    data: { status: 'ARCHIVED' },
  });
}

// ============================================================================
// FORM FIELDS
// ============================================================================

export async function addFormField(formId: number, data: FieldInput) {
  // Get max sort order for the page
  const maxSort = await prisma.intakeFormField.findFirst({
    where: { formId, pageNumber: data.pageNumber || 1 },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  return prisma.intakeFormField.create({
    data: {
      formId,
      ...data,
      sortOrder: data.sortOrder ?? (maxSort?.sortOrder ?? 0) + 1,
    },
  });
}

export async function updateFormField(id: number, data: Partial<FieldInput>) {
  return prisma.intakeFormField.update({
    where: { id },
    data,
  });
}

export async function deleteFormField(id: number) {
  return prisma.intakeFormField.delete({
    where: { id },
  });
}

export async function reorderFormFields(
  formId: number,
  fieldOrders: Array<{ id: number; pageNumber: number; sortOrder: number }>,
) {
  const updates = fieldOrders.map((field) =>
    prisma.intakeFormField.update({
      where: { id: field.id },
      data: {
        pageNumber: field.pageNumber,
        sortOrder: field.sortOrder,
      },
    }),
  );

  return prisma.$transaction(updates);
}

// ============================================================================
// SUBMISSION MANAGEMENT
// ============================================================================

export async function createSubmission(
  configId: number,
  data: SubmissionInput,
) {
  const form = await prisma.intakeForm.findUnique({
    where: { id: data.formId },
  });

  if (!form) {
    throw new Error('Form not found');
  }

  // Generate unique access token
  const accessToken = uuidv4();

  // Calculate expiration
  let expiresAt = data.expiresAt;
  if (!expiresAt && form.expiresAfterDays) {
    expiresAt = new Date(
      Date.now() + form.expiresAfterDays * 24 * 60 * 60 * 1000,
    );
  }

  const submission = await prisma.intakeSubmission.create({
    data: {
      configId,
      formId: data.formId,
      submitterEmail: data.submitterEmail,
      submitterName: data.submitterName,
      submitterPhone: data.submitterPhone,
      accessToken,
      status: 'IN_PROGRESS',
      expiresAt,
    },
    include: {
      form: {
        include: {
          fields: {
            orderBy: [{ pageNumber: 'asc' }, { sortOrder: 'asc' }],
          },
        },
      },
    },
  });

  // Start associated workflows
  await startWorkflows(submission.id, data.formId);

  return submission;
}

export async function getSubmissions(
  configId: number,
  options: {
    formId?: number;
    status?: SubmissionStatus;
    search?: string;
    limit?: number;
    offset?: number;
  } = {},
) {
  const { formId, status, search, limit = 50, offset = 0 } = options;

  return prisma.intakeSubmission.findMany({
    where: {
      configId,
      ...(formId && { formId }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { submitterEmail: { contains: search, mode: 'insensitive' } },
          { submitterName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    include: {
      form: { select: { id: true, name: true } },
      documents: {
        select: { id: true, documentType: true, verificationStatus: true },
      },
      complianceChecks: { select: { id: true, isComplete: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

export async function getSubmission(id: number) {
  return prisma.intakeSubmission.findUnique({
    where: { id },
    include: {
      form: {
        include: {
          fields: {
            orderBy: [{ pageNumber: 'asc' }, { sortOrder: 'asc' }],
          },
        },
      },
      documents: true,
      complianceChecks: {
        include: { template: true },
      },
      workflowProgress: {
        include: { workflow: true },
      },
      config: {
        select: {
          portalName: true,
          logoUrl: true,
          primaryColor: true,
          requireIdentityVerification: true,
          requireDocumentVerification: true,
        },
      },
    },
  });
}

export async function getSubmissionByToken(accessToken: string) {
  return prisma.intakeSubmission.findUnique({
    where: { accessToken },
    include: {
      form: {
        include: {
          fields: {
            orderBy: [{ pageNumber: 'asc' }, { sortOrder: 'asc' }],
          },
        },
      },
      documents: true,
      config: {
        select: {
          portalName: true,
          logoUrl: true,
          primaryColor: true,
        },
      },
    },
  });
}

export async function updateSubmissionData(
  id: number,
  formData: Record<string, unknown>,
  saveProgress: boolean = true,
) {
  return prisma.intakeSubmission.update({
    where: { id },
    data: {
      formData: formData as Prisma.InputJsonValue,
      lastSavedAt: saveProgress ? new Date() : undefined,
    },
  });
}

export async function submitSubmission(id: number) {
  const submission = await prisma.intakeSubmission.findUnique({
    where: { id },
    include: {
      form: {
        include: { fields: true },
      },
      config: true,
    },
  });

  if (!submission) {
    throw new Error('Submission not found');
  }

  // Validate required fields
  const formData = (submission.formData || {}) as Record<string, unknown>;
  const missingFields: string[] = [];

  for (const field of submission.form.fields) {
    if (field.isRequired && !formData[field.name]) {
      missingFields.push(field.label);
    }
  }

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // Update status
  const updated = await prisma.intakeSubmission.update({
    where: { id },
    data: {
      status: 'SUBMITTED',
      submittedAt: new Date(),
    },
  });

  // Send notification if configured
  if (
    submission.config.notifyOnSubmission &&
    submission.config.notificationEmails.length > 0
  ) {
    await sendSubmissionNotification(submission);
  }

  return updated;
}

export async function reviewSubmission(
  id: number,
  data: {
    status: 'APPROVED' | 'REJECTED' | 'NEEDS_RESUBMISSION';
    reviewNotes?: string;
    rejectionReason?: string;
    reviewedBy: number;
  },
) {
  const submission = await prisma.intakeSubmission.update({
    where: { id },
    data: {
      status: data.status,
      reviewedAt: new Date(),
      reviewedBy: data.reviewedBy,
      reviewNotes: data.reviewNotes,
      rejectionReason: data.rejectionReason,
    },
    include: { config: true },
  });

  // Send completion notification if approved
  if (data.status === 'APPROVED' && submission.config.notifyOnCompletion) {
    await sendCompletionNotification(submission);
  }

  return submission;
}

// ============================================================================
// DOCUMENT MANAGEMENT
// ============================================================================

export async function uploadDocument(
  submissionId: number,
  data: DocumentInput,
) {
  return prisma.intakeDocument.create({
    data: {
      submissionId,
      ...data,
      verificationStatus: 'PENDING',
    },
  });
}

export async function getDocuments(submissionId: number) {
  return prisma.intakeDocument.findMany({
    where: { submissionId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function verifyDocument(
  id: number,
  data: {
    status: DocumentVerificationStatus;
    verifiedBy: number;
    verificationNotes?: string;
  },
) {
  return prisma.intakeDocument.update({
    where: { id },
    data: {
      verificationStatus: data.status,
      verifiedAt: new Date(),
      verifiedBy: data.verifiedBy,
      verificationNotes: data.verificationNotes,
    },
  });
}

export async function extractDocumentData(
  id: number,
): Promise<Record<string, unknown>> {
  const document = await prisma.intakeDocument.findUnique({
    where: { id },
  });

  if (!document) {
    throw new Error('Document not found');
  }

  // In production, integrate with OCR/AI document processing
  // For now, return placeholder extracted data
  let extractedData: Record<string, unknown> = {};
  let confidence = 0;

  if (env.openaiApiKey) {
    try {
      // Simulate AI document extraction
      // In production, use Vision API to analyze document images
      extractedData = {
        documentType: document.documentType,
        extractionStatus: 'simulated',
        note: 'Configure document processing service for actual extraction',
      };
      confidence = 0.5;
    } catch (error) {
      console.error('Document extraction error:', error);
    }
  }

  await prisma.intakeDocument.update({
    where: { id },
    data: {
      extractedData: extractedData as Prisma.InputJsonValue,
      extractionConfidence: confidence,
    },
  });

  return extractedData;
}

// ============================================================================
// COMPLIANCE
// ============================================================================

export async function createComplianceTemplate(
  configId: number,
  data: {
    name: string;
    description?: string;
    industry?: string;
    useCase?: string;
    requirements: Array<{
      id: string;
      name: string;
      description?: string;
      isRequired: boolean;
      documentTypes?: string[];
    }>;
  },
) {
  return prisma.complianceTemplate.create({
    data: {
      configId,
      ...data,
    },
  });
}

export async function getComplianceTemplates(configId: number) {
  return prisma.complianceTemplate.findMany({
    where: { configId, isActive: true },
    orderBy: { name: 'asc' },
  });
}

export async function updateComplianceTemplate(
  id: number,
  data: Partial<{
    name: string;
    description: string;
    requirements: Prisma.InputJsonValue;
    isActive: boolean;
  }>,
) {
  return prisma.complianceTemplate.update({
    where: { id },
    data,
  });
}

export async function checkCompliance(
  submissionId: number,
  templateId: number,
) {
  const submission = await prisma.intakeSubmission.findUnique({
    where: { id: submissionId },
    include: { documents: true },
  });

  const template = await prisma.complianceTemplate.findUnique({
    where: { id: templateId },
  });

  if (!submission || !template) {
    throw new Error('Submission or template not found');
  }

  const requirements = template.requirements as Array<{
    id: string;
    name: string;
    isRequired: boolean;
    documentTypes?: string[];
  }>;

  const requirementStatus: Record<string, { status: string; notes?: string }> =
    {};
  let allComplete = true;

  for (const req of requirements) {
    // Check if required documents are uploaded and verified
    if (req.documentTypes && req.documentTypes.length > 0) {
      const hasRequiredDocs = req.documentTypes.every((docType) =>
        submission.documents.some(
          (doc) =>
            doc.documentType === docType &&
            doc.verificationStatus === 'VERIFIED',
        ),
      );

      if (hasRequiredDocs) {
        requirementStatus[req.id] = { status: 'complete' };
      } else if (req.isRequired) {
        requirementStatus[req.id] = {
          status: 'incomplete',
          notes: 'Required documents missing or not verified',
        };
        allComplete = false;
      } else {
        requirementStatus[req.id] = { status: 'optional' };
      }
    } else {
      // Non-document requirements - mark as pending review
      requirementStatus[req.id] = { status: 'pending_review' };
      if (req.isRequired) {
        allComplete = false;
      }
    }
  }

  // Upsert compliance check
  return prisma.complianceCheck.upsert({
    where: {
      submissionId_templateId: { submissionId, templateId },
    },
    update: {
      requirementStatus,
      isComplete: allComplete,
      completedAt: allComplete ? new Date() : null,
    },
    create: {
      submissionId,
      templateId,
      requirementStatus,
      isComplete: allComplete,
      completedAt: allComplete ? new Date() : null,
    },
  });
}

// ============================================================================
// WORKFLOWS
// ============================================================================

export async function createWorkflow(
  configId: number,
  data: {
    name: string;
    description?: string;
    steps: Array<{
      id: string;
      name: string;
      type: string;
      config?: Record<string, unknown>;
      order: number;
    }>;
    triggerFormIds?: number[];
    autoStart?: boolean;
  },
) {
  return prisma.intakeWorkflow.create({
    data: {
      configId,
      name: data.name,
      description: data.description,
      steps: data.steps as Prisma.InputJsonValue,
      triggerFormIds: data.triggerFormIds,
      autoStart: data.autoStart,
    },
  });
}

export async function getWorkflows(configId: number) {
  return prisma.intakeWorkflow.findMany({
    where: { configId, isActive: true },
    orderBy: { name: 'asc' },
  });
}

async function startWorkflows(submissionId: number, formId: number) {
  // Find workflows triggered by this form
  const workflows = await prisma.intakeWorkflow.findMany({
    where: {
      isActive: true,
      autoStart: true,
      triggerFormIds: { has: formId },
    },
  });

  for (const workflow of workflows) {
    const steps = workflow.steps as Array<{ id: string; order: number }>;
    const firstStep = steps.sort((a, b) => a.order - b.order)[0];

    await prisma.workflowProgress.create({
      data: {
        submissionId,
        workflowId: workflow.id,
        currentStepId: firstStep?.id,
        stepStatuses: {},
        isComplete: false,
      },
    });
  }
}

export async function getWorkflowProgress(submissionId: number) {
  return prisma.workflowProgress.findMany({
    where: { submissionId },
    include: { workflow: true },
  });
}

export async function updateWorkflowStep(
  progressId: number,
  stepId: string,
  data: {
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'BLOCKED';
    data?: Record<string, unknown>;
  },
) {
  const progress = await prisma.workflowProgress.findUnique({
    where: { id: progressId },
    include: { workflow: true },
  });

  if (!progress) {
    throw new Error('Workflow progress not found');
  }

  const stepStatuses = (progress.stepStatuses || {}) as Record<string, unknown>;
  stepStatuses[stepId] = {
    status: data.status,
    completedAt: data.status === 'COMPLETED' ? new Date() : null,
    data: data.data,
  };

  // Check if workflow is complete
  const steps = progress.workflow.steps as Array<{ id: string }>;
  const allComplete = steps.every(
    (step) =>
      (stepStatuses[step.id] as { status?: string })?.status === 'COMPLETED' ||
      (stepStatuses[step.id] as { status?: string })?.status === 'SKIPPED',
  );

  // Find next step
  let nextStepId: string | undefined;
  if (data.status === 'COMPLETED') {
    const orderedSteps = (
      progress.workflow.steps as Array<{ id: string; order: number }>
    ).sort((a, b) => a.order - b.order);
    const currentIndex = orderedSteps.findIndex((s) => s.id === stepId);
    nextStepId = orderedSteps[currentIndex + 1]?.id;
  }

  return prisma.workflowProgress.update({
    where: { id: progressId },
    data: {
      stepStatuses: stepStatuses as Prisma.InputJsonValue,
      currentStepId: nextStepId || progress.currentStepId,
      isComplete: allComplete,
      completedAt: allComplete ? new Date() : null,
    },
  });
}

// ============================================================================
// ANALYTICS
// ============================================================================

export async function getIntakeAnalytics(
  configId: number,
  dateRange: { start: Date; end: Date },
) {
  const submissions = await prisma.intakeSubmission.findMany({
    where: {
      configId,
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    },
  });

  const total = submissions.length;
  const inProgress = submissions.filter(
    (s) => s.status === 'IN_PROGRESS',
  ).length;
  const submitted = submissions.filter((s) => s.status === 'SUBMITTED').length;
  const approved = submissions.filter((s) => s.status === 'APPROVED').length;
  const rejected = submissions.filter((s) => s.status === 'REJECTED').length;

  const completionRate = total > 0 ? ((submitted + approved) / total) * 100 : 0;
  const approvalRate =
    submitted + approved + rejected > 0
      ? (approved / (submitted + approved + rejected)) * 100
      : 0;

  // Calculate average time to completion
  const completedSubmissions = submissions.filter(
    (s) => s.submittedAt && s.startedAt,
  );
  const avgCompletionTime =
    completedSubmissions.length > 0
      ? completedSubmissions.reduce(
          (sum, s) => sum + (s.submittedAt!.getTime() - s.startedAt.getTime()),
          0,
        ) /
        completedSubmissions.length /
        (1000 * 60 * 60) // Convert to hours
      : null;

  return {
    totalSubmissions: total,
    inProgress,
    submitted,
    approved,
    rejected,
    completionRate,
    approvalRate,
    avgCompletionTimeHours: avgCompletionTime,
    dateRange,
  };
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

async function sendSubmissionNotification(submission: {
  submitterEmail: string;
  submitterName: string | null;
  form: { name: string } | null;
  config: { notificationEmails: string[] };
}) {
  // In production, integrate with email service
  console.log(
    `Sending submission notification for ${submission.submitterEmail}`,
  );
  console.log(`Form: ${submission.form?.name}`);
  console.log(`Notifying: ${submission.config.notificationEmails.join(', ')}`);
}

async function sendCompletionNotification(submission: {
  submitterEmail: string;
  submitterName: string | null;
}) {
  // In production, integrate with email service
  console.log(
    `Sending completion notification to ${submission.submitterEmail}`,
  );
}
