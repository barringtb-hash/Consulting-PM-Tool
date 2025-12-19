/**
 * Enable Monitoring Assistant for Default Tenant
 *
 * This script enables the monitoring-assistant module for the default tenant.
 * Run with: npx ts-node src/scripts/enable-monitoring-assistant.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Enabling Monitoring Assistant for default tenant...\n');

  // First, find the default tenant
  const tenant = await prisma.tenant.findFirst({
    where: { slug: 'default' },
  });

  if (!tenant) {
    console.error('Error: Default tenant not found. Please run the seed script first.');
    process.exit(1);
  }

  console.log(`Found tenant: ${tenant.name} (ID: ${tenant.id})`);

  // Check if the config already exists
  const existing = await prisma.tenantModuleConfig.findFirst({
    where: {
      tenantId: tenant.id,
      moduleId: 'monitoring-assistant',
    },
  });

  if (existing) {
    if (existing.enabled) {
      console.log('\nMonitoring Assistant is already enabled for this tenant.');
    } else {
      // Update to enable
      await prisma.tenantModuleConfig.update({
        where: { id: existing.id },
        data: { enabled: true },
      });
      console.log('\nMonitoring Assistant has been enabled for this tenant.');
    }
  } else {
    // Create new config
    await prisma.tenantModuleConfig.create({
      data: {
        tenantId: tenant.id,
        moduleId: 'monitoring-assistant',
        enabled: true,
        settings: {
          maxTokensPerResponse: 2000,
          conversationHistoryLimit: 50,
          enableRecommendations: true,
          enableDiagnosis: true,
        },
      },
    });
    console.log('\nMonitoring Assistant has been enabled for this tenant.');
  }

  // Verify the setting
  const config = await prisma.tenantModuleConfig.findFirst({
    where: {
      tenantId: tenant.id,
      moduleId: 'monitoring-assistant',
    },
  });

  console.log('\nCurrent Configuration:');
  console.log(JSON.stringify(config, null, 2));

  console.log('\n✅ Done! The Monitoring Assistant is now available at /operations/assistant');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
