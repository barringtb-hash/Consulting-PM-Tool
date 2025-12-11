/**
 * Sync Engine Service
 *
 * Handles bidirectional data synchronization between the CRM
 * and external integrations.
 */

import { prisma } from '../../prisma/client';
import { getValidAccessToken } from '../oauth/oauth.service';
import type {
  IntegrationProvider,
  SyncStatus,
  SyncJobInput,
  EntityMapping,
  FieldMapping,
} from '../integration.types';

// ============================================================================
// SYNC JOB MANAGEMENT
// ============================================================================

/**
 * Start a sync job.
 */
export async function startSyncJob(input: SyncJobInput): Promise<number> {
  // Create sync log entry
  const syncLog = await prisma.syncLog.create({
    data: {
      integrationId: input.integrationId,
      direction: input.direction,
      entityType: input.entityType,
      status: 'IN_PROGRESS',
    },
  });

  // Get integration details
  const integration = await prisma.integration.findUnique({
    where: { id: input.integrationId },
    include: { tenant: true },
  });

  if (!integration) {
    await updateSyncLog(syncLog.id, 'FAILED', 'Integration not found');
    throw new Error('Integration not found');
  }

  // Execute sync based on direction
  try {
    const accessToken = await getValidAccessToken(
      input.integrationId,
      integration.tenantId,
    );

    if (input.direction === 'INBOUND') {
      await executeInboundSync(
        integration.id,
        integration.tenantId,
        integration.provider as IntegrationProvider,
        input.entityType,
        accessToken,
        input.fullSync,
      );
    } else if (input.direction === 'OUTBOUND') {
      await executeOutboundSync(
        integration.id,
        integration.tenantId,
        integration.provider as IntegrationProvider,
        input.entityType,
        input.entityIds || [],
        accessToken,
      );
    }

    await updateSyncLog(syncLog.id, 'SUCCESS');

    // Update integration last sync time
    await prisma.integration.update({
      where: { id: input.integrationId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: 'SUCCESS',
        lastSyncError: null,
      },
    });

    return syncLog.id;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    await updateSyncLog(syncLog.id, 'FAILED', errorMessage);

    await prisma.integration.update({
      where: { id: input.integrationId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: 'FAILED',
        lastSyncError: errorMessage,
      },
    });

    throw error;
  }
}

/**
 * Update sync log entry.
 */
async function updateSyncLog(
  id: number,
  status: SyncStatus,
  errorMessage?: string,
): Promise<void> {
  await prisma.syncLog.update({
    where: { id },
    data: {
      status,
      errorMessage,
      completedAt: new Date(),
    },
  });
}

// ============================================================================
// INBOUND SYNC (External -> CRM)
// ============================================================================

/**
 * Execute inbound sync from external system.
 */
async function executeInboundSync(
  integrationId: number,
  tenantId: string,
  provider: IntegrationProvider,
  entityType: string,
  accessToken: string,
  fullSync?: boolean,
): Promise<void> {
  // Get field mappings for this integration
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
    select: { fieldMappings: true, lastSyncAt: true },
  });

  const fieldMappings = (integration?.fieldMappings as EntityMapping[]) || [];
  const entityMapping = fieldMappings.find(
    (m) => m.sourceEntity === entityType,
  );

  // Fetch data from external system
  const externalData = await fetchExternalData(
    provider,
    entityType,
    accessToken,
    fullSync ? undefined : integration?.lastSyncAt,
  );

  // Transform and upsert each record
  for (const externalRecord of externalData) {
    await upsertLocalRecord(
      tenantId,
      entityMapping?.destinationEntity || entityType,
      externalRecord,
      entityMapping?.fields || getDefaultFieldMappings(entityType),
      provider,
      integrationId,
    );
  }
}

/**
 * Fetch data from external system.
 */
async function fetchExternalData(
  provider: IntegrationProvider,
  entityType: string,
  accessToken: string,
  modifiedSince?: Date | null,
): Promise<Record<string, unknown>[]> {
  // Provider-specific fetch implementations
  // In production, these would be separate connector modules
  switch (provider) {
    case 'HUBSPOT':
      return fetchHubSpotData(entityType, accessToken, modifiedSince);
    case 'SALESFORCE':
      return fetchSalesforceData(entityType, accessToken, modifiedSince);
    default:
      console.warn(`No fetch implementation for provider: ${provider}`);
      return [];
  }
}

/**
 * Fetch data from HubSpot.
 */
async function fetchHubSpotData(
  entityType: string,
  accessToken: string,
  modifiedSince?: Date | null,
): Promise<Record<string, unknown>[]> {
  const entityEndpoints: Record<string, string> = {
    contacts: 'https://api.hubapi.com/crm/v3/objects/contacts',
    companies: 'https://api.hubapi.com/crm/v3/objects/companies',
    deals: 'https://api.hubapi.com/crm/v3/objects/deals',
  };

  const endpoint = entityEndpoints[entityType];
  if (!endpoint) {
    throw new Error(`Unsupported entity type for HubSpot: ${entityType}`);
  }

  const params = new URLSearchParams({
    limit: '100',
    properties: getHubSpotProperties(entityType).join(','),
  });

  if (modifiedSince) {
    // HubSpot uses filterGroups for date filtering
    // Simplified for this example
  }

  const response = await fetch(`${endpoint}?${params}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`HubSpot API error: ${response.status}`);
  }

  const data = await response.json();
  return data.results || [];
}

/**
 * Fetch data from Salesforce.
 */
async function fetchSalesforceData(
  entityType: string,
  accessToken: string,
  modifiedSince?: Date | null,
): Promise<Record<string, unknown>[]> {
  // Salesforce uses SOQL queries
  const objectMap: Record<string, string> = {
    contacts: 'Contact',
    accounts: 'Account',
    opportunities: 'Opportunity',
  };

  const sfObject = objectMap[entityType];
  if (!sfObject) {
    throw new Error(`Unsupported entity type for Salesforce: ${entityType}`);
  }

  const fields = getSalesforceFields(entityType);
  let query = `SELECT ${fields.join(',')} FROM ${sfObject}`;

  if (modifiedSince) {
    const dateStr = modifiedSince.toISOString();
    query += ` WHERE LastModifiedDate >= ${dateStr}`;
  }

  query += ' ORDER BY LastModifiedDate DESC LIMIT 200';

  // Note: Instance URL would come from OAuth response in production
  const instanceUrl =
    process.env.SALESFORCE_INSTANCE_URL || 'https://login.salesforce.com';

  const response = await fetch(
    `${instanceUrl}/services/data/v57.0/query?q=${encodeURIComponent(query)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Salesforce API error: ${response.status}`);
  }

  const data = await response.json();
  return data.records || [];
}

/**
 * Upsert a local record from external data.
 */
async function upsertLocalRecord(
  tenantId: string,
  entityType: string,
  externalData: Record<string, unknown>,
  fieldMappings: FieldMapping[],
  provider: IntegrationProvider,
  _integrationId: number,
): Promise<void> {
  // Transform external data to local format
  const localData = transformRecord(externalData, fieldMappings);

  // Get external ID for deduplication
  const externalId = getExternalId(externalData, provider);

  // Check for existing record with this external ID
  const existing = await findExistingRecord(
    tenantId,
    entityType,
    provider,
    externalId,
  );

  if (entityType === 'contacts') {
    if (existing) {
      // Update existing contact
      await prisma.cRMContact.update({
        where: { id: existing.id },
        data: {
          ...localData,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new contact
      await prisma.cRMContact.create({
        data: {
          tenantId,
          ...localData,
          externalId: JSON.stringify({ [provider]: externalId }),
        } as Record<string, unknown>,
      });
    }
  } else if (entityType === 'accounts') {
    if (existing) {
      await prisma.account.update({
        where: { id: existing.id },
        data: localData,
      });
    } else {
      await prisma.account.create({
        data: {
          tenantId,
          ...localData,
          ownerId: 1, // Default owner - should be configurable
        } as Record<string, unknown>,
      });
    }
  }
}

// ============================================================================
// OUTBOUND SYNC (CRM -> External)
// ============================================================================

/**
 * Execute outbound sync to external system.
 */
async function executeOutboundSync(
  integrationId: number,
  tenantId: string,
  provider: IntegrationProvider,
  entityType: string,
  entityIds: number[],
  accessToken: string,
): Promise<void> {
  // Get local records
  const localRecords = await getLocalRecords(tenantId, entityType, entityIds);

  // Get field mappings
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
    select: { fieldMappings: true },
  });

  const fieldMappings = (integration?.fieldMappings as EntityMapping[]) || [];
  const entityMapping = fieldMappings.find(
    (m) => m.destinationEntity === entityType,
  );

  // Push each record to external system
  for (const record of localRecords) {
    await pushToExternal(
      provider,
      entityType,
      record,
      entityMapping?.fields || getDefaultFieldMappings(entityType),
      accessToken,
    );
  }
}

/**
 * Get local records for outbound sync.
 */
async function getLocalRecords(
  tenantId: string,
  entityType: string,
  entityIds: number[],
): Promise<Record<string, unknown>[]> {
  const whereClause: Record<string, unknown> = { tenantId };

  if (entityIds.length > 0) {
    whereClause.id = { in: entityIds };
  }

  switch (entityType) {
    case 'contacts':
      return prisma.cRMContact.findMany({ where: whereClause });
    case 'accounts':
      return prisma.account.findMany({ where: whereClause });
    case 'opportunities':
      return prisma.opportunity.findMany({ where: whereClause });
    default:
      return [];
  }
}

/**
 * Push a record to external system.
 */
async function pushToExternal(
  provider: IntegrationProvider,
  entityType: string,
  localRecord: Record<string, unknown>,
  fieldMappings: FieldMapping[],
  accessToken: string,
): Promise<void> {
  // Transform to external format
  const externalData = transformRecordReverse(localRecord, fieldMappings);

  // Check if record has external ID (update vs create)
  const externalId = (localRecord.externalId as Record<string, string>)?.[
    provider
  ];

  switch (provider) {
    case 'HUBSPOT':
      await pushToHubSpot(entityType, externalData, externalId, accessToken);
      break;
    case 'SALESFORCE':
      await pushToSalesforce(entityType, externalData, externalId, accessToken);
      break;
    default:
      console.warn(`No push implementation for provider: ${provider}`);
  }
}

/**
 * Push to HubSpot.
 */
async function pushToHubSpot(
  entityType: string,
  data: Record<string, unknown>,
  externalId: string | undefined,
  accessToken: string,
): Promise<void> {
  const entityEndpoints: Record<string, string> = {
    contacts: 'https://api.hubapi.com/crm/v3/objects/contacts',
    companies: 'https://api.hubapi.com/crm/v3/objects/companies',
    deals: 'https://api.hubapi.com/crm/v3/objects/deals',
  };

  const endpoint = entityEndpoints[entityType];
  if (!endpoint) return;

  const url = externalId ? `${endpoint}/${externalId}` : endpoint;
  const method = externalId ? 'PATCH' : 'POST';

  await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ properties: data }),
  });
}

/**
 * Push to Salesforce.
 */
async function pushToSalesforce(
  entityType: string,
  data: Record<string, unknown>,
  externalId: string | undefined,
  accessToken: string,
): Promise<void> {
  const objectMap: Record<string, string> = {
    contacts: 'Contact',
    accounts: 'Account',
    opportunities: 'Opportunity',
  };

  const sfObject = objectMap[entityType];
  if (!sfObject) return;

  const instanceUrl =
    process.env.SALESFORCE_INSTANCE_URL || 'https://login.salesforce.com';

  const url = externalId
    ? `${instanceUrl}/services/data/v57.0/sobjects/${sfObject}/${externalId}`
    : `${instanceUrl}/services/data/v57.0/sobjects/${sfObject}`;

  const method = externalId ? 'PATCH' : 'POST';

  await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Transform external record to local format.
 */
function transformRecord(
  source: Record<string, unknown>,
  mappings: FieldMapping[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const mapping of mappings) {
    let value = getNestedValue(source, mapping.sourceField);

    if (value === undefined || value === null) {
      if (mapping.required && mapping.defaultValue !== undefined) {
        value = mapping.defaultValue;
      } else {
        continue;
      }
    }

    // Apply transform
    value = applyTransform(value, mapping.transform);

    result[mapping.destinationField] = value;
  }

  return result;
}

/**
 * Transform local record to external format.
 */
function transformRecordReverse(
  source: Record<string, unknown>,
  mappings: FieldMapping[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const mapping of mappings) {
    const value = source[mapping.destinationField];

    if (value !== undefined && value !== null) {
      result[mapping.sourceField] = value;
    }
  }

  return result;
}

/**
 * Get nested value from object using dot notation.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    return current && typeof current === 'object'
      ? (current as Record<string, unknown>)[key]
      : undefined;
  }, obj);
}

/**
 * Apply field transformation.
 */
function applyTransform(value: unknown, transform?: string): unknown {
  if (!transform || transform === 'direct') return value;

  switch (transform) {
    case 'lowercase':
      return typeof value === 'string' ? value.toLowerCase() : value;
    case 'uppercase':
      return typeof value === 'string' ? value.toUpperCase() : value;
    case 'date':
      return value ? new Date(value as string) : null;
    default:
      return value;
  }
}

/**
 * Get external ID from record.
 */
function getExternalId(
  record: Record<string, unknown>,
  provider: IntegrationProvider,
): string {
  // Provider-specific ID extraction
  switch (provider) {
    case 'HUBSPOT':
      return String(record.id || record.vid);
    case 'SALESFORCE':
      return String(record.Id);
    default:
      return String(record.id);
  }
}

/**
 * Find existing record by external ID.
 */
async function findExistingRecord(
  _tenantId: string,
  _entityType: string,
  _provider: IntegrationProvider,
  _externalId: string,
): Promise<{ id: number } | null> {
  // This would need to be customized based on how external IDs are stored
  // For now, return null (always create new)
  return null;
}

/**
 * Get default field mappings for entity type.
 */
function getDefaultFieldMappings(entityType: string): FieldMapping[] {
  switch (entityType) {
    case 'contacts':
      return [
        {
          sourceField: 'firstname',
          destinationField: 'firstName',
          transform: 'direct',
          required: true,
        },
        {
          sourceField: 'lastname',
          destinationField: 'lastName',
          transform: 'direct',
          required: true,
        },
        {
          sourceField: 'email',
          destinationField: 'email',
          transform: 'lowercase',
          required: true,
        },
        {
          sourceField: 'phone',
          destinationField: 'phone',
          transform: 'direct',
          required: false,
        },
        {
          sourceField: 'jobtitle',
          destinationField: 'jobTitle',
          transform: 'direct',
          required: false,
        },
      ];
    case 'accounts':
    case 'companies':
      return [
        {
          sourceField: 'name',
          destinationField: 'name',
          transform: 'direct',
          required: true,
        },
        {
          sourceField: 'website',
          destinationField: 'website',
          transform: 'direct',
          required: false,
        },
        {
          sourceField: 'phone',
          destinationField: 'phone',
          transform: 'direct',
          required: false,
        },
        {
          sourceField: 'industry',
          destinationField: 'industry',
          transform: 'direct',
          required: false,
        },
      ];
    default:
      return [];
  }
}

/**
 * Get HubSpot properties for entity type.
 */
function getHubSpotProperties(entityType: string): string[] {
  switch (entityType) {
    case 'contacts':
      return ['firstname', 'lastname', 'email', 'phone', 'jobtitle', 'company'];
    case 'companies':
      return ['name', 'website', 'phone', 'industry', 'numberofemployees'];
    case 'deals':
      return ['dealname', 'amount', 'dealstage', 'closedate'];
    default:
      return [];
  }
}

/**
 * Get Salesforce fields for entity type.
 */
function getSalesforceFields(entityType: string): string[] {
  switch (entityType) {
    case 'contacts':
      return [
        'Id',
        'FirstName',
        'LastName',
        'Email',
        'Phone',
        'Title',
        'AccountId',
      ];
    case 'accounts':
      return [
        'Id',
        'Name',
        'Website',
        'Phone',
        'Industry',
        'NumberOfEmployees',
      ];
    case 'opportunities':
      return ['Id', 'Name', 'Amount', 'StageName', 'CloseDate', 'AccountId'];
    default:
      return [];
  }
}

// ============================================================================
// SYNC HISTORY
// ============================================================================

/**
 * Get sync history for an integration.
 */
export async function getSyncHistory(
  integrationId: number,
  limit: number = 50,
): Promise<
  Array<{
    id: number;
    direction: string;
    entityType: string;
    status: string;
    startedAt: Date;
    completedAt?: Date;
    errorMessage?: string;
  }>
> {
  const logs = await prisma.syncLog.findMany({
    where: { integrationId },
    orderBy: { startedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      direction: true,
      entityType: true,
      status: true,
      startedAt: true,
      completedAt: true,
      errorMessage: true,
    },
  });

  return logs.map(
    (log: {
      id: string;
      integrationId: string;
      direction: string;
      entityType: string;
      status: string;
      startedAt: Date;
      completedAt: Date | null;
      errorMessage: string | null;
    }) => ({
      ...log,
      completedAt: log.completedAt || undefined,
      errorMessage: log.errorMessage || undefined,
    }),
  );
}
