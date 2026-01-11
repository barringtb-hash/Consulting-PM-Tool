/**
 * Document Template Types
 * Type definitions for project document templates
 */

import type {
  ProjectDocumentType,
  ProjectDocumentCategory,
} from '@prisma/client';

// ============================================================================
// Template Definition Types
// ============================================================================

export interface DocumentTemplate {
  type: ProjectDocumentType;
  name: string;
  description: string;
  category: ProjectDocumentCategory;
  defaultContent: Record<string, unknown>;
}

// ============================================================================
// Content Type Definitions for Each Document Type
// ============================================================================

// 1. Project Plan
export interface ProjectPlanContent {
  overview: {
    projectName: string;
    projectManager: string;
    startDate: string;
    endDate: string;
    status: 'Not Started' | 'In Progress' | 'Completed' | 'On Hold';
  };
  scope: {
    inScope: string[];
    outOfScope: string[];
    assumptions: string[];
    constraints: string[];
  };
  phases: Array<{
    name: string;
    startDate: string;
    endDate: string;
    deliverables: string[];
    status: string;
  }>;
  milestones: Array<{
    name: string;
    targetDate: string;
    status: 'Pending' | 'Completed' | 'At Risk';
    notes: string;
  }>;
  resources: Array<{
    name: string;
    role: string;
    allocation: string;
  }>;
  dependencies: string[];
  approvals: Array<{
    name: string;
    role: string;
    date: string;
    signature: string;
  }>;
}

// 2. Status Report
export interface StatusReportContent {
  reportDate: string;
  reportingPeriod: { start: string; end: string };
  overallStatus: 'Green' | 'Yellow' | 'Red';
  executiveSummary: string;
  accomplishments: string[];
  inProgress: Array<{
    item: string;
    percentComplete: number;
    owner: string;
  }>;
  upcoming: string[];
  scheduleStatus: {
    status: 'On Track' | 'At Risk' | 'Delayed';
    notes: string;
  };
  budgetStatus: {
    planned: number;
    actual: number;
    variance: number;
    notes: string;
  };
  risksAndIssues: Array<{
    type: 'Risk' | 'Issue';
    description: string;
    severity: 'High' | 'Medium' | 'Low';
    mitigation: string;
    status: string;
  }>;
  pendingDecisions: Array<{
    decision: string;
    owner: string;
    dueDate: string;
  }>;
  nextSteps: string[];
}

// 3. Risk Register
export interface RiskRegisterContent {
  risks: Array<{
    id: string;
    title: string;
    description: string;
    category:
      | 'Technical'
      | 'Schedule'
      | 'Budget'
      | 'Resource'
      | 'External'
      | 'Other';
    likelihood: 1 | 2 | 3 | 4 | 5;
    impact: 1 | 2 | 3 | 4 | 5;
    riskScore: number;
    status: 'Open' | 'Mitigating' | 'Closed' | 'Occurred';
    owner: string;
    mitigationStrategy: string;
    contingencyPlan: string;
    triggerEvents: string[];
    dateIdentified: string;
    lastUpdated: string;
  }>;
  riskMatrix: {
    totalRisks: number;
    highRisks: number;
    mediumRisks: number;
    lowRisks: number;
  };
}

// 4. Issue Log
export interface IssueLogContent {
  issues: Array<{
    id: string;
    title: string;
    description: string;
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
    owner: string;
    dateIdentified: string;
    targetResolutionDate: string;
    actualResolutionDate?: string;
    rootCause: string;
    resolutionAction: string;
    impactIfNotResolved: string;
    relatedRiskId?: string;
  }>;
  summary: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
  };
}

// 5. Meeting Notes
export interface MeetingNotesContent {
  meetingInfo: {
    title: string;
    date: string;
    time: string;
    location: string;
    facilitator: string;
    attendees: string[];
    absentees: string[];
  };
  agenda: string[];
  discussionPoints: Array<{
    topic: string;
    discussion: string;
    decision?: string;
  }>;
  decisions: Array<{
    decision: string;
    rationale: string;
    approvedBy: string;
  }>;
  actionItems: Array<{
    action: string;
    owner: string;
    dueDate: string;
    status: 'Pending' | 'In Progress' | 'Completed';
  }>;
  parkingLot: string[];
  nextMeeting: {
    date: string;
    time: string;
    proposedAgenda: string[];
  };
}

// 6. Lessons Learned
export interface LessonsLearnedContent {
  projectSummary: {
    projectName: string;
    completionDate: string;
    projectManager: string;
    teamMembers: string[];
  };
  successAreas: Array<{
    area: string;
    whatWorked: string;
    recommendations: string;
  }>;
  challengeAreas: Array<{
    area: string;
    whatHappened: string;
    rootCause: string;
    recommendation: string;
    implementationPlan: string;
  }>;
  processImprovements: Array<{
    currentProcess: string;
    suggestedImprovement: string;
    expectedBenefit: string;
    priority: 'High' | 'Medium' | 'Low';
  }>;
  toolsAndTechniques: {
    effective: string[];
    ineffective: string[];
    recommended: string[];
  };
  teamFeedback: string[];
  overallRecommendations: string[];
}

// 7. Communication Plan
export interface CommunicationPlanContent {
  stakeholders: Array<{
    name: string;
    role: string;
    organization: string;
    communicationNeeds: string;
    preferredMethod: 'Email' | 'Phone' | 'Meeting' | 'Slack' | 'Other';
    frequency: 'Daily' | 'Weekly' | 'Bi-weekly' | 'Monthly' | 'As Needed';
    contactInfo: string;
  }>;
  communicationMatrix: Array<{
    communicationType: string;
    audience: string[];
    frequency: string;
    owner: string;
    deliveryMethod: string;
    format: string;
  }>;
  escalationProcedures: Array<{
    level: number;
    trigger: string;
    escalateTo: string;
    responseTime: string;
    contactMethod: string;
  }>;
  meetingSchedule: Array<{
    meetingType: string;
    frequency: string;
    participants: string[];
    dayTime: string;
    agenda: string[];
  }>;
  responseTimeExpectations: {
    urgent: string;
    high: string;
    normal: string;
    low: string;
  };
  documentSharing: {
    platform: string;
    accessInstructions: string;
    folderStructure: string[];
  };
}

// 8. Kickoff Agenda
export interface KickoffAgendaContent {
  meetingDetails: {
    date: string;
    time: string;
    duration: string;
    location: string;
    facilitator: string;
  };
  attendees: Array<{
    name: string;
    role: string;
    organization: string;
  }>;
  agendaItems: Array<{
    time: string;
    duration: string;
    topic: string;
    presenter: string;
    objectives: string[];
    materials: string[];
  }>;
  preRequisites: string[];
  expectedOutcomes: string[];
  postMeetingActions: string[];
}

// 9. Change Request
export interface ChangeRequestContent {
  requestInfo: {
    requestId: string;
    requestDate: string;
    requestor: string;
    priority: 'Critical' | 'High' | 'Medium' | 'Low';
    status:
      | 'Submitted'
      | 'Under Review'
      | 'Approved'
      | 'Rejected'
      | 'Implemented';
  };
  currentState: string;
  proposedChange: string;
  justification: string;
  impactAnalysis: {
    scopeImpact: string;
    scheduleImpact: string;
    costImpact: {
      additionalCost: number;
      description: string;
    };
    resourceImpact: string;
    riskImplications: string[];
    qualityImpact: string;
  };
  alternatives: Array<{
    option: string;
    pros: string[];
    cons: string[];
  }>;
  recommendation: string;
  approvals: Array<{
    approver: string;
    role: string;
    decision: 'Approved' | 'Rejected' | 'Pending';
    date: string;
    conditions: string;
    signature: string;
  }>;
  implementationPlan: string;
}

// 10. Project Closure
export interface ProjectClosureContent {
  projectSummary: {
    projectName: string;
    startDate: string;
    endDate: string;
    projectManager: string;
    client: string;
  };
  objectives: Array<{
    objective: string;
    achieved: 'Yes' | 'Partial' | 'No';
    notes: string;
  }>;
  deliverables: Array<{
    deliverable: string;
    status: 'Delivered' | 'Partially Delivered' | 'Not Delivered';
    acceptanceDate: string;
    signedOffBy: string;
    notes: string;
  }>;
  budgetSummary: {
    plannedBudget: number;
    actualSpend: number;
    variance: number;
    explanation: string;
  };
  scheduleSummary: {
    plannedEndDate: string;
    actualEndDate: string;
    variance: string;
    explanation: string;
  };
  outstandingItems: Array<{
    item: string;
    owner: string;
    targetDate: string;
    status: string;
  }>;
  handoffItems: Array<{
    item: string;
    handedToWhom: string;
    handoffDate: string;
    verified: boolean;
  }>;
  clientSatisfaction: {
    overallRating: 1 | 2 | 3 | 4 | 5;
    feedback: string;
    testimonialObtained: boolean;
  };
  teamAcknowledgments: string[];
  signoffs: Array<{
    name: string;
    role: string;
    date: string;
    signature: string;
  }>;
}

// 11. Knowledge Transfer
export interface KnowledgeTransferContent {
  systemOverview: {
    systemName: string;
    purpose: string;
    keyComponents: string[];
    architectureDiagram: string;
  };
  technicalDocumentation: Array<{
    component: string;
    description: string;
    location: string;
    lastUpdated: string;
  }>;
  accessCredentials: Array<{
    system: string;
    accessType: string;
    owner: string;
    transferredTo: string;
    transferDate: string;
  }>;
  processes: Array<{
    processName: string;
    frequency: string;
    steps: string[];
    owner: string;
    documentation: string;
  }>;
  maintenanceTasks: Array<{
    task: string;
    frequency: string;
    procedure: string;
    owner: string;
  }>;
  troubleshooting: Array<{
    issue: string;
    symptoms: string[];
    resolution: string;
    escalationPath: string;
  }>;
  vendorContacts: Array<{
    vendor: string;
    product: string;
    contactName: string;
    contactInfo: string;
    supportHours: string;
  }>;
  trainingCompleted: Array<{
    topic: string;
    trainees: string[];
    date: string;
    materials: string;
  }>;
}

// 12. AI Feasibility Assessment
export interface AIFeasibilityContent {
  executiveSummary: {
    recommendation: 'Proceed' | 'Proceed with Caution' | 'Do Not Proceed';
    confidence: 'High' | 'Medium' | 'Low';
    summary: string;
  };
  problemDefinition: {
    businessProblem: string;
    objectives: string[];
    successMetrics: Array<{
      metric: string;
      target: string;
      measurement: string;
    }>;
    currentApproach: string;
    painPoints: string[];
  };
  dataAssessment: {
    dataAvailability: 'Excellent' | 'Good' | 'Fair' | 'Poor';
    dataSources: Array<{
      source: string;
      type: string;
      volume: string;
      quality: string;
      accessibility: string;
    }>;
    dataGaps: string[];
    dataGovernance: string;
    legalCompliance: string[];
    score: number;
  };
  technicalFeasibility: {
    aiApproach: string;
    algorithmOptions: string[];
    infrastructureRequirements: string[];
    integrationComplexity: 'Low' | 'Medium' | 'High';
    scalabilityConsiderations: string;
    technicalRisks: string[];
    score: number;
  };
  organizationalFeasibility: {
    teamExpertise: string;
    changeManagement: string;
    stakeholderAlignment: 'Strong' | 'Moderate' | 'Weak';
    trainingRequirements: string[];
    culturalReadiness: string;
    score: number;
  };
  financialFeasibility: {
    estimatedCost: {
      development: number;
      infrastructure: number;
      maintenance: number;
      total: number;
    };
    expectedBenefits: Array<{
      benefit: string;
      annualValue: number;
    }>;
    roi: string;
    paybackPeriod: string;
    score: number;
  };
  overallScore: number;
  recommendations: string[];
  nextSteps: string[];
}

// 13. AI System Limitations
export interface AILimitationsContent {
  systemOverview: {
    systemName: string;
    purpose: string;
    aiTechnologies: string[];
  };
  capabilities: Array<{
    capability: string;
    description: string;
    confidenceLevel: string;
  }>;
  limitations: Array<{
    limitation: string;
    description: string;
    workaround: string;
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
  }>;
  outOfScopeUseCases: string[];
  edgeCases: Array<{
    scenario: string;
    expectedBehavior: string;
    userGuidance: string;
  }>;
  accuracyBoundaries: {
    overallAccuracy: string;
    confidenceThresholds: Array<{
      threshold: string;
      meaning: string;
      action: string;
    }>;
    performanceByCategory: Array<{
      category: string;
      accuracy: string;
      notes: string;
    }>;
  };
  dataRequirements: {
    inputRequirements: string[];
    dataQualityNeeds: string[];
    volumeConsiderations: string;
  };
  environmentalConstraints: string[];
  failureModes: Array<{
    mode: string;
    trigger: string;
    impact: string;
    detection: string;
    recovery: string;
  }>;
  humanOversightRequirements: {
    whenRequired: string[];
    reviewProcess: string;
    escalationCriteria: string[];
  };
  userResponsibilities: string[];
  disclaimers: string[];
}

// 14. Monitoring & Maintenance Plan
export interface MonitoringMaintenanceContent {
  systemInfo: {
    systemName: string;
    deploymentDate: string;
    owner: string;
    supportTeam: string[];
  };
  performanceMonitoring: {
    metrics: Array<{
      metric: string;
      target: string;
      alertThreshold: string;
      measurementMethod: string;
      frequency: string;
    }>;
    dashboardLocation: string;
    monitoringTools: string[];
  };
  modelDriftDetection: {
    driftMetrics: string[];
    monitoringFrequency: string;
    alertThresholds: Array<{
      metric: string;
      warningLevel: string;
      criticalLevel: string;
    }>;
    responseProtocol: string;
  };
  retrainingPlan: {
    triggers: string[];
    schedule: string;
    dataRequirements: string[];
    validationProcess: string;
    rollbackProcedure: string;
  };
  incidentResponse: {
    severityLevels: Array<{
      level: string;
      criteria: string;
      responseTime: string;
      escalation: string;
    }>;
    incidentProcedure: string[];
    communicationPlan: string;
    postMortemProcess: string;
  };
  maintenanceSchedule: Array<{
    task: string;
    frequency: string;
    owner: string;
    procedure: string;
    lastCompleted: string;
    nextDue: string;
  }>;
  backupRecovery: {
    backupFrequency: string;
    backupLocation: string;
    retentionPeriod: string;
    recoveryProcedure: string;
    rto: string;
    rpo: string;
  };
  updateProcedures: {
    modelUpdates: string;
    systemUpdates: string;
    testingRequirements: string[];
    rollbackPlan: string;
  };
  feedbackMechanisms: {
    userFeedbackChannels: string[];
    feedbackReviewProcess: string;
    incorporationCriteria: string;
  };
}

// 15. Data Requirements
export interface DataRequirementsContent {
  projectContext: {
    projectName: string;
    dataUsePurpose: string;
    aiApplicationType: string;
  };
  dataTypes: Array<{
    dataType: string;
    description: string;
    format: string;
    volume: string;
    priority: 'Required' | 'Preferred' | 'Nice to Have';
  }>;
  qualityStandards: {
    completeness: string;
    accuracy: string;
    consistency: string;
    timeliness: string;
    validationRules: string[];
  };
  formatSpecifications: {
    fileFormats: string[];
    encoding: string;
    structureRequirements: string[];
    namingConventions: string;
  };
  accessMethods: {
    deliveryMethod: 'API' | 'File Transfer' | 'Database Access' | 'Other';
    accessDetails: string;
    authentication: string;
    refreshFrequency: string;
  };
  securityRequirements: {
    sensitivityLevel: 'Public' | 'Internal' | 'Confidential' | 'Restricted';
    encryptionRequirements: string;
    accessControls: string;
    complianceRequirements: string[];
  };
  timeline: {
    initialDataDueDate: string;
    ongoingDataSchedule: string;
    milestones: Array<{
      milestone: string;
      date: string;
      dataNeeded: string;
    }>;
  };
  clientResponsibilities: string[];
  dataProvisionChecklist: Array<{
    item: string;
    status: 'Pending' | 'In Progress' | 'Received' | 'Validated';
    notes: string;
  }>;
  consequencesOfDelay: string;
}

// 16. Deliverable Review Checklist
export interface DeliverableChecklistContent {
  deliverableInfo: {
    deliverableName: string;
    projectName: string;
    version: string;
    author: string;
    reviewDate: string;
    reviewer: string;
  };
  generalQuality: Array<{
    item: string;
    checked: boolean;
    notes: string;
  }>;
  technicalAccuracy: Array<{
    item: string;
    checked: boolean;
    notes: string;
  }>;
  clientRequirements: Array<{
    requirement: string;
    met: boolean;
    notes: string;
  }>;
  formatting: Array<{
    item: string;
    checked: boolean;
    notes: string;
  }>;
  aiSpecific: Array<{
    item: string;
    checked: boolean;
    notes: string;
  }>;
  overallAssessment: {
    ready: boolean;
    requiredChanges: string[];
    minorSuggestions: string[];
    reviewerApproval: boolean;
    approvalDate: string;
    approverSignature: string;
  };
}

// Union type for all content types
export type ProjectDocumentContent =
  | ProjectPlanContent
  | StatusReportContent
  | RiskRegisterContent
  | IssueLogContent
  | MeetingNotesContent
  | LessonsLearnedContent
  | CommunicationPlanContent
  | KickoffAgendaContent
  | ChangeRequestContent
  | ProjectClosureContent
  | KnowledgeTransferContent
  | AIFeasibilityContent
  | AILimitationsContent
  | MonitoringMaintenanceContent
  | DataRequirementsContent
  | DeliverableChecklistContent;
