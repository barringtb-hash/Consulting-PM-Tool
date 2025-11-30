import { PrismaClient, IncidentSeverity, IncidentStatus, ChecklistStatus, TrainingStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ============ Configuration Management ============

export async function getSafetyConfig(clientId: string) {
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
  clientId: string;
  facilityName: string;
  facilityType: string;
  employeeCount: number;
  workAreas: string[];
  hazardCategories?: string[];
  regulatoryRequirements?: string[];
  emergencyContacts?: Record<string, any>;
  reportingThresholds?: Record<string, any>;
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
      emergencyContacts: data.emergencyContacts ?? {},
      reportingThresholds: data.reportingThresholds ?? {},
    },
  });
}

export async function updateSafetyConfig(
  configId: string,
  data: {
    facilityName?: string;
    facilityType?: string;
    employeeCount?: number;
    workAreas?: string[];
    hazardCategories?: string[];
    regulatoryRequirements?: string[];
    emergencyContacts?: Record<string, any>;
    reportingThresholds?: Record<string, any>;
  }
) {
  return prisma.safetyMonitorConfig.update({
    where: { id: configId },
    data,
  });
}

// ============ Safety Checklists ============

export async function getChecklists(configId: string, filters?: {
  workArea?: string;
  frequency?: string;
  isActive?: boolean;
}) {
  return prisma.safetyChecklist.findMany({
    where: {
      configId,
      ...(filters?.workArea && { workArea: filters.workArea }),
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
  configId: string;
  name: string;
  description?: string;
  workArea: string;
  frequency: string;
  items: Record<string, any>[];
  requiredPPE?: string[];
  estimatedDuration?: number;
}) {
  return prisma.safetyChecklist.create({
    data: {
      configId: data.configId,
      name: data.name,
      description: data.description,
      workArea: data.workArea,
      frequency: data.frequency,
      items: data.items,
      requiredPPE: data.requiredPPE ?? [],
      estimatedDuration: data.estimatedDuration,
      isActive: true,
    },
  });
}

export async function updateChecklist(
  checklistId: string,
  data: {
    name?: string;
    description?: string;
    workArea?: string;
    frequency?: string;
    items?: Record<string, any>[];
    requiredPPE?: string[];
    estimatedDuration?: number;
    isActive?: boolean;
  }
) {
  return prisma.safetyChecklist.update({
    where: { id: checklistId },
    data,
  });
}

export async function deleteChecklist(checklistId: string) {
  return prisma.safetyChecklist.delete({
    where: { id: checklistId },
  });
}

// ============ Checklist Completions ============

export async function getChecklistCompletions(checklistId: string, filters?: {
  status?: ChecklistStatus;
  startDate?: Date;
  endDate?: Date;
}) {
  return prisma.checklistCompletion.findMany({
    where: {
      checklistId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.startDate && filters?.endDate && {
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
  checklistId: string;
  completedBy: string;
  completedAt: Date;
  responses: Record<string, any>;
  notes?: string;
  issues?: string[];
  photos?: string[];
}) {
  // Determine status based on responses
  const hasIssues = data.issues && data.issues.length > 0;
  const status = hasIssues ? ChecklistStatus.FAILED : ChecklistStatus.PASSED;

  const completion = await prisma.checklistCompletion.create({
    data: {
      checklistId: data.checklistId,
      completedBy: data.completedBy,
      completedAt: data.completedAt,
      responses: data.responses,
      notes: data.notes,
      issues: data.issues ?? [],
      photos: data.photos ?? [],
      status,
    },
    include: {
      checklist: true,
    },
  });

  // Update checklist's last completion date
  await prisma.safetyChecklist.update({
    where: { id: data.checklistId },
    data: { lastCompletedAt: data.completedAt },
  });

  return completion;
}

// ============ Safety Incidents ============

export async function getIncidents(configId: string, filters?: {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  workArea?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  return prisma.safetyIncident.findMany({
    where: {
      configId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.severity && { severity: filters.severity }),
      ...(filters?.workArea && { location: { contains: filters.workArea, mode: 'insensitive' } }),
      ...(filters?.startDate && filters?.endDate && {
        incidentDate: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      }),
    },
    orderBy: { incidentDate: 'desc' },
  });
}

export async function createIncident(data: {
  configId: string;
  incidentNumber: string;
  title: string;
  description: string;
  incidentType: string;
  severity: IncidentSeverity;
  incidentDate: Date;
  location: string;
  involvedPersons?: string[];
  witnesses?: string[];
  injuries?: Record<string, any>[];
  propertyDamage?: Record<string, any>;
  immediateActions?: string[];
  rootCause?: string;
  reportedBy: string;
}) {
  return prisma.safetyIncident.create({
    data: {
      configId: data.configId,
      incidentNumber: data.incidentNumber,
      title: data.title,
      description: data.description,
      incidentType: data.incidentType,
      severity: data.severity,
      incidentDate: data.incidentDate,
      location: data.location,
      involvedPersons: data.involvedPersons ?? [],
      witnesses: data.witnesses ?? [],
      injuries: data.injuries ?? [],
      propertyDamage: data.propertyDamage ?? {},
      immediateActions: data.immediateActions ?? [],
      rootCause: data.rootCause,
      reportedBy: data.reportedBy,
      reportedAt: new Date(),
      status: IncidentStatus.REPORTED,
    },
  });
}

export async function updateIncident(
  incidentId: string,
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
  }
) {
  const updateData: any = { ...data };

  if (data.status === IncidentStatus.INVESTIGATING) {
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

export async function getHazards(configId: string, filters?: {
  category?: string;
  riskLevel?: string;
  status?: string;
  location?: string;
}) {
  return prisma.hazardReport.findMany({
    where: {
      configId,
      ...(filters?.category && { category: filters.category }),
      ...(filters?.riskLevel && { riskLevel: filters.riskLevel }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.location && { location: { contains: filters.location, mode: 'insensitive' } }),
    },
    orderBy: { reportedAt: 'desc' },
  });
}

export async function createHazard(data: {
  configId: string;
  title: string;
  description: string;
  category: string;
  location: string;
  riskLevel: string;
  potentialConsequences?: string[];
  immediateControls?: string[];
  photos?: string[];
  reportedBy: string;
}) {
  return prisma.hazardReport.create({
    data: {
      configId: data.configId,
      title: data.title,
      description: data.description,
      category: data.category,
      location: data.location,
      riskLevel: data.riskLevel,
      potentialConsequences: data.potentialConsequences ?? [],
      immediateControls: data.immediateControls ?? [],
      photos: data.photos ?? [],
      reportedBy: data.reportedBy,
      reportedAt: new Date(),
      status: 'open',
    },
  });
}

export async function updateHazard(
  hazardId: string,
  data: {
    riskLevel?: string;
    status?: string;
    permanentControls?: string[];
    assignedTo?: string;
    resolvedAt?: Date;
    resolvedBy?: string;
    verificationNotes?: string;
  }
) {
  return prisma.hazardReport.update({
    where: { id: hazardId },
    data,
  });
}

// ============ Training Management ============

export async function getTrainingRequirements(configId: string, filters?: {
  category?: string;
  isActive?: boolean;
}) {
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
  configId: string;
  name: string;
  description?: string;
  category: string;
  requiredFor: string[];
  validityPeriod?: number;
  provider?: string;
  estimatedDuration?: number;
  materials?: string[];
  assessmentRequired?: boolean;
  passingScore?: number;
}) {
  return prisma.trainingRequirement.create({
    data: {
      configId: data.configId,
      name: data.name,
      description: data.description,
      category: data.category,
      requiredFor: data.requiredFor,
      validityPeriod: data.validityPeriod,
      provider: data.provider,
      estimatedDuration: data.estimatedDuration,
      materials: data.materials ?? [],
      assessmentRequired: data.assessmentRequired ?? false,
      passingScore: data.passingScore,
      isActive: true,
    },
  });
}

export async function updateTrainingRequirement(
  requirementId: string,
  data: {
    name?: string;
    description?: string;
    requiredFor?: string[];
    validityPeriod?: number;
    provider?: string;
    estimatedDuration?: number;
    materials?: string[];
    assessmentRequired?: boolean;
    passingScore?: number;
    isActive?: boolean;
  }
) {
  return prisma.trainingRequirement.update({
    where: { id: requirementId },
    data,
  });
}

// ============ Training Records ============

export async function getTrainingRecords(configId: string, filters?: {
  requirementId?: string;
  employeeId?: string;
  status?: TrainingStatus;
}) {
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
  configId: string;
  requirementId: string;
  employeeId: string;
  employeeName: string;
  scheduledDate?: Date;
  completedAt?: Date;
  trainer?: string;
  score?: number;
  certificateUrl?: string;
  notes?: string;
}) {
  const requirement = await prisma.trainingRequirement.findUnique({
    where: { id: data.requirementId },
  });

  let status = TrainingStatus.SCHEDULED;
  if (data.completedAt) {
    if (requirement?.assessmentRequired && data.score !== undefined) {
      status = data.score >= (requirement.passingScore || 70)
        ? TrainingStatus.COMPLETED
        : TrainingStatus.FAILED;
    } else {
      status = TrainingStatus.COMPLETED;
    }
  }

  // Calculate expiry date
  let expiresAt: Date | undefined;
  if (data.completedAt && requirement?.validityPeriod) {
    expiresAt = new Date(data.completedAt);
    expiresAt.setMonth(expiresAt.getMonth() + requirement.validityPeriod);
  }

  return prisma.trainingRecord.create({
    data: {
      configId: data.configId,
      requirementId: data.requirementId,
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      scheduledDate: data.scheduledDate,
      completedAt: data.completedAt,
      expiresAt,
      trainer: data.trainer,
      score: data.score,
      certificateUrl: data.certificateUrl,
      notes: data.notes,
      status,
    },
    include: {
      requirement: true,
    },
  });
}

export async function updateTrainingRecord(
  recordId: string,
  data: {
    completedAt?: Date;
    trainer?: string;
    score?: number;
    certificateUrl?: string;
    notes?: string;
    status?: TrainingStatus;
  }
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

export async function getOshaLogs(configId: string, filters?: {
  year?: number;
  logType?: string;
}) {
  return prisma.oshaLog.findMany({
    where: {
      configId,
      ...(filters?.year && { year: filters.year }),
      ...(filters?.logType && { logType: filters.logType }),
    },
    orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function createOshaLog(data: {
  configId: string;
  year: number;
  logType: string;
  entries: Record<string, any>[];
  totalCases?: number;
  daysAwayFromWork?: number;
  daysRestricted?: number;
  otherRecordable?: number;
}) {
  return prisma.oshaLog.create({
    data: {
      configId: data.configId,
      year: data.year,
      logType: data.logType,
      entries: data.entries,
      totalCases: data.totalCases ?? 0,
      daysAwayFromWork: data.daysAwayFromWork ?? 0,
      daysRestricted: data.daysRestricted ?? 0,
      otherRecordable: data.otherRecordable ?? 0,
    },
  });
}

export async function updateOshaLog(
  logId: string,
  data: {
    entries?: Record<string, any>[];
    totalCases?: number;
    daysAwayFromWork?: number;
    daysRestricted?: number;
    otherRecordable?: number;
  }
) {
  return prisma.oshaLog.update({
    where: { id: logId },
    data,
  });
}

// ============ Safety Inspections ============

export async function getInspections(configId: string, filters?: {
  inspectionType?: string;
  status?: string;
  area?: string;
}) {
  return prisma.safetyInspection.findMany({
    where: {
      configId,
      ...(filters?.inspectionType && { inspectionType: filters.inspectionType }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.area && { area: filters.area }),
    },
    orderBy: { scheduledDate: 'desc' },
  });
}

export async function createInspection(data: {
  configId: string;
  inspectionType: string;
  title: string;
  description?: string;
  area: string;
  scheduledDate: Date;
  inspector?: string;
  checklistItems?: Record<string, any>[];
}) {
  return prisma.safetyInspection.create({
    data: {
      configId: data.configId,
      inspectionType: data.inspectionType,
      title: data.title,
      description: data.description,
      area: data.area,
      scheduledDate: data.scheduledDate,
      inspector: data.inspector,
      checklistItems: data.checklistItems ?? [],
      status: 'scheduled',
    },
  });
}

export async function updateInspection(
  inspectionId: string,
  data: {
    status?: string;
    completedAt?: Date;
    inspector?: string;
    findings?: Record<string, any>[];
    overallRating?: string;
    correctiveActions?: string[];
    nextInspectionDate?: Date;
    notes?: string;
  }
) {
  return prisma.safetyInspection.update({
    where: { id: inspectionId },
    data,
  });
}

// ============ Analytics ============

export async function getSafetyAnalytics(configId: string, filters?: {
  startDate?: Date;
  endDate?: Date;
}) {
  const startDate = filters?.startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const endDate = filters?.endDate || new Date();

  const [incidents, hazards, trainings, inspections, analytics] = await Promise.all([
    prisma.safetyIncident.findMany({
      where: {
        configId,
        incidentDate: { gte: startDate, lte: endDate },
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
    }),
    prisma.safetyInspection.findMany({
      where: {
        configId,
        scheduledDate: { gte: startDate, lte: endDate },
      },
    }),
    prisma.safetyAnalytics.findMany({
      where: {
        configId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    }),
  ]);

  // Calculate key safety metrics
  const totalIncidents = incidents.length;
  const openIncidents = incidents.filter(i => i.status !== IncidentStatus.CLOSED).length;
  const criticalIncidents = incidents.filter(i => i.severity === IncidentSeverity.CRITICAL).length;

  const openHazards = hazards.filter(h => h.status === 'open').length;
  const resolvedHazards = hazards.filter(h => h.status === 'resolved').length;

  const completedTrainings = trainings.filter(t => t.status === TrainingStatus.COMPLETED).length;
  const overdueTrainings = trainings.filter(t =>
    t.expiresAt && new Date(t.expiresAt) < new Date()
  ).length;

  const completedInspections = inspections.filter(i => i.status === 'completed').length;
  const passedInspections = inspections.filter(i =>
    i.status === 'completed' && i.overallRating !== 'fail'
  ).length;

  // Calculate days without incident
  const lastIncident = incidents.sort((a, b) =>
    new Date(b.incidentDate).getTime() - new Date(a.incidentDate).getTime()
  )[0];
  const daysWithoutIncident = lastIncident
    ? Math.floor((Date.now() - new Date(lastIncident.incidentDate).getTime()) / (24 * 60 * 60 * 1000))
    : 365;

  // Incidents by type
  const incidentsByType: Record<string, number> = {};
  for (const incident of incidents) {
    incidentsByType[incident.incidentType] = (incidentsByType[incident.incidentType] || 0) + 1;
  }

  // Incidents by severity
  const incidentsBySeverity = {
    minor: incidents.filter(i => i.severity === IncidentSeverity.MINOR).length,
    moderate: incidents.filter(i => i.severity === IncidentSeverity.MODERATE).length,
    major: incidents.filter(i => i.severity === IncidentSeverity.MAJOR).length,
    critical: incidents.filter(i => i.severity === IncidentSeverity.CRITICAL).length,
  };

  return {
    historicalData: analytics,
    currentMetrics: {
      totalIncidents,
      openIncidents,
      criticalIncidents,
      daysWithoutIncident,
      openHazards,
      resolvedHazards,
      hazardResolutionRate: hazards.length > 0
        ? Math.round((resolvedHazards / hazards.length) * 100)
        : 100,
      completedTrainings,
      overdueTrainings,
      trainingComplianceRate: trainings.length > 0
        ? Math.round((completedTrainings / trainings.length) * 100)
        : 100,
      completedInspections,
      inspectionPassRate: completedInspections > 0
        ? Math.round((passedInspections / completedInspections) * 100)
        : 100,
    },
    incidentsByType,
    incidentsBySeverity,
    hazardsByCategory: groupBy(hazards, 'category'),
    trainingsByCategory: groupBy(trainings, (t: any) => t.requirement?.category || 'uncategorized'),
  };
}

function groupBy<T>(items: T[], key: string | ((item: T) => string)): Record<string, number> {
  const result: Record<string, number> = {};
  for (const item of items) {
    const groupKey = typeof key === 'function' ? key(item) : (item as any)[key];
    result[groupKey] = (result[groupKey] || 0) + 1;
  }
  return result;
}

export async function recordDailyAnalytics(configId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [incidents, hazards, trainings, inspections] = await Promise.all([
    prisma.safetyIncident.findMany({ where: { configId } }),
    prisma.hazardReport.findMany({ where: { configId } }),
    prisma.trainingRecord.findMany({ where: { configId } }),
    prisma.safetyInspection.findMany({ where: { configId } }),
  ]);

  const openIncidents = incidents.filter(i => i.status !== IncidentStatus.CLOSED).length;
  const openHazards = hazards.filter(h => h.status === 'open').length;
  const completedTrainings = trainings.filter(t => t.status === TrainingStatus.COMPLETED).length;
  const overdueTrainings = trainings.filter(t =>
    t.expiresAt && new Date(t.expiresAt) < new Date()
  ).length;

  // Calculate days since last incident
  const lastIncident = incidents
    .filter(i => i.severity !== IncidentSeverity.MINOR)
    .sort((a, b) => new Date(b.incidentDate).getTime() - new Date(a.incidentDate).getTime())[0];
  const daysSinceLastIncident = lastIncident
    ? Math.floor((Date.now() - new Date(lastIncident.incidentDate).getTime()) / (24 * 60 * 60 * 1000))
    : 365;

  return prisma.safetyAnalytics.upsert({
    where: {
      configId_date: {
        configId,
        date: today,
      },
    },
    update: {
      incidentsReported: incidents.filter(i =>
        new Date(i.reportedAt).toDateString() === today.toDateString()
      ).length,
      incidentsOpen: openIncidents,
      hazardsIdentified: hazards.filter(h =>
        new Date(h.reportedAt).toDateString() === today.toDateString()
      ).length,
      hazardsOpen: openHazards,
      inspectionsCompleted: inspections.filter(i =>
        i.completedAt && new Date(i.completedAt).toDateString() === today.toDateString()
      ).length,
      trainingsCompleted: trainings.filter(t =>
        t.completedAt && new Date(t.completedAt).toDateString() === today.toDateString()
      ).length,
      daysSinceLastIncident,
      complianceScore: calculateComplianceScore(incidents, hazards, trainings),
    },
    create: {
      configId,
      date: today,
      incidentsReported: incidents.filter(i =>
        new Date(i.reportedAt).toDateString() === today.toDateString()
      ).length,
      incidentsOpen: openIncidents,
      hazardsIdentified: hazards.filter(h =>
        new Date(h.reportedAt).toDateString() === today.toDateString()
      ).length,
      hazardsOpen: openHazards,
      inspectionsCompleted: inspections.filter(i =>
        i.completedAt && new Date(i.completedAt).toDateString() === today.toDateString()
      ).length,
      trainingsCompleted: trainings.filter(t =>
        t.completedAt && new Date(t.completedAt).toDateString() === today.toDateString()
      ).length,
      daysSinceLastIncident,
      complianceScore: calculateComplianceScore(incidents, hazards, trainings),
    },
  });
}

function calculateComplianceScore(incidents: any[], hazards: any[], trainings: any[]): number {
  let score = 100;

  // Deduct for open incidents
  const openIncidents = incidents.filter(i => i.status !== IncidentStatus.CLOSED).length;
  score -= openIncidents * 5;

  // Deduct for critical incidents
  const criticalIncidents = incidents.filter(i => i.severity === IncidentSeverity.CRITICAL).length;
  score -= criticalIncidents * 10;

  // Deduct for open hazards
  const openHazards = hazards.filter(h => h.status === 'open').length;
  score -= openHazards * 3;

  // Deduct for overdue trainings
  const overdueTrainings = trainings.filter(t =>
    t.expiresAt && new Date(t.expiresAt) < new Date()
  ).length;
  score -= overdueTrainings * 2;

  return Math.max(0, Math.min(100, score));
}

// ============ Authorization Helpers ============

export async function getClientIdFromSafetyConfig(configId: string): Promise<string | null> {
  const config = await prisma.safetyMonitorConfig.findUnique({
    where: { id: configId },
    select: { clientId: true },
  });
  return config?.clientId ?? null;
}

export async function getClientIdFromChecklist(checklistId: string): Promise<string | null> {
  const checklist = await prisma.safetyChecklist.findUnique({
    where: { id: checklistId },
    include: { config: { select: { clientId: true } } },
  });
  return checklist?.config?.clientId ?? null;
}

export async function getClientIdFromIncident(incidentId: string): Promise<string | null> {
  const incident = await prisma.safetyIncident.findUnique({
    where: { id: incidentId },
    include: { config: { select: { clientId: true } } },
  });
  return incident?.config?.clientId ?? null;
}

export async function getClientIdFromHazard(hazardId: string): Promise<string | null> {
  const hazard = await prisma.hazardReport.findUnique({
    where: { id: hazardId },
    include: { config: { select: { clientId: true } } },
  });
  return hazard?.config?.clientId ?? null;
}

export async function getClientIdFromTrainingRequirement(requirementId: string): Promise<string | null> {
  const requirement = await prisma.trainingRequirement.findUnique({
    where: { id: requirementId },
    include: { config: { select: { clientId: true } } },
  });
  return requirement?.config?.clientId ?? null;
}

export async function getClientIdFromInspection(inspectionId: string): Promise<string | null> {
  const inspection = await prisma.safetyInspection.findUnique({
    where: { id: inspectionId },
    include: { config: { select: { clientId: true } } },
  });
  return inspection?.config?.clientId ?? null;
}
