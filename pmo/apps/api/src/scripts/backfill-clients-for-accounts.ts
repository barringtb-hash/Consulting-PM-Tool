/**
 * Migration Script: Backfill Clients for Existing Accounts
 *
 * This script creates legacy Client records for existing Account records
 * that don't already have a linked Client. This enables those Accounts
 * to use modules that depend on the Client model (e.g., Intake, Chatbot).
 *
 * Usage:
 *   npx ts-node src/scripts/backfill-clients-for-accounts.ts [--dry-run] [--tenant-id=<id>]
 *
 * Options:
 *   --dry-run         Preview the migration without making changes
 *   --tenant-id=<id>  Only process accounts for a specific tenant
 *
 * Safety:
 *   - Creates legacyClientId reference in Account.customFields
 *   - Can be run multiple times (skips accounts that already have legacyClientId)
 *   - Creates new Client records without modifying existing ones
 */

import {
  PrismaClient,
  CompanySize,
  AccountEmployeeCount,
} from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({
  adapter,
  log: ['error'],
});

async function cleanup() {
  await prisma.$disconnect();
  await pool.end();
}

// Mapping from Account EmployeeCount to legacy Client CompanySize
function mapEmployeeCountToCompanySize(
  employeeCount: AccountEmployeeCount | null,
): CompanySize | null {
  if (!employeeCount) return null;

  // Account: SOLO, MICRO, SMALL, MEDIUM, LARGE, ENTERPRISE
  // Client: MICRO, SMALL, MEDIUM
  switch (employeeCount) {
    case 'SOLO':
    case 'MICRO':
      return 'MICRO';
    case 'SMALL':
      return 'SMALL';
    case 'MEDIUM':
    case 'LARGE':
    case 'ENTERPRISE':
      return 'MEDIUM';
    default:
      return null;
  }
}

interface MigrationResult {
  accountId: number;
  accountName: string;
  success: boolean;
  clientId?: number;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

interface AccountWithCustomFields {
  id: number;
  tenantId: string;
  name: string;
  industry: string | null;
  website: string | null;
  employeeCount: AccountEmployeeCount | null;
  archived: boolean;
  customFields: Record<string, unknown> | null;
}

async function processAccount(
  account: AccountWithCustomFields,
  dryRun: boolean,
): Promise<MigrationResult> {
  // Check if account already has a legacyClientId
  const customFields = account.customFields || {};
  const existingClientId = customFields.legacyClientId as number | undefined;

  if (existingClientId) {
    // Verify the client still exists
    const existingClient = await prisma.client.findUnique({
      where: { id: existingClientId },
      select: { id: true },
    });

    if (existingClient) {
      return {
        accountId: account.id,
        accountName: account.name,
        success: true,
        skipped: true,
        reason: `Already linked to Client ${existingClientId}`,
        clientId: existingClientId,
      };
    }
    // Client was deleted - need to create a new one
    console.log(
      `  Note: Account ${account.id} references deleted Client ${existingClientId}. Creating new Client.`,
    );
  }

  // Prepare client data
  const clientData = {
    tenantId: account.tenantId,
    name: account.name,
    industry: account.industry,
    companySize: mapEmployeeCountToCompanySize(account.employeeCount),
    notes: account.website ? `Website: ${account.website}` : null,
    archived: account.archived,
  };

  if (dryRun) {
    console.log(
      `[DRY-RUN] Would create Client for Account ${account.id} (${account.name}):`,
    );
    console.log(`  - tenantId: ${clientData.tenantId}`);
    console.log(`  - name: ${clientData.name}`);
    console.log(`  - industry: ${clientData.industry || 'null'}`);
    console.log(`  - companySize: ${clientData.companySize || 'null'}`);
    return {
      accountId: account.id,
      accountName: account.name,
      success: true,
      skipped: false,
      reason: 'Dry run - no changes made',
    };
  }

  try {
    // Use a transaction to create Client and update Account atomically
    const result = await prisma.$transaction(async (tx) => {
      // Create the Client
      const client = await tx.client.create({
        data: clientData,
      });

      // Update Account's customFields with legacyClientId
      const updatedCustomFields = {
        ...customFields,
        legacyClientId: client.id,
        clientBackfilledAt: new Date().toISOString(),
      };

      await tx.account.update({
        where: { id: account.id },
        data: {
          customFields: updatedCustomFields,
        },
      });

      return client;
    });

    return {
      accountId: account.id,
      accountName: account.name,
      success: true,
      clientId: result.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      accountId: account.id,
      accountName: account.name,
      success: false,
      error: message,
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  // Parse tenant filter if provided
  const tenantArg = args.find((arg) => arg.startsWith('--tenant-id='));
  const tenantFilter = tenantArg ? tenantArg.split('=')[1] : undefined;

  console.log('='.repeat(60));
  console.log('Migration: Backfill Clients for Existing Accounts');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  if (tenantFilter) {
    console.log(`Tenant Filter: ${tenantFilter}`);
  }
  console.log('='.repeat(60));

  // Build where clause
  const whereClause: { tenantId?: string } = {};
  if (tenantFilter) {
    whereClause.tenantId = tenantFilter;
  }

  // Get all accounts
  const accounts = await prisma.account.findMany({
    where: whereClause,
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      tenantId: true,
      name: true,
      industry: true,
      website: true,
      employeeCount: true,
      archived: true,
      customFields: true,
    },
  });

  console.log(`\nFound ${accounts.length} accounts to process.\n`);

  if (accounts.length === 0) {
    console.log('No accounts found. Exiting.');
    await cleanup();
    return;
  }

  const results: MigrationResult[] = [];

  for (const account of accounts) {
    const result = await processAccount(
      account as AccountWithCustomFields,
      dryRun,
    );
    results.push(result);

    const status = result.skipped
      ? 'SKIPPED'
      : result.success
        ? 'SUCCESS'
        : 'FAILED';

    console.log(
      `[${status}] Account ${account.id} (${account.name})${
        result.clientId ? ` -> Client ${result.clientId}` : ''
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
    `Created new Clients: ${results.filter((r) => r.success && !r.skipped).length}`,
  );
  console.log(
    `Skipped (already linked): ${results.filter((r) => r.skipped).length}`,
  );
  console.log(`Failed: ${results.filter((r) => !r.success).length}`);

  if (!dryRun && results.some((r) => r.success && !r.skipped)) {
    console.log('\nBackfill completed successfully!');
    console.log(
      'Accounts now have legacyClientId in customFields for module compatibility.',
    );
    console.log('\nNext steps:');
    console.log(
      '1. Configure Intake, Chatbot, or other modules using the new Client records',
    );
    console.log('2. Access modules via Account detail page or AI Tools pages');
  }

  await cleanup();
}

main().catch(async (error) => {
  console.error('Migration failed:', error);
  await cleanup();
  process.exit(1);
});
