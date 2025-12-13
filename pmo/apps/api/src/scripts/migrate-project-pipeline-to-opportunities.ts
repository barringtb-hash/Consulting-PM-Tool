/**
 * Migration Script: Project Pipeline Data to Opportunities
 *
 * This script migrates pipeline-related data from the Project model to the
 * CRM Opportunity model, resolving MED-04 technical debt.
 *
 * What it does:
 * 1. Finds all Projects that have pipeline data (pipelineStage, pipelineValue, etc.)
 * 2. For each Project with pipeline data:
 *    - Creates an Account linked to the Project's Client (if not exists)
 *    - Gets or creates a default Pipeline with stages
 *    - Creates an Opportunity with the pipeline data
 * 3. Does NOT modify or delete existing Project data (safe migration)
 *
 * Usage:
 *   npx ts-node src/scripts/migrate-project-pipeline-to-opportunities.ts --dry-run  # Preview
 *   npx ts-node src/scripts/migrate-project-pipeline-to-opportunities.ts            # Execute
 */

import { PipelineStage, PipelineStageType } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Map legacy PipelineStage enum to new stage names and probabilities
const STAGE_MAPPING: Record<
  PipelineStage,
  { name: string; order: number; probability: number; type: PipelineStageType }
> = {
  NEW_LEAD: { name: 'New Lead', order: 1, probability: 10, type: 'OPEN' },
  INITIAL_CONTACT: {
    name: 'Initial Contact',
    order: 2,
    probability: 20,
    type: 'OPEN',
  },
  QUALIFIED: { name: 'Qualified', order: 3, probability: 30, type: 'OPEN' },
  PROPOSAL: { name: 'Proposal', order: 4, probability: 50, type: 'OPEN' },
  SOW_REVIEW: { name: 'SOW Review', order: 5, probability: 60, type: 'OPEN' },
  NEGOTIATION: { name: 'Negotiation', order: 6, probability: 75, type: 'OPEN' },
  CLOSED_WON: { name: 'Closed Won', order: 7, probability: 100, type: 'WON' },
  CLOSED_LOST: { name: 'Closed Lost', order: 8, probability: 0, type: 'LOST' },
};

// Map legacy LeadSource to CRM LeadSource
const LEAD_SOURCE_MAPPING: Record<string, string> = {
  WEBSITE: 'WEBSITE',
  REFERRAL: 'REFERRAL',
  LINKEDIN: 'SOCIAL_MEDIA',
  CONFERENCE: 'EVENT',
  DIRECT: 'OUTBOUND',
  PARTNER: 'PARTNER',
  OTHER: 'OTHER',
};

interface MigrationStats {
  projectsScanned: number;
  projectsWithPipeline: number;
  accountsCreated: number;
  accountsReused: number;
  opportunitiesCreated: number;
  pipelineCreated: boolean;
  errors: string[];
}

async function getOrCreateDefaultPipeline(tenantId: string) {
  // Check for existing default pipeline
  let pipeline = await prisma.pipeline.findFirst({
    where: { tenantId, isDefault: true },
    include: { stages: { orderBy: { order: 'asc' } } },
  });

  if (pipeline) {
    return pipeline;
  }

  // Create default pipeline with stages
  pipeline = await prisma.pipeline.create({
    data: {
      tenantId,
      name: 'Default Pipeline',
      description: 'Default sales pipeline (migrated from legacy)',
      isDefault: true,
      isActive: true,
      stages: {
        create: Object.values(STAGE_MAPPING).map((stage) => ({
          name: stage.name,
          order: stage.order,
          probability: stage.probability,
          type: stage.type,
          color:
            stage.type === 'WON'
              ? '#22c55e'
              : stage.type === 'LOST'
                ? '#ef4444'
                : '#3b82f6',
        })),
      },
    },
    include: { stages: { orderBy: { order: 'asc' } } },
  });

  console.log(
    `✅ Created default pipeline with ${pipeline.stages.length} stages`,
  );
  return pipeline;
}

async function getOrCreateAccount(
  tenantId: string,
  client: { id: number; name: string; industry: string | null },
  ownerId: number,
  stats: MigrationStats,
) {
  // Check if an Account already exists for this Client
  const existingAccount = await prisma.account.findFirst({
    where: {
      tenantId,
      customFields: {
        path: ['legacyClientId'],
        equals: client.id,
      },
    },
  });

  if (existingAccount) {
    stats.accountsReused++;
    return existingAccount;
  }

  // Also check by name as fallback
  const accountByName = await prisma.account.findFirst({
    where: {
      tenantId,
      name: client.name,
    },
  });

  if (accountByName) {
    stats.accountsReused++;
    return accountByName;
  }

  // Create new Account
  const account = await prisma.account.create({
    data: {
      tenantId,
      name: client.name,
      industry: client.industry,
      type: 'PROSPECT',
      ownerId,
      customFields: {
        legacyClientId: client.id,
        migratedFrom: 'project-pipeline',
        migratedAt: new Date().toISOString(),
      },
    },
  });

  stats.accountsCreated++;
  console.log(
    `  ✅ Created Account "${account.name}" (ID: ${account.id}) for Client ${client.id}`,
  );
  return account;
}

function findStageId(
  pipeline: {
    stages: Array<{
      id: number;
      name: string;
      order: number;
      type: PipelineStageType;
    }>;
  },
  legacyStage: PipelineStage,
): number {
  const mapping = STAGE_MAPPING[legacyStage];

  // Try to find by exact name
  let stage = pipeline.stages.find(
    (s) => s.name.toLowerCase() === mapping.name.toLowerCase(),
  );

  // Fall back to finding by type
  if (!stage) {
    stage = pipeline.stages.find((s) => s.type === mapping.type);
  }

  // Fall back to first open stage
  if (!stage) {
    stage =
      pipeline.stages.find((s) => s.type === 'OPEN') || pipeline.stages[0];
  }

  return stage.id;
}

async function migrateProjectPipeline(
  dryRun: boolean,
): Promise<MigrationStats> {
  const stats: MigrationStats = {
    projectsScanned: 0,
    projectsWithPipeline: 0,
    accountsCreated: 0,
    accountsReused: 0,
    opportunitiesCreated: 0,
    pipelineCreated: false,
    errors: [],
  };

  console.log('\n🔄 Starting Project Pipeline to Opportunity Migration...\n');
  console.log(dryRun ? '🏃 DRY RUN MODE - No changes will be made\n' : '');

  // Get all projects with pipeline data
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { pipelineStage: { not: null } },
        { pipelineValue: { not: null } },
        { probability: { not: null } },
        { expectedCloseDate: { not: null } },
      ],
    },
    include: {
      client: {
        select: { id: true, name: true, industry: true },
      },
      owner: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  stats.projectsScanned = await prisma.project.count();
  stats.projectsWithPipeline = projects.length;

  console.log(`📊 Scanned ${stats.projectsScanned} total projects`);
  console.log(
    `📊 Found ${stats.projectsWithPipeline} projects with pipeline data\n`,
  );

  if (projects.length === 0) {
    console.log('✅ No projects with pipeline data to migrate');
    return stats;
  }

  // Group projects by tenant
  const projectsByTenant = new Map<string, typeof projects>();
  for (const project of projects) {
    const tenantId = project.tenantId || 'default';
    const existing = projectsByTenant.get(tenantId) || [];
    existing.push(project);
    projectsByTenant.set(tenantId, existing);
  }

  // Process each tenant
  for (const [tenantId, tenantProjects] of projectsByTenant) {
    console.log(
      `\n📂 Processing tenant: ${tenantId} (${tenantProjects.length} projects)`,
    );

    // Get or create pipeline for this tenant
    let pipeline: Awaited<
      ReturnType<typeof getOrCreateDefaultPipeline>
    > | null = null;

    if (!dryRun) {
      pipeline = await getOrCreateDefaultPipeline(tenantId);
      if (pipeline.stages.length > 0 && !stats.pipelineCreated) {
        stats.pipelineCreated = true;
      }
    }

    // Process each project
    for (const project of tenantProjects) {
      try {
        console.log(`\n  📋 Processing: "${project.name}" (ID: ${project.id})`);
        console.log(`     Client: ${project.client.name}`);
        console.log(`     Stage: ${project.pipelineStage || 'None'}`);
        console.log(
          `     Value: ${project.pipelineValue ? `$${project.pipelineValue}` : 'None'}`,
        );
        console.log(`     Probability: ${project.probability ?? 'None'}%`);

        // Check if opportunity already exists for this project
        const existingOpportunity = await prisma.opportunity.findFirst({
          where: {
            tenantId,
            customFields: {
              path: ['legacyProjectId'],
              equals: project.id,
            },
          },
        });

        if (existingOpportunity) {
          console.log(
            `     ⏭️  Skipping - Opportunity already exists (ID: ${existingOpportunity.id})`,
          );
          continue;
        }

        if (dryRun) {
          console.log('     📝 Would create Account and Opportunity');
          stats.opportunitiesCreated++;
          continue;
        }

        // Get or create Account
        const account = await getOrCreateAccount(
          tenantId,
          project.client,
          project.ownerId,
          stats,
        );

        // Find the appropriate stage
        const stageId = findStageId(
          pipeline!,
          project.pipelineStage || ('NEW_LEAD' as PipelineStage),
        );

        // Determine opportunity status
        let status: 'OPEN' | 'WON' | 'LOST' = 'OPEN';
        if (project.pipelineStage === 'CLOSED_WON') {
          status = 'WON';
        } else if (project.pipelineStage === 'CLOSED_LOST') {
          status = 'LOST';
        }

        // Map lead source
        const leadSource = project.leadSource
          ? (LEAD_SOURCE_MAPPING[project.leadSource] as string) || 'OTHER'
          : null;

        // Calculate weighted amount
        const amount = project.pipelineValue
          ? Number(project.pipelineValue)
          : null;
        const probability =
          project.probability ??
          STAGE_MAPPING[project.pipelineStage || 'NEW_LEAD'].probability;
        const weightedAmount =
          amount && probability ? (amount * probability) / 100 : null;

        // Create opportunity
        const opportunity = await prisma.opportunity.create({
          data: {
            tenantId,
            name: `${project.name} - Opportunity`,
            description: `Migrated from project: ${project.name}`,
            accountId: account.id,
            pipelineId: pipeline!.id,
            stageId,
            amount,
            probability,
            weightedAmount,
            currency: project.currency || 'USD',
            status,
            expectedCloseDate: project.expectedCloseDate,
            actualCloseDate:
              status !== 'OPEN' ? project.expectedCloseDate : null,
            leadSource: leadSource as
              | 'WEBSITE'
              | 'REFERRAL'
              | 'SOCIAL_MEDIA'
              | 'EVENT'
              | 'OUTBOUND'
              | 'PARTNER'
              | 'OTHER'
              | null,
            lostReason: project.lostReason,
            ownerId: project.ownerId,
            customFields: {
              legacyProjectId: project.id,
              migratedFrom: 'project-pipeline',
              migratedAt: new Date().toISOString(),
            },
          },
        });

        // Create initial stage history
        await prisma.opportunityStageHistory.create({
          data: {
            opportunityId: opportunity.id,
            toStageId: stageId,
            changedById: project.ownerId,
          },
        });

        stats.opportunitiesCreated++;
        console.log(
          `     ✅ Created Opportunity "${opportunity.name}" (ID: ${opportunity.id})`,
        );
      } catch (error) {
        const errorMsg = `Error processing project ${project.id}: ${error instanceof Error ? error.message : String(error)}`;
        stats.errors.push(errorMsg);
        console.error(`     ❌ ${errorMsg}`);
      }
    }
  }

  return stats;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  try {
    const stats = await migrateProjectPipeline(dryRun);

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary');
    console.log('='.repeat(60));
    console.log(`Projects scanned:        ${stats.projectsScanned}`);
    console.log(`Projects with pipeline:  ${stats.projectsWithPipeline}`);
    console.log(`Accounts created:        ${stats.accountsCreated}`);
    console.log(`Accounts reused:         ${stats.accountsReused}`);
    console.log(`Opportunities created:   ${stats.opportunitiesCreated}`);
    console.log(
      `Pipeline created:        ${stats.pipelineCreated ? 'Yes' : 'No'}`,
    );
    console.log(`Errors:                  ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ Errors:');
      stats.errors.forEach((e) => console.log(`  - ${e}`));
    }

    if (dryRun) {
      console.log('\n🏃 This was a DRY RUN - no changes were made');
      console.log('Run without --dry-run to execute the migration');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
