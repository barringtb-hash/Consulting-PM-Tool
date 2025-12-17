/**
 * Migration Script: InboundLead to CRMContact
 *
 * This script migrates legacy InboundLead records to the CRMContact model.
 * It preserves the original lead data while mapping to the CRM lifecycle stages.
 *
 * Usage:
 *   npx ts-node src/scripts/migrate-leads-to-crm-contacts.ts [--dry-run]
 *
 * Options:
 *   --dry-run   Preview the migration without making changes
 *
 * Safety:
 *   - Creates backup references (originalLeadId in customFields)
 *   - Can be run multiple times (skips already migrated leads)
 *   - Preserves original InboundLead records
 */

import {
  PrismaClient,
  LeadStatus,
  ContactLifecycle,
  CRMLeadSource,
  LeadSource,
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

// Mapping from legacy LeadStatus to CRM ContactLifecycle
const STATUS_TO_LIFECYCLE: Record<LeadStatus, ContactLifecycle> = {
  NEW: 'LEAD',
  CONTACTED: 'MQL',
  QUALIFIED: 'SQL',
  DISQUALIFIED: 'CHURNED',
  CONVERTED: 'OPPORTUNITY',
};

// Mapping from legacy LeadSource to CRM CRMLeadSource
const SOURCE_MAPPING: Record<LeadSource, CRMLeadSource> = {
  WEBSITE_CONTACT: 'WEBSITE',
  WEBSITE_DOWNLOAD: 'WEBSITE',
  REFERRAL: 'REFERRAL',
  LINKEDIN: 'LINKEDIN',
  OUTBOUND: 'OUTBOUND',
  EVENT: 'EVENT',
  OTHER: 'OTHER',
};

interface MigrationResult {
  leadId: number;
  success: boolean;
  crmContactId?: number;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

async function migrateLead(
  lead: Awaited<ReturnType<typeof prisma.inboundLead.findUnique>>,
  dryRun: boolean,
): Promise<MigrationResult> {
  if (!lead) {
    return { leadId: 0, success: false, error: 'Lead is null' };
  }

  // Check if already migrated by looking for customFields.originalLeadId
  const existingContact = await prisma.cRMContact.findFirst({
    where: {
      tenantId: lead.tenantId || 'default',
      customFields: {
        path: ['originalLeadId'],
        equals: lead.id,
      },
    },
  });

  if (existingContact) {
    return {
      leadId: lead.id,
      success: true,
      skipped: true,
      reason: 'Already migrated',
      crmContactId: existingContact.id,
    };
  }

  // Parse name into first/last name
  const nameParts = (lead.name || 'Unknown').trim().split(/\s+/);
  const firstName = nameParts[0] || 'Unknown';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Map lifecycle and source
  const lifecycle = STATUS_TO_LIFECYCLE[lead.status];
  const leadSource = lead.source ? SOURCE_MAPPING[lead.source] : null;

  // Prepare contact data
  // Note: InboundLead model only has: name, email, company, website, source,
  // serviceInterest, message, status, ownerUserId, clientId, primaryContactId,
  // firstResponseAt, page, utmSource, utmMedium, utmCampaign, utmContent, utmTerm
  const contactData = {
    tenantId: lead.tenantId || 'default',
    firstName,
    lastName,
    email: lead.email,
    lifecycle,
    leadSource,
    ownerId: lead.ownerUserId || null,
    customFields: {
      originalLeadId: lead.id,
      company: lead.company,
      website: lead.website,
      serviceInterest: lead.serviceInterest,
      message: lead.message,
      utmSource: lead.utmSource,
      utmMedium: lead.utmMedium,
      utmCampaign: lead.utmCampaign,
      migratedAt: new Date().toISOString(),
    },
    archived: lead.status === 'DISQUALIFIED',
  };

  if (dryRun) {
    console.log(`[DRY-RUN] Would create CRMContact from lead ${lead.id}:`, {
      name: `${firstName} ${lastName}`,
      email: lead.email,
      lifecycle,
    });
    return {
      leadId: lead.id,
      success: true,
      skipped: false,
      reason: 'Dry run - no changes made',
    };
  }

  try {
    const contact = await prisma.cRMContact.create({
      data: contactData,
    });

    return {
      leadId: lead.id,
      success: true,
      crmContactId: contact.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      leadId: lead.id,
      success: false,
      error: message,
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('='.repeat(60));
  console.log('Migration: InboundLead -> CRMContact');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log('='.repeat(60));

  // Get all leads that haven't been converted already
  const leads = await prisma.inboundLead.findMany({
    orderBy: { createdAt: 'asc' },
  });

  console.log(`\nFound ${leads.length} leads to process.\n`);

  const results: MigrationResult[] = [];

  for (const lead of leads) {
    const result = await migrateLead(lead, dryRun);
    results.push(result);

    const status = result.skipped
      ? 'SKIPPED'
      : result.success
        ? 'SUCCESS'
        : 'FAILED';

    console.log(
      `[${status}] Lead ${lead.id} (${lead.email})${
        result.crmContactId ? ` -> CRMContact ${result.crmContactId}` : ''
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
    console.log(
      '\nMigration completed. Original InboundLead records preserved.',
    );
    console.log(
      'CRMContacts have originalLeadId in customFields for reference.',
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
