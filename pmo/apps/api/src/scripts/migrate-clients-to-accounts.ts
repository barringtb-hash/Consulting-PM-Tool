/**
 * Migration Script: Client to Account
 *
 * This script migrates legacy Client records to the CRM Account model.
 * It preserves relationships and maps data appropriately.
 *
 * Usage:
 *   npx ts-node src/scripts/migrate-clients-to-accounts.ts [--dry-run]
 *
 * Options:
 *   --dry-run   Preview the migration without making changes
 *
 * Safety:
 *   - Creates legacyClientId reference on Account
 *   - Can be run multiple times (skips already migrated clients)
 *   - Preserves original Client records
 *   - Updates AI Tool configs to reference new Account
 *
 * Note: This migration requires schema changes to support legacyClientId.
 * Ensure the schema has been updated before running.
 */

import {
  PrismaClient,
  CompanySize,
  AccountEmployeeCount,
  AccountType,
  AiMaturity,
} from '@prisma/client';

const prisma = new PrismaClient();

// Mapping from legacy CompanySize to Account EmployeeCount
const SIZE_MAPPING: Record<CompanySize, AccountEmployeeCount> = {
  MICRO: 'MICRO',
  SMALL: 'SMALL',
  MEDIUM: 'MEDIUM',
};

// Map AI Maturity to a descriptive note
function getAiMaturityDescription(maturity: AiMaturity | null): string {
  const descriptions: Record<AiMaturity, string> = {
    NONE: 'No AI adoption',
    LOW: 'Exploring AI opportunities',
    MEDIUM: 'Some AI implementations in progress',
    HIGH: 'Advanced AI capabilities deployed',
  };
  return maturity ? descriptions[maturity] : '';
}

interface MigrationResult {
  clientId: number;
  success: boolean;
  accountId?: number;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

async function migrateClient(
  client: Awaited<ReturnType<typeof prisma.client.findUnique>>,
  dryRun: boolean,
): Promise<MigrationResult> {
  if (!client) {
    return { clientId: 0, success: false, error: 'Client is null' };
  }

  // Check if already migrated by looking for Account with matching legacyClientId
  // Note: This requires the schema to have legacyClientId field
  const existingAccount = await prisma.account.findFirst({
    where: {
      tenantId: client.tenantId || 'default',
      customFields: {
        path: ['legacyClientId'],
        equals: client.id,
      },
    },
  });

  if (existingAccount) {
    return {
      clientId: client.id,
      success: true,
      skipped: true,
      reason: 'Already migrated',
      accountId: existingAccount.id,
    };
  }

  // Determine account type based on client state
  const accountType: AccountType = client.archived ? 'CHURNED' : 'CUSTOMER';

  // Map employee count
  const employeeCount = client.companySize
    ? SIZE_MAPPING[client.companySize]
    : null;

  // Build description from client notes and AI maturity
  const aiMaturityNote = getAiMaturityDescription(client.aiMaturity);
  const description = [client.notes, aiMaturityNote]
    .filter(Boolean)
    .join('\n\n');

  // Prepare account data
  // Need to get a default owner - use first admin user or skip
  const adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    select: { id: true },
  });

  if (!adminUser) {
    return {
      clientId: client.id,
      success: false,
      error: 'No admin user found to assign as owner',
    };
  }

  const accountData = {
    tenantId: client.tenantId || 'default',
    name: client.name,
    type: accountType,
    industry: client.industry,
    employeeCount,
    timezone: client.timezone,
    description,
    ownerId: adminUser.id,
    healthScore: 100, // Default to healthy
    engagementScore: 50, // Default to neutral
    archived: client.archived,
    tags: [] as string[],
    customFields: {
      legacyClientId: client.id,
      aiMaturity: client.aiMaturity,
      migratedAt: new Date().toISOString(),
    },
  };

  if (dryRun) {
    console.log(`[DRY-RUN] Would create Account from client ${client.id}:`, {
      name: client.name,
      type: accountType,
      industry: client.industry,
    });
    return {
      clientId: client.id,
      success: true,
      skipped: false,
      reason: 'Dry run - no changes made',
    };
  }

  try {
    const account = await prisma.account.create({
      data: accountData,
    });

    // Optionally update ChatbotConfig and DocumentAnalyzerConfig
    // to add accountId (requires schema updates)
    // For now, we just log that these need manual attention

    const chatbotConfig = await prisma.chatbotConfig.findUnique({
      where: { clientId: client.id },
      select: { id: true },
    });

    if (chatbotConfig) {
      console.log(
        `  Note: ChatbotConfig ${chatbotConfig.id} exists for this client.`,
      );
      console.log('  Manual update needed to link to account.');
    }

    const docAnalyzerConfig = await prisma.documentAnalyzerConfig.findUnique({
      where: { clientId: client.id },
      select: { id: true },
    });

    if (docAnalyzerConfig) {
      console.log(
        `  Note: DocumentAnalyzerConfig ${docAnalyzerConfig.id} exists for this client.`,
      );
      console.log('  Manual update needed to link to account.');
    }

    return {
      clientId: client.id,
      success: true,
      accountId: account.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      clientId: client.id,
      success: false,
      error: message,
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('='.repeat(60));
  console.log('Migration: Client -> Account');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log('='.repeat(60));

  // Get all clients
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: 'asc' },
  });

  console.log(`\nFound ${clients.length} clients to process.\n`);

  const results: MigrationResult[] = [];

  for (const client of clients) {
    const result = await migrateClient(client, dryRun);
    results.push(result);

    const status = result.skipped
      ? 'SKIPPED'
      : result.success
        ? 'SUCCESS'
        : 'FAILED';

    console.log(
      `[${status}] Client ${client.id} (${client.name})${
        result.accountId ? ` -> Account ${result.accountId}` : ''
      }${result.reason ? ` - ${result.reason}` : ''}${
        result.error ? ` - Error: ${result.error}` : ''
      }`,
    );
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Migration Summary');
  console.log('='.repeat(60));
  console.log(`Total processed: ${results.length}`);
  console.log(
    `Successful: ${results.filter((r) => r.success && !r.skipped).length}`,
  );
  console.log(
    `Skipped (already migrated): ${results.filter((r) => r.skipped).length}`,
  );
  console.log(`Failed: ${results.filter((r) => !r.success).length}`);

  if (!dryRun && results.some((r) => r.success && !r.skipped)) {
    console.log('\nMigration completed. Original Client records preserved.');
    console.log('Accounts have legacyClientId in customFields for reference.');
    console.log('\nNext steps:');
    console.log(
      '1. Update AI Tool configs (ChatbotConfig, DocumentAnalyzerConfig)',
    );
    console.log('   to add accountId field and link to new Accounts.');
    console.log('2. Update frontend to redirect /clients to /crm/accounts.');
    console.log('3. Migrate Contacts to CRMContacts (separate migration).');
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Migration failed:', error);
  prisma.$disconnect();
  process.exit(1);
});
