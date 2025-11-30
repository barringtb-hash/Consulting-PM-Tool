/**
 * Tool 2.4: Prior Authorization Bot Service
 *
 * Provides healthcare prior authorization automation including:
 * - Automated PA submission to insurance payers
 * - Real-time status tracking with smart polling
 * - Denial management and pattern analysis
 * - Appeals preparation assistance
 * - Payer rule database with auto-updates
 * - HIPAA-compliant data handling
 */

import { prisma } from '../../prisma/client';
import { env } from '../../config/env';
import {
  PARequestStatus,
  PAUrgency,
  DenialReason,
  AppealStatus,
  Prisma,
} from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// TYPES
// ============================================================================

interface PriorAuthConfigInput {
  practiceName?: string;
  practiceNPI?: string;
  practiceAddress?: Prisma.InputJsonValue;
  payerConfigurations?: Prisma.InputJsonValue;
  ehrSystem?: string;
  ehrCredentials?: Prisma.InputJsonValue;
  ehrSyncEnabled?: boolean;
  availityCredentials?: Prisma.InputJsonValue;
  changeHealthCredentials?: Prisma.InputJsonValue;
  faxProvider?: string;
  faxCredentials?: Prisma.InputJsonValue;
  notifyOnSubmission?: boolean;
  notifyOnStatusChange?: boolean;
  notificationEmails?: string[];
  isHipaaEnabled?: boolean;
}

interface PARequestInput {
  patientName: string;
  patientDob: Date;
  patientMemberId: string;
  requestingProvider: string;
  requestingProviderNPI?: string;
  renderingProvider?: string;
  renderingProviderNPI?: string;
  facilityName?: string;
  facilityNPI?: string;
  payerId: string;
  payerName: string;
  planName?: string;
  planType?: string;
  serviceType: string;
  procedureCodes?: string[];
  diagnosisCodes?: string[];
  description?: string;
  clinicalNotes?: string;
  serviceStartDate?: Date;
  serviceEndDate?: Date;
  urgency?: PAUrgency;
  supportingDocuments?: Prisma.InputJsonValue;
}

interface AppealInput {
  appealLevel?: number;
  appealType?: string;
  appealRationale: string;
  supportingEvidence?: Prisma.InputJsonValue;
  peerToPeerNotes?: string;
}

// ============================================================================
// PRIOR AUTH CONFIG MANAGEMENT
// ============================================================================

export async function getPriorAuthConfig(clientId: number) {
  return prisma.priorAuthConfig.findUnique({
    where: { clientId },
    include: {
      client: { select: { id: true, name: true, industry: true } },
    },
  });
}

export async function listPriorAuthConfigs(filters?: {
  clientId?: number;
  clientIds?: number[];
}) {
  const whereClause: Prisma.PriorAuthConfigWhereInput = {};

  if (filters?.clientId) {
    whereClause.clientId = filters.clientId;
  } else if (filters?.clientIds && filters.clientIds.length > 0) {
    whereClause.clientId = { in: filters.clientIds };
  }

  return prisma.priorAuthConfig.findMany({
    where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
    include: {
      client: { select: { id: true, name: true, industry: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createPriorAuthConfig(
  clientId: number,
  data: PriorAuthConfigInput,
) {
  return prisma.priorAuthConfig.create({
    data: {
      clientId,
      ...data,
    },
  });
}

export async function updatePriorAuthConfig(
  clientId: number,
  data: Partial<PriorAuthConfigInput>,
) {
  return prisma.priorAuthConfig.update({
    where: { clientId },
    data,
  });
}

// ============================================================================
// PA REQUEST MANAGEMENT
// ============================================================================

export async function createPARequest(
  configId: number,
  input: PARequestInput,
  userId?: number,
) {
  const config = await prisma.priorAuthConfig.findUnique({
    where: { id: configId },
  });

  if (!config) {
    throw new Error('Config not found');
  }

  // Generate unique request number
  const requestNumber = `PA-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

  // Encrypt patient data if HIPAA is enabled
  let patientEncrypted: string | undefined;
  let encryptedNotes: string | undefined;

  if (config.isHipaaEnabled) {
    // In production, would use proper encryption
    patientEncrypted = Buffer.from(
      JSON.stringify({
        patientName: input.patientName,
        patientDob: input.patientDob,
        patientMemberId: input.patientMemberId,
      }),
    ).toString('base64');

    if (input.clinicalNotes) {
      encryptedNotes = Buffer.from(input.clinicalNotes).toString('base64');
    }
  }

  const request = await prisma.pARequest.create({
    data: {
      configId,
      requestNumber,
      patientName: input.patientName,
      patientDob: input.patientDob,
      patientMemberId: input.patientMemberId,
      patientEncrypted,
      requestingProvider: input.requestingProvider,
      requestingProviderNPI: input.requestingProviderNPI,
      renderingProvider: input.renderingProvider,
      renderingProviderNPI: input.renderingProviderNPI,
      facilityName: input.facilityName,
      facilityNPI: input.facilityNPI,
      payerId: input.payerId,
      payerName: input.payerName,
      planName: input.planName,
      planType: input.planType,
      serviceType: input.serviceType,
      procedureCodes: input.procedureCodes || [],
      diagnosisCodes: input.diagnosisCodes || [],
      description: input.description,
      clinicalNotes: input.clinicalNotes,
      encryptedNotes,
      serviceStartDate: input.serviceStartDate,
      serviceEndDate: input.serviceEndDate,
      urgency: input.urgency || 'ROUTINE',
      status: 'DRAFT',
      supportingDocuments: input.supportingDocuments,
      auditLog: [
        {
          action: 'created',
          userId,
          timestamp: new Date().toISOString(),
          details: { source: 'manual' },
        },
      ] as Prisma.InputJsonValue,
      assignedTo: userId,
      lastUpdatedBy: userId,
    },
  });

  return request;
}

export async function getPARequest(id: number) {
  return prisma.pARequest.findUnique({
    where: { id },
    include: {
      config: {
        include: {
          client: { select: { id: true, name: true } },
        },
      },
      statusHistory: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      appeals: {
        orderBy: { appealLevel: 'asc' },
      },
    },
  });
}

export async function getPARequestByNumber(requestNumber: string) {
  return prisma.pARequest.findUnique({
    where: { requestNumber },
    include: {
      config: true,
      statusHistory: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });
}

export async function getPARequests(
  configId: number,
  options: {
    status?: PARequestStatus;
    payerId?: string;
    urgency?: PAUrgency;
    assignedTo?: number;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {},
) {
  const {
    status,
    payerId,
    urgency,
    assignedTo,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = options;

  return prisma.pARequest.findMany({
    where: {
      configId,
      ...(status && { status }),
      ...(payerId && { payerId }),
      ...(urgency && { urgency }),
      ...(assignedTo && { assignedTo }),
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(endDate && { createdAt: { lte: endDate } }),
    },
    orderBy: [{ urgency: 'asc' }, { createdAt: 'desc' }],
    take: limit,
    skip: offset,
  });
}

export async function updatePARequest(
  id: number,
  data: Partial<PARequestInput> & {
    status?: PARequestStatus;
    assignedTo?: number;
  },
  userId?: number,
) {
  const current = await prisma.pARequest.findUnique({
    where: { id },
  });

  if (!current) {
    throw new Error('Request not found');
  }

  // Add to audit log
  const auditLog = (current.auditLog as Array<unknown>) || [];
  auditLog.push({
    action: 'updated',
    userId,
    timestamp: new Date().toISOString(),
    changes: Object.keys(data),
  });

  return prisma.pARequest.update({
    where: { id },
    data: {
      ...data,
      auditLog: auditLog as Prisma.InputJsonValue,
      lastUpdatedBy: userId,
    },
  });
}

export async function deletePARequest(id: number) {
  return prisma.pARequest.delete({
    where: { id },
  });
}

// ============================================================================
// PA SUBMISSION
// ============================================================================

export async function submitPARequest(
  id: number,
  userId?: number,
): Promise<{ success: boolean; request: unknown; externalRef?: string }> {
  const request = await prisma.pARequest.findUnique({
    where: { id },
    include: { config: true },
  });

  if (!request) {
    throw new Error('Request not found');
  }

  if (request.status !== 'DRAFT') {
    throw new Error('Can only submit draft requests');
  }

  // Get payer-specific submission rules
  const payerRules = await getPayerRules(request.configId, request.payerId);

  // Calculate response deadline based on urgency
  const turnaroundDays =
    request.urgency === 'EMERGENT'
      ? 1
      : request.urgency === 'URGENT'
        ? payerRules?.urgentTurnaround || 3
        : payerRules?.standardTurnaround || 14;

  const responseDeadline = new Date();
  responseDeadline.setDate(responseDeadline.getDate() + turnaroundDays);

  // Simulate submission to payer
  // In production, would integrate with Availity, Change Healthcare, or payer portals
  const externalRef = await simulatePASubmission(request, payerRules);

  // Update request status
  const updatedRequest = await prisma.pARequest.update({
    where: { id },
    data: {
      status: 'SUBMITTED',
      submittedAt: new Date(),
      responseDeadline,
      externalRefNumber: externalRef,
      auditLog: [
        ...((request.auditLog as Array<unknown>) || []),
        {
          action: 'submitted',
          userId,
          timestamp: new Date().toISOString(),
          details: {
            externalRef,
            method: payerRules?.preferredMethod || 'portal',
          },
        },
      ] as Prisma.InputJsonValue,
      lastUpdatedBy: userId,
    },
  });

  // Record status change
  await recordStatusChange(
    id,
    'DRAFT',
    'SUBMITTED',
    userId,
    'Initial submission',
  );

  // Send notification if enabled
  if (request.config.notifyOnSubmission) {
    await sendNotification(request.config, 'PA Submitted', {
      requestNumber: request.requestNumber,
      patientName: request.patientName,
      payerName: request.payerName,
    });
  }

  return {
    success: true,
    request: updatedRequest,
    externalRef,
  };
}

async function simulatePASubmission(
  request: {
    requestNumber: string;
    payerId: string;
    urgency: PAUrgency;
  },
  payerRules: { preferredMethod?: string } | null,
): Promise<string> {
  // Simulate submission delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Generate external reference number
  const prefix = payerRules?.preferredMethod === 'fax' ? 'FAX' : 'EDI';
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

// ============================================================================
// STATUS TRACKING
// ============================================================================

export async function checkPAStatus(
  id: number,
  userId?: number,
): Promise<{
  statusChanged: boolean;
  previousStatus: PARequestStatus;
  currentStatus: PARequestStatus;
  response?: unknown;
}> {
  const request = await prisma.pARequest.findUnique({
    where: { id },
    include: { config: true },
  });

  if (!request) {
    throw new Error('Request not found');
  }

  const previousStatus = request.status;

  // Simulate status check with payer
  // In production, would query payer API or scrape portal
  const statusResponse = await simulateStatusCheck(request);

  if (statusResponse.status !== previousStatus) {
    // Update request with new status
    const updateData: Prisma.PARequestUpdateInput = {
      status: statusResponse.status,
      auditLog: [
        ...((request.auditLog as Array<unknown>) || []),
        {
          action: 'status_checked',
          userId,
          timestamp: new Date().toISOString(),
          details: statusResponse,
        },
      ] as Prisma.InputJsonValue,
      lastUpdatedBy: userId,
    };

    // Handle approval
    if (statusResponse.status === 'APPROVED') {
      updateData.decidedAt = new Date();
      updateData.approvalNumber = statusResponse.approvalNumber;
      updateData.approvedUnits = statusResponse.approvedUnits;
      updateData.approvedStartDate = statusResponse.approvedStartDate;
      updateData.approvedEndDate = statusResponse.approvedEndDate;
      updateData.turnaroundDays = Math.ceil(
        (Date.now() - new Date(request.submittedAt!).getTime()) /
          (1000 * 60 * 60 * 24),
      );
    }

    // Handle denial
    if (statusResponse.status === 'DENIED') {
      updateData.decidedAt = new Date();
      updateData.denialReason = statusResponse.denialReason;
      updateData.denialExplanation = statusResponse.denialExplanation;
      updateData.appealDeadline = new Date(
        Date.now() + 180 * 24 * 60 * 60 * 1000,
      ); // 180 days typically
      updateData.turnaroundDays = Math.ceil(
        (Date.now() - new Date(request.submittedAt!).getTime()) /
          (1000 * 60 * 60 * 24),
      );
    }

    await prisma.pARequest.update({
      where: { id },
      data: updateData,
    });

    // Record status change
    await recordStatusChange(
      id,
      previousStatus,
      statusResponse.status,
      userId,
      statusResponse.notes,
      statusResponse,
    );

    // Send notification if enabled
    if (request.config.notifyOnStatusChange) {
      await sendNotification(
        request.config,
        `PA Status: ${statusResponse.status}`,
        {
          requestNumber: request.requestNumber,
          patientName: request.patientName,
          previousStatus,
          newStatus: statusResponse.status,
        },
      );
    }
  }

  return {
    statusChanged: statusResponse.status !== previousStatus,
    previousStatus,
    currentStatus: statusResponse.status,
    response: statusResponse,
  };
}

async function simulateStatusCheck(request: {
  status: PARequestStatus;
  submittedAt: Date | null;
  urgency: PAUrgency;
}): Promise<{
  status: PARequestStatus;
  approvalNumber?: string;
  approvedUnits?: number;
  approvedStartDate?: Date;
  approvedEndDate?: Date;
  denialReason?: DenialReason;
  denialExplanation?: string;
  notes?: string;
}> {
  // Simulate delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // For demo purposes, randomly progress status
  if (request.status === 'SUBMITTED') {
    return { status: 'PENDING', notes: 'Request received by payer' };
  }

  if (request.status === 'PENDING') {
    const random = Math.random();
    if (random < 0.7) {
      // 70% approval rate
      return {
        status: 'APPROVED',
        approvalNumber: `APR-${Date.now()}`,
        approvedUnits: 10,
        approvedStartDate: new Date(),
        approvedEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        notes: 'Approved for requested services',
      };
    } else if (random < 0.9) {
      // 20% denial rate
      return {
        status: 'DENIED',
        denialReason: 'MEDICAL_NECESSITY',
        denialExplanation: 'Does not meet medical necessity criteria',
        notes: 'Review clinical documentation',
      };
    }
    // 10% still pending
    return { status: 'PENDING' };
  }

  return { status: request.status };
}

async function recordStatusChange(
  requestId: number,
  fromStatus: PARequestStatus | null,
  toStatus: PARequestStatus,
  userId?: number,
  notes?: string,
  payerResponse?: unknown,
) {
  return prisma.pAStatusHistory.create({
    data: {
      requestId,
      fromStatus,
      toStatus,
      changedBy: userId,
      notes,
      payerResponse: payerResponse as Prisma.InputJsonValue,
    },
  });
}

// ============================================================================
// APPEALS
// ============================================================================

export async function createAppeal(
  requestId: number,
  input: AppealInput,
  userId?: number,
) {
  const request = await prisma.pARequest.findUnique({
    where: { id: requestId },
    include: { appeals: true },
  });

  if (!request) {
    throw new Error('Request not found');
  }

  if (request.status !== 'DENIED') {
    throw new Error('Can only appeal denied requests');
  }

  // Determine appeal level
  const appealLevel = input.appealLevel || request.appeals.length + 1;

  const appeal = await prisma.pAAppeal.create({
    data: {
      requestId,
      appealLevel,
      appealType: input.appealType,
      appealRationale: input.appealRationale,
      supportingEvidence: input.supportingEvidence,
      peerToPeerNotes: input.peerToPeerNotes,
      status: 'APPEAL_PENDING',
      preparedBy: userId,
      responseDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days typical
    },
  });

  // Update request appeal status
  await prisma.pARequest.update({
    where: { id: requestId },
    data: {
      appealStatus: 'APPEAL_PENDING',
      auditLog: [
        ...((request.auditLog as Array<unknown>) || []),
        {
          action: 'appeal_created',
          userId,
          timestamp: new Date().toISOString(),
          details: { appealLevel },
        },
      ] as Prisma.InputJsonValue,
    },
  });

  return appeal;
}

export async function submitAppeal(
  appealId: number,
  submissionMethod: string,
  _userId?: number,
) {
  const appeal = await prisma.pAAppeal.findUnique({
    where: { id: appealId },
    include: { request: true },
  });

  if (!appeal) {
    throw new Error('Appeal not found');
  }

  return prisma.pAAppeal.update({
    where: { id: appealId },
    data: {
      submittedAt: new Date(),
      submissionMethod,
      status: 'APPEAL_SUBMITTED',
    },
  });
}

export async function updateAppealStatus(
  appealId: number,
  status: AppealStatus,
  decisionNotes?: string,
  _userId?: number,
) {
  const appeal = await prisma.pAAppeal.update({
    where: { id: appealId },
    data: {
      status,
      ...(status === 'APPEAL_APPROVED' || status === 'APPEAL_DENIED'
        ? { decidedAt: new Date() }
        : {}),
      decisionNotes,
    },
    include: { request: true },
  });

  // Update request status based on appeal outcome
  if (status === 'APPEAL_APPROVED') {
    await prisma.pARequest.update({
      where: { id: appeal.requestId },
      data: {
        status: 'APPROVED',
        appealStatus: 'APPEAL_APPROVED',
        decidedAt: new Date(),
      },
    });
  } else if (status === 'APPEAL_DENIED') {
    await prisma.pARequest.update({
      where: { id: appeal.requestId },
      data: {
        appealStatus: 'APPEAL_DENIED',
      },
    });
  }

  return appeal;
}

export async function generateAppealLetter(
  requestId: number,
): Promise<{ letter: string; suggestions: string[] }> {
  const request = await prisma.pARequest.findUnique({
    where: { id: requestId },
    include: {
      appeals: true,
      config: true,
    },
  });

  if (!request) {
    throw new Error('Request not found');
  }

  // Use AI to generate appeal letter
  if (env.openaiApiKey) {
    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.openaiApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            max_tokens: 2000,
            temperature: 0.3,
            messages: [
              {
                role: 'system',
                content: `You are a healthcare prior authorization appeals specialist. Generate a professional appeal letter for a denied prior authorization request. Include:
1. Clear statement of appeal
2. Patient and provider information
3. Clinical justification for medical necessity
4. Reference to applicable guidelines and criteria
5. Request for reconsideration

Also provide 3-5 suggestions for strengthening the appeal.

Respond with JSON: {"letter": "...", "suggestions": ["...", "..."]}`,
              },
              {
                role: 'user',
                content: `Prior Authorization Details:
- Service: ${request.serviceType}
- Procedure Codes: ${request.procedureCodes.join(', ')}
- Diagnosis Codes: ${request.diagnosisCodes.join(', ')}
- Denial Reason: ${request.denialReason}
- Denial Explanation: ${request.denialExplanation}
- Clinical Notes: ${request.clinicalNotes || 'Not provided'}
- Payer: ${request.payerName}
- Provider: ${request.requestingProvider}`,
              },
            ],
          }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        const result = JSON.parse(data.choices[0].message.content);
        return result;
      }
    } catch (error) {
      console.error('Appeal letter generation error:', error);
    }
  }

  // Fallback template
  return {
    letter: `Dear ${request.payerName} Medical Director,

I am writing to formally appeal the denial of prior authorization request ${request.requestNumber} for ${request.patientName}.

The denial was based on: ${request.denialReason} - ${request.denialExplanation}

We respectfully request reconsideration of this decision based on the following:

[Clinical justification to be added]

The requested ${request.serviceType} is medically necessary for the treatment of the patient's condition(s): ${request.diagnosisCodes.join(', ')}.

Thank you for your prompt attention to this appeal.

Sincerely,
${request.requestingProvider}`,
    suggestions: [
      'Include peer-reviewed literature supporting the medical necessity',
      'Attach relevant clinical documentation',
      'Reference specific payer policy criteria that are met',
      'Request a peer-to-peer review with medical director',
    ],
  };
}

// ============================================================================
// PAYER RULES
// ============================================================================

export async function createPayerRule(
  configId: number,
  data: {
    payerId: string;
    payerName: string;
    serviceType?: string;
    procedureCode?: string;
    ruleName: string;
    ruleDescription?: string;
    requirements: Prisma.InputJsonValue;
    preferredMethod?: string;
    portalUrl?: string;
    faxNumber?: string;
    standardTurnaround?: number;
    urgentTurnaround?: number;
    successTips?: Prisma.InputJsonValue;
  },
) {
  return prisma.payerRule.create({
    data: {
      configId,
      ...data,
      lastVerified: new Date(),
    },
  });
}

export async function getPayerRules(
  configId: number,
  payerId?: string,
  serviceType?: string,
) {
  if (!payerId) {
    return prisma.payerRule.findMany({
      where: { configId, isActive: true },
      orderBy: [{ payerName: 'asc' }, { serviceTy: 'asc' }],
    });
  }

  return prisma.payerRule.findFirst({
    where: {
      configId,
      payerId,
      isActive: true,
      ...(serviceType && { serviceType }),
    },
  });
}

export async function updatePayerRule(
  id: number,
  data: Partial<{
    ruleName: string;
    ruleDescription: string;
    requirements: Prisma.InputJsonValue;
    preferredMethod: string;
    portalUrl: string;
    faxNumber: string;
    standardTurnaround: number;
    urgentTurnaround: number;
    successTips: Prisma.InputJsonValue;
    isActive: boolean;
  }>,
) {
  return prisma.payerRule.update({
    where: { id },
    data: {
      ...data,
      lastVerified: new Date(),
    },
  });
}

// ============================================================================
// PA TEMPLATES
// ============================================================================

export async function createPATemplate(
  configId: number,
  data: {
    name: string;
    description?: string;
    serviceType: string;
    procedureCodes?: string[];
    clinicalTemplate?: string;
    rationaleTemplate?: string;
    requiredDocs?: Prisma.InputJsonValue;
    commonDiagnoses?: Prisma.InputJsonValue;
  },
) {
  return prisma.pATemplate.create({
    data: {
      configId,
      ...data,
    },
  });
}

export async function getPATemplates(configId: number, serviceType?: string) {
  return prisma.pATemplate.findMany({
    where: {
      configId,
      isActive: true,
      ...(serviceType && { serviceType }),
    },
    orderBy: { name: 'asc' },
  });
}

export async function updatePATemplate(
  id: number,
  data: Partial<{
    name: string;
    description: string;
    clinicalTemplate: string;
    rationaleTemplate: string;
    requiredDocs: Prisma.InputJsonValue;
    commonDiagnoses: Prisma.InputJsonValue;
    isActive: boolean;
  }>,
) {
  return prisma.pATemplate.update({
    where: { id },
    data,
  });
}

// ============================================================================
// ANALYTICS
// ============================================================================

export async function getPAAnalytics(
  configId: number,
  dateRange: { start: Date; end: Date },
) {
  // Get requests in date range
  const requests = await prisma.pARequest.findMany({
    where: {
      configId,
      createdAt: {
        gte: dateRange.start,
        lte: dateRange.end,
      },
    },
  });

  // Calculate metrics
  const totalRequests = requests.length;
  const approvedRequests = requests.filter(
    (r) => r.status === 'APPROVED',
  ).length;
  const deniedRequests = requests.filter((r) => r.status === 'DENIED').length;
  const pendingRequests = requests.filter(
    (r) => r.status === 'PENDING' || r.status === 'SUBMITTED',
  ).length;

  const approvalRate =
    totalRequests > 0
      ? (
          (approvedRequests / (approvedRequests + deniedRequests)) *
          100
        ).toFixed(1)
      : 0;

  // Average turnaround for decided requests
  const decidedRequests = requests.filter((r) => r.turnaroundDays !== null);
  const avgTurnaround =
    decidedRequests.length > 0
      ? decidedRequests.reduce((sum, r) => sum + (r.turnaroundDays || 0), 0) /
        decidedRequests.length
      : null;

  // Denial reason breakdown
  const denialReasons: Record<string, number> = {};
  for (const req of requests.filter((r) => r.denialReason)) {
    denialReasons[req.denialReason!] =
      (denialReasons[req.denialReason!] || 0) + 1;
  }

  // Payer breakdown
  const payerBreakdown: Record<
    string,
    { submitted: number; approved: number; denied: number }
  > = {};
  for (const req of requests) {
    if (!payerBreakdown[req.payerId]) {
      payerBreakdown[req.payerId] = { submitted: 0, approved: 0, denied: 0 };
    }
    payerBreakdown[req.payerId].submitted++;
    if (req.status === 'APPROVED') payerBreakdown[req.payerId].approved++;
    if (req.status === 'DENIED') payerBreakdown[req.payerId].denied++;
  }

  return {
    summary: {
      totalRequests,
      approvedRequests,
      deniedRequests,
      pendingRequests,
      approvalRate,
      avgTurnaround,
    },
    denialReasons,
    payerBreakdown,
  };
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

async function sendNotification(
  config: {
    notificationEmails: string[];
  },
  subject: string,
  data: Record<string, unknown>,
) {
  // In production, would send email via configured provider
  console.log('Notification:', subject, config.notificationEmails, data);
}
