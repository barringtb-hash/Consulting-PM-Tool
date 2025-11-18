import bcrypt from 'bcrypt';

import { AiMaturity, CompanySize, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultUser = {
  name: 'Demo User',
  email: 'demo@pmo.test',
  password: 'password123',
  timezone: 'UTC',
};

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

async function main() {
  const passwordHash = await bcrypt.hash(defaultUser.password, 10);

  await prisma.user.upsert({
    where: { email: defaultUser.email },
    update: {
      name: defaultUser.name,
      passwordHash,
      timezone: defaultUser.timezone,
    },
    create: {
      name: defaultUser.name,
      email: defaultUser.email,
      passwordHash,
      timezone: defaultUser.timezone,
    },
  });

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
}

main()
  .catch((error) => {
    console.error('Seeding failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
