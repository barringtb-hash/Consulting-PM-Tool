import {
  ViolationStatus,
  AuditStatus,
  RiskLevel,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../prisma/client';

// ============ Configuration Management ============

export async function getComplianceConfig(clientId: number) {
  return prisma.complianceMonitorConfig.findUnique({
    where: { clientId },
    include: {
      complianceRules: true,
      _count: {
        select: {
          violations: true,
          audits: true,
          riskAssessments: true,
        },
      },
    },
  });
}

export async function createComplianceConfig(data: {
  clientId: number;
  industry?: string;
  jurisdiction?: string;
  organizationName?: string;
  enableHipaa?: boolean;
  enableSox?: boolean;
  enableGdpr?: boolean;
  enablePci?: boolean;
  enableFinra?: boolean;
  customFrameworks?: string[];
  realTimeMonitoring?: boolean;
  monitoringFrequency?: string;
  alertThreshold?: string;
  notificationEmails?: string[];
  dataSourceConfigs?: Record<string, unknown>;
}) {
  return prisma.complianceMonitorConfig.create({
    data: {
      clientId: data.clientId,
      industry: data.industry,
      jurisdiction: data.jurisdiction,
      organizationName: data.organizationName,
      enableHipaa: data.enableHipaa ?? false,
      enableSox: data.enableSox ?? false,
      enableGdpr: data.enableGdpr ?? false,
      enablePci: data.enablePci ?? false,
      enableFinra: data.enableFinra ?? false,
      customFrameworks: data.customFrameworks ?? [],
      realTimeMonitoring: data.realTimeMonitoring ?? true,
      monitoringFrequency: data.monitoringFrequency ?? 'daily',
      alertThreshold: data.alertThreshold ?? 'medium',
      notificationEmails: data.notificationEmails ?? [],
      dataSourceConfigs: data.dataSourceConfigs as Prisma.InputJsonValue,
    },
  });
}

export async function updateComplianceConfig(
  configId: number,
  data: {
    industry?: string;
    jurisdiction?: string;
    organizationName?: string;
    enableHipaa?: boolean;
    enableSox?: boolean;
    enableGdpr?: boolean;
    enablePci?: boolean;
    enableFinra?: boolean;
    customFrameworks?: string[];
    realTimeMonitoring?: boolean;
    monitoringFrequency?: string;
    alertThreshold?: string;
    notificationEmails?: string[];
    dataSourceConfigs?: Record<string, unknown>;
  },
) {
  return prisma.complianceMonitorConfig.update({
    where: { id: configId },
    data: {
      ...data,
      dataSourceConfigs: data.dataSourceConfigs as Prisma.InputJsonValue,
    },
  });
}

// ============ Compliance Rules Management ============

export async function getRules(
  configId: number,
  filters?: {
    framework?: string;
    category?: string;
    isActive?: boolean;
  },
) {
  return prisma.complianceRule.findMany({
    where: {
      configId,
      ...(filters?.framework && { framework: filters.framework }),
      ...(filters?.category && { category: filters.category }),
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
    },
    orderBy: { name: 'asc' },
  });
}

export async function createRule(data: {
  configId: number;
  name: string;
  description?: string;
  framework: string;
  category?: string;
  ruleType: string;
  ruleDefinition: Record<string, unknown>;
  severity?: RiskLevel;
  isRealtime?: boolean;
  checkFrequency?: string;
  autoRemediate?: boolean;
  remediationAction?: Record<string, unknown>;
}) {
  return prisma.complianceRule.create({
    data: {
      configId: data.configId,
      name: data.name,
      description: data.description,
      framework: data.framework,
      category: data.category,
      ruleType: data.ruleType,
      ruleDefinition: data.ruleDefinition as Prisma.InputJsonValue,
      severity: data.severity ?? RiskLevel.MEDIUM,
      isRealtime: data.isRealtime ?? false,
      checkFrequency: data.checkFrequency,
      autoRemediate: data.autoRemediate ?? false,
      remediationAction: data.remediationAction as Prisma.InputJsonValue,
    },
  });
}

export async function updateRule(
  ruleId: number,
  data: {
    name?: string;
    description?: string;
    category?: string;
    ruleDefinition?: Record<string, unknown>;
    severity?: RiskLevel;
    isRealtime?: boolean;
    checkFrequency?: string;
    autoRemediate?: boolean;
    remediationAction?: Record<string, unknown>;
    isActive?: boolean;
  },
) {
  return prisma.complianceRule.update({
    where: { id: ruleId },
    data: {
      ...data,
      ruleDefinition: data.ruleDefinition as Prisma.InputJsonValue,
      remediationAction: data.remediationAction as Prisma.InputJsonValue,
    },
  });
}

// ============ Violations Management ============

export async function getViolations(
  configId: number,
  filters?: {
    status?: ViolationStatus;
    ruleId?: number;
    severity?: RiskLevel;
    startDate?: Date;
    endDate?: Date;
  },
) {
  return prisma.complianceViolation.findMany({
    where: {
      configId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.ruleId && { ruleId: filters.ruleId }),
      ...(filters?.severity && { severity: filters.severity }),
      ...(filters?.startDate &&
        filters?.endDate && {
          detectedAt: {
            gte: filters.startDate,
            lte: filters.endDate,
          },
        }),
    },
    include: {
      rule: true,
    },
    orderBy: { detectedAt: 'desc' },
  });
}

export async function createViolation(data: {
  configId: number;
  ruleId: number;
  title: string;
  description?: string;
  severity: RiskLevel;
  sourceSystem?: string;
  sourceReference?: string;
  violationData?: Record<string, unknown>;
  affectedEntities?: Record<string, unknown>;
}) {
  return prisma.complianceViolation.create({
    data: {
      configId: data.configId,
      ruleId: data.ruleId,
      title: data.title,
      description: data.description,
      severity: data.severity,
      sourceSystem: data.sourceSystem,
      sourceReference: data.sourceReference,
      violationData: data.violationData as Prisma.InputJsonValue,
      affectedEntities: data.affectedEntities as Prisma.InputJsonValue,
      status: ViolationStatus.OPEN,
    },
    include: { rule: true },
  });
}

export async function updateViolation(
  violationId: number,
  data: {
    status?: ViolationStatus;
    remediationNotes?: string;
    remediatedAt?: Date;
    remediatedBy?: number;
    acknowledgedAt?: Date;
    acknowledgedBy?: number;
    remediationEvidence?: Record<string, unknown>;
  },
) {
  return prisma.complianceViolation.update({
    where: { id: violationId },
    data: {
      ...data,
      remediationEvidence: data.remediationEvidence as Prisma.InputJsonValue,
    },
    include: { rule: true },
  });
}

// ============ Audit Management ============

export async function getAudits(
  configId: number,
  filters?: {
    status?: AuditStatus;
    framework?: string;
  },
) {
  return prisma.complianceAudit.findMany({
    where: {
      configId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.framework && { framework: filters.framework }),
    },
    orderBy: { scheduledDate: 'desc' },
  });
}

export async function createAudit(data: {
  configId: number;
  name: string;
  description?: string;
  framework: string;
  scope?: Record<string, unknown>;
  scheduledDate: Date;
  dueDate?: Date;
  leadAuditor?: string;
  auditTeam?: string[];
}) {
  return prisma.complianceAudit.create({
    data: {
      configId: data.configId,
      name: data.name,
      description: data.description,
      framework: data.framework,
      scope: data.scope as Prisma.InputJsonValue,
      scheduledDate: data.scheduledDate,
      dueDate: data.dueDate,
      leadAuditor: data.leadAuditor,
      auditTeam: data.auditTeam ?? [],
      status: AuditStatus.SCHEDULED,
    },
  });
}

export async function updateAudit(
  auditId: number,
  data: {
    status?: AuditStatus;
    findings?: Record<string, unknown>;
    recommendations?: Record<string, unknown>;
    overallScore?: number;
    passedControls?: number;
    failedControls?: number;
    totalControls?: number;
    startedAt?: Date;
    completedAt?: Date;
    remediationPlan?: Record<string, unknown>;
    reportUrl?: string;
  },
) {
  return prisma.complianceAudit.update({
    where: { id: auditId },
    data: {
      ...data,
      findings: data.findings as Prisma.InputJsonValue,
      recommendations: data.recommendations as Prisma.InputJsonValue,
      remediationPlan: data.remediationPlan as Prisma.InputJsonValue,
    },
  });
}

// ============ Evidence Management ============

export async function getEvidence(
  configId: number,
  filters?: {
    framework?: string;
    evidenceType?: string;
  },
) {
  return prisma.complianceEvidence.findMany({
    where: {
      configId,
      ...(filters?.framework && { framework: filters.framework }),
      ...(filters?.evidenceType && { evidenceType: filters.evidenceType }),
    },
    orderBy: { collectedAt: 'desc' },
  });
}

export async function createEvidence(data: {
  configId: number;
  title: string;
  description?: string;
  evidenceType: string;
  framework?: string;
  controlId?: string;
  fileUrl?: string;
  fileHash?: string;
  content?: string;
  collectedBy?: number;
  retentionDays?: number;
  expiresAt?: Date;
}) {
  return prisma.complianceEvidence.create({
    data: {
      configId: data.configId,
      title: data.title,
      description: data.description,
      evidenceType: data.evidenceType,
      framework: data.framework,
      controlId: data.controlId,
      fileUrl: data.fileUrl,
      fileHash: data.fileHash,
      content: data.content,
      collectedBy: data.collectedBy,
      retentionDays: data.retentionDays,
      expiresAt: data.expiresAt,
    },
  });
}

// ============ Risk Assessment Management ============

export async function getRiskAssessments(
  configId: number,
  filters?: {
    entityType?: string;
    riskLevel?: RiskLevel;
  },
) {
  return prisma.riskAssessment.findMany({
    where: {
      configId,
      ...(filters?.entityType && { entityType: filters.entityType }),
      ...(filters?.riskLevel && { riskLevel: filters.riskLevel }),
    },
    orderBy: { assessedAt: 'desc' },
  });
}

export async function createRiskAssessment(data: {
  configId: number;
  entityType: string;
  entityId: string;
  entityName?: string;
  overallRiskScore: number;
  riskLevel: RiskLevel;
  scoreBreakdown?: Record<string, unknown>;
  riskFactors?: Record<string, unknown>;
  mitigationPlan?: Record<string, unknown>;
  mitigationStatus?: string;
  nextAssessmentAt?: Date;
}) {
  return prisma.riskAssessment.create({
    data: {
      configId: data.configId,
      entityType: data.entityType,
      entityId: data.entityId,
      entityName: data.entityName,
      overallRiskScore: data.overallRiskScore,
      riskLevel: data.riskLevel,
      scoreBreakdown: data.scoreBreakdown as Prisma.InputJsonValue,
      riskFactors: data.riskFactors as Prisma.InputJsonValue,
      mitigationPlan: data.mitigationPlan as Prisma.InputJsonValue,
      mitigationStatus: data.mitigationStatus,
      nextAssessmentAt: data.nextAssessmentAt,
    },
  });
}

export async function updateRiskAssessment(
  assessmentId: number,
  data: {
    entityName?: string;
    overallRiskScore?: number;
    riskLevel?: RiskLevel;
    scoreBreakdown?: Record<string, unknown>;
    previousScore?: number;
    scoreTrend?: string;
    riskFactors?: Record<string, unknown>;
    mitigationPlan?: Record<string, unknown>;
    mitigationStatus?: string;
    nextAssessmentAt?: Date;
  },
) {
  return prisma.riskAssessment.update({
    where: { id: assessmentId },
    data: {
      ...data,
      scoreBreakdown: data.scoreBreakdown as Prisma.InputJsonValue,
      riskFactors: data.riskFactors as Prisma.InputJsonValue,
      mitigationPlan: data.mitigationPlan as Prisma.InputJsonValue,
    },
  });
}

// ============ Compliance Scan ============

export async function runComplianceScan(configId: number) {
  const config = await prisma.complianceMonitorConfig.findUnique({
    where: { id: configId },
    include: {
      complianceRules: {
        where: { isActive: true },
      },
    },
  });

  if (!config) {
    throw new Error('Configuration not found');
  }

  const results: Array<{
    ruleId: number;
    ruleName: string;
    status: 'compliant' | 'violation';
    details?: string;
  }> = [];

  // Process each active rule
  for (const rule of config.complianceRules) {
    // For now, simulate compliance check
    // In real implementation, this would execute the rule's check logic
    const isCompliant = Math.random() > 0.2; // 80% compliance rate for simulation

    results.push({
      ruleId: rule.id,
      ruleName: rule.name,
      status: isCompliant ? 'compliant' : 'violation',
      details: isCompliant
        ? 'All checks passed'
        : 'Compliance violation detected',
    });

    // Create violation for non-compliant rules
    if (!isCompliant) {
      await prisma.complianceViolation.create({
        data: {
          configId,
          ruleId: rule.id,
          title: `Violation: ${rule.name}`,
          description: 'Automated scan detected compliance violation',
          severity: rule.severity,
          status: ViolationStatus.OPEN,
        },
      });
    }
  }

  return {
    scanDate: new Date(),
    rulesChecked: results.length,
    compliantRules: results.filter((r) => r.status === 'compliant').length,
    violationsFound: results.filter((r) => r.status === 'violation').length,
    results,
  };
}

// ============ Analytics ============

export async function getComplianceAnalytics(
  configId: number,
  filters?: {
    startDate?: Date;
    endDate?: Date;
  },
) {
  const startDate =
    filters?.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const endDate = filters?.endDate || new Date();

  const [violations, audits, assessments, rules] = await Promise.all([
    prisma.complianceViolation.findMany({
      where: {
        configId,
        detectedAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.complianceAudit.findMany({
      where: {
        configId,
        scheduledDate: { gte: startDate, lte: endDate },
      },
    }),
    prisma.riskAssessment.findMany({
      where: {
        configId,
        assessedAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.complianceRule.findMany({
      where: { configId, isActive: true },
    }),
  ]);

  // Calculate metrics
  const totalViolations = violations.length;
  const openViolations = violations.filter(
    (v) => v.status === ViolationStatus.OPEN,
  ).length;
  const remediatedViolations = violations.filter(
    (v) => v.status === ViolationStatus.REMEDIATED,
  ).length;

  const violationsBySeverity = {
    critical: violations.filter((v) => v.severity === RiskLevel.CRITICAL)
      .length,
    high: violations.filter((v) => v.severity === RiskLevel.HIGH).length,
    medium: violations.filter((v) => v.severity === RiskLevel.MEDIUM).length,
    low: violations.filter((v) => v.severity === RiskLevel.LOW).length,
  };

  const avgRemediationTime = calculateAvgRemediationTime(violations);

  const completedAudits = audits.filter(
    (a) => a.status === AuditStatus.COMPLETED,
  ).length;
  const avgAuditScore =
    audits
      .filter((a) => a.overallScore !== null)
      .reduce((sum, a) => sum + (a.overallScore || 0), 0) /
    (audits.filter((a) => a.overallScore !== null).length || 1);

  const avgRiskScore =
    assessments.reduce((sum, a) => sum + a.overallRiskScore, 0) /
    (assessments.length || 1);
  const highRiskEntities = assessments.filter(
    (a) => a.riskLevel === RiskLevel.HIGH || a.riskLevel === RiskLevel.CRITICAL,
  ).length;

  return {
    period: { startDate, endDate },
    violations: {
      total: totalViolations,
      open: openViolations,
      remediated: remediatedViolations,
      bySeverity: violationsBySeverity,
      avgRemediationTimeHours: avgRemediationTime,
    },
    audits: {
      total: audits.length,
      completed: completedAudits,
      avgScore: Math.round(avgAuditScore),
    },
    riskAssessments: {
      total: assessments.length,
      avgScore: Math.round(avgRiskScore),
      highRiskEntities,
    },
    rules: {
      total: rules.length,
      active: rules.filter((r) => r.isActive).length,
    },
    complianceScore: calculateComplianceScore(
      violations,
      rules.length,
      avgAuditScore,
    ),
  };
}

function calculateAvgRemediationTime(
  violations: Array<{
    status: ViolationStatus;
    detectedAt: Date;
    remediatedAt: Date | null;
  }>,
): number {
  const remediatedViolations = violations.filter(
    (v) => v.status === ViolationStatus.REMEDIATED && v.remediatedAt,
  );

  if (remediatedViolations.length === 0) return 0;

  const totalTime = remediatedViolations.reduce((sum, v) => {
    const remediatedAt = v.remediatedAt
      ? new Date(v.remediatedAt).getTime()
      : Date.now();
    return (
      sum + (remediatedAt - new Date(v.detectedAt).getTime()) / (1000 * 60 * 60)
    );
  }, 0);

  return Math.round(totalTime / remediatedViolations.length);
}

function calculateComplianceScore(
  violations: Array<{ status: ViolationStatus; severity: RiskLevel }>,
  totalRules: number,
  avgAuditScore: number,
): number {
  if (totalRules === 0) return 100;

  // Weight open violations by severity
  const openViolations = violations.filter(
    (v) => v.status === ViolationStatus.OPEN,
  );
  const severityWeights = {
    [RiskLevel.CRITICAL]: 20,
    [RiskLevel.HIGH]: 10,
    [RiskLevel.MEDIUM]: 5,
    [RiskLevel.LOW]: 2,
  };

  const violationPenalty = openViolations.reduce(
    (sum, v) => sum + (severityWeights[v.severity] || 5),
    0,
  );

  // Base score from audit average
  const baseScore = avgAuditScore || 80;

  // Calculate final score
  const score = Math.max(0, Math.min(100, baseScore - violationPenalty));
  return Math.round(score);
}

// ============ Report Generation ============

export async function generateComplianceReport(data: {
  configId: number;
  reportType: string;
  title: string;
  periodStart: Date;
  periodEnd: Date;
  generatedBy: string;
}) {
  const analytics = await getComplianceAnalytics(data.configId, {
    startDate: data.periodStart,
    endDate: data.periodEnd,
  });

  const report = await prisma.complianceReport.create({
    data: {
      configId: data.configId,
      name: data.title,
      reportType: data.reportType,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      generatedBy: data.generatedBy,
      content: analytics as unknown as Prisma.InputJsonValue,
      status: 'COMPLETED',
    },
  });

  return report;
}

export async function getReports(
  configId: number,
  filters?: {
    reportType?: string;
    status?: string;
  },
) {
  return prisma.complianceReport.findMany({
    where: {
      configId,
      ...(filters?.reportType && { reportType: filters.reportType }),
      ...(filters?.status && { status: filters.status }),
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ============ Authorization Helpers ============

export async function getClientIdFromConfig(
  configId: number,
): Promise<number | null> {
  const config = await prisma.complianceMonitorConfig.findUnique({
    where: { id: configId },
    select: { clientId: true },
  });
  return config?.clientId ?? null;
}
