import {
  IncidentSeverity,
  IncidentStatus,
  ChecklistStatus,
  TrainingStatus,
  SafetyIncident,
  HazardReport,
  TrainingRecord,
  RiskLevel,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../prisma/client';

// ============ Configuration Management ============

export async function getSafetyConfig(clientId: number) {
  return prisma.safetyMonitorConfig.findUnique({
    where: { clientId },
    include: {
      checklists: {
        take: 5,
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: {
          checklists: true,
          incidents: true,
          hazards: true,
          trainingRequirements: true,
          inspections: true,
        },
      },
    },
  });
}

export async function createSafetyConfig(data: {
  clientId: number;
  facilityName: string;
  facilityType: string;
  employeeCount: number;
  workAreas: string[];
  hazardCategories?: string[];
  regulatoryRequirements?: string[];
  emergencyContacts?: Prisma.InputJsonValue;
  reportingThresholds?: Prisma.InputJsonValue;
}) {
  return prisma.safetyMonitorConfig.create({
    data: {
      clientId: data.clientId,
      facilityName: data.facilityName,
      facilityType: data.facilityType,
      employeeCount: data.employeeCount,
      workAreas: data.workAreas,
      hazardCategories: data.hazardCategories ?? [],
      regulatoryRequirements: data.regulatoryRequirements ?? [],
      emergencyContacts: data.emergencyContacts ?? Prisma.JsonNull,
      reportingThresholds: data.reportingThresholds ?? Prisma.JsonNull,
    },
  });
}

export async function updateSafetyConfig(
  configId: number,
  data: {
    facilityName?: string;
    facilityType?: string;
    employeeCount?: number;
    workAreas?: string[];
    hazardCategories?: string[];
    regulatoryRequirements?: string[];
    emergencyContacts?: Prisma.InputJsonValue;
    reportingThresholds?: Prisma.InputJsonValue;
  },
) {
  return prisma.safetyMonitorConfig.update({
    where: { id: configId },
    data,
  });
}

// ============ Safety Checklists ============

export async function getChecklists(
  configId: number,
  filters?: {
    category?: string;
    department?: string;
    frequency?: string;
    isActive?: boolean;
  },
) {
  return prisma.safetyChecklist.findMany({
    where: {
      configId,
      ...(filters?.category && { category: filters.category }),
      ...(filters?.department && { department: filters.department }),
      ...(filters?.frequency && { frequency: filters.frequency }),
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
    },
    include: {
      _count: {
        select: { completions: true },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function createChecklist(data: {
  configId: number;
  name: string;
  description?: string;
  category?: string;
  department?: string;
  location?: string;
  frequency?: string;
  dueTime?: string;
  items: Prisma.InputJsonValue;
  regulatoryReference?: string;
  complianceCategory?: string;
  isTemplate?: boolean;
}) {
  return prisma.safetyChecklist.create({
    data: {
      configId: data.configId,
      name: data.name,
      description: data.description,
      category: data.category,
      department: data.department,
      location: data.location,
      frequency: data.frequency,
      dueTime: data.dueTime,
      items: data.items,
      regulatoryReference: data.regulatoryReference,
      complianceCategory: data.complianceCategory,
      isTemplate: data.isTemplate ?? true,
      isActive: true,
    },
  });
}

export async function updateChecklist(
  checklistId: number,
  data: {
    name?: string;
    description?: string;
    category?: string;
    department?: string;
    location?: string;
    frequency?: string;
    dueTime?: string;
    items?: Prisma.InputJsonValue;
    regulatoryReference?: string;
    complianceCategory?: string;
    isTemplate?: boolean;
    isActive?: boolean;
  },
) {
  return prisma.safetyChecklist.update({
    where: { id: checklistId },
    data,
  });
}

export async function deleteChecklist(checklistId: number) {
  return prisma.safetyChecklist.delete({
    where: { id: checklistId },
  });
}

// ============ Checklist Completions ============

export async function getChecklistCompletions(
  checklistId: number,
  filters?: {
    status?: ChecklistStatus;
    startDate?: Date;
    endDate?: Date;
  },
) {
  return prisma.checklistCompletion.findMany({
    where: {
      checklistId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.startDate &&
        filters?.endDate && {
          completedAt: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        }),
    },
    include: {
      checklist: true,
    },
    orderBy: { completedAt: 'desc' },
  });
}

export async function createChecklistCompletion(data: {
  configId: number;
  checklistId: number;
  assignedTo?: number;
  assignedToName?: string;
  location?: string;
  department?: string;
  dueDate?: Date;
  completedAt?: Date;
  responses?: Prisma.InputJsonValue;
  deficienciesFound?: number;
  correctiveActions?: Prisma.InputJsonValue;
  signatureUrl?: string;
}) {
  // Determine status based on completion
  const status = data.completedAt
    ? ChecklistStatus.COMPLETED
    : ChecklistStatus.NOT_STARTED;

  return prisma.checklistCompletion.create({
    data: {
      configId: data.configId,
      checklistId: data.checklistId,
      assignedTo: data.assignedTo,
      assignedToName: data.assignedToName,
      location: data.location,
      department: data.department,
      dueDate: data.dueDate,
      completedAt: data.completedAt,
      signedAt: data.completedAt,
      responses: data.responses,
      deficienciesFound: data.deficienciesFound ?? 0,
      correctiveActions: data.correctiveActions,
      signatureUrl: data.signatureUrl,
      status,
    },
    include: {
      checklist: true,
    },
  });
}

// ============ Safety Incidents ============

export async function getIncidents(
  configId: number,
  filters?: {
    status?: IncidentStatus;
    severity?: IncidentSeverity;
    workArea?: string;
    startDate?: Date;
    endDate?: Date;
  },
) {
  return prisma.safetyIncident.findMany({
    where: {
      configId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.severity && { severity: filters.severity }),
      ...(filters?.workArea && {
        location: { contains: filters.workArea, mode: 'insensitive' },
      }),
      ...(filters?.startDate &&
        filters?.endDate && {
          occurredAt: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        }),
    },
    orderBy: { occurredAt: 'desc' },
  });
}

export async function createIncident(data: {
  configId: number;
  incidentNumber: string;
  title: string;
  description: string;
  incidentType: string;
  severity: IncidentSeverity;
  occurredAt: Date;
  location?: string;
  department?: string;
  affectedPersons?: Prisma.InputJsonValue;
  witnesses?: Prisma.InputJsonValue;
  rootCause?: string;
  reportedBy?: string;
}) {
  return prisma.safetyIncident.create({
    data: {
      configId: data.configId,
      incidentNumber: data.incidentNumber,
      title: data.title,
      description: data.description,
      incidentType: data.incidentType,
      severity: data.severity,
      occurredAt: data.occurredAt,
      location: data.location,
      department: data.department,
      affectedPersons: data.affectedPersons,
      witnesses: data.witnesses,
      rootCause: data.rootCause,
      reportedBy: data.reportedBy,
      reportedAt: new Date(),
      status: IncidentStatus.REPORTED,
    },
  });
}

export async function updateIncident(
  incidentId: number,
  data: {
    status?: IncidentStatus;
    title?: string;
    description?: string;
    severity?: IncidentSeverity;
    rootCause?: string;
    correctiveActions?: string[];
    preventiveMeasures?: string[];
    investigationNotes?: string;
    investigatedBy?: string;
    closedAt?: Date;
    closedBy?: string;
  },
) {
  const updateData: Record<string, unknown> = { ...data };

  if (data.status === IncidentStatus.UNDER_INVESTIGATION) {
    updateData.investigatedAt = new Date();
  }

  if (data.status === IncidentStatus.CLOSED && !data.closedAt) {
    updateData.closedAt = new Date();
  }

  return prisma.safetyIncident.update({
    where: { id: incidentId },
    data: updateData,
  });
}

// ============ Hazard Reports ============

export async function getHazards(
  configId: number,
  filters?: {
    hazardType?: string;
    riskLevel?: RiskLevel;
    mitigationStatus?: string;
    location?: string;
  },
) {
  return prisma.hazardReport.findMany({
    where: {
      configId,
      ...(filters?.hazardType && { hazardType: filters.hazardType }),
      ...(filters?.riskLevel && { riskLevel: filters.riskLevel }),
      ...(filters?.mitigationStatus && {
        mitigationStatus: filters.mitigationStatus,
      }),
      ...(filters?.location && {
        location: { contains: filters.location, mode: 'insensitive' },
      }),
    },
    orderBy: { reportedAt: 'desc' },
  });
}

export async function createHazard(data: {
  configId: number;
  title: string;
  description: string;
  hazardType: string;
  location?: string;
  department?: string;
  riskLevel: RiskLevel;
  likelihood?: number;
  consequence?: number;
  controlMeasures?: Prisma.InputJsonValue;
  reportedBy?: string;
}) {
  return prisma.hazardReport.create({
    data: {
      configId: data.configId,
      title: data.title,
      description: data.description,
      hazardType: data.hazardType,
      location: data.location,
      department: data.department,
      riskLevel: data.riskLevel,
      likelihood: data.likelihood,
      consequence: data.consequence,
      controlMeasures: data.controlMeasures,
      reportedBy: data.reportedBy,
      reportedAt: new Date(),
      mitigationStatus: 'open',
    },
  });
}

export async function updateHazard(
  hazardId: number,
  data: {
    riskLevel?: RiskLevel;
    mitigationStatus?: string;
    controlMeasures?: Prisma.InputJsonValue;
    resolvedAt?: Date;
    resolvedBy?: number;
    residualRisk?: number;
  },
) {
  return prisma.hazardReport.update({
    where: { id: hazardId },
    data,
  });
}

// ============ Training Management ============

export async function getTrainingRequirements(
  configId: number,
  filters?: {
    category?: string;
    isActive?: boolean;
  },
) {
  return prisma.trainingRequirement.findMany({
    where: {
      configId,
      ...(filters?.category && { category: filters.category }),
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
    },
    include: {
      records: {
        take: 10,
        orderBy: { completedAt: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function createTrainingRequirement(data: {
  configId: number;
  name: string;
  description?: string;
  category?: string;
  applicableRoles?: string[];
  applicableDepartments?: string[];
  validityPeriodDays?: number;
  frequency?: string;
  durationMinutes?: number;
  contentUrl?: string;
  passingScore?: number;
  isRequired?: boolean;
  regulatoryReference?: string;
  complianceCategory?: string;
}) {
  return prisma.trainingRequirement.create({
    data: {
      configId: data.configId,
      name: data.name,
      description: data.description,
      category: data.category,
      applicableRoles: data.applicableRoles ?? [],
      applicableDepartments: data.applicableDepartments ?? [],
      validityPeriodDays: data.validityPeriodDays,
      frequency: data.frequency,
      durationMinutes: data.durationMinutes,
      contentUrl: data.contentUrl,
      passingScore: data.passingScore,
      isRequired: data.isRequired ?? true,
      regulatoryReference: data.regulatoryReference,
      complianceCategory: data.complianceCategory,
      isActive: true,
    },
  });
}

export async function updateTrainingRequirement(
  requirementId: number,
  data: {
    name?: string;
    description?: string;
    category?: string;
    applicableRoles?: string[];
    applicableDepartments?: string[];
    validityPeriodDays?: number;
    frequency?: string;
    durationMinutes?: number;
    contentUrl?: string;
    passingScore?: number;
    isRequired?: boolean;
    isActive?: boolean;
  },
) {
  return prisma.trainingRequirement.update({
    where: { id: requirementId },
    data,
  });
}

// ============ Training Records ============

export async function getTrainingRecords(
  configId: number,
  filters?: {
    requirementId?: number;
    employeeId?: string;
    status?: TrainingStatus;
  },
) {
  return prisma.trainingRecord.findMany({
    where: {
      configId,
      ...(filters?.requirementId && { requirementId: filters.requirementId }),
      ...(filters?.employeeId && { employeeId: filters.employeeId }),
      ...(filters?.status && { status: filters.status }),
    },
    include: {
      requirement: true,
    },
    orderBy: { completedAt: 'desc' },
  });
}

export async function createTrainingRecord(data: {
  configId: number;
  requirementId: number;
  employeeId: string;
  employeeName: string;
  department?: string;
  role?: string;
  assignedAt?: Date;
  completedAt?: Date;
  score?: number;
  certificateUrl?: string;
  certificateNumber?: string;
}) {
  const requirement = await prisma.trainingRequirement.findUnique({
    where: { id: data.requirementId },
  });

  let status: TrainingStatus = TrainingStatus.ASSIGNED;
  let passed: boolean | undefined;
  if (data.completedAt) {
    if (requirement?.passingScore && data.score !== undefined) {
      passed = data.score >= requirement.passingScore;
      status = passed ? TrainingStatus.COMPLETED : TrainingStatus.FAILED;
    } else {
      status = TrainingStatus.COMPLETED;
      passed = true;
    }
  }

  // Calculate expiry date based on validity period in days
  let expiresAt: Date | undefined;
  if (data.completedAt && requirement?.validityPeriodDays) {
    expiresAt = new Date(data.completedAt);
    expiresAt.setDate(expiresAt.getDate() + requirement.validityPeriodDays);
  }

  return prisma.trainingRecord.create({
    data: {
      configId: data.configId,
      requirementId: data.requirementId,
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      department: data.department,
      role: data.role,
      assignedAt: data.assignedAt ?? new Date(),
      completedAt: data.completedAt,
      expiresAt,
      score: data.score,
      passed,
      certificateUrl: data.certificateUrl,
      certificateNumber: data.certificateNumber,
      status,
    },
    include: {
      requirement: true,
    },
  });
}

export async function updateTrainingRecord(
  recordId: number,
  data: {
    status?: TrainingStatus;
    startedAt?: Date;
    completedAt?: Date;
    expiresAt?: Date;
    score?: number;
    passed?: boolean;
    certificateUrl?: string;
    certificateNumber?: string;
  },
) {
  return prisma.trainingRecord.update({
    where: { id: recordId },
    data,
    include: {
      requirement: true,
    },
  });
}

// ============ OSHA Logs ============

export async function getOshaLogs(
  configId: number,
  filters?: {
    year?: number;
  },
) {
  return prisma.oshaLog.findMany({
    where: {
      configId,
      ...(filters?.year && { year: filters.year }),
    },
    orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function createOshaLog(data: {
  configId: number;
  year: number;
  caseNumber: string;
  employeeName: string;
  jobTitle: string;
  department?: string;
  dateOfInjury: Date;
  locationOfEvent?: string;
  description: string;
  injuryType: string;
  bodyPartAffected?: string;
  resultedInDeath?: boolean;
  daysAwayFromWork?: number;
  daysJobTransfer?: number;
  daysRestriction?: number;
  otherRecordable?: boolean;
  incidentId?: number;
}) {
  return prisma.oshaLog.create({
    data: {
      configId: data.configId,
      year: data.year,
      caseNumber: data.caseNumber,
      employeeName: data.employeeName,
      jobTitle: data.jobTitle,
      department: data.department,
      dateOfInjury: data.dateOfInjury,
      locationOfEvent: data.locationOfEvent,
      description: data.description,
      injuryType: data.injuryType,
      bodyPartAffected: data.bodyPartAffected,
      resultedInDeath: data.resultedInDeath ?? false,
      daysAwayFromWork: data.daysAwayFromWork ?? 0,
      daysJobTransfer: data.daysJobTransfer ?? 0,
      daysRestriction: data.daysRestriction ?? 0,
      otherRecordable: data.otherRecordable ?? false,
      incidentId: data.incidentId,
    },
  });
}

export async function updateOshaLog(
  logId: number,
  data: {
    employeeName?: string;
    jobTitle?: string;
    department?: string;
    dateOfInjury?: Date;
    locationOfEvent?: string;
    description?: string;
    injuryType?: string;
    bodyPartAffected?: string;
    resultedInDeath?: boolean;
    daysAwayFromWork?: number;
    daysJobTransfer?: number;
    daysRestriction?: number;
    otherRecordable?: boolean;
    incidentId?: number;
  },
) {
  return prisma.oshaLog.update({
    where: { id: logId },
    data,
  });
}

// ============ Safety Inspections ============

export async function getInspections(
  configId: number,
  filters?: {
    inspectionType?: string;
    status?: string;
    area?: string;
  },
) {
  return prisma.safetyInspection.findMany({
    where: {
      configId,
      ...(filters?.inspectionType && {
        inspectionType: filters.inspectionType,
      }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.area && { areasInspected: { has: filters.area } }),
    },
    orderBy: { scheduledDate: 'desc' },
  });
}

export async function createInspection(data: {
  configId: number;
  inspectionType: string;
  name: string;
  areasInspected?: string[];
  scheduledDate: Date;
  inspector?: string;
  location?: string;
  department?: string;
}) {
  return prisma.safetyInspection.create({
    data: {
      configId: data.configId,
      inspectionType: data.inspectionType,
      name: data.name,
      areasInspected: data.areasInspected ?? [],
      scheduledDate: data.scheduledDate,
      inspector: data.inspector,
      location: data.location,
      department: data.department,
      status: 'scheduled',
    },
  });
}

export async function updateInspection(
  inspectionId: number,
  data: {
    status?: string;
    completedAt?: Date;
    inspector?: string;
    findings?: Prisma.InputJsonValue;
    overallScore?: number;
    correctiveActions?: Prisma.InputJsonValue;
    followUpDate?: Date;
    deficiencies?: number;
    criticalFindings?: number;
  },
) {
  return prisma.safetyInspection.update({
    where: { id: inspectionId },
    data,
  });
}

// ============ Analytics ============

export async function getSafetyAnalytics(
  configId: number,
  filters?: {
    startDate?: Date;
    endDate?: Date;
  },
) {
  const startDate =
    filters?.startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const endDate = filters?.endDate || new Date();

  const [incidents, hazards, trainings, inspections, analytics] =
    await Promise.all([
      prisma.safetyIncident.findMany({
        where: {
          configId,
          occurredAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.hazardReport.findMany({
        where: {
          configId,
          reportedAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.trainingRecord.findMany({
        where: {
          configId,
          completedAt: { gte: startDate, lte: endDate },
        },
        include: {
          requirement: true,
        },
      }),
      prisma.safetyInspection.findMany({
        where: {
          configId,
          scheduledDate: { gte: startDate, lte: endDate },
        },
      }),
      prisma.safetyMonitorAnalytics.findMany({
        where: {
          configId,
          date: { gte: startDate, lte: endDate },
        },
        orderBy: { date: 'asc' },
      }),
    ]);

  // Calculate key safety metrics
  const totalIncidents = incidents.length;
  const openIncidents = incidents.filter(
    (i) => i.status !== IncidentStatus.CLOSED,
  ).length;
  const severeIncidents = incidents.filter(
    (i) =>
      i.severity === IncidentSeverity.SEVERE ||
      i.severity === IncidentSeverity.FATAL,
  ).length;

  const openHazards = hazards.filter(
    (h) => h.mitigationStatus === 'open',
  ).length;
  const resolvedHazards = hazards.filter(
    (h) => h.mitigationStatus === 'resolved',
  ).length;

  const _completedTrainings = trainings.filter(
    (t) => t.status === TrainingStatus.COMPLETED,
  ).length;
  const _overdueTrainings = trainings.filter(
    (t) => t.expiresAt && new Date(t.expiresAt) < new Date(),
  ).length;

  const completedInspections = inspections.filter(
    (i) => i.status === 'completed',
  ).length;
  const passedInspections = inspections.filter(
    (i) =>
      i.status === 'completed' &&
      (i.overallScore === null || i.overallScore >= 70),
  ).length;

  // Calculate days without incident
  const lastIncident = incidents.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  )[0];
  const daysWithoutIncident = lastIncident
    ? Math.floor(
        (Date.now() - new Date(lastIncident.occurredAt).getTime()) /
          (24 * 60 * 60 * 1000),
      )
    : 365;

  // Incidents by type
  const incidentsByType: Record<string, number> = {};
  for (const incident of incidents) {
    incidentsByType[incident.incidentType] =
      (incidentsByType[incident.incidentType] || 0) + 1;
  }

  // Incidents by severity
  const incidentsBySeverity = {
    nearMiss: incidents.filter((i) => i.severity === IncidentSeverity.NEAR_MISS)
      .length,
    minor: incidents.filter((i) => i.severity === IncidentSeverity.MINOR)
      .length,
    moderate: incidents.filter((i) => i.severity === IncidentSeverity.MODERATE)
      .length,
    serious: incidents.filter((i) => i.severity === IncidentSeverity.SERIOUS)
      .length,
    severe: incidents.filter((i) => i.severity === IncidentSeverity.SEVERE)
      .length,
    fatal: incidents.filter((i) => i.severity === IncidentSeverity.FATAL)
      .length,
  };

  return {
    historicalData: analytics,
    currentMetrics: {
      totalIncidents,
      openIncidents,
      severeIncidents,
      daysWithoutIncident,
      openHazards,
      resolvedHazards,
      hazardResolutionRate:
        hazards.length > 0
          ? Math.round((resolvedHazards / hazards.length) * 100)
          : 100,
      completedTrainings: _completedTrainings,
      overdueTrainings: _overdueTrainings,
      trainingComplianceRate:
        trainings.length > 0
          ? Math.round((_completedTrainings / trainings.length) * 100)
          : 100,
      completedInspections,
      inspectionPassRate:
        completedInspections > 0
          ? Math.round((passedInspections / completedInspections) * 100)
          : 100,
    },
    incidentsByType,
    incidentsBySeverity,
    hazardsByCategory: groupBy(hazards, 'hazardType'),
    trainingsByCategory: groupBy(
      trainings,
      (t) => t.requirement?.category || 'uncategorized',
    ),
  };
}

function groupBy<T>(
  items: T[],
  key: string | ((item: T) => string),
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    const groupKey: string =
      typeof key === 'function'
        ? key(item)
        : String((item as Record<string, unknown>)[key as string] ?? 'unknown');
    result[groupKey] = (result[groupKey] || 0) + 1;
  }
  return result;
}

export async function recordDailyAnalytics(configId: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [incidents, hazards, trainings, checklists] = await Promise.all([
    prisma.safetyIncident.findMany({ where: { configId } }),
    prisma.hazardReport.findMany({ where: { configId } }),
    prisma.trainingRecord.findMany({ where: { configId } }),
    prisma.checklistCompletion.findMany({
      where: {
        checklist: { configId },
      },
    }),
  ]);

  const openHazards = hazards.filter(
    (h) => h.mitigationStatus === 'open',
  ).length;
  const completedTrainings = trainings.filter(
    (t) => t.status === TrainingStatus.COMPLETED,
  ).length;
  const overdueTrainings = trainings.filter(
    (t) => t.expiresAt && new Date(t.expiresAt) < new Date(),
  ).length;

  // Calculate days since last incident (excluding near misses and minor)
  const lastIncident = incidents
    .filter(
      (i) =>
        i.severity !== IncidentSeverity.MINOR &&
        i.severity !== IncidentSeverity.NEAR_MISS,
    )
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    )[0];
  const daysWithoutIncident = lastIncident
    ? Math.floor(
        (Date.now() - new Date(lastIncident.occurredAt).getTime()) /
          (24 * 60 * 60 * 1000),
      )
    : 365;

  // Count incidents by severity
  const nearMisses = incidents.filter(
    (i) => i.severity === IncidentSeverity.NEAR_MISS,
  ).length;
  const minorIncidents = incidents.filter(
    (i) => i.severity === IncidentSeverity.MINOR,
  ).length;
  const seriousIncidents = incidents.filter(
    (i) => i.severity === IncidentSeverity.SERIOUS,
  ).length;
  const severeIncidents = incidents.filter(
    (i) =>
      i.severity === IncidentSeverity.SEVERE ||
      i.severity === IncidentSeverity.FATAL,
  ).length;

  // OSHA recordables (serious, severe, fatal)
  const oshaRecordables = incidents.filter((i) => i.isOshaRecordable).length;

  // Checklists completed today
  const checklistsCompletedToday = checklists.filter(
    (c) =>
      c.completedAt &&
      new Date(c.completedAt).toDateString() === today.toDateString(),
  ).length;

  // Hazards reported and mitigated
  const hazardsReported = hazards.filter(
    (h) => new Date(h.reportedAt).toDateString() === today.toDateString(),
  ).length;
  const hazardsMitigated = hazards.filter(
    (h) => h.mitigationStatus === 'resolved',
  ).length;

  return prisma.safetyMonitorAnalytics.upsert({
    where: {
      configId_date: {
        configId,
        date: today,
      },
    },
    update: {
      totalIncidents: incidents.length,
      oshaRecordables,
      nearMisses,
      daysWithoutIncident,
      minorIncidents,
      seriousIncidents,
      severeIncidents,
      checklistsCompleted: checklistsCompletedToday,
      hazardsReported,
      hazardsMitigated,
      openHazards,
      trainingsCompleted: completedTrainings,
      trainingsOverdue: overdueTrainings,
    },
    create: {
      configId,
      date: today,
      totalIncidents: incidents.length,
      oshaRecordables,
      nearMisses,
      daysWithoutIncident,
      minorIncidents,
      seriousIncidents,
      severeIncidents,
      checklistsCompleted: checklistsCompletedToday,
      hazardsReported,
      hazardsMitigated,
      openHazards,
      trainingsCompleted: completedTrainings,
      trainingsOverdue: overdueTrainings,
    },
  });
}

function _calculateComplianceScore(
  incidents: SafetyIncident[],
  hazards: HazardReport[],
  trainings: TrainingRecord[],
): number {
  let score = 100;

  // Deduct for open incidents
  const openIncidents = incidents.filter(
    (i) => i.status !== IncidentStatus.CLOSED,
  ).length;
  score -= openIncidents * 5;

  // Deduct for severe incidents
  const severeIncidents = incidents.filter(
    (i) =>
      i.severity === IncidentSeverity.SEVERE ||
      i.severity === IncidentSeverity.FATAL,
  ).length;
  score -= severeIncidents * 10;

  // Deduct for open hazards
  const openHazards = hazards.filter(
    (h) => h.mitigationStatus === 'open',
  ).length;
  score -= openHazards * 3;

  // Deduct for overdue trainings
  const overdueTrainings = trainings.filter(
    (t) => t.expiresAt && new Date(t.expiresAt) < new Date(),
  ).length;
  score -= overdueTrainings * 2;

  return Math.max(0, Math.min(100, score));
}

// ============ Authorization Helpers ============

export async function getClientIdFromSafetyConfig(
  configId: number,
): Promise<number | null> {
  const config = await prisma.safetyMonitorConfig.findUnique({
    where: { id: configId },
    select: { clientId: true },
  });
  return config?.clientId ?? null;
}

export async function getClientIdFromChecklist(
  checklistId: number,
): Promise<number | null> {
  const checklist = await prisma.safetyChecklist.findUnique({
    where: { id: checklistId },
    include: { config: { select: { clientId: true } } },
  });
  return checklist?.config?.clientId ?? null;
}

export async function getClientIdFromIncident(
  incidentId: number,
): Promise<number | null> {
  const incident = await prisma.safetyIncident.findUnique({
    where: { id: incidentId },
    include: { config: { select: { clientId: true } } },
  });
  return incident?.config?.clientId ?? null;
}

export async function getClientIdFromHazard(
  hazardId: number,
): Promise<number | null> {
  const hazard = await prisma.hazardReport.findUnique({
    where: { id: hazardId },
    include: { config: { select: { clientId: true } } },
  });
  return hazard?.config?.clientId ?? null;
}

export async function getClientIdFromTrainingRequirement(
  requirementId: number,
): Promise<number | null> {
  const requirement = await prisma.trainingRequirement.findUnique({
    where: { id: requirementId },
    include: { config: { select: { clientId: true } } },
  });
  return requirement?.config?.clientId ?? null;
}

export async function getClientIdFromInspection(
  inspectionId: number,
): Promise<number | null> {
  const inspection = await prisma.safetyInspection.findUnique({
    where: { id: inspectionId },
    include: { config: { select: { clientId: true } } },
  });
  return inspection?.config?.clientId ?? null;
}
