/**
 * Migration Script: AI Tool Configs - Link to Accounts
 *
 * This script updates ChatbotConfig and DocumentAnalyzerConfig records
 * to populate the accountId field based on the Client-Account mapping.
 *
 * Usage:
 *   npx ts-node src/scripts/migrate-ai-tools-to-accounts.ts [--dry-run]
 *
 * Options:
 *   --dry-run   Preview the migration without making changes
 *
 * Prerequisites:
 *   - Run migrate-clients-to-accounts.ts first to create Account records
 *   - Account records must have customFields.legacyClientId set
 *
 * Safety:
 *   - Can be run multiple times (skips already linked configs)
 *   - Preserves original clientId field
 */

import { PrismaClient } from '@prisma/client';
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

interface MigrationResult {
  configId: number;
  configType: 'ChatbotConfig' | 'DocumentAnalyzerConfig';
  clientId: number | null;
  success: boolean;
  accountId?: number;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

async function findAccountByLegacyClientId(
  clientId: number,
): Promise<number | null> {
  // Find Account with matching legacyClientId in customFields
  const account = await prisma.account.findFirst({
    where: {
      customFields: {
        path: ['legacyClientId'],
        equals: clientId,
      },
    },
    select: { id: true },
  });

  return account?.id ?? null;
}

async function migrateChatbotConfigs(
  dryRun: boolean,
): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];

  const configs = await prisma.chatbotConfig.findMany({
    where: {
      clientId: { not: null },
    },
    select: {
      id: true,
      clientId: true,
      accountId: true,
      client: { select: { name: true } },
    },
  });

  console.log(`\nProcessing ${configs.length} ChatbotConfig records...`);

  for (const config of configs) {
    // Skip if already linked to an account
    if (config.accountId) {
      results.push({
        configId: config.id,
        configType: 'ChatbotConfig',
        clientId: config.clientId,
        success: true,
        skipped: true,
        accountId: config.accountId,
        reason: 'Already linked to account',
      });
      continue;
    }

    if (!config.clientId) {
      results.push({
        configId: config.id,
        configType: 'ChatbotConfig',
        clientId: null,
        success: false,
        error: 'No clientId to migrate from',
      });
      continue;
    }

    // Find the corresponding Account
    const accountId = await findAccountByLegacyClientId(config.clientId);

    if (!accountId) {
      results.push({
        configId: config.id,
        configType: 'ChatbotConfig',
        clientId: config.clientId,
        success: false,
        error: `No Account found with legacyClientId=${config.clientId}. Run migrate-clients-to-accounts.ts first.`,
      });
      continue;
    }

    if (dryRun) {
      console.log(
        `[DRY-RUN] Would link ChatbotConfig ${config.id} to Account ${accountId}`,
      );
      results.push({
        configId: config.id,
        configType: 'ChatbotConfig',
        clientId: config.clientId,
        success: true,
        skipped: false,
        accountId,
        reason: 'Dry run - no changes made',
      });
      continue;
    }

    try {
      await prisma.chatbotConfig.update({
        where: { id: config.id },
        data: { accountId },
      });

      results.push({
        configId: config.id,
        configType: 'ChatbotConfig',
        clientId: config.clientId,
        success: true,
        accountId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      results.push({
        configId: config.id,
        configType: 'ChatbotConfig',
        clientId: config.clientId,
        success: false,
        error: message,
      });
    }
  }

  return results;
}

async function migrateDocumentAnalyzerConfigs(
  dryRun: boolean,
): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];

  const configs = await prisma.documentAnalyzerConfig.findMany({
    where: {
      clientId: { not: null },
    },
    select: {
      id: true,
      clientId: true,
      accountId: true,
      client: { select: { name: true } },
    },
  });

  console.log(
    `\nProcessing ${configs.length} DocumentAnalyzerConfig records...`,
  );

  for (const config of configs) {
    // Skip if already linked to an account
    if (config.accountId) {
      results.push({
        configId: config.id,
        configType: 'DocumentAnalyzerConfig',
        clientId: config.clientId,
        success: true,
        skipped: true,
        accountId: config.accountId,
        reason: 'Already linked to account',
      });
      continue;
    }

    if (!config.clientId) {
      results.push({
        configId: config.id,
        configType: 'DocumentAnalyzerConfig',
        clientId: null,
        success: false,
        error: 'No clientId to migrate from',
      });
      continue;
    }

    // Find the corresponding Account
    const accountId = await findAccountByLegacyClientId(config.clientId);

    if (!accountId) {
      results.push({
        configId: config.id,
        configType: 'DocumentAnalyzerConfig',
        clientId: config.clientId,
        success: false,
        error: `No Account found with legacyClientId=${config.clientId}. Run migrate-clients-to-accounts.ts first.`,
      });
      continue;
    }

    if (dryRun) {
      console.log(
        `[DRY-RUN] Would link DocumentAnalyzerConfig ${config.id} to Account ${accountId}`,
      );
      results.push({
        configId: config.id,
        configType: 'DocumentAnalyzerConfig',
        clientId: config.clientId,
        success: true,
        skipped: false,
        accountId,
        reason: 'Dry run - no changes made',
      });
      continue;
    }

    try {
      await prisma.documentAnalyzerConfig.update({
        where: { id: config.id },
        data: { accountId },
      });

      results.push({
        configId: config.id,
        configType: 'DocumentAnalyzerConfig',
        clientId: config.clientId,
        success: true,
        accountId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      results.push({
        configId: config.id,
        configType: 'DocumentAnalyzerConfig',
        clientId: config.clientId,
        success: false,
        error: message,
      });
    }
  }

  return results;
}

function printResults(results: MigrationResult[], configType: string): void {
  console.log(`\n${configType} Results:`);
  console.log('-'.repeat(50));

  for (const result of results) {
    const status = result.skipped
      ? 'SKIPPED'
      : result.success
        ? 'SUCCESS'
        : 'FAILED';

    console.log(
      `[${status}] ${configType} ${result.configId} (clientId: ${result.clientId})${
        result.accountId ? ` -> Account ${result.accountId}` : ''
      }${result.reason ? ` - ${result.reason}` : ''}${
        result.error ? ` - Error: ${result.error}` : ''
      }`,
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('='.repeat(60));
  console.log('Migration: AI Tool Configs -> Account Links');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log('='.repeat(60));

  // Migrate both config types
  const chatbotResults = await migrateChatbotConfigs(dryRun);
  const docAnalyzerResults = await migrateDocumentAnalyzerConfigs(dryRun);

  // Print detailed results
  printResults(chatbotResults, 'ChatbotConfig');
  printResults(docAnalyzerResults, 'DocumentAnalyzerConfig');

  // Summary
  const allResults = [...chatbotResults, ...docAnalyzerResults];

  console.log('\n' + '='.repeat(60));
  console.log('Migration Summary');
  console.log('='.repeat(60));
  console.log(`Total processed: ${allResults.length}`);
  console.log(`  - ChatbotConfig: ${chatbotResults.length}`);
  console.log(`  - DocumentAnalyzerConfig: ${docAnalyzerResults.length}`);
  console.log(
    `Successful: ${allResults.filter((r) => r.success && !r.skipped).length}`,
  );
  console.log(
    `Skipped (already linked): ${allResults.filter((r) => r.skipped).length}`,
  );
  console.log(`Failed: ${allResults.filter((r) => !r.success).length}`);

  if (!dryRun && allResults.some((r) => r.success && !r.skipped)) {
    console.log(
      '\nMigration completed. AI tool configs now linked to Accounts.',
    );
    console.log(
      'Original clientId fields preserved for backward compatibility.',
    );
    console.log('\nNext steps:');
    console.log('1. Update frontend to use accountId instead of clientId');
    console.log(
      '2. After verifying everything works, remove clientId from schema',
    );
  }

  await cleanup();
}

async function cleanup() {
  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (error) => {
  console.error('Migration failed:', error);
  await cleanup();
  process.exit(1);
});
