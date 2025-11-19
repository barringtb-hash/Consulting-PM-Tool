import {
  AiMaturity,
  CompanySize,
  MilestoneStatus,
  PrismaClient,
  Priority,
  ProjectStatus,
  TaskStatus,
} from '@prisma/client';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  const sqlitePath = path.resolve(currentDir, 'dev.db');
  process.env.DATABASE_URL = `file:${sqlitePath}`;
}

const prisma = new PrismaClient();

const users = [
  {
    name: 'Avery Chen',
    email: 'avery.chen@pmo.test',
    passwordHash: 'demo-password-hash',
    timezone: 'America/Chicago',
  },
  {
    name: 'Priya Desai',
    email: 'priya.desai@pmo.test',
    passwordHash: 'demo-password-hash',
    timezone: 'America/New_York',
  },
  {
    name: 'Marco Silva',
    email: 'marco.silva@pmo.test',
    passwordHash: 'demo-password-hash',
    timezone: 'America/Los_Angeles',
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
      },
    ],
  },
];

async function main() {
  const userMap = new Map<string, number>();
  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        name: userData.name,
        passwordHash: userData.passwordHash,
        timezone: userData.timezone,
      },
      create: {
        name: userData.name,
        email: userData.email,
        passwordHash: userData.passwordHash,
        timezone: userData.timezone,
      },
    });
    userMap.set(user.email, user.id);
  }

  const clientMap = new Map<string, number>();
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
          },
        });

    const milestoneMap = new Map<string, number>();

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
        await upsertTask({
          projectId: project.id,
          taskSeed,
          ownerId: taskOwnerId,
          milestoneId: milestone.id,
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

      await upsertTask({
        projectId: project.id,
        taskSeed,
        ownerId: taskOwnerId,
        milestoneId,
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
  };
  ownerId: number;
  milestoneId?: number;
};

async function upsertTask({
  projectId,
  taskSeed,
  ownerId,
  milestoneId,
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
