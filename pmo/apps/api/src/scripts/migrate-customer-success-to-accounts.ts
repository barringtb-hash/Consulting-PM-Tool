/**
 * Migration Script: Customer Success to Account
 *
 * This script migrates Customer Success entities (CTA, SuccessPlan, CustomerHealthScore)
 * from the legacy Client model to the CRM Account model.
 *
 * Usage:
 *   npx ts-node src/scripts/migrate-customer-success-to-accounts.ts [--dry-run]
 *
 * Options:
 *   --dry-run   Preview the migration without making changes
 *
 * Safety:
 *   - Preserves original clientId references
 *   - Can be run multiple times (skips already migrated records)
 *   - Creates accountId references on CS entities
 *   - Copies CustomerHealthScore data to AccountHealthScoreHistory
 *
 * Prerequisites:
 *   - Run migrate-clients-to-accounts.ts first to create Account records
 *   - Run database migration 20260101000000_merge_customer_success_into_account
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

async function cleanup() {
  await prisma.$disconnect();
  await pool.end();
}

interface MigrationResult {
  entityType: 'CTA' | 'SuccessPlan' | 'HealthScore';
  entityId: number;
  success: boolean;
  accountId?: number;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

/**
 * Find Account by legacy clientId
 */
async function findAccountByClientId(clientId: number): Promise<number | null> {
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

/**
 * Migrate CTAs to use accountId
 */
async function migrateCTAs(dryRun: boolean): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];

  // Find all CTAs with clientId but no accountId
  const ctas = await prisma.cTA.findMany({
    where: {
      clientId: { not: null },
      accountId: null,
    },
    select: {
      id: true,
      clientId: true,
      title: true,
    },
  });

  console.log(`\nFound ${ctas.length} CTAs to migrate.\n`);

  for (const cta of ctas) {
    if (!cta.clientId) continue;

    const accountId = await findAccountByClientId(cta.clientId);

    if (!accountId) {
      results.push({
        entityType: 'CTA',
        entityId: cta.id,
        success: false,
        error: `No Account found for clientId ${cta.clientId}`,
      });
      continue;
    }

    if (dryRun) {
      console.log(
        `[DRY-RUN] Would update CTA ${cta.id} (${cta.title}) with accountId ${accountId}`,
      );
      results.push({
        entityType: 'CTA',
        entityId: cta.id,
        success: true,
        accountId,
        reason: 'Dry run - no changes made',
      });
      continue;
    }

    try {
      await prisma.cTA.update({
        where: { id: cta.id },
        data: { accountId },
      });
      results.push({
        entityType: 'CTA',
        entityId: cta.id,
        success: true,
        accountId,
      });
      console.log(`[SUCCESS] CTA ${cta.id} -> Account ${accountId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      results.push({
        entityType: 'CTA',
        entityId: cta.id,
        success: false,
        error: message,
      });
      console.log(`[FAILED] CTA ${cta.id}: ${message}`);
    }
  }

  return results;
}

/**
 * Migrate SuccessPlans to use accountId
 */
async function migrateSuccessPlans(
  dryRun: boolean,
): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];

  // Find all SuccessPlans with clientId but no accountId
  const plans = await prisma.successPlan.findMany({
    where: {
      clientId: { not: null },
      accountId: null,
    },
    select: {
      id: true,
      clientId: true,
      name: true,
    },
  });

  console.log(`\nFound ${plans.length} SuccessPlans to migrate.\n`);

  for (const plan of plans) {
    if (!plan.clientId) continue;

    const accountId = await findAccountByClientId(plan.clientId);

    if (!accountId) {
      results.push({
        entityType: 'SuccessPlan',
        entityId: plan.id,
        success: false,
        error: `No Account found for clientId ${plan.clientId}`,
      });
      continue;
    }

    if (dryRun) {
      console.log(
        `[DRY-RUN] Would update SuccessPlan ${plan.id} (${plan.name}) with accountId ${accountId}`,
      );
      results.push({
        entityType: 'SuccessPlan',
        entityId: plan.id,
        success: true,
        accountId,
        reason: 'Dry run - no changes made',
      });
      continue;
    }

    try {
      await prisma.successPlan.update({
        where: { id: plan.id },
        data: { accountId },
      });
      results.push({
        entityType: 'SuccessPlan',
        entityId: plan.id,
        success: true,
        accountId,
      });
      console.log(`[SUCCESS] SuccessPlan ${plan.id} -> Account ${accountId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      results.push({
        entityType: 'SuccessPlan',
        entityId: plan.id,
        success: false,
        error: message,
      });
      console.log(`[FAILED] SuccessPlan ${plan.id}: ${message}`);
    }
  }

  return results;
}

/**
 * Copy CustomerHealthScore data to AccountHealthScoreHistory
 */
async function migrateHealthScores(
  dryRun: boolean,
): Promise<MigrationResult[]> {
  const results: MigrationResult[] = [];

  // Find all CustomerHealthScores
  const scores = await prisma.customerHealthScore.findMany({
    include: {
      client: {
        select: { tenantId: true },
      },
    },
  });

  console.log(`\nFound ${scores.length} CustomerHealthScores to migrate.\n`);

  for (const score of scores) {
    const accountId = await findAccountByClientId(score.clientId);

    if (!accountId) {
      results.push({
        entityType: 'HealthScore',
        entityId: score.id,
        success: false,
        error: `No Account found for clientId ${score.clientId}`,
      });
      continue;
    }

    // Check if already migrated
    const existing = await prisma.accountHealthScoreHistory.findFirst({
      where: {
        accountId,
        calculatedAt: score.lastCalculatedAt,
      },
    });

    if (existing) {
      results.push({
        entityType: 'HealthScore',
        entityId: score.id,
        success: true,
        skipped: true,
        reason: 'Already migrated',
        accountId,
      });
      continue;
    }

    const tenantId = score.client?.tenantId || score.tenantId || 'default';

    if (dryRun) {
      console.log(
        `[DRY-RUN] Would create AccountHealthScoreHistory for Account ${accountId} (score: ${score.overallScore})`,
      );
      results.push({
        entityType: 'HealthScore',
        entityId: score.id,
        success: true,
        accountId,
        reason: 'Dry run - no changes made',
      });
      continue;
    }

    try {
      await prisma.accountHealthScoreHistory.create({
        data: {
          tenantId,
          accountId,
          overallScore: score.overallScore,
          category: score.category,
          usageScore: score.usageScore,
          supportScore: score.supportScore,
          engagementScore: score.engagementScore,
          sentimentScore: score.sentimentScore,
          financialScore: score.financialScore,
          usageWeight: score.usageWeight,
          supportWeight: score.supportWeight,
          engagementWeight: score.engagementWeight,
          sentimentWeight: score.sentimentWeight,
          financialWeight: score.financialWeight,
          previousScore: score.previousScore,
          scoreTrend: score.scoreTrend,
          trendPercentage: score.trendPercentage,
          churnRisk: score.churnRisk,
          expansionPotential: score.expansionPotential,
          calculationNotes: score.calculationNotes,
          calculatedAt: score.lastCalculatedAt,
        },
      });

      // Also update the Account's healthScore field
      await prisma.account.update({
        where: { id: accountId },
        data: {
          healthScore: score.overallScore,
          churnRisk: score.churnRisk,
        },
      });

      results.push({
        entityType: 'HealthScore',
        entityId: score.id,
        success: true,
        accountId,
      });
      console.log(
        `[SUCCESS] HealthScore ${score.id} -> AccountHealthScoreHistory (Account ${accountId})`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      results.push({
        entityType: 'HealthScore',
        entityId: score.id,
        success: false,
        error: message,
      });
      console.log(`[FAILED] HealthScore ${score.id}: ${message}`);
    }
  }

  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('='.repeat(60));
  console.log('Migration: Customer Success -> Account');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log('='.repeat(60));

  // Migrate each entity type
  console.log('\n--- Migrating CTAs ---');
  const ctaResults = await migrateCTAs(dryRun);

  console.log('\n--- Migrating Success Plans ---');
  const planResults = await migrateSuccessPlans(dryRun);

  console.log('\n--- Migrating Health Scores ---');
  const scoreResults = await migrateHealthScores(dryRun);

  // Combine results
  const allResults = [...ctaResults, ...planResults, ...scoreResults];

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Migration Summary');
  console.log('='.repeat(60));

  const groupedResults = {
    CTA: ctaResults,
    SuccessPlan: planResults,
    HealthScore: scoreResults,
  };

  for (const [type, results] of Object.entries(groupedResults)) {
    const successful = results.filter((r) => r.success && !r.skipped).length;
    const skipped = results.filter((r) => r.skipped).length;
    const failed = results.filter((r) => !r.success).length;
    console.log(`\n${type}:`);
    console.log(`  Total: ${results.length}`);
    console.log(`  Successful: ${successful}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Failed: ${failed}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${allResults.length}`);
  console.log(
    `Successful: ${allResults.filter((r) => r.success && !r.skipped).length}`,
  );
  console.log(`Skipped: ${allResults.filter((r) => r.skipped).length}`);
  console.log(`Failed: ${allResults.filter((r) => !r.success).length}`);

  if (!dryRun && allResults.some((r) => r.success && !r.skipped)) {
    console.log('\nMigration completed.');
    console.log(
      'Customer Success entities now reference Account via accountId.',
    );
    console.log('\nNext steps:');
    console.log('1. Update CS services to use accountId instead of clientId');
    console.log('2. Update CS routes to accept accountId');
    console.log('3. Update frontend to work with Account-based CS features');
  }

  await cleanup();
}

main().catch(async (error) => {
  console.error('Migration failed:', error);
  await cleanup();
  process.exit(1);
});
