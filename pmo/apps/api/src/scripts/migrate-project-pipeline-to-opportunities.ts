/**
 * Migration Script: Project Pipeline Data to Opportunities
 *
 * ⚠️ DEPRECATED: This migration script is no longer functional.
 *
 * The pipeline fields (pipelineStage, pipelineValue, probability, expectedCloseDate,
 * leadSource, currency, lostReason) were removed from the Project model as part of
 * the CRM transformation (MED-04 technical debt resolution).
 *
 * Pipeline/sales tracking is now handled exclusively by the CRM Opportunity model.
 * Projects now represent delivery/work tracking only.
 *
 * If you need to create Opportunities from existing data, use the lead conversion
 * workflow in lead.service.ts or create Opportunities directly via the CRM API.
 *
 * Historical context:
 * - This script was designed to migrate Project.pipelineStage -> Opportunity.stageId
 * - Project.pipelineValue -> Opportunity.amount
 * - Project.probability -> Opportunity.probability
 * - etc.
 *
 * Since those fields no longer exist, there is no data to migrate.
 */

import { PrismaClient, PipelineStageType } from '@prisma/client';
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

// Default pipeline stages for reference (matches CRM Pipeline model)
const _DEFAULT_PIPELINE_STAGES = [
  {
    name: 'New Lead',
    order: 1,
    probability: 10,
    type: 'OPEN' as PipelineStageType,
  },
  {
    name: 'Discovery',
    order: 2,
    probability: 20,
    type: 'OPEN' as PipelineStageType,
  },
  {
    name: 'Proposal',
    order: 3,
    probability: 50,
    type: 'OPEN' as PipelineStageType,
  },
  {
    name: 'Negotiation',
    order: 4,
    probability: 75,
    type: 'OPEN' as PipelineStageType,
  },
  {
    name: 'Closed Won',
    order: 5,
    probability: 100,
    type: 'WON' as PipelineStageType,
  },
  {
    name: 'Closed Lost',
    order: 6,
    probability: 0,
    type: 'LOST' as PipelineStageType,
  },
];

async function main() {
  console.log('='.repeat(60));
  console.log('Migration: Project Pipeline to Opportunities');
  console.log('='.repeat(60));
  console.log('');
  console.log('⚠️  This migration script is DEPRECATED');
  console.log('');
  console.log('The pipeline fields have been removed from the Project model.');
  console.log('Pipeline/sales tracking is now handled by CRM Opportunities.');
  console.log('');
  console.log('Current Project count:', await prisma.project.count());
  console.log('Current Opportunity count:', await prisma.opportunity.count());
  console.log('Current Pipeline count:', await prisma.pipeline.count());
  console.log('');
  console.log('To create Opportunities, use:');
  console.log('  - Lead conversion via POST /api/leads/:id/convert');
  console.log('  - Direct creation via POST /api/crm/opportunities');
  console.log('');
  console.log('No migration performed.');

  await cleanup();
}

main().catch(async (error) => {
  console.error('Error:', error);
  await cleanup();
  process.exit(1);
});
