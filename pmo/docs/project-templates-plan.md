# Project Document Templates Implementation Plan

## Overview

This plan outlines the implementation of structured project document templates that will be available as tabs within each project. These documents follow the consulting documentation framework and can be updated as projects progress through their lifecycle.

## Project-Related Documents to Implement

### Core Project Documents (7 templates)

| #   | Document               | Tab Location | Description                                                  |
| --- | ---------------------- | ------------ | ------------------------------------------------------------ |
| 1   | **Project Plan**       | Documents    | Scope, schedule, milestones, deliverables, phases            |
| 2   | **Status Report**      | Documents    | Progress with RAG status, accomplishments, risks, next steps |
| 3   | **Risk Register**      | Documents    | Likelihood, impact scoring, mitigation strategies, owners    |
| 4   | **Issue Log**          | Documents    | Problem tracking, severity, resolution, status               |
| 5   | **Meeting Notes**      | Documents    | Decisions, action items, parking lot items                   |
| 6   | **Lessons Learned**    | Documents    | Post-project insights and recommendations                    |
| 7   | **Communication Plan** | Documents    | Contacts, channels, cadence, escalation                      |

### Project Lifecycle Documents (4 templates)

| #   | Document               | Tab Location | Description                             |
| --- | ---------------------- | ------------ | --------------------------------------- |
| 8   | **Kickoff Agenda**     | Documents    | Meeting structure for project alignment |
| 9   | **Change Request**     | Documents    | Scope change with impact analysis       |
| 10  | **Project Closure**    | Documents    | Handoff checklist and transition        |
| 11  | **Knowledge Transfer** | Documents    | System documentation for handoff        |

### AI Project-Specific Documents (5 templates)

| #   | Document                          | Tab Location | Description                                        |
| --- | --------------------------------- | ------------ | -------------------------------------------------- |
| 12  | **AI Feasibility Assessment**     | Documents    | Problem, data, technical, org, financial viability |
| 13  | **AI System Limitations**         | Documents    | Capabilities, failure modes, edge cases            |
| 14  | **Monitoring & Maintenance Plan** | Documents    | Drift detection, retraining, incident response     |
| 15  | **Data Requirements**             | Documents    | Client data specs, quality, format, timeline       |
| 16  | **Deliverable Review Checklist**  | Documents    | Quality gates before client delivery               |

---

## Database Schema Design

### New Models

```prisma
// Project document instance - a filled-in document for a specific project
model ProjectDocument {
  id            String                @id @default(cuid())
  tenantId      String
  projectId     String
  templateType  ProjectDocumentType   // Enum for the 16 document types
  name          String                // User-customizable name
  status        DocumentStatus        @default(DRAFT)
  content       Json                  // Structured content based on template type
  version       Int                   @default(1)
  lastEditedBy  String?
  lastEditedAt  DateTime              @default(now())
  createdAt     DateTime              @default(now())
  updatedAt     DateTime              @updatedAt

  // Relations
  tenant        Tenant                @relation(fields: [tenantId], references: [id])
  project       Project               @relation(fields: [projectId], references: [id], onDelete: Cascade)
  editor        User?                 @relation(fields: [lastEditedBy], references: [id])

  @@index([projectId])
  @@index([tenantId])
  @@index([templateType])
}

enum ProjectDocumentType {
  // Core Project Documents
  PROJECT_PLAN
  STATUS_REPORT
  RISK_REGISTER
  ISSUE_LOG
  MEETING_NOTES
  LESSONS_LEARNED
  COMMUNICATION_PLAN

  // Lifecycle Documents
  KICKOFF_AGENDA
  CHANGE_REQUEST
  PROJECT_CLOSURE
  KNOWLEDGE_TRANSFER

  // AI-Specific Documents
  AI_FEASIBILITY
  AI_LIMITATIONS
  MONITORING_MAINTENANCE
  DATA_REQUIREMENTS
  DELIVERABLE_CHECKLIST
}

enum DocumentStatus {
  DRAFT
  IN_REVIEW
  APPROVED
  ARCHIVED
}
```

### Update Project Model

```prisma
model Project {
  // ... existing fields ...

  // Add relation to project documents
  projectDocuments  ProjectDocument[]
}
```

---

## Template Content Structures (JSON Schemas)

### 1. Project Plan

```typescript
interface ProjectPlanContent {
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
```

### 2. Status Report

```typescript
interface StatusReportContent {
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
```

### 3. Risk Register

```typescript
interface RiskRegisterContent {
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
    likelihood: 1 | 2 | 3 | 4 | 5; // 1=Very Low, 5=Very High
    impact: 1 | 2 | 3 | 4 | 5;
    riskScore: number; // likelihood × impact
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
```

### 4. Issue Log

```typescript
interface IssueLogContent {
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
```

### 5. Meeting Notes

```typescript
interface MeetingNotesContent {
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
```

### 6. Lessons Learned

```typescript
interface LessonsLearnedContent {
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
```

### 7. Communication Plan

```typescript
interface CommunicationPlanContent {
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
```

### 8. Kickoff Agenda

```typescript
interface KickoffAgendaContent {
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
```

### 9. Change Request

```typescript
interface ChangeRequestContent {
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
```

### 10. Project Closure

```typescript
interface ProjectClosureContent {
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
```

### 11. Knowledge Transfer

```typescript
interface KnowledgeTransferContent {
  systemOverview: {
    systemName: string;
    purpose: string;
    keyComponents: string[];
    architectureDiagram: string; // URL or description
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
```

### 12. AI Feasibility Assessment

```typescript
interface AIFeasibilityContent {
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
    score: number; // 1-10
  };
  technicalFeasibility: {
    aiApproach: string;
    algorithmOptions: string[];
    infrastructureRequirements: string[];
    integrationComplexity: 'Low' | 'Medium' | 'High';
    scalabilityConsiderations: string;
    technicalRisks: string[];
    score: number; // 1-10
  };
  organizationalFeasibility: {
    teamExpertise: string;
    changeManagement: string;
    stakeholderAlignment: 'Strong' | 'Moderate' | 'Weak';
    trainingRequirements: string[];
    culturalReadiness: string;
    score: number; // 1-10
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
    score: number; // 1-10
  };
  overallScore: number;
  recommendations: string[];
  nextSteps: string[];
}
```

### 13. AI System Limitations

```typescript
interface AILimitationsContent {
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
```

### 14. Monitoring & Maintenance Plan

```typescript
interface MonitoringMaintenanceContent {
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
```

### 15. Data Requirements

```typescript
interface DataRequirementsContent {
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
```

### 16. Deliverable Review Checklist

```typescript
interface DeliverableChecklistContent {
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
```

---

## Implementation Phases

### Phase 1: Database & Backend Foundation (Priority: HIGH)

**Tasks:**

1. **Add Prisma Schema Changes**
   - Add `ProjectDocument` model
   - Add `ProjectDocumentType` enum
   - Add `DocumentStatus` enum
   - Add relation to `Project` model
   - Create and run migration

2. **Create Project Document Service**
   - File: `pmo/apps/api/src/services/projectDocument.service.ts`
   - CRUD operations for project documents
   - Template initialization with default content
   - Version tracking logic

3. **Create Validation Schemas**
   - File: `pmo/apps/api/src/validation/projectDocument.schema.ts`
   - Zod schemas for each document type
   - Create/update validation

4. **Create API Routes**
   - File: `pmo/apps/api/src/routes/projectDocuments.ts`
   - `GET /projects/:projectId/documents` - List project documents
   - `GET /projects/:projectId/documents/:id` - Get single document
   - `POST /projects/:projectId/documents` - Create from template
   - `PUT /projects/:projectId/documents/:id` - Update document
   - `DELETE /projects/:projectId/documents/:id` - Delete document
   - `POST /projects/:projectId/documents/:id/version` - Create new version
   - `GET /projects/:projectId/documents/templates` - List available templates

5. **Register Routes**
   - Update `pmo/apps/api/src/app.ts`

### Phase 2: Template Definitions (Priority: HIGH)

**Tasks:**

1. **Create Template Registry**
   - File: `pmo/apps/api/src/services/documentTemplates/index.ts`
   - Export all 16 template definitions

2. **Create Template Files**
   - Directory: `pmo/apps/api/src/services/documentTemplates/`
   - One file per template category:
     - `core-templates.ts` (Project Plan, Status Report, Risk Register, Issue Log, Meeting Notes, Lessons Learned, Communication Plan)
     - `lifecycle-templates.ts` (Kickoff Agenda, Change Request, Project Closure, Knowledge Transfer)
     - `ai-templates.ts` (AI Feasibility, AI Limitations, Monitoring, Data Requirements, Deliverable Checklist)

3. **Template Structure**
   ```typescript
   interface DocumentTemplate {
     type: ProjectDocumentType;
     name: string;
     description: string;
     category: 'Core' | 'Lifecycle' | 'AI';
     defaultContent: Record<string, any>;
     schema: ZodSchema; // For validation
   }
   ```

### Phase 3: Frontend - API Integration (Priority: HIGH)

**Tasks:**

1. **Create API Functions**
   - File: `pmo/apps/web/src/api/projectDocuments.ts`
   - HTTP functions for all endpoints

2. **Create React Query Hooks**
   - File: `pmo/apps/web/src/api/hooks/useProjectDocuments.ts`
   - `useProjectDocuments(projectId)` - List documents
   - `useProjectDocument(projectId, docId)` - Single document
   - `useCreateProjectDocument()` - Create mutation
   - `useUpdateProjectDocument()` - Update mutation
   - `useDeleteProjectDocument()` - Delete mutation
   - `useDocumentTemplates()` - List available templates

### Phase 4: Frontend - Documents Tab UI (Priority: HIGH)

**Tasks:**

1. **Create Documents Tab Component**
   - File: `pmo/apps/web/src/features/projects/ProjectDocumentsTab.tsx`
   - Display list of project documents
   - Create new document from template picker
   - Quick status badges
   - Sort/filter by type, status, date

2. **Create Template Picker Modal**
   - File: `pmo/apps/web/src/features/projects/TemplatePickerModal.tsx`
   - Category-organized template list
   - Template descriptions
   - Create document action

3. **Create Document Editor Component**
   - File: `pmo/apps/web/src/features/projects/DocumentEditor.tsx`
   - Dynamic form based on document type
   - Auto-save functionality
   - Version indicator
   - Status controls

4. **Create Document Type-Specific Editors**
   - Directory: `pmo/apps/web/src/features/projects/documentEditors/`
   - `StatusReportEditor.tsx` - RAG status, tables
   - `RiskRegisterEditor.tsx` - Risk matrix, scoring
   - `MeetingNotesEditor.tsx` - Action items, decisions
   - etc.

5. **Update ProjectDashboardPage**
   - Add "Documents" tab to existing tabs
   - Position after "Assets" tab

### Phase 5: Enhanced Features (Priority: MEDIUM)

**Tasks:**

1. **Document Version History**
   - View previous versions
   - Compare versions
   - Restore previous version

2. **Export Functionality**
   - Export as PDF
   - Export as Word document
   - Export as Markdown

3. **Document Search**
   - Full-text search across documents
   - Filter by document type
   - Filter by status

4. **Document Sharing**
   - Generate shareable link
   - Set expiration
   - Track views

### Phase 6: AI Enhancements (Priority: LOW)

**Tasks:**

1. **AI-Assisted Content**
   - Auto-populate from project data
   - Suggest content based on context
   - Generate draft sections

2. **Smart Status Reports**
   - Pull data from tasks, milestones
   - Calculate RAG status automatically
   - Suggest accomplishments from completed tasks

---

## Files to Create/Modify

### New Files

| File                                                                 | Purpose               |
| -------------------------------------------------------------------- | --------------------- |
| `pmo/prisma/migrations/xxx_add_project_documents.sql`                | Database migration    |
| `pmo/apps/api/src/services/projectDocument.service.ts`               | Business logic        |
| `pmo/apps/api/src/services/documentTemplates/index.ts`               | Template registry     |
| `pmo/apps/api/src/services/documentTemplates/core-templates.ts`      | Core templates        |
| `pmo/apps/api/src/services/documentTemplates/lifecycle-templates.ts` | Lifecycle templates   |
| `pmo/apps/api/src/services/documentTemplates/ai-templates.ts`        | AI templates          |
| `pmo/apps/api/src/routes/projectDocuments.ts`                        | API routes            |
| `pmo/apps/api/src/validation/projectDocument.schema.ts`              | Validation            |
| `pmo/apps/web/src/api/projectDocuments.ts`                           | API functions         |
| `pmo/apps/web/src/api/hooks/useProjectDocuments.ts`                  | React Query hooks     |
| `pmo/apps/web/src/features/projects/ProjectDocumentsTab.tsx`         | Main documents tab    |
| `pmo/apps/web/src/features/projects/TemplatePickerModal.tsx`         | Template selection    |
| `pmo/apps/web/src/features/projects/DocumentEditor.tsx`              | Document editing      |
| `pmo/apps/web/src/features/projects/documentEditors/*.tsx`           | Type-specific editors |

### Modified Files

| File                                              | Changes                          |
| ------------------------------------------------- | -------------------------------- |
| `pmo/prisma/schema.prisma`                        | Add ProjectDocument model, enums |
| `pmo/apps/api/src/app.ts`                         | Register new routes              |
| `pmo/apps/web/src/pages/ProjectDashboardPage.tsx` | Add Documents tab                |

---

## API Endpoints Summary

| Method | Endpoint                                      | Description                      |
| ------ | --------------------------------------------- | -------------------------------- |
| GET    | `/projects/:projectId/documents`              | List all documents for a project |
| GET    | `/projects/:projectId/documents/templates`    | List available templates         |
| GET    | `/projects/:projectId/documents/:id`          | Get single document              |
| POST   | `/projects/:projectId/documents`              | Create document from template    |
| PUT    | `/projects/:projectId/documents/:id`          | Update document content          |
| PATCH  | `/projects/:projectId/documents/:id/status`   | Update document status           |
| DELETE | `/projects/:projectId/documents/:id`          | Delete document                  |
| GET    | `/projects/:projectId/documents/:id/versions` | Get version history              |
| POST   | `/projects/:projectId/documents/:id/versions` | Create new version               |

---

## Success Criteria

1. ✅ All 16 document templates available in the system
2. ✅ Documents accessible via "Documents" tab in project dashboard
3. ✅ Users can create documents from any template
4. ✅ Documents save and persist changes
5. ✅ Documents display appropriate form fields for their type
6. ✅ Version tracking works correctly
7. ✅ Status workflow (Draft → In Review → Approved → Archived)
8. ✅ All API endpoints secured with authentication
9. ✅ Tenant isolation enforced on all operations

---

## Estimated Effort

| Phase                             | Effort |
| --------------------------------- | ------ |
| Phase 1: Database & Backend       | High   |
| Phase 2: Template Definitions     | Medium |
| Phase 3: Frontend API Integration | Medium |
| Phase 4: Frontend Documents Tab   | High   |
| Phase 5: Enhanced Features        | Medium |
| Phase 6: AI Enhancements          | Low    |

---

## Documentation Updates Required

Per CLAUDE.md requirements, after implementation:

1. Update `CLAUDE.md` - Add new files to Key Files table
2. Update `Docs/CODEBASE-INVENTORY.md` - Add ProjectDocuments module
3. Update `Docs/MODULES.md` - Document new functionality
4. Run validation scripts before commit
