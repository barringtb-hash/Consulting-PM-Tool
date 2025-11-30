import { PrismaClient, ViolationStatus, AuditStatus, RiskLevel } from '@prisma/client';

const prisma = new PrismaClient();

// ============ Configuration Management ============

export async function getComplianceConfig(clientId: string) {
  return prisma.complianceMonitorConfig.findUnique({
    where: { clientId },
    include: {
      rules: true,
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
  clientId: string;
  industry: string;
  jurisdictions: string[];
  regulatoryFrameworks: string[];
  autoScanEnabled?: boolean;
  scanFrequency?: string;
  alertThresholds?: Record<string, any>;
  reportingSchedule?: Record<string, any>;
}) {
  return prisma.complianceMonitorConfig.create({
    data: {
      clientId: data.clientId,
      industry: data.industry,
      jurisdictions: data.jurisdictions,
      regulatoryFrameworks: data.regulatoryFrameworks,
      autoScanEnabled: data.autoScanEnabled ?? true,
      scanFrequency: data.scanFrequency ?? 'daily',
      alertThresholds: data.alertThresholds ?? {},
      reportingSchedule: data.reportingSchedule ?? {},
    },
  });
}

export async function updateComplianceConfig(
  configId: string,
  data: {
    industry?: string;
    jurisdictions?: string[];
    regulatoryFrameworks?: string[];
    autoScanEnabled?: boolean;
    scanFrequency?: string;
    alertThresholds?: Record<string, any>;
    reportingSchedule?: Record<string, any>;
  }
) {
  return prisma.complianceMonitorConfig.update({
    where: { id: configId },
    data,
  });
}

// ============ Compliance Rules Management ============

export async function getRules(configId: string, filters?: {
  framework?: string;
  category?: string;
  isActive?: boolean;
}) {
  return prisma.complianceRule.findMany({
    where: {
      configId,
      ...(filters?.framework && { framework: filters.framework }),
      ...(filters?.category && { category: filters.category }),
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createRule(data: {
  configId: string;
  ruleCode: string;
  name: string;
  description: string;
  framework: string;
  category: string;
  requirements: string[];
  checkFrequency?: string;
  severity?: string;
  automatedCheck?: boolean;
  checkQuery?: string;
}) {
  return prisma.complianceRule.create({
    data: {
      configId: data.configId,
      ruleCode: data.ruleCode,
      name: data.name,
      description: data.description,
      framework: data.framework,
      category: data.category,
      requirements: data.requirements,
      checkFrequency: data.checkFrequency ?? 'daily',
      severity: data.severity ?? 'medium',
      automatedCheck: data.automatedCheck ?? false,
      checkQuery: data.checkQuery,
    },
  });
}

export async function updateRule(
  ruleId: string,
  data: {
    name?: string;
    description?: string;
    requirements?: string[];
    checkFrequency?: string;
    severity?: string;
    automatedCheck?: boolean;
    checkQuery?: string;
    isActive?: boolean;
  }
) {
  return prisma.complianceRule.update({
    where: { id: ruleId },
    data,
  });
}

export async function deleteRule(ruleId: string) {
  return prisma.complianceRule.delete({
    where: { id: ruleId },
  });
}

// ============ Violations Management ============

export async function getViolations(configId: string, filters?: {
  status?: ViolationStatus;
  ruleId?: string;
  severity?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  return prisma.complianceViolation.findMany({
    where: {
      configId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.ruleId && { ruleId: filters.ruleId }),
      ...(filters?.severity && { severity: filters.severity }),
      ...(filters?.startDate && filters?.endDate && {
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
  configId: string;
  ruleId: string;
  description: string;
  severity: string;
  evidence?: Record<string, any>;
  affectedAreas: string[];
  remediationSteps?: string[];
  dueDate?: Date;
  assignedTo?: string;
}) {
  return prisma.complianceViolation.create({
    data: {
      configId: data.configId,
      ruleId: data.ruleId,
      description: data.description,
      severity: data.severity,
      evidence: data.evidence ?? {},
      affectedAreas: data.affectedAreas,
      remediationSteps: data.remediationSteps ?? [],
      dueDate: data.dueDate,
      assignedTo: data.assignedTo,
      status: ViolationStatus.OPEN,
      detectedAt: new Date(),
    },
    include: {
      rule: true,
    },
  });
}

export async function updateViolation(
  violationId: string,
  data: {
    status?: ViolationStatus;
    remediationSteps?: string[];
    remediationNotes?: string;
    assignedTo?: string;
    dueDate?: Date;
    resolvedAt?: Date;
    resolvedBy?: string;
  }
) {
  const updateData: any = { ...data };

  if (data.status === ViolationStatus.RESOLVED && !data.resolvedAt) {
    updateData.resolvedAt = new Date();
  }

  return prisma.complianceViolation.update({
    where: { id: violationId },
    data: updateData,
    include: {
      rule: true,
    },
  });
}

// ============ Audits Management ============

export async function getAudits(configId: string, filters?: {
  status?: AuditStatus;
  auditType?: string;
}) {
  return prisma.complianceAudit.findMany({
    where: {
      configId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.auditType && { auditType: filters.auditType }),
    },
    include: {
      evidence: true,
    },
    orderBy: { scheduledDate: 'desc' },
  });
}

export async function createAudit(data: {
  configId: string;
  auditType: string;
  title: string;
  description?: string;
  scope: string[];
  scheduledDate: Date;
  auditorName?: string;
  auditorEmail?: string;
  rulesInScope?: string[];
}) {
  return prisma.complianceAudit.create({
    data: {
      configId: data.configId,
      auditType: data.auditType,
      title: data.title,
      description: data.description,
      scope: data.scope,
      scheduledDate: data.scheduledDate,
      auditorName: data.auditorName,
      auditorEmail: data.auditorEmail,
      rulesInScope: data.rulesInScope ?? [],
      status: AuditStatus.SCHEDULED,
    },
  });
}

export async function updateAudit(
  auditId: string,
  data: {
    status?: AuditStatus;
    findings?: Record<string, any>;
    recommendations?: string[];
    completedDate?: Date;
    nextAuditDate?: Date;
    auditorName?: string;
    auditorEmail?: string;
  }
) {
  return prisma.complianceAudit.update({
    where: { id: auditId },
    data,
    include: {
      evidence: true,
    },
  });
}

// ============ Evidence Management ============

export async function getEvidence(auditId: string) {
  return prisma.complianceEvidence.findMany({
    where: { auditId },
    orderBy: { uploadedAt: 'desc' },
  });
}

export async function createEvidence(data: {
  auditId: string;
  title: string;
  description?: string;
  evidenceType: string;
  fileUrl?: string;
  content?: string;
  uploadedBy: string;
  tags?: string[];
}) {
  return prisma.complianceEvidence.create({
    data: {
      auditId: data.auditId,
      title: data.title,
      description: data.description,
      evidenceType: data.evidenceType,
      fileUrl: data.fileUrl,
      content: data.content,
      uploadedBy: data.uploadedBy,
      tags: data.tags ?? [],
      uploadedAt: new Date(),
    },
  });
}

export async function deleteEvidence(evidenceId: string) {
  return prisma.complianceEvidence.delete({
    where: { id: evidenceId },
  });
}

// ============ Risk Assessments ============

export async function getRiskAssessments(configId: string, filters?: {
  riskLevel?: RiskLevel;
  category?: string;
  status?: string;
}) {
  return prisma.riskAssessment.findMany({
    where: {
      configId,
      ...(filters?.riskLevel && { riskLevel: filters.riskLevel }),
      ...(filters?.category && { category: filters.category }),
      ...(filters?.status && { status: filters.status }),
    },
    orderBy: { assessmentDate: 'desc' },
  });
}

export async function createRiskAssessment(data: {
  configId: string;
  title: string;
  description: string;
  category: string;
  likelihood: number;
  impact: number;
  mitigationStrategies?: string[];
  controlsInPlace?: string[];
  reviewDate?: Date;
}) {
  // Calculate risk level based on likelihood and impact
  const riskScore = data.likelihood * data.impact;
  let riskLevel: RiskLevel;

  if (riskScore <= 4) {
    riskLevel = RiskLevel.LOW;
  } else if (riskScore <= 9) {
    riskLevel = RiskLevel.MEDIUM;
  } else if (riskScore <= 16) {
    riskLevel = RiskLevel.HIGH;
  } else {
    riskLevel = RiskLevel.CRITICAL;
  }

  return prisma.riskAssessment.create({
    data: {
      configId: data.configId,
      title: data.title,
      description: data.description,
      category: data.category,
      likelihood: data.likelihood,
      impact: data.impact,
      riskScore,
      riskLevel,
      mitigationStrategies: data.mitigationStrategies ?? [],
      controlsInPlace: data.controlsInPlace ?? [],
      reviewDate: data.reviewDate,
      status: 'active',
      assessmentDate: new Date(),
    },
  });
}

export async function updateRiskAssessment(
  assessmentId: string,
  data: {
    title?: string;
    description?: string;
    likelihood?: number;
    impact?: number;
    mitigationStrategies?: string[];
    controlsInPlace?: string[];
    status?: string;
    reviewDate?: Date;
  }
) {
  // Recalculate risk if likelihood or impact changed
  let updateData: any = { ...data };

  if (data.likelihood !== undefined || data.impact !== undefined) {
    const existing = await prisma.riskAssessment.findUnique({
      where: { id: assessmentId },
    });

    if (existing) {
      const likelihood = data.likelihood ?? existing.likelihood;
      const impact = data.impact ?? existing.impact;
      const riskScore = likelihood * impact;

      let riskLevel: RiskLevel;
      if (riskScore <= 4) {
        riskLevel = RiskLevel.LOW;
      } else if (riskScore <= 9) {
        riskLevel = RiskLevel.MEDIUM;
      } else if (riskScore <= 16) {
        riskLevel = RiskLevel.HIGH;
      } else {
        riskLevel = RiskLevel.CRITICAL;
      }

      updateData.riskScore = riskScore;
      updateData.riskLevel = riskLevel;
    }
  }

  return prisma.riskAssessment.update({
    where: { id: assessmentId },
    data: updateData,
  });
}

// ============ Compliance Reports ============

export async function getReports(configId: string, filters?: {
  reportType?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  return prisma.complianceReport.findMany({
    where: {
      configId,
      ...(filters?.reportType && { reportType: filters.reportType }),
      ...(filters?.startDate && filters?.endDate && {
        periodStart: { gte: filters.startDate },
        periodEnd: { lte: filters.endDate },
      }),
    },
    orderBy: { generatedAt: 'desc' },
  });
}

export async function generateComplianceReport(data: {
  configId: string;
  reportType: string;
  title: string;
  periodStart: Date;
  periodEnd: Date;
  generatedBy: string;
}) {
  // Gather metrics for the report
  const [violations, audits, riskAssessments, rules] = await Promise.all([
    prisma.complianceViolation.findMany({
      where: {
        configId: data.configId,
        detectedAt: {
          gte: data.periodStart,
          lte: data.periodEnd,
        },
      },
    }),
    prisma.complianceAudit.findMany({
      where: {
        configId: data.configId,
        scheduledDate: {
          gte: data.periodStart,
          lte: data.periodEnd,
        },
      },
    }),
    prisma.riskAssessment.findMany({
      where: { configId: data.configId },
    }),
    prisma.complianceRule.findMany({
      where: { configId: data.configId, isActive: true },
    }),
  ]);

  // Calculate compliance score
  const totalRules = rules.length;
  const violatedRuleIds = new Set(violations.map(v => v.ruleId));
  const compliantRules = totalRules - violatedRuleIds.size;
  const complianceScore = totalRules > 0 ? (compliantRules / totalRules) * 100 : 100;

  // Build summary
  const summary = {
    totalRules,
    compliantRules,
    violatedRules: violatedRuleIds.size,
    complianceScore: Math.round(complianceScore * 100) / 100,
    totalViolations: violations.length,
    openViolations: violations.filter(v => v.status === ViolationStatus.OPEN).length,
    resolvedViolations: violations.filter(v => v.status === ViolationStatus.RESOLVED).length,
    totalAudits: audits.length,
    completedAudits: audits.filter(a => a.status === AuditStatus.COMPLETED).length,
    highRisks: riskAssessments.filter(r => r.riskLevel === RiskLevel.HIGH || r.riskLevel === RiskLevel.CRITICAL).length,
  };

  // Build metrics by category
  const violationsByCategory: Record<string, number> = {};
  for (const violation of violations) {
    const category = violation.severity || 'unknown';
    violationsByCategory[category] = (violationsByCategory[category] || 0) + 1;
  }

  const metrics = {
    violationsBySeverity: violationsByCategory,
    risksByLevel: {
      low: riskAssessments.filter(r => r.riskLevel === RiskLevel.LOW).length,
      medium: riskAssessments.filter(r => r.riskLevel === RiskLevel.MEDIUM).length,
      high: riskAssessments.filter(r => r.riskLevel === RiskLevel.HIGH).length,
      critical: riskAssessments.filter(r => r.riskLevel === RiskLevel.CRITICAL).length,
    },
    auditsByStatus: {
      scheduled: audits.filter(a => a.status === AuditStatus.SCHEDULED).length,
      inProgress: audits.filter(a => a.status === AuditStatus.IN_PROGRESS).length,
      completed: audits.filter(a => a.status === AuditStatus.COMPLETED).length,
    },
  };

  return prisma.complianceReport.create({
    data: {
      configId: data.configId,
      reportType: data.reportType,
      title: data.title,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      complianceScore,
      summary,
      metrics,
      generatedBy: data.generatedBy,
      generatedAt: new Date(),
    },
  });
}

// ============ AI-Powered Compliance Scanning ============

export async function runComplianceScan(configId: string) {
  const config = await prisma.complianceMonitorConfig.findUnique({
    where: { id: configId },
    include: {
      rules: {
        where: { isActive: true, automatedCheck: true },
      },
    },
  });

  if (!config) {
    throw new Error('Compliance configuration not found');
  }

  const scanResults: any[] = [];
  const newViolations: any[] = [];

  // Simulate automated compliance checks
  for (const rule of config.rules) {
    const checkResult = await performAutomatedCheck(rule);
    scanResults.push({
      ruleId: rule.id,
      ruleName: rule.name,
      status: checkResult.compliant ? 'compliant' : 'violation',
      details: checkResult.details,
    });

    if (!checkResult.compliant) {
      // Create a new violation
      const violation = await createViolation({
        configId: config.id,
        ruleId: rule.id,
        description: checkResult.details || `Automated check failed for rule: ${rule.name}`,
        severity: rule.severity,
        affectedAreas: checkResult.affectedAreas || [],
        remediationSteps: rule.requirements,
      });
      newViolations.push(violation);
    }
  }

  // Update last scan timestamp
  await prisma.complianceMonitorConfig.update({
    where: { id: configId },
    data: { lastScanAt: new Date() },
  });

  return {
    scanTime: new Date(),
    rulesChecked: config.rules.length,
    compliant: scanResults.filter(r => r.status === 'compliant').length,
    violations: scanResults.filter(r => r.status === 'violation').length,
    results: scanResults,
    newViolations,
  };
}

async function performAutomatedCheck(rule: any): Promise<{
  compliant: boolean;
  details?: string;
  affectedAreas?: string[];
}> {
  // Simulate automated compliance check
  // In a real implementation, this would execute the rule's checkQuery
  // against relevant data sources

  // For demo purposes, randomly determine compliance with 80% pass rate
  const isCompliant = Math.random() > 0.2;

  return {
    compliant: isCompliant,
    details: isCompliant
      ? `Rule ${rule.ruleCode} check passed`
      : `Rule ${rule.ruleCode} check failed - requires attention`,
    affectedAreas: isCompliant ? [] : ['System Configuration'],
  };
}

// ============ Analytics ============

export async function getComplianceAnalytics(configId: string, filters?: {
  startDate?: Date;
  endDate?: Date;
}) {
  const startDate = filters?.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const endDate = filters?.endDate || new Date();

  // Get historical analytics data
  const analytics = await prisma.complianceAnalytics.findMany({
    where: {
      configId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: 'asc' },
  });

  // Get current state
  const [violations, rules, riskAssessments] = await Promise.all([
    prisma.complianceViolation.findMany({
      where: { configId },
    }),
    prisma.complianceRule.findMany({
      where: { configId, isActive: true },
    }),
    prisma.riskAssessment.findMany({
      where: { configId },
    }),
  ]);

  // Calculate current metrics
  const totalRules = rules.length;
  const violatedRuleIds = new Set(violations.filter(v => v.status === ViolationStatus.OPEN).map(v => v.ruleId));
  const currentComplianceScore = totalRules > 0
    ? ((totalRules - violatedRuleIds.size) / totalRules) * 100
    : 100;

  return {
    historicalData: analytics,
    currentMetrics: {
      complianceScore: Math.round(currentComplianceScore * 100) / 100,
      totalRules,
      activeViolations: violations.filter(v => v.status === ViolationStatus.OPEN).length,
      resolvedViolations: violations.filter(v => v.status === ViolationStatus.RESOLVED).length,
      highRiskCount: riskAssessments.filter(r => r.riskLevel === RiskLevel.HIGH || r.riskLevel === RiskLevel.CRITICAL).length,
      averageResolutionTime: calculateAverageResolutionTime(violations),
    },
    trends: calculateTrends(analytics),
  };
}

function calculateAverageResolutionTime(violations: any[]): number | null {
  const resolvedViolations = violations.filter(v => v.resolvedAt && v.detectedAt);

  if (resolvedViolations.length === 0) return null;

  const totalTime = resolvedViolations.reduce((sum, v) => {
    const detectedAt = new Date(v.detectedAt).getTime();
    const resolvedAt = new Date(v.resolvedAt).getTime();
    return sum + (resolvedAt - detectedAt);
  }, 0);

  // Return average in hours
  return Math.round(totalTime / resolvedViolations.length / (1000 * 60 * 60));
}

function calculateTrends(analytics: any[]): Record<string, any> {
  if (analytics.length < 2) {
    return { complianceScore: 'stable', violations: 'stable', risks: 'stable' };
  }

  const recent = analytics.slice(-7);
  const previous = analytics.slice(-14, -7);

  if (recent.length === 0 || previous.length === 0) {
    return { complianceScore: 'stable', violations: 'stable', risks: 'stable' };
  }

  const recentAvgScore = recent.reduce((sum, a) => sum + (a.complianceScore || 0), 0) / recent.length;
  const previousAvgScore = previous.reduce((sum, a) => sum + (a.complianceScore || 0), 0) / previous.length;

  const recentAvgViolations = recent.reduce((sum, a) => sum + (a.activeViolations || 0), 0) / recent.length;
  const previousAvgViolations = previous.reduce((sum, a) => sum + (a.activeViolations || 0), 0) / previous.length;

  return {
    complianceScore: recentAvgScore > previousAvgScore ? 'improving' : recentAvgScore < previousAvgScore ? 'declining' : 'stable',
    violations: recentAvgViolations < previousAvgViolations ? 'improving' : recentAvgViolations > previousAvgViolations ? 'worsening' : 'stable',
  };
}

export async function recordDailyAnalytics(configId: string) {
  const [violations, rules, riskAssessments] = await Promise.all([
    prisma.complianceViolation.findMany({
      where: { configId },
    }),
    prisma.complianceRule.findMany({
      where: { configId, isActive: true },
    }),
    prisma.riskAssessment.findMany({
      where: { configId },
    }),
  ]);

  const totalRules = rules.length;
  const activeViolations = violations.filter(v => v.status === ViolationStatus.OPEN);
  const violatedRuleIds = new Set(activeViolations.map(v => v.ruleId));
  const complianceScore = totalRules > 0
    ? ((totalRules - violatedRuleIds.size) / totalRules) * 100
    : 100;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.complianceAnalytics.upsert({
    where: {
      configId_date: {
        configId,
        date: today,
      },
    },
    update: {
      complianceScore,
      activeViolations: activeViolations.length,
      resolvedViolations: violations.filter(v => v.status === ViolationStatus.RESOLVED).length,
      criticalRisks: riskAssessments.filter(r => r.riskLevel === RiskLevel.CRITICAL).length,
      highRisks: riskAssessments.filter(r => r.riskLevel === RiskLevel.HIGH).length,
      mediumRisks: riskAssessments.filter(r => r.riskLevel === RiskLevel.MEDIUM).length,
      lowRisks: riskAssessments.filter(r => r.riskLevel === RiskLevel.LOW).length,
      rulesChecked: totalRules,
    },
    create: {
      configId,
      date: today,
      complianceScore,
      activeViolations: activeViolations.length,
      resolvedViolations: violations.filter(v => v.status === ViolationStatus.RESOLVED).length,
      criticalRisks: riskAssessments.filter(r => r.riskLevel === RiskLevel.CRITICAL).length,
      highRisks: riskAssessments.filter(r => r.riskLevel === RiskLevel.HIGH).length,
      mediumRisks: riskAssessments.filter(r => r.riskLevel === RiskLevel.MEDIUM).length,
      lowRisks: riskAssessments.filter(r => r.riskLevel === RiskLevel.LOW).length,
      rulesChecked: totalRules,
    },
  });
}

// ============ Authorization Helpers ============

export async function getClientIdFromComplianceConfig(configId: string): Promise<string | null> {
  const config = await prisma.complianceMonitorConfig.findUnique({
    where: { id: configId },
    select: { clientId: true },
  });
  return config?.clientId ?? null;
}

export async function getClientIdFromRule(ruleId: string): Promise<string | null> {
  const rule = await prisma.complianceRule.findUnique({
    where: { id: ruleId },
    include: { config: { select: { clientId: true } } },
  });
  return rule?.config?.clientId ?? null;
}

export async function getClientIdFromViolation(violationId: string): Promise<string | null> {
  const violation = await prisma.complianceViolation.findUnique({
    where: { id: violationId },
    include: { config: { select: { clientId: true } } },
  });
  return violation?.config?.clientId ?? null;
}

export async function getClientIdFromAudit(auditId: string): Promise<string | null> {
  const audit = await prisma.complianceAudit.findUnique({
    where: { id: auditId },
    include: { config: { select: { clientId: true } } },
  });
  return audit?.config?.clientId ?? null;
}

export async function getClientIdFromRiskAssessment(assessmentId: string): Promise<string | null> {
  const assessment = await prisma.riskAssessment.findUnique({
    where: { id: assessmentId },
    include: { config: { select: { clientId: true } } },
  });
  return assessment?.config?.clientId ?? null;
}
