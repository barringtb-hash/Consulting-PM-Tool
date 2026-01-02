/**
 * AI Project-Specific Document Templates
 * Templates for AI/ML project documentation
 */

import { ProjectDocumentType, ProjectDocumentCategory } from '@prisma/client';
import type { DocumentTemplate } from './types';

// 12. AI Feasibility Assessment Template
export const aiFeasibilityTemplate: DocumentTemplate = {
  type: ProjectDocumentType.AI_FEASIBILITY,
  name: 'AI Feasibility Assessment',
  description:
    'Evaluate AI project viability across problem, data, technical, organizational, and financial dimensions',
  category: ProjectDocumentCategory.AI_SPECIFIC,
  defaultContent: {
    executiveSummary: {
      recommendation: 'Proceed with Caution',
      confidence: 'Medium',
      summary: '',
    },
    problemDefinition: {
      businessProblem: '',
      objectives: [],
      successMetrics: [],
      currentApproach: '',
      painPoints: [],
    },
    dataAssessment: {
      dataAvailability: 'Fair',
      dataSources: [],
      dataGaps: [],
      dataGovernance: '',
      legalCompliance: [],
      score: 5,
    },
    technicalFeasibility: {
      aiApproach: '',
      algorithmOptions: [],
      infrastructureRequirements: [],
      integrationComplexity: 'Medium',
      scalabilityConsiderations: '',
      technicalRisks: [],
      score: 5,
    },
    organizationalFeasibility: {
      teamExpertise: '',
      changeManagement: '',
      stakeholderAlignment: 'Moderate',
      trainingRequirements: [],
      culturalReadiness: '',
      score: 5,
    },
    financialFeasibility: {
      estimatedCost: {
        development: 0,
        infrastructure: 0,
        maintenance: 0,
        total: 0,
      },
      expectedBenefits: [],
      roi: '',
      paybackPeriod: '',
      score: 5,
    },
    overallScore: 5,
    recommendations: [],
    nextSteps: [],
  },
};

// 13. AI System Limitations Template
export const aiLimitationsTemplate: DocumentTemplate = {
  type: ProjectDocumentType.AI_LIMITATIONS,
  name: 'AI System Limitations',
  description:
    'Document AI system capabilities, limitations, failure modes, and user responsibilities',
  category: ProjectDocumentCategory.AI_SPECIFIC,
  defaultContent: {
    systemOverview: {
      systemName: '',
      purpose: '',
      aiTechnologies: [],
    },
    capabilities: [],
    limitations: [],
    outOfScopeUseCases: [],
    edgeCases: [],
    accuracyBoundaries: {
      overallAccuracy: '',
      confidenceThresholds: [
        {
          threshold: 'High (>90%)',
          meaning: 'High confidence in prediction',
          action: 'Proceed with automated action',
        },
        {
          threshold: 'Medium (70-90%)',
          meaning: 'Moderate confidence',
          action: 'Review before action',
        },
        {
          threshold: 'Low (<70%)',
          meaning: 'Low confidence',
          action: 'Require human review',
        },
      ],
      performanceByCategory: [],
    },
    dataRequirements: {
      inputRequirements: [],
      dataQualityNeeds: [],
      volumeConsiderations: '',
    },
    environmentalConstraints: [],
    failureModes: [],
    humanOversightRequirements: {
      whenRequired: [],
      reviewProcess: '',
      escalationCriteria: [],
    },
    userResponsibilities: [
      'Verify AI outputs before critical decisions',
      'Report unexpected behaviors',
      'Provide feedback for continuous improvement',
      'Maintain data quality standards',
    ],
    disclaimers: [
      'AI predictions are probabilistic and not guaranteed',
      'Historical data may not predict future outcomes',
      'System performance depends on data quality',
    ],
  },
};

// 14. Monitoring & Maintenance Plan Template
export const monitoringMaintenanceTemplate: DocumentTemplate = {
  type: ProjectDocumentType.MONITORING_MAINTENANCE,
  name: 'Monitoring & Maintenance Plan',
  description:
    'Define AI system monitoring, drift detection, retraining, and incident response procedures',
  category: ProjectDocumentCategory.AI_SPECIFIC,
  defaultContent: {
    systemInfo: {
      systemName: '',
      deploymentDate: '',
      owner: '',
      supportTeam: [],
    },
    performanceMonitoring: {
      metrics: [
        {
          metric: 'Model Accuracy',
          target: '95%',
          alertThreshold: '<90%',
          measurementMethod: 'Holdout validation set',
          frequency: 'Daily',
        },
        {
          metric: 'Response Time',
          target: '<500ms',
          alertThreshold: '>1000ms',
          measurementMethod: 'API latency monitoring',
          frequency: 'Real-time',
        },
        {
          metric: 'Error Rate',
          target: '<1%',
          alertThreshold: '>5%',
          measurementMethod: 'Error log analysis',
          frequency: 'Hourly',
        },
      ],
      dashboardLocation: '',
      monitoringTools: [],
    },
    modelDriftDetection: {
      driftMetrics: [
        'Feature distribution shift',
        'Prediction distribution shift',
        'Performance degradation',
      ],
      monitoringFrequency: 'Weekly',
      alertThresholds: [],
      responseProtocol: '',
    },
    retrainingPlan: {
      triggers: [
        'Performance drops below threshold',
        'Significant data drift detected',
        'Scheduled quarterly retraining',
        'New data sources available',
      ],
      schedule: 'Quarterly or as needed',
      dataRequirements: [],
      validationProcess: '',
      rollbackProcedure: '',
    },
    incidentResponse: {
      severityLevels: [
        {
          level: 'Critical',
          criteria: 'System down or major accuracy degradation',
          responseTime: '15 minutes',
          escalation: 'Immediate escalation to engineering lead',
        },
        {
          level: 'High',
          criteria: 'Significant performance degradation',
          responseTime: '1 hour',
          escalation: 'Notify engineering team',
        },
        {
          level: 'Medium',
          criteria: 'Minor issues or warnings',
          responseTime: '4 hours',
          escalation: 'Log and schedule fix',
        },
        {
          level: 'Low',
          criteria: 'Cosmetic issues or improvements',
          responseTime: '24 hours',
          escalation: 'Add to backlog',
        },
      ],
      incidentProcedure: [
        'Identify and classify incident',
        'Notify appropriate stakeholders',
        'Implement immediate mitigation',
        'Document root cause',
        'Implement permanent fix',
        'Conduct post-mortem review',
      ],
      communicationPlan: '',
      postMortemProcess: '',
    },
    maintenanceSchedule: [],
    backupRecovery: {
      backupFrequency: 'Daily',
      backupLocation: '',
      retentionPeriod: '90 days',
      recoveryProcedure: '',
      rto: '4 hours',
      rpo: '24 hours',
    },
    updateProcedures: {
      modelUpdates: '',
      systemUpdates: '',
      testingRequirements: [],
      rollbackPlan: '',
    },
    feedbackMechanisms: {
      userFeedbackChannels: [],
      feedbackReviewProcess: '',
      incorporationCriteria: '',
    },
  },
};

// 15. Data Requirements Template
export const dataRequirementsTemplate: DocumentTemplate = {
  type: ProjectDocumentType.DATA_REQUIREMENTS,
  name: 'Data Requirements',
  description:
    'Specify client data requirements, quality standards, and delivery timeline',
  category: ProjectDocumentCategory.AI_SPECIFIC,
  defaultContent: {
    projectContext: {
      projectName: '',
      dataUsePurpose: '',
      aiApplicationType: '',
    },
    dataTypes: [],
    qualityStandards: {
      completeness: 'Minimum 95% of required fields populated',
      accuracy: 'Verified against source systems',
      consistency: 'Uniform formats across all records',
      timeliness: 'Data no older than specified period',
      validationRules: [],
    },
    formatSpecifications: {
      fileFormats: ['CSV', 'JSON'],
      encoding: 'UTF-8',
      structureRequirements: [],
      namingConventions: '',
    },
    accessMethods: {
      deliveryMethod: 'File Transfer',
      accessDetails: '',
      authentication: '',
      refreshFrequency: '',
    },
    securityRequirements: {
      sensitivityLevel: 'Confidential',
      encryptionRequirements: 'AES-256 at rest, TLS 1.2+ in transit',
      accessControls: '',
      complianceRequirements: [],
    },
    timeline: {
      initialDataDueDate: '',
      ongoingDataSchedule: '',
      milestones: [],
    },
    clientResponsibilities: [
      'Provide data in specified format',
      'Ensure data quality standards are met',
      'Notify of any data schema changes',
      'Provide timely access to data SMEs',
      'Sign off on data usage agreement',
    ],
    dataProvisionChecklist: [],
    consequencesOfDelay:
      'Data delays may impact project timeline and deliverable dates',
  },
};

// 16. Deliverable Review Checklist Template
export const deliverableChecklistTemplate: DocumentTemplate = {
  type: ProjectDocumentType.DELIVERABLE_CHECKLIST,
  name: 'Deliverable Review Checklist',
  description: 'Quality gates and review criteria for project deliverables',
  category: ProjectDocumentCategory.AI_SPECIFIC,
  defaultContent: {
    deliverableInfo: {
      deliverableName: '',
      projectName: '',
      version: '',
      author: '',
      reviewDate: '',
      reviewer: '',
    },
    generalQuality: [
      { item: 'Meets stated requirements', checked: false, notes: '' },
      { item: 'Accuracy of data and information', checked: false, notes: '' },
      { item: 'Formatting consistency', checked: false, notes: '' },
      { item: 'Grammar and spelling checked', checked: false, notes: '' },
      { item: 'Version control applied', checked: false, notes: '' },
      { item: 'Proper citations and references', checked: false, notes: '' },
    ],
    technicalAccuracy: [
      { item: 'Calculations verified', checked: false, notes: '' },
      { item: 'Data sources validated', checked: false, notes: '' },
      { item: 'Methodology documented', checked: false, notes: '' },
      { item: 'Assumptions clearly stated', checked: false, notes: '' },
      { item: 'Limitations acknowledged', checked: false, notes: '' },
    ],
    clientRequirements: [],
    formatting: [
      { item: 'Consistent styling throughout', checked: false, notes: '' },
      {
        item: 'Headers and sections organized logically',
        checked: false,
        notes: '',
      },
      {
        item: 'Tables and figures labeled correctly',
        checked: false,
        notes: '',
      },
      {
        item: 'Page numbers and table of contents accurate',
        checked: false,
        notes: '',
      },
      { item: 'Branding guidelines followed', checked: false, notes: '' },
    ],
    aiSpecific: [
      {
        item: 'Model performance metrics documented',
        checked: false,
        notes: '',
      },
      { item: 'Training data sources identified', checked: false, notes: '' },
      { item: 'Bias assessment completed', checked: false, notes: '' },
      {
        item: 'Limitations and edge cases documented',
        checked: false,
        notes: '',
      },
      { item: 'Confidence thresholds defined', checked: false, notes: '' },
      {
        item: 'Human oversight requirements specified',
        checked: false,
        notes: '',
      },
      {
        item: 'Monitoring recommendations included',
        checked: false,
        notes: '',
      },
    ],
    overallAssessment: {
      ready: false,
      requiredChanges: [],
      minorSuggestions: [],
      reviewerApproval: false,
      approvalDate: '',
      approverSignature: '',
    },
  },
};

export const aiTemplates: DocumentTemplate[] = [
  aiFeasibilityTemplate,
  aiLimitationsTemplate,
  monitoringMaintenanceTemplate,
  dataRequirementsTemplate,
  deliverableChecklistTemplate,
];
