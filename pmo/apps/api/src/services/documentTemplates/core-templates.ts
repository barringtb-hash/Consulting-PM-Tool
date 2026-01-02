/**
 * Core Project Document Templates
 * Templates for essential project management documents
 */

import { ProjectDocumentType, ProjectDocumentCategory } from '@prisma/client';
import type { DocumentTemplate } from './types';

// 1. Project Plan Template
export const projectPlanTemplate: DocumentTemplate = {
  type: ProjectDocumentType.PROJECT_PLAN,
  name: 'Project Plan',
  description: 'Define project scope, schedule, milestones, and deliverables',
  category: ProjectDocumentCategory.CORE,
  defaultContent: {
    overview: {
      projectName: '',
      projectManager: '',
      startDate: '',
      endDate: '',
      status: 'Not Started',
    },
    scope: {
      inScope: [],
      outOfScope: [],
      assumptions: [],
      constraints: [],
    },
    phases: [],
    milestones: [],
    resources: [],
    dependencies: [],
    approvals: [],
  },
};

// 2. Status Report Template
export const statusReportTemplate: DocumentTemplate = {
  type: ProjectDocumentType.STATUS_REPORT,
  name: 'Status Report',
  description:
    'Track project progress with RAG status, accomplishments, and risks',
  category: ProjectDocumentCategory.CORE,
  defaultContent: {
    reportDate: '',
    reportingPeriod: { start: '', end: '' },
    overallStatus: 'Green',
    executiveSummary: '',
    accomplishments: [],
    inProgress: [],
    upcoming: [],
    scheduleStatus: {
      status: 'On Track',
      notes: '',
    },
    budgetStatus: {
      planned: 0,
      actual: 0,
      variance: 0,
      notes: '',
    },
    risksAndIssues: [],
    pendingDecisions: [],
    nextSteps: [],
  },
};

// 3. Risk Register Template
export const riskRegisterTemplate: DocumentTemplate = {
  type: ProjectDocumentType.RISK_REGISTER,
  name: 'Risk Register',
  description:
    'Track project risks with likelihood, impact scoring, and mitigation strategies',
  category: ProjectDocumentCategory.CORE,
  defaultContent: {
    risks: [],
    riskMatrix: {
      totalRisks: 0,
      highRisks: 0,
      mediumRisks: 0,
      lowRisks: 0,
    },
  },
};

// 4. Issue Log Template
export const issueLogTemplate: DocumentTemplate = {
  type: ProjectDocumentType.ISSUE_LOG,
  name: 'Issue Log',
  description: 'Track project issues, severity, and resolution status',
  category: ProjectDocumentCategory.CORE,
  defaultContent: {
    issues: [],
    summary: {
      total: 0,
      open: 0,
      inProgress: 0,
      resolved: 0,
    },
  },
};

// 5. Meeting Notes Template
export const meetingNotesTemplate: DocumentTemplate = {
  type: ProjectDocumentType.MEETING_NOTES,
  name: 'Meeting Notes',
  description: 'Capture meeting decisions, action items, and parking lot items',
  category: ProjectDocumentCategory.CORE,
  defaultContent: {
    meetingInfo: {
      title: '',
      date: '',
      time: '',
      location: '',
      facilitator: '',
      attendees: [],
      absentees: [],
    },
    agenda: [],
    discussionPoints: [],
    decisions: [],
    actionItems: [],
    parkingLot: [],
    nextMeeting: {
      date: '',
      time: '',
      proposedAgenda: [],
    },
  },
};

// 6. Lessons Learned Template
export const lessonsLearnedTemplate: DocumentTemplate = {
  type: ProjectDocumentType.LESSONS_LEARNED,
  name: 'Lessons Learned',
  description:
    'Document project insights and recommendations for future improvements',
  category: ProjectDocumentCategory.CORE,
  defaultContent: {
    projectSummary: {
      projectName: '',
      completionDate: '',
      projectManager: '',
      teamMembers: [],
    },
    successAreas: [],
    challengeAreas: [],
    processImprovements: [],
    toolsAndTechniques: {
      effective: [],
      ineffective: [],
      recommended: [],
    },
    teamFeedback: [],
    overallRecommendations: [],
  },
};

// 7. Communication Plan Template
export const communicationPlanTemplate: DocumentTemplate = {
  type: ProjectDocumentType.COMMUNICATION_PLAN,
  name: 'Communication Plan',
  description:
    'Define stakeholder communication channels, frequency, and escalation procedures',
  category: ProjectDocumentCategory.CORE,
  defaultContent: {
    stakeholders: [],
    communicationMatrix: [],
    escalationProcedures: [],
    meetingSchedule: [],
    responseTimeExpectations: {
      urgent: '1 hour',
      high: '4 hours',
      normal: '24 hours',
      low: '48 hours',
    },
    documentSharing: {
      platform: '',
      accessInstructions: '',
      folderStructure: [],
    },
  },
};

export const coreTemplates: DocumentTemplate[] = [
  projectPlanTemplate,
  statusReportTemplate,
  riskRegisterTemplate,
  issueLogTemplate,
  meetingNotesTemplate,
  lessonsLearnedTemplate,
  communicationPlanTemplate,
];
