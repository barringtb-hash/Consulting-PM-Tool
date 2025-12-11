/**
 * Migration Script: Single-Tenant to Multi-Tenant
 *
 * This script migrates existing data from the single-tenant structure
 * to the new multi-tenant CRM structure.
 *
 * IMPORTANT: Run this script AFTER applying the new schema migration.
 *
 * Usage:
 *   npx ts-node prisma/migrations-scripts/migrate-to-multitenant.ts
 *
 * What this script does:
 * 1. Creates a default tenant for existing data
 * 2. Associates existing users with the default tenant
 * 3. Creates default pipeline for the tenant
 * 4. Migrates Client -> Account (if applicable)
 * 5. Creates TenantModule entries based on PMO_MODULES env
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuration
const DEFAULT_TENANT = {
  name: process.env.DEFAULT_TENANT_NAME || 'Default Organization',
  slug: process.env.DEFAULT_TENANT_SLUG || 'default',
  plan: 'STARTER' as const,
};

// Default modules to enable
const DEFAULT_MODULES = ['pmo', 'crm', 'chatbot', 'documentAnalyzer'];

async function main() {
  console.log('Starting multi-tenant migration...\n');

  // 1. Check if migration already done
  const existingTenant = await prisma.tenant.findFirst({
    where: { slug: DEFAULT_TENANT.slug },
  });

  if (existingTenant) {
    console.log(`Default tenant "${DEFAULT_TENANT.slug}" already exists.`);
    console.log('If you want to re-run migration, delete the tenant first.');
    return;
  }

  // 2. Create default tenant
  console.log('Creating default tenant...');
  const tenant = await prisma.tenant.create({
    data: {
      name: DEFAULT_TENANT.name,
      slug: DEFAULT_TENANT.slug,
      plan: DEFAULT_TENANT.plan,
      status: 'ACTIVE',
    },
  });
  console.log(`  Created tenant: ${tenant.name} (${tenant.id})`);

  // 3. Create default branding
  console.log('Creating default branding...');
  await prisma.tenantBranding.create({
    data: {
      tenantId: tenant.id,
    },
  });
  console.log('  Created default branding');

  // 4. Create default pipeline
  console.log('Creating default pipeline...');
  const pipeline = await prisma.pipeline.create({
    data: {
      tenantId: tenant.id,
      name: 'Sales Pipeline',
      isDefault: true,
    },
  });

  // Create pipeline stages
  const stages = [
    { name: 'Lead', order: 1, probability: 10, type: 'OPEN', color: '#6B7280' },
    {
      name: 'Qualified',
      order: 2,
      probability: 25,
      type: 'OPEN',
      color: '#3B82F6',
    },
    {
      name: 'Proposal',
      order: 3,
      probability: 50,
      type: 'OPEN',
      color: '#8B5CF6',
    },
    {
      name: 'Negotiation',
      order: 4,
      probability: 75,
      type: 'OPEN',
      color: '#F59E0B',
    },
    {
      name: 'Closed Won',
      order: 5,
      probability: 100,
      type: 'WON',
      color: '#10B981',
    },
    {
      name: 'Closed Lost',
      order: 6,
      probability: 0,
      type: 'LOST',
      color: '#EF4444',
    },
  ];

  for (const stage of stages) {
    await prisma.pipelineStage.create({
      data: {
        pipelineId: pipeline.id,
        ...stage,
      },
    });
  }
  console.log(`  Created pipeline with ${stages.length} stages`);

  // 5. Associate existing users with tenant
  console.log('Associating existing users with tenant...');
  const users = await prisma.user.findMany();

  for (const user of users) {
    await prisma.tenantUser.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        role: user.role === 'ADMIN' ? 'OWNER' : 'MEMBER',
        acceptedAt: new Date(),
      },
    });
  }
  console.log(`  Associated ${users.length} users`);

  // 6. Enable default modules
  console.log('Enabling default modules...');
  for (const moduleId of DEFAULT_MODULES) {
    await prisma.tenantModule.create({
      data: {
        tenantId: tenant.id,
        moduleId,
        enabled: true,
        tier: 'BASIC',
      },
    });
  }
  console.log(`  Enabled ${DEFAULT_MODULES.length} modules`);

  // 7. Migrate Clients to Accounts (optional - only if schema includes Account)
  console.log('Checking for Client -> Account migration...');
  try {
    const clients = await prisma.client.findMany({
      include: { contacts: true },
    });

    if (clients.length > 0) {
      console.log(`  Found ${clients.length} clients to migrate`);

      for (const client of clients) {
        // Find owner (first admin user or first user)
        const owner = users.find((u) => u.role === 'ADMIN') || users[0];

        if (!owner) {
          console.log(`  Skipping client ${client.name} - no owner available`);
          continue;
        }

        // Create Account
        const account = await prisma.account.create({
          data: {
            tenantId: tenant.id,
            name: client.name,
            type: 'CUSTOMER',
            industry: client.industry,
            employeeCount: mapCompanySize(client.companySize),
            ownerId: owner.id,
            customFields: {
              legacyClientId: client.id,
              aiMaturity: client.aiMaturity,
              notes: client.notes,
            },
          },
        });

        // Migrate contacts
        for (const contact of client.contacts) {
          await prisma.cRMContact.create({
            data: {
              tenantId: tenant.id,
              accountId: account.id,
              firstName: contact.name.split(' ')[0] || contact.name,
              lastName: contact.name.split(' ').slice(1).join(' ') || '',
              email: contact.email,
              phone: contact.phone,
              jobTitle: contact.role,
              lifecycle: 'CUSTOMER',
              notes: contact.notes,
              ownerId: owner.id,
            },
          });
        }

        console.log(
          `  Migrated client: ${client.name} (${client.contacts.length} contacts)`,
        );
      }
    }
  } catch (error) {
    console.log('  Account model not yet available or migration error');
    console.log(
      '  Client -> Account migration will be done after schema update',
    );
  }

  console.log('\nMigration completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Update your .env with MULTI_TENANT_ENABLED=true');
  console.log(`2. Update DEFAULT_TENANT_SLUG=${tenant.slug}`);
  console.log('3. Restart your API server');
}

function mapCompanySize(size: string | null): string | undefined {
  const mapping: Record<string, string> = {
    MICRO: 'MICRO',
    SMALL: 'SMALL',
    MEDIUM: 'MEDIUM',
  };
  return size ? mapping[size] : undefined;
}

// Run migration
main()
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
