/**
 * Project Lifecycle Document Templates
 * Templates for project phase-specific documents
 */

import { ProjectDocumentType, ProjectDocumentCategory } from '@prisma/client';
import type { DocumentTemplate } from './types';

// 8. Kickoff Agenda Template
export const kickoffAgendaTemplate: DocumentTemplate = {
  type: ProjectDocumentType.KICKOFF_AGENDA,
  name: 'Kickoff Agenda',
  description: 'Structure the project kickoff meeting for team alignment',
  category: ProjectDocumentCategory.LIFECYCLE,
  defaultContent: {
    meetingDetails: {
      date: '',
      time: '',
      duration: '2 hours',
      location: '',
      facilitator: '',
    },
    attendees: [],
    agendaItems: [
      {
        time: '',
        duration: '10 min',
        topic: 'Welcome and Introductions',
        presenter: '',
        objectives: ['Introduce team members', 'Set meeting expectations'],
        materials: [],
      },
      {
        time: '',
        duration: '20 min',
        topic: 'Project Overview',
        presenter: '',
        objectives: ['Review project scope', 'Confirm deliverables'],
        materials: ['Project charter', 'Statement of work'],
      },
      {
        time: '',
        duration: '15 min',
        topic: 'Timeline and Milestones',
        presenter: '',
        objectives: ['Review project schedule', 'Identify key dates'],
        materials: ['Project timeline'],
      },
      {
        time: '',
        duration: '15 min',
        topic: 'Roles and Responsibilities',
        presenter: '',
        objectives: ['Clarify team roles', 'Establish accountability'],
        materials: ['RACI matrix'],
      },
      {
        time: '',
        duration: '10 min',
        topic: 'Communication Plan',
        presenter: '',
        objectives: [
          'Define meeting cadence',
          'Establish communication channels',
        ],
        materials: ['Communication plan'],
      },
      {
        time: '',
        duration: '10 min',
        topic: 'Risks and Assumptions',
        presenter: '',
        objectives: ['Identify initial risks', 'Review assumptions'],
        materials: [],
      },
      {
        time: '',
        duration: '10 min',
        topic: 'Next Steps and Action Items',
        presenter: '',
        objectives: ['Assign immediate tasks', 'Set expectations for week 1'],
        materials: [],
      },
      {
        time: '',
        duration: '10 min',
        topic: 'Q&A',
        presenter: '',
        objectives: ['Address questions', 'Clarify concerns'],
        materials: [],
      },
    ],
    preRequisites: [
      'Review project charter and SOW',
      'Prepare relevant background materials',
      'Identify initial questions or concerns',
    ],
    expectedOutcomes: [
      'Team alignment on project objectives',
      'Clear understanding of roles and responsibilities',
      'Agreed-upon communication plan',
      'Initial risks and assumptions documented',
      'Action items assigned for project start',
    ],
    postMeetingActions: [
      'Distribute meeting notes within 24 hours',
      'Set up project folder structure',
      'Schedule recurring meetings',
      'Send calendar invites for milestones',
    ],
  },
};

// 9. Change Request Template
export const changeRequestTemplate: DocumentTemplate = {
  type: ProjectDocumentType.CHANGE_REQUEST,
  name: 'Change Request',
  description: 'Document and track scope changes with impact analysis',
  category: ProjectDocumentCategory.LIFECYCLE,
  defaultContent: {
    requestInfo: {
      requestId: '',
      requestDate: '',
      requestor: '',
      priority: 'Medium',
      status: 'Submitted',
    },
    currentState: '',
    proposedChange: '',
    justification: '',
    impactAnalysis: {
      scopeImpact: '',
      scheduleImpact: '',
      costImpact: {
        additionalCost: 0,
        description: '',
      },
      resourceImpact: '',
      riskImplications: [],
      qualityImpact: '',
    },
    alternatives: [],
    recommendation: '',
    approvals: [],
    implementationPlan: '',
  },
};

// 10. Project Closure Template
export const projectClosureTemplate: DocumentTemplate = {
  type: ProjectDocumentType.PROJECT_CLOSURE,
  name: 'Project Closure',
  description:
    'Complete project handoff checklist and transition documentation',
  category: ProjectDocumentCategory.LIFECYCLE,
  defaultContent: {
    projectSummary: {
      projectName: '',
      startDate: '',
      endDate: '',
      projectManager: '',
      client: '',
    },
    objectives: [],
    deliverables: [],
    budgetSummary: {
      plannedBudget: 0,
      actualSpend: 0,
      variance: 0,
      explanation: '',
    },
    scheduleSummary: {
      plannedEndDate: '',
      actualEndDate: '',
      variance: '',
      explanation: '',
    },
    outstandingItems: [],
    handoffItems: [],
    clientSatisfaction: {
      overallRating: 4,
      feedback: '',
      testimonialObtained: false,
    },
    teamAcknowledgments: [],
    signoffs: [],
  },
};

// 11. Knowledge Transfer Template
export const knowledgeTransferTemplate: DocumentTemplate = {
  type: ProjectDocumentType.KNOWLEDGE_TRANSFER,
  name: 'Knowledge Transfer',
  description: 'Document system information and processes for project handoff',
  category: ProjectDocumentCategory.LIFECYCLE,
  defaultContent: {
    systemOverview: {
      systemName: '',
      purpose: '',
      keyComponents: [],
      architectureDiagram: '',
    },
    technicalDocumentation: [],
    accessCredentials: [],
    processes: [],
    maintenanceTasks: [],
    troubleshooting: [],
    vendorContacts: [],
    trainingCompleted: [],
  },
};

export const lifecycleTemplates: DocumentTemplate[] = [
  kickoffAgendaTemplate,
  changeRequestTemplate,
  projectClosureTemplate,
  knowledgeTransferTemplate,
];
