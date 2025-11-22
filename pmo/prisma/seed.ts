import bcrypt from 'bcryptjs';

import {
  AiMaturity,
  CompanySize,
  AssetType,
  MilestoneStatus,
  PrismaClient,
  Priority,
  ProjectStatus,
  ProjectHealthStatus,
  TaskStatus,
} from '@prisma/client';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    process.env.POSTGRES_PRISMA_URL ??
    'postgresql://postgres:postgres@localhost:5432/pmo';
}

const prisma = new PrismaClient();

type SeedUser = {
  name: string;
  email: string;
  password: string;
  timezone: string;
};

const users: SeedUser[] = [
  {
    name: 'Avery Chen',
    email: 'avery.chen@pmo.test',
    password: 'PmoDemo123!',
    timezone: 'America/Chicago',
  },
  {
    name: 'Priya Desai',
    email: 'priya.desai@pmo.test',
    password: 'PmoDemo123!',
    timezone: 'America/New_York',
  },
  {
    name: 'Marco Silva',
    email: 'marco.silva@pmo.test',
    password: 'PmoDemo123!',
    timezone: 'America/Los_Angeles',
  },
  {
    name: 'Testing Admin',
    email: 'admin@pmo.test',
    password: 'AdminDemo123!',
    timezone: 'UTC',
  },
];

const clients = [
  {
    name: 'Acme Manufacturing',
    industry: 'Industrial Manufacturing',
    companySize: CompanySize.MEDIUM,
    timezone: 'America/Chicago',
    aiMaturity: AiMaturity.LOW,
    notes:
      'Pilot predictive maintenance use cases with OT data cleanup underway.',
    contacts: [
      {
        name: 'Dana Patel',
        email: 'dana.patel@acme.test',
        role: 'Operations Director',
        phone: '+1-312-555-0101',
        notes: 'Executive sponsor focused on downtime reduction and safety.',
      },
      {
        name: 'Miguel Rodriguez',
        email: 'miguel.rodriguez@acme.test',
        role: 'Maintenance Manager',
        phone: '+1-312-555-0118',
        notes: 'Coordinates data pulls from the plant historian and CMMS.',
      },
    ],
  },
  {
    name: 'Brightside Health Group',
    industry: 'Healthcare',
    companySize: CompanySize.SMALL,
    timezone: 'America/Los_Angeles',
    aiMaturity: AiMaturity.MEDIUM,
    notes: 'Document automation and patient triage assistant under evaluation.',
    contacts: [
      {
        name: 'Sarah Kim',
        email: 'sarah.kim@brightside.test',
        role: 'Innovation Lead',
        phone: '+1-415-555-0199',
        notes: 'Owns the AI roadmap and stakeholder communications.',
      },
      {
        name: 'Omar Greene',
        email: 'omar.greene@brightside.test',
        role: 'IT Manager',
        phone: '+1-415-555-0142',
        notes: 'Security and access point; schedules integration reviews.',
      },
    ],
  },
];

const projectSeeds = [
  {
    name: 'Predictive Maintenance Rollout',
    clientName: 'Acme Manufacturing',
    ownerEmail: 'avery.chen@pmo.test',
    status: ProjectStatus.IN_PROGRESS,
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-08-30'),
    // M7 - Status & Reporting
    healthStatus: ProjectHealthStatus.AT_RISK,
    statusSummary:
      'Data pipeline delays due to pending historian credentials. Working to unblock access this week.',
    statusUpdatedAt: new Date('2024-02-10'),
    meetings: [
      {
        title: 'Operations Pulse Check',
        date: new Date('2024-02-05'),
        time: '09:00 AM CT',
        attendees: [
          'Avery Chen',
          'Dana Patel',
          'Miguel Rodriguez',
          'Priya Desai',
        ],
        notes: 'Reviewed historian export progress and CMMS cleanup blockers.',
        decisions:
          'Agreed to prioritize validation on the top three bottleneck assets.',
        risks:
          'Data pipeline delay if historian credentials are not provisioned.',
      },
      {
        title: 'Pilot Kickoff Prep',
        date: new Date('2024-02-15'),
        time: '02:00 PM CT',
        attendees: ['Avery Chen', 'Dana Patel', 'Plant 3 supervisors'],
        notes: 'Walked through pilot plan and asset readiness checklist.',
        decisions: 'Pilot scope limited to extrusion and packing lines.',
        risks: 'Need final sign-off on OT change window.',
      },
    ],
    milestones: [
      {
        name: 'Data Lake Readiness',
        description: 'Ensure historian exports and CMMS data are normalized.',
        status: MilestoneStatus.IN_PROGRESS,
        dueDate: new Date('2024-03-15'),
        tasks: [
          {
            title: 'Validate ETL transformations',
            description:
              'Review dbt jobs and confirm downtime tags are mapped.',
            status: TaskStatus.IN_PROGRESS,
            priority: Priority.P1,
            dueDate: new Date('2024-02-29'),
            sourceMeetingTitle: 'Operations Pulse Check',
          },
          {
            title: 'Finalize historian access policy',
            description: 'Security review for historian role-based access.',
            status: TaskStatus.BLOCKED,
            priority: Priority.P0,
            dueDate: new Date('2024-02-20'),
            ownerEmail: 'priya.desai@pmo.test',
          },
        ],
      },
      {
        name: 'Pilot Deployment',
        description: 'Deploy the predictive models to Plant 3 lines.',
        status: MilestoneStatus.NOT_STARTED,
        dueDate: new Date('2024-05-31'),
        tasks: [
          {
            title: 'Edge gateway sizing',
            description: 'Confirm memory footprint and redundancy plans.',
            status: TaskStatus.BACKLOG,
            priority: Priority.P1,
            sourceMeetingTitle: 'Pilot Kickoff Prep',
          },
        ],
      },
      {
        name: 'Executive Readout',
        description: 'Summarize KPI impact and next-phase budget ask.',
        status: MilestoneStatus.NOT_STARTED,
        dueDate: new Date('2024-07-15'),
        tasks: [],
      },
    ],
    tasks: [
      {
        title: 'Weekly ops sync',
        description: 'Standing meeting with plant ops and data team.',
        status: TaskStatus.DONE,
        priority: Priority.P2,
        sourceMeetingTitle: 'Operations Pulse Check',
      },
      {
        title: 'Model drift alerts',
        description: 'Design alert thresholds for pressure sensors.',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.P1,
        milestoneName: 'Pilot Deployment',
      },
    ],
  },
  {
    name: 'AI Intake Modernization',
    clientName: 'Brightside Health Group',
    ownerEmail: 'priya.desai@pmo.test',
    status: ProjectStatus.PLANNING,
    startDate: new Date('2024-02-01'),
    endDate: new Date('2024-06-15'),
    // M7 - Status & Reporting
    healthStatus: ProjectHealthStatus.ON_TRACK,
    statusSummary:
      'Care team interviews completed. Moving forward with journey mapping and prototype planning.',
    statusUpdatedAt: new Date('2024-02-08'),
    meetings: [
      {
        title: 'Care Team Interviews Readout',
        date: new Date('2024-02-08'),
        time: '11:30 AM PT',
        attendees: ['Priya Desai', 'Sarah Kim', 'Omar Greene', 'Marco Silva'],
        notes:
          'Summarized interview insights and mapped automation candidates.',
        decisions: 'Prototype should cover referral intake and triage routing.',
        risks: 'Need anonymization plan for sample transcripts.',
      },
    ],
    milestones: [
      {
        name: 'Patient Journey Mapping',
        description: 'Map pain points from referral to onboarding.',
        status: MilestoneStatus.IN_PROGRESS,
        dueDate: new Date('2024-03-10'),
        tasks: [
          {
            title: 'Interview care coordinators',
            description: 'Capture manual steps and exception handling.',
            status: TaskStatus.IN_PROGRESS,
            priority: Priority.P1,
            dueDate: new Date('2024-02-26'),
            sourceMeetingTitle: 'Care Team Interviews Readout',
          },
          {
            title: 'Journey artifacts sign-off',
            description: 'Ensure legal approves anonymized data usage.',
            status: TaskStatus.BACKLOG,
            priority: Priority.P2,
            ownerEmail: 'marco.silva@pmo.test',
          },
        ],
      },
      {
        name: 'Automation Prototype',
        description: 'Prototype triage flows in the intake assistant.',
        status: MilestoneStatus.NOT_STARTED,
        dueDate: new Date('2024-04-25'),
        tasks: [],
      },
    ],
    tasks: [
      {
        title: 'Define success metrics',
        description: 'Agree on CSAT, handle time, and RN coverage goals.',
        status: TaskStatus.BACKLOG,
        priority: Priority.P0,
      },
      {
        title: 'Security questionnaire',
        description: 'Complete vendor diligence package.',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.P1,
        ownerEmail: 'marco.silva@pmo.test',
        milestoneName: 'Automation Prototype',
        sourceMeetingTitle: 'Care Team Interviews Readout',
      },
    ],
  },
];

const aiAssetSeeds = [
  {
    name: 'Discovery Workshop Prompt Kit',
    type: AssetType.PROMPT_TEMPLATE,
    description:
      'System and user prompt templates to summarize discovery calls with clients.',
    content: {
      systemPrompt:
        'You are an AI project analyst. Summarize discovery notes with risks, blockers, and next actions.',
      placeholders: ['client_context', 'meeting_notes', 'next_steps'],
    },
    tags: ['template', 'prompt', 'discovery'],
    isTemplate: true,
    createdByEmail: 'avery.chen@pmo.test',
  },
  {
    name: 'Guardrail - PHI Redaction',
    type: AssetType.GUARDRAIL,
    description:
      'Regex and policy snippets to prevent PHI leakage in chat transcripts and summaries.',
    content: {
      blockedPatterns: ['SSN', 'MRN', 'phone', 'address'],
      action: 'mask',
    },
    tags: ['guardrail', 'compliance', 'healthcare'],
    isTemplate: true,
    createdByEmail: 'priya.desai@pmo.test',
  },
  {
    name: 'Plant 3 Downtime Playbook',
    type: AssetType.WORKFLOW,
    clientName: 'Acme Manufacturing',
    projectNames: ['Predictive Maintenance Rollout'],
    description:
      'Workflow for triaging downtime anomalies on Plant 3 extrusion lines.',
    content: {
      steps: [
        'Collect 24h historian window with pressure/temperature tags',
        'Run anomaly notebook and attach plots',
        'Draft Slack update using maintenance template',
      ],
      outputs: ['notebook_link', 'slack_update'],
    },
    tags: ['workflow', 'maintenance', 'pilot'],
    createdByEmail: 'avery.chen@pmo.test',
  },
  {
    name: 'Intake Triage Evaluation Set',
    type: AssetType.EVALUATION,
    clientName: 'Brightside Health Group',
    projectNames: ['AI Intake Modernization'],
    description:
      'Sample referral transcripts and expected routing labels for triage quality checks.',
    content: {
      examples: [
        {
          transcript: 'Referral for oncology consult with urgent symptoms',
          label: 'urgent',
        },
        {
          transcript: 'New patient seeking therapist with Spanish fluency',
          label: 'standard',
        },
      ],
    },
    tags: ['evaluation', 'routing', 'healthcare'],
    createdByEmail: 'marco.silva@pmo.test',
  },
];

async function main() {
  const bcryptSaltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? '10');

  if (Number.isNaN(bcryptSaltRounds)) {
    throw new Error('BCRYPT_SALT_ROUNDS must be a number');
  }

  const userMap = new Map<string, number>();
  for (const userData of users) {
    const passwordHash = await bcrypt.hash(userData.password, bcryptSaltRounds);

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        name: userData.name,
        passwordHash,
        timezone: userData.timezone,
      },
      create: {
        name: userData.name,
        email: userData.email,
        passwordHash,
        timezone: userData.timezone,
      },
    });
    userMap.set(user.email, user.id);
  }

  const clientMap = new Map<string, number>();
  const projectMap = new Map<string, { id: number; clientId: number }>();
  for (const clientData of clients) {
    const existingClient = await prisma.client.findFirst({
      where: { name: clientData.name },
    });

    const client = existingClient
      ? await prisma.client.update({
          where: { id: existingClient.id },
          data: {
            industry: clientData.industry,
            companySize: clientData.companySize,
            timezone: clientData.timezone,
            aiMaturity: clientData.aiMaturity,
            notes: clientData.notes,
            archived: false,
          },
        })
      : await prisma.client.create({
          data: {
            name: clientData.name,
            industry: clientData.industry,
            companySize: clientData.companySize,
            timezone: clientData.timezone,
            aiMaturity: clientData.aiMaturity,
            notes: clientData.notes,
          },
        });

    clientMap.set(client.name, client.id);

    for (const contact of clientData.contacts) {
      await prisma.contact.upsert({
        where: {
          clientId_email: {
            clientId: client.id,
            email: contact.email,
          },
        },
        update: {
          name: contact.name,
          role: contact.role,
          phone: contact.phone,
          notes: contact.notes,
          archived: false,
        },
        create: {
          clientId: client.id,
          name: contact.name,
          email: contact.email,
          role: contact.role,
          phone: contact.phone,
          notes: contact.notes,
        },
      });
    }
  }

  for (const projectSeed of projectSeeds) {
    const clientId = clientMap.get(projectSeed.clientName);
    if (!clientId) {
      throw new Error(
        `Client ${projectSeed.clientName} not found during seeding.`,
      );
    }

    const ownerId = userMap.get(projectSeed.ownerEmail);
    if (!ownerId) {
      throw new Error(
        `Owner ${projectSeed.ownerEmail} not found during seeding.`,
      );
    }

    const existingProject = await prisma.project.findFirst({
      where: { name: projectSeed.name, clientId },
    });

    const project = existingProject
      ? await prisma.project.update({
          where: { id: existingProject.id },
          data: {
            ownerId,
            status: projectSeed.status,
            startDate: projectSeed.startDate,
            endDate: projectSeed.endDate,
            healthStatus: projectSeed.healthStatus,
            statusSummary: projectSeed.statusSummary,
            statusUpdatedAt: projectSeed.statusUpdatedAt,
          },
        })
      : await prisma.project.create({
          data: {
            name: projectSeed.name,
            clientId,
            ownerId,
            status: projectSeed.status,
            startDate: projectSeed.startDate,
            endDate: projectSeed.endDate,
            healthStatus: projectSeed.healthStatus,
            statusSummary: projectSeed.statusSummary,
            statusUpdatedAt: projectSeed.statusUpdatedAt,
          },
        });

    const milestoneMap = new Map<string, number>();
    const meetingMap = new Map<string, number>();
    const projectKey = `${projectSeed.clientName}::${projectSeed.name}`;
    projectMap.set(projectKey, { id: project.id, clientId });

    for (const meetingSeed of projectSeed.meetings ?? []) {
      const existingMeeting = await prisma.meeting.findFirst({
        where: {
          projectId: project.id,
          title: meetingSeed.title,
          date: meetingSeed.date,
        },
      });

      const meeting = existingMeeting
        ? await prisma.meeting.update({
            where: { id: existingMeeting.id },
            data: {
              time: meetingSeed.time,
              attendees: meetingSeed.attendees,
              notes: meetingSeed.notes,
              decisions: meetingSeed.decisions,
              risks: meetingSeed.risks,
            },
          })
        : await prisma.meeting.create({
            data: {
              projectId: project.id,
              title: meetingSeed.title,
              date: meetingSeed.date,
              time: meetingSeed.time,
              attendees: meetingSeed.attendees,
              notes: meetingSeed.notes,
              decisions: meetingSeed.decisions,
              risks: meetingSeed.risks,
            },
          });

      meetingMap.set(meeting.title, meeting.id);
    }

    for (const milestoneSeed of projectSeed.milestones) {
      const existingMilestone = await prisma.milestone.findFirst({
        where: { projectId: project.id, name: milestoneSeed.name },
      });

      const milestone = existingMilestone
        ? await prisma.milestone.update({
            where: { id: existingMilestone.id },
            data: {
              description: milestoneSeed.description,
              dueDate: milestoneSeed.dueDate,
              status: milestoneSeed.status,
            },
          })
        : await prisma.milestone.create({
            data: {
              projectId: project.id,
              name: milestoneSeed.name,
              description: milestoneSeed.description,
              dueDate: milestoneSeed.dueDate,
              status: milestoneSeed.status,
            },
          });

      milestoneMap.set(milestone.name, milestone.id);

      for (const taskSeed of milestoneSeed.tasks) {
        const resolvedOwnerEmail =
          taskSeed.ownerEmail ?? projectSeed.ownerEmail;
        const taskOwnerId = userMap.get(resolvedOwnerEmail);
        if (!taskOwnerId) {
          throw new Error(
            `Task owner ${resolvedOwnerEmail} not found during seeding.`,
          );
        }
        const sourceMeetingId = taskSeed.sourceMeetingTitle
          ? meetingMap.get(taskSeed.sourceMeetingTitle)
          : undefined;

        if (taskSeed.sourceMeetingTitle && !sourceMeetingId) {
          throw new Error(
            `Meeting ${taskSeed.sourceMeetingTitle} not found for project ${projectSeed.name}.`,
          );
        }

        await upsertTask({
          projectId: project.id,
          taskSeed,
          ownerId: taskOwnerId,
          milestoneId: milestone.id,
          sourceMeetingId,
        });
      }
    }

    for (const taskSeed of projectSeed.tasks) {
      const milestoneId = taskSeed.milestoneName
        ? milestoneMap.get(taskSeed.milestoneName)
        : undefined;

      const resolvedOwnerEmail = taskSeed.ownerEmail ?? projectSeed.ownerEmail;
      const taskOwnerId = userMap.get(resolvedOwnerEmail);
      if (!taskOwnerId) {
        throw new Error(
          `Task owner ${resolvedOwnerEmail} not found during seeding.`,
        );
      }

      const sourceMeetingId = taskSeed.sourceMeetingTitle
        ? meetingMap.get(taskSeed.sourceMeetingTitle)
        : undefined;

      if (taskSeed.sourceMeetingTitle && !sourceMeetingId) {
        throw new Error(
          `Meeting ${taskSeed.sourceMeetingTitle} not found for project ${projectSeed.name}.`,
        );
      }

      await upsertTask({
        projectId: project.id,
        taskSeed,
        ownerId: taskOwnerId,
        milestoneId,
        sourceMeetingId,
      });
    }
  }

  for (const assetSeed of aiAssetSeeds) {
    const clientId = assetSeed.clientName
      ? clientMap.get(assetSeed.clientName)
      : undefined;

    if (assetSeed.clientName && !clientId) {
      throw new Error(
        `Client ${assetSeed.clientName} not found for AI asset seeding.`,
      );
    }

    const createdById = assetSeed.createdByEmail
      ? userMap.get(assetSeed.createdByEmail)
      : undefined;

    if (assetSeed.createdByEmail && !createdById) {
      throw new Error(
        `Creator ${assetSeed.createdByEmail} not found for AI asset ${assetSeed.name}.`,
      );
    }

    const asset = await prisma.aIAsset.upsert({
      where: {
        name_clientId: {
          name: assetSeed.name,
          clientId: clientId ?? null,
        },
      },
      update: {
        type: assetSeed.type,
        description: assetSeed.description,
        content: assetSeed.content,
        tags: assetSeed.tags ?? [],
        isTemplate: assetSeed.isTemplate ?? false,
        clientId: clientId ?? null,
        createdById: createdById ?? null,
      },
      create: {
        name: assetSeed.name,
        type: assetSeed.type,
        description: assetSeed.description,
        content: assetSeed.content,
        tags: assetSeed.tags ?? [],
        isTemplate: assetSeed.isTemplate ?? false,
        clientId: clientId ?? undefined,
        createdById: createdById ?? undefined,
      },
    });

    for (const projectName of assetSeed.projectNames ?? []) {
      const projectKey = `${assetSeed.clientName}::${projectName}`;
      const project = projectMap.get(projectKey);

      if (!project) {
        throw new Error(
          `Project ${projectName} not found for client ${assetSeed.clientName} during AI asset linking.`,
        );
      }

      await prisma.projectAIAsset.upsert({
        where: {
          projectId_assetId: {
            projectId: project.id,
            assetId: asset.id,
          },
        },
        update: {
          notes: assetSeed.projectNotes ?? null,
        },
        create: {
          projectId: project.id,
          assetId: asset.id,
          notes: assetSeed.projectNotes,
        },
      });
    }
  }
}

type TaskSeedInput = {
  projectId: number;
  taskSeed: {
    title: string;
    description?: string;
    status: TaskStatus;
    priority: Priority;
    dueDate?: Date;
    ownerEmail?: string;
    milestoneName?: string;
    sourceMeetingTitle?: string;
  };
  ownerId: number;
  milestoneId?: number;
  sourceMeetingId?: number;
};

async function upsertTask({
  projectId,
  taskSeed,
  ownerId,
  milestoneId,
  sourceMeetingId,
}: TaskSeedInput) {
  const existingTask = await prisma.task.findFirst({
    where: { projectId, title: taskSeed.title },
  });

  const taskData = {
    ownerId,
    description: taskSeed.description,
    status: taskSeed.status,
    priority: taskSeed.priority,
    dueDate: taskSeed.dueDate,
    milestoneId: milestoneId ?? null,
    sourceMeetingId: sourceMeetingId ?? null,
  } as const;

  if (existingTask) {
    await prisma.task.update({
      where: { id: existingTask.id },
      data: taskData,
    });
  } else {
    await prisma.task.create({
      data: {
        projectId,
        ownerId,
        milestoneId: milestoneId ?? undefined,
        title: taskSeed.title,
        description: taskSeed.description,
        status: taskSeed.status,
        priority: taskSeed.priority,
        dueDate: taskSeed.dueDate,
        sourceMeetingId: sourceMeetingId ?? undefined,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error('Seeding failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
