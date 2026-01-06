# AI Projects Module Implementation Plan

This document outlines the implementation plan for AI-powered enhancements to the Projects module, including extending the existing chatbot as a Project Assistant.

---

## Executive Summary

**Goal:** Transform the Projects module into an AI-powered project management platform by:
1. Extending the existing chatbot to serve as a Project Assistant
2. Adding predictive intelligence for project health and scheduling
3. Automating status reports, task creation, and stakeholder communications
4. Integrating AI throughout the project lifecycle

**Timeline:** 4 Phases across ~6-8 sprints

---

## Phase 1: Foundation & Project Assistant (Sprint 1-2)

### 1.1 Extend Chatbot with Project Intents

**Goal:** Enable the existing chatbot to understand and respond to project-related queries.

#### Database Changes

```prisma
// pmo/prisma/schema.prisma

// Add new intent types to existing enum
enum IntentType {
  ORDER_STATUS
  RETURN_REQUEST
  PRODUCT_INQUIRY
  FAQ
  COMPLAINT
  ESCALATION
  GENERAL
  UNKNOWN
  // NEW PROJECT INTENTS
  PROJECT_STATUS      // "How's Project Alpha doing?"
  PROJECT_CREATE      // "Create a new project"
  TASK_STATUS         // "What tasks are overdue?"
  TASK_CREATE         // "Add a task to..."
  MILESTONE_STATUS    // "When is the next milestone?"
  TEAM_QUERY          // "Who's working on...?"
  SCHEDULE_QUERY      // "What's due this week?"
  REPORT_REQUEST      // "Generate a status report"
}

// Add project context to conversations
model ChatConversation {
  // ... existing fields
  projectId     Int?
  project       Project?  @relation(fields: [projectId], references: [id], onDelete: SetNull)
}

// Add relation to Project model
model Project {
  // ... existing fields
  chatConversations  ChatConversation[]
}
```

#### New Files

| File | Purpose |
|------|---------|
| `pmo/apps/api/src/modules/chatbot/intents/project.intent.ts` | Project intent classification logic |
| `pmo/apps/api/src/modules/chatbot/handlers/project.handler.ts` | Project query response generation |
| `pmo/apps/api/src/modules/chatbot/tools/project.tools.ts` | Project data retrieval utilities |

#### Implementation Details

**1. Project Intent Classifier** (`project.intent.ts`)
```typescript
export const PROJECT_INTENT_KEYWORDS = {
  PROJECT_STATUS: ['project status', 'how is', 'project health', 'project update'],
  PROJECT_CREATE: ['create project', 'new project', 'start project', 'setup project'],
  TASK_STATUS: ['task', 'tasks', 'overdue', 'blocked', 'in progress'],
  TASK_CREATE: ['add task', 'create task', 'new task', 'assign task'],
  MILESTONE_STATUS: ['milestone', 'phase', 'deliverable', 'deadline'],
  TEAM_QUERY: ['who is', 'team', 'assigned to', 'working on'],
  SCHEDULE_QUERY: ['due', 'this week', 'upcoming', 'schedule', 'timeline'],
  REPORT_REQUEST: ['report', 'summary', 'status report', 'weekly update'],
};

export function classifyProjectIntent(message: string): { intent: IntentType; confidence: number } | null {
  const lower = message.toLowerCase();

  for (const [intent, keywords] of Object.entries(PROJECT_INTENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return { intent: intent as IntentType, confidence: 0.85 };
      }
    }
  }
  return null;
}
```

**2. Project Query Handler** (`project.handler.ts`)
```typescript
export async function handleProjectIntent(
  intent: IntentType,
  message: string,
  context: { tenantId: string; userId?: string; projectId?: number }
): Promise<BotResponse> {
  switch (intent) {
    case 'PROJECT_STATUS':
      return await handleProjectStatusQuery(message, context);
    case 'TASK_STATUS':
      return await handleTaskStatusQuery(message, context);
    case 'REPORT_REQUEST':
      return await handleReportRequest(message, context);
    // ... other handlers
  }
}

async function handleProjectStatusQuery(message: string, context): Promise<BotResponse> {
  // Extract project reference from message or use context
  const projectId = extractProjectId(message) ?? context.projectId;

  if (!projectId) {
    return {
      content: "Which project would you like to check? I can see these active projects:",
      suggestedActions: await getActiveProjectSuggestions(context.tenantId),
    };
  }

  const status = await projectStatusService.getStatusSnapshot(projectId, context.tenantId);

  return {
    content: formatProjectStatus(status),
    suggestedActions: [
      { label: 'View details', action: 'openProject', payload: { projectId } },
      { label: 'See tasks', action: 'viewTasks', payload: { projectId } },
      { label: 'Generate report', action: 'generateReport', payload: { projectId } },
    ],
  };
}
```

**3. Update AI System Prompt** (in `chatbot.service.ts`)
```typescript
const INTENT_CLASSIFICATION_PROMPT = `You are an intent classifier for a project management AI assistant.
Classify the user message into ONE of these categories:

CUSTOMER SERVICE:
- ORDER_STATUS: Questions about order tracking
- RETURN_REQUEST: Return or refund requests
- PRODUCT_INQUIRY: Product availability/pricing questions
- COMPLAINT: Customer complaints
- ESCALATION: Requests to speak with human
- FAQ: General questions

PROJECT MANAGEMENT:
- PROJECT_STATUS: Questions about project health, progress, or updates
- PROJECT_CREATE: Requests to create a new project
- TASK_STATUS: Questions about tasks (overdue, blocked, assigned)
- TASK_CREATE: Requests to create or assign tasks
- MILESTONE_STATUS: Questions about milestones or deadlines
- TEAM_QUERY: Questions about team members or assignments
- SCHEDULE_QUERY: Questions about timelines, due dates, upcoming work
- REPORT_REQUEST: Requests for status reports or summaries

- GENERAL: Anything else

Return JSON: {"intent": "CATEGORY", "confidence": 0.0-1.0, "entities": {"projectName": "...", "taskName": "..."}}`;
```

#### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/chatbot/project-assistant` | POST | Project-aware conversation endpoint |
| `/api/chatbot/project-assistant/projects` | GET | List user's accessible projects for suggestions |
| `/api/chatbot/project-assistant/context` | POST | Set project context for conversation |

### 1.2 Project Assistant UI

**Goal:** Add a chat interface to the Project Dashboard for contextual assistance.

#### New Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ProjectAssistant.tsx` | `pmo/apps/web/src/components/projects/` | Floating chat widget on project pages |
| `AssistantPanel.tsx` | `pmo/apps/web/src/components/projects/` | Full-width assistant panel (alternative view) |
| `useProjectAssistant.ts` | `pmo/apps/web/src/api/hooks/` | React Query hook for assistant API |

#### UI Design

```
┌─────────────────────────────────────────────────────────────┐
│ Project Dashboard: Alpha Launch                    [✨ Ask AI]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Tabs: Overview | Tasks | Meetings | ...]                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  Tab Content                         │   │
│  │                                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✨ Project Assistant                            [−] │   │
│  │ ──────────────────────────────────────────────────── │   │
│  │ 🤖 How can I help with Alpha Launch today?          │   │
│  │                                                      │   │
│  │ Quick actions:                                       │   │
│  │ [📊 Status summary] [📋 Overdue tasks] [📅 This week]│   │
│  │                                                      │   │
│  │ ┌──────────────────────────────────────────────┐    │   │
│  │ │ Type a question...                      [→] │    │   │
│  │ └──────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### Implementation

```typescript
// ProjectAssistant.tsx
export function ProjectAssistant({ projectId, projectName }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const { mutate: sendMessage, isLoading } = useProjectAssistant();

  const quickActions = [
    { label: '📊 Status summary', query: 'Give me a status summary' },
    { label: '📋 Overdue tasks', query: 'What tasks are overdue?' },
    { label: '📅 This week', query: "What's due this week?" },
    { label: '⚠️ Risks', query: 'Are there any risks I should know about?' },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <Card className="w-96 h-[500px] flex flex-col">
          <CardHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <span className="font-semibold">✨ Project Assistant</span>
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>−</Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            <MessageList messages={messages} />
          </CardContent>
          <CardFooter className="flex-shrink-0 flex-col gap-2">
            <div className="flex flex-wrap gap-1">
              {quickActions.map(action => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSend(action.query)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
            <ChatInput onSend={handleSend} disabled={isLoading} />
          </CardFooter>
        </Card>
      ) : (
        <Button onClick={() => setIsOpen(true)} className="rounded-full h-14 w-14">
          ✨
        </Button>
      )}
    </div>
  );
}
```

### 1.3 AI Status Summary Generator

**Goal:** Auto-generate human-readable status reports from project data.

#### New Service

```typescript
// pmo/apps/api/src/services/ai-status.service.ts

export class AIStatusService {
  async generateStatusSummary(
    projectId: number,
    tenantId: string,
    options: { timeRange?: 'daily' | 'weekly' | 'monthly'; format?: 'brief' | 'detailed' }
  ): Promise<StatusSummary> {
    // 1. Gather project data
    const [project, tasks, milestones, meetings, activities] = await Promise.all([
      projectService.getById(projectId, tenantId),
      taskService.getByProject(projectId, tenantId),
      milestoneService.getByProject(projectId, tenantId),
      meetingService.getByProject(projectId, tenantId, { since: options.timeRange }),
      activityService.getByProject(projectId, tenantId, { since: options.timeRange }),
    ]);

    // 2. Compute metrics
    const metrics = computeProjectMetrics(tasks, milestones);

    // 3. Generate AI summary
    const prompt = buildStatusPrompt(project, metrics, meetings, options);
    const summary = await llmService.complete(prompt, { maxTokens: 500 });

    // 4. Store and return
    await projectService.updateStatusSummary(projectId, tenantId, {
      summary: summary.content,
      generatedAt: new Date(),
      metrics,
    });

    return {
      content: summary.content,
      metrics,
      generatedAt: new Date(),
    };
  }

  private buildStatusPrompt(project, metrics, meetings, options): string {
    return `Generate a ${options.format} status summary for project "${project.name}".

PROJECT DATA:
- Status: ${project.status}
- Health: ${project.healthStatus}
- Timeline: ${project.startDate} to ${project.endDate}

TASK METRICS:
- Total: ${metrics.totalTasks}
- Completed: ${metrics.completedTasks} (${metrics.completionRate}%)
- In Progress: ${metrics.inProgressTasks}
- Overdue: ${metrics.overdueTasks}
- Blocked: ${metrics.blockedTasks}

MILESTONES:
${metrics.milestones.map(m => `- ${m.name}: ${m.status} (due ${m.dueDate})`).join('\n')}

RECENT MEETINGS:
${meetings.map(m => `- ${m.title}: ${m.summary || 'No summary'}`).join('\n')}

Generate a professional status summary that:
1. Highlights progress and achievements
2. Calls out risks or blockers
3. Notes upcoming milestones
4. Recommends next actions

Format: ${options.format === 'brief' ? '2-3 sentences' : '3-4 paragraphs with bullet points'}`;
  }
}
```

#### API Endpoint

```typescript
// Add to project.routes.ts
router.post('/:id/ai/status-summary', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { timeRange, format } = req.body;
  const tenantId = getTenantId(req);

  const summary = await aiStatusService.generateStatusSummary(
    parseInt(id),
    tenantId,
    { timeRange, format }
  );

  res.json({ data: summary });
});
```

#### UI Integration

Add "✨ Generate Summary" button to Status & Reporting tab:

```typescript
// In StatusReportingTab.tsx
<Button onClick={() => generateSummary.mutate({ timeRange: 'weekly' })}>
  ✨ Generate Summary
</Button>

{generatedSummary && (
  <Card className="mt-4">
    <CardHeader>AI-Generated Summary</CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground mb-2">
        Generated {formatDate(generatedSummary.generatedAt)}
      </p>
      <Markdown>{generatedSummary.content}</Markdown>
      <div className="flex gap-2 mt-4">
        <Button variant="outline" size="sm" onClick={copyToClipboard}>
          Copy
        </Button>
        <Button variant="outline" size="sm" onClick={saveToProject}>
          Save to Project
        </Button>
        <Button variant="outline" size="sm" onClick={sendToStakeholders}>
          Email to Stakeholders
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

### 1.4 Auto-Apply Templates

**Goal:** Complete the deferred feature to auto-create milestones/tasks from templates.

#### Implementation

```typescript
// In project.service.ts - update create method

async create(data: CreateProjectInput, tenantId: string): Promise<Project> {
  return await prisma.$transaction(async (tx) => {
    // 1. Create project
    const project = await tx.project.create({
      data: {
        ...data,
        tenantId,
      },
    });

    // 2. If template specified, apply it
    if (data.templateId) {
      const template = getProjectTemplate(data.templateId);

      if (template) {
        // Create milestones
        const milestoneMap = new Map<string, number>();
        for (const milestone of template.milestones) {
          const created = await tx.milestone.create({
            data: {
              tenantId,
              projectId: project.id,
              name: milestone.name,
              description: milestone.description,
              dueDate: calculateDueDate(project.startDate, milestone.weekOffset),
              status: 'NOT_STARTED',
            },
          });
          milestoneMap.set(milestone.id, created.id);
        }

        // Create tasks
        for (const task of template.tasks) {
          await tx.task.create({
            data: {
              tenantId,
              projectId: project.id,
              milestoneId: task.milestoneId ? milestoneMap.get(task.milestoneId) : null,
              title: task.title,
              description: task.description,
              status: 'BACKLOG',
              priority: task.priority || 'P3',
              ownerId: project.ownerId,
            },
          });
        }
      }
    }

    return project;
  });
}
```

---

## Phase 2: Predictive Intelligence (Sprint 3-4)

### 2.1 Project Health Predictor

**Goal:** ML-based prediction of project health status 1-2 weeks in advance.

#### Database Changes

```prisma
model ProjectHealthPrediction {
  id              Int       @id @default(autoincrement())
  tenantId        String
  projectId       Int
  project         Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)

  predictedHealth ProjectHealthStatus
  confidence      Float
  predictedDate   DateTime  // Date this prediction is for

  // Contributing factors
  factors         Json      // { taskVelocity: 0.3, milestoneRisk: 0.5, ... }

  // Outcome tracking (for model improvement)
  actualHealth    ProjectHealthStatus?
  wasAccurate     Boolean?

  createdAt       DateTime  @default(now())

  @@index([projectId, predictedDate])
  @@index([tenantId])
}
```

#### New Service

```typescript
// pmo/apps/api/src/services/health-predictor.service.ts

export class HealthPredictorService {
  private readonly RISK_WEIGHTS = {
    overdueTaskRatio: 0.25,
    milestoneSlippage: 0.20,
    taskVelocityDecline: 0.15,
    teamEngagement: 0.15,
    scopeCreep: 0.10,
    clientEngagement: 0.15,
  };

  async predictHealth(projectId: number, tenantId: string): Promise<HealthPrediction> {
    const metrics = await this.gatherMetrics(projectId, tenantId);
    const factors = this.calculateRiskFactors(metrics);
    const riskScore = this.computeWeightedRisk(factors);

    let predictedHealth: ProjectHealthStatus;
    let confidence: number;

    if (riskScore < 0.3) {
      predictedHealth = 'ON_TRACK';
      confidence = 1 - riskScore;
    } else if (riskScore < 0.6) {
      predictedHealth = 'AT_RISK';
      confidence = 0.7;
    } else {
      predictedHealth = 'OFF_TRACK';
      confidence = riskScore;
    }

    // Store prediction
    const prediction = await prisma.projectHealthPrediction.create({
      data: {
        tenantId,
        projectId,
        predictedHealth,
        confidence,
        predictedDate: addDays(new Date(), 14),
        factors,
      },
    });

    return prediction;
  }

  private calculateRiskFactors(metrics: ProjectMetrics): RiskFactors {
    return {
      overdueTaskRatio: metrics.overdueTasks / Math.max(metrics.totalTasks, 1),
      milestoneSlippage: this.calculateMilestoneSlippage(metrics.milestones),
      taskVelocityDecline: this.calculateVelocityTrend(metrics.velocityHistory),
      teamEngagement: 1 - this.calculateTeamActivity(metrics.recentActivity),
      scopeCreep: this.calculateScopeCreep(metrics.taskAdditions, metrics.originalTaskCount),
      clientEngagement: 1 - this.calculateClientEngagement(metrics.clientMeetings),
    };
  }

  // Weekly job to validate predictions
  async validatePredictions(): Promise<void> {
    const predictions = await prisma.projectHealthPrediction.findMany({
      where: {
        predictedDate: { lte: new Date() },
        actualHealth: null,
      },
      include: { project: true },
    });

    for (const prediction of predictions) {
      await prisma.projectHealthPrediction.update({
        where: { id: prediction.id },
        data: {
          actualHealth: prediction.project.healthStatus,
          wasAccurate: prediction.predictedHealth === prediction.project.healthStatus,
        },
      });
    }
  }
}
```

#### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/projects/:id/ai/health-prediction` | GET | Get current health prediction |
| `/api/projects/:id/ai/health-prediction` | POST | Generate new prediction |
| `/api/projects/ai/at-risk` | GET | List all projects predicted to be at risk |

#### UI Component

```typescript
// HealthPredictionCard.tsx
export function HealthPredictionCard({ projectId }: Props) {
  const { data: prediction } = useHealthPrediction(projectId);

  if (!prediction) return null;

  const healthColors = {
    ON_TRACK: 'bg-green-100 text-green-800',
    AT_RISK: 'bg-yellow-100 text-yellow-800',
    OFF_TRACK: 'bg-red-100 text-red-800',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span>🔮 Health Prediction</span>
          <Badge variant="outline">{Math.round(prediction.confidence * 100)}% confidence</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className={`p-3 rounded-lg ${healthColors[prediction.predictedHealth]}`}>
          <p className="font-semibold">
            Predicted: {prediction.predictedHealth.replace('_', ' ')}
          </p>
          <p className="text-sm">
            in 2 weeks ({formatDate(prediction.predictedDate)})
          </p>
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium mb-2">Risk Factors:</p>
          {Object.entries(prediction.factors)
            .filter(([_, value]) => value > 0.3)
            .map(([factor, value]) => (
              <div key={factor} className="flex items-center gap-2 text-sm">
                <div className="w-24 text-muted-foreground">{formatFactor(factor)}</div>
                <div className="flex-1">
                  <Progress value={value * 100} className="h-2" />
                </div>
                <div className="w-12 text-right">{Math.round(value * 100)}%</div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 2.2 AI Duration Estimation

**Goal:** Estimate realistic task durations based on historical data.

#### Database Changes

```prisma
model Task {
  // ... existing fields

  // NEW: Time tracking for AI estimation
  estimatedHours    Float?
  actualHours       Float?
  aiEstimatedHours  Float?    // AI-suggested estimate
  aiEstimateAccepted Boolean? // Did user accept AI estimate?
}

model TaskDurationLearning {
  id              Int       @id @default(autoincrement())
  tenantId        String

  // Task characteristics
  taskType        String?   // Derived from title/description
  complexity      String?   // low/medium/high
  hasSubtasks     Boolean
  teamSize        Int

  // Outcomes
  estimatedHours  Float
  actualHours     Float
  accuracy        Float     // estimatedHours / actualHours

  createdAt       DateTime  @default(now())

  @@index([tenantId, taskType])
}
```

#### Service Implementation

```typescript
// pmo/apps/api/src/services/duration-estimator.service.ts

export class DurationEstimatorService {
  async estimateTaskDuration(
    task: { title: string; description?: string; priority: string },
    context: { tenantId: string; projectType?: string }
  ): Promise<DurationEstimate> {
    // 1. Classify task type and complexity
    const classification = await this.classifyTask(task);

    // 2. Look up historical data
    const historicalData = await prisma.taskDurationLearning.findMany({
      where: {
        tenantId: context.tenantId,
        taskType: classification.type,
        complexity: classification.complexity,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // 3. Calculate estimate
    let estimatedHours: number;
    let confidence: number;

    if (historicalData.length >= 5) {
      // Use historical average with outlier removal
      const hours = historicalData.map(d => d.actualHours);
      estimatedHours = this.trimmedMean(hours);
      confidence = Math.min(0.9, 0.5 + historicalData.length * 0.02);
    } else {
      // Fall back to AI estimation
      const aiEstimate = await this.getAIEstimate(task, context);
      estimatedHours = aiEstimate.hours;
      confidence = 0.6;
    }

    // Apply priority multiplier
    const priorityMultipliers = { P1: 0.8, P2: 1.0, P3: 1.1, P4: 1.2 };
    estimatedHours *= priorityMultipliers[task.priority] || 1.0;

    return {
      estimatedHours: Math.round(estimatedHours * 10) / 10,
      confidence,
      basedOn: historicalData.length >= 5 ? 'historical' : 'ai',
      similarTaskCount: historicalData.length,
      classification,
    };
  }

  private async classifyTask(task: { title: string; description?: string }) {
    const prompt = `Classify this task:
Title: ${task.title}
Description: ${task.description || 'None'}

Return JSON:
{
  "type": "development|design|testing|documentation|research|meeting|review|deployment|other",
  "complexity": "low|medium|high",
  "estimatedHours": <number based on industry standards>
}`;

    const response = await llmService.complete(prompt, {
      maxTokens: 100,
      temperature: 0.1,
    });

    return JSON.parse(response.content);
  }
}
```

#### UI Integration

```typescript
// In TaskForm.tsx, add AI estimate suggestion
function TaskForm({ onSubmit, projectId }) {
  const [title, setTitle] = useState('');
  const [aiEstimate, setAiEstimate] = useState<DurationEstimate | null>(null);

  // Debounced AI estimation
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (title.length > 10) {
        const estimate = await estimateDuration({ title, description });
        setAiEstimate(estimate);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [title, description]);

  return (
    <form>
      <Input label="Title" value={title} onChange={setTitle} />

      <div className="flex items-center gap-4">
        <Input
          label="Estimated Hours"
          type="number"
          value={estimatedHours}
          onChange={setEstimatedHours}
        />

        {aiEstimate && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              ✨ AI suggests: {aiEstimate.estimatedHours}h
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEstimatedHours(aiEstimate.estimatedHours)}
            >
              Apply
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}
```

### 2.3 Risk Detection from Meetings

**Goal:** Automatically extract and surface risks from meeting notes.

#### Service Implementation

```typescript
// pmo/apps/api/src/services/risk-extractor.service.ts

export class RiskExtractorService {
  async extractRisksFromMeeting(
    meetingId: number,
    tenantId: string
  ): Promise<ExtractedRisk[]> {
    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { project: true },
    });

    if (!meeting?.notes) return [];

    const prompt = `Analyze these meeting notes and extract any risks, blockers, or concerns.

MEETING: ${meeting.title}
DATE: ${meeting.date}
PROJECT: ${meeting.project?.name || 'Unknown'}

NOTES:
${meeting.notes}

Extract risks in this JSON format:
{
  "risks": [
    {
      "title": "Brief risk title",
      "description": "Detailed description",
      "severity": "low|medium|high|critical",
      "category": "timeline|budget|scope|resource|technical|external",
      "suggestedMitigation": "Recommended action",
      "relatedQuote": "Exact quote from notes"
    }
  ]
}`;

    const response = await llmService.complete(prompt, {
      maxTokens: 800,
      temperature: 0.2,
    });

    const { risks } = JSON.parse(response.content);

    // Store extracted risks
    for (const risk of risks) {
      await prisma.projectRisk.create({
        data: {
          tenantId,
          projectId: meeting.projectId,
          sourceType: 'MEETING',
          sourceId: meetingId,
          ...risk,
          status: 'IDENTIFIED',
        },
      });
    }

    return risks;
  }
}
```

---

## Phase 3: Automation & Notifications (Sprint 5-6)

### 3.1 Stakeholder Digest Emails

**Goal:** Auto-generate and send personalized status digests to stakeholders.

#### Database Changes

```prisma
model ProjectDigestConfig {
  id              Int       @id @default(autoincrement())
  tenantId        String
  projectId       Int
  project         Project   @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // Recipients
  recipientType   DigestRecipientType  // OWNER, TEAM, STAKEHOLDER, CUSTOM
  customEmails    String[]

  // Schedule
  frequency       DigestFrequency      // DAILY, WEEKLY, BIWEEKLY, MONTHLY
  dayOfWeek       Int?                 // 0-6 for weekly
  dayOfMonth      Int?                 // 1-31 for monthly
  timeOfDay       String               // "09:00"
  timezone        String               // "America/New_York"

  // Content
  detailLevel     DigestDetailLevel    // EXECUTIVE, STANDARD, DETAILED
  includeSections String[]             // ["summary", "tasks", "milestones", "risks", "timeline"]

  isActive        Boolean   @default(true)
  lastSentAt      DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@unique([projectId, recipientType])
}

enum DigestRecipientType {
  OWNER
  TEAM
  STAKEHOLDER
  CUSTOM
}

enum DigestFrequency {
  DAILY
  WEEKLY
  BIWEEKLY
  MONTHLY
}

enum DigestDetailLevel {
  EXECUTIVE    // 2-3 sentences + key metrics
  STANDARD     // Full summary + metrics + highlights
  DETAILED     // Everything including task lists
}
```

#### Service Implementation

```typescript
// pmo/apps/api/src/services/digest.service.ts

export class DigestService {
  async generateDigest(
    projectId: number,
    tenantId: string,
    config: DigestConfig
  ): Promise<DigestContent> {
    const [project, status, prediction] = await Promise.all([
      projectService.getById(projectId, tenantId),
      projectStatusService.getStatusSnapshot(projectId, tenantId),
      healthPredictorService.predictHealth(projectId, tenantId),
    ]);

    const sections: DigestSection[] = [];

    // Executive summary (always included)
    const summary = await this.generateExecutiveSummary(project, status, prediction);
    sections.push({ type: 'summary', content: summary });

    // Conditional sections based on config
    if (config.includeSections.includes('metrics')) {
      sections.push({
        type: 'metrics',
        content: this.formatMetrics(status),
      });
    }

    if (config.includeSections.includes('tasks') && config.detailLevel !== 'EXECUTIVE') {
      sections.push({
        type: 'tasks',
        content: this.formatTaskHighlights(status.tasks),
      });
    }

    if (config.includeSections.includes('risks')) {
      sections.push({
        type: 'risks',
        content: await this.formatRisks(projectId, tenantId),
      });
    }

    return {
      subject: this.generateSubject(project, status),
      sections,
      generatedAt: new Date(),
    };
  }

  async sendDigest(digestId: number): Promise<void> {
    const config = await prisma.projectDigestConfig.findUnique({
      where: { id: digestId },
      include: { project: true },
    });

    const content = await this.generateDigest(
      config.projectId,
      config.tenantId,
      config
    );

    const recipients = await this.resolveRecipients(config);
    const html = this.renderDigestEmail(content, config);

    await emailService.sendBulk({
      recipients,
      subject: content.subject,
      html,
    });

    await prisma.projectDigestConfig.update({
      where: { id: digestId },
      data: { lastSentAt: new Date() },
    });
  }

  private generateSubject(project: Project, status: StatusSnapshot): string {
    const healthEmoji = {
      ON_TRACK: '🟢',
      AT_RISK: '🟡',
      OFF_TRACK: '🔴',
    }[project.healthStatus];

    return `${healthEmoji} ${project.name} - Weekly Status (${status.completionRate}% complete)`;
  }
}
```

#### Scheduled Job

```typescript
// pmo/apps/api/src/jobs/digest.job.ts

export async function processDigestQueue(): Promise<void> {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();
  const currentDate = now.getDate();

  const dueDigests = await prisma.projectDigestConfig.findMany({
    where: {
      isActive: true,
      OR: [
        // Daily digests
        { frequency: 'DAILY' },
        // Weekly digests on matching day
        { frequency: 'WEEKLY', dayOfWeek: currentDay },
        // Biweekly (every other week)
        { frequency: 'BIWEEKLY', dayOfWeek: currentDay },
        // Monthly on matching date
        { frequency: 'MONTHLY', dayOfMonth: currentDate },
      ],
    },
  });

  for (const config of dueDigests) {
    const [configHour] = config.timeOfDay.split(':').map(Number);

    // Check if it's the right hour in the config's timezone
    if (isCorrectHourInTimezone(configHour, config.timezone, now)) {
      await digestQueue.add('send-digest', { digestId: config.id });
    }
  }
}
```

### 3.2 Smart Task Creation from Chat

**Goal:** Allow users to create tasks through natural language in the Project Assistant.

#### Intent Handler

```typescript
// In project.handler.ts

async function handleTaskCreateIntent(
  message: string,
  context: ProjectContext
): Promise<BotResponse> {
  // Extract task details from natural language
  const extraction = await extractTaskDetails(message);

  if (!extraction.title) {
    return {
      content: "I can help you create a task. What should the task be called?",
      expectingInput: 'task_title',
    };
  }

  // Create preview
  const preview = {
    title: extraction.title,
    description: extraction.description,
    priority: extraction.priority || 'P3',
    dueDate: extraction.dueDate,
    assignee: extraction.assignee,
  };

  return {
    content: `I'll create this task:\n\n**${preview.title}**\n${preview.description || ''}\n\nPriority: ${preview.priority}\nDue: ${preview.dueDate ? formatDate(preview.dueDate) : 'Not set'}`,
    suggestedActions: [
      {
        label: 'Create task',
        action: 'confirmTaskCreate',
        payload: preview,
      },
      { label: 'Edit details', action: 'editTaskDetails', payload: preview },
      { label: 'Cancel', action: 'cancel' },
    ],
  };
}

async function extractTaskDetails(message: string): Promise<TaskExtraction> {
  const prompt = `Extract task details from this request:
"${message}"

Return JSON:
{
  "title": "Task title (required)",
  "description": "Detailed description (optional)",
  "priority": "P1|P2|P3|P4 (optional, default P3)",
  "dueDate": "ISO date string if mentioned (optional)",
  "assignee": "Name if mentioned (optional)"
}`;

  const response = await llmService.complete(prompt, {
    maxTokens: 200,
    temperature: 0.1,
  });

  return JSON.parse(response.content);
}
```

### 3.3 Webhook Events for Project Updates

**Goal:** Extend webhook system to dispatch project-related events.

#### Event Definitions

```typescript
// pmo/apps/api/src/modules/chatbot/webhooks/webhook.events.ts

export const PROJECT_WEBHOOK_EVENTS = {
  // Project lifecycle
  'project.created': 'When a new project is created',
  'project.updated': 'When project details are updated',
  'project.status_changed': 'When project status changes',
  'project.health_changed': 'When project health status changes',
  'project.completed': 'When project is marked complete',

  // Tasks
  'task.created': 'When a new task is created',
  'task.completed': 'When a task is marked done',
  'task.overdue': 'When a task becomes overdue',
  'task.blocked': 'When a task is blocked',

  // Milestones
  'milestone.approaching': 'When milestone is within 7 days',
  'milestone.completed': 'When milestone is completed',
  'milestone.missed': 'When milestone due date passes',

  // AI Events
  'ai.health_warning': 'When AI predicts health decline',
  'ai.risk_detected': 'When AI extracts a risk from meeting',
  'ai.summary_generated': 'When AI generates status summary',
};
```

---

## Phase 4: Advanced Features (Sprint 7-8)

### 4.1 Project Similarity & Lessons Learned

**Goal:** Find similar past projects for benchmarking and knowledge reuse.

#### Service Implementation

```typescript
// pmo/apps/api/src/services/project-similarity.service.ts

export class ProjectSimilarityService {
  async findSimilarProjects(
    projectId: number,
    tenantId: string,
    options: { limit?: number } = {}
  ): Promise<SimilarProject[]> {
    const project = await projectService.getById(projectId, tenantId);

    // Get project characteristics for embedding
    const embedding = await this.generateProjectEmbedding(project);

    // Find similar completed projects
    const completedProjects = await prisma.project.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        id: { not: projectId },
      },
      include: {
        tasks: true,
        milestones: true,
      },
    });

    // Calculate similarity scores
    const similarities = await Promise.all(
      completedProjects.map(async (p) => {
        const pEmbedding = await this.generateProjectEmbedding(p);
        const score = this.cosineSimilarity(embedding, pEmbedding);
        return { project: p, score };
      })
    );

    // Sort and limit
    return similarities
      .filter(s => s.score > 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, options.limit || 5)
      .map(s => ({
        ...s.project,
        similarityScore: s.score,
        insights: this.extractInsights(s.project),
      }));
  }

  async generateLessonsLearned(projectId: number, tenantId: string): Promise<LessonsLearned> {
    const [project, tasks, milestones, meetings] = await Promise.all([
      projectService.getById(projectId, tenantId),
      taskService.getByProject(projectId, tenantId),
      milestoneService.getByProject(projectId, tenantId),
      meetingService.getByProject(projectId, tenantId),
    ]);

    const prompt = `Generate a lessons learned document for this completed project.

PROJECT: ${project.name}
DURATION: ${daysBetween(project.startDate, project.endDate)} days
FINAL STATUS: ${project.status}

TASK METRICS:
- Total tasks: ${tasks.length}
- Completed on time: ${tasks.filter(t => !isOverdue(t)).length}
- Overdue completions: ${tasks.filter(t => isOverdue(t)).length}

MILESTONE PERFORMANCE:
${milestones.map(m => `- ${m.name}: ${m.status} (${daysVariance(m.dueDate, m.completedAt)})`).join('\n')}

KEY MEETINGS & DECISIONS:
${meetings.slice(-10).map(m => `- ${m.title}: ${m.summary || 'No summary'}`).join('\n')}

Generate a structured lessons learned document with:
1. What went well (3-5 points)
2. What could be improved (3-5 points)
3. Key recommendations for similar projects
4. Reusable templates or processes identified`;

    const response = await llmService.complete(prompt, {
      maxTokens: 1000,
      temperature: 0.3,
    });

    return {
      content: response.content,
      generatedAt: new Date(),
      metrics: {
        duration: daysBetween(project.startDate, project.endDate),
        taskCompletionRate: tasks.filter(t => t.status === 'DONE').length / tasks.length,
        milestoneOnTimeRate: milestones.filter(m => !isOverdue(m)).length / milestones.length,
      },
    };
  }
}
```

### 4.2 Portfolio Health Dashboard

**Goal:** Cross-project view of all project health and predictions.

#### API Endpoint

```typescript
// pmo/apps/api/src/routes/portfolio.routes.ts

router.get('/health', requireAuth, async (req, res) => {
  const tenantId = getTenantId(req);

  const [projects, predictions] = await Promise.all([
    prisma.project.findMany({
      where: {
        tenantId,
        status: { in: ['PLANNING', 'IN_PROGRESS', 'ON_HOLD'] },
      },
      include: {
        account: { select: { name: true } },
        _count: { select: { tasks: true } },
      },
    }),
    prisma.projectHealthPrediction.findMany({
      where: {
        tenantId,
        predictedDate: { gte: new Date() },
      },
      orderBy: { predictedDate: 'asc' },
      distinct: ['projectId'],
    }),
  ]);

  const predictionMap = new Map(predictions.map(p => [p.projectId, p]));

  const portfolio = projects.map(project => ({
    id: project.id,
    name: project.name,
    account: project.account?.name,
    status: project.status,
    healthStatus: project.healthStatus,
    taskCount: project._count.tasks,
    prediction: predictionMap.get(project.id),
  }));

  const summary = {
    total: projects.length,
    byHealth: {
      ON_TRACK: projects.filter(p => p.healthStatus === 'ON_TRACK').length,
      AT_RISK: projects.filter(p => p.healthStatus === 'AT_RISK').length,
      OFF_TRACK: projects.filter(p => p.healthStatus === 'OFF_TRACK').length,
    },
    predictedAtRisk: predictions.filter(p =>
      p.predictedHealth === 'AT_RISK' || p.predictedHealth === 'OFF_TRACK'
    ).length,
  };

  res.json({ data: { portfolio, summary } });
});
```

#### UI Page

```typescript
// pmo/apps/web/src/pages/projects/PortfolioHealthPage.tsx

export function PortfolioHealthPage() {
  const { data } = usePortfolioHealth();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Portfolio Health</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-bold">{data?.summary.total}</div>
            <div className="text-muted-foreground">Active Projects</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-green-700">
              {data?.summary.byHealth.ON_TRACK}
            </div>
            <div className="text-green-600">On Track</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-yellow-700">
              {data?.summary.byHealth.AT_RISK}
            </div>
            <div className="text-yellow-600">At Risk</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-red-700">
              {data?.summary.predictedAtRisk}
            </div>
            <div className="text-red-600">🔮 Predicted At Risk</div>
          </CardContent>
        </Card>
      </div>

      {/* Project Grid */}
      <div className="grid gap-4">
        {data?.portfolio.map(project => (
          <ProjectHealthRow key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}
```

---

## Summary: Deliverables by Phase

| Phase | Sprint | Deliverables |
|-------|--------|--------------|
| **1: Foundation** | 1-2 | Project intents, Assistant UI, Status summaries, Template auto-apply |
| **2: Predictive** | 3-4 | Health predictor, Duration estimation, Risk extraction |
| **3: Automation** | 5-6 | Digest emails, Chat task creation, Webhook events |
| **4: Advanced** | 7-8 | Similarity matching, Lessons learned, Portfolio dashboard |

---

## Technical Requirements

### Dependencies to Add

```json
{
  "dependencies": {
    "node-cron": "^3.0.3",        // Scheduled jobs
    "handlebars": "^4.7.8",       // Email templates
    "@sendgrid/mail": "^8.1.0"    // Email delivery (or nodemailer)
  }
}
```

### Environment Variables

```bash
# Email (for digests)
SENDGRID_API_KEY="SG.xxx"
EMAIL_FROM="projects@yourcompany.com"

# Feature flags
ENABLE_PROJECT_ASSISTANT=true
ENABLE_HEALTH_PREDICTIONS=true
ENABLE_DIGEST_EMAILS=true
```

### Database Migrations

```bash
# Phase 1
npx prisma migrate dev --name add_project_intents
npx prisma migrate dev --name add_conversation_project_link

# Phase 2
npx prisma migrate dev --name add_health_predictions
npx prisma migrate dev --name add_task_time_tracking

# Phase 3
npx prisma migrate dev --name add_digest_config

# Phase 4
npx prisma migrate dev --name add_lessons_learned
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Assistant adoption | 50% of users | Weekly active users / total users |
| Status summary usage | 80% of projects | Projects with AI summaries / total |
| Prediction accuracy | >75% | Correct predictions / total predictions |
| Time saved | 2 hrs/week/PM | Survey + before/after comparison |
| Digest open rate | >40% | Email analytics |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| AI costs escalate | Implement usage caps, use GPT-4o-mini, cache responses |
| Predictions inaccurate | Start with rule-based, add ML gradually, validate continuously |
| User adoption low | Prominent UI placement, default-on features, training materials |
| Email deliverability | Use SendGrid/established provider, SPF/DKIM setup |

---

## Next Steps

1. **Review & Approve** this plan
2. **Create feature branch** for Phase 1 development
3. **Set up AI monitoring** for cost tracking from day 1
4. **Design review** for Assistant UI components
5. **Begin Sprint 1** with intent classification and Assistant UI
